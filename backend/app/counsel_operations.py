"""Personal counseling settings and separately owned group sessions."""
from datetime import date, time, datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .auth import principal, require_staff, student_access
from .db import connection

router = APIRouter()
KIND = {'CAREER': '집단상담', 'PSYCH': '집단심리검사'}
STATUS = {'PLANNED': '예정', 'DONE': '완료', 'CANCELLED': '취소'}


@router.get('/counsel-slots')
def public_slots(startDate: date, days: int = Query(5,ge=1,le=14), user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    staff=conn.execute("SELECT s.intg_uid,p.alias FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE s.role_code IN ('career','psych','professor')").fetchall()
    slots=conn.execute('SELECT * FROM dc.counsel_schedule_slot').fetchall()
    busy=conn.execute("SELECT counselor_uid,student_uid,slot_date,slot_start,slot_end FROM dc.counsel_request WHERE status_code IN ('REQ','CONFIRMED') AND slot_date>=%s AND slot_date<%s",(startDate,startDate+timedelta(days=days))).fetchall()
    now=datetime.now(ZoneInfo('Asia/Seoul'))
    result=[]
    for person in staff:
        own=[s for s in slots if s['staff_uid']==person['intg_uid']]
        positive=[s for s in own if s['kind']=='AVAILABLE']
        for offset in range(days):
            day=startDate+timedelta(days=offset); weekday=(day.weekday()+1)%7
            for hour in range(9,18):
                begin=time(hour); end=time(hour+1)
                available=datetime.combine(day,begin,tzinfo=ZoneInfo('Asia/Seoul'))>now
                if positive:
                    available=available and any(s['weekday']==weekday and s['start_time']<=begin and s['end_time']>=end for s in positive)
                available=available and not any(s['kind']=='EXCLUDED' and s['weekday']==weekday and s['start_time']<end and s['end_time']>begin for s in own)
                available=available and not any(b['slot_date']==day and (b['counselor_uid']==person['intg_uid'] or b['student_uid']==user['intg_uid']) and b['slot_start']<end and b['slot_end']>begin for b in busy)
                result.append(dict(staffId=person['alias'],date=day,start=begin.strftime('%H:%M'),end=end.strftime('%H:%M'),available=available))
    return {'items':result}


def staff_row(conn, user, identity, own=False):
    row = conn.execute('SELECT s.*,p.alias,p.name FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE p.alias=%s OR p.intg_uid=%s', (identity, identity)).fetchone()
    if not row or (own and row['intg_uid'] != user['intg_uid']):
        raise HTTPException(404, '담당자 정보를 찾을 수 없습니다.')
    return row


def audit(conn, user, entity, target, action, before, after):
    conn.execute('INSERT INTO dc.counsel_operation_event(staff_uid,entity,entity_id,action,before_value,after_value,actor_uid) VALUES(%s,%s,%s,%s,%s,%s,%s)',
                 (user['intg_uid'], entity, target, action, Jsonb(jsonable_encoder(before)), Jsonb(jsonable_encoder(after)), user['intg_uid']))


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Profile(Strict):
    expectedVersion: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=100)
    dept: str = Field(min_length=1, max_length=200)
    scope: str = Field(max_length=500)
    email: str = Field(default='', max_length=320)
    officeHours: str = Field(default='', max_length=500)


@router.get('/counselor-profiles')
def profiles(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    rows = conn.execute("SELECT s.*,p.alias,p.name FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE s.role_code IN ('career','psych') ORDER BY p.alias").fetchall()
    return [{**r['profile'], 'id': r['alias'], 'name': r['profile'].get('displayName', r['name']), 'role': r['role_code'], 'version': r['version']} for r in rows]


@router.put('/counselor-profiles/{identity}')
def save_profile(identity: str, body: Profile, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    row = staff_row(conn, user, identity, True)
    if row['role_code'] not in ('career', 'psych'):
        raise HTTPException(403, '상담사 전용 설정입니다.')
    # Display fields never alter academic identity or authorization assignments.
    patch = body.model_dump(exclude={'expectedVersion', 'name'})
    patch['displayName'] = body.name
    changed = conn.execute('UPDATE dc.staff SET profile=profile||%s,version=version+1 WHERE intg_uid=%s AND version=%s RETURNING version',
                           (Jsonb(patch), row['intg_uid'], body.expectedVersion)).fetchone()
    if not changed:
        raise HTTPException(409, '프로필이 변경되었습니다. 새로 조회해 주세요.')
    audit(conn, user, 'PROFILE', row['intg_uid'], 'UPDATE', row['profile'], patch)
    return {'version': changed['version']}


class Slot(Strict):
    id: str = Field(min_length=1, max_length=100)
    weekday: int = Field(ge=0, le=6)
    start: time
    end: time

    @model_validator(mode='after')
    def interval(self):
        if self.start >= self.end or self.start.tzinfo or self.end.tzinfo:
            raise ValueError('시작·종료 시각을 확인해 주세요.')
        return self


class Schedule(Strict):
    expectedVersion: int = Field(ge=0)
    slots: list[Slot] = Field(max_length=100)


def schedule_dto(conn, uid):
    row = conn.execute('SELECT version FROM dc.counsel_schedule WHERE staff_uid=%s', (uid,)).fetchone()
    slots = conn.execute('SELECT id,kind,weekday,to_char(start_time,\'HH24:MI\') AS start,to_char(end_time,\'HH24:MI\') AS end FROM dc.counsel_schedule_slot WHERE staff_uid=%s ORDER BY weekday,start_time,id', (uid,)).fetchall()
    return {'version': row['version'] if row else 0,
            'available': [{k: v for k, v in s.items() if k != 'kind'} for s in slots if s['kind'] == 'AVAILABLE'],
            'excluded': [{k: v for k, v in s.items() if k != 'kind'} for s in slots if s['kind'] == 'EXCLUDED']}


@router.get('/counsel-schedules/{identity}')
def schedule(identity: str, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    row = staff_row(conn, user, identity)
    return schedule_dto(conn, row['intg_uid'])


@router.put('/counsel-schedules/{identity}/{kind}')
def save_schedule(identity: str, kind: Literal['available', 'excluded'], body: Schedule,
                  user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    row = staff_row(conn, user, identity, True)
    if row['role_code'] not in ('career', 'psych', 'professor'):
        raise HTTPException(403, '상담 담당자 전용 설정입니다.')
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('counsel:' + row['intg_uid'],))
    before = schedule_dto(conn, row['intg_uid'])
    if before['version'] != body.expectedVersion:
        raise HTTPException(409, '시간대가 변경되었습니다. 새로 조회해 주세요.')
    ordered = sorted(body.slots, key=lambda s: (s.weekday, s.start))
    if len({s.id for s in ordered}) != len(ordered) or any(a.weekday == b.weekday and a.end > b.start for a, b in zip(ordered, ordered[1:])):
        raise HTTPException(422, '시간대가 중복되거나 겹칩니다.')
    conn.execute('INSERT INTO dc.counsel_schedule(staff_uid) VALUES(%s) ON CONFLICT(staff_uid) DO UPDATE SET version=dc.counsel_schedule.version+1', (row['intg_uid'],))
    conn.execute('DELETE FROM dc.counsel_schedule_slot WHERE staff_uid=%s AND kind=%s', (row['intg_uid'], kind.upper()))
    for slot in ordered:
        # IDs belong to the server; never overwrite another owner's slot ID.
        conn.execute('INSERT INTO dc.counsel_schedule_slot VALUES(%s,%s,%s,%s,%s,%s)', (str(uuid4()), row['intg_uid'], kind.upper(), slot.weekday, slot.start, slot.end))
    after = schedule_dto(conn, row['intg_uid'])
    audit(conn, user, 'SCHEDULE', row['intg_uid'], kind.upper(), before, after)
    return after


def check_personal_schedule(conn, uid, slot):
    weekday = (slot.date.weekday() + 1) % 7
    excluded = conn.execute("SELECT 1 FROM dc.counsel_schedule_slot WHERE staff_uid=%s AND kind='EXCLUDED' AND weekday=%s AND start_time<%s AND end_time>%s", (uid, weekday, slot.end, slot.start)).fetchone()
    if excluded:
        raise HTTPException(409, '담당자가 등록한 상담 제한 시간입니다.')
    # No availability rows means no positive restriction; exclusions stay independent.
    configured = conn.execute("SELECT 1 FROM dc.counsel_schedule_slot WHERE staff_uid=%s AND kind='AVAILABLE' LIMIT 1", (uid,)).fetchone()
    if configured and not conn.execute("SELECT 1 FROM dc.counsel_schedule_slot WHERE staff_uid=%s AND kind='AVAILABLE' AND weekday=%s AND start_time<=%s AND end_time>=%s", (uid, weekday, slot.start, slot.end)).fetchone():
        raise HTTPException(409, '담당자의 가능 시간대 밖입니다.')


def group_row(conn, user, group_id, lock=False):
    require_staff(user)
    row = conn.execute('SELECT g.*,p.alias,p.name FROM dc.group_counsel g JOIN dc.person p ON p.intg_uid=g.counselor_uid WHERE g.id=%s AND g.counselor_uid=%s' + (' FOR UPDATE OF g' if lock else ''), (group_id, user['intg_uid'])).fetchone()
    if not row:
        raise HTTPException(404, '집단상담 회차를 찾을 수 없습니다.')
    return row


def group_dto(conn, row):
    members = conn.execute('SELECT m.*,p.alias FROM dc.group_counsel_member m JOIN dc.person p ON p.intg_uid=m.student_uid WHERE group_id=%s ORDER BY added_at,student_uid', (row['id'],)).fetchall()
    result = dict(id=row['id'], kind=KIND[row['kind']], title=row['title'], topic=row['topic'], date=row['session_date'],
                  start=row['start_time'].strftime('%H:%M'), end=row['end_time'].strftime('%H:%M'), place=row['place'], capacity=row['capacity'],
                  counselorId=row['alias'], counselorName=row['name'], status=STATUS[row['status']], version=row['version'],
                  members=[{**m['snapshot'], 'studentId': m['alias'], 'addedAt': m['added_at'], **({'attended': m['attended']} if m['attended'] is not None else {})} for m in members],
                  createdAt=row['created_at'], updatedAt=row['updated_at'])
    for column, key in [('test_code', 'testCode'), ('summary', 'summary'), ('comment', 'comment'), ('cancel_reason', 'cancelReason')]:
        if row[column] is not None:
            result[key] = row[column]
    return result


@router.get('/group-counsels')
def groups(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100), user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    count = conn.execute('SELECT count(*) AS n FROM dc.group_counsel WHERE counselor_uid=%s', (user['intg_uid'],)).fetchone()['n']
    rows = conn.execute('SELECT g.*,p.alias,p.name FROM dc.group_counsel g JOIN dc.person p ON p.intg_uid=g.counselor_uid WHERE counselor_uid=%s ORDER BY session_date DESC,g.id LIMIT %s OFFSET %s', (user['intg_uid'], pageSize, (page-1)*pageSize)).fetchall()
    return {'items': [group_dto(conn, r) for r in rows], 'totalCount': count, 'page': page, 'pageSize': pageSize}


class GroupCreate(Strict):
    title: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=1, max_length=2000)
    date: date
    start: time
    end: time
    place: str = Field(min_length=1, max_length=200)
    capacity: int = Field(ge=1, le=1000)
    testCode: str | None = Field(default=None, max_length=100)

    @model_validator(mode='after')
    def interval(self):
        if self.start >= self.end or self.start.tzinfo or self.end.tzinfo:
            raise ValueError('시작·종료 시각을 확인해 주세요.')
        return self


@router.post('/group-counsels', status_code=201)
def create_group(body: GroupCreate, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    staff = staff_row(conn, user, user['intg_uid'])
    if staff['role_code'] not in ('career', 'psych'):
        raise HTTPException(403, '상담사만 회차를 개설할 수 있습니다.')
    gid = 'grp_' + str(uuid4())
    conn.execute('INSERT INTO dc.group_counsel(id,counselor_uid,kind,title,topic,session_date,start_time,end_time,place,capacity,test_code) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                 (gid, user['intg_uid'], 'PSYCH' if staff['role_code'] == 'psych' else 'CAREER', body.title, body.topic, body.date, body.start, body.end, body.place, body.capacity, body.testCode if staff['role_code'] == 'psych' else None))
    result = group_dto(conn, group_row(conn, user, gid))
    audit(conn, user, 'GROUP', gid, 'CREATE', None, result)
    return result


class GroupAction(Strict):
    expectedVersion: int = Field(ge=1)
    studentId: str | None = None
    attendedIds: list[str] = Field(default_factory=list, max_length=1000)
    summary: str = Field(default='', max_length=20000)
    comment: str = Field(default='', max_length=20000)
    reason: str = Field(default='', max_length=2000)


@router.post('/group-counsels/{group_id}/{action}')
def group_action(group_id: str, action: Literal['add-member', 'remove-member', 'complete', 'cancel'], body: GroupAction,
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    row = group_row(conn, user, group_id, True)
    if row['version'] != body.expectedVersion or row['status'] != 'PLANNED':
        raise HTTPException(409, '예정 상태의 최신 회차에서만 처리할 수 있습니다.')
    before = group_dto(conn, row)
    if action in ('add-member', 'remove-member'):
        student = student_access(conn, user, body.studentId or '')
        if action == 'add-member':
            if len(before['members']) >= row['capacity'] or any(m['studentId'] == student['alias'] for m in before['members']):
                raise HTTPException(409, '정원이 찼거나 이미 참여한 학생입니다.')
            snapshot = dict(studentNo=student['student_no'], name=student['name'], major=student['major_label'], grade=student['grade'])
            conn.execute('INSERT INTO dc.group_counsel_member(group_id,student_uid,snapshot) VALUES(%s,%s,%s)', (group_id, student['intg_uid'], Jsonb(snapshot)))
        else:
            conn.execute('DELETE FROM dc.group_counsel_member WHERE group_id=%s AND student_uid=%s', (group_id, student['intg_uid']))
    elif action == 'complete':
        if not before['members'] or not body.summary or not body.comment or set(body.attendedIds) - {m['studentId'] for m in before['members']}:
            raise HTTPException(422, '참여 학생, 출석과 완료 기록을 확인해 주세요.')
        conn.execute('UPDATE dc.group_counsel_member m SET attended=(p.alias=ANY(%s)) FROM dc.person p WHERE p.intg_uid=m.student_uid AND group_id=%s', (body.attendedIds, group_id))
        conn.execute("UPDATE dc.group_counsel SET status='DONE',summary=%s,comment=%s WHERE id=%s", (body.summary, body.comment, group_id))
    else:
        if not body.reason:
            raise HTTPException(422, '취소 사유가 필요합니다.')
        conn.execute("UPDATE dc.group_counsel SET status='CANCELLED',cancel_reason=%s WHERE id=%s", (body.reason, group_id))
    conn.execute('UPDATE dc.group_counsel SET version=version+1,updated_at=now() WHERE id=%s', (group_id,))
    after = group_dto(conn, group_row(conn, user, group_id))
    audit(conn, user, 'GROUP', group_id, action, before, after)
    return after
