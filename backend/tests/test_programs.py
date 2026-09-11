"""비교과 운영 통합 테스트 — 실제 PostgreSQL *_test DB 에서만 돌린다.

검증 대상은 spec_v1 §7.2 의 확정 규칙이다: 수료만 로드맵 칸을 닫는다,
선발·출석은 닫지 않는다, 이력은 append-only, 벌점은 합이지 저장된 총점이 아니다.
"""
from uuid import uuid4

import psycopg
import pytest

from app.db import pool
from test_api import headers


def new_program(client, **overrides):
    body = {'title': '통합 검증 프로그램', 'desc': '설명', 'category': 'CAREER', 'capacity': 2,
            'startDate': '2026-01-01', 'endDate': '2099-12-31', 'manager': '검증',
            'fiscalYear': '2026', 'location': '검증실', 'sessions': 1}
    body.update(overrides)
    response = client.post('/api/v1/programs', headers=headers('career_kim'), json=body)
    assert response.status_code == 201, response.text
    return response.json()


def apply_as(client, identity, program_id, **body):
    return client.post(f'/api/v1/programs/{program_id}/applications',
                       headers={**headers(identity), 'Idempotency-Key': uuid4().hex},
                       json={'path': '학과 게시판', 'motive': '검증', **body})


def test_catalog_visible_but_applications_are_scoped(client):
    program = new_program(client)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    # 학생은 카탈로그를 보되 남의 신청은 보지 못한다.
    mine = client.get(f"/api/v1/programs/{program['id']}", headers=headers('changwon')).json()
    assert mine['title'] == program['title'] and mine['applicants'] == []
    seen = client.get(f"/api/v1/programs/{program['id']}", headers=headers('chaewon')).json()
    assert [a['studentId'] for a in seen['applicants']] == ['chaewon']


def test_duplicate_and_closed_applications_refused(client):
    program = new_program(client)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    assert apply_as(client, 'chaewon', program['id']).status_code == 409
    closed = new_program(client, startDate='2019-01-01', endDate='2020-01-01')
    assert apply_as(client, 'chaewon', closed['id']).status_code == 409
    ended = new_program(client, status='ENDED')
    assert apply_as(client, 'chaewon', ended['id']).status_code == 409


def test_idempotent_apply_returns_one_row(client):
    program = new_program(client)
    key = uuid4().hex
    send = lambda: client.post(f"/api/v1/programs/{program['id']}/applications",
                               headers={**headers('chaewon'), 'Idempotency-Key': key},
                               json={'path': 'a', 'motive': 'b', 'consents': {}})
    first, second = send(), send()
    assert first.status_code == 201 and second.status_code in (200, 201)
    assert first.json()['studentId'] == second.json()['studentId']
    detail = client.get(f"/api/v1/programs/{program['id']}", headers=headers('career_kim')).json()
    assert len(detail['applicants']) == 1
    # 같은 키에 다른 내용을 저장하려 하면 거절한다.
    assert client.post(f"/api/v1/programs/{program['id']}/applications",
                       headers={**headers('chaewon'), 'Idempotency-Key': key},
                       json={'path': 'x', 'motive': 'y', 'consents': {}}).status_code == 409


def test_capacity_limits_selection_not_application(client):
    program = new_program(client, capacity=1)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    assert apply_as(client, 'changwon', program['id']).status_code == 201
    path = f"/api/v1/programs/{program['id']}/applications/selection"
    body = {'studentIds': ['chaewon', 'changwon'], 'selection': 'SELECTED', 'reason': 'test'}
    assert client.post(path, headers=headers('career_kim'), json=body).status_code == 409
    ok = client.post(path, headers=headers('career_kim'),
                     json={'studentIds': ['chaewon'], 'selection': 'SELECTED', 'reason': 'test'})
    assert ok.status_code == 200, ok.text
    assert ok.json()[0]['selectedAt'] is not None
    # 정원을 이미 선발한 인원 아래로 줄일 수 없다.
    current = client.get(f"/api/v1/programs/{program['id']}", headers=headers('career_kim')).json()
    shrink = {k: current[k] for k in ('title', 'desc', 'category', 'status', 'capacity', 'manager',
                                      'fiscalYear', 'location', 'sessions')}
    shrink.update(capacity=0, expectedVersion=current['version'])
    assert client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'),
                      json=shrink).status_code == 422


def test_outcome_not_selection_closes_the_roadmap_cell(client):
    """spec_v1 §7.2 — 선발·출석은 칸을 닫지 않고 수료(COMPLETED)만 닫는다."""
    program = new_program(client, careTypes=['T3'], roadmapEntry='REQUIRED')
    program_id = program['id']
    # 편입 칸은 개설 트랜잭션이 만든다(PROCESS.md §6-4). 손으로 넣지 않는다 —
    # 손으로 만든 행은 실제 경로가 만드는 행과 달라질 수 있다.
    item_id = 'auto-' + program_id
    with pool.connection() as conn:
        student_uid = conn.execute("SELECT intg_uid FROM dc.person WHERE alias='chaewon'").fetchone()['intg_uid']
        cell = conn.execute('''SELECT origin_code,axis,entry FROM dc.roadmap_item
          WHERE student_uid=%s AND id=%s''', (student_uid, item_id)).fetchone()
    assert cell and (cell['origin_code'], cell['axis'], cell['entry']) == ('AUTO_PROGRAM', 'IAP', 'REQUIRED')

    def status():
        with pool.connection() as conn:
            return conn.execute('SELECT status FROM dc.roadmap_item WHERE student_uid=%s AND id=%s',
                                (student_uid, item_id)).fetchone()['status']

    head = headers('career_kim')
    base = f'/api/v1/programs/{program_id}/applications'
    apply_as(client, 'chaewon', program_id)
    client.post(base + '/selection', headers=head,
                json={'studentIds': ['chaewon'], 'selection': 'SELECTED', 'reason': 'test'})
    client.put(base + '/chaewon/attendance', headers=head, json={'attendance': 'PRESENT', 'reason': 't'})
    assert status() == 'TODO', '선발·출석만으로 칸이 닫혔다'
    assert client.post(base + '/outcome', headers=head,
                       json={'studentIds': ['chaewon'], 'outcome': 'COMPLETED', 'reason': 't'}).status_code == 200
    assert status() == 'DONE'
    client.post(base + '/outcome', headers=head,
                json={'studentIds': ['chaewon'], 'outcome': 'NOT_COMPLETED', 'reason': 't'})
    assert status() == 'TODO', '수료를 되돌렸는데 칸이 열리지 않았다'


def test_outcome_requires_selection_and_absence_requires_points(client):
    program = new_program(client)
    apply_as(client, 'chaewon', program['id'])
    base = f"/api/v1/programs/{program['id']}/applications"
    head = headers('career_kim')
    assert client.post(base + '/outcome', headers=head,
                       json={'studentIds': ['chaewon'], 'outcome': 'COMPLETED'}).status_code == 409
    client.post(base + '/selection', headers=head,
                json={'studentIds': ['chaewon'], 'selection': 'SELECTED'})
    assert client.post(base + '/outcome', headers=head,
                       json={'studentIds': ['chaewon'], 'outcome': 'ABSENT'}).status_code == 422
    assert client.post(base + '/outcome', headers=head,
                       json={'studentIds': ['chaewon'], 'outcome': 'COMPLETED',
                             'absencePoints': 2}).status_code == 422
    # 이수 결과가 남은 신청은 선발을 해제할 수 없다.
    client.post(base + '/outcome', headers=head, json={'studentIds': ['chaewon'], 'outcome': 'COMPLETED'})
    assert client.post(base + '/selection', headers=head,
                       json={'studentIds': ['chaewon'], 'selection': 'PENDING'}).status_code == 409


def total_of(identity):
    with pool.connection() as conn:
        return conn.execute('''SELECT COALESCE(sum(points),0)::int AS n FROM dc.penalty_entry
          WHERE student_uid=(SELECT intg_uid FROM dc.person WHERE alias=%s)''', (identity,)).fetchone()['n']


def test_noshow_grants_and_reverting_waives_without_deleting_history(client):
    program = new_program(client)
    apply_as(client, 'chaewon', program['id'])
    base = f"/api/v1/programs/{program['id']}/applications/chaewon/attendance"
    head = headers('career_kim')
    before = total_of('chaewon')
    assert client.put(base, headers=head, json={'attendance': 'NO_SHOW'}).status_code == 200
    assert total_of('chaewon') == before + 10
    assert client.put(base, headers=head, json={'attendance': 'PRESENT'}).status_code == 200
    assert total_of('chaewon') == before, '노쇼 해제가 벌점을 되돌리지 않았다'
    with pool.connection() as conn:
        rows = conn.execute('''SELECT kind FROM dc.penalty_entry WHERE program_id=%s ORDER BY created_at''',
                            (program['id'],)).fetchall()
    assert [r['kind'] for r in rows] == ['NOSHOW', 'WAIVE'], '이력을 지웠다 — append-only 위반'


def test_absence_tier_change_does_not_stack(client):
    program = new_program(client)
    apply_as(client, 'chaewon', program['id'])
    base = f"/api/v1/programs/{program['id']}/applications"
    head = headers('career_kim')
    before = total_of('chaewon')
    client.post(base + '/selection', headers=head,
                json={'studentIds': ['chaewon'], 'selection': 'SELECTED'})
    client.post(base + '/outcome', headers=head,
                json={'studentIds': ['chaewon'], 'outcome': 'ABSENT', 'absencePoints': 3})
    assert total_of('chaewon') == before + 3
    client.post(base + '/outcome', headers=head,
                json={'studentIds': ['chaewon'], 'outcome': 'ABSENT', 'absencePoints': 1})
    assert total_of('chaewon') == before + 1, 'tier 를 바꿨는데 벌점이 누적됐다'
    client.post(base + '/outcome', headers=head, json={'studentIds': ['chaewon'], 'outcome': 'COMPLETED'})
    assert total_of('chaewon') == before


def test_penalty_history_is_append_only_and_waive_is_bounded(client):
    head = headers('career_kim')
    detail = client.get('/api/v1/penalties/chaewon', headers=head)
    assert detail.status_code == 200, detail.text
    current = detail.json()['total']
    assert client.post('/api/v1/penalties/chaewon/entries', headers=head,
                       json={'kind': 'WAIVE', 'points': current + 5, 'reason': '초과 차감'}).status_code == 422
    added = client.post('/api/v1/penalties/chaewon/entries', headers=head,
                        json={'kind': 'MANUAL', 'points': 4, 'reason': '검증용 부여'})
    assert added.status_code == 201 and added.json()['total'] == current + 4
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('DELETE FROM dc.penalty_entry')
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('UPDATE dc.program_apply_event SET reason=%s', ('tampered',))


def test_every_state_change_is_recorded(client):
    program = new_program(client)
    apply_as(client, 'chaewon', program['id'])
    base = f"/api/v1/programs/{program['id']}/applications"
    head = headers('career_kim')
    client.post(base + '/selection', headers=head, json={'studentIds': ['chaewon'], 'selection': 'SELECTED'})
    client.put(base + '/chaewon/attendance', headers=head, json={'attendance': 'PRESENT'})
    client.post(base + '/outcome', headers=head, json={'studentIds': ['chaewon'], 'outcome': 'COMPLETED'})
    events = client.get(base + '/chaewon/events', headers=head).json()
    assert [e['action'] for e in events['items']] == ['OUTCOME', 'ATTENDANCE', 'SELECTION', 'APPLY']


def test_students_cannot_manage_and_deletion_protects_results(client):
    program = new_program(client)
    apply_as(client, 'chaewon', program['id'])
    base = f"/api/v1/programs/{program['id']}/applications"
    assert client.post(base + '/selection', headers=headers('chaewon'),
                       json={'studentIds': ['chaewon'], 'selection': 'SELECTED'}).status_code == 403
    assert client.post('/api/v1/programs', headers=headers('chaewon'),
                       json={'title': 'x', 'category': 'CAREER', 'capacity': 1}).status_code == 403
    assert client.get('/api/v1/penalties', headers=headers('chaewon')).status_code == 403
    head = headers('career_kim')
    client.post(base + '/selection', headers=head, json={'studentIds': ['chaewon'], 'selection': 'SELECTED'})
    client.post(base + '/outcome', headers=head, json={'studentIds': ['chaewon'], 'outcome': 'COMPLETED'})
    assert client.delete(f"/api/v1/programs/{program['id']}", headers=head).status_code == 409


def test_unknown_category_and_entry_without_types_refused(client):
    assert client.post('/api/v1/programs', headers=headers('career_kim'),
                       json={'title': 'x', 'category': 'NOT_A_CODE', 'capacity': 1}).status_code == 422
    assert client.post('/api/v1/programs', headers=headers('career_kim'),
                       json={'title': 'x', 'category': 'CAREER', 'capacity': 1,
                             'roadmapEntry': 'REQUIRED'}).status_code == 422


def test_statistics_excludes_opted_out_programs(client):
    included = new_program(client, title='통계 포함')
    excluded = new_program(client, title='통계 제외', includeInStats=False)
    result = client.get('/api/v1/programs/statistics', headers=headers('career_kim'))
    assert result.status_code == 200, result.text
    ids = [p['id'] for p in result.json()['programs']]
    assert included['id'] in ids and excluded['id'] not in ids


def test_stale_program_write_is_rejected(client):
    program = new_program(client)
    body = {'title': '수정본', 'desc': '', 'category': 'CAREER', 'capacity': 5, 'manager': '검증',
            'fiscalYear': '2026', 'location': '검증실', 'sessions': 1,
            'expectedVersion': program['version']}
    assert client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'),
                      json=body).status_code == 200
    assert client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'),
                      json=body).status_code == 409
