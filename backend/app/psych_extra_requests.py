"""추가 심리상담신청 게시판 — 상담 자리가 모두 마감되어 신청하지 못한 학생이 원하는 날짜·시간대를 남기는 글.

학생이 작성하고 심리상담사 전원이 함께 보며 「확인」 처리한다(2026-10-21 사용자 확정).
심리상담사가 전화 요청 등을 받아 학생 대신 등록할 수도 있다(created_by 가 작성자를 남긴다).
상담 신청(dc.counsel_request)이 아니다 — 일정·담당자가 없고, 연락 뒤 상담사가 정식 신청을 잡는다.
"""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from .auth import principal, require_staff, student_access
from .db import connection

router=APIRouter(prefix='/psych-extra-requests')

LIST='''SELECT e.id,e.title,e.created_at,e.confirmed_at,e.snapshot,e.created_by<>e.student_uid AS proxy
 FROM dc.psych_extra_request e'''


class ExtraRequestWrite(BaseModel):
    model_config=ConfigDict(extra='forbid')
    title:str=Field(min_length=1,max_length=200)
    body:str=Field('',max_length=20000)
    # 심리상담사 대리 작성일 때만 쓴다. 학생은 본인으로 고정된다.
    studentId:str|None=None


def actor(user):
    if user['kind']=='STUDENT':
        return 'student'
    require_staff(user)
    if user['profile'].get('role')!='psych':
        raise HTTPException(403,'심리상담사만 추가 심리상담신청을 다룰 수 있습니다.')
    return 'psych'


def profile(conn,student_uid):
    """팝업 상단에 보여 주고 작성 시점 스냅샷으로 남기는 학생 정보 — 학사 유래라 읽기만 한다."""
    row=conn.execute('''SELECT v.name,v.student_no,v.grade,v.college_name,v.major_label,s.detail,p.profile
      FROM dc.student_list v JOIN dc.student s USING(intg_uid) JOIN dc.person p USING(intg_uid) WHERE v.intg_uid=%s''',(student_uid,)).fetchone()
    data={**(row['profile'] or {}),**(row['detail'] or {})}
    return {'name':row['name'],'studentNo':row['student_no'],'grade':row['grade'],'phone':data.get('phone') or '',
            'email':data.get('email') or '','college':row['college_name'] or '','major':row['major_label'] or ''}


def summary(row):
    return {'id':row['id'],'title':row['title'],'writer':row['snapshot'].get('name'),'studentNo':row['snapshot'].get('studentNo'),
            'createdAt':row['created_at'].isoformat(),'confirmed':row['confirmed_at'] is not None,'proxy':row['proxy']}


def found(conn,user,request_id,lock=False):
    row=conn.execute('''SELECT e.*,e.created_by<>e.student_uid AS proxy,c.name AS confirmed_by_name
      FROM dc.psych_extra_request e LEFT JOIN dc.person c ON c.intg_uid=e.confirmed_by WHERE e.id=%s'''+(' FOR UPDATE OF e' if lock else ''),
      (request_id,)).fetchone()
    if not row or (user['kind']=='STUDENT' and row['student_uid']!=user['intg_uid']):
        raise HTTPException(404,'추가 심리상담신청을 찾을 수 없습니다.')
    return row


def detail(row):
    return {**summary(row),'body':row['body'],'student':row['snapshot'],
            'confirmedAt':row['confirmed_at'].isoformat() if row['confirmed_at'] else None,'confirmedBy':row['confirmed_by_name']}


@router.get('')
def listing(page:int=Query(1,ge=1),pageSize:int=Query(10,ge=1,le=100),field:Literal['title','writer']='title',
            q:str=Query('',max_length=200),user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    where,values=(['e.student_uid=%s'],[user['intg_uid']]) if actor(user)=='student' else (['true'],[])
    if q.strip():
        where.append(("e.title" if field=='title' else "e.snapshot->>'name'")+' ILIKE %s')
        values.append('%'+q.strip().replace('%','\\%').replace('_','\\_')+'%')
    clause=' WHERE '+' AND '.join(where)
    total=conn.execute('SELECT count(*) n FROM dc.psych_extra_request e'+clause,values).fetchone()['n']
    rows=conn.execute(LIST+clause+' ORDER BY e.created_at DESC,e.id DESC LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=[summary(r) for r in rows],totalCount=total,page=page,pageSize=pageSize)


@router.get('/profile')
def writer_profile(studentId:str|None=None,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if actor(user)=='student':
        return profile(conn,user['intg_uid'])
    if not studentId:
        raise HTTPException(422,'학생을 선택해 주세요.')
    return profile(conn,student_access(conn,user,studentId)['intg_uid'])


@router.post('',status_code=201)
def create(body:ExtraRequestWrite,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if not body.title.strip():
        raise HTTPException(422,'제목을 입력해 주세요.')
    if actor(user)=='student':
        student_uid=user['intg_uid']
    else:
        if not body.studentId:
            raise HTTPException(422,'학생을 선택해 주세요.')
        student_uid=student_access(conn,user,body.studentId)['intg_uid']
    request_id='per_'+uuid4().hex[:16]
    conn.execute('''INSERT INTO dc.psych_extra_request(id,student_uid,title,body,snapshot,created_by)
      VALUES (%s,%s,%s,%s,%s,%s)''',(request_id,student_uid,body.title.strip(),body.body.strip(),
                                     Jsonb(profile(conn,student_uid)),user['intg_uid']))
    return detail(found(conn,user,request_id))


@router.get('/{request_id}')
def read(request_id:str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    actor(user)
    return detail(found(conn,user,request_id))


@router.post('/{request_id}/confirm')
def confirm(request_id:str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if actor(user)!='psych':
        raise HTTPException(403,'심리상담사만 확인 처리할 수 있습니다.')
    row=found(conn,user,request_id,lock=True)
    if row['confirmed_at']:
        raise HTTPException(409,'이미 확인 처리된 글입니다.')
    conn.execute('UPDATE dc.psych_extra_request SET confirmed_by=%s,confirmed_at=now() WHERE id=%s',(user['intg_uid'],request_id))
    return detail(found(conn,user,request_id))
