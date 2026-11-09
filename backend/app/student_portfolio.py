"""학생 포트폴리오 — 회사 제출용 이력서를 학생이 여러 벌 만든다.

성장 기록(dc.growth_entry)은 학생당 한 벌의 원본이고, 포트폴리오는 그 복사본이다. 만들 때 복사하며
버전 안의 수정은 원본을 바꾸지 않는다. 지원 시 제출과 제출본 열람은 jobs.py 가 맡는다.
교직원은 미제출 초안을 볼 수 없다 — 이 모듈의 경로는 학생 본인 전용이다. 예외는 학생이 대표로 지정한
한 벌뿐이다(2026-11-09 사용자 확정 — 대표 지정이 공개 동의다). 그 경로는 학생 상세 권한으로 열고 감사를 남긴다.
"""
import re
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, Path, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
import psycopg
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import files
from .auth import principal
from .db import connection
from .growth import attachments_of, profile_row
# 대표 포트폴리오 열람은 학생 상세와 같은 판정(students.1 메뉴 + 범위)을 쓴다. jobs 쪽 해석은 메뉴를 보지 않는다.
from .growth import resolve_student as resolve_detail_student
from .jobs import audit_document, idempotent, remember, resolve_student
from .portfolio_document import (ENROLLMENT_REF, ID_PATTERN, SCHOOL, apply_academic, build_document, check_size,
                                 clean_title, empty_document, fail, file_references, load_certs, missing_fields,
                                 new_item, parse_document, section_of)

router = APIRouter()
PORTFOLIO_LIMIT = 20
PRESET_TITLE = '포트폴리오_v'
ROUTE_CREATE = 'POST /students/portfolios'
ResourceId = Annotated[str, Path(pattern=ID_PATTERN)]


class CreateBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str | None = None
    sourcePortfolioId: str | None = Field(default=None, pattern=ID_PATTERN)
    _title = field_validator('title')(lambda value: value if value is None else clean_title(value))


class SaveBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str
    document: dict
    expectedVersion: int = Field(ge=1)
    _title = field_validator('title')(clean_title)


class DeleteBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expectedVersion: int = Field(ge=1)


class RepresentBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    representative: bool


def owner(conn, user, identity):
    if user['kind'] != 'STUDENT':
        fail(403, 'SCOPE_DENIED', '학생 본인만 사용할 수 있습니다.')
    return resolve_student(conn, user, identity)


def lock_student(conn, uid):
    """상한·자동 번호·제목 중복의 조회 후 쓰기를 학생 단위로 직렬화한다."""
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('portfolio:' + uid,))


def get_portfolio(conn, uid, portfolio_id, lock=False):
    row = conn.execute('SELECT * FROM dc.student_portfolio WHERE id=%s AND student_uid=%s AND deleted_at IS NULL'
                       + (' FOR UPDATE' if lock else ''), (portfolio_id, uid)).fetchone()
    if not row:
        fail(404, 'NOT_FOUND', '포트폴리오를 찾을 수 없습니다.')
    return row


def file_map(conn, document, prefix=None):
    """prefix 를 주면 모든 파일 URL 을 그 경로로 만든다 — 대표 포트폴리오는 교직원도 열어야 해서 전용 경로를 쓴다."""
    photo, attachments = file_references(document)
    ids = ([photo] if photo else []) + attachments
    if not ids:
        return {}
    rows = conn.execute('SELECT * FROM dc.file_object WHERE id=ANY(%s)', (ids,)).fetchall()
    return {row['id']: files.file_dto(row, prefix or ('/api/v1/growth-files/' if row['owner_kind'] == 'GROWTH_ENTRY'
                                                      else '/api/v1/portfolio-files/')) for row in rows}


def portfolio_dto(conn, row, student, certs=None, prefix=None):
    document = apply_academic(row['document'], student, load_certs(conn, row['student_uid']) if certs is None else certs)
    missing = missing_fields(document)
    return {'id': row['id'], 'title': row['title'], 'document': document, 'version': row['version'],
            'updatedAt': row['updated_at'], 'complete': not missing, 'missing': missing,
            'files': file_map(conn, document, prefix)}


def check_title(conn, uid, title, own_id=None):
    if conn.execute('''SELECT 1 FROM dc.student_portfolio WHERE student_uid=%s AND title=%s
      AND deleted_at IS NULL AND id IS DISTINCT FROM %s''', (uid, title, own_id)).fetchone():
        title_conflict()


def title_conflict():
    fail(409, 'TITLE_CONFLICT', '같은 이름의 포트폴리오가 이미 있습니다.')


def check_files(conn, user, uid, document):
    """문서가 참조한 파일 전체를 검증한다. 학생 소유 파일만 귀속시키고 성장 첨부는 참조만 한다."""
    photo, attachments = file_references(document)
    ids = list({*attachments, *([photo] if photo else [])})
    rows = {row['id']: row for row in conn.execute('''SELECT * FROM dc.file_object WHERE id=ANY(%s)
      AND uploaded_by=%s AND state='READY' ''', (ids, user['intg_uid'])).fetchall()} if ids else {}

    def usable(file_id, slots):
        row = rows.get(file_id)
        if not row or (row['owner_kind'], row['slot']) not in slots:
            fail(422, 'INVALID_FILE', '사용할 수 없는 파일이 포함되어 있습니다.')
        return row

    claims = []
    if photo:
        claims.append((usable(photo, {('STUDENT_PORTFOLIO', 'PORTFOLIO_PHOTO')}), 'PORTFOLIO_PHOTO'))
    for file_id in attachments:
        row = usable(file_id, {('STUDENT_PORTFOLIO', 'PORTFOLIO_DOCUMENT'), ('GROWTH_ENTRY', 'PORTFOLIO_ATTACHMENT')})
        if row['owner_kind'] == 'STUDENT_PORTFOLIO':
            claims.append((row, 'PORTFOLIO_DOCUMENT'))
    for row, slot in claims:
        if row['owner_id'] is None:
            files.claim(conn, user, row['id'], 'STUDENT_PORTFOLIO', uid, slot)


def record_event(conn, user, portfolio_id, action):
    conn.execute('''INSERT INTO dc.student_portfolio_event(portfolio_id,seq,action,actor_uid)
      VALUES(%s,(SELECT COALESCE(max(seq),0)+1 FROM dc.student_portfolio_event WHERE portfolio_id=%s),%s,%s)''',
      (portfolio_id, portfolio_id, action, user['intg_uid']))


# ── 원본 투영 ───────────────────────────────────────────────────────────

def text(value) -> str:
    return '' if value is None else str(value)


def day(row) -> str:
    return text(row['occurred_on']) or text(row['date_text'])


def growth_item(row):
    """성장 기록 한 건을 문서 항목으로. 없는 값은 빈 값이며 합성하지 않는다."""
    kind, content, ref = row['kind_code'], row['content'] or {}, 'growth:' + row['id']
    title = row['title']
    if kind == 'PROJECT':
        return 'experience', new_item('experience', title, {
            'role': text(content.get('role')), 'startOn': text(content.get('periodText')) or day(row),
            'description': text(content.get('description')), 'result': text(content.get('result')),
            'link': text(content.get('link'))}, ref)
    if kind == 'JOURNAL':
        parts = [text(content.get(key)) for key in ('desc', 'situation', 'action', 'learning')]
        return 'experience', new_item('experience', title, {
            'role': text(content.get('role')), 'startOn': day(row), 'result': text(content.get('result')),
            'description': '\n\n'.join(part for part in parts if part)}, ref)
    if kind == 'LANGUAGE':
        return 'language', new_item('language', title, {
            'language': text(content.get('language')), 'testName': text(content.get('testName')),
            'scoreText': text(content.get('scoreText')), 'issuer': text(content.get('issuer')),
            'acquiredOn': day(row), 'description': text(content.get('description'))}, ref)
    if kind == 'CERTIFICATE':
        return 'certificate', new_item('certificate', title, {
            'issuer': text(content.get('issuer')), 'certNo': text(content.get('certificateNumber')),
            'scoreText': text(content.get('scoreText')), 'acquiredOn': day(row),
            'description': text(content.get('description'))}, ref)
    if kind == 'SKILL':
        return 'skill', new_item('skill', title, {'level': content.get('level', '')}, ref)
    if kind == 'AWARD':
        return 'award', new_item('award', title, {
            'host': text(content.get('host')), 'rank': text(content.get('rank')), 'awardedOn': day(row),
            'description': text(content.get('description'))}, ref)
    return None, None


def source_projection(conn, student, certs):
    uid = student['intg_uid']
    profile = profile_row(conn, uid)
    entries = conn.execute('''SELECT * FROM dc.growth_entry WHERE student_uid=%s AND deleted_at IS NULL
      ORDER BY occurred_on DESC NULLS LAST,updated_at DESC,id''', (uid,)).fetchall()
    attached = attachments_of(conn, [row['id'] for row in entries])
    programs = conn.execute('''SELECT p.id,p.title,p.summary,p.run_start,p.run_end FROM dc.program_apply a
      JOIN dc.program p ON p.id=a.program_id WHERE a.student_uid=%s AND a.outcome_code='COMPLETED'
      AND a.cancelled_at IS NULL ORDER BY p.run_end DESC NULLS LAST,p.id''', (uid,)).fetchall()
    # 자소서에는 문항 칸이 없다 — 문항은 쓸 때 고른 분야 라벨이다(2026-11-09 사용자 확정). 라벨 우선순위는 jobs.resume_dto 와 같다.
    resumes = conn.execute('''SELECT r.id,r.title,r.content,COALESCE(c.label,r.category_label_legacy,'') AS category_label
      FROM dc.job_resume r
      LEFT JOIN dc.code_item c ON (c.group_code,c.code)=('JOB_RESUME_CATEGORY',r.category_code)
      WHERE r.student_uid=%s AND r.deleted_at IS NULL ORDER BY r.updated_at DESC,r.id''', (uid,)).fetchall()

    sections = {key: [] for key in ('education', 'training', 'experience', 'language', 'certificate', 'skill',
                                    'award', 'coverLetter', 'document')}
    sections['education'].append(new_item('education', SCHOOL, {}, ENROLLMENT_REF))
    for row in programs:
        sections['training'].append(new_item('training', row['title'], {
            'startOn': text(row['run_start']), 'endOn': text(row['run_end']),
            'description': text(row['summary'])}, 'program:' + row['id']))
    for cert in certs:
        sections['certificate'].append(new_item('certificate', cert['label'], {}, 'cert:' + cert['certId']))
    certified = {cert['certId'] for cert in certs}
    for row in entries:
        if row['kind_code'] == 'CERTIFICATE' and row['cert_id'] in certified:
            continue
        key, item = growth_item(row)
        if key:
            sections[key].append(item)
        for attachment in attached[row['id']]:
            sections['document'].append(new_item('document', attachment['name'], {'fileId': attachment['id']},
                                                 'growth:' + row['id']))
    for row in resumes:
        sections['coverLetter'].append(new_item('coverLetter', row['title'], {
            'question': row['category_label'] or row['title'], 'answer': row['content']}, 'resume:' + row['id']))

    personal = {**section_of(empty_document(), 'personal')['data'],
                'email': text(profile['contact_email']) if profile else '',
                'phone': text(profile['contact_phone']) if profile else '',
                'intro': profile['intro'] if profile else ''}
    return {'personal': personal, 'sections': [{'key': key, 'items': items} for key, items in sections.items()]}


# ── 포트폴리오 ──────────────────────────────────────────────────────────

@router.get('/students/{identity}/portfolios')
def list_portfolios(identity: str, user=Depends(principal, scope='function'),
                    conn=Depends(connection, scope='function')):
    student = owner(conn, user, identity)
    rows = conn.execute('''SELECT id,title,updated_at AS "updatedAt",version,is_complete AS complete,
      is_representative AS representative FROM dc.student_portfolio WHERE student_uid=%s AND deleted_at IS NULL ORDER BY updated_at DESC,id''',
      (student['intg_uid'],)).fetchall()
    return {'items': rows, 'limit': PORTFOLIO_LIMIT}


@router.post('/students/{identity}/portfolios', status_code=201)
def create_portfolio(identity: str, body: CreateBody, idempotency_key: str = Header(min_length=8, max_length=200),
                     user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student = owner(conn, user, identity)
    uid = student['intg_uid']
    digest, saved = idempotent(conn, user, ROUTE_CREATE, idempotency_key, identity + body.model_dump_json())
    certs = load_certs(conn, uid)
    if saved:
        return {**portfolio_dto(conn, get_portfolio(conn, uid, saved['id']), student, certs),
                'notImported': saved['notImported']}
    lock_student(conn, uid)
    live = conn.execute('SELECT count(*) AS n FROM dc.student_portfolio WHERE student_uid=%s AND deleted_at IS NULL',
                        (uid,)).fetchone()['n']
    if live >= PORTFOLIO_LIMIT:
        fail(422, 'PORTFOLIO_LIMIT', f'포트폴리오는 {PORTFOLIO_LIMIT}개까지 만들 수 있습니다.')
    not_imported = []
    if body.sourcePortfolioId:
        document = apply_academic(get_portfolio(conn, uid, body.sourcePortfolioId)['document'], student, certs)
    else:
        document, not_imported = build_document(source_projection(conn, student, certs), student, certs)
    title = body.title
    if title:
        check_title(conn, uid, title)
    else:
        # 삭제 행을 포함한다 — 번호를 재사용하면 같은 이름의 제출본이 서로 다른 내용을 가리킨다.
        number = conn.execute(r'''SELECT COALESCE(max(substring(title from '^포트폴리오_v([0-9]{1,9})$')::bigint),0)+1 AS n
          FROM dc.student_portfolio WHERE student_uid=%s''', (uid,)).fetchone()['n']
        title = f'{PRESET_TITLE}{number}'
    portfolio_id = 'spf_' + uuid4().hex[:12]
    try:
        row = conn.execute('''INSERT INTO dc.student_portfolio(id,student_uid,title,document,is_complete,
          created_by,updated_by) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
          (portfolio_id, uid, title, Jsonb(document), not missing_fields(document), uid, uid)).fetchone()
    except psycopg.errors.UniqueViolation:
        title_conflict()
    record_event(conn, user, portfolio_id, 'CREATE')
    # 멱등 저장에는 문서 본문(연락처·주소)을 남기지 않는다. dc.idempotency 는 정리 절차가 없다.
    remember(conn, user, ROUTE_CREATE, idempotency_key, digest, {'id': portfolio_id, 'notImported': not_imported})
    return {**portfolio_dto(conn, row, student, certs), 'notImported': not_imported}


@router.get('/students/{identity}/portfolios/{portfolio_id}')
def portfolio_detail(identity: str, portfolio_id: ResourceId, user=Depends(principal, scope='function'),
                     conn=Depends(connection, scope='function')):
    student = owner(conn, user, identity)
    return portfolio_dto(conn, get_portfolio(conn, student['intg_uid'], portfolio_id), student)


@router.put('/students/{identity}/portfolios/{portfolio_id}')
def save_portfolio(identity: str, portfolio_id: ResourceId, body: SaveBody, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    student = owner(conn, user, identity)
    uid = student['intg_uid']
    parsed = parse_document(body.document)
    lock_student(conn, uid)
    before = get_portfolio(conn, uid, portfolio_id, lock=True)
    if before['version'] != body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '다른 창에서 먼저 저장했습니다. 최신본을 다시 불러와 주세요.',
             currentVersion=before['version'])
    certs = load_certs(conn, uid)
    document = apply_academic(parsed, student, certs)
    check_size(document)
    if body.title != before['title']:
        check_title(conn, uid, body.title, portfolio_id)
    check_files(conn, user, uid, document)
    try:
        row = conn.execute('''UPDATE dc.student_portfolio SET title=%s,document=%s,is_complete=%s,
          version=version+1,updated_at=now(),updated_by=%s WHERE id=%s AND student_uid=%s RETURNING *''',
          (body.title, Jsonb(document), not missing_fields(document), uid, portfolio_id, uid)).fetchone()
    except psycopg.errors.UniqueViolation:
        title_conflict()
    return portfolio_dto(conn, row, student, certs)


@router.post('/students/{identity}/portfolios/{portfolio_id}/delete', status_code=204)
def delete_portfolio(identity: str, portfolio_id: ResourceId, body: DeleteBody,
                     user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """논리삭제다. 행이 남으므로 제출본의 FK 와 충돌하지 않고, 파일은 지우지 않는다."""
    student = owner(conn, user, identity)
    uid = student['intg_uid']
    lock_student(conn, uid)
    before = get_portfolio(conn, uid, portfolio_id, lock=True)
    if before['version'] != body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '다른 창에서 먼저 저장했습니다. 최신본을 다시 불러와 주세요.',
             currentVersion=before['version'])
    # 삭제된 벌은 대표일 수 없다(CHECK) — 같은 문장에서 대표도 내린다.
    conn.execute('''UPDATE dc.student_portfolio SET deleted_at=now(),deleted_by=%s,version=version+1,
      is_representative=false WHERE id=%s AND student_uid=%s''', (uid, portfolio_id, uid))
    record_event(conn, user, portfolio_id, 'DELETE')
    return Response(status_code=204)


@router.post('/students/{identity}/portfolios/{portfolio_id}/representative')
def set_representative(identity: str, portfolio_id: ResourceId, body: RepresentBody,
                       user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """대표는 학생당 한 벌이다. 판(version)을 올리지 않는다 — 열린 편집기가 충돌로 막히면 안 된다."""
    student = owner(conn, user, identity)
    uid = student['intg_uid']
    lock_student(conn, uid)
    target = get_portfolio(conn, uid, portfolio_id, lock=True)
    if target['is_representative'] == body.representative:
        return {'id': portfolio_id, 'representative': body.representative}
    try:
        if body.representative:
            # 이전 대표를 먼저 내린다. 부분 unique 는 문장마다 검사하므로 순서가 바뀌면 실패한다.
            for row in conn.execute('''UPDATE dc.student_portfolio SET is_representative=false
              WHERE student_uid=%s AND is_representative AND id<>%s RETURNING id''', (uid, portfolio_id)).fetchall():
                record_event(conn, user, row['id'], 'UNREPRESENT')
        conn.execute('UPDATE dc.student_portfolio SET is_representative=%s WHERE id=%s AND student_uid=%s',
                     (body.representative, portfolio_id, uid))
    except psycopg.errors.UniqueViolation:
        fail(409, 'REPRESENTATIVE_CONFLICT', '다른 창에서 대표를 바꿨습니다. 새로고침 후 다시 시도해 주세요.')
    record_event(conn, user, portfolio_id, 'REPRESENT' if body.representative else 'UNREPRESENT')
    return {'id': portfolio_id, 'representative': body.representative}


def representative_row(conn, user, identity):
    """학생 본인 또는 학생 상세 권한이 있는 교직원. 대표가 없으면 None."""
    student, _ = resolve_detail_student(conn, user, identity)
    row = conn.execute('''SELECT * FROM dc.student_portfolio WHERE student_uid=%s AND is_representative
      AND deleted_at IS NULL''', (student['intg_uid'],)).fetchone()
    return student, row


@router.get('/students/{identity}/representative-portfolio')
def representative_portfolio(identity: str, user=Depends(principal, scope='function'),
                             conn=Depends(connection, scope='function')):
    student, row = representative_row(conn, user, identity)
    if not row:
        return None
    audit_document(conn, user, 'STUDENT_PORTFOLIO', row['id'])
    return portfolio_dto(conn, row, student, prefix=f'/api/v1/students/{identity}/representative-portfolio/files/')


@router.get('/students/{identity}/representative-portfolio/files/{file_id}')
def representative_portfolio_file(identity: str, file_id: ResourceId, user=Depends(principal, scope='function'),
                                  conn=Depends(connection, scope='function')):
    """현재 대표 문서가 참조하는 파일만 연다. 저장 때 check_files 와 같은 소유·슬롯 규칙을 다시 본다."""
    student, row = representative_row(conn, user, identity)
    if not row:
        fail(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.')
    photo, attachments = file_references(row['document'])
    if file_id == photo:
        slots = {('STUDENT_PORTFOLIO', 'PORTFOLIO_PHOTO')}
    elif file_id in attachments:
        slots = {('STUDENT_PORTFOLIO', 'PORTFOLIO_DOCUMENT'), ('GROWTH_ENTRY', 'PORTFOLIO_ATTACHMENT')}
    else:
        fail(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.')
    file = conn.execute('''SELECT * FROM dc.file_object WHERE id=%s AND state='READY' AND uploaded_by=%s''',
                        (file_id, student['intg_uid'])).fetchone()
    if not file or (file['owner_kind'], file['slot']) not in slots:
        fail(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.')
    audit_document(conn, user, 'FILE', file_id)
    return files.stream(file)


@router.get('/students/{identity}/portfolio-source')
def portfolio_source(identity: str, user=Depends(principal, scope='function'),
                     conn=Depends(connection, scope='function')):
    """「최신 기록 불러오기」의 후보. 저장은 학생이 고른 뒤 PUT 으로 한다."""
    student = owner(conn, user, identity)
    certs = load_certs(conn, student['intg_uid'])
    source = source_projection(conn, student, certs)
    # 학사 값과 인증 표시는 저장 때와 같은 함수로 채운다.
    filled = apply_academic({'schemaVersion': 1, 'sections': [
        {'key': 'personal', 'enabled': True, 'data': source['personal']},
        *({'key': part['key'], 'enabled': True, 'items': part['items']} for part in source['sections'])]},
        student, certs)
    return {'personal': section_of(filled, 'personal')['data'],
            'sections': [{'key': part['key'], 'items': section_of(filled, part['key'])['items']}
                         for part in source['sections']]}


# ── 파일 ────────────────────────────────────────────────────────────────

@router.post('/portfolio-files', status_code=201)
async def upload_portfolio_file(request: Request, slot: str = Query(pattern='^(PORTFOLIO_PHOTO|PORTFOLIO_DOCUMENT)$'),
                                name: str = Query(min_length=1, max_length=300),
                                user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """소유자는 저장 때 학생으로 확정한다. 이미지 재인코딩·동기 DB 는 이벤트 루프 밖에서 돈다."""
    if user['kind'] != 'STUDENT':
        fail(403, 'SCOPE_DENIED', '학생 본인만 올릴 수 있습니다.')
    body = await files.read_body(request)
    row = await run_in_threadpool(files.store, conn, user, slot, name, body)
    return files.file_dto(row, '/api/v1/portfolio-files/')


@router.get('/portfolio-files/{file_id}')
def download_portfolio_file(file_id: ResourceId, user=Depends(principal, scope='function'),
                            conn=Depends(connection, scope='function')):
    """학생 본인 전용이다. 제출본 파일은 지원 회차로 판정하는 jobs 경로를 쓴다."""
    row = conn.execute('''SELECT * FROM dc.file_object WHERE id=%s AND state='READY'
      AND owner_kind='STUDENT_PORTFOLIO' AND uploaded_by=%s''', (file_id, user['intg_uid'])).fetchone()
    if not row:
        fail(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.')
    return files.stream(row)
