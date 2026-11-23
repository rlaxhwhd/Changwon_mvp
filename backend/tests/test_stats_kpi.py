"""KPI 통계(/stats/kpi) — 상담사만, 7단계 퍼널·지표 그룹 형식, 미집계 지표의 「집계 전」 상태. *_test DB 에서만 돈다."""
from test_api import headers

GROUPS = ['diagnosis', 'counsel', 'roadmap', 'program', 'company', 'employment', 'aftercare']


def test_kpi_shape_and_na_rows(client):
    assert client.get('/api/v1/stats/kpi', headers=headers('chaewon')).status_code == 403
    response = client.get('/api/v1/stats/kpi', params={'from': '2026-01-01', 'to': '2026-12-31'}, headers=headers('career_kim'))
    assert response.status_code == 200, response.text
    body = response.json()
    assert [s['key'] for s in body['funnel']] == GROUPS
    assert body['funnel'][-1]['count'] is None  # 사후관리는 원천이 없다
    assert [g['key'] for g in body['groups']] == GROUPS
    by_key = {i['key']: i for g in body['groups'] for i in g['indicators']}
    assert 'participation_univ_plus' not in by_key  # 대플 행은 사용자 지시로 뺐다
    assert by_key['coss']['value'] is None and by_key['coss']['status'] == 'NA'
    assert by_key['counsel_done']['target'] is None and by_key['counsel_done']['status'] == 'NONE'
    assert by_key['platform_companies']['unit'] == '개사' and by_key['platform_companies']['target'] == 50
    for i in by_key.values():
        assert i['status'] in ('OK', 'WARN', 'ALERT', 'NONE', 'NA')
        if i['value'] is not None and i['target']:
            assert i['rate'] == round(i['value'] * 1000 / i['target']) / 10


def test_kpi_rejects_reversed_period(client):
    assert client.get('/api/v1/stats/kpi', params={'from': '2026-05-01', 'to': '2026-04-01'}, headers=headers('career_kim')).status_code == 422
