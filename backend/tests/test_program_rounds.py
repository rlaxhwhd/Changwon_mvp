"""차수 — 2차부터 dc.program_round 에 두고, 학생은 차수 하나를 골라 신청한다. 정원·선착순은 차수마다 따로다."""
from test_api import headers
from test_programs import SERVER_OWNED, apply_as, new_program


def round_body(round_no, **overrides):
    body = {'round': round_no, 'startDate': '2026-01-01', 'endDate': '2099-12-31', 'location': f'{round_no}차 강의실',
            'capacity': 2, 'selectionCapacity': 1, 'selectionMethod': 'FIRST_COME'}
    body.update(overrides)
    return body


def save(client, program, **changes):
    body = {k: v for k, v in program.items() if k not in SERVER_OWNED}
    return client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'),
                      json={**body, **changes, 'expectedVersion': program['version']})


def test_rounds_roundtrip_and_sessions_follow_round_count(client):
    p = new_program(client, sessions=7, rounds=[round_body(2), round_body(3, selectionMethod='REVIEW')])
    assert p['sessions'] == 3
    assert [(r['round'], r['location'], r['selectionMethod'], r['applyCount'], r['createdBy']) for r in p['rounds']] == [
        (2, '2차 강의실', 'FIRST_COME', 0, '김진로'), (3, '3차 강의실', 'REVIEW', 0, '김진로')]
    # 차수를 빼고 보내는 옛 클라이언트의 수정은 차수를 지우지 않는다.
    body = {k: v for k, v in p.items() if k not in SERVER_OWNED and k != 'rounds'}
    kept = client.put(f"/api/v1/programs/{p['id']}", headers=headers('career_kim'),
                      json={**body, 'title': '제목만 수정', 'expectedVersion': p['version']})
    assert kept.status_code == 200, kept.text
    assert kept.json()['sessions'] == 3 and len(kept.json()['rounds']) == 2
    removed = save(client, kept.json(), rounds=[kept.json()['rounds'][0]])
    assert removed.status_code == 200, removed.text
    assert removed.json()['sessions'] == 2 and [r['round'] for r in removed.json()['rounds']] == [2]


def test_student_applies_to_one_round_with_its_own_first_come_limit(client):
    # 1차는 심사, 2차는 선착순 1명 — 차수마다 판정이 따로다.
    p = new_program(client, capacity=5, selectionMethod='REVIEW', rounds=[round_body(2)])
    assert apply_as(client, 'chaewon', p['id']).json()['selectionStatus'] == 'PENDING'
    second = apply_as(client, 'changwon', p['id'], round=2)
    assert second.status_code == 201, second.text
    assert second.json()['round'] == 2 and second.json()['selectionStatus'] == 'SELECTED'
    detail = client.get(f"/api/v1/programs/{p['id']}", headers=headers('career_kim')).json()
    assert {a['studentId']: (a['round'], a['selectionStatus']) for a in detail['applicants']} == {
        'chaewon': (1, 'PENDING'), 'changwon': (2, 'SELECTED')}
    assert detail['rounds'][0]['applyCount'] == 1 and detail['rounds'][0]['selectedCount'] == 1
    # 한 공고에는 한 번만 신청한다 — 다른 차수로 다시 신청할 수 없다.
    assert apply_as(client, 'chaewon', p['id'], round=2).status_code == 409
    assert apply_as(client, 'career_kim', p['id'], studentId='jiwoo', round=9).status_code == 404


def test_round_window_and_selection_limit_are_per_round(client):
    p = new_program(client, capacity=5, rounds=[round_body(2, startDate='2099-01-01'),
                                                round_body(3, capacity=2, selectionMethod='REVIEW', selectionCapacity=1)])
    assert apply_as(client, 'chaewon', p['id'], round=2).status_code == 409
    assert apply_as(client, 'chaewon', p['id'], round=3).status_code == 201
    assert apply_as(client, 'changwon', p['id'], round=3).status_code == 201
    over = client.post(f"/api/v1/programs/{p['id']}/applications/selection", headers=headers('career_kim'),
                       json={'studentIds': ['chaewon', 'changwon'], 'selection': 'SELECTED'})
    assert over.status_code == 409 and '3차' in over.json()['detail']


def test_round_with_applicants_cannot_be_deleted_or_shrunk(client):
    p = new_program(client, capacity=5, rounds=[round_body(2, capacity=3, selectionCapacity=2)])
    assert apply_as(client, 'chaewon', p['id'], round=2).status_code == 201
    assert apply_as(client, 'changwon', p['id'], round=2).status_code == 201
    current = client.get(f"/api/v1/programs/{p['id']}", headers=headers('career_kim')).json()
    assert save(client, current, rounds=[]).status_code == 409
    assert save(client, current, rounds=[round_body(2, capacity=3, selectionCapacity=1)]).status_code == 422


def test_explicit_switch_to_first_come_selects_that_rounds_waiting_only(client):
    p = new_program(client, capacity=5, selectionMethod='REVIEW',
                    rounds=[round_body(2, selectionMethod='REVIEW', selectionCapacity=1)])
    assert apply_as(client, 'chaewon', p['id']).json()['selectionStatus'] == 'PENDING'
    assert apply_as(client, 'changwon', p['id'], round=2).json()['selectionStatus'] == 'PENDING'
    current = client.get(f"/api/v1/programs/{p['id']}", headers=headers('career_kim')).json()
    switched = save(client, current, rounds=[round_body(2, selectionMethod='FIRST_COME', selectionCapacity=1)])
    assert switched.status_code == 200, switched.text
    states = {a['studentId']: a['selectionStatus'] for a in switched.json()['applicants']}
    assert states == {'chaewon': 'PENDING', 'changwon': 'SELECTED'}
