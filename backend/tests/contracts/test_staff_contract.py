import json
from pathlib import Path

from contracts.contract_assertions import assert_same_json_shape
from app.staff import public_professors
from test_api import headers

ROOT = Path(__file__).resolve().parents[3]


def test_departments_contract(client):
    fixture = json.loads((ROOT / 'backend/seeds/admin/departments.seed.json').read_text(encoding='utf-8'))
    response = client.get('/api/v1/departments', headers=headers('chaewon'))
    assert response.status_code == 200, response.text
    assert_same_json_shape(fixture[0], response.json()[0])


def test_professor_directory_contract_and_minimal_exposure(client):
    fixture = json.loads((ROOT / 'backend/seeds/v2/professors.seed.json').read_text(encoding='utf-8'))
    expected_professor = next(iter(fixture[0]['divisions'].values()))[0]
    response = client.get('/api/v1/staff?role=professor&groupBy=college', headers=headers('chaewon'))
    assert response.status_code == 200, response.text
    professors = [professor for group in response.json() for division in group['divisions'].values() for professor in division]
    actual = next(professor for professor in professors if professor['id'] == expected_professor['id'])
    assert_same_json_shape({**expected_professor, 'accept': True}, actual)
    assert 'email' not in actual and 'empNo' not in actual

    flat_response = client.get('/api/v1/staff?role=professor', headers=headers('chaewon'))
    assert flat_response.status_code == 200, flat_response.text
    flat = next(professor for professor in flat_response.json() if professor['id'] == expected_professor['id'])
    assert flat['role'] == 'professor'
    assert flat['dept'] == next(iter(fixture[0]['divisions']))
    assert 'email' not in flat and 'empNo' not in flat


def test_professor_directory_keeps_each_active_organization_visible():
    class FakeResult:
        def fetchall(self):
            profile = {'title': '교수', 'major': '융합전공', 'room': '101호'}
            return [
                {'intg_uid': 'staff:multi', 'alias': 'multi-1', 'name': '다학과', 'profile': profile,
                 'college_name': '공과대학', 'dept_name': '컴퓨터공학과'},
                {'intg_uid': 'staff:multi', 'alias': 'multi-1', 'name': '다학과', 'profile': profile,
                 'college_name': '메카트로닉스대학', 'dept_name': '기계공학과'},
            ]

    class FakeConnection:
        def execute(self, _query):
            return FakeResult()

    groups = public_professors(FakeConnection())
    locations = {(group['name'], division, professor['id'])
                 for group in groups
                 for division, professors in group['divisions'].items()
                 for professor in professors}
    assert locations == {
        ('공과대학', '컴퓨터공학과', 'multi-1'),
        ('메카트로닉스대학', '기계공학과', 'multi-1'),
    }


def test_staff_detail_and_student_denial(client):
    fixture = json.loads((ROOT / 'backend/seeds/admin/professors/cse-1.json').read_text(encoding='utf-8'))
    groups = json.loads((ROOT / 'backend/seeds/v2/professors.seed.json').read_text(encoding='utf-8'))
    directory = next(professor for group in groups for division in group['divisions'].values()
                     for professor in division if professor['id'] == 'cse-1')
    response = client.get('/api/v1/staff/cse-1', headers=headers('career_kim'))
    assert response.status_code == 200, response.text
    actual = response.json()
    assignment_shape = {'id': '', 'collegeCode': '', 'deptCode': '', 'collegeName': '', 'deptName': '',
                        'roleCode': '', 'validFrom': '', 'validTo': None, 'isActive': True}
    expected = {**directory, **fixture, 'version': actual['version'],
                'orgAssignments': [assignment_shape for _ in actual['orgAssignments']],
                'counselProfile': {'accept': True, 'officeHours': '', 'intro': ''}}
    assert_same_json_shape(expected, actual)
    denied = client.get('/api/v1/staff/cse-1', headers=headers('chaewon'))
    assert denied.status_code == 403


def test_professor_profile_optimistic_lock_and_ownership(client):
    detail = client.get('/api/v1/staff/cse-1', headers=headers('cse-1')).json()
    body = {'expectedVersion': detail['version'], **detail['counselProfile']}
    saved = client.put('/api/v1/staff/cse-1/profile', headers=headers('cse-1'), json=body)
    assert saved.status_code == 200, saved.text
    assert_same_json_shape({'version': 1}, saved.json())
    stale = client.put('/api/v1/staff/cse-1/profile', headers=headers('cse-1'), json=body)
    assert stale.status_code == 409
    assert stale.json()['detail']['code'] == 'VERSION_CONFLICT'
    denied = client.put('/api/v1/staff/cse-1/profile', headers=headers('biz-1'), json={**body, 'expectedVersion': saved.json()['version']})
    assert denied.status_code in (403, 404)
