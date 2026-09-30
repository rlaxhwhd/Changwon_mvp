"""Student attendance and source-keyed XP. Completion evidence is always server-owned."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query

from .auth import principal
from .db import connection
from .quest_management import router as management_router, progress

router = APIRouter()
router.include_router(management_router)
XP_PER_LEVEL = 1000
LEVELS_PER_GRADE = 25


def today_kst():
    return datetime.now(ZoneInfo('Asia/Seoul')).date()


def quest_student(user=Depends(principal, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 이용할 수 있습니다.')
    return user


def reward_rules(conn):
    return {row['code']: dict(label=row['label'], version=row['version'], **row['payload'])
            for row in conn.execute("SELECT code,label,version,payload FROM dc.code_item WHERE group_code='QUEST_XP_REWARD' AND is_active").fetchall()}


def active_semester(conn, day):
    return conn.execute("""SELECT code,label,payload FROM dc.code_item WHERE group_code='QUEST_SEMESTER'
      AND is_active AND payload->>'startDate'<=%s AND payload->>'endDate'>=%s
      ORDER BY code LIMIT 1""", (day.isoformat(),day.isoformat())).fetchone()


def grant_xp(conn, uid, *, source_type, source_key, title, amount, day, reward_code=None, reward_version=None):
    """Internal integration point. Caller must validate completion in this same transaction.

    Future quest/program completion supplies a stable completion ID, never a request UUID.
    No browser-accessible generic award endpoint exists. Retrying cannot bypass a grade cap.
    """
    if type(amount) is not int or not 0 <= amount <= 100000:
        raise ValueError('Invalid XP amount')
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('quest-growth:'+uid,))
    student = conn.execute('SELECT grade FROM dc.student WHERE intg_uid=%s', (uid,)).fetchone()
    if not student or not student['grade'] or student['grade'] < 1:
        raise HTTPException(409, '학년 정보 확인 후 XP를 적립할 수 있습니다.')
    cap = student['grade'] * LEVELS_PER_GRADE
    conn.execute('INSERT INTO dc.quest_growth_account(student_uid) VALUES(%s) ON CONFLICT DO NOTHING', (uid,))
    account = conn.execute('SELECT total_xp FROM dc.quest_growth_account WHERE student_uid=%s FOR UPDATE', (uid,)).fetchone()
    previous = conn.execute('SELECT granted_xp FROM dc.growth_xp_event WHERE student_uid=%s AND source_type=%s AND source_key=%s', (uid,source_type,source_key)).fetchone()
    if previous:
        return dict(grantedXp=previous['granted_xp'], duplicate=True)
    granted = min(amount, max(0,cap * XP_PER_LEVEL-account['total_xp']))
    conn.execute('''INSERT INTO dc.growth_xp_event(student_uid,source_type,source_key,title,reward_code,
      reward_version,requested_xp,granted_xp,level_cap,earned_on) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
      (uid,source_type,source_key,title,reward_code,reward_version,amount,granted,cap,day))
    conn.execute('UPDATE dc.quest_growth_account SET total_xp=total_xp+%s,updated_at=now() WHERE student_uid=%s', (granted,uid))
    return dict(grantedXp=granted, duplicate=False)


def award_toeic(conn, uid, day):
    """Called only after server scoring. One TOEIC reward per KST date, across retries."""
    if day.weekday() >= 5 or not active_semester(conn, day):
        return
    rule = reward_rules(conn)['DAILY']
    grant_xp(conn, uid, source_type='QUEST', source_key='toeic:'+day.isoformat(),
             title='오늘의 TOEIC 영단어', amount=rule['xp'], day=day,
             reward_code='DAILY', reward_version=rule['version'])


@router.post('/quests/attendance')
def check_in(user=Depends(quest_student, scope='function'), conn=Depends(connection, scope='function')):
    uid, day = user['intg_uid'], today_kst()
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('quest-growth:'+uid,))
    inserted = conn.execute('INSERT INTO dc.quest_attendance(student_uid,attended_on) VALUES(%s,%s) ON CONFLICT DO NOTHING RETURNING attended_on', (uid,day)).fetchone()
    if not inserted:
        return dict(attendedOn=day, duplicate=True, grantedXp=0)
    granted = 0
    if day.weekday() < 5 and active_semester(conn,day):
        rule = reward_rules(conn).get('DAILY')
        if not rule:
            raise HTTPException(409, '일일 XP 보상 설정을 확인해 주세요.')
        granted = grant_xp(conn,uid,source_type='ATTENDANCE',source_key=day.isoformat(),title='오늘의 출석',
                           amount=rule['xp'],day=day,reward_code='DAILY',reward_version=rule['version'])['grantedXp']
    return dict(attendedOn=day,duplicate=False,grantedXp=granted)


@router.get('/quests/dashboard')
def dashboard(month: str | None = Query(default=None, pattern=r'^\d{4}-\d{2}$'),
              user=Depends(quest_student, scope='function'), conn=Depends(connection, scope='function')):
    return dashboard_data(month, user, conn)


def dashboard_data(month, user, conn, assigned=None):
    uid, day = user['intg_uid'], today_kst()
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('quest-growth:'+uid,))
    try:
        start = date.fromisoformat(month+'-01') if month else day.replace(day=1)
        end = (start.replace(day=28)+timedelta(days=4)).replace(day=1)
    except ValueError:
        raise HTTPException(422, '올바른 조회 월을 선택하세요.')
    student = conn.execute('SELECT grade FROM dc.student WHERE intg_uid=%s', (uid,)).fetchone()
    account = conn.execute('SELECT total_xp FROM dc.quest_growth_account WHERE student_uid=%s', (uid,)).fetchone()
    total = account['total_xp'] if account else 0
    grade = student['grade']
    cap = grade * LEVELS_PER_GRADE if grade and grade>0 else None
    attendance = conn.execute('SELECT attended_on FROM dc.quest_attendance WHERE student_uid=%s AND attended_on>=%s AND attended_on<%s ORDER BY attended_on', (uid,start,end)).fetchall()
    # Date islands let a missing today retain yesterday's streak until the day ends.
    streak = conn.execute('''WITH recent AS (
      SELECT attended_on,attended_on + row_number() OVER(ORDER BY attended_on DESC)::integer AS island
      FROM dc.quest_attendance WHERE student_uid=%s AND attended_on<=%s
    ), latest AS (SELECT attended_on,island FROM recent ORDER BY attended_on DESC LIMIT 1)
    SELECT count(*) AS n FROM recent r JOIN latest l ON r.island=l.island WHERE l.attended_on>=%s''',
    (uid,day,day-timedelta(days=1))).fetchone()['n']
    attended = bool(conn.execute('SELECT 1 FROM dc.quest_attendance WHERE student_uid=%s AND attended_on=%s', (uid,day)).fetchone())
    graph_start = day-timedelta(days=29)
    amounts = {row['earned_on']:row['xp'] for row in conn.execute('''SELECT earned_on,sum(granted_xp)::bigint AS xp
      FROM dc.growth_xp_event WHERE student_uid=%s AND earned_on BETWEEN %s AND %s GROUP BY earned_on''', (uid,graph_start,day)).fetchall()}
    graph = [dict(date=graph_start+timedelta(days=i),xp=amounts.get(graph_start+timedelta(days=i),0)) for i in range(30)]
    semester = active_semester(conn,day)
    at_cap = cap is not None and total >= cap*XP_PER_LEVEL
    if assigned is None:
        assigned = progress(conn, uid, day)
    toeic = conn.execute('''SELECT coalesce(bool_or((result->>'questPassed')::boolean),false) AS done,
      coalesce(max((result->>'correctCount')::integer),0) AS correct
      FROM dc.mission_attempt WHERE student_uid=%s AND kind='TOEIC'
      AND submitted_at>=(%s::date::timestamp AT TIME ZONE 'Asia/Seoul')
      AND submitted_at<((%s::date+1)::timestamp AT TIME ZONE 'Asia/Seoul')''', (uid,day,day)).fetchone()
    current_week = day-timedelta(days=day.weekday())
    toeic_week = conn.execute("SELECT quest_pass_count FROM dc.mission_week WHERE week_start=%s AND kind='TOEIC' AND published", (current_week,)).fetchone()
    completed = dict(DAILY=int(attended)+int(toeic['done']),
                     MONTHLY=sum(i['done'] for i in assigned if i['period']=='MONTHLY'),
                     SEMESTER=sum(i['done'] for i in assigned if i['period']=='SEMESTER'))
    rules = reward_rules(conn)
    rules['DAILY']['quota'] = 2
    for period in ('MONTHLY','SEMESTER'):
        rules[period]['quota'] = sum(i['period']==period for i in assigned)
    return dict(today=day,grade=grade,totalXp=total,level=total//XP_PER_LEVEL,levelCap=cap,
                xpInLevel=1000 if at_cap else total%XP_PER_LEVEL,xpPerLevel=XP_PER_LEVEL,atCap=at_cap,
                attendance=dict(today=attended,streak=streak,dates=[r['attended_on'] for r in attendance]),
                graph=graph,rules=rules,dailyCompleted=completed['DAILY'],completed=completed,
                assigned=assigned,toeic=dict(done=toeic['done'],correct=toeic['correct'],threshold=toeic_week['quest_pass_count'] if toeic_week else None),
                semester=dict(code=semester['code'],label=semester['label'],**semester['payload']) if semester else None,
                attendanceRewardEligible=bool(semester and day.weekday()<5))


@router.post('/quests/sync')
def sync(month: str | None = Query(default=None, pattern=r'^\d{4}-\d{2}$'),
         user=Depends(quest_student, scope='function'), conn=Depends(connection, scope='function')):
    uid = user['intg_uid']
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('quest-growth:'+uid,))
    # Do not prevent students with missing grade information from reading their progress.
    grade = conn.execute('SELECT grade FROM dc.student WHERE intg_uid=%s', (uid,)).fetchone()['grade']
    assigned = None
    if grade and grade > 0:
        # Keep assignment snapshots stable until evidence and awards commit.
        conn.execute("SELECT pg_advisory_xact_lock_shared(hashtextextended('quest-assignments',0))")
        assigned = progress(conn, uid, today_kst(), award=True)
    return dashboard_data(month, user, conn, assigned=assigned)
