"""0027 — 학생이 직접 적은 목표 기업(dc.growth_profile.target_company)과 프로필 PATCH 부분 갱신.

work-order rev2 §5 1~11. 모든 픽스처는 롤백 전용 트랜잭션(db) 안에서 만든다. 학생·기업 값은 합성값이다.
API 호출은 픽스처를 만든 뒤 `SET LOCAL ROLE dc_app` 으로 앱 계정 권한에서 돈다(GRANT 누락을 잡는다).
"""
from uuid import uuid4

import psycopg
import pytest

from app.student_portfolio import empty_document, section_of
from test_api import headers
from test_psych_referrals import db  # noqa: F401

PROFILE = '/api/v1/students/{}/growth/profile'


@pytest.fixture
def w(db):
    x = uuid4().hex[:6]
    k = dict(x=x, college='T' + x[0], dept='G' + x + '1', s='gtc-' + x, other='gto-' + x,
             company='Synthetic Company ' + x)
    db.execute("INSERT INTO dc.department VALUES(%s,%s,%s,%s,'test')",
               (k['college'], k['dept'], 'Target College ' + x, 'Target Dept ' + x))
    for uid in (k['s'], k['other']):
        db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Target Test','STUDENT','fixture')",
                   (uid, uid))
        db.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code,grade)
          VALUES(%s,%s,'Target Major',%s,%s,3)''', (uid, uid, k['college'], k['dept']))
    db.execute('SET LOCAL ROLE dc_app')
    return k


def patch(client, identity, body, who=None, key=None):
    return client.patch(PROFILE.format(identity), json=body,
                        headers={**headers(who or identity), 'Idempotency-Key': key or uuid4().hex})


def ok(response):
    assert response.status_code == 200, response.text
    return response.json()


def profile(client, identity, who=None):
    return ok(client.get(PROFILE.format(identity), headers=headers(who or identity)))


def stored(db, uid):
    return db.execute('SELECT intro,contact_email,contact_phone,target_company,version FROM dc.growth_profile '
                      'WHERE student_uid=%s', (uid,)).fetchone()


def seed_profile(client, w):
    """Portfolio 모양(세 키) 최초 쓰기 — 자기소개·연락처가 있는 프로필 version 2."""
    return ok(patch(client, w['s'], {'expectedVersion': 0, 'intro': 'Intro ' + w['x'],
                                     'email': w['x'] + '@example.test', 'phone': '010-0000-' + w['x'][:4]}))


# §5-1
def test_get_carries_target_company_for_owner_and_scoped_staff(client, w):
    mine = profile(client, w['s'])
    assert mine['targetCompany'] is None and mine['version'] == 0   # 미생성 학생
    seeded = seed_profile(client, w)
    saved = ok(patch(client, w['s'], {'expectedVersion': seeded['version'], 'targetCompany': w['company']}))
    assert saved['targetCompany'] == w['company']
    for who in (w['s'], 'career_kim'):
        body = profile(client, w['s'], who)
        assert isinstance(body['targetCompany'], str) and body['targetCompany'] == w['company']
    # 교직원에게도 자기입력 연락처는 여전히 보이지 않는다(D06 불변).
    staff = profile(client, w['s'], 'career_kim')
    assert staff['email'] is None and staff['phone'] is None and staff['capabilities']['canEdit'] is False


# §5-2 · §5-3
def test_partial_patch_keeps_unsent_fields(client, db, w):
    seeded = seed_profile(client, w)
    saved = ok(patch(client, w['s'], {'expectedVersion': seeded['version'], 'targetCompany': w['company']}))
    assert saved['version'] == seeded['version'] + 1
    assert (saved['intro'], saved['email'], saved['phone']) == (seeded['intro'], seeded['email'], seeded['phone'])
    # Portfolio 자기소개 저장 모양(세 키) — 목표 기업은 그대로다.
    again = ok(patch(client, w['s'], {'expectedVersion': saved['version'], 'intro': 'Changed ' + w['x'],
                                      'email': seeded['email'], 'phone': seeded['phone']}))
    assert again['targetCompany'] == w['company'] and again['intro'] == 'Changed ' + w['x']
    row = stored(db, w['s'])
    assert (row['target_company'], row['contact_email'], row['version']) == (w['company'], seeded['email'], again['version'])


# §5-4 · §5-5
def test_null_and_blank_clear_and_shape_rules(client, db, w):
    version = seed_profile(client, w)['version']
    for clear in (None, '', '   '):
        version = ok(patch(client, w['s'], {'expectedVersion': version, 'targetCompany': w['company']}))['version']
        cleared = ok(patch(client, w['s'], {'expectedVersion': version, 'targetCompany': clear}))
        assert cleared['targetCompany'] is None and stored(db, w['s'])['target_company'] is None
        version = cleared['version']
    # 앞뒤 공백은 잘려 저장된다.
    trimmed = ok(patch(client, w['s'], {'expectedVersion': version, 'targetCompany': '  ' + w['company'] + '  '}))
    assert trimmed['targetCompany'] == w['company']
    version = trimmed['version']
    # 201자·중간 제어문자 → 422, version 불변.
    for bad in ('가' * 201, 'A\nB', 'A\tB', 'A\x7fB', 'A\x85B'):
        response = patch(client, w['s'], {'expectedVersion': version, 'targetCompany': bad})
        assert response.status_code == 422, (repr(bad), response.text)
    assert ok(patch(client, w['s'], {'expectedVersion': version, 'targetCompany': '가' * 200}))['targetCompany'] == '가' * 200
    # DB 제약도 같은 규칙을 지킨다(API 를 거치지 않은 쓰기).
    for bad in (' X', 'X ', '', 'A\nB', 'A\x85B', '가' * 201):
        with pytest.raises(psycopg.errors.CheckViolation), db.transaction():
            db.execute('UPDATE dc.growth_profile SET target_company=%s WHERE student_uid=%s', (bad, w['s']))


# §5-6
def test_empty_patch_is_refused_without_bumping_version(client, db, w):
    version = seed_profile(client, w)['version']
    response = patch(client, w['s'], {'expectedVersion': version})
    assert response.status_code == 422 and response.json()['detail']['code'] == 'INVALID_FIELD'
    assert stored(db, w['s'])['version'] == version
    assert db.execute("SELECT count(*) AS n FROM dc.growth_event WHERE student_uid=%s AND action='PROFILE_UPDATE'",
                      (w['s'],)).fetchone()['n'] == 1


# §5-7
def test_owner_only_scope_and_stale_version(client, w):
    version = seed_profile(client, w)['version']
    denied = patch(client, w['s'], {'expectedVersion': version, 'targetCompany': w['company']}, who='career_kim')
    assert denied.status_code == 403
    assert client.get(PROFILE.format(w['s']), headers=headers(w['other'])).status_code == 404
    assert patch(client, w['s'], {'expectedVersion': version, 'targetCompany': w['company']},
                 who=w['other']).status_code == 404
    stale = patch(client, w['s'], {'expectedVersion': version - 1, 'targetCompany': w['company']})
    assert stale.status_code == 409
    assert stale.json()['detail']['code'] == 'VERSION_CONFLICT' and stale.json()['detail']['currentVersion'] == version


# §5-8
def test_profile_update_event_snapshots_all_four_fields(client, db, w):
    seeded = seed_profile(client, w)
    ok(patch(client, w['s'], {'expectedVersion': seeded['version'], 'targetCompany': w['company']}))
    event = db.execute('''SELECT before_value,after_value FROM dc.growth_event
      WHERE student_uid=%s AND action='PROFILE_UPDATE' ORDER BY profile_version_after DESC LIMIT 1''', (w['s'],)).fetchone()
    keys = {'intro', 'email', 'phone', 'targetCompany'}
    assert set(event['before_value']) == keys and set(event['after_value']) == keys
    assert event['before_value']['targetCompany'] is None and event['after_value']['targetCompany'] == w['company']
    assert event['after_value']['intro'] == seeded['intro'] and event['after_value']['email'] == seeded['email']


# §5-9
def test_idempotent_replay_and_omitted_vs_null_digest(client, w):
    version = seed_profile(client, w)['version']
    key = 'gtc-' + w['x'] + '-replay'
    first = ok(patch(client, w['s'], {'expectedVersion': version, 'targetCompany': w['company']}, key=key))
    replay = ok(patch(client, w['s'], {'expectedVersion': version, 'targetCompany': w['company']}, key=key))
    assert replay == first
    # 같은 키로 「intro 만」과 「intro + targetCompany:null」은 다른 요청이다.
    key2 = 'gtc-' + w['x'] + '-digest'
    ok(patch(client, w['s'], {'expectedVersion': first['version'], 'intro': 'Same ' + w['x']}, key=key2))
    clash = patch(client, w['s'], {'expectedVersion': first['version'], 'intro': 'Same ' + w['x'],
                                   'targetCompany': None}, key=key2)
    assert clash.status_code == 409


# §5-10
def test_first_write_with_target_company_only_creates_profile(client, db, w):
    created = ok(patch(client, w['s'], {'expectedVersion': 0, 'targetCompany': w['company']}))
    assert created['version'] == 2 and created['targetCompany'] == w['company']
    assert (created['intro'], created['email'], created['phone']) == ('', None, None)
    actions = [r['action'] for r in db.execute('SELECT action FROM dc.growth_event WHERE student_uid=%s ORDER BY profile_version_after',
                                               (w['s'],)).fetchall()]
    assert actions == ['PROFILE_CREATE', 'PROFILE_UPDATE']


# §5-11
def test_boot_profile_and_submitted_portfolio_do_not_carry_self_target(client, w):
    version = seed_profile(client, w)['version']
    before = create_portfolio(client, w)
    ok(patch(client, w['s'], {'expectedVersion': version, 'targetCompany': w['company']}))
    boot = ok(client.get(f"/api/v1/students/{w['s']}", headers=headers(w['s'])))
    assert boot['targetCompany'] == {} and w['company'] not in str(boot)
    staff_boot = ok(client.get('/api/v1/bootstrap/profiles', headers=headers('career_kim')))
    assert w['company'] not in str(staff_boot)
    # /portfolio(성장 포트폴리오 화면)의 profile 래퍼에는 같은 키가 생긴다.
    growth_portfolio = ok(client.get(f"/api/v1/students/{w['s']}/portfolio", headers=headers(w['s'])))
    assert growth_portfolio['profile']['targetCompany'] == w['company']
    # 회사 제출 문서의 personal 키 집합은 목표 기업을 적기 전과 같고, 값도 실리지 않는다.
    after = create_portfolio(client, w)
    assert set(personal(after)) == set(personal(before))
    assert set(personal(after)) >= set(section_of(empty_document(), 'personal')['data'])
    assert w['company'] not in str(after)


def create_portfolio(client, w):
    created = client.post(f"/api/v1/students/{w['s']}/portfolios",
                          headers={**headers(w['s']), 'Idempotency-Key': uuid4().hex}, json={})
    assert created.status_code == 201, created.text
    return created.json()


def personal(dto):
    return next(s for s in dto['document']['sections'] if s['key'] == 'personal')['data']
