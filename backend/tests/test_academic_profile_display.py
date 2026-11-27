"""0023 — 학사 GPA·이수학점·연락처·주소·핵심역량을 학생 마이페이지와 교직원 학생 상세에.
0024 — 졸업예정·입학일·이수학기·생년월일·집전화·다전공(같은 파일, 「0024 §4-n」 표시).

work-order §4 1~10. 모든 픽스처는 롤백 전용 트랜잭션(db) 안에서 만든다. 학생 행 값은 합성값이다.
API 호출은 픽스처를 만든 뒤 `SET LOCAL ROLE dc_app` 으로 앱 계정 권한에서 돈다(소유자 계정은 GRANT 누락을 못 잡는다).
"""
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from app.growth import academic_contact
from app.xlsx_export import read_workbook
from test_api import headers
from test_psych_referrals import db  # noqa: F401
from academic_test_support import add_academic_dept, add_academic_user

CODES = {'ACE1': 'LOCAL_LEADER', 'ACE2': 'CREATIVE', 'ACE3': 'CONVERGENCE', 'ACE4': 'COMMUNICATION', 'ACE5': 'GLOBAL'}
DETAIL_COLUMNS = ['intg_uid', 'sex_code', 'academic_gpa', 'out_dt', 'foreigner_code', 'mobile', 'email',
                  'grad_exp_ym', 'isu_grade', 'curri_year']
DETAIL_COLUMNS_0023 = ['post_code', 'address']
DETAIL_COLUMNS_0024 = ['admission_date', 'completed_semesters', 'birth_date', 'home_phone']
MAJOR_COLUMNS = ['student_uid', 'major_seq', 'type_code', 'type_label', 'major_code', 'major_name', 'status_code',
                 'status_label']
ACADEMIC_KEYS = {'mobile', 'email', 'postCode', 'address', 'homePhone', 'birthDate', 'admissionDate',
                 'completedSemesters', 'graduationExpectedMonth', 'majors'}
GROWTH_PROFILE_KEYS = {'name', 'studentNo', 'school', 'dept', 'grade', 'gpa', 'intro', 'version', 'email', 'phone',
                       'capabilities'}


def caps(db, uid, rows):
    for cap_cd, score in rows:
        db.execute('''INSERT INTO academic.dc_v_stu_cap_inf(intg_uid,cap_div,dept_cd,cap_cd,cap_score)
          VALUES(%s,'CORE','TEST',%s,%s)''', (uid, cap_cd, score))


def majors(db, uid, rows):
    for major_type, seq, major_cd, stat in rows:
        db.execute('''INSERT INTO academic.dc_v_usr_major_inf(intg_uid,major_type,major_seq,major_cd,major_stat,curri_year)
          VALUES(%s,%s,%s,%s,%s,'2024')''', (uid, major_type, seq, major_cd, stat))


def code(db, grp, value, label, use_yn='Y', sort_no=1):
    db.execute('INSERT INTO academic.dc_v_code_inf(code_grp,code,code_nm,sort_no,use_yn) VALUES(%s,%s,%s,%s,%s)',
               (grp, value, label, sort_no, use_yn))


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
    # 0024 — 합성 학사 값. 날짜는 x 로 흩어 다른 응답과 우연히 일치하지 않게 한다.
    n = int(x[:4], 16)
    birth, admission = date(1980, 1, 1) + timedelta(days=n % 7000), date(2015, 3, 1) + timedelta(days=n % 2000)
    k.update(sx='apx-' + x, tel='055-000-' + x[:4], birth=birth, admission=admission,
             type_a='TypeA ' + x, type_b='TypeB ' + x, stat_a='StatA ' + x, stat_cancel='StatCancel ' + x,
             major1='M' + x + '1', major2='M' + x + '2', major_unknown='M' + x + '9',
             major1_name='Major One ' + x, major2_name='Major Two ' + x)
    c, d = k['college'], k['dept']
    db.execute("INSERT INTO dc.department VALUES(%s,%s,%s,%s,'test')", (c, d, 'Profile College ' + x, 'Profile Dept ' + x))
    add_academic_dept(db, c, 'Profile College ' + x, d, 'Profile Dept ' + x)
    base = dict(usr_nm='Profile Test', hofc_sta_cd='0001', univ_cd='00', stu_schgr='3', daehak_cd=c, hakbu_cd=d)
    add_academic_user(db, k['s'], hp=k['mobile'], email=k['email'], post=k['post'], addr1=k['address'],
                      grade=Decimal('3.71'), isu_grade=88, tel='  ' + k['tel'] + ' ', age=birth.strftime('%Y%m%d'),
                      enter_dt=admission.strftime('%Y%m%d'), isu_smt_cnt=6, grad_exp_ym='202702', **base)
    # 빈 문자열 연락처·평점 없음 — null 로 나가야 한다.
    # 0024 경계: 집전화 공백만 · 이수학기 NULL · 달력에 없는 날짜(2월 30일·13월) · 졸업예정 13월 → 모두 null.
    add_academic_user(db, k['s0'], hp='', email='', post='', addr1='', tel='   ', age='20240230',
                      enter_dt='20241301', isu_smt_cnt=None, grad_exp_ym='202713', **base)
    for uid in (k['s4'], k['sdup'], k['snull']):
        add_academic_user(db, uid, **base)
    caps(db, k['s'], [('ACE1', 12), ('ACE2', 5), ('ACE3', Decimal('7.5')), ('ACE4', 0), ('ACE5', 147)])
    caps(db, k['s4'], [('ACE1', 1), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4)])
    caps(db, k['sdup'], [('ACE1', 1), ('ACE1', 9), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4)])           # 5행·4코드
    caps(db, k['snull'], [('ACE1', 1), ('ACE2', 2), ('ACE3', 3), ('ACE4', 4), ('ACE5', None)])     # NULL 점수
    for uid in (k['s'], k['s4'], k['sdup'], k['snull'], k['s0']):
        service_student(db, uid, c, d)
    # 0024 다전공 — 유형 Y3 은 코드표에 없고 major_unknown 은 전공 마스터에 없다. 상태 NULL 행 포함.
    # 코드는 원천에 없는 합성값이라 테스트 DB 의 학사 코드표 내용과 무관하다.
    code(db, 'MAJOR_TYPE', 'Y1', k['type_a'])
    code(db, 'MAJOR_TYPE', 'Y2', k['type_b'], sort_no=2)
    code(db, 'MAJOR_STAT', 'Y1', k['stat_a'])
    code(db, 'MAJOR_STAT', 'Y4', k['stat_cancel'], sort_no=4)
    for major_code, name in ((k['major1'], k['major1_name']), (k['major2'], k['major2_name'])):
        db.execute("INSERT INTO academic.dc_v_major_inf(major_code,major_name) VALUES(%s,%s)", (major_code, name))
    # 넣는 순서를 뒤섞는다 — 응답 순서는 (major_seq, type_code) 여야 한다.
    majors(db, k['s'], [('Y3', 2, k['major_unknown'], None), ('Y2', 1, k['major2'], 'Y1'),
                        ('Y1', 1, k['major1'], 'Y4')])
    # 학사 행이 없는 서비스 학생 — 본인 academic 은 null 이다.
    service_student(db, k['sx'], c, d)
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


def private_strings(w):
    """0023 연락처 + 0024 생년월일·입학일(원값·표시값)·집전화·다전공 이름."""
    return (*contact_strings(w), w['tel'], w['birth'].isoformat(), w['birth'].strftime('%Y%m%d'),
            w['admission'].isoformat(), w['admission'].strftime('%Y%m%d'), w['major1_name'], w['major2_name'],
            w['major_unknown'])


def expected_majors(w):
    return [{'typeLabel': w['type_a'], 'majorName': w['major1_name'], 'statusLabel': w['stat_cancel']},
            {'typeLabel': w['type_b'], 'majorName': w['major2_name'], 'statusLabel': w['stat_a']},
            {'typeLabel': 'Y3', 'majorName': w['major_unknown'], 'statusLabel': None}]


def expected_academic(w):
    return {'mobile': w['mobile'], 'email': w['email'], 'postCode': w['post'], 'address': w['address'],
            'homePhone': w['tel'], 'birthDate': w['birth'].isoformat(), 'admissionDate': w['admission'].isoformat(),
            'completedSemesters': 6, 'graduationExpectedMonth': '2027-02', 'majors': expected_majors(w)}


# 학사 상세 최상위 키 — 0023·6779c96(majorName·graduationExpectedMonth) 기존 키 + 0024 다섯 키.
DETAIL_KEYS_BEFORE_0024 = {'quest', 'id', 'studentNo', 'name', 'major', 'star', 'collegeName', 'grade', 'academicLevel',
                           'status', 'sex', 'foreigner', 'graduationMonth', 'gpa', 'majorName', 'graduationExpectedMonth',
                           'studentType', 'diagnosisCount', 'counsels', 'programs', 'progress', 'hasRoadmap',
                           'hasServiceProfile', 'mobile', 'email', 'postCode', 'address'}
DETAIL_KEYS_0024 = {'homePhone', 'birthDate', 'admissionDate', 'completedSemesters', 'majors'}

EMPTY_ACADEMIC = {'mobile': None, 'email': None, 'postCode': None, 'address': None, 'homePhone': None,
                  'birthDate': None, 'admissionDate': None, 'completedSemesters': None,
                  'graduationExpectedMonth': None, 'majors': []}


# §4-1
def test_app_role_reads_both_views_and_columns_are_additive(db, w):
    columns = [r['column_name'] for r in db.execute('''SELECT column_name FROM information_schema.columns
      WHERE table_schema='dc' AND table_name=%s ORDER BY ordinal_position''', ('academic_student_details',)).fetchall()]
    assert columns == DETAIL_COLUMNS + DETAIL_COLUMNS_0023 + DETAIL_COLUMNS_0024   # 0024: 끝에만 4열
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
        assert mine['academic'] == expected_academic(w)
        assert mine['email'] is None and mine['phone'] is None   # 자기입력은 그대로(미입력)
        staff = get(client, path, 'career_kim')
        theirs = staff['profile'] if 'profile' in staff else staff
        assert theirs['gpa'] == '3.71' and theirs['credits'] == 88
        assert theirs['academic'] is None and theirs['email'] is None and theirs['phone'] is None
        assert not any(s in str(staff) for s in private_strings(w))
    profile = get(client, f"/students/{w['s']}/growth/profile", w['s'])
    assert set(profile) == GROWTH_PROFILE_KEYS | {'credits', 'academic'}
    # 학사 값이 빈 문자열이면 null, 평점·이수학점이 없으면 null(detail 도 없다).
    empty = get(client, f"/students/{w['s0']}/growth/profile", w['s0'])
    assert empty['academic'] == EMPTY_ACADEMIC
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
    assert not any(s in stored for s in private_strings(w))
    # 재생 응답도 같은 모양이다.
    replay = client.patch(f"/api/v1/students/{w['s']}/growth/profile",
                          headers={**headers(w['s']), 'Idempotency-Key': key},
                          json={'expectedVersion': 0, 'intro': 'Synthetic intro', 'email': None, 'phone': None})
    assert replay.status_code == 200 and replay.json()['academic'] is None
    assert not any(s in replay.text or s in response.text for s in private_strings(w))
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


# 0024 §4-1 · §4-12
def test_0024_majors_view_columns_and_app_role_reads_new_columns(db, w):
    columns = [r['column_name'] for r in db.execute('''SELECT column_name FROM information_schema.columns
      WHERE table_schema='dc' AND table_name='academic_student_majors' ORDER BY ordinal_position''').fetchall()]
    assert columns == MAJOR_COLUMNS
    db.execute('SET LOCAL ROLE dc_app')
    row = db.execute('''SELECT admission_date,completed_semesters,birth_date,home_phone
      FROM dc.academic_student_details WHERE intg_uid=%s''', (w['s'],)).fetchone()
    assert (row['admission_date'], row['completed_semesters'], row['birth_date']) == (
        w['admission'].strftime('%Y%m%d'), 6, w['birth'].strftime('%Y%m%d'))
    assert row['home_phone'] != w['tel'] and row['home_phone'].strip() == w['tel']   # 뷰는 원값 — 가공은 API 한 곳
    rows = db.execute('''SELECT type_label,major_name,status_label FROM dc.academic_student_majors
      WHERE student_uid=%s ORDER BY major_seq,type_code''', (w['s'],)).fetchall()
    assert [(r['type_label'], r['major_name'], r['status_label']) for r in rows] == [
        (w['type_a'], w['major1_name'], w['stat_cancel']), (w['type_b'], w['major2_name'], w['stat_a']),
        (None, None, None)]


# 0024 §4-6
def test_0024_duplicate_code_or_major_master_rows_do_not_multiply_majors(client, db, w):
    source = db.execute('SELECT count(*) AS n FROM academic.dc_v_usr_major_inf WHERE intg_uid=%s',
                        (w['s'],)).fetchone()['n']
    # 코드표·전공 마스터 유일성은 sync 가 보장하지 않는다 — 같은 키 중복 행을 넣는다(미사용 라벨·뒤 순서 이름).
    code(db, 'MAJOR_TYPE', 'Y1', 'Unused ' + w['x'], use_yn='N')
    code(db, 'MAJOR_STAT', 'Y4', 'Unused ' + w['x'], use_yn='N')
    db.execute("INSERT INTO academic.dc_v_major_inf(major_code,major_name) VALUES(%s,%s)",
               (w['major1'], 'Zz Duplicate ' + w['x']))
    assert db.execute('SELECT count(*) AS n FROM dc.academic_student_majors WHERE student_uid=%s',
                      (w['s'],)).fetchone()['n'] == source == 3
    db.execute('SET LOCAL ROLE dc_app')
    for path in (f"/students/{w['s']}/growth/profile", f"/students/{w['s']}/portfolio"):
        body = get(client, path, w['s'])
        mine = body['profile'] if 'profile' in body else body
        # 길이 불변, 라벨은 사용 중(use_yn='Y')·이름 순으로 결정적이다.
        assert mine['academic']['majors'] == expected_majors(w)


# 0024 §4-2 · §4-3 · §4-8 · §4-9 · §4-10
def test_0024_owner_academic_has_exactly_ten_keys_with_formats_and_boundaries(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    for path in ("/students/{}/growth/profile", "/students/{}/portfolio"):
        body = get(client, path.format(w['s']), w['s'])
        mine = body['profile'] if 'profile' in body else body
        assert set(mine['academic']) == ACADEMIC_KEYS and 'foreigner' not in mine['academic']
        assert mine['academic'] == expected_academic(w)
        assert isinstance(mine['academic']['completedSemesters'], int)
        # 경계: 공백만 집전화·NULL 이수학기·2월 30일·13월 입학일·13월 졸업예정 → null, 다전공 없음 → []
        bad = get(client, path.format(w['s0']), w['s0'])
        assert (bad['profile'] if 'profile' in bad else bad)['academic'] == EMPTY_ACADEMIC
    # 최상위 키 집합 불변(0023 과 같다).
    assert set(get(client, f"/students/{w['s']}/growth/profile", w['s'])) == GROWTH_PROFILE_KEYS | {'credits', 'academic'}
    # 졸업예정 미등록(졸업사정 전) 학생은 null 이 정상이다.
    assert get(client, f"/students/{w['s4']}/growth/profile", w['s4'])['academic']['graduationExpectedMonth'] is None


# 0024 §4-4 · §4-7
def test_0024_staff_reads_and_patch_carry_no_new_academic_values(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    for who in ('career_kim', 'psych_lee'):
        for path in (f"/students/{w['s']}/growth/profile", f"/students/{w['s']}/portfolio"):
            response = client.get('/api/v1' + path, headers=headers(who))
            assert response.status_code == 200, (who, response.text)
            body = response.json()
            assert (body['profile'] if 'profile' in body else body)['academic'] is None
            assert not any(s in response.text for s in private_strings(w))
    key = 'acad24-' + w['x']
    payload = {'expectedVersion': 0, 'intro': 'Synthetic intro 0024', 'email': None, 'phone': None}
    first = client.patch(f"/api/v1/students/{w['s']}/growth/profile",
                         headers={**headers(w['s']), 'Idempotency-Key': key}, json=payload)
    replay = client.patch(f"/api/v1/students/{w['s']}/growth/profile",
                          headers={**headers(w['s']), 'Idempotency-Key': key}, json=payload)
    for response in (first, replay):
        assert response.status_code == 200, response.text
        assert response.json()['academic'] is None
        assert not any(s in response.text for s in private_strings(w))
    stored = db.execute('SELECT response::text AS r FROM dc.idempotency WHERE actor_uid=%s AND key=%s',
                        (w['s'], key)).fetchone()['r']
    assert not any(s in stored for s in private_strings(w))
    for field in ('homePhone', 'birthDate', 'admissionDate', 'completedSemesters', 'graduationExpectedMonth', 'majors'):
        assert field not in stored


# 0024 §4-11
def test_0024_service_student_without_academic_row_gets_null(client, db, w):
    assert academic_contact(db, w['sx']) is None
    db.execute('SET LOCAL ROLE dc_app')
    for path in (f"/students/{w['sx']}/growth/profile", f"/students/{w['sx']}/portfolio"):
        body = get(client, path, w['sx'])
        assert (body['profile'] if 'profile' in body else body)['academic'] is None


# 0024 §4-5 · §4-8(상세)
def test_0024_academic_detail_carries_new_fields_in_scope_only(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    new_keys = ('homePhone', 'birthDate', 'admissionDate', 'completedSemesters', 'graduationExpectedMonth', 'majors')
    for who in ('career_kim', w['prof']):
        detail = get(client, f"/academic-students/{w['s']}", who)
        assert set(detail) == DETAIL_KEYS_BEFORE_0024 | DETAIL_KEYS_0024
        # 학생 본인 GET 과 같은 함수 — 같은 값이다. 0023 연락처·외국인 키는 그대로.
        assert {k: detail[k] for k in new_keys} == {k: expected_academic(w)[k] for k in new_keys}
        assert (detail['mobile'], detail['email'], detail['postCode'], detail['address']) == contact_strings(w)
        assert detail['foreigner'] is None and isinstance(detail['completedSemesters'], int)
        blank = get(client, f"/academic-students/{w['s0']}", who)
        assert set(blank) == set(detail)
        assert {k: blank[k] for k in new_keys} == {k: EMPTY_ACADEMIC[k] for k in new_keys}
    # 범위 밖은 기존과 같은 404 — 본문에 새 값이 없다.
    for params in ({}, {'optional': True}):
        hidden = client.get(f"/api/v1/academic-students/{w['s']}", headers=headers(w['prof2']), params=params)
        assert hidden.status_code == 404, hidden.text
        assert not any(s in hidden.text for s in private_strings(w))


# 0024 §4-7(b)(c) · §4-8(목록·export)
def test_0024_list_and_export_carry_no_new_fields(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    listing = get(client, f"/academic-students?q={w['x']}&pageSize=50", 'career_kim')
    assert {r['id'] for r in listing['items']} >= {w['s'], w['s0']}
    for item in listing['items']:
        assert not set(item) & (DETAIL_KEYS_0024 | {'graduationExpectedMonth'})
    assert not any(s in str(listing) for s in private_strings(w))
    exported = client.post('/api/v1/academic-students/export', headers=headers('career_kim'), json={'ids': [w['s']]})
    assert exported.status_code == 200, exported.text
    rows, _ = read_workbook(exported.content)
    assert len(rows[0]) == 13 and len(rows) == 2
    assert not any(s in str(rows) for s in private_strings(w))


# 0024 §4-11(상세)
def test_0024_service_only_student_optional_detail_is_null(client, db, w):
    db.execute('SET LOCAL ROLE dc_app')
    response = client.get(f"/api/v1/academic-students/{w['sx']}", headers=headers('career_kim'), params={'optional': True})
    assert response.status_code == 200, response.text
    assert response.json() is None
    assert client.get(f"/api/v1/academic-students/{w['sx']}", headers=headers('career_kim')).status_code == 404
