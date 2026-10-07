from uuid import uuid4

from app.db import pool
from app.students import profiles


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
