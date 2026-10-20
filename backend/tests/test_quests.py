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


def test_cap_and_future_program_service(client, learner, monkeypatch):
    """학기 12.5 LV · 학년 25 LV(학년마다 0부터) · 누적 100 LV 상한 (2026-10-20 사용자 확정)."""
    spring, fall = date(2031,3,3), date(2031,9,1)
    def award(key, amount, day=DAY):
        with pool.connection() as conn:
            conn.execute('SET LOCAL ROLE dc_app')
            return quests.grant_xp(conn,learner,source_type='PROGRAM',source_key=key,title='Test completion',amount=amount,day=day)
    with pool.connection() as conn:
        for suffix, start, end in (('_B','2031-03-01','2031-06-30'),('_C','2031-09-01','2031-12-31')):
            conn.execute("INSERT INTO dc.code_item(group_code,code,label,payload) VALUES('QUEST_SEMESTER',%s,'Test semester',%s)",
                         (learner+suffix,Jsonb({'startDate':start,'endDate':end})))
    try:
        # 학기 상한 12,500 XP
        assert award('sem-1',12000)['grantedXp'] == 12000
        assert award('sem-1-cap',1000)['grantedXp'] == 500
        assert award('sem-1-over',200)['grantedXp'] == 0
        g = state(client,learner)['growth']
        assert (g['semester']['xp'],g['semester']['level'],g['semester']['tier']['code'],g['semester']['nextTier']) == (12500,12.5,'BEST',None)
        assert (g['grade']['level'],g['grade']['maxLevel'],g['cumulative']['level']) == (12,25,12)
        # 학기 밖(방학)은 지급 0
        assert award('vacation',200,date(2031,1,10))['grantedXp'] == 0
        # 다음 학기에 학년 상한 25,000 XP
        assert award('sem-2',12500,spring)['grantedXp'] == 12500
        assert award('sem-2-over',100,spring)['grantedXp'] == 0
        monkeypatch.setattr(quests,'today_kst',lambda: spring)
        s = state(client,learner)
        assert (s['level'],s['levelCap'],s['xpInLevel'],s['atCap'],s['totalXp']) == (25,25,1000,True,25000)
        # 진급하면 학년 레벨은 0부터 다시 쌓이고, 누적은 이어진다
        with pool.connection() as conn:
            conn.execute('UPDATE dc.student SET grade=2 WHERE intg_uid=%s',(learner,))
        assert award('sem-1-over',200) == {'grantedXp':0,'duplicate':True}
        assert award('grade-2',200,fall)['grantedXp'] == 200
        monkeypatch.setattr(quests,'today_kst',lambda: fall)
        g = state(client,learner)['growth']
        assert (g['semester']['xp'],g['grade']['grade'],g['grade']['xp'],g['cumulative']['xp']) == (200,2,200,25200)
        assert g['semester']['tier'] is None and g['semester']['nextTier']['code'] == 'BASIC'
        # 누적 상한 100 LV
        with pool.connection() as conn:
            conn.execute('UPDATE dc.quest_growth_account SET total_xp=99900 WHERE student_uid=%s',(learner,))
        assert award('total-cap',500,fall)['grantedXp'] == 100
    finally:
        with pool.connection() as conn:
            conn.execute("DELETE FROM dc.code_item WHERE group_code='QUEST_SEMESTER' AND code IN (%s,%s)",(learner+'_B',learner+'_C'))


def test_new_upper_grade_student_starts_at_zero(client, learner):
    with pool.connection() as conn:
        conn.execute('UPDATE dc.student SET grade=3 WHERE intg_uid=%s',(learner,))
    s = state(client,learner)
    assert (s['level'],s['levelCap'],s['growth']['grade']['level'],s['growth']['cumulative']['level']) == (0,25,0,0)
    assert client.post('/api/v1/quests/attendance',headers=headers(learner)).json()['grantedXp'] == 50
    with pool.connection() as conn:
        row = conn.execute('SELECT grade,semester_code,level_cap FROM dc.growth_xp_event WHERE student_uid=%s',(learner,)).fetchone()
    assert (row['grade'],row['semester_code'],row['level_cap']) == (3,learner,25)


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
