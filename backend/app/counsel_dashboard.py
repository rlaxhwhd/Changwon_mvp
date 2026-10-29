"""Counselor home: current, scoped PostgreSQL facts; no seed-date fallback."""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from .auth import principal, require_staff
from .counsel import SELECT, dto
from .db import connection
from .jobs import APPLICANT_MENU, scope_condition as job_scope
from .roadmap import has_menu, PLAN_MENU, REQUEST_MENU, scope_condition
from .students import summary as student_summary
from .student_contact import contact_summary

router = APIRouter()
SEOUL = ZoneInfo('Asia/Seoul')
# Same representative date as the request inbox: booked date, otherwise receipt date.
PENDING_INBOX = "r.status_code='REQ' AND COALESCE(r.slot_date,(r.requested_at AT TIME ZONE 'Asia/Seoul')::date)>=%s"


def today():
    return datetime.now(SEOUL).date()


def counselor(conn, user):
    require_staff(user)
    row = conn.execute('SELECT role_code FROM dc.staff WHERE intg_uid=%s', (user['intg_uid'],)).fetchone()
    if not row or row['role_code'] not in ('career', 'psych'):
        raise HTTPException(403, '상담사 홈 접근 권한이 필요합니다.')
    return row['role_code']


def own_condition(user, role):
    # Home shows the logged-in counselor's appointments, never other assignees
    # merely because their students belong to an accessible department.
    return 'r.counselor_uid=%s AND r.legacy_type=%s', [user['intg_uid'], '심리' if role == 'psych' else '진로취업']


@router.get('/counsel-dashboard')
def dashboard(request: Request, response: Response, user=Depends(principal, scope='function'),
              conn=Depends(connection, scope='function')):
    role = counselor(conn, user)
    response.headers['Cache-Control'] = 'no-store'
    day = today()
    condition, values = own_condition(user, role)
    counts = conn.execute(f'''SELECT
      count(*) FILTER(WHERE r.slot_date=%s AND r.status_code IN ('REQ','CONFIRMED','DONE')) AS today,
      count(*) FILTER(WHERE r.slot_date=%s AND r.status_code='DONE') AS "todayDone",
      count(*) FILTER(WHERE {PENDING_INBOX}) AS pending,
      count(*) FILTER(WHERE r.status_code='CONFIRMED') AS confirmed,
      count(*) FILTER(WHERE r.status_code='DONE') AS done,
      count(*) FILTER(WHERE r.status_code IN ('REQ','CONFIRMED','DONE')) AS active,
      count(*) FILTER(WHERE r.status_code='DONE' AND EXISTS(
        SELECT 1 FROM dc.counsel_record cr WHERE cr.request_id=r.id AND cr.status_code='DONE'
      )) AS recorded,
      (SELECT count(*) FROM dc.counsel_record cr JOIN dc.counsel_request r ON r.id=cr.request_id
       WHERE {condition}) AS "recordCount"
      FROM dc.counsel_request r WHERE {condition}''', [day, day, day, *values, *values]).fetchone()
    timeline = conn.execute(SELECT + f''' WHERE {condition}
      AND r.slot_date=%s AND r.status_code IN ('REQ','CONFIRMED','DONE')
      ORDER BY r.slot_start NULLS LAST,r.requested_at,r.id''', [*values, day]).fetchall()
    intake = conn.execute(SELECT + f''' WHERE {condition} AND {PENDING_INBOX}
      ORDER BY r.requested_at DESC,r.id DESC LIMIT 5''', [*values, day]).fetchall()
    # Share the exact roster classification and access scope used by Students.
    distribution = student_summary(request, 'type', user, conn, care7_only=True)
    roadmap = None
    if role == 'career' and has_menu(conn, user, REQUEST_MENU):
        scope, params = scope_condition(user, 'r.student_uid')
        roadmap = conn.execute(f'''SELECT count(*) AS total,
          count(*) FILTER(WHERE r.status_code='REQ') AS pending
          FROM dc.roadmap_request r WHERE {scope}''', params).fetchone()
    psych_tests = None
    if role == 'psych':
        # 오프라인 심리검사 신청(topic_code=PSYCH_TEST_KIND) — 검사관리 「신청」·「완료」와 같은 상태 구분.
        psych_tests = conn.execute(f'''SELECT
          count(*) FILTER(WHERE r.status_code IN ('REQ','CONFIRMED','DONE')) AS total,
          count(*) FILTER(WHERE r.status_code IN ('REQ','CONFIRMED')) AS pending
          FROM dc.counsel_request r WHERE {condition} AND r.topic_code IS NOT NULL''', values).fetchone()
    programs = []
    jobs = None
    if role == 'career':
        # 모집중 비교과 전체(2026-10-29) — 학생 「신청 가능」과 같은 술어, 마감 임박 순.
        programs = conn.execute('''SELECT p.id,p.title,p.category_code AS category,p.capacity,p.apply_end AS "applyEnd",
          (SELECT count(*) FROM dc.program_apply a WHERE a.program_id=p.id AND a.cancelled_at IS NULL) AS applied,
          (SELECT count(*) FROM dc.program_apply a WHERE a.program_id=p.id AND a.cancelled_at IS NULL
           AND (a.applied_at AT TIME ZONE 'Asia/Seoul')::date=%s) AS "todayCount"
          FROM dc.program p WHERE p.status_code='RECRUITING' AND (p.apply_end IS NULL OR
           (p.apply_end + COALESCE(p.apply_end_time,'23:59:59.999999'::time)) AT TIME ZONE 'Asia/Seoul' >= now())
          ORDER BY p.apply_end NULLS LAST,p.id LIMIT 50''', (day,)).fetchall()
        jobs = recruiting_jobs(conn, user, day)
    return {'refDate': day, 'role': role, 'counts': counts, 'distribution': distribution,
            'uncontacted': contact_summary(conn),
            'timeline': [dto(r) for r in timeline], 'intake': [dto(r) for r in intake],
            'programs': programs, 'programCount': len(programs), 'roadmap': roadmap,
            'psychTests': psych_tests, 'jobs': jobs}


def recruiting_jobs(conn, user, day):
    """교내(직접 등록) 공고 중 마감 전인 것 — jobs.effective_status 가 POSTED 인 조건과 같다.
    추천채용은 지원자관리 메뉴 권한이 있으면 담당 범위 지원자 수를 함께 준다."""
    rows = conn.execute('''SELECT j.id,j.company_name_snapshot AS company,j.role,j.recruit_type,
      j.deadline_mode AS "deadlineMode",j.deadline_date AS deadline
      FROM dc.job_posting j WHERE j.source='manual' AND j.deleted_at IS NULL AND j.stored_status='POSTED'
      AND (j.deadline_mode='ALWAYS' OR j.deadline_date>=%s)
      ORDER BY j.posted_at DESC NULLS LAST,j.id''', (day,)).fetchall()
    recommended = [r for r in rows if r['recruit_type'] == 'RECOMMENDATION']
    general = [r for r in rows if r['recruit_type'] != 'RECOMMENDATION']
    applicants = {}
    if recommended and has_menu(conn, user, APPLICANT_MENU):
        condition, values = job_scope(user)
        applicants = {r['postingId']: r for r in conn.execute(f'''SELECT a.posting_id AS "postingId",
          count(*)::int AS total,
          count(*) FILTER(WHERE a.status IN ('APPLIED','IN_PROGRESS'))::int AS open,
          count(*) FILTER(WHERE a.status='PASSED')::int AS passed
          FROM dc.job_application a WHERE {condition} AND a.posting_id=ANY(%s) GROUP BY a.posting_id''',
          [*values, [r['id'] for r in recommended[:4]]]).fetchall()}

    def item(r):
        out = {k: r[k] for k in ('id', 'company', 'role', 'deadlineMode', 'deadline')}
        if r['recruit_type'] == 'RECOMMENDATION':
            a = applicants.get(r['id'], {'total': 0, 'open': 0, 'passed': 0})
            out['applicants'] = {k: a[k] for k in ('total', 'open', 'passed')}
        return out
    return {'recommended': [item(r) for r in recommended[:4]], 'general': [item(r) for r in general[:4]],
            'recommendedTotal': len(recommended), 'generalTotal': len(general)}


@router.get('/counsel-dashboard/requests/{request_id}')
def briefing(request_id: str, response: Response, user=Depends(principal, scope='function'),
             conn=Depends(connection, scope='function')):
    role = counselor(conn, user)
    response.headers['Cache-Control'] = 'no-store'
    condition, values = own_condition(user, role)
    row = conn.execute(SELECT + f' WHERE r.id=%s AND {condition}', [request_id, *values]).fetchone()
    if not row:
        raise HTTPException(404, '담당 상담 신청을 찾을 수 없습니다.')
    done = conn.execute(f'''SELECT count(*) AS n FROM dc.counsel_request r
      WHERE {condition} AND r.student_uid=%s AND r.status_code='DONE' ''',
      [*values, row['student_uid']]).fetchone()['n']
    plan = None
    diagnoses = None
    # The request lookup above verifies the assigned counselor. Diagnosis counts
    # follow student_access's own-request access; roadmap retains its own scope.
    # Psych briefings do not disclose career diagnoses or roadmaps.
    if role == 'career':
        diagnoses = conn.execute('''SELECT count(*) AS total,
          count(*) FILTER(WHERE completed_at IS NOT NULL) AS done
          FROM dc.diagnosis_attempt WHERE student_uid=%s''', (row['student_uid'],)).fetchone()
    scope, params = scope_condition(user, 'r.student_uid')
    if role == 'career' and has_menu(conn, user, PLAN_MENU):
        plan = conn.execute(f'''SELECT r.target_role AS "targetRole",r.target_company AS "targetCompany",
          r.status_code AS status,p.pct AS progress
          FROM dc.roadmap r LEFT JOIN LATERAL dc.roadmap_progress(r.student_uid,now()) p ON true
          WHERE r.student_uid=%s AND {scope}''', [row['student_uid'], *params]).fetchone()
    return {'request': dto(row), 'doneCount': done, 'roadmap': plan, 'diagnoses': diagnoses,
            'intake': row['intake'] or []}
