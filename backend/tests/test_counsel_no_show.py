"""상담 불참(노쇼)과 취소 시한.

불참은 상담사가 직접 체크하는 종결 상태다 — 자동 만료가 아니다. 취소는 예약 시각 전이면
언제든 가능하고(옛 '3일 전' 제한 폐지), 이미 시작된 상담만 막는다.
"""
from datetime import date, timedelta
from uuid import uuid4

from test_api import headers, request_body
from test_psych_referrals import db  # noqa: F401


def apply_and_confirm(client, offset):
    """학생이 신청하고 상담사가 확정한다 — 불참은 확정된 건에만 있다."""
    body = request_body(offset)
    created = client.post('/api/v1/counsel-requests',
                          headers={**headers('chaewon'), 'Idempotency-Key': str(uuid4())}, json=body)
    assert created.status_code == 201, created.text
    path = '/api/v1/counsel-requests/' + created.json()['id']
    confirmed = client.post(path + '/confirm', headers=headers('career_kim'),
                            json={'expectedVersion': 1, 'slot': body['slot']})
    assert confirmed.status_code == 200, confirmed.text
    return path, confirmed.json()


def test_only_a_confirmed_counsel_becomes_no_show(client):
    path, confirmed = apply_and_confirm(client, 10)
    marked = client.post(path + '/noshow', headers=headers('career_kim'),
                         json={'expectedVersion': confirmed['version']})
    assert marked.status_code == 200, marked.text
    assert marked.json()['status'] == '불참'
    # 종결 상태다 — 되돌리거나 완료로 덮을 수 없다.
    closed = client.post(path + '/complete', headers=headers('career_kim'),
                         json={'expectedVersion': marked.json()['version'], 'summary': '뒤늦은 기록', 'comment': ''})
    assert closed.status_code == 409
    listed = client.get('/api/v1/counsel-requests', headers=headers('career_kim'),
                        params={'status': '불참'}).json()
    assert marked.json()['id'] in [row['id'] for row in listed['items']]


def test_a_waiting_request_cannot_be_marked_no_show(client):
    """약속이 잡히지 않은 대기 건에는 어길 약속이 없다."""
    created = client.post('/api/v1/counsel-requests',
                          headers={**headers('chaewon'), 'Idempotency-Key': str(uuid4())},
                          json=request_body(11))
    assert created.status_code == 201, created.text
    refused = client.post('/api/v1/counsel-requests/' + created.json()['id'] + '/noshow',
                          headers=headers('career_kim'), json={'expectedVersion': 1})
    assert refused.status_code == 409


def test_students_cannot_mark_no_show(client):
    """판정은 상담사가 한다 — 학생이 스스로 불참을 찍을 수 없다."""
    path, confirmed = apply_and_confirm(client, 12)
    refused = client.post(path + '/noshow', headers=headers('chaewon'),
                          json={'expectedVersion': confirmed['version']})
    assert refused.status_code == 403


def test_a_student_cancels_any_time_before_the_slot_but_not_after_it_starts(client, db):
    path, confirmed = apply_and_confirm(client, 13)
    # 예약일이 내일이어도 취소된다 — 옛 '상담 3일 전' 제한은 없어졌다.
    db.execute('UPDATE dc.counsel_request SET slot_date=%s WHERE id=%s',
               (date.today() + timedelta(days=1), confirmed['id']))
    cancelled = client.post(path + '/cancel', headers=headers('chaewon'),
                            json={'expectedVersion': confirmed['version'], 'reason': '일정이 겹쳐 취소합니다.'})
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()['status'] == '취소'

    # 이미 시작된 상담은 막는다.
    path2, confirmed2 = apply_and_confirm(client, 14)
    db.execute("UPDATE dc.counsel_request SET slot_date=%s,slot_start='00:01' WHERE id=%s",
               (date.today() - timedelta(days=1), confirmed2['id']))
    refused = client.post(path2 + '/cancel', headers=headers('chaewon'),
                          json={'expectedVersion': confirmed2['version'], 'reason': '지난 상담'})
    assert refused.status_code == 409
