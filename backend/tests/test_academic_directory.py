"""Read-only local integration checks. Does not connect to Oracle or mutate app data."""
from pathlib import Path
import sys
import unittest

import psycopg
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
from app.settings import settings

if __name__ == '__main__':
    settings.db_host = '127.0.0.1'
    settings.db_port = 15432
    settings.db_name = 'dreamcatch'
    settings.db_user = 'dc_app'
    settings.db_password_file = str(ROOT / 'deploy/secrets/api_db_password_local')
    settings.development_token_file = str(ROOT / 'deploy/secrets/api_token')
from app.main import app
from app.db import connection, pool


@unittest.skipUnless(__name__ == '__main__', 'Run standalone against the local mirror; all transactions are read-only')
class AcademicDirectoryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        def readonly():
            with pool.connection() as conn:
                conn.execute('SET TRANSACTION READ ONLY')
                yield conn
        app.dependency_overrides[connection] = readonly
        cls.context = TestClient(app)
        cls.client = cls.context.__enter__()
        with pool.connection() as conn:
            conn.execute('SET TRANSACTION READ ONLY')
            cls.admin = conn.execute("SELECT p.alias FROM dc.person p JOIN dc.auth_user u ON u.person_uid=p.intg_uid WHERE u.role_code='AUTH0006' LIMIT 1").fetchone()['alias']
            cls.student = conn.execute("SELECT alias FROM dc.person WHERE kind='STUDENT' LIMIT 1").fetchone()['alias']
        cls.token = Path(settings.development_token_file).read_text().strip()

    @classmethod
    def tearDownClass(cls):
        cls.context.__exit__(None, None, None)
        app.dependency_overrides.clear()

    def get(self, suffix, identity=None):
        return self.client.get('/api/v1/system/academic/' + suffix,
            headers={'X-DC-Identity': identity or self.admin, 'X-DC-Token': self.token})

    def test_all_datasets_and_pagination(self):
        for dataset in ('people', 'organizations', 'counselors', 'assistant-assignments', 'joint-appointments'):
            response = self.get(dataset + '?pageSize=2')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()['items']), min(2, response.json()['totalCount']))
        first = self.get('people?category=professor&state=89&pageSize=2').json()
        second = self.get('people?category=professor&state=89&pageSize=2&page=2').json()
        self.assertTrue(all(row['category'] == 'professor' and row['hofc_sta_cd'] == '89' for row in first['items']))
        self.assertTrue(set(row['intg_uid'] for row in first['items']).isdisjoint(row['intg_uid'] for row in second['items']))
        with pool.connection() as conn:
            conn.execute('SET TRANSACTION READ ONLY')
            expected = conn.execute("SELECT count(*) AS n FROM dc.academic_people WHERE category='professor' AND hofc_sta_cd='89'").fetchone()['n']
        self.assertEqual(first['totalCount'], expected)
        self.assertEqual(self.get('people?q=nonexistent_directory_test_8f722c').json()['items'], [])

    def test_access_and_secret_exclusion(self):
        for dataset in ('people', 'organizations', 'counselors', 'assistant-assignments', 'joint-appointments', 'status'):
            self.assertEqual(self.get(dataset, self.student).status_code, 403)
        self.assertEqual(self.client.get('/api/v1/system/academic/people').status_code, 401)
        self.assertEqual(self.get('not_a_table').status_code, 422)
        self.assertEqual(self.get('people?pageSize=1000').status_code, 422)
        counselors = self.get('counselors?pageSize=100').json()['items']
        self.assertTrue(counselors)
        self.assertTrue(all('conpwd' not in row for row in counselors))
        with pool.connection() as conn:
            conn.execute('SET TRANSACTION READ ONLY')
            self.assertFalse(conn.execute("SELECT has_schema_privilege(current_user,'academic','USAGE') AS allowed").fetchone()['allowed'])


if __name__ == '__main__':
    unittest.main()
