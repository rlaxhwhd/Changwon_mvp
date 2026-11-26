"""Run against an isolated *_test DB. Academic rows go to the DC_V_* source stand-in or academic.local_usr_inf (0021)."""
import hashlib
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest

from app.settings import settings
from test_api import headers
from academic_test_support import add_academic_dept, add_academic_user

TEST_STUDENT_NO = 'test-' + uuid4().hex[:12]
NEW_STUDENT_NO = 'new-' + uuid4().hex[:12]
STAFF_LOGIN_ID = 'staff-' + uuid4().hex[:12]


def student_headers():
    return {**headers('ignored-selector'), 'X-DC-Portal': 'student'}


def login(client, number=TEST_STUDENT_NO, password='!'):
    return client.post('/api/v1/auth/student/login', headers=student_headers(),
                       json={'studentNo': number, 'password': password})


def owner():
    assert settings.db_name.endswith('_test')
    root = Path(__file__).resolve().parents[2]
    return psycopg.connect(host='127.0.0.1', port=15432, dbname=settings.db_name,
                          user='postgres', password=(root/'deploy/secrets/postgres_password_local').read_text().strip())


@pytest.fixture(scope='module', autouse=True)
def academic_login_student():
    # Synthetic mirror input, not a dependency on a developer's imported data.
    with owner() as conn:
        add_academic_dept(conn, '5', '공과대학', '714', '전자공학과')
        add_academic_user(conn, TEST_STUDENT_NO, usr_nm='홍길동', stu_schgr='2', hofc_sta_cd='0001',
                          univ_cd='00', daehak_cd='5', hakbu_cd='714')


def test_invalid_login_and_header_bypass(client):
    client.cookies.clear()
    assert login(client, password='wrong').status_code == 401
    assert login(client, number='not-in-academic-source').status_code == 401
    assert client.get('/api/v1/bootstrap/profiles', headers={**headers(TEST_STUDENT_NO), 'X-DC-Portal':'student'}).status_code == 401
    assert client.get('/api/v1/bootstrap/profiles', headers=headers(TEST_STUDENT_NO)).status_code == 401


def test_requested_student_and_cookie_scope(client):
    client.cookies.clear()
    response = login(client)
    assert response.status_code == 200
    assert response.json()['name'] == '홍길동'
    assert response.json()['major'] == '전자공학과'
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'samesite=lax' in response.headers['set-cookie'].lower()
    own = client.get('/api/v1/auth/student/me', headers={**student_headers(), 'X-DC-Identity':'chaewon'})
    assert own.json()['id'] == TEST_STUDENT_NO
    assert client.get('/api/v1/students/chaewon', headers=student_headers()).status_code == 404
    assert client.get('/api/v1/system/academic/people', headers=student_headers()).status_code == 403
    data = client.get('/api/v1/bootstrap/profiles', headers=student_headers()).json()
    assert len(data['students']) == 1
    profile = data['students'][0]
    assert profile['collegeName'] == '공과대학'
    assert profile['studentType'] is None and profile['hasRoadmap'] is False
    assert profile['phases'] == []
    assert client.post('/api/v1/auth/student/logout', headers=student_headers()).status_code == 204
    assert client.get('/api/v1/auth/student/me', headers=student_headers()).status_code == 401


def test_session_expiry(client):
    client.cookies.clear()
    assert login(client).status_code == 200
    token = client.cookies.get('dc_student_session')
    with owner() as conn:
        conn.execute("UPDATE dc.student_login_session SET expires_at=now()-interval '1 second' WHERE token_hash=%s",
                     (hashlib.sha256(token.encode()).hexdigest(),))
    assert client.get('/api/v1/auth/student/me', headers=student_headers()).status_code == 401
    client.cookies.clear()


def test_first_academic_login_provisions_once_and_excludes_staff(client):
    with owner() as conn:
        add_academic_user(conn, NEW_STUDENT_NO, usr_nm='로그인 테스트', stu_schgr='2', hofc_sta_cd='0001', hakbu_cd='714')
        add_academic_user(conn, STAFF_LOGIN_ID, user_ty_cd='0002', usr_nm='교원 테스트', emp_no='T' + STAFF_LOGIN_ID[-8:],
                          hofc_sta_cd='0006', hakbu_cd='714')
    client.cookies.clear()
    assert login(client, number=STAFF_LOGIN_ID).status_code == 401
    assert login(client, number=NEW_STUDENT_NO).status_code == 200
    assert login(client, number=NEW_STUDENT_NO).status_code == 200
    with owner() as conn:
        assert conn.execute("SELECT count(*) FROM dc.student WHERE intg_uid=%s", (NEW_STUDENT_NO,)).fetchone()[0] == 1
        assert conn.execute("SELECT source FROM dc.person WHERE intg_uid=%s", (NEW_STUDENT_NO,)).fetchone()[0] == 'academic'
    assert client.get('/api/v1/bootstrap/profiles', headers=student_headers()).json()['students'][0]['grade'] == 2
    client.post('/api/v1/auth/student/logout', headers=student_headers())


def test_first_login_links_the_academic_department_pair(client):
    with owner() as conn:
        row = conn.execute("SELECT college_code,dept_code,major_label FROM dc.student WHERE intg_uid=%s", (NEW_STUDENT_NO,)).fetchone()
    # 학과 = HAKBU_CD, 단대 = 그 학과의 COL_CODE(학생 DAEHAK_CD 가 아니다).
    assert row == ('5', '714', '전자공학과')


def test_graduates_log_in_but_any_status_student_only(client):
    graduate, unknown = 'grad-' + uuid4().hex[:10], 'nostat-' + uuid4().hex[:10]
    assistant = 'asst-' + uuid4().hex[:8]
    with owner() as conn:
        add_academic_user(conn, graduate, usr_nm='졸업생', hofc_sta_cd='0005', hakbu_cd='714')
        add_academic_user(conn, unknown, usr_nm='학적미상', hofc_sta_cd=None, hakbu_cd='714')
        add_academic_user(conn, assistant, user_ty_cd='0004', usr_nm='조교', emp_no='A' + uuid4().hex[:8])
    client.cookies.clear()
    assert login(client, number=graduate).status_code == 200
    assert login(client, number=unknown).status_code == 200
    assert login(client, number=assistant).status_code == 401
    client.post('/api/v1/auth/student/logout', headers=student_headers())


def test_fixture_number_override_and_source_precedence(client):
    local_uid, number = '2' + str(uuid4().int)[:7], 'fx-' + uuid4().hex[:8]
    with owner() as conn:
        # 로컬 인원 + 로그인 번호(fixture). 로그인은 번호를 uid 로 먼저 푼다.
        add_academic_user(conn, local_uid, local=True, usr_nm='로컬 학생', hofc_sta_cd='0001', hakbu_cd='714')
        conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'로컬 학생','STUDENT','fixture')", (local_uid, local_uid))
        conn.execute("INSERT INTO dc.student(intg_uid,student_no,major_label) VALUES(%s,%s,'전자공학과')", (local_uid, number))
        conn.execute('INSERT INTO dc.fixture_student_login(student_no,student_uid) VALUES(%s,%s)', (number, local_uid))
        source = conn.execute('SELECT student_no,local_override FROM dc.student_login_source WHERE intg_uid=%s', (local_uid,)).fetchone()
        assert source == (number, True)
    client.cookies.clear()
    response = login(client, number=number)
    assert response.status_code == 200, response.text
    assert response.json()['id'] == local_uid
    client.post('/api/v1/auth/student/logout', headers=student_headers())
    with owner() as conn:
        # 학사 override 가 이름·학과를 이긴다.
        conn.execute('''INSERT INTO dc.student_login_override(intg_uid,name,college_code,dept_code,college_name,dept_name)
          VALUES(%s,'덮어쓴 이름','5','714','공과대학','전자공학과')''', (TEST_STUDENT_NO,))
        assert conn.execute('SELECT name,local_override FROM dc.student_login_source WHERE intg_uid=%s',
                            (TEST_STUDENT_NO,)).fetchone() == ('덮어쓴 이름', True)
        conn.rollback()
    with owner() as conn:
        # 같은 번호가 원본에 생기면 원본이 이긴다(동기화는 이 충돌을 공개 전에 막는다 — 뷰는 방어선이다).
        add_academic_user(conn, local_uid, usr_nm='원본 학생', hofc_sta_cd='0001', hakbu_cd='714')
        rows = conn.execute('SELECT name FROM dc.student_login_source WHERE intg_uid=%s', (local_uid,)).fetchall()
        assert rows == [('원본 학생',)]
        conn.rollback()
