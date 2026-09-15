"""Administrator-only department / major staff assignment management."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from .administration import administrator, audit
from .db import connection

router = APIRouter(prefix='/system/department-assignments')
Role = Literal['assistant', 'professor']

CANDIDATES = '''SELECT * FROM dc.department_staff_candidates
 UNION ALL SELECT s.intg_uid,p.name,COALESCE(s.profile->>'empNo',s.intg_uid),s.role_code,
 s.profile->>'mobile',s.profile->>'phone',s.profile->>'dept',true
 FROM dc.staff s JOIN dc.person p USING(intg_uid)
 WHERE s.role_code IN ('assistant','professor') AND NOT EXISTS (
 SELECT 1 FROM dc.department_staff_candidates c WHERE c.staff_uid=s.intg_uid)'''

TARGETS = '''SELECT * FROM dc.department_assignment_targets
 UNION SELECT * FROM dc.department_assignment_whole_targets
 UNION SELECT d.college_code,d.college_name,d.dept_code,d.dept_name,''::text,NULL::text
 FROM dc.department d WHERE EXISTS (SELECT 1 FROM dc.department_staff_assignment a
 WHERE (a.college_code,a.dept_code)=(d.college_code,d.dept_code) AND a.major_code='' AND a.is_active)'''

ACTIVE_PROFESSOR_ORGS = f'''SELECT DISTINCT a.staff_uid,d.college_name,d.dept_name
 FROM dc.org_assignment a JOIN dc.department d USING(college_code,dept_code)
 WHERE a.role_code='professor' AND a.is_active AND a.valid_from<=CURRENT_DATE
 AND (a.valid_to IS NULL OR a.valid_to>=CURRENT_DATE)
 UNION SELECT DISTINCT a.staff_uid,t.college_name,t.dept_name
 FROM dc.department_staff_assignment a JOIN ({TARGETS}) t USING(college_code,dept_code,major_code)
 WHERE a.role_code='professor' AND a.is_active AND a.legacy_id IS NULL
 AND NOT EXISTS(SELECT 1 FROM dc.department_staff_candidates c WHERE c.staff_uid=a.staff_uid AND NOT c.is_active)'''


def pattern(q):
    return '%' + q.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'


@router.get('/candidates')
def candidates(role: Role, q: str = Query('', max_length=100), page: int = Query(1, ge=1),
               pageSize: int = Query(20, ge=1, le=100),
               user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    result = conn.execute(f'''WITH filtered AS MATERIALIZED (SELECT * FROM ({CANDIDATES}) c
      WHERE role_code=%s AND is_active AND concat_ws(' ',name,employee_no) ILIKE %s),
      paged AS (SELECT * FROM filtered ORDER BY name,employee_no,staff_uid LIMIT %s OFFSET %s)
      SELECT (SELECT count(*) FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(to_jsonb(paged)) FROM paged),'[]') AS items''',
      (role, pattern(q), pageSize, (page-1)*pageSize)).fetchone()
    return dict(items=result['items'], totalCount=result['total'], page=page, pageSize=pageSize)


@router.get('')
def listing(role: Role, q: str = Query('', max_length=100), college: str = Query('', max_length=40),
            page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
            user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    result = conn.execute(f'''WITH targets AS ({TARGETS}), filtered AS MATERIALIZED (
      SELECT t.* FROM targets t WHERE (%s='' OR college_code=%s)
      AND concat_ws(' ',college_name,dept_name,major_name,dept_code,major_code) ILIKE %s
    ), paged AS (SELECT * FROM filtered ORDER BY college_code,dept_code,major_code LIMIT %s OFFSET %s)
    SELECT (SELECT count(*) FROM filtered) AS total,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM paged p),'[]') AS items,
    COALESCE((SELECT jsonb_agg(c) FROM (SELECT DISTINCT college_code,college_name FROM targets ORDER BY college_name,college_code) c),'[]') AS colleges''',
    (college, college, pattern(q), pageSize, (page-1)*pageSize)).fetchone()
    rows = result['items']
    if rows:
        assignments = conn.execute(f'''SELECT a.*,COALESCE(c.name,a.snapshot->>'name',a.staff_uid) AS name,
          COALESCE(c.employee_no,a.snapshot->>'employee_no',a.staff_uid) AS employee_no,
          COALESCE(c.mobile,a.snapshot->>'mobile') AS mobile,COALESCE(c.phone,a.snapshot->>'phone') AS phone
          FROM dc.department_staff_assignment a LEFT JOIN ({CANDIDATES}) c ON c.staff_uid=a.staff_uid
          LEFT JOIN dc.org_assignment legacy ON legacy.id=a.legacy_id
          WHERE a.role_code=%s AND a.is_active AND a.dept_code=ANY(%s)
          AND (a.legacy_id IS NULL OR (legacy.is_active AND legacy.valid_from<=CURRENT_DATE
            AND (legacy.valid_to IS NULL OR legacy.valid_to>=CURRENT_DATE)))
          ORDER BY name,a.staff_uid,a.id''', (role, list({r['dept_code'] for r in rows}))).fetchall()
        for row in rows:
            row['assignments'] = [a for a in assignments if all(a[k] == row[k] for k in ('college_code','dept_code','major_code'))]
    return dict(items=rows, totalCount=result['total'], colleges=result['colleges'], page=page, pageSize=pageSize)


class Assignment(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    role: Role
    collegeCode: str = Field(min_length=1, max_length=40)
    deptCode: str = Field(min_length=1, max_length=40)
    majorCode: str = Field(default='', max_length=40)
    staffUid: str = Field(min_length=1, max_length=100)


@router.post('', status_code=201)
def assign(body: Assignment, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", ('department-staff:'+body.staffUid,))
    person = conn.execute(f'SELECT * FROM ({CANDIDATES}) c WHERE staff_uid=%s AND role_code=%s AND is_active',
                          (body.staffUid, body.role)).fetchone()
    if not person:
        raise HTTPException(422, '해당 역할의 재직 인원을 선택해 주세요.')
    target = conn.execute(f'SELECT 1 FROM ({TARGETS}) t WHERE college_code=%s AND dept_code=%s AND major_code=%s',
                         (body.collegeCode,body.deptCode,body.majorCode)).fetchone()
    if not target:
        raise HTTPException(422, '사용 중인 학과·전공을 선택해 주세요.')
    row = conn.execute('''INSERT INTO dc.department_staff_assignment(college_code,dept_code,major_code,staff_uid,role_code,snapshot,updated_by)
      VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING RETURNING *''',
      (body.collegeCode,body.deptCode,body.majorCode,body.staffUid,body.role,Jsonb(dict(person)),user['intg_uid'])).fetchone()
    if not row:
        raise HTTPException(409, '이미 이 학과·전공에 배정된 인원입니다.')
    audit(conn,user,'department_staff_assignment',row['id'],None,row,'학과 담당 등록')
    return row


class Release(BaseModel):
    expectedVersion: int = Field(ge=1)


@router.post('/{assignment_id}/release')
def release(assignment_id: UUID, body: Release, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    before = conn.execute('SELECT * FROM dc.department_staff_assignment WHERE id=%s FOR UPDATE', (assignment_id,)).fetchone()
    if not before:
        raise HTTPException(404, '배정을 찾을 수 없습니다.')
    if before['version'] != body.expectedVersion or not before['is_active']:
        raise HTTPException(409, '배정이 변경되었습니다. 새로 조회해 주세요.')
    after = conn.execute('''UPDATE dc.department_staff_assignment SET is_active=false,version=version+1,
      updated_at=now(),updated_by=%s WHERE id=%s RETURNING *''', (user['intg_uid'],assignment_id)).fetchone()
    if before['legacy_id']:
        legacy = conn.execute('SELECT * FROM dc.org_assignment WHERE id=%s FOR UPDATE', (before['legacy_id'],)).fetchone()
        changed = conn.execute('''UPDATE dc.org_assignment SET is_active=false,version=version+1,updated_at=now(),updated_by=%s
          WHERE id=%s RETURNING *''', (user['intg_uid'],before['legacy_id'])).fetchone()
        audit(conn,user,'org_assignment',before['legacy_id'],legacy,changed,'학과 담당 해제')
    audit(conn,user,'department_staff_assignment',assignment_id,before,after,'학과 담당 해제')
    return after
