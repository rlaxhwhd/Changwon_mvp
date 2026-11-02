"""취업예측분석시스템(/admin/forecast) 취업 현황 대장 — 151."""
import pytest

from app.employment_report import month_cell
from app.xlsx_export import read_rows, workbook_sheets
from test_api import headers
from test_psych_referrals import db  # noqa: F401

URL = '/api/v1/forecast/employments'
ADMIN = headers('system-admin')


@pytest.fixture
def grads(db):
    for index in (1, 2):
        db.execute('''INSERT INTO academic.v_usr_inf
          (intg_uid,login_id,usr_nm,user_ty_cd,hofc_sta_cd,stu_schgr,orgz_nm,sex,out_dt)
          VALUES(%s,%s,%s,'1101','0005','4','Forecast Major','0001','20260220')''',
          (f'forecast-test-{index}', f'99887766{index}', f'Forecast Grad {index}'))
    return ['998877661', '998877662']


def body(student_no, **changes):
    data = dict(surveyYear=2026, studentNo=student_no, graduationMonth='2027-02', companyName='Test Co',
                duty='Engineering', companyTypeCode='GENERAL', regionCode='GYEONGNAM', employedMonth='2026-10')
    data.update(changes)
    return data


def xlsx(rows):
    output = workbook_sheets([('s', rows[0], rows[1:])])
    try:
        return output.read()
    finally:
        output.close()


def test_admin_only(client, db, grads):
    assert client.get(URL, headers=headers('career_kim')).status_code == 403
    assert client.post(URL, headers=headers('career_kim'), json=body(grads[0])).status_code == 403


def test_register_list_update_delete(client, db, grads):
    found = client.get('/api/v1/forecast/students', headers=ADMIN, params={'q': '99887766'}).json()['items']
    assert {r['studentNo'] for r in found} == set(grads)
    assert found[0]['sex'] == '남' and found[0]['graduationMonth'] == '2026-02' and found[0]['status'] == '졸업'
    assert {r['studentNo'] for r in client.get('/api/v1/forecast/students', headers=ADMIN, params={'q': 'Forecast Grad'}).json()['items']} == set(grads)

    created = client.post(URL, headers=ADMIN, json=body(grads[0]))
    assert created.status_code == 200, created.text
    row = created.json()
    assert row['name'] == 'Forecast Grad 1' and row['deptName'] == 'Forecast Major' and row['sex'] == '남'
    assert row['companyType'] == '일반기업' and row['region'] == '경남' and row['writer']
    assert client.post(URL, headers=ADMIN, json=body(grads[0])).status_code == 409
    assert client.post(URL, headers=ADMIN, json=body(grads[0], regionCode='NOPE')).status_code == 422
    assert client.post(URL, headers=ADMIN, json=body('000000000')).status_code == 422
    # '미확인' 버튼 값도 일반 텍스트로 저장되고 나중에 수정할 수 있다.
    unknown = client.post(URL, headers=ADMIN, json=body(grads[1], companyName='미확인', duty='미확인', regionCode='NATIONWIDE')).json()
    assert unknown['region'] == '전국'
    updated = client.put(f'{URL}/{unknown["id"]}', headers=ADMIN, json=body(grads[1], companyName='Real Co', regionCode='OVERSEAS'))
    assert updated.status_code == 200 and updated.json()['companyName'] == 'Real Co' and updated.json()['region'] == '해외'

    listed = client.get(URL, headers=ADMIN, params={'field': 'studentNo', 'q': '99887766'}).json()
    assert listed['totalCount'] == 2 and listed['items'][0]['id'] == unknown['id']
    assert client.get(URL, headers=ADMIN, params={'field': 'sex', 'q': '여', 'surveyYear': 2026}).json()['totalCount'] == 0
    assert client.get(URL, headers=ADMIN, params={'graduationFrom': '2027-03'}).json()['totalCount'] == 0
    assert client.get(URL, headers=ADMIN, params={'graduationFrom': '2027-03', 'graduationTo': '2027-01'}).status_code == 422
    assert 2026 in client.get('/api/v1/forecast/options', headers=ADMIN).json()['surveyYears']

    assert client.post(URL+'/delete', headers=ADMIN, json={'ids': [row['id']]}).json() == {'deleted': 1}
    assert client.get(URL, headers=ADMIN, params={'field': 'studentNo', 'q': '99887766'}).json()['totalCount'] == 1
    assert db.execute("SELECT count(*) n FROM dc.admin_event WHERE entity='employment_report' AND entity_id=%s", (str(row['id']),)).fetchone()['n'] == 2


def test_excel_round_trip_and_all_or_nothing_upload(client, db, grads):
    client.post(URL, headers=ADMIN, json=body(grads[0]))
    exported = client.get(URL+'/export', headers=ADMIN, params={'field': 'studentNo', 'q': grads[0]})
    assert exported.status_code == 200
    rows = read_rows(exported.content)
    assert rows[0][:5] == ['조사년도', '졸업년월', '단과대학', '학과(전공)', '학번'] and rows[1][4] == grads[0]
    assert rows[1][1] == '2027.02' and rows[1][9] == '2026.10'

    # 내려받은 파일을 고쳐 다시 올리면 같은 조사년도·학번은 갱신, 새 학번은 추가된다.
    new = list(rows[1]); new[4] = grads[1]
    rows[1][7] = 'Changed Co'
    uploaded = client.post(URL+'/upload', headers=ADMIN, content=xlsx([rows[0], rows[1], new]))
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json() == {'inserted': 1, 'updated': 1}
    items = client.get(URL, headers=ADMIN, params={'field': 'studentNo', 'q': '99887766'}).json()['items']
    assert {r['companyName'] for r in items} == {'Changed Co', 'Test Co'}

    bad = list(new); bad[10] = '없는분류'
    rejected = client.post(URL+'/upload', headers=ADMIN, content=xlsx([rows[0], rows[1], bad, bad]))
    assert rejected.status_code == 422
    detail = rejected.json()['detail']
    assert [e['row'] for e in detail['errors']] == [3, 4] and '기업분류' in detail['errors'][0]['message']
    assert client.post(URL+'/upload', headers=ADMIN, content=b'not a zip').status_code == 422


@pytest.mark.parametrize('text,expected', [
    ('2026.10', '2026-10'), ('2026.1', '2026-10'), ('2026.01', '2026-01'), ('2026-03', '2026-03'),
    ('202611', '2026-11'), ('2026년 9월', '2026-09'), ('46296', '2026-10'), ('', None),
])
def test_month_cell(text, expected):
    assert month_cell(text) == expected


@pytest.mark.parametrize('text', ['2026', '2026.13', 'soon'])
def test_month_cell_rejects(text):
    with pytest.raises(ValueError):
        month_cell(text)
