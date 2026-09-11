from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .auth import principal, student_access
from .db import connection

router = APIRouter()


@router.get('/academic/{identity}')
def academic(identity: str, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student = student_access(conn, user, identity)
    uid = student['intg_uid']
    if not student['entry_year']:
        raise HTTPException(404, '학사 데이터가 없습니다.')
    def rows(query, params=()):
        return conn.execute(query, params).fetchall()
    return dict(
        studentId=student['alias'], deptCode=student['dept_code'], entryYear=student['entry_year'],
        skills=rows('SELECT skill_id AS "skillId",label,category,icon FROM dc.skill ORDER BY skill_id'),
        subjects=rows('SELECT curi_num AS "curiNum",curi_nm AS "curiNm",cdt_num AS "cdtNum",open_dept_cd AS "openDeptCd",grad_div AS "gradDiv",active FROM dc.subject ORDER BY curi_num'),
        curriculum=rows('SELECT id,dept_code AS "deptCode",curri_year AS "curriYear",curi_num AS "curiNum",course_cls AS "courseCls",rec_grade AS "recGrade",rec_smt AS "recSmt",required FROM dc.curriculum ORDER BY id'),
        courseSkills=rows('SELECT curi_num AS "curiNum",skill_id AS "skillId",weight,source FROM dc.course_skill ORDER BY curi_num,skill_id'),
        certs=rows('SELECT c.cert_id AS "certId",label,issuer,kind,icon,active,COALESCE((SELECT jsonb_agg(skill_id ORDER BY skill_id) FROM dc.cert_skill cs WHERE cs.cert_id=c.cert_id),\'[]\') AS "skillIds" FROM dc.cert c ORDER BY c.cert_id'),
        jobRoles=rows('SELECT j.job_id AS "jobId",label,category,icon,summary,what_to_do AS "whatToDo",target_orgs AS "targetOrgs",COALESCE((SELECT jsonb_agg(jsonb_build_object(\'skillId\',skill_id,\'weight\',weight,\'required\',required) ORDER BY skill_id) FROM dc.job_skill s WHERE s.job_id=j.job_id),\'[]\') AS skills FROM dc.job_role j ORDER BY j.job_id'),
        departments=rows('SELECT dept_code AS "deptCode",dept_name AS "deptName" FROM dc.department ORDER BY college_code,dept_code'),
        enrollments=rows('SELECT %s AS "studentId",year,smt,curi_num AS "curiNum",course_cls AS "courseCls",grade,gpa,finish_yn AS "finishYn",chk_recuri AS "chkRecuri" FROM dc.student_course WHERE intg_uid=%s ORDER BY year,smt,curi_num',(student['alias'],uid)),
        jobInterests=rows('SELECT job_id AS "jobId",added FROM dc.student_job_interest WHERE intg_uid=%s ORDER BY pinned DESC,added,created_at,job_id',(uid,)),
        studentCerts=rows('SELECT cert_id AS "certId",acquired_dt AS "acquiredDt",added FROM dc.student_cert WHERE intg_uid=%s ORDER BY added,cert_id',(uid,)),
        programRecords=rows('SELECT program_id AS "programId",title,applied_at AS "appliedAt",completed FROM dc.student_program_history WHERE intg_uid=%s ORDER BY applied_at,program_id',(uid,)),
    )


class Selection(BaseModel):
    on: bool


@router.put('/students/{identity}/job-interests/{job_id}')
def job_interest(identity: str, job_id: str, body: Selection, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student = student_access(conn,user,identity)
    if user['intg_uid']!=student['intg_uid']:
        raise HTTPException(403, '학생 본인만 변경할 수 있습니다.')
    if not conn.execute('SELECT 1 FROM dc.job_role WHERE job_id=%s',(job_id,)).fetchone():
        raise HTTPException(404,'직무를 찾을 수 없습니다.')
    if body.on:
        conn.execute('INSERT INTO dc.student_job_interest(intg_uid,job_id) VALUES (%s,%s) ON CONFLICT DO NOTHING',(student['intg_uid'],job_id))
    else:
        conn.execute('DELETE FROM dc.student_job_interest WHERE intg_uid=%s AND job_id=%s AND added',(student['intg_uid'],job_id))
    return {'saved':True}


@router.put('/students/{identity}/certs/{cert_id}')
def student_cert(identity: str, cert_id: str, body: Selection, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student = student_access(conn,user,identity)
    if user['intg_uid']!=student['intg_uid']:
        raise HTTPException(403, '학생 본인만 변경할 수 있습니다.')
    if not conn.execute('SELECT 1 FROM dc.cert WHERE cert_id=%s',(cert_id,)).fetchone():
        raise HTTPException(404,'자격증을 찾을 수 없습니다.')
    if body.on:
        conn.execute('INSERT INTO dc.student_cert(intg_uid,cert_id) VALUES (%s,%s) ON CONFLICT DO NOTHING',(student['intg_uid'],cert_id))
    else:
        conn.execute('DELETE FROM dc.student_cert WHERE intg_uid=%s AND cert_id=%s AND added',(student['intg_uid'],cert_id))
    return {'saved':True}
