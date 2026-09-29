"""프로그램별 게시 설문 버전 선택. 모든 변경은 격리 DB 트랜잭션에서 되돌린다."""
import pytest

from app.db import connection, pool
from app.main import app
from test_api import headers
from test_programs import new_program, apply_as, SERVER_OWNED
from test_program_survey import select_and_complete, submit, form
from test_survey_forms import current, draft, plan_of, publish, save


@pytest.fixture(autouse=True)
def rollback_selection_test(client):
    with pool.connection() as conn, conn.transaction(force_rollback=True):
        app.dependency_overrides[connection] = lambda: conn
        try:
            yield
        finally:
            app.dependency_overrides.pop(connection, None)


def test_create_can_choose_an_older_published_version(client):
    old = current(client, 'COMPETENCY')
    pending = draft(client)
    newer = publish(client, pending)
    assert newer.status_code == 200, newer.text
    area = old['areas'][0]['key']
    selected = new_program(client, competencySurvey=True, competencyAreas=[area], competencyFormId=old['id'])
    assert selected['competencyFormId'] == old['id']
    default = new_program(client)
    assert default['competencyFormId'] == newer.json()['id']


def test_rejects_draft_wrong_kind_missing_and_unknown_versions(client):
    pending = draft(client)
    satisfaction = current(client, 'SATISFACTION')
    for form_id in (pending['id'], satisfaction['id'], 999999999, None):
        response = client.post('/api/v1/programs', headers=headers('career_kim'), json={
            'title': '버전 유효성 검증', 'category': 'CAREER', 'capacity': 5,
            'competencySurvey': True, 'competencyFormId': form_id,
        })
        assert response.status_code == 422, response.text
    none = new_program(client, competencySurvey=False, satisfactionSurvey=False,
                       competencyFormId=None, satisfactionFormId=None)
    assert none['competencyFormId'] is None and none['satisfactionFormId'] is None


def test_selected_version_controls_allowed_areas(client):
    old = current(client, 'COMPETENCY')
    pending = draft(client)
    plan = plan_of(pending)
    removed = plan.pop(0)['areaCode']
    newer = publish(client, save(client, pending, plan).json()).json()
    body = {'title': '조사 영역 검증', 'category': 'CAREER', 'capacity': 5,
            'competencySurvey': True, 'competencyAreas': [removed]}
    assert client.post('/api/v1/programs', headers=headers('career_kim'),
                       json={**body, 'competencyFormId': newer['id']}).status_code == 422
    assert client.post('/api/v1/programs', headers=headers('career_kim'),
                       json={**body, 'competencyFormId': old['id']}).status_code == 201


def update(client, program, **patch):
    body = {key: value for key, value in program.items() if key not in SERVER_OWNED}
    return client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'),
                      json={**body, 'expectedVersion': program['version'], **patch})


def test_versions_can_change_until_their_own_first_response(client):
    competency = current(client, 'COMPETENCY')
    satisfaction = current(client, 'SATISFACTION')
    next_comp = publish(client, draft(client)).json()
    next_sat = publish(client, draft(client, 'SATISFACTION')).json()
    area = competency['areas'][0]['key']
    program = new_program(client, competencySurvey=True, satisfactionSurvey=True, competencyAreas=[area],
                          competencyFormId=competency['id'], satisfactionFormId=satisfaction['id'])
    switched = update(client, program, competencyFormId=next_comp['id'])
    assert switched.status_code == 200, switched.text
    assert switched.json()['competencyFormId'] == next_comp['id']
    assert update(client, program, competencyFormId=competency['id']).status_code == 409
    program = switched.json()
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon')
    assert submit(client, program['id'], 'PRE', 3).status_code == 201
    locks = client.get(f"/api/v1/programs/{program['id']}/survey-locks", headers=headers('career_kim'))
    assert locks.json() == {'competency': True, 'satisfaction': False}
    assert client.get(f"/api/v1/programs/{program['id']}/survey-locks", headers=headers('chaewon')).status_code == 403
    assert update(client, program, competencyFormId=competency['id']).status_code == 422
    assert update(client, program, competencyFormId=None, competencySurvey=False).status_code == 422
    changed_sat = update(client, program, satisfactionFormId=next_sat['id'])
    assert changed_sat.status_code == 200, changed_sat.text
    program = changed_sat.json()
    select_and_complete(client, program['id'], 'chaewon', complete=True)
    before = form(client, program['id'], 'PRE')
    after = form(client, program['id'], 'POST')
    assert [i['code'] for a in before['areas'] for i in a['items']] == [i['code'] for a in after['areas'] for i in a['items']]
    satisfaction_form = form(client, program['id'], 'SATISFACTION')
    answers = {i['code']: 4 for a in satisfaction_form['areas'] for i in a['items'] if i['kind'] == 'SCALE'}
    response = client.post(f"/api/v1/programs/{program['id']}/survey/SATISFACTION",
                           headers=headers('chaewon'), json={'answers': answers})
    assert response.status_code == 201, response.text
    assert update(client, program, satisfactionFormId=satisfaction['id']).status_code == 422
    assert update(client, program, location='다른 강의실').status_code == 200


def test_post_response_also_locks_competency_version(client):
    old = current(client, 'COMPETENCY')
    newer = publish(client, draft(client)).json()
    program = new_program(client, competencySurvey=True, competencyAreas=[old['areas'][0]['key']],
                          competencyFormId=old['id'])
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon', complete=True)
    assert submit(client, program['id'], 'POST', 3).status_code == 201
    assert update(client, program, competencyFormId=newer['id']).status_code == 422


def test_changing_version_revalidates_previously_selected_areas(client):
    old = current(client, 'COMPETENCY')
    pending = draft(client)
    plan = plan_of(pending)
    removed = plan.pop(0)['areaCode']
    newer = publish(client, save(client, pending, plan).json()).json()
    program = new_program(client, competencySurvey=True, competencyAreas=[removed], competencyFormId=old['id'])
    assert update(client, program, competencyFormId=newer['id']).status_code == 422
    changed = update(client, program, competencyFormId=newer['id'], competencyAreas=[plan[0]['areaCode']])
    assert changed.status_code == 200, changed.text
