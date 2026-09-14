"""Career-to-psychology handoff. No diagnosis, appointment or broad scope grant."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field

from .auth import principal, require_staff, student_access
from .db import connection

router = APIRouter()


def notify(conn, recipient, referral_id, action, title):
    conn.execute('''INSERT INTO dc.notification(recipient_uid,source_kind,source_id,tone,title,body,route)
      VALUES(%s,'PSYCH_REFERRAL',%s,'counsel',%s,'심리상담센터 연계 페이지에서 확인해 주세요.','/counsel/psych-referrals')''',
      (recipient, f'{referral_id}:{action}', title))


def role(conn, user):
    require_staff(user)
    row = conn.execute('''SELECT s.role_code FROM dc.staff s JOIN dc.menu_auth m
      ON m.role_code=s.role_code AND m.menu_code='counsel.7' WHERE s.intg_uid=%s''', (user['intg_uid'],)).fetchone()
    if not row or row['role_code'] not in ('career', 'psych'):
        raise HTTPException(403, '심리상담센터 연계 권한이 없습니다.')
    return row['role_code']


SELECT = '''SELECT r.id,r.status,r.version,r.created_at AS "createdAt",r.accepted_at AS "acceptedAt",
 r.completed_at AS "completedAt",r.cancelled_at AS "cancelledAt",
 p.alias AS "studentId",p.name AS "studentName",s.student_no AS "studentNo",s.major_label AS major,
 a.name AS "senderName",b.name AS "recipientName",c.label AS reason
 FROM dc.psych_referral r JOIN dc.person p ON p.intg_uid=r.student_uid
 JOIN dc.student s ON s.intg_uid=r.student_uid JOIN dc.person a ON a.intg_uid=r.sender_uid
 JOIN dc.person b ON b.intg_uid=r.recipient_uid JOIN dc.psych_referral_reason c ON c.code=r.reason_code'''


@router.get('/psych-referrals/options')
def options(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    kind = role(conn, user)
    return {'role': kind,
      'reasons': conn.execute('SELECT code,label FROM dc.psych_referral_reason WHERE active ORDER BY sort_order').fetchall(),
      'counselors': conn.execute("SELECT p.alias AS id,p.name FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE s.role_code='psych' ORDER BY p.name,p.alias").fetchall() if kind == 'career' else []}


@router.get('/psych-referrals/students')
def students(q: str = Query('', max_length=100), user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if role(conn, user) != 'career':
        raise HTTPException(403, '진로취업상담사만 연계 학생을 선택할 수 있습니다.')
    if not q.strip():
        return {'items': []}
    return {'items': conn.execute('''SELECT p.alias AS id,p.name,s.student_no AS "studentNo",s.major_label AS major
      FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE (strpos(p.name,%s)>0 OR strpos(s.student_no,%s)>0) AND
      (EXISTS(SELECT 1 FROM dc.staff_student_scope x WHERE x.staff_uid=%s AND x.student_uid=s.intg_uid)
       OR EXISTS(SELECT 1 FROM dc.counsel_request x WHERE x.counselor_uid=%s AND x.student_uid=s.intg_uid))
      ORDER BY p.name,s.student_no LIMIT 30''', (q.strip(), q.strip(), user['intg_uid'], user['intg_uid'])).fetchall()}


@router.get('/psych-referrals')
def listing(response: Response, page: int = Query(1, ge=1), status: Literal['PENDING','IN_PROGRESS','DONE','CANCELLED'] | None = None,
            user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    kind = role(conn, user)
    response.headers['Cache-Control'] = 'no-store'
    condition = 'r.sender_uid=%s' if kind == 'career' else 'r.recipient_uid=%s'
    values = [user['intg_uid']]
    counts = conn.execute('SELECT status,count(*) AS count FROM dc.psych_referral r WHERE '+condition+' GROUP BY status', values).fetchall()
    if status:
        condition += ' AND r.status=%s'
        values.append(status)
    total = conn.execute('SELECT count(*) AS n FROM dc.psych_referral r WHERE '+condition, values).fetchone()['n']
    rows = conn.execute(SELECT+' WHERE '+condition+' ORDER BY r.created_at DESC,r.id LIMIT 20 OFFSET %s', [*values, (page-1)*20]).fetchall()
    return {'items': rows, 'totalCount': total, 'counts': {r['status']: r['count'] for r in counts}}


class Create(BaseModel):
    model_config = ConfigDict(extra='forbid')
    studentId: str = Field(min_length=1, max_length=200)
    counselorId: str = Field(min_length=1, max_length=200)
    reasonCode: str = Field(min_length=1, max_length=40)


@router.post('/psych-referrals', status_code=201)
def create(body: Create, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if role(conn, user) != 'career':
        raise HTTPException(403, '진로취업상담사만 연계를 요청할 수 있습니다.')
    student = student_access(conn, user, body.studentId)
    recipient = conn.execute("SELECT s.intg_uid FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE p.alias=%s AND s.role_code='psych'", (body.counselorId,)).fetchone()
    if not recipient or not conn.execute('SELECT 1 FROM dc.psych_referral_reason WHERE code=%s AND active', (body.reasonCode,)).fetchone():
        raise HTTPException(422, '담당 심리상담사와 연계 사유를 확인해 주세요.')
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('psych-referral:'+student['intg_uid'],))
    if conn.execute("SELECT 1 FROM dc.psych_referral WHERE student_uid=%s AND status IN ('PENDING','IN_PROGRESS')", (student['intg_uid'],)).fetchone():
        raise HTTPException(409, '이미 접수 대기 또는 처리 중인 연계가 있습니다.')
    row = conn.execute('''INSERT INTO dc.psych_referral(student_uid,sender_uid,recipient_uid,reason_code)
      VALUES(%s,%s,%s,%s) RETURNING id''', (student['intg_uid'], user['intg_uid'], recipient['intg_uid'], body.reasonCode)).fetchone()
    conn.execute("INSERT INTO dc.psych_referral_event(referral_id,actor_uid,action) VALUES(%s,%s,'CREATE')", (row['id'], user['intg_uid']))
    notify(conn, recipient['intg_uid'], row['id'], 'CREATE', '새 심리상담센터 연계 요청이 있습니다.')
    return conn.execute(SELECT+' WHERE r.id=%s', (row['id'],)).fetchone()


class Transition(BaseModel):
    model_config = ConfigDict(extra='forbid')
    action: Literal['ACCEPT','COMPLETE','CANCEL']
    version: int = Field(ge=1)


@router.post('/psych-referrals/{referral_id}/transition')
def transition(referral_id: UUID, body: Transition, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    kind = role(conn, user)
    column = 'sender_uid' if kind == 'career' else 'recipient_uid'
    row = conn.execute(f'SELECT * FROM dc.psych_referral WHERE id=%s AND {column}=%s FOR UPDATE', (referral_id, user['intg_uid'])).fetchone()
    if not row:
        raise HTTPException(404, '연계 요청을 찾을 수 없습니다.')
    if row['version'] != body.version:
        raise HTTPException(409, '처리 상태가 변경됐습니다. 새로고침 후 다시 확인해 주세요.')
    permitted = {('psych','ACCEPT','PENDING'): ('IN_PROGRESS','accepted_at'),
                 ('psych','COMPLETE','IN_PROGRESS'): ('DONE','completed_at'),
                 ('career','CANCEL','PENDING'): ('CANCELLED','cancelled_at')}
    target = permitted.get((kind, body.action, row['status']))
    if not target:
        raise HTTPException(409, '현재 상태에서는 이 작업을 할 수 없습니다.')
    state, timestamp = target
    conn.execute(f'UPDATE dc.psych_referral SET status=%s,{timestamp}=now(),updated_at=now(),version=version+1 WHERE id=%s', (state, referral_id))
    conn.execute('INSERT INTO dc.psych_referral_event(referral_id,actor_uid,action) VALUES(%s,%s,%s)', (referral_id, user['intg_uid'], body.action))
    titles = {'ACCEPT': '심리상담센터 연계가 접수되었습니다.', 'COMPLETE': '심리상담센터 연계 처리가 완료되었습니다.', 'CANCEL': '심리상담센터 연계 요청이 취소되었습니다.'}
    notify(conn, row['recipient_uid'] if body.action == 'CANCEL' else row['sender_uid'], referral_id, body.action, titles[body.action])
    return conn.execute(SELECT+' WHERE r.id=%s', (referral_id,)).fetchone()
