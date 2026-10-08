from uuid import uuid4

from app.db import pool
from app.students import profiles, profile, student
from fastapi import HTTPException
import pytest
from test_psych_referrals import db  # noqa: F401
from test_api import headers, request_body


def test_new_fixture_without_detail_receives_own_empty_profile(client):
    uid = 'empty-profile-' + uuid4().hex
    with pool.connection() as conn:
        user = conn.execute('''INSERT INTO dc.person(intg_uid,alias,name,kind,source)
          VALUES(%s,%s,'Empty profile test','STUDENT','fixture') RETURNING *''', (uid, uid)).fetchone()
        conn.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,grade)
          VALUES(%s,%s,'Test',1)''', (uid, uid))
        payload = profiles(user=user, conn=conn)
        assert len(payload['students']) == 1
        student = payload['students'][0]
        assert student['id'] == uid and student['grade'] == 1
        assert student['phases'] == [] and student['strengthWeakness'] == []
        assert student['studentType'] is None and not student['hasRoadmap']
        assert payload['counselOwners'] == []
        conn.rollback()


def test_empty_fixture_is_visible_to_counselor_but_scoped_for_other_staff(client):
    uid = 'empty-profile-' + uuid4().hex
    with pool.connection() as conn:
        conn.execute('''INSERT INTO dc.person(intg_uid,alias,name,kind,source)
          VALUES(%s,%s,'Empty profile test','STUDENT','fixture')''', (uid, uid))
        conn.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,grade)
          VALUES(%s,%s,'Test',1)''', (uid, uid))
        staff = conn.execute("SELECT p.*,s.profile FROM dc.person p JOIN dc.staff s USING(intg_uid) WHERE p.alias='career_kim'").fetchone()
        payload = profiles(user=staff, conn=conn)
        assert any(p['id'] == uid for p in payload['students'])
        detail = student(identity=uid, user=staff, conn=conn)
        assert detail['id'] == uid and detail['phases'] == []
        assert detail['studentType'] is None and detail['finalRoadmap'] is None
        outsider = {'kind': 'STAFF', 'intg_uid': 'unassigned-test-staff', 'role_code': 'PROFESSOR'}
        assert not any(p['id'] == uid for p in profiles(user=outsider, conn=conn)['students'])
        with pytest.raises(HTTPException) as denied:
            student(identity=uid, user=outsider, conn=conn)
        assert denied.value.status_code == 404
        conn.rollback()


def test_partial_profile_retains_values_and_supplies_empty_collections(client):
    with pool.connection() as conn:
        row = conn.execute("SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) LIMIT 1").fetchone()
        row['detail'] = {'phone': 'provided', 'targetRole': 'provided role'}
        data = profile(conn, row)
        assert data['phone'] == 'provided' and data['targetRole'] == 'provided role'
        assert data['phases'] == [] and data['gapItems'] == []
        assert data['scoreInputs'] == {} and data['targetCompany'] == {}


def test_first_user_can_request_save_and_complete_counsel_without_json(client, db):
    uid = 'first-user-' + uuid4().hex
    db.execute('''INSERT INTO dc.person(intg_uid,alias,name,kind,source)
      VALUES(%s,%s,'First user test','STUDENT','fixture')''', (uid, uid))
    db.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,grade)
      VALUES(%s,%s,'Test',1)''', (uid, uid))
    created = client.post('/api/v1/counsel-requests',
        headers={**headers(uid), 'Idempotency-Key': str(uuid4())}, json=request_body(6))
    assert created.status_code == 201, created.text
    path = '/api/v1/counsel-requests/' + created.json()['id']
    staff = headers('career_kim')
    profile_response = client.get('/api/v1/students/' + uid, headers=staff)
    assert profile_response.status_code == 200, profile_response.text
    assert profile_response.json()['phases'] == []
    confirmed = client.post(path + '/confirm', headers=staff,
        json={'expectedVersion': 1, 'slot': request_body(6)['slot']})
    assert confirmed.status_code == 200, confirmed.text
    context = client.get(path + '/record-context', headers=staff)
    assert context.status_code == 200, context.text
    saved = client.put(path + '/record', headers=staff, json={
        'expectedVersion': 0, 'status': '작성중', 'summary': 'Test summary', 'comment': 'Test comment'})
    assert saved.status_code == 200, saved.text
    completed = client.post(path + '/complete', headers=staff, json={
        'expectedVersion': confirmed.json()['version'], 'expectedRecordVersion': saved.json()['version'],
        'summary': 'Test summary', 'comment': 'Test comment'})
    assert completed.status_code == 200, completed.text
    assert completed.json()['status'] == '완료'
    assert db.execute('SELECT detail FROM dc.student WHERE intg_uid=%s', (uid,)).fetchone()['detail'] is None
