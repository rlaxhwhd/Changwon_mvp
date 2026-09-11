from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from .auth import principal, require_staff, student_access
from .db import connection
from .settings import settings

router=APIRouter()
STATUS={'DONE':'완료','STARTED':'진행중','NOT_STARTED':'미응시'}


def attempt_dto(row):
    return {**row['payload'],'id':row['id'],'studentId':row['alias'],'studentNo':row['student_no'],
            'studentName':row['payload'].get('studentName',row['name']),
            'studentMajor':row['payload'].get('studentMajor',row['major_label']),
            'studentGrade':row['payload'].get('studentGrade',row['grade']),
            'testId':row['test_id'],'status':STATUS[row['status_code']],'attemptNo':row['attempt_no'],
            'startedAt':row['started_at'].isoformat() if row['started_at'] else '',
            'completedAt':row['completed_at'].isoformat() if row['completed_at'] else None,'source':row['source']}


@router.get('/diagnosis/students/{identity}')
def student_diagnoses(identity: str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    student=student_access(conn,user,identity)
    rows=conn.execute('''SELECT a.*,p.alias,p.name,s.student_no,s.major_label,s.grade FROM dc.diagnosis_attempt a
      JOIN dc.person p ON p.intg_uid=a.student_uid JOIN dc.student s ON s.intg_uid=a.student_uid
      WHERE a.student_uid=%s AND a.status_code IN ('DONE','STARTED') ORDER BY a.attempt_no DESC,a.test_id''',(student['intg_uid'],)).fetchall()
    results=conn.execute('''SELECT r.payload,r.source,r.test_id,r.attempt_no FROM dc.diagnosis_result r JOIN dc.diagnosis_attempt a
      USING(student_uid,test_id,attempt_no) WHERE r.student_uid=%s AND a.status_code='DONE' ORDER BY r.attempt_no DESC''',(student['intg_uid'],)).fetchall()
    comments=conn.execute('''SELECT c.id,c.attempt_id AS "attemptId",p.alias AS "studentId",c.body,a.alias AS "by",
      c.actor_name AS "byName",c.created_at AS "createdAt" FROM dc.diagnosis_comment c JOIN dc.person p ON p.intg_uid=c.student_uid
      JOIN dc.person a ON a.intg_uid=c.actor_uid WHERE c.student_uid=%s ORDER BY c.created_at''',(student['intg_uid'],)).fetchall()
    bindings=conn.execute('SELECT * FROM dc.diagnosis_result_factor WHERE student_uid=%s',(student['intg_uid'],)).fetchall()
    indexed={(b['test_id'],b['attempt_no'],b['position']):b for b in bindings}
    for result in results:
        result['payload']=dict(result['payload'])
        factors=[]
        for position,factor in enumerate(result['payload'].get('factors',[])):
            binding=indexed.get((result['test_id'],result['attempt_no'],position))
            factors.append({**factor, **({'factorCode':binding['factor_code'],'definitionVersion':binding['definition_version']} if binding else {})})
        result['payload']['factors']=factors
    return {'studentId':student['alias'],'attempts':[attempt_dto(r) for r in rows],
            'results':[{**r['payload'],'source':r['source']} for r in results],'comments':comments}


def conditions(request,user):
    require_staff(user)
    where=['EXISTS(SELECT 1 FROM dc.staff_student_scope s WHERE s.staff_uid=%s AND s.student_uid=v.intg_uid)']
    values=[user['intg_uid']]
    departments=request.query_params.getlist('departments')
    if departments:
        where.append('v.major_label=ANY(%s)'); values.append(departments)
    return where,values


@router.get('/diagnosis/status')
def diagnosis_status(request: Request,page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),
                     q: str=Query('',max_length=200),user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    where,values=conditions(request,user)
    for key,column in {'testId':'test_id','grade':'grade::text'}.items():
        value=request.query_params.get('filters.'+key)
        if value: where.append(column+'=%s'); values.append(value)
    status=request.query_params.get('filters.status')
    if status:
        where.append('status_code=ANY(%s)'); values.append([key for key,label in STATUS.items() if label==status])
    if request.query_params.get('filters.retake')=='Y': where.append('attempt_no>=2')
    if q: where.append("concat_ws(' ',name,student_no,major_label) ILIKE %s"); values.append('%'+q+'%')
    condition=' AND '.join(where)
    total=conn.execute('SELECT count(*) AS n FROM dc.diagnosis_status v WHERE '+condition,values).fetchone()['n']
    rows=conn.execute('''SELECT * FROM dc.diagnosis_status v WHERE '''+condition+'''
      ORDER BY CASE status_code WHEN 'NOT_STARTED' THEN 0 WHEN 'STARTED' THEN 1 ELSE 2 END,student_no,test_id LIMIT %s OFFSET %s''',values+[pageSize,(page-1)*pageSize]).fetchall()
    # 한 페이지의 장식값(최신 코멘트·최근 권유)은 행마다 묻지 않고 두 번에 걸어 가져온다.
    # 행마다 물으면 pageSize 100 에서 이 함수 하나가 202 회를 실행한다 — 페이지 크기에
    # 비례해 늘어나므로 대상이 8천 명이 되면 그대로 비용이 된다.
    attempts=[row['attempt_id'] for row in rows if row['attempt_id']]
    comments={}
    if attempts:
        comments={c['attemptId']:c for c in conn.execute('''SELECT DISTINCT ON (c.attempt_id) c.attempt_id AS "attemptId",
          c.id,c.student_uid,c.body,p.alias AS "by",c.actor_name AS "byName",c.created_at AS "createdAt"
          FROM dc.diagnosis_comment c JOIN dc.person p ON p.intg_uid=c.actor_uid WHERE c.attempt_id=ANY(%s)
          ORDER BY c.attempt_id,c.created_at DESC,c.id DESC''',(attempts,)).fetchall()}
    nudges={}
    if rows:
        # (학생,검사) 쌍이 아니라 두 집합의 곱으로 좁힌 뒤 쌍으로 꺼내 쓴다. 여분이 딸려
        # 와도 아래 조회는 정확한 쌍만 읽으므로 값이 섞이지 않는다.
        nudges={(n['student_uid'],n['test_id']):n['at'] for n in conn.execute('''SELECT student_uid,test_id,
          max(created_at) AS at FROM dc.diagnosis_nudge WHERE student_uid=ANY(%s) AND test_id=ANY(%s)
          GROUP BY student_uid,test_id''',([r['intg_uid'] for r in rows],[r['test_id'] for r in rows])).fetchall()}
    result=[]
    for row in rows:
        found=comments.get(row['attempt_id'])
        comment=dict(id=found['id'],attemptId=found['attemptId'],studentId=row['alias'],body=found['body'],
          by=found['by'],byName=found['byName'],createdAt=found['createdAt']) if found else None
        result.append(dict(key=row['attempt_id'] or row['alias']+'::'+row['test_id'],attemptId=row['attempt_id'],
          studentId=row['alias'],studentNo=row['student_no'],studentName=row['name'],studentMajor=row['major_label'],
          studentGrade=row['grade'],enrollStatus=row['enrollment_status'],testId=row['test_id'],testName=row['test_name'],
          status=STATUS[row['status_code']],attemptNo=row['attempt_no'],date=row['completed_at'] or row['started_at'],
          resultSummary=row['result_summary'],isRetake=row['attempt_no']>=2,comment=comment,
          nudgedAt=nudges.get((row['intg_uid'],row['test_id']))))
    return dict(items=result,totalCount=total,page=page,pageSize=pageSize)


@router.get('/diagnosis/summary')
def summary(request: Request,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    where,values=conditions(request,user)
    return conn.execute('''SELECT test_id AS "testId",test_name AS "testName",count(*) AS target,
      count(*) FILTER(WHERE status_code='DONE') AS done,count(*) FILTER(WHERE status_code='STARTED') AS "inProgress",
      count(*) FILTER(WHERE status_code='NOT_STARTED') AS "notStarted",
      round(100.0*count(*) FILTER(WHERE status_code='DONE')/count(*)) AS rate
      FROM dc.diagnosis_status v WHERE '''+' AND '.join(where)+' GROUP BY test_id,test_name ORDER BY test_id',values).fetchall()


class Comment(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    body: str=Field(min_length=1,max_length=10000)


@router.post('/diagnosis/attempts/{attempt_id}/comments',status_code=201)
def comment(attempt_id: str,body: Comment,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_staff(user)
    attempt=conn.execute("SELECT * FROM dc.diagnosis_attempt WHERE id=%s AND status_code='DONE'",(attempt_id,)).fetchone()
    if not attempt: raise HTTPException(404,'완료된 응시 기록을 찾을 수 없습니다.')
    student=student_access(conn,user,attempt['student_uid'])
    row=conn.execute('''INSERT INTO dc.diagnosis_comment(attempt_id,student_uid,body,actor_uid,actor_name) VALUES(%s,%s,%s,%s,%s) RETURNING *''',
                     (attempt_id,student['intg_uid'],body.body,user['intg_uid'],user['name'])).fetchone()
    return dict(id=row['id'],attemptId=attempt_id,studentId=student['alias'],body=row['body'],by=user['alias'],byName=row['actor_name'],createdAt=row['created_at'])


@router.post('/diagnosis/students/{identity}/nudges/{test_id}',status_code=201)
def nudge(identity: str,test_id: str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    require_staff(user)
    student=student_access(conn,user,identity)
    target=conn.execute("SELECT 1 FROM dc.diagnosis_status WHERE intg_uid=%s AND test_id=%s AND status_code<>'DONE'",(student['intg_uid'],test_id)).fetchone()
    if not target: raise HTTPException(422,'미완료 대상 검사만 권유할 수 있습니다.')
    row=conn.execute('INSERT INTO dc.diagnosis_nudge(student_uid,test_id,actor_uid) VALUES(%s,%s,%s) RETURNING *',
                     (student['intg_uid'],test_id,user['intg_uid'])).fetchone()
    return dict(id=row['id'],studentId=student['alias'],testId=test_id,by=user['alias'],sentAt=row['created_at'])


@router.post('/development/diagnosis/{test_id}/complete')
def simulate(test_id: str,idempotency_key: str=Header(min_length=8,max_length=200),
             user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if settings.environment!='development' or user['kind']!='STUDENT':
        raise HTTPException(403,'학생 개발 검증 전용 기능입니다.')
    if test_id in ('c5','c6'):
        raise HTTPException(409,'결과표 항목이 추가될 예정입니다. 임의 결과를 생성할 수 없습니다.')
    student=student_access(conn,user,user['intg_uid'])
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',('diagnosis:'+student['intg_uid'],))
    route='development/diagnosis/'+test_id
    saved=conn.execute('SELECT response FROM dc.idempotency WHERE actor_uid=%s AND route=%s AND key=%s',(user['intg_uid'],route,idempotency_key)).fetchone()
    if saved: return saved['response']
    target=conn.execute('SELECT * FROM dc.diagnosis_status WHERE intg_uid=%s AND test_id=%s',(student['intg_uid'],test_id)).fetchone()
    if not target or target['attempt_id']:
        raise HTTPException(409,'현재 응시할 수 있는 첫 회차 검사만 검증할 수 있습니다.')
    if test_id!='ccore' and not conn.execute("SELECT 1 FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id='ccore' AND status_code='DONE'",(student['intg_uid'],)).fetchone():
        raise HTTPException(409,'핵심 진단을 먼저 완료해야 합니다.')
    template=conn.execute('SELECT payload FROM dc.diagnosis_result WHERE student_uid=%s AND test_id=%s ORDER BY attempt_no LIMIT 1',(student['intg_uid'],test_id)).fetchone()
    if not template: raise HTTPException(409,'이 학생의 개발 검증용 결과가 없습니다. 실제 채점 엔진 연결이 필요합니다.')
    definitions=conn.execute('SELECT factor_code,label FROM dc.diagnosis_factor_definition WHERE test_code=%s',(test_id.upper(),)).fetchall()
    if definitions:
        scores=template['payload'].get('factors',[])
        if any(not any(f.get('factorCode')==d['factor_code'] or f.get('name')==d['label'] for f in scores) for d in definitions):
            raise HTTPException(409,'현재 결과표 항목에 맞는 검증용 점수가 없습니다. 기존 예시 점수를 새 항목으로 환산하지 않습니다.')
    attempt_no=conn.execute('SELECT COALESCE(max(attempt_no),0)+1 AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id=%s',(student['intg_uid'],test_id)).fetchone()['n']
    now=datetime.now(timezone.utc).isoformat()
    result={**template['payload'],'studentId':student['alias'],'attemptNo':attempt_no,'testedAt':now,'source':'development:fixture'}
    payload=dict(studentName=student['name'],studentNo=student['student_no'],studentMajor=student['major_label'],studentGrade=student['grade'],resultSummary=result.get('headline',''))
    attempt_id=str(uuid4())
    conn.execute('''INSERT INTO dc.diagnosis_attempt(id,student_uid,test_id,attempt_no,status_code,started_at,completed_at,payload,source)
      VALUES(%s,%s,%s,%s,'DONE',now(),now(),%s,'development:fixture')''',(attempt_id,student['intg_uid'],test_id,attempt_no,Jsonb(payload)))
    conn.execute("INSERT INTO dc.diagnosis_result(student_uid,test_id,attempt_no,tested_at,payload,source) VALUES(%s,%s,%s,now(),%s,'development:fixture')",
                 (student['intg_uid'],test_id,attempt_no,Jsonb(result)))
    if test_id=='ccore':
        outcome=(student['detail'] or {}).get('diagnosisOutcome',{}).get('studentType')
        if not outcome: raise HTTPException(409,'유형 판정 결과가 정의되어 있지 않습니다.')
        conn.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source,actor_uid) VALUES(%s,%s,'development:fixture',%s)",(student['intg_uid'],outcome,user['intg_uid']))
    response={'id':attempt_id,'source':'development:fixture'}
    conn.execute('INSERT INTO dc.idempotency(actor_uid,route,key,request_hash,response) VALUES(%s,%s,%s,%s,%s)',
                 (user['intg_uid'],route,idempotency_key,test_id,Jsonb(response)))
    return response
