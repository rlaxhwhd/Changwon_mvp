"""Diagnosis lists and summaries must agree with applicant detail access."""
from uuid import uuid4

from test_api import headers
from test_counsel_dashboard import db, request_row  # noqa: F401


def test_all_counselors_can_read_students_without_assignments(client, db):
    student = 'diagnosis-scope-' + uuid4().hex
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Scope test','STUDENT','local')",
               (student, student))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade) VALUES(%s,%s,'Regression',1)",
               (student, student))
    db.execute("INSERT INTO dc.diagnosis_attempt VALUES(%s,%s,'ccore',1,'DONE',now(),now(),'{}','development:random')",
               (uuid4().hex, student))
    head = headers('career_kim')
    path = '/api/v1/diagnosis/status?q=' + student
    assert client.get(path, headers=head).json()['totalCount'] == 1
    before = client.get('/api/v1/diagnosis/summary', headers=head).json()
    request_row(db, student=student)
    # Multiple applications must not duplicate diagnosis rows or summary counts.
    request_row(db, student=student)
    result = client.get(path, headers=head)
    assert result.status_code == 200
    assert result.json()['totalCount'] == 1
    assert result.json()['items'][0]['status'] == '완료'
    assert client.get('/api/v1/diagnosis/students/'+student, headers=head).status_code == 200
    after = client.get('/api/v1/diagnosis/summary', headers=head).json()
    assert sum(r['target'] for r in after) == sum(r['target'] for r in before)
    assert sum(r['done'] for r in after) == sum(r['done'] for r in before)
    for identity in ('career_park','psych_lee'):
        assert client.get(path, headers=headers(identity)).json()['totalCount'] == 1
        assert client.get('/api/v1/diagnosis/students/'+student, headers=headers(identity)).status_code == 200
    assert client.get('/api/v1/diagnosis/students/'+student, headers=headers('chaewon')).status_code == 404
