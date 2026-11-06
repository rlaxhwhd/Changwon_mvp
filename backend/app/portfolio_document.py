"""학생 포트폴리오 문서 — 형식·검증·학사값 덮어쓰기·완성 판정·스냅샷 변환.

문서는 JSONB 한 건이다. 항상 통째로 읽고 저장하며 내부를 조회 조건으로 쓰지 않는다.
`extra='forbid'` 는 모델 바깥 키만 막는다 — `data`·`fields` 안은 여기서 전부 검사한다.

이 모듈은 jobs·growth·roadmap 을 import 하지 않는다. jobs 가 이 모듈을 쓰고 growth·roadmap 이
jobs 를 import 하므로 순환을 끊는 자리다. 같은 이유로 오류도 roadmap.fail 을 쓰지 않는다.
"""
from copy import deepcopy
import json
import re
from typing import Any, Literal
import unicodedata
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

MAX_BYTES = 262144
MAX_ITEMS = 50
MAX_DOCUMENT_ITEMS = 10
MAX_SHORT = 200
MAX_LONG = 10000
MAX_LINE = 2000  # 회사 자소서 문항·링크는 짧은 값 한도를 넘는 일이 흔하다
MAX_ANSWER = 100000
SCHOOL = '국립창원대학교'
ENROLLMENT_REF = 'academic:enrollment'
ID_PATTERN = r'^[A-Za-z0-9_-]{1,64}$'

PERSONAL_KEYS = ('name', 'studentNo', 'school', 'dept', 'grade', 'email', 'phone', 'intro', 'photoFileId',
                 'nameEn', 'birthDate', 'address')
# 학사 유래 값이다. 클라이언트가 무엇을 보내도 apply_academic 이 덮어쓴다(CLAUDE.md 규칙 1).
ACADEMIC_PERSONAL = ('name', 'studentNo', 'school', 'dept', 'grade')
SECTION_FIELDS = {
    'education': ('schoolName', 'degree', 'track', 'major', 'additionalMajorType', 'additionalMajor', 'status',
                  'admissionType', 'admittedOn', 'graduatedOn', 'gpa', 'gpaScale'),
    'military': ('serviceType', 'branch', 'rank', 'startOn', 'endOn', 'dischargeType', 'exemptionReason'),
    'training': ('organizer', 'startOn', 'endOn', 'hours', 'description'),
    'experience': ('organization', 'role', 'startOn', 'endOn', 'description', 'result', 'link'),
    'career': ('company', 'department', 'position', 'employmentType', 'startOn', 'endOn', 'description'),
    'language': ('language', 'testName', 'scoreText', 'issuer', 'acquiredOn', 'description'),
    'certificate': ('issuer', 'certNo', 'scoreText', 'acquiredOn', 'description'),
    'skill': ('level', 'description'),
    'award': ('host', 'rank', 'awardedOn', 'description'),
    'overseas': ('country', 'purpose', 'startOn', 'endOn', 'description'),
    'volunteer': ('organization', 'startOn', 'endOn', 'hours', 'description'),
    'coverLetter': ('question', 'answer'),
    'document': ('fileId', 'description'),
    'specialty': ('description',),
    'careerDescription': ('company', 'description'),
}
SECTION_KEYS = ('personal', *SECTION_FIELDS)
REQUIRED_SECTIONS = ('personal', 'education')
LONG_KEYS = ('intro', 'description', 'result')


def fail(status: int, code: str, message: str, **extra):
    raise HTTPException(status, {'code': code, 'message': message, **extra})


def bad_text(value) -> bool:
    """JSONB 가 거부해 500 이 되는 값. 짝이 맞지 않는 서로게이트는 크기 계산의 인코딩도 깬다."""
    if isinstance(value, str):
        if '\x00' in value:
            return True
        try:
            value.encode('utf-8')
        except UnicodeEncodeError:
            return True
        return False
    if isinstance(value, dict):
        return any(bad_text(key) or bad_text(item) for key, item in value.items())
    if isinstance(value, list):
        return any(bad_text(item) for item in value)
    return False


def clean_title(value: str) -> str:
    title = unicodedata.normalize('NFC', value).strip()
    if bad_text(title) or not 1 <= len(title) <= 60:
        raise ValueError('제목은 1~60자로 입력해 주세요.')
    return title


class Item(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: str = Field(pattern=ID_PATTERN)
    sourceRef: str | None = Field(default=None, max_length=100)
    verified: bool = False
    title: str = Field(default='', max_length=MAX_SHORT)
    fields: dict[str, Any]


class Section(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    key: str
    enabled: bool
    data: dict[str, Any] | None = None
    items: list[Item] | None = None


class Document(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    schemaVersion: Literal[1]
    sections: list[Section]


def text_limit(section: str, field: str) -> int:
    if section == 'coverLetter' and field == 'answer':
        return MAX_ANSWER
    if field in ('question', 'link'):
        return MAX_LINE
    return MAX_LONG if field in LONG_KEYS else MAX_SHORT


def clean_value(section: str, field: str, value) -> str:
    if not isinstance(value, str):
        fail(422, 'INVALID_DOCUMENT', f'{section}.{field} 값은 문자열이어야 합니다.')
    if len(value) > text_limit(section, field):
        fail(422, 'INVALID_DOCUMENT', f'{section}.{field} 은(는) {text_limit(section, field)}자까지 입력할 수 있습니다.')
    return value


def clean_fields(section: str, fields: dict) -> dict:
    allowed = SECTION_FIELDS[section]
    unknown = sorted(set(fields) - set(allowed))
    if unknown:
        fail(422, 'INVALID_DOCUMENT', f'{section} 에 허용되지 않은 항목이 있습니다: {", ".join(unknown)}')
    result = {}
    for field in allowed:
        value = fields.get(field, '')
        if section == 'skill' and field == 'level':
            # bool 은 int 의 하위 타입이라 먼저 걸러야 한다.
            if value != '' and (type(value) is not int or not 1 <= value <= 5):
                fail(422, 'INVALID_DOCUMENT', '숙련도는 1~5 사이의 정수여야 합니다.')
            result[field] = value
            continue
        result[field] = clean_value(section, field, value)
    link = result.get('link', '') if section == 'experience' else ''
    if link and not link.startswith(('http://', 'https://')):
        fail(422, 'INVALID_DOCUMENT', '링크는 http 또는 https 로 시작해야 합니다.')
    return result


def clean_item(section: str, item: dict) -> dict:
    return {'id': item['id'], 'sourceRef': item['sourceRef'], 'verified': item['verified'],
            'title': item['title'], 'fields': clean_fields(section, item['fields'])}


def clean_personal(data: dict) -> dict:
    unknown = sorted(set(data) - set(PERSONAL_KEYS))
    if unknown:
        fail(422, 'INVALID_DOCUMENT', f'personal 에 허용되지 않은 항목이 있습니다: {", ".join(unknown)}')
    return {key: '' if key in ACADEMIC_PERSONAL else clean_value('personal', key, data.get(key, ''))
            for key in PERSONAL_KEYS}


def parse_document(raw: dict) -> dict:
    """요청 문서를 저장 형식으로 정규화한다. 학사값은 apply_academic 이 채운다."""
    if bad_text(raw):
        fail(422, 'INVALID_DOCUMENT', '저장할 수 없는 문자가 포함되어 있습니다.')
    try:
        parsed = Document.model_validate(raw)
    except ValidationError as error:
        first = error.errors()[0]
        fail(422, 'INVALID_DOCUMENT', '문서 형식을 확인해 주세요: '
             + '.'.join(str(part) for part in first['loc']) + ' ' + first['msg'])
    by_key = {}
    for section in parsed.sections:
        if section.key not in SECTION_KEYS or section.key in by_key:
            fail(422, 'INVALID_DOCUMENT', f'항목 구성이 올바르지 않습니다: {section.key}')
        by_key[section.key] = section
    if len(by_key) != len(SECTION_KEYS):
        fail(422, 'INVALID_DOCUMENT', '빠진 항목이 있습니다: ' + ', '.join(k for k in SECTION_KEYS if k not in by_key))
    sections = []
    for key in SECTION_KEYS:
        section = by_key[key]
        if key in REQUIRED_SECTIONS and not section.enabled:
            fail(422, 'REQUIRED_SECTION', '인적사항과 학력사항은 뺄 수 없습니다.')
        if key == 'personal':
            if section.data is None or section.items is not None:
                fail(422, 'INVALID_DOCUMENT', 'personal 은 data 만 담습니다.')
            sections.append({'key': key, 'enabled': True, 'data': clean_personal(section.data)})
            continue
        if section.items is None or section.data is not None:
            fail(422, 'INVALID_DOCUMENT', f'{key} 은(는) items 만 담습니다.')
        limit = MAX_DOCUMENT_ITEMS if key == 'document' else MAX_ITEMS
        if len(section.items) > limit:
            fail(422, 'INVALID_DOCUMENT', f'{key} 은(는) {limit}건까지 입력할 수 있습니다.')
        if len({item.id for item in section.items}) != len(section.items):
            fail(422, 'INVALID_DOCUMENT', f'{key} 의 항목 id 가 중복됩니다.')
        sections.append({'key': key, 'enabled': section.enabled,
                         'items': [clean_item(key, item.model_dump()) for item in section.items]})
    return {'schemaVersion': 1, 'sections': sections}


def byte_size(value) -> int:
    return len(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))


def check_size(document: dict) -> None:
    size = byte_size(document)
    if size > MAX_BYTES:
        fail(422, 'DOCUMENT_TOO_LARGE', f'문서가 너무 큽니다. 현재 {size}바이트이며 {MAX_BYTES}바이트까지 저장할 수 있습니다.',
             currentBytes=size, limitBytes=MAX_BYTES)


def section_of(document: dict, key: str) -> dict | None:
    return next((section for section in document['sections'] if section['key'] == key), None)


def new_item(section: str, title: str, fields: dict, source_ref: str | None = None) -> dict:
    return {'id': uuid4().hex[:16], 'sourceRef': source_ref, 'verified': False, 'title': title,
            'fields': {field: fields.get(field, '') for field in SECTION_FIELDS[section]}}


def load_certs(conn, uid: str) -> list:
    """학사·기관이 확인한 취득 자격. growth.portfolio 의 academicCerts 와 같은 범위다."""
    return conn.execute('''SELECT c.cert_id AS "certId",c.label,c.issuer,sc.acquired_dt AS "acquiredAt",
      sc.cert_no AS "certNo",sc.verified FROM dc.student_cert sc JOIN dc.cert c USING(cert_id)
      WHERE sc.intg_uid=%s AND sc.acquired_dt IS NOT NULL ORDER BY sc.acquired_dt DESC,c.cert_id''',
      (uid,)).fetchall()


def apply_academic(document: dict, student, certs) -> dict:
    """학사 유래 값을 덮어쓴다. GET·PUT·제출이 이 함수 하나를 쓴다. 입력은 바꾸지 않는다."""
    document = deepcopy(document)
    detail = student['detail'] or {}
    section_of(document, 'personal')['data'].update(
        name=student['name'] or '', studentNo=student['student_no'] or '', school=SCHOOL,
        dept=student['major_label'] or '', grade=student['grade'])

    education = section_of(document, 'education')
    enrollment = next((item for item in education['items'] if item['sourceRef'] == ENROLLMENT_REF), None)
    if enrollment is None:
        enrollment = new_item('education', SCHOOL, {}, ENROLLMENT_REF)
    others = [item for item in education['items'] if item is not enrollment]
    for item in others:
        if item['sourceRef'] == ENROLLMENT_REF:
            item['sourceRef'] = None
    gpa = detail.get('gpa')
    # 학사 키만 덮어쓴다. degree·track 등 나머지는 학사 원본에 없는 학생 입력이다.
    enrollment['title'] = SCHOOL
    enrollment['fields'].update(schoolName=SCHOOL, major=student['major_label'] or '',
                                status=detail.get('enrollmentStatus') or '재학',
                                gpa='' if gpa is None else str(gpa))
    education['items'] = [enrollment, *others]

    for section in document['sections']:
        for item in section.get('items', ()):
            item['verified'] = False
    by_id = {cert['certId']: cert for cert in certs}
    for item in section_of(document, 'certificate')['items']:
        ref = item['sourceRef'] or ''
        if not ref.startswith('cert:'):
            continue
        cert = by_id.get(ref[len('cert:'):])
        if cert is None:
            item['sourceRef'] = None
            continue
        item['title'] = cert['label']
        item['verified'] = cert['verified']
        item['fields'].update(issuer=cert['issuer'], certNo=cert['certNo'] or '',
                              acquiredOn=str(cert['acquiredAt']))
    return document


def missing_fields(document: dict) -> list[str]:
    data = section_of(document, 'personal')['data']
    missing = [f'personal.{key}' for key in ('name', 'email', 'phone') if not str(data.get(key) or '').strip()]
    if not section_of(document, 'education')['items']:
        missing.append('education')
    return missing


def snapshot_document(document: dict) -> dict:
    """학생이 뺀 항목의 입력값이 교직원 API 로 나가면 안 된다 — 뺀 항목은 스냅샷에 넣지 않는다."""
    return {'schemaVersion': document['schemaVersion'],
            'sections': [deepcopy(section) for section in document['sections'] if section['enabled']]}


def file_references(document: dict) -> tuple[str | None, list[str]]:
    """(사진, 첨부 목록). 스냅샷처럼 항목이 빠진 문서도 받는다."""
    personal = section_of(document, 'personal')
    attachments = section_of(document, 'document')
    photo = personal['data'].get('photoFileId') if personal else None
    return photo or None, [item['fields']['fileId'] for item in (attachments or {}).get('items', ())
                           if item['fields'].get('fileId')]


def empty_document() -> dict:
    return {'schemaVersion': 1, 'sections': [
        {'key': 'personal', 'enabled': True, 'data': {key: '' for key in PERSONAL_KEYS}},
        *({'key': key, 'enabled': key in REQUIRED_SECTIONS, 'items': []} for key in SECTION_FIELDS)]}


def build_document(source: dict, student, certs) -> tuple[dict, list[dict]]:
    """원본 투영으로 새 문서를 만든다. 한도를 넘는 항목은 넣지 않고 알린다 — 학생 잘못이 아니므로
    생성을 실패시키지 않고, 몰래 자르지도 않는다."""
    document = apply_academic(empty_document(), student, certs)
    not_imported = []
    personal = section_of(document, 'personal')['data']
    for key, label in (('email', '이메일'), ('phone', '휴대폰'), ('intro', '자기소개')):
        value = source['personal'][key]
        if len(value) > text_limit('personal', key):
            not_imported.append({'sourceRef': 'personal:' + key, 'title': label})
        else:
            personal[key] = value
    used = byte_size(document)
    for part in source['sections']:
        key = part['key']
        section = section_of(document, key)
        limit = MAX_DOCUMENT_ITEMS if key == 'document' else MAX_ITEMS
        # 자기소개서는 최근 한 건만, 성장 첨부는 학생이 불러오기로 고른다.
        items = part['items'][:1] if key == 'coverLetter' else [] if key == 'document' else part['items']
        for item in items:
            if item['sourceRef'] == ENROLLMENT_REF:
                continue
            size = byte_size(item) + 1
            over = len(item['title']) > MAX_SHORT or len(section['items']) >= limit or used + size > MAX_BYTES
            try:
                if over:
                    raise ValueError
                section['items'].append(clean_item(key, item))
                used += size
            except (ValueError, HTTPException):
                not_imported.append({'sourceRef': item['sourceRef'], 'title': item['title'][:MAX_SHORT]})
        section['enabled'] = key in REQUIRED_SECTIONS or bool(section['items'])
    return apply_academic(document, student, certs), not_imported
