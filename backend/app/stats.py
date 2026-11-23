"""통계 현황 대시보드(2026-11-23) — 상담사(진로·심리)가 내 범위/전체 범위의 영역별 지표를 본다.

읽기 전용 집계다. 새 테이블·파생 저장 없음(CLAUDE.md 규칙 3·10): 모든 수치는 요청마다 정본에서 센다.
· 범위(scope)  mine = 내가 상담했거나 담당 학과(staff_student_scope)인 학생 · 상담은 내 배정 건
               all  = 접근 가능한 전체(상담은 역할 visibility 그대로: 심리상담사=심리, 진로=심리 외)
· 필터         기간(이벤트 발생일, KST) · 단과대 · 학과 · 학년 · 진단유형(T1~T6, NONE=미정)
· 영역(area)   diagnosis · counsel · roadmap · program · job — 한 번에 한 영역만 집계해 돌려준다.
요약 파이프라인(진단→상담→로드맵→비교과→채용)은 기간과 무관한 누적 현황이다 — 화면이 그렇게 표시한다.
"""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from .auth import principal
from .counsel_dashboard import counselor
from .db import connection

router = APIRouter()
SEOUL = ZoneInfo('Asia/Seoul')
AREAS = ('diagnosis', 'counsel', 'roadmap', 'program', 'job')
KST_DAY = "({col} AT TIME ZONE 'Asia/Seoul')::date BETWEEN %s AND %s"
# 발생 시점 월 키 — 화면 축과 같은 YYYY-MM
MONTH = "to_char({col} AT TIME ZONE 'Asia/Seoul','YYYY-MM')"
GRADES = [str(g) for g in range(1, 10)] + ['ETC']
GRADE_LABELS = {str(g): f'{g}학년' for g in range(1, 10)} | {'ETC': '미상'}


def today():
    return datetime.now(SEOUL).date()


def month_keys(frm: date, to: date):
    keys, cursor = [], frm.replace(day=1)
    while cursor <= to:
        keys.append(cursor.strftime('%Y-%m'))
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    return keys


def labels(conn, group):
    return {r['code']: r['label'] for r in conn.execute(
        'SELECT code,label FROM dc.code_item WHERE group_code=%s', (group,)).fetchall()}


def buckets(rows, label_of=None, order=None):
    """[{key,label,count}] — 라벨은 코드표, 없으면 코드 그대로. order 가 있으면 그 순서, 없으면 많은 순."""
    out = [{'key': r['key'], 'label': (label_of or {}).get(r['key'], r['key'] or '미지정'), 'count': int(r['count'])}
           for r in rows]
    if order:
        rank = {k: i for i, k in enumerate(order)}
        out.sort(key=lambda b: rank.get(b['key'], len(rank)))
    else:
        out.sort(key=lambda b: (-b['count'], b['label']))
    return out


def series(months, rows, keys):
    """월별 행(month + 값 열들)을 {months, series:[{key,values}]} 로 — 빈 달은 0."""
    by_month = {r['month']: r for r in rows}
    return {'months': months, 'series': [
        {'key': k, 'values': [int(by_month[m][k] or 0) if m in by_month else 0 for m in months]} for k in keys]}


def pct(part, whole):
    return 0 if not whole else round(part * 1000 / whole) / 10


def population(user, scope, college, dept, grade, student_type):
    """pop CTE — 필터와 범위를 통과한 학생. 모든 영역이 이 집합과 조인한다."""
    where, params = ['true'], []
    if scope == 'mine':
        where.append('''(EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=s.intg_uid)
          OR EXISTS(SELECT 1 FROM dc.counsel_request q WHERE q.counselor_uid=%s AND q.student_uid=s.intg_uid))''')
        params += [user['intg_uid'], user['intg_uid']]
    if college:
        where.append('s.college_code=%s'); params.append(college)
    if dept:
        where.append('s.dept_code=%s'); params.append(dept)
    if grade:
        where.append('s.grade=%s'); params.append(grade)
    if student_type == 'NONE':
        where.append('t.student_type IS NULL')
    elif student_type:
        where.append('t.student_type=%s'); params.append(student_type)
    sql = f'''pop AS (
      SELECT s.intg_uid AS student_uid,s.grade,s.college_code,s.dept_code,d.dept_name,d.college_name,t.student_type
      FROM dc.student s
      LEFT JOIN dc.current_student_type t ON t.student_uid=s.intg_uid
      LEFT JOIN dc.department d ON d.college_code=s.college_code AND d.dept_code=s.dept_code
      WHERE {' AND '.join(where)})'''
    return sql, params


@router.get('/stats/overview')
def overview(response: Response, area: str = Query('counsel'), scope: str = Query('mine'),
             dateFrom: date | None = Query(None, alias='from'), dateTo: date | None = Query(None, alias='to'),
             college: str | None = Query(None, max_length=20), dept: str | None = Query(None, max_length=20),
             grade: int | None = Query(None, ge=1, le=9), type: str | None = Query(None, pattern=r'^(T[1-6]|NONE)$'),
             user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    role = counselor(conn, user)
    response.headers['Cache-Control'] = 'no-store'
    if area not in AREAS:
        raise HTTPException(422, '영역이 올바르지 않습니다.')
    if scope not in ('mine', 'all'):
        raise HTTPException(422, '범위가 올바르지 않습니다.')
    day = today()
    to = dateTo or day
    frm = dateFrom or (to - timedelta(days=182))
    if frm > to:
        raise HTTPException(422, '시작일이 종료일보다 늦습니다.')
    if (to - frm).days > 366 * 3:
        raise HTTPException(422, '기간은 3년 이내로 지정하세요.')
    pop_sql, pop_params = population(user, scope, college, dept, grade, type)
    ctx = dict(conn=conn, user=user, role=role, scope=scope, pop=pop_sql, pop_params=pop_params,
               frm=frm, to=to, months=month_keys(frm, to))
    summary = pipeline(ctx)
    ctx['population'] = summary['students']
    return {'refDate': day, 'role': role, 'scope': scope, 'area': area,
            'filters': {'from': frm, 'to': to, 'college': college, 'dept': dept, 'grade': grade, 'type': type},
            'population': summary['students'], 'pipeline': summary,
            'data': {'diagnosis': diagnosis, 'counsel': counsel, 'roadmap': roadmap,
                     'program': program, 'job': job}[area](ctx)}


def pipeline(ctx):
    """진단→상담→로드맵→비교과→채용 — 모집단 학생이 각 단계를 한 번이라도 지났는지(누적, 기간 무관)."""
    row = ctx['conn'].execute(f'''WITH {ctx['pop']} SELECT count(*) AS students,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.diagnosis_attempt a WHERE a.student_uid=p.student_uid
        AND a.test_id='ccore' AND a.status_code='DONE')) AS diagnosis,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.counsel_request r WHERE r.student_uid=p.student_uid
        AND r.status_code='DONE')) AS counsel,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.roadmap r WHERE r.student_uid=p.student_uid)) AS roadmap,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.program_apply a WHERE a.student_uid=p.student_uid
        AND a.outcome_code='COMPLETED')) AS program,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.job_application a WHERE a.student_uid=p.student_uid
        AND a.status<>'CANCELED')) AS job
      FROM pop p''', ctx['pop_params']).fetchone()
    stages = [('diagnosis', 'C-CORE 진단 완료'), ('counsel', '상담 완료'), ('roadmap', '로드맵 보유'),
              ('program', '비교과 수료'), ('job', '채용 지원')]
    return {'students': int(row['students']),
            'stages': [{'key': k, 'label': l, 'count': int(row[k])} for k, l in stages]}


def diagnosis(ctx):
    conn, months = ctx['conn'], ctx['months']
    base = f'''WITH {ctx['pop']}, att AS (
      SELECT a.*,p.student_type,p.grade AS pop_grade FROM dc.diagnosis_attempt a JOIN pop p ON p.student_uid=a.student_uid
      WHERE a.status_code='DONE' AND {KST_DAY.format(col='a.completed_at')})'''
    params = [*ctx['pop_params'], ctx['frm'], ctx['to']]
    k = conn.execute(base + '''SELECT count(*) AS attempts,count(DISTINCT student_uid) AS students,
      count(DISTINCT student_uid) FILTER(WHERE test_id='ccore') AS core_students,
      count(*) FILTER(WHERE test_id<>'ccore') AS followups,
      count(DISTINCT student_uid) FILTER(WHERE test_id='c5') AS c5_students FROM att''', params).fetchone()
    by_month = conn.execute(base + f'''SELECT {MONTH.format(col='completed_at')} AS month,
      count(*) FILTER(WHERE test_id='ccore') AS core,count(*) FILTER(WHERE test_id<>'ccore') AS followup
      FROM att GROUP BY 1''', params).fetchall()
    by_test = conn.execute(base + 'SELECT upper(test_id) AS key,count(*) AS count FROM att GROUP BY 1', params).fetchall()
    by_type = conn.execute(base + '''SELECT COALESCE(student_type,'NONE') AS key,count(DISTINCT student_uid) AS count
      FROM att GROUP BY 1''', params).fetchall()
    by_grade = conn.execute(base + '''SELECT COALESCE(pop_grade::text,'ETC') AS key,count(DISTINCT student_uid) AS count
      FROM att GROUP BY 1''', params).fetchall()
    return {
        'kpis': {'attempts': int(k['attempts']), 'students': int(k['students']), 'coreStudents': int(k['core_students']),
                 'followups': int(k['followups']), 'c5Students': int(k['c5_students']),
                 'participationRate': pct(k['core_students'], ctx['population'])},
        'byMonth': series(months, by_month, ['core', 'followup']),
        'byTest': buckets(by_test, labels(conn, 'DIAGNOSIS_TEST'), order=['CCORE', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']),
        'byType': buckets(by_type, {**labels(conn, 'STUDENT_TYPE'), 'NONE': '유형 미정'},
                          order=['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'NONE']),
        'byGrade': buckets(by_grade, GRADE_LABELS, order=GRADES),
    }


def counsel(ctx):
    conn, months, role = ctx['conn'], ctx['months'], ctx['role']
    where = ["r.legacy_type='심리'" if role == 'psych' else "r.legacy_type<>'심리'"]
    params = [*ctx['pop_params']]
    if ctx['scope'] == 'mine':
        where.append('r.counselor_uid=%s'); params.append(ctx['user']['intg_uid'])
    where.append(KST_DAY.format(col='r.requested_at')); params += [ctx['frm'], ctx['to']]
    base = f'''WITH {ctx['pop']}, req AS (
      SELECT r.*,p.dept_name FROM dc.counsel_request r JOIN pop p ON p.student_uid=r.student_uid
      WHERE {' AND '.join(where)})'''
    k = conn.execute(base + '''SELECT count(*) AS requested,
      count(*) FILTER(WHERE status_code='REQ') AS waiting,
      count(*) FILTER(WHERE status_code='CONFIRMED') AS confirmed,
      count(*) FILTER(WHERE status_code='DONE') AS done,
      count(*) FILTER(WHERE status_code LIKE 'CANCEL%%') AS cancelled,
      count(DISTINCT student_uid) AS students,
      round(avg(slot_date-(requested_at AT TIME ZONE 'Asia/Seoul')::date) FILTER(WHERE status_code='DONE' AND slot_date IS NOT NULL)::numeric,1) AS lead,
      count(*) FILTER(WHERE status_code='DONE' AND EXISTS(SELECT 1 FROM dc.counsel_record c WHERE c.request_id=req.id AND c.status_code='DONE')) AS recorded
      FROM req''', params).fetchone()
    by_month = conn.execute(base + f'''SELECT {MONTH.format(col='requested_at')} AS month,count(*) AS requested,
      count(*) FILTER(WHERE status_code='DONE') AS done,count(*) FILTER(WHERE status_code LIKE 'CANCEL%%') AS cancelled
      FROM req GROUP BY 1''', params).fetchall()
    by_status = conn.execute(base + '''SELECT CASE WHEN status_code LIKE 'CANCEL%%' THEN 'CANCELLED' ELSE status_code END AS key,
      count(*) AS count FROM req GROUP BY 1''', params).fetchall()
    by_method = conn.execute(base + 'SELECT method_code AS key,count(*) AS count FROM req GROUP BY 1', params).fetchall()
    by_kind = conn.execute(base + 'SELECT legacy_type AS key,count(*) AS count FROM req GROUP BY 1', params).fetchall()
    by_topic = conn.execute(base + '''SELECT COALESCE(NULLIF(topic,''),'(주제 없음)') AS key,count(*) AS count
      FROM req GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 8''', params).fetchall()
    by_dept = conn.execute(base + '''SELECT COALESCE(dept_name,snapshot->>'major','미상') AS key,count(*) AS count
      FROM req GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 8''', params).fetchall()
    heat = conn.execute(base + '''SELECT extract(isodow FROM slot_date)::int AS dow,extract(hour FROM slot_start)::int AS hour,
      count(*) AS count FROM req WHERE slot_date IS NOT NULL AND slot_start IS NOT NULL
      AND status_code IN ('CONFIRMED','DONE') GROUP BY 1,2''', params).fetchall()
    return {
        'kpis': {'requested': int(k['requested']), 'waiting': int(k['waiting']), 'confirmed': int(k['confirmed']),
                 'done': int(k['done']), 'cancelled': int(k['cancelled']), 'students': int(k['students']),
                 'completionRate': pct(k['done'], k['requested']), 'cancelRate': pct(k['cancelled'], k['requested']),
                 'avgLeadDays': float(k['lead'] or 0), 'recordedRate': pct(k['recorded'], k['done'])},
        'byMonth': series(months, by_month, ['requested', 'done', 'cancelled']),
        'byStatus': buckets(by_status, {'REQ': '대기', 'CONFIRMED': '확정', 'DONE': '완료', 'CANCELLED': '취소'},
                            order=['REQ', 'CONFIRMED', 'DONE', 'CANCELLED']),
        'byMethod': buckets(by_method, {'OFFLINE': '대면', 'ONLINE': '비대면'}),
        'byKind': buckets(by_kind),
        'byTopic': buckets(by_topic),
        'byDept': buckets(by_dept),
        'heatmap': [{'dow': r['dow'], 'hour': r['hour'], 'count': int(r['count'])} for r in heat],
    }


def roadmap(ctx):
    conn, months = ctx['conn'], ctx['months']
    base = f'''WITH {ctx['pop']}, rm AS (
      SELECT r.*,pr.pct AS progress,pr.done AS items_done,pr.total AS items_total
      FROM dc.roadmap r JOIN pop p ON p.student_uid=r.student_uid
      LEFT JOIN LATERAL dc.roadmap_progress(r.student_uid,now()) pr ON true
      WHERE {KST_DAY.format(col='r.created_at')})'''
    params = [*ctx['pop_params'], ctx['frm'], ctx['to']]
    k = conn.execute(base + '''SELECT count(*) AS total,count(*) FILTER(WHERE status_code='CONFIRMED') AS confirmed,
      round(avg(progress)::numeric,1) AS avg_progress,COALESCE(sum(items_done),0) AS items_done,
      COALESCE(sum(items_total),0) AS items_total FROM rm''', params).fetchone()
    by_month = conn.execute(base + f'''SELECT {MONTH.format(col='created_at')} AS month,count(*) AS created,
      count(*) FILTER(WHERE status_code='CONFIRMED') AS confirmed FROM rm GROUP BY 1''', params).fetchall()
    by_status = conn.execute(base + 'SELECT status_code AS key,count(*) AS count FROM rm GROUP BY 1', params).fetchall()
    bins = conn.execute(base + 'SELECT least(progress/20,4) AS bin,count(*) AS count FROM rm GROUP BY 1', params).fetchall()
    by_axis = conn.execute(base + '''SELECT i.axis AS key,count(*) FILTER(WHERE i.status='DONE') AS done,
      count(*) FILTER(WHERE i.status<>'DONE') AS open FROM dc.roadmap_item i JOIN rm ON rm.student_uid=i.student_uid
      WHERE dc.roadmap_item_alive(i.status,i.entry,i.expires_at,now()) GROUP BY 1''', params).fetchall()
    requests = conn.execute(f'''WITH {ctx['pop']} SELECT count(*) AS total,
      count(*) FILTER(WHERE q.status_code='REQ') AS pending FROM dc.roadmap_request q JOIN pop p ON p.student_uid=q.student_uid
      WHERE {KST_DAY.format(col='q.requested_at')}''', params).fetchone()
    by_bin = {int(r['bin']): int(r['count']) for r in bins if r['bin'] is not None}
    axis_labels = labels(conn, 'ROADMAP_AXIS')
    axis_order = ['IAP', 'CORE', 'GROWTH']
    return {
        'kpis': {'total': int(k['total']), 'confirmed': int(k['confirmed']), 'confirmRate': pct(k['confirmed'], k['total']),
                 'avgProgress': float(k['avg_progress'] or 0), 'itemsDone': int(k['items_done']), 'itemsTotal': int(k['items_total']),
                 'requests': int(requests['total']), 'requestsPending': int(requests['pending'])},
        'byMonth': series(months, by_month, ['created', 'confirmed']),
        'byStatus': buckets(by_status, labels(conn, 'ROADMAP_STATUS'), order=['DRAFT', 'REVIEW', 'CONFIRMED']),
        'progressBins': [{'key': str(i), 'label': l, 'count': by_bin.get(i, 0)} for i, l in
                         enumerate(['0~19%', '20~39%', '40~59%', '60~79%', '80~100%'])],
        'byAxis': [{'key': r['key'], 'label': axis_labels.get(r['key'], r['key']), 'done': int(r['done']), 'open': int(r['open'])}
                   for r in sorted(by_axis, key=lambda r: axis_order.index(r['key']) if r['key'] in axis_order else 9)],
    }


def program(ctx):
    conn, months = ctx['conn'], ctx['months']
    base = f'''WITH {ctx['pop']}, ap AS (
      SELECT a.*,p.grade AS pop_grade,g.category_code,g.middle_category_code,g.title,g.capacity,g.selection_capacity
      FROM dc.program_apply a JOIN pop p ON p.student_uid=a.student_uid JOIN dc.program g ON g.id=a.program_id
      WHERE a.cancelled_at IS NULL AND a.selection_code<>'CANCELLED' AND {KST_DAY.format(col='a.applied_at')})'''
    params = [*ctx['pop_params'], ctx['frm'], ctx['to']]
    k = conn.execute(base + '''SELECT count(*) AS applied,count(DISTINCT student_uid) AS students,
      count(DISTINCT program_id) AS programs,
      count(*) FILTER(WHERE selection_code='SELECTED') AS selected,
      count(*) FILTER(WHERE attendance_code='PRESENT') AS attended,
      count(*) FILTER(WHERE attendance_code='NO_SHOW') AS no_show,
      count(*) FILTER(WHERE outcome_code='COMPLETED') AS completed,
      COALESCE(sum(absence_points),0) AS penalty FROM ap''', params).fetchone()
    by_month = conn.execute(base + f'''SELECT {MONTH.format(col='applied_at')} AS month,count(*) AS applied,
      count(*) FILTER(WHERE outcome_code='COMPLETED') AS completed FROM ap GROUP BY 1''', params).fetchall()
    by_category = conn.execute(base + 'SELECT category_code AS key,count(*) AS count FROM ap GROUP BY 1', params).fetchall()
    by_middle = conn.execute(base + "SELECT COALESCE(middle_category_code,'ETC') AS key,count(*) AS count FROM ap GROUP BY 1", params).fetchall()
    by_grade = conn.execute(base + "SELECT COALESCE(pop_grade::text,'ETC') AS key,count(*) AS count FROM ap GROUP BY 1", params).fetchall()
    top = conn.execute(base + '''SELECT program_id AS id,title,capacity,selection_capacity AS "selectionCapacity",
      count(*) AS applied,count(*) FILTER(WHERE selection_code='SELECTED') AS selected,
      count(*) FILTER(WHERE outcome_code='COMPLETED') AS completed
      FROM ap GROUP BY 1,2,3,4 ORDER BY 5 DESC,2 LIMIT 8''', params).fetchall()
    return {
        'kpis': {'applied': int(k['applied']), 'students': int(k['students']), 'programs': int(k['programs']),
                 'selected': int(k['selected']), 'attended': int(k['attended']), 'noShow': int(k['no_show']),
                 'completed': int(k['completed']), 'completionRate': pct(k['completed'], k['selected']),
                 'penalty': int(k['penalty'])},
        'byMonth': series(months, by_month, ['applied', 'completed']),
        'funnel': [{'key': key, 'label': label, 'count': int(k[key])} for key, label in
                   [('applied', '신청'), ('selected', '선발'), ('attended', '출석'), ('completed', '수료')]],
        'byCategory': buckets(by_category, labels(conn, 'PROGRAM_CATEGORY')),
        'byMiddle': buckets(by_middle, labels(conn, 'PROGRAM_MIDDLE_CATEGORY')),
        'byGrade': buckets(by_grade, GRADE_LABELS, order=GRADES),
        'topPrograms': [{**dict(r), 'applied': int(r['applied']), 'selected': int(r['selected']), 'completed': int(r['completed'])} for r in top],
    }


def job(ctx):
    conn, months = ctx['conn'], ctx['months']
    frm, to = ctx['frm'], ctx['to']
    # 공고는 학생 단위가 아니다 — 범위·학생 필터와 무관하게 기간 안에 게시된 공고를 센다.
    posted = f"j.deleted_at IS NULL AND {KST_DAY.format(col='j.posted_at')}"
    postings = conn.execute(f'''SELECT count(*) AS total,count(*) FILTER(WHERE recruit_type='RECOMMENDATION') AS recommended
      FROM dc.job_posting j WHERE {posted}''', [frm, to]).fetchone()
    posting_type = conn.execute(f'SELECT recruit_type AS key,count(*) AS count FROM dc.job_posting j WHERE {posted} GROUP BY 1', [frm, to]).fetchall()
    company_type = conn.execute(f'''SELECT COALESCE(company_type_code,'ETC') AS key,count(*) AS count FROM dc.job_posting j
      WHERE {posted} GROUP BY 1''', [frm, to]).fetchall()
    base = f'''WITH {ctx['pop']}, app AS (
      SELECT a.*,j.recruit_type FROM dc.job_application a JOIN pop p ON p.student_uid=a.student_uid
      JOIN dc.job_posting j ON j.id=a.posting_id WHERE {KST_DAY.format(col='a.applied_at')}),
    vw AS (SELECT v.* FROM dc.job_posting_view v JOIN pop p ON p.student_uid=v.student_uid WHERE v.viewed_on BETWEEN %s AND %s)'''
    params = [*ctx['pop_params'], frm, to, frm, to]
    k = conn.execute(base + '''SELECT (SELECT count(*) FROM app) AS applications,
      (SELECT count(DISTINCT student_uid) FROM app) AS applicants,
      (SELECT count(*) FROM app WHERE status='PASSED') AS passed,
      (SELECT count(*) FROM app WHERE status IN ('APPLIED','IN_PROGRESS')) AS open,
      (SELECT count(*) FROM vw) AS views,(SELECT count(DISTINCT student_uid) FROM vw) AS viewers''', params).fetchone()
    app_month = conn.execute(base + f"SELECT {MONTH.format(col='applied_at')} AS month,count(*) AS applications FROM app GROUP BY 1", params).fetchall()
    view_month = conn.execute(base + "SELECT to_char(viewed_on,'YYYY-MM') AS month,count(*) AS views FROM vw GROUP BY 1", params).fetchall()
    app_status = conn.execute(base + 'SELECT status AS key,count(*) AS count FROM app GROUP BY 1', params).fetchall()
    app_type = conn.execute(base + 'SELECT recruit_type AS key,count(*) AS count FROM app GROUP BY 1', params).fetchall()
    top = conn.execute(base + '''SELECT j.id,j.company_name_snapshot AS company,j.role,j.recruit_type AS "recruitType",
      (SELECT count(*) FROM vw WHERE vw.posting_id=j.id) AS views,(SELECT count(*) FROM app WHERE app.posting_id=j.id) AS applications
      FROM dc.job_posting j WHERE j.deleted_at IS NULL
      AND (EXISTS(SELECT 1 FROM vw WHERE vw.posting_id=j.id) OR EXISTS(SELECT 1 FROM app WHERE app.posting_id=j.id))
      ORDER BY 5 DESC,6 DESC,2 LIMIT 8''', params).fetchall()
    type_labels = {'RECOMMENDATION': '추천채용', 'GENERAL': '일반채용'}
    return {
        'kpis': {'postings': int(postings['total']), 'recommended': int(postings['recommended']),
                 'applications': int(k['applications']), 'applicants': int(k['applicants']), 'passed': int(k['passed']),
                 'open': int(k['open']), 'passRate': pct(k['passed'], k['applications']),
                 'views': int(k['views']), 'viewers': int(k['viewers'])},
        'applicationsByMonth': series(months, app_month, ['applications']),
        'viewsByMonth': series(months, view_month, ['views']),
        'postingsByType': buckets(posting_type, type_labels, order=['RECOMMENDATION', 'GENERAL']),
        'applicationsByType': buckets(app_type, type_labels, order=['RECOMMENDATION', 'GENERAL']),
        'applicationsByStatus': buckets(app_status, {'APPLIED': '지원', 'IN_PROGRESS': '전형 진행', 'PASSED': '최종합격',
                                                     'FAILED': '불합격', 'CANCELED': '지원 취소'},
                                        order=['APPLIED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'CANCELED']),
        'byCompanyType': buckets(company_type, labels(conn, 'JOB_COMPANY_TYPE')),
        'topPostings': [{**dict(r), 'views': int(r['views']), 'applications': int(r['applications'])} for r in top],
    }
