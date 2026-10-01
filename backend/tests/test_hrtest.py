from copy import deepcopy

import httpx
import pytest

from app import hrtest


def item():
    return {'attempt_id': 12, 'student': {'id': '20261234'},
            'started_at': '2026-10-01T09:00:00', 'completed_at': '2026-10-01T09:10:00',
            'incomplete': False, 'missing_items': [], 'types': {'overall': '역량성장형'},
            'scales': [{'code': 'career_clarity', 'name': '진로명확성', 't_score': 0, 'level': '낮음'},
                       {'code': 'career_motivation', 'name': '진로동기', 't_score': None, 'level': None}]}


def test_hrtest_pagination_and_exact_values(monkeypatch):
    calls = []
    def handler(request):
        calls.append(request)
        page = int(request.url.params['page'])
        return httpx.Response(200, json={'test': 'core', 'page': page, 'total': 1,
                                        'items': [item()] if page == 1 else []})
    monkeypatch.setattr(hrtest, 'client', lambda: httpx.Client(
        base_url=hrtest.BASE_URL, transport=httpx.MockTransport(handler)))
    result = hrtest.fetch_results('ccore', '20261234')
    assert result == [item()] and len(calls) == 2
    assert all(call.url.params['student_id'] == '20261234' for call in calls)
    factors = hrtest.factors(result[0])
    assert factors[0]['tScore'] == 0
    assert factors[1]['tScore'] is None and factors[1]['level'] is None
    assert hrtest.timestamp(result[0]['completed_at']).utcoffset().total_seconds() == 9 * 3600


@pytest.mark.parametrize('change', [
    {'student': {'id': 'someoneelse'}}, {'attempt_id': True},
    {'incomplete': False, 'missing_items': [1]}, {'completed_at': None},
    {'scales': [{'code': 'x', 'name': 'x', 't_score': float('nan')}]},
])
def test_hrtest_rejects_invalid_or_wrong_student(change):
    with pytest.raises((ValueError, TypeError)):
        hrtest.validate_item({**item(), **change}, '20261234')


def test_hrtest_area_and_scale_codes_cannot_collide():
    result = deepcopy(item())
    result['areas'] = [result['scales'][0]]
    rows = hrtest.factors(result)
    assert len({row['factorCode'] for row in rows}) == 3


def test_hrtest_errors_do_not_expose_provider_payload():
    with httpx.Client(base_url=hrtest.BASE_URL, transport=httpx.MockTransport(
            lambda _: httpx.Response(403, json={'secret': 'sensitive-provider-body'}))) as session:
        with pytest.raises(hrtest.HRTestError) as error:
            hrtest.request_json(session, 'tests.asp')
    assert 'sensitive-provider-body' not in str(error.value)


@pytest.mark.parametrize('test', ['c1', 'c5', 'c6'])
def test_hrtest_unavailable_tests_never_call_provider(test):
    with pytest.raises(hrtest.HRTestError, match='아직'):
        hrtest.fetch_results(test, '20261234')


def test_hrtest_failed_second_page_returns_no_partial_results(monkeypatch):
    def handler(request):
        page = int(request.url.params['page'])
        return httpx.Response(200, json={'test': 'core', 'page': page, 'total': 2,
            'items': [item()] if page == 1 else [{**item(), 'student': {'id': 'other'}}]})
    monkeypatch.setattr(hrtest, 'client', lambda: httpx.Client(
        base_url=hrtest.BASE_URL, transport=httpx.MockTransport(handler)))
    with pytest.raises(hrtest.HRTestError, match='저장하지'):
        hrtest.fetch_results('ccore', '20261234')
