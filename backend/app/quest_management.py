"""Activity catalog and disjoint, versioned monthly/semester assignments."""
from calendar import monthrange
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

from .administration import administrator, audit
from .db import connection

router = APIRouter()
Period = Literal['MONTHLY', 'SEMESTER']
# 퀘스트 풀의 판정 활동 — 상위 그룹 → 세부 판정 기준. 관리자는 고르기만 하고 횟수·XP를 입력한다.
# 각 코드는 activity_counts 의 서버 기록 집계 하나와 1:1이다(2026-10-20 사용자 확정). 심리상담은 판정 대상이 아니다.
ACTIVITIES = [
    dict(group='ATTENDANCE', groupLabel='출석', code='ATTENDANCE', label='출석체크', unit='일', note='출석체크 버튼으로 저장된 날짜를 집계합니다.'),
    dict(group='DIAGNOSIS', groupLabel='진단', code='DIAGNOSIS', label='진단 검사 완료', unit='회', note='완료 상태이며 완료 일시가 있는 진단 응시를 집계합니다.'),
    dict(group='COUNSEL', groupLabel='상담', code='COUNSEL', label='상담 완료 (진로·취업 + 교수)', unit='회', note='완료 상태이며 완료 일시가 있는 진로·취업 상담과 교수 상담을 집계합니다. 심리상담은 제외합니다.'),
    dict(group='COUNSEL', groupLabel='상담', code='COUNSEL_CAREER', label='진로·취업 상담 완료', unit='회', note='완료 처리된 진로·취업 상담(일반·CARE 7+)을 집계합니다.'),
    dict(group='COUNSEL', groupLabel='상담', code='COUNSEL_PROF', label='교수 상담 완료', unit='회', note='완료 처리된 교수 상담(교수 직접 기록 포함)을 집계합니다.'),
    dict(group='COUNSEL', groupLabel='상담', code='GROUP_COUNSEL', label='집단상담 참여', unit='회', note='진행 완료된 집단상담 중 출석으로 체크된 회차를 상담일 기준으로 집계합니다.'),
    dict(group='ROADMAP', groupLabel='로드맵', code='ROADMAP_ITEM', label='로드맵 칸 완료', unit='칸', note='완료 처리된 로드맵 칸을 완료 일시 기준으로 집계합니다.'),
    dict(group='PROGRAM', groupLabel='비교과', code='PROGRAM', label='비교과 프로그램 수료', unit='회', note='수료 상태이며 수료 처리 이력이 있는 프로그램을 집계합니다.'),
    dict(group='CERTIFICATE', groupLabel='자격증', code='CERTIFICATE', label='자격증 획득', unit='개', note='취득일이 있고 검증된 자격증만 집계합니다. 학생이 성장 기록에 직접 적은 자격증은 세지 않습니다.'),
    dict(group='GROWTH', groupLabel='성장일지', code='GROWTH_RECORD', label='성장 기록 작성 (전체)', unit='건', note='나의 성장에 등록한 기록(경험일지·프로젝트·기술·자격증·어학·수상 등)을 등록 일시 기준으로 집계합니다. 삭제한 기록은 제외합니다.'),
    dict(group='GROWTH', groupLabel='성장일지', code='GROWTH_JOURNAL', label='성장경험일지 작성', unit='건', note='성장경험일지 등록을 등록 일시 기준으로 집계합니다. 삭제한 기록은 제외합니다.'),
    dict(group='GROWTH', groupLabel='성장일지', code='GROWTH_PROJECT', label='프로젝트 등록', unit='건', note='프로젝트 등록을 등록 일시 기준으로 집계합니다. 삭제한 기록은 제외합니다.'),
    dict(group='MISSION', groupLabel='학습미션', code='MISSION_TOEIC', label='TOEIC 영단어 통과', unit='일', note='이수 기준 이상 맞힌 TOEIC 미션 제출을 하루 1회로 집계합니다.'),
    dict(group='MISSION', groupLabel='학습미션', code='MISSION_NCS_GSAT', label='NCS·GSAT 주간 미션 제출', unit='주', note='제출한 NCS·GSAT 주간 미션을 주 1회로 집계합니다.'),
    dict(group='RESUME', groupLabel='자소서', code='RESUME_WRITE', label='자기소개서 작성', unit='건', note='저장한 자기소개서를 작성 일시 기준으로 집계합니다. 삭제한 자기소개서는 제외합니다.'),
    dict(group='RESUME', groupLabel='자소서', code='AI_RESUME', label='AI 자기소개서 평가', unit='회', note='평가 결과가 저장된 AI 자기소개서 실행을 집계합니다.'),
    dict(group='JOB', groupLabel='채용지원', code='JOB_APPLY', label='채용공고 지원', unit='건', note='실제 제출된 공고를 집계합니다. 취소된 지원은 제외합니다.'),
]
Activity = Literal['ATTENDANCE', 'DIAGNOSIS', 'COUNSEL', 'COUNSEL_CAREER', 'COUNSEL_PROF', 'GROUP_COUNSEL', 'ROADMAP_ITEM',
                   'PROGRAM', 'CERTIFICATE', 'GROWTH_RECORD', 'GROWTH_JOURNAL', 'GROWTH_PROJECT',
                   'MISSION_TOEIC', 'MISSION_NCS_GSAT', 'RESUME_WRITE', 'AI_RESUME', 'JOB_APPLY']


class Definition(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: StrictInt = Field(ge=0)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default='', max_length=3000)
    activity: Activity
    targetCount: StrictInt = Field(ge=1, le=1000)
    xp: StrictInt = Field(ge=0, le=100000)
    isActive: bool = True


class Assignment(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: StrictInt = Field(ge=0)
    title: str = Field(min_length=1, max_length=200)
    period: Period
    periodKey: str = Field(min_length=1, max_length=64)
    audience: Literal['ALL', 'FILTERED']
    grades: list[Literal[1, 2, 3, 4]] = Field(default_factory=list, max_length=4)
    studentTypes: list[Literal['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'UNDIAGNOSED']] = Field(default_factory=list, max_length=7)
    questIds: list[StrictInt] = Field(min_length=1, max_length=30)
    published: bool = False

    @model_validator(mode='after')
    def valid(self):
        if self.audience == 'ALL' and (self.grades or self.studentTypes):
            raise ValueError('전체 학생을 선택하면 학년·진단유형 조건을 사용할 수 없습니다.')
        if self.audience == 'FILTERED' and not (self.grades or self.studentTypes):
            raise ValueError('학년 또는 C-CORE 진단유형을 선택하세요.')
        for values in (self.grades, self.studentTypes, self.questIds):
            if len(values) != len(set(values)):
                raise ValueError('중복 선택을 제거하세요.')
        return self


@router.get('/system/quests/options')
def options(user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    semesters = conn.execute("SELECT code,label,payload FROM dc.code_item WHERE group_code='QUEST_SEMESTER' AND is_active ORDER BY payload->>'startDate'").fetchall()
    types = conn.execute("SELECT code,label FROM dc.code_item WHERE group_code='STUDENT_TYPE' AND is_active ORDER BY sort_order,code").fetchall()
    return dict(activities=ACTIVITIES, semesters=semesters, studentTypes=types)


@router.get('/system/quests/definitions')
def definitions(q: str = Query('', max_length=100), page: int = Query(1, ge=1),
                activeOnly: bool = False, user=Depends(administrator, scope='function'),
                conn=Depends(connection, scope='function')):
    pattern = '%' + q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
    args = (pattern, activeOnly)
    where = 'title ILIKE %s AND (NOT %s OR is_active)'
    total = conn.execute('SELECT count(*) n FROM dc.quest_definition WHERE '+where, args).fetchone()['n']
    rows = conn.execute('SELECT * FROM dc.quest_definition WHERE '+where+' ORDER BY id DESC LIMIT 20 OFFSET %s', (*args, (page-1)*20)).fetchall()
    return dict(items=rows, totalCount=total)


@router.put('/system/quests/definitions/{quest_id}')
def save_definition(quest_id: int, data: Definition, user=Depends(administrator, scope='function'),
                    conn=Depends(connection, scope='function')):
    before = conn.execute('SELECT * FROM dc.quest_definition WHERE id=%s FOR UPDATE', (quest_id,)).fetchone()
    if (quest_id != 0 and not before) or data.expectedVersion != (before['version'] if before else 0):
        raise HTTPException(409, '퀘스트가 변경되었습니다. 목록을 다시 조회하세요.')
    args = (data.title, data.description, data.activity, data.targetCount, data.xp, data.isActive, user['intg_uid'])
    if before:
        row = conn.execute('''UPDATE dc.quest_definition SET title=%s,description=%s,activity=%s,
          target_count=%s,xp=%s,is_active=%s,updated_by=%s,updated_at=now(),version=version+1
          WHERE id=%s RETURNING *''', (*args, quest_id)).fetchone()
    else:
        row = conn.execute('''INSERT INTO dc.quest_definition(title,description,activity,target_count,xp,is_active,updated_by)
          VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *''', args).fetchone()
    audit(conn, user, 'quest_definition', row['id'], before, row, '퀘스트 풀 저장')
    return row


def assignment_dto(conn, row):
    return {**row, 'locked': assignment_locked(conn, row), 'items': conn.execute('SELECT * FROM dc.quest_assignment_item WHERE assignment_id=%s ORDER BY position', (row['id'],)).fetchall()}


def assignment_locked(conn, row):
    from .quests import today_kst
    return bool((row['published'] and row['starts_on'] <= today_kst()) or
                conn.execute('SELECT 1 FROM dc.quest_completion WHERE assignment_id=%s LIMIT 1', (row['id'],)).fetchone())


@router.get('/system/quests/assignments')
def assignments(period: Period, periodKey: str = Query(max_length=64), page: int = Query(1, ge=1),
                user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    args = (period, periodKey)
    rows = conn.execute('''SELECT a.*,EXISTS(SELECT 1 FROM dc.quest_completion c WHERE c.assignment_id=a.id) AS has_completion
      FROM dc.quest_assignment a WHERE period=%s AND period_key=%s ORDER BY id DESC LIMIT 20 OFFSET %s''', (*args, (page-1)*20)).fetchall()
    total = conn.execute('SELECT count(*) n FROM dc.quest_assignment WHERE period=%s AND period_key=%s', args).fetchone()['n']
    items = conn.execute('SELECT * FROM dc.quest_assignment_item WHERE assignment_id=ANY(%s) ORDER BY position', ([r['id'] for r in rows],)).fetchall()
    from .quests import today_kst
    return dict(items=[{**r, 'locked': r['has_completion'] or (r['published'] and r['starts_on'] <= today_kst()),
                       'items': [i for i in items if i['assignment_id'] == r['id']]} for r in rows], totalCount=total)


def period_dates(conn, period, key):
    if period == 'MONTHLY':
        try:
            if len(key) != 7:
                raise ValueError()
            start = date.fromisoformat(key+'-01')
            return start, start.replace(day=monthrange(start.year, start.month)[1])
        except ValueError:
            raise HTTPException(422, '운영 월을 선택하세요.')
    row = conn.execute("SELECT payload FROM dc.code_item WHERE group_code='QUEST_SEMESTER' AND code=%s AND is_active FOR SHARE", (key,)).fetchone()
    if not row:
        raise HTTPException(422, '코드관리에서 운영 학기를 먼저 등록하세요.')
    return date.fromisoformat(row['payload']['startDate']), date.fromisoformat(row['payload']['endDate'])


def audiences_overlap(left, right):
    if left['audience'] == 'ALL' or right['audience'] == 'ALL':
        return True
    return all(not left[key] or not right[key] or bool(set(left[key]) & set(right[key])) for key in ('grades', 'student_types'))


def ensure_schedule_available(conn, period, start, end, assignment_id, audience):
    candidates = conn.execute('SELECT * FROM dc.quest_assignment WHERE period=%s AND starts_on<=%s AND ends_on>=%s AND id<>%s', (period, end, start, assignment_id)).fetchall()
    if any(audiences_overlap(row, audience) for row in candidates):
        raise HTTPException(409, '같은 기간에 대상 학생이 겹치는 편성이 있습니다. 기존 편성을 수정하거나 학년·유형을 나눠주세요.')


class ScheduleChange(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: StrictInt = Field(ge=1)
    periodKey: str = Field(min_length=1, max_length=64)
    reason: str = Field(min_length=1, max_length=1000)


@router.get('/system/quests/schedules')
def schedules(period: Period, page: int = Query(1, ge=1), q: str = Query('', max_length=100),
              user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    pattern = '%' + q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
    args = (period, pattern)
    rows = conn.execute('''SELECT a.id,a.title,a.period,a.period_key,a.starts_on,a.ends_on,
      a.audience,a.grades,a.student_types,a.published,a.version,
      EXISTS(SELECT 1 FROM dc.quest_completion c WHERE c.assignment_id=a.id) AS has_completion
      FROM dc.quest_assignment a WHERE period=%s AND title ILIKE %s
      ORDER BY id DESC LIMIT 20 OFFSET %s''', (*args, (page-1)*20)).fetchall()
    total = conn.execute('SELECT count(*) n FROM dc.quest_assignment WHERE period=%s AND title ILIKE %s', args).fetchone()['n']
    from .quests import today_kst
    return dict(items=[{**r, 'locked': r['has_completion'] or (r['published'] and r['starts_on'] <= today_kst())} for r in rows], totalCount=total)


@router.put('/system/quests/assignments/{assignment_id}/schedule')
def save_schedule(assignment_id: int, data: ScheduleChange, user=Depends(administrator, scope='function'),
                  conn=Depends(connection, scope='function')):
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended('quest-assignments',0))")
    before = conn.execute('SELECT * FROM dc.quest_assignment WHERE id=%s FOR UPDATE', (assignment_id,)).fetchone()
    if not before or before['version'] != data.expectedVersion:
        raise HTTPException(409, '편성이 변경되었습니다. 목록을 다시 조회하세요.')
    if assignment_locked(conn, before):
        raise HTTPException(409, '시작되었거나 완료 이력이 있는 퀘스트는 운영 일정을 변경할 수 없습니다.')
    start, end = period_dates(conn, before['period'], data.periodKey)
    ensure_schedule_available(conn, before['period'], start, end, assignment_id, before)
    after = conn.execute('''UPDATE dc.quest_assignment SET period_key=%s,starts_on=%s,ends_on=%s,
      updated_by=%s,updated_at=now(),version=version+1 WHERE id=%s RETURNING *''',
      (data.periodKey, start, end, user['intg_uid'], assignment_id)).fetchone()
    audit(conn, user, 'quest_assignment', assignment_id, before, after, data.reason)
    return dict(id=after['id'], version=after['version'])


@router.put('/system/quests/assignments/{assignment_id}')
def save_assignment(assignment_id: int, data: Assignment, user=Depends(administrator, scope='function'),
                    conn=Depends(connection, scope='function')):
    # Serialize overlapping schedules as well as writes to an existing assignment.
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended('quest-assignments',0))")
    before = conn.execute('SELECT * FROM dc.quest_assignment WHERE id=%s FOR UPDATE', (assignment_id,)).fetchone()
    if (assignment_id != 0 and not before) or data.expectedVersion != (before['version'] if before else 0):
        raise HTTPException(409, '편성이 변경되었습니다. 목록을 다시 조회하세요.')
    start, end = period_dates(conn, data.period, data.periodKey)
    # The published contract is frozen once the period starts. Visibility may still change.
    frozen = bool(before and assignment_locked(conn, before))
    if frozen:
        start, end = before['starts_on'], before['ends_on']
    prior_items = assignment_dto(conn, before)['items'] if before else []
    if frozen and (any(before[k] != v for k, v in dict(title=data.title, period=data.period, period_key=data.periodKey,
                       audience=data.audience, grades=data.grades, student_types=data.studentTypes).items())
                   or [i['quest_id'] for i in prior_items] != data.questIds):
        raise HTTPException(409, '시작된 편성은 게시 여부만 변경할 수 있습니다. 다음 기간에 새로 편성하세요.')
    audience = dict(audience=data.audience, grades=data.grades, student_types=data.studentTypes)
    ensure_schedule_available(conn, data.period, start, end, assignment_id, audience)
    rows = conn.execute('SELECT * FROM dc.quest_definition WHERE id=ANY(%s) FOR SHARE', (data.questIds,)).fetchall()
    lookup = {r['id']: r for r in rows}
    if not frozen and (len(rows) != len(data.questIds) or any(not r['is_active'] for r in rows)):
        raise HTTPException(422, '사용 가능한 퀘스트를 선택하세요.')
    args = (data.title, data.period, data.periodKey, start, end, data.audience, data.grades, data.studentTypes, data.published, user['intg_uid'])
    if before:
        row = conn.execute('''UPDATE dc.quest_assignment SET title=%s,period=%s,period_key=%s,starts_on=%s,ends_on=%s,
          audience=%s,grades=%s,student_types=%s,published=%s,updated_by=%s,updated_at=now(),version=version+1 WHERE id=%s RETURNING *''', (*args, assignment_id)).fetchone()
    else:
        row = conn.execute('''INSERT INTO dc.quest_assignment(title,period,period_key,starts_on,ends_on,audience,grades,student_types,published,updated_by)
          VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''', args).fetchone()
    if not frozen:
        conn.execute('DELETE FROM dc.quest_assignment_item WHERE assignment_id=%s', (row['id'],))
        for pos, qid in enumerate(data.questIds):
            q = lookup[qid]
            conn.execute('''INSERT INTO dc.quest_assignment_item(assignment_id,quest_id,position,title,description,activity,target_count,xp,definition_version)
              VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)''', (row['id'], qid, pos, q['title'], q['description'], q['activity'], q['target_count'], q['xp'], q['version']))
    after = assignment_dto(conn, row)
    audit(conn, user, 'quest_assignment', row['id'], {**before, 'items': prior_items} if before else None, after, '퀘스트 편성 저장')
    return after


def student_assignments(conn, uid, day):
    return conn.execute('''SELECT a.* FROM dc.quest_assignment a JOIN dc.student s ON s.intg_uid=%s
      LEFT JOIN LATERAL (SELECT student_type FROM dc.current_student_type t WHERE t.student_uid=s.intg_uid
        ORDER BY decided_at DESC,id DESC LIMIT 1) t ON true
      WHERE a.published AND a.starts_on<=%s AND a.ends_on>=%s AND
       (a.audience='ALL' OR ((cardinality(a.grades)=0 OR s.grade=ANY(a.grades))
       AND (cardinality(a.student_types)=0 OR coalesce(t.student_type,'UNDIAGNOSED')=ANY(a.student_types))))
      ORDER BY a.period,a.id''', (uid, day, day)).fetchall()


def activity_counts(conn, uid, start, end, activities=None):
    """One aggregate per activity, shared by all items in a period; no per-quest scans."""
    args = (uid, start, end + timedelta(days=1))
    since = until = "(%s::date::timestamp AT TIME ZONE 'Asia/Seoul')"
    counsel = ("SELECT count(*) n FROM dc.counsel_request WHERE student_uid=%s AND status_code='DONE' AND type_code {} "
               "AND completed_at>=" + since + " AND completed_at<" + until)
    growth = ("SELECT count(*) n FROM dc.growth_entry WHERE student_uid=%s AND deleted_at IS NULL {} "
              "AND created_at>=" + since + " AND created_at<" + until)
    mission = ("SELECT count(DISTINCT {}) n FROM dc.mission_attempt WHERE student_uid=%s AND kind='{}' AND submitted_at IS NOT NULL {} "
               "AND submitted_at>=" + since + " AND submitted_at<" + until)
    queries = {
        'ATTENDANCE': 'SELECT count(*) n FROM dc.quest_attendance WHERE student_uid=%s AND attended_on>=%s AND attended_on<%s',
        'DIAGNOSIS': "SELECT count(*) n FROM dc.diagnosis_attempt WHERE student_uid=%s AND status_code='DONE' AND completed_at>=" + since + " AND completed_at<" + until,
        # 심리상담(PSY)은 어떤 상담 퀘스트에서도 세지 않는다.
        'COUNSEL': counsel.format("IN ('CAREER','PROF')"),
        'COUNSEL_CAREER': counsel.format("='CAREER'"),
        'COUNSEL_PROF': counsel.format("='PROF'"),
        'GROUP_COUNSEL': """SELECT count(*) n FROM dc.group_counsel_member m JOIN dc.group_counsel g ON g.id=m.group_id
          WHERE m.student_uid=%s AND m.attended AND g.status='DONE' AND g.session_date>=%s AND g.session_date<%s""",
        'ROADMAP_ITEM': "SELECT count(*) n FROM dc.roadmap_item WHERE student_uid=%s AND status='DONE' AND completed_at>=" + since + " AND completed_at<" + until,
        'PROGRAM': """SELECT count(*) n FROM dc.program_apply a WHERE a.student_uid=%s AND a.outcome_code='COMPLETED'
          AND (SELECT min(e.changed_at) FROM dc.program_apply_event e WHERE e.student_uid=a.student_uid
            AND e.program_id=a.program_id AND e.action='OUTCOME' AND e.after_value->>'outcomeStatus'='COMPLETED')
          BETWEEN (%s::date::timestamp AT TIME ZONE 'Asia/Seoul') AND (%s::date::timestamp AT TIME ZONE 'Asia/Seoul') - interval '1 microsecond'""",
        'CERTIFICATE': 'SELECT count(*) n FROM dc.student_cert WHERE intg_uid=%s AND verified AND acquired_dt>=%s AND acquired_dt<%s',
        'GROWTH_RECORD': growth.format(''),
        'GROWTH_JOURNAL': growth.format("AND kind_code='JOURNAL'"),
        'GROWTH_PROJECT': growth.format("AND kind_code='PROJECT'"),
        'MISSION_TOEIC': mission.format("(submitted_at AT TIME ZONE 'Asia/Seoul')::date", 'TOEIC', "AND (result->>'questPassed')::boolean"),
        'MISSION_NCS_GSAT': mission.format('week_id', 'NCS_GSAT', ''),
        'RESUME_WRITE': "SELECT count(*) n FROM dc.job_resume WHERE student_uid=%s AND deleted_at IS NULL AND created_at>=" + since + " AND created_at<" + until,
        'AI_RESUME': "SELECT count(*) n FROM dc.ai_run r WHERE student_uid=%s AND kind_code='RESUME_REVIEW' AND created_at>=" + since + " AND created_at<" + until + " AND EXISTS(SELECT 1 FROM dc.ai_score s WHERE s.run_id=r.id)",
        'JOB_APPLY': "SELECT count(*) n FROM dc.job_application WHERE student_uid=%s AND status<>'CANCELED' AND record_origin='LIVE' AND applied_at>=" + since + " AND applied_at<" + until,
    }
    return {key: conn.execute(sql, args).fetchone()['n'] for key, sql in queries.items() if activities is None or key in activities}


def progress(conn, uid, day, *, award=False):
    from .quests import grant_xp, reward_rules
    assignments = student_assignments(conn, uid, day)
    if not assignments:
        return []
    items = conn.execute('''SELECT i.*,c.completed_on,c.granted_xp FROM dc.quest_assignment_item i
      LEFT JOIN dc.quest_completion c ON c.assignment_id=i.assignment_id AND c.quest_id=i.quest_id AND c.student_uid=%s
      WHERE i.assignment_id=ANY(%s) ORDER BY i.position''', (uid, [a['id'] for a in assignments])).fetchall()
    rules = reward_rules(conn)
    output = []
    for a in assignments:
        assignment_items = [i for i in items if i['assignment_id'] == a['id']]
        counts = activity_counts(conn, uid, a['starts_on'], min(day, a['ends_on']), {i['activity'] for i in assignment_items})
        for item in assignment_items:
            done = bool(item['completed_on'])
            value = counts[item['activity']]
            granted = item['granted_xp']
            if award and not done and value >= item['target_count']:
                result = grant_xp(conn, uid, source_type='QUEST', source_key=f"assignment:{a['id']}:{item['quest_id']}",
                                  title=item['title'], amount=item['xp'], day=day,
                                  reward_code=a['period'], reward_version=rules[a['period']]['version'])
                granted = result['grantedXp']
                conn.execute('INSERT INTO dc.quest_completion(student_uid,assignment_id,quest_id,completed_on,granted_xp) VALUES(%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING', (uid, a['id'], item['quest_id'], day, granted))
                done = True
            output.append({**item, 'period': a['period'], 'current': value, 'done': done, 'granted_xp': granted})
    return output
