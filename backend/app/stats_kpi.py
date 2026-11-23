"""KPI 통계(/stats/kpi, 2026-11-23) — CARE+7 7단계 참여 퍼널과 사용자가 준 상세 지표표의 목표 대비 실적.

읽기 전용 집계. 목표값은 사용자 지시로 코드 상수에서 시작한다(관리 화면·테이블은 추후).
· 재학생 = 학사 복제본 dc.student_login_source 의 재학(hofc_sta_cd='0001'), 졸업 = '0005' (student_contact 와 같은 기준).
  졸특 지표의 분모는 「졸업+졸업예정」이지만 졸업예정은 학사 연동 전이라 졸업자만 센다 — 응답 note 에 적는다.
· 원천이 없는 지표(COSS·만족도 조사·HR 파워링크·고용정보원·대학정보공시·사후관리)는 value=None 으로 행을 유지한다(「집계 전」).
· 대플 진단참여율은 사용자 지시로 뺐다.
"""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from .auth import principal
from .counsel_dashboard import counselor
from .db import connection
from .stats import KST_DAY, pct

router = APIRouter()
SEOUL = ZoneInfo('Asia/Seoul')
ENROLLED, GRADUATED = '0001', '0005'
COMPANY_TARGET = 50

FUNNEL = [('diagnosis', '진단'), ('counsel', '상담'), ('roadmap', '로드맵'), ('program', '역량강화'),
          ('company', '기업연계'), ('employment', '취업지원'), ('aftercare', '사후관리')]

# (그룹, 라벨, [(지표키, 지표명, 산출식, 목표값, 단위)]) — 목표 None = 미정, 단위 '점'은 100점 환산
INDICATORS = [
    ('diagnosis', '진단', [
        ('participation', '진단 참여율', '진단 참여자 수 / 재학생 수 × 100', 30, '%'),
        ('participation_grad', '(졸특) 진단 참여율', '진단 참여자 수 / 졸업(예정)자 수 × 100', 30, '%'),
        ('participation_enrolled', '(재맞고) 진단 참여율', '진단 참여자 수 / 재학생 수 × 100', 80, '%'),
        ('counsel_link', '진단-상담연계율', '상담 연계자 수 / 진단 참여자 수 × 100', 60, '%'),
    ]),
    ('counsel', '상담', [
        ('counsel_done', '상담 이행율', '상담자 수 / 진단 참여자 수 × 100', None, '%'),
        ('coss', 'COSS 활용률', 'COSS 이용 학생 수 / 전체 재학생 수 × 100', 30, '%'),
        ('counsel_satisfaction', '상담 만족도', '(통합예약+서비스+대응+사후관리 만족도) / 참여자 수', 70, '점'),
        ('iap_link', 'IAP 연계율', 'IAP 참여자 수 / 상담자 수 × 100', None, '%'),
    ]),
    ('roadmap', 'IAP/경력개발로드맵', [
        ('iap_setup', 'IAP 수립률', 'IAP 수립자 수 / 상담자 수 × 100', None, '%'),
        ('iap_progress', 'IAP 이행률', 'IAP 기반 추천 활동 이수 칸 / IAP 전체 칸 × 100', 30, '%'),
    ]),
    ('program', '역량강화', [
        ('growth_career', '진로역량향상률', '진로 사전/사후진단 향상률', 30, '%'),
        ('growth_employ', '취업역량향상률', '취업 사전/사후진단 향상률', 30, '%'),
        ('growth_job', '직무역량향상률', '직무 사전/사후진단 향상률', 30, '%'),
        ('program_satisfaction', '프로그램 만족도', '프로그램별 만족도 종합(100점 환산)', 70, '점'),
        ('program_completion', '프로그램 이수율', '수료 / 선발 × 100', 80, '%'),
        ('glocal_ratio', '지역특화 프로그램 운영비율', '특화(글로컬) 프로그램 건수 / 연간 프로그램 수 × 100', 30, '%'),
    ]),
    ('company', '기업연계', [
        ('company_link', '기업연계 참여율', '대학 밀착기업 HR 파워링크: 달성 건수 / 연간 목표 건수 × 100', 70, '%'),
        ('company_satisfaction', '기업 만족도', '기업 만족도조사 시행 후 점수', 70, '점'),
    ]),
    ('employment', '취업지원', [
        ('employ_competency', '취업역량향상도', '한국고용정보원 조사 결과 반영', 85, '점'),
        ('employment_rate', '취업률', '대학정보공시 취업률 반영', 60, '%'),
        ('local_employment_rate', '지역 산업체 취업률', '지역 산업체 취업률', 65, '%'),
        ('platform_companies', '기업정보플랫폼 구축률', '기업정보플랫폼 기업 구축 수', COMPANY_TARGET, '개사'),
        ('platform_usage', '기업정보플랫폼 이용률', '기업정보플랫폼 이용률', None, '%'),
        ('matching_rate', '취업매칭율', '학생-기업 매칭 알고리즘 산출물', None, '%'),
    ]),
    ('aftercare', '사후관리', [
        ('employment_success', '취업성공률 및 연계율', '(취업자 수 + 연계자 수) / 참여자 수 × 100', None, '%'),
        ('retention_rate', '유지취업률', '대학 정보공시 취업률 반영', 80, '%'),
        ('aftercare_rate', '사후관리 이행률', 'CARE+7 사후관리 대상자 / 전체 참여자 수 × 100', None, '%'),
    ]),
]


def today():
    return datetime.now(SEOUL).date()


def status_of(value, target):
    if value is None:
        return 'NA'
    if target is None:
        return 'NONE'
    rate = pct(value, target)
    return 'OK' if rate >= 90 else 'WARN' if rate >= 70 else 'ALERT'


def population(status, college, dept, grade, student_type):
    where, params = ['a.hofc_sta_cd=%s'], [status]
    if college:
        where.append('a.college_code=%s'); params.append(college)
    if dept:
        where.append('a.dept_code=%s'); params.append(dept)
    if grade:
        where.append('a.stu_schgr=%s'); params.append(str(grade))
    if student_type == 'NONE':
        where.append('NOT EXISTS(SELECT 1 FROM dc.current_student_type t WHERE t.student_uid=a.intg_uid)')
    elif student_type:
        where.append('EXISTS(SELECT 1 FROM dc.current_student_type t WHERE t.student_uid=a.intg_uid AND t.student_type=%s)')
        params.append(student_type)
    return f"SELECT a.intg_uid AS student_uid FROM dc.student_login_source a WHERE {' AND '.join(where)}", params


@router.get('/stats/kpi')
def kpi(response: Response, dateFrom: date | None = Query(None, alias='from'), dateTo: date | None = Query(None, alias='to'),
        college: str | None = Query(None, max_length=20), dept: str | None = Query(None, max_length=20),
        grade: int | None = Query(None, ge=1, le=9), type: str | None = Query(None, pattern=r'^(T[1-6]|NONE)$'),
        user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    counselor(conn, user)
    response.headers['Cache-Control'] = 'no-store'
    day = today()
    to = dateTo or day
    frm = dateFrom or (to - timedelta(days=182))
    if frm > to:
        raise HTTPException(422, '시작일이 종료일보다 늦습니다.')
    pop_sql, pop_params = population(ENROLLED, college, dept, grade, type)
    grad_sql, grad_params = population(GRADUATED, college, dept, grade, type)
    rng = [frm, to]
    base = f'''WITH pop AS ({pop_sql}), grads AS ({grad_sql}),
      diag AS (SELECT DISTINCT d.student_uid FROM dc.diagnosis_attempt d WHERE d.status_code='DONE' AND {KST_DAY.format(col='d.completed_at')}),
      counseled AS (SELECT DISTINCT r.student_uid FROM dc.counsel_request r WHERE r.status_code='DONE' AND {KST_DAY.format(col='r.requested_at')}),
      linked AS (SELECT DISTINCT r.student_uid FROM dc.counsel_request r WHERE {KST_DAY.format(col='r.requested_at')})'''
    base_params = [*pop_params, *grad_params, *rng, *rng, *rng]

    row = conn.execute(base + '''
      SELECT (SELECT count(*) FROM pop) AS enrolled,(SELECT count(*) FROM grads) AS graduated,
        (SELECT count(*) FROM pop p JOIN diag USING(student_uid)) AS diagnosed,
        (SELECT count(*) FROM grads g JOIN diag USING(student_uid)) AS diagnosed_grads,
        (SELECT count(*) FROM pop p JOIN diag USING(student_uid) JOIN linked USING(student_uid)) AS linked,
        (SELECT count(*) FROM pop p JOIN diag USING(student_uid) JOIN counseled USING(student_uid)) AS counseled_diag,
        (SELECT count(*) FROM pop p JOIN counseled USING(student_uid)) AS counseled,
        (SELECT count(*) FROM pop p JOIN counseled USING(student_uid) WHERE EXISTS(SELECT 1 FROM dc.roadmap m WHERE m.student_uid=p.student_uid)) AS iap_linked,
        (SELECT count(*) FROM pop p JOIN counseled USING(student_uid) WHERE EXISTS(SELECT 1 FROM dc.roadmap m WHERE m.student_uid=p.student_uid AND m.status_code='CONFIRMED')) AS iap_setup,
        (SELECT COALESCE(sum(x.done),0) FROM pop p JOIN dc.roadmap m ON m.student_uid=p.student_uid, LATERAL dc.roadmap_progress(m.student_uid,now()) x) AS items_done,
        (SELECT COALESCE(sum(x.total),0) FROM pop p JOIN dc.roadmap m ON m.student_uid=p.student_uid, LATERAL dc.roadmap_progress(m.student_uid,now()) x) AS items_total
    ''', base_params).fetchone()

    programs = conn.execute(f'''WITH pop AS ({pop_sql}) SELECT
      count(*) FILTER(WHERE a.selection_code='SELECTED') AS selected,
      count(*) FILTER(WHERE a.outcome_code='COMPLETED') AS completed
      FROM dc.program_apply a JOIN pop p ON p.student_uid=a.student_uid
      WHERE a.cancelled_at IS NULL AND {KST_DAY.format(col='a.applied_at')}''', [*pop_params, *rng]).fetchone()
    glocal = conn.execute('''SELECT count(*) AS total,count(*) FILTER(WHERE middle_category_code='GLOCAL') AS glocal
      FROM dc.program g WHERE g.run_start BETWEEN %s AND %s''', rng).fetchone()
    satisfaction = conn.execute(f'''WITH pop AS ({pop_sql}) SELECT round(avg(a.value)*20,1) AS score FROM dc.survey_response r
      JOIN pop p ON p.student_uid=r.student_uid JOIN dc.survey_answer a ON a.response_id=r.id
      WHERE r.phase='SATISFACTION' AND a.value IS NOT NULL AND {KST_DAY.format(col='r.submitted_at')}''', [*pop_params, *rng]).fetchone()
    # 사전·사후를 모두 낸 (프로그램, 학생) 쌍 — 영역(진로 CAREER / 취업 EMPLOY / 직무 JOB)별 평균의 증가율을 쌍마다 구해 평균한다.
    growth = {r['area']: float(r['growth']) for r in conn.execute(f'''WITH pop AS ({pop_sql}),
      score AS (SELECT r.program_id,r.student_uid,r.phase,split_part(a.item_code,'_',1) AS area,avg(a.value) AS mean
        FROM dc.survey_response r JOIN pop p ON p.student_uid=r.student_uid JOIN dc.survey_answer a ON a.response_id=r.id
        WHERE r.phase IN ('PRE','POST') AND a.value IS NOT NULL AND {KST_DAY.format(col='r.submitted_at')}
        GROUP BY 1,2,3,4)
      SELECT pre.area,round(avg((post.mean-pre.mean)/pre.mean*100)::numeric,1) AS growth
      FROM score pre JOIN score post ON post.program_id=pre.program_id AND post.student_uid=pre.student_uid AND post.area=pre.area
      WHERE pre.phase='PRE' AND post.phase='POST' AND pre.mean>0 GROUP BY 1''', [*pop_params, *rng]).fetchall()}
    companies = conn.execute('SELECT count(*) AS n FROM dc.company WHERE deleted_at IS NULL').fetchone()['n']

    funnel_row = conn.execute(f'''WITH pop AS ({pop_sql}) SELECT
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.diagnosis_attempt d WHERE d.student_uid=p.student_uid AND d.status_code='DONE')) AS diagnosis,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.counsel_request r WHERE r.student_uid=p.student_uid AND r.status_code='DONE')) AS counsel,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.roadmap m WHERE m.student_uid=p.student_uid)) AS roadmap,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.program_apply a WHERE a.student_uid=p.student_uid AND a.cancelled_at IS NULL AND a.selection_code='SELECTED')) AS program,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.job_application j JOIN dc.job_posting g ON g.id=j.posting_id
        WHERE j.student_uid=p.student_uid AND j.status<>'CANCELED' AND g.recruit_type='RECOMMENDATION')) AS company,
      count(*) FILTER(WHERE EXISTS(SELECT 1 FROM dc.job_application j WHERE j.student_uid=p.student_uid AND j.status='PASSED')) AS employment
      FROM pop p''', pop_params).fetchone()

    values = {
        'participation': pct(row['diagnosed'], row['enrolled']),
        'participation_grad': pct(row['diagnosed_grads'], row['graduated']),
        'participation_enrolled': pct(row['diagnosed'], row['enrolled']),
        'counsel_link': pct(row['linked'], row['diagnosed']),
        'counsel_done': pct(row['counseled_diag'], row['diagnosed']),
        'iap_link': pct(row['iap_linked'], row['counseled']),
        'iap_setup': pct(row['iap_setup'], row['counseled']),
        'iap_progress': pct(row['items_done'], row['items_total']),
        'growth_career': growth.get('CAREER'), 'growth_employ': growth.get('EMPLOY'), 'growth_job': growth.get('JOB'),
        'program_satisfaction': float(satisfaction['score']) if satisfaction['score'] is not None else None,
        'program_completion': pct(programs['completed'], programs['selected']),
        'glocal_ratio': pct(glocal['glocal'], glocal['total']),
        'platform_companies': int(companies),
    }
    notes = {'participation_grad': '졸업예정자는 학사 연동 후 분모에 더한다 — 지금은 졸업자만 센다.'}
    groups = []
    for key, label, items in INDICATORS:
        rows = []
        for ikey, name, formula, target, unit in items:
            value = values.get(ikey)
            rows.append({'key': ikey, 'name': name, 'formula': formula, 'target': target, 'unit': unit, 'value': value,
                         'rate': None if value is None or target is None else pct(value, target),
                         'status': status_of(value, target), 'note': notes.get(ikey)})
        groups.append({'key': key, 'label': label, 'indicators': rows})
    funnel = [{'key': k, 'label': l, 'count': None if k == 'aftercare' else int(funnel_row[k])} for k, l in FUNNEL]
    return {'refDate': day, 'filters': {'from': frm, 'to': to, 'college': college, 'dept': dept, 'grade': grade, 'type': type},
            'enrolled': int(row['enrolled']), 'graduated': int(row['graduated']),
            'funnel': funnel, 'diagnosis': weakest_transition(funnel), 'groups': groups}


def weakest_transition(funnel):
    """자동 진단 — 집계된 연속 단계 사이에서 전환율이 가장 낮은 구간."""
    worst = None
    for i in range(1, len(funnel)):
        prev, cur = funnel[i - 1], funnel[i]
        if prev['count'] is None or cur['count'] is None or not prev['count']:
            continue
        rate = pct(cur['count'], prev['count'])
        if worst is None or rate < worst['rate']:
            worst = {'fromStage': i, 'toStage': i + 1, 'fromLabel': prev['label'], 'toLabel': cur['label'], 'rate': rate}
    return worst
