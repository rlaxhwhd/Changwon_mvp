"""학생 포트폴리오 신규 응답 계약 — fixtures/student_portfolio.json(work-order 6장, 팀장 대조 대상).

`files` 사전의 키는 파일 id 라 값마다 다르므로 값의 형태를 따로 비교한다.
"""
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path

import pytest

from app.db import pool
from contracts.contract_assertions import assert_same_json_shape
from portfolio_test_support import (create, growth_attachment, key, manual_item, path, personal, retire_portfolios,
                                    save, section, submit, upload)
from test_api import headers
from test_jobs import new_posting

FIXTURE = json.loads((Path(__file__).parent / 'fixtures/student_portfolio.json').read_text(encoding='utf-8'))
ENTRIES = {'PROJECT': {'role': '개발', 'periodText': '2026.03 ~ 2026.06', 'description': '설명', 'result': '성과'},
           'LANGUAGE': {'language': '영어', 'testName': 'TOEIC', 'scoreText': '900'},
           'CERTIFICATE': {'issuer': '기관', 'certificateNumber': 'A-1'},
           'SKILL': {'level': 4},
           'AWARD': {'rank': '대상', 'host': '창원시', 'description': '수상'}}


def without_files(body):
    return {name: value for name, value in body.items() if name != 'files'}


def assert_files(expected, body):
    template = next(iter(expected['files'].values()))
    assert body['files']
    for value in body['files'].values():
        assert_same_json_shape(template, value)


@pytest.fixture
def sources(client):
    """원본 항목이 전부 비어 있지 않은 학생을 만들고 끝나면 되돌린다."""
    retire_portfolios()
    with pool.connection() as conn:
        uid = conn.execute("SELECT intg_uid FROM dc.person WHERE alias='chaewon'").fetchone()['intg_uid']
        program = conn.execute('SELECT program_id,selection_code,selected_at,outcome_code FROM dc.program_apply '
                               'WHERE student_uid=%s LIMIT 1', (uid,)).fetchone()
        conn.execute('''UPDATE dc.program_apply SET selection_code='SELECTED',selected_at=now(),outcome_code='COMPLETED'
          WHERE program_id=%s AND student_uid=%s''', (program['program_id'], uid))
    base = '/api/v1/students/chaewon/growth'
    profile_version = client.get(base + '/profile', headers=headers('chaewon')).json()['version']
    started = datetime.now(timezone.utc)
    created = []
    for kind, content in ENTRIES.items():
        version = client.get(base + '/profile', headers=headers('chaewon')).json()['version']
        response = client.post(base + '/entries', headers={**headers('chaewon'), **key()},
                               json={'kind': kind, 'title': '계약 ' + kind, 'content': content,
                                     'expectedProfileVersion': version})
        assert response.status_code == 201, response.text
        created.append(response.json()['id'])
    attachment, entry = growth_attachment(client)
    created.append(entry['id'])
    yield attachment
    with pool.connection() as conn:
        # 이 폴더는 test_growth 보다 먼저 돈다. 그쪽은 시드 건수를 단정하므로 행을 남기지 않는다.
        # 이력 표는 불변이라 복제 역할로 트리거를 끄고 지운다. 이 트랜잭션에만 적용된다.
        conn.execute('SET LOCAL session_replication_role=replica')
        conn.execute('DELETE FROM dc.growth_entry_file WHERE entry_id=ANY(%s)', (created,))
        conn.execute('DELETE FROM dc.growth_event WHERE student_uid=%s AND created_at>=%s', (uid, started))
        conn.execute('DELETE FROM dc.growth_entry WHERE id=ANY(%s)', (created,))
        conn.execute('UPDATE dc.growth_profile SET version=%s WHERE student_uid=%s', (profile_version, uid))
        conn.execute('''UPDATE dc.program_apply SET selection_code=%s,selected_at=%s,outcome_code=%s
          WHERE program_id=%s AND student_uid=%s''',
          (program['selection_code'], program['selected_at'], program['outcome_code'], program['program_id'], uid))
    retire_portfolios()


def full_document(dto, attachment, photo):
    """16개 항목 전체와 sourceRef null·문자열, verified 참·거짓 변형을 담은 문서."""
    document = deepcopy(dto['document'])
    for part in document['sections']:
        if part['key'] == 'personal':
            continue
        part['enabled'] = True
        fields = {'level': 3} if part['key'] == 'skill' else {}
        part['items'].append(manual_item(fields))
    section(document, 'document')['items'] = [
        {'id': 'growthfile', 'sourceRef': 'growth:contract', 'verified': False, 'title': '성장 첨부',
         'fields': {'fileId': attachment['id'], 'description': ''}},
        manual_item({'description': '파일 없는 설명'})]
    section(document, 'coverLetter')['items'].insert(0, {**manual_item(), 'sourceRef': 'resume:contract'})
    personal(document).update(email='contract@example.test', phone='', photoFileId=photo['id'])
    return document


def test_portfolio_responses_match_the_approved_fixture(client, sources):
    head = headers('chaewon')
    response = client.get('/api/v1/students/chaewon/portfolio-source', headers=head)
    assert response.status_code == 200, response.text
    assert_same_json_shape(FIXTURE['source'], response.json())

    big = client.post('/api/v1/job-resumes', headers=head, json={'title': '긴 자소서', 'content': '가' * 100000}).json()
    try:
        created = create(client)
    finally:
        client.delete('/api/v1/job-resumes/' + big['id'], headers=head)
    assert created['notImported']
    assert_same_json_shape(FIXTURE['created'], {k: v for k, v in created.items() if k not in ('document', 'files')})
    assert create(client, sourcePortfolioId=created['id'])['notImported'] == []

    refreshed = client.get(path('chaewon', created['id']), headers=head).json()
    saved = save(client, refreshed, document=full_document(refreshed, sources, upload(client)))
    assert saved['missing'] == ['personal.phone'] and saved['complete'] is False
    detail = client.get(path('chaewon', saved['id']), headers=head).json()
    assert_same_json_shape(without_files(FIXTURE['detail']), without_files(detail))
    assert_files(FIXTURE['detail'], detail)
    assert_same_json_shape(without_files(FIXTURE['detail']), without_files(saved))

    listed = client.get(path(), headers=head).json()
    assert_same_json_shape(FIXTURE['list'], listed)

    document = deepcopy(saved['document'])
    personal(document)['phone'] = '010-0000-0000'
    ready = save(client, saved, document=document)
    assert ready['complete'] is True and ready['missing'] == []
    application = submit(client, new_posting(client), ready)
    assert application.status_code == 201, application.text
    body = client.get(f"/api/v1/job-applications/{application.json()['id']}/portfolio",
                      headers=headers('career_kim'))
    assert body.status_code == 200, body.text
    body = body.json()
    assert_same_json_shape(without_files(FIXTURE['submitted']), without_files(body))
    assert_files(FIXTURE['submitted'], body)
    assert all(part['enabled'] for part in body['document']['sections'])
    verified = [item['verified'] for item in section(body['document'], 'certificate')['items']]
    assert True in verified and False in verified


def test_existing_application_contract_keeps_its_keys(client, sources):
    """기존 계약 불변 — attempt_dto 키 집합과 capability 키 집합."""
    capability = client.get('/api/v1/jobs/capabilities', headers=headers('chaewon')).json()
    assert set(capability) == {'canManage', 'canManageApplicants', 'canApplyWithFile', 'canApplyWithPortfolio',
                               'canUseTextResume', 'unavailable'}
    dto = create(client)
    document = deepcopy(dto['document'])
    personal(document).update(email='a@example.test', phone='010-0000-0000')
    application = submit(client, new_posting(client), save(client, dto, document=document)).json()
    assert set(application['currentAttempt']) == {
        'attemptNo', 'submittedAt', 'studentNo', 'studentName', 'studentMajor', 'grade', 'enrollmentStatus',
        'collegeCode', 'collegeLabel', 'deptCode', 'deptLabel', 'studentType', 'attachmentKind', 'attachmentState',
        'attachmentFileId', 'attachmentName', 'legacyFileName', 'recommenderId', 'recommenderName'}
