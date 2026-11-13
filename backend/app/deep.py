"""Server-only adapter for the DeepResume external API (docs/Deep_API_v7.xlsx, 2026-11-11).

The service key and Deep bearer tokens never reach the browser. Provider bodies are
never logged or echoed; only safe messages cross the application boundary.
Members are identified by (service, school code, student number) — 2026-11-13 user decision:
an existing DeepResume member with the same school+student number is refused, not linked.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import threading
import time

import httpx

from .db import pool
from .settings import settings

ACCOUNT_EXISTS = '이미 DeepResume에 가입된 회원입니다. 기존 계정은 드림캐치와 연결되지 않습니다.'
UNAVAILABLE = 'DeepResume 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
STUDENT_NO = re.compile(r'[A-Za-z0-9_.\-]{1,100}')
MAX_BODY = 5_000_000


class DeepError(Exception):
    """Safe status/message pair for the application boundary."""

    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def enabled():
    return bool(settings.deep_key_file)


def service_key():
    try:
        key = Path(settings.deep_key_file or '').read_text().strip()
    except OSError:
        key = ''
    if not key:
        raise DeepError(503, 'DeepResume 연동 설정을 확인해 주세요.')
    return key


def client(timeout=20):
    return httpx.Client(base_url=settings.deep_api_url.rstrip('/') + '/external/v1/',
                        timeout=httpx.Timeout(timeout, connect=5), follow_redirects=False, trust_env=False)


def body(response):
    if len(response.content) > MAX_BODY:
        raise DeepError(502, 'DeepResume 응답 크기가 허용 범위를 초과했습니다.')
    try:
        return response.json()
    except ValueError:
        return None


def error_code(response):
    data = body(response)
    if isinstance(data, dict):
        for key in ('code', 'error', 'detail'):
            if isinstance(data.get(key), str):
                return data[key]
    return ''


def failure(response, messages=None):
    """Map a provider status to a safe error. `messages` overrides per status or code."""
    messages = messages or {}
    code = error_code(response)
    if code in messages:
        return DeepError(*messages[code])
    if response.status_code in messages:
        return DeepError(*messages[response.status_code])
    if response.status_code == 429:
        return DeepError(429, 'AI 요청이 많습니다. 잠시 후 다시 시도해 주세요.')
    if response.status_code in (401, 403) or code == 'unknown_school_code':
        return DeepError(503, 'DeepResume 연동 설정을 확인해 주세요.')
    return DeepError(502, UNAVAILABLE)


def send(session, method, path, **kwargs):
    try:
        return session.request(method, path, **kwargs)
    except httpx.HTTPError:
        raise DeepError(502, UNAVAILABLE) from None


# ── 회원 · 토큰 ──────────────────────────────────────────────────────────

_tokens = {}           # student_uid -> (access_token, monotonic expiry)
_user_locks = {}
_locks_guard = threading.Lock()


def _user_lock(uid):
    with _locks_guard:
        return _user_locks.setdefault(uid, threading.Lock())


def forget(uid):
    _tokens.pop(uid, None)


def identity(conn, user):
    row = conn.execute('''SELECT s.student_no,s.major_label,p.name FROM dc.student s
      JOIN dc.person p USING(intg_uid) WHERE s.intg_uid=%s''', (user['intg_uid'],)).fetchone()
    number = (row or {}).get('student_no') or ''
    if user['kind'] != 'STUDENT' or not STUDENT_NO.fullmatch(number):
        raise DeepError(403, '학번이 확인되는 학생만 DeepResume을 이용할 수 있습니다.')
    name = (row['name'] or '').strip()
    if not name or len(name) > 25:
        raise DeepError(422, 'DeepResume 가입에 쓸 이름(25자 이내)을 확인할 수 없습니다.')
    payload = {'university_num': number, 'school_code': settings.deep_school_code.lower(), 'name': name}
    department = (row['major_label'] or '').strip()
    if department and department != '소속 미등록' and len(department) <= 100:
        payload['department'] = department
    return payload


def _login(payload):
    headers = {'X-Service-Key': service_key()}
    with client() as session:
        response = send(session, 'POST', 'auth/login', json=payload, headers=headers)
        if response.status_code == 404:
            # 자동 가입하지 않는 API다 — 미가입(404 not_registered)일 때만 가입한다.
            response = send(session, 'POST', 'auth/signup', json=payload, headers=headers)
            if response.status_code == 409:
                # already_registered(동시 가입)면 로그인이 된다. account_exists(기존 회원)는 거부한다.
                response = send(session, 'POST', 'auth/login', json=payload, headers=headers)
                if response.status_code == 404:
                    raise DeepError(409, ACCOUNT_EXISTS)
    if response.status_code not in (200, 201):
        raise failure(response)
    data = body(response)
    token = data.get('access_token') if isinstance(data, dict) else None
    if not isinstance(token, str) or not token:
        raise DeepError(502, 'DeepResume 로그인 응답을 확인할 수 없습니다.')
    lifetime = data.get('expires_in')
    lifetime = lifetime if type(lifetime) is int and lifetime > 0 else 3600
    return token, time.monotonic() + max(lifetime - 120, 30)


def token_for(user, refresh=False):
    uid = user['intg_uid']
    cached = _tokens.get(uid)
    if cached and not refresh and cached[1] > time.monotonic():
        return cached[0]
    # 캐시가 없을 때만 짧게 커넥션을 빌린다 — Deep HTTP 동안 풀 커넥션을 쥐지 않는다.
    with pool.connection() as conn:
        payload = identity(conn, user)
    with _user_lock(uid):
        cached = _tokens.get(uid)
        if cached and not refresh and cached[1] > time.monotonic():
            return cached[0]
        _tokens[uid] = _login(payload)
        return _tokens[uid][0]


def call(user, method, path, json=None, timeout=20):
    """Authenticated request. A revoked or expired token is renewed once."""
    for attempt in (0, 1):
        token = token_for(user, refresh=attempt == 1)
        with client(timeout) as session:
            response = send(session, method, path, json=json, headers={'Authorization': 'Bearer ' + token})
        if response.status_code != 401:
            return response
        forget(user['intg_uid'])
    raise DeepError(503, 'DeepResume 로그인을 확인할 수 없습니다.')


# ── 자소서 ───────────────────────────────────────────────────────────────

def _within(value, limit, label):
    if value and len(value) > limit:
        raise DeepError(422, f'{label}은(는) {limit}자 이내여야 DeepResume에 저장됩니다.')
    return value


def cover_fields(row, extras=None):
    """우리 자소서 → Deep cover 필드. 길이 초과는 자르지 않고 거부한다."""
    fields = {'title': _within(row['title'], 500, '자소서 제목'), 'status': '저장'}
    if row['job_type_text']:
        fields['job_type'] = _within(row['job_type_text'], 15, '직종')
    if row['company_text']:
        fields['company'] = _within(row['company_text'], 100, '기업명')
    if row['position_text']:
        fields['supportArea'] = _within(row['position_text'], 100, '지원 직무')
    for key, field, label in (('industry', 'industry_type', '업종'), ('companyType', 'corporate_type', '기업형태'),
                              ('experience', 'exp_type', '경력')):
        if (extras or {}).get(key):
            fields[field] = _within(extras[key], 15, label)
    if (extras or {}).get('keywords') is not None:
        fields['hashtag'] = list(extras['keywords'])
    return fields


def topic_fields(row):
    question = row.get('category_label') or row.get('category_label_legacy') or ''
    if not question:
        raise DeepError(422, '자소서 항목 카테고리를 선택해야 DeepResume에 저장됩니다.')
    # 기존 Deep 평가 로직은 title 을 질문으로 쓴다 — type·title 모두 질문 문장으로 보낸다.
    return {'type': question, 'title': question, 'body': row['content']}


def _topic_id(data, question):
    topics = data.get('topic') if isinstance(data, dict) else None
    if not isinstance(topics, list):
        return None
    same = [t for t in topics if isinstance(t, dict) and t.get('type') == question and t.get('id')]
    pick = same or [t for t in topics if isinstance(t, dict) and t.get('id')]
    return str(pick[0]['id']) if pick else None


def push_cover(user, row, extras=None):
    """Create or update the linked Deep cover. Returns (cover_id, topic_id)."""
    fields = cover_fields(row, extras)
    topic = topic_fields(row)
    if row['deep_cover_id']:
        patch = {**fields, 'topic': [{**topic, **({'id': str(row['deep_topic_id'])} if row['deep_topic_id'] else {})}]}
        response = call(user, 'PATCH', f"covers/{row['deep_cover_id']}", json=patch)
        if response.status_code == 200:
            return str(row['deep_cover_id']), _topic_id(body(response), topic['type']) or row['deep_topic_id']
        if response.status_code != 404:
            raise failure(response, {400: (422, 'DeepResume가 자소서 형식을 거부했습니다. 입력값을 확인해 주세요.')})
        # Deep 웹에서 지운 자소서 — 새로 만들어 다시 연결한다.
    if 'job_type' not in fields:
        raise DeepError(422, '직종을 선택해야 DeepResume에 저장할 수 있습니다.')
    response = call(user, 'POST', 'covers', json={**fields, 'topic': [topic]})
    if response.status_code != 201:
        raise failure(response, {400: (422, 'DeepResume가 자소서 형식을 거부했습니다. 입력값을 확인해 주세요.')})
    data = body(response)
    cover_id = data.get('id') if isinstance(data, dict) else None
    if not cover_id:
        raise DeepError(502, 'DeepResume 자소서 응답을 확인할 수 없습니다.')
    return str(cover_id), _topic_id(data, topic['type'])


def delete_cover(user, cover_id):
    response = call(user, 'DELETE', f'covers/{cover_id}')
    if response.status_code not in (204, 404):
        raise failure(response, {400: (409, 'DeepResume에서 진행 중인 컨설팅이 있어 지우지 못했습니다.')})


def write_ai(user, row, company, field):
    payload = {'question': topic_fields(row)['type'], 'save': True, 'mode': 'append', 'text': row['content']}
    if row['deep_topic_id']:
        payload['topic_id'] = str(row['deep_topic_id'])
    if company:
        payload['company'] = company
    if field:
        payload['field'] = field
    response = call(user, 'POST', f"covers/{row['deep_cover_id']}/ai", json=payload, timeout=60)
    if response.status_code != 201:
        raise failure(response, {503: (502, 'AI 작성에 실패했습니다. 잠시 후 다시 시도해 주세요.')})
    data = body(response)
    generated = data.get('generated') if isinstance(data, dict) else None
    if not isinstance(generated, str) or not generated.strip():
        raise DeepError(502, 'AI가 빈 결과를 돌려주었습니다. 다시 시도해 주세요.')
    topic = data.get('topic') if isinstance(data.get('topic'), dict) else {}
    return generated, topic


# ── AI 평가(우리 DB에 저장하지 않는다) ───────────────────────────────────

class _Advice(HTMLParser):
    """`<para>원문 구절<span tag="pos|neg">코멘트</span></para>` → 구절·코멘트 목록. HTML 로 렌더하지 않는다."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items, self.quote, self.span = [], '', None

    def handle_starttag(self, tag, attrs):
        if tag == 'para':
            self.quote = ''
        elif tag == 'span':
            tone = dict(attrs).get('tag')
            self.span = {'quote': self.quote.strip(), 'tone': tone if tone in ('pos', 'neg') else 'note', 'comment': ''}

    def handle_endtag(self, tag):
        if tag == 'span' and self.span is not None:
            self.span['comment'] = self.span['comment'].strip()
            if self.span['comment']:
                self.items.append(self.span)
            self.span, self.quote = None, ''

    def handle_data(self, data):
        if self.span is not None:
            self.span['comment'] += data
        else:
            self.quote += data


def parse_advice(text):
    if not isinstance(text, str):
        return []
    parser = _Advice()
    parser.feed(text)
    parser.close()
    rest = parser.quote.strip()
    if not parser.items and rest:
        return [{'quote': '', 'tone': 'note', 'comment': rest}]
    return parser.items


def _score(value):
    return value if type(value) in (int, float) else None


def evaluate(user, cover_id, force=False):
    response = call(user, 'POST', f'covers/{cover_id}/evaluations', json={'force': bool(force)}, timeout=150)
    if response.status_code not in (200, 201):
        raise failure(response, {
            'no_topics': (422, '평가할 본문이 없습니다. 자소서를 작성한 뒤 다시 시도해 주세요.'),
            'empty_topic': (422, '본문이 비어 있으면 평가할 수 없습니다.'),
            'too_many_topics': (422, '문항이 너무 많아 평가할 수 없습니다.'),
            'evaluation_in_progress': (409, '이 자소서를 평가하는 중입니다. 잠시 후 다시 시도해 주세요.'),
            429: (429, 'AI 평가는 시간당 10회까지 이용할 수 있습니다. 잠시 후 다시 시도해 주세요.'),
            503: (502, 'AI 평가에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
            404: (404, 'DeepResume에서 자소서를 찾지 못했습니다. 다시 저장한 뒤 시도해 주세요.'),
        })
    data = body(response)
    if not isinstance(data, dict) or not isinstance(data.get('consult'), dict):
        raise DeepError(502, 'AI 평가 응답을 확인할 수 없습니다.')
    consult = data['consult']
    contents = data.get('contents') if isinstance(data.get('contents'), list) else []
    return {
        'evaluationId': data.get('evaluation_id'), 'cached': data.get('cached') is True,
        'createdAt': data.get('created'),
        'scores': {'consult': _score(consult.get('consult_score')),
                   'spellcheck': _score(consult.get('spellcheck_score')),
                   'human': _score(consult.get('detector'))},
        'items': [{'order': c.get('order'), 'paragraph': c.get('paragraph') or '',
                   'advice': parse_advice(c.get('consult_content'))}
                  for c in contents if isinstance(c, dict)],
    }
