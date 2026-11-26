"""Standalone tests: never connect to Oracle; integration uses a disposable local DB."""
import importlib.util
from collections import Counter
from decimal import Decimal
from datetime import datetime
from pathlib import Path
import unittest
import uuid

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('sync_academic', ROOT / 'backend/scripts/sync_academic.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class AcademicSyncTest(unittest.TestCase):
    def test_source_rejects_any_non_allowlisted_statement_before_connection_access(self):
        source = object.__new__(sync.Source)
        for statement in ['DELETE FROM V_USR_INF', 'SELECT * FROM V_USR_INF FOR UPDATE',
                          'BEGIN NULL; END;', 'SELECT malicious_function() FROM dual']:
            with self.assertRaises(ValueError):
                next(source.rows(statement))

    def test_exact_values_and_duplicate_counts(self):
        row = ('0001', '한글  ', None, Decimal('123456789012345678901234567890.123400'))
        equal = (*row[:3], Decimal('123456789012345678901234567890.1234'))
        self.assertEqual(sync.fingerprint(row), sync.fingerprint(equal))
        self.assertNotEqual(sync.fingerprint(row), sync.fingerprint(('0001', '한글', None, row[3])))
        self.assertNotEqual(sync.digest(Counter([sync.fingerprint(row)])),
                            sync.digest(Counter([sync.fingerprint(row)] * 2)))
        self.assertEqual(sync.fingerprint((datetime(2026, 9, 11, 1, 2, 3),)),
                         sync.fingerprint((datetime.fromisoformat('2026-09-11T01:02:03'),)))

    def test_local_publish_and_failure_rollback(self):
        secret = ROOT / 'deploy/secrets/postgres_password_local'
        if not secret.exists():
            self.skipTest('Local owner secret unavailable')
        kwargs = dict(host='127.0.0.1', port=15432, user='postgres',
                      password=secret.read_text().strip())
        database = 'academic_copy_test_' + uuid.uuid4().hex[:12]
        with psycopg.connect(dbname='postgres', autocommit=True, **kwargs) as owner:
            owner.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database)))
            try:
                with psycopg.connect(dbname=database, **kwargs) as target:
                    target.execute((ROOT / 'backend/migrations/053_academic_mirror.sql').read_text())
                class FakeSource:
                    def __init__(self, fail=False):
                        self.fail = fail

                    def rows(self, query, numeric_columns=()):
                        if query == sync.METADATA_SQL:
                            yield from map(tuple, sync.COLUMNS)
                            return
                        table = next(t for t, q in sync.DATA_SQL.items() if q == query)
                        if self.fail and table == 'V_USR_INF':
                            raise RuntimeError('Simulated late source disconnect')
                        columns = [r for r in sync.COLUMNS if r[0] == table]
                        row = tuple(Decimal('1') if r[3] == 'NUMBER' else
                                    '1' if r[7] == 'N' else None for r in columns)
                        # Duplicate preservation must survive COPY and publication.
                        yield row
                        yield row
                with psycopg.connect(dbname=database, **kwargs) as target:
                    report = sync.copy_tables(FakeSource(), target)
                    self.assertTrue(all(r['rows'] == 2 and r['verified'] for r in report.values()))
                with self.assertRaises(RuntimeError):
                    with psycopg.connect(dbname=database, **kwargs) as target:
                        sync.copy_tables(FakeSource(fail=True), target)
                with psycopg.connect(dbname=database, **kwargs) as target:
                    for table in sync.TABLES:
                        count = target.execute(sql.SQL('SELECT count(*) FROM {}').format(
                            sql.Identifier('academic', table.lower()))).fetchone()[0]
                        self.assertEqual(count, 2)
            finally:
                owner.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(database)))


# ── 0021 전산원 DC_V_* 뷰 동기화(--source dc-views). Oracle 에 붙지 않고 빈 DB 에 전체 마이그레이션 후 가짜 원본으로 검증한다.
import os
import subprocess
import sys
from types import SimpleNamespace

import pytest

dc = importlib.util.module_from_spec(importlib.util.spec_from_file_location('sync_dc', ROOT / 'backend/scripts/sync_academic.py'))
dc.__spec__.loader.exec_module(dc)
dc.configure_dc_views()
ARGS = SimpleNamespace(query_timeout=1, long_query_timeout=1, fetch_size=10)
SECRET = ROOT / 'deploy/secrets/postgres_password_local'


def spec_of(view):
    return [r for r in dc.DC_COLUMNS if r[1] == view]


def make_row(view, **values):
    row = []
    for r in spec_of(view):
        value = values.get(r[3].lower())
        if r[4] == 'NUMBER' and value is not None:
            value = Decimal(str(value))
        row.append(value)
    return tuple(row)


def dept(code, college, name, univ='00', use_flag='1'):
    return make_row('DC_V_DEPT_INF', dept_code=code, col_code=college, dept_name=name, class3='1',
                    univ_code=univ, day_flag='1', use_flag=use_flag, degree_code='1', gubun_code='0')


def base_rows():
    return {
        'DC_V_COL_INF': [make_row('DC_V_COL_INF', col_code='5', col_name='공과대학', col_short_name='공대', use_flag='1', listorder=1),
                         make_row('DC_V_COL_INF', col_code='8', col_name='경영대학', col_short_name='경영', use_flag='1', listorder=2)],
        # 20% 감소 거부 규칙에 걸리지 않게 학과·코드는 여러 행으로 둔다.
        'DC_V_DEPT_INF': [dept('414', '5', '컴퓨터공학과'), dept('205', '8', '경영학과'), dept('206', '8', '회계학과'),
                          dept('212', '8', '국제무역학과', use_flag=None), dept('5414', '5', '컴퓨터공학과', univ='01')],
        'DC_V_MAJOR_INF': [make_row('DC_V_MAJOR_INF', major_code='414', major_name='컴퓨터공학', dept_code='414', use_flag='1', gubun_code='0')],
        'DC_V_CODE_INF': [make_row('DC_V_CODE_INF', code_grp='UNIV_CD', code=c, code_nm=n, use_yn='Y')
                          for c, n in (('00', '학부'), ('01', '석사'), ('02', '박사'), ('90', '전문학사'), ('91', '석박통합'))],
        'DC_V_USR_INF': [make_row('DC_V_USR_INF', intg_uid='29990001', user_ty_cd='0001', hofc_sta_cd='0001', usr_nm='가짜학생',
                                  hakbu_cd='414', daehak_cd='5', univ_cd='00', sex='1', stu_schgr='3', grade=3.5,
                                  upd_dt=datetime(2026, 11, 25, 1, 2, 3)),
                         make_row('DC_V_USR_INF', intg_uid='prof01', emp_no='P001', user_ty_cd='0002', hofc_sta_cd='0006', usr_nm='교수')],
    }


class FakeDcSource:
    def __init__(self, rows, present=None, metadata=None):
        self.rows_by_view, self.present, self.metadata = rows, present, metadata or {}

    def rows(self, query, numeric_columns=(), timeout=120, fetch_size=500):
        if query not in dc.ALLOWED_SQL:
            raise ValueError('not allowlisted')
        if query == dc.DC_METADATA_SQL:
            for o, v in dc.DC_VIEWS:
                if self.present is None or v in self.present:
                    yield from map(tuple, self.metadata.get(v, spec_of(v)))
            return
        view = next(k for k, q in dc.DC_DATA_SQL.items() if q == query)[1]
        yield from self.rows_by_view.get(view, [])


ALL_BUT_LECT = {v for _, v in dc.DC_VIEWS} - {'DC_V_LECT_OPEN_INF', 'DC_V_LECT_CAP_INF'}


@pytest.fixture(scope='module')
def migrated():
    if not SECRET.exists():
        pytest.skip('Local owner secret unavailable')
    kwargs = dict(host='127.0.0.1', port=15432, user='postgres', password=SECRET.read_text().strip())
    name = 'dc_view_sync_' + uuid.uuid4().hex[:10] + '_test'
    with psycopg.connect(dbname='postgres', autocommit=True, **kwargs) as owner:
        owner.execute(sql.SQL('CREATE DATABASE {} OWNER dc_owner').format(sql.Identifier(name)))
    try:
        with psycopg.connect(dbname=name, autocommit=True, **kwargs) as conn:
            conn.execute('CREATE SCHEMA dc AUTHORIZATION dc_owner; GRANT USAGE ON SCHEMA dc TO dc_app')
        env = {**os.environ, 'DC_DB_NAME': name, 'DC_DB_USER': 'postgres', 'DC_DB_HOST': '127.0.0.1',
               'DC_DB_PORT': '15432', 'DC_DB_PASSWORD_FILE': str(SECRET), 'PYTHONUTF8': '1'}
        subprocess.run([sys.executable, '-m', 'app.migrate'], cwd=ROOT / 'backend', env=env, check=True,
                       stdout=subprocess.DEVNULL)
        yield dict(dbname=name, **kwargs)
    finally:
        with psycopg.connect(dbname='postgres', autocommit=True, **kwargs) as owner:
            owner.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(name)))


def run(migrated, source):
    with psycopg.connect(autocommit=True, **migrated) as target:
        return dc.sync_dc_views(source, target, ARGS, log=lambda *_: None)


def scalar(migrated, query, *params):
    with psycopg.connect(**migrated) as conn:
        return conn.execute(query, params).fetchone()[0]


def test_dc_views_publish_rerun_unchanged_and_department_projection(migrated):
    first = run(migrated, FakeDcSource(base_rows(), present=ALL_BUT_LECT))
    views = first['views']
    assert views['REQUEST.DC_V_LECT_OPEN_INF'] == {'status': 'missing'}
    assert views['INTRANET.DC_V_USR_INF']['status'] == 'published' and views['INTRANET.DC_V_USR_INF']['rows'] == 2
    assert first['checks']['studentIntgUidDuplicates'] == 0 and first['refresh']['upserted'] == 5
    assert scalar(migrated, "SELECT course FROM dc.department WHERE dept_code='414'") == '학부'
    assert scalar(migrated, "SELECT course||'/'||univ_code FROM dc.department WHERE dept_code='5414'") == '석사/01'
    # 원본 USE_FLAG 는 NULL 일 수 있다 — '1' 이 아니면 비활성(NOT NULL 열에 NULL 을 넣지 않는다).
    assert scalar(migrated, "SELECT is_active FROM dc.department WHERE dept_code='212'") is False
    assert scalar(migrated, "SELECT count(*) FROM dc.student_login_source WHERE intg_uid='29990001' AND dept_code='414' AND college_code='5'") == 1
    # 같은 데이터로 다시 돌리면 모든 뷰가 공개를 생략한다.
    again = run(migrated, FakeDcSource(base_rows(), present=ALL_BUT_LECT))
    assert {v['status'] for v in again['views'].values()} == {'unchanged', 'missing'}
    assert scalar(migrated, "SELECT count(*) FROM academic.sync_run WHERE source_label='DC_VIEWS'") == 2
    # 가산 해시는 중복 행을 센다(같은 행 두 번 ≠ 한 번).
    doubled = base_rows()
    doubled['DC_V_CODE_INF'] = doubled['DC_V_CODE_INF'] + doubled['DC_V_CODE_INF'][:1]
    third = run(migrated, FakeDcSource(doubled, present=ALL_BUT_LECT))
    assert third['views']['REQUEST.DC_V_CODE_INF']['status'] == 'published'
    assert third['checks']['codeKeyDuplicates'] == 1
    run(migrated, FakeDcSource(base_rows(), present=ALL_BUT_LECT))


def test_local_identity_collision_blocks_whole_publish(migrated):
    with psycopg.connect(**migrated) as conn:
        conn.execute("INSERT INTO academic.local_usr_inf(intg_uid,user_ty_cd,usr_nm) VALUES('29990001','0001','로컬')")
    try:
        rows = base_rows()
        rows['DC_V_CODE_INF'] = rows['DC_V_CODE_INF'] + [make_row('DC_V_CODE_INF', code_grp='UNIV_CD', code='92', code_nm='석박통합')]
        before = scalar(migrated, 'SELECT count(*) FROM academic.sync_run')
        with pytest.raises(RuntimeError, match='localIntgUidCollisions'):
            run(migrated, FakeDcSource(rows, present=ALL_BUT_LECT))
        assert scalar(migrated, 'SELECT count(*) FROM academic.sync_run') == before
        assert scalar(migrated, 'SELECT count(*) FROM academic.dc_v_code_inf') == 5
    finally:
        with psycopg.connect(**migrated) as conn:
            conn.execute("DELETE FROM academic.local_usr_inf WHERE intg_uid='29990001'")


def test_missing_view_with_rows_and_drift_abort_but_new_view_drift_is_skipped(migrated):
    with pytest.raises(RuntimeError, match='missing'):
        run(migrated, FakeDcSource(base_rows(), present=ALL_BUT_LECT - {'DC_V_CODE_INF'}))
    drifted = [list(r) for r in spec_of('DC_V_COL_INF')]
    drifted[1][7] = '80'
    with pytest.raises(RuntimeError, match='drift'):
        run(migrated, FakeDcSource(base_rows(), present=ALL_BUT_LECT, metadata={'DC_V_COL_INF': drifted}))
    # 처음 나타난 엑셀 추정 뷰가 명세와 다르면 그 뷰만 건너뛰고 나머지는 공개한다.
    estimated = [list(r) for r in spec_of('DC_V_LECT_OPEN_INF')]
    estimated[0][9] = '4'
    result = run(migrated, FakeDcSource(base_rows(), present=ALL_BUT_LECT | {'DC_V_LECT_OPEN_INF'},
                                        metadata={'DC_V_LECT_OPEN_INF': estimated}))
    assert result['views']['REQUEST.DC_V_LECT_OPEN_INF'] == {'status': 'drift_new'}


def test_duplicate_department_code_blocks_publish(migrated):
    rows = base_rows()
    rows['DC_V_DEPT_INF'] = rows['DC_V_DEPT_INF'] + [rows['DC_V_DEPT_INF'][0]]
    with pytest.raises(RuntimeError, match='deptCodeDuplicates'):
        run(migrated, FakeDcSource(rows, present=ALL_BUT_LECT))


def test_refresh_moves_college_in_place_logs_and_deactivates(migrated):
    run(migrated, FakeDcSource(base_rows(), present=ALL_BUT_LECT))
    with psycopg.connect(**migrated) as conn:
        conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES('29990001','29990001','가짜학생','STUDENT','academic') ON CONFLICT DO NOTHING")
        conn.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code) VALUES('29990001','29990001','컴퓨터공학과','5','414') ON CONFLICT DO NOTHING")
        conn.execute("INSERT INTO dc.department_staff_assignment(college_code,dept_code,major_code,staff_uid,role_code) VALUES('5','414','414','P001','professor')")
    rows = base_rows()
    rows['DC_V_COL_INF'] = rows['DC_V_COL_INF'] + [make_row('DC_V_COL_INF', col_code='9', col_name='새단대', col_short_name='새', use_flag='1')]
    rows['DC_V_DEPT_INF'] = [dept('414', '9', '컴퓨터공학과')] + rows['DC_V_DEPT_INF'][2:]
    result = run(migrated, FakeDcSource(rows, present=ALL_BUT_LECT))
    assert result['refresh']['moved'] == 1 and result['refresh']['deactivated'] == 1
    with psycopg.connect(**migrated) as conn:
        assert conn.execute("SELECT college_code FROM dc.student WHERE intg_uid='29990001'").fetchone()[0] == '9'
        assert conn.execute("SELECT college_code FROM dc.department_staff_assignment WHERE staff_uid='P001'").fetchone()[0] == '9'
        assert conn.execute("SELECT is_active FROM dc.department WHERE dept_code='205'").fetchone()[0] is False
        logged = {r[0] for r in conn.execute("SELECT table_name FROM dc.org_code_remap WHERE reason='college_move'")}
        assert logged == {'department', 'student', 'department_staff_assignment'}
        with pytest.raises(psycopg.errors.ObjectNotInPrerequisiteState):
            conn.execute('DELETE FROM dc.org_code_remap')
    # 빈 원본으로는 학과 투영을 전부 비활성화하지 않는다.
    with psycopg.connect(**migrated) as conn:
        conn.execute('DELETE FROM academic.dc_v_dept_inf')
        with pytest.raises(psycopg.errors.RaiseException, match='empty'):
            conn.execute('SELECT dc.refresh_department_from_academic()')


def test_app_role_cannot_run_refresh_or_read_academic(migrated):
    with psycopg.connect(**migrated) as conn:
        assert not conn.execute("SELECT has_function_privilege('dc_app','dc.refresh_department_from_academic()','EXECUTE')").fetchone()[0]
        assert not conn.execute("SELECT has_function_privilege('public','dc.refresh_department_from_academic()','EXECUTE')").fetchone()[0]
        assert not conn.execute("SELECT has_schema_privilege('dc_app','academic','USAGE')").fetchone()[0]
        assert not conn.execute("SELECT has_table_privilege('dc_app','dc.org_code_remap','SELECT')").fetchone()[0]
        assert conn.execute("SELECT has_table_privilege('dc_app','dc.staff_student_scope','SELECT')").fetchone()[0]
        conn.execute('SET ROLE dc_app')
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute('SELECT 1 FROM academic.dc_v_usr_inf')


def test_app_role_can_run_the_student_login_lookup(migrated):
    # API 는 dc_app 으로 로그인 조회를 한다. 소유자 계정 테스트만으로는 fixture 번호 서브쿼리 권한 누락을 못 잡는다(178).
    with psycopg.connect(**migrated) as conn:
        conn.execute('SET ROLE dc_app')
        conn.execute('''SELECT * FROM dc.student_login_source
          WHERE intg_uid=COALESCE((SELECT student_uid FROM dc.fixture_student_login WHERE student_no=%s),%s)
          LIMIT 2''', ('20990001', '20990001')).fetchall()
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("UPDATE dc.fixture_student_login SET student_uid = student_uid WHERE false")


if __name__ == '__main__':
    unittest.main()
