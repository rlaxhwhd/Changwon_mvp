from app.db import pool
from test_api import headers
from test_programs import new_program, apply_as


def test_my_history_is_scoped_paginated_and_lean(client):
    own = new_program(client, detail='<p>' + 'x' * 10000 + '</p>')
    other = new_program(client)
    assert apply_as(client, 'chaewon', own['id']).status_code == 201
    assert apply_as(client, 'changwon', other['id']).status_code == 201
    path = '/api/v1/programs/mine'
    response = client.get(path, headers=headers('chaewon'))
    assert response.status_code == 200
    data = response.json()
    assert own['id'] in [r['id'] for r in data['items']]
    assert other['id'] not in [r['id'] for r in data['items']]
    row = next(r for r in data['items'] if r['id'] == own['id'])
    assert row['startDate'] is None and row['endDate'] is None
    assert row['selection'] == 'PENDING' and row['outcome'] is None
    assert not {'detail', 'image', 'applicants', 'studentId', 'studentName'} & row.keys()
    page = client.get(path + '?pageSize=1', headers=headers('chaewon')).json()
    assert len(page['items']) == 1 and page['totalCount'] == data['totalCount']
    assert client.get(path, headers=headers('career_kim')).status_code == 403
    assert client.get(path + '?pageSize=101', headers=headers('chaewon')).status_code == 422
    with pool.connection() as conn:
        conn.execute("UPDATE dc.program_apply SET cancelled_at=now(),selection_code='CANCELLED' WHERE program_id=%s", (own['id'],))
    updated = client.get(path, headers=headers('chaewon')).json()
    row = next(r for r in updated['items'] if r['id'] == own['id'])
    assert row['cancelledAt'] and row['selection'] == 'CANCELLED'
