"""0017 — 채용공고 모집요강 템플릿 (169). 실제 *_test DB 에서만 돈다."""
import pytest
from psycopg.errors import CheckViolation
from psycopg.types.json import Jsonb

from app.db import pool
from test_api import headers
from test_jobs import key, new_company, new_posting, posting_body

GUIDE_KEYS = {'headline', 'emphasis', 'duty', 'workHours', 'employmentNote', 'salaryNote', 'qualification',
              'preferred', 'industry', 'revenue', 'headcount', 'address', 'department', 'portalUrl', 'homepageUrl',
              'applyMethod', 'contact', 'note', 'documents', 'steps'}
FIELDS = {'headline': '함께 성장할 인재를 찾습니다', 'emphasis': '성장', 'duty': '철강판매관리',
          'workHours': '월~금 08:00~17:00', 'qualification': '영업직무 희망자 누구나',
          'documents': [{'name': ' 이력서 ', 'note': '자유양식'}, {'name': '자격증 사본', 'optional': True}],
          'steps': [' 서류전형 ', '면접전형', '합격자 발표']}


def stored(posting_id):
    with pool.connection() as conn:
        return conn.execute('''SELECT guide_template,guide_fields,guide_fields IS NULL AS sql_null
          FROM dc.job_posting WHERE id=%s''', (posting_id,)).fetchone()


def patch(client, posting, **overrides):
    body = posting_body(companyId=posting['companyId'], expectedVersion=posting['version'], **overrides)
    return client.patch(f"/api/v1/jobs/{posting['id']}", headers={**headers('career_kim'), **key()}, json=body)


def test_template_round_trip_with_full_key_shape(client):
    posting = new_posting(client, guideTemplate='DOCUMENT', guideFields=FIELDS)
    assert posting['guideTemplate'] == 'DOCUMENT'
    fields = posting['guideFields']
    assert set(fields) == GUIDE_KEYS
    assert fields['documents'] == [{'name': '이력서', 'note': '자유양식', 'optional': False},
                                   {'name': '자격증 사본', 'note': '', 'optional': True}]
    assert fields['steps'] == ['서류전형', '면접전형', '합격자 발표']
    assert fields['preferred'] == ''
    student = client.get(f"/api/v1/jobs/{posting['id']}", headers=headers('chaewon')).json()
    assert (student['guideTemplate'], student['guideFields']) == ('DOCUMENT', fields)
    assert stored(posting['id'])['guide_fields'] == fields


def test_template_without_fields_saves_the_default_object(client):
    posting = new_posting(client, guideTemplate='POSTER')
    assert set(posting['guideFields']) == GUIDE_KEYS
    assert posting['guideFields']['steps'] == []


@pytest.mark.parametrize('bad', [
    {'guideTemplate': 'FANCY'},
    {'guideTemplate': 'POSTER', 'guideFields': {'unknown': 'x'}},
    {'guideTemplate': 'POSTER', 'guideFields': {'headline': 'x' * 81}},
    {'guideTemplate': 'POSTER', 'guideFields': {'documents': [{'name': f'서류{i}'} for i in range(13)]}},
    {'guideTemplate': 'POSTER', 'guideFields': {'steps': [f'단계{i}' for i in range(7)]}},
    {'guideTemplate': 'POSTER', 'guideFields': {'steps': ['   ']}},
    {'guideTemplate': 'POSTER', 'guideFields': {'documents': [{'name': '   '}]}},
    {'guideTemplate': 'POSTER', 'guideFields': {'documents': [{'name': '이력서', 'extra': 1}]}},
])
def test_invalid_template_input_is_422(client, bad):
    response = client.post('/api/v1/jobs', headers={**headers('career_kim'), **key()},
                           json=posting_body(createCompany={'displayName': '템플릿 검증'}, **bad))
    assert response.status_code == 422, response.text


def test_apply_links_get_a_scheme_and_unsafe_schemes_are_422(client):
    posting = new_posting(client, guideTemplate='POSTER', guideFields={
        'department': ' 영업본부 ', 'portalUrl': 'www.saramin.co.kr/zf_user/jobs/view?rec_idx=1',
        'homepageUrl': 'http://example.com/recruit'})
    fields = posting['guideFields']
    assert fields['department'] == '영업본부'
    assert fields['portalUrl'] == 'https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=1'
    assert fields['homepageUrl'] == 'http://example.com/recruit'
    for bad in ({'portalUrl': 'javascript:alert(1)'}, {'homepageUrl': 'example .com'}, {'portalUrl': 'x' * 501}):
        response = client.post('/api/v1/jobs', headers={**headers('career_kim'), **key()},
                               json=posting_body(createCompany={'displayName': '링크 검증'},
                                                 guideTemplate='POSTER', guideFields=bad))
        assert response.status_code == 422, response.text


def test_fields_without_template_and_legacy_body_store_sql_null(client):
    posting = new_posting(client, guideFields=FIELDS)
    legacy = new_posting(client)
    for p in (posting, legacy):
        assert (p['guideTemplate'], p['guideFields']) == (None, None)
        row = stored(p['id'])
        assert row['guide_template'] is None and row['sql_null'] is True


def test_patch_switches_and_turns_off_template_with_history(client):
    posting = new_posting(client, guideTemplate='POSTER', guideFields=FIELDS)
    switched = patch(client, posting, guideTemplate='HIGHLIGHT', guideFields={**FIELDS, 'note': '쪽지 문의'})
    assert switched.status_code == 200, switched.text
    assert switched.json()['guideTemplate'] == 'HIGHLIGHT'
    # 두 키를 빼고 보내면 전체 교체 계약대로 템플릿이 꺼진다 — 폼은 반드시 두 값을 실어 보낸다.
    off = patch(client, switched.json())
    assert off.status_code == 200, off.text
    assert (off.json()['guideTemplate'], off.json()['guideFields']) == (None, None)
    with pool.connection() as conn:
        events = conn.execute('''SELECT before_value,after_value FROM dc.job_posting_event
          WHERE posting_id=%s AND action='UPDATE' ORDER BY seq''', (posting['id'],)).fetchall()
    assert events[0]['before_value']['guideTemplate'] == 'POSTER'
    assert events[0]['after_value']['guideTemplate'] == 'HIGHLIGHT'
    assert events[-1]['after_value']['guideTemplate'] is None


def test_idempotent_resend_returns_same_posting(client):
    company = new_company(client, '멱등 템플릿')
    body = posting_body(companyId=company['id'], guideTemplate='DOCUMENT', guideFields=FIELDS)
    same = key()
    first = client.post('/api/v1/jobs', headers={**headers('career_kim'), **same}, json=body)
    again = client.post('/api/v1/jobs', headers={**headers('career_kim'), **same}, json=body)
    assert first.status_code == 201 and again.status_code in (200, 201)
    assert again.json()['id'] == first.json()['id']
    changed = client.post('/api/v1/jobs', headers={**headers('career_kim'), **same},
                          json={**body, 'guideFields': {**FIELDS, 'note': '다른 값'}})
    assert changed.status_code == 409, changed.text


def test_db_constraints_reject_unpaired_or_non_object_values(client):
    posting = new_posting(client)
    for template, fields in (('POSTER', None), (None, Jsonb({})), ('POSTER', Jsonb(['x'])), ('FANCY', Jsonb({}))):
        with pool.connection() as conn:
            with pytest.raises(CheckViolation):
                conn.execute('UPDATE dc.job_posting SET guide_template=%s,guide_fields=%s WHERE id=%s',
                             (template, fields, posting['id']))
