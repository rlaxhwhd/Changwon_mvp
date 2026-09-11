"""채용·취업 — 공고·기업·전형·지원·회차·찜·자소서.

비교과(programs.py)의 규약을 그대로 따른다: 부모 FOR UPDATE → 자식 순서로 잠그고,
쓰기는 version 낙관적 잠금, 중복은 Idempotency-Key, 이력은 append-only 다.

채용에서 달라지는 것 넷:
  ① 인가는 require_staff 가 아니라 메뉴 권한이다. 채용 메뉴는 career 에만 부여돼
     있고 dc.auth_user 에는 개발 시스템관리자 한 명뿐이라, auth_user 검사만 하면
     전 상담사가 403 이 된다(metadata.py 의 메뉴 술어를 그대로 나눠 쓴다).
  ② 학생 범위는 dc.staff_student_scope 만 본다. auth.student_access 의
     "과거 상담 담당이면 허용" 우회 경로를 채용으로 가져오지 않는다.
  ③ 통계·CSV 에도 목록과 같은 범위 술어를 건다. 비교과 통계의 범위 누락
     (programs.py:121)을 계승하지 않는다.
  ④ 「채용시 마감」은 최초 등록(또는 다른 모드→ON_HIRE 전환) 때 한 번만 계산한다.
     현행 폼은 저장할 때마다 다시 계산해 제목만 고쳐도 마감이 한 달 밀렸다.
"""
import calendar
import hashlib
from datetime import date, datetime, timedelta
from urllib.parse import quote
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator

from . import files
from .auth import principal, require_staff
from .db import connection
from .gates import employment_gate

router = APIRouter()
SEOUL = ZoneInfo('Asia/Seoul')
MANAGE_MENU = 'jobs'
APPLICANT_MENU = 'jobs.4'
OPEN_STATUSES = ('APPLIED', 'IN_PROGRESS')
SYSTEM_STAGES = (('REVIEW', '서류 검토'), ('FORWARD', '기업 전달'))
DEFAULT_STAGES = ('서류 전형', '면접 전형', '최종 결과')
OPTION_KINDS = {'employmentTypes': 'EMPLOYMENT', 'jobCategories': 'CATEGORY',
                'careerTypes': 'CAREER', 'genders': 'GENDER', 'regions': 'REGION'}
OPTION_GROUPS = {'EMPLOYMENT': 'JOB_EMPLOYMENT_TYPE', 'CATEGORY': 'JOB_CATEGORY',
                 'CAREER': 'JOB_CAREER_TYPE', 'GENDER': 'JOB_GENDER', 'REGION': 'JOB_REGION'}
POSTING_WRITABLE = ('company_id,company_name_snapshot,role,tags,salary_text,location_text,career_primary_code,'
                    'company_type_code,recruit_type,stored_status,deadline_mode,deadline_date,salary_negotiable,'
                    'url_title_link,email_apply,apply_url,email,content_html,content_format,logo_file_id')


def today():
    return datetime.now(SEOUL).date()


def plus_one_month(day: date) -> date:
    """JobForm 의 Date.setMonth(+1) 과 같은 값을 낸다 — 월말 넘침도 그대로(1/31 → 3/3)."""
    year, month = (day.year + 1, 1) if day.month == 12 else (day.year, day.month + 1)
    span = calendar.monthrange(year, month)[1]
    if day.day <= span:
        return date(year, month, day.day)
    return date(year, month, span) + timedelta(days=day.day - span)


# ── 인가 ────────────────────────────────────────────────────────────────
# metadata.py 의 메뉴 권한 술어를 그대로 쓴다. 역할 라벨·부서명으로 판정하지 않는다.
MENU_PREDICATE = '''SELECT EXISTS(SELECT 1 FROM dc.menu m JOIN dc.menu_auth a USING(menu_code)
 WHERE m.menu_code=%s AND m.is_active AND (
   a.role_code=(SELECT role_code FROM dc.staff WHERE intg_uid=%s)
   OR a.role_code IN (SELECT u.role_code FROM dc.auth_user u JOIN dc.auth_role r USING(role_code)
        WHERE u.person_uid=%s AND r.is_active AND u.valid_from<=now()
          AND (u.valid_to IS NULL OR u.valid_to>now())))) AS ok'''


def can_manage(conn, user, menu_code=MANAGE_MENU) -> bool:
    if user['kind'] != 'STAFF':
        return False
    return conn.execute(MENU_PREDICATE, (menu_code, user['intg_uid'], user['intg_uid'])).fetchone()['ok']


def require_manage(conn, user, menu_code=MANAGE_MENU):
    require_staff(user)
    if not can_manage(conn, user, menu_code):
        raise HTTPException(403, '채용 관리 권한이 없습니다.')


def scope_condition(user, alias='a'):
    """모든 지원 SQL 이 쓰는 하나의 범위 술어. 목록·상세·이력·통계·CSV 에서 빠지지 않는다."""
    if user['kind'] == 'STUDENT':
        return f'{alias}.student_uid=%s', [user['intg_uid']]
    return (f'''EXISTS(SELECT 1 FROM dc.staff_student_scope g
      WHERE g.staff_uid=%s AND g.student_uid={alias}.student_uid)''', [user['intg_uid']])


def resolve_student(conn, user, identity):
    """채용에서 쓰는 학생 해석. staff_student_scope 만 본다(과거 상담 담당 우회 없음)."""
    student = conn.execute('''SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE p.alias=%s OR s.intg_uid=%s''', (identity, identity)).fetchone()
    if not student:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    if user['kind'] == 'STUDENT' and user['intg_uid'] != student['intg_uid']:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    if user['kind'] == 'STAFF' and not conn.execute(
            'SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',
            (user['intg_uid'], student['intg_uid'])).fetchone():
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    return student


# ── 멱등 ────────────────────────────────────────────────────────────────

def idempotent(conn, user, route, key, payload):
    digest = hashlib.sha256(payload.encode()).hexdigest()
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (user['intg_uid'] + route + key,))
    saved = conn.execute('SELECT * FROM dc.idempotency WHERE actor_uid=%s AND route=%s AND key=%s',
                         (user['intg_uid'], route, key)).fetchone()
    if saved and saved['request_hash'] != digest:
        raise HTTPException(409, '같은 요청 키로 다른 내용을 저장할 수 없습니다.')
    return digest, (saved['response'] if saved else None)


def remember(conn, user, route, key, digest, result):
    conn.execute('INSERT INTO dc.idempotency(actor_uid,route,key,request_hash,response) VALUES(%s,%s,%s,%s,%s)',
                 (user['intg_uid'], route, key, digest, Jsonb(jsonable_encoder(result))))
    return result


# ── 공고 ────────────────────────────────────────────────────────────────

def effective_status(row):
    """화면이 보는 상태. 저장된 상태와 마감일이 어긋나면 마감일이 이긴다(KST 당일까지 열림)."""
    if row['deleted_at']:
        return 'UNAVAILABLE'
    if row['stored_status'] == 'CLOSED':
        return 'CLOSED'
    if row['deadline_mode'] != 'ALWAYS':
        if not row['deadline_date']:
            return 'UNKNOWN'
        if row['deadline_date'] < today():
            return 'CLOSED'
    return 'POSTED'


def stage_dto(row):
    return {'id': row['id'], 'order': row['position'], 'name': row['name'], 'systemKey': row['system_key']}


def stages_of(conn, posting_ids):
    grouped = {pid: [] for pid in posting_ids}
    if posting_ids:
        for row in conn.execute('''SELECT * FROM dc.job_stage WHERE posting_id=ANY(%s) AND deleted_at IS NULL
          ORDER BY posting_id,position''', (posting_ids,)).fetchall():
            grouped[row['posting_id']].append(stage_dto(row))
    return grouped


def options_of(conn, posting_ids):
    grouped = {pid: {field: [] for field in OPTION_KINDS} for pid in posting_ids}
    if posting_ids:
        by_kind = {kind: field for field, kind in OPTION_KINDS.items()}
        for row in conn.execute('SELECT * FROM dc.job_posting_option WHERE posting_id=ANY(%s) ORDER BY code',
                                (posting_ids,)).fetchall():
            grouped[row['posting_id']][by_kind[row['kind']]].append(row['code'])
    return grouped


def files_of(conn, posting_ids):
    grouped = {pid: [] for pid in posting_ids}
    if posting_ids:
        for row in conn.execute('''SELECT * FROM dc.file_object WHERE owner_kind='JOB_POSTING'
          AND owner_id=ANY(%s) AND slot='ATTACHMENT' AND state='READY' ORDER BY uploaded_at,id''',
          (posting_ids,)).fetchall():
            grouped[row['owner_id']].append(files.file_dto(row))
    return grouped


def posting_dto(row, options, stages, attachments):
    return {
        'id': row['id'], 'companyId': row['company_id'], 'company': row['company_name_snapshot'],
        'role': row['role'], 'tags': row['tags'], 'salary': row['salary_text'] or '',
        'location': row['location_text'] or '', 'deadline': row['deadline_date'],
        'deadlineMode': row['deadline_mode'], 'deadlineOnHire': row['deadline_mode'] == 'ON_HIRE',
        'jobType': row['career_primary_code'], 'applyUrl': row['apply_url'] or '',
        # match 는 근거 없는 순위라 정본에서 뺀다. 학생 화면 호환을 위해 0 으로만 내려보낸다.
        'match': 0, 'recruitType': row['recruit_type'], 'companyType': row['company_type_code'],
        'urlTitleLink': row['url_title_link'], 'email': row['email'] or '', 'emailApply': row['email_apply'],
        'salaryNegotiable': row['salary_negotiable'], 'content': row['content_html'] or '',
        'contentFormat': row['content_format'],
        'logo': '/api/v1/job-files/' + row['logo_file_id'] if row['logo_file_id'] else None,
        'logoFileId': row['logo_file_id'], 'attachments': attachments, 'stages': stages,
        'status': row['stored_status'], 'effectiveStatus': effective_status(row),
        'source': row['source'], 'postedAt': row['posted_at'], 'version': row['version'], **options,
    }


def posting_rows(conn, rows):
    ids = [r['id'] for r in rows]
    options, stages, attachments = options_of(conn, ids), stages_of(conn, ids), files_of(conn, ids)
    return [posting_dto(r, options[r['id']], stages[r['id']], attachments[r['id']]) for r in rows]


def get_posting(conn, posting_id, lock=False, include_deleted=False):
    row = conn.execute('SELECT * FROM dc.job_posting WHERE id=%s'
                       + ('' if include_deleted else ' AND deleted_at IS NULL')
                       + (' FOR UPDATE' if lock else ''), (posting_id,)).fetchone()
    if not row:
        raise HTTPException(404, '공고를 찾을 수 없습니다.')
    return row


def posting_event(conn, user, posting_id, action, before, after, reason=''):
    seq = conn.execute('SELECT COALESCE(max(seq),0)+1 AS n FROM dc.job_posting_event WHERE posting_id=%s',
                       (posting_id,)).fetchone()['n']
    conn.execute('''INSERT INTO dc.job_posting_event(posting_id,seq,action,before_value,after_value,reason,actor_uid)
      VALUES(%s,%s,%s,%s,%s,%s,%s)''', (posting_id, seq, action, Jsonb(jsonable_encoder(before)) if before else None,
      Jsonb(jsonable_encoder(after)), reason, user['intg_uid']))


@router.get('/jobs/capabilities')
def capabilities(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """화면이 무엇을 켤 수 있는지. 미제공 기능은 이유와 함께 내려보낸다."""
    return {
        'canManage': can_manage(conn, user), 'canManageApplicants': can_manage(conn, user, APPLICANT_MENU),
        'canApplyWithFile': user['kind'] == 'STUDENT',
        # 포트폴리오 도메인(DB.md §8-3 #4)에 학생별 영속 provider 가 없다. 가짜 제출을 만들지 않는다.
        'canApplyWithPortfolio': False,
        'canUseTextResume': user['kind'] == 'STUDENT',
        'unavailable': [] if user['kind'] != 'STUDENT' else
            [{'code': 'PORTFOLIO_SERVICE_UNAVAILABLE', 'message': '드림캐치 포트폴리오 제출은 아직 준비 중입니다.'}],
    }


@router.get('/jobs/eligibility')
def eligibility(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 조회할 수 있습니다.')
    return employment_gate(conn, user['intg_uid'])


@router.get('/jobs')
def list_postings(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                  q: str = Query('', max_length=200), source: str | None = None, recruitType: str | None = None,
                  status: str | None = None, companyId: str | None = None,
                  user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    where, values = ['deleted_at IS NULL'], []
    if source in ('manual', 'external'):
        where.append('source=%s')
        values.append(source)
    if recruitType in ('GENERAL', 'RECOMMENDATION'):
        where.append('recruit_type=%s')
        values.append(recruitType)
    if status in ('POSTED', 'CLOSED'):
        where.append('stored_status=%s')
        values.append(status)
    if companyId:
        where.append('company_id=%s')
        values.append(companyId)
    if q.strip():
        where.append("concat_ws(' ',company_name_snapshot,role,location_text) ILIKE %s")
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    condition = ' AND '.join(f'({x})' for x in where)
    total = conn.execute('SELECT count(*) AS n FROM dc.job_posting WHERE ' + condition, values).fetchone()['n']
    rows = conn.execute(f'''SELECT * FROM dc.job_posting WHERE {condition}
      ORDER BY posted_at DESC,id LIMIT %s OFFSET %s''',
      [*values, pageSize, (page - 1) * pageSize]).fetchall()
    return dict(items=posting_rows(conn, rows), totalCount=total, page=page, pageSize=pageSize)


class CompanyBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    displayName: str = Field(min_length=1, max_length=200)
    companyTypeCode: str | None = Field(default=None, max_length=64)
    websiteUrl: str | None = Field(default=None, max_length=500)

    @model_validator(mode='after')
    def urls(self):
        if self.websiteUrl and not self.websiteUrl.startswith(('http://', 'https://')):
            raise ValueError('홈페이지 주소는 http 또는 https 로 시작해야 합니다.')
        return self


class CompanyUpdate(CompanyBody):
    expectedVersion: int = Field(ge=1)


def company_dto(row):
    return {'id': row['id'], 'displayName': row['display_name'], 'companyTypeCode': row['company_type_code'],
            'websiteUrl': row['website_url'], 'version': row['version']}


def check_code(conn, group, code, label):
    if code and not conn.execute('SELECT 1 FROM dc.code_item WHERE group_code=%s AND code=%s AND is_active',
                                 (group, code)).fetchone():
        raise HTTPException(422, f'사용 가능한 {label}을(를) 선택해 주세요.')


@router.get('/job-companies')
def list_companies(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                   q: str = Query('', max_length=200),
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_manage(conn, user)
    where, values = ['deleted_at IS NULL'], []
    if q.strip():
        where.append('display_name ILIKE %s')
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    condition = ' AND '.join(f'({x})' for x in where)
    total = conn.execute('SELECT count(*) AS n FROM dc.company WHERE ' + condition, values).fetchone()['n']
    rows = conn.execute(f'SELECT * FROM dc.company WHERE {condition} ORDER BY display_name,id LIMIT %s OFFSET %s',
                        [*values, pageSize, (page - 1) * pageSize]).fetchall()
    return dict(items=[company_dto(r) for r in rows], totalCount=total, page=page, pageSize=pageSize)


@router.post('/job-companies', status_code=201)
def create_company(body: CompanyBody, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    require_manage(conn, user)
    check_code(conn, 'JOB_COMPANY_TYPE', body.companyTypeCode, '기업 구분')
    row = conn.execute('''INSERT INTO dc.company(id,display_name,company_type_code,website_url,created_by,updated_by)
      VALUES(%s,%s,%s,%s,%s,%s) RETURNING *''', ('cmp_' + uuid4().hex[:12], body.displayName,
      body.companyTypeCode, body.websiteUrl, user['intg_uid'], user['intg_uid'])).fetchone()
    return company_dto(row)


@router.patch('/job-companies/{company_id}')
def update_company(company_id: str, body: CompanyUpdate, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    require_manage(conn, user)
    check_code(conn, 'JOB_COMPANY_TYPE', body.companyTypeCode, '기업 구분')
    before = conn.execute('SELECT * FROM dc.company WHERE id=%s AND deleted_at IS NULL FOR UPDATE',
                          (company_id,)).fetchone()
    if not before:
        raise HTTPException(404, '기업을 찾을 수 없습니다.')
    if before['version'] != body.expectedVersion:
        raise HTTPException(409, '다른 담당자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    # 기업 사전만 바꾼다. 이미 게시된 공고의 표시 스냅샷은 소급 변경하지 않는다.
    row = conn.execute('''UPDATE dc.company SET display_name=%s,company_type_code=%s,website_url=%s,
      version=version+1,updated_at=now(),updated_by=%s WHERE id=%s RETURNING *''',
      (body.displayName, body.companyTypeCode, body.websiteUrl, user['intg_uid'], company_id)).fetchone()
    return company_dto(row)


@router.delete('/job-companies/{company_id}')
def delete_company(company_id: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    require_manage(conn, user)
    row = conn.execute('SELECT * FROM dc.company WHERE id=%s AND deleted_at IS NULL FOR UPDATE',
                       (company_id,)).fetchone()
    if not row:
        raise HTTPException(404, '기업을 찾을 수 없습니다.')
    if conn.execute('SELECT 1 FROM dc.job_posting WHERE company_id=%s AND deleted_at IS NULL',
                    (company_id,)).fetchone():
        raise HTTPException(409, '공고가 등록된 기업은 삭제할 수 없습니다.')
    conn.execute('UPDATE dc.company SET deleted_at=now(),deleted_by=%s WHERE id=%s', (user['intg_uid'], company_id))
    return {'id': company_id, 'deleted': True}


class PostingBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    companyId: str | None = None
    createCompany: CompanyBody | None = None
    company: str = Field(default='', max_length=200)
    role: str = Field(min_length=1, max_length=200)
    tags: list[str] = Field(default_factory=list, max_length=30)
    salary: str = Field(default='', max_length=200)
    location: str = Field(default='', max_length=200)
    jobType: str | None = Field(default=None, max_length=64)
    companyType: str | None = Field(default=None, max_length=64)
    recruitType: str = Field(default='GENERAL', pattern='^(GENERAL|RECOMMENDATION)$')
    status: str = Field(default='POSTED', pattern='^(POSTED|CLOSED)$')
    deadlineMode: str = Field(default='DATE', pattern='^(DATE|ALWAYS|ON_HIRE)$')
    deadline: date | None = None
    applyUrl: str = Field(default='', max_length=500)
    urlTitleLink: bool = False
    email: str = Field(default='', max_length=200)
    emailApply: bool = False
    salaryNegotiable: bool = False
    content: str = Field(default='', max_length=100000)
    contentFormat: str = Field(default='HTML', pattern='^(HTML|TEXT)$')
    logoFileId: str | None = None
    attachmentFileIds: list[str] = Field(default_factory=list, max_length=20)
    employmentTypes: list[str] = Field(default_factory=list, max_length=20)
    jobCategories: list[str] = Field(default_factory=list, max_length=20)
    careerTypes: list[str] = Field(default_factory=list, max_length=20)
    genders: list[str] = Field(default_factory=list, max_length=10)
    regions: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode='after')
    def consistent(self):
        for tag in self.tags:
            if len(tag) > 50:
                raise ValueError('태그는 50자 이하여야 합니다.')
        if self.deadlineMode == 'DATE' and not self.deadline:
            raise ValueError('마감일을 입력해 주세요.')
        if self.deadlineMode == 'ALWAYS' and self.deadline:
            raise ValueError('상시 모집은 마감일을 두지 않습니다.')
        if self.applyUrl and not self.applyUrl.startswith(('http://', 'https://')):
            raise ValueError('지원 링크는 http 또는 https 로 시작해야 합니다.')
        if self.urlTitleLink and not self.applyUrl:
            raise ValueError('제목 링크를 쓰려면 지원 링크가 필요합니다.')
        if self.emailApply and not self.email:
            raise ValueError('이메일 지원을 쓰려면 지원 이메일이 필요합니다.')
        if self.email and '@' not in self.email:
            raise ValueError('지원 이메일 형식을 확인해 주세요.')
        if self.companyId and self.createCompany:
            raise ValueError('기업을 고르거나 새로 등록하거나 하나만 선택해 주세요.')
        return self


class PostingUpdate(PostingBody):
    expectedVersion: int = Field(ge=1)


def resolve_company(conn, user, body):
    if body.createCompany:
        return create_company(body.createCompany, user, conn)['id']
    if body.companyId:
        row = conn.execute('SELECT id FROM dc.company WHERE id=%s AND deleted_at IS NULL FOR SHARE',
                           (body.companyId,)).fetchone()
        if not row:
            raise HTTPException(422, '등록된 기업을 선택해 주세요.')
        return row['id']
    raise HTTPException(422, '기업을 선택하거나 새로 등록해 주세요.')


def validate_options(conn, body):
    for field, kind in OPTION_KINDS.items():
        for code in getattr(body, field):
            check_code(conn, OPTION_GROUPS[kind], code, '분류')
    check_code(conn, 'JOB_CAREER_TYPE', body.jobType, '경력 구분')
    check_code(conn, 'JOB_COMPANY_TYPE', body.companyType, '기업 구분')


def write_options(conn, posting_id, body):
    conn.execute('DELETE FROM dc.job_posting_option WHERE posting_id=%s', (posting_id,))
    for field, kind in OPTION_KINDS.items():
        for code in dict.fromkeys(getattr(body, field)):
            conn.execute('INSERT INTO dc.job_posting_option(posting_id,kind,code) VALUES(%s,%s,%s)',
                         (posting_id, kind, code))


def bind_files(conn, user, posting_id, body):
    """로고·첨부를 이 공고에 귀속시키고, 목록에서 빠진 파일은 논리삭제한다."""
    keep = set(body.attachmentFileIds) | ({body.logoFileId} if body.logoFileId else set())
    if body.logoFileId:
        files.claim(conn, user, body.logoFileId, 'JOB_POSTING', posting_id, 'LOGO')
    for file_id in body.attachmentFileIds:
        files.claim(conn, user, file_id, 'JOB_POSTING', posting_id, 'ATTACHMENT')
    for row in conn.execute('''SELECT id FROM dc.file_object WHERE owner_kind='JOB_POSTING' AND owner_id=%s
      AND state='READY' ''', (posting_id,)).fetchall():
        if row['id'] not in keep:
            files.discard(conn, user, row['id'])


def posting_values(body, company_id, deadline_date):
    return (company_id, body.company or (body.createCompany.displayName if body.createCompany else ''),
            body.role, body.tags, body.salary or None, body.location or None, body.jobType, body.companyType,
            body.recruitType, body.status, body.deadlineMode, deadline_date, body.salaryNegotiable,
            body.urlTitleLink, body.emailApply, body.applyUrl or None, body.email or None,
            body.content or None, body.contentFormat, body.logoFileId)


@router.post('/jobs', status_code=201)
def create_posting(body: PostingBody, idempotency_key: str = Header(min_length=8, max_length=200),
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_manage(conn, user)
    digest, saved = idempotent(conn, user, 'POST /jobs', idempotency_key, body.model_dump_json())
    if saved:
        return saved
    validate_options(conn, body)
    company_id = resolve_company(conn, user, body)
    company = conn.execute('SELECT display_name FROM dc.company WHERE id=%s', (company_id,)).fetchone()
    posting_id = 'job_' + uuid4().hex[:12]
    # 「채용시 마감」은 여기서 한 번만 계산한다. 이후 수정에서 다시 밀지 않는다.
    deadline = plus_one_month(today()) if body.deadlineMode == 'ON_HIRE' else body.deadline
    columns = POSTING_WRITABLE.split(',')
    values = list(posting_values(body, company_id, deadline))
    values[1] = company['display_name']
    row = conn.execute(f'''INSERT INTO dc.job_posting(id,{POSTING_WRITABLE},source,posted_at,created_by,updated_by)
      VALUES({",".join(["%s"] * (len(columns) + 1))},'manual',now(),%s,%s) RETURNING *''',
      (posting_id, *values, user['intg_uid'], user['intg_uid'])).fetchone()
    write_options(conn, posting_id, body)
    bind_files(conn, user, posting_id, body)
    if body.recruitType == 'RECOMMENDATION':
        seed_stages(conn, posting_id)
    result = posting_rows(conn, [row])[0]
    posting_event(conn, user, posting_id, 'CREATE', None, result)
    return remember(conn, user, 'POST /jobs', idempotency_key, digest, result)


def seed_stages(conn, posting_id):
    """추천채용 공고의 전형을 실체화한다 — 교내 2단계 + 기본 3단계.
    교내 단계를 전역 상수 ID 로 두지 않는다(공고마다 별개의 행이다)."""
    for position, (key, name) in enumerate(SYSTEM_STAGES, start=1):
        conn.execute('INSERT INTO dc.job_stage(posting_id,id,system_key,position,name) VALUES(%s,%s,%s,%s,%s)',
                     (posting_id, 'stg_' + uuid4().hex[:12], key, position, name))
    for offset, name in enumerate(DEFAULT_STAGES):
        conn.execute('INSERT INTO dc.job_stage(posting_id,id,position,name) VALUES(%s,%s,%s,%s)',
                     (posting_id, 'stg_' + uuid4().hex[:12], len(SYSTEM_STAGES) + 1 + offset, name))


@router.patch('/jobs/{posting_id}')
def update_posting(posting_id: str, body: PostingUpdate, idempotency_key: str = Header(min_length=8, max_length=200),
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_manage(conn, user)
    digest, saved = idempotent(conn, user, 'PATCH /jobs/' + posting_id, idempotency_key, body.model_dump_json())
    if saved:
        return saved
    before = get_posting(conn, posting_id, lock=True)
    if before['version'] != body.expectedVersion:
        raise HTTPException(409, '다른 담당자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    before_dto = posting_rows(conn, [before])[0]
    if before['source'] != 'manual':
        raise HTTPException(403, '외부 수집 공고는 수정할 수 없습니다.')
    if before['recruit_type'] != body.recruitType and conn.execute(
            'SELECT 1 FROM dc.job_application WHERE posting_id=%s', (posting_id,)).fetchone():
        raise HTTPException(409, '지원자가 있는 공고의 채용 유형은 바꿀 수 없습니다.')
    validate_options(conn, body)
    company_id = resolve_company(conn, user, body) if (body.companyId or body.createCompany) else before['company_id']
    company_name = conn.execute('SELECT display_name FROM dc.company WHERE id=%s',
                                (company_id,)).fetchone()['display_name']
    # 마감일: ON_HIRE 로 처음 넘어갈 때만 계산한다. 이미 ON_HIRE 였으면 저장된 날짜를 지킨다.
    if body.deadlineMode == 'ON_HIRE':
        deadline = before['deadline_date'] if before['deadline_mode'] == 'ON_HIRE' else plus_one_month(today())
    else:
        deadline = body.deadline
    assignments = ','.join(f'{column}=%s' for column in POSTING_WRITABLE.split(','))
    values = list(posting_values(body, company_id, deadline))
    values[1] = company_name
    row = conn.execute(f'''UPDATE dc.job_posting SET {assignments},version=version+1,updated_at=now(),updated_by=%s
      WHERE id=%s RETURNING *''', (*values, user['intg_uid'], posting_id)).fetchone()
    write_options(conn, posting_id, body)
    bind_files(conn, user, posting_id, body)
    if body.recruitType == 'RECOMMENDATION' and not conn.execute(
            'SELECT 1 FROM dc.job_stage WHERE posting_id=%s', (posting_id,)).fetchone():
        seed_stages(conn, posting_id)
    result = posting_rows(conn, [row])[0]
    posting_event(conn, user, posting_id, 'UPDATE', before_dto, result)
    return remember(conn, user, 'PATCH /jobs/' + posting_id, idempotency_key, digest, result)


class VersionBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=1)
    reason: str = Field(default='', max_length=2000)


def set_stored_status(conn, user, posting_id, intent, body):
    require_manage(conn, user)
    before = get_posting(conn, posting_id, lock=True)
    if before['version'] != body.expectedVersion:
        raise HTTPException(409, '다른 담당자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    target = 'CLOSED' if intent == 'close' else 'POSTED'
    if before['stored_status'] == target:
        raise HTTPException(409, '이미 같은 상태입니다.')
    row = conn.execute('''UPDATE dc.job_posting SET stored_status=%s,version=version+1,updated_at=now(),
      updated_by=%s WHERE id=%s RETURNING *''', (target, user['intg_uid'], posting_id)).fetchone()
    result = posting_rows(conn, [row])[0]
    posting_event(conn, user, posting_id, intent.upper(), posting_rows(conn, [before])[0], result, body.reason)
    return result


@router.post('/jobs/{posting_id}/close')
def close_posting(posting_id: str, body: VersionBody, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    return set_stored_status(conn, user, posting_id, 'close', body)


@router.post('/jobs/{posting_id}/reopen')
def reopen_posting(posting_id: str, body: VersionBody, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    """재게시해도 지난 마감일은 여전히 마감이다 — 날짜도 함께 고쳐야 학생 화면이 열린다."""
    return set_stored_status(conn, user, posting_id, 'reopen', body)


@router.delete('/jobs/{posting_id}')
def delete_posting(posting_id: str, expectedVersion: int = Query(ge=1),
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """논리삭제다. 지원·회차·이력은 보존한다 — 통계와 학생 이력의 근거가 사라지면 안 된다."""
    require_manage(conn, user)
    before = get_posting(conn, posting_id, lock=True)
    if before['version'] != expectedVersion:
        raise HTTPException(409, '다른 담당자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    conn.execute('''UPDATE dc.job_posting SET deleted_at=now(),deleted_by=%s,version=version+1,updated_at=now()
      WHERE id=%s''', (user['intg_uid'], posting_id))
    posting_event(conn, user, posting_id, 'DELETE', posting_rows(conn, [before])[0], {'deleted': True})
    return {'id': posting_id, 'deleted': True}


@router.get('/jobs/{posting_id}')
def posting_detail(posting_id: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    row = get_posting(conn, posting_id)
    result = posting_rows(conn, [row])[0]
    if user['kind'] == 'STUDENT':
        result['applyEligibility'] = employment_gate(conn, user['intg_uid'])
    return result


# ── 전형 단계 ────────────────────────────────────────────────────────────

class StageInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    id: str | None = None
    name: str = Field(min_length=1, max_length=100)


class StagesBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=1)
    stages: list[StageInput] = Field(min_length=1, max_length=20)


@router.put('/jobs/{posting_id}/stages')
def set_stages(posting_id: str, body: StagesBody, user=Depends(principal, scope='function'),
               conn=Depends(connection, scope='function')):
    """기업 전형 전체 집합을 한 트랜잭션으로 바꾼다. 교내 2단계는 입력 대상이 아니다."""
    require_manage(conn, user)
    posting = get_posting(conn, posting_id, lock=True)
    if posting['version'] != body.expectedVersion:
        raise HTTPException(409, '다른 담당자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    current = conn.execute('SELECT * FROM dc.job_stage WHERE posting_id=%s ORDER BY position FOR UPDATE',
                           (posting_id,)).fetchall()
    system = [s for s in current if s['system_key'] and not s['deleted_at']]
    existing = {s['id']: s for s in current if not s['system_key'] and not s['deleted_at']}
    before = [stage_dto(s) for s in current if not s['deleted_at']]
    kept = []
    for item in body.stages:
        if item.id in {s['id'] for s in system}:
            raise HTTPException(409, '교내 절차 단계는 수정할 수 없습니다.')
        if item.id and item.id not in existing:
            raise HTTPException(422, '이 공고의 전형 단계가 아닙니다.')
        kept.append(item)
    dropped = set(existing) - {i.id for i in kept if i.id}
    for stage_id in dropped:
        if conn.execute('''SELECT 1 FROM dc.job_application WHERE posting_id=%s AND current_stage_id=%s
          AND status='IN_PROGRESS' ''', (posting_id, stage_id)).fetchone():
            raise HTTPException(409, '진행 중인 지원자가 있는 단계는 삭제할 수 없습니다.')
        conn.execute('''UPDATE dc.job_stage SET deleted_at=now(),deleted_by=%s WHERE posting_id=%s AND id=%s''',
                     (user['intg_uid'], posting_id, stage_id))
    # 활성 position 부분 유니크 인덱스는 DEFERRABLE 이 불가능하다 →
    # 임시 음수 영역으로 옮긴 뒤 최종 순서를 다시 쓴다.
    conn.execute('UPDATE dc.job_stage SET position=-position WHERE posting_id=%s AND deleted_at IS NULL',
                 (posting_id,))
    for position, stage in enumerate(system, start=1):
        conn.execute('UPDATE dc.job_stage SET position=%s WHERE posting_id=%s AND id=%s',
                     (position, posting_id, stage['id']))
    for offset, item in enumerate(kept):
        position = len(system) + 1 + offset
        if item.id:
            conn.execute('UPDATE dc.job_stage SET position=%s,name=%s WHERE posting_id=%s AND id=%s',
                         (position, item.name, posting_id, item.id))
        else:
            conn.execute('INSERT INTO dc.job_stage(posting_id,id,position,name) VALUES(%s,%s,%s,%s)',
                         (posting_id, 'stg_' + uuid4().hex[:12], position, item.name))
    row = conn.execute('''UPDATE dc.job_posting SET version=version+1,updated_at=now(),updated_by=%s
      WHERE id=%s RETURNING *''', (user['intg_uid'], posting_id)).fetchone()
    result = posting_rows(conn, [row])[0]
    posting_event(conn, user, posting_id, 'STAGES_CHANGE', {'stages': before}, {'stages': result['stages']})
    return result


def flow_stages(conn, posting_id, lock=False):
    return conn.execute('SELECT * FROM dc.job_stage WHERE posting_id=%s AND deleted_at IS NULL ORDER BY position'
                        + (' FOR UPDATE' if lock else ''), (posting_id,)).fetchall()


# ── 지원 ────────────────────────────────────────────────────────────────

def attempt_dto(row):
    return {'attemptNo': row['attempt_no'], 'submittedAt': row['submitted_at'],
            'studentNo': row['snap_student_no'], 'studentName': row['snap_name'],
            'studentMajor': row['snap_major_label'], 'grade': row['snap_grade'],
            'enrollmentStatus': row['snap_enrollment_status'], 'collegeCode': row['snap_college_code'],
            'collegeLabel': row['snap_college_label'], 'deptCode': row['snap_dept_code'],
            'deptLabel': row['snap_dept_label'], 'studentType': row['snap_student_type'],
            'attachmentKind': row['attachment_kind'], 'attachmentState': row['attachment_state'],
            'attachmentFileId': row['attachment_file_id'], 'attachmentName': row.get('attachment_name'),
            'legacyFileName': row['legacy_file_name']}


def application_dto(row, attempt=None):
    return {'id': row['id'], 'jobId': row['posting_id'], 'studentId': row['alias'],
            'studentName': row.get('person_name'), 'status': row['status'],
            'currentStageId': row['current_stage_id'], 'currentStageName': row.get('current_stage_name'),
            'currentAttemptNo': row['current_attempt_no'], 'appliedAt': row['applied_at'],
            'canceledAt': row['canceled_at'], 'version': row['version'],
            'lastEventAt': row.get('last_event_at'), 'currentAttempt': attempt}


APPLICATION_SELECT = '''SELECT a.*,p.alias,p.name AS person_name,st.name AS current_stage_name,
 (SELECT max(recorded_at) FROM dc.job_application_event e WHERE e.application_id=a.id) AS last_event_at
 FROM dc.job_application a JOIN dc.person p ON p.intg_uid=a.student_uid
 LEFT JOIN dc.job_stage st ON (st.posting_id,st.id)=(a.posting_id,a.current_stage_id)'''


def current_attempt(conn, application):
    row = conn.execute('''SELECT t.*,f.original_name AS attachment_name FROM dc.job_application_attempt t
      LEFT JOIN dc.file_object f ON f.id=t.attachment_file_id
      WHERE t.application_id=%s AND t.attempt_no=%s''',
      (application['id'], application['current_attempt_no'])).fetchone()
    return attempt_dto(row) if row else None


def get_application(conn, user, application_id, lock=False):
    condition, values = scope_condition(user)
    if user['kind'] == 'STAFF':
        require_manage(conn, user, APPLICANT_MENU)
    row = conn.execute(APPLICATION_SELECT + f' WHERE a.id=%s AND ({condition})'
                       + (' FOR UPDATE OF a' if lock else ''), [application_id, *values]).fetchone()
    if not row:
        raise HTTPException(404, '지원 내역을 찾을 수 없습니다.')
    return row


def application_event(conn, user, application, action, attempt_no, **fields):
    seq = conn.execute('SELECT COALESCE(max(seq),0)+1 AS n FROM dc.job_application_event WHERE application_id=%s',
                       (application['id'],)).fetchone()['n']
    conn.execute('''INSERT INTO dc.job_application_event(id,application_id,posting_id,attempt_no,seq,action,
      from_status,to_status,from_stage_id,to_stage_id,from_stage_name,to_stage_name,reason,actor_uid,
      actor_name_snapshot,occurred_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())''',
      ('jae_' + uuid4().hex[:12], application['id'], application['posting_id'], attempt_no, seq, action,
       fields.get('from_status'), fields.get('to_status'), fields.get('from_stage_id'), fields.get('to_stage_id'),
       fields.get('from_stage_name'), fields.get('to_stage_name'), fields.get('reason', '') or '',
       user['intg_uid'], user['name']))


def snapshot_values(conn, student):
    """신청 시점 학적 스냅샷을 서버가 만든다. 클라이언트가 준 신원은 쓰지 않는다.
    대학·학과는 (단대코드,학과코드) 쌍으로 조인한다 — 학과명 매칭 금지(CLAUDE.md 규칙 7)."""
    org = conn.execute('SELECT college_name,dept_name FROM dc.department WHERE (college_code,dept_code)=(%s,%s)',
                       (student['college_code'], student['dept_code'])).fetchone()
    detail = student['detail'] or {}
    student_type = conn.execute('''SELECT student_type FROM dc.student_type_event WHERE student_uid=%s
      ORDER BY decided_at DESC,id DESC LIMIT 1''', (student['intg_uid'],)).fetchone()
    return {'snap_student_no': student['student_no'], 'snap_name': student['name'],
            'snap_major_label': student['major_label'], 'snap_grade': student['grade'],
            'snap_enrollment_status': detail.get('enrollmentStatus') or '재학',
            'snap_college_code': student['college_code'],
            'snap_college_label': org['college_name'] if org else None,
            'snap_dept_code': student['dept_code'], 'snap_dept_label': org['dept_name'] if org else None,
            'snap_student_type': student_type['student_type'] if student_type else None}


class Attachment(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    kind: str = Field(pattern='^(PORTFOLIO|RESUME_FILE)$')
    fileId: str | None = None


class ApplyBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedPostingVersion: int = Field(ge=1)
    expectedVersion: int | None = Field(default=None, ge=1)
    attachment: Attachment


@router.post('/jobs/{posting_id}/applications', status_code=201)
def apply(posting_id: str, body: ApplyBody, idempotency_key: str = Header(min_length=8, max_length=200),
          user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 지원할 수 있습니다.')
    route = 'POST /jobs/' + posting_id + '/applications'
    digest, saved = idempotent(conn, user, route, idempotency_key, body.model_dump_json())
    if saved:
        return saved
    posting = get_posting(conn, posting_id, lock=True)
    if posting['version'] != body.expectedPostingVersion:
        raise HTTPException(409, '공고가 변경됐습니다. 새로 조회한 뒤 지원해 주세요.')
    if posting['source'] != 'manual' or posting['recruit_type'] != 'RECOMMENDATION':
        raise HTTPException(409, '교내 추천채용 공고만 지원할 수 있습니다.')
    if effective_status(posting) != 'POSTED':
        raise HTTPException(409, '마감된 공고입니다.')
    gate = employment_gate(conn, user['intg_uid'])
    if not gate['eligible']:
        raise HTTPException(403, gate['reasons'][0]['message'])
    student = conn.execute('''SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE s.intg_uid=%s''', (user['intg_uid'],)).fetchone()
    existing = conn.execute('SELECT * FROM dc.job_application WHERE posting_id=%s AND student_uid=%s FOR UPDATE',
                            (posting_id, user['intg_uid'])).fetchone()
    if existing and existing['status'] != 'CANCELED':
        raise HTTPException(409, '이미 지원한 공고입니다.')
    if existing and existing['version'] != body.expectedVersion:
        raise HTTPException(409, '지원 내역이 변경됐습니다. 새로 조회한 뒤 다시 시도해 주세요.')
    # 제출 서류. 포트폴리오는 학생별 영속 provider 가 없어 아직 받을 수 없다(DB.md §8-3 #4).
    if body.attachment.kind == 'PORTFOLIO':
        raise HTTPException(503, '드림캐치 포트폴리오 제출은 아직 준비되지 않았습니다. 개별 이력서를 올려 주세요.')
    if not body.attachment.fileId:
        raise HTTPException(422, '지원 서류를 첨부해 주세요.')
    attempt_no = (existing['current_attempt_no'] + 1) if existing else 1
    attempt_id = 'jatt_' + uuid4().hex[:12]
    if existing:
        application = conn.execute('''UPDATE dc.job_application SET status='APPLIED',current_stage_id=NULL,
          canceled_at=NULL,applied_at=now(),current_attempt_no=%s,version=version+1,updated_at=now(),updated_by=%s
          WHERE id=%s RETURNING *''', (attempt_no, user['intg_uid'], existing['id'])).fetchone()
    else:
        application = conn.execute('''INSERT INTO dc.job_application(id,posting_id,student_uid,current_attempt_no,
          status,applied_at,created_by,updated_by) VALUES(%s,%s,%s,1,'APPLIED',now(),%s,%s) RETURNING *''',
          ('japp_' + uuid4().hex[:12], posting_id, user['intg_uid'], user['intg_uid'],
           user['intg_uid'])).fetchone()
    snapshot = snapshot_values(conn, student)
    columns = ','.join(snapshot)
    conn.execute(f'''INSERT INTO dc.job_application_attempt(id,application_id,attempt_no,{columns},
      attachment_kind,attachment_file_id,attachment_state,eligibility_evidence,created_by)
      VALUES(%s,%s,%s,{",".join(["%s"] * len(snapshot))},'RESUME_FILE',%s,'AVAILABLE',%s,%s)''',
      (attempt_id, application['id'], attempt_no, *snapshot.values(), body.attachment.fileId,
       Jsonb(jsonable_encoder(gate)), user['intg_uid']))
    files.claim(conn, user, body.attachment.fileId, 'JOB_APPLICATION_ATTEMPT', attempt_id, 'RESUME')
    application_event(conn, user, application, 'REAPPLY' if existing else 'APPLY', attempt_no,
                      from_status=existing['status'] if existing else None, to_status='APPLIED')
    row = conn.execute(APPLICATION_SELECT + ' WHERE a.id=%s', (application['id'],)).fetchone()
    return remember(conn, user, route, idempotency_key, digest,
                    application_dto(row, current_attempt(conn, row)))


@router.get('/job-applications/mine')
def my_applications(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                    status: str | None = None, postingId: str | None = None,
                    user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 조회할 수 있습니다.')
    where, values = ['a.student_uid=%s'], [user['intg_uid']]
    if status:
        where.append('a.status=%s')
        values.append(status)
    if postingId:
        where.append('a.posting_id=%s')
        values.append(postingId)
    condition = ' AND '.join(f'({x})' for x in where)
    total = conn.execute('SELECT count(*) AS n FROM dc.job_application a WHERE ' + condition,
                         values).fetchone()['n']
    rows = conn.execute(APPLICATION_SELECT + f' WHERE {condition} ORDER BY a.applied_at DESC,a.id LIMIT %s OFFSET %s',
                        [*values, pageSize, (page - 1) * pageSize]).fetchall()
    return dict(items=[application_dto(r, current_attempt(conn, r)) for r in rows],
                totalCount=total, page=page, pageSize=pageSize)


def applicant_filters(user, postingId, status, stageId, collegeCode, deptCode, grade, q):
    condition, values = scope_condition(user)
    where = [condition]
    if postingId:
        where.append('a.posting_id=%s')
        values.append(postingId)
    if status:
        where.append('a.status=%s')
        values.append(status)
    if stageId:
        where.append("a.current_stage_id=%s AND a.status='IN_PROGRESS'")
        values.append(stageId)
    # 대학·학과는 코드 쌍으로 건다. 학과명 매칭은 하지 않는다(CLAUDE.md 규칙 7).
    if collegeCode:
        where.append('s.college_code=%s')
        values.append(collegeCode)
    if deptCode:
        where.append('s.dept_code=%s')
        values.append(deptCode)
    if grade:
        where.append('s.grade=%s')
        values.append(grade)
    if q and q.strip():
        where.append("concat_ws(' ',p.name,s.student_no) ILIKE %s")
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    return ' AND '.join(f'({x})' for x in where), values


APPLICANT_SELECT = '''SELECT a.*,p.alias,p.name AS person_name,st.name AS current_stage_name,
 (SELECT max(recorded_at) FROM dc.job_application_event e WHERE e.application_id=a.id) AS last_event_at
 FROM dc.job_application a JOIN dc.person p ON p.intg_uid=a.student_uid
 JOIN dc.student s ON s.intg_uid=a.student_uid
 LEFT JOIN dc.job_stage st ON (st.posting_id,st.id)=(a.posting_id,a.current_stage_id)'''


@router.get('/job-applications')
def applications(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                 postingId: str | None = None, status: str | None = None, stageId: str | None = None,
                 collegeCode: str | None = None, deptCode: str | None = None, grade: int | None = None,
                 q: str = Query('', max_length=200),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_manage(conn, user, APPLICANT_MENU)
    condition, values = applicant_filters(user, postingId, status, stageId, collegeCode, deptCode, grade, q)
    total = conn.execute(f'''SELECT count(*) AS n FROM dc.job_application a
      JOIN dc.person p ON p.intg_uid=a.student_uid JOIN dc.student s ON s.intg_uid=a.student_uid
      WHERE {condition}''', values).fetchone()['n']
    rows = conn.execute(APPLICANT_SELECT + f' WHERE {condition} ORDER BY a.applied_at,a.id LIMIT %s OFFSET %s',
                        [*values, pageSize, (page - 1) * pageSize]).fetchall()
    return dict(items=[application_dto(r, current_attempt(conn, r)) for r in rows],
                totalCount=total, page=page, pageSize=pageSize)


@router.get('/job-applications/summary')
def application_summary(postingId: str | None = None, status: str | None = None, stageId: str | None = None,
                        collegeCode: str | None = None, deptCode: str | None = None, grade: int | None = None,
                        q: str = Query('', max_length=200),
                        user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """집계는 SQL 이 한다(CLAUDE.md 규칙 10). 목록과 같은 필터·같은 범위 술어를 쓴다 —
    직원이 보는 수는 언제나 인가된 집합의 크기다."""
    require_manage(conn, user, APPLICANT_MENU)
    condition, values = applicant_filters(user, postingId, None, stageId, collegeCode, deptCode, grade, q)
    summary = conn.execute(f'''SELECT count(*)::int AS total,
      count(*) FILTER(WHERE a.status IN ('APPLIED','IN_PROGRESS'))::int AS open,
      count(*) FILTER(WHERE a.status='APPLIED')::int AS applied,
      count(*) FILTER(WHERE a.status='IN_PROGRESS')::int AS "inProgress",
      count(*) FILTER(WHERE a.status='PASSED')::int AS passed,
      count(*) FILTER(WHERE a.status='REJECTED')::int AS rejected,
      count(*) FILTER(WHERE a.status='CANCELED')::int AS canceled
      FROM dc.job_application a JOIN dc.person p ON p.intg_uid=a.student_uid
      JOIN dc.student s ON s.intg_uid=a.student_uid WHERE {condition}''', values).fetchone()
    stages = conn.execute(f'''SELECT a.current_stage_id AS "stageId",count(*)::int AS count
      FROM dc.job_application a JOIN dc.person p ON p.intg_uid=a.student_uid
      JOIN dc.student s ON s.intg_uid=a.student_uid
      WHERE {condition} AND a.status='IN_PROGRESS' AND a.current_stage_id IS NOT NULL
      GROUP BY a.current_stage_id''', values).fetchall()
    return {**summary, 'stages': stages, 'scope': '담당 범위의 학생만 집계합니다.'}


CSV_HEADER = ['공고명', '회사명', '이름', '학번', '대학', '학과', '학년', '학적구분', '진단유형',
              '제출 서류', '현재 전형', '상태', '지원일', '최종 변경일']
STATUS_LABEL = {'APPLIED': '지원 완료', 'IN_PROGRESS': '전형 진행', 'PASSED': '최종 합격',
                'REJECTED': '탈락', 'CANCELED': '지원 취소'}


def csv_cell(value):
    text = '' if value is None else str(value)
    # 수식 주입 무력화 — 엑셀이 = + - @ 로 시작하는 셀을 계산식으로 읽는다.
    if text[:1] in ('=', '+', '-', '@'):
        text = "'" + text
    return '"' + text.replace('"', '""') + '"'


@router.get('/job-applications/export')
def export_applications(postingId: str | None = None, status: str | None = None, stageId: str | None = None,
                        collegeCode: str | None = None, deptCode: str | None = None, grade: int | None = None,
                        q: str = Query('', max_length=200),
                        user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_manage(conn, user, APPLICANT_MENU)
    condition, values = applicant_filters(user, postingId, status, stageId, collegeCode, deptCode, grade, q)
    rows = conn.execute(f'''SELECT j.role,j.company_name_snapshot,p.name,s.student_no,
      t.snap_college_label,t.snap_dept_label,t.snap_major_label,t.snap_grade,t.snap_enrollment_status,
      t.snap_student_type,t.attachment_kind,f.original_name,st.name AS stage_name,a.status,a.applied_at,
      (SELECT max(recorded_at) FROM dc.job_application_event e WHERE e.application_id=a.id) AS last_event_at
      FROM dc.job_application a JOIN dc.person p ON p.intg_uid=a.student_uid
      JOIN dc.student s ON s.intg_uid=a.student_uid JOIN dc.job_posting j ON j.id=a.posting_id
      LEFT JOIN dc.job_application_attempt t ON (t.application_id,t.attempt_no)=(a.id,a.current_attempt_no)
      LEFT JOIN dc.file_object f ON f.id=t.attachment_file_id
      LEFT JOIN dc.job_stage st ON (st.posting_id,st.id)=(a.posting_id,a.current_stage_id)
      WHERE {condition} ORDER BY a.applied_at,a.id''', values).fetchall()
    lines = [','.join(csv_cell(h) for h in CSV_HEADER)]
    for r in rows:
        attachment = ''
        if r['attachment_kind'] == 'RESUME_FILE':
            attachment = '개별 이력서' + (' · ' + r['original_name'] if r['original_name'] else '')
        elif r['attachment_kind'] == 'PORTFOLIO':
            attachment = '드림캐치 포트폴리오'
        lines.append(','.join(csv_cell(v) for v in [
            r['role'], r['company_name_snapshot'], r['name'], r['student_no'],
            # 조직 코드가 없는 학생은 빈칸이다. 이름으로 유추해 채우지 않는다(CLAUDE.md 규칙 7).
            r['snap_college_label'] or '', r['snap_dept_label'] or r['snap_major_label'] or '',
            f"{r['snap_grade']}학년" if r['snap_grade'] else '', r['snap_enrollment_status'] or '',
            r['snap_student_type'] or '', attachment,
            r['stage_name'] or STATUS_LABEL.get(r['status'], r['status']),
            STATUS_LABEL.get(r['status'], r['status']),
            r['applied_at'].astimezone(SEOUL).date().isoformat() if r['applied_at'] else '',
            r['last_event_at'].astimezone(SEOUL).date().isoformat() if r['last_event_at'] else '']))
    body = '\n'.join(lines)
    conn.execute('''INSERT INTO dc.job_access_event(actor_uid,action,target_kind,target_id,filter_hash,row_count)
      VALUES(%s,'EXPORT_CSV','JOB_APPLICATION',%s,%s,%s)''',
      (user['intg_uid'], postingId, hashlib.sha256(repr(values).encode()).hexdigest(), len(rows)))
    # 엑셀이 UTF-8 로 읽도록 BOM 을 붙인다.
    return Response(chr(0xFEFF) + body, media_type='text/csv; charset=utf-8',
                    headers={'Content-Disposition': 'attachment; filename="job-applicants.csv"'})


@router.get('/job-applications/{application_id}')
def application_detail(application_id: str, user=Depends(principal, scope='function'),
                       conn=Depends(connection, scope='function')):
    row = get_application(conn, user, application_id)
    posting = get_posting(conn, row['posting_id'], include_deleted=True)
    result = application_dto(row, current_attempt(conn, row))
    result['posting'] = {'id': posting['id'], 'company': posting['company_name_snapshot'],
                         'role': posting['role'], 'version': posting['version']}
    result['stages'] = [stage_dto(s) for s in flow_stages(conn, row['posting_id'])]
    return result


@router.get('/job-applications/{application_id}/events')
def application_events(application_id: str, attemptNo: int | None = None, page: int = Query(1, ge=1),
                       pageSize: int = Query(50, ge=1, le=100),
                       user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    get_application(conn, user, application_id)
    where, values = ['application_id=%s'], [application_id]
    if attemptNo:
        where.append('attempt_no=%s')
        values.append(attemptNo)
    condition = ' AND '.join(where)
    total = conn.execute('SELECT count(*) AS n FROM dc.job_application_event WHERE ' + condition,
                         values).fetchone()['n']
    rows = conn.execute(f'''SELECT id,seq,attempt_no AS "attemptNo",action,from_status AS "fromStatus",
      to_status AS "toStatus",from_stage_id AS "fromStageId",to_stage_id AS "toStageId",
      from_stage_name AS "fromStageName",to_stage_name AS "toStageName",reason,
      actor_name_snapshot AS "byName",COALESCE(occurred_at,recorded_at) AS at
      FROM dc.job_application_event WHERE {condition} ORDER BY seq LIMIT %s OFFSET %s''',
      [*values, pageSize, (page - 1) * pageSize]).fetchall()
    return dict(items=rows, totalCount=total, page=page, pageSize=pageSize)


class TransitionBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=1)
    reason: str = Field(default='', max_length=2000)


def transition(conn, user, application_id, intent, body):
    """advance/reject/cancel 만 받는다. 임의 targetStage·status 를 PATCH 로 받지 않는다."""
    if intent == 'cancel':
        if user['kind'] != 'STUDENT':
            raise HTTPException(403, '학생 본인만 지원을 취소할 수 있습니다.')
    else:
        require_manage(conn, user, APPLICANT_MENU)
    # 부모(공고)를 먼저 잠근다 — 단계 편집과 진행을 직렬화한다.
    application = get_application(conn, user, application_id)
    get_posting(conn, application['posting_id'], lock=True, include_deleted=True)
    application = get_application(conn, user, application_id, lock=True)
    if application['version'] != body.expectedVersion:
        raise HTTPException(409, '다른 사용자가 변경했습니다. 새로 조회한 뒤 다시 시도해 주세요.')
    if application['status'] not in OPEN_STATUSES:
        raise HTTPException(409, '이미 종료된 지원입니다.')
    stages = flow_stages(conn, application['posting_id'], lock=True)
    current = next((s for s in stages if s['id'] == application['current_stage_id']), None)
    fields = {'from_status': application['status'], 'from_stage_id': application['current_stage_id'],
              'from_stage_name': current['name'] if current else None, 'reason': body.reason}
    if intent == 'advance':
        if not stages:
            raise HTTPException(409, '전형 단계가 없습니다. 먼저 단계를 정의해 주세요.')
        index = next((i for i, s in enumerate(stages) if s['id'] == application['current_stage_id']), -1)
        if index >= len(stages) - 1 and index >= 0:
            row = conn.execute('''UPDATE dc.job_application SET status='PASSED',version=version+1,updated_at=now(),
              updated_by=%s WHERE id=%s RETURNING *''', (user['intg_uid'], application_id)).fetchone()
            action, fields['to_status'] = 'PASS', 'PASSED'
        else:
            target = stages[index + 1]
            row = conn.execute('''UPDATE dc.job_application SET status='IN_PROGRESS',current_stage_id=%s,
              version=version+1,updated_at=now(),updated_by=%s WHERE id=%s RETURNING *''',
              (target['id'], user['intg_uid'], application_id)).fetchone()
            action, fields['to_status'] = 'ADVANCE', 'IN_PROGRESS'
            fields['to_stage_id'], fields['to_stage_name'] = target['id'], target['name']
    elif intent == 'reject':
        row = conn.execute('''UPDATE dc.job_application SET status='REJECTED',version=version+1,updated_at=now(),
          updated_by=%s WHERE id=%s RETURNING *''', (user['intg_uid'], application_id)).fetchone()
        action, fields['to_status'] = 'REJECT', 'REJECTED'
    else:
        row = conn.execute('''UPDATE dc.job_application SET status='CANCELED',canceled_at=now(),
          current_stage_id=NULL,version=version+1,updated_at=now(),updated_by=%s WHERE id=%s RETURNING *''',
          (user['intg_uid'], application_id)).fetchone()
        action, fields['to_status'] = 'CANCEL', 'CANCELED'
    application_event(conn, user, row, action, row['current_attempt_no'], **fields)
    fresh = conn.execute(APPLICATION_SELECT + ' WHERE a.id=%s', (application_id,)).fetchone()
    return application_dto(fresh, current_attempt(conn, fresh))


@router.post('/job-applications/{application_id}/advance')
def advance(application_id: str, body: TransitionBody, user=Depends(principal, scope='function'),
            conn=Depends(connection, scope='function')):
    return transition(conn, user, application_id, 'advance', body)


@router.post('/job-applications/{application_id}/reject')
def reject(application_id: str, body: TransitionBody, user=Depends(principal, scope='function'),
           conn=Depends(connection, scope='function')):
    return transition(conn, user, application_id, 'reject', body)


@router.post('/job-applications/{application_id}/cancel')
def cancel(application_id: str, body: TransitionBody, user=Depends(principal, scope='function'),
           conn=Depends(connection, scope='function')):
    return transition(conn, user, application_id, 'cancel', body)


# ── 찜 ──────────────────────────────────────────────────────────────────

@router.get('/job-wishlist')
def wishlist(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 조회할 수 있습니다.')
    rows = conn.execute('''SELECT w.posting_id,j.deleted_at FROM dc.job_wishlist w
      JOIN dc.job_posting j ON j.id=w.posting_id WHERE w.student_uid=%s
      ORDER BY w.created_at DESC,w.posting_id''', (user['intg_uid'],)).fetchall()
    return {'items': [r['posting_id'] for r in rows if not r['deleted_at']],
            'unavailableCount': sum(1 for r in rows if r['deleted_at'])}


@router.put('/job-wishlist/{posting_id}')
def save_wish(posting_id: str, user=Depends(principal, scope='function'),
              conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 저장할 수 있습니다.')
    get_posting(conn, posting_id)
    conn.execute('INSERT INTO dc.job_wishlist(student_uid,posting_id) VALUES(%s,%s) ON CONFLICT DO NOTHING',
                 (user['intg_uid'], posting_id))
    return {'postingId': posting_id, 'saved': True}


@router.delete('/job-wishlist/{posting_id}')
def remove_wish(posting_id: str, user=Depends(principal, scope='function'),
                conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 해제할 수 있습니다.')
    conn.execute('DELETE FROM dc.job_wishlist WHERE student_uid=%s AND posting_id=%s',
                 (user['intg_uid'], posting_id))
    return {'postingId': posting_id, 'saved': False}


# ── 자기소개서 ──────────────────────────────────────────────────────────

def resume_dto(row, with_content=True):
    result = {'id': row['id'], 'title': row['title'], 'company': row['company_text'] or '',
              'jobType': row['job_type_text'] or '', 'position': row['position_text'] or '',
              'categoryCode': row['category_code'], 'categoryLabel': row.get('category_label')
              or row['category_label_legacy'] or '', 'origin': row['origin'],
              'createdAt': row['created_at'], 'updatedAt': row['updated_at'], 'version': row['version']}
    if with_content:
        result['content'] = row['content']
    return result


RESUME_SELECT = '''SELECT r.*,c.label AS category_label FROM dc.job_resume r
 LEFT JOIN dc.code_item c ON (c.group_code,c.code)=('JOB_RESUME_CATEGORY',r.category_code)'''


class ResumeBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    company: str = Field(default='', max_length=200)
    jobType: str = Field(default='', max_length=100)
    position: str = Field(default='', max_length=100)
    categoryCode: str | None = Field(default=None, max_length=64)
    content: str = Field(default='', max_length=100000)


class ResumeUpdate(ResumeBody):
    expectedVersion: int = Field(ge=1)


@router.get('/job-resumes')
def list_resumes(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """본인 자소서만. 직원은 학생의 개인 자소서 목록에 접근하지 않는다 —
    업무에 필요한 것은 지원 회차에 제출된 서류뿐이다."""
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 조회할 수 있습니다.')
    rows = conn.execute(RESUME_SELECT + ''' WHERE r.student_uid=%s AND r.deleted_at IS NULL
      ORDER BY r.updated_at DESC,r.id''', (user['intg_uid'],)).fetchall()
    return {'items': [resume_dto(r) for r in rows], 'totalCount': len(rows)}


def get_resume(conn, user, resume_id, lock=False):
    row = conn.execute(RESUME_SELECT + ' WHERE r.id=%s AND r.deleted_at IS NULL'
                       + (' FOR UPDATE OF r' if lock else ''), (resume_id,)).fetchone()
    if not row or row['student_uid'] != user['intg_uid']:
        raise HTTPException(404, '자기소개서를 찾을 수 없습니다.')
    return row


def resume_event(conn, user, resume_id, action, changed):
    seq = conn.execute('SELECT COALESCE(max(seq),0)+1 AS n FROM dc.job_resume_event WHERE resume_id=%s',
                       (resume_id,)).fetchone()['n']
    conn.execute('''INSERT INTO dc.job_resume_event(resume_id,seq,action,changed_fields,actor_uid)
      VALUES(%s,%s,%s,%s,%s)''', (resume_id, seq, action, changed, user['intg_uid']))


@router.post('/job-resumes', status_code=201)
def create_resume(body: ResumeBody, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 작성할 수 있습니다.')
    check_code(conn, 'JOB_RESUME_CATEGORY', body.categoryCode, '자기소개서 분야')
    resume_id = 'res_' + uuid4().hex[:12]
    conn.execute('''INSERT INTO dc.job_resume(id,student_uid,title,company_text,job_type_text,position_text,
      category_code,content,origin,created_by,updated_by) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,'USER',%s,%s)''',
      (resume_id, user['intg_uid'], body.title, body.company or None, body.jobType or None,
       body.position or None, body.categoryCode, body.content, user['intg_uid'], user['intg_uid']))
    resume_event(conn, user, resume_id, 'CREATE', [])
    return resume_dto(get_resume(conn, user, resume_id))


@router.get('/job-resumes/{resume_id}')
def resume_detail(resume_id: str, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    return resume_dto(get_resume(conn, user, resume_id))


@router.patch('/job-resumes/{resume_id}')
def update_resume(resume_id: str, body: ResumeUpdate, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    check_code(conn, 'JOB_RESUME_CATEGORY', body.categoryCode, '자기소개서 분야')
    before = get_resume(conn, user, resume_id, lock=True)
    if before['version'] != body.expectedVersion:
        raise HTTPException(409, '다른 창에서 먼저 저장했습니다. 새로 조회한 뒤 수정해 주세요.')
    changed = [name for name, value in (('title', body.title), ('company', body.company or None),
               ('jobType', body.jobType or None), ('position', body.position or None),
               ('categoryCode', body.categoryCode), ('content', body.content))
               if value != before[{'title': 'title', 'company': 'company_text', 'jobType': 'job_type_text',
                                   'position': 'position_text', 'categoryCode': 'category_code',
                                   'content': 'content'}[name]]]
    # createdAt 은 수정에서 유지한다 — 목록 정렬이 작성 시점을 잃지 않게.
    conn.execute('''UPDATE dc.job_resume SET title=%s,company_text=%s,job_type_text=%s,position_text=%s,
      category_code=%s,content=%s,version=version+1,updated_at=now(),updated_by=%s WHERE id=%s''',
      (body.title, body.company or None, body.jobType or None, body.position or None,
       body.categoryCode, body.content, user['intg_uid'], resume_id))
    resume_event(conn, user, resume_id, 'UPDATE', changed)
    return resume_dto(get_resume(conn, user, resume_id))


@router.delete('/job-resumes/{resume_id}')
def delete_resume(resume_id: str, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    get_resume(conn, user, resume_id, lock=True)
    conn.execute('UPDATE dc.job_resume SET deleted_at=now(),deleted_by=%s,version=version+1 WHERE id=%s',
                 (user['intg_uid'], resume_id))
    resume_event(conn, user, resume_id, 'DELETE', [])
    return {'id': resume_id, 'deleted': True}


# ── 파일 ────────────────────────────────────────────────────────────────

@router.post('/job-files', status_code=201)
async def upload(request: Request, slot: str = Query(pattern='^(LOGO|ATTACHMENT|RESUME)$'),
                 name: str = Query(min_length=1, max_length=300),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """바이트를 그대로 받는다(multipart 의존을 늘리지 않는다). 소유자는 저장·신청 때 확정한다.

    본문은 files.read_body 가 한도까지만 읽는다 — request.body() 로 통째로 받으면
    크기 검사가 이미 다 읽은 뒤에 돌아, 인증된 사용자가 컨테이너 메모리를 넘길 수 있다.
    """
    if slot == 'RESUME':
        if user['kind'] != 'STUDENT':
            raise HTTPException(403, '학생 본인만 지원 서류를 올릴 수 있습니다.')
    else:
        require_manage(conn, user)
    return files.file_dto(files.store(conn, user, slot, name, await files.read_body(request)))


@router.get('/job-files/{file_id}')
def download(file_id: str, user=Depends(principal, scope='function'),
             conn=Depends(connection, scope='function')):
    """소유·범위를 확인한 뒤 스트리밍한다. 정적 서빙 경로는 없다."""
    row = files.get_file(conn, file_id)
    if row['owner_id'] is None:
        # 아직 귀속되지 않은 예약 파일 — 올린 본인만 볼 수 있다.
        if row['uploaded_by'] != user['intg_uid']:
            raise HTTPException(404, '파일을 찾을 수 없습니다.')
    elif row['owner_kind'] == 'JOB_POSTING':
        get_posting(conn, row['owner_id'])
    else:
        owner = conn.execute('''SELECT a.* FROM dc.job_application_attempt t
          JOIN dc.job_application a ON a.id=t.application_id WHERE t.id=%s''', (row['owner_id'],)).fetchone()
        if not owner:
            raise HTTPException(404, '파일을 찾을 수 없습니다.')
        if user['kind'] == 'STUDENT':
            if owner['student_uid'] != user['intg_uid']:
                raise HTTPException(404, '파일을 찾을 수 없습니다.')
        else:
            require_manage(conn, user, APPLICANT_MENU)
            if not conn.execute('SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',
                                (user['intg_uid'], owner['student_uid'])).fetchone():
                raise HTTPException(404, '파일을 찾을 수 없습니다.')
            conn.execute('''INSERT INTO dc.job_access_event(actor_uid,action,target_kind,target_id,
              filter_hash,row_count) VALUES(%s,'VIEW_DOCUMENT','FILE',%s,%s,1)''',
              (user['intg_uid'], file_id, hashlib.sha256(file_id.encode()).hexdigest()))
    path = files.location(file_id)
    if not path.is_file():
        raise HTTPException(404, '파일 본문이 없습니다.')
    # 파일명은 RFC 5987 로 퍼센트 인코딩한다 — 헤더는 latin-1 만 실을 수 있다.
    return Response(path.read_bytes(), media_type=row['content_type'],
                    headers={'Content-Disposition': "attachment; filename*=UTF-8''"
                             + quote(files.safe_name(row['original_name']))})
