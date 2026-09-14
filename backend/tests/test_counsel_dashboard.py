"""Dashboard regression tests. All fixture writes roll back in an isolated DB."""
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
import pytest

from app import counsel_dashboard
from app.db import connection
from app.main import app
from app.settings import settings
from test_api import headers

DAY = date(2070, 1, 8)


@pytest.fixture
def db(client, monkeypatch):
    assert settings.db_name.endswith('_test')
    root = Path(__file__).resolve().parents[2]
    conn = psycopg.connect(**{**settings.connection_kwargs(), 'user': 'postgres',
        'password': (root / 'deploy/secrets/postgres_password_local').read_text().strip()}, row_factory=dict_row)
    conn.execute('SET LOCAL jit=off')
    def override():
        yield conn
    app.dependency_overrides[connection] = override
    monkeypatch.setattr(counsel_dashboard, 'today', lambda: DAY)
    try:
        yield conn
    finally:
        app.dependency_overrides.pop(connection, None)
        conn.rollback()
        conn.close()


def uid(db, alias):
    return db.execute('SELECT intg_uid FROM dc.person WHERE alias=%s', (alias,)).fetchone()['intg_uid']


def request_row(db, status='REQ', day=DAY, owner='career_kim', student='chaewon', intake=None, start='09:00'):
    request_id = str(uuid4())
    kind, code = ('심리', 'PSY') if owner.startswith('psych') else ('진로취업', 'CAREER')
    db.execute('''INSERT INTO dc.counsel_request
      (id,student_uid,counselor_uid,type_code,legacy_type,care_track,status_code,method_code,topic,
       requested_at,slot_date,slot_start,slot_end,intake,snapshot,source_payload)
      VALUES(%s,%s,%s,%s,%s,%s,%s,'OFFLINE','Dashboard regression',now(),%s,%s,'18:00',%s,%s,'{}')''',
      (request_id, uid(db, student), uid(db, owner), code, kind, 'general' if code == 'CAREER' else None,
       status, day, start, Jsonb(intake or []), Jsonb({'name': 'Dashboard regression student', 'major': 'Regression department'})))
    return request_id


def home(client, identity='career_kim', suffix=''):
    response = client.get('/api/v1/counsel-dashboard'+suffix, headers=headers(identity))
    assert response.status_code == 200, response.text
    return response.json()


def test_today_includes_pending_but_not_future_cancelled_or_other_assignees(client, db):
    pending = request_row(db)
    confirmed = request_row(db, status='CONFIRMED', start='10:00')
    done = request_row(db, status='DONE', start='11:00')
    cancelled = request_row(db, status='CANCEL_STU')
    future = request_row(db, day=DAY+timedelta(days=1))
    other = request_row(db, owner='career_park')
    psych = request_row(db, owner='psych_lee')
    result = home(client)
    assert result['refDate'] == DAY.isoformat()
    assert {r['id'] for r in result['timeline']} == {pending, confirmed, done}
    assert [r['status'] for r in result['timeline']] == ['대기', '확정', '완료']
    assert result['counts']['today'] == 3 and result['counts']['todayDone'] == 1
    assert not {cancelled, future, other, psych} & {r['id'] for r in result['timeline']}
    assert future in {r['id'] for r in result['intake']}
    # Identical DB requests are visible in the existing inbox as well.
    inbox = client.get('/api/v1/counsel-requests?pageSize=100', headers=headers('career_kim')).json()
    assert pending in {r['id'] for r in inbox['items']}


def test_today_never_falls_back_to_seed_or_future_date(client, db):
    future = request_row(db, day=DAY+timedelta(days=8))
    request_row(db, day=DAY-timedelta(days=8))
    result = home(client, suffix='?date=2020-01-01&counselorId=career_park')
    assert result['refDate'] == DAY.isoformat()
    assert result['timeline'] == [] and result['counts']['today'] == 0
    assert future in {r['id'] for r in result['intake']}


def test_next_fetch_observes_new_request_and_status_change(client, db):
    before = home(client)
    request_id = request_row(db)
    after = home(client)
    assert after['counts']['pending'] == before['counts']['pending'] + 1
    assert request_id in {r['id'] for r in after['timeline']}
    db.execute("UPDATE dc.counsel_request SET status_code='CONFIRMED' WHERE id=%s", (request_id,))
    refreshed = home(client)
    assert refreshed['counts']['pending'] == before['counts']['pending']
    assert next(r for r in refreshed['timeline'] if r['id']==request_id)['status']=='확정'


def test_briefing_is_request_specific_and_returns_real_intake(client, db):
    one = request_row(db, intake=[{'question':'First question', 'answer':'First answer'}])
    two = request_row(db, intake=[{'question':'Second question', 'answer':'Second answer'}], start='10:00')
    for request_id, answer in [(one, 'First answer'), (two, 'Second answer')]:
        response = client.get('/api/v1/counsel-dashboard/requests/'+request_id, headers=headers('career_kim'))
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['request']['id'] == request_id
        assert result['intake'][0]['answer'] == answer
        assert 'counselorQuestions' not in result
    assert client.get('/api/v1/counsel-dashboard/requests/'+one, headers=headers('career_park')).status_code == 404


def test_pending_total_is_not_preview_length(client, db):
    before = home(client)['counts']['pending']
    for _ in range(7):
        request_row(db, day=DAY+timedelta(days=1))
    result = home(client)
    assert result['counts']['pending'] == before + 7
    assert len(result['intake']) == 5


def test_student_without_json_profile_is_visible(client, db):
    identity = 'dashboard-' + str(uuid4())
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'New DB student','STUDENT','local')",
               (identity, identity))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade) VALUES(%s,%s,'New department',2)",
               (identity, identity))
    request_id = request_row(db, student=identity)
    result = home(client)
    assert request_id in {r['id'] for r in result['timeline']}
    response = client.get('/api/v1/counsel-dashboard/requests/'+request_id, headers=headers('career_kim'))
    assert response.status_code == 200
    assert response.json()['intake'] == []


def test_psych_does_not_receive_career_data(client, db):
    own = request_row(db, owner='psych_lee')
    other = request_row(db)
    result = home(client, 'psych_lee')
    assert {r['id'] for r in result['timeline']} == {own}
    assert result['roadmap'] is None and result['programs'] == []
    briefing = client.get('/api/v1/counsel-dashboard/requests/'+own, headers=headers('psych_lee')).json()
    assert briefing['roadmap'] is None and briefing['diagnoses'] is None
    assert client.get('/api/v1/counsel-dashboard/requests/'+other, headers=headers('psych_lee')).status_code == 404


@pytest.mark.parametrize('identity', ['chaewon', 'prof_cse_1', 'admin'])
def test_non_counselor_cannot_read_home(client, db, identity):
    # Resolve an actual non-counselor identity without depending on fixture aliases.
    if identity != 'chaewon':
        row = db.execute("SELECT p.alias FROM dc.person p JOIN dc.staff s USING(intg_uid) WHERE s.role_code=%s LIMIT 1",
                         ('professor' if identity == 'prof_cse_1' else 'admin',)).fetchone()
        assert row
        identity = row['alias']
    response = client.get('/api/v1/counsel-dashboard', headers=headers(identity))
    assert response.status_code == 403


def test_program_ownership_never_falls_back_to_other_creators(client, db):
    before = home(client)
    assert all(p['id'] for p in before['programs'])
    # Seed programs have creator identity even when the display manager is changed.
    program = db.execute('SELECT id FROM dc.program LIMIT 1').fetchone()
    assert program
    db.execute('UPDATE dc.program SET created_by=%s,manager=%s WHERE id=%s',
               (uid(db, 'career_kim'), 'Unrelated display name', program['id']))
    own = home(client)
    assert own['programCount'] >= 1
    assert program['id'] not in {p['id'] for p in home(client, 'career_park')['programs']}
    db.execute('UPDATE dc.program SET created_by=NULL WHERE id=%s', (program['id'],))
    assert home(client)['programCount'] == own['programCount']-1
