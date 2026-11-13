"""DeepResume 연동 계약 테스트 — docs/Deep_API_v7.xlsx 를 흉내 낸 가짜 서버로 검증한다.

실제 Deep 서버는 호출하지 않는다. 우리 DB가 정본이고 Deep 은 같은 본문의 사본이라는 점,
Deep 장애가 학생의 저장을 막지 않는다는 점, 기존 DeepResume 회원은 거부된다는 점을 고정한다.
"""
import json
import uuid

import httpx
import pytest

from app import deep
from app.db import pool
from app.settings import settings
from test_api import headers

MOTIVE_QUESTION = '우리 회사와 해당 직무에 지원한 동기를 구체적으로 기술해 주십시오.'  # 마이그레이션 163


class FakeDeep:
    """Deep 외부 API 의 필요한 부분만. 회원은 학번으로, 자소서는 id 로 구분한다."""

    def __init__(self):
        self.members, self.covers, self.calls = set(), {}, []
        self.existing_member = False
        self.down = False
        self.on_ai = None  # AI 호출 도중에 끼어들 동작(동시 저장 재현)

    def __call__(self, request):
        path = request.url.path.removeprefix('/external/v1/')
        payload = json.loads(request.content) if request.content else {}
        self.calls.append((request.method, path, payload))
        if self.down:
            return httpx.Response(502, text='<html>Bad Gateway</html>')
        if path.startswith('auth/'):
            assert request.headers['X-Service-Key'] == 'dr_test'
            assert payload['school_code'] == 'changwon.ac.kr'
            number = payload['university_num']
            if path == 'auth/login':
                if number not in self.members:
                    return httpx.Response(404, json={'code': 'not_registered'})
                return httpx.Response(200, json={'access_token': 'drt_' + number, 'expires_in': 3600})
            if self.existing_member:
                return httpx.Response(409, json={'code': 'account_exists'})
            self.members.add(number)
            return httpx.Response(201, json={'access_token': 'drt_' + number, 'expires_in': 3600})
        assert request.headers['Authorization'].startswith('Bearer drt_')
        if path == 'covers' and request.method == 'POST':
            cover_id = str(uuid.uuid4())
            topics = [{**t, 'id': str(uuid.uuid4())} for t in payload.pop('topic', [])]
            self.covers[cover_id] = {**payload, 'id': cover_id, 'topic': topics}
            return httpx.Response(201, json=self.covers[cover_id])
        if path == 'covers':
            return httpx.Response(200, json=[{'id': c['id'], 'consulting': 0, 'badge_pen': bool(c.get('evaluations'))}
                                             for c in self.covers.values()])
        if path.startswith('evaluations/'):
            found = next((e for c in self.covers.values() for e in c.get('evaluations', [])
                          if e['evaluation_id'] == path.split('/')[1]), None)
            return httpx.Response(200, json=found) if found else httpx.Response(404, json={'detail': 'not found'})
        cover_id = path.split('/')[1]
        cover = self.covers.get(cover_id)
        if cover is None:
            return httpx.Response(404, json={'detail': 'not found'})
        if request.method == 'PATCH':
            for topic in payload.pop('topic', []):
                target = next(t for t in cover['topic'] if t['id'] == topic.get('id'))
                target.update(topic)
            cover.update(payload)
            return httpx.Response(200, json=cover)
        if request.method == 'DELETE':
            del self.covers[cover_id]
            return httpx.Response(204)
        if path.endswith('/ai'):
            if self.on_ai:
                self.on_ai()
            topic = next(t for t in cover['topic'] if t['id'] == payload['topic_id'])
            body = (payload['text'] + ' ' if payload['text'] else '') + 'AI가 쓴 문장'
            topic['body'] = body if payload.get('mode', 'append') == 'append' else 'AI가 쓴 문장'
            return httpx.Response(201, json={'generated': 'AI가 쓴 문장', 'saved': True, 'topic': topic})
        if path.endswith('/evaluations') and request.method == 'GET':
            # 최신순. stale = 평가 뒤 본문이 바뀌었다.
            return httpx.Response(200, json={'cover_id': cover_id, 'results': [
                {'evaluation_id': e['evaluation_id'], 'created': e['created'], 'stale': e['body'] != cover['topic'][0]['body']}
                for e in reversed(cover.get('evaluations', []))]})
        if path.endswith('/evaluations'):
            evaluation = {
                'evaluation_id': str(uuid.uuid4()), 'cover_id': cover_id, 'cached': False, 'created': '2026-11-13',
                'consult': {'consult_score': 72, 'spellcheck_score': 95, 'detector': 81},
                'contents': [{'order': 0, 'paragraph': cover['topic'][0]['body'], 'topic_id': cover['topic'][0]['id'],
                              'consult_content': '<para>원문 구절<span tag="neg">구체적 수치가 없습니다.</span></para>'
                                                 '<para>좋은 구절<span tag="pos">경험이 직무와 맞습니다.</span></para>'}]}
            cover.setdefault('evaluations', []).append({**evaluation, 'body': cover['topic'][0]['body']})
            return httpx.Response(201, json=evaluation)
        raise AssertionError(path)


@pytest.fixture
def fake(monkeypatch, tmp_path):
    key = tmp_path / 'deep_key'
    key.write_text('dr_test\n')
    server = FakeDeep()
    monkeypatch.setattr(settings, 'deep_key_file', str(key))
    monkeypatch.setattr(settings, 'deep_school_code', 'changwon.ac.kr')
    monkeypatch.setattr(deep, 'client', lambda timeout=20: httpx.Client(
        base_url='https://deep.test/external/v1/', transport=httpx.MockTransport(server)))
    deep._tokens.clear()
    yield server
    deep._tokens.clear()


def create(client, **change):
    body = {'title': 'Deep 연동 자소서', 'categoryCode': 'MOTIVE', 'content': '본문',
            'jobType': '경영·사무·금융', 'company': '엔잡', 'position': '인사', **change}
    response = client.post('/api/v1/job-resumes', headers=headers('chaewon'), json=body)
    assert response.status_code == 201, response.text
    return response.json()


# ── 순수 함수 ────────────────────────────────────────────────────────────

def test_advice_is_parsed_into_text_not_html():
    items = deep.parse_advice('<para>원문<span tag="neg">고칠 점 &amp; 이유</span></para>'
                              '<para><b>굵게</b>좋다<span tag="pos">칭찬</span></para>')
    assert items == [{'quote': '원문', 'tone': 'neg', 'comment': '고칠 점 & 이유'},
                     {'quote': '굵게좋다', 'tone': 'pos', 'comment': '칭찬'}]
    assert deep.parse_advice('태그 없는 조언') == [{'quote': '', 'tone': 'note', 'comment': '태그 없는 조언'}]
    assert deep.parse_advice(None) == []


def test_long_values_are_refused_not_truncated():
    row = {'title': 't', 'job_type_text': '가' * 16, 'company_text': None, 'position_text': None}
    with pytest.raises(deep.DeepError) as error:
        deep.cover_fields(row)
    assert error.value.status == 422 and '15자' in error.value.message


def test_provider_body_is_never_echoed():
    error = deep.failure(httpx.Response(500, json={'secret': 'provider-internal-trace'}))
    assert error.status == 502 and 'provider-internal-trace' not in error.message


# ── 저장: 우리 DB 정본 + Deep 사본 ──────────────────────────────────────

def test_save_creates_and_updates_the_linked_deep_cover(client, fake):
    resume = create(client)
    assert resume['deepSync'] == {'status': 'SYNCED'} and resume['deepLinked'] and resume['deepSynced']
    topic = next(iter(fake.covers.values()))['topic'][0]
    # Deep 평가는 title 을 질문으로 읽는다 — 분야 이름이 아니라 질문 문장(마이그레이션 163)을 보낸다.
    assert topic['title'] == topic['type'] == MOTIVE_QUESTION
    signup = [c for c in fake.calls if c[1] == 'auth/signup']
    assert len(signup) == 1 and signup[0][2]['name']
    [cover] = fake.covers.values()
    assert (cover['job_type'], cover['company'], cover['supportArea']) == ('경영·사무·금융', '엔잡', '인사')
    assert cover['topic'][0]['type'] == MOTIVE_QUESTION and cover['topic'][0]['body'] == '본문'

    updated = client.patch('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon'), json={
        'title': '고친 제목', 'categoryCode': 'MOTIVE', 'content': '고친 본문', 'jobType': '경영·사무·금융',
        'expectedVersion': resume['version']}).json()
    assert updated['deepSync'] == {'status': 'SYNCED'}
    assert len(fake.covers) == 1, 'PATCH 대신 새 자소서를 만들었다'
    assert cover['topic'][0]['body'] == '고친 본문' and len(cover['topic']) == 1
    # 토큰은 재사용한다 — 서비스 키당 분당 120회 로그인 제한.
    assert len([c for c in fake.calls if c[1].startswith('auth/')]) == 2


def test_deep_outage_does_not_block_our_save_and_resyncs_later(client, fake):
    fake.down = True
    resume = create(client)
    assert resume['deepSync']['status'] == 'FAILED' and not resume['deepLinked']
    assert client.get('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon')).json()['content'] == '본문'
    fake.down = False
    updated = client.patch('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon'), json={
        'title': 'Deep 연동 자소서', 'categoryCode': 'MOTIVE', 'content': '복구 후 본문',
        'jobType': '경영·사무·금융', 'expectedVersion': resume['version']}).json()
    assert updated['deepSync'] == {'status': 'SYNCED'} and updated['deepSynced']
    assert [c['topic'][0]['body'] for c in fake.covers.values()] == ['복구 후 본문']


def test_missing_job_type_saves_ours_and_reports_why_deep_was_skipped(client, fake):
    resume = create(client, jobType='')
    assert resume['deepSync']['status'] == 'FAILED' and '직종' in resume['deepSync']['message']
    assert not fake.covers


def test_existing_deepresume_member_is_refused(client, fake):
    fake.existing_member = True
    resume = create(client)
    assert resume['deepSync'] == {'status': 'FAILED', 'message': deep.ACCOUNT_EXISTS}
    response = client.post(f"/api/v1/job-resumes/{resume['id']}/ai-draft", headers=headers('chaewon'),
                           json={'expectedVersion': resume['version']})
    assert response.status_code == 409 and response.json()['detail'] == deep.ACCOUNT_EXISTS


# ── AI 작성 · 평가 ──────────────────────────────────────────────────────

def test_ai_draft_replaces_body_from_prompt_and_stores_the_same_body_in_both(client, fake):
    resume = create(client)
    prompt = '[성장일지 첨부: 동아리 회계]\n결과: 예산 오차 0원'
    response = client.post(f"/api/v1/job-resumes/{resume['id']}/ai-draft", headers=headers('chaewon'), json={
        'expectedVersion': resume['version'], 'industry': '서비스업', 'companyType': '대기업',
        'experience': '신입', 'keywords': ['성실'], 'prompt': prompt})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data['generated'] == 'AI가 쓴 문장'
    # 이어쓰기가 아니라 새로 생성 — 기존 본문 「본문」은 초안으로 교체된다.
    assert data['resume']['content'] == 'AI가 쓴 문장' and data['resume']['deepSynced']
    [ai_call] = [c for c in fake.calls if c[1].endswith('/ai')]
    assert (ai_call[2]['mode'], ai_call[2]['text'], ai_call[2]['tag']) == ('replace', '', prompt)
    # 요청사항은 우리 DB에 남기지 않는다.
    with pool.connection() as conn:
        stored = conn.execute('SELECT * FROM dc.job_resume WHERE id=%s', (resume['id'],)).fetchone()
    assert prompt not in str(stored)
    [cover] = fake.covers.values()
    assert cover['topic'][0]['body'] == data['resume']['content']
    assert (cover['industry_type'], cover['corporate_type'], cover['exp_type'], cover['hashtag']) == \
        ('서비스업', '대기업', '신입', ['성실'])
    stale = client.post(f"/api/v1/job-resumes/{resume['id']}/ai-draft", headers=headers('chaewon'),
                        json={'expectedVersion': resume['version']})
    assert stale.status_code == 409


def test_ai_prompt_over_limit_is_refused_not_truncated(client, fake):
    resume = create(client)
    response = client.post(f"/api/v1/job-resumes/{resume['id']}/ai-draft", headers=headers('chaewon'), json={
        'expectedVersion': resume['version'], 'prompt': '가' * 3001})
    assert response.status_code == 422
    assert not [c for c in fake.calls if c[1].endswith('/ai')]


def test_save_during_ai_draft_keeps_ours_and_marks_deep_for_resync(client, fake):
    resume = create(client)

    def save_in_another_tab():
        # AI 호출 동안 행 잠금·요청 커넥션을 쥐지 않으므로 다른 저장이 끼어들 수 있다.
        with pool.connection() as conn:
            conn.execute("UPDATE dc.job_resume SET content='다른 창 본문',version=version+1 WHERE id=%s",
                         (resume['id'],))

    fake.on_ai = save_in_another_tab
    response = client.post(f"/api/v1/job-resumes/{resume['id']}/ai-draft", headers=headers('chaewon'),
                           json={'expectedVersion': resume['version']})
    assert response.status_code == 409
    current = client.get('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon')).json()
    assert current['content'] == '다른 창 본문' and not current['deepSynced'], 'AI 결과가 다른 창 저장을 덮었다'


def test_evaluation_is_returned_but_not_stored(client, fake):
    resume = create(client, content='평가할 본문')
    count = 'SELECT count(*) AS n FROM dc.job_resume_event WHERE resume_id=%s'
    with pool.connection() as conn:
        before = conn.execute(count, (resume['id'],)).fetchone()['n']
    response = client.post(f"/api/v1/job-resumes/{resume['id']}/evaluation", headers=headers('chaewon'), json={})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['scores'] == {'consult': 72, 'spellcheck': 95, 'human': 81}
    assert result['items'][0]['advice'][0] == {'quote': '원문 구절', 'tone': 'neg', 'comment': '구체적 수치가 없습니다.'}
    with pool.connection() as conn:
        assert conn.execute(count, (resume['id'],)).fetchone()['n'] == before


def test_home_marks_only_evaluated_resumes_and_shows_their_last_result(client, fake):
    evaluated, fresh = create(client, content='평가한 본문'), create(client, content='아직 평가 안 함')
    client.post(f"/api/v1/job-resumes/{evaluated['id']}/evaluation", headers=headers('chaewon'), json={})
    status = client.get('/api/v1/job-resume-evaluations', headers=headers('chaewon'))
    assert status.status_code == 200, status.text
    assert set(status.json()['items']) == {evaluated['id']}
    calls = len(fake.calls)
    last = client.get(f"/api/v1/job-resumes/{evaluated['id']}/evaluation", headers=headers('chaewon'))
    assert last.status_code == 200, last.text
    assert last.json()['scores'] == {'consult': 72, 'spellcheck': 95, 'human': 81} and last.json()['stale'] is False
    assert not [c for c in fake.calls[calls:] if c[0] == 'POST'], '지난 결과 보기가 새 평가를 실행했다'
    assert client.get(f"/api/v1/job-resumes/{fresh['id']}/evaluation", headers=headers('chaewon')).status_code == 404


def test_last_result_is_marked_stale_after_the_body_changes(client, fake):
    resume = create(client, content='평가한 본문')
    client.post(f"/api/v1/job-resumes/{resume['id']}/evaluation", headers=headers('chaewon'), json={})
    changed = client.patch('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon'),
                           json={'title': 'Deep 연동 자소서', 'categoryCode': 'MOTIVE', 'content': '고친 본문',
                                 'jobType': '경영·사무·금융', 'expectedVersion': resume['version']})
    assert changed.status_code == 200, changed.text
    assert client.get(f"/api/v1/job-resumes/{resume['id']}/evaluation", headers=headers('chaewon')).json()['stale'] is True


def test_others_and_staff_cannot_use_deep_actions(client, fake):
    resume = create(client)
    assert client.post(f"/api/v1/job-resumes/{resume['id']}/evaluation", headers=headers('changwon'),
                       json={}).status_code == 404
    assert client.post(f"/api/v1/job-resumes/{resume['id']}/evaluation", headers=headers('career_kim'),
                       json={}).status_code == 403
    assert client.get(f"/api/v1/job-resumes/{resume['id']}/evaluation", headers=headers('changwon')).status_code == 404
    assert client.get('/api/v1/job-resume-evaluations', headers=headers('career_kim')).status_code == 403


def test_ai_actions_need_configuration(client, monkeypatch):
    monkeypatch.setattr(settings, 'deep_key_file', None)
    resume = create(client)
    assert resume['deepSync'] == {'status': 'DISABLED'}
    assert client.post(f"/api/v1/job-resumes/{resume['id']}/ai-draft", headers=headers('chaewon'),
                       json={'expectedVersion': resume['version']}).status_code == 503


def test_delete_also_removes_the_deep_copy(client, fake):
    resume = create(client)
    result = client.delete('/api/v1/job-resumes/' + resume['id'], headers=headers('chaewon')).json()
    assert result['deleted'] and result['deepSync'] == {'status': 'SYNCED'} and not fake.covers
