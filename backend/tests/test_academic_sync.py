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


if __name__ == '__main__':
    unittest.main()
