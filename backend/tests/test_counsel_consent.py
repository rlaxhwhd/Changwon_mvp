"""상담 신청 동의서 기록(146) — 신청과 함께 저장되고, 서식·버전·응답이 맞아야 하며, 고칠 수 없다."""
from uuid import uuid4

import psycopg
import pytest

from app.db import pool
from test_api import consent, headers, request_body
from test_psych import apply_psych_test


def post(client, body):
    return client.post('/api/v1/counsel-requests', headers={**headers('chaewon'), 'Idempotency-Key': str(uuid4())}, json=body)


def test_psych_request_stores_psych_consent(client):
    created = apply_psych_test(client)
    with pool.connection() as conn:
        row = conn.execute('SELECT * FROM dc.counsel_consent WHERE request_id=%s', (created['id'],)).fetchone()
        payload = conn.execute('SELECT source_payload FROM dc.counsel_request WHERE id=%s', (created['id'],)).fetchone()
    assert row is not None
    assert row['form_code'] == 'PSYCH' and row['answers'] == {'privacy': 'yes', 'outsourcing': 'yes', 'rules': 'yes'}
    assert row['signature'] == '테스트' and row['agreed_at'] is not None
    assert 'consent' not in payload['source_payload']
    with pool.connection() as conn, pytest.raises(psycopg.errors.RaiseException):
        conn.execute("UPDATE dc.counsel_consent SET signature='변경' WHERE request_id=%s", (created['id'],))


@pytest.mark.parametrize('change,status', [
    ({'consent': None}, 422),
    ({'consent': consent('PSYCH')}, 422),
    ({'consent': {**consent(), 'answers': {'privacy': 'yes', 'uid': 'no', 'notice': 'yes'}}}, 422),
    ({'consent': {**consent(), 'answers': {'privacy': 'yes', 'uid': 'yes'}}}, 422),
    ({'consent': {**consent(), 'version': '2000-01-01'}}, 409),
])
def test_request_without_valid_consent_is_refused(client, change, status):
    body = {**request_body(30), **change}
    if body['consent'] is None:
        del body['consent']
    response = post(client, body)
    assert response.status_code == status, response.text
