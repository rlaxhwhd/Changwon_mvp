from uuid import uuid4

from test_api import headers
from test_psych_referrals import db  # noqa: F401


def test_cross_department_advisor_and_access_guards(client, db):
    student = db.execute("SELECT * FROM dc.student_list WHERE alias='chaewon'").fetchone()
    db.execute('''INSERT INTO dc.fixture_student_scope(staff_uid,student_uid,source)
      SELECT intg_uid,%s,'test:advisor-picker' FROM dc.person WHERE alias='asst_kim'
      ON CONFLICT DO NOTHING''', (student['intg_uid'],))
    db.execute('''UPDATE dc.advisor_assignment SET released_at=now(),
      released_by_uid=(SELECT intg_uid FROM dc.person WHERE alias='asst_kim')
      WHERE student_uid=%s AND released_at IS NULL''', (student['intg_uid'],))
    professor = db.execute('''SELECT p.alias FROM dc.staff s JOIN dc.person p USING(intg_uid)
      WHERE s.role_code='professor' AND NOT EXISTS (
        SELECT 1 FROM dc.org_assignment o WHERE o.staff_uid=s.intg_uid
        AND (o.college_code,o.dept_code)=(%s,%s)) ORDER BY p.alias LIMIT 1''',
      (student['college_code'], student['dept_code'])).fetchone()
    assert professor
    directory = client.get('/api/v1/staff?role=professor&groupBy=college', headers=headers('asst_kim'))
    assert directory.status_code == 200
    assert any(p['id'] == professor['alias'] for g in directory.json()
               for rows in g['divisions'].values() for p in rows)
    body = dict(studentId='chaewon', professorId=professor['alias'], assignedAt='2026-10-20')
    head = {**headers('asst_kim'), 'Idempotency-Key': str(uuid4())}
    for invalid in ('no-such-professor', 'asst_kim'):
        response = client.post('/api/v1/advisor-assignments', headers=head, json={**body, 'professorId': invalid})
        assert response.status_code == 422
        assert response.json()['detail']['code'] == 'INVALID_PROFESSOR'
    response = client.post('/api/v1/advisor-assignments', headers=head, json=body)
    assert response.status_code == 201, response.text
    assert response.json()['professorId'] == professor['alias']
    repeated = client.post('/api/v1/advisor-assignments', headers=head, json=body)
    assert repeated.status_code == 201 and repeated.json()['id'] == response.json()['id']
    duplicate = client.post('/api/v1/advisor-assignments',
      headers={**headers('asst_kim'), 'Idempotency-Key': str(uuid4())}, json=body)
    assert duplicate.status_code == 409


def test_advisor_assignment_still_requires_assistant_student_scope(client, db):
    staff_uid = db.execute("SELECT intg_uid FROM dc.person WHERE alias='asst_kim'").fetchone()['intg_uid']
    db.execute('DELETE FROM dc.fixture_student_scope WHERE staff_uid=%s', (staff_uid,))
    db.execute('UPDATE dc.department_staff_assignment SET is_active=false WHERE staff_uid=%s', (staff_uid,))
    db.execute('UPDATE dc.org_assignment SET is_active=false WHERE staff_uid=%s', (staff_uid,))
    response = client.post('/api/v1/advisor-assignments',
      headers={**headers('asst_kim'), 'Idempotency-Key': str(uuid4())},
      json=dict(studentId='chaewon', professorId='cse-1', assignedAt='2026-10-20'))
    assert response.status_code == 403, response.text
