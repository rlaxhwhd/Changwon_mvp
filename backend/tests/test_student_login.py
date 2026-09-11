"""Run against an isolated *_test copy containing the academic mirror."""
import hashlib
from pathlib import Path

import psycopg

from app.settings import settings
from test_api import headers


def student_headers():
    return {**headers('ignored-selector'), 'X-DC-Portal': 'student'}


def login(client, number='20180001', password='!'):
    return client.post('/api/v1/auth/student/login', headers=student_headers(),
                       json={'studentNo': number, 'password': password})


def owner():
    assert settings.db_name.endswith('_test')
    root = Path(__file__).resolve().parents[2]
    return psycopg.connect(host='127.0.0.1', port=15432, dbname=settings.db_name,
                          user='postgres', password=(root/'deploy/secrets/postgres_password_local').read_text().strip())


def test_invalid_login_and_header_bypass(client):
    client.cookies.clear()
    assert login(client, password='wrong').status_code == 401
    assert login(client, number='not-in-academic-source').status_code == 401
    assert client.get('/api/v1/bootstrap/profiles', headers={**headers('20180001'), 'X-DC-Portal':'student'}).status_code == 401
    assert client.get('/api/v1/bootstrap/profiles', headers=headers('20180001')).status_code == 401


def test_requested_student_and_cookie_scope(client):
    client.cookies.clear()
    response = login(client)
    assert response.status_code == 200
    assert response.json()['name'] == '홍길동'
    assert response.json()['major'] == '전자공학과'
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'samesite=lax' in response.headers['set-cookie'].lower()
    own = client.get('/api/v1/auth/student/me', headers={**student_headers(), 'X-DC-Identity':'chaewon'})
    assert own.json()['id'] == '20180001'
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
        conn.execute("INSERT INTO academic.v_usr_inf(intg_uid,login_id,user_ty_cd,usr_nm,orgz_nm,stu_schgr) VALUES ('20999991','20999991','1101','로그인 테스트','전자공학과','2')")
        conn.execute("INSERT INTO academic.v_usr_inf(intg_uid,user_ty_cd,usr_nm) VALUES ('staff-login-test','1301','교원 테스트')")
    client.cookies.clear()
    assert login(client, number='staff-login-test').status_code == 401
    assert login(client, number='20999991').status_code == 200
    assert login(client, number='20999991').status_code == 200
    with owner() as conn:
        assert conn.execute("SELECT count(*) FROM dc.student WHERE intg_uid='20999991'").fetchone()[0] == 1
        assert conn.execute("SELECT source FROM dc.person WHERE intg_uid='20999991'").fetchone()[0] == 'academic'
    assert client.get('/api/v1/bootstrap/profiles', headers=student_headers()).json()['students'][0]['grade'] == 2
    client.post('/api/v1/auth/student/logout', headers=student_headers())
