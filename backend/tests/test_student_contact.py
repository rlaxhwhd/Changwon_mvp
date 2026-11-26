from uuid import uuid4
from app.student_contact import contact_summary
from test_api import headers
from test_counsel_dashboard import db, request_row  # noqa: F401
from academic_test_support import add_academic_user


def test_enrolled_funnel_matches_list_and_draft_roadmap(client, db):
    prefix = 'contact-' + uuid4().hex[:8]
    before = contact_summary(db)
    for i in range(5):
        uid = prefix + str(i)
        add_academic_user(db, uid, usr_nm='Contact test', hofc_sta_cd='0002' if i == 4 else '0001', stu_schgr='1')
        db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Contact test','STUDENT','local')", (uid,uid))
        db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade) VALUES(%s,%s,'Regression',1)", (uid,uid))
        if i:
            db.execute("INSERT INTO dc.diagnosis_attempt VALUES(%s,%s,'ccore',1,'DONE',now(),now(),'{}','development:random')", (uuid4().hex,uid))
        request_row(db, student=uid, status='DONE' if i >= 2 else 'REQ')
        if i == 3:
            db.execute("INSERT INTO dc.roadmap(student_uid,target_role,target_company,status_code) VALUES(%s,'Test','{}','DRAFT')", (uid,))
    after = contact_summary(db)
    assert after['total'] - before['total'] == 4
    for index, stage in enumerate(('diagnosis','counsel','roadmap')):
        assert after[stage] - before[stage] == 1
        response = client.get('/api/v1/academic-students', headers=headers('career_kim'),
                              params={'q':prefix,'filters.contact':stage})
        assert response.status_code == 200, response.text
        assert [r['id'] for r in response.json()['items']] == [prefix+str(index)]
