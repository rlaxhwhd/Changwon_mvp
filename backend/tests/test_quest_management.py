from concurrent.futures import ThreadPoolExecutor
from datetime import date
from uuid import uuid4
from psycopg.types.json import Jsonb

import pytest
from app import quests, missions
from app.db import pool
from app.quest_management import activity_counts
from test_api import headers
from test_quests import learner  # noqa: F401; isolated student/semester fixture


def definition(client, **changes):
    body = dict(expectedVersion=0, title='Quest '+uuid4().hex, description='Test',
                activity='ATTENDANCE', targetCount=1, xp=80, isActive=True)
    body.update(changes)
    result = client.put('/api/v1/system/quests/definitions/0', headers=headers('system-admin'), json=body)
    assert result.status_code == 200, result.text
    return result.json()


def schedule(q, key='2030-09', **changes):
    body = dict(expectedVersion=0, title='Test assignment', period='MONTHLY', periodKey=key,
                audience='ALL', grades=[], studentTypes=[], questIds=[q['id']], published=True)
    body.update(changes)
    return body


@pytest.fixture(autouse=True)
def clean_assignments(client, learner):
    yield
    with pool.connection() as conn:
        conn.execute('DELETE FROM dc.mission_attempt WHERE student_uid=%s', (learner,))
        conn.execute('DELETE FROM dc.quest_completion')
        conn.execute('DELETE FROM dc.quest_assignment_item')
        conn.execute('DELETE FROM dc.quest_assignment')
        conn.execute('DELETE FROM dc.quest_definition')


def test_quest_management_permissions_validation_and_versions(client):
    assert client.get('/api/v1/system/quests/options').status_code == 401
    assert client.get('/api/v1/system/quests/options', headers=headers('chaewon')).status_code == 403
    q = definition(client)
    body = dict(expectedVersion=0, title=q['title'], description='', activity='ATTENDANCE', targetCount=1, xp=1)
    assert client.put(f"/api/v1/system/quests/definitions/{q['id']}", headers=headers('system-admin'), json=body).status_code == 409
    body.update(expectedVersion=1, xp=-1)
    assert client.put(f"/api/v1/system/quests/definitions/{q['id']}", headers=headers('system-admin'), json=body).status_code == 422
    body.update(xp=True)
    assert client.put(f"/api/v1/system/quests/definitions/{q['id']}", headers=headers('system-admin'), json=body).status_code == 422


def test_target_overlap_and_all_filters(client):
    q = definition(client)
    url = '/api/v1/system/quests/assignments/0'
    head = headers('system-admin')
    first = schedule(q, '2091-01', audience='FILTERED', grades=[1], studentTypes=['T1'])
    assert client.put(url, headers=head, json=first).status_code == 200
    assert client.put(url, headers=head, json=first).status_code == 409
    assert client.put(url, headers=head, json=schedule(q, '2091-01')).status_code == 409
    assert client.put(url, headers=head, json={**first, 'studentTypes': ['T2']}).status_code == 200
    assert client.put(url, headers=head, json=schedule(q, '2091-02', grades=[1])).status_code == 422
    assert client.put(url, headers=head, json=schedule(q, '2091-02', audience='FILTERED')).status_code == 422


def test_concurrent_overlapping_assignment(client):
    q = definition(client)
    def write(_):
        return client.put('/api/v1/system/quests/assignments/0', headers=headers('system-admin'), json=schedule(q, '2091-03')).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(write, range(2))) == [200, 409]


def test_schedule_picker_permissions_pagination_and_periods(client, learner):
    url = '/api/v1/system/quests/schedules'
    h = headers('system-admin')
    assert client.get(url+'?period=MONTHLY').status_code == 401
    assert client.get(url+'?period=MONTHLY', headers=headers('chaewon')).status_code == 403
    assert client.get(url+'?period=DAILY', headers=h).status_code == 422
    q = definition(client)
    for month in range(1, 22):
        key = f'{2090 + (month-1)//12}-{(month-1)%12+1:02}'
        assert client.put('/api/v1/system/quests/assignments/0', headers=h,
                          json=schedule(q, key, title=f'Picker {month}')).status_code == 200
    first = client.get(url+'?period=MONTHLY', headers=h).json()
    second = client.get(url+'?period=MONTHLY&page=2', headers=h).json()
    assert first['totalCount'] == 21 and len(first['items']) == 20 and len(second['items']) == 1
    assert not set(r['id'] for r in first['items']) & set(r['id'] for r in second['items'])
    assert client.get(url+'?period=SEMESTER', headers=h).json()['totalCount'] == 0
    assert client.get(url+'?period=MONTHLY&q=Picker%2021', headers=h).json()['totalCount'] == 1


def test_schedule_only_update_preserves_items_and_guards_conflicts(client):
    h = headers('system-admin')
    q = definition(client)
    created = client.put('/api/v1/system/quests/assignments/0', headers=h,
                         json=schedule(q, '2091-01')).json()
    aid = created['id']
    url = f'/api/v1/system/quests/assignments/{aid}/schedule'
    body = dict(expectedVersion=1, periodKey='2091-02', reason='운영 월 변경')
    assert client.put(url, headers=headers('chaewon'), json=body).status_code == 403
    # Even a subsequently edited pool must not rewrite an assignment's saved XP.
    assert client.put(f"/api/v1/system/quests/definitions/{q['id']}", headers=h,
                      json=dict(expectedVersion=1, title='New title', activity='ATTENDANCE', targetCount=10, xp=900)).status_code == 200
    assert client.put(url, headers=h, json=body).status_code == 200
    assert client.put(url, headers=h, json=body).status_code == 409
    saved = client.get('/api/v1/system/quests/assignments?period=MONTHLY&periodKey=2091-02', headers=h).json()['items'][0]
    assert saved['items'] == created['items'] and saved['audience'] == created['audience']
    assert (saved['starts_on'], saved['ends_on']) == ('2091-02-01', '2091-02-28')
    assert client.put('/api/v1/system/quests/assignments/0', headers=h, json=schedule(q, '2091-03')).status_code == 200
    assert client.put(url, headers=h, json={**body, 'expectedVersion': 2, 'periodKey': '2091-03'}).status_code == 409
    assert client.put(url, headers=h, json={**body, 'expectedVersion': 2, 'periodKey': '2091-99'}).status_code == 422
    assert client.put(url, headers=h, json={**body, 'expectedVersion': 2, 'reason': ' '}).status_code == 422


def test_semester_schedule_selection_and_locked_schedule(client, learner):
    h = headers('system-admin')
    q = definition(client)
    draft = client.put('/api/v1/system/quests/assignments/0', headers=h,
                       json=schedule(q, learner, period='SEMESTER', published=False)).json()
    url = f"/api/v1/system/quests/assignments/{draft['id']}/schedule"
    body = dict(expectedVersion=1, periodKey=learner, reason='학기 일정 적용')
    assert client.put(url, headers=h, json={**body, 'periodKey': 'NOT_REGISTERED'}).status_code == 422
    assert client.put(url, headers=h, json=body).status_code == 200
    rows = client.get('/api/v1/system/quests/schedules?period=SEMESTER', headers=h).json()['items']
    assert rows[0]['ends_on'] == '2030-12-31' and not rows[0]['locked']
    active = client.put('/api/v1/system/quests/assignments/0', headers=h, json=schedule(q)).json()
    assert client.put(f"/api/v1/system/quests/assignments/{active['id']}/schedule", headers=h,
                      json=dict(expectedVersion=1, periodKey='2091-01', reason='Blocked')).status_code == 409


def test_assignment_auto_completion_and_no_double_award(client, learner):
    q = definition(client)
    body = schedule(q, audience='FILTERED', grades=[1], studentTypes=['UNDIAGNOSED'])
    response = client.put('/api/v1/system/quests/assignments/0', headers=headers('system-admin'), json=body)
    assert response.status_code == 200, response.text
    aid = response.json()['id']
    # A student's claimed completion is never an input; only stored attendance qualifies.
    before = client.post('/api/v1/quests/sync', headers=headers(learner)).json()
    assert len(before['assigned']) == 1 and not before['assigned'][0]['done']
    client.post('/api/v1/quests/attendance', headers=headers(learner))
    def sync(_):
        r = client.post('/api/v1/quests/sync', headers=headers(learner))
        assert r.status_code == 200, r.text
        return r.json()
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(sync, range(2)))
    assert all(r['totalXp'] == 130 and r['completed']['MONTHLY'] == 1 for r in results)
    assert results[0]['assigned'][0]['granted_xp'] == 80
    assert client.put(f'/api/v1/system/quests/assignments/{aid}', headers=headers('system-admin'), json={**body, 'expectedVersion': 1, 'title': 'Changed'}).status_code == 409
    with pool.connection() as conn:
        conn.execute('DELETE FROM dc.quest_completion WHERE student_uid=%s', (learner,))


def test_nonmatching_and_semester_assignment(client, learner):
    q = definition(client)
    h = headers('system-admin')
    response = client.put('/api/v1/system/quests/assignments/0', headers=h, json=schedule(q, audience='FILTERED', grades=[2]))
    assert response.status_code == 200
    response = client.put('/api/v1/system/quests/assignments/0', headers=h, json=schedule(q, learner, period='SEMESTER'))
    assert response.status_code == 200, response.text
    state = client.post('/api/v1/quests/sync', headers=headers(learner)).json()
    assert len(state['assigned']) == 1 and state['assigned'][0]['period'] == 'SEMESTER'


def test_activity_sources_empty_and_verified_certificate(client, learner):
    with pool.connection() as conn:
        counts = activity_counts(conn, learner, date(2030,9,1), date(2030,9,30))
    assert set(counts) == {'ATTENDANCE','COUNSEL','PROGRAM','CERTIFICATE','AI_RESUME','JOB_APPLY'}
    assert sum(counts.values()) == 0


def test_real_activity_evidence_dates_and_incomplete_records(client, learner):
    with pool.connection() as conn, conn.transaction(force_rollback=True):
        actor = conn.execute("SELECT intg_uid FROM dc.person WHERE alias='system-admin'").fetchone()['intg_uid']
        cert = conn.execute('SELECT cert_id FROM dc.cert LIMIT 1').fetchone()['cert_id']
        conn.execute('INSERT INTO dc.student_cert(intg_uid,cert_id,acquired_dt,verified) VALUES(%s,%s,%s,false)', (learner,cert,date(2030,9,2)))
        assert activity_counts(conn,learner,date(2030,9,1),date(2030,9,30),{'CERTIFICATE'})['CERTIFICATE'] == 0
        conn.execute('UPDATE dc.student_cert SET verified=true WHERE intg_uid=%s',(learner,))
        request_id = 'quest-evidence-'+uuid4().hex
        conn.execute("""INSERT INTO dc.counsel_request(id,student_uid,type_code,legacy_type,status_code,method_code,care_track,
          topic,requested_at,snapshot,source_payload,completed_at) VALUES(%s,%s,'CAREER','career','DONE','ONLINE','general',
          'Test','2030-09-01T00:00:00+09','{}','{}','2030-09-02T23:59:59+09')""", (request_id,learner))
        program = conn.execute('SELECT id FROM dc.program LIMIT 1').fetchone()['id']
        conn.execute("""INSERT INTO dc.program_apply(program_id,student_uid,applied_at,snapshot,selection_code,selected_at,outcome_code)
          VALUES(%s,%s,'2030-09-01T00:00:00+09','{}','SELECTED','2030-09-01T00:00:00+09','COMPLETED')""",(program,learner))
        conn.execute("""INSERT INTO dc.program_apply_event(program_id,student_uid,action,after_value,changed_by,changed_at)
          VALUES(%s,%s,'OUTCOME',%s,%s,'2030-09-02T00:00:00+09')""",(program,learner,Jsonb({'outcomeStatus':'COMPLETED'}),actor))
        run = 'quest-ai-'+uuid4().hex
        conn.execute("INSERT INTO dc.ai_run(id,kind_code,student_uid,model,created_at) VALUES(%s,'RESUME_REVIEW',%s,'test','2030-09-02T00:00:00+09')",(run,learner))
        assert activity_counts(conn,learner,date(2030,9,1),date(2030,9,30),{'AI_RESUME'})['AI_RESUME'] == 0
        conn.execute("INSERT INTO dc.ai_score(run_id,position,label,score) VALUES(%s,1,'test',80)",(run,))
        posting = conn.execute('SELECT id FROM dc.job_posting LIMIT 1').fetchone()['id']
        application = 'quest-job-'+uuid4().hex
        conn.execute("""INSERT INTO dc.job_application(id,posting_id,student_uid,current_attempt_no,status,applied_at)
          VALUES(%s,%s,%s,1,'APPLIED','2030-09-02T00:00:00+09')""",(application,posting,learner))
        conn.execute('INSERT INTO dc.job_application_attempt(id,application_id,attempt_no) VALUES(%s,%s,1)',('attempt-'+application,application))
        values = activity_counts(conn,learner,date(2030,9,2),date(2030,9,2))
        assert values == dict(ATTENDANCE=0,PROGRAM=1,COUNSEL=1,CERTIFICATE=1,AI_RESUME=1,JOB_APPLY=1)
        assert not any(activity_counts(conn,learner,date(2030,9,3),date(2030,9,30)).values())
        conn.execute("UPDATE dc.job_application SET status='CANCELED',canceled_at=now() WHERE id=%s",(application,))
        assert activity_counts(conn,learner,date(2030,9,1),date(2030,9,30),{'JOB_APPLY'})['JOB_APPLY'] == 0


def test_private_current_assignment_remains_editable(client, learner):
    q = definition(client)
    body = schedule(q, published=False)
    r = client.put('/api/v1/system/quests/assignments/0',headers=headers('system-admin'),json=body)
    assert r.status_code == 200 and r.json()['locked'] is False
    r = client.put(f"/api/v1/system/quests/assignments/{r.json()['id']}",headers=headers('system-admin'),json={**body,'expectedVersion':1,'title':'Revised draft'})
    assert r.status_code == 200


def test_mission_threshold_snapshot_and_daily_award(client, learner, monkeypatch):
    monday = date(2030,9,2)
    monkeypatch.setattr(missions, 'monday', lambda: monday)
    h = headers('system-admin')
    ids = []
    for i in range(2):
        response = client.put('/api/v1/system/missions/questions/0', headers=h,
          json=dict(expectedVersion=0,kind='TOEIC',prompt=f'Quest word {i}',word=f'word{i}',choices=[],answer=0))
        assert response.status_code == 200, response.text
        ids.append(response.json()['id'])
    body = dict(expectedVersion=0,title='Threshold test',questionIds=ids,published=True,selectionLimit=2,questPassCount=2)
    with pool.connection() as conn:
        old = conn.execute("SELECT version FROM dc.mission_week WHERE week_start=%s AND kind='TOEIC'", (monday,)).fetchone()
    body['expectedVersion'] = old['version'] if old else 0
    response = client.put(f'/api/v1/system/missions/weeks/{monday}/TOEIC',headers=h,json=body)
    assert response.status_code == 200, response.text
    week = response.json()
    attempt = client.post('/api/v1/missions/attempts',headers=headers(learner),json=dict(weekId=week['id'],version=week['version'])).json()
    assert attempt['questPassCount'] == 2
    changed = client.put(f'/api/v1/system/missions/weeks/{monday}/TOEIC',headers=h,json={**body,'expectedVersion':week['version'],'questPassCount':1}).json()
    answers = {str(ids[0]): 'word0', str(ids[1]): 'wrong'}
    result = client.post(f"/api/v1/missions/attempts/{attempt['id']}/submit",headers=headers(learner),json=dict(answers=answers))
    assert result.status_code == 200, result.text
    assert result.json()['questPassed'] is False
    attempt = client.post('/api/v1/missions/attempts',headers=headers(learner),json=dict(weekId=week['id'],version=changed['version'])).json()
    result = client.post(f"/api/v1/missions/attempts/{attempt['id']}/submit",headers=headers(learner),json=dict(answers=answers))
    assert result.json()['questPassed'] is True
    client.post(f"/api/v1/missions/attempts/{attempt['id']}/submit",headers=headers(learner),json=dict(answers=answers))
    with pool.connection() as conn:
        assert conn.execute('SELECT total_xp FROM dc.quest_growth_account WHERE student_uid=%s',(learner,)).fetchone()['total_xp'] == 50
        conn.execute('DELETE FROM dc.mission_attempt WHERE student_uid=%s',(learner,))
    assert client.put(f'/api/v1/system/missions/weeks/{monday}/TOEIC',headers=h,json={**body,'questPassCount':3}).status_code == 422
