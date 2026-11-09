"""C-5 취약요인 진단(PHQ-9 · GAD-7) — 2026-11-09 사용자 확정.

업체 제공 문항을 우리 사이트에서 응시한다. C5 에 한해 자체 합산을 허용한다(사용자 확정):
두 합계의 평균이 10 이상이면 심리상담사 공유 목록에 자동 연계하고, 미만이면 C-CORE 재진단을 권유한다.
권유는 문구뿐이다 — 재검사는 기존 요청·상담사 승인 흐름(diagnosis_retake)을 탄다.
"""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict

from .auth import principal
from .db import connection
from .diagnosis_retake import complete_permissions, lock_student, state

router = APIRouter()
REFERRAL_AVERAGE = 10


def scales(conn):
    rows = conn.execute('''SELECT s.code,s.label,s.instruction,s.options,i.position,i.prompt
      FROM dc.screening_scale s JOIN dc.screening_item i ON i.scale_code=s.code
      WHERE s.test_id='c5' ORDER BY s.sort_order,i.position''').fetchall()
    result = {}
    for row in rows:
        scale = result.setdefault(row['code'], {'code': row['code'], 'label': row['label'],
                                                'instruction': row['instruction'], 'options': row['options'], 'items': []})
        scale['items'].append({'code': f"{row['code']}_{row['position']}", 'prompt': row['prompt']})
    return list(result.values())


def summary(conn, uid):
    row = conn.execute('''SELECT r.payload->'screening' AS screening,r.attempt_no,a.completed_at
      FROM dc.current_diagnosis_attempt a JOIN dc.diagnosis_result r USING(student_uid,test_id,attempt_no)
      WHERE a.student_uid=%s AND a.test_id='c5' AND a.status_code='DONE' ''', (uid,)).fetchone()
    if not row or not row['screening']:
        return None
    return {**row['screening'], 'attemptNo': row['attempt_no'], 'completedAt': row['completed_at']}


def student(user):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 응시할 수 있습니다.')
    return user['intg_uid']


@router.get('/diagnosis/c5')
def form(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    uid = student(user)
    access = state(conn, uid)
    core = next((q for q in access['requests'] if q['testId'] == 'ccore' and q['status'] in ('PENDING', 'APPROVED')), None)
    return {'scales': scales(conn), 'open': bool(access['permissions'].get('c5')), 'result': summary(conn, uid),
            'coreRequest': core['status'] if core else None}


class Submit(BaseModel):
    model_config = ConfigDict(extra='forbid')
    answers: dict[str, int]


@router.post('/diagnosis/c5', status_code=201)
def submit(body: Submit, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    uid = student(user)
    lock_student(conn, uid)
    if not state(conn, uid)['permissions'].get('c5'):
        raise HTTPException(403, 'C-5 응시 권한이 없습니다. 현재 유형의 후속진단인지, 재응시 승인이 있는지 확인해 주세요.')
    defined = scales(conn)
    codes = {item['code'] for scale in defined for item in scale['items']}
    if set(body.answers) != codes or any(value not in (0, 1, 2, 3) for value in body.answers.values()):
        raise HTTPException(422, '모든 문항에 0~3점 중 하나로 응답해 주세요.')
    totals = {scale['code']: sum(body.answers[item['code']] for item in scale['items']) for scale in defined}
    phq9, gad7 = totals['PHQ9'], totals['GAD7']
    average = (phq9 + gad7) / 2
    referred = average >= REFERRAL_AVERAGE
    info = conn.execute('''SELECT p.alias,p.name,s.student_no,s.major_label,s.grade FROM dc.student s
      JOIN dc.person p USING(intg_uid) WHERE s.intg_uid=%s''', (uid,)).fetchone()
    attempt_no = conn.execute("SELECT COALESCE(max(attempt_no),0)+1 AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id='c5'",
                              (uid,)).fetchone()['n']
    headline = '심리상담센터 연계' if referred else 'C-CORE 재진단 권유'
    screening = {'phq9': phq9, 'gad7': gad7, 'average': average, 'referred': referred}
    now = conn.execute('SELECT clock_timestamp() AS t').fetchone()['t']
    conn.execute('''INSERT INTO dc.diagnosis_attempt(id,student_uid,test_id,attempt_no,status_code,started_at,completed_at,payload,source)
      VALUES(%s,%s,'c5',%s,'DONE',%s,%s,%s,'dreamcatch')''',
      (str(uuid4()), uid, attempt_no, now, now, Jsonb({'studentName': info['name'], 'studentNo': info['student_no'],
       'studentMajor': info['major_label'], 'studentGrade': info['grade'], 'resultSummary': headline})))
    conn.execute('''INSERT INTO dc.diagnosis_result(student_uid,test_id,attempt_no,tested_at,payload,source)
      VALUES(%s,'c5',%s,%s,%s,'dreamcatch')''',
      (uid, attempt_no, now, Jsonb({'studentId': info['alias'], 'testId': 'c5', 'attemptNo': attempt_no,
       'testedAt': now.date().isoformat(), 'headline': headline, 'headlineCaption': 'PHQ-9 · GAD-7 평균',
       'factors': [{'factorCode': 'PHQ9', 'name': 'PHQ-9 우울', 'rawScore': phq9},
                   {'factorCode': 'GAD7', 'name': 'GAD-7 불안', 'rawScore': gad7}],
       'comment': '', 'answers': body.answers, 'screening': screening})))
    complete_permissions(conn, uid, 'c5')
    if referred:
        row = conn.execute('''INSERT INTO dc.psych_screening_referral(student_uid,attempt_no,phq9,gad7)
          VALUES(%s,%s,%s,%s) RETURNING id''', (uid, attempt_no, phq9, gad7)).fetchone()
        conn.execute("INSERT INTO dc.psych_screening_referral_event(referral_id,action) VALUES(%s,'CREATE')", (row['id'],))
        # 학생 이름·점수는 알림 본문에 복사하지 않는다(067 수동 연계와 같은 원칙).
        conn.execute('''INSERT INTO dc.notification(recipient_uid,source_kind,source_id,tone,title,body,route)
          SELECT intg_uid,'PSYCH_SCREENING_REFERRAL',%s,'counsel','C-5 진단 결과로 심리상담센터 연계 학생이 추가되었습니다.',
            '심리상담센터 연계 페이지의 진단 연계 목록에서 확인해 주세요.','/counsel/psych-referrals'
          FROM dc.staff WHERE role_code='psych' ''', (f"{row['id']}:CREATE",))
    return {'result': summary(conn, uid)}
