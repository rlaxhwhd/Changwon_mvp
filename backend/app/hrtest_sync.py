"""Authenticated, student-number-only import of completed external assessments."""
from hashlib import sha256
import json
from threading import Lock
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb

from . import hrtest
from .auth import principal, student_access
from .db import connection

router = APIRouter()
_guard = Lock()
_active = set()


def sanitized(item):
    # Do not retain provider name, sex, birth, department or free-text answers.
    return {key: item[key] for key in ('attempt_id', 'started_at', 'completed_at',
            'incomplete', 'missing_items', 'scales', 'types', 'areas') if key in item}


def store_results(conn, student, test_id, items):
    uid = student['intg_uid']
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('diagnosis:'+uid,))
    imported = updated = unchanged = incomplete = review = 0
    for item in items:
        body = sanitized(item)
        if item['incomplete']:
            incomplete += 1
        needs_review = test_id == 'ccore' and item['types'].get('overall') not in hrtest.CORE_TYPES
        if needs_review:
            review += 1
        digest = sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        existing = conn.execute('SELECT * FROM dc.hrtest_result WHERE test_id=%s AND external_id=%s FOR UPDATE',
                                (test_id, item['attempt_id'])).fetchone()
        if existing and existing['student_uid'] != uid:
            raise HTTPException(409, '외부 응시 기록의 학번 연결을 담당자에게 확인해 주세요.')
        if existing and existing['content_hash'] == digest:
            unchanged += 1
            continue
        attempt_no = existing['attempt_no'] if existing else conn.execute(
            'SELECT COALESCE(max(attempt_no),0)+1 AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id=%s',
            (uid, test_id)).fetchone()['n']
        headline = item['types'].get('overall') if test_id == 'ccore' else None
        result = dict(testId=test_id, studentId=student['alias'], attemptNo=attempt_no,
                      testedAt=hrtest.timestamp(item['completed_at']).isoformat(),
                      headline=headline or '검사 완료', headlineCaption='검사기관 제공 결과',
                      factors=hrtest.factors(item), comment='', source='hrtest',
                      providerTypes=item['types'], externalAttemptId=item['attempt_id'],
                      incomplete=item['incomplete'], missingItems=item['missing_items'], needsReview=needs_review)
        snapshot = dict(studentName=student['name'], studentNo=student['student_no'],
                        studentMajor=student['major_label'], studentGrade=student['grade'],
                        resultSummary='응답 누락 · 확인 필요' if item['incomplete'] else '유형 확인 필요' if needs_review else result['headline'],
                        externalAttemptId=item['attempt_id'], incomplete=item['incomplete'], needsReview=needs_review)
        started, completed = hrtest.timestamp(item['started_at']), hrtest.timestamp(item['completed_at'])
        status = 'INCOMPLETE' if item['incomplete'] else 'REVIEW' if needs_review else 'DONE'
        accepted_at = completed if status == 'DONE' else None
        if not existing:
            conn.execute('''INSERT INTO dc.diagnosis_attempt
              (id,student_uid,test_id,attempt_no,status_code,started_at,completed_at,payload,source,provider_completed_at)
              VALUES(%s,%s,%s,%s,%s,%s,%s,%s,'hrtest',%s)''',
              (str(uuid4()), uid, test_id, attempt_no, status, started, accepted_at, Jsonb(snapshot),completed))
            conn.execute('''INSERT INTO dc.diagnosis_result
              (student_uid,test_id,attempt_no,tested_at,payload,source) VALUES(%s,%s,%s,%s,%s,'hrtest')''',
              (uid, test_id, attempt_no, completed, Jsonb(result)))
            conn.execute('''INSERT INTO dc.hrtest_result(test_id,external_id,student_uid,attempt_no,content_hash)
              VALUES(%s,%s,%s,%s,%s)''', (test_id,item['attempt_id'],uid,attempt_no,digest))
            imported += 1
        else:
            conn.execute('''UPDATE dc.diagnosis_attempt SET started_at=%s,completed_at=%s,payload=%s,
              status_code=%s,provider_completed_at=%s
              WHERE student_uid=%s AND test_id=%s AND attempt_no=%s AND source='hrtest' ''',
              (started,accepted_at,Jsonb(snapshot),status,completed,uid,test_id,attempt_no))
            conn.execute('''UPDATE dc.diagnosis_result SET tested_at=%s,payload=%s
              WHERE student_uid=%s AND test_id=%s AND attempt_no=%s AND source='hrtest' ''',
              (completed,Jsonb(result),uid,test_id,attempt_no))
            conn.execute('''UPDATE dc.hrtest_result SET content_hash=%s,fetched_at=now()
              WHERE test_id=%s AND external_id=%s''', (digest,test_id,item['attempt_id']))
            updated += 1
        conn.execute('''INSERT INTO dc.hrtest_result_revision(test_id,external_id,content_hash,payload)
          VALUES(%s,%s,%s,%s) ON CONFLICT DO NOTHING''', (test_id,item['attempt_id'],digest,Jsonb(body)))
    if test_id == 'ccore' and items:
        # Use the current assessment, not the last imported row: historical imports
        # must not replace a newer assessment's type. Counseling remains authoritative.
        current = conn.execute('''SELECT r.payload FROM dc.current_diagnosis_attempt a
          JOIN dc.diagnosis_result r USING(student_uid,test_id,attempt_no)
          WHERE a.student_uid=%s AND a.test_id='ccore' AND a.source='hrtest' AND a.status_code='DONE' ''',
          (uid,)).fetchone()
        code = hrtest.CORE_TYPES.get(current['payload'].get('providerTypes',{}).get('overall')) if current else None
        previous = conn.execute('''SELECT student_type FROM dc.student_type_event
          WHERE student_uid=%s AND source='hrtest' ORDER BY decided_at DESC,id DESC LIMIT 1''', (uid,)).fetchone()
        if code and (not previous or previous['student_type'] != code):
            conn.execute('''INSERT INTO dc.student_type_event(student_uid,student_type,source,actor_uid)
              VALUES(%s,%s,'hrtest',%s)''', (uid,code,uid))
    return dict(imported=imported, updated=updated, unchanged=unchanged, incomplete=incomplete, needsReview=review)


@router.post('/diagnosis/external/{test_id}/import')
def import_results(test_id: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인의 검사 결과만 가져올 수 있습니다.')
    if test_id not in hrtest.TESTS:
        raise HTTPException(409, '아직 외부 검사 결과 연동이 제공되지 않는 검사입니다.')
    student = student_access(conn, user, user['intg_uid'])
    uid, number = student['intg_uid'], student['student_no']
    # End authentication reads before external I/O; never hold a DB transaction across it.
    conn.commit()
    with _guard:
        if uid in _active or len(_active) >= 4:
            raise HTTPException(429, '결과를 조회 중입니다. 잠시 후 다시 시도해 주세요.')
        _active.add(uid)
    try:
        try:
            items = hrtest.fetch_results(test_id, number)
        except hrtest.HRTestError as exc:
            raise HTTPException(502, str(exc)) from None
        conn.execute('SET LOCAL jit=off')
        student = student_access(conn, user, uid)
        if student['student_no'] != number:
            raise HTTPException(409, '학번이 변경되었습니다. 다시 로그인한 뒤 조회해 주세요.')
        result = store_results(conn, student, test_id, items)
        conn.commit()
        return {**result, 'found': len(items), 'message':
                '완료된 검사 결과가 없습니다. 응시 완료 및 입력한 학번을 확인한 뒤 다시 가져와 주세요.'
                if not items else '응답 누락 결과가 있습니다. 정상 완료 및 AI 분석에서 제외했습니다. 담당자에게 확인해 주세요.'
                if result['incomplete'] else '유형 확인이 필요한 결과가 있습니다. 유형 확정과 AI 분석을 보류했습니다.'
                if result['needsReview'] else '검사 결과를 가져왔습니다.'}
    finally:
        with _guard:
            _active.discard(uid)
