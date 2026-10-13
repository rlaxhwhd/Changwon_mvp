"""CARE 7+ 상담 신청의 선택 입력 「희망기업」.

CARE 7+ 신청에서만 받고, 비워 두면 저장하지 않는다. 신청 응답·목록 DTO 에 같은 값이 돌아온다.
"""
from uuid import uuid4

from test_api import headers, request_body
from test_psych_referrals import db  # noqa: F401


def apply(client, body):
    return client.post('/api/v1/counsel-requests',
                       headers={**headers('chaewon'), 'Idempotency-Key': str(uuid4())}, json=body)


def test_care7_request_keeps_desired_company(client):
    created = apply(client, {**request_body(20, 'care7'), 'topicCode': 'A09', 'desiredCompany': '  테스트전자  '})
    assert created.status_code == 201, created.text
    assert created.json()['desiredCompany'] == '테스트전자'
    listed = client.get('/api/v1/counsel-requests', headers=headers('career_kim')).json()['items']
    assert next(row for row in listed if row['id'] == created.json()['id'])['desiredCompany'] == '테스트전자'


def test_desired_company_is_optional_and_blank_is_not_stored(client):
    created = apply(client, {**request_body(21, 'care7'), 'topicCode': 'A09', 'desiredCompany': '   '})
    assert created.status_code == 201, created.text
    assert created.json()['desiredCompany'] is None
    omitted = apply(client, {**request_body(22, 'care7'), 'topicCode': 'A09'})
    assert omitted.status_code == 201, omitted.text
    assert omitted.json()['desiredCompany'] is None


def test_general_counsel_rejects_desired_company(client):
    refused = apply(client, {**request_body(23), 'desiredCompany': '테스트전자'})
    assert refused.status_code == 422
    assert '희망기업' in refused.json()['detail']
