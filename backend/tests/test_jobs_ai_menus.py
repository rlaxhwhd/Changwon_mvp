"""AI menu identity and stale aggregate protection after migrations 171/172."""
from app.db import pool
from test_api import headers


def test_ai_menu_routes_and_pre_migration_form_is_rejected(client):
    head = headers('system-admin')
    with pool.connection() as conn:
        role = conn.execute("SELECT version FROM dc.auth_role WHERE role_code='student'").fetchone()
        assert role['version'] >= 2
        grants = [r['menu_code'] for r in conn.execute("SELECT menu_code FROM dc.menu_auth WHERE role_code='student' ORDER BY menu_code")]
        rows = conn.execute("SELECT menu_code,route FROM dc.menu WHERE parent_code='stu-jobs.3' ORDER BY sort_order").fetchall()
    assert [(r['menu_code'], r['route']) for r in rows] == [
        ('stu-jobs.3.2', '/jobs/home/cover'),
        ('stu-jobs.3.0', '/jobs/home/resume'),
        ('stu-jobs.3.1', '/jobs/home/consulting'),
        ('stu-jobs.3.3', '/jobs/home/interview'),
        ('stu-jobs.3.4', '/jobs/home/interview/results'),
    ]
    path = '/api/v1/system/auth-roles/student/menus'
    body = dict(expectedVersion=role['version']-1, menuCodes=grants, reason='stale form regression')
    assert client.put(path, headers=head, json=body).status_code == 409
    body['expectedVersion'] = role['version']
    saved = client.put(path, headers=head, json=body)
    assert saved.status_code == 200, saved.text
    assert saved.json()['menuCodes'] == grants
