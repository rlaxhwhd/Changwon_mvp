"""선발 방식과 전체 신청 집계는 공고 DB 계약이며, 명단 공개 범위와 분리된다."""
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from app.db import pool
from test_api import headers
from test_programs import SERVER_OWNED, apply_as, new_program


def read(client, program_id, who='career_kim'):
    response = client.get(f'/api/v1/programs/{program_id}', headers=headers(who))
    assert response.status_code == 200, response.text
    return response.json()


def test_selection_settings_roundtrip_and_legacy_update(client):
    p = new_program(client, selectionMethod='FIRST_COME', selectionCapacity=1)
    assert p['selectionMethod'] == 'FIRST_COME' and p['selectionCapacity'] == 1
    body = {k: v for k, v in p.items() if k not in SERVER_OWNED and k not in ('selectionMethod', 'selectionCapacity')}
    response = client.put(f"/api/v1/programs/{p['id']}", headers=headers('career_kim'),
                          json={**body, 'expectedVersion': p['version'], 'title': 'Legacy edit preserves selection'})
    assert response.status_code == 200, response.text
    assert response.json()['selectionMethod'] == 'FIRST_COME' and response.json()['selectionCapacity'] == 1
    for invalid in ({'selectionMethod': 'typo'}, {'selectionCapacity': 3}):
        rejected = client.post('/api/v1/programs', headers=headers('career_kim'),
                               json={**body, 'selectionMethod': 'FIRST_COME', **invalid})
        assert rejected.status_code == 422


def test_review_keeps_pending_and_manual_selection_uses_selection_limit(client):
    p = new_program(client, capacity=3, selectionMethod='REVIEW', selectionCapacity=1)
    for student in ('chaewon', 'changwon'):
        assert apply_as(client, student, p['id']).json()['selectionStatus'] == 'PENDING'
    base = f"/api/v1/programs/{p['id']}/applications/selection"
    both = client.post(base, headers=headers('career_kim'),
                       json={'studentIds': ['chaewon', 'changwon'], 'selection': 'SELECTED'})
    assert both.status_code == 409
    assert {a['selectionStatus'] for a in read(client, p['id'])['applicants']} == {'PENDING'}


def test_all_surfaces_share_counts_without_exposing_other_students(client):
    p = new_program(client)
    assert apply_as(client, 'chaewon', p['id']).status_code == 201
    other = read(client, p['id'], 'changwon')
    assert other['applyCount'] == 1 and other['applicants'] == []
    listed = client.get('/api/v1/programs', headers=headers('changwon'), params={'q': p['title'], 'pageSize': 100}).json()
    assert next(r for r in listed['items'] if r['id'] == p['id'])['applyCount'] == 1
    def counts():
        detail = read(client, p['id'])['applyCount']
        dashboard = client.get('/api/v1/counsel-dashboard', headers=headers('career_kim')).json()
        home = next(r for r in dashboard['programs'] if r['id'] == p['id'])['applied']
        stats = client.get('/api/v1/programs/statistics', headers=headers('career_kim')).json()
        stat = next(r for r in stats['programs'] if r['id'] == p['id'])['applied']
        return detail, home, stat
    assert counts() == (1, 1, 1)
    cancelled = client.post(f"/api/v1/programs/{p['id']}/applications/selection", headers=headers('career_kim'),
                            json={'studentIds': ['chaewon'], 'selection': 'CANCELLED'})
    assert cancelled.status_code == 200
    assert counts() == (0, 0, 0)


def test_first_come_auto_selects_with_pre_survey_and_idempotent_replay(client):
    p = new_program(client, selectionMethod='FIRST_COME', selectionCapacity=1, competencySurvey=True,
                    competencyAreas=['CAREER_3'], runStartDate=(date.today()+timedelta(days=30)).isoformat())
    path = f"/api/v1/programs/{p['id']}/applications"
    key = uuid4().hex
    kwargs = dict(headers={**headers('chaewon'), 'Idempotency-Key': key}, json={'path': 'Test'})
    first = client.post(path, **kwargs)
    assert first.status_code == 201, first.text
    assert first.json()['selectionStatus'] == 'SELECTED' and first.json()['selectedAt']
    assert client.post(path, **kwargs).json() == first.json()
    detail = read(client, p['id'])
    assert detail['applyCount'] == 1 and len(detail['applicants']) == 1
    assert detail['applicants'][0]['selectionStatus'] == 'SELECTED'
    mine = client.get('/api/v1/programs/mine', headers=headers('chaewon')).json()
    assert next(r for r in mine['items'] if r['id'] == p['id'])['selection'] == 'SELECTED'
    survey = client.get(f"/api/v1/programs/{p['id']}/survey/PRE", headers=headers('chaewon'))
    assert survey.status_code == 200 and survey.json()['open'] is True
    with pool.connection() as conn:
        assert conn.execute("SELECT count(*) AS n FROM dc.program_apply_event WHERE program_id=%s AND action='SELECTION'", (p['id'],)).fetchone()['n'] == 1
        assert conn.execute("SELECT count(*) AS n FROM dc.notification WHERE source_kind='PROGRAM_SURVEY' AND source_id=%s", (p['id']+':PRE',)).fetchone()['n'] == 1


def test_first_come_waits_after_selection_limit_and_closes_at_recruitment_limit(client):
    p = new_program(client, capacity=2, selectionMethod='FIRST_COME', selectionCapacity=1)
    assert apply_as(client, 'chaewon', p['id']).json()['selectionStatus'] == 'SELECTED'
    assert apply_as(client, 'changwon', p['id']).json()['selectionStatus'] == 'PENDING'
    # 교직원 추가 경로도 같은 정원을 지킨다(jiwoo의 개인 CARE7+ 상태와 무관).
    full = apply_as(client, 'career_kim', p['id'], studentId='jiwoo')
    assert full.status_code == 409
    detail = read(client, p['id'])
    assert detail['applyCount'] == 2 and len(detail['applicants']) == 2
    assert sum(a['selectionStatus'] == 'SELECTED' for a in detail['applicants']) == 1


def test_first_come_zero_selection_limit_keeps_applications_pending(client):
    p = new_program(client, selectionMethod='FIRST_COME', selectionCapacity=0)
    assert apply_as(client, 'chaewon', p['id']).json()['selectionStatus'] == 'PENDING'
    closed = new_program(client, capacity=0, selectionMethod='FIRST_COME')
    assert apply_as(client, 'chaewon', closed['id']).status_code == 409


def test_explicit_switch_selects_existing_waiting_in_order_only_once(client):
    p = new_program(client, capacity=3, selectionCapacity=1)
    assert apply_as(client, 'chaewon', p['id']).json()['selectionStatus'] == 'PENDING'
    assert apply_as(client, 'changwon', p['id']).json()['selectionStatus'] == 'PENDING'
    body = {k: v for k, v in p.items() if k not in SERVER_OWNED}
    switched = client.put(f"/api/v1/programs/{p['id']}", headers=headers('career_kim'),
                          json={**body, 'expectedVersion': p['version'], 'selectionMethod': 'FIRST_COME'})
    assert switched.status_code == 200, switched.text
    states = {a['studentId']: a['selectionStatus'] for a in switched.json()['applicants']}
    assert states == {'chaewon': 'SELECTED', 'changwon': 'PENDING'}
    # 이미 선착순인 공고의 제목 수정으로 대기를 다시 자동 선발하지 않는다.
    update = {k: v for k, v in switched.json().items() if k not in SERVER_OWNED}
    again = client.put(f"/api/v1/programs/{p['id']}", headers=headers('career_kim'),
                       json={**update, 'title': 'Title edit', 'expectedVersion': switched.json()['version']})
    assert again.status_code == 200
    with pool.connection() as conn:
        assert conn.execute("SELECT count(*) AS n FROM dc.program_apply_event WHERE program_id=%s AND action='SELECTION'", (p['id'],)).fetchone()['n'] == 1


def test_concurrent_first_come_does_not_overselect(client):
    p = new_program(client, capacity=2, selectionMethod='FIRST_COME', selectionCapacity=1)
    ready = Barrier(2)
    def send(student):
        ready.wait(timeout=10)
        return apply_as(client, student, p['id'])
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(send, ['chaewon', 'changwon']))
    assert [r.status_code for r in responses] == [201, 201]
    assert sorted(r.json()['selectionStatus'] for r in responses) == ['PENDING', 'SELECTED']
    detail = read(client, p['id'])
    assert detail['applyCount'] == 2 and sum(a['selectionStatus'] == 'SELECTED' for a in detail['applicants']) == 1


def test_concurrent_first_come_does_not_overfill_recruitment(client):
    p = new_program(client, capacity=1, selectionMethod='FIRST_COME', selectionCapacity=1)
    ready = Barrier(2)
    def send(student):
        ready.wait(timeout=10)
        return apply_as(client, student, p['id'])
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(send, ['chaewon', 'changwon']))
    assert sorted(r.status_code for r in responses) == [201, 409]
    detail = read(client, p['id'])
    assert detail['applyCount'] == 1 and len(detail['applicants']) == 1


def test_new_application_cannot_jump_ahead_of_existing_waiter(client):
    p = new_program(client, capacity=3, selectionMethod='FIRST_COME', selectionCapacity=1)
    assert apply_as(client, 'chaewon', p['id']).json()['selectionStatus'] == 'SELECTED'
    assert apply_as(client, 'changwon', p['id']).json()['selectionStatus'] == 'PENDING'
    response = client.post(f"/api/v1/programs/{p['id']}/applications/selection", headers=headers('career_kim'),
                           json={'studentIds': ['chaewon'], 'selection': 'CANCELLED'})
    assert response.status_code == 200
    assert apply_as(client, 'career_kim', p['id'], studentId='jiwoo').json()['selectionStatus'] == 'PENDING'
    states = {a['studentId']: a['selectionStatus'] for a in read(client, p['id'])['applicants']}
    assert states['changwon'] == 'SELECTED' and states['chaewon'] == 'CANCELLED'
