"""0026 이뤄드림 수집기(sync_eco_competency.py) — 업체 접속 없음. 가짜 업체 행만 쓴다.

검증(전체 중단)·제외(행만)·공개(한 트랜잭션·하한·lock)·비밀/학번 비노출. 공개 시험은 격리 테스트 DB 의 eco 표를 실제로
교체하므로 각 시험 끝에 두 표를 비운다(eco.sync_run 은 append-only 라 시험 기록 행이 남는다 — 격리 DB 전용).
"""
import importlib.util
import json
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
import random

import psycopg
import pytest

from app.settings import settings

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('sync_eco_competency', ROOT / 'backend/scripts/sync_eco_competency.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

TITLES = {1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5'}
SECRET_HOST, SECRET_USER, SECRET_PASSWORD = 'vendor-host-zq81.example.test', 'vendor-user-zq81', 'pw-zq81-secret'


def element(essential=1, point='1', title=None, child=0):
    return f'{{"essential":{essential},"title":"{title or "T" + str(essential)}","child":{child},"point":{point}}}'


def row(app_id, student='ecoS0001', elements=None, status='CONFIRMED', completed=1):
    raw = '[' + ','.join(elements if elements is not None else [element()]) + ']'
    return (app_id, student, 7, 9, status, completed, None, raw, None)


def rows(n, start=1):
    return [row(i, f'ecoS{i:04d}', [element(1 + i % 5, '0.5'), element(2, '1')]) for i in range(start, start + n)]


def code(raw_rows, titles=TITLES):
    with pytest.raises(sync.Abort) as caught:
        sync.validate(raw_rows, titles)
    return caught.value.code


@pytest.mark.parametrize('raw,expected', [
    ('[{"essential":1,', 'SKILL_SCORES_JSON'),
    ('[{"essential":1,"title":"T1","child":0,"point":NaN}]', 'SKILL_SCORES_JSON'),
    ('[{"essential":1,"title":"T1","child":0,"point":Infinity}]', 'SKILL_SCORES_JSON'),
    ('[{"essential":1,"title":"T1","child":0,"point":true}]', 'POINT_VALUE'),
    ('[{"essential":1,"title":"T1","child":0,"point":"1"}]', 'POINT_VALUE'),
    ('[{"essential":1,"title":"T1","child":0,"point":-0.1}]', 'POINT_VALUE'),
    ('[{"essential":"1","title":"T1","child":0,"point":1}]', 'ESSENTIAL_VALUE'),
    ('[{"essential":true,"title":"T1","child":0,"point":1}]', 'ESSENTIAL_VALUE'),
    ('[{"essential":6,"title":"T6","child":0,"point":1}]', 'ESSENTIAL_VALUE'),
    ('[{"essential":1,"title":"T1","child":1,"point":1}]', 'CHILD_VALUE'),
    ('[{"essential":1,"title":"Other","child":0,"point":1}]', 'TITLE_MISMATCH'),
    ('[{"essential":1,"title":"T1","child":0,"point":1,"extra":1}]', 'SKILL_SCORES_KEYS'),
    ('[{"essential":1,"title":"T1","child":0}]', 'SKILL_SCORES_KEYS'),
    ('[{"essential":1,"essential":2,"title":"T1","child":0,"point":1}]', 'SKILL_SCORES_JSON'),
    ('{"essential":1}', 'SKILL_SCORES_NOT_ARRAY'),
    (b'[\xff]', 'SKILL_SCORES_ENCODING'),
])
def test_invalid_skill_scores_abort_everything(raw, expected):
    assert code([*rows(3), (99, 'ecoS0099', None, None, 'CONFIRMED', 1, None, raw, None)]) == expected


def test_duplicate_application_and_type_drift_abort():
    assert code([*rows(2), row(1)]) == 'APPLICATION_ID_DUPLICATE'
    assert code([(True, 'ecoS1', None, None, 'CONFIRMED', 1, None, '[]', None)]) == 'APPLICATION_ID_TYPE'
    assert code([(1, 'ecoS1', None, None, 'CONFIRMED', 2, None, '[]', None)]) == 'IS_COMPLETED_TYPE'
    assert code([(1, 'ecoS1', None, None, 'CONFIRMED', 'true', None, '[]', None)]) == 'IS_COMPLETED_TYPE'
    assert sync._completed('TRUE') is True and sync._completed('FALSE') is False   # 업체 명세 문자열


def test_valid_rows_decimal_sums_empty_arrays_and_excluded_student_numbers():
    raw_rows = [row(1, 'ecoS0001', [element(1, '0.1'), element(1, '0.2'), element(3, '16')]),
                row(2, 'ecoS0001', []),                                     # 빈 배열 — 원값만, 지급 행 0
                row(3, 'eco S0003', [element(2, '1')]),                     # 공백 포함 학번 — 행만 제외
                row(4, '', [element(2, '1')]), row(5, None, [element(2, '1')]),
                row(6, 'ecoS0006', [element(2, '1.25')], status='WAITING', completed=0)]
    apps, points, report, titles, students = sync.validate(raw_rows, TITLES)
    assert [a[0] for a in apps] == [1, 2, 6] and students == {'ecoS0001', 'ecoS0006'}
    assert len(points) == 4 and all(isinstance(p[5], (int, Decimal)) and not isinstance(p[5], float) for p in points)
    assert report['byEssential']['1'] == dict(elements=2, pointSum='0.3', min='0.1', max='0.2', maxScale=1)
    assert report['byEssential']['3']['pointSum'] == '16' and report['byEssential']['2']['maxScale'] == 2
    assert (report['excludedStudentIdRows'], report['emptyArrayRows'], report['duplicateEssentialApplications']) == (3, 1, 1)
    assert report['statusByCompleted'] == {'CONFIRMED|True': 2, 'WAITING|False': 1}
    assert report['notConfirmedOrIncompleteRows'] == 1
    assert titles == [dict(essential=1, title='T1', elements=2), dict(essential=2, title='T2', elements=1),
                      dict(essential=3, title='T3', elements=1)]
    # 집계에 학번이 없다.
    assert not any(s in json.dumps(report) for s in ('ecoS0001', 'ecoS0006', 'eco S0003'))
    # 제목 미고정(첫 dry-run)이면 제목은 검사하지 않고 보고만 한다.
    assert sync.validate([row(1, 'ecoS1', [element(1, '1', title='Anything')])], None)[2]['titlesPinned'] is False


def test_vendor_env_reads_three_keys_only_and_errors_carry_no_values(tmp_path, monkeypatch):
    env = tmp_path / 'vendor.env'
    env.write_text(f'# c\nOTHER_SECRET=keep-out\npro_ip={SECRET_HOST}:3307\npro_id={SECRET_USER}\n'
                   f'pro_pw="{SECRET_PASSWORD}"\n', encoding='utf-8')
    conf = sync.read_vendor_env(env)
    assert conf == dict(host=SECRET_HOST, port=3307, user=SECRET_USER, password=SECRET_PASSWORD)
    assert 'keep-out' not in json.dumps(conf) and 'OTHER_SECRET' not in __import__('os').environ
    # 실제 .env.local 형식 「key : value」(값 안의 ':' 와 '=' 는 보존).
    env.write_text(f'ip : 10.0.0.1:1521\npro_ip : {SECRET_HOST}:3307\npro_id : {SECRET_USER}\npro_pw : a=b:c\n',
                   encoding='utf-8')
    assert sync.read_vendor_env(env) == dict(host=SECRET_HOST, port=3307, user=SECRET_USER, password='a=b:c')
    env.write_text(f'pro_ip={SECRET_HOST}\n', encoding='utf-8')
    with pytest.raises(sync.Abort) as caught:
        sync.read_vendor_env(env)
    assert caught.value.counts == {'missing': ['pro_id', 'pro_pw']}
    assert SECRET_HOST not in sync.error_line(caught.value)

    class OperationalError(Exception):
        pass
    def refuse(**kwargs):
        raise OperationalError(2003, f"Can't connect to MySQL server on '{kwargs['host']}' as {kwargs['user']}")
    monkeypatch.setitem(__import__('sys').modules, 'pymysql', SimpleNamespace(connect=refuse))
    with pytest.raises(OperationalError) as caught:
        sync.Vendor(dict(host=SECRET_HOST, port=3306, user=SECRET_USER, password=SECRET_PASSWORD), 'coursemos')
    line = sync.error_line(caught.value)
    assert line == 'FAILED (OperationalError, errno 2003); existing copy unchanged.'
    assert not any(s in line for s in (SECRET_HOST, SECRET_USER, SECRET_PASSWORD))


def test_vendor_runs_only_the_fixed_statements(monkeypatch):
    executed, opened = [], {}

    class Cursor:
        def __enter__(self):
            return self
        def __exit__(self, *exc):
            return False
        def execute(self, statement):
            executed.append(statement)
        def fetchall(self):
            return rows(2)

    def connect(**kwargs):
        opened.update(kwargs)
        return SimpleNamespace(cursor=Cursor, close=lambda: None)
    monkeypatch.setitem(__import__('sys').modules, 'pymysql', SimpleNamespace(connect=connect))
    vendor = sync.Vendor(dict(host='h', port=1, user='u', password='p'), 'coursemos')
    assert len(vendor.fetch()) == 2
    assert executed == list(sync.VENDOR_STATEMENTS)
    assert (opened['autocommit'], opened['charset'], opened['connect_timeout'], opened['read_timeout'],
            opened['write_timeout']) == (False, 'utf8mb4', 5, 120, 10)
    with pytest.raises(ValueError):
        vendor._execute(Cursor(), 'SELECT * FROM VW_ECO_ROADMAP_PROGRAM_TOPIC')


# ── 공개(격리 테스트 DB) ──────────────────────────────────────────────────────────────

class FakeVendor:
    def __init__(self, data):
        self.data, self.calls = data, 0

    def fetch(self):
        self.calls += 1
        return list(self.data)


@pytest.fixture
def pg():
    assert settings.db_name.endswith('_test')
    with psycopg.connect(**settings.connection_kwargs(), autocommit=True) as conn:
        try:
            yield conn
        finally:
            conn.execute('DELETE FROM eco.roadmap_application_skill_point')
            conn.execute('DELETE FROM eco.roadmap_application')


def counts(pg):
    return tuple(pg.execute('''SELECT (SELECT count(*) FROM eco.roadmap_application),
      (SELECT count(*) FROM eco.roadmap_application_skill_point)''').fetchone())


def last_run(pg):
    return pg.execute('SELECT status,report FROM eco.sync_run ORDER BY finished_at DESC, started_at DESC LIMIT 1').fetchone()


def publish(pg, data, out=None):
    return sync.run(SimpleNamespace(publish=True), FakeVendor(data), pg, TITLES, out=out or (lambda *_: None))


def test_publish_replaces_copy_and_guards(pg):
    base = random.randrange(10 ** 9, 10 ** 12)
    printed = []
    report = publish(pg, rows(10, base), printed.append)
    assert report['published'] and counts(pg) == (10, 20)
    status, stored = last_run(pg)
    assert status == 'PUBLISHED' and stored['validRows'] == 10 and stored['previousRows'] == 0
    assert not any(f'ecoS{i:04d}' in json.dumps(stored) + ''.join(printed) for i in range(base, base + 10))
    # 다시 공개하면 교체(누적 아님)
    publish(pg, rows(9, base + 100))
    assert counts(pg) == (9, 18)
    # 20% 초과 감소 → 중단, 기존 사본 유지, ABORTED 기록
    with pytest.raises(sync.Abort, match='ROW_DECREASE'):
        publish(pg, rows(7, base + 200))
    assert counts(pg) == (9, 18) and last_run(pg)[0] == 'ABORTED' and last_run(pg)[1]['code'] == 'ROW_DECREASE'
    # 유효 행 0 → 중단(학번 형식 제외로 0이 된 경우 포함)
    with pytest.raises(sync.Abort, match='ZERO_ROWS'):
        publish(pg, [row(base + 300, ' bad id')])
    assert counts(pg) == (9, 18)
    # 검증 실패 → 업체 행 일부만 공개하지 않는다
    with pytest.raises(sync.Abort, match='CHILD_VALUE'):
        publish(pg, [*rows(9, base + 400), row(base + 499, 'ecoX', [element(child=1)])])
    assert counts(pg) == (9, 18) and last_run(pg)[1]['code'] == 'CHILD_VALUE'


def test_publish_mid_transaction_failure_keeps_previous_copy(pg, monkeypatch):
    base = random.randrange(10 ** 9, 10 ** 12)
    publish(pg, rows(5, base))
    before = pg.execute('SELECT array_agg(application_id ORDER BY application_id) FROM eco.roadmap_application').fetchone()[0]
    real = sync.validate
    def broken(*args):
        apps, points, report, titles, students = real(*args)
        return apps, [*points, (base + 999, 1, 'ecoOrphan', 1, 0, Decimal(1))], report, titles, students   # FK 위반
    monkeypatch.setattr(sync, 'validate', broken)
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        publish(pg, rows(5, base + 50))
    after = pg.execute('SELECT array_agg(application_id ORDER BY application_id) FROM eco.roadmap_application').fetchone()[0]
    assert after == before and counts(pg) == (5, 10)
    assert last_run(pg)[0] == 'ABORTED' and last_run(pg)[1]['code'] == 'ERROR_ForeignKeyViolation'


def test_lock_busy_and_unpinned_titles_stop_before_vendor_access(pg):
    vendor = FakeVendor(rows(3))
    with psycopg.connect(**settings.connection_kwargs(), autocommit=True) as other:
        assert other.execute(sync.LOCK_SQL).fetchone()[0]
        with pytest.raises(sync.Abort, match='LOCK_BUSY'):
            sync.run(SimpleNamespace(publish=True), vendor, pg, TITLES)
        other.execute(sync.UNLOCK_SQL)
    with pytest.raises(sync.Abort, match='TITLES_NOT_PINNED'):
        sync.run(SimpleNamespace(publish=True), vendor, pg, None)
    assert vendor.calls == 0 and last_run(pg)[1]['code'] == 'TITLES_NOT_PINNED'
    # lock 은 풀려 있다 — 다른 세션이 다시 잡을 수 있다.
    with psycopg.connect(**settings.connection_kwargs(), autocommit=True) as other:
        assert other.execute(sync.LOCK_SQL).fetchone()[0]


def test_dry_run_writes_nothing_and_prints_counts_only(pg):
    runs = pg.execute('SELECT count(*) FROM eco.sync_run').fetchone()[0]
    printed = []
    report = sync.run(SimpleNamespace(publish=False), FakeVendor(rows(4)), pg, None, out=printed.append)
    assert report['validRows'] == 4 and report['academicUnmatchedStudents'] == 4
    assert pg.execute('SELECT count(*) FROM eco.sync_run').fetchone()[0] == runs and counts(pg) == (0, 0)
    text = '\n'.join(printed)
    assert '"title": "T2"' in text and 'DRY-RUN' in text
    assert not any(f'ecoS{i:04d}' in text for i in range(1, 5))
