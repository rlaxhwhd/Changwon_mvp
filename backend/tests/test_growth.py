"""성장활동 통합 테스트 — 실제 PostgreSQL *_test DB 에서만 돌린다.

검증 대상은 04-decisions Q3 의 부분 전환이다: 소유자가 증명된 자료만 있고,
학생이 고친 내용을 담당 상담사가 같은 ID·버전으로 보며, 정책이 없는 것은 없다고 답한다.
"""
from uuid import uuid4

import psycopg
import pytest

from app.db import pool
from test_api import headers

KEY = lambda identity: {**headers(identity), 'Idempotency-Key': uuid4().hex}
JOURNAL = {'desc': '', 'situation': '상황', 'role': '역할', 'action': '행동', 'result': '결과',
           'learning': '배움', 'resumeMemo': ''}


def profile_of(client, identity, viewer=None):
    return client.get(f'/api/v1/students/{identity}/growth/profile',
                      headers=headers(viewer or identity)).json()


def test_only_owned_seed_material_was_imported(client):
    """전 학생 공통 상수는 옮기지 않는다 — 옮기면 남의 실적이 자기 것으로 보인다."""
    with pool.connection() as conn:
        rows = conn.execute('''SELECT p.alias,count(*)::int AS n FROM dc.growth_entry g
          JOIN dc.person p ON p.intg_uid=g.student_uid GROUP BY p.alias ORDER BY p.alias''').fetchall()
        kinds = conn.execute('SELECT DISTINCT kind_code FROM dc.growth_entry').fetchall()
        profiles = conn.execute('SELECT count(*)::int AS n FROM dc.growth_profile').fetchone()['n']
    # 소유자가 증명된 자료는 growthJournal.seed.json 의 두 학생뿐이다.
    assert [(r['alias'], r['n']) for r in rows] == [('chaewon', 6), ('changwon', 3)]
    assert [k['kind_code'] for k in kinds] == ['JOURNAL']
    assert profiles == 2
    # 합성 연락처·공통 소개문을 만들어 넣지 않았다.
    profile = profile_of(client, 'chaewon')
    assert profile['email'] is None and profile['phone'] is None and profile['intro'] == ''
    assert profile['name'] and profile['studentNo'], '학사 유래 값은 학생 레코드에서 온다'


def test_profile_is_self_service_and_contacts_are_owner_only(client):
    # 시드 일지가 있는 학생은 이관 때 프로필이 함께 생겼다(version=1).
    current = profile_of(client, 'chaewon')['version']
    assert current == 1
    saved = client.patch('/api/v1/students/chaewon/growth/profile', headers=KEY('chaewon'),
                         json={'expectedVersion': current, 'intro': '백엔드를 준비합니다.',
                               'email': 'me@example.com', 'phone': '010-0000-0000'})
    assert saved.status_code == 200, saved.text
    assert saved.json()['version'] == current + 1
    assert client.patch('/api/v1/students/chaewon/growth/profile', headers=KEY('chaewon'),
                        json={'expectedVersion': current, 'intro': 'x'}).status_code == 409
    # 아직 프로필이 없는 학생은 최초 쓰기가 생성과 수정을 한 트랜잭션으로 처리한다.
    first = client.patch('/api/v1/students/jiwoo/growth/profile', headers=KEY('jiwoo'),
                         json={'expectedVersion': 0, 'intro': '처음 씁니다.'})
    assert first.status_code == 200 and first.json()['version'] == 2
    # 담당 상담사는 소개문을 보되 자기입력 연락처는 보지 못한다(D06 — 현행보다 넓히지 않는다).
    staff_view = profile_of(client, 'chaewon', 'career_kim')
    assert staff_view['intro'] == '백엔드를 준비합니다.'
    assert staff_view['email'] is None and staff_view['phone'] is None
    assert staff_view['capabilities']['canEdit'] is False
    assert client.patch('/api/v1/students/chaewon/growth/profile', headers=KEY('career_kim'),
                        json={'expectedVersion': staff_view['version'], 'intro': '상담사가 고침'}).status_code == 403
    assert client.get('/api/v1/students/chaewon/growth/profile',
                      headers=headers('changwon')).status_code == 404


def test_student_writes_and_the_counselor_reads_the_same_row(client):
    version = profile_of(client, 'chaewon')['version']
    created = client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('chaewon'),
                          json={'kind': 'JOURNAL', 'title': '카페 아르바이트', 'categoryCode': 'PARTTIME',
                                'occurredOn': '2026-03-01', 'datePrecision': 'DAY',
                                'tags': ['고객응대'], 'content': JOURNAL,
                                'expectedProfileVersion': version})
    assert created.status_code == 201, created.text
    entry = created.json()
    assert entry['sourceKind'] == 'SELF_REPORTED' and entry['version'] == 1
    seen = client.get(f"/api/v1/students/chaewon/growth/entries/{entry['id']}",
                      headers=headers('career_kim')).json()
    assert seen['id'] == entry['id'] and seen['content']['situation'] == '상황'
    # 다른 학생은 읽지 못한다.
    assert client.get(f"/api/v1/students/chaewon/growth/entries/{entry['id']}",
                      headers=headers('changwon')).status_code == 404
    assert client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('changwon'),
                       json={'kind': 'JOURNAL', 'title': '남의 자료', 'content': JOURNAL,
                             'expectedProfileVersion': 0}).status_code == 404


def test_stale_and_shape_violating_writes_are_refused(client):
    version = profile_of(client, 'chaewon')['version']
    entry = client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('chaewon'),
                        json={'kind': 'SKILL', 'title': 'Python', 'categoryCode': 'LANGUAGE',
                              'content': {'level': 4}, 'expectedProfileVersion': version}).json()
    version = profile_of(client, 'chaewon')['version']
    body = {'kind': 'SKILL', 'title': 'Python 3', 'categoryCode': 'LANGUAGE', 'content': {'level': 5},
            'expectedVersion': entry['version'], 'expectedProfileVersion': version}
    assert client.patch(f"/api/v1/students/chaewon/growth/entries/{entry['id']}",
                        headers=KEY('chaewon'), json=body).status_code == 200
    stale = client.patch(f"/api/v1/students/chaewon/growth/entries/{entry['id']}",
                         headers=KEY('chaewon'), json=body)
    assert stale.status_code == 409 and stale.json()['detail']['code'] == 'VERSION_CONFLICT'
    version = profile_of(client, 'chaewon')['version']
    # 종류는 바뀌지 않는다 — 바뀌면 다른 자료가 되고 이력이 끊긴다.
    changed = client.patch(f"/api/v1/students/chaewon/growth/entries/{entry['id']}", headers=KEY('chaewon'),
                           json={**body, 'kind': 'AWARD', 'content': {}, 'expectedVersion': 2,
                                 'expectedProfileVersion': version})
    assert changed.status_code == 409
    # 종류에 없는 필드·권한 필드는 받지 않는다.
    assert client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('chaewon'),
                       json={'kind': 'SKILL', 'title': 'Go', 'content': {'level': 3, 'verified': True},
                             'expectedProfileVersion': version}).status_code == 422
    assert client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('chaewon'),
                       json={'kind': 'SKILL', 'title': 'Go', 'categoryCode': 'NOT_A_CODE',
                             'content': {'level': 3}, 'expectedProfileVersion': version}).status_code == 422


def test_delete_is_logical_and_history_keeps_the_original_text(client):
    version = profile_of(client, 'chaewon')['version']
    entry = client.post('/api/v1/students/chaewon/growth/entries', headers=KEY('chaewon'),
                        json={'kind': 'AWARD', 'title': '삭제될 수상', 'content': {'rank': '우수상'},
                              'expectedProfileVersion': version}).json()
    version = profile_of(client, 'chaewon')['version']
    removed = client.post(f"/api/v1/students/chaewon/growth/entries/{entry['id']}/delete",
                          headers=KEY('chaewon'),
                          json={'expectedVersion': entry['version'], 'expectedProfileVersion': version})
    assert removed.status_code == 200, removed.text
    assert client.get(f"/api/v1/students/chaewon/growth/entries/{entry['id']}",
                      headers=headers('chaewon')).status_code == 404
    with pool.connection() as conn:
        row = conn.execute('SELECT deleted_at,title FROM dc.growth_entry WHERE id=%s',
                           (entry['id'],)).fetchone()
    assert row['deleted_at'] and row['title'] == '삭제될 수상', '물리삭제됐다'
    # 본인은 삭제 전 원문을 이력에서 본다. 교직원에게는 행위·시각만 준다(D06).
    mine = client.get('/api/v1/students/chaewon/growth/events', headers=headers('chaewon')).json()
    deletion = next(e for e in mine['items'] if e['action'] == 'DELETE')
    assert deletion['beforeValue']['title'] == '삭제될 수상'
    staff = client.get('/api/v1/students/chaewon/growth/events', headers=headers('career_kim')).json()
    assert 'beforeValue' not in staff['items'][0] and staff['items'][0]['action']


def test_summary_and_listing_are_counted_by_sql(client):
    summary = client.get('/api/v1/students/chaewon/growth/summary', headers=headers('chaewon')).json()
    assert summary['byKind']['JOURNAL']['total'] == 7, '시드 6건 + 작성 1건'
    assert summary['total'] == sum(v['total'] for v in summary['byKind'].values())
    assert any(t['tag'] == '고객응대' for t in summary['tags'])
    page = client.get('/api/v1/students/chaewon/growth/entries?kind=JOURNAL&pageSize=3',
                      headers=headers('chaewon')).json()
    assert page['totalCount'] == 7 and len(page['items']) == 3
    tagged = client.get('/api/v1/students/chaewon/growth/entries?tag=고객응대',
                        headers=headers('chaewon')).json()
    assert tagged['totalCount'] >= 1


def test_portfolio_projection_has_no_shared_sample_data(client):
    portfolio = client.get('/api/v1/students/chaewon/portfolio', headers=headers('chaewon')).json()
    assert portfolio['profile']['name'] and portfolio['profile']['email'] == 'me@example.com'
    assert all(entry['sourceKind'] in ('SELF_REPORTED', 'IMPORTED') for entry in portfolio['journals'])
    # 학생이 실제로 쓴 것만 있다. 화면 상수였던 프로젝트·어학은 소유자가 없어 옮기지 않았다.
    assert [s['title'] for s in portfolio['skills']] == ['Python 3']
    assert portfolio['projects'] == [] and portfolio['languages'] == []
    # 자소서는 채용의 dc.job_resume 가 정본이다 — 여기서 새로 만들지 않는다.
    assert {r['id'] for r in portfolio['resumes']} == {'r1'}
    staff_view = client.get('/api/v1/students/chaewon/portfolio', headers=headers('career_kim')).json()
    assert staff_view['profile']['email'] is None and staff_view['capabilities']['canEdit'] is False
    assert client.get('/api/v1/students/chaewon/portfolio', headers=headers('changwon')).status_code == 404


def test_star_track_is_read_only_and_policy_pending(client):
    """DB.md #29·#30 이 열려 있다. 기존 payload 를 읽되 합격·장학을 계산하지 않는다."""
    track = client.get('/api/v1/students/chaewon/star-track', headers=headers('chaewon')).json()
    assert track['selected'] is True and track['metricsStatus'] == 'POLICY_PENDING'
    assert track['record']['track'] and track['summary']['steps'] > 0
    empty = client.get('/api/v1/students/changwon/star-track', headers=headers('changwon')).json()
    assert empty['record'] is None and empty['selected'] is False
    # 점수·선발을 쓰는 경로는 없다.
    assert client.post('/api/v1/students/chaewon/star-track', headers=headers('chaewon'),
                       json={}).status_code in (404, 405)


def test_recommendations_come_from_the_existing_ai_run(client):
    result = client.get('/api/v1/students/chaewon/growth/recommendations',
                        headers=headers('chaewon')).json()
    assert result['available'] is True and result['model'] == 'fixture'
    assert result['items'] and all(item['title'] for item in result['items'])
    assert {item['category'] for item in result['items']} <= {'programs', 'activities', 'certs'}


def test_wishlist_is_per_student_and_versioned(client):
    with pool.connection() as conn:
        program_id = conn.execute('SELECT id FROM dc.program ORDER BY id LIMIT 1').fetchone()['id']
    path = '/api/v1/program-wishlist/' + program_id
    assert client.put(path, headers=headers('chaewon'),
                      json={'wished': True, 'expectedVersion': 0}).status_code == 200
    mine = client.get('/api/v1/program-wishlist', headers=headers('chaewon')).json()
    assert program_id in mine['programIds']
    # 학생 ID 없는 공통 키였다 — 다른 학생에게 옮겨 붙지 않는다.
    assert client.get('/api/v1/program-wishlist', headers=headers('changwon')).json()['programIds'] == []
    assert client.put(path, headers=headers('chaewon'),
                      json={'wished': False, 'expectedVersion': 0}).status_code == 409
    assert client.put(path, headers=headers('chaewon'),
                      json={'wished': False, 'expectedVersion': 1}).status_code == 200
    assert client.get('/api/v1/program-wishlist', headers=headers('chaewon')).json()['programIds'] == []
    assert client.get('/api/v1/program-wishlist', headers=headers('career_kim')).status_code == 403
    with pool.connection() as conn:
        events = conn.execute('''SELECT wished_after FROM dc.program_wishlist_event
          WHERE program_id=%s ORDER BY created_at''', (program_id,)).fetchall()
    assert [e['wished_after'] for e in events] == [True, False], '해제가 이력을 지웠다'


def test_growth_history_is_append_only(client):
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute("UPDATE dc.growth_event SET reason='tampered'")
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('DELETE FROM dc.program_wishlist_event')
