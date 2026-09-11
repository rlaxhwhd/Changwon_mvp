"""Organization directory and staff profiles backed by PostgreSQL."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from .auth import principal, require_staff
from .counsel_operations import audit, staff_row
from .db import connection

router = APIRouter()


@router.get('/departments')
def departments(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    rows = conn.execute('''SELECT college_code,dept_code,college_name,dept_name,course
      FROM dc.department ORDER BY college_code,dept_code''').fetchall()
    return [dict(collegeCode=r['college_code'], deptCode=r['dept_code'], collegeName=r['college_name'],
                 deptName=r['dept_name'], course=r['course']) for r in rows]


def public_professors(conn):
    rows = conn.execute('''WITH active_org AS (
      SELECT DISTINCT a.staff_uid,d.college_name,d.dept_name FROM dc.org_assignment a
      JOIN dc.department d USING(college_code,dept_code)
      WHERE a.role_code='professor' AND a.is_active AND a.valid_from<=CURRENT_DATE
        AND (a.valid_to IS NULL OR a.valid_to>=CURRENT_DATE)
    )
      SELECT s.intg_uid,p.alias,p.name,s.profile,
      COALESCE(o.college_name,s.profile->>'collegeName') AS college_name,
      COALESCE(o.dept_name,s.profile->>'dept') AS dept_name
      FROM dc.staff s JOIN dc.person p USING(intg_uid)
      LEFT JOIN active_org o ON o.staff_uid=s.intg_uid WHERE s.role_code='professor'
      ORDER BY college_name,dept_name,p.alias''').fetchall()
    grouped = {}
    for row in rows:
        college = row['college_name'] or ''
        dept = row['dept_name'] or row['profile'].get('major', '')
        group = grouped.setdefault(college, {'name': college, 'divisions': {}})
        profile = row['profile']
        group['divisions'].setdefault(dept, []).append(dict(
            id=row['alias'], name=row['name'], title=profile.get('title', ''),
            major=profile.get('major', dept), room=profile.get('room', ''),
            accept=profile.get('counselAccept', True)))
    return list(grouped.values())


@router.get('/staff')
def staff_list(role: Literal['professor', 'assistant', 'career', 'psych'], groupBy: str | None = Query(default=None),
               user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if role == 'professor' and groupBy == 'college':
        return public_professors(conn)
    if role == 'professor':
        groups = public_professors(conn)
        return [{**professor, 'role': 'professor', 'roleLabel': '교수', 'dept': professor['major']}
                for group in groups for professors in group['divisions'].values() for professor in professors]
    if groupBy is not None:
        raise HTTPException(400, detail={'code': 'INVALID_STAFF_QUERY', 'message': '지원하지 않는 교직원 조회입니다.'})
    require_staff(user)
    rows = conn.execute('''SELECT s.role_code,s.profile,s.version,p.alias,p.name FROM dc.staff s
      JOIN dc.person p USING(intg_uid) WHERE s.role_code=%s ORDER BY p.alias''', (role,)).fetchall()
    result = []
    for row in rows:
        profile = row['profile']
        item = {key: profile[key] for key in ('roleLabel','dept','collegeName','departments','email','officeHours') if key in profile}
        item.update(id=row['alias'], name=row['name'], role=row['role_code'], version=row['version'])
        result.append(item)
    return result


def staff_detail(conn, row):
    profile = row['profile']
    assignments = conn.execute('''SELECT a.*,d.college_name,d.dept_name FROM dc.org_assignment a
      JOIN dc.department d USING(college_code,dept_code) WHERE a.staff_uid=%s
      ORDER BY a.valid_from DESC,a.id''', (row['intg_uid'],)).fetchall()
    item = {**profile, 'id': row['alias'], 'name': row['name'], 'role': row['role_code'], 'version': row['version']}
    item['orgAssignments'] = [dict(id=str(a['id']), collegeCode=a['college_code'], deptCode=a['dept_code'],
        collegeName=a['college_name'], deptName=a['dept_name'], roleCode=a['role_code'], validFrom=a['valid_from'],
        validTo=a['valid_to'], isActive=a['is_active']) for a in assignments]
    item['counselProfile'] = dict(accept=profile.get('counselAccept', True),
                                  officeHours=profile.get('officeHours', ''), intro=profile.get('intro', ''))
    return item


@router.get('/staff/{identity}')
def staff_detail_route(identity: str, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    row = staff_row(conn, user, identity)
    return staff_detail(conn, row)


class ProfessorProfileUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=1)
    accept: bool
    officeHours: str = Field(default='', max_length=500)
    intro: str = Field(default='', max_length=2000)


@router.put('/staff/{identity}/profile')
def save_professor_profile(identity: str, body: ProfessorProfileUpdate,
                           user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    row = staff_row(conn, user, identity, True)
    if row['role_code'] != 'professor':
        raise HTTPException(403, '교수 전용 설정입니다.')
    patch = {'counselAccept': body.accept, 'officeHours': body.officeHours, 'intro': body.intro}
    changed = conn.execute('''UPDATE dc.staff SET profile=profile||%s,version=version+1
      WHERE intg_uid=%s AND version=%s RETURNING version''',
      (Jsonb(patch), row['intg_uid'], body.expectedVersion)).fetchone()
    if not changed:
        raise HTTPException(409, detail={'code': 'VERSION_CONFLICT', 'message': '프로필이 변경되었습니다. 새로 조회해 주세요.'})
    audit(conn, user, 'PROFILE', row['intg_uid'], 'UPDATE', row['profile'], jsonable_encoder(patch))
    return {'version': changed['version']}
