"""0023 — 학사 GPA·이수학점·연락처·주소·핵심역량을 학생 마이페이지와 교직원 학생 상세에.

work-order §4 1~10. 모든 픽스처는 롤백 전용 트랜잭션(db) 안에서 만든다. 학생 행 값은 합성값이다.
API 호출은 픽스처를 만든 뒤 `SET LOCAL ROLE dc_app` 으로 앱 계정 권한에서 돈다(소유자 계정은 GRANT 누락을 못 잡는다).
"""
from decimal import Decimal
from uuid import uuid4

import pytest

from app.xlsx_export import read_workbook
from test_api import headers
from test_psych_referrals import db  # noqa: F401
from academic_test_support import add_academic_dept, add_academic_user

CODES = {'ACE1': 'LOCAL_LEADER', 'ACE2': 'CREATIVE', 'ACE3': 'CONVERGENCE', 'ACE4': 'COMMUNICATION', 'ACE5': 'GLOBAL'}
DETAIL_COLUMNS = ['intg_uid', 'sex_code', 'academic_gpa', 'out_dt', 'foreigner_code', 'mobile', 'email',
                  'grad_exp_ym', 'isu_grade', 'curri_year']
GROWTH_PROFILE_KEYS = {'name', 'studentNo', 'school', 'dept', 'grade', 'gpa', 'intro', 'version', 'email', 'phone',
                       'capabilities'}


def caps(db, uid, rows):
    for cap_cd, score in rows:
        db.execute('''INSERT INTO academic.dc_v_stu_cap_inf(intg_uid,cap_div,dept_cd,cap_cd,cap_score)
          VALUES(%s,'CORE','TEST',%s,%s)''', (uid, cap_cd, score))


def service_student(db, uid, college, dept, detail=None):
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Profile Test','STUDENT','fixture')",
               (uid, uid))
    db.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code,grade,detail)
      VALUES(%s,%s,'Profile Major',%s,%s,3,%s)''', (uid, uid, college, dept, detail))


@pytest.fixture
def w(db):
    x = uuid4().hex[:6]
    k = dict(x=x, college='Q' + x[0], dept='P' + x + '1', s='apf-' + x, s4='ap4-' + x, sdup='apd-' + x,
             snull='apn-' + x, s0='ap0-' + x, prof='pp-' + x, prof2='po-' + x,
             mobile='010-0000-' + x[:4], email='acad-' + x + '@example.test', post='0' + x[:4],
             address='Synthetic Road ' + x)
    c, d = k['college'], k['dept']
    db.execute("INSERT INTO dc.department VALUES(%s,%s,%s,%s,'test')", (c, d, 'Profile College ' + x, 'Profile Dept ' + x))
    add_academic_dept(db, c, 'Profile College ' + x, d, 'Profile Dept ' + x)
    base = dict(usr_nm='Profile Test', hofc_sta_cd='0001', univ_cd='00', stu_schgr='3', daehak_cd=c, hakbu_cd=d)
    add_academic_user(db, k['s'], hp=k['mobile'], email=k['email'], post=k['post'], addr1=k['address'],
                      grade=Decimal('3.71'), isu_grade=88, **base)
    # 빈 문자열 연락처·평점 없음 — null 로 나가야 한다.
    add_academic_user(db, k['s0'], hp='', email='', post='', addr1='', **base)
    for uid in (k['s4'], k['sdup'], k['snull']):
        add_academic_user(db, uid, **base)
    caps(db, k['s'], [('ACE1', 12), ('ACE2', 5), ('ACE3', Decimal('7.5')), ('ACE4', 0), ('ACE5', 147)])
    caps(db, k['s4'], [('ACE1', 1), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4)])
    caps(db, k['sdup'], [('ACE1', 1), ('ACE1', 9), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4)])           # 5행·4코드
    caps(db, k['snull'], [('ACE1', 1), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4), ('ACE5', None)])     # NULL 점수
    for uid in (k['s'], k['s4'], k['sdup'], k['snull'], k['s0']):
        service_student(db, uid, c, d)
    for uid in (k['prof'], k['prof2']):
        db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source,profile) VALUES(%s,%s,'Profile Staff','STAFF','local','{\"role\":\"professor\"}')",
                   (uid, uid))
        db.execute("INSERT INTO dc.staff(intg_uid,role_code,profile) VALUES(%s,'professor','{}')", (uid,))
    db.execute("INSERT INTO dc.org_assignment(staff_uid,college_code,dept_code,role_code,valid_from) VALUES(%s,%s,%s,'professor',CURRENT_DATE - 1)",
               (k['prof'], c, d))
    return k


def get(client, path, who):
    response = client.get('/api/v1' + path, headers=headers(who))
    assert response.status_code == 200, response.text
    return response.json()


def contact_strings(w):
    return (w['mobile'], w['email'], w['post'], w['address'])


# §4-1
def test_app_role_reads_both_views_and_columns_are_additive(db, w):
    columns = [r['column_name'] for r in db.execute('''SELECT column_name FROM information_schema.columns
      WHERE table_schema='dc' AND table_name=%s ORDER BY ordinal_position''', ('academic_student_details',)).fetchall()]
    assert columns == DETAIL_COLUMNS + ['post_code', 'address']
    cap_columns = [r['column_name'] for r in db.execute('''SELECT column_name FROM information_schema.columns
      WHERE table_schema='dc' AND table_name='academic_student_core_competency' ORDER BY ordinal_position''').fetchall()]
    assert cap_columns == ['student_uid', 'competency_code', 'score']
    db.execute('SET LOCAL ROLE dc_app')
    row = db.execute('SELECT post_code,address FROM dc.academic_student_details WHERE intg_uid=%s', (w['s'],)).fetchone()
    assert (row['post_code'], row['address']) == (w['post'], w['address'])
    codes = {r['competency_code'] for r in db.execute('SELECT DISTINCT competency_code FROM dc.academic_student_core_competency').fetchall()}
    assert codes and codes <= {r['code'] for r in db.execute('SELECT code FROM dc.core_competency').fetchall()}
    assert db.execute('SELECT count(*) AS n FROM dc.academic_student_core_competency WHERE student_uid=%s',
                      (w['s'],)).fetchone()['n'] == 5


# §4-2 · §4-9
def test_academic_core_competency_is_raw_and_keys_are_unchanged(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    mine = get(client, f"/students/{w['s']}", w['s'])
    assert mine['coreCompetencySource'] == 'ACADEMIC'
    assert mine['coreCompetencyScores'] == {'LOCAL_LEADER': 12.0, 'CREATIVE': 5.0, 'CONVERGENCE': 7.5,
                                            'COMMUNICATION': 0.0, 'GLOBAL': 147.0}
    assert all(isinstance(v, float) for v in mine['coreCompetencyScores'].values())
    none = get(client, f"/students/{w['s0']}", w['s0'])
    assert none['coreCompetencyScores'] is None and none['coreCompetencySource'] is None
    # 키 집합은 값과 무관하다 — 학사 원점수 학생과 점수 없는 학생의 응답 모양이 같다.
    assert set(mine) == set(none)
    # 교직원 부팅 묶음도 같은 값이다.
    boot = get(client, '/bootstrap/profiles', 'career_kim')
    row = next(r for r in boot['students'] + boot['counselOwners'] if r['id'] == w['s'])
    assert (row['coreCompetencyScores'], row['coreCompetencySource']) == (mine['coreCompetencyScores'], 'ACADEMIC')
    for r in boot['students'] + boot['counselOwners']:
        assert r['coreCompetencySource'] in (None, 'DEVELOPMENT_CARE7_TEST', 'ACADEMIC')


# §4-3
def test_partial_duplicate_or_null_scores_are_not_drawn(client, db, w):
    assert db.execute('SELECT count(*) AS n FROM dc.academic_student_core_competency WHERE student_uid=%s',
                      (w['snull'],)).fetchone()['n'] == 4
    db.execute('SET LOCAL ROLE dc_app')
    for uid in (w['s4'], w['sdup'], w['snull']):
        data = get(client, f'/students/{uid}', 'career_kim')
        assert data['coreCompetencyScores'] is None and data['coreCompetencySource'] is None, uid


# §4-4 · §4-8 · §4-9
def test_growth_profile_and_portfolio_carry_academic_values_to_owner_only(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    for path in (f"/students/{w['s']}/growth/profile", f"/students/{w['s']}/portfolio"):
        body = get(client, path, w['s'])
        mine = body['profile'] if 'profile' in body else body
        assert mine['gpa'] == '3.71' and mine['credits'] == 88
        assert mine['academic'] == {'mobile': w['mobile'], 'email': w['email'], 'postCode': w['post'],
                                    'address': w['address']}
        assert mine['email'] is None and mine['phone'] is None   # 자기입력은 그대로(미입력)
        staff = get(client, path, 'career_kim')
        theirs = staff['profile'] if 'profile' in staff else staff
        assert theirs['gpa'] == '3.71' and theirs['credits'] == 88
        assert theirs['academic'] is None and theirs['email'] is None and theirs['phone'] is None
        assert not any(s in str(staff) for s in contact_strings(w))
    profile = get(client, f"/students/{w['s']}/growth/profile", w['s'])
    assert set(profile) == GROWTH_PROFILE_KEYS | {'credits', 'academic'}
    # 학사 값이 빈 문자열이면 null, 평점·이수학점이 없으면 null(detail 도 없다).
    empty = get(client, f"/students/{w['s0']}/growth/profile", w['s0'])
    assert empty['academic'] == {'mobile': None, 'email': None, 'postCode': None, 'address': None}
    assert empty['gpa'] is None and empty['credits'] is None


# §4-5
def test_intro_patch_keeps_self_contact_and_stores_no_academic_contact(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    key = 'acad-' + w['x'] + '-patch'
    response = client.patch(f"/api/v1/students/{w['s']}/growth/profile",
                            headers={**headers(w['s']), 'Idempotency-Key': key},
                            json={'expectedVersion': 0, 'intro': 'Synthetic intro', 'email': None, 'phone': None})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['academic'] is None and body['gpa'] == '3.71' and set(body) == GROWTH_PROFILE_KEYS | {'credits', 'academic'}
    row = db.execute('SELECT contact_email,contact_phone FROM dc.growth_profile WHERE student_uid=%s', (w['s'],)).fetchone()
    assert (row['contact_email'], row['contact_phone']) == (None, None)
    stored = db.execute('SELECT response::text AS r FROM dc.idempotency WHERE actor_uid=%s AND key=%s',
                        (w['s'], key)).fetchone()['r']
    assert not any(s in stored for s in contact_strings(w))
    # 재생 응답도 같은 모양이다.
    replay = client.patch(f"/api/v1/students/{w['s']}/growth/profile",
                          headers={**headers(w['s']), 'Idempotency-Key': key},
                          json={'expectedVersion': 0, 'intro': 'Synthetic intro', 'email': None, 'phone': None})
    assert replay.status_code == 200 and replay.json()['academic'] is None
    # 화면은 PATCH 뒤 GET 으로 다시 읽는다 — 그때 학사 연락처가 보인다.
    assert get(client, f"/students/{w['s']}/growth/profile", w['s'])['academic']['mobile'] == w['mobile']


# §4-6
def test_academic_detail_contact_in_scope_only_and_list_export_unchanged(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    for who in ('career_kim', w['prof']):
        detail = get(client, f"/academic-students/{w['s']}", who)
        assert (detail['mobile'], detail['email'], detail['postCode'], detail['address']) == contact_strings(w)
        blank = get(client, f"/academic-students/{w['s0']}", who)
        assert (blank['mobile'], blank['email'], blank['postCode'], blank['address']) == (None, None, None, None)
    hidden = client.get(f"/api/v1/academic-students/{w['s']}", headers=headers(w['prof2']), params={'optional': True})
    assert hidden.status_code == 404 and not any(s in hidden.text for s in contact_strings(w))
    listing = get(client, f"/academic-students?q={w['x']}&pageSize=50", 'career_kim')
    assert {r['id'] for r in listing['items']} >= {w['s'], w['s0']}
    assert set(listing['items'][0]) == {'id', 'studentNo', 'name', 'major', 'collegeName', 'grade', 'sex', 'sexCode',
        'graduationMonth', 'gpa', 'academicLevel', 'status', 'studentType', 'star', 'tier', 'progress', 'hasRoadmap',
        'hasDetail', 'canReadDetail', 'programCount', 'counselCount'}
    assert not any(s in str(listing) for s in contact_strings(w))
    exported = client.post('/api/v1/academic-students/export', headers=headers('career_kim'), json={'ids': [w['s']]})
    assert exported.status_code == 200, exported.text
    rows, _ = read_workbook(exported.content)
    assert rows[0] == ['학번', '이름', '대학', '학과', '학부/대학원', '학년', '학적', '성별', '졸업년월',
                       '학점', '진단 유형', '완료 상담횟수(현재 시스템)', '비교과 이수(현재 시스템)']
    assert len(rows) == 2 and not any(s in str(rows) for s in contact_strings(w))


# §4-7
def test_company_portfolio_education_gpa_is_academic(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    created = client.post(f"/api/v1/students/{w['s']}/portfolios",
                          headers={**headers(w['s']), 'Idempotency-Key': uuid4().hex}, json={})
    assert created.status_code == 201, created.text
    def gpa(document):
        education = next(p for p in document['sections'] if p['key'] == 'education')
        return next(i for i in education['items'] if i['sourceRef'] == 'academic:enrollment')['fields']['gpa']
    assert gpa(created.json()['document']) == '3.71'
    portfolio_id = created.json()['id']
    assert gpa(get(client, f"/students/{w['s']}/portfolios/{portfolio_id}", w['s'])['document']) == '3.71'
    marked = client.post(f"/api/v1/students/{w['s']}/portfolios/{portfolio_id}/representative",
                         headers=headers(w['s']), json={'representative': True})
    assert marked.status_code == 200, marked.text
    assert gpa(get(client, f"/students/{w['s']}/representative-portfolio", 'career_kim')['document']) == '3.71'


# §4-10
def test_profile_gpa_falls_back_to_academic_only_for_empty_legacy_detail(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    mine = get(client, f"/students/{w['s']}", w['s'])
    assert (mine['gpa'], mine['gpaSource']) == ('3.71', 'academic')
    none = get(client, f"/students/{w['s0']}", 'career_kim')
    assert (none['gpa'], none['gpaSource']) == (None, 'legacy_detail')
    fixture = db.execute('''SELECT p.alias,s.detail->>'gpa' AS gpa FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE p.alias='chaewon' ''').fetchone()
    assert fixture['gpa'] is not None
    data = get(client, '/students/chaewon', 'career_kim')
    assert (data['gpa'], data['gpaSource']) == (fixture['gpa'], 'legacy_detail')
