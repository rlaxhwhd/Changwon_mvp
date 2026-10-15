"""활동 로그 — 「성장 활동 기록」 카드는 손으로 쓰는 기록이 아니라 플랫폼 이벤트 로그다.

실제 PostgreSQL *_test DB 에서만 돌린다. 각 도메인 정본의 시각을 합쳐 읽을 뿐 쓰지 않는다.
"""
from uuid import uuid4

from test_api import headers

KEY = lambda identity: {**headers(identity), 'Idempotency-Key': uuid4().hex}
URL = '/api/v1/students/{}/growth/activity-log'


def log_of(client, identity, viewer=None, **params):
    return client.get(URL.format(identity), headers=headers(viewer or identity), params=params)


def profile_version(client):
    return client.get('/api/v1/students/chaewon/growth/profile', headers=headers('chaewon')).json()['version']


def test_registration_appears_newest_first_with_kind_code(client):
    created = client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('chaewon'),
                          json={'kind': 'CERTIFICATE', 'title': '정보처리기사', 'occurredOn': '2026-06-12',
                                'datePrecision': 'DAY', 'content': {'issuer': '한국산업인력공단'},
                                'expectedProfileVersion': profile_version(client)})
    assert created.status_code == 201, created.text
    response = log_of(client, 'chaewon')
    assert response.status_code == 200, response.text
    items = response.json()['items']
    assert items[0]['kind'] == 'GROWTH_CERTIFICATE' and items[0]['title'] == '정보처리기사'
    assert items[0]['ref'] == created.json()['id']
    assert [item['at'] for item in items] == sorted((item['at'] for item in items), reverse=True)
    # 시드에 있는 다른 도메인 이벤트(성장일지·진단·상담 등)도 같은 목록에 섞여 온다.
    assert {item['kind'] for item in items} - {'GROWTH_CERTIFICATE'}


def test_deleted_entries_and_manual_records_are_not_logged(client):
    entry = client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('chaewon'),
                        json={'kind': 'AWARD', 'title': '지워질 수상', 'content': {'rank': '우수상'},
                              'expectedProfileVersion': profile_version(client)}).json()
    removed = client.post(f"/api/v1/students/chaewon/growth/entries/{entry['id']}/delete", headers=KEY('chaewon'),
                          json={'expectedVersion': entry['version'], 'expectedProfileVersion': profile_version(client)})
    assert removed.status_code == 200, removed.text
    items = log_of(client, 'chaewon', limit=100).json()['items']
    assert '지워질 수상' not in [item['title'] for item in items]
    assert all(item['kind'] != 'GROWTH_RECORD' for item in items)


def test_only_the_student_reads_their_log(client):
    # 상담 행이 섞여 있어 교직원 열람 범위 규칙을 다시 만들지 않는다 — 본인만 읽는다.
    assert log_of(client, 'chaewon', 'career_kim').status_code == 403
    assert log_of(client, 'chaewon', 'changwon').status_code == 404
    assert log_of(client, 'chaewon', limit=0).status_code == 422
