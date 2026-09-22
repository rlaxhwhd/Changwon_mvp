"""Counselor home: current, scoped PostgreSQL facts; no seed-date fallback."""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from .auth import principal, require_staff
from .counsel import SELECT, dto
from .db import connection
from .roadmap import has_menu, PLAN_MENU, REQUEST_MENU, scope_condition
from .students import summary as student_summary
from .student_contact import contact_summary

router = APIRouter()
SEOUL = ZoneInfo('Asia/Seoul')


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
      count(*) FILTER(WHERE r.status_code='REQ') AS pending,
      count(*) FILTER(WHERE r.status_code='CONFIRMED') AS confirmed,
      count(*) FILTER(WHERE r.status_code='DONE') AS done,
      count(*) FILTER(WHERE r.status_code IN ('REQ','CONFIRMED','DONE')) AS active,
      count(*) FILTER(WHERE r.status_code='DONE' AND EXISTS(
        SELECT 1 FROM dc.counsel_record cr WHERE cr.request_id=r.id AND cr.status_code='DONE'
      )) AS recorded,
      (SELECT count(*) FROM dc.counsel_record cr JOIN dc.counsel_request r ON r.id=cr.request_id
       WHERE {condition}) AS "recordCount"
      FROM dc.counsel_request r WHERE {condition}''', [day, day, *values, *values]).fetchone()
    timeline = conn.execute(SELECT + f''' WHERE {condition}
      AND r.slot_date=%s AND r.status_code IN ('REQ','CONFIRMED','DONE')
      ORDER BY r.slot_start NULLS LAST,r.requested_at,r.id''', [*values, day]).fetchall()
    intake = conn.execute(SELECT + f''' WHERE {condition} AND r.status_code='REQ'
      ORDER BY r.requested_at DESC,r.id DESC LIMIT 5''', values).fetchall()
    # Share the exact roster classification and access scope used by Students.
    distribution = student_summary(request, 'type', user, conn, care7_only=True)
    roadmap = None
    if role == 'career' and has_menu(conn, user, REQUEST_MENU):
        scope, params = scope_condition(user, 'r.student_uid')
        roadmap = conn.execute(f'''SELECT count(*) AS total,
          count(*) FILTER(WHERE r.status_code='REQ') AS pending
          FROM dc.roadmap_request r WHERE {scope}''', params).fetchone()
    programs = []
    program_count = 0
    if role == 'career':
        # created_by is identity-based. A display name or empty personal list
        # must never fall back to every program in the system.
        program_count = conn.execute('SELECT count(*) AS n FROM dc.program WHERE created_by=%s',
                                     (user['intg_uid'],)).fetchone()['n']
        programs = conn.execute('''SELECT p.id,p.title,p.category_code AS category,p.capacity,
          (SELECT count(*) FROM dc.program_apply a WHERE a.program_id=p.id AND a.cancelled_at IS NULL) AS applied,
          (SELECT count(*) FROM dc.program_apply a WHERE a.program_id=p.id AND a.cancelled_at IS NULL
           AND (a.applied_at AT TIME ZONE 'Asia/Seoul')::date=%s) AS "todayCount"
          FROM dc.program p WHERE p.created_by=%s ORDER BY p.created_at DESC,p.id LIMIT 3''',
          (day, user['intg_uid'])).fetchall()
    return {'refDate': day, 'role': role, 'counts': counts, 'distribution': distribution,
            'uncontacted': contact_summary(conn),
            'timeline': [dto(r) for r in timeline], 'intake': [dto(r) for r in intake],
            'programs': programs, 'programCount': program_count, 'roadmap': roadmap}


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
