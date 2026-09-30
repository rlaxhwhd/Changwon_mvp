"""Notice round trips, file ownership and configured application answers on an isolated DB."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.db import connection, pool
from app.main import app
from test_api import headers
from test_programs import apply_as, new_program, SERVER_OWNED
from security_fixtures import pdf_bytes


@pytest.fixture(autouse=True)
def rollback_content(client):
    with pool.connection() as conn, conn.transaction(force_rollback=True):
        app.dependency_overrides[connection] = lambda: conn
        try:
            yield conn
        finally:
            app.dependency_overrides.pop(connection, None)


def update(client, program, **patch):
    return client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'), json={
        **{key: value for key, value in program.items() if key not in SERVER_OWNED},
        'expectedVersion': program['version'], **patch})


def question(kind='TEXT', **patch):
    return dict(id='question_a', type=kind, question='지원 시 추가 질문', required=True,
                options=[], content='', maxFiles=1, **patch)


def upload(client, identity='career_kim', slot='PROGRAM_ATTACHMENT'):
    return client.post('/api/v1/program-files', params={'slot': slot, 'name': 'test.pdf'},
                       content=pdf_bytes(),
                       headers={**headers(identity), 'Content-Type': 'application/pdf'})


def test_notice_times_and_questions_round_trip(client):
    p = new_program(client, noticeAt='2026-09-30T10:00:00+09:00', startTime='10:05', endTime='17:30',
                    runStartDate='2026-10-01', runEndDate='2026-10-01', runStartTime='14:10', runEndTime='16:20',
                    applicationQuestions=[question()])
    got = client.get(f"/api/v1/programs/{p['id']}", headers=headers('career_kim')).json()
    assert got['startTime'] == '10:05:00' and got['runEndTime'] == '16:20:00'
    assert got['applicationQuestions'][0]['question'] == '지원 시 추가 질문'
    changed = update(client, got, endTime='18:15')
    assert changed.status_code == 200, changed.text
    assert changed.json()['endTime'] == '18:15:00'
    assert changed.json()['noticeAt'] == got['noticeAt']


def test_invalid_same_day_times_and_choices_rejected(client):
    p = new_program(client, startDate='2026-09-30', endDate='2026-09-30')
    assert update(client, p, startTime='17:00', endTime='10:00').status_code == 422
    assert update(client, p, applicationQuestions=[question('SINGLE')]).status_code == 422


def test_required_answers_saved_with_question_snapshot(client, rollback_content):
    p = new_program(client, applicationQuestions=[question()])
    assert apply_as(client, 'chaewon', p['id']).status_code == 422
    response = apply_as(client, 'chaewon', p['id'], answers={'question_a': '학생 답변'})
    assert response.status_code == 201, response.text
    assert response.json()['applicationAnswers'][0]['value'] == '학생 답변'
    updated = update(client, p, applicationQuestions=[{**question(), 'question': '다음 신청자용 질문'}])
    assert updated.status_code == 200, updated.text
    own = client.get(f"/api/v1/programs/{p['id']}", headers=headers('chaewon')).json()
    assert own['applicants'][0]['applicationAnswers'][0]['question']['question'] == '지원 시 추가 질문'
    other = client.get(f"/api/v1/programs/{p['id']}", headers=headers('changwon')).json()
    assert other['applicants'] == []


def test_notice_attachment_download_and_delete(client):
    uploaded = upload(client)
    assert uploaded.status_code == 201, uploaded.text
    file_id = uploaded.json()['id']
    assert client.get(f'/api/v1/program-files/{file_id}', headers=headers('chaewon')).status_code == 404
    p = new_program(client, attachmentFileIds=[file_id])
    assert p['attachments'][0]['name'] == 'test.pdf'
    assert client.get(f'/api/v1/program-files/{file_id}', headers=headers('chaewon')).status_code == 200
    removed = update(client, p, attachmentFileIds=[])
    assert removed.status_code == 200, removed.text
    assert removed.json()['attachments'] == []
    assert client.get(f'/api/v1/program-files/{file_id}', headers=headers('chaewon')).status_code == 404


def test_student_file_ownership_and_answer_types(client):
    uploaded = upload(client, 'chaewon', 'PROGRAM_APPLICATION_ATTACHMENT')
    assert uploaded.status_code == 201, uploaded.text
    file_id = uploaded.json()['id']
    p = new_program(client, applicationQuestions=[question('FILE')])
    assert apply_as(client, 'changwon', p['id'], answers={'question_a': [file_id]}).status_code == 403
    submitted = apply_as(client, 'chaewon', p['id'], answers={'question_a': [file_id]})
    assert submitted.status_code == 201, submitted.text
    assert client.get(f'/api/v1/program-files/{file_id}', headers=headers('chaewon')).status_code == 200
    assert client.get(f'/api/v1/program-files/{file_id}', headers=headers('changwon')).status_code == 404
    assert upload(client, 'chaewon').status_code == 403


def test_delete_program_and_protected_history(client):
    p = new_program(client)
    assert client.delete(f"/api/v1/programs/{p['id']}", headers=headers('chaewon')).status_code == 403
    assert client.delete(f"/api/v1/programs/{p['id']}", headers=headers('career_kim')).status_code == 204
    assert client.get(f"/api/v1/programs/{p['id']}", headers=headers('career_kim')).status_code == 404


def test_scheduled_notice_hidden_until_publication(client):
    future = (datetime.now(ZoneInfo('Asia/Seoul')) + timedelta(days=1)).isoformat()
    p = new_program(client, noticeAt=future)
    assert client.get(f"/api/v1/programs/{p['id']}", headers=headers('career_kim')).status_code == 200
    assert client.get(f"/api/v1/programs/{p['id']}", headers=headers('chaewon')).status_code == 404
    listing = client.get('/api/v1/programs', params={'q': p['title'], 'pageSize': 100}, headers=headers('chaewon')).json()
    assert p['id'] not in [item['id'] for item in listing['items']]
    assert apply_as(client, 'chaewon', p['id']).status_code == 404


def test_application_window_checks_korean_time(client):
    now = datetime.now(ZoneInfo('Asia/Seoul'))
    start = now + timedelta(hours=1)
    p = new_program(client, startDate=start.date().isoformat(), startTime=start.strftime('%H:%M'))
    assert apply_as(client, 'chaewon', p['id']).status_code == 409
    end = now - timedelta(minutes=1)
    p = new_program(client, endDate=end.date().isoformat(), endTime=end.strftime('%H:%M'))
    assert apply_as(client, 'chaewon', p['id']).status_code == 409
