"""Copy Iruodream (vendor) program core-competency points into the LOCAL PostgreSQL eco schema (183, handoff 0026).

Default is --dry-run: read the vendor view, validate, print an aggregate report. No PostgreSQL writes.
--publish replaces eco.roadmap_application(+_skill_point) in one transaction after the same validation.

Vendor side runs only the four fixed statements in VENDOR_STATEMENTS (read-only transaction, timeouts).
Vendor connection values come from three keys of --vendor-env-file (pro_ip, pro_id, pro_pw). They are never
put in os.environ, argv, output, sync_run or exception text. Errors print the class name and integer errno only.
Output and eco.sync_run.report hold counts only: no student number, name or per-student score.

Dependency (once): backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-academic.txt
Dry-run (default; host, from the repo root):
  backend/.venv/Scripts/python.exe backend/scripts/sync_eco_competency.py --pg-password-file deploy/secrets/postgres_password_local
Publish (after the dry-run report was reviewed and EXPECTED_TITLES pinned):
  ... same command ... --publish
"""
import argparse
from collections import Counter
from datetime import date, datetime, timezone
from decimal import Decimal
import json
from pathlib import Path
import re
import sys
import uuid

ROOT = Path(__file__).resolve().parents[2]

SELECT_SQL = ('SELECT application_id,student_id,program_id,topic_id,application_status_code,is_completed,'
              'completion_date,skill_scores,updated_at FROM VW_ECO_ROADMAP_APPLICATION WHERE skill_scores IS NOT NULL')
VENDOR_STATEMENTS = ('SET SESSION max_execution_time = 60000', 'START TRANSACTION READ ONLY', SELECT_SQL, 'COMMIT')
VENDOR_KEYS = ('pro_ip', 'pro_id', 'pro_pw')
LOCK_SQL = "SELECT pg_try_advisory_lock(hashtextextended('eco-competency-sync', 0))"
UNLOCK_SQL = "SELECT pg_advisory_unlock(hashtextextended('eco-competency-sync', 0))"
ELEMENT_KEYS = frozenset(('essential', 'title', 'child', 'point'))
STUDENT_ID = re.compile(r'\S{1,40}')
# essential number -> exact vendor title. Names only validate; the mapping to ACE1~5 is by number (183 view).
# Pin these from the first dry-run report (printed titles), never by guess. --publish refuses while None.
EXPECTED_TITLES = {1: '지역형 리더역량', 2: '창의적 사고역량', 3: '실용적 융복합역량', 4: '의사소통역량', 5: '글로벌역량'}
# 2026-11-27 첫 dry-run 보고에서 고정(업체 essential 1~5 = ACE1~5 = 우리 5개 코드 순서).


class Abort(Exception):
    """Validation or safety stop. code is a fixed classification; counts are aggregates only."""

    def __init__(self, code, **counts):
        super().__init__(code)
        self.code = code
        self.counts = counts


def read_vendor_env(path):
    """Parse only pro_ip/pro_id/pro_pw from a dotenv file. Other lines are skipped without being kept."""
    found = {}
    for line in Path(path).read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        # .env.local 은 「key=value」와 「key : value」가 섞여 있다. 키 바로 뒤 첫 구분자로 자른다
        # (pro_ip 값 자체에 ':' 가 있으므로 값 안의 구분자는 건드리지 않는다).
        seps = [i for i in (line.find('='), line.find(':')) if i > 0]
        if not line or line.startswith('#') or not seps:
            continue
        cut = min(seps)
        key, value = line[:cut], line[cut + 1:]
        key = key.strip()
        if key.startswith('export '):
            key = key[7:].strip()
        if key not in VENDOR_KEYS:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
            value = value[1:-1]
        found[key] = value
    missing = [k for k in VENDOR_KEYS if not found.get(k)]
    if missing:
        raise Abort('VENDOR_ENV_KEYS_MISSING', missing=missing)
    host, sep, port = found['pro_ip'].rpartition(':')
    if not sep:
        host, port = found['pro_ip'], '3306'
    if not host or not port.isdigit():
        raise Abort('VENDOR_ENV_HOST_FORMAT')
    return dict(host=host, port=int(port), user=found['pro_id'], password=found['pro_pw'])


class Vendor:
    """Read-only vendor session. Executes VENDOR_STATEMENTS only, in order."""

    def __init__(self, conf, database):
        import pymysql  # offline importer dependency (requirements-academic.txt), not in the API image
        self.connection = pymysql.connect(host=conf['host'], port=conf['port'], user=conf['user'],
                                          password=conf['password'], database=database, charset='utf8mb4',
                                          autocommit=False, connect_timeout=5, read_timeout=120, write_timeout=10)

    def _execute(self, cursor, statement):
        if statement not in VENDOR_STATEMENTS:
            raise ValueError('Vendor statement is not allowlisted')
        cursor.execute(statement)

    def fetch(self):
        with self.connection.cursor() as cursor:
            for statement in VENDOR_STATEMENTS[:3]:
                self._execute(cursor, statement)
            rows = list(cursor.fetchall())
            self._execute(cursor, VENDOR_STATEMENTS[3])
        return rows

    def close(self):
        self.connection.close()


def _reject_constant(token):
    raise ValueError('non-finite JSON number')


def _unique_object(pairs):
    keys = [k for k, _ in pairs]
    if len(keys) != len(set(keys)):
        raise ValueError('duplicate JSON key')
    return dict(pairs)


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _scale(value):
    if _is_int(value):
        return 0
    return max(0, -value.as_tuple().exponent)


def _timestamp(value, code):
    if value is None or (isinstance(value, datetime) and value.tzinfo is None):
        return value
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    raise Abort(code)


def _completed(value):
    if value is None or isinstance(value, bool):
        return value
    if _is_int(value) and value in (0, 1):
        return bool(value)
    if isinstance(value, (bytes, bytearray)) and len(value) == 1 and value[0] in (0, 1):
        return bool(value[0])
    # 업체 명세(docs/program_view.xlsx): is_completed = 문자열 「TRUE / FALSE」. 그 두 값만 받는다.
    if isinstance(value, str) and value in ('TRUE', 'FALSE'):
        return value == 'TRUE'
    raise Abort('IS_COMPLETED_TYPE')


def parse_skill_scores(raw):
    """Vendor skill_scores -> (raw text, element list). Abort on anything outside the agreed shape."""
    if isinstance(raw, (bytes, bytearray)):
        try:
            raw = bytes(raw).decode('utf-8')
        except UnicodeDecodeError:
            raise Abort('SKILL_SCORES_ENCODING') from None
    if not isinstance(raw, str):
        raise Abort('SKILL_SCORES_TYPE')
    try:
        parsed = json.loads(raw, parse_float=Decimal, parse_constant=_reject_constant,
                            object_pairs_hook=_unique_object)
    except ValueError:
        raise Abort('SKILL_SCORES_JSON') from None
    if not isinstance(parsed, list):
        raise Abort('SKILL_SCORES_NOT_ARRAY')
    for element in parsed:
        if not isinstance(element, dict) or set(element) != ELEMENT_KEYS:
            raise Abort('SKILL_SCORES_KEYS')
        essential, child, point = element['essential'], element['child'], element['point']
        if not _is_int(essential) or not 1 <= essential <= 5:
            raise Abort('ESSENTIAL_VALUE')
        if not _is_int(child) or child != 0:
            raise Abort('CHILD_VALUE')
        if not (_is_int(point) or isinstance(point, Decimal)) or (isinstance(point, Decimal) and not point.is_finite()) \
                or point < 0:
            raise Abort('POINT_VALUE')
        if not isinstance(element['title'], str):
            raise Abort('TITLE_TYPE')
    return raw, parsed


def validate(rows, expected_titles):
    """Vendor rows -> (application rows, point rows, aggregate report). Raises Abort; never partial."""
    apps, points, seen = [], [], set()
    excluded = empty = elements = duplicate_essential = 0
    students, titles, status = set(), Counter(), Counter()
    by_essential = {e: dict(elements=0, pointSum=Decimal(0), min=None, max=None, maxScale=0) for e in range(1, 6)}
    max_updated = None
    for row in rows:
        if len(row) != 9:
            raise Abort('VENDOR_COLUMNS')
        application_id, student_id, program_id, topic_id, status_code, completed, completion, raw, updated = row
        if not _is_int(application_id):
            raise Abort('APPLICATION_ID_TYPE')
        if application_id in seen:
            raise Abort('APPLICATION_ID_DUPLICATE')
        seen.add(application_id)
        for value in (program_id, topic_id):
            if value is not None and not _is_int(value):
                raise Abort('PROGRAM_TOPIC_ID_TYPE')
        if status_code is not None and not isinstance(status_code, str):
            raise Abort('STATUS_CODE_TYPE')
        completed = _completed(completed)
        completion = _timestamp(completion, 'COMPLETION_DATE_TYPE')
        updated = _timestamp(updated, 'UPDATED_AT_TYPE')
        if student_id is not None and not isinstance(student_id, str):
            raise Abort('STUDENT_ID_TYPE')
        text, parsed = parse_skill_scores(raw)
        for element in parsed:
            if expected_titles is not None and element['title'] != expected_titles.get(element['essential']):
                raise Abort('TITLE_MISMATCH', essential=element['essential'])
        # Malformed student numbers cannot match the academic copy; drop the row, never trim or cut.
        if student_id is None or not STUDENT_ID.fullmatch(student_id):
            excluded += 1
            continue
        students.add(student_id)
        status[f'{status_code}|{completed}'] += 1
        if updated is not None and (max_updated is None or updated > max_updated):
            max_updated = updated
        if not parsed:
            empty += 1
        if len({e['essential'] for e in parsed}) != len(parsed):
            duplicate_essential += 1
        apps.append((application_id, student_id, program_id, topic_id, status_code, completed, completion, text, updated))
        for seq, element in enumerate(parsed, 1):
            essential, point = element['essential'], element['point']
            points.append((application_id, seq, student_id, essential, 0, point))
            titles[(essential, element['title'])] += 1
            stat = by_essential[essential]
            stat['elements'] += 1
            stat['pointSum'] += point
            stat['min'] = point if stat['min'] is None else min(stat['min'], point)
            stat['max'] = point if stat['max'] is None else max(stat['max'], point)
            stat['maxScale'] = max(stat['maxScale'], _scale(point))
            elements += 1
    report = dict(
        vendorRows=len(seen), validRows=len(apps), students=len(students), excludedStudentIdRows=excluded,
        emptyArrayRows=empty, elements=elements, duplicateEssentialApplications=duplicate_essential,
        byEssential={str(e): {k: (None if v is None else str(v) if isinstance(v, Decimal) else v)
                              for k, v in s.items()} for e, s in by_essential.items()},
        titlePairs=len(titles), statusByCompleted=dict(sorted(status.items())),
        notConfirmedOrIncompleteRows=sum(n for k, n in status.items() if k != 'CONFIRMED|True'),
        maxSourceUpdatedAt=None if max_updated is None else max_updated.isoformat(),
        titlesPinned=expected_titles is not None)
    title_rows = [dict(essential=e, title=t, elements=n) for (e, t), n in sorted(titles.items())]
    return apps, points, report, title_rows, students


def academic_match(pg, students):
    """Counts only: how many vendor students the 183 view can show, and how many it excludes on purpose."""
    ids = sorted(students)
    row = pg.execute('''SELECT
        count(*) FILTER (WHERE m.matched) AS matched,
        count(*) FILTER (WHERE m.matched AND m.redefined) AS redefined
      FROM unnest(%s::text[]) AS s(id)
      CROSS JOIN LATERAL (SELECT
        EXISTS (SELECT 1 FROM academic.dc_v_usr_inf u WHERE u.intg_uid = s.id AND u.user_ty_cd = '0001') AS matched,
        (EXISTS (SELECT 1 FROM dc.student_login_override o WHERE o.intg_uid = s.id)
         OR EXISTS (SELECT 1 FROM dc.fixture_student_login f WHERE f.student_uid = s.id)) AS redefined) m''',
                     (ids,)).fetchone()
    matched, redefined = row[0], row[1]
    return dict(academicMatchedStudents=matched, academicUnmatchedStudents=len(ids) - matched,
                overrideOrFixtureExcludedStudents=redefined)


def record(pg, started, status, report):
    from psycopg.types.json import Jsonb
    pg.execute('INSERT INTO eco.sync_run (id,started_at,status,report) VALUES (%s,%s,%s,%s)',
               (uuid.uuid4(), started, status, Jsonb(report)))


def publish(pg, apps, points, report, started):
    """One transaction: DELETE + COPY both tables, recount, commit. TRUNCATE is never used (AccessExclusive)."""
    from psycopg import sql
    current = pg.execute('SELECT count(*) FROM eco.roadmap_application').fetchone()[0]
    report = dict(report, previousRows=current)
    if current and not apps:
        raise Abort('ZERO_ROWS', previousRows=current)
    if current and len(apps) < current * 0.8:
        raise Abort('ROW_DECREASE', previousRows=current, validRows=len(apps))
    run_id = uuid.uuid4()
    with pg.transaction():
        pg.execute("SET LOCAL lock_timeout = '10s'")
        pg.execute("SET LOCAL statement_timeout = '60s'")
        from psycopg.types.json import Jsonb
        pg.execute("INSERT INTO eco.sync_run (id,started_at,status,report) VALUES (%s,%s,'PUBLISHED',%s)",
                   (run_id, started, Jsonb(report)))
        pg.execute('DELETE FROM eco.roadmap_application_skill_point')
        pg.execute('DELETE FROM eco.roadmap_application')
        with pg.cursor().copy(sql.SQL(
                'COPY eco.roadmap_application (application_id,student_id,program_id,topic_id,application_status_code,'
                'is_completed,completion_date,skill_scores,source_updated_at,sync_run_id) FROM STDIN')) as copy:
            for row in apps:
                copy.write_row((*row, run_id))
        with pg.cursor().copy(sql.SQL(
                'COPY eco.roadmap_application_skill_point (application_id,seq,student_id,essential,child,point) '
                'FROM STDIN')) as copy:
            for row in points:
                copy.write_row(row)
        counts = pg.execute('''SELECT (SELECT count(*) FROM eco.roadmap_application),
          (SELECT count(*) FROM eco.roadmap_application_skill_point)''').fetchone()
        if tuple(counts) != (len(apps), len(points)):
            raise Abort('COUNT_MISMATCH')
    pg.execute('ANALYZE eco.roadmap_application, eco.roadmap_application_skill_point')
    return dict(report, published=True)


def run(args, vendor, pg, expected_titles, out=print):
    """vendor: object with fetch(); pg: autocommit psycopg connection (owner). Returns the report."""
    started = datetime.now(timezone.utc)
    locked = False
    try:
        if args.publish:
            locked = pg.execute(LOCK_SQL).fetchone()[0]
            if not locked:
                raise Abort('LOCK_BUSY')
            if expected_titles is None:
                raise Abort('TITLES_NOT_PINNED')
        apps, points, report, title_rows, students = validate(vendor.fetch(), expected_titles)
        report.update(academic_match(pg, students))
        if not args.publish:
            out(json.dumps(dict(mode='dry-run', report=report, titles=title_rows), ensure_ascii=False, indent=1))
            out('DRY-RUN: nothing written. Review counts and titles, pin EXPECTED_TITLES, then rerun with --publish.')
            return report
        result = publish(pg, apps, points, dict(report, mode='publish'), started)
        out(json.dumps(dict(mode='publish', report=result), ensure_ascii=False, indent=1))
        out(f'PUBLISHED: {len(apps)} applications, {len(points)} point rows.')
        return result
    except Exception as exc:
        if args.publish and locked:
            if pg.info.transaction_status != 0:   # not idle: discard any half-open transaction first
                pg.rollback()
            code = exc.code if isinstance(exc, Abort) else 'ERROR_' + type(exc).__name__
            record(pg, started, 'ABORTED', dict(code=code, **getattr(exc, 'counts', {})))
        raise
    finally:
        if locked:
            pg.execute(UNLOCK_SQL)


def error_line(exc):
    """Class name and integer errno only. str(exc) of driver errors may carry the host or row values."""
    if isinstance(exc, Abort):
        return f'ABORTED ({exc.code}); existing copy unchanged.'
    errno = exc.args[0] if exc.args and isinstance(exc.args[0], int) and not isinstance(exc.args[0], bool) else None
    return f'FAILED ({type(exc).__name__}' + ('' if errno is None else f', errno {errno}') + '); existing copy unchanged.'


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--vendor-env-file', type=Path, default=ROOT / '.env.local')
    p.add_argument('--vendor-database', default='coursemos')
    p.add_argument('--pg-port', type=int, default=15432)
    p.add_argument('--pg-database', default='dreamcatch')
    p.add_argument('--pg-password-file', type=Path, required=True)
    mode = p.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', dest='publish', action='store_false', help='default: validate and report only')
    mode.add_argument('--publish', dest='publish', action='store_true', help='replace the local eco copy')
    p.set_defaults(publish=False)
    args = p.parse_args(argv)
    import psycopg
    conf = read_vendor_env(args.vendor_env_file)
    # Destination host is deliberately fixed to loopback.
    with psycopg.connect(host='127.0.0.1', port=args.pg_port, dbname=args.pg_database, user='postgres',
                         password=args.pg_password_file.read_text().strip(), connect_timeout=5,
                         application_name='eco-competency-copy', autocommit=True) as pg:
        vendor = None
        class Lazy:
            def fetch(self):
                nonlocal vendor
                vendor = Vendor(conf, args.vendor_database)   # connect only after the lock / title gate
                return vendor.fetch()
        try:
            run(args, Lazy(), pg, EXPECTED_TITLES)
        finally:
            if vendor is not None:
                vendor.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(error_line(exc), file=sys.stderr)
        sys.exit(1)
