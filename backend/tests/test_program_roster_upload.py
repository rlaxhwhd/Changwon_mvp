"""엑셀 명단 등록 — 차수·학번으로 신청자·선발자를 넣는다. 한 행이라도 틀리면 아무것도 저장하지 않는다."""
from io import BytesIO
from zipfile import ZipFile

import pytest

from app.db import connection, pool
from app.main import app
from security_fixtures import pdf_bytes
from test_api import headers
from test_blacklists import student_nos
from test_employment_report import xlsx
from test_program_rounds import round_body
from test_programs import apply_as, new_program


@pytest.fixture(autouse=True)
def rollback_roster(client):
    with pool.connection() as conn, conn.transaction(force_rollback=True):
        app.dependency_overrides[connection] = lambda: conn
        try:
            yield conn
        finally:
            app.dependency_overrides.pop(connection, None)


def upload(client, program_id, rows, selection='PENDING', actor='career_kim'):
    return client.post(f'/api/v1/programs/{program_id}/applications/upload', params={'selection': selection},
                       headers=headers(actor), content=xlsx([['차수', '학번'], *rows]))


def applicants(client, program_id):
    detail = client.get(f'/api/v1/programs/{program_id}', headers=headers('career_kim')).json()
    return {a['studentId']: (a['round'], a['selectionStatus']) for a in detail['applicants']}


def test_upload_registers_applicants_per_round_even_after_recruiting(client, rollback_roster):
    p = new_program(client, capacity=5, selectionMethod='REVIEW', endDate='2026-01-02',
                    rounds=[round_body(2, capacity=5, selectionCapacity=5, selectionMethod='REVIEW')])
    a, b = student_nos(rollback_roster, 'chaewon', 'changwon')
    response = upload(client, p['id'], [['1', a], ['2차', b]])
    assert response.status_code == 201, response.text
    assert response.json() == {'registered': 2, 'skipped': 0}
    assert applicants(client, p['id']) == {'chaewon': (1, 'PENDING'), 'changwon': (2, 'PENDING')}
    assert upload(client, p['id'], [['1', a]]).json() == {'registered': 0, 'skipped': 1}


def test_selected_upload_adds_and_promotes_within_selection_limit(client, rollback_roster):
    p = new_program(client, capacity=5, selectionCapacity=2, selectionMethod='REVIEW')
    assert apply_as(client, 'chaewon', p['id']).status_code == 201
    a, b, c = student_nos(rollback_roster, 'chaewon', 'changwon', 'jiwoo')
    over = upload(client, p['id'], [['1', a], ['1', b], ['1', c]], 'SELECTED')
    assert over.status_code == 409 and '선발 정원' in over.json()['detail']
    assert applicants(client, p['id']) == {'chaewon': (1, 'PENDING')}
    done = upload(client, p['id'], [['1', a], ['1', b]], 'SELECTED')
    assert done.status_code == 201, done.text
    assert applicants(client, p['id']) == {'chaewon': (1, 'SELECTED'), 'changwon': (1, 'SELECTED')}


def test_upload_is_all_or_nothing_with_row_errors(client, rollback_roster):
    p = new_program(client, capacity=5, selectionMethod='REVIEW',
                    rounds=[round_body(2, capacity=5, selectionCapacity=5, selectionMethod='REVIEW')])
    assert apply_as(client, 'chaewon', p['id']).status_code == 201
    a, b = student_nos(rollback_roster, 'chaewon', 'changwon')
    bad = upload(client, p['id'], [['1', b], ['9', a], ['1', '없는학번']])
    assert bad.status_code == 422
    assert [e['row'] for e in bad.json()['detail']['errors']] == [3, 4]
    moved = upload(client, p['id'], [['1', b], ['2', a]])
    assert moved.status_code == 422 and moved.json()['detail']['errors'][0]['row'] == 3
    assert applicants(client, p['id']) == {'chaewon': (1, 'PENDING')}
    broken = client.post(f"/api/v1/programs/{p['id']}/applications/upload", headers=headers('career_kim'), content=b'not a zip')
    assert broken.status_code == 422
    assert upload(client, p['id'], [['1', b]], actor='chaewon').status_code == 403


def test_first_come_upload_respects_capacity_and_selects(client, rollback_roster):
    p = new_program(client, capacity=1, selectionMethod='FIRST_COME')
    a, b = student_nos(rollback_roster, 'chaewon', 'changwon')
    assert upload(client, p['id'], [['1', a], ['1', b]]).status_code == 409
    assert upload(client, p['id'], [['1', a]]).status_code == 201
    assert applicants(client, p['id']) == {'chaewon': (1, 'SELECTED')}


def test_files_zip_follows_tab_round_and_role(client):
    question = dict(id='question_a', type='FILE', question='첨부', required=True, options=[], content='', maxFiles=1)
    p = new_program(client, capacity=5, selectionMethod='REVIEW', applicationQuestions=[question])
    stored = client.post('/api/v1/program-files', params={'slot': 'PROGRAM_APPLICATION_ATTACHMENT', 'name': 'test.pdf'},
                         content=pdf_bytes(), headers={**headers('chaewon'), 'Content-Type': 'application/pdf'})
    assert stored.status_code == 201, stored.text
    assert apply_as(client, 'chaewon', p['id'], answers={'question_a': [stored.json()['id']]}).status_code == 201
    url = f"/api/v1/programs/{p['id']}/applications/files.zip"
    response = client.get(url, headers=headers('career_kim'))
    assert response.status_code == 200, response.text
    with ZipFile(BytesIO(response.content)) as book:
        assert [name.rsplit('_', 1)[-1] for name in book.namelist()] == ['test.pdf']
    assert client.get(url, params={'selected': True}, headers=headers('career_kim')).status_code == 404
    assert client.get(url, params={'round': 2}, headers=headers('career_kim')).status_code == 404
    assert client.get(url, headers=headers('chaewon')).status_code == 403
