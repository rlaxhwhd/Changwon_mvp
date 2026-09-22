"""심리상담사 — 추가 심리상담신청(상담사 발의 기록)과 심리검사 결과. 심리는 진로취업과 격리된다."""
from datetime import date
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from test_api import headers


def psych_body():
    return {'studentId':'jiwoo','topic':'Walk-in psych session','method':'대면','date':date.today().isoformat(),'summary':'Recorded by counselor'}


def test_psych_direct_record_is_done_and_isolated(client):
    head={**headers('psych_lee'),'Idempotency-Key':str(uuid4())}
    created=client.post('/api/v1/counsel-records/psych',headers=head,json=psych_body())
    assert created.status_code==201,created.text
    record=created.json()
    assert record['type']=='심리' and record['status']=='완료' and record['origin']=='PSY_RECORD' and record['studentId']=='jiwoo'
    # 같은 키는 같은 응답 — 두 번째 행을 만들지 않는다.
    assert client.post('/api/v1/counsel-records/psych',headers=head,json=psych_body()).json()['requestId']==record['requestId']
    request=client.get(f"/api/v1/counsel-requests/{record['requestId']}",headers=headers('psych_lee')).json()
    assert request['status']=='완료' and request['type']=='심리' and 'slot' not in request
    # 진로상담사·교수는 심리 기록을 보지 못하고, 심리상담사가 아니면 만들 수도 없다.
    assert client.get(f"/api/v1/counsel-requests/{record['requestId']}",headers=headers('career_kim')).status_code==200
    career_ids={r['id'] for r in client.get('/api/v1/counsel-records?pageSize=100',headers=headers('career_kim')).json()['items']}
    assert record['id'] in career_ids
    assert client.post('/api/v1/counsel-records/psych',headers={**headers('career_kim'),'Idempotency-Key':str(uuid4())},json=psych_body()).status_code==403
    assert client.post('/api/v1/counsel-records/psych',headers={**headers('jiwoo'),'Idempotency-Key':str(uuid4())},json=psych_body()).status_code==403


def test_psych_test_result_upsert_and_access(client):
    head={**headers('psych_lee'),'Idempotency-Key':str(uuid4())}
    request_id=client.post('/api/v1/counsel-records/psych',headers=head,json=psych_body()).json()['requestId']
    path=f'/api/v1/psych-tests/{request_id}'
    draft={'expectedVersion':0,'testCode':'MMPI2','testedAt':date.today().isoformat(),'scales':[{'label':'L','score':45}],'interpretation':'','opinion':'','openToStudent':False,'status':'작성중'}
    saved=client.put(path,headers=headers('psych_lee'),json=draft)
    assert saved.status_code==200,saved.text
    assert saved.json()['status']=='작성중' and saved.json()['studentId']=='jiwoo' and saved.json()['by']=='psych_lee'
    # 작성 완료에는 해석·소견이 필요하고, 기타 검사는 검사명이 필요하다.
    assert client.put(path,headers=headers('psych_lee'),json={**draft,'status':'완료'}).status_code==422
    assert client.put(path,headers=headers('psych_lee'),json={**draft,'testCode':'ETC'}).status_code==422
    # Two new editors both observed no result. The second cannot overwrite it.
    assert client.put(path,headers=headers('psych_lee'),json=draft).status_code==409
    draft['expectedVersion']=saved.json()['version']
    done=client.put(path,headers=headers('psych_lee'),json={**draft,'interpretation':'Within normal range','opinion':'Follow-up in 4 weeks','status':'완료'}).json()
    assert done['id']==saved.json()['id'] and done['status']=='완료' and done['version']==2
    assert client.put(path,headers=headers('psych_lee'),json={**draft,'opinion':'Stale edit'}).status_code==409
    missing={key:value for key,value in draft.items() if key!='expectedVersion'}
    assert client.put(path,headers=headers('psych_lee'),json=missing).status_code==422
    listed=client.get('/api/v1/psych-tests',headers=headers('psych_lee')).json()['items']
    assert any(item['id']==done['id'] for item in listed)
    assert next(item for item in listed if item['id']==done['id'])==done
    refreshed=client.put(path,headers=headers('psych_lee'),json={**draft,'expectedVersion':done['version']})
    assert refreshed.status_code==200 and refreshed.json()['version']==3
    # Counselors share editing; stale versions and student access stay blocked.
    assert client.get('/api/v1/psych-tests',headers=headers('career_kim')).status_code==200
    assert client.put(path,headers=headers('career_kim'),json=draft).status_code==409
    assert client.put(path,headers=headers('career_kim'),json={**draft,'expectedVersion':refreshed.json()['version']}).status_code==200
    assert client.put(path,headers=headers('jiwoo'),json=draft).status_code==403


def test_concurrent_psych_creation_and_update_have_one_winner(client):
    head={**headers('psych_lee'),'Idempotency-Key':str(uuid4())}
    created=client.post('/api/v1/counsel-records/psych',headers=head,json=psych_body())
    assert created.status_code==201
    request_id=created.json()['requestId']
    path=f'/api/v1/psych-tests/{request_id}'
    for version in (0,1):
        def save(editor):
            return client.put(path,headers=headers('psych_lee'),json={
                'expectedVersion':version,'testCode':'MMPI2','testedAt':date.today().isoformat(),
                'interpretation':f'Editor {editor}','status':'작성중'})
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses=list(executor.map(save,('A','B')))
        assert sorted(r.status_code for r in responses)==[200,409]
        winner=next(r.json() for r in responses if r.status_code==200)
        listed=client.get('/api/v1/psych-tests',headers=headers('psych_lee')).json()['items']
        matches=[item for item in listed if item['requestId']==request_id]
        assert len(matches)==1 and matches[0]==winner and winner['version']==version+1
