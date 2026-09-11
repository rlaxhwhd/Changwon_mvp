import pytest

from app.db import connection, pool
from app.main import app
from app.staff import public_professors
from test_api import headers


def test_six_thousand_students_are_counted_but_only_one_page_is_returned(client):
    with pool.connection() as conn, conn.transaction(force_rollback=True):
        if not conn.execute("SELECT has_table_privilege(current_user,'dc.person','INSERT') AS ok").fetchone()['ok']:
            pytest.skip('Scale fixtures require the isolated test DB owner')
        conn.execute('''INSERT INTO dc.person(intg_uid,alias,name,kind,source,profile)
          SELECT 'scale:'||n,'scale-'||n,'Scale Student '||n,'STUDENT','fixture','{}'
          FROM generate_series(1,6000) n''')
        conn.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,grade,roster)
          SELECT 'scale:'||n,'scale-'||n,'Scale Department',2,'{}' FROM generate_series(1,6000) n''')
        conn.execute('''INSERT INTO dc.fixture_student_scope(staff_uid,student_uid,source)
          SELECT 'local:career_kim','scale:'||n,'test:scale' FROM generate_series(1,6000) n''')
        app.dependency_overrides[connection] = lambda: conn
        try:
            params = {'departments': 'Scale Department'}
            head = headers('career_kim')
            result = client.get('/api/v1/students', headers=head, params={**params, 'page': 300, 'pageSize': 20})
            assert result.status_code == 200, result.text
            assert len(result.json()['items']) == 20 and result.json()['totalCount'] == 6000
            assert len(result.content) < 30_000
            summary = client.get('/api/v1/students/summary', headers=head, params={**params, 'groupBy': 'type'}).json()
            assert summary['total'] == 6000
            assert sum(group['count'] for group in summary['groups']) == 6000
            assert summary['risk']['high'] == 0  # Unknown GPA never means low GPA.
            meta = client.get('/api/v1/students/metadata', headers=head, params=params).json()
            assert meta['summary']['total'] == 6000
            assert meta['options']['majors'] == ['Scale Department']
            other = client.get('/api/v1/students', headers=headers('asst_kim'), params=params).json()
            assert other['totalCount'] == 0
            last = client.get('/api/v1/students', headers=head, params={**params, 'page': 301, 'pageSize': 20}).json()
            assert last['items'] == [] and last['totalCount'] == 6000
        finally:
            app.dependency_overrides.pop(connection, None)


def test_advisor_server_filters_and_counsel_counts(client):
    head = headers('asst_kim')
    all_rows = client.get('/api/v1/advisor-assignments/roster', headers=head, params={'pageSize': 1})
    assert all_rows.status_code == 200, all_rows.text
    student = all_rows.json()['items'][0]
    filtered = client.get('/api/v1/advisor-assignments/roster', headers=head,
                          params={'q': student['studentNo'], 'filters.grade': str(student['grade'])}).json()
    assert filtered['totalCount'] == 1 and filtered['items'][0]['id'] == student['id']
    absent = client.get('/api/v1/advisor-assignments/roster', headers=head,
                        params={'q': 'no-such-student-unique'}).json()
    assert absent['totalCount'] == 0
    stats = client.get('/api/v1/advisor-assignments/counsel-summary', headers=head)
    assert stats.status_code == 200, stats.text
    rows = client.get('/api/v1/advisor-assignments/counsel-status', headers=head, params={'pageSize': 1})
    assert rows.status_code == 200, rows.text
    assert rows.json()['totalCount'] == sum(p['adviseeCount'] for p in stats.json()['professors'])
    assert len(rows.json()['items']) <= 1
    assert client.get('/api/v1/advisor-assignments/counsel-summary', headers=headers('chaewon')).status_code == 403


def test_professor_directory_uses_codes_and_marks_unresolved_members(client):
    with pool.connection() as conn, conn.transaction(force_rollback=True):
        conn.execute('''UPDATE dc.staff SET profile=profile||'{"collegeName":"Incorrect", "dept":"Incorrect"}'
          WHERE intg_uid=(SELECT intg_uid FROM dc.person WHERE alias='cse-1')''')
        groups = public_professors(conn)
        found = [(group['name'], dept, prof) for group in groups for dept, rows in group['divisions'].items()
                 for prof in rows if prof['id'] == 'cse-1']
        assert found and all(g[0] != 'Incorrect' and g[1] != 'Incorrect' for g in found)
        conn.execute('''UPDATE dc.org_assignment SET is_active=false WHERE staff_uid=
          (SELECT intg_uid FROM dc.person WHERE alias='cse-1')''')
        groups = public_professors(conn)
        found = [(group['name'], dept, prof) for group in groups for dept, rows in group['divisions'].items()
                 for prof in rows if prof['id'] == 'cse-1']
        assert found == [('소속 미등록', '소속 미등록', {**found[0][2], 'accept': False})]
