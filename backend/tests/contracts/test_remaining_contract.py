import json
from pathlib import Path

from contracts.contract_assertions import assert_same_json_shape
from test_api import headers

ROOT=Path(__file__).resolve().parents[3]


def test_notice_fixture_contract(client):
    fixtures=json.loads((ROOT/'backend/seeds/notices.json').read_text(encoding='utf-8'))
    response=client.get('/api/v1/notices?pageSize=100',headers=headers('chaewon'))
    assert response.status_code==200,response.text
    for expected in fixtures:
        actual=next(r for r in response.json()['items'] if r['id']==expected['id'])
        expected={**expected,'pinned':expected.get('pinned',False),'version':1}
        assert_same_json_shape(expected,actual)
        assert actual['body']==expected['body']


def test_group_fixture_contract(client):
    fixtures=json.loads((ROOT/'backend/seeds/admin/groupCounsels.seed.json').read_text(encoding='utf-8'))
    response=client.get('/api/v1/group-counsels?pageSize=100',headers=headers('career_kim'))
    assert response.status_code==200,response.text
    for expected in fixtures:
        if expected['counselorId']!='career_kim': continue
        actual=next(r for r in response.json()['items'] if r['id']==expected['id'])
        assert_same_json_shape({**expected,'version':1},actual)


def test_availability_fixture_contract(client):
    fixtures=json.loads((ROOT/'backend/seeds/admin/availability.seed.json').read_text(encoding='utf-8'))
    for expected in fixtures:
        response=client.get('/api/v1/counsel-schedules/'+expected['counselorId'],headers=headers('career_kim'))
        assert response.status_code==200,response.text
        assert_same_json_shape(expected['slots'],response.json()['available'])
