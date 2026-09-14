from datetime import timedelta
from uuid import uuid4

from app.programs import programs, today
from test_api import headers
from test_psych_referrals import db  # noqa: F401
from test_programs import new_program


def recommend(client, **params):
    return client.get('/api/v1/programs', headers=headers('jiwoo'),
                      params={'recommended': 'true', **params})


def test_type_match_deadline_order_and_pagination(client, db):
    kind = db.execute('''SELECT student_type FROM dc.student_type_event
      WHERE student_uid=(SELECT intg_uid FROM dc.person WHERE alias='jiwoo')
      ORDER BY decided_at DESC,id DESC LIMIT 1''').fetchone()['student_type']
    prefix = 'recommend-' + uuid4().hex
    def create(**fields):
        return new_program(client, title=prefix, careTypes=[kind], startDate=None, **fields)
    later = create(endDate=str(today()+timedelta(days=5)), pinned=True)
    first = create(endDate=str(today()))
    undated = create(endDate=None)
    create(endDate=str(today()-timedelta(days=1)))
    create(status='CLOSED')
    create(status='ENDED')
    new_program(client, title=prefix, careTypes=[])
    new_program(client, title=prefix, careTypes=['T6' if kind!='T6' else 'T1'])
    response = recommend(client, q=prefix, pageSize=2)
    assert response.status_code == 200
    result = response.json()
    assert result['totalCount'] == 3
    assert [p['id'] for p in result['items']] == [first['id'], later['id']]
    assert [p['id'] for p in recommend(client, q=prefix, page=2, pageSize=2).json()['items']] == [undated['id']]


def test_missing_type_returns_empty_without_fallback(client, db):
    # Use a fresh student instead of altering immutable type events.
    identity = 'no-type-' + uuid4().hex
    db.execute("INSERT INTO dc.person VALUES(%s,%s,'Test','STUDENT','local','{}',1)", (identity,identity))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label) VALUES(%s,%s,'Test')", (identity,identity))
    result = programs(page=1, pageSize=20, q='', recommended=True,
                      user={'kind':'STUDENT','intg_uid':identity},conn=db)
    assert result['items'] == []
    assert result['totalCount'] == 0


def test_no_matching_programs_and_staff_denied(client, db):
    result = recommend(client, q=uuid4().hex).json()
    assert result['items'] == [] and result['totalCount'] == 0
    response = client.get('/api/v1/programs?recommended=true',headers=headers('career_kim'))
    assert response.status_code == 403
