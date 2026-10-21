"""심리검사 결과 — 심리상담 신청 1건에 결과 1건. 우리가 채점하지 않는다(외부 검사도구 결과를 상담사가 입력).
CARE 7+ 진단(diagnosis.py)과는 다른 도메인이라 유형·로드맵과 연결하지 않는다."""
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from .auth import principal, require_staff
from .counsel import dto as counsel_dto, get_request, visibility
from .db import connection

router=APIRouter()


class Scale(BaseModel):
    model_config=ConfigDict(extra='forbid')
    label:str=Field(min_length=1,max_length=200)
    score:float
    note:str|None=Field(None,max_length=2000)


class PsychTestWrite(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expectedVersion:int=Field(ge=0)
    testCode:str=Field(min_length=1,max_length=40)
    testNameEtc:str|None=Field(None,max_length=200)
    testedAt:date
    scales:list[Scale]=[]
    interpretation:str=Field('',max_length=20000)
    opinion:str=Field('',max_length=20000)
    openToStudent:bool=False
    status:Literal['작성중','완료']


SELECT='''SELECT t.*,p.alias AS student_alias,a.alias AS counselor_alias,a.name AS counselor_name
 FROM dc.psych_test_result t JOIN dc.person p ON p.intg_uid=t.student_uid JOIN dc.person a ON a.intg_uid=t.counselor_uid'''


def dto(row):
    return {'id':row['id'],'requestId':row['request_id'],'studentId':row['student_alias'],
            'studentNo':row['snapshot'].get('studentNo'),'studentName':row['snapshot'].get('name'),
            'studentMajor':row['snapshot'].get('major'),'studentGrade':row['snapshot'].get('grade') or 0,
            'testCode':row['test_code'],'testNameEtc':row['test_name_etc'],'testedAt':row['tested_at'].isoformat(),
            'scales':row['scales'],'interpretation':row['interpretation'],'opinion':row['opinion'],
            'openToStudent':row['open_to_student'],'status':'완료' if row['status_code']=='DONE' else '작성중',
            'by':row['counselor_alias'],'byName':row['counselor_name'],
            'createdAt':row['created_at'].isoformat(),'updatedAt':row['updated_at'].isoformat(),'version':row['version']}


def require_psych(user):
    require_staff(user)
    # 진로취업상담사와 상담 데이터를 공유하지 않는다(2026-10-21) — 심리검사도 심리상담사 업무다.
    if user['profile'].get('role')!='psych':
        raise HTTPException(403,'심리상담사만 심리검사 결과를 다룰 수 있습니다.')


@router.get('/psych-tests')
def psych_tests(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_psych(user)
    condition,values=visibility(user)
    rows=conn.execute(SELECT+' JOIN dc.counsel_request r ON r.id=t.request_id WHERE '+condition+' ORDER BY t.updated_at DESC,t.id',values).fetchall()
    return {'items':[dto(r) for r in rows]}


# 검사관리(심리검사 현황) — 학생의 심리검사 신청(topic_code=검사 종류, 140)과, 그 전부터 상담 건에 붙어 있던 결과.
TEST_BASE=''' FROM dc.counsel_request r JOIN dc.person p ON p.intg_uid=r.student_uid
 JOIN dc.student_list v ON v.intg_uid=r.student_uid
 LEFT JOIN dc.code_item k ON k.group_code=r.topic_group AND k.code=r.topic_code'''
TEST_TARGET=("r.legacy_type='심리' AND (r.topic_code IS NOT NULL OR EXISTS("
             "SELECT 1 FROM dc.psych_test_result t WHERE t.request_id=r.id))")
TEST_STATUS={'신청':('REQ','CONFIRMED'),'완료':('DONE',),'취소':('NO_SHOW','CANCEL_UNKNOWN','CANCEL_STU','CANCEL_CNS')}


def is_test_request(request):
    return request['legacy_type']=='심리' and request['topic_code'] is not None


@router.get('/psych-tests/requests')
def psych_test_requests(page:int=Query(1,ge=1),pageSize:int=Query(10,ge=1,le=100),
                        status:Literal['','신청','완료','취소']='',testCode:str='',q:str=Query('',max_length=200),
                        user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_psych(user)
    condition,values=visibility(user)
    where=[condition,TEST_TARGET]
    if status:
        where.append('r.status_code=ANY(%s)'); values.append(list(TEST_STATUS[status]))
    if testCode:
        where.append('r.topic_code=%s'); values.append(testCode)
    if q.strip():
        where.append("concat_ws(' ',p.name,v.student_no) ILIKE %s")
        values.append('%'+q.strip().replace('%','\\%').replace('_','\\_')+'%')
    clause=' AND '.join(where)
    total=conn.execute('SELECT count(*) n'+TEST_BASE+' WHERE '+clause,values).fetchone()['n']
    rows=conn.execute('''SELECT r.id,r.version,r.status_code,r.method_code,r.topic,r.topic_code,r.requested_at,r.slot_date,r.slot_start,
      r.snapshot,p.alias,p.name,v.student_no,v.college_name,v.major_label,v.grade,v.status AS enrollment_status,k.label AS test_label'''
      +TEST_BASE+' WHERE '+clause+' ORDER BY r.requested_at DESC,r.id DESC LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    results={row['request_id']:dto(row) for row in conn.execute(SELECT+' WHERE t.request_id=ANY(%s)',([r['id'] for r in rows],)).fetchall()}
    items=[]
    for row in rows:
        slot={'date':row['slot_date'].isoformat(),'start':row['slot_start'].strftime('%H:%M')} if row['slot_date'] and row['slot_start'] else None
        items.append({'requestId':row['id'],'requestVersion':row['version'],'studentId':row['alias'],
                      'studentName':row['snapshot'].get('name') or row['name'],'studentNo':row['student_no'],
                      'college':row['college_name'],'major':row['snapshot'].get('major') or row['major_label'],
                      'grade':row['snapshot'].get('grade') or row['grade'],'enrollmentStatus':row['enrollment_status'],
                      'testCode':row['topic_code'],'testLabel':row['test_label'],'purpose':row['topic'],
                      'method':'온라인' if row['method_code']=='ONLINE' else '오프라인',
                      'requestedAt':row['requested_at'].isoformat(),'slot':slot,
                      'status':next((label for label,codes in TEST_STATUS.items() if row['status_code'] in codes),row['status_code']),
                      'result':results.get(row['id'])})
    return dict(items=items,totalCount=total,page=page,pageSize=pageSize)


@router.put('/psych-tests/{request_id}')
def save_psych_test(request_id:str,body:PsychTestWrite,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_psych(user)
    request=get_request(conn,user,request_id,lock=True)
    # 심리검사 신청은 오프라인에서 검사를 마친 뒤 신청 상태 그대로 결과를 적는다(심리검사 현황 화면의 「결과작성」).
    test_request=is_test_request(request)
    writable=('REQ','CONFIRMED','DONE') if test_request else ('CONFIRMED','DONE')
    if request['legacy_type']!='심리' or request['status_code'] not in writable:
        raise HTTPException(422,'확정되거나 완료된 심리상담 건에만 결과를 작성할 수 있습니다.')
    if body.testCode=='ETC' and not (body.testNameEtc or '').strip():
        raise HTTPException(422,'기타 검사는 검사명을 입력해 주세요.')
    if body.status=='완료' and not (body.interpretation.strip() and body.opinion.strip()):
        raise HTTPException(422,'작성 완료에는 결과 해석과 상담사 소견이 필요합니다.')
    scales=Jsonb([s.model_dump(exclude_none=True) for s in body.scales])
    status='DONE' if body.status=='완료' else 'DRAFT'
    existing=conn.execute('SELECT id,version FROM dc.psych_test_result WHERE request_id=%s FOR UPDATE',(request_id,)).fetchone()
    # The parent request lock serializes both first creation and later edits.
    # Zero means the editor observed no result, not permission to overwrite one.
    if body.expectedVersion != (existing['version'] if existing else 0):
        raise HTTPException(409,'다른 상담사가 결과를 변경했습니다. 입력 내용을 확인한 뒤 최신 결과를 불러와 다시 수정해 주세요.')
    if existing:
        conn.execute('''UPDATE dc.psych_test_result SET test_code=%s,test_name_etc=%s,tested_at=%s,scales=%s,interpretation=%s,opinion=%s,
          open_to_student=%s,status_code=%s,counselor_uid=%s,updated_at=now(),version=version+1 WHERE id=%s''',
          (body.testCode,body.testNameEtc,body.testedAt,scales,body.interpretation.strip(),body.opinion.strip(),
           body.openToStudent,status,user['intg_uid'],existing['id']))
        row_id=existing['id']
    else:
        row_id='pst_'+uuid4().hex[:12]
        snapshot={'name':request['snapshot'].get('name') or request['student_name'],'studentNo':request['student_no'],
                  'major':request['snapshot'].get('major') or request['major_label'],'grade':request['snapshot'].get('grade')}
        conn.execute('''INSERT INTO dc.psych_test_result(id,request_id,student_uid,counselor_uid,test_code,test_name_etc,tested_at,scales,
          interpretation,opinion,open_to_student,status_code,snapshot) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
          (row_id,request_id,request['student_uid'],user['intg_uid'],body.testCode,body.testNameEtc,body.testedAt,scales,
           body.interpretation.strip(),body.opinion.strip(),body.openToStudent,status,Jsonb(snapshot)))
    # 검사 신청은 결과 작성 완료가 곧 신청 완료다 — 상태 전이는 다른 전이처럼 counsel_event 에 남긴다.
    if test_request and status=='DONE' and request['status_code']!='DONE':
        conn.execute("UPDATE dc.counsel_request SET status_code='DONE',completed_at=now(),version=version+1 WHERE id=%s",(request_id,))
        conn.execute('INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES (%s,%s,%s,%s)',
                     (request_id,user['intg_uid'],'COMPLETE',Jsonb({'before':counsel_dto(request),'source':'psych_test_result'})))
    return dto(conn.execute(SELECT+' WHERE t.id=%s',(row_id,)).fetchone())
