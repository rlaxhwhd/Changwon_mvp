"""채용공고 조회수(173) — 학생·날짜(KST)당 1회, 교직원 열람은 세지 않는다. 실제 *_test DB 에서만 돈다."""
from test_api import headers
from test_jobs import new_posting


def view(client, identity, posting_id):
    return client.post(f'/api/v1/jobs/{posting_id}/views', headers=headers(identity))


def view_count(client, posting):
    response = client.get(f"/api/v1/jobs/{posting['id']}", headers=headers('career_kim'))
    assert response.status_code == 200, response.text
    return response.json()['viewCount']


def test_view_counts_once_per_student_per_day(client):
    posting = new_posting(client)
    assert posting['viewCount'] == 0
    for _ in range(3):
        assert view(client, 'chaewon', posting['id']).status_code == 204
    assert view(client, 'changwon', posting['id']).status_code == 204
    assert view(client, 'career_kim', posting['id']).status_code == 204  # 교직원 열람은 세지 않는다
    assert view_count(client, posting) == 2
    listed = client.get('/api/v1/jobs?pageSize=100&q=' + posting['company'], headers=headers('career_kim')).json()['items']
    assert next(j for j in listed if j['id'] == posting['id'])['viewCount'] == 2


def test_view_of_unknown_posting_is_404(client):
    assert view(client, 'chaewon', 'no-such-posting').status_code == 404
