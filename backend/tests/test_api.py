"""Integration tests. Run only against a separately created PostgreSQL *_test DB."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from app.settings import settings


def headers(identity):
    return {'X-DC-Identity':identity,'X-DC-Token':Path(settings.development_token_file).read_text().strip()}


def request_body(offset=0,care='general'):
    # Match the seeded counselor's Monday/Wednesday/Friday availability.
    base=(datetime.now()+timedelta(days=30)).date()
    days=[base+timedelta(days=n) for n in range(365) if (base+timedelta(days=n)).weekday() in (0,2,4)]
    day=days[offset].isoformat()
    return {'type':'진로취업','careTrack':care,'method':'대면','topic':'Integration test',
            'assignedCounselorId':'career_kim','slot':{'date':day,'start':'14:00','end':'15:00','place':'Test'}}


def test_storage_and_scope(client):
    assert client.get('/api/v1/health').json()['storage']=='postgresql'
    assert client.get('/api/v1/students').status_code==401
    response=client.get('/api/v1/academic/chaewon',headers=headers('chaewon'))
    assert response.status_code==200,response.text
    assert len(response.json()['skills'])==36
    assert client.get('/api/v1/academic/changwon',headers=headers('chaewon')).status_code==404
    assert client.get('/api/v1/students',headers=headers('chaewon')).status_code==403


def test_server_pagination_and_aggregates(client):
    first=client.get('/api/v1/students?pageSize=7',headers=headers('career_kim')).json()
    second=client.get('/api/v1/students?page=2&pageSize=7',headers=headers('career_kim')).json()
    assert first['totalCount']==120 and len(first['items'])==7
    assert not {r['id'] for r in first['items']} & {r['id'] for r in second['items']}
    meta=client.get('/api/v1/students/metadata',headers=headers('career_kim')).json()
    assert meta['summary']['total']==first['totalCount']
    number=first['items'][0]['studentNo']
    result=client.get('/api/v1/students',params={'q':number},headers=headers('career_kim')).json()
    assert result['totalCount']==1 and result['items'][0]['studentNo']==number


def test_idempotency_conflict_version_and_completion(client):
    key=str(uuid4())
    head={**headers('chaewon'),'Idempotency-Key':key}
    response=client.post('/api/v1/counsel-requests',headers=head,json=request_body())
    assert response.status_code==201,response.text
    original=response.json()
    assert client.post('/api/v1/counsel-requests',headers=head,json=request_body()).json()['id']==original['id']
    changed={**request_body(),'topic':'Changed'}
    assert client.post('/api/v1/counsel-requests',headers=head,json=changed).status_code==409
    path='/api/v1/counsel-requests/'+original['id']
    assert client.get(path,headers=headers('changwon')).status_code==404
    conflict=client.post('/api/v1/counsel-requests',headers={**headers('changwon'),'Idempotency-Key':str(uuid4())},json=request_body())
    assert conflict.status_code==409
    confirmed=client.post(path+'/confirm',headers=headers('career_kim'),json={'expectedVersion':1,'slot':request_body()['slot']})
    assert confirmed.status_code==200,confirmed.text
    assert confirmed.json()['version']==2
    assert client.post(path+'/cancel',headers=headers('career_kim'),json={'expectedVersion':1,'reason':'stale'}).status_code==409
    completed=client.post(path+'/complete',headers=headers('career_kim'),json={'expectedVersion':2,'summary':'Verified transaction'})
    assert completed.status_code==200,completed.text
    assert completed.json()['status']=='완료'
    assert client.post(path+'/cancel',headers=headers('career_kim'),json={'expectedVersion':3,'reason':'closed'}).status_code==409


def test_care7_gate_does_not_block_general_counsel(client):
    head={**headers('jiwoo'),'Idempotency-Key':str(uuid4())}
    assert client.post('/api/v1/counsel-requests',headers=head,json=request_body(1,'care7')).status_code==409
    result=client.post('/api/v1/counsel-requests',headers=head,json=request_body(1))
    assert result.status_code==201,result.text


def test_concurrent_slot_claim_has_one_winner(client):
    def submit(identity):
        return client.post('/api/v1/counsel-requests',headers={**headers(identity),'Idempotency-Key':str(uuid4())},json=request_body(2)).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses=list(executor.map(submit,['chaewon','changwon']))
    assert sorted(statuses)==[201,409]


def test_cert_mutation_is_persisted_and_self_only(client):
    path='/api/v1/students/chaewon/certs/ct_sqld'
    assert client.put(path,headers=headers('changwon'),json={'on':False}).status_code==404
    assert client.put(path,headers=headers('chaewon'),json={'on':False}).status_code==200
    # An acquired academic certificate is immutable through the goal toggle.
    body=client.get('/api/v1/academic/chaewon',headers=headers('chaewon')).json()
    assert any(c['certId']=='ct_sqld' and not c['added'] for c in body['studentCerts'])
