from uuid import uuid4

from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from .auth import principal, require_staff
from .counsel import get_request, visibility
from .db import connection

router=APIRouter()


def record_dto(row,student=False):
    return {'id':row['id'],'requestId':row['request_id'],'studentId':row['student_alias'],
            'studentName':row['snapshot'].get('studentName',row['student_name']),
            'studentMajor':row['snapshot'].get('studentMajor',row['major_label']),
            'type':row['legacy_type'],'method':'비대면' if row['method_code']=='ONLINE' else '대면',
            'topic':row['topic'],'date':row['slot_date'] or row['created_at'].date(),
            'counselorId':row['counselor_alias'],'counselorName':row['counselor_name'],
            'summary':'' if student else row['summary'],'comment':row['comment'],
            'followUp':'' if student else row['follow_up'],'status':'완료' if row['status_code']=='DONE' else '작성중',
            'createdAt':row['created_at'],'updatedAt':row['updated_at'],'version':row['version'],
            # 교수상담 분류(PROF_COUNSEL_TYPE)는 신청의 topic_code 다. 학생 발의 건은 없을 수 있다.
            'categoryCode':row['topic_code'],'origin':(row['source_payload'] or {}).get('origin','STUDENT'),
            'studentNo':row['student_no'],'studentGrade':row['snapshot'].get('grade',row['grade'])}


SELECT='''SELECT c.*,r.legacy_type,r.method_code,r.topic,r.topic_code,r.slot_date,r.source_payload,p.alias AS student_alias,
 p.name AS student_name,s.major_label,s.student_no,s.grade,a.alias AS counselor_alias,a.name AS counselor_name
 FROM dc.counsel_record c JOIN dc.counsel_request r ON r.id=c.request_id
 JOIN dc.person p ON p.intg_uid=r.student_uid JOIN dc.student s ON s.intg_uid=r.student_uid
 JOIN dc.person a ON a.intg_uid=c.counselor_uid'''


@router.get('/counsel-records')
def records(page:int=Query(1,ge=1),pageSize:int=Query(20,ge=1,le=100),type:str|None=None,professorId:str|None=None,
            studentId:str|None=None,categoryCode:str|None=None,q:str=Query('',max_length=200),
            user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    condition,values=visibility(user)
    if user['kind']=='STUDENT':
        condition+=" AND c.status_code='DONE'"
    if type: condition+=' AND r.legacy_type=%s'; values.append(type)
    if professorId: condition+=' AND (a.alias=%s OR c.counselor_uid=%s)'; values+=[professorId,professorId]
    if studentId: condition+=' AND (p.alias=%s OR r.student_uid=%s)'; values+=[studentId,studentId]
    if categoryCode: condition+=' AND r.topic_code=%s'; values.append(categoryCode)
    if q.strip():
        condition+=" AND concat_ws(' ',p.name,s.student_no) ILIKE %s"; values.append('%'+q.strip().replace('%','\\%').replace('_','\\_')+'%')
    base=''' FROM dc.counsel_record c JOIN dc.counsel_request r ON r.id=c.request_id
      JOIN dc.person p ON p.intg_uid=r.student_uid JOIN dc.student s ON s.intg_uid=r.student_uid
      JOIN dc.person a ON a.intg_uid=c.counselor_uid WHERE '''+condition
    total=conn.execute('SELECT count(*) AS n'+base,values).fetchone()['n']
    rows=conn.execute(SELECT+' WHERE '+condition+' ORDER BY c.updated_at DESC,c.id LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=[record_dto(r,user['kind']=='STUDENT') for r in rows],totalCount=total,page=page,pageSize=pageSize)


class ProfessorRecord(BaseModel):
    '''교수가 학생 신청 없이 남기는 지도학생 상담기록 — 신청(DONE)+기록을 한 트랜잭션에 만든다(0003 D3).'''
    model_config=ConfigDict(extra='forbid')
    studentId:str
    categoryCode:str
    method:Literal['대면','비대면']
    date:date
    summary:str=Field(min_length=1,max_length=20000)


class PsychRecord(BaseModel):
    '''심리상담사가 학생 신청 없이 남기는 심리상담 기록(추가 심리상담신청) — 교수 발의 기록과 같은 방식.'''
    model_config=ConfigDict(extra='forbid')
    studentId:str
    topic:str=Field(min_length=1,max_length=200)
    method:Literal['대면','비대면']
    date:date
    summary:str=Field(min_length=1,max_length=20000)


def direct_record(conn,user,route,idempotency_key,student,*,type_code,legacy_type,topic,topic_code,method,day,summary,origin):
    '''상담사 발의 기록 — 신청(DONE)+기록+REQUESTED/COMPLETE 이벤트를 한 트랜잭션에 만든다.'''
    saved=conn.execute('SELECT response FROM dc.idempotency WHERE actor_uid=%s AND route=%s AND key=%s',(user['intg_uid'],route,idempotency_key)).fetchone()
    if saved: return saved['response']
    snapshot={**student['roster'],**(student['detail'] or {})}
    snapshot={k:snapshot.get(k) for k in ('name','studentNo','major','grade','studentType','enrollmentStatus')}
    snapshot.update(name=student['name'],studentNo=student['student_no'],major=student['major_label'],grade=student['grade'])
    request_id=str(uuid4())
    conn.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,status_code,method_code,topic,topic_code,
      requested_at,slot_date,intake,snapshot,source_payload,completed_at)
      VALUES (%s,%s,%s,%s,%s,'DONE',%s,%s,%s,%s,%s,'[]',%s,%s,%s)''',
      (request_id,student['intg_uid'],user['intg_uid'],type_code,legacy_type,'ONLINE' if method=='비대면' else 'OFFLINE',topic,topic_code,
       day,day,Jsonb(snapshot),Jsonb({'origin':origin,'method':method,'date':day.isoformat()}),day))
    conn.execute('''INSERT INTO dc.counsel_record(id,request_id,counselor_uid,summary,comment,follow_up,status_code,created_at,updated_at,snapshot)
      VALUES (%s,%s,%s,%s,'','','DONE',now(),now(),%s)''',(str(uuid4()),request_id,user['intg_uid'],summary.strip(),Jsonb(snapshot)))
    for kind in ('REQUESTED','COMPLETE'):
        conn.execute('INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES (%s,%s,%s,%s)',
                     (request_id,user['intg_uid'],kind,Jsonb({'origin':origin})))
    result=record_dto(conn.execute(SELECT+' WHERE c.request_id=%s',(request_id,)).fetchone())
    conn.execute('INSERT INTO dc.idempotency(actor_uid,route,key,request_hash,response) VALUES (%s,%s,%s,%s,%s)',
                 (user['intg_uid'],route,idempotency_key,request_id,Jsonb(jsonable_encoder(result))))
    return result


@router.post('/counsel-records/professor',status_code=201)
def professor_record(body:ProfessorRecord,idempotency_key:str=Header(alias='Idempotency-Key',min_length=1,max_length=200),
                     user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_staff(user)
    if user['profile'].get('role')!='professor':
        raise HTTPException(403,'교수만 지도학생 상담기록을 남길 수 있습니다.')
    student=conn.execute('''SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE (p.alias=%s OR s.intg_uid=%s) AND EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=s.intg_uid)''',
      (body.studentId,body.studentId,user['intg_uid'])).fetchone()
    if not student:
        raise HTTPException(404,'지도학생을 찾을 수 없습니다.')
    category=conn.execute("SELECT code,label FROM dc.code_item WHERE group_code='PROF_COUNSEL_TYPE' AND code=%s AND is_active",(body.categoryCode,)).fetchone()
    if not category:
        raise HTTPException(422,'상담 분류 코드가 올바르지 않습니다.')
    return direct_record(conn,user,'counsel-records/professor',idempotency_key,student,type_code='PROF',legacy_type='교수',
                         topic=category['label'],topic_code=category['code'],method=body.method,day=body.date,summary=body.summary,origin='PROF_RECORD')


@router.post('/counsel-records/psych',status_code=201)
def psych_record(body:PsychRecord,idempotency_key:str=Header(alias='Idempotency-Key',min_length=1,max_length=200),
                 user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    '''심리상담은 전교 대상이라 담당 학과 범위를 묻지 않는다 — 기록이 생기면 그 학생은 상담사 열람 범위(student_access)에 들어온다.'''
    require_staff(user)
    if user['profile'].get('role')!='psych':
        raise HTTPException(403,'심리상담사만 심리상담 기록을 남길 수 있습니다.')
    student=conn.execute('SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE p.alias=%s OR s.intg_uid=%s',
                         (body.studentId,body.studentId)).fetchone()
    if not student:
        raise HTTPException(404,'학생을 찾을 수 없습니다.')
    return direct_record(conn,user,'counsel-records/psych',idempotency_key,student,type_code='PSY',legacy_type='심리',
                         topic=body.topic.strip(),topic_code=None,method=body.method,day=body.date,summary=body.summary,origin='PSY_RECORD')


# ── 지도학생 독려 — 상담기록이 아니라 알림이다(0003 Astra ③). dc.notification 에 쌓고 최근 시각을 읽는다.
class Nudge(BaseModel):
    model_config=ConfigDict(extra='forbid')
    studentId:str


@router.post('/advisor-nudges',status_code=201)
def send_nudge(body:Nudge,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_staff(user)
    if user['profile'].get('role') not in ('professor','assistant'):
        raise HTTPException(403,'교수·조교만 독려할 수 있습니다.')
    student=conn.execute('''SELECT p.intg_uid,p.alias FROM dc.person p WHERE (p.alias=%s OR p.intg_uid=%s) AND p.kind='STUDENT'
      AND EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=p.intg_uid)''',(body.studentId,body.studentId,user['intg_uid'])).fetchone()
    if not student:
        raise HTTPException(404,'담당 학생을 찾을 수 없습니다.')
    row=conn.execute('''INSERT INTO dc.notification(recipient_uid,source_kind,source_id,tone,title,body,route)
      VALUES (%s,'ADVISOR_NUDGE',%s,'counsel',%s,%s,'/counsel/professor') RETURNING id,occurred_at''',
      (student['intg_uid'],str(uuid4()),'지도교수 상담을 신청해 주세요',f"{user['name']} 선생님이 상담을 권유했습니다.")).fetchone()
    return {'id':str(row['id']),'studentId':student['alias'],'professorId':user['alias'],'by':user['alias'],'sentAt':row['occurred_at']}


@router.get('/advisor-nudges')
def latest_nudges(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    '''담당 범위 학생별 최근 독려 시각.'''
    require_staff(user)
    rows=conn.execute('''SELECT DISTINCT ON (n.recipient_uid) p.alias AS student_id,n.occurred_at AS sent_at
      FROM dc.notification n JOIN dc.person p ON p.intg_uid=n.recipient_uid
      WHERE n.source_kind='ADVISOR_NUDGE' AND EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=n.recipient_uid)
      ORDER BY n.recipient_uid,n.occurred_at DESC''',(user['intg_uid'],)).fetchall()
    return {'items':[{'studentId':r['student_id'],'sentAt':r['sent_at']} for r in rows]}


class RecordWrite(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expectedVersion:int=Field(ge=0)
    summary:str=Field(max_length=20000)
    comment:str=Field(max_length=20000)
    followUp:str=Field('',max_length=10000)
    status:Literal['작성중','완료']


@router.put('/counsel-requests/{request_id}/record')
def save_record(request_id:str,body:RecordWrite,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_staff(user)
    request=get_request(conn,user,request_id,lock=True)
    existing=conn.execute('SELECT * FROM dc.counsel_record WHERE request_id=%s FOR UPDATE',(request_id,)).fetchone()
    if request['counselor_uid']!=user['intg_uid'] and (not existing or existing['counselor_uid']!=user['intg_uid']):
        raise HTTPException(403,'담당자만 상담 기록을 작성할 수 있습니다.')
    if (existing['version'] if existing else 0)!=body.expectedVersion:
        raise HTTPException(409,'다른 사용자가 기록을 변경했습니다. 다시 조회해 주세요.')
    if body.status=='완료' and not (body.summary.strip() and body.comment.strip()):
        raise HTTPException(422,'상담 소견과 공개 코멘트를 입력해 주세요.')
    conn.execute('''INSERT INTO dc.counsel_record(id,request_id,counselor_uid,summary,comment,follow_up,status_code,created_at,updated_at,snapshot)
      VALUES (%s,%s,%s,%s,%s,%s,%s,now(),now(),%s) ON CONFLICT(request_id) DO UPDATE SET
      summary=excluded.summary,comment=excluded.comment,follow_up=excluded.follow_up,status_code=excluded.status_code,
      updated_at=now(),version=dc.counsel_record.version+1''',
      (str(uuid4()),request_id,user['intg_uid'],body.summary.strip(),body.comment.strip(),body.followUp.strip(),
       'DONE' if body.status=='완료' else 'DRAFT',Jsonb(request['snapshot'])))
    conn.execute('INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES (%s,%s,%s,%s)',
                 (request_id,user['intg_uid'],'RECORD_UPDATED',Jsonb({'before':{k:existing[k] for k in ('summary','comment','follow_up','version')} if existing else None,
                  'after':body.model_dump()})))
    return record_dto(conn.execute(SELECT+' WHERE c.request_id=%s',(request_id,)).fetchone())
