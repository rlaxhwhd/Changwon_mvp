"""Shared journal contract: student writes; scoped counselor reads the same version."""
from uuid import uuid4
from test_api import headers


def key(identity):
    return {**headers(identity), 'Idempotency-Key': uuid4().hex}


def version(client):
    return client.get('/api/v1/students/chaewon/growth/profile', headers=headers('chaewon')).json()['version']


def test_journal_invalid_date_is_422_not_database_error(client):
    for invalid in ('2026-02-30', '20260916', 'not-a-date'):
        response = client.post('/api/v1/students/chaewon/growth/entries', headers=key('chaewon'), json={
            'kind': 'JOURNAL', 'title': 'Date validation', 'categoryCode': 'ETC',
            'occurredOn': invalid, 'datePrecision': 'DAY', 'expectedProfileVersion': version(client),
        })
        assert response.status_code == 422, response.text


def test_journal_counselor_read_only_edit_delete_and_idempotency(client):
    path = '/api/v1/students/chaewon/growth/entries'
    body = {'kind': 'JOURNAL', 'title': 'Journal lifecycle', 'categoryCode': 'TEAM_PROJECT',
            'occurredOn': '2026-09-16', 'datePrecision': 'DAY', 'tags': ['teamwork'],
            'content': {'situation': 'S', 'role': 'T', 'action': 'A', 'result': 'R',
                        'learning': 'L', 'resumeMemo': 'For resume'},
            'expectedProfileVersion': version(client)}
    request_headers = key('chaewon')
    first = client.post(path, headers=request_headers, json=body)
    assert first.status_code == 201, first.text
    entry = first.json()
    again = client.post(path, headers=request_headers, json=body)
    assert again.json()['id'] == entry['id']
    target = path + '/' + entry['id']
    seen = client.get(target, headers=headers('career_kim'))
    assert seen.status_code == 200 and seen.json()['content'] == entry['content']
    update = {**body, 'title': 'Updated journal', 'bookmarked': True,
              'expectedVersion': entry['version'], 'expectedProfileVersion': version(client)}
    assert client.patch(target, headers=key('career_kim'), json=update).status_code == 403
    assert client.patch(target, headers=key('changwon'), json=update).status_code == 404
    assert client.patch(target, headers=key('chaewon'), json=update).status_code == 200
    assert client.patch(target, headers=key('chaewon'), json=update).status_code == 409
    latest = client.get(target, headers=headers('career_kim')).json()
    assert latest['version'] == 2 and latest['bookmarked'] and latest['title'] == 'Updated journal'
    removal = {'expectedVersion': 2, 'expectedProfileVersion': version(client)}
    assert client.post(target + '/delete', headers=key('career_kim'), json=removal).status_code == 403
    assert client.post(target + '/delete', headers=key('chaewon'), json=removal).status_code == 200
    assert client.get(target, headers=headers('career_kim')).status_code == 404
    listing = client.get(path + '?kind=JOURNAL', headers=headers('career_kim')).json()
    assert entry['id'] not in {item['id'] for item in listing['items']}
