"""Persistent retest permissions and the roadmap → diagnosis → counsel cycle."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from typing import Literal
from .auth import principal, student_access, is_counselor
from .db import connection
from .hrtest import CORE_TYPES, LAUNCH_URLS

router = APIRouter()


def require_counselor(user):
    if not is_counselor(user):
        raise HTTPException(403, '상담사 권한이 필요합니다.')


def lock_student(conn, uid):
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('diagnosis:'+uid,))


def current_type(conn, uid):
    row = conn.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s', (uid,)).fetchone()
    return row['student_type'] if row else None


def diagnostic_type(conn, uid):
    from .care7_cycle import year_start, completed_tests
    if year_start().year >= 2027:
        if 'ccore' not in completed_tests(conn, uid):
            return None
        result = conn.execute('''SELECT r.payload FROM dc.current_diagnosis_attempt a
          JOIN dc.diagnosis_result r USING(student_uid,test_id,attempt_no)
          WHERE a.student_uid=%s AND a.test_id='ccore' AND a.status_code='DONE' ''', (uid,)).fetchone()
        return CORE_TYPES.get(result['payload'].get('providerTypes', {}).get('overall')) if result else None
    # A new Core opens its follow-up immediately, before the next consultation
    # publishes a final type. Completed earlier cycles keep counseling authority.
    cycle = conn.execute('''SELECT a.payload FROM dc.diagnosis_retake q
      JOIN dc.diagnosis_attempt a ON a.id=q.completed_attempt_id
      LEFT JOIN dc.roadmap r ON r.student_uid=q.student_uid
      WHERE q.student_uid=%s AND q.test_id='ccore' AND q.status='COMPLETED'
        AND (r.student_uid IS NULL OR NOT r.confirmed OR r.version IS NOT DISTINCT FROM q.roadmap_version)
      ORDER BY q.id DESC LIMIT 1''', (uid,)).fetchone()
    if cycle:
        result = conn.execute('''SELECT r.payload FROM dc.current_diagnosis_attempt a
          JOIN dc.diagnosis_result r USING(student_uid,test_id,attempt_no)
          WHERE a.student_uid=%s AND a.test_id='ccore' AND a.status_code='DONE' ''', (uid,)).fetchone()
        code = CORE_TYPES.get(result['payload'].get('providerTypes', {}).get('overall')) if result else None
        if code:
            return code
    return current_type(conn, uid)


def notify(conn, uid, origin, key, title, route):
    conn.execute('SELECT dc.deliver_notification(%s,%s,%s,\'diagnosis\',%s,\'\',%s,clock_timestamp())',
                 (uid, origin, str(key), title, route))


def ensure_progress(conn, uid):
    lock_student(conn, uid)
    from .care7_cycle import year_start, completed_tests
    if year_start().year >= 2027:
        if not conn.execute('SELECT 1 FROM dc.care7_annual_access WHERE student_uid=%s AND year=%s', (uid, year_start().year)).fetchone():
            return
    plan = conn.execute('SELECT version FROM dc.roadmap WHERE student_uid=%s AND confirmed FOR SHARE', (uid,)).fetchone()
    if not plan or current_type(conn, uid) not in ('T1','T2','T3','T4','T6'):
        return
    progress = conn.execute('SELECT * FROM dc.roadmap_progress(%s,now())', (uid,)).fetchone()
    # Compare raw counts: rounded 50% must not grant an early retest.
    if not progress or not progress['total'] or progress['done'] * 2 < progress['total']:
        return
    if conn.execute('''SELECT 1 FROM dc.diagnosis_retake WHERE student_uid=%s AND test_id='ccore'
      AND (roadmap_version=%s OR status IN ('PENDING','APPROVED'))''', (uid, plan['version'])).fetchone():
        # A pending student request becomes automatically eligible at 50%.
        row = conn.execute('''UPDATE dc.diagnosis_retake SET status='APPROVED',approved_at=clock_timestamp()
          WHERE student_uid=%s AND test_id='ccore' AND status='PENDING' RETURNING id''', (uid,)).fetchone()
    else:
        row = conn.execute('''INSERT INTO dc.diagnosis_retake(student_uid,test_id,roadmap_version,source,status,approved_at)
          SELECT %s,'ccore',%s,'PROGRESS','APPROVED',clock_timestamp()
          WHERE EXISTS(SELECT 1 FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id='ccore' AND status_code='DONE')
          ON CONFLICT DO NOTHING RETURNING id''', (uid, plan['version'], uid)).fetchone()
    if row:
        notify(conn, uid, 'diagnosis-approved', row['id'], '로드맵 50% 달성 · C-CORE 재진단을 시작해 주세요', '/diagnosis/employment')


def state(conn, uid):
    from .care7_cycle import annual_status, completed_tests
    annual = annual_status(conn, uid)
    ensure_progress(conn, uid)
    requests = conn.execute('''SELECT q.*,p.name AS approver_name FROM dc.diagnosis_retake q
      LEFT JOIN dc.person p ON p.intg_uid=q.approved_by WHERE q.student_uid=%s ORDER BY q.id DESC''', (uid,)).fetchall()
    code = diagnostic_type(conn, uid)
    rule = conn.execute('SELECT lower(follow_up_test) AS test FROM dc.student_type_code WHERE code=%s', (code,)).fetchone()
    followup = rule['test'] if rule else None
    done = set(completed_tests(conn, uid))
    approved = {q['test_id'] for q in requests if q['status'] == 'APPROVED'}
    tests = {'ccore', *([followup] if followup else []), *approved}
    permissions = {test: test in approved or (test not in done and (test == 'ccore' or test == followup and 'ccore' in done)) for test in tests}
    if annual['renewalRequired'] and 'ccore' not in done:
        permissions = {test: test == 'ccore' for test in tests}
    guide = None
    core = next((q for q in requests if q['test_id'] == 'ccore' and q['status'] != 'PENDING'), None)
    if core:
        plan = conn.execute('SELECT * FROM dc.roadmap WHERE student_uid=%s', (uid,)).fetchone()
        finished = core['status'] == 'COMPLETED' and plan and plan['confirmed'] and plan['version'] != core['roadmap_version']
        if not finished:
            stage = 'core' if core['status'] == 'APPROVED' else 'followup' if followup not in done or followup in approved else 'counsel'
            if stage == 'counsel' and conn.execute('''SELECT 1 FROM dc.counsel_request c
              JOIN dc.diagnosis_attempt a ON a.id=%s WHERE c.student_uid=%s AND c.care_track='care7'
              AND c.type_code IN ('CAREER','JOB') AND c.status_code='DONE' AND c.completed_at>a.completed_at''',
              (core['completed_attempt_id'], uid)).fetchone():
                stage = 'roadmap'
            guide = {'stage': stage, 'requestId': core['id']}
    if annual['renewalRequired']:
        stage = 'core' if not annual['coreDone'] else 'followup' if not annual['followUpDone'] else 'counsel' if not annual['counselDone'] else 'roadmap'
        guide = {'stage': stage, 'requestId': None, 'annual': True}
    return {'diagnosticType': code, 'followUpTest': followup, 'permissions': permissions, 'guide': guide, 'annual': annual,
            'requests': [{'id': q['id'], 'testId': q['test_id'], 'status': q['status'], 'source': q['source'],
                          'requestedAt': q['requested_at'], 'approvedAt': q['approved_at'], 'approvedBy': q['approver_name']} for q in requests]}


class RetakeRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    testId: Literal['ccore', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'] = 'ccore'


@router.post('/diagnosis/retake-request', status_code=201)
def request_retake(body: RetakeRequest | None = None, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 요청할 수 있습니다.')
    uid = user['intg_uid']
    test_id = body.testId if body else 'ccore'
    lock_student(conn, uid)
    current = state(conn, uid)
    if test_id != 'ccore' and test_id != current['followUpTest']:
        raise HTTPException(409, '현재 유형의 후속진단만 재검사를 요청할 수 있습니다. 과거 진단은 결과를 확인해 주세요.')
    if not conn.execute('''SELECT 1 FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id=%s
      AND (status_code='DONE' OR (%s AND status_code IN ('REVIEW','INCOMPLETE')))''',
      (uid, test_id, test_id != 'ccore')).fetchone():
        raise HTTPException(409, '첫 C-CORE 진단을 먼저 완료해 주세요.' if test_id == 'ccore' else '응시 이력이 있는 진단만 재검사를 요청할 수 있습니다.')
    row = conn.execute('''INSERT INTO dc.diagnosis_retake(student_uid,test_id,roadmap_version,source,status)
      VALUES(%s,%s,(SELECT version FROM dc.roadmap WHERE student_uid=%s),'STUDENT','PENDING')
      ON CONFLICT DO NOTHING RETURNING id''', (uid, test_id, uid)).fetchone()
    if row:
        counselors = conn.execute("SELECT intg_uid FROM dc.staff WHERE role_code IN ('career','psych')").fetchall()
        for counselor in counselors:
            title = '진단유형 재검사 요청이 접수되었습니다' if test_id == 'ccore' else f'C-{test_id[1:]} 재검사 요청이 접수되었습니다'
            notify(conn, counselor['intg_uid'], 'diagnosis-request', row['id'], title, '/diagnosis/manage')
    return state(conn, uid)


@router.post('/diagnosis/students/{identity}/retakes/{test_id}')
def approve(identity: str, test_id: str, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_counselor(user)
    student = student_access(conn, user, identity)
    uid = student['intg_uid']
    lock_student(conn, uid)
    if not conn.execute('SELECT 1 FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id=%s AND status_code IN (\'DONE\',\'REVIEW\',\'INCOMPLETE\')', (uid, test_id)).fetchone():
        raise HTTPException(409, '응시 이력이 있는 진단만 재응시를 허용할 수 있습니다.')
    row = conn.execute('''SELECT * FROM dc.diagnosis_retake WHERE student_uid=%s AND test_id=%s
      AND status IN ('PENDING','APPROVED') FOR UPDATE''', (uid, test_id)).fetchone()
    if row and row['status'] == 'APPROVED':
        return state(conn, uid)
    if row:
        conn.execute("UPDATE dc.diagnosis_retake SET status='APPROVED',approved_at=clock_timestamp(),approved_by=%s WHERE id=%s", (user['intg_uid'], row['id']))
    else:
        row = conn.execute('''INSERT INTO dc.diagnosis_retake(student_uid,test_id,roadmap_version,source,status,approved_at,approved_by)
          VALUES(%s,%s,(SELECT version FROM dc.roadmap WHERE student_uid=%s),'COUNSELOR','APPROVED',clock_timestamp(),%s) RETURNING id''',
          (uid, test_id, uid, user['intg_uid'])).fetchone()
    notify(conn, uid, 'diagnosis-approved', row['id'], '진단 재응시가 승인되었습니다', '/diagnosis/employment')
    return state(conn, uid)


@router.post('/diagnosis/external/{test_id}/launch')
def launch(test_id: str, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 응시할 수 있습니다.')
    data = state(conn, user['intg_uid'])
    if not data['permissions'].get(test_id):
        raise HTTPException(403, '재응시 승인 또는 선행 진단 완료가 필요합니다.')
    if test_id not in LAUNCH_URLS:
        raise HTTPException(409, '검사기관 연동 준비 중입니다.')
    return {'url': LAUNCH_URLS[test_id]}


def complete_permissions(conn, uid, test_id):
    # Old imported history and edits to an old attempt never consume a new grant.
    conn.execute('''UPDATE dc.diagnosis_retake q SET status='COMPLETED',completed_attempt_id=a.id
      FROM dc.current_diagnosis_attempt a WHERE q.student_uid=%s AND q.test_id=%s
      AND q.status='APPROVED' AND a.student_uid=q.student_uid AND a.test_id=q.test_id
      AND a.status_code='DONE' AND a.started_at>=q.approved_at AND a.completed_at>=q.approved_at''', (uid, test_id))


@router.get('/students/{identity}/care7-history')
def care7_history(identity: str, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """Previously confirmed plans remain readable; never expose draft/editor notes."""
    student = student_access(conn, user, identity)
    uid = student['intg_uid']
    plans = []
    row = conn.execute('SELECT * FROM dc.roadmap WHERE student_uid=%s AND confirmed', (uid,)).fetchone()
    if row:
        cells = conn.execute('SELECT axis,title,status FROM dc.roadmap_item WHERE student_uid=%s ORDER BY axis,position,id', (uid,)).fetchall()
        plans.append({'version': row['version'], 'confirmedAt': row['confirmed_at'], 'targetRole': row['target_role'], 'cells': cells})
    for snapshot in conn.execute('SELECT version,payload FROM dc.roadmap_snapshot WHERE student_uid=%s ORDER BY version DESC', (uid,)).fetchall():
        payload = snapshot['payload']
        if payload.get('status') != 'CONFIRMED':
            continue
        plans.append({'version': snapshot['version'], 'confirmedAt': payload.get('confirmedAt'),
                      'targetRole': payload.get('targetRole'),
                      'cells': [{key: cell.get(key) for key in ('axis', 'title', 'status')} for cell in payload.get('cells', [])]})
    return {'plans': plans}
