"""Audited operational configuration. Menu visibility never grants data access."""
import json
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .auth import principal
from .db import connection

router = APIRouter()


def administrator(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    allowed = conn.execute('''SELECT 1 FROM dc.auth_user u JOIN dc.auth_role r USING(role_code)
      WHERE u.person_uid=%s AND r.role_code='AUTH0006' AND r.is_active
      AND u.valid_from<=now() AND (u.valid_to IS NULL OR u.valid_to>now())''', (user['intg_uid'],)).fetchone()
    if not allowed:
        raise HTTPException(403, '시스템관리자 권한이 필요합니다.')
    return user


def page_result(conn, table, where, values, page, size, order):
    # Table/where/order are internal constants, never request-provided SQL.
    total = conn.execute(f'SELECT count(*) AS n FROM {table} WHERE {where}', values).fetchone()['n']
    rows = conn.execute(f'SELECT * FROM {table} WHERE {where} ORDER BY {order} LIMIT %s OFFSET %s',
                        [*values, size, (page-1)*size]).fetchall()
    return dict(items=rows, totalCount=total, page=page, pageSize=size)


class Change(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=0)
    reason: str = Field(min_length=1, max_length=1000)


class CodeChange(Change):
    label: str = Field(min_length=1, max_length=200)
    sortOrder: int = Field(ge=0, le=100000)
    isActive: bool = True
    payload: dict = Field(default_factory=dict)


@router.get('/system/code-groups')
def groups(user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    return conn.execute('SELECT * FROM dc.code_group ORDER BY sort_order,group_code').fetchall()


@router.get('/system/code-groups/{group}/items')
def items(group: str, page: int=Query(1, ge=1), pageSize: int=Query(20, ge=1, le=100),
          user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    return page_result(conn,'dc.code_item','group_code=%s',[group],page,pageSize,'sort_order,code')


@router.put('/system/code-groups/{group}/items/{code}')
def save_item(group: str, code: str, data: CodeChange,
              user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    # Serialize the group's edits, including insertion of previously absent keys.
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('code-group:'+group,))
    definition = conn.execute('SELECT * FROM dc.code_group WHERE group_code=%s', (group,)).fetchone()
    if not definition:
        raise HTTPException(404, '코드 그룹을 찾을 수 없습니다.')
    if definition['managed_by']=='STRUCTURAL':
        raise HTTPException(403, '구조 코드는 조회만 가능합니다.')
    before = conn.execute('SELECT * FROM dc.code_item WHERE group_code=%s AND code=%s FOR UPDATE', (group,code)).fetchone()
    if (before['version'] if before else 0) != data.expectedVersion:
        raise HTTPException(409, '다른 관리자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    if definition['fixed_codes'] and (not before or not data.isActive):
        raise HTTPException(422, '이 그룹은 기존 코드의 표시명과 정렬만 수정할 수 있습니다.')
    if not code or len(code)>64 or any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_' for c in code):
        raise HTTPException(422, '코드는 영문 대문자·숫자·밑줄로 입력하세요.')
    if group=='COUNSEL_TOPIC':
        if set(data.payload)-{'type','goal'} or data.payload.get('type') not in ('T1','T2','T3','T4','T5','T6'):
            raise HTTPException(422, '상담 주제에는 유효한 학생 유형과 목표만 설정할 수 있습니다.')
        if not isinstance(data.payload.get('goal',''),str) or len(data.payload.get('goal',''))>2000:
            raise HTTPException(422, '상담 목표를 확인하세요.')
    elif group=='QUEST_SEMESTER':
        try:
            start = date.fromisoformat(data.payload['startDate'])
            end = date.fromisoformat(data.payload['endDate'])
            if (set(data.payload) != {'startDate','endDate'} or start > end
                    or data.payload['startDate'] != start.isoformat() or data.payload['endDate'] != end.isoformat()):
                raise ValueError()
        except (KeyError,TypeError,ValueError):
            raise HTTPException(422, '학기 시작일과 종료일을 YYYY-MM-DD 형식으로 입력하세요.')
        if data.isActive and conn.execute('''SELECT 1 FROM dc.code_item WHERE group_code=%s
          AND code<>%s AND is_active AND payload->>'startDate'<=%s AND payload->>'endDate'>=%s''',
          (group,code,end.isoformat(),start.isoformat())).fetchone():
            raise HTTPException(422, '사용 중인 다른 학기와 운영 기간이 겹칩니다.')
    elif group=='QUEST_XP_REWARD':
        xp = data.payload.get('xp')
        if (not before or set(data.payload) != {'xp','quota','cyclesPerSemester'}
                or type(xp) is not int or not 0 <= xp <= 100000
                or any(data.payload.get(key) != before['payload'].get(key) for key in ('quota','cyclesPerSemester'))):
            raise HTTPException(422, 'XP는 0~100,000 사이 정수로 입력하세요. 퀘스트 개수와 운영 횟수는 변경할 수 없습니다.')
    elif group in ('GROWTH_SKILL_OPTION','GROWTH_CERT_OPTION','GROWTH_LANGUAGE_OPTION','GROWTH_ACTIVITY_EXAMPLE'):
        field = {'GROWTH_SKILL_OPTION':'categoryCode','GROWTH_CERT_OPTION':'category',
                 'GROWTH_LANGUAGE_OPTION':'language','GROWTH_ACTIVITY_EXAMPLE':'categoryCode'}[group]
        value = data.payload.get(field)
        if set(data.payload) != {field} or not isinstance(value,str) or not value.strip() or len(value)>100:
            raise HTTPException(422, '후보의 분류 또는 언어를 입력해 주세요.')
        parent = {'GROWTH_SKILL_OPTION':'GROWTH_SKILL_CATEGORY','GROWTH_ACTIVITY_EXAMPLE':'GROWTH_RECORD_CATEGORY'}.get(group)
        if parent and data.isActive and not conn.execute(
                'SELECT 1 FROM dc.code_item WHERE group_code=%s AND code=%s AND is_active', (parent,value)).fetchone():
            raise HTTPException(422, '사용 중인 분류를 선택해 주세요.')
    elif data.payload != (before['payload'] if before else {}):
        raise HTTPException(422, '이 그룹의 프로세스 속성은 배포로 관리합니다.')
    if len(json.dumps(data.payload,ensure_ascii=False))>10000:
        raise HTTPException(422, '부가속성이 너무 큽니다.')
    after=conn.execute('''INSERT INTO dc.code_item(group_code,code,label,sort_order,is_active,payload,updated_by)
      VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(group_code,code) DO UPDATE SET
      label=excluded.label,sort_order=excluded.sort_order,is_active=excluded.is_active,payload=excluded.payload,
      updated_by=excluded.updated_by,updated_at=now(),version=dc.code_item.version+1 RETURNING *''',
      (group,code,data.label,data.sortOrder,data.isActive,Jsonb(data.payload),user['intg_uid'])).fetchone()
    action='CREATE' if not before else ('UPDATE' if before['is_active']==data.isActive else ('REACTIVATE' if data.isActive else 'DEACTIVATE'))
    conn.execute('''INSERT INTO dc.code_item_event(group_code,code,action,before,after,reason,changed_by)
      VALUES(%s,%s,%s,%s,%s,%s,%s)''',
      (group,code,action,Jsonb(jsonable_encoder(before)),Jsonb(jsonable_encoder(after)),data.reason,user['intg_uid']))
    return after


@router.get('/system/code-groups/{group}/items/{code}/events')
def code_events(group: str,code: str,page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),
                user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    return page_result(conn,'dc.code_item_event','group_code=%s AND code=%s',[group,code],page,pageSize,'changed_at DESC,id DESC')


@router.get('/system/organizations')
def organizations(page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),q: str=Query('',max_length=100),
                  user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    return page_result(conn,'dc.department',"concat_ws(' ',college_code,dept_code,college_name,dept_name) ILIKE %s",
                       ['%'+q+'%'],page,pageSize,'college_code,dept_code')


@router.get('/system/staff')
def staff(page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),q: str=Query('',max_length=100),
          user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    return page_result(conn,'(SELECT s.intg_uid,s.role_code,p.alias,p.name FROM dc.staff s JOIN dc.person p USING(intg_uid)) v',
                       "concat_ws(' ',intg_uid,name) ILIKE %s",['%'+q+'%'],page,pageSize,'name,intg_uid')


@router.get('/system/org-assignments')
def assignments(page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),
                user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    return page_result(conn,'dc.org_assignment','true',[],page,pageSize,'updated_at DESC,id')


class AssignmentChange(Change):
    staffUid: str
    collegeCode: str
    deptCode: str
    roleCode: str
    validFrom: date
    validTo: date | None=None
    isActive: bool=True

    @model_validator(mode='after')
    def valid_period(self):
        if self.validTo and self.validTo<self.validFrom:
            raise ValueError('종료일은 시작일 이후여야 합니다.')
        return self


def audit(conn,user,entity,key,before,after,reason):
    conn.execute('''INSERT INTO dc.admin_event(entity,entity_id,before_value,after_value,reason,changed_by)
      VALUES(%s,%s,%s,%s,%s,%s)''',(entity,str(key),Jsonb(jsonable_encoder(before)),Jsonb(jsonable_encoder(after)),reason,user['intg_uid']))


@router.put('/system/org-assignments/{assignment_id}')
def save_assignment(assignment_id: UUID,data: AssignmentChange,
                    user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    staff=conn.execute('SELECT * FROM dc.staff WHERE intg_uid=%s FOR UPDATE',(data.staffUid,)).fetchone()
    expected={'assistant':'assistant','professor':'professor','career':'counselor','psych':'counselor'}
    if not staff or expected.get(staff['role_code'])!=data.roleCode:
        raise HTTPException(422,'교직원의 실제 역할과 배정 역할이 일치해야 합니다.')
    if not conn.execute('SELECT 1 FROM dc.department WHERE college_code=%s AND dept_code=%s',(data.collegeCode,data.deptCode)).fetchone():
        raise HTTPException(422,'학사 조직의 단대·학과 코드 쌍을 선택하세요.')
    before=conn.execute('SELECT * FROM dc.org_assignment WHERE id=%s FOR UPDATE',(assignment_id,)).fetchone()
    if (before['version'] if before else 0)!=data.expectedVersion:
        raise HTTPException(409,'배정이 변경되었습니다. 새로 조회하세요.')
    if before and (before['staff_uid'],before['college_code'],before['dept_code'],before['role_code'],before['valid_from'])!=(data.staffUid,data.collegeCode,data.deptCode,data.roleCode,data.validFrom):
        raise HTTPException(422,'배정 대상·시작일은 변경할 수 없습니다. 기존 배정을 종료하고 새 배정을 등록하세요.')
    if data.isActive and conn.execute('''SELECT 1 FROM dc.org_assignment WHERE staff_uid=%s AND college_code=%s AND dept_code=%s
      AND role_code=%s AND id<>%s AND is_active AND daterange(valid_from,valid_to,'[]') && daterange(%s,%s,'[]')''',
      (data.staffUid,data.collegeCode,data.deptCode,data.roleCode,assignment_id,data.validFrom,data.validTo)).fetchone():
        raise HTTPException(409,'같은 담당자의 배정 기간이 겹칩니다.')
    try:
        after=conn.execute('''INSERT INTO dc.org_assignment(id,staff_uid,college_code,dept_code,role_code,valid_from,valid_to,is_active,updated_by)
          VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET valid_to=excluded.valid_to,
          is_active=excluded.is_active,version=dc.org_assignment.version+1,updated_at=now(),updated_by=excluded.updated_by RETURNING *''',
          (assignment_id,data.staffUid,data.collegeCode,data.deptCode,data.roleCode,data.validFrom,data.validTo,data.isActive,user['intg_uid'])).fetchone()
    except UniqueViolation:
        raise HTTPException(409,'동일한 배정이 이미 존재합니다.')
    audit(conn,user,'org_assignment',assignment_id,before,after,data.reason)
    return after


@router.get('/system/menus')
def menus(user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    return conn.execute('SELECT m.*,ARRAY(SELECT role_code FROM dc.menu_auth a WHERE a.menu_code=m.menu_code ORDER BY role_code) AS roles FROM dc.menu m ORDER BY sort_order,menu_code').fetchall()


class MenuChange(Change):
    label: str=Field(min_length=1,max_length=200)
    sortOrder: int=Field(ge=0,le=100000)
    isActive: bool=True


@router.put('/system/menus/{menu_code}')
def save_menu(menu_code: str,data: MenuChange,user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    before=conn.execute('SELECT * FROM dc.menu WHERE menu_code=%s FOR UPDATE',(menu_code,)).fetchone()
    if not before:
        raise HTTPException(404,'배포된 메뉴를 찾을 수 없습니다.')
    if before['version']!=data.expectedVersion:
        raise HTTPException(409,'메뉴가 변경되었습니다. 새로 조회하세요.')
    if menu_code=='system' and not data.isActive:
        raise HTTPException(422,'관리 진입 메뉴는 비활성화할 수 없습니다.')
    after=conn.execute('UPDATE dc.menu SET label=%s,sort_order=%s,is_active=%s,version=version+1 WHERE menu_code=%s RETURNING *',
                       (data.label,data.sortOrder,data.isActive,menu_code)).fetchone()
    audit(conn,user,'menu',menu_code,before,after,data.reason)
    return after


@router.get('/system/auth-roles')
def auth_roles(user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    # 시스템관리자(AUTH0006)는 관리 대상이 아니다 — 자기 자신의 진입 메뉴를 끄는 길을 만들지 않는다.
    return conn.execute('''SELECT role_code,label,portal,base_group,version,description FROM dc.auth_role
      WHERE is_active AND role_code<>'AUTH0006' ORDER BY sort_order,role_code''').fetchall()


class MenuGrant(Change):
    menuCodes: list[str]=Field(max_length=500)


@router.put('/system/auth-roles/{role_code}/menus')
def save_role_menus(role_code: str,data: MenuGrant,user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    # 역할 한 건의 menu_auth 집합을 통째로 치환한다. 역할 행 잠금이 동시 저장을 직렬화한다.
    role=conn.execute('SELECT * FROM dc.auth_role WHERE role_code=%s AND is_active FOR UPDATE',(role_code,)).fetchone()
    if not role or role_code=='AUTH0006':
        raise HTTPException(404,'관리할 수 있는 역할이 아닙니다.')
    if role['version']!=data.expectedVersion:
        raise HTTPException(409,'다른 관리자가 이 역할의 메뉴를 변경했습니다. 새로 조회하세요.')
    if not role['portal']:
        raise HTTPException(422,'이 역할의 포털이 아직 없어 노출할 메뉴가 없습니다.')
    wanted=set(data.menuCodes)
    tree={r['menu_code']:r['parent_code'] for r in conn.execute('SELECT menu_code,parent_code FROM dc.menu WHERE portal=%s',(role['portal'],)).fetchall()}
    if wanted-set(tree):
        raise HTTPException(422,'이 역할의 포털에 없는 메뉴입니다.')
    if any(tree[code] and tree[code] not in wanted for code in wanted):
        raise HTTPException(422,'하위 메뉴를 허용하려면 상위 메뉴도 허용해야 합니다.')
    before=sorted(r['menu_code'] for r in conn.execute('SELECT menu_code FROM dc.menu_auth WHERE role_code=%s',(role_code,)).fetchall())
    conn.execute('DELETE FROM dc.menu_auth WHERE role_code=%s AND menu_code<>ALL(%s)',(role_code,list(wanted)))
    conn.execute('''INSERT INTO dc.menu_auth(menu_code,role_code) SELECT unnest(%s::text[]),%s
      ON CONFLICT DO NOTHING''',(list(wanted),role_code))
    after=conn.execute('UPDATE dc.auth_role SET version=version+1 WHERE role_code=%s RETURNING version',(role_code,)).fetchone()
    audit(conn,user,'menu_auth',role_code,dict(menuCodes=before),dict(menuCodes=sorted(wanted)),data.reason)
    return dict(role_code=role_code,version=after['version'],menuCodes=sorted(wanted))


@router.get('/system/events')
def events(page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),
           user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    return page_result(conn,'dc.admin_event','true',[],page,pageSize,'changed_at DESC,id DESC')


@router.get('/system/import-issues')
def issues(page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),
           user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    return page_result(conn,'dc.import_issue','true',[],page,pageSize,'id DESC')
