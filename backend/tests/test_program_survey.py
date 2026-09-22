from datetime import date, timedelta

from app.db import pool
from test_api import headers
from test_programs import apply_as, new_program

AREAS = ['CAREER_3', 'JOB_1']  # 진로 설계·의사결정 4문항 + 직무이해·산업이해 4문항


def select_and_complete(client, program_id, student, complete=False):
    body = {'studentIds': [student], 'selection': 'SELECTED', 'reason': '검증'}
    assert client.post(f'/api/v1/programs/{program_id}/applications/selection', headers=headers('career_kim'), json=body).status_code == 200
    if complete:
        body = {'studentIds': [student], 'outcome': 'COMPLETED', 'absencePoints': 0, 'reason': '검증'}
        assert client.post(f'/api/v1/programs/{program_id}/applications/outcome', headers=headers('career_kim'), json=body).status_code == 200


def form(client, program_id, phase, student='chaewon'):
    response = client.get(f'/api/v1/programs/{program_id}/survey/{phase}', headers=headers(student))
    assert response.status_code == 200, response.text
    return response.json()


def submit(client, program_id, phase, value, student='chaewon'):
    codes = [i['code'] for a in form(client, program_id, phase, student)['areas'] for i in a['items']]
    return client.post(f'/api/v1/programs/{program_id}/survey/{phase}', headers=headers(student),
                       json={'answers': {c: value for c in codes}})


def test_items_come_from_code_management_and_follow_selected_areas(client):
    future = (date.today() + timedelta(days=30)).isoformat()
    program = new_program(client, competencySurvey=True, competencyAreas=AREAS, runStartDate=future)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    data = form(client, program['id'], 'PRE')
    assert data['open'] is False and '선발' in data['reason']
    assert [a['key'] for a in data['areas']] == AREAS
    assert [a['label'] for a in data['areas']] == ['진로 설계·의사결정 역량', '직무이해·산업이해 역량']
    assert [len(a['items']) for a in data['areas']] == [4, 4]
    assert data['areas'][0]['items'][0]['prompt'].startswith('나는 나의 적성과 직업 전망')
    assert all(i['value'] is None for a in data['areas'] for i in a['items'])
    # 문항이 코드관리에 있다 — 66문항 15영역이 시드됐다.
    with pool.connection() as conn:
        counts = conn.execute('''SELECT count(*) FILTER(WHERE group_code='SURVEY_AREA') AS areas,
          count(*) FILTER(WHERE group_code='SURVEY_ITEM') AS items FROM dc.code_item''').fetchone()
    assert (counts['areas'], counts['items']) == (15, 66)


def test_pre_window_closes_at_run_start_and_post_opens_after_completion(client):
    future = (date.today() + timedelta(days=30)).isoformat()
    program = new_program(client, competencySurvey=True, competencyAreas=AREAS, runStartDate=future)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    assert submit(client, program['id'], 'PRE', 3).status_code == 409  # 선발 전
    select_and_complete(client, program['id'], 'chaewon')
    assert form(client, program['id'], 'PRE')['open'] is True
    assert form(client, program['id'], 'POST')['open'] is False
    # 빠진 문항·범위 밖 값은 거부
    partial = client.post(f"/api/v1/programs/{program['id']}/survey/PRE", headers=headers('chaewon'), json={'answers': {'CAREER_3_01': 3}})
    assert partial.status_code == 422
    codes = [i['code'] for a in form(client, program['id'], 'PRE')['areas'] for i in a['items']]
    bad = client.post(f"/api/v1/programs/{program['id']}/survey/PRE", headers=headers('chaewon'), json={'answers': {c: 6 for c in codes}})
    assert bad.status_code == 422
    assert submit(client, program['id'], 'PRE', 2).status_code == 201
    assert submit(client, program['id'], 'PRE', 2).status_code == 409  # 1건만
    saved = form(client, program['id'], 'PRE')
    assert saved['open'] is False and saved['submittedAt'] and all(i['value'] == 2 for a in saved['areas'] for i in a['items'])
    # 운영 시작일이 지나면 사전은 닫힌다 (제출 전인 다른 학생 기준)
    assert apply_as(client, 'changwon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'changwon')
    with pool.connection() as conn:
        conn.execute('UPDATE dc.program SET run_start=current_date WHERE id=%s', (program['id'],))
    closed = form(client, program['id'], 'PRE', 'changwon')
    assert closed['open'] is False and '시작' in closed['reason']
    # 수료 후 사후가 열린다
    select_and_complete(client, program['id'], 'chaewon', complete=True)
    assert form(client, program['id'], 'POST')['open'] is True
    assert submit(client, program['id'], 'POST', 4).status_code == 201
    # 교직원은 응답할 수 없고, 신청자 목록에 O/X 가 실린다
    assert client.get(f"/api/v1/programs/{program['id']}/survey/PRE", headers=headers('career_kim')).status_code == 403
    detail = client.get(f"/api/v1/programs/{program['id']}", headers=headers('career_kim')).json()
    rows = {a['studentId']: a for a in detail['applicants']}
    assert (rows['chaewon']['surveyPre'], rows['chaewon']['surveyPost'], rows['chaewon']['surveySatisfaction']) == (True, True, False)
    assert (rows['changwon']['surveyPre'], rows['changwon']['surveyPost']) == (False, False)


def test_stats_use_paired_responses_only(client):
    future = (date.today() + timedelta(days=30)).isoformat()
    program = new_program(client, competencySurvey=True, competencyAreas=AREAS, runStartDate=future, capacity=3)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    assert apply_as(client, 'changwon', program['id']).status_code == 201
    # jiwoo 는 로드맵 게이트에 걸릴 수 있어 교직원이 대신 신청한다.
    assert apply_as(client, 'career_kim', program['id'], studentId='jiwoo').status_code == 201
    for student in ('chaewon', 'changwon', 'jiwoo'):
        select_and_complete(client, program['id'], student)
    assert submit(client, program['id'], 'PRE', 2, 'chaewon').status_code == 201
    assert submit(client, program['id'], 'PRE', 4, 'changwon').status_code == 201
    # jiwoo 는 사전을 건너뛴다 → 통계 짝에서 빠진다
    for student in ('chaewon', 'changwon', 'jiwoo'):
        select_and_complete(client, program['id'], student, complete=True)
    assert submit(client, program['id'], 'POST', 3, 'chaewon').status_code == 201
    assert submit(client, program['id'], 'POST', 5, 'changwon').status_code == 201
    assert submit(client, program['id'], 'POST', 5, 'jiwoo').status_code == 201
    assert client.get(f"/api/v1/programs/{program['id']}/survey/stats", headers=headers('chaewon')).status_code == 403
    stats = client.get(f"/api/v1/programs/{program['id']}/survey/stats", headers=headers('career_kim')).json()
    assert stats['participation'] == {'selected': 3, 'completed': 3, 'pre': 2, 'post': 3, 'satisfaction': 0, 'paired': 2}
    # 사전 평균 (2+4)/2=3, 사후 (3+5)/2=4 → (4-3)/3×100 = 33.3
    assert stats['total'] == {'preAvg': 3.0, 'postAvg': 4.0, 'improvement': 33.3, 'n': 16}
    assert [a['key'] for a in stats['areas']] == AREAS
    assert stats['areas'][0]['n'] == 8 and stats['areas'][0]['improvement'] == 33.3
    item = stats['areas'][0]['items'][0]
    assert {'code', 'prompt', 'preAvg', 'postAvg', 'improvement', 'n'} <= item.keys() and 'value' not in item
    assert item['n'] == 2 and item['improvement'] == 33.3


def test_selection_and_completion_notify_student_once(client):
    future = (date.today() + timedelta(days=30)).isoformat()
    program = new_program(client, competencySurvey=True, competencyAreas=AREAS, runStartDate=future)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon')
    select_and_complete(client, program['id'], 'chaewon')  # 재선발해도 알림은 1건
    items = client.get('/api/v1/notifications', headers=headers('chaewon')).json()['items']
    pre = [n for n in items if n['to'] == f"/mypage/programs/{program['id']}/survey/PRE"]
    assert len(pre) == 1 and pre[0]['tone'] == 'program' and '사전 역량 진단' in pre[0]['title'] and program['title'] in pre[0]['title']
    select_and_complete(client, program['id'], 'chaewon', complete=True)
    items = client.get('/api/v1/notifications', headers=headers('chaewon')).json()['items']
    routes = [n['to'] for n in items if n['to'].startswith(f"/mypage/programs/{program['id']}/survey/")]
    # 만족도 문항이 아직 없으므로 사후만 알린다
    assert sorted(routes) == sorted([f"/mypage/programs/{program['id']}/survey/PRE", f"/mypage/programs/{program['id']}/survey/POST"])
    # 조사를 실시하지 않는 프로그램은 알리지 않는다
    silent = new_program(client, competencySurvey=False, competencyAreas=[])
    assert apply_as(client, 'changwon', silent['id']).status_code == 201
    select_and_complete(client, silent['id'], 'changwon', complete=True)
    items = client.get('/api/v1/notifications', headers=headers('changwon')).json()['items']
    assert not [n for n in items if silent['id'] in n['to']]


def test_survey_disabled_program_and_unknown_phase(client):
    program = new_program(client, competencySurvey=False, competencyAreas=[])
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon', complete=True)
    data = form(client, program['id'], 'POST')
    assert data['open'] is False and data['areas'] == [] and '실시하지 않는' in data['reason']
    assert client.get(f"/api/v1/programs/{program['id']}/survey/MID", headers=headers('chaewon')).status_code == 404
    stats = client.get(f"/api/v1/programs/{program['id']}/survey/stats", headers=headers('career_kim')).json()
    assert stats['competencySurvey'] is False and stats['total']['n'] == 0 and stats['areas'] == []


def cells(sheet_xml):
    import re
    return [re.findall(r'<t xml:space="preserve">(.*?)</t>', row) for row in re.findall(r'<row>(.*?)</row>', sheet_xml)]


def test_export_pre_post_workbooks_follow_template_and_blank_unselected_areas(client):
    from io import BytesIO
    from zipfile import ZipFile
    future = (date.today() + timedelta(days=30)).isoformat()
    program = new_program(client, competencySurvey=True, competencyAreas=AREAS, runStartDate=future,
                          runEndDate=future, capacity=2)
    assert apply_as(client, 'chaewon', program['id']).status_code == 201
    select_and_complete(client, program['id'], 'chaewon')
    assert submit(client, program['id'], 'PRE', 2).status_code == 201
    select_and_complete(client, program['id'], 'chaewon', complete=True)
    assert submit(client, program['id'], 'POST', 5).status_code == 201
    url = f"/api/v1/programs/{program['id']}/survey/PRE/export.xlsx"
    assert client.get(url, headers=headers('chaewon')).status_code == 403
    assert client.get(f"/api/v1/programs/{program['id']}/survey/SATISFACTION/export.xlsx", headers=headers('career_kim')).status_code == 404
    response = client.get(url, headers=headers('career_kim'))
    assert response.status_code == 200, response.text
    assert response.headers['content-type'].startswith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    assert '_%EC%82%AC%EC%A0%84%20%EA%B2%B0%EA%B3%BC.xlsx' in response.headers['content-disposition']
    with ZipFile(BytesIO(response.content)) as book:
        workbook = book.read('xl/workbook.xml').decode()
        # CAREER_3 + JOB_1 → 진로역량·직무역량 두 장, 취업역량은 없다
        assert 'name="진로역량"' in workbook and 'name="직무역량"' in workbook and '취업역량' not in workbook
        career, job = cells(book.read('xl/worksheets/sheet1.xml').decode()), cells(book.read('xl/worksheets/sheet2.xml').decode())
    assert career[0] == ['연번', '프로그램명', '운영기간', '소속', '학년', '성별'] + [f'질문{k}' for k in range(1, 23)]
    assert job[0][6:] == [f'질문{k}' for k in range(1, 24)]
    assert len(career) == 2 and career[1][:3] == ['1', program['title'], f'{future} ~ {future}']
    assert career[1][3].endswith('대학 - 컴퓨터공학과') and career[1][4:6] == ['3', '없음']  # 소속 = 대학 - 학과, 성별은 학사 미러에 없으면 없음
    # 진로역량 설문지: CAREER_1·2 (10문항) 빈칸, CAREER_3 (질문11~14) 2점, 나머지 빈칸
    assert career[1][6:] == [''] * 10 + ['2'] * 4 + [''] * 8
    assert job[1][6:] == ['2'] * 4 + [''] * 19
    post = client.get(f"/api/v1/programs/{program['id']}/survey/POST/export.xlsx", headers=headers('career_kim'))
    assert cells(ZipFile(BytesIO(post.content)).read('xl/worksheets/sheet1.xml').decode())[1][6:] == [''] * 10 + ['5'] * 4 + [''] * 8
    plain = new_program(client, capacity=2)
    assert client.get(f"/api/v1/programs/{plain['id']}/survey/PRE/export.xlsx", headers=headers('career_kim')).status_code == 409
