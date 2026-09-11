from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from psycopg.errors import UniqueViolation

from .auth import principal, require_staff
from .db import connection
from .students import roster, scope

router=APIRouter(prefix='/advisor-assignments')


def fail(status,code,message):
    raise HTTPException(status,detail={'code':code,'message':message})


def staff_role(conn,user):
    require_staff(user)
    row=conn.execute('SELECT role_code FROM dc.staff WHERE intg_uid=%s',(user['intg_uid'],)).fetchone()
    return row['role_code'] if row else None


def dto(row):
    snap=row['snapshot'] or {}
    return {'id':str(row['id']),'studentId':row['student_alias'],'professorId':row['professor_alias'],
            'professorName':snap.get('professorName',row['professor_name']),
            'assignedAt':row['assigned_on'].isoformat(),'status':'active' if row['released_at'] is None else 'released',
            'by':row['by_alias'],'snapshot':{k:snap.get(k) for k in ('studentNo','name','major','grade','status')},
            'releasedAt':row['released_at'].isoformat() if row['released_at'] else None}


SELECT='''SELECT a.*,sp.alias student_alias,pp.alias professor_alias,pp.name professor_name,bp.alias by_alias
FROM dc.advisor_assignment a JOIN dc.person sp ON sp.intg_uid=a.student_uid
JOIN dc.person pp ON pp.intg_uid=a.professor_uid JOIN dc.person bp ON bp.intg_uid=a.assigned_by_uid'''


@router.get('')
def assignments(professorId:str|None=None,studentId:str|None=None,active:bool=True,
                page:int=Query(1,ge=1),pageSize:int=Query(50,ge=1,le=100),
                user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    role=staff_role(conn,user); where=[]; values=[]
    if role=='professor': professorId=user['intg_uid']
    if professorId:
        where.append('(pp.alias=%s OR a.professor_uid=%s)'); values += [professorId,professorId]
    if studentId:
        where.append('(sp.alias=%s OR a.student_uid=%s)'); values += [studentId,studentId]
    if active: where.append('a.released_at IS NULL')
    where.append('EXISTS(SELECT 1 FROM dc.staff_student_scope x WHERE x.staff_uid=%s AND x.student_uid=a.student_uid)')
    values.append(user['intg_uid']); condition=' AND '.join(where)
    count=conn.execute(f'SELECT count(*) n FROM ({SELECT}) q WHERE {condition.replace("a.","q.").replace("pp.alias","q.professor_alias").replace("sp.alias","q.student_alias")}',values).fetchone()['n']
    rows=conn.execute(SELECT+f' WHERE {condition} ORDER BY a.assigned_on DESC,a.id LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    return {'items':[dto(x) for x in rows],'totalCount':count,'page':page,'pageSize':pageSize}


@router.get('/roster')
def advisor_roster(request:Request,tab:str='all',professorId:str|None=None,year:int|None=None,
                   page:int=Query(1,ge=1),pageSize:int=Query(20,ge=1,le=100),
                   user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    role=staff_role(conn,user)
    if role=='professor': professorId=user['intg_uid']
    where,values=scope(request,user)
    join='''LEFT JOIN dc.advisor_assignment a ON a.student_uid=v.intg_uid AND a.released_at IS NULL
      LEFT JOIN dc.person pp ON pp.intg_uid=a.professor_uid'''
    if professorId: where.append('(pp.alias=%s OR a.professor_uid=%s)'); values += [professorId,professorId]
    if tab=='assigned': where.append('a.id IS NOT NULL')
    elif tab=='unassigned': where.append('a.id IS NULL')
    elif tab!='all': fail(400,'INVALID_TAB','지원하지 않는 탭입니다.')
    if year: where.append('extract(year from a.assigned_on)=%s'); values.append(year)
    condition=' AND '.join(f'({x})' for x in where)
    count=conn.execute(f'SELECT count(*) n FROM dc.student_list v {join} WHERE {condition}',values).fetchone()['n']
    rows=conn.execute(f'''SELECT v.*,a.assigned_on,pp.alias professor_alias,pp.name professor_name
      FROM dc.student_list v {join} WHERE {condition}
      ORDER BY (a.id IS NOT NULL) DESC,a.assigned_on DESC NULLS LAST,v.student_no LIMIT %s OFFSET %s''',values+[pageSize,(page-1)*pageSize]).fetchall()
    items=[]
    for row in rows:
        item=roster(row); item['advisor']=({'professorId':row['professor_alias'],'professorName':row['professor_name'],
          'assignedAt':row['assigned_on'].isoformat()} if row['assigned_on'] else None); items.append(item)
    return {'items':items,'totalCount':count,'page':page,'pageSize':pageSize}


@router.get('/summary')
def advisor_summary(request:Request,professorId:str|None=None,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    role=staff_role(conn,user)
    if role=='professor': professorId=user['intg_uid']
    where,values=scope(request,user)
    join='LEFT JOIN dc.advisor_assignment a ON a.student_uid=v.intg_uid AND a.released_at IS NULL LEFT JOIN dc.person pp ON pp.intg_uid=a.professor_uid'
    if professorId: where.append('(pp.alias=%s OR a.professor_uid=%s)'); values += [professorId,professorId]
    condition=' AND '.join(f'({x})' for x in where)
    row=conn.execute(f'''SELECT count(*) "all",count(a.id) assigned,count(*)-count(a.id) unassigned,
      array_agg(DISTINCT extract(year from a.assigned_on)::text) FILTER(WHERE a.id IS NOT NULL) years
      FROM dc.student_list v {join} WHERE {condition}''',values).fetchone()
    professors=conn.execute(f'''SELECT pp.alias id,pp.name,count(*) count FROM dc.student_list v {join}
      WHERE {condition} AND a.id IS NOT NULL GROUP BY pp.alias,pp.name ORDER BY pp.name''',values).fetchall()
    return {'all':row['all'],'assigned':row['assigned'],'unassigned':row['unassigned'],
            'years':sorted(row['years'] or [],reverse=True),'professors':[dict(x) for x in professors]}


class AssignBody(BaseModel):
    studentId:str
    professorId:str
    assignedAt:date


@router.post('',status_code=201)
def assign(body:AssignBody,idempotency_key:str=Header(alias='Idempotency-Key',min_length=1,max_length=200),
           user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if staff_role(conn,user)!='assistant': fail(403,'OUT_OF_SCOPE','조교만 배정할 수 있습니다.')
    student=conn.execute('''SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE p.alias=%s OR s.intg_uid=%s''',(body.studentId,body.studentId)).fetchone()
    if not student or not conn.execute('SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',(user['intg_uid'],student['intg_uid'])).fetchone():
        fail(403,'OUT_OF_SCOPE','담당 학과 학생만 배정할 수 있습니다.')
    professor=conn.execute('''SELECT s.intg_uid,p.alias,p.name FROM dc.staff s JOIN dc.person p USING(intg_uid)
      WHERE (p.alias=%s OR s.intg_uid=%s) AND s.role_code='professor' ''',(body.professorId,body.professorId)).fetchone()
    if not professor or not conn.execute('''SELECT 1 FROM dc.org_assignment WHERE staff_uid=%s AND role_code='professor'
      AND (college_code,dept_code)=(%s,%s) AND is_active AND valid_from<=CURRENT_DATE AND (valid_to IS NULL OR valid_to>=CURRENT_DATE)''',
      (professor['intg_uid'],student['college_code'],student['dept_code'])).fetchone():
        fail(422,'PROFESSOR_DEPT_MISMATCH','학생 학과의 교수만 배정할 수 있습니다.')
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended('advisor:'||%s,0))",(student['intg_uid'],))
    existing=conn.execute("SELECT a.*,sp.alias student_alias,pp.alias professor_alias,pp.name professor_name,bp.alias by_alias FROM dc.advisor_assignment a JOIN dc.person sp ON sp.intg_uid=a.student_uid JOIN dc.person pp ON pp.intg_uid=a.professor_uid JOIN dc.person bp ON bp.intg_uid=a.assigned_by_uid WHERE a.id=md5('advisor-request:'||%s)::uuid",(idempotency_key,)).fetchone()
    if existing: return dto(existing)
    snapshot={'studentNo':student['student_no'],'name':student['name'],'major':student['major_label'],
              'grade':student['grade'],'status':(student['detail'] or {}).get('enrollmentStatus','재학'),'professorName':professor['name']}
    try:
        row=conn.execute('''INSERT INTO dc.advisor_assignment(id,student_uid,professor_uid,assigned_by_uid,assigned_on,snapshot)
          VALUES(md5('advisor-request:'||%s)::uuid,%s,%s,%s,%s,%s) RETURNING *''',
          (idempotency_key,student['intg_uid'],professor['intg_uid'],user['intg_uid'],body.assignedAt,snapshot)).fetchone()
    except UniqueViolation: fail(409,'ALREADY_ASSIGNED','이미 전담교수가 배정된 학생입니다.')
    return dto({**row,'student_alias':student['alias'],'professor_alias':professor['alias'],'professor_name':professor['name'],'by_alias':user['alias']})


class ReleaseBody(BaseModel):
    reason:str|None=Field(default=None,max_length=500)


@router.post('/{assignment_id}/release')
def release(assignment_id:UUID,body:ReleaseBody,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if staff_role(conn,user)!='assistant': fail(403,'OUT_OF_SCOPE','조교만 해제할 수 있습니다.')
    current=conn.execute('SELECT * FROM dc.advisor_assignment WHERE id=%s',(assignment_id,)).fetchone()
    if not current: fail(404,'NOT_FOUND','배정을 찾을 수 없습니다.')
    if not conn.execute('SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',(user['intg_uid'],current['student_uid'])).fetchone():
        fail(403,'OUT_OF_SCOPE','담당 학과 학생만 해제할 수 있습니다.')
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended('advisor:'||%s,0))",(current['student_uid'],))
    row=conn.execute('''UPDATE dc.advisor_assignment SET released_at=now(),released_by_uid=%s,release_reason=%s
      WHERE id=%s AND released_at IS NULL RETURNING *''',(user['intg_uid'],body.reason,assignment_id)).fetchone()
    if not row: fail(409,'ALREADY_RELEASED','이미 해제된 배정입니다.')
    return {'id':str(row['id']),'releasedAt':row['released_at'].isoformat()}
