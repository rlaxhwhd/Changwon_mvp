from test_api import headers
from app.db import pool


def test_counsel_history_menu_keeps_existing_contract(client):
    career = client.get('/api/v1/metadata', headers=headers('career_kim')).json()['menus']
    menus = {row['menu_code']: row for row in career}
    assert menus['counsel.8']['route'] == '/counsel/records'
    assert menus['counsel.8']['label'] == '상담기록'
    assert menus['counsel.2']['route'] == '/counsel/journals'
    assert menus['counsel.3']['route'] == '/counsel/groups'
    assert menus['counsel.8']['sort_order'] < menus['counsel.2']['sort_order']
    student = client.get('/api/v1/metadata', headers=headers('chaewon')).json()['menus']
    assert 'counsel.8' not in {row['menu_code'] for row in student}
    with pool.connection() as conn:
        roles = conn.execute("SELECT role_code FROM dc.menu_auth WHERE menu_code='counsel.8'").fetchall()
    assert {row['role_code'] for row in roles} == {'career', 'psych'}
