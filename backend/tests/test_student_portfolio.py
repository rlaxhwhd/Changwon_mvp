"""학생 포트폴리오 기능 테스트 — 실제 PostgreSQL *_test DB 에서만 돌린다.

work-order §9 의 권한·동시성·불변성·규칙·파일·감사 게이트를 규칙 하나에 테스트 하나로 고정한다.
"""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
import unicodedata

import psycopg
import pytest

from app.db import pool
from portfolio_test_support import (apply_body, create, growth_attachment, key, manual_item, path, personal, put,
                                    ready, retire_portfolios, save, section, submit, upload, upload_document)
from security_fixtures import pdf_bytes
from test_api import headers
from test_jobs import apply_as, new_posting


@pytest.fixture(autouse=True)
def fresh_portfolios(client):
    retire_portfolios()
    yield


def one(sql, *values):
    with pool.connection() as conn:
        return conn.execute(sql, values).fetchone()


def audit_count(target_id):
    return one('SELECT count(*) AS n FROM dc.job_access_event WHERE target_id=%s', target_id)['n']


def submitted(client, portfolio=None, identity='chaewon'):
    portfolio = portfolio or ready(client, identity)
    posting = new_posting(client)
    response = submit(client, posting, portfolio, identity)
    assert response.status_code == 201, response.text
    return response.json(), portfolio, posting


def snapshot_path(application):
    return f"/api/v1/job-applications/{application['id']}/portfolio"


# ── 생성·조회 ────────────────────────────────────────────────────────────

def test_create_fills_from_records_and_lists_without_the_document(client):
    dto = create(client)
    assert dto['title'].startswith('포트폴리오_v') and dto['notImported'] == [] and dto['version'] == 1
    data = personal(dto['document'])
    assert data['name'] and data['studentNo'] and data['school'] == '국립창원대학교' and data['grade'] == 3
    enrollment = section(dto['document'], 'education')['items'][0]
    assert enrollment['sourceRef'] == 'academic:enrollment' and enrollment['fields']['gpa'] == '4.3'
    assert section(dto['document'], 'experience')['enabled'] is True, '성장일지가 채워져야 한다'
    assert section(dto['document'], 'military')['enabled'] is False, '데이터가 없는 항목은 꺼져 있다'
    assert len(section(dto['document'], 'coverLetter')['items']) == 1
    certificates = section(dto['document'], 'certificate')['items']
    assert certificates and all(item['verified'] for item in certificates if item['sourceRef'].startswith('cert:'))
    listed = client.get(path(), headers=headers('chaewon')).json()
    assert listed['limit'] == 20
    assert set(listed['items'][0]) == {'id', 'title', 'updatedAt', 'version', 'complete'}
    assert listed['items'][0]['complete'] is dto['complete']


def test_missing_lists_the_empty_required_fields(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    personal(document).update(email='', phone='  ')
    saved = save(client, dto, document=document)
    assert saved['complete'] is False and set(saved['missing']) == {'personal.email', 'personal.phone'}
    assert client.get(path(), headers=headers('chaewon')).json()['items'][0]['complete'] is False


def test_save_keeps_the_student_input_and_computes_completion(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    personal(document).update(email='a@example.test', phone='010-1111-2222', nameEn='HONG')
    military = section(document, 'military')
    military['enabled'] = True
    military['items'].append(manual_item({'serviceType': '군필', 'branch': '육군'}, '병역'))
    saved = save(client, dto, document=document, title='  네이버 제출용  ')
    assert saved['title'] == '네이버 제출용' and saved['version'] == 2 and saved['complete'] is True
    again = client.get(path('chaewon', dto['id']), headers=headers('chaewon')).json()
    assert again['document'] == saved['document'] and again['version'] == 2
    assert section(again['document'], 'military')['items'][0]['fields']['branch'] == '육군'
    assert section(again['document'], 'military')['items'][0]['fields']['endOn'] == '', '빈 값은 빈 문자열이다'
    assert client.get(path(), headers=headers('chaewon')).json()['items'][0]['complete'] is True


def test_disabled_section_keeps_its_input(client):
    dto = ready(client)
    document = deepcopy(dto['document'])
    part = section(document, 'specialty')
    part['items'].append(manual_item({'description': '남겨 둘 내용'}))
    part['enabled'] = False
    saved = save(client, dto, document=document)
    assert section(saved['document'], 'specialty')['items'][0]['fields']['description'] == '남겨 둘 내용'


def test_title_is_nfc_normalised_before_comparison(client):
    composed = unicodedata.normalize('NFC', '포트폴리오 회사')
    create(client, title=composed)
    response = client.post(path(), headers={**headers('chaewon'), **key()},
                           json={'title': unicodedata.normalize('NFD', composed)})
    assert response.status_code == 409 and response.json()['detail']['code'] == 'TITLE_CONFLICT'


def test_duplicate_title_is_refused_on_create_and_rename_but_free_after_delete(client):
    first = create(client, title='같은 이름')
    other = create(client, title='다른 이름')
    assert put(client, other, title='같은 이름').status_code == 409
    response = client.post(path('chaewon', first['id']) + '/delete', headers=headers('chaewon'),
                           json={'expectedVersion': first['version']})
    assert response.status_code == 204
    assert client.get(path('chaewon', first['id']), headers=headers('chaewon')).status_code == 404
    assert put(client, other, title='같은 이름').status_code == 200


def test_version_conflict_on_save_and_delete(client):
    dto = create(client)
    save(client, dto)
    stale = put(client, dto)
    assert stale.status_code == 409
    detail = stale.json()['detail']
    assert detail['code'] == 'VERSION_CONFLICT' and detail['currentVersion'] == 2
    assert client.post(path('chaewon', dto['id']) + '/delete', headers=headers('chaewon'),
                       json={'expectedVersion': 1}).status_code == 409


def test_delete_bumps_version_and_records_events(client):
    dto = create(client)
    assert client.post(path('chaewon', dto['id']) + '/delete', headers=headers('chaewon'),
                       json={'expectedVersion': 1}).status_code == 204
    row = one('SELECT version,deleted_at,deleted_by FROM dc.student_portfolio WHERE id=%s', dto['id'])
    assert row['version'] == 2 and row['deleted_at'] and row['deleted_by']
    with pool.connection() as conn:
        events = conn.execute('''SELECT seq,action FROM dc.student_portfolio_event WHERE portfolio_id=%s
          ORDER BY seq''', (dto['id'],)).fetchall()
    assert [(e['seq'], e['action']) for e in events] == [(1, 'CREATE'), (2, 'DELETE')]


def test_auto_number_counts_deleted_rows_and_never_reuses(client):
    numbers = []
    created = [create(client) for _ in range(3)]
    for dto in created:
        numbers.append(int(dto['title'].rsplit('_v', 1)[1]))
    assert numbers == list(range(numbers[0], numbers[0] + 3))
    for dto in created[1:]:
        client.post(path('chaewon', dto['id']) + '/delete', headers=headers('chaewon'),
                    json={'expectedVersion': dto['version']})
    assert create(client)['title'] == f'포트폴리오_v{numbers[2] + 1}'


def test_clone_copies_the_document_and_does_not_touch_the_source(client):
    source = ready(client)
    clone = create(client, sourcePortfolioId=source['id'])
    assert clone['notImported'] == [] and clone['id'] != source['id'] and clone['title'] != source['title']
    assert personal(clone['document'])['email'] == 'student@example.test'
    document = deepcopy(clone['document'])
    personal(document)['email'] = 'changed@example.test'
    save(client, clone, document=document)
    assert personal(client.get(path('chaewon', source['id']), headers=headers('chaewon'))
                    .json()['document'])['email'] == 'student@example.test'
    theirs = create(client, 'changwon')
    response = client.post(path(), headers={**headers('chaewon'), **key()},
                           json={'sourcePortfolioId': theirs['id']})
    assert response.status_code == 404


def test_create_retry_returns_the_same_portfolio_and_stores_no_document(client):
    idempotency = key()
    first = client.post(path(), headers={**headers('chaewon'), **idempotency}, json={'title': '재시도'})
    second = client.post(path(), headers={**headers('chaewon'), **idempotency}, json={'title': '재시도'})
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    stored = one('''SELECT response FROM dc.idempotency WHERE key=%s AND route='POST /students/portfolios' ''',
                 idempotency['Idempotency-Key'])['response']
    assert set(stored) == {'id', 'notImported'}


def test_large_resume_is_reported_not_imported(client):
    resume = client.post('/api/v1/job-resumes', headers=headers('chaewon'),
                         json={'title': '아주 긴 자소서', 'content': '가' * 100000})
    assert resume.status_code == 201, resume.text
    try:
        dto = create(client)
        assert dto['notImported'] == [{'sourceRef': 'resume:' + resume.json()['id'], 'title': '아주 긴 자소서'}]
        assert section(dto['document'], 'coverLetter')['items'] == []
    finally:
        client.delete('/api/v1/job-resumes/' + resume.json()['id'], headers=headers('chaewon'))


def test_portfolio_source_lists_every_candidate_with_a_source_ref(client):
    response = client.get('/api/v1/students/chaewon/portfolio-source', headers=headers('chaewon'))
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {'personal', 'sections'} and body['personal']['name']
    certificate = next(part for part in body['sections'] if part['key'] == 'certificate')
    assert any(item['verified'] and item['fields']['acquiredOn'] for item in certificate['items'])
    assert all(item['sourceRef'] for part in body['sections'] for item in part['items'])


def test_drafts_stay_with_the_owner(client):
    dto = create(client)
    assert client.get(path('chaewon'), headers=headers('changwon')).status_code == 404
    assert client.get(path('chaewon', dto['id']), headers=headers('changwon')).status_code == 404
    assert client.get('/api/v1/students/chaewon/portfolio-source', headers=headers('changwon')).status_code == 404
    # 본인 경로로 남의 id 를 넣어도 찾지 못한다.
    assert client.get(path('changwon', dto['id']), headers=headers('changwon')).status_code == 404
    assert put(client, dto, 'changwon').status_code == 404
    assert client.post(path('changwon', dto['id']) + '/delete', headers=headers('changwon'),
                       json={'expectedVersion': 1}).status_code == 404
    for identity in ('career_kim', 'cse-1', 'system-admin'):
        for url in (path('chaewon'), path('chaewon', dto['id']), '/api/v1/students/chaewon/portfolio-source'):
            assert client.get(url, headers=headers(identity)).status_code == 403, (identity, url)
        assert client.post(path('chaewon'), headers={**headers(identity), **key()}, json={}).status_code == 403


# ── 동시성 ───────────────────────────────────────────────────────────────

def test_title_race_gives_one_winner_and_no_server_error(client):
    def attempt(_):
        return client.post(path(), headers={**headers('chaewon'), **key()}, json={'title': '경쟁'}).status_code
    with ThreadPoolExecutor(max_workers=4) as executor:
        statuses = sorted(executor.map(attempt, range(4)))
    assert statuses == [201, 409, 409, 409]


def test_twenty_one_concurrent_creates_stop_at_the_limit(client):
    def attempt(_):
        return client.post(path(), headers={**headers('chaewon'), **key()}, json={})
    with ThreadPoolExecutor(max_workers=5) as executor:
        responses = list(executor.map(attempt, range(21)))
    assert sorted(r.status_code for r in responses) == [201] * 20 + [422]
    refused = next(r for r in responses if r.status_code == 422)
    assert refused.json()['detail']['code'] == 'PORTFOLIO_LIMIT'
    assert len(client.get(path(), headers=headers('chaewon')).json()['items']) == 20


def test_snapshot_matches_one_side_when_save_and_submit_race(client):
    for _ in range(3):
        dto = ready(client)
        posting = new_posting(client)
        changed = deepcopy(dto['document'])
        personal(changed)['address'] = '바뀐 주소'

        def do_save():
            return put(client, dto, document=changed)

        def do_submit():
            return submit(client, posting, dto)

        with ThreadPoolExecutor(max_workers=2) as executor:
            saved, applied = executor.submit(do_save), executor.submit(do_submit)
            saved, applied = saved.result(), applied.result()
        assert saved.status_code == 200, saved.text
        if applied.status_code == 201:
            snapshot = client.get(snapshot_path(applied.json()), headers=headers('chaewon')).json()
            assert snapshot['version'] == dto['version']
            assert personal(snapshot['document'])['address'] == '창원시 의창구'
        else:
            assert applied.status_code == 409, applied.text


# ── 문서 규칙 ────────────────────────────────────────────────────────────

def test_required_sections_cannot_be_removed(client):
    dto = create(client)
    for section_key in ('personal', 'education'):
        document = deepcopy(dto['document'])
        section(document, section_key)['enabled'] = False
        response = put(client, dto, document=document)
        assert response.status_code == 422 and response.json()['detail']['code'] == 'REQUIRED_SECTION'


def test_academic_values_cannot_be_forged_but_student_input_stays(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    personal(document).update(name='가짜', studentNo='1', school='다른학교', dept='다른학과', grade=9)
    enrollment = section(document, 'education')['items'][0]
    enrollment['fields'].update(schoolName='다른학교', major='다른전공', status='졸업', gpa='4.5',
                                track='공학계열', admissionType='신입', degree='학사', gpaScale='4.5')
    saved = save(client, dto, document=document)
    assert personal(saved['document'])['name'] == personal(dto['document'])['name']
    assert personal(saved['document'])['school'] == '국립창원대학교' and personal(saved['document'])['grade'] == 3
    fields = section(saved['document'], 'education')['items'][0]['fields']
    assert (fields['schoolName'], fields['status'], fields['gpa']) == ('국립창원대학교', '재학', '4.3')
    assert fields['major'] == personal(dto['document'])['dept']
    assert (fields['track'], fields['admissionType'], fields['degree'], fields['gpaScale']) == ('공학계열', '신입', '학사', '4.5')


def test_enrollment_row_cannot_be_deleted(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    section(document, 'education')['items'] = [manual_item({'schoolName': '다른 대학'})]
    saved = save(client, dto, document=document)
    items = section(saved['document'], 'education')['items']
    assert [item['sourceRef'] for item in items] == ['academic:enrollment', None]


def test_verified_mark_cannot_be_forged(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    certificates = section(document, 'certificate')
    certified = next(item for item in certificates['items'] if item['sourceRef'].startswith('cert:'))
    certified['fields']['issuer'] = '위조 기관'
    forged = manual_item({'issuer': '위조'}, '위조 자격')
    forged['verified'] = True
    lost = manual_item({'issuer': '없는 행'}, '없는 자격')
    lost.update(sourceRef='cert:nonexistent', verified=True)
    language = section(document, 'language')
    language['enabled'] = True
    other = manual_item({'language': '영어'}, '토익')
    other['verified'] = True
    language['items'].append(other)
    certificates['items'] += [forged, lost]
    saved = save(client, dto, document=document)
    by_id = {item['id']: item for item in section(saved['document'], 'certificate')['items']}
    assert by_id[certified['id']]['verified'] is True and by_id[certified['id']]['fields']['issuer'] != '위조 기관'
    assert by_id[forged['id']]['verified'] is False
    assert by_id[lost['id']]['verified'] is False and by_id[lost['id']]['sourceRef'] is None
    assert all(not item['verified'] for item in section(saved['document'], 'language')['items'])


def bad_documents():
    def mutate(change):
        def apply(document):
            change(document)
            return document
        return apply

    def add(section_key, fields, **item):
        return mutate(lambda d: section(d, section_key)['items'].append({**manual_item(fields), **item}))

    return {
        'unknown field': add('military', {'secret': 'x'}),
        'nested value': add('military', {'branch': {'a': 1}}),
        'array value': add('military', {'branch': ['a']}),
        'null value': add('military', {'branch': None}),
        'too long': add('military', {'branch': 'a' * 201}),
        'long description': add('specialty', {'description': 'a' * 10001}),
        'long question': add('coverLetter', {'question': 'a' * 2001}),
        'nul char': add('military', {'branch': 'a\u0000b'}),
        'nul in title': add('military', {}, title='a\u0000'),
        'bad id': add('military', {}, id='a b'),
        'bad skill level': add('skill', {'level': 6}),
        'boolean skill level': add('skill', {'level': True}),
        'string skill level': add('skill', {'level': '3'}),
        'bad link': add('experience', {'link': 'javascript:void(0)'}),
        'unknown personal key': mutate(lambda d: personal(d).update(secret='x')),
        'nested personal': mutate(lambda d: personal(d).update(address={'a': 1})),
        'schema version': mutate(lambda d: d.update(schemaVersion=2)),
        'extra top key': mutate(lambda d: d.update(extra=1)),
        'unknown section': mutate(lambda d: d['sections'].append({'key': 'unknown', 'enabled': False, 'items': []})),
        'duplicate section': mutate(lambda d: d['sections'].append(deepcopy(section(d, 'military')))),
        'missing section': mutate(lambda d: d['sections'].remove(section(d, 'military'))),
        'items on personal': mutate(lambda d: section(d, 'personal').update(items=[])),
        'data on section': mutate(lambda d: section(d, 'military').update(data={})),
        'too many items': mutate(lambda d: section(d, 'specialty')['items'].extend(manual_item() for _ in range(51))),
        'too many documents': mutate(lambda d: section(d, 'document')['items'].extend(manual_item() for _ in range(11))),
    }


@pytest.mark.parametrize('name', list(bad_documents()))
def test_invalid_document_is_refused_without_a_server_error(client, name):
    dto = create(client)
    document = bad_documents()[name](deepcopy(dto['document']))
    response = put(client, dto, document=document)
    assert response.status_code == 422, response.text
    assert response.json()['detail']['code'] == 'INVALID_DOCUMENT'
    assert client.get(path('chaewon', dto['id']), headers=headers('chaewon')).json()['version'] == dto['version']


def test_lone_surrogate_is_refused_without_a_server_error(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    section(document, 'specialty')['items'].append(manual_item({'description': '\ud800'}))
    # json.dumps 의 ASCII 이스케이프로 보내야 서버가 외톨이 서로게이트를 받는다.
    response = client.put(path('chaewon', dto['id']), headers={**headers('chaewon'), 'Content-Type': 'application/json'},
                          content=json.dumps({'title': dto['title'], 'document': document,
                                              'expectedVersion': dto['version']}))
    assert response.status_code == 422, response.text


def test_duplicate_item_id_is_refused(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    item = manual_item()
    section(document, 'specialty')['items'] += [item, deepcopy(item)]
    assert put(client, dto, document=document).status_code == 422


def test_long_company_question_and_link_are_saved(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    section(document, 'coverLetter')['items'] = [manual_item({'question': '가' * 2000, 'answer': '답변'}, title='가' * 200)]
    section(document, 'experience')['items'] = [manual_item({'link': 'https://example.com/' + 'a' * 1900})]
    assert put(client, dto, document=document).status_code == 200


def test_document_size_limit_is_measured_in_utf8_bytes(client):
    dto = create(client)
    document = deepcopy(dto['document'])
    section(document, 'specialty')['items'] = [manual_item({'description': '가' * 10000}) for _ in range(10)]
    response = put(client, dto, document=document)
    assert response.status_code == 422
    detail = response.json()['detail']
    assert detail['code'] == 'DOCUMENT_TOO_LARGE' and detail['currentBytes'] > 262144
    section(document, 'specialty')['items'] = [manual_item({'description': 'a' * 10000}) for _ in range(10)]
    assert put(client, dto, document=document).status_code == 200


def test_bad_title_is_refused(client):
    dto = create(client)
    for title in ('a' * 61, 'a\u0000b'):
        assert put(client, dto, title=title).status_code == 422, title
    assert client.post(path(), headers={**headers('chaewon'), **key()}, json={'title': '   '}).status_code == 422


# ── 파일 ─────────────────────────────────────────────────────────────────

def with_photo(document, file_id):
    personal(document)['photoFileId'] = file_id
    return document


def with_attachment(document, file_id, enabled=True):
    part = section(document, 'document')
    part['enabled'] = enabled
    part['items'].append(manual_item({'fileId': file_id}, '첨부'))
    return document


def test_upload_slots_and_owner_are_enforced(client):
    response = client.post('/api/v1/portfolio-files?slot=PORTFOLIO_PHOTO&name=a.pdf',
                           headers={**headers('chaewon'), 'Content-Type': 'application/pdf'}, content=b'%PDF-')
    assert response.status_code == 422, '사진 슬롯에 pdf 가 들어갔다'
    assert client.post('/api/v1/portfolio-files?slot=RESUME&name=a.pdf', headers=headers('chaewon'),
                       content=b'x').status_code == 422
    assert client.post('/api/v1/portfolio-files?slot=PORTFOLIO_PHOTO&name=a.png', headers=headers('career_kim'),
                       content=b'x').status_code == 403


def test_saved_file_is_claimed_for_the_student_and_shared_between_versions(client):
    photo = upload(client)
    attachment = upload_document(client)
    first = create(client)
    second = create(client)
    saved = save(client, first, document=with_attachment(with_photo(deepcopy(first['document']), photo['id']),
                                                         attachment['id']))
    assert set(saved['files']) == {photo['id'], attachment['id']}
    assert saved['files'][photo['id']]['downloadUrl'] == '/api/v1/portfolio-files/' + photo['id']
    assert save(client, second, document=with_photo(deepcopy(second['document']), photo['id']))['files'][photo['id']]
    row = one('SELECT owner_kind,owner_id,slot FROM dc.file_object WHERE id=%s', photo['id'])
    assert row['owner_kind'] == 'STUDENT_PORTFOLIO' and row['slot'] == 'PORTFOLIO_PHOTO'
    assert row['owner_id'] == one("SELECT intg_uid FROM dc.person WHERE alias='chaewon'")['intg_uid']
    assert client.get('/api/v1/portfolio-files/' + photo['id'], headers=headers('chaewon')).status_code == 200
    assert client.get('/api/v1/portfolio-files/' + photo['id'], headers=headers('changwon')).status_code == 404
    assert client.get('/api/v1/portfolio-files/' + photo['id'], headers=headers('career_kim')).status_code == 404
    # /job-files 는 새 소유 종류를 회차로 찾지 못해 닫힌다.
    for identity in ('chaewon', 'changwon', 'career_kim'):
        assert client.get('/api/v1/job-files/' + photo['id'], headers=headers(identity)).status_code == 404, identity


def test_foreign_or_wrong_slot_files_are_refused(client):
    dto = create(client)
    theirs = upload(client, identity='changwon')
    resume = client.post('/api/v1/job-files?slot=RESUME&name=a.pdf',
                         headers={**headers('chaewon'), 'Content-Type': 'application/pdf'},
                         content=pdf_bytes()).json()
    attachment = upload_document(client)
    photo = upload(client)
    cases = (with_photo(deepcopy(dto['document']), theirs['id']),
             with_photo(deepcopy(dto['document']), resume['id']),
             with_photo(deepcopy(dto['document']), attachment['id']),
             with_photo(deepcopy(dto['document']), 'nonexistent'),
             with_attachment(deepcopy(dto['document']), theirs['id']),
             with_attachment(deepcopy(dto['document']), resume['id']),
             with_attachment(deepcopy(dto['document']), photo['id']))
    for document in cases:
        response = put(client, dto, document=document)
        assert response.status_code == 422, response.text
        assert response.json()['detail']['code'] == 'INVALID_FILE'


def test_growth_attachment_is_referenced_without_changing_its_owner(client):
    file, entry = growth_attachment(client)
    dto = create(client)
    saved = save(client, dto, document=with_attachment(deepcopy(dto['document']), file['id']))
    assert saved['files'][file['id']]['downloadUrl'] == '/api/v1/growth-files/' + file['id']
    row = one('SELECT owner_kind,owner_id FROM dc.file_object WHERE id=%s', file['id'])
    assert (row['owner_kind'], row['owner_id']) == ('GROWTH_ENTRY', entry['id'])
    source = client.get('/api/v1/students/chaewon/portfolio-source', headers=headers('chaewon')).json()
    documents = next(part for part in source['sections'] if part['key'] == 'document')['items']
    assert any(item['fields']['fileId'] == file['id'] and item['sourceRef'] == 'growth:' + entry['id']
               for item in documents)
    assert section(create(client)['document'], 'document')['items'] == [], '성장 첨부는 학생이 고른다'


# ── 제출 ─────────────────────────────────────────────────────────────────

def test_capability_opens_for_students_only(client):
    capability = client.get('/api/v1/jobs/capabilities', headers=headers('chaewon')).json()
    assert capability['canApplyWithPortfolio'] is True and capability['unavailable'] == []
    staff = client.get('/api/v1/jobs/capabilities', headers=headers('career_kim')).json()
    assert staff['canApplyWithPortfolio'] is False


def test_submission_stores_a_snapshot_and_names_the_attachment(client):
    application, portfolio, _ = submitted(client)
    attempt = application['currentAttempt']
    assert attempt['attachmentKind'] == 'PORTFOLIO' and attempt['attachmentFileId'] is None
    assert attempt['attachmentName'] == portfolio['title'] and attempt['attachmentState'] == 'AVAILABLE'
    row = one('''SELECT t.portfolio_owner_uid,jp.portfolio_id,jp.portfolio_version FROM dc.job_application_attempt t
      JOIN dc.job_attempt_portfolio jp ON jp.attempt_id=t.id WHERE t.application_id=%s''', application['id'])
    assert row['portfolio_id'] == portfolio['id'] and row['portfolio_version'] == portfolio['version']
    listed = client.get('/api/v1/job-applications/mine', headers=headers('chaewon')).json()['items']
    assert next(a for a in listed if a['id'] == application['id'])['currentAttempt']['attachmentName'] == portfolio['title']


def test_missing_values_incomplete_stale_and_foreign_portfolios_are_refused(client):
    posting = new_posting(client)
    url = f"/api/v1/jobs/{posting['id']}/applications"
    for attachment in ({'kind': 'PORTFOLIO'}, {'kind': 'PORTFOLIO', 'portfolioId': 'spf_x'},
                       {'kind': 'PORTFOLIO', 'expectedPortfolioVersion': 1}):
        response = client.post(url, headers={**headers('chaewon'), **key()},
                               json={'expectedPostingVersion': posting['version'], 'attachment': attachment})
        assert response.status_code == 422, attachment
    draft = create(client)
    blank = deepcopy(draft['document'])
    personal(blank).update(email='', phone='')
    incomplete = submit(client, posting, save(client, draft, document=blank))
    assert incomplete.status_code == 422 and incomplete.json()['detail']['code'] == 'PORTFOLIO_INCOMPLETE'
    assert set(incomplete.json()['detail']['missing']) == {'personal.email', 'personal.phone'}
    finished = ready(client)
    stale = submit(client, posting, {**finished, 'version': finished['version'] - 1})
    assert stale.status_code == 409 and stale.json()['detail']['currentVersion'] == finished['version']
    theirs = ready(client, 'changwon')
    assert submit(client, posting, theirs).status_code == 404
    gone = ready(client)
    client.post(path('chaewon', gone['id']) + '/delete', headers=headers('chaewon'),
                json={'expectedVersion': gone['version']})
    assert submit(client, posting, gone).status_code == 404
    assert not client.get('/api/v1/job-applications/mine?postingId=' + posting['id'],
                          headers=headers('chaewon')).json()['items'], '실패한 제출이 지원을 남겼다'


def test_stale_completion_flag_is_not_trusted_on_submission(client):
    dto = ready(client)
    with pool.connection() as conn:
        conn.execute('''UPDATE dc.student_portfolio SET is_complete=true,
          document=jsonb_set(document,'{sections,0,data,phone}','""') WHERE id=%s''', (dto['id'],))
    response = submit(client, new_posting(client), dto)
    assert response.status_code == 422 and response.json()['detail']['code'] == 'PORTFOLIO_INCOMPLETE'


def test_resume_file_path_still_works_and_rejects_mixed_attachments(client):
    posting = new_posting(client)
    assert apply_as(client, 'chaewon', posting).status_code == 201
    other = new_posting(client)
    response = client.post(f"/api/v1/jobs/{other['id']}/applications", headers={**headers('chaewon'), **key()},
                           json={'expectedPostingVersion': other['version'],
                                 'attachment': {'kind': 'RESUME_FILE', 'fileId': 'x', 'portfolioId': 'spf_x'}})
    assert response.status_code == 422


def test_submission_retry_creates_one_attempt(client):
    dto = ready(client)
    posting = new_posting(client)
    idempotency = key()
    first = submit(client, posting, dto, idempotency=idempotency)
    second = submit(client, posting, dto, idempotency=idempotency)
    assert first.status_code == second.status_code == 201 and first.json() == second.json()
    count = one('''SELECT count(*) AS n FROM dc.job_attempt_portfolio jp JOIN dc.job_application_attempt t
      ON t.id=jp.attempt_id WHERE t.application_id=%s''', first.json()['id'])['n']
    assert count == 1


def test_same_portfolio_can_go_to_several_postings(client):
    dto = ready(client)
    assert submit(client, new_posting(client), dto).status_code == 201
    assert submit(client, new_posting(client), dto).status_code == 201


def test_disabled_sections_and_their_files_do_not_reach_the_snapshot(client):
    hidden = upload_document(client, name='뺀 첨부.pdf')
    kept = upload(client)
    dto = ready(client)
    document = with_attachment(with_photo(deepcopy(dto['document']), kept['id']), hidden['id'], enabled=False)
    private = section(document, 'military')
    private['items'].append(manual_item({'exemptionReason': '비공개 사유'}))
    private['enabled'] = False
    saved = save(client, dto, document=document)
    application, _, _ = submitted(client, saved)
    body = client.get(snapshot_path(application), headers=headers('career_kim')).json()
    keys = {part['key'] for part in body['document']['sections']}
    assert 'military' not in keys and 'document' not in keys
    assert all(part['enabled'] for part in body['document']['sections'])
    assert '비공개 사유' not in str(body) and set(body['files']) == {kept['id']}
    assert body['files'][kept['id']]['downloadUrl'] == snapshot_path(application) + '/files/' + kept['id']
    assert client.get(snapshot_path(application) + '/files/' + hidden['id'],
                      headers=headers('career_kim')).status_code == 404
    assert client.get(snapshot_path(application) + '/files/' + hidden['id'],
                      headers=headers('chaewon')).status_code == 404, '학생도 제출본에 없는 파일은 열 수 없다'
    assert client.get('/api/v1/portfolio-files/' + hidden['id'], headers=headers('chaewon')).status_code == 200


def test_snapshot_is_unchanged_after_source_edit_and_delete(client):
    application, portfolio, _ = submitted(client)
    before = client.get(snapshot_path(application), headers=headers('chaewon')).json()
    document = deepcopy(portfolio['document'])
    personal(document)['address'] = '다른 주소'
    saved = save(client, portfolio, document=document, title='바뀐 이름')
    client.post(path('chaewon', portfolio['id']) + '/delete', headers=headers('chaewon'),
                json={'expectedVersion': saved['version']})
    assert client.get(snapshot_path(application), headers=headers('chaewon')).json() == before


def test_snapshot_rows_reject_update_and_delete(client):
    photo = upload(client)
    dto = ready(client)
    application, _, _ = submitted(client, save(client, dto, document=with_photo(deepcopy(dto['document']), photo['id'])))
    attempt = one('SELECT id FROM dc.job_application_attempt WHERE application_id=%s', application['id'])['id']
    for statement in ("UPDATE dc.job_attempt_portfolio SET title='x' WHERE attempt_id=%s",
                      'DELETE FROM dc.job_attempt_portfolio WHERE attempt_id=%s',
                      "UPDATE dc.job_attempt_portfolio_file SET file_id=file_id WHERE attempt_id=%s",
                      'DELETE FROM dc.job_attempt_portfolio_file WHERE attempt_id=%s'):
        with pytest.raises(psycopg.Error):
            with pool.connection() as conn:
                conn.execute(statement, (attempt,))


def test_reapply_makes_a_new_snapshot_per_attempt(client):
    application, portfolio, posting = submitted(client)
    head = headers('chaewon')
    cancelled = client.post(f"/api/v1/job-applications/{application['id']}/cancel", headers=head,
                            json={'expectedVersion': application['version'], 'reason': ''})
    assert cancelled.status_code == 200, cancelled.text
    document = deepcopy(portfolio['document'])
    personal(document)['address'] = '재지원 주소'
    newer = save(client, portfolio, document=document)
    again = submit(client, posting, newer, expected_version=cancelled.json()['version'])
    assert again.status_code == 201, again.text
    with pool.connection() as conn:
        rows = conn.execute('''SELECT t.attempt_no,jp.portfolio_version FROM dc.job_application_attempt t
          JOIN dc.job_attempt_portfolio jp ON jp.attempt_id=t.id WHERE t.application_id=%s ORDER BY t.attempt_no''',
          (application['id'],)).fetchall()
    assert [(r['attempt_no'], r['portfolio_version']) for r in rows] == [(1, portfolio['version']), (2, newer['version'])]
    body = client.get(snapshot_path(application), headers=head).json()
    assert body['attemptNo'] == 2 and personal(body['document'])['address'] == '재지원 주소'


def test_reapply_with_a_file_closes_the_previous_snapshot_but_keeps_the_row(client):
    application, _, posting = submitted(client)
    cancelled = client.post(f"/api/v1/job-applications/{application['id']}/cancel", headers=headers('chaewon'),
                            json={'expectedVersion': application['version'], 'reason': ''}).json()
    assert apply_as(client, 'chaewon', posting, expectedVersion=cancelled['version']).status_code == 201
    assert client.get(snapshot_path(application), headers=headers('chaewon')).status_code == 404
    assert client.get(snapshot_path(application), headers=headers('career_kim')).status_code == 404
    assert one('''SELECT count(*) AS n FROM dc.job_attempt_portfolio jp JOIN dc.job_application_attempt t
      ON t.id=jp.attempt_id WHERE t.application_id=%s''', application['id'])['n'] == 1


def test_snapshot_of_another_student_breaks_the_composite_key(client):
    application, _, _ = submitted(client)
    theirs = ready(client, 'changwon')
    attempt = one('SELECT id,portfolio_owner_uid FROM dc.job_application_attempt WHERE application_id=%s',
                  application['id'])
    mine, other = attempt['portfolio_owner_uid'], one("SELECT intg_uid FROM dc.person WHERE alias='changwon'")['intg_uid']
    # 스냅샷이 아직 없는 회차를 트랜잭션 안에서만 만든다. 예외가 나면 함께 되돌아간다.
    copy = """INSERT INTO dc.job_application_attempt SELECT (jsonb_populate_record(t,
      '{"id":"jatt_contract","attempt_no":99}'::jsonb)).* FROM dc.job_application_attempt t WHERE t.id=%s"""
    insert = """INSERT INTO dc.job_attempt_portfolio(attempt_id,student_uid,portfolio_id,portfolio_version,title,document)
      VALUES('jatt_contract',%s,%s,1,'x','{}'::jsonb)"""
    for student_uid, constraint in ((mine, 'fk_job_attempt_portfolio_source'), (other, 'fk_job_attempt_portfolio_attempt')):
        with pytest.raises(psycopg.errors.ForeignKeyViolation, match=constraint):
            with pool.connection() as conn:
                conn.execute(copy, (attempt['id'],))
                conn.execute(insert, (student_uid, theirs['id']))


# ── 열람 경계·감사 ───────────────────────────────────────────────────────

def test_view_boundary_for_staff_and_students(client):
    photo = upload(client)
    dto = ready(client)
    application, _, _ = submitted(client, save(client, dto, document=with_photo(deepcopy(dto['document']), photo['id'])))
    url = snapshot_path(application)
    file_url = url + '/files/' + photo['id']
    attempt = one('SELECT id FROM dc.job_application_attempt WHERE application_id=%s', application['id'])['id']

    for identity, status in (('changwon', 404), ('psych_yoon', 403), ('cse-1', 403), ('asst_kim', 403)):
        assert client.get(url, headers=headers(identity)).status_code == status, identity
        assert client.get(file_url, headers=headers(identity)).status_code == status, identity
    assert audit_count(attempt) == 0 and audit_count(photo['id']) == 0, '실패한 열람이 감사에 남았다'

    assert client.get(url, headers=headers('chaewon')).status_code == 200
    assert client.get(file_url, headers=headers('chaewon')).status_code == 200
    assert audit_count(attempt) == 0 and audit_count(photo['id']) == 0, '학생 본인 열람은 감사 대상이 아니다'

    assert client.get(url, headers=headers('career_kim')).status_code == 200
    assert audit_count(attempt) == 1
    assert client.get(file_url, headers=headers('career_kim')).content
    assert audit_count(photo['id']) == 1
    row = one("SELECT action,target_kind,row_count FROM dc.job_access_event WHERE target_id=%s", attempt)
    assert (row['action'], row['target_kind'], row['row_count']) == ('VIEW_DOCUMENT', 'JOB_ATTEMPT_PORTFOLIO', 1)


def test_staff_with_the_menu_but_outside_the_scope_gets_404(client):
    application, _, _ = submitted(client)
    url = snapshot_path(application)
    with pool.connection() as conn:
        conn.execute("INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('jobs.4','assistant') ON CONFLICT DO NOTHING")
    try:
        assert client.get(url, headers=headers('asst_kim')).status_code == 404
    finally:
        with pool.connection() as conn:
            conn.execute("DELETE FROM dc.menu_auth WHERE menu_code='jobs.4' AND role_code='assistant'")


def test_cancelled_application_can_still_be_viewed(client):
    application, _, _ = submitted(client)
    response = client.post(f"/api/v1/job-applications/{application['id']}/cancel", headers=headers('chaewon'),
                           json={'expectedVersion': application['version'], 'reason': ''})
    assert response.status_code == 200, response.text
    assert client.get(snapshot_path(application), headers=headers('chaewon')).status_code == 200
    assert client.get(snapshot_path(application), headers=headers('career_kim')).status_code == 200


def test_resume_file_application_has_no_snapshot(client):
    application = apply_as(client, 'chaewon', new_posting(client)).json()
    assert application['currentAttempt']['attachmentKind'] == 'RESUME_FILE'
    assert client.get(snapshot_path(application), headers=headers('career_kim')).status_code == 404


def test_snapshot_files_survive_version_delete_and_logical_file_delete(client):
    attachment = upload_document(client)
    dto = ready(client)
    saved = save(client, dto, document=with_attachment(deepcopy(dto['document']), attachment['id']))
    application, _, _ = submitted(client, saved)
    client.post(path('chaewon', dto['id']) + '/delete', headers=headers('chaewon'),
                json={'expectedVersion': saved['version']})
    url = snapshot_path(application) + '/files/' + attachment['id']
    assert client.get(url, headers=headers('career_kim')).status_code == 200
    with pool.connection() as conn:
        conn.execute("""UPDATE dc.file_object SET state='DELETED',deleted_at=now(),deleted_by=uploaded_by
          WHERE id=%s""", (attachment['id'],))
    assert client.get(url, headers=headers('career_kim')).status_code == 200
    assert client.get(url, headers=headers('chaewon')).status_code == 200


def test_application_account_has_exactly_the_granted_privileges(client):
    expected = {'student_portfolio': ('SELECT', 'INSERT', 'UPDATE'), 'student_portfolio_event': ('SELECT', 'INSERT'),
                'job_attempt_portfolio': ('SELECT', 'INSERT'), 'job_attempt_portfolio_file': ('SELECT', 'INSERT')}
    with pool.connection() as conn:
        for table, granted in expected.items():
            for privilege in ('SELECT', 'INSERT', 'UPDATE', 'DELETE'):
                allowed = conn.execute("SELECT has_table_privilege('dc_app',%s,%s) AS ok",
                                       ('dc.' + table, privilege)).fetchone()['ok']
                assert allowed == (privilege in granted), (table, privilege)
