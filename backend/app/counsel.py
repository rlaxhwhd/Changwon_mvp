import hashlib
import json
from datetime import date, datetime, time, timedelta
from typing import Literal
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .auth import principal, require_staff, student_access
from .db import connection
from .gates import COUNSEL_TYPE_CODE, diagnosis_gate, is_care7_request, roadmap_basis_ok

router=APIRouter()
LABELS={'REQ':'대기','CONFIRMED':'확정','DONE':'완료','CANCEL_UNKNOWN':'취소','CANCEL_STU':'취소','CANCEL_CNS':'취소'}


class Slot(BaseModel):
    model_config=ConfigDict(extra='forbid')
    date: date
    start: time
    end: time
    place: str=Field('',max_length=200)

    @model_validator(mode='after')
    def ordered(self):
        if self.start>=self.end:
            raise ValueError('종료 시각은 시작 시각보다 늦어야 합니다.')
        return self


class IntakeAnswer(BaseModel):
    model_config=ConfigDict(extra='forbid')
    question: str=Field(min_length=1,max_length=2000)
    answer: str=Field(min_length=1,max_length=10000)


class CreateRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    type: Literal['진로취업','심리','교수']
    typeCode: Literal['CAREER','JOB','PSY','PROF'] | None=None
    careTrack: Literal['general','care7'] | None=None
    method: Literal['대면','비대면']='대면'
    topic: str=Field(min_length=1,max_length=2000)
    topicCode: str | None=Field(default=None,max_length=64)
    assignedCounselorId: str | None=None
    assignedProfessorId: str | None=None
    slot: Slot | None=None
    intake: list[IntakeAnswer]=Field(default_factory=list,max_length=30)


class Action(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expectedVersion: int=Field(ge=1)
    slot: Slot | None=None
    reason: str=Field('',max_length=2000)
    assigneeId: str | None=None
    summary: str=Field('',max_length=20000)
    comment: str=Field('',max_length=20000)
    followUp: str=Field('',max_length=10000)
    finalType: Literal['T1','T2','T3','T4','T5','T6'] | None=None


def visibility(user):
    if user['kind']=='STUDENT':
        return 'r.student_uid=%s',[user['intg_uid']]
    kind=user['profile'].get('role')
    if kind=='assistant':
        # 조교는 담당 학과 학생의 교수상담(실적 통계)만 본다 — SPEC §3-4 전담교수 상담 실적.
        return "r.legacy_type='교수' AND EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=r.student_uid)",[user['intg_uid']]
    label={'career':'진로취업','psych':'심리','professor':'교수'}.get(kind)
    if not label:
        return 'false',[]
    return ('r.legacy_type=%s AND (r.counselor_uid=%s OR EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=r.student_uid))',[label,user['intg_uid'],user['intg_uid']])


SELECT='''SELECT r.*,p.alias AS student_alias,p.name AS student_name,s.student_no,s.major_label,
 a.alias AS counselor_alias FROM dc.counsel_request r JOIN dc.person p ON p.intg_uid=r.student_uid
 JOIN dc.student s ON s.intg_uid=r.student_uid LEFT JOIN dc.person a ON a.intg_uid=r.counselor_uid'''


def dto(row):
    result={**row['source_payload'],'id':row['id'],'studentId':row['student_alias'],
            'studentNo':row['student_no'],'studentName':row['snapshot'].get('name',row['student_name']),
            'studentMajor':row['snapshot'].get('major',row['major_label']),
            'studentGrade':row['snapshot'].get('grade'),'studentType':row['snapshot'].get('studentType'),
            'studentStatus':row['snapshot'].get('enrollmentStatus','재학'),
            'type':row['legacy_type'],'typeCode':row['type_code'],'careTrack':row['care_track'],
            'status':LABELS[row['status_code']],'method':'비대면' if row['method_code']=='ONLINE' else '대면',
            'topic':row['topic'],'topicCode':row['topic_code'],'requestedAt':row['requested_at'].isoformat(),'version':row['version']}
    if row['counselor_alias']:
        result['professorId' if row['type_code']=='PROF' else 'assignedCounselorId']=row['counselor_alias']
    # 교수 발의 기록(origin=PROF_RECORD)은 상담일만 있고 예약 시각이 없다.
    if row['slot_date'] and row['slot_start']:
        result['slot']={'date':row['slot_date'].isoformat(),'start':row['slot_start'].strftime('%H:%M'),
                        'end':row['slot_end'].strftime('%H:%M'),'place':row['place'] or ''}
    if row['completed_at']:
        result['completedAt']=row['completed_at'].isoformat()
    return result


def get_request(conn,user,request_id,lock=False):
    condition,values=visibility(user)
    row=conn.execute(SELECT+f' WHERE r.id=%s AND ({condition})'+(' FOR UPDATE OF r' if lock else ''),[request_id]+values).fetchone()
    if not row:
        raise HTTPException(404,'상담 신청을 찾을 수 없습니다.')
    return row


def resolve_assignee(conn,alias,kind):
    if not alias:
        raise HTTPException(422,'담당자를 선택해 주세요.')
    row=conn.execute('SELECT s.*,p.alias FROM dc.staff s JOIN dc.person p USING(intg_uid) WHERE p.alias=%s OR p.intg_uid=%s',(alias,alias)).fetchone()
    if not row or row['role_code']!={'진로취업':'career','심리':'psych','교수':'professor'}[kind]:
        raise HTTPException(422,'상담 종류에 맞는 담당자를 선택해 주세요.')
    return row


def check_slot(conn,staff_uid,student_uid,slot,exclude=''):
    for key in sorted({staff_uid,student_uid}):
        conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',('counsel:'+key,))
    from .counsel_operations import check_personal_schedule
    check_personal_schedule(conn,staff_uid,slot)
    conflict=conn.execute('''SELECT 1 FROM dc.counsel_request WHERE id<>%s
      AND status_code IN ('REQ','CONFIRMED') AND slot_date=%s AND slot_start<%s AND slot_end>%s
      AND (counselor_uid=%s OR student_uid=%s) LIMIT 1''',(exclude,slot.date,slot.end,slot.start,staff_uid,student_uid)).fetchone()
    if conflict:
        raise HTTPException(409,'학생 또는 담당자의 예약 시간과 겹칩니다.')
    if datetime.combine(slot.date,slot.start,tzinfo=ZoneInfo('Asia/Seoul'))<=datetime.now(ZoneInfo('Asia/Seoul')):
        raise HTTPException(422,'미래의 상담 시간을 선택해 주세요.')


def care_gate(conn,uid):
    """판정은 gates.diagnosis_gate 한 곳에서 한다(취업 게이트와 같은 술어를 쓴다).
    이 함수는 상담 도메인의 기존 409 문구를 그대로 유지하는 얇은 껍데기다."""
    row,reasons=diagnosis_gate(conn,uid)
    if not row:
        raise HTTPException(409,'핵심 진단과 유형 확정이 필요합니다.')
    if reasons:
        raise HTTPException(409,'핵심 진단과 유형별 후속 진단을 완료해야 합니다.')
    return row


@router.get('/counsel-requests')
def requests(page:int=Query(1,ge=1),pageSize:int=Query(20,ge=1,le=100),studentId:str|None=None,
             status:str|None=None,user=Depends(principal, scope='function'),conn=Depends(connection, scope='function')):
    condition,values=visibility(user)
    if studentId:
        student=student_access(conn,user,studentId)
        condition+=' AND r.student_uid=%s'
        values.append(student['intg_uid'])
    if status:
        condition+=' AND r.status_code=ANY(%s)'
        values.append([code for code,label in LABELS.items() if label==status or code==status])
    total=conn.execute('SELECT count(*) AS n FROM dc.counsel_request r WHERE '+condition,values).fetchone()['n']
    rows=conn.execute(SELECT+' WHERE '+condition+' ORDER BY r.requested_at DESC,r.id LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=[dto(r) for r in rows],totalCount=total,page=page,pageSize=pageSize)


@router.get('/counsel-requests/{request_id}')
def request_detail(request_id:str,user=Depends(principal, scope='function'),conn=Depends(connection, scope='function')):
    return dto(get_request(conn,user,request_id))


@router.post('/counsel-requests',status_code=201)
def create(body:CreateRequest,idempotency_key:str=Header(min_length=8,max_length=200),user=Depends(principal, scope='function'),conn=Depends(connection, scope='function')):
    if user['kind']!='STUDENT':
        raise HTTPException(403,'학생 본인만 신청할 수 있습니다.')
    route='POST /counsel-requests'
    digest=hashlib.sha256(body.model_dump_json().encode()).hexdigest()
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',(user['intg_uid']+route+idempotency_key,))
    saved=conn.execute('SELECT * FROM dc.idempotency WHERE actor_uid=%s AND route=%s AND key=%s',(user['intg_uid'],route,idempotency_key)).fetchone()
    if saved:
        if saved['request_hash']!=digest:
            raise HTTPException(409,'같은 요청 키로 다른 내용을 저장할 수 없습니다.')
        return saved['response']
    student=student_access(conn,user,user['intg_uid'])
    assignee=resolve_assignee(conn,body.assignedCounselorId or body.assignedProfessorId,body.type)
    if body.type=='진로취업' and body.careTrack not in ('general','care7'):
        raise HTTPException(422,'일반 상담 또는 CARE 7+를 선택해 주세요.')
    if body.type!='진로취업' and body.careTrack=='care7':
        raise HTTPException(422,'CARE 7+는 진로취업 상담에만 적용됩니다.')
    current_type=care_gate(conn,user['intg_uid']) if body.careTrack=='care7' else None
    if current_type and not body.topicCode:
        raise HTTPException(422,'유형별 상담 주제를 선택해 주세요.')
    topic=None
    if body.topicCode:
        topic=conn.execute("SELECT * FROM dc.code_item WHERE group_code='COUNSEL_TOPIC' AND code=%s AND is_active FOR SHARE",(body.topicCode,)).fetchone()
        if body.type!='진로취업' or not topic:
            raise HTTPException(422,'사용 가능한 진로 상담 주제를 선택해 주세요.')
        if current_type and topic['payload'].get('type')!=current_type['code']:
            raise HTTPException(422,'현재 학생 유형에 해당하는 상담 주제를 선택해 주세요.')
    allowed={'진로취업':{'CAREER','JOB',None},'심리':{'PSY',None},'교수':{'PROF',None}}
    if body.typeCode not in allowed[body.type]:
        raise HTTPException(422,'상담 종류 코드가 일치하지 않습니다.')
    if body.slot:
        check_slot(conn,assignee['intg_uid'],user['intg_uid'],body.slot)
    elif body.type!='교수' or body.method!='비대면':
        raise HTTPException(422,'상담 예약 시간이 필요합니다.')
    detail=student['detail'] or {}
    current=conn.execute('SELECT student_type FROM dc.student_type_event WHERE student_uid=%s ORDER BY decided_at DESC,id DESC LIMIT 1',(student['intg_uid'],)).fetchone()
    snapshot={'name':student['name'],'studentNo':student['student_no'],'major':student['major_label'],
              'grade':student['grade'],'studentType':current['student_type'] if current else None,
              'enrollmentStatus':detail.get('enrollmentStatus') or '재학'}
    if topic:
        snapshot['topicCode']=topic['code']
        snapshot['topicLabel']=topic['label']
    request_id=str(uuid4())
    conn.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,status_code,
      method_code,topic,topic_code,requested_at,slot_date,slot_start,slot_end,place,intake,snapshot,source_payload)
      VALUES (%s,%s,%s,%s,%s,%s,'REQ',%s,%s,%s,now(),%s,%s,%s,%s,%s,%s,%s)''',
      (request_id,user['intg_uid'],assignee['intg_uid'],body.typeCode or COUNSEL_TYPE_CODE[body.type],body.type,body.careTrack,
       'ONLINE' if body.method=='비대면' else 'OFFLINE',body.topic,body.topicCode,body.slot.date if body.slot else None,
       body.slot.start if body.slot else None,body.slot.end if body.slot else None,body.slot.place if body.slot else None,
       Jsonb([a.model_dump() for a in body.intake]),Jsonb(snapshot),Jsonb(body.model_dump(mode='json'))))
    conn.execute('INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES (%s,%s,%s,%s)',(request_id,user['intg_uid'],'REQUESTED',Jsonb({})))
    result=dto(get_request(conn,user,request_id))
    conn.execute('INSERT INTO dc.idempotency(actor_uid,route,key,request_hash,response) VALUES (%s,%s,%s,%s,%s)',
                 (user['intg_uid'],route,idempotency_key,digest,Jsonb(result)))
    return result


@router.post('/counsel-requests/{request_id}/{action}')
def act(request_id:str,action:Literal['confirm','cancel','reschedule','reassign','complete'],body:Action,
        user=Depends(principal, scope='function'),conn=Depends(connection, scope='function')):
    row=get_request(conn,user,request_id,lock=True)
    if row['version']!=body.expectedVersion:
        raise HTTPException(409,'다른 사용자가 수정했습니다. 새로 조회한 뒤 다시 시도해 주세요.')
    if row['status_code'] not in ('REQ','CONFIRMED'):
        raise HTTPException(409,'이미 종료된 상담입니다.')
    if action!='cancel':
        require_staff(user)
    if user['kind']=='STAFF' and row['counselor_uid'] not in (None,user['intg_uid']):
        raise HTTPException(403,'배정된 담당자만 상담을 처리할 수 있습니다.')
    slot=body.slot
    staff_uid=row['counselor_uid']
    if action in ('confirm','reschedule'):
        if not slot:
            raise HTTPException(422,'예약 시간이 필요합니다.')
        if not staff_uid:
            staff_uid=user['intg_uid']
        check_slot(conn,staff_uid,row['student_uid'],slot,request_id)
        conn.execute("UPDATE dc.counsel_request SET status_code='CONFIRMED',counselor_uid=%s,slot_date=%s,slot_start=%s,slot_end=%s,place=%s WHERE id=%s",
                     (staff_uid,slot.date,slot.start,slot.end,slot.place,request_id))
    elif action=='cancel':
        if not body.reason.strip():
            raise HTTPException(422,'취소 사유가 필요합니다.')
        if user['kind']=='STUDENT' and row['slot_date'] and row['slot_date']<datetime.now(ZoneInfo('Asia/Seoul')).date()+timedelta(days=3):
            raise HTTPException(409,'상담 3일 전 이후 취소는 담당자에게 문의해 주세요.')
        code='CANCEL_STU' if user['kind']=='STUDENT' else 'CANCEL_CNS'
        conn.execute('UPDATE dc.counsel_request SET status_code=%s WHERE id=%s',(code,request_id))
    elif action=='reassign':
        assignee=resolve_assignee(conn,body.assigneeId,row['legacy_type'])
        if row['slot_date']:
            existing=Slot(date=row['slot_date'],start=row['slot_start'],end=row['slot_end'],place=row['place'] or '')
            check_slot(conn,assignee['intg_uid'],row['student_uid'],existing,request_id)
        conn.execute('UPDATE dc.counsel_request SET counselor_uid=%s WHERE id=%s',(assignee['intg_uid'],request_id))
    elif action=='complete':
        if row['status_code']!='CONFIRMED' or not body.summary.strip():
            raise HTTPException(409,'확정된 상담과 상담 기록이 필요합니다.')
        # 트랙 판정은 gates 한 곳에서 한다(PROCESS.md §2-1 구현규칙 4). 여기서 care_track 을
        # 직접 비교하면 트랙이 NULL 인 진로취업 상담이 로드맵 없이 완료된 뒤 게이트에서는
        # CARE7 충족으로 계산된다 — 같은 학생이 상담은 열리고 취업은 잠긴다.
        if is_care7_request(row):
            if not body.finalType or not roadmap_basis_ok(conn,request_id,row['student_uid']):
                raise HTTPException(409,'최종 유형과 이 상담으로 확정된 로드맵이 필요합니다.')
            conn.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source,actor_uid) VALUES (%s,%s,'counsel',%s)",
                         (row['student_uid'],body.finalType,user['intg_uid']))
        conn.execute('''INSERT INTO dc.counsel_record(id,request_id,counselor_uid,summary,comment,follow_up,status_code,created_at,updated_at,snapshot)
          VALUES (%s,%s,%s,%s,%s,%s,'DONE',now(),now(),%s) ON CONFLICT(request_id) DO UPDATE
          SET summary=excluded.summary,comment=excluded.comment,follow_up=excluded.follow_up,status_code='DONE',updated_at=now(),version=dc.counsel_record.version+1''',
          (str(uuid4()),request_id,user['intg_uid'],body.summary,body.comment,body.followUp,Jsonb(row['snapshot'])))
        conn.execute("UPDATE dc.counsel_request SET status_code='DONE',completed_at=now() WHERE id=%s",(request_id,))
    conn.execute('UPDATE dc.counsel_request SET version=version+1 WHERE id=%s',(request_id,))
    conn.execute('INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES (%s,%s,%s,%s)',
                 (request_id,user['intg_uid'],action.upper(),Jsonb({'before':dto(row),'action':body.model_dump(mode='json')})))
    return dto(get_request(conn,user,request_id))
