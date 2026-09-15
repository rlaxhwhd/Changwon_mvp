from uuid import uuid4

import pytest

from app.db import pool
from test_api import headers
from test_growth import KEY, profile_of


def test_catalog_metadata_has_valid_categories(client):
    response = client.get('/api/v1/metadata', headers=headers('chaewon'))
    assert response.status_code == 200
    items = response.json()['items']
    active = lambda group: [x for x in items if x['group_code'] == group and x['is_active']]
    categories = {x['code'] for x in active('GROWTH_SKILL_CATEGORY')}
    assert len(active('GROWTH_SKILL_OPTION')) >= 330
    assert len(active('GROWTH_CERT_OPTION')) >= 135
    assert len(active('GROWTH_LANGUAGE_OPTION')) >= 30
    assert all(x['payload']['categoryCode'] in categories for x in active('GROWTH_SKILL_OPTION'))


@pytest.mark.parametrize('group,payload', [
    ('GROWTH_SKILL_OPTION', {'categoryCode': 'OFFICE'}),
    ('GROWTH_CERT_OPTION', {'category': '사무'}),
    ('GROWTH_LANGUAGE_OPTION', {'language': '영어'}),
    ('GROWTH_ACTIVITY_EXAMPLE', {'categoryCode': 'ETC'}),
    ('GROWTH_PROJECT_EXAMPLE', {}),
])
def test_admin_manages_suggestions_without_creating_achievements(client, group, payload):
    code = 'TEST_' + uuid4().hex.upper()
    path = f'/api/v1/system/code-groups/{group}/items/{code}'
    body = dict(expectedVersion=0, label='입력 후보 테스트', sortOrder=9999,
                isActive=True, payload=payload, reason='입력 사전 검증')
    with pool.connection() as conn:
        before = conn.execute('SELECT count(*) n FROM dc.growth_entry').fetchone()['n']
    assert client.put(path, headers=headers('chaewon'), json=body).status_code == 403
    invalid = client.put(path, headers=headers('system-admin'), json={**body, 'payload': {'unexpected': True}})
    assert invalid.status_code == 422
    result = client.put(path, headers=headers('system-admin'), json=body)
    assert result.status_code == 200, result.text
    assert client.put(path, headers=headers('system-admin'), json=body).status_code == 409
    changed = {**body, 'expectedVersion': 1, 'label': '수정된 입력 후보', 'isActive': False}
    assert client.put(path, headers=headers('system-admin'), json=changed).status_code == 200
    item = next(x for x in client.get('/api/v1/metadata', headers=headers('chaewon')).json()['items']
                if x['group_code'] == group and x['code'] == code)
    assert not item['is_active'] and item['label'] == changed['label']
    with pool.connection() as conn:
        assert conn.execute('SELECT count(*) n FROM dc.growth_entry').fetchone()['n'] == before
        assert conn.execute('SELECT count(*) n FROM dc.code_item_event WHERE group_code=%s AND code=%s',
                            (group, code)).fetchone()['n'] == 2


@pytest.mark.parametrize('kind,category,title,content', [
    ('SKILL', 'OFFICE', '엑셀 피벗테이블', {'level': 3}),
    ('SKILL', 'RESEARCH', '나만의 실험 기술', {'level': 2}),
    ('CERTIFICATE', None, '컴퓨터활용능력 1급', {'issuer': '발급기관', 'certificateNumber': 'TEST-001', 'scoreText': '1급', 'description': ''}),
    ('LANGUAGE', None, 'TOEIC', {'language': '영어', 'testName': 'TOEIC', 'scoreText': '850점', 'issuer': '시행기관', 'description': ''}),
])
def test_growth_form_contract_roundtrip(client, kind, category, title, content):
    base = '/api/v1/students/chaewon/growth/entries'
    body = dict(kind=kind, title=title, categoryCode=category, content=content,
                occurredOn='2026-09-01', datePrecision='DAY',
                expectedProfileVersion=profile_of(client, 'chaewon')['version'])
    result = client.post(base, headers=KEY('chaewon'), json=body)
    assert result.status_code == 201, result.text
    entry = result.json()
    assert entry['sourceKind'] == 'SELF_REPORTED'
    result = client.get(base + '/' + entry['id'], headers=headers('chaewon'))
    assert result.json()['kind'] == kind
    assert all(result.json()['content'][key] == value for key, value in content.items())
    updated = client.patch(base + '/' + entry['id'], headers=KEY('chaewon'), json={
        **body, 'title': title + ' 수정', 'expectedVersion': entry['version'],
        'expectedProfileVersion': profile_of(client, 'chaewon')['version']})
    assert updated.status_code == 200, updated.text
    deleted = client.post(base + '/' + entry['id'] + '/delete', headers=KEY('chaewon'), json={
        'expectedVersion': updated.json()['version'],
        'expectedProfileVersion': profile_of(client, 'chaewon')['version']})
    assert deleted.status_code == 200, deleted.text
