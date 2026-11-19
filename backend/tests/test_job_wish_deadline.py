"""0016 — 채용공고 마감 시각 · 찜 수 · 찜한 학생 목록 (168). 실제 *_test DB 에서만 돈다.

마감 판정은 jobs.now_kst 하나만 본다 — 테스트는 그 시계를 고정해 자정·경계에서 흔들리지 않게 한다.
"""
from datetime import date, datetime, time, timedelta

import pytest

from app import counsel_dashboard, jobs
from app.db import pool
from test_api import headers
from test_jobs import apply_as, key, new_posting, posting_body

DAY = date.today() + timedelta(days=30)
WISHER_KEYS = {'studentId', 'name', 'studentNo', 'college', 'department', 'grade', 'wishedAt'}


def at(hour, minute=0, day=DAY):
    return datetime.combine(day, time(hour, minute))


def detail(client, posting, identity='career_kim'):
    response = client.get(f"/api/v1/jobs/{posting['id']}", headers=headers(identity))
    assert response.status_code == 200, response.text
    return response.json()


def wish(client, identity, posting, saved=True):
    response = client.request('PUT' if saved else 'DELETE', f"/api/v1/job-wishlist/{posting['id']}", headers=headers(identity))
    assert response.status_code == 200, response.text


@pytest.fixture
def clock(monkeypatch):
    def set_now(value):
        monkeypatch.setattr(jobs, 'now_kst', lambda: value)
    return set_now


def test_deadline_time_closes_at_the_end_of_that_minute(client, clock):
    posting = new_posting(client, deadline=DAY.isoformat(), deadlineTime='18:00')
    assert posting['deadlineTime'] == '18:00'
    clock(at(18, 0))
    assert detail(client, posting)['effectiveStatus'] == 'POSTED'
    clock(at(18, 1))
    assert detail(client, posting)['effectiveStatus'] == 'CLOSED'

    legacy = new_posting(client, deadline=DAY.isoformat())  # 시각을 보내지 않는 옛 본문
    assert legacy['deadlineTime'] == '23:59'
    clock(at(23, 59))
    assert detail(client, legacy)['effectiveStatus'] == 'POSTED'
    clock(at(0, 0, DAY + timedelta(days=1)))
    assert detail(client, legacy)['effectiveStatus'] == 'CLOSED'


def test_application_is_refused_after_the_deadline_time(client, clock):
    posting = new_posting(client, deadline=DAY.isoformat(), deadlineTime='18:00')
    clock(at(18, 1))
    late = apply_as(client, 'chaewon', posting)
    assert late.status_code == 409, late.text
    clock(at(17, 59))
    assert apply_as(client, 'chaewon', posting).status_code == 201


def test_deadline_time_format_and_modes(client):
    for bad in ('24:00', '9:00', '18:00:00'):
        response = client.post('/api/v1/jobs', headers={**headers('career_kim'), **key()},
                               json=posting_body(createCompany={'displayName': '시각 검증'}, deadlineTime=bad))
        assert response.status_code == 422, bad
    always = new_posting(client, deadlineMode='ALWAYS', deadline=None, deadlineTime='10:00')
    on_hire = new_posting(client, deadlineMode='ON_HIRE', deadline=None, deadlineTime='10:00')
    assert always['deadlineTime'] == on_hire['deadlineTime'] == '23:59'
    # ON_HIRE 공고의 제목만 고쳐도 등록 때 정한 날짜·시각이 그대로다.
    body = posting_body(companyId=on_hire['companyId'], role='제목만 수정', deadlineMode='ON_HIRE', deadline=None,
                        expectedVersion=on_hire['version'])
    edited = client.patch(f"/api/v1/jobs/{on_hire['id']}", headers={**headers('career_kim'), **key()}, json=body)
    assert edited.status_code == 200, edited.text
    assert (edited.json()['deadline'], edited.json()['deadlineTime']) == (on_hire['deadline'], '23:59')


def test_wish_count_is_public_but_wishers_are_staff_only(client):
    posting = new_posting(client)
    assert posting['wishCount'] == 0
    wish(client, 'chaewon', posting)
    wish(client, 'changwon', posting)
    for identity in ('career_kim', 'chaewon'):
        assert detail(client, posting, identity)['wishCount'] == 2
    listed = client.get('/api/v1/jobs?pageSize=100&q=' + posting['company'], headers=headers('chaewon')).json()['items']
    assert next(j for j in listed if j['id'] == posting['id'])['wishCount'] == 2

    response = client.get(f"/api/v1/jobs/{posting['id']}/wishers", headers=headers('career_kim'))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['totalCount'] == 2
    assert all(set(item) == WISHER_KEYS for item in body['items'])
    assert [item['studentId'] for item in body['items']] == ['changwon', 'chaewon']  # 최근 찜 먼저

    # 학생은 명수만 — 찜한 학생 신원은 어떤 학생 응답에도 없다.
    assert client.get(f"/api/v1/jobs/{posting['id']}/wishers", headers=headers('chaewon')).status_code == 403
    assert client.get(f"/api/v1/jobs/{posting['id']}/wishers", headers=headers('psych_yoon')).status_code == 403
    assert 'wishers' not in detail(client, posting, 'chaewon')

    wish(client, 'changwon', posting, saved=False)
    assert detail(client, posting)['wishCount'] == 1


def test_wishers_of_a_deleted_posting_is_404(client):
    posting = new_posting(client)
    deleted = client.delete(f"/api/v1/jobs/{posting['id']}?expectedVersion={posting['version']}", headers=headers('career_kim'))
    assert deleted.status_code in (200, 204), deleted.text
    assert client.get(f"/api/v1/jobs/{posting['id']}/wishers", headers=headers('career_kim')).status_code == 404


def test_wish_count_stays_out_of_posting_history(client):
    posting = new_posting(client)
    wish(client, 'chaewon', posting)
    body = posting_body(companyId=posting['companyId'], role='이력 검증', expectedVersion=posting['version'])
    edited = client.patch(f"/api/v1/jobs/{posting['id']}", headers={**headers('career_kim'), **key()}, json=body)
    assert edited.status_code == 200, edited.text
    with pool.connection() as conn:
        events = conn.execute('SELECT before_value,after_value FROM dc.job_posting_event WHERE posting_id=%s',
                              (posting['id'],)).fetchall()
    assert events
    for event in events:
        for value in (event['before_value'], event['after_value']):
            assert value is None or 'wishCount' not in value


def test_dashboard_keeps_postings_until_their_deadline_time(client, monkeypatch):
    day = date(2070, 1, 8)
    monkeypatch.setattr(counsel_dashboard, 'clock', lambda: time(18, 0))
    with pool.connection() as conn:
        try:
            staff = conn.execute("SELECT intg_uid FROM dc.person WHERE alias='career_kim'").fetchone()['intg_uid']
            company = conn.execute("INSERT INTO dc.company(id,display_name) VALUES('company_0016_dash','0016') RETURNING id").fetchone()['id']
            for posting_id, value in (('job_0016_open', '18:00'), ('job_0016_past', '17:59')):
                conn.execute('''INSERT INTO dc.job_posting(id,company_id,company_name_snapshot,role,recruit_type,stored_status,
                  deadline_mode,deadline_date,deadline_time,source,posted_at)
                  VALUES(%s,%s,'0016','대시보드','GENERAL','POSTED','DATE',%s,%s,'manual',now())''',
                  (posting_id, company, day, value))
            user = {'kind': 'STAFF', 'intg_uid': staff, 'profile': {'role': 'career'}}
            ids = {j['id'] for j in counsel_dashboard.recruiting_jobs(conn, user, day)['general']}
            assert 'job_0016_open' in ids and 'job_0016_past' not in ids
        finally:
            conn.rollback()
