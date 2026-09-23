"""설문지 버전 — 조립·게시·고정·잠금.

문항·영역은 사전(code_item), 설문지는 그 부품의 조립물이다. 프로그램은 개설 시점의 게시본을 붙잡고,
응답이 한 건이라도 들어온 게시본은 구성이 잠긴다. 사전에서 문항을 비활성해도 게시본은 줄지 않는다.
"""
from app.db import pool
from test_api import headers
from test_programs import apply_as, new_program
from test_program_survey import form, select_and_complete, submit

ADMIN = 'system-admin'


def forms(client, kind=None):
    response = client.get('/api/v1/system/survey-forms' + (f'?kind={kind}' if kind else ''), headers=headers(ADMIN))
    assert response.status_code == 200, response.text
    return response.json()['items']


def current(client, kind):
    return next(row for row in forms(client, kind) if row['isCurrent'])


def plan_of(row):
    return [{'areaCode': area['key'], 'items': [item['code'] for item in area['items']]} for area in row['areas']]


def draft(client, kind='COMPETENCY', memo='검증'):
    response = client.post('/api/v1/system/survey-forms', headers=headers(ADMIN),
                           json={'kind': kind, 'memo': memo, 'reason': '검증'})
    assert response.status_code == 201, response.text
    return response.json()


def save(client, row, areas, memo='검증'):
    return client.put(f"/api/v1/system/survey-forms/{row['id']}", headers=headers(ADMIN),
                      json={'expectedLockVersion': row['lockVersion'], 'memo': memo, 'areas': areas, 'reason': '검증'})


def publish(client, row):
    return client.post(f"/api/v1/system/survey-forms/{row['id']}/publish", headers=headers(ADMIN),
                       json={'expectedLockVersion': row['lockVersion'], 'reason': '검증'})


def discard(client, row):
    return client.request('DELETE', f"/api/v1/system/survey-forms/{row['id']}",
                          headers=headers(ADMIN), json={'reason': '검증'})


def test_backfilled_v1_holds_every_active_item(client):
    """103 이 현행 문항을 그대로 v1 으로 굳혔다 — 전환 전후 렌더가 같아야 한다."""
    with pool.connection() as conn:
        active = conn.execute("""SELECT count(*) AS n FROM dc.code_item i
          JOIN dc.code_item a ON a.group_code='SURVEY_AREA' AND a.code=i.payload->>'areaKey' AND a.is_active
          WHERE i.group_code='SURVEY_ITEM' AND i.is_active""").fetchone()['n']
    assert sum(len(area['items']) for row in forms(client) if row['version'] == 1 for area in row['areas']) == active
    assert {row['kind'] for row in forms(client)} == {'COMPETENCY', 'SATISFACTION'}
    assert all(row['status'] == 'PUBLISHED' and row['isCurrent'] for row in forms(client))


def test_only_administrators_manage_forms(client):
    assert client.get('/api/v1/system/survey-forms', headers=headers('career_kim')).status_code == 403
    assert client.post('/api/v1/system/survey-forms', headers=headers('career_kim'),
                       json={'kind': 'COMPETENCY', 'memo': '', 'reason': '검증'}).status_code == 403


def test_draft_copies_current_and_publishes_as_next_version(client):
    base = current(client, 'SATISFACTION')
    row = draft(client, 'SATISFACTION', '만족도 개편')
    assert row['version'] == base['version'] + 1 and row['status'] == 'DRAFT' and not row['isCurrent']
    assert plan_of(row) == plan_of(base), '초안은 현재 게시본 구성을 그대로 복사한다'
    # 갈래마다 초안은 하나뿐이다.
    assert client.post('/api/v1/system/survey-forms', headers=headers(ADMIN),
                       json={'kind': 'SATISFACTION', 'memo': '', 'reason': '검증'}).status_code == 409
    # 문항 하나를 빼고 게시하면 그때부터 그것이 현재 게시본이다.
    plan = plan_of(row)
    dropped = plan[0]['items'].pop()
    saved = save(client, row, plan)
    assert saved.status_code == 200, saved.text
    published = publish(client, saved.json())
    assert published.status_code == 200, published.text
    assert published.json()['isCurrent'] and published.json()['status'] == 'PUBLISHED'
    assert dropped not in [i['code'] for a in current(client, 'SATISFACTION')['areas'] for i in a['items']]
    assert publish(client, published.json()).status_code == 422, '이미 게시된 설문지'


def test_stale_lock_version_is_rejected(client):
    row = draft(client, 'COMPETENCY')
    assert save(client, row, plan_of(row)).status_code == 200
    assert save(client, row, plan_of(row)).status_code == 409, 'lockVersion 이 이미 올라갔다'
    assert discard(client, current(client, 'COMPETENCY')).status_code == 422, '게시본은 버릴 수 없다'
    fresh = next(item for item in forms(client, 'COMPETENCY') if item['status'] == 'DRAFT')
    assert discard(client, fresh).status_code == 204
    assert not [item for item in forms(client, 'COMPETENCY') if item['status'] == 'DRAFT']


def test_form_accepts_only_parts_that_exist_in_its_kind(client):
    row = draft(client, 'COMPETENCY')
    assert save(client, row, [{'areaCode': 'SAT_1', 'items': []}]).status_code == 422, '만족도 영역은 역량 설문지에 못 담는다'
    assert save(client, row, [{'areaCode': 'NO_SUCH_AREA', 'items': []}]).status_code == 422
    assert save(client, row, [{'areaCode': 'CAREER_1', 'items': ['CAREER_2_01']}]).status_code == 422, '소속 영역이 다르다'
    assert save(client, row, [{'areaCode': 'CAREER_1', 'items': ['NO_SUCH_ITEM']}]).status_code == 422
    assert discard(client, row).status_code == 204


def test_published_form_wins_over_the_dictionary(client):
    """게시본이 사전을 이긴다 — 문항을 비활성해도 운영 중 프로그램의 문항은 줄지 않는다."""
    program = new_program(client, competencySurvey=True, competencyAreas=['CAREER_3'], capacity=5)
    before = len(form(client, program['id'], 'PRE')['areas'][0]['items'])
    code = form(client, program['id'], 'PRE')['areas'][0]['items'][0]['code']
    with pool.connection() as conn:
        item = conn.execute("SELECT label,sort_order,payload,version FROM dc.code_item WHERE group_code='SURVEY_ITEM' AND code=%s", (code,)).fetchone()
    body = {'expectedVersion': item['version'], 'label': item['label'], 'sortOrder': item['sort_order'],
            'isActive': False, 'payload': item['payload'], 'reason': '검증'}
    assert client.put(f'/api/v1/system/code-groups/SURVEY_ITEM/items/{code}', headers=headers(ADMIN),
                      json=body).status_code == 200
    assert len(form(client, program['id'], 'PRE')['areas'][0]['items']) == before, '게시본 구성은 줄지 않는다'
    # 되돌린다 — 뒤 테스트가 이 문항을 쓴다.
    body['isActive'], body['expectedVersion'] = True, item['version'] + 1
    assert client.put(f'/api/v1/system/code-groups/SURVEY_ITEM/items/{code}', headers=headers(ADMIN),
                      json=body).status_code == 200


def test_program_pins_the_current_form_and_responses_lock_it(client):
    program = new_program(client, competencySurvey=True, competencyAreas=['CAREER_3'], capacity=5)
    with pool.connection() as conn:
        pinned = conn.execute('SELECT competency_form_id FROM dc.program WHERE id=%s',
                              (program['id'],)).fetchone()['competency_form_id']
    assert pinned == current(client, 'COMPETENCY')['id']

    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon')
    assert submit(client, program['id'], 'PRE', 4).status_code == 201

    used = next(row for row in forms(client, 'COMPETENCY') if row['id'] == pinned)
    assert used['locked'] and used['programCount'] >= 1 and used['responseCount'] >= 1
    assert save(client, used, plan_of(used)).status_code == 422, '응답이 들어온 게시본은 잠긴다'
    # 만족도 갈래는 사전·사후 응답에 묶이지 않는다.
    assert not current(client, 'SATISFACTION')['locked']


def test_new_program_follows_the_newest_published_form(client):
    old = current(client, 'COMPETENCY')
    row = draft(client, 'COMPETENCY', '역량 개편')
    plan = plan_of(row)
    plan[0]['items'] = plan[0]['items'][:1]
    published = publish(client, save(client, row, plan).json())
    assert published.status_code == 200, published.text

    program = new_program(client, competencySurvey=True, competencyAreas=[plan[0]['areaCode']], capacity=5)
    with pool.connection() as conn:
        pinned = conn.execute('SELECT competency_form_id FROM dc.program WHERE id=%s',
                              (program['id'],)).fetchone()['competency_form_id']
    assert pinned == published.json()['id'] != old['id']
    assert len(form(client, program['id'], 'PRE')['areas'][0]['items']) == 1


def test_competency_areas_freeze_after_a_pre_response(client):
    """사전 응답이 들어오면 조사 영역은 고정이다 — 바뀌면 사전·사후 짝이 깨져 향상률이 왜곡된다."""
    program = new_program(client, competencySurvey=True, competencyAreas=['CAREER_3'], capacity=5)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon')
    assert submit(client, program['id'], 'PRE', 3).status_code == 201

    def update(**patch):
        body = {'title': program['title'], 'desc': program['desc'], 'category': program['category'],
                'capacity': program['capacity'], 'startDate': program['startDate'], 'endDate': program['endDate'],
                'manager': program['manager'], 'fiscalYear': program['fiscalYear'], 'location': program['location'],
                'sessions': program['sessions'], 'competencySurvey': True, 'competencyAreas': ['CAREER_3'],
                'expectedVersion': program['version'], **patch}
        return client.put(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'), json=body)

    assert update(competencyAreas=['CAREER_3', 'JOB_1']).status_code == 422
    assert update(competencyAreas=[]).status_code == 422
    assert update(location='검증실2').status_code == 200, '영역을 그대로 두면 다른 수정은 된다'


def test_edit_screen_gets_the_form_the_program_pinned(client):
    """수정 화면이 최신이 아니라 붙잡은 버전의 영역을 그리려면 둘이 필요하다 —
    프로그램 DTO 의 pin 과 /metadata 가 함께 싣는 옛 게시본. 최신만 실으면 이미 고른 영역이
    화면에서 사라지거나, 새 버전의 영역을 골랐다 저장에서 422 를 맞는다."""
    pinned = current(client, 'COMPETENCY')
    area = pinned['areas'][0]['key']
    program = new_program(client, competencySurvey=True, competencyAreas=[area], capacity=5)

    row = draft(client, 'COMPETENCY', '영역 개편')
    plan = plan_of(row)[1:]                      # 붙잡힌 영역을 뺀 새 버전
    published = publish(client, save(client, row, plan).json()).json()
    assert area not in [part['areaCode'] for part in plan]

    detail = client.get(f"/api/v1/programs/{program['id']}", headers=headers('career_kim'))
    assert detail.status_code == 200, detail.text
    assert detail.json()['competencyFormId'] == pinned['id'] != published['id']

    forms_now = client.get('/api/v1/metadata', headers=headers('career_kim')).json()['surveyForms']
    mine = next(form_row for form_row in forms_now if form_row['id'] == pinned['id'])
    assert not mine['isCurrent']
    assert area in [entry['key'] for entry in mine['areas']], '붙잡은 게시본이 그대로 실려야 화면이 그 영역을 그린다'
    assert next(form_row for form_row in forms_now if form_row['id'] == published['id'])['isCurrent']
