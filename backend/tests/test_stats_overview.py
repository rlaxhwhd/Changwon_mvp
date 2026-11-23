"""통계 현황 대시보드(/stats/overview) — 상담사만, 영역·범위별 응답 형식, 범위·역할 격리. *_test DB 에서만 돈다."""
import pytest

from test_api import headers

AREAS = ('diagnosis', 'counsel', 'roadmap', 'program', 'job')
RANGE = {'from': '2026-01-01', 'to': '2026-12-31'}


def overview(client, who, **params):
    return client.get('/api/v1/stats/overview', params={**RANGE, **params}, headers=headers(who))


def test_only_counselors_may_read(client):
    assert overview(client, 'chaewon', area='counsel').status_code == 403
    assert overview(client, 'career_kim', area='counsel').status_code == 200


@pytest.mark.parametrize('area', AREAS)
def test_every_area_returns_kpis_and_month_series(client, area):
    body = overview(client, 'career_kim', area=area, scope='all').json()
    assert body['area'] == area and body['scope'] == 'all' and body['role'] == 'career'
    assert body['population'] == body['pipeline']['students'] >= 0
    assert [s['key'] for s in body['pipeline']['stages']] == ['diagnosis', 'counsel', 'roadmap', 'program', 'job']
    data = body['data']
    assert isinstance(data['kpis'], dict) and data['kpis']
    monthly = data['byMonth'] if 'byMonth' in data else data['applicationsByMonth']
    assert monthly['months'][0] == '2026-01' and monthly['months'][-1] == '2026-12'
    assert all(len(s['values']) == 12 for s in monthly['series'])


def test_mine_is_a_subset_of_all(client):
    mine = overview(client, 'career_kim', area='counsel', scope='mine').json()
    everyone = overview(client, 'career_kim', area='counsel', scope='all').json()
    assert mine['population'] <= everyone['population']
    assert mine['data']['kpis']['requested'] <= everyone['data']['kpis']['requested']


def test_roles_see_only_their_counsel_kind(client):
    # 심리상담사와 진로취업상담사는 서로의 상담을 보지 않는다(counsel.visibility 와 같은 경계).
    wide = {'from': '2020-01-01', 'to': '2022-12-31'}
    psych = overview(client, 'psych_lee', area='counsel', scope='all', **wide).json()
    career = overview(client, 'career_kim', area='counsel', scope='all', **wide).json()
    assert psych['role'] == 'psych' and career['role'] == 'career'
    assert all(b['key'] == '심리' for b in psych['data']['byKind'])
    assert all(b['key'] != '심리' for b in career['data']['byKind'])


def test_rejects_bad_parameters(client):
    assert overview(client, 'career_kim', area='nope').status_code == 422
    assert overview(client, 'career_kim', area='counsel', scope='team').status_code == 422
    assert client.get('/api/v1/stats/overview', params={'area': 'counsel', 'from': '2026-05-01', 'to': '2026-04-01'},
                      headers=headers('career_kim')).status_code == 422
    assert overview(client, 'career_kim', area='counsel', type='T9').status_code == 422
