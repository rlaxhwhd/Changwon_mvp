"""Copy the nine allowlisted Oracle tables into the LOCAL PostgreSQL mirror.

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
        props.setProperty('oracle.jdbc.ReadTimeout', '120000')
        self.connection = jpype.JClass('oracle.jdbc.OracleDriver')().connect(
            args.oracle_url, props)

    def rows(self, query, numeric_columns=()):
        if query not in ALLOWED_SQL:
            raise ValueError('Source SQL is not an allowlisted SELECT')
        statement = self.connection.createStatement()
        statement.setFetchSize(500)
        statement.setQueryTimeout(120)
        try:
            result = statement.executeQuery(query)
            try:
                width = result.getMetaData().getColumnCount()
                while result.next():
                    row = []
                    for i in range(1, width + 1):
                        if result.getMetaData().getColumnTypeName(i) == 'DATE':
                            stamp = result.getTimestamp(i)
                            row.append(None if stamp is None else datetime.fromisoformat(str(stamp.toLocalDateTime())))
                            continue
                        value = (result.getBigDecimal(i) if i in numeric_columns
                                 else result.getString(i))
                        row.append(None if value is None else Decimal(str(value))
                                   if i in numeric_columns else str(value))
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
    args = p.parse_args()
    if args.staff_only:
        configure_staff_sources()
    started = datetime.now(timezone.utc)
    source = Source(args)
    try:
        # Destination host is deliberately fixed to loopback.
        with psycopg.connect(host='127.0.0.1', port=args.pg_port,
                              dbname=args.pg_database, user='postgres',
                              password=args.pg_password_file.read_text().strip(),
                              connect_timeout=5, application_name='academic-copy') as target:
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
        # Driver exceptions may contain row values. Keep logs free of source PII.
        print(f'FAILED ({type(exc).__name__}); local transaction rolled back.', file=sys.stderr)
        sys.exit(1)
