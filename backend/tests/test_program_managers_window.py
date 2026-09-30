"""Program manager fan-out and KST survey boundaries, on a rollback-only test DB."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app import survey
from app.db import connection, pool
from app.main import app
from test_api import headers
from test_programs import apply_as, new_program, SERVER_OWNED
from test_program_survey import AREAS, form, select_and_complete, submit


@pytest.fixture(autouse=True)
def rollback_programs(client):
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


@pytest.mark.parametrize(('clock', 'opened'), [
    ('2026-09-30T15:55:00+09:00', True),
    ('2026-09-30T16:14:59+09:00', True),
    ('2026-09-30T07:15:00+00:00', False),
    ('2026-09-30T16:25:00+09:00', False),
])
def test_pre_uses_exact_run_time_for_get_submit_and_agenda(client, monkeypatch, clock, opened):
    program = new_program(client, competencySurvey=True, competencyAreas=AREAS,
                          runStartDate='2026-09-30', runEndDate='2026-09-30',
                          runStartTime='16:15', runEndTime='16:25')
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon')

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime.fromisoformat(clock).astimezone(tz or timezone.utc)

    monkeypatch.setattr(survey, 'datetime', Clock)
    assert form(client, program['id'], 'PRE')['open'] is opened
    agenda = client.get('/api/v1/lounge/weekly-todos', headers=headers('chaewon'))
    assert agenda.status_code == 200, agenda.text
    item = next(item for item in agenda.json()['items'] if item['id'] == f"survey:{program['id']}:PRE")
    assert item['closed'] is not opened
    assert submit(client, program['id'], 'PRE', 3).status_code == (201 if opened else 409)


def test_manager_roundtrip_fanout_idempotency_and_recipient_isolation(client, rollback_programs):
    ids = ['career_park', 'career_choi', 'psych_lee']
    program = new_program(client, managerIds=ids, manager='ignored display name')
    assert program['managerIds'] == ids
    assert program['manager'] == '박서준, 최민수, 이마음'
    detail = client.get(f"/api/v1/programs/{program['id']}", headers=headers('career_kim')).json()
    assert detail['managerIds'] == ids
    listed = client.get('/api/v1/programs', params={'q': program['title'], 'pageSize': 100}, headers=headers('career_kim')).json()
    assert next(p for p in listed['items'] if p['id'] == program['id'])['managerIds'] == ids
    request_headers = {**headers('chaewon'), 'Idempotency-Key': uuid4().hex}
    url = f"/api/v1/programs/{program['id']}/applications"
    for _ in range(2):
        assert client.post(url, headers=request_headers, json={}).status_code == 201
    rows = rollback_programs.execute('''SELECT p.alias,n.id,n.route FROM dc.notification n
      JOIN dc.person p ON p.intg_uid=n.recipient_uid
      WHERE n.source_kind='PROGRAM_APPLICATION' AND n.source_id LIKE %s''', (program['id'] + ':%',)).fetchall()
    assert sorted(row['alias'] for row in rows) == sorted(ids)
    for identity in [*ids, 'career_kim', 'career_kang', 'changwon']:
        notices = client.get('/api/v1/notifications', headers=headers(identity)).json()['items']
        own = [item for item in notices if item['to'] == f"/programs/{program['id']}/applicants"]
        assert len(own) == (1 if identity in ids else 0)
    assert client.post(f"/api/v1/notifications/{rows[0]['id']}/read", headers=headers('career_kim')).status_code == 404


def test_manager_changes_only_affect_future_applications_and_preserve_on_legacy_update(client, rollback_programs):
    program = new_program(client, managerIds=['career_kim', 'career_park'])
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    changed = update(client, program, managerIds=['career_park', 'psych_lee'])
    assert changed.status_code == 200, changed.text
    assert changed.json()['managerIds'] == ['career_park', 'psych_lee']
    old_client_body = {k: v for k, v in changed.json().items() if k not in (*SERVER_OWNED, 'managerIds')}
    old_client_body['expectedVersion'] = changed.json()['version']
    preserved = client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'), json=old_client_body)
    assert preserved.status_code == 200, preserved.text
    assert preserved.json()['managerIds'] == ['career_park', 'psych_lee']
    assert apply_as(client, 'changwon', program['id']).status_code == 201
    recipients = rollback_programs.execute('''SELECT p.alias FROM dc.notification n
      JOIN dc.person p ON p.intg_uid=n.recipient_uid
      WHERE n.source_kind='PROGRAM_APPLICATION' AND n.source_id=%s''',
      (program['id'] + ':' + rollback_programs.execute("SELECT intg_uid FROM dc.person WHERE alias='changwon'").fetchone()['intg_uid'],)).fetchall()
    assert sorted(r['alias'] for r in recipients) == ['career_park', 'psych_lee']


@pytest.mark.parametrize('ids', [[], ['career_kim', 'career_kim'], ['chaewon'], ['missing-staff']])
def test_invalid_managers_rejected(client, ids):
    program = new_program(client, managerIds=['career_kim'])
    assert update(client, program, managerIds=ids).status_code == 422


def test_legacy_no_time_still_closes_at_midnight_and_post_requires_completion(client):
    program = new_program(client, competencySurvey=True, competencyAreas=AREAS, runStartDate='2020-01-01')
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon')
    assert form(client, program['id'], 'PRE')['open'] is False
    assert form(client, program['id'], 'POST')['open'] is False
    select_and_complete(client, program['id'], 'chaewon', complete=True)
    assert form(client, program['id'], 'POST')['open'] is True
