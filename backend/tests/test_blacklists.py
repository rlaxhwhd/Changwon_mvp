from unittest.mock import Mock
import psycopg
import pytest
from app.sms import dispatch_student_sms
from test_api import headers
from test_employment_report import xlsx
from test_psych_referrals import db  # noqa: F401

BASE = '/api/v1/system/sms-blacklist'


def update(client, version=0, blocked=True, actor='system-admin', **changes):
    return client.put(BASE+'/chaewon', headers=headers(actor), json={
        'expectedVersion': version, 'blocked': blocked, 'reason': 'Regression test', **changes})


def test_sms_block_release_history_and_dispatch(client, db):
    db.execute('SET LOCAL ROLE dc_app')
    uid = db.execute("SELECT intg_uid FROM dc.person WHERE alias='chaewon'").fetchone()['intg_uid']
    deliver = Mock(return_value={'status':'SENT'})
    assert dispatch_student_sms(db,uid,deliver)['status'] == 'SENT'
    deliver.reset_mock()
    first = update(client)
    assert first.status_code == 200, first.text
    assert first.json()['version'] == 1 and first.json()['blocked']
    assert dispatch_student_sms(db,uid,deliver) == {'status':'BLOCKED'}
    deliver.assert_not_called()
    assert update(client).status_code == 409
    assert update(client,1,True).status_code == 409
    listed = client.get(BASE,headers=headers('system-admin'),params={'q':first.json()['studentNo']}).json()
    assert listed['totalCount'] == 1 and listed['items'][0]['studentId'] == 'chaewon'
    assert update(client,1,False).status_code == 200
    assert dispatch_student_sms(db,uid,deliver)['status'] == 'SENT'
    deliver.assert_called_once_with(uid)
    assert update(client,1,True).status_code == 409
    assert update(client,2,True).json()['version'] == 3
    events = client.get(BASE+'/chaewon/events',headers=headers('system-admin'),params={'pageSize':2}).json()
    assert events['totalCount'] == 3 and [r['version'] for r in events['items']] == [3,2]
    with pytest.raises(psycopg.Error), db.transaction():
        db.execute('DELETE FROM dc.sms_blacklist_event')


@pytest.mark.parametrize('actor',['chaewon','career_kim','psych_lee','asst_kim','cse-1'])
def test_blacklist_admin_access(client, db, actor):
    for path in (BASE,BASE+'/chaewon/events','/api/v1/penalties','/api/v1/penalties/summary'):
        assert client.get(path,headers=headers(actor)).status_code == 403
    assert update(client,actor=actor).status_code == 403
    assert client.post('/api/v1/penalties/chaewon/entries',headers=headers(actor),
        json={'kind':'MANUAL','points':1,'reason':'No access'}).status_code == 403
    for path in (BASE+'/upload','/api/v1/penalties/upload'):
        assert client.post(path,headers=headers(actor),content=xlsx([['학번','벌점','사유']])).status_code == 403


def test_sms_validation_and_provider_failures(client, db):
    assert update(client,reason='  ').status_code == 422
    assert update(client,blocked=False).status_code == 409
    assert client.put(BASE+'/missing-student',headers=headers('system-admin'),json={
        'blocked':True,'expectedVersion':0,'reason':'Test'}).status_code == 404
    deliver = Mock(side_effect=RuntimeError('Provider unavailable'))
    with pytest.raises(ValueError):
        dispatch_student_sms(db,'missing-student',deliver)
    deliver.assert_not_called()
    uid = db.execute("SELECT intg_uid FROM dc.person WHERE alias='chaewon'").fetchone()['intg_uid']
    with pytest.raises(RuntimeError,match='Provider unavailable'):
        dispatch_student_sms(db,uid,deliver)


def test_program_blacklist_global_admin_scope_and_student_privacy(client, db):
    db.execute("DELETE FROM dc.fixture_student_scope WHERE student_uid=(SELECT intg_uid FROM dc.person WHERE alias='chaewon')")
    result = client.post('/api/v1/penalties/chaewon/entries',headers=headers('system-admin'),
        json={'kind':'MANUAL','points':2,'reason':'Admin scope'})
    assert result.status_code == 201, result.text
    assert 'chaewon' in [r['studentId'] for r in client.get('/api/v1/penalties',headers=headers('system-admin')).json()['items']]
    assert client.get('/api/v1/penalties/chaewon',headers=headers('chaewon')).status_code == 200
    assert client.get('/api/v1/penalties/chaewon',headers=headers('changwon')).status_code == 404
    assert client.get('/api/v1/penalties/chaewon',headers=headers('career_kim')).status_code == 403


def student_nos(db, *aliases):
    return [db.execute('''SELECT s.student_no FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE p.alias=%s''',(a,)).fetchone()['student_no'] for a in aliases]


def test_penalty_excel_upload_is_all_or_nothing(client, db):
    admin = headers('system-admin')
    a, b = student_nos(db,'chaewon','jiwoo')
    count = lambda: db.execute("SELECT count(*) AS n FROM dc.penalty_entry WHERE reason LIKE 'Bulk%%'").fetchone()['n']
    rejected = client.post('/api/v1/penalties/upload',headers=admin,content=xlsx([
        ['학번','벌점','사유'],[a,'10','Bulk ok'],['00000000','5','Bulk'],[b,'0','Bulk'],[a,'3','Bulk dup'],[b,'2','']]))
    assert rejected.status_code == 422
    errors = rejected.json()['detail']['errors']
    assert [e['row'] for e in errors] == [3,4,5,6]
    assert '학생 정보 없음' in errors[0]['message'] and '벌점' in errors[1]['message']
    assert '2행과 중복' in errors[2]['message'] and '사유 누락' in errors[3]['message']
    assert count() == 0
    uploaded = client.post('/api/v1/penalties/upload',headers=admin,content=xlsx([
        ['학번','벌점','사유'],[a,'10','Bulk A'],[b+'.0','5.0','Bulk B']]))
    assert uploaded.status_code == 201, uploaded.text
    assert uploaded.json() == {'inserted':2} and count() == 2
    assert any(e['kind'] == 'MANUAL' and e['points'] == 10 and e['reason'] == 'Bulk A'
               for e in client.get('/api/v1/penalties/chaewon',headers=admin).json()['entries'])
    assert client.post('/api/v1/penalties/upload',headers=admin,content=xlsx([['학번','사유'],[a,'x']])).status_code == 422
    assert client.post('/api/v1/penalties/upload',headers=admin,content=b'not a zip').status_code == 422


def test_sms_excel_upload_blocks_and_skips_already_blocked(client, db):
    admin = headers('system-admin')
    a, b = student_nos(db,'chaewon','changwon')
    assert update(client).status_code == 200  # chaewon 은 이미 차단
    uploaded = client.post(BASE+'/upload',headers=admin,content=xlsx([['학번','사유'],[a,'Bulk'],[b,'Bulk SMS']]))
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json() == {'blocked':1,'skipped':1}
    listed = {r['studentId']: r for r in client.get(BASE,headers=admin).json()['items']}
    assert listed['changwon']['reason'] == 'Bulk SMS' and listed['chaewon']['reason'] == 'Regression test'
    assert client.get(BASE+'/changwon/events',headers=admin).json()['items'][0]['reason'] == 'Bulk SMS'
    rejected = client.post(BASE+'/upload',headers=admin,content=xlsx([['학번','사유'],[b,'']]))
    assert rejected.status_code == 422 and rejected.json()['detail']['errors'][0]['row'] == 2


def test_concurrent_sms_registration_rejects_stale_save(client):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    barrier = Barrier(2)
    def register():
        barrier.wait(timeout=10)
        return client.put(BASE+'/jiwoo',headers=headers('system-admin'),json={
            'blocked':True,'expectedVersion':0,'reason':'Concurrent registration'}).status_code
    with ThreadPoolExecutor(max_workers=2) as workers:
        results = list(workers.map(lambda _: register(),range(2)))
    assert sorted(results) == [200,409]
