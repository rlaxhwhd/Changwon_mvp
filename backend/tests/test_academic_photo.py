"""0025 — 학사 증명사진 프록시. work-order rev3 §2-7 테스트 1~12(각 테스트 위 「§2-7-n」).

상류(학사 사진 서버)는 httpx.MockTransport 로 대신하고 호출 수를 센다 — 실제 네트워크에 나가지 않는다
(기본 base 도 http://photo.invalid/ 로 덮는다). 모든 픽스처는 롤백 전용 트랜잭션(db) 안의 합성값이다.
사진 라우트는 pool.connection() 을 직접 쓰므로 그 블록을 같은 트랜잭션(db)으로 돌린다.
API 호출은 `SET LOCAL ROLE dc_app` 뒤에 돈다(GRANT 누락을 잡기 위해).
"""
import logging
from contextlib import contextmanager
from uuid import uuid4

import httpx
import pytest
from pydantic import ValidationError

from app import academic_photo, academic_students, growth, jobs
from app.auth import pooled_principal
from app.db import connection, pool
from app.settings import Settings, settings
from app.xlsx_export import read_workbook
from test_api import headers
from test_psych_referrals import db  # noqa: F401
from academic_test_support import add_academic_dept, add_academic_user, update_academic_user

BASE = 'http://photo.invalid/'
JPEG = b'\xff\xd8\xff\xe0' + b'\x00' * 32
PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 32
MIB = 1024 * 1024
DETAIL_COLUMNS = ['intg_uid', 'sex_code', 'academic_gpa', 'out_dt', 'foreigner_code', 'mobile', 'email',
                  'grad_exp_ym', 'isu_grade', 'curri_year', 'post_code', 'address',
                  'admission_date', 'completed_semesters', 'birth_date', 'home_phone']
ACADEMIC_KEYS_0024 = {'mobile', 'email', 'postCode', 'address', 'homePhone', 'birthDate', 'admissionDate',
                      'completedSemesters', 'graduationExpectedMonth', 'majors'}
NOT_FOUND_ACADEMIC = '학사 학생정보가 없습니다.'
NO_PHOTO = '사진이 없습니다.'
UNAVAILABLE = '학사 사진 서버에서 사진을 받지 못했습니다.'


class Upstream:
    """사진 서버 대역. reply 를 바꿔 상태를 고르고, calls 로 요청 수를 센다."""

    def __init__(self):
        self.calls = []
        self.reply = lambda request: httpx.Response(200, content=JPEG)

    def handle(self, request):
        self.calls.append(str(request.url))
        return self.reply(request)


class Chunks(httpx.SyncByteStream):
    """길이 헤더 없이 조각으로 흘려 보내는 본문. read 는 실제로 읽힌 조각 수."""

    def __init__(self, chunks):
        self.chunks, self.read = chunks, 0

    def __iter__(self):
        for chunk in self.chunks:
            self.read += 1
            yield chunk


@pytest.fixture(autouse=True)
def upstream(monkeypatch):
    monkeypatch.setattr(settings, 'academic_photo_base_url', BASE)
    fake = Upstream()
    original = academic_photo.client
    # 운영 client() 설정(리다이렉트 미추적·trust_env 끔·타임아웃)은 그대로 두고 전송층만 바꾼다.
    monkeypatch.setattr(academic_photo, 'client', lambda: original(transport=httpx.MockTransport(fake.handle)))
    return fake


@pytest.fixture
def w(db, monkeypatch):
    @contextmanager
    def same_connection():
        yield db
    monkeypatch.setattr(pool, 'connection', same_connection)
    x = uuid4().hex[:6]
    k = dict(x=x, college='R' + x[0], dept='F' + x + '1', s='aph-' + x, alias='aph-alias-' + x,
             snone='apn-' + x, sbad='apb-' + x, slocal='apl-' + x, ssrc='aps-' + x,
             prof='fp-' + x, prof2='fo-' + x, nomenu='fn-' + x, missing='apm-' + x)
    k.update(photo=k['s'] + '_1.jpg', local_photo=k['slocal'] + '_1.jpg', src_photo=k['ssrc'] + '_1.jpg')
    c, d = k['college'], k['dept']
    db.execute("INSERT INTO dc.department VALUES(%s,%s,%s,%s,'test')", (c, d, 'Photo College ' + x, 'Photo Dept ' + x))
    add_academic_dept(db, c, 'Photo College ' + x, d, 'Photo Dept ' + x)
    base = dict(usr_nm='Photo Test', hofc_sta_cd='0001', univ_cd='00', stu_schgr='3', daehak_cd=c, hakbu_cd=d)
    add_academic_user(db, k['s'], photo=k['photo'], **base)
    add_academic_user(db, k['snone'], **base)
    add_academic_user(db, k['sbad'], photo='a.gif', **base)
    # §2-7-12 — local 원천은 정규식을 통과하는 값이어도 뷰가 내지 않는다. 같은 형태의 source 학생이 대조군.
    add_academic_user(db, k['slocal'], local=True, photo=k['local_photo'], **base)
    add_academic_user(db, k['ssrc'], photo=k['src_photo'], **base)
    for uid in (k['s'], k['snone'], k['sbad'], k['slocal'], k['ssrc']):
        alias = k['alias'] if uid == k['s'] else uid
        db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Photo Test','STUDENT','fixture')",
                   (uid, alias))
        db.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code,grade)
          VALUES(%s,%s,'Photo Major',%s,%s,3)''', (uid, uid, c, d))
    for uid in (k['prof'], k['prof2']):
        db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source,profile) VALUES(%s,%s,'Photo Staff','STAFF','local','{\"role\":\"professor\"}')",
                   (uid, uid))
        db.execute("INSERT INTO dc.staff(intg_uid,role_code,profile) VALUES(%s,'professor','{}')", (uid,))
    db.execute("INSERT INTO dc.org_assignment(staff_uid,college_code,dept_code,role_code,valid_from) VALUES(%s,%s,%s,'professor',CURRENT_DATE - 1)",
               (k['prof'], c, d))
    # 메뉴도 역할도 없는 교직원 — 학생 상세 메뉴·학사 목록 메뉴 둘 다 없다.
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source,profile) VALUES(%s,%s,'Photo Nomenu','STAFF','local','{\"role\":\"nomenu\"}')",
               (k['nomenu'], k['nomenu']))
    db.execute('SET LOCAL ROLE dc_app')
    return k


def get(client, path, who):
    response = client.get('/api/v1' + path, headers=headers(who))
    assert response.status_code == 200, response.text
    return response.json()


def own_academic(client, uid, path='growth/profile'):
    body = get(client, f'/students/{uid}/{path}', uid)
    return (body['profile'] if 'profile' in body else body)['academic']


def student_photo(uid):
    return f'/api/v1/students/{uid}/academic-photo'


def staff_photo(uid):
    return f'/api/v1/academic-students/{uid}/photo'


def secrets_absent(text, w):
    """파일명·내부 키·뷰 열 이름·상류 주소가 응답에 없다."""
    for value in (w['photo'], w['local_photo'], w['src_photo'], 'hasPhoto', 'photo_file', 'photo.invalid', 'chains'):
        assert value not in text, value


def assert_photo(response, body=JPEG, media='image/jpeg'):
    assert response.status_code == 200, response.text
    assert response.content == body
    assert response.headers['content-type'] == media
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert response.headers['cache-control'] == 'private, no-store'
    assert 'set-cookie' not in response.headers


# §2-7-1
def test_view_adds_photo_file_last_and_app_role_reads_it(db, w):
    columns = [r['column_name'] for r in db.execute('''SELECT column_name FROM information_schema.columns
      WHERE table_schema='dc' AND table_name='academic_student_details' ORDER BY ordinal_position''').fetchall()]
    assert columns == DETAIL_COLUMNS + ['photo_file']
    row = db.execute('SELECT photo_file FROM dc.academic_student_details WHERE intg_uid=%s', (w['s'],)).fetchone()
    assert row['photo_file'] == w['photo']


# §2-7-2
def test_owner_gets_photo_url_and_photo_others_are_denied_without_upstream(client, w, upstream):
    for path in ('growth/profile', 'portfolio'):
        response = client.get(f"/api/v1/students/{w['s']}/{path}", headers=headers(w['s']))
        assert response.status_code == 200, response.text
        body = response.json()
        academic = (body['profile'] if 'profile' in body else body)['academic']
        assert set(academic) == ACADEMIC_KEYS_0024 | {'photoUrl'} and len(academic) == 11
        assert academic['photoUrl'] == student_photo(w['s'])
        secrets_absent(response.text, w)
    # 다른 학생 404 · 범위 안 교직원 403(본인 전용) · 메뉴 없는 교직원 403 — 상류 0회.
    other = client.get(student_photo(w['s']), headers=headers(w['snone']))
    assert other.status_code == 404, other.text
    for who in ('career_kim', 'psych_lee', w['nomenu']):
        denied = client.get(student_photo(w['s']), headers=headers(who))
        assert denied.status_code == 403, (who, denied.text)
        secrets_absent(denied.text, w)
    assert upstream.calls == []
    # 본인은 받는다 — 상류 요청은 설정 base + 파일명 하나.
    assert_photo(client.get(own_academic(client, w['s'])['photoUrl'], headers=headers(w['s'])))
    assert upstream.calls == [BASE + w['photo']]


# §2-7-3
def test_staff_detail_photo_in_scope_and_out_of_scope_body_matches_missing_row(client, w, upstream):
    for who in ('career_kim', w['prof']):
        detail = get(client, f"/academic-students/{w['s']}", who)
        assert detail['photoUrl'] == staff_photo(w['s']) and detail['id'] == w['s']
        assert get(client, f"/academic-students/{w['snone']}", who)['photoUrl'] is None
        # alias 로 연 상세도 해석된 intg_uid 경로를 낸다.
        assert get(client, f"/academic-students/{w['alias']}", who)['photoUrl'] == staff_photo(w['s'])
    assert upstream.calls == []
    missing = client.get(staff_photo(w['missing']), headers=headers('career_kim'))
    assert missing.status_code == 404 and missing.json() == {'detail': NOT_FOUND_ACADEMIC}
    reference = client.get(staff_photo(w['missing']), headers=headers(w['prof2']))
    assert reference.status_code == 404
    for target in (w['s'], w['alias'], w['snone']):
        hidden = client.get(staff_photo(target), headers=headers(w['prof2']))
        assert hidden.status_code == 404 and hidden.content == reference.content == missing.content, target
    assert client.get(staff_photo(w['s']), headers=headers(w['nomenu'])).status_code == 403
    assert client.get(staff_photo(w['s']), headers=headers(w['s'])).status_code == 403
    assert upstream.calls == []
    # 범위 통과자: 사진 없는 학생은 「사진 없음」, 있으면 200 — alias 경로도 같다.
    none = client.get(staff_photo(w['snone']), headers=headers(w['prof']))
    assert none.status_code == 404 and none.json() == {'detail': NO_PHOTO}
    assert upstream.calls == []
    assert_photo(client.get(staff_photo(w['s']), headers=headers('career_kim')))
    assert_photo(client.get(staff_photo(w['alias']), headers=headers(w['prof'])))
    assert upstream.calls == [BASE + w['photo']] * 2


# §2-7-4
@pytest.mark.parametrize('value', ['../x.jpg', 'a/b.jpg', 'a.gif', 'a b.jpg', '%2e%2e.jpg', 'x.jpg?y=1'])
def test_bad_file_names_get_no_url_and_no_upstream(client, db, w, upstream, value):
    db.execute('RESET ROLE')
    update_academic_user(db, w['sbad'], photo=value)
    db.execute('SET LOCAL ROLE dc_app')
    assert own_academic(client, w['sbad'])['photoUrl'] is None
    assert get(client, f"/academic-students/{w['sbad']}", 'career_kim')['photoUrl'] is None
    for path, who in ((student_photo(w['sbad']), w['sbad']), (staff_photo(w['sbad']), 'career_kim')):
        response = client.get(path, headers=headers(who))
        assert response.status_code == 404 and response.json() == {'detail': NO_PHOTO}
    assert upstream.calls == []


def test_photo_name_is_the_single_format_gate():
    # 원천 열(varchar 60)에 들어가지 않는 길이는 함수에서만 확인한다.
    assert academic_photo.photo_name('a' * 100 + '.jpg') == 'a' * 100 + '.jpg'
    for value in ('a' * 101 + '.jpg', '../x.jpg', 'a/b.jpg', 'a.gif', 'a b.jpg', '.jpg', 'a.jpg\n', None, 7):
        assert academic_photo.photo_name(value) is None, value
    for value in ('20240001_1.jpg', 'A-b_C.JPEG', 'x.png'):
        assert academic_photo.photo_name(value) == value


# §2-7-5
@pytest.mark.parametrize('status,expected', [(404, 404), (410, 404), (403, 502), (500, 502), (302, 502)])
def test_upstream_status_mapping(client, w, upstream, status, expected):
    upstream.reply = lambda request: httpx.Response(status, headers={'Location': BASE + 'elsewhere.jpg'}, content=b'x')
    response = client.get(staff_photo(w['s']), headers=headers('career_kim'))
    assert response.status_code == expected, response.text
    assert response.json() == {'detail': NO_PHOTO if expected == 404 else UNAVAILABLE}
    # 리다이렉트를 따라가지 않는다 — 두 번째 요청 0회.
    assert upstream.calls == [BASE + w['photo']]
    secrets_absent(response.text, w)


@pytest.mark.parametrize('error', [httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout])
def test_upstream_connection_failures_are_502(client, w, upstream, error, caplog):
    def fail(request):
        raise error('upstream ' + str(request.url), request=request)
    upstream.reply = fail
    with caplog.at_level(logging.WARNING, logger='app.academic_photo'):
        response = client.get(student_photo(w['s']), headers=headers(w['s']))
    assert response.status_code == 502 and response.json() == {'detail': UNAVAILABLE}
    secrets_absent(response.text, w)
    # 로그는 예외 클래스명만 — 파일명·URL 없음.
    assert error.__name__ in caplog.text and w['photo'] not in caplog.text and 'photo.invalid' not in caplog.text


@pytest.mark.parametrize('content', [b'<html>not found</html>', b'', b'GIF89a' + b'\x00' * 10])
def test_non_image_or_empty_body_is_502(client, w, upstream, content):
    upstream.reply = lambda request: httpx.Response(200, content=content, headers={'Content-Type': 'image/jpeg'})
    response = client.get(student_photo(w['s']), headers=headers(w['s']))
    assert response.status_code == 502 and response.json() == {'detail': UNAVAILABLE}
    assert b'not found' not in response.content and b'GIF' not in response.content   # 상류 본문을 싣지 않는다


def test_declared_length_over_limit_is_not_read(client, w, upstream):
    stream = Chunks([JPEG, b'\x00' * MIB])
    upstream.reply = lambda request: httpx.Response(200, headers={'Content-Length': str(2 * MIB + 1)}, stream=stream)
    response = client.get(student_photo(w['s']), headers=headers(w['s']))
    assert response.status_code == 502 and stream.read == 0


def test_streamed_body_over_limit_stops_reading(client, w, upstream):
    stream = Chunks([JPEG + b'\x00' * (MIB - len(JPEG)), b'\x00' * MIB, b'\x00', b'\x00' * MIB, b'\x00' * MIB])
    upstream.reply = lambda request: httpx.Response(200, stream=stream)
    response = client.get(student_photo(w['s']), headers=headers(w['s']))
    assert response.status_code == 502 and stream.read == 3


def test_total_deadline_stops_slow_stream(client, w, upstream, monkeypatch):
    ticks = iter([0, 1, academic_photo.DEADLINE_SECONDS + 1, 100, 100])
    monkeypatch.setattr(academic_photo, 'clock', lambda: next(ticks))
    stream = Chunks([JPEG, b'\x00' * 10, b'\x00' * 10, b'\x00' * 10])
    upstream.reply = lambda request: httpx.Response(200, stream=stream)
    response = client.get(student_photo(w['s']), headers=headers(w['s']))
    assert response.status_code == 502 and stream.read == 2


# §2-7-6
def test_success_headers_and_media_type_follow_magic_bytes(client, w, upstream):
    upstream.reply = lambda request: httpx.Response(200, content=PNG, headers={
        'Content-Type': 'image/jpeg', 'Set-Cookie': 'chains=1', 'Server': 'upstream'})
    response = client.get(student_photo(w['s']), headers=headers(w['s']))
    assert_photo(response, PNG, 'image/png')   # 파일명은 .jpg 지만 바이트는 PNG
    assert response.headers.get('server') != 'upstream'


# §2-7-7
def test_empty_base_turns_feature_off(client, w, upstream, monkeypatch):
    monkeypatch.setattr(settings, 'academic_photo_base_url', '')
    assert own_academic(client, w['s'])['photoUrl'] is None
    assert get(client, f"/academic-students/{w['s']}", 'career_kim')['photoUrl'] is None
    for path, who in ((student_photo(w['s']), w['s']), (staff_photo(w['s']), 'career_kim')):
        response = client.get(path, headers=headers(who))
        assert response.status_code == 404 and response.json() == {'detail': NO_PHOTO}
    assert upstream.calls == []


@pytest.mark.parametrize('value', ['ftp://photo.invalid/', 'http://photo.invalid', 'photo.invalid/',
                                   'http://photo.invalid/?x=', 'http://photo.invalid/#a/'])
def test_bad_base_fails_settings_validation(value):
    with pytest.raises(ValidationError):
        Settings(academic_photo_base_url=value)
    assert Settings(academic_photo_base_url='').academic_photo_base_url == ''
    assert Settings(academic_photo_base_url='https://photo.invalid/a/').academic_photo_base_url == 'https://photo.invalid/a/'


# §2-7-8
def test_concurrency_cap_returns_503_without_upstream(client, w, upstream):
    taken = 0
    try:
        while academic_photo._slots.acquire(blocking=False):
            taken += 1
        assert taken == 8
        response = client.get(student_photo(w['s']), headers=headers(w['s']))
        assert response.status_code == 503 and response.json() == {'detail': '사진을 잠시 후 다시 불러와 주세요.'}
    finally:
        for _ in range(taken):
            academic_photo._slots.release()
    assert upstream.calls == []
    # 슬롯이 반납되면 다시 받는다(실패 경로도 finally 에서 반납한다).
    assert_photo(client.get(student_photo(w['s']), headers=headers(w['s'])))


# §2-7-9
def test_photo_routes_hold_no_request_connection():
    def calls(dependant):
        yield dependant.call
        for sub in dependant.dependencies:
            yield from calls(sub)
    for module, path in ((growth, '/students/{identity}/academic-photo'),
                         (academic_students, '/academic-students/{identity}/photo')):
        route = next(r for r in module.router.routes if getattr(r, 'path', None) == path)
        tree = list(calls(route.dependant))
        assert connection not in tree and pooled_principal in tree, path
    # jobs 는 같은 함수를 별칭으로 쓴다 — 두 벌이 아니다.
    assert jobs.deep_principal is pooled_principal


# §2-7-10 · §2-7-11
def test_lists_exports_staff_profiles_and_patch_carry_no_photo(client, db, w):
    listing = client.get(f"/api/v1/academic-students?q={w['x']}&pageSize=50", headers=headers('career_kim'))
    assert listing.status_code == 200 and {r['id'] for r in listing.json()['items']} >= {w['s'], w['snone']}
    for item in listing.json()['items']:
        assert 'photoUrl' not in item
    secrets_absent(listing.text, w)
    exported = client.post('/api/v1/academic-students/export', headers=headers('career_kim'), json={'ids': [w['s']]})
    assert exported.status_code == 200, exported.text
    rows, _ = read_workbook(exported.content)
    assert len(rows[0]) == 13 and len(rows) == 2 and w['photo'] not in str(rows)
    for who in ('career_kim', 'psych_lee'):
        for path in (f"/students/{w['s']}/growth/profile", f"/students/{w['s']}/portfolio"):
            response = client.get('/api/v1' + path, headers=headers(who))
            assert response.status_code == 200, response.text
            assert 'photoUrl' not in response.text
            secrets_absent(response.text, w)
    key = 'aphoto-' + w['x']
    payload = {'expectedVersion': 0, 'intro': 'Synthetic intro 0025', 'email': None, 'phone': None}
    for _ in range(2):   # 처음 + 재생
        response = client.patch(f"/api/v1/students/{w['s']}/growth/profile",
                                headers={**headers(w['s']), 'Idempotency-Key': key}, json=payload)
        assert response.status_code == 200 and response.json()['academic'] is None
        assert 'photoUrl' not in response.text
        secrets_absent(response.text, w)
    stored = db.execute('SELECT response::text AS r FROM dc.idempotency WHERE actor_uid=%s AND key=%s',
                        (w['s'], key)).fetchone()['r']
    assert 'photoUrl' not in stored
    secrets_absent(stored, w)


def test_service_only_student_detail_and_photo(client, db, w):
    # 학사 행이 없는 서비스 학생 — optional 상세는 기존대로 null, 사진은 학사 행 없음 404.
    uid = 'apx-' + w['x']
    db.execute('RESET ROLE')
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Photo Test','STUDENT','fixture')", (uid, uid))
    db.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code,grade)
      VALUES(%s,%s,'Photo Major',%s,%s,3)''', (uid, uid, w['college'], w['dept']))
    db.execute('SET LOCAL ROLE dc_app')
    optional = client.get(f'/api/v1/academic-students/{uid}', headers=headers('career_kim'), params={'optional': True})
    assert optional.status_code == 200 and optional.json() is None
    assert own_academic(client, uid) is None
    response = client.get(staff_photo(uid), headers=headers('career_kim'))
    assert response.status_code == 404 and response.json() == {'detail': NOT_FOUND_ACADEMIC}
    own = client.get(student_photo(uid), headers=headers(uid))
    assert own.status_code == 404 and own.json() == {'detail': NO_PHOTO}


# §2-7-12
def test_local_origin_photo_is_hidden_and_source_control_is_shown(client, db, w, upstream):
    rows = {r['intg_uid']: r['photo_file'] for r in db.execute(
        'SELECT intg_uid,photo_file FROM dc.academic_student_details WHERE intg_uid = ANY(%s)',
        ([w['slocal'], w['ssrc']],)).fetchall()}
    assert rows == {w['slocal']: None, w['ssrc']: w['src_photo']}
    assert own_academic(client, w['slocal'])['photoUrl'] is None
    assert own_academic(client, w['ssrc'])['photoUrl'] == student_photo(w['ssrc'])
    for who in ('career_kim', w['prof']):
        assert get(client, f"/academic-students/{w['slocal']}", who)['photoUrl'] is None
        assert get(client, f"/academic-students/{w['ssrc']}", who)['photoUrl'] == staff_photo(w['ssrc'])
        response = client.get(staff_photo(w['slocal']), headers=headers(who))
        assert response.status_code == 404 and response.json() == {'detail': NO_PHOTO}
    own = client.get(student_photo(w['slocal']), headers=headers(w['slocal']))
    assert own.status_code == 404 and own.json() == {'detail': NO_PHOTO}
    assert upstream.calls == []
