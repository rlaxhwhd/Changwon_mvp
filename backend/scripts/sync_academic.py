"""Copy allowlisted Oracle academic sources into the LOCAL PostgreSQL academic schema.

--source mirror (default): the nine legacy DREAMCATCH tables (053; --staff-only: 054).
--source dc-views: the INTRANET/REQUEST DC_V_* views via @V_BRDB (176, handoff 0021).

Oracle SQL is generated here: SELECT metadata or SELECT explicit columns only.
No source commit, DDL, DML, procedure, session command or SELECT FOR UPDATE.
Each SELECT has its own source snapshot; no cross-table snapshot is claimed.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import sys
import time
import uuid

import jpype
import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[2]
COLUMNS = json.loads((ROOT / 'backend/academic/source_columns.json').read_text())
TABLES = tuple(sorted({r[0] for r in COLUMNS}))
METADATA_SQL = (
    'SELECT TABLE_NAME, COLUMN_ID, COLUMN_NAME, DATA_TYPE, DATA_PRECISION, '
    'DATA_SCALE, CHAR_LENGTH, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME IN ('
    + ','.join("'" + t + "'" for t in TABLES) + ') ORDER BY TABLE_NAME,COLUMN_ID'
)
DATA_SQL = {
    t: 'SELECT ' + ','.join('"' + r[2] + '"' for r in COLUMNS if r[0] == t)
    + ' FROM "' + t + '"' for t in TABLES
}
ALLOWED_SQL = frozenset([METADATA_SQL, *DATA_SQL.values()])


def fingerprint(row):
    # Decimal equality across drivers/scales, without float conversion or rounding.
    def canonical(v):
        if isinstance(v, Decimal):
            text = format(v, 'f')
            return text.rstrip('0').rstrip('.') if '.' in text else text
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    encoded = json.dumps([canonical(v) for v in row], ensure_ascii=False,
                         separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(encoded).digest()


def digest(counts):
    h = hashlib.sha256()
    for key, count in sorted(counts.items()):
        h.update(key)
        h.update(count.to_bytes(8, 'big'))
    return h.hexdigest()


class Source:
    def __init__(self, args):
        jpype.startJVM(str(args.jvm), classpath=[str(args.jdbc)])
        props = jpype.JClass('java.util.Properties')()
        props.setProperty('user', args.oracle_user)
        props.setProperty('password', args.oracle_password_file.read_text(
            encoding='utf-8-sig').strip())
        props.setProperty('oracle.net.CONNECT_TIMEOUT', '10000')
        # Socket read timeout per round trip. Long remote views (DB link) need more than 120s
        # before the first batch arrives, so it follows the longest statement timeout.
        props.setProperty('oracle.jdbc.ReadTimeout', str(1000 * max(120, getattr(args, 'long_query_timeout', 120))))
        self.connection = jpype.JClass('oracle.jdbc.OracleDriver')().connect(
            args.oracle_url, props)

    def rows(self, query, numeric_columns=(), timeout=120, fetch_size=500):
        if query not in ALLOWED_SQL:
            raise ValueError('Source SQL is not an allowlisted SELECT')
        statement = self.connection.createStatement()
        statement.setFetchSize(fetch_size)
        statement.setQueryTimeout(timeout)
        try:
            result = statement.executeQuery(query)
            try:
                # Column metadata once per result set; per-value JPype metadata calls dominate large views.
                meta = result.getMetaData()
                width = meta.getColumnCount()
                kinds = ['date' if str(meta.getColumnTypeName(i)) == 'DATE' else
                         'number' if i in numeric_columns else 'text' for i in range(1, width + 1)]
                while result.next():
                    row = []
                    for i, kind in enumerate(kinds, 1):
                        if kind == 'date':
                            stamp = result.getTimestamp(i)
                            row.append(None if stamp is None else datetime.fromisoformat(str(stamp.toLocalDateTime())))
                        elif kind == 'number':
                            value = result.getBigDecimal(i)
                            row.append(None if value is None else Decimal(str(value)))
                        else:
                            value = result.getString(i)
                            row.append(None if value is None else str(value))
                    yield tuple(row)
            finally:
                result.close()
        finally:
            statement.close()

    def close(self):
        self.connection.close()


def copy_tables(source, target):
    """Stage and validate everything before replacing any current mirror rows."""
    if list(map(list, source.rows(METADATA_SQL))) != COLUMNS:
        raise RuntimeError('Oracle column schema drift; no data published')
    target.execute('SELECT pg_advisory_xact_lock(480093)')
    report = {}
    for table in TABLES:
        dest = sql.Identifier('academic', table.lower())
        stage = sql.Identifier('stage_' + table.lower())
        target.execute(sql.SQL('CREATE TEMP TABLE {} (LIKE {} INCLUDING ALL) ON COMMIT DROP')
                       .format(stage, dest))
        spec = [r for r in COLUMNS if r[0] == table]
        numeric = {i for i, r in enumerate(spec, 1) if r[3] == 'NUMBER'}
        source_hashes = Counter()
        count = 0
        began = datetime.now(timezone.utc).isoformat()
        with target.cursor().copy(sql.SQL('COPY {} FROM STDIN').format(stage)) as copy:
            for row in source.rows(DATA_SQL[table], numeric):
                copy.write_row(row)
                source_hashes[fingerprint(row)] += 1
                count += 1
                if count % 25000 == 0:
                    print(f'{table}: streamed {count} rows', flush=True)
        copied_hashes = Counter()
        with target.cursor(name='verify_' + table.lower()) as cursor:
            cursor.execute(sql.SQL('SELECT * FROM {}').format(stage))
            for row in cursor:
                copied_hashes[fingerprint(row)] += 1
        if source_hashes != copied_hashes:
            raise RuntimeError(f'{table}: value verification failed; no data published')
        previous = target.execute(sql.SQL('SELECT count(*) FROM {}').format(dest)).fetchone()[0]
        if previous and count < previous * 0.8:
            raise RuntimeError(f'{table}: unexpected >20% row decrease; no data published')
        report[table] = dict(rows=count, previous_rows=previous,
                             sha256=digest(source_hashes), verified=True,
                             select_started_at=began,
                             verified_at=datetime.now(timezone.utc).isoformat())
        print(f'{table}: {count} rows, all values verified', flush=True)
    # Recheck metadata in case DDL changed while extracting.
    if list(map(list, source.rows(METADATA_SQL))) != COLUMNS:
        raise RuntimeError('Oracle schema changed during extraction; no data published')
    for table in TABLES:
        dest = sql.Identifier('academic', table.lower())
        stage = sql.Identifier('stage_' + table.lower())
        # DELETE respects PostgreSQL MVCC: readers retain the previous generation.
        target.execute(sql.SQL('DELETE FROM {}').format(dest))
        target.execute(sql.SQL('INSERT INTO {} SELECT * FROM {}').format(dest, stage))
    return report



# ── 전산원 DC_V_* 뷰 (0021, --source dc-views) ─────────────────────────────────────────
# dreamcatch 계정 → @V_BRDB 링크 대상의 INTRANET/REQUEST 뷰. SELECT 만, 허용 목록 SQL 만.
DC_SPEC = json.loads((ROOT / 'backend/academic/dc_view_columns.json').read_text(encoding='utf-8'))
DC_COLUMNS = [list(r) for r in DC_SPEC['rows']]
DC_VIEWS = tuple(dict.fromkeys((r[0], r[1]) for r in DC_COLUMNS))
DC_METADATA_SQL = (
    'SELECT OWNER,TABLE_NAME,COLUMN_ID,COLUMN_NAME,DATA_TYPE,DATA_PRECISION,DATA_SCALE,'
    'CHAR_LENGTH,CHAR_USED,DATA_LENGTH,NULLABLE FROM ALL_TAB_COLUMNS@V_BRDB '
    "WHERE OWNER IN ('INTRANET','REQUEST') AND TABLE_NAME IN ("
    + ','.join("'" + v + "'" for v in sorted({v for _, v in DC_VIEWS}))
    + ') ORDER BY OWNER,TABLE_NAME,COLUMN_ID'
)
DC_DATA_SQL = {
    (o, v): 'SELECT ' + ','.join('"' + r[3] + '"' for r in DC_COLUMNS if (r[0], r[1]) == (o, v))
    + f' FROM "{o}"."{v}"@V_BRDB' for o, v in DC_VIEWS
}
LONG_VIEWS = {('REQUEST', 'DC_V_STU_SUGANG_INF')}
# 공개 전 검사 — 위반이면 전체 미공개. 값은 출력하지 않는다(건수만).
BLOCKING_CHECKS = {
    'studentIntgUidDuplicates': ('DC_V_USR_INF', "SELECT count(*) FROM (SELECT intg_uid FROM {} WHERE user_ty_cd='0001' GROUP BY intg_uid HAVING count(*)>1) d"),
    'deptCodeDuplicates': ('DC_V_DEPT_INF', 'SELECT count(*) FROM (SELECT dept_code FROM {} GROUP BY dept_code HAVING count(*)>1) d'),
    'colCodeDuplicates': ('DC_V_COL_INF', 'SELECT count(*) FROM (SELECT col_code FROM {} GROUP BY col_code HAVING count(*)>1) d'),
    'localIntgUidCollisions': ('DC_V_USR_INF', 'SELECT count(*) FROM academic.local_usr_inf l WHERE EXISTS (SELECT 1 FROM {} s WHERE s.intg_uid=l.intg_uid)'),
}
# 보고만 — haksa.md §2 논리 키 중복 건수와 「같은 사번·다른 이름」.
REPORT_CHECKS = {
    'usrIntgUidDuplicates': ('DC_V_USR_INF', ['intg_uid']),
    'majorCodeDuplicates': ('DC_V_MAJOR_INF', ['major_code']),
    'orgCodeDuplicates': ('DC_V_ORG_INF', ['org_code']),
    'partCodeDuplicates': ('DC_V_PART_INF', ['part_code']),
    'sugangKeyDuplicates': ('DC_V_STU_SUGANG_INF', ['intg_uid', 'year', 'smt', 'grad_div', 'curi_num']),
    'subjKeyDuplicates': ('DC_V_SUBJ_INF', ['grad_div', 'curi_num']),
    'curriKeyDuplicates': ('DC_V_CURRI_INF', ['curri_year', 'dept_cd', 'grad_div', 'curi_num']),
    'capKeyDuplicates': ('DC_V_CAP_INF', ['cap_div', 'dept_cd', 'cap_cd']),
    'stuCapKeyDuplicates': ('DC_V_STU_CAP_INF', ['intg_uid', 'cap_div', 'dept_cd', 'cap_cd']),
    'usrMajorKeyDuplicates': ('DC_V_USR_MAJOR_INF', ['intg_uid', 'major_type', 'major_seq']),
    'codeKeyDuplicates': ('DC_V_CODE_INF', ['code_grp', 'code']),
}
EMP_NO_SHARED_NAMES = ('DC_V_USR_INF', 'SELECT count(*) FROM (SELECT emp_no FROM {} WHERE emp_no IS NOT NULL '
                       'GROUP BY emp_no HAVING count(DISTINCT usr_nm)>1) d')


def configure_dc_views():
    global ALLOWED_SQL
    ALLOWED_SQL = frozenset([DC_METADATA_SQL, *DC_DATA_SQL.values()])


def row_value(row):
    """Order-independent additive multiset hash term (sum mod 2^256, compared with the row count)."""
    return int.from_bytes(fingerprint(row), 'big')


def dc_metadata(source):
    found = {}
    for row in source.rows(DC_METADATA_SQL):
        found.setdefault((row[0], row[1]), []).append(list(row))
    return found


def previous_dc_report(target):
    row = target.execute("""SELECT report FROM academic.sync_run WHERE source_label='DC_VIEWS'
      ORDER BY finished_at DESC LIMIT 1""").fetchone()
    return (row[0] or {}).get('views', {}) if row else {}


def estimated_spec(view):
    # 엑셀 정의로만 만든 명세(DATA_LENGTH 없음) — 아직 원본에서 확인하지 못한 뷰.
    return all(r[9] in (None, '') for r in DC_COLUMNS if (r[0], r[1]) == view)


def sync_dc_views(source, target, args, log=lambda message: print(message, flush=True)):
    """Stage (autocommit, session temp tables) -> verify -> pre-publish checks -> one short publish."""
    if not target.autocommit:
        raise RuntimeError('dc-views staging runs in autocommit; only publication is one transaction')
    target.execute('SELECT pg_advisory_lock(480093)')
    try:
        return _sync_dc_views(source, target, args, log)
    finally:
        target.execute('SELECT pg_advisory_unlock(480093)')


def _stage(view):
    return sql.Identifier('stage_' + view[1].lower())


def _sync_dc_views(source, target, args, log):
    started = datetime.now(timezone.utc)
    previous = previous_dc_report(target)
    meta = dc_metadata(source)
    views, staged = {}, []
    for view in DC_VIEWS:
        key = f'{view[0]}.{view[1]}'
        spec = [r for r in DC_COLUMNS if (r[0], r[1]) == view]
        before = previous.get(key, {})
        if view not in meta:
            if before.get('rows'):
                raise RuntimeError(f'{key}: view with rows in the last publish is missing; no data published')
            views[key] = dict(status='missing')
            log(f'{key}: missing (skipped)')
            continue
        if meta[view] != spec:
            never_present = before.get('status') in ('missing', 'drift_new') or (not before and estimated_spec(view))
            if not never_present:
                raise RuntimeError(f'{key}: column schema drift; no data published')
            views[key] = dict(status='drift_new')
            log(f'{key}: newly visible but differs from the estimated spec (skipped)')
            continue
        dest = sql.Identifier('academic', view[1].lower())
        stage = _stage(view)
        target.execute(sql.SQL('DROP TABLE IF EXISTS {}').format(stage))
        target.execute(sql.SQL('CREATE TEMP TABLE {} (LIKE {} INCLUDING DEFAULTS) ON COMMIT PRESERVE ROWS')
                       .format(stage, dest))
        numeric = {i for i, r in enumerate(spec, 1) if r[4] == 'NUMBER'}
        timeout = args.long_query_timeout if view in LONG_VIEWS else args.query_timeout
        total, count, began = 0, 0, time.monotonic()
        with target.cursor().copy(sql.SQL('COPY {} FROM STDIN').format(stage)) as copy:
            for row in source.rows(DC_DATA_SQL[view], numeric, timeout=timeout, fetch_size=args.fetch_size):
                copy.write_row(row)
                total = (total + row_value(row)) % (1 << 256)
                count += 1
                if count % 250000 == 0:
                    log(f'{key}: streamed {count} rows')
        extracted = time.monotonic() - began
        copied, copied_rows = 0, 0
        with target.transaction():
            with target.cursor(name='verify_' + view[1].lower()) as cursor:
                cursor.itersize = 5000
                cursor.execute(sql.SQL('SELECT * FROM {}').format(stage))
                for row in cursor:
                    copied = (copied + row_value(row)) % (1 << 256)
                    copied_rows += 1
        if (copied, copied_rows) != (total, count):
            raise RuntimeError(f'{key}: value verification failed; no data published')
        current = target.execute(sql.SQL('SELECT count(*) FROM {}').format(dest)).fetchone()[0]
        if current and count < current * 0.8:
            raise RuntimeError(f'{key}: unexpected >20% row decrease; no data published')
        digest_hex = format(total, '064x')
        unchanged = before.get('rows') == count and before.get('sha256') == digest_hex and current == count
        views[key] = dict(status='unchanged' if unchanged else 'published', rows=count, previous_rows=current,
                          sha256=digest_hex, verified=True, extract_seconds=round(extracted, 1),
                          total_seconds=round(time.monotonic() - began, 1))
        staged.append((view, stage, dest, count, unchanged))
        log(f'{key}: {count} rows verified ({views[key]["status"]}, {extracted:.1f}s extract)')
    if dc_metadata(source) != meta:
        raise RuntimeError('Source schema changed during extraction; no data published')

    stages = {view[1]: stage for view, stage, *_ in staged}
    checks, blocking = {}, []
    for name, (view, query) in BLOCKING_CHECKS.items():
        if view in stages:
            checks[name] = target.execute(sql.SQL(query).format(stages[view])).fetchone()[0]
            if checks[name]:
                blocking.append(name)
    for name, (view, keys) in REPORT_CHECKS.items():
        if view in stages:
            columns = sql.SQL(',').join(map(sql.Identifier, keys))
            checks[name] = target.execute(sql.SQL(
                'SELECT count(*) FROM (SELECT 1 FROM {} GROUP BY {} HAVING count(*)>1) d').format(
                stages[view], columns)).fetchone()[0]
    if EMP_NO_SHARED_NAMES[0] in stages:
        checks['empNoSharedByDifferentNames'] = target.execute(
            sql.SQL(EMP_NO_SHARED_NAMES[1]).format(stages[EMP_NO_SHARED_NAMES[0]])).fetchone()[0]
    if blocking:
        raise RuntimeError('Pre-publish check failed (' + ', '.join(f'{n}={checks[n]}' for n in blocking)
                           + '); no data published')

    # 공개: 짧은 트랜잭션 하나. 큰 테이블부터 DELETE+INSERT(MVCC — 읽기는 이전 세대를 본다), 마지막에 학과 투영.
    changed = sorted([s for s in staged if not s[4]], key=lambda s: -s[3])
    wal_before = target.execute('SELECT pg_current_wal_lsn()').fetchone()[0]
    began = time.monotonic()
    with target.transaction():
        target.execute("SET LOCAL lock_timeout = '10s'")
        for view, stage, dest, _, _ in changed:
            target.execute(sql.SQL('DELETE FROM {}').format(dest))
            target.execute(sql.SQL('INSERT INTO {} SELECT * FROM {}').format(dest, stage))
        refresh = target.execute('SELECT dc.refresh_department_from_academic()').fetchone()[0]
        report = dict(views=views, checks=checks, refresh=refresh)
        target.execute('''INSERT INTO academic.sync_run (id,started_at,source_label,snapshot_mode,report)
            VALUES (%s,%s,'DC_VIEWS','per-table-select',%s)''', (uuid.uuid4(), started, Jsonb(report)))
    published_seconds = time.monotonic() - began
    wal = target.execute('SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), %s)', (wal_before,)).fetchone()[0]
    # 공개 후(autocommit): 통계 갱신. SUGANG 은 갱신마다 사본만큼 dead tuple 이 생긴다.
    for view, _, dest, _, _ in changed:
        target.execute(sql.SQL('VACUUM (ANALYZE) {}' if view in LONG_VIEWS else 'ANALYZE {}').format(dest))
    for _, stage, *_ in staged:
        target.execute(sql.SQL('DROP TABLE IF EXISTS {}').format(stage))
    sugang = target.execute('''SELECT pg_relation_size('academic.dc_v_stu_sugang_inf'),
      pg_indexes_size('academic.dc_v_stu_sugang_inf'), pg_total_relation_size('academic.dc_v_stu_sugang_inf')''').fetchone()
    return dict(report, publish_seconds=round(published_seconds, 1), publish_wal_bytes=int(wal),
                sugang_heap_bytes=sugang[0], sugang_index_bytes=sugang[1], sugang_total_bytes=sugang[2])

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--oracle-url', required=True)
    p.add_argument('--oracle-user', required=True)
    p.add_argument('--oracle-password-file', type=Path, required=True)
    p.add_argument('--jvm', type=Path, required=True)
    p.add_argument('--jdbc', type=Path, required=True)
    p.add_argument('--pg-port', type=int, default=15432)
    p.add_argument('--pg-database', default='dreamcatch')
    p.add_argument('--pg-password-file', type=Path, required=True)
    p.add_argument('--staff-only', action='store_true', help='Copy the three fixed counselor/assistant source tables')
    p.add_argument('--source', choices=('mirror', 'dc-views'), default='mirror',
                   help='mirror: legacy DREAMCATCH tables (053/054); dc-views: INTRANET/REQUEST DC_V_* via @V_BRDB (176)')
    p.add_argument('--query-timeout', type=int, default=120, help='dc-views: seconds per view statement')
    p.add_argument('--long-query-timeout', type=int, default=1800, help='dc-views: seconds for DC_V_STU_SUGANG_INF')
    p.add_argument('--fetch-size', type=int, default=5000, help='dc-views: JDBC rows per round trip')
    args = p.parse_args()
    if args.staff_only and args.source != 'mirror':
        p.error('--staff-only applies to the legacy mirror source only')
    if args.staff_only:
        configure_staff_sources()
    if args.source == 'dc-views':
        configure_dc_views()
    started = datetime.now(timezone.utc)
    source = Source(args)
    try:
        # Destination host is deliberately fixed to loopback.
        connect = dict(host='127.0.0.1', port=args.pg_port, dbname=args.pg_database, user='postgres',
                       password=args.pg_password_file.read_text().strip(), connect_timeout=5,
                       application_name='academic-copy')
        if args.source == 'dc-views':
            with psycopg.connect(autocommit=True, **connect) as target:
                result = sync_dc_views(source, target, args)
            # 집계만 출력한다(행 값 없음).
            print(json.dumps(result, ensure_ascii=False, default=str, indent=1), flush=True)
            statuses = [v['status'] for v in result['views'].values()]
            print(f'COMMITTED: {statuses.count("published")} views published, '
                  f'{statuses.count("unchanged")} unchanged.', flush=True)
            return
        with psycopg.connect(**connect) as target:
            target.execute("SET LOCAL lock_timeout = '10s'")
            report = copy_tables(source, target)
            target.execute('''INSERT INTO academic.sync_run
                (id,started_at,source_label,snapshot_mode,report)
                VALUES (%s,%s,%s,'per-table-select',%s)''',
                (uuid.uuid4(), started, args.oracle_user.upper(), Jsonb(report)))
        print(f'COMMITTED: all {len(TABLES)} local mirror tables verified and published.', flush=True)
    finally:
        source.close()


def configure_staff_sources():
    global COLUMNS, TABLES, METADATA_SQL, DATA_SQL, ALLOWED_SQL
    COLUMNS = json.loads((ROOT / 'backend/academic/counselor_columns.json').read_text())
    TABLES = ('COM_CON_INF', 'COM_CON_TAR', 'FU_ASS_DEPT')
    METADATA_SQL = ('SELECT TABLE_NAME, COLUMN_ID, COLUMN_NAME, DATA_TYPE, DATA_PRECISION, '
                    'DATA_SCALE, CHAR_LENGTH, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME IN ('
                    + ','.join("'" + t + "'" for t in TABLES) + ') ORDER BY TABLE_NAME,COLUMN_ID')
    DATA_SQL = {t: 'SELECT ' + ','.join('"' + r[2] + '"' for r in COLUMNS if r[0] == t)
                + ' FROM "' + t + '"' for t in TABLES}
    ALLOWED_SQL = frozenset([METADATA_SQL, *DATA_SQL.values()])


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Driver exceptions may contain row values. Keep logs free of source PII:
        # only the error class and, for PostgreSQL errors, schema object names.
        diag = getattr(exc, 'diag', None)
        where = '' if diag is None else ' at ' + '/'.join(
            str(v) for v in (diag.schema_name, diag.table_name, diag.column_name, diag.constraint_name) if v)
        print(f'FAILED ({type(exc).__name__}{where}); local transaction rolled back.', file=sys.stderr)
        sys.exit(1)
