"""0022 — 교수·조교 학과 배정 범위를 학사 학생 전체로(179 · academic_students scoped).

모든 픽스처는 롤백 전용 트랜잭션(db) 안에서 만든다. 학생 행 값은 합성값이다.
"""
from uuid import uuid4

import pytest

from test_api import headers
from test_psych_referrals import db  # noqa: F401
from academic_test_support import add_academic_dept, add_academic_user

LIST = '/api/v1/academic-students'

# §4-9 참조 의미: 활성 배정 × dc.student_login_source(college, dept) + 전공은 academic_people.major_cd.
REFERENCE = '''WITH grant_ref AS (
  SELECT a.staff_uid, a.college_code, a.dept_code, ''::text AS major_code FROM dc.org_assignment a
  WHERE a.is_active AND a.valid_from <= CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
  UNION ALL
  SELECT a.staff_uid, a.college_code, a.dept_code, a.major_code FROM dc.department_staff_assignment a
  JOIN dc.staff st ON st.intg_uid = a.staff_uid AND st.role_code = a.role_code
  WHERE a.is_active AND a.legacy_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM dc.department_staff_candidates c
                    WHERE c.staff_uid = a.staff_uid AND c.role_code = a.role_code AND NOT c.is_active)
)
SELECT g.staff_uid, s.intg_uid::text AS student_uid FROM grant_ref g
JOIN dc.student_login_source s ON s.college_code = g.college_code AND s.dept_code = g.dept_code
WHERE g.major_code = '' OR EXISTS (SELECT 1 FROM dc.academic_people p
                                   WHERE p.intg_uid = s.intg_uid AND p.major_cd = g.major_code)'''


def staff(db, uid, role, alias=None):
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source,profile) VALUES(%s,%s,'Scope Staff','STAFF','local',%s)",
               (uid, alias or uid, '{"role":"%s"}' % role))
    db.execute("INSERT INTO dc.staff(intg_uid,role_code,profile) VALUES(%s,%s,'{}')", (uid, role))


def service_student(db, uid, college=None, dept=None, alias=None):
    if not db.execute('SELECT 1 FROM dc.person WHERE intg_uid=%s', (uid,)).fetchone():
        db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Scope Test','STUDENT','local')",
                   (uid, alias or uid))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code) VALUES(%s,%s,'Test',%s,%s)",
               (uid, uid, college, dept))


@pytest.fixture
def w(db):
    """두 학과(D1 범위 · D2 범위 밖), 학사·로컬·override 학생, 배정 6종(활성·만료·전공·비활성 후보·staff 없음)."""
    x = uuid4().hex[:6]
    k = dict(x=x, college='Q' + x[0], d1='A' + x + '1', d2='B' + x + '2', m1='M' + x + '1', m2='N' + x + '2',
             prof='p-' + x, prof2='p2-' + x, asst='a-' + x, asst2='a2-' + x, ghost='nx-' + x,
             s1='sp-' + x, s2='sl-' + x, s3='so-' + x, s4='sx-' + x, s5='sz-' + x, s6='svc-' + x, s7='svc2-' + x)
    c = k['college']
    for dept, name in ((k['d1'], 'Scope Dept One ' + x), (k['d2'], 'Scope Dept Two ' + x)):
        db.execute("INSERT INTO dc.department VALUES(%s,%s,%s,%s,'test')", (c, dept, 'Scope College ' + x, name))
        add_academic_dept(db, c, 'Scope College ' + x, dept, name)
    k['d1_name'], k['college_name'] = 'Scope Dept One ' + x, 'Scope College ' + x
    student = dict(usr_nm='Scope Test', hofc_sta_cd='0001', univ_cd='00', stu_schgr='2', daehak_cd=c)
    add_academic_user(db, k['s1'], hakbu_cd=k['d1'], major_cd=k['m1'], **student)
    add_academic_user(db, k['s2'], local=True, hakbu_cd=k['d1'], major_cd=k['m2'], **student)
    add_academic_user(db, k['s3'], hakbu_cd=k['d2'], major_cd=k['m1'], **student)   # override → D1
    add_academic_user(db, k['s4'], hakbu_cd=k['d1'], major_cd=k['m1'], **student)   # override → D2
    add_academic_user(db, k['s5'], hakbu_cd=k['d2'], major_cd=k['m2'], **student)   # 범위 밖
    for uid, dept, name in ((k['s3'], k['d1'], k['d1_name']), (k['s4'], k['d2'], 'Scope Dept Two ' + x)):
        db.execute('''INSERT INTO dc.student_login_override(intg_uid,name,college_code,dept_code,college_name,dept_name)
          VALUES(%s,'Scope Test',%s,%s,%s,%s)''', (uid, c, dept, k['college_name'], name))
    # 학사 행 없는 서비스 전용 학생(fixture 형태) — D1(범위 안) · D2(범위 밖).
    service_student(db, k['s6'], c, k['d1'])
    service_student(db, k['s7'], c, k['d2'])
    staff(db, k['prof'], 'professor')
    staff(db, k['prof2'], 'professor')
    staff(db, k['asst'], 'assistant')
    staff(db, k['asst2'], 'assistant')
    db.execute("INSERT INTO dc.org_assignment(staff_uid,college_code,dept_code,role_code,valid_from) VALUES(%s,%s,%s,'professor',CURRENT_DATE - 1)",
               (k['prof'], c, k['d1']))
    db.execute('''INSERT INTO dc.org_assignment(staff_uid,college_code,dept_code,role_code,valid_from,valid_to)
      VALUES(%s,%s,%s,'professor',DATE '2020-03-01',DATE '2021-02-28')''', (k['prof2'], c, k['d1']))   # 만료
    # 조교 2의 학사 교직원 행은 재직(0006)이 아니다 → 후보 비활성 → 배정 무효.
    add_academic_user(db, 'a2u-' + x, user_ty_cd='0004', emp_no=k['asst2'], usr_nm='Scope Staff', hofc_sta_cd='0007')
    for uid, role, major in ((k['asst'], 'assistant', k['m1']), (k['asst2'], 'assistant', ''), (k['ghost'], 'professor', '')):
        db.execute('''INSERT INTO dc.department_staff_assignment(college_code,dept_code,major_code,staff_uid,role_code)
          VALUES(%s,%s,%s,%s,%s)''', (c, k['d1'], major, uid, role))
    return k


def scope_rows(db, staff_uids, relation='dc.department_academic_student_scope'):
    return {(r['staff_uid'], r['student_uid']) for r in db.execute(
        f'SELECT staff_uid, student_uid FROM {relation} WHERE staff_uid = ANY(%s)', (list(staff_uids),)).fetchall()}


def listing(client, who, **params):
    response = client.get(LIST, headers=headers(who), params={'pageSize': 300, **params})
    assert response.status_code == 200, response.text
    return response.json()


def test_rewrite_matches_student_login_source_semantics(db, w):
    """§4-9 — 인덱스 순서 재작성이 student_login_source 조인과 같은 집합(양방향 EXCEPT 0)."""
    for left, right in (('dc.department_academic_student_scope', '(' + REFERENCE + ') r'),
                        ('(' + REFERENCE + ') r', 'dc.department_academic_student_scope')):
        extra = db.execute(f'SELECT count(*) AS n FROM (SELECT staff_uid, student_uid FROM {left} '
                           f'EXCEPT SELECT staff_uid, student_uid FROM {right}) d').fetchone()['n']
        assert extra == 0
    every = [w[k] for k in ('prof', 'prof2', 'asst', 'asst2', 'ghost')]
    expected = {(w['prof'], w['s1']), (w['prof'], w['s2']), (w['prof'], w['s3']),   # 학사·로컬·override 유입
                (w['asst'], w['s1']), (w['asst'], w['s3'])}                          # 전공 M1 만
    assert scope_rows(db, every) == expected   # 만료·비활성 후보·staff 없음 → 0, override 유출 s4 없음
    assert scope_rows(db, every) == {(r['staff_uid'], r['student_uid']) for r in db.execute(
        'SELECT * FROM (' + REFERENCE + ') r WHERE staff_uid = ANY(%s)', (every,)).fetchall()}
    # 전체 범위 뷰: 학사 가지 + 기존 org_assignment×dc.student(서비스 전용 s6) 가지.
    assert {s for _, s in scope_rows(db, [w['prof']], 'dc.staff_student_scope')} == {w['s1'], w['s2'], w['s3'], w['s6']}


def test_app_role_reads_new_scope_views(db, w):
    """§4-7 — 앱 계정(dc_app)으로 세 뷰를 읽을 수 있다(소유자 계정 테스트는 GRANT 누락을 못 잡는다)."""
    db.execute('SET LOCAL ROLE dc_app')
    for relation in ('dc.department_academic_grant', 'dc.department_academic_student_scope', 'dc.staff_student_scope'):
        db.execute(f'SELECT count(*) FROM {relation}').fetchone()
    assert len(scope_rows(db, [w['prof']])) == 3


def test_professor_lists_department_academic_students_and_metadata_stays_in_scope(client, db, w):
    """§4-1·5 — org_assignment 배정 학과의 학사 학생(서비스 미등록 포함), 메타 집계·옵션도 범위 한정."""
    db.execute('SET LOCAL ROLE dc_app')
    before = db.execute('SELECT count(*) AS n FROM dc.student').fetchone()['n']
    data = listing(client, w['prof'])
    assert {r['id'] for r in data['items']} == {w['s1'], w['s2'], w['s3']}
    assert data['totalCount'] == 3 and all(r['canReadDetail'] is True for r in data['items'])
    assert listing(client, w['prof'], q=w['s5'])['totalCount'] == 0
    meta = client.get(LIST + '/metadata', headers=headers(w['prof']))
    assert meta.status_code == 200, meta.text
    assert meta.json()['summary']['total'] == data['totalCount']
    options = meta.json()['options']
    assert options['majors'] == [w['d1_name']] and options['colleges'] == [w['college_name']]
    assert options['collegeMajors'] == {w['college_name']: [w['d1_name']]}
    assert listing(client, w['prof'], **{'filters.status': '재학'})['totalCount'] == 3
    assert db.execute('SELECT count(*) AS n FROM dc.student').fetchone()['n'] == before


def test_major_assignment_and_invalid_assignments_grant_nothing_else(client, db, w):
    """§4-4 — 전공 배정은 그 전공만. 비활성 후보 조교·만료 배정 교수는 0명."""
    assert {r['id'] for r in listing(client, w['asst'])['items']} == {w['s1'], w['s3']}
    for who in (w['asst2'], w['prof2']):
        assert listing(client, who)['totalCount'] == 0
        assert client.get(LIST + '/metadata', headers=headers(who)).json()['summary']['total'] == 0


def test_detail_scope_alias_counsel_and_existence_hiding(client, db, w):
    """§4-3·11 — 범위 안 200, 범위 밖 404(없는 학생과 같은 응답), 본인 담당 상담 200, alias 해석 뒤 검사."""
    head = headers(w['prof'])
    def get(identity, optional=None):
        return client.get(LIST + '/' + identity, headers=head, params={} if optional is None else {'optional': optional})
    ok = get(w['s1'], True)
    assert ok.status_code == 200 and ok.json()['id'] == w['s1']
    # 서비스 행 없는 학사 학생 — 화면이 /students/{id} 404 왕복을 하지 않도록 알려 준다.
    assert ok.json()['hasServiceProfile'] is False
    missing = 'missing-' + w['x']
    for optional in (None, True):
        hidden, absent = get(w['s5'], optional), get(missing, optional)
        assert hidden.status_code == absent.status_code == 404
        assert hidden.json() == absent.json()
    # 서비스 alias 로 들어와도 학사 uid 로 푼 뒤 같은 범위 검사를 한다.
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Scope Test','STUDENT','academic')",
               (w['s1'], 'al1-' + w['x']))
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Scope Test','STUDENT','academic')",
               (w['s5'], 'al5-' + w['x']))
    by_alias = get('al1-' + w['x'], True)
    assert by_alias.status_code == 200 and by_alias.json()['id'] == w['s1']
    assert get('al5-' + w['x'], True).status_code == 404
    # 학사 행 없는 서비스 전용 학생: 범위 안 null 200, 범위 밖 404.
    service = get(w['s6'], True)
    assert service.status_code == 200 and service.json() is None
    assert get(w['s7'], True).status_code == 404
    # 범위 밖이어도 본인 담당 상담이 있으면 상세는 열린다(student_access 와 같은 규칙). 목록 모집단은 그대로.
    service_student(db, w['s5'])
    db.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,
      status_code,method_code,topic,requested_at,snapshot,source_payload)
      VALUES(%s,%s,%s,'PROF','교수',NULL,'REQ','OFFLINE','Scope topic',now(),'{}','{}')''',
               ('scope-counsel-' + w['x'], w['s5'], w['prof']))
    opened = get(w['s5'])
    assert opened.status_code == 200 and opened.json()['hasServiceProfile'] is True
    assert w['s5'] not in {r['id'] for r in listing(client, w['prof'])['items']}
    # 무권한 교직원(교수·조교 아님) 403, 학생 403.
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'No Role','STAFF','local')",
               ('nr-' + w['x'], 'nr-' + w['x']))
    for who in ('nr-' + w['x'], 'chaewon'):
        for path in ('', '/metadata', '/' + w['s1']):
            assert client.get(LIST + path, headers=headers(who)).status_code == 403


def test_release_removes_students_from_list_and_detail(client, db, w):
    """§4-2 — 배정 해제 즉시 목록·상세에서 빠진다(배정 표가 곧 권한)."""
    assert listing(client, w['prof'])['totalCount'] == 3
    db.execute('UPDATE dc.org_assignment SET is_active=false WHERE staff_uid=%s', (w['prof'],))
    assert listing(client, w['prof'])['totalCount'] == 0
    assert client.get(LIST + '/' + w['s1'], headers=headers(w['prof']), params={'optional': True}).status_code == 404


def test_counselor_unchanged_keys_match_and_export_is_counselor_only(client, db, w):
    """§4-6·8 — 상담사 결과·canReadDetail 불변, 교수 모드 응답 키 = 상담사 모드, 내보내기 교수·조교 403."""
    counselor, professor = listing(client, 'career_kim', q=w['x']), listing(client, w['prof'], q=w['x'])
    assert {r['id'] for r in counselor['items']} == {w[k] for k in ('s1', 's2', 's3', 's4', 's5')}
    assert all(r['canReadDetail'] is True for r in counselor['items'])
    assert set(counselor) == set(professor) == {'items', 'totalCount', 'page', 'pageSize'}
    assert professor['items'] and {frozenset(r) for r in professor['items']} == {frozenset(r) for r in counselor['items']}
    assert set(counselor['items'][0]) == {'id', 'studentNo', 'name', 'major', 'collegeName', 'grade', 'sex', 'sexCode',
        'graduationMonth', 'gpa', 'academicLevel', 'status', 'studentType', 'star', 'tier', 'progress', 'hasRoadmap',
        'hasDetail', 'canReadDetail', 'programCount', 'counselCount'}
    c_meta = client.get(LIST + '/metadata', headers=headers('career_kim')).json()
    p_meta = client.get(LIST + '/metadata', headers=headers(w['prof'])).json()
    assert set(c_meta['summary']) == set(p_meta['summary']) and set(c_meta['options']) == set(p_meta['options'])
    for who in (w['prof'], w['asst']):
        assert client.post(LIST + '/export', headers=headers(who), json={'ids': [w['s1']]}).status_code == 403
    assert client.post(LIST + '/export', headers=headers('career_kim'), json={'ids': [w['s1']]}).status_code == 200


def test_diagnosed_variant_keeps_the_scope(client, db, w):
    """§4-10 — diagnosed 변형(자리표시자 위치 동일)도 범위 밖 학생을 주지 않는다."""
    for uid in (w['s1'], w['s5']):
        service_student(db, uid)
        db.execute('''INSERT INTO dc.diagnosis_attempt(id,student_uid,test_id,attempt_no,status_code,payload)
          VALUES(%s,%s,'ccore',1,'DONE','{}')''', ('scope-diag-' + uid, uid))
    params = {'filters.diagnosed': 'Y', 'q': w['x']}
    assert {r['id'] for r in listing(client, w['prof'], **params)['items']} == {w['s1']}
    assert {r['id'] for r in listing(client, 'career_kim', **params)['items']} == {w['s1'], w['s5']}
    meta = client.get(LIST + '/metadata', headers=headers(w['prof']), params={'diagnosed': True})
    assert meta.status_code == 200, meta.text
    assert meta.json()['summary']['total'] == 1
