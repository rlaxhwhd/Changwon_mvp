"""심리검사 결과 — 심리상담 신청 1건에 결과 1건. 우리가 채점하지 않는다(외부 검사도구 결과를 상담사가 입력).
CARE 7+ 진단(diagnosis.py)과는 다른 도메인이라 유형·로드맵과 연결하지 않는다."""
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from .auth import principal, require_staff
from .counsel import get_request, visibility
from .db import connection

router=APIRouter()


class Scale(BaseModel):
    model_config=ConfigDict(extra='forbid')
    label:str=Field(min_length=1,max_length=200)
    score:float
    note:str|None=Field(None,max_length=2000)


class PsychTestWrite(BaseModel):
    model_config=ConfigDict(extra='forbid')
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
    if user['profile'].get('role')!='psych':
        raise HTTPException(403,'심리상담사만 심리검사 결과를 다룰 수 있습니다.')


@router.get('/psych-tests')
def psych_tests(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_psych(user)
    condition,values=visibility(user)
    rows=conn.execute(SELECT+' JOIN dc.counsel_request r ON r.id=t.request_id WHERE '+condition+' ORDER BY t.updated_at DESC,t.id',values).fetchall()
    return {'items':[dto(r) for r in rows]}


@router.put('/psych-tests/{request_id}')
def save_psych_test(request_id:str,body:PsychTestWrite,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_psych(user)
    request=get_request(conn,user,request_id,lock=True)
    if request['legacy_type']!='심리' or request['status_code'] not in ('CONFIRMED','DONE'):
        raise HTTPException(422,'확정되거나 완료된 심리상담 건에만 결과를 작성할 수 있습니다.')
    if body.testCode=='ETC' and not (body.testNameEtc or '').strip():
        raise HTTPException(422,'기타 검사는 검사명을 입력해 주세요.')
    if body.status=='완료' and not (body.interpretation.strip() and body.opinion.strip()):
        raise HTTPException(422,'작성 완료에는 결과 해석과 상담사 소견이 필요합니다.')
    scales=Jsonb([s.model_dump(exclude_none=True) for s in body.scales])
    status='DONE' if body.status=='완료' else 'DRAFT'
    existing=conn.execute('SELECT id FROM dc.psych_test_result WHERE request_id=%s FOR UPDATE',(request_id,)).fetchone()
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
    return dto(conn.execute(SELECT+' WHERE t.id=%s',(row_id,)).fetchone())
