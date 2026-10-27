"""상담사가 학생 상담을 잡는다(2026-10-27) — 확정 상태 생성 · 학생 확정 알림 · 학생 신청과 같은 잠금."""
from uuid import uuid4

from test_api import headers, request_body
from test_psych_referrals import db  # noqa: F401


def assign(client, student='chaewon', track='general', who='career_kim', offset=42):
    return client.post('/api/v1/counsel-requests/staff', headers={**headers(who), 'Idempotency-Key': str(uuid4())},
                       json={'studentId': student, 'careTrack': track, 'method': '대면', 'slot': request_body(offset)['slot']})


def test_only_career_counselor_assigns(client, db):
    assert assign(client, who='chaewon').status_code == 403
    assert assign(client, who='psych_lee').status_code == 403
    assert client.get('/api/v1/counsel-track-gates/chaewon', headers=headers('psych_lee')).status_code == 403


def test_assign_uses_student_gates(client, db):
    gates = client.get('/api/v1/counsel-track-gates/jiwoo', headers=headers('career_kim')).json()
    assert gates['care7']['open'] is False and gates['general']['open'] is False
    refused = assign(client, student='jiwoo', track='care7')
    assert refused.status_code == 409 and refused.json()['detail'] == gates['care7']['reason']
    assert client.get('/api/v1/counsel-track-gates/chaewon', headers=headers('career_kim')).json()['general'] == {'open': True}


def test_assign_confirms_and_notifies_student(client, db):
    response = assign(client)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body['status'] == '확정' and body['careTrack'] == 'general' and body['assignedCounselorId'] == 'career_kim'
    assert body['origin'] == 'CNS_ASSIGN' and body['slot']['start'] == '14:00'
    events = db.execute('SELECT kind FROM dc.counsel_event WHERE request_id=%s', (body['id'],)).fetchall()
    assert [e['kind'] for e in events] == ['CONFIRM']
    sent = db.execute('''SELECT p.alias,n.title FROM dc.notification n JOIN dc.person p ON p.intg_uid=n.recipient_uid
      WHERE n.source_kind='counsel' AND n.source_id IN (SELECT id::text FROM dc.counsel_event WHERE request_id=%s)''', (body['id'],)).fetchall()
    assert [(n['alias'], n['title']) for n in sent] == [('chaewon', '상담 신청이 확정되었습니다')]
    assert db.execute('SELECT 1 FROM dc.counsel_consent WHERE request_id=%s', (body['id'],)).fetchone() is None
    # 같은 시간은 학생 신청과 같은 겹침 검사로 막힌다.
    assert assign(client).status_code == 409
