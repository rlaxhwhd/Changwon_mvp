"""Explicit account data migration, restricted to an isolated local database."""
from pathlib import Path
from decimal import Decimal
import subprocess
from uuid import uuid4

import psycopg
import pytest
from app.settings import settings
from test_api import headers

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'backend/scripts/register_test_student.sql'


def owner():
    assert settings.db_name.endswith('_test')
    return psycopg.connect(host='127.0.0.1', port=15432, dbname=settings.db_name,
                          user='postgres', password=(ROOT / 'deploy/secrets/postgres_password_local').read_text().strip())


@pytest.fixture
def number():
    with owner() as conn:
        # 테스트 DB 의 학사 원본 대역(전산원 사본). 학과 (5,414) 는 시드에 있다.
        conn.execute('''INSERT INTO academic.dc_v_col_inf(col_code,col_name,col_short_name,use_flag)
          SELECT '5','공과대학','공대','1' WHERE NOT EXISTS(SELECT 1 FROM academic.dc_v_col_inf WHERE col_code='5')''')
        conn.execute('''INSERT INTO academic.dc_v_dept_inf(dept_code,col_code,dept_name,class3,day_flag,degree_code,gubun_code,use_flag,univ_code)
          SELECT '414','5','컴퓨터공학과','1','1','1','0','1','00'
          WHERE NOT EXISTS(SELECT 1 FROM academic.dc_v_dept_inf WHERE dept_code='414')''')
    return str(90000000 + int(uuid4().hex[:8], 16) % 9999999)


def register(number, apply=True, **overrides):
    assert settings.db_name.endswith('_test')
    values = dict(student_no=number, student_name='등록 테스트', college_name='공과대학',
                  dept_name='컴퓨터공학과', service_college='5', service_dept='414',
                  academic_college='5', academic_dept='414', grade='3', gpa='3.5',
                  sex_code='0', apply='true' if apply else 'false')
    values.update(overrides)
    args = ['docker', 'exec', '-i', 'dreamcatch-dev-db', 'psql', '-X', '-U', 'postgres', '-d', settings.db_name]
    for key, value in values.items():
        args.extend(['-v', f'{key}={value}'])
    return subprocess.run(args, input=SCRIPT.read_bytes(), capture_output=True)


def test_register_dry_run_login_profile_and_empty_history(client, number):
    assert register(number, apply=False).returncode == 0
    with owner() as conn:
        assert not conn.execute('SELECT 1 FROM dc.person WHERE intg_uid=%s', (number,)).fetchone()
    applied = register(number)
    assert applied.returncode == 0, applied.stderr.decode('utf-8', errors='replace')
    head = {**headers(number), 'X-DC-Portal': 'student'}
    login = client.post('/api/v1/auth/student/login', headers=head, json={'studentNo': number, 'password': '!'})
    assert login.status_code == 200, login.text
    bootstrap = client.get('/api/v1/bootstrap/profiles', headers=head)
    assert bootstrap.status_code == 200, bootstrap.text
    boot = bootstrap.json()
    assert [row['id'] for row in boot['students']] == [number]
    assert boot['students'][0]['grade'] == 3
    assert boot['students'][0]['phases'] == []
    assert boot['counselOwners'] == []
    profile = client.get(f'/api/v1/students/{number}', headers=head)
    assert profile.status_code == 200, profile.text
    data = profile.json()
    assert (data['grade'], data['gpa'], data['major'], data['collegeName']) == (3, '3.50', '컴퓨터공학과', '공과대학')
    diagnosis = client.get(f'/api/v1/diagnosis/students/{number}', headers=head).json()
    assert diagnosis['attempts'] == [] and diagnosis['results'] == []
    assert diagnosis['retake']['permissions']['ccore'] and not diagnosis['retake']['annual']['eligible']
    roster = client.get(f'/api/v1/academic-students?q={number}', headers={**headers('career_kim'), 'X-DC-Portal': 'admin'})
    assert roster.status_code == 200, roster.text
    row = next(r for r in roster.json()['items'] if r['studentNo'] == number)
    assert (row['collegeName'], row['major'], row['grade'], row['sex']) == ('공과대학', '컴퓨터공학과', 3, '남자')
    assert Decimal(row['gpa']) == Decimal('3.5')
    with owner() as conn:
        for table in ('counsel_request', 'roadmap', 'student_type_event'):
            assert not conn.execute(f'SELECT 1 FROM dc.{table} WHERE student_uid=%s', (number,)).fetchone()


def test_register_reapply_preserves_existing_history(number):
    assert register(number).returncode == 0
    with owner() as conn:
        conn.execute("INSERT INTO dc.diagnosis_attempt(id,student_uid,test_id,attempt_no,status_code,payload) VALUES(%s,%s,'ccore',1,'NOT_STARTED','{}')", (uuid4().hex, number))
    assert register(number).returncode == 0
    with owner() as conn:
        assert conn.execute('SELECT count(*) FROM dc.person WHERE intg_uid=%s', (number,)).fetchone()[0] == 1
        assert conn.execute('SELECT count(*) FROM academic.local_usr_inf WHERE intg_uid=%s', (number,)).fetchone()[0] == 1
        assert conn.execute('SELECT count(*) FROM dc.diagnosis_attempt WHERE student_uid=%s', (number,)).fetchone()[0] == 1


def test_register_collision_and_invalid_organization_rollback(number):
    assert register(number, service_dept='unknown').returncode != 0
    with owner() as conn:
        assert not conn.execute('SELECT 1 FROM dc.person WHERE intg_uid=%s', (number,)).fetchone()
        conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Unrelated fixture','STUDENT','fixture')", (number, number))
    collision = register(number)
    assert collision.returncode != 0
    with owner() as conn:
        assert conn.execute('SELECT name FROM dc.person WHERE intg_uid=%s', (number,)).fetchone()[0] == 'Unrelated fixture'
        assert not conn.execute('SELECT 1 FROM dc.student WHERE intg_uid=%s', (number,)).fetchone()
        assert not conn.execute('SELECT 1 FROM academic.local_usr_inf WHERE intg_uid=%s', (number,)).fetchone()
