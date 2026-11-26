"""0021 학사 전산원 DC_V_* 전환 — 화면이 읽는 키·값 도메인 계약.

키 집합은 전환 전과 같고(추가만 허용된 곳은 명시), 값은 학사 원값 도메인이다:
성별 sexCode '0'/'1'(라벨 남자·여자·없음), academicLevel 은 '학부'|'대학원' 두 값, 학적 0003 수료·0004 제적.
"""
import json
import re
from pathlib import Path

from contracts.contract_assertions import assert_same_json_shape
from academic_test_support import add_academic_dept, add_academic_user
from test_api import headers
from test_psych_referrals import db  # noqa: F401

ROOT = Path(__file__).resolve().parents[3]
ROSTER_ITEM_KEYS = {'id', 'studentNo', 'name', 'major', 'collegeName', 'grade', 'sex', 'sexCode', 'graduationMonth',
                    'gpa', 'academicLevel', 'status', 'studentType', 'star', 'tier', 'progress', 'hasRoadmap',
                    'hasDetail', 'canReadDetail', 'programCount', 'counselCount'}
C_CODE = re.compile(r'^C(0[1-9]|10)(-[0-9]{2})?$')


def test_departments_keep_keys_add_univ_code_and_active_without_c_codes(client):
    fixture = json.loads((ROOT / 'backend/seeds/admin/departments.seed.json').read_text(encoding='utf-8'))
    rows = client.get('/api/v1/departments', headers=headers('chaewon')).json()
    assert_same_json_shape(fixture[0], next(r for r in rows if r['univCode'] is not None))
    # univCode 는 string|null(자체 투영 행은 과정 코드가 없을 수 있다), active 는 boolean.
    assert all(set(r) == set(fixture[0]) for r in rows)
    assert all(isinstance(r['univCode'], (str, type(None))) and isinstance(r['active'], bool) for r in rows)
    assert not [r for r in rows if C_CODE.match(r['collegeCode']) or C_CODE.match(r['deptCode'])]
    assert len({r['deptCode'] for r in rows}) == len(rows)


def test_roster_values_use_academic_domains_without_row_multiplication(client, db):
    add_academic_dept(db, '5', '공과대학', '714', '전자공학과')
    for uid, sex, univ, status in [('contract-roster-1', '0', '00', '0003'), ('contract-roster-2', '1', '90', '0004'),
                                   ('contract-roster-3', None, '91', '0001'), ('contract-roster-4', '1', '12', '0002')]:
        add_academic_user(db, uid, usr_nm='계약 학생', sex=sex, univ_cd=univ, hofc_sta_cd=status, hakbu_cd='714')
    response = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                          params={'q': 'contract-roster-', 'pageSize': 10})
    assert response.status_code == 200, response.text
    items = {r['id']: r for r in response.json()['items']}
    assert response.json()['totalCount'] == 4 and len(items) == 4
    assert all(set(r) == ROSTER_ITEM_KEYS for r in items.values())
    got = {uid: (r['sexCode'], r['sex'], r['academicLevel'], r['status'], r['major'], r['collegeName'])
           for uid, r in items.items()}
    assert got == {
        'contract-roster-1': ('0', '남자', '학부', '수료', '전자공학과', '공과대학'),
        'contract-roster-2': ('1', '여자', '학부', '제적', '전자공학과', '공과대학'),
        'contract-roster-3': (None, '없음', '대학원', '재학', '전자공학과', '공과대학'),
        'contract-roster-4': ('1', '여자', '대학원', '휴학', '전자공학과', '공과대학'),
    }
    female = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                        params={'q': 'contract-roster-', 'filters.sex': '1'}).json()
    assert {r['id'] for r in female['items']} == {'contract-roster-2', 'contract-roster-4'}
    male = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                      params={'q': 'contract-roster-', 'filters.sex': '0'}).json()
    assert [r['id'] for r in male['items']] == ['contract-roster-1']
    # 로스터 건수 = 학생 투영 건수(조직 조인으로 행이 불지 않는다).
    total = client.get('/api/v1/academic-students/metadata', headers=headers('career_kim')).json()['summary']['total']
    assert total == db.execute('SELECT count(*) AS n FROM dc.student_login_source').fetchone()['n']


def test_academic_directory_organization_tree_keys(client, db):
    add_academic_dept(db, '5', '공과대학', '714', '전자공학과')
    response = client.get('/api/v1/system/academic/organizations', headers=headers('system-admin'),
                          params={'q': '전자공학과'})
    assert response.status_code == 200, response.text
    row = next(r for r in response.json()['items'] if r['dept_cd'] == '714')
    assert set(row) == {'dept_cd', 'dept_nm', 'dept_up_cd', 'grp_cd', 'grp_nm', 'ordering', 'lvl', 'use_yn',
                        'dept_sub_nm', 'univ_code', 'gubun_code'}
    assert (row['lvl'], row['grp_nm'], row['dept_up_cd'], row['use_yn']) == ('2', '학과', '5', 'Y')


def test_screens_send_academic_code_values():
    charge = (ROOT / 'src_admin/components/StudentChargeTable.tsx').read_text(encoding='utf-8')
    assert "['0','남자'],['1','여자']" in charge and "'0001','남자'" not in charge
    directory = (ROOT / 'src_admin/pages/AcademicDirectory.tsx').read_text(encoding='utf-8')
    assert "useState('0006')" in directory and "'89'" not in directory and "['00007', '퇴직']" in directory
    stats = (ROOT / 'src_admin/components/StatsFilterBar.tsx').read_text(encoding='utf-8')
    assert 'd.active' in stats
