"""로드맵 통합 테스트 — 실제 PostgreSQL *_test DB 에서만 돌린다.

검증 대상은 04-decisions 의 승인 범위다: 3상태와 학생 공개, 재생성의 원자성과 비이월,
비교과 개설 편입과 「수료만 닫는다」, 상담 근거, 단일 게이트, append-only.
"""
from uuid import uuid4

import psycopg
import pytest

from app.db import pool
from test_api import headers
from test_programs import apply_as, new_program

KEY = lambda identity: {**headers(identity), 'Idempotency-Key': uuid4().hex}


def uid_of(alias):
    with pool.connection() as conn:
        return conn.execute('SELECT intg_uid FROM dc.person WHERE alias=%s', (alias,)).fetchone()['intg_uid']


def plan_of(client, identity, viewer=None):
    return client.get(f'/api/v1/students/{identity}/roadmap', headers=headers(viewer or identity)).json()


def ensure_type(alias, code):
    """유형 확정은 상담·진단 도메인의 계약이다. 여기서는 편입 **대상 판정**만 검증하므로
    유형 이벤트 1행을 직접 만든다 — 판정식을 흉내 내지 않는다."""
    with pool.connection() as conn:
        conn.execute('''INSERT INTO dc.student_type_event(student_uid,student_type,source)
          SELECT intg_uid,%s,'fixture:test' FROM dc.person WHERE alias=%s''', (code, alias))


def care7_request(alias):
    """CARE 7+ 확정 예약을 만든다.

    상담 API 로 만들려면 진단 2종을 먼저 통과해야 하는데 그건 다른 도메인의 계약이다.
    여기서는 로드맵의 상담 근거만 검증하므로 예약 1행을 직접 만든다.
    """
    request_id = 'ct_' + uuid4().hex[:12]
    with pool.connection() as conn:
        conn.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,
          status_code,method_code,topic,requested_at,slot_date,slot_start,slot_end,snapshot,source_payload)
          VALUES(%s,(SELECT intg_uid FROM dc.person WHERE alias=%s),
          (SELECT intg_uid FROM dc.person WHERE alias='career_kim'),'CAREER','진로취업','care7','CONFIRMED','OFFLINE',
          '로드맵 생성',now(),'2099-01-02','10:00','11:00','{}','{}')''', (request_id, alias))
    return request_id


def test_provider_is_the_only_source_of_a_new_plan(client):
    """승인된 산출물이 없는 학생에게는 계획을 만들어 주지 않는다(CLAUDE.md 14조)."""
    capability = client.get('/api/v1/students/changwon/roadmap/generation-capability',
                            headers=headers('career_kim')).json()
    assert capability['canGenerate'] is False
    assert capability['reasonCode'] == 'ROADMAP_GENERATOR_UNAVAILABLE'
    response = client.post('/api/v1/students/changwon/roadmap/generate', headers=KEY('career_kim'),
                           json={'counselRequestId': care7_request('changwon'), 'expectedRoadmapVersion': 0,
                                 'expectedVersion': 0})
    assert response.status_code == 503, response.text
    assert response.json()['detail']['code'] == 'ROADMAP_GENERATOR_UNAVAILABLE'


def test_counsel_basis_is_verified_against_the_student_and_track(client):
    other = care7_request('changwon')
    response = client.post('/api/v1/students/jiwoo/roadmap/generate', headers=KEY('career_kim'),
                           json={'counselRequestId': other, 'expectedRoadmapVersion': 0, 'expectedVersion': 0})
    assert response.status_code == 422 and response.json()['detail']['code'] == 'INVALID_COUNSEL_BASIS'
    # 일반 진로취업 상담은 로드맵을 만들지 않는다(PROCESS.md §2-1).
    general = care7_request('jiwoo')
    with pool.connection() as conn:
        conn.execute("UPDATE dc.counsel_request SET care_track='general' WHERE id=%s", (general,))
    response = client.post('/api/v1/students/jiwoo/roadmap/generate', headers=KEY('career_kim'),
                           json={'counselRequestId': general, 'expectedRoadmapVersion': 0, 'expectedVersion': 0})
    assert response.status_code == 422 and response.json()['detail']['code'] == 'INVALID_COUNSEL_BASIS'


def test_draft_is_stored_and_hidden_until_the_counselor_confirms(client):
    """Q1 — 초안은 서버에 남지만 학생에게는 보이지 않고, 비교과가 함께 잠긴다."""
    request_id = care7_request('jiwoo')
    created = client.post('/api/v1/students/jiwoo/roadmap/generate', headers=KEY('career_kim'),
                          json={'counselRequestId': request_id, 'expectedRoadmapVersion': 0,
                                'expectedVersion': 0})
    assert created.status_code == 201, created.text
    plan = created.json()
    assert plan['status'] == 'DRAFT' and plan['confirmed'] is False and plan['roadmapVersion'] == 1
    assert [axis['axis'] for axis in plan['axes']] == ['IAP', 'CORE', 'GROWTH']
    assert all(len(axis['cells']) == 5 for axis in plan['axes'])
    assert plan['progress'] == {'done': 0, 'total': 15, 'pct': 0}
    # 상담사는 초안을 본다.
    assert plan_of(client, 'jiwoo', 'career_kim')['roadmap']['status'] == 'DRAFT'
    # 학생은 보지 못한다 — 빈 화면이 아니라 사유와 다음 경로를 받는다.
    student_view = plan_of(client, 'jiwoo')
    assert student_view['roadmap'] is None and student_view['pending'] is True
    assert student_view['gate']['reasons'][0]['code'] == 'ROADMAP_CONFIRMATION_REQUIRED'
    assert student_view['gate']['reasons'][0]['nextRoute']
    # 비교과 신청도 함께 잠긴다.
    program = new_program(client, title='잠금 검증')
    assert apply_as(client, 'jiwoo', program['id']).status_code == 403
    # 검토중 → 확정.
    review = client.post('/api/v1/students/jiwoo/roadmap/review', headers=KEY('career_kim'),
                         json={'expectedRoadmapVersion': 1, 'expectedVersion': plan['version']})
    assert review.status_code == 200, review.text
    confirmed = client.post('/api/v1/students/jiwoo/roadmap/confirm', headers=KEY('career_kim'),
                            json={'expectedRoadmapVersion': 1, 'expectedVersion': review.json()['version']})
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()['status'] == 'CONFIRMED' and confirmed.json()['confirmed'] is True
    opened = plan_of(client, 'jiwoo')
    assert opened['roadmap']['progress']['total'] == 15
    assert apply_as(client, 'jiwoo', program['id']).status_code == 201


def test_stale_edit_is_rejected_and_program_cells_are_read_only(client):
    plan = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    cell = plan['axes'][1]['cells'][0]
    body = {'expectedRoadmapVersion': plan['roadmapVersion'], 'expectedVersion': plan['version'],
            'operations': [{'op': 'editItem', 'itemId': cell['id'],
                            'expectedItemVersion': cell['version'], 'title': '상담에서 합의한 제목'}],
            'note': '검증'}
    first = client.patch('/api/v1/students/jiwoo/roadmap', headers=KEY('career_kim'), json=body)
    assert first.status_code == 200, first.text
    assert first.json()['axes'][1]['cells'][0]['title'] == '상담에서 합의한 제목'
    # 같은 expectedVersion 으로 두 번째 저장은 거절된다.
    second = client.patch('/api/v1/students/jiwoo/roadmap', headers=KEY('career_kim'), json=body)
    assert second.status_code == 409 and second.json()['detail']['code'] == 'VERSION_CONFLICT'
    # 비교과 편입 칸은 프로그램이 정본이라 계획 편집으로 바뀌지 않는다.
    ensure_type('jiwoo', 'T1')
    program = new_program(client, title='편집 잠금 검증', careTypes=['T1'], roadmapEntry='REQUIRED')
    auto = 'auto-' + program['id']
    current = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    linked = [c for axis in current['axes'] for c in axis['cells'] if c['id'] == auto]
    assert linked and linked[0]['origin'] == 'AUTO_PROGRAM'
    blocked = client.patch('/api/v1/students/jiwoo/roadmap', headers=KEY('career_kim'),
                           json={'expectedRoadmapVersion': current['roadmapVersion'],
                                 'expectedVersion': current['version'],
                                 'operations': [{'op': 'editItem', 'itemId': auto, 'expectedItemVersion': 1,
                                                 'title': '손으로 고치기'}]})
    assert blocked.status_code == 409 and blocked.json()['detail']['code'] == 'INVALID_TRANSITION'
    # 수동 완료도 프로그램 칸에는 쓸 수 없다 — 수료만 닫는다(spec_v1 §7.2).
    manual = client.post(f'/api/v1/students/jiwoo/roadmap/items/{auto}/completion', headers=KEY('career_kim'),
                         json={'expectedRoadmapVersion': current['roadmapVersion'],
                               'expectedVersion': current['version'], 'expectedItemVersion': 1,
                               'done': True, 'reason': '검증'})
    assert manual.status_code == 409


def test_manual_completion_moves_progress_and_leaves_history(client):
    plan = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    cell = next(c for axis in plan['axes'] for c in axis['cells'] if c['origin'] == 'BASE')
    done = client.post(f"/api/v1/students/jiwoo/roadmap/items/{cell['id']}/completion",
                       headers=KEY('career_kim'),
                       json={'expectedRoadmapVersion': plan['roadmapVersion'],
                             'expectedVersion': plan['version'], 'expectedItemVersion': cell['version'],
                             'done': True, 'reason': '상담에서 확인'})
    assert done.status_code == 200, done.text
    assert done.json()['progress']['done'] == 1
    updated = next(c for axis in done.json()['axes'] for c in axis['cells'] if c['id'] == cell['id'])
    assert updated['completionSource'] == 'MANUAL' and updated['completedAt']
    events = client.get('/api/v1/students/jiwoo/roadmap/events', headers=headers('career_kim')).json()
    assert events['items'][0]['action'] == 'ITEM_COMPLETION'


def test_regeneration_snapshots_and_carries_nothing_forward(client):
    plan = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    assert plan['progress']['done'] >= 1, '이월 검증을 위해 완료 칸이 하나는 있어야 한다'
    generation = plan['roadmapVersion']
    response = client.post('/api/v1/students/jiwoo/roadmap/regenerate', headers=KEY('career_kim'),
                           json={'counselRequestId': care7_request('jiwoo'),
                                 'expectedRoadmapVersion': generation, 'expectedVersion': plan['version'],
                                 'reason': '목표 직무 변경'})
    assert response.status_code == 200, response.text
    fresh = response.json()
    assert fresh['roadmapVersion'] == generation + 1 and fresh['status'] == 'DRAFT'
    cells = [c for axis in fresh['axes'] for c in axis['cells']]
    assert len(cells) == 15 and all(c['status'] == 'TODO' for c in cells)
    assert not [c for c in cells if c['origin'] == 'AUTO_PROGRAM'], '구세대 프로그램 칸이 이월됐다'
    # 구세대는 스냅샷에 그대로 남는다 — 완료 칸을 이월하지 않으므로 여기에만 있다.
    snapshots = client.get('/api/v1/students/jiwoo/roadmap/snapshots', headers=headers('career_kim')).json()
    assert [s['version'] for s in snapshots['items']] == [generation]
    detail = client.get(f'/api/v1/students/jiwoo/roadmap/snapshots/{generation}',
                        headers=headers('career_kim')).json()
    assert detail['schemaVersion'] == 2
    assert detail['payload']['progress']['done'] >= 1
    assert any(c['origin'] == 'AUTO_PROGRAM' for c in detail['payload']['cells'])
    # 재생성 중에는 학생 화면이 다시 잠긴다.
    assert plan_of(client, 'jiwoo')['roadmap'] is None
    client.post('/api/v1/students/jiwoo/roadmap/confirm', headers=KEY('career_kim'),
                json={'expectedRoadmapVersion': fresh['roadmapVersion'], 'expectedVersion': fresh['version']})


def test_confirmation_requires_three_axes_of_five_base_cells(client):
    uid = uid_of('jiwoo')
    plan = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    client.post('/api/v1/students/jiwoo/roadmap/reopen', headers=KEY('career_kim'),
                json={'expectedRoadmapVersion': plan['roadmapVersion'], 'expectedVersion': plan['version']})
    with pool.connection() as conn:
        conn.execute('''INSERT INTO dc.roadmap_item(student_uid,axis,id,position,title,priority,importance,
          why,status,entry,origin_code) VALUES(%s,'CORE','extra-base',90,'여섯 번째 칸','P2','RECOMMENDED',
          '검증','TODO','NONE','BASE')''', (uid,))
    current = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    refused = client.post('/api/v1/students/jiwoo/roadmap/confirm', headers=KEY('career_kim'),
                          json={'expectedRoadmapVersion': current['roadmapVersion'],
                                'expectedVersion': current['version']})
    assert refused.status_code == 422 and refused.json()['detail']['code'] == 'INVALID_AXIS_COUNT'
    with pool.connection() as conn:
        conn.execute("DELETE FROM dc.roadmap_item WHERE student_uid=%s AND id='extra-base'", (uid,))
    current = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    assert client.post('/api/v1/students/jiwoo/roadmap/confirm', headers=KEY('career_kim'),
                       json={'expectedRoadmapVersion': current['roadmapVersion'],
                             'expectedVersion': current['version']}).status_code == 200


def test_completion_only_from_outcome_survives_regeneration_rules(client):
    """비교과 편입 → 선발·출석은 칸을 닫지 않고 수료만 닫는다(spec_v1 §7.2)."""
    program = new_program(client, title='편입 수료 검증', careTypes=['T1'], roadmapEntry='REQUIRED')
    item_id = 'auto-' + program['id']
    base = f"/api/v1/programs/{program['id']}/applications"
    head = headers('career_kim')

    def status():
        with pool.connection() as conn:
            return conn.execute('SELECT status,completion_source_code AS src FROM dc.roadmap_item '
                                'WHERE student_uid=%s AND id=%s', (uid_of('jiwoo'), item_id)).fetchone()

    assert status()['status'] == 'TODO'
    assert apply_as(client, 'jiwoo', program['id']).status_code == 201
    client.post(base + '/selection', headers=head, json={'studentIds': ['jiwoo'], 'selection': 'SELECTED'})
    client.put(base + '/jiwoo/attendance', headers=head, json={'attendance': 'PRESENT'})
    assert status()['status'] == 'TODO', '선발·출석만으로 칸이 닫혔다'
    client.post(base + '/outcome', headers=head, json={'studentIds': ['jiwoo'], 'outcome': 'COMPLETED'})
    assert status() == {'status': 'DONE', 'src': 'PROGRAM_OUTCOME'}
    # 편입된 칸이 있는 프로그램은 삭제가 FK 위반 500 이 아니라 409 로 막힌다.
    fresh = new_program(client, title='삭제 차단 검증', careTypes=['T1'], roadmapEntry='REQUIRED')
    removal = client.delete(f"/api/v1/programs/{fresh['id']}", headers=head)
    assert removal.status_code == 409, removal.text
    assert removal.json()['detail']['code'] == 'PROGRAM_IN_ROADMAP'
    # 연결된 프로그램의 편입 조건도 바꿀 수 없다 — 소급 삭제·회수 규칙이 아직 없다.
    current = client.get(f"/api/v1/programs/{program['id']}", headers=head).json()
    body = {k: current[k] for k in ('title', 'desc', 'category', 'status', 'capacity', 'manager',
                                    'fiscalYear', 'location', 'sessions', 'startDate', 'endDate')}
    body.update(careTypes=['T2'], roadmapEntry='REQUIRED', expectedVersion=current['version'])
    assert client.put(f"/api/v1/programs/{program['id']}", headers=head, json=body).status_code == 409


def test_change_requests_are_applied_inside_the_edit_transaction(client):
    plan = plan_of(client, 'jiwoo')['roadmap']
    created = client.post('/api/v1/students/jiwoo/roadmap-requests', headers=KEY('jiwoo'),
                          json={'title': '어학 목표 상향', 'reason': '모의고사 점수가 올랐습니다.',
                                'axis': 'GROWTH', 'expectedRoadmapVersion': plan['roadmapVersion'],
                                'expectedVersion': plan['version']})
    assert created.status_code == 201, created.text
    request_id = created.json()['id']
    assert created.json()['status'] == 'REQ'
    # 다른 학생은 남의 요청을 보지 못한다.
    mine = client.get('/api/v1/roadmap-requests', headers=headers('chaewon')).json()
    assert request_id not in [r['id'] for r in mine['items']]
    queue = client.get('/api/v1/roadmap-requests?status=REQ', headers=headers('career_kim')).json()
    assert request_id in [r['id'] for r in queue['items']] and queue['summary']['REQ'] >= 1
    current = plan_of(client, 'jiwoo', 'career_kim')['roadmap']
    cell = next(c for axis in current['axes'] if axis['axis'] == 'GROWTH' for c in axis['cells'])
    applied = client.patch('/api/v1/students/jiwoo/roadmap', headers=KEY('career_kim'),
                           json={'expectedRoadmapVersion': current['roadmapVersion'],
                                 'expectedVersion': current['version'],
                                 'operations': [{'op': 'editItem', 'itemId': cell['id'],
                                                 'expectedItemVersion': cell['version'],
                                                 'title': 'TOEIC 700'}],
                                 'requests': [{'id': request_id, 'expectedVersion': 1, 'note': '반영'}],
                                 'note': '요청 반영'})
    assert applied.status_code == 200, applied.text
    events = client.get(f'/api/v1/roadmap-requests/{request_id}/events', headers=headers('career_kim')).json()
    assert [e['action'] for e in events['items']] == ['CREATE', 'APPLY']
    detail = client.get('/api/v1/roadmap-requests', headers=headers('career_kim')).json()
    row = next(r for r in detail['items'] if r['id'] == request_id)
    assert row['status'] == 'APPLIED' and row['appliedEventId'], '반영 근거 사건이 연결되지 않았다'


def test_rejecting_requests_is_all_or_nothing(client):
    plan = plan_of(client, 'jiwoo')['roadmap']
    first = client.post('/api/v1/students/jiwoo/roadmap-requests', headers=KEY('jiwoo'),
                        json={'title': '반려 검증 1', 'reason': '검증', 'expectedRoadmapVersion': plan['roadmapVersion'],
                              'expectedVersion': plan['version']}).json()
    second = client.post('/api/v1/students/jiwoo/roadmap-requests', headers=KEY('jiwoo'),
                         json={'title': '반려 검증 2', 'reason': '검증', 'expectedRoadmapVersion': plan['roadmapVersion'],
                               'expectedVersion': plan['version']}).json()
    # 한 건의 버전이 어긋나면 전부 되돌린다.
    refused = client.post('/api/v1/roadmap-requests/reject', headers=KEY('career_kim'),
                          json={'requests': [{'id': first['id'], 'expectedVersion': 1},
                                             {'id': second['id'], 'expectedVersion': 9}], 'reason': '검증'})
    assert refused.status_code == 409
    listing = client.get('/api/v1/roadmap-requests?status=REQ', headers=headers('career_kim')).json()
    assert {first['id'], second['id']} <= {r['id'] for r in listing['items']}, '일부만 반려됐다'
    ok = client.post('/api/v1/roadmap-requests/reject', headers=KEY('career_kim'),
                     json={'requests': [{'id': first['id'], 'expectedVersion': 1},
                                        {'id': second['id'], 'expectedVersion': 1}], 'reason': '검증'})
    assert ok.status_code == 200 and [r['status'] for r in ok.json()['items']] == ['REJECTED', 'REJECTED']


def test_students_cannot_write_plans_and_other_roles_are_refused(client):
    plan = plan_of(client, 'jiwoo')['roadmap']
    body = {'expectedRoadmapVersion': plan['roadmapVersion'], 'expectedVersion': plan['version'],
            'operations': [], 'note': ''}
    assert client.patch('/api/v1/students/jiwoo/roadmap', headers=KEY('jiwoo'), json=body).status_code == 403
    # 심리상담사에게는 로드맵 메뉴가 없다.
    assert client.get('/api/v1/students/jiwoo/roadmap', headers=headers('psych_lee')).status_code == 403
    assert client.get('/api/v1/roadmaps', headers=headers('psych_lee')).status_code == 403
    assert client.get('/api/v1/students/chaewon/roadmap', headers=headers('jiwoo')).status_code == 404


def test_listing_and_summary_are_scoped_sql_with_code_pair_filters(client):
    """집계는 SQL 이고 학과 필터는 코드 쌍이다(CLAUDE.md 7조·10조)."""
    # 학생 fixture 는 3명이다(062) — 한 페이지보다 많은지만 본다.
    listing = client.get('/api/v1/roadmaps?pageSize=2', headers=headers('career_kim')).json()
    assert listing['totalCount'] > 2 and len(listing['items']) == 2
    assert all('progress' in row for row in listing['items'])
    summary = client.get('/api/v1/roadmaps/summary', headers=headers('career_kim')).json()
    assert summary['summary']['total'] == listing['totalCount']
    assert summary['summary']['confirmed'] >= 1
    assert sum(band['count'] for band in summary['bands']) == summary['summary']['withRoadmap']
    with pool.connection() as conn:
        org = conn.execute('''SELECT s.college_code,s.dept_code FROM dc.student s JOIN dc.roadmap r ON r.student_uid=s.intg_uid
          WHERE s.college_code IS NOT NULL LIMIT 1''').fetchone()
    scoped = client.get(f"/api/v1/roadmaps?collegeCode={org['college_code']}&deptCode={org['dept_code']}",
                        headers=headers('career_kim')).json()
    assert 0 < scoped['totalCount'] <= listing['totalCount']


def test_profile_no_longer_carries_the_plan(client):
    """전용 API 에만 권한을 걸고 프로필은 그대로 두면 초안·AI 근거가 새어 나간다."""
    profile = client.get('/api/v1/bootstrap/profiles', headers=headers('chaewon')).json()['students'][0]
    assert 'roadmapAxes' not in profile and 'roadmapOutcome' not in profile
    assert profile['hasRoadmap'] is True


def test_career_counsel_cannot_lose_its_track_and_still_needs_the_plan(client):
    """트랙 없는 진로·취업 상담은 이제 DB 가 거부한다 + 완료에는 확정 계획이 필요하다.

    예전에는 트랙이 NULL 일 수 있어서 서버가 `COALESCE(care_track,'care7')` 로 감쌌다.
    NULL 을 일반으로 떨어뜨리면 로드맵 없이 완료돼 버리기 때문이다(E11). 마이그레이션
    027 이 그 상태를 제약으로 막았으므로, 폴백으로 견디는 대신 **불가능한지**를 건다.
    """
    request_id = care7_request('changwon')
    with pool.connection() as conn:
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute('UPDATE dc.counsel_request SET care_track=NULL WHERE id=%s', (request_id,))
    with pool.connection() as conn:
        conn.execute("UPDATE dc.roadmap SET status_code='DRAFT' WHERE student_uid=%s", (uid_of('changwon'),))
    path = '/api/v1/counsel-requests/' + request_id + '/complete'
    refused = client.post(path, headers=headers('career_kim'),
                          json={'expectedVersion': 1, 'summary': '검증', 'finalType': 'T4'})
    assert refused.status_code == 409, refused.text
    with pool.connection() as conn:
        conn.execute("UPDATE dc.roadmap SET status_code='CONFIRMED' WHERE student_uid=%s", (uid_of('changwon'),))
    assert client.post(path, headers=headers('career_kim'),
                       json={'expectedVersion': 1, 'summary': '검증', 'finalType': 'T4'}).status_code == 200


def test_plan_history_is_append_only(client):
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute("UPDATE dc.roadmap_event SET reason='tampered'")
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('DELETE FROM dc.roadmap_snapshot')
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute("UPDATE dc.roadmap_request_event SET reason='tampered'")
