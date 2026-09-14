"""Referral access boundaries and transactional workflow in a rollback-only DB."""
from uuid import uuid4

import psycopg
import pytest
from psycopg.rows import dict_row
from app.db import connection
from app.main import app
from app.settings import settings
from test_api import headers


@pytest.fixture
def db(client):
    assert settings.db_name.endswith('_test')
    conn = psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row)
    conn.execute('SET LOCAL jit=off')
    def override():
        yield conn
    app.dependency_overrides[connection] = override
    try:
        yield conn
    finally:
        app.dependency_overrides.pop(connection, None)
        conn.rollback()
        conn.close()


def create(client, **changes):
    return client.post('/api/v1/psych-referrals', headers=headers('career_kim'), json={
        'studentId': 'chaewon', 'counselorId': 'psych_lee', 'reasonCode': 'STRESS', **changes})


def transition(client, row, action, who='psych_lee'):
    return client.post(f"/api/v1/psych-referrals/{row['id']}/transition", headers=headers(who),
                       json={'action': action, 'version': row['version']})


def test_workflow_and_immutable_history(client, db):
    response = create(client)
    assert response.status_code == 201, response.text
    row = response.json()
    assert row['reason'] == '스트레스·생활관리 어려움'
    assert row['status'] == 'PENDING'
    inbox = client.get('/api/v1/psych-referrals', headers=headers('psych_lee')).json()
    assert row['id'] in [r['id'] for r in inbox['items']]
    assert inbox['counts']['PENDING'] >= 1
    accepted = transition(client, row, 'ACCEPT')
    assert accepted.status_code == 200
    assert accepted.json()['acceptedAt']
    assert transition(client, row, 'ACCEPT').status_code == 409
    done = transition(client, accepted.json(), 'COMPLETE')
    assert done.status_code == 200 and done.json()['status'] == 'DONE'
    assert done.json()['completedAt']
    notifications = db.execute("SELECT source_id,body FROM dc.notification WHERE source_kind='PSYCH_REFERRAL' AND source_id LIKE %s", (row['id']+':%',)).fetchall()
    assert len(notifications) == 3
    assert all('스트레스' not in n['body'] for n in notifications)
    assert db.execute('SELECT count(*) AS n FROM dc.psych_referral_event WHERE referral_id=%s', (row['id'],)).fetchone()['n'] == 3
    with pytest.raises(psycopg.Error), db.transaction():
        db.execute('DELETE FROM dc.psych_referral_event WHERE referral_id=%s', (row['id'],))


def test_duplicate_and_invalid_transition_and_cancel(client, db):
    row = create(client).json()
    assert create(client).status_code == 409
    assert transition(client, row, 'COMPLETE').status_code == 409
    assert transition(client, row, 'ACCEPT', 'career_kim').status_code == 409
    cancelled = transition(client, row, 'CANCEL', 'career_kim')
    assert cancelled.status_code == 200 and cancelled.json()['cancelledAt']
    assert create(client).status_code == 201


def test_cannot_cancel_after_acceptance(client, db):
    row = transition(client, create(client).json(), 'ACCEPT').json()
    assert transition(client, row, 'CANCEL', 'career_kim').status_code == 409


@pytest.mark.parametrize('kind', ['STUDENT', 'professor', 'admin'])
def test_non_counselor_denied(client, db, kind):
    who = 'chaewon'
    if kind != 'STUDENT':
        who = 'referral-denied-' + uuid4().hex
        db.execute("INSERT INTO dc.person VALUES(%s,%s,'Denied role','STAFF','local','{}',1)", (who, who))
        db.execute("INSERT INTO dc.staff VALUES(%s,%s,'{}',1)", (who, kind))
    response = client.get('/api/v1/psych-referrals', headers=headers(who))
    assert response.status_code == 403


def test_other_psych_cannot_read_or_change(client, db):
    other = 'psych-referral-test-' + uuid4().hex
    db.execute("INSERT INTO dc.person VALUES(%s,%s,'Other psych','STAFF','local','{}',1)", (other, other))
    db.execute("INSERT INTO dc.staff VALUES(%s,'psych','{}',1)", (other,))
    row = create(client).json()
    assert client.get('/api/v1/psych-referrals', headers=headers(other)).json()['items'] == []
    assert transition(client, row, 'ACCEPT', other).status_code == 404


def test_scope_reason_and_recipient_validation(client, db):
    assert create(client, reasonCode='free text').status_code == 422
    assert create(client, counselorId='career_kim').status_code == 422
    assert create(client, notes='not allowed').status_code == 422
    new = 'referral-student-' + uuid4().hex
    db.execute("INSERT INTO dc.person VALUES(%s,%s,'Unscoped','STUDENT','local','{}',1)", (new, new))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label) VALUES(%s,%s,'test')", (new, new))
    assert create(client, studentId=new).status_code == 404
    search = client.get('/api/v1/psych-referrals/students?q=Unscoped', headers=headers('career_kim')).json()
    assert search['items'] == []


def test_options_and_search_and_psych_cannot_send(client, db):
    options = client.get('/api/v1/psych-referrals/options', headers=headers('career_kim')).json()
    assert len(options['reasons']) == 5
    assert 'psych_lee' in [r['id'] for r in options['counselors']]
    assert client.get('/api/v1/psych-referrals/students?q=', headers=headers('career_kim')).json()['items'] == []
    assert client.get('/api/v1/psych-referrals/students?q=a', headers=headers('psych_lee')).status_code == 403
    assert client.post('/api/v1/psych-referrals', headers=headers('psych_lee'), json={
        'studentId': 'chaewon', 'counselorId': 'psych_lee', 'reasonCode': 'STRESS'}).status_code == 403


def test_status_filter_and_page_validation(client, db):
    row = create(client).json()
    result = client.get('/api/v1/psych-referrals?status=DONE', headers=headers('career_kim')).json()
    assert row['id'] not in [r['id'] for r in result['items']]
    assert client.get('/api/v1/psych-referrals?page=0', headers=headers('career_kim')).status_code == 422
