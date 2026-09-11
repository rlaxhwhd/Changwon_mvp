"""성장활동 — 학생이 쓴 자료 한 벌과 그 자료를 읽는 화면들.

성장 홈·성장일지·포트폴리오·상담사 학생상세가 **같은 행**을 읽는다. 지금까지는 각자 다른
저장소(학생별 localStorage · 학생별 JSON · 전 학생 공통 상수 · 화면 useState)를 봐서
학생이 고친 내용이 상담사에게 보이지 않았다.

이 모듈이 하지 않는 것 — 정책이 없기 때문이다(04-decisions Q3).
  · 오늘 미션 채점·퀘스트·XP·레벨·랭킹: 문항·채점·보상 규칙이 전부 화면 상수다.
  · STAR 선발·마일리지·장학 판정: DB.md #29·#30 미결. 기존 payload 를 **읽기만** 한다.
  · 채용 포트폴리오 제출: 제출 항목·열람자 정책이 없다. jobs 는 계속 503 이다.
없는 정책을 임시 판정 로직으로 채우지 않는다(CLAUDE.md 14조).
"""
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator

from . import files
from .auth import principal
from .db import connection
from .jobs import idempotent, remember
from .roadmap import fail, has_menu

router = APIRouter()
VIEW_MENU = 'students.0'
KINDS = ('RECORD', 'JOURNAL', 'PROJECT', 'SKILL', 'CERTIFICATE', 'LANGUAGE', 'AWARD')
ENTRY_COLUMNS = ('kind_code,category_code,title,occurred_on,date_text,date_precision,tags,content,'
                 'bookmarked,resume_used,cert_id')


# ── 접근 ────────────────────────────────────────────────────────────────

def resolve_student(conn, user, identity):
    """본인이거나, 학생 상세 메뉴와 담당 범위를 모두 통과한 교직원."""
    student = conn.execute('''SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE p.alias=%s OR s.intg_uid=%s''', (identity, identity)).fetchone()
    if not student:
        fail(404, 'NOT_FOUND', '학생을 찾을 수 없습니다.')
    if user['kind'] == 'STUDENT':
        if user['intg_uid'] != student['intg_uid']:
            fail(404, 'NOT_FOUND', '학생을 찾을 수 없습니다.')
        return student, True
    if not has_menu(conn, user, VIEW_MENU):
        fail(403, 'MENU_DENIED', '학생 상세 열람 권한이 없습니다.')
    if not conn.execute('SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',
                        (user['intg_uid'], student['intg_uid'])).fetchone():
        fail(404, 'NOT_FOUND', '학생을 찾을 수 없습니다.')
    return student, False


def require_owner(owner, action='이 작업'):
    if not owner:
        fail(403, 'SCOPE_DENIED', f'{action}은 학생 본인만 할 수 있습니다.')


# ── 프로필 ───────────────────────────────────────────────────────────────

def profile_row(conn, uid, lock=False):
    return conn.execute('SELECT * FROM dc.growth_profile WHERE student_uid=%s'
                        + (' FOR UPDATE' if lock else ''), (uid,)).fetchone()


def profile_dto(student, row, owner):
    # 학사 유래 값은 학생 레코드에서 온다. 여기서 만들지 않는다(CLAUDE.md 1조).
    detail = student['detail'] or {}
    data = {'name': student['name'], 'studentNo': student['student_no'], 'school': '국립창원대학교',
            'dept': student['major_label'], 'grade': student['grade'], 'gpa': detail.get('gpa'),
            'intro': row['intro'] if row else '', 'version': row['version'] if row else 0}
    # 자기입력 연락처는 본인 전용으로 시작한다. 교직원 화면에 새로 열지 않는다(D06).
    data['email'] = (row['contact_email'] if row else None) if owner else None
    data['phone'] = (row['contact_phone'] if row else None) if owner else None
    return data


def ensure_profile(conn, user, uid, expected_version, transaction_id):
    """최초 쓰기는 학생 키의 advisory lock 을 먼저 잡아 두 프로필이 생기는 경쟁을 막는다."""
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('growth:' + uid,))
    row = profile_row(conn, uid, lock=True)
    if row:
        if expected_version is not None and row['version'] != expected_version:
            fail(409, 'VERSION_CONFLICT', '프로필이 변경됐습니다.', currentVersion=row['version'])
        return row
    if expected_version not in (None, 0):
        fail(409, 'VERSION_CONFLICT', '프로필이 아직 없습니다.', currentVersion=0)
    row = conn.execute('''INSERT INTO dc.growth_profile(student_uid,updated_by) VALUES(%s,%s) RETURNING *''',
                       (uid, user['intg_uid'])).fetchone()
    conn.execute('''INSERT INTO dc.growth_event(student_uid,action,profile_version_after,after_value,
      actor_uid,transaction_id) VALUES(%s,'PROFILE_CREATE',%s,%s,%s,%s)''',
      (uid, row['version'], Jsonb({'intro': ''}), user['intg_uid'], transaction_id))
    return row


class ProfileBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=0)
    intro: str = Field(default='', max_length=5000)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=40)


@router.get('/students/{identity}/growth/profile')
def get_profile(identity: str, user=Depends(principal, scope='function'),
                conn=Depends(connection, scope='function')):
    student, owner = resolve_student(conn, user, identity)
    # 읽기가 행을 만들지 않는다. 미생성은 version=0 으로 표현한다.
    return {**profile_dto(student, profile_row(conn, student['intg_uid']), owner),
            'capabilities': {'canEdit': owner}}


@router.patch('/students/{identity}/growth/profile')
def update_profile(identity: str, body: ProfileBody, idempotency_key: str = Header(min_length=8, max_length=200),
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    route = 'PATCH /students/growth/profile'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    student, owner = resolve_student(conn, user, identity)
    require_owner(owner, '프로필 수정')
    uid = student['intg_uid']
    transaction_id = uuid4()
    before = ensure_profile(conn, user, uid, body.expectedVersion, transaction_id)
    row = conn.execute('''UPDATE dc.growth_profile SET intro=%s,contact_email=%s,contact_phone=%s,
      version=version+1,updated_at=now(),updated_by=%s WHERE student_uid=%s RETURNING *''',
      (body.intro, body.email or None, body.phone or None, user['intg_uid'], uid)).fetchone()
    conn.execute('''INSERT INTO dc.growth_event(student_uid,action,profile_version_before,
      profile_version_after,before_value,after_value,actor_uid,transaction_id)
      VALUES(%s,'PROFILE_UPDATE',%s,%s,%s,%s,%s,%s)''',
      (uid, before['version'], row['version'],
       Jsonb({'intro': before['intro'], 'email': before['contact_email'], 'phone': before['contact_phone']}),
       Jsonb({'intro': row['intro'], 'email': row['contact_email'], 'phone': row['contact_phone']}),
       user['intg_uid'], transaction_id))
    return remember(conn, user, route, idempotency_key, digest,
                    {**profile_dto(student, row, owner), 'capabilities': {'canEdit': True}})


# ── 자료 ─────────────────────────────────────────────────────────────────
# 종류마다 본문 계약이 다르다. extra=forbid 라 알 수 없는 키는 거부된다 —
# payload 에 owner·verified·score 같은 권한 필드를 섞을 수 없다.

class Content(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class RecordContent(Content):
    description: str = Field(default='', max_length=10000)


class JournalContent(Content):
    desc: str = Field(default='', max_length=10000)
    situation: str = Field(default='', max_length=10000)
    role: str = Field(default='', max_length=10000)
    action: str = Field(default='', max_length=10000)
    result: str = Field(default='', max_length=10000)
    learning: str = Field(default='', max_length=10000)
    resumeMemo: str = Field(default='', max_length=10000)


class ProjectContent(Content):
    role: str = Field(default='', max_length=200)
    periodText: str = Field(default='', max_length=100)
    stack: list[str] = Field(default_factory=list, max_length=30)
    description: str = Field(default='', max_length=10000)
    result: str = Field(default='', max_length=10000)
    link: str | None = Field(default=None, max_length=2000)

    @model_validator(mode='after')
    def url(self):
        if self.link and not self.link.startswith(('http://', 'https://')):
            raise ValueError('링크는 http 또는 https 로 시작해야 합니다.')
        return self


class SkillContent(Content):
    # 자기평가 수준이다. AI·진단 점수가 아니다.
    level: int = Field(ge=1, le=5)


class CertificateContent(Content):
    issuer: str = Field(default='', max_length=200)
    certificateNumber: str | None = Field(default=None, max_length=100)
    scoreText: str | None = Field(default=None, max_length=100)
    description: str = Field(default='', max_length=10000)


class LanguageContent(Content):
    language: str = Field(default='', max_length=100)
    testName: str = Field(default='', max_length=100)
    scoreText: str = Field(default='', max_length=100)
    issuer: str | None = Field(default=None, max_length=200)
    description: str = Field(default='', max_length=10000)


class AwardContent(Content):
    rank: str = Field(default='', max_length=100)
    host: str = Field(default='', max_length=200)
    description: str = Field(default='', max_length=10000)


CONTENTS = {'RECORD': RecordContent, 'JOURNAL': JournalContent, 'PROJECT': ProjectContent,
            'SKILL': SkillContent, 'CERTIFICATE': CertificateContent, 'LANGUAGE': LanguageContent,
            'AWARD': AwardContent}


class EntryBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    kind: str = Field(pattern='^(RECORD|JOURNAL|PROJECT|SKILL|CERTIFICATE|LANGUAGE|AWARD)$')
    title: str = Field(min_length=1, max_length=200)
    categoryCode: str | None = Field(default=None, max_length=64)
    occurredOn: str | None = Field(default=None, max_length=10)
    dateText: str | None = Field(default=None, max_length=100)
    datePrecision: str = Field(default='UNKNOWN', pattern='^(DAY|MONTH|YEAR|RANGE|UNKNOWN)$')
    tags: list[str] = Field(default_factory=list, max_length=20)
    content: dict = Field(default_factory=dict)
    bookmarked: bool = False
    resumeUsed: bool = False
    certId: str | None = Field(default=None, max_length=64)
    expectedProfileVersion: int = Field(ge=0)


class EntryUpdate(EntryBody):
    expectedVersion: int = Field(ge=1)


class EntryDelete(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expectedVersion: int = Field(ge=1)
    expectedProfileVersion: int = Field(ge=1)


def parsed_content(kind, raw):
    try:
        return CONTENTS[kind](**raw).model_dump()
    except Exception as error:
        fail(422, 'INVALID_FIELD', f'입력을 확인해 주세요: {error}')


def check_code(conn, group, code, label):
    if code and not conn.execute('SELECT 1 FROM dc.code_item WHERE group_code=%s AND code=%s AND is_active',
                                 (group, code)).fetchone():
        fail(422, 'INVALID_CODE', f'사용 가능한 {label}을(를) 선택해 주세요.')


CATEGORY_GROUP = {'JOURNAL': 'GROWTH_JOURNAL_CATEGORY', 'SKILL': 'GROWTH_SKILL_CATEGORY',
                  'RECORD': 'GROWTH_RECORD_CATEGORY'}


def entry_values(conn, body):
    group = CATEGORY_GROUP.get(body.kind)
    if body.categoryCode and not group:
        fail(422, 'INVALID_FIELD', '이 종류에는 분류를 지정할 수 없습니다.')
    check_code(conn, group, body.categoryCode, '분류')
    if body.certId and body.kind != 'CERTIFICATE':
        fail(422, 'INVALID_FIELD', '자격 사전 연결은 자격증 항목에만 붙습니다.')
    if body.datePrecision == 'DAY' and not body.occurredOn:
        fail(422, 'INVALID_FIELD', '날짜를 입력해 주세요.')
    return (body.kind, body.categoryCode, body.title, body.occurredOn or None, body.dateText,
            body.datePrecision, body.tags, Jsonb(parsed_content(body.kind, body.content)),
            body.bookmarked, body.resumeUsed, body.certId)


def entry_dto(row, attachments=()):
    return {'id': row['id'], 'kind': row['kind_code'], 'categoryCode': row['category_code'],
            'title': row['title'], 'occurredOn': row['occurred_on'], 'dateText': row['date_text'],
            'datePrecision': row['date_precision'], 'tags': row['tags'], 'content': row['content'],
            'bookmarked': row['bookmarked'], 'resumeUsed': row['resume_used'], 'certId': row['cert_id'],
            'sourceKind': row['source_kind'], 'version': row['version'],
            'createdAt': row['created_at'], 'updatedAt': row['updated_at'], 'files': list(attachments)}


def attachments_of(conn, entry_ids):
    grouped = {entry_id: [] for entry_id in entry_ids}
    if entry_ids:
        for row in conn.execute('''SELECT l.entry_id,f.* FROM dc.growth_entry_file l
          JOIN dc.file_object f ON f.id=l.file_id WHERE l.entry_id=ANY(%s) AND l.unlinked_at IS NULL
          AND f.state='READY' ORDER BY l.entry_id,l.position,l.id''', (entry_ids,)).fetchall():
            grouped[row['entry_id']].append(files.file_dto(row, '/api/v1/growth-files/'))
    return grouped


def get_entry(conn, uid, entry_id, lock=False):
    row = conn.execute('''SELECT * FROM dc.growth_entry WHERE student_uid=%s AND id=%s AND deleted_at IS NULL'''
                       + (' FOR UPDATE' if lock else ''), (uid, entry_id)).fetchone()
    if not row:
        fail(404, 'NOT_FOUND', '성장 자료를 찾을 수 없습니다.')
    return row


def growth_event(conn, user, uid, entry_id, action, before, after, versions, transaction_id, reason=''):
    conn.execute('''INSERT INTO dc.growth_event(student_uid,entry_id,action,entry_version_before,
      entry_version_after,profile_version_before,profile_version_after,before_value,after_value,reason,
      actor_uid,transaction_id) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
      (uid, entry_id, action, versions[0], versions[1], versions[2], versions[3],
       Jsonb(jsonable_encoder(before)) if before is not None else None,
       Jsonb(jsonable_encoder(after)), reason, user['intg_uid'], transaction_id))


def bump_profile(conn, user, uid):
    return conn.execute('''UPDATE dc.growth_profile SET version=version+1,updated_at=now(),updated_by=%s
      WHERE student_uid=%s RETURNING *''', (user['intg_uid'], uid)).fetchone()


@router.get('/students/{identity}/growth/entries')
def list_entries(identity: str, page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                 kind: str | None = None, categoryCode: str | None = None, tag: str | None = None,
                 bookmarked: str | None = None, q: str = Query('', max_length=200),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student, _ = resolve_student(conn, user, identity)
    where, values = ['student_uid=%s', 'deleted_at IS NULL'], [student['intg_uid']]
    if kind:
        where.append('kind_code=%s')
        values.append(kind)
    if categoryCode:
        where.append('category_code=%s')
        values.append(categoryCode)
    if tag:
        where.append('%s=ANY(tags)')
        values.append(tag)
    if bookmarked in ('true', 'false'):
        where.append('bookmarked' if bookmarked == 'true' else 'NOT bookmarked')
    if q.strip():
        # 본문 검색은 승인된 범위(제목·태그)만 본다. 비공개 메모까지 훑지 않는다.
        where.append("concat_ws(' ',title,array_to_string(tags,' ')) ILIKE %s")
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    condition = ' AND '.join(f'({x})' for x in where)
    total = conn.execute('SELECT count(*) AS n FROM dc.growth_entry WHERE ' + condition, values).fetchone()['n']
    rows = conn.execute(f'''SELECT * FROM dc.growth_entry WHERE {condition}
      ORDER BY occurred_on DESC NULLS LAST,updated_at DESC,id LIMIT %s OFFSET %s''',
      [*values, pageSize, (page - 1) * pageSize]).fetchall()
    grouped = attachments_of(conn, [r['id'] for r in rows])
    return dict(items=[entry_dto(r, grouped[r['id']]) for r in rows], totalCount=total,
                page=page, pageSize=pageSize)


@router.get('/students/{identity}/growth/entries/{entry_id}')
def entry_detail(identity: str, entry_id: str, user=Depends(principal, scope='function'),
                 conn=Depends(connection, scope='function')):
    student, _ = resolve_student(conn, user, identity)
    row = get_entry(conn, student['intg_uid'], entry_id)
    return entry_dto(row, attachments_of(conn, [entry_id])[entry_id])


@router.post('/students/{identity}/growth/entries', status_code=201)
def create_entry(identity: str, body: EntryBody, idempotency_key: str = Header(min_length=8, max_length=200),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    route = 'POST /students/growth/entries'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    student, owner = resolve_student(conn, user, identity)
    require_owner(owner, '성장 자료 작성')
    uid = student['intg_uid']
    transaction_id = uuid4()
    profile = ensure_profile(conn, user, uid, body.expectedProfileVersion, transaction_id)
    entry_id = 'gen_' + uuid4().hex[:16]
    row = conn.execute(f'''INSERT INTO dc.growth_entry(id,student_uid,{ENTRY_COLUMNS},source_kind,
      created_by,updated_by) VALUES(%s,%s,{",".join(["%s"] * 11)},'SELF_REPORTED',%s,%s) RETURNING *''',
      (entry_id, uid, *entry_values(conn, body), user['intg_uid'], user['intg_uid'])).fetchone()
    after = bump_profile(conn, user, uid)
    growth_event(conn, user, uid, entry_id, 'CREATE', None, entry_dto(row),
                 (None, row['version'], profile['version'], after['version']), transaction_id)
    return remember(conn, user, route, idempotency_key, digest, entry_dto(row))


@router.patch('/students/{identity}/growth/entries/{entry_id}')
def update_entry(identity: str, entry_id: str, body: EntryUpdate,
                 idempotency_key: str = Header(min_length=8, max_length=200),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    route = 'PATCH /students/growth/entries'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + entry_id + body.model_dump_json())
    if saved:
        return saved
    student, owner = resolve_student(conn, user, identity)
    require_owner(owner, '성장 자료 수정')
    uid = student['intg_uid']
    transaction_id = uuid4()
    profile = ensure_profile(conn, user, uid, body.expectedProfileVersion, transaction_id)
    before = get_entry(conn, uid, entry_id, lock=True)
    if before['version'] != body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '자료가 변경됐습니다.', currentVersion=before['version'])
    # 소유자와 종류는 바뀌지 않는다 — 바뀌면 다른 자료가 되고 이력이 끊긴다.
    if body.kind != before['kind_code']:
        fail(409, 'INVALID_TRANSITION', '자료의 종류는 바꿀 수 없습니다.')
    assignments = ','.join(f'{column}=%s' for column in ENTRY_COLUMNS.split(','))
    row = conn.execute(f'''UPDATE dc.growth_entry SET {assignments},version=version+1,updated_at=now(),
      updated_by=%s WHERE student_uid=%s AND id=%s RETURNING *''',
      (*entry_values(conn, body), user['intg_uid'], uid, entry_id)).fetchone()
    after = bump_profile(conn, user, uid)
    growth_event(conn, user, uid, entry_id, 'UPDATE', entry_dto(before), entry_dto(row),
                 (before['version'], row['version'], profile['version'], after['version']), transaction_id)
    return remember(conn, user, route, idempotency_key, digest,
                    entry_dto(row, attachments_of(conn, [entry_id])[entry_id]))


@router.post('/students/{identity}/growth/entries/{entry_id}/delete')
def delete_entry(identity: str, entry_id: str, body: EntryDelete,
                 idempotency_key: str = Header(min_length=8, max_length=200),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """논리삭제 + 사건이다. 제출·AI 입력에 쓰인 과거 본문이 사라지면 안 된다."""
    route = 'POST /students/growth/entries/delete'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + entry_id + body.model_dump_json())
    if saved:
        return saved
    student, owner = resolve_student(conn, user, identity)
    require_owner(owner, '성장 자료 삭제')
    uid = student['intg_uid']
    transaction_id = uuid4()
    profile = ensure_profile(conn, user, uid, body.expectedProfileVersion, transaction_id)
    before = get_entry(conn, uid, entry_id, lock=True)
    if before['version'] != body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '자료가 변경됐습니다.', currentVersion=before['version'])
    row = conn.execute('''UPDATE dc.growth_entry SET deleted_at=now(),deleted_by=%s,version=version+1
      WHERE student_uid=%s AND id=%s RETURNING *''', (user['intg_uid'], uid, entry_id)).fetchone()
    after = bump_profile(conn, user, uid)
    growth_event(conn, user, uid, entry_id, 'DELETE', entry_dto(before), {'deleted': True},
                 (before['version'], row['version'], profile['version'], after['version']), transaction_id)
    return remember(conn, user, route, idempotency_key, digest, {'deleted': True, 'id': entry_id})


@router.get('/students/{identity}/growth/summary')
def growth_summary(identity: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    """분류·태그·건수는 SQL 이 센다(CLAUDE.md 10조). 화면이 전체 배열을 받아 세지 않는다."""
    student, _ = resolve_student(conn, user, identity)
    uid = student['intg_uid']
    counts = conn.execute('''SELECT kind_code AS kind,count(*)::int AS n,
      count(*) FILTER(WHERE bookmarked)::int AS bookmarked FROM dc.growth_entry
      WHERE student_uid=%s AND deleted_at IS NULL GROUP BY kind_code''', (uid,)).fetchall()
    tags = conn.execute('''SELECT tag,count(*)::int AS n FROM dc.growth_entry,unnest(tags) AS tag
      WHERE student_uid=%s AND deleted_at IS NULL GROUP BY tag ORDER BY n DESC,tag LIMIT 20''',
      (uid,)).fetchall()
    by_kind = {kind: {'total': 0, 'bookmarked': 0} for kind in KINDS}
    for row in counts:
        by_kind[row['kind']] = {'total': row['n'], 'bookmarked': row['bookmarked']}
    return {'byKind': by_kind, 'total': sum(v['total'] for v in by_kind.values()), 'tags': tags}


@router.get('/students/{identity}/growth/events')
def growth_events(identity: str, page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                  user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student, owner = resolve_student(conn, user, identity)
    uid = student['intg_uid']
    total = conn.execute('SELECT count(*) AS n FROM dc.growth_event WHERE student_uid=%s', (uid,)).fetchone()['n']
    rows = conn.execute('''SELECT e.id,e.entry_id AS "entryId",e.action,e.created_at AS "createdAt",
      e.before_value AS "beforeValue",e.after_value AS "afterValue",p.name AS "actorName"
      FROM dc.growth_event e LEFT JOIN dc.person p ON p.intg_uid=e.actor_uid
      WHERE e.student_uid=%s ORDER BY e.created_at DESC,e.id LIMIT %s OFFSET %s''',
      (uid, pageSize, (page - 1) * pageSize)).fetchall()
    # 삭제 전 원문이 before/after 에 들어 있다. 교직원에게는 행위·시각·행위자만 준다(D06).
    items = rows if owner else [{k: v for k, v in row.items() if k not in ('beforeValue', 'afterValue')}
                                for row in rows]
    return dict(items=items, totalCount=total, page=page, pageSize=pageSize)


# ── 첨부 ─────────────────────────────────────────────────────────────────

@router.post('/growth-files', status_code=201)
async def upload_growth_file(request: Request, name: str = Query(max_length=300),
                             user=Depends(principal, scope='function'),
                             conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        fail(403, 'SCOPE_DENIED', '학생 본인만 첨부를 올릴 수 있습니다.')
    row = files.store(conn, user, 'PORTFOLIO_ATTACHMENT', name, await files.read_body(request))
    return files.file_dto(row, '/api/v1/growth-files/')


@router.get('/growth-files/{file_id}')
def download_growth_file(file_id: str, user=Depends(principal, scope='function'),
                         conn=Depends(connection, scope='function')):
    """소유·범위를 다시 확인한 뒤 스트리밍한다. 정적 서빙하지 않는다."""
    row = files.get_file(conn, file_id)
    if row['owner_kind'] != 'GROWTH_ENTRY':
        fail(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.')
    allowed = row['uploaded_by'] == user['intg_uid']
    if not allowed and row['owner_id']:
        owner = conn.execute('SELECT student_uid FROM dc.growth_entry WHERE id=%s', (row['owner_id'],)).fetchone()
        allowed = bool(owner) and (user['intg_uid'] == owner['student_uid'] or (
            has_menu(conn, user, VIEW_MENU) and conn.execute(
                'SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',
                (user['intg_uid'], owner['student_uid'])).fetchone()))
    if not allowed:
        fail(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.')
    return files.stream(row)


class FileLink(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    fileId: str = Field(min_length=1, max_length=64)
    expectedVersion: int = Field(ge=1)
    expectedProfileVersion: int = Field(ge=1)


@router.post('/students/{identity}/growth/entries/{entry_id}/files', status_code=201)
def link_file(identity: str, entry_id: str, body: FileLink,
              idempotency_key: str = Header(min_length=8, max_length=200),
              user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    route = 'POST /students/growth/entries/files'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + entry_id + body.model_dump_json())
    if saved:
        return saved
    student, owner = resolve_student(conn, user, identity)
    require_owner(owner, '첨부 연결')
    uid = student['intg_uid']
    transaction_id = uuid4()
    profile = ensure_profile(conn, user, uid, body.expectedProfileVersion, transaction_id)
    entry = get_entry(conn, uid, entry_id, lock=True)
    if entry['version'] != body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '자료가 변경됐습니다.', currentVersion=entry['version'])
    if conn.execute('''SELECT count(*) AS n FROM dc.growth_entry_file WHERE entry_id=%s
      AND unlinked_at IS NULL''', (entry_id,)).fetchone()['n'] >= 10:
        fail(422, 'INVALID_FIELD', '첨부는 항목당 10개까지입니다.')
    files.claim(conn, user, body.fileId, 'GROWTH_ENTRY', entry_id, 'PORTFOLIO_ATTACHMENT')
    conn.execute('''INSERT INTO dc.growth_entry_file(student_uid,entry_id,file_id,position,linked_by)
      VALUES(%s,%s,%s,(SELECT COALESCE(max(position),0)+1 FROM dc.growth_entry_file WHERE entry_id=%s),%s)''',
      (uid, entry_id, body.fileId, entry_id, user['intg_uid']))
    row = conn.execute('''UPDATE dc.growth_entry SET version=version+1,updated_at=now(),updated_by=%s
      WHERE student_uid=%s AND id=%s RETURNING *''', (user['intg_uid'], uid, entry_id)).fetchone()
    after = bump_profile(conn, user, uid)
    growth_event(conn, user, uid, entry_id, 'FILE_LINK', None, {'fileId': body.fileId},
                 (entry['version'], row['version'], profile['version'], after['version']), transaction_id)
    return remember(conn, user, route, idempotency_key, digest,
                    entry_dto(row, attachments_of(conn, [entry_id])[entry_id]))


@router.post('/students/{identity}/growth/entries/{entry_id}/files/{file_id}/unlink')
def unlink_file(identity: str, entry_id: str, file_id: str, body: FileLink,
                idempotency_key: str = Header(min_length=8, max_length=200),
                user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """연결을 끊어도 행을 지우지 않는다 — 언제 붙였다 뗐는지가 사실이다."""
    route = 'POST /students/growth/entries/files/unlink'
    digest, saved = idempotent(conn, user, route, idempotency_key,
                               identity + entry_id + file_id + body.model_dump_json())
    if saved:
        return saved
    student, owner = resolve_student(conn, user, identity)
    require_owner(owner, '첨부 해제')
    uid = student['intg_uid']
    transaction_id = uuid4()
    profile = ensure_profile(conn, user, uid, body.expectedProfileVersion, transaction_id)
    entry = get_entry(conn, uid, entry_id, lock=True)
    if entry['version'] != body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '자료가 변경됐습니다.', currentVersion=entry['version'])
    changed = conn.execute('''UPDATE dc.growth_entry_file SET unlinked_at=now(),unlinked_by=%s
      WHERE entry_id=%s AND file_id=%s AND unlinked_at IS NULL RETURNING id''',
      (user['intg_uid'], entry_id, file_id)).fetchone()
    if not changed:
        fail(404, 'NOT_FOUND', '연결된 첨부를 찾을 수 없습니다.')
    row = conn.execute('''UPDATE dc.growth_entry SET version=version+1,updated_at=now(),updated_by=%s
      WHERE student_uid=%s AND id=%s RETURNING *''', (user['intg_uid'], uid, entry_id)).fetchone()
    after = bump_profile(conn, user, uid)
    growth_event(conn, user, uid, entry_id, 'FILE_UNLINK', {'fileId': file_id}, {'unlinked': True},
                 (entry['version'], row['version'], profile['version'], after['version']), transaction_id)
    return remember(conn, user, route, idempotency_key, digest,
                    entry_dto(row, attachments_of(conn, [entry_id])[entry_id]))


# ── STAR · 추천 · 포트폴리오 ─────────────────────────────────────────────

@router.get('/students/{identity}/star-track')
def star_track(identity: str, user=Depends(principal, scope='function'),
               conn=Depends(connection, scope='function')):
    """기존 dc.star_track payload 를 그대로 읽는다.

    선발 자격·마일리지·인증 단계·장학 산식은 정책이 미확정이다(DB.md #29·#30).
    여기서 계산하지 않고 metricsStatus 로 미확정임을 밝힌다 — 화면은 null 을 0점이나
    탈락으로 바꾸지 않는다. 점수 쓰기 API 는 제공하지 않는다.
    """
    student, _ = resolve_student(conn, user, identity)
    row = conn.execute('SELECT payload FROM dc.star_track WHERE student_uid=%s',
                       (student['intg_uid'],)).fetchone()
    if not row:
        return {'record': None, 'selected': False, 'summary': None, 'metricsStatus': 'POLICY_PENDING'}
    # 이미 확인된 사실(단계 수)만 SQL 로 센다. 합격·장학을 유도하지 않는다.
    summary = conn.execute('''SELECT count(*)::int AS steps,
      count(*) FILTER(WHERE step->>'status'='done')::int AS done
      FROM dc.star_track t, jsonb_array_elements(COALESCE(t.payload->'axes','[]'::jsonb)) axis,
           jsonb_array_elements(COALESCE(axis->'steps','[]'::jsonb)) step
      WHERE t.student_uid=%s''', (student['intg_uid'],)).fetchone()
    return {'record': row['payload'], 'selected': True, 'summary': dict(summary),
            'metricsStatus': 'POLICY_PENDING'}


@router.get('/students/{identity}/growth/recommendations')
def recommendations(identity: str, user=Depends(principal, scope='function'),
                    conn=Depends(connection, scope='function')):
    """기존 ACTIVITY_RECO 산출물을 조회한다. 없는 결과를 시간 경과로 만들어 내지 않는다."""
    student, _ = resolve_student(conn, user, identity)
    run = conn.execute('''SELECT * FROM dc.ai_run WHERE student_uid=%s AND kind_code='ACTIVITY_RECO'
      ORDER BY created_at DESC,id LIMIT 1''', (student['intg_uid'],)).fetchone()
    if not run:
        return {'runId': None, 'model': None, 'items': [], 'available': False}
    rows = conn.execute('''SELECT category,title,detail AS reason,meta FROM dc.ai_suggestion
      WHERE run_id=%s ORDER BY position''', (run['id'],)).fetchall()
    return {'runId': run['id'], 'model': run['model'], 'createdAt': run['created_at'],
            'items': rows, 'available': True}


PORTFOLIO_KINDS = {'SKILL': 'skills', 'CERTIFICATE': 'certs', 'LANGUAGE': 'languages',
                   'AWARD': 'awards', 'PROJECT': 'projects', 'RECORD': 'records', 'JOURNAL': 'journals'}


@router.get('/students/{identity}/portfolio')
def portfolio(identity: str, user=Depends(principal, scope='function'),
              conn=Depends(connection, scope='function')):
    """마이페이지 포트폴리오와 상담사 학생상세가 **같은 projection** 을 읽는다.
    합성 연락처·전 학생 공통 상수(INITIAL_*)는 여기 없다 — 빈 값은 빈 값이다."""
    student, owner = resolve_student(conn, user, identity)
    uid = student['intg_uid']
    profile = profile_row(conn, uid)
    rows = conn.execute('''SELECT * FROM dc.growth_entry WHERE student_uid=%s AND deleted_at IS NULL
      ORDER BY occurred_on DESC NULLS LAST,updated_at DESC,id''', (uid,)).fetchall()
    grouped = attachments_of(conn, [r['id'] for r in rows])
    sections = {name: [] for name in PORTFOLIO_KINDS.values()}
    for row in rows:
        sections[PORTFOLIO_KINDS[row['kind_code']]].append(entry_dto(row, grouped[row['id']]))
    resumes = conn.execute('''SELECT id,title,company_text AS company,position_text AS position,
      category_code AS "categoryCode",category_label_legacy AS "categoryLabel",content,origin,
      updated_at AS "updatedAt",version FROM dc.job_resume WHERE student_uid=%s AND deleted_at IS NULL
      ORDER BY updated_at DESC,id''', (uid,)).fetchall()
    # 학사·기관이 확인한 취득 자격은 읽기 전용이다. 자기신고와 한 목록으로 합치지 않는다.
    academic = conn.execute('''SELECT c.cert_id AS "certId",c.label,c.issuer,sc.acquired_dt AS "acquiredAt",
      sc.cert_no AS "certNo",sc.verified FROM dc.student_cert sc JOIN dc.cert c USING(cert_id)
      WHERE sc.intg_uid=%s AND sc.acquired_dt IS NOT NULL ORDER BY sc.acquired_dt DESC,c.cert_id''',
      (uid,)).fetchall()
    return {'profile': profile_dto(student, profile, owner), **sections, 'resumes': resumes,
            'academicCerts': academic, 'version': profile['version'] if profile else 0,
            'capabilities': {'canEdit': owner}}


# ── 비교과 찜 ────────────────────────────────────────────────────────────

class Wish(BaseModel):
    model_config = ConfigDict(extra='forbid')
    wished: bool
    expectedVersion: int = Field(ge=0)


@router.get('/program-wishlist')
def wishlist(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        fail(403, 'SCOPE_DENIED', '학생 본인만 조회할 수 있습니다.')
    rows = conn.execute('''SELECT program_id AS "programId",wished,version FROM dc.program_wishlist
      WHERE student_uid=%s ORDER BY updated_at DESC,program_id''', (user['intg_uid'],)).fetchall()
    return {'items': rows, 'programIds': [r['programId'] for r in rows if r['wished']]}


@router.put('/program-wishlist/{program_id}')
def set_wish(program_id: str, body: Wish, user=Depends(principal, scope='function'),
             conn=Depends(connection, scope='function')):
    """원하는 상태를 명시로 받는다(toggle 이 아니다). 같은 상태 재전송은 새 이력을 만들지 않는다."""
    if user['kind'] != 'STUDENT':
        fail(403, 'SCOPE_DENIED', '학생 본인만 찜할 수 있습니다.')
    uid = user['intg_uid']
    if not conn.execute('SELECT 1 FROM dc.program WHERE id=%s', (program_id,)).fetchone():
        fail(404, 'NOT_FOUND', '프로그램을 찾을 수 없습니다.')
    before = conn.execute('''SELECT * FROM dc.program_wishlist WHERE student_uid=%s AND program_id=%s
      FOR UPDATE''', (uid, program_id)).fetchone()
    if (before['version'] if before else 0) != body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '찜 상태가 변경됐습니다.',
             currentVersion=before['version'] if before else 0)
    if before and before['wished'] == body.wished:
        return {'programId': program_id, 'wished': before['wished'], 'version': before['version']}
    if before:
        row = conn.execute('''UPDATE dc.program_wishlist SET wished=%s,version=version+1,updated_at=now()
          WHERE student_uid=%s AND program_id=%s RETURNING *''', (body.wished, uid, program_id)).fetchone()
    else:
        row = conn.execute('''INSERT INTO dc.program_wishlist(student_uid,program_id,wished)
          VALUES(%s,%s,%s) RETURNING *''', (uid, program_id, body.wished)).fetchone()
    conn.execute('''INSERT INTO dc.program_wishlist_event(student_uid,program_id,wished_before,wished_after,
      version_before,version_after,actor_uid) VALUES(%s,%s,%s,%s,%s,%s,%s)''',
      (uid, program_id, before['wished'] if before else None, row['wished'],
       before['version'] if before else None, row['version'], uid))
    return {'programId': program_id, 'wished': row['wished'], 'version': row['version']}
