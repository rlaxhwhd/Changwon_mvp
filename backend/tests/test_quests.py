from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from uuid import uuid4

import pytest
from psycopg.types.json import Jsonb

from app import quests
from app.db import pool
from test_api import headers

DAY = date(2030, 9, 2)  # Monday


@pytest.fixture
def learner(client, monkeypatch):
    uid = 'quest-test-' + uuid4().hex
    monkeypatch.setattr(quests, 'today_kst', lambda: DAY)
    with pool.connection() as conn:
        conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Quest test','STUDENT','fixture')", (uid,uid))
        conn.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade) VALUES(%s,%s,'Test',1)", (uid,uid))
        conn.execute("INSERT INTO dc.code_item(group_code,code,label,payload) VALUES('QUEST_SEMESTER',%s,'Test semester',%s)", (uid,Jsonb({'startDate':'2030-09-01','endDate':'2030-12-31'})))
        reward = conn.execute("SELECT payload FROM dc.code_item WHERE group_code='QUEST_XP_REWARD' AND code='DAILY'").fetchone()['payload']
    yield uid
    with pool.connection() as conn:
        conn.execute('DELETE FROM dc.growth_xp_event WHERE student_uid=%s', (uid,))
        conn.execute('DELETE FROM dc.quest_attendance WHERE student_uid=%s', (uid,))
        conn.execute('DELETE FROM dc.quest_growth_account WHERE student_uid=%s', (uid,))
        conn.execute('DELETE FROM dc.student WHERE intg_uid=%s', (uid,))
        conn.execute('DELETE FROM dc.person WHERE intg_uid=%s', (uid,))
        conn.execute("DELETE FROM dc.code_item WHERE group_code='QUEST_SEMESTER' AND code=%s", (uid,))
        conn.execute("UPDATE dc.code_item SET payload=%s WHERE group_code='QUEST_XP_REWARD' AND code='DAILY'", (Jsonb(reward),))


def state(client, uid):
    r = client.get('/api/v1/quests/dashboard', headers=headers(uid))
    assert r.status_code == 200, r.text
    return r.json()


def test_quest_scope_and_month(client, learner):
    assert client.get('/api/v1/quests/dashboard').status_code == 401
    assert client.post('/api/v1/quests/attendance', headers=headers('system-admin')).status_code == 403
    assert client.get('/api/v1/quests/dashboard?month=2030-13', headers=headers(learner)).status_code == 422
    assert state(client,learner)['totalXp'] == 0


def test_attendance_idempotency_and_streak(client, learner, monkeypatch):
    assert client.post('/api/v1/quests/attendance',headers=headers(learner)).json()['grantedXp'] == 50
    assert client.post('/api/v1/quests/attendance',headers=headers(learner)).json()['duplicate'] is True
    s = state(client,learner)
    assert s['totalXp'] == 50 and s['dailyCompleted'] == 1 and s['attendance']['streak'] == 1
    assert s['graph'][-1]['xp'] == 50 and len(s['graph']) == 30
    monkeypatch.setattr(quests,'today_kst',lambda: DAY+timedelta(days=1))
    assert state(client,learner)['attendance'] == {'today':False,'streak':1,'dates':[str(DAY)]}
    client.post('/api/v1/quests/attendance',headers=headers(learner))
    assert state(client,learner)['attendance']['streak'] == 2
    monkeypatch.setattr(quests,'today_kst',lambda: DAY+timedelta(days=3))
    assert state(client,learner)['attendance']['streak'] == 0
    assert state(client,'chaewon')['totalXp'] == 0


def test_weekend_and_vacation_no_xp(client, learner, monkeypatch):
    for day in (date(2030,9,7), date(2031,1,6)):
        monkeypatch.setattr(quests,'today_kst',lambda: day)
        result = client.post('/api/v1/quests/attendance',headers=headers(learner))
        assert result.status_code == 200 and result.json()['grantedXp'] == 0
        assert state(client,learner)['attendance']['today'] is True
    assert state(client,learner)['totalXp'] == 0


def test_cap_and_future_program_service(client, learner):
    def award(key, amount):
        with pool.connection() as conn:
            conn.execute('SET LOCAL ROLE dc_app')
            return quests.grant_xp(conn,learner,source_type='PROGRAM',source_key=key,title='Test completion',amount=amount,day=DAY)
    assert award('before-cap',24980)['grantedXp'] == 24980
    assert award('at-cap',200)['grantedXp'] == 20
    assert award('over-cap',200)['grantedXp'] == 0
    s = state(client,learner)
    assert (s['level'],s['totalXp'],s['xpInLevel'],s['atCap']) == (25,25000,1000,True)
    with pool.connection() as conn:
        conn.execute('UPDATE dc.student SET grade=2 WHERE intg_uid=%s',(learner,))
    assert award('over-cap',200) == {'grantedXp':0,'duplicate':True}
    assert award('new-completion',200)['grantedXp'] == 200
    assert state(client,learner)['totalXp'] == 25200


def test_concurrent_attendance(client, learner):
    def check(_):
        return client.post('/api/v1/quests/attendance',headers=headers(learner))
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(check,range(4)))
    assert all(r.status_code==200 for r in results)
    assert sum(r.json()['grantedXp'] for r in results) == 50
    assert state(client,learner)['totalXp'] == 50


def test_reward_codes_validation_and_snapshots(client, learner, monkeypatch):
    client.post('/api/v1/quests/attendance',headers=headers(learner))
    path='/api/v1/system/code-groups/QUEST_XP_REWARD/items/DAILY'
    item=client.get('/api/v1/system/code-groups/QUEST_XP_REWARD/items',headers=headers('system-admin')).json()['items'][0]
    body=dict(expectedVersion=item['version'],label=item['label'],sortOrder=item['sort_order'],isActive=True,payload={**item['payload'],'xp':75},reason='Test reward change')
    assert client.put(path,headers=headers(learner),json=body).status_code==403
    for value in (-1, True, 1.5):
        assert client.put(path,headers=headers('system-admin'),json={**body,'payload':{**body['payload'],'xp':value}}).status_code==422
    assert client.put(path,headers=headers('system-admin'),json=body).status_code==200
    assert client.put(path,headers=headers('system-admin'),json=body).status_code==409
    monkeypatch.setattr(quests,'today_kst',lambda: DAY+timedelta(days=1))
    assert client.post('/api/v1/quests/attendance',headers=headers(learner)).json()['grantedXp']==75
    s=state(client,learner)
    assert s['totalXp']==125 and [x['xp'] for x in s['graph'][-2:]]==[50,75]


def test_semester_validation(client, learner):
    path='/api/v1/system/code-groups/QUEST_SEMESTER/items/OVERLAP_TEST'
    body=dict(expectedVersion=0,label='Overlap',sortOrder=0,isActive=True,
              payload={'startDate':'2030-09-02','endDate':'2030-12-30'},reason='Test')
    assert client.put(path,headers=headers('system-admin'),json=body).status_code==422
    for start,end in [('20300902','20301230'),('2030-11-01','2030-09-01'),('bad','2030-09-02')]:
        assert client.put(path,headers=headers('system-admin'),json={**body,'payload':{'startDate':start,'endDate':end}}).status_code==422


def test_unknown_grade_does_not_guess_cap(client, learner):
    with pool.connection() as conn:
        conn.execute('UPDATE dc.student SET grade=NULL WHERE intg_uid=%s',(learner,))
    assert client.post('/api/v1/quests/attendance',headers=headers(learner)).status_code==409
    s=state(client,learner)
    assert s['levelCap'] is None and s['totalXp']==0 and not s['attendance']['today']
