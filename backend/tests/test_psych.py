"""심리상담사 — 추가 심리상담신청(상담사 발의 기록)과 심리검사 결과. 심리는 진로취업과 격리된다."""
from datetime import date
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from test_api import consent, headers


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
    # 2026-10-21 사용자 지시: 상담일지·기록은 진로취업상담사와 공유하지 않는다.
    assert client.get(f"/api/v1/counsel-requests/{record['requestId']}",headers=headers('career_kim')).status_code==404
    career_ids={r['id'] for r in client.get('/api/v1/counsel-records?pageSize=100',headers=headers('career_kim')).json()['items']}
    assert record['id'] not in career_ids
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
    # 심리검사는 심리상담사 업무다 — 진로취업상담사와 학생은 읽지도 쓰지도 못한다.
    assert client.get('/api/v1/psych-tests',headers=headers('career_kim')).status_code==403
    assert client.put(path,headers=headers('career_kim'),json={**draft,'expectedVersion':refreshed.json()['version']}).status_code==403
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


def apply_psych_test(client, code='MBTI'):
    """학생 jiwoo 가 psych_lee 에게 심리검사를 신청한다 — 비어 있는 첫 평일 슬롯을 찾는다."""
    from datetime import timedelta
    for days in range(1, 40):
        day = date.today() + timedelta(days=days)
        if day.weekday() >= 5:
            continue
        for hour in range(9, 18):
            body = {'type': '심리', 'typeCode': 'PSY', 'topic': '검사를 받고 싶습니다', 'topicCode': code,
                    'assignedCounselorId': 'psych_lee',
                    'slot': {'date': day.isoformat(), 'start': f'{hour:02d}:00', 'end': f'{hour + 1:02d}:00', 'place': '심리상담센터'},
                    'consent': consent('PSYCH')}
            response = client.post('/api/v1/counsel-requests', headers={**headers('jiwoo'), 'Idempotency-Key': str(uuid4())}, json=body)
            if response.status_code == 201:
                return response.json()
            assert response.status_code == 409, response.text
    raise AssertionError('비어 있는 심리상담 슬롯이 없다')


def test_psych_test_application_result_completes_request(client):
    created = apply_psych_test(client)
    assert created['type'] == '심리' and created['topicCode'] == 'MBTI' and created['status'] == '대기'
    # 심리 신청의 검사 종류는 PSYCH_TEST_KIND 에서만 고른다(진로 상담 주제 코드는 거부).
    bad = client.post('/api/v1/counsel-requests', headers={**headers('jiwoo'), 'Idempotency-Key': str(uuid4())},
                      json={'type': '심리', 'typeCode': 'PSY', 'topic': 'x', 'topicCode': 'A01', 'assignedCounselorId': 'psych_lee',
                            'slot': {**created['slot'], 'place': ''}, 'consent': consent('PSYCH')})
    assert bad.status_code == 422
    listing = client.get('/api/v1/psych-tests/requests', params={'testCode': 'MBTI', 'pageSize': 100}, headers=headers('psych_lee'))
    assert listing.status_code == 200, listing.text
    row = next(item for item in listing.json()['items'] if item['requestId'] == created['id'])
    assert row['status'] == '신청' and row['testLabel'] == 'MBTI(성격유형검사)' and row['method'] == '오프라인' and row['result'] is None
    assert row['slot']['date'] == created['slot']['date']
    assert client.get('/api/v1/psych-tests/requests', headers=headers('career_kim')).status_code == 403
    assert client.get('/api/v1/psych-tests/requests', headers=headers('jiwoo')).status_code == 403
    # 신청 상태에서 바로 결과를 적고, 작성 완료가 곧 신청 완료다.
    done = client.put(f"/api/v1/psych-tests/{created['id']}", headers=headers('psych_lee'), json={
        'expectedVersion': 0, 'testCode': 'MBTI', 'testedAt': date.today().isoformat(), 'scales': [],
        'interpretation': 'ENFP', 'opinion': '진로 탐색 권고', 'openToStudent': True, 'status': '완료'})
    assert done.status_code == 200, done.text
    request = client.get(f"/api/v1/counsel-requests/{created['id']}", headers=headers('psych_lee')).json()
    assert request['status'] == '완료' and request['version'] == created['version'] + 1
    row = next(item for item in client.get('/api/v1/psych-tests/requests', params={'status': '완료', 'pageSize': 100},
                                           headers=headers('psych_lee')).json()['items'] if item['requestId'] == created['id'])
    assert row['result']['status'] == '완료'
    # 진로취업상담사는 심리검사 신청도 보지 못한다.
    assert client.get(f"/api/v1/counsel-requests/{created['id']}", headers=headers('career_kim')).status_code == 404


def test_psych_extra_request_board(client):
    me = client.get('/api/v1/psych-extra-requests/profile', headers=headers('jiwoo'))
    assert me.status_code == 200 and me.json()['studentNo']
    title = f'추가상담 {uuid4().hex[:8]}'
    created = client.post('/api/v1/psych-extra-requests', headers=headers('jiwoo'), json={'title': title, 'body': '목요일 오후 가능'})
    assert created.status_code == 201, created.text
    post = created.json()
    assert post['confirmed'] is False and post['proxy'] is False and post['student']['studentNo'] == me.json()['studentNo']
    assert client.post('/api/v1/psych-extra-requests', headers=headers('jiwoo'), json={'title': '  '}).status_code == 422
    mine = client.get('/api/v1/psych-extra-requests', headers=headers('jiwoo')).json()['items']
    assert post['id'] in {item['id'] for item in mine}
    found = client.get('/api/v1/psych-extra-requests', params={'field': 'title', 'q': title}, headers=headers('psych_lee')).json()
    assert found['totalCount'] == 1 and found['items'][0]['writer'] == post['writer']
    # 진로취업상담사는 게시판을 쓰지도 보지도 않는다.
    assert client.get('/api/v1/psych-extra-requests', headers=headers('career_kim')).status_code == 403
    # 심리상담사 대리 작성 — 학생을 골라야 한다.
    assert client.post('/api/v1/psych-extra-requests', headers=headers('psych_lee'), json={'title': '전화 요청'}).status_code == 422
    proxy = client.post('/api/v1/psych-extra-requests', headers=headers('psych_lee'), json={'title': '전화 요청', 'studentId': 'jiwoo'})
    assert proxy.status_code == 201 and proxy.json()['proxy'] is True
    # 확인은 심리상담사만, 한 번만
    path = f"/api/v1/psych-extra-requests/{post['id']}/confirm"
    assert client.post(path, headers=headers('jiwoo')).status_code == 403
    confirmed = client.post(path, headers=headers('psych_lee'))
    assert confirmed.status_code == 200 and confirmed.json()['confirmed'] is True and confirmed.json()['confirmedBy']
    assert client.post(path, headers=headers('psych_lee')).status_code == 409


def test_psych_menu_is_separate_from_career(client):
    def active(identity):
        return {m['menu_code'] for m in client.get('/api/v1/metadata', headers=headers(identity)).json()['menus'] if m['is_active']}
    psych, career = active('psych_lee'), active('career_kim')
    # 'home' 등 공통 메뉴는 다른 테스트(역할 메뉴 치환)가 바꿀 수 있어 140 이 정한 항목만 본다.
    assert {'psy-tests', 'counsel', 'counsel.0', 'counsel.10', 'counsel.2', 'counsel.5', 'counsel.6', 'counsel.7', 'students', 'students.1'} <= psych
    assert not psych & {'diagnosis', 'diagnosis.0', 'roadmap', 'counsel.8', 'counsel.9'}
    assert {'diagnosis', 'counsel.2', 'counsel.8', 'counsel.9'} <= career and not career & {'psy-tests', 'counsel.6', 'counsel.10'}
    # 통계 현황(148) — 개인통계·전체통계는 두 상담사 역할 공통
    assert {'stats', 'stats.0', 'stats.1'} <= psych & career
