"""채용·취업 통합 테스트 — 실제 PostgreSQL *_test DB 에서만 돌린다.

이 파일이 지키는 다섯 가지는 Opus 검증(03-opus-review.md §10)이 명시한 증거다.
  1. career 상담사가 /jobs 관리 API 를 통과한다(E02 — 없으면 전 상담사 403 을 배포 후에 안다)
  2. care_gate 를 분리한 뒤에도 기존 상담 테스트가 그대로 통과한다(E03)
  3. care_track 이 비어 있는 진로 상담이 게이트를 연다(E04)
  4. 021 의 ai_run 2건이 job_resume 실제 행을 가리킨다(§2.3)
  5. CSV 「대학」이 학과명이 아니라 (단대코드,학과코드) 조인에서 나오고, 코드 없는 학생은 빈칸이다(E10)
"""
from datetime import date, timedelta
from uuid import uuid4

import psycopg
import pytest
from fastapi import HTTPException

from app.db import pool
from app.jobs import plus_one_month
from test_api import headers


def key():
    return {'Idempotency-Key': uuid4().hex}


def new_company(client, name='검증 주식회사'):
    response = client.post('/api/v1/job-companies', headers=headers('career_kim'),
                           json={'displayName': name, 'companyTypeCode': 'LARGE'})
    assert response.status_code == 201, response.text
    return response.json()


def posting_body(**overrides):
    body = {'role': '백엔드 개발', 'tags': ['서류면제'], 'salary': '3,600', 'location': '경남 창원',
            'jobType': 'NEW', 'companyType': 'LARGE', 'recruitType': 'RECOMMENDATION', 'status': 'POSTED',
            'deadlineMode': 'DATE', 'deadline': (date.today() + timedelta(days=30)).isoformat(),
            'employmentTypes': ['FULLTIME'], 'jobCategories': ['IT'], 'careerTypes': ['NEW'],
            'genders': ['ANY'], 'regions': ['GYEONGNAM'], 'content': '<p>모집합니다.</p>'}
    body.update(overrides)
    return body


def new_posting(client, identity='career_kim', **overrides):
    body = posting_body(**overrides)
    if 'companyId' not in body and 'createCompany' not in body:
        body['companyId'] = new_company(client, '검증 ' + uuid4().hex[:6])['id']
    response = client.post('/api/v1/jobs', headers={**headers(identity), **key()}, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def upload_resume(client, identity='chaewon', name='이력서.pdf'):
    response = client.post('/api/v1/job-files?slot=RESUME&name=' + name,
                           headers={**headers(identity), 'Content-Type': 'application/pdf'},
                           content=b'%PDF-1.4 fixture')
    assert response.status_code == 201, response.text
    return response.json()


def apply_as(client, identity, posting, file_id=None, expectedVersion=None):
    body = {'expectedPostingVersion': posting['version'],
            'attachment': {'kind': 'RESUME_FILE', 'fileId': file_id or upload_resume(client, identity)['id']}}
    if expectedVersion:
        body['expectedVersion'] = expectedVersion
    return client.post(f"/api/v1/jobs/{posting['id']}/applications",
                       headers={**headers(identity), **key()}, json=body)


# ── 인가 ────────────────────────────────────────────────────────────────

def test_career_counsellor_manages_and_other_roles_are_refused(client):
    """E02 — 채용 메뉴는 career 에만 부여돼 있다. auth_user 검사만 했다면 전원 403 이 된다."""
    assert client.get('/api/v1/jobs/capabilities', headers=headers('career_kim')).json()['canManage'] is True
    assert new_posting(client)['id']
    for identity in ('psych_yoon', 'cse-2', 'asst_kim', 'chaewon'):
        capability = client.get('/api/v1/jobs/capabilities', headers=headers(identity)).json()
        assert capability['canManage'] is False, identity
        assert client.post('/api/v1/jobs', headers={**headers(identity), **key()},
                           json=posting_body(createCompany={'displayName': 'x'})).status_code == 403, identity
    # 슈퍼관리자(AUTH0006)에게는 채용 메뉴가 부여돼 있지 않다 — 자동으로 통과하지 않는다.
    assert client.get('/api/v1/jobs/capabilities', headers=headers('system-admin')).json()['canManage'] is False


def test_catalog_is_readable_but_applications_are_scoped(client):
    posting = new_posting(client)
    assert client.get(f"/api/v1/jobs/{posting['id']}", headers=headers('changwon')).status_code == 200
    assert apply_as(client, 'chaewon', posting).status_code == 201
    mine = client.get('/api/v1/job-applications/mine', headers=headers('changwon')).json()
    assert all(item['jobId'] != posting['id'] for item in mine['items'])
    # 학생은 관리 목록·통계·CSV 에 접근할 수 없다.
    for path in ('/api/v1/job-applications', '/api/v1/job-applications/summary', '/api/v1/job-applications/export'):
        assert client.get(path, headers=headers('chaewon')).status_code == 403, path


# ── 게이트 ──────────────────────────────────────────────────────────────

def test_gate_blocks_incomplete_diagnosis_and_opens_for_completed(client):
    """E03·E04 — 판정은 gates.py 한 곳에서 하고 care_track 이 비어도 진로 상담은 게이트를 연다."""
    ready = client.get('/api/v1/jobs/eligibility', headers=headers('chaewon')).json()
    assert ready['eligible'] is True, ready
    # 막히는 쪽은 진단을 안 본 학생으로 잡는다. changwon 은 후속진단(C4) 결과가
    # 들어오면서(028) 게이트가 열렸다 — 시드에 값이 채워질수록 「미완료 예시」로
    # 쓰던 학생이 하나씩 사라지므로, 대상을 이름이 아니라 조건으로 고른다.
    # 로스터 더미 퇴역(062) 뒤 남은 fixture 중 후속진단 미응시는 jiwoo(리셋 학생)다.
    blocked_alias = 'jiwoo'
    blocked = client.get('/api/v1/jobs/eligibility', headers=headers(blocked_alias)).json()
    assert blocked['eligible'] is False
    codes = {r['code'] for r in blocked['reasons']}
    assert 'FOLLOWUP_REQUIRED' in codes, blocked
    # 잠긴 화면이 빈 화면이 되지 않도록 다음 단계 경로를 함께 준다(PROCESS.md §2 구현규칙 1).
    assert all(r['nextRoute'] and r['message'] for r in blocked['reasons'])
    posting = new_posting(client)
    assert apply_as(client, blocked_alias, posting).status_code == 403
    with pool.connection() as conn:
        rows = conn.execute('''SELECT status_code,care_track FROM dc.counsel_request
          WHERE student_uid='20211304' AND legacy_type='진로취업' AND care_track IS NULL''').fetchall()
    assert rows == [] or all(r['care_track'] is None for r in rows)


def test_care_gate_for_counsel_still_works_after_extraction(client):
    """E03 — 상담 도메인의 게이트 동작을 바꾸지 않았다(care7 신청은 진단 미완료 시 409)."""
    from datetime import datetime
    day = (datetime.now() + timedelta(days=40)).date().isoformat()
    body = {'type': '진로취업', 'careTrack': 'care7', 'method': '대면', 'topic': 'gate check',
            'assignedCounselorId': 'career_kim', 'topicCode': 'A01',
            'slot': {'date': day, 'start': '09:00', 'end': '10:00', 'place': 'T'}}
    # jiwoo 는 확정 유형이 없다 → 유형 확정 요구로 거절된다.
    refused = client.post('/api/v1/counsel-requests', headers={**headers('jiwoo'), **key()}, json=body)
    assert refused.status_code == 409 and '유형' in refused.json()['detail']


# ── 지원 왕복 ───────────────────────────────────────────────────────────

def test_apply_advance_pass_and_history_is_append_only(client):
    posting = new_posting(client)
    created = apply_as(client, 'chaewon', posting)
    assert created.status_code == 201, created.text
    application = created.json()
    assert application['status'] == 'APPLIED' and application['currentAttemptNo'] == 1
    assert application['currentAttempt']['studentNo'] == '20211304'
    head = headers('career_kim')
    stages = client.get(f"/api/v1/job-applications/{application['id']}", headers=head).json()['stages']
    assert [s['systemKey'] for s in stages[:2]] == ['REVIEW', 'FORWARD']
    version = application['version']
    for _ in stages:
        response = client.post(f"/api/v1/job-applications/{application['id']}/advance",
                               headers=head, json={'expectedVersion': version})
        assert response.status_code == 200, response.text
        version = response.json()['version']
    final = client.post(f"/api/v1/job-applications/{application['id']}/advance",
                        headers=head, json={'expectedVersion': version})
    assert final.status_code == 200 and final.json()['status'] == 'PASSED'
    events = client.get(f"/api/v1/job-applications/{application['id']}/events", headers=head).json()
    assert [e['action'] for e in events['items']] == ['APPLY'] + ['ADVANCE'] * len(stages) + ['PASS']
    assert events['items'][1]['toStageName'] == '서류 검토'
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('UPDATE dc.job_application_event SET reason=%s', ('tampered',))
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('DELETE FROM dc.job_application_attempt')


def test_cancel_then_reapply_keeps_the_previous_attempt(client):
    posting = new_posting(client)
    application = apply_as(client, 'chaewon', posting).json()
    canceled = client.post(f"/api/v1/job-applications/{application['id']}/cancel",
                           headers=headers('chaewon'), json={'expectedVersion': application['version']})
    assert canceled.status_code == 200 and canceled.json()['status'] == 'CANCELED'
    again = apply_as(client, 'chaewon', posting, expectedVersion=canceled.json()['version'])
    assert again.status_code == 201, again.text
    assert again.json()['id'] == application['id'], '재지원이 새 행을 만들었다'
    assert again.json()['currentAttemptNo'] == 2
    with pool.connection() as conn:
        attempts = conn.execute('''SELECT attempt_no,attachment_file_id FROM dc.job_application_attempt
          WHERE application_id=%s ORDER BY attempt_no''', (application['id'],)).fetchall()
    assert [a['attempt_no'] for a in attempts] == [1, 2], '직전 회차 스냅샷이 사라졌다'
    assert attempts[0]['attachment_file_id'] != attempts[1]['attachment_file_id']


def test_duplicate_closed_and_wrong_transitions_are_refused(client):
    posting = new_posting(client)
    assert apply_as(client, 'chaewon', posting).status_code == 201
    assert apply_as(client, 'chaewon', posting).status_code == 409
    general = new_posting(client, recruitType='GENERAL')
    assert apply_as(client, 'chaewon', general).status_code == 409
    closed = new_posting(client, status='CLOSED')
    assert apply_as(client, 'chaewon', closed).status_code == 409
    expired = new_posting(client, deadline=(date.today() - timedelta(days=1)).isoformat())
    assert apply_as(client, 'chaewon', expired).status_code == 409
    # 종료된 지원은 더 진행되지 않는다.
    settled = new_posting(client)
    application = apply_as(client, 'chaewon', settled).json()
    head = headers('career_kim')
    rejected = client.post(f"/api/v1/job-applications/{application['id']}/reject",
                           headers=head, json={'expectedVersion': application['version'], 'reason': '서류 미달'})
    assert rejected.status_code == 200
    assert client.post(f"/api/v1/job-applications/{application['id']}/advance", headers=head,
                       json={'expectedVersion': rejected.json()['version']}).status_code == 409
    # stale version 은 거절한다.
    assert client.post(f"/api/v1/job-applications/{application['id']}/reject", headers=head,
                       json={'expectedVersion': application['version']}).status_code == 409


def test_idempotent_apply_creates_one_row(client):
    posting = new_posting(client)
    identical = key()
    body = {'expectedPostingVersion': posting['version'],
            'attachment': {'kind': 'RESUME_FILE', 'fileId': upload_resume(client)['id']}}
    send = lambda: client.post(f"/api/v1/jobs/{posting['id']}/applications",
                               headers={**headers('chaewon'), **identical}, json=body)
    first, second = send(), send()
    assert first.status_code == 201 and second.status_code in (200, 201)
    assert first.json()['id'] == second.json()['id']
    other = dict(body, attachment={'kind': 'RESUME_FILE', 'fileId': upload_resume(client)['id']})
    assert client.post(f"/api/v1/jobs/{posting['id']}/applications",
                       headers={**headers('chaewon'), **identical}, json=other).status_code == 409


def test_portfolio_submission_is_not_faked(client):
    """포트폴리오 provider 가 없다 — 없는 제출을 성공한 것처럼 만들지 않는다(DB.md §8-3 #4)."""
    posting = new_posting(client)
    response = client.post(f"/api/v1/jobs/{posting['id']}/applications", headers={**headers('chaewon'), **key()},
                           json={'expectedPostingVersion': posting['version'],
                                 'attachment': {'kind': 'PORTFOLIO'}})
    assert response.status_code == 503
    assert client.get('/api/v1/jobs/capabilities',
                      headers=headers('chaewon')).json()['canApplyWithPortfolio'] is False


# ── 전형 단계 ────────────────────────────────────────────────────────────

def test_stage_editing_protects_system_stages_and_occupied_stages(client):
    posting = new_posting(client)
    head = headers('career_kim')
    stages = posting['stages']
    system_id = stages[0]['id']
    path = f"/api/v1/jobs/{posting['id']}/stages"
    assert client.put(path, headers=head, json={'expectedVersion': posting['version'],
                      'stages': [{'id': system_id, 'name': '바꾸기'}]}).status_code == 409
    # 순서 변경 + 이름 변경 + 추가를 한 번에.
    user_stages = [s for s in stages if not s['systemKey']]
    reordered = [{'id': user_stages[1]['id'], 'name': user_stages[1]['name']},
                 {'id': user_stages[0]['id'], 'name': '서류 심사'},
                 {'name': '임원 면접'}]
    response = client.put(path, headers=head, json={'expectedVersion': posting['version'], 'stages': reordered})
    assert response.status_code == 200, response.text
    names = [s['name'] for s in response.json()['stages']]
    assert names == ['서류 검토', '기업 전달', user_stages[1]['name'], '서류 심사', '임원 면접']
    # 진행 중인 지원자가 점유한 단계는 지울 수 없다.
    application = apply_as(client, 'chaewon', response.json()).json()
    moved = client.post(f"/api/v1/job-applications/{application['id']}/advance",
                        headers=head, json={'expectedVersion': application['version']}).json()
    current = client.get(f"/api/v1/jobs/{posting['id']}", headers=head).json()
    remaining = [{'id': s['id'], 'name': s['name']} for s in current['stages'] if not s['systemKey']]
    assert moved['currentStageName'] == '서류 검토'
    occupied = client.put(path, headers=head,
                          json={'expectedVersion': current['version'], 'stages': remaining[:1]})
    assert occupied.status_code == 200, '기업 전형만 지웠는데 거절됐다'


# ── 마감 ────────────────────────────────────────────────────────────────

def test_on_hire_deadline_is_fixed_at_registration(client):
    """E11 — 현행 폼은 저장할 때마다 다시 계산해 제목만 고쳐도 마감이 한 달 밀렸다."""
    posting = new_posting(client, deadlineMode='ON_HIRE', deadline=None)
    fixed = posting['deadline']
    assert fixed == plus_one_month(date.today()).isoformat()
    body = posting_body(deadlineMode='ON_HIRE', deadline=None, role='제목만 고침',
                        companyId=posting['companyId'], expectedVersion=posting['version'])
    updated = client.patch(f"/api/v1/jobs/{posting['id']}", headers={**headers('career_kim'), **key()}, json=body)
    assert updated.status_code == 200, updated.text
    assert updated.json()['deadline'] == fixed, '저장만 했는데 마감이 밀렸다'


def test_plus_one_month_matches_the_javascript_rule():
    # JS Date.setMonth 는 월말을 넘기면 다음 달로 넘어간다. 그 규칙을 그대로 옮긴다.
    assert plus_one_month(date(2026, 1, 31)) == date(2026, 3, 3)
    assert plus_one_month(date(2026, 12, 15)) == date(2027, 1, 15)
    assert plus_one_month(date(2028, 1, 31)) == date(2028, 3, 2)


def test_effective_status_beats_stored_status(client):
    expired = new_posting(client, deadline=(date.today() - timedelta(days=1)).isoformat())
    assert expired['status'] == 'POSTED' and expired['effectiveStatus'] == 'CLOSED'
    today_only = new_posting(client, deadline=date.today().isoformat())
    assert today_only['effectiveStatus'] == 'POSTED', '마감 당일은 열려 있어야 한다'
    always = new_posting(client, deadlineMode='ALWAYS', deadline=None)
    assert always['effectiveStatus'] == 'POSTED' and always['deadline'] is None


# ── 파일 ────────────────────────────────────────────────────────────────

def test_documents_are_streamed_only_to_owner_and_scoped_staff(client):
    posting = new_posting(client)
    uploaded = upload_resume(client, 'chaewon')
    application = apply_as(client, 'chaewon', posting, file_id=uploaded['id']).json()
    url = '/api/v1/job-files/' + uploaded['id']
    mine = client.get(url, headers=headers('chaewon'))
    assert mine.status_code == 200 and mine.content.startswith(b'%PDF')
    assert client.get(url, headers=headers('changwon')).status_code == 404, '남의 지원 서류가 열렸다'
    assert client.get(url, headers=headers('psych_yoon')).status_code == 403
    staff = client.get(url, headers=headers('career_kim'))
    assert staff.status_code == 200
    with pool.connection() as conn:
        seen = conn.execute('''SELECT count(*) AS n FROM dc.job_access_event
          WHERE action='VIEW_DOCUMENT' AND target_id=%s''', (uploaded['id'],)).fetchone()['n']
    assert seen >= 1, '직원 열람이 감사되지 않았다'
    assert application['currentAttempt']['attachmentName'] == '이력서.pdf'
    # 같은 파일을 다른 지원에 다시 붙일 수 없다.
    other = new_posting(client)
    assert apply_as(client, 'chaewon', other, file_id=uploaded['id']).status_code == 409


def test_file_type_and_size_are_validated(client):
    refused = client.post('/api/v1/job-files?slot=RESUME&name=malware.exe',
                          headers=headers('chaewon'), content=b'MZ')
    assert refused.status_code == 422
    assert client.post('/api/v1/job-files?slot=RESUME&name=empty.pdf',
                       headers=headers('chaewon'), content=b'').status_code == 422
    # 로고 업로드는 관리 권한이 필요하다.
    assert client.post('/api/v1/job-files?slot=LOGO&name=logo.png',
                       headers=headers('chaewon'), content=b'\x89PNG').status_code == 403
    assert client.post('/api/v1/job-files?slot=RESUME&name=resume.pdf',
                       headers=headers('career_kim'), content=b'%PDF').status_code == 403


# ── 집계·CSV ─────────────────────────────────────────────────────────────

def test_summary_and_export_share_the_filter_and_the_scope(client):
    posting = new_posting(client)
    apply_as(client, 'chaewon', posting)
    head = headers('career_kim')
    summary = client.get('/api/v1/job-applications/summary?postingId=' + posting['id'], headers=head)
    assert summary.status_code == 200, summary.text
    assert summary.json()['total'] == 1 and summary.json()['applied'] == 1
    listed = client.get('/api/v1/job-applications?postingId=' + posting['id'], headers=head).json()
    assert listed['totalCount'] == summary.json()['total']
    export = client.get('/api/v1/job-applications/export?postingId=' + posting['id'], headers=head)
    assert export.status_code == 200 and export.headers['content-type'].startswith('text/csv')
    lines = export.text.lstrip('﻿').splitlines()
    assert lines[0].startswith('"공고명","회사명","이름","학번","대학","학과"')
    assert len(lines) == 2
    cells = [c.strip('"') for c in lines[1].split('","')]
    # E10 — 「대학」은 (단대코드,학과코드) 조인 결과다. 코드가 없는 학생은 빈칸이다.
    with pool.connection() as conn:
        org = conn.execute("SELECT college_code,dept_code FROM dc.student WHERE intg_uid='20211304'").fetchone()
        college = conn.execute('SELECT college_name FROM dc.department WHERE (college_code,dept_code)=(%s,%s)',
                               (org['college_code'], org['dept_code'])).fetchone()
    assert cells[4] == (college['college_name'] if college else '')
    with pool.connection() as conn:
        audited = conn.execute("SELECT count(*) AS n FROM dc.job_access_event WHERE action='EXPORT_CSV'"
                               ).fetchone()['n']
    assert audited >= 1, 'CSV 다운로드가 감사되지 않았다'


def test_csv_neutralises_formula_injection(client):
    posting = new_posting(client, role='=cmd|calc')
    apply_as(client, 'chaewon', posting)
    export = client.get('/api/v1/job-applications/export?postingId=' + posting['id'],
                        headers=headers('career_kim'))
    assert '"\'=cmd|calc"' in export.text


# ── 자소서·찜 ────────────────────────────────────────────────────────────

def test_ai_resume_review_points_at_real_rows(client):
    """§2.3 — 021 의 ai_run 은 append-only 라 사후 재매핑이 불가능하다."""
    with pool.connection() as conn:
        rows = conn.execute('''SELECT r.id,r.subject_id,j.student_uid FROM dc.ai_run r
          JOIN dc.job_resume j ON j.id=r.subject_id
          WHERE r.subject_kind='RESUME' ORDER BY r.subject_id''').fetchall()
    assert [(r['subject_id'], r['student_uid']) for r in rows] == [('r1', '20211304'), ('r2', '20196208')]
    listed = client.get('/api/v1/job-resumes', headers=headers('chaewon')).json()
    assert 'r1' in [item['id'] for item in listed['items']]
    assert 'r2' not in [item['id'] for item in listed['items']], '남의 자소서가 목록에 들어왔다'


def test_resumes_are_owned_and_versioned(client):
    created = client.post('/api/v1/job-resumes', headers=headers('chaewon'),
                          json={'title': '검증 자소서', 'categoryCode': 'MOTIVE', 'content': '본문'})
    assert created.status_code == 201, created.text
    resume = created.json()
    assert resume['categoryLabel'] == '지원동기'
    assert client.get('/api/v1/job-resumes/' + resume['id'], headers=headers('changwon')).status_code == 404
    updated = client.patch('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon'),
                           json={'title': '고친 자소서', 'categoryCode': 'MOTIVE', 'content': '고친 본문',
                                 'expectedVersion': resume['version']})
    assert updated.status_code == 200 and updated.json()['createdAt'] == resume['createdAt']
    assert client.patch('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon'),
                        json={'title': 'x', 'content': 'y', 'expectedVersion': resume['version']}).status_code == 409
    assert client.delete('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon')).json()['deleted']
    assert client.get('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon')).status_code == 404
    # 직원은 학생의 개인 자소서 목록에 접근하지 않는다.
    assert client.get('/api/v1/job-resumes', headers=headers('career_kim')).status_code == 403


def test_wishlist_is_owned_and_idempotent(client):
    posting = new_posting(client)
    head = headers('chaewon')
    assert client.put('/api/v1/job-wishlist/' + posting['id'], headers=head).json()['saved'] is True
    assert client.put('/api/v1/job-wishlist/' + posting['id'], headers=head).json()['saved'] is True
    assert posting['id'] in client.get('/api/v1/job-wishlist', headers=head).json()['items']
    assert posting['id'] not in client.get('/api/v1/job-wishlist', headers=headers('changwon')).json()['items']
    assert client.delete('/api/v1/job-wishlist/' + posting['id'], headers=head).json()['saved'] is False
    assert client.delete('/api/v1/job-wishlist/' + posting['id'], headers=head).status_code == 200


# ── 공고 관리 ────────────────────────────────────────────────────────────

def test_external_postings_are_read_only_and_keep_their_source(client):
    external = client.get('/api/v1/jobs?source=external', headers=headers('career_kim')).json()
    assert external['totalCount'] == 6
    seed = next(j for j in external['items'] if j['id'] == 'job_seed_nexon')
    assert seed['companyId'] is None and seed['company'] == '넥슨코리아'
    assert seed['recruitType'] == 'RECOMMENDATION' and seed['deadline'] == '2026-08-10'
    body = posting_body(createCompany={'displayName': '넥슨코리아'}, expectedVersion=seed['version'])
    assert client.patch('/api/v1/jobs/job_seed_nexon', headers={**headers('career_kim'), **key()},
                        json=body).status_code == 403
    # 외부 추천채용이라도 교내 지원 대상이 아니다.
    assert apply_as(client, 'chaewon', seed).status_code == 409


def test_posting_delete_is_logical_and_keeps_applications(client):
    posting = new_posting(client)
    application = apply_as(client, 'chaewon', posting).json()
    head = headers('career_kim')
    removed = client.delete(f"/api/v1/jobs/{posting['id']}?expectedVersion={posting['version']}", headers=head)
    assert removed.status_code == 200 and removed.json()['deleted'] is True
    assert client.get(f"/api/v1/jobs/{posting['id']}", headers=head).status_code == 404
    kept = client.get(f"/api/v1/job-applications/{application['id']}", headers=head)
    assert kept.status_code == 200 and kept.json()['status'] == 'APPLIED'


def test_unknown_codes_and_invalid_input_are_refused(client):
    company = new_company(client, '코드검증 ' + uuid4().hex[:6])
    head = {**headers('career_kim'), **key()}
    assert client.post('/api/v1/jobs', headers=head,
                       json=posting_body(companyId=company['id'], jobCategories=['NOT_A_CODE'])).status_code == 422
    assert client.post('/api/v1/jobs', headers={**headers('career_kim'), **key()},
                       json=posting_body(companyId=company['id'], applyUrl='javascript:alert(1)',
                                         urlTitleLink=True)).status_code == 422
    assert client.post('/api/v1/jobs', headers={**headers('career_kim'), **key()},
                       json=posting_body(companyId=company['id'], deadlineMode='DATE',
                                         deadline=None)).status_code == 422
    assert client.post('/api/v1/jobs', headers={**headers('career_kim'), **key()},
                       json=posting_body(companyId='cmp_nope')).status_code == 422


def test_company_in_use_cannot_be_deleted(client):
    company = new_company(client, '삭제검증 ' + uuid4().hex[:6])
    new_posting(client, companyId=company['id'])
    assert client.delete('/api/v1/job-companies/' + company['id'],
                         headers=headers('career_kim')).status_code == 409


def test_close_and_reopen_change_only_the_stored_status(client):
    posting = new_posting(client)
    head = headers('career_kim')
    closed = client.post(f"/api/v1/jobs/{posting['id']}/close", headers=head,
                         json={'expectedVersion': posting['version'], 'reason': '조기 마감'})
    assert closed.status_code == 200, closed.text
    assert closed.json()['status'] == 'CLOSED' and closed.json()['effectiveStatus'] == 'CLOSED'
    assert apply_as(client, 'chaewon', closed.json()).status_code == 409
    assert client.post(f"/api/v1/jobs/{posting['id']}/close", headers=head,
                       json={'expectedVersion': closed.json()['version']}).status_code == 409
    reopened = client.post(f"/api/v1/jobs/{posting['id']}/reopen", headers=head,
                           json={'expectedVersion': closed.json()['version']})
    assert reopened.status_code == 200 and reopened.json()['effectiveStatus'] == 'POSTED'
    # 마감일은 건드리지 않는다 — 재게시가 날짜를 늘리지 않는다.
    assert reopened.json()['deadline'] == posting['deadline']
    with pool.connection() as conn:
        actions = conn.execute('''SELECT action FROM dc.job_posting_event WHERE posting_id=%s
          ORDER BY seq''', (posting['id'],)).fetchall()
    assert [a['action'] for a in actions] == ['CREATE', 'CLOSE', 'REOPEN']


def test_oversized_upload_stops_reading_instead_of_buffering(client, monkeypatch):
    """본문을 다 읽은 뒤에 크기를 재면 이미 늦다 — 인증된 학생이 컨테이너 메모리를 넘길 수 있다.

    ① files.read_body 가 한도에서 읽기를 멈추는지 직접 확인한다. TestClient 는 요청 본문을
       앱에 넘기기 전에 스스로 모아 버리므로, 왕복만으로는 "서버가 멈췄다"를 증명할 수 없다.
    ② 그리고 실제 엔드포인트가 422 로 거절하고 아무것도 남기지 않는지 확인한다.
    """
    import asyncio

    from app import files
    from app.settings import settings

    monkeypatch.setattr(settings, 'file_max_bytes', 64 * 1024)
    consumed = {'chunks': 0}

    class Stream:
        headers = {}

        async def stream(self):
            for _ in range(200):          # 200 × 32KB = 6.4MB (한도의 100배)
                consumed['chunks'] += 1
                yield b'x' * 32768

    with pytest.raises(HTTPException) as refused:
        asyncio.run(files.read_body(Stream()))
    assert refused.value.status_code == 422
    # 한도(64KB)를 넘긴 직후 멈춘다 — 32KB 청크 세 개면 충분하다.
    assert consumed['chunks'] <= 3, f"한도를 넘긴 뒤에도 계속 읽었다 ({consumed['chunks']}청크)"

    # Content-Length 를 선언한 요청은 한 바이트도 읽기 전에 거절한다.
    class Declared(Stream):
        headers = {'content-length': str(200 * 1024)}

    before = consumed['chunks']
    with pytest.raises(HTTPException) as early:
        asyncio.run(files.read_body(Declared()))
    assert early.value.status_code == 422 and consumed['chunks'] == before

    # 엔드포인트 왕복 — 거절되고 볼륨에도 DB 에도 남지 않는다.
    response = client.post('/api/v1/job-files?slot=RESUME&name=huge.pdf',
                           headers=headers('chaewon'), content=b'x' * (128 * 1024))
    assert response.status_code == 422, response.text
    with pool.connection() as conn:
        leaked = conn.execute("SELECT count(*) AS n FROM dc.file_object WHERE original_name='huge.pdf'"
                              ).fetchone()['n']
    assert leaked == 0, '거절한 업로드가 저장됐다'
