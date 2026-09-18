from app.seed_care7_test_student import seed, UID, COURSE
from app.students import profile
from test_psych_referrals import db  # noqa: F401
from test_api import headers


def student(conn):
    return conn.execute('SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE intg_uid=%s',(UID,)).fetchone()


def test_fixture_is_idempotent_and_scores_come_from_completion(db):
    seed(db)
    seed(db)
    data = profile(db,student(db))
    assert (data['name'],data['major'],data['grade']) == ('김태정','경영학과',2)
    assert data['coreCompetencyScores'] == dict(LOCAL_LEADER=70,CREATIVE=84,CONVERGENCE=63,COMMUNICATION=77,GLOBAL=56)
    assert data['coreCompetencySource'] == 'DEVELOPMENT_CARE7_TEST'
    for table in ('diagnosis_attempt','counsel_request','roadmap','student_type_event'):
        assert db.execute(f'SELECT count(*) AS n FROM dc.{table} WHERE student_uid=%s',(UID,)).fetchone()['n'] == 0
    db.execute("UPDATE dc.student_course SET finish_yn='N' WHERE intg_uid=%s AND curi_num=%s",(UID,COURSE))
    assert profile(db,student(db))['coreCompetencyScores'] is None


def test_login_uses_local_override_without_modifying_academic_source(client, db):
    db.execute('''INSERT INTO academic.v_usr_inf(intg_uid,login_id,user_ty_cd,usr_nm,orgz_nm,stu_schgr)
      VALUES(%s,%s,'1101','Original academic name','전자공학과','3')''', (UID, UID))
    original = db.execute('SELECT to_jsonb(a) AS raw FROM academic.v_usr_inf a WHERE intg_uid=%s',(UID,)).fetchone()['raw']
    seed(db)
    response=client.post('/api/v1/auth/student/login',headers=headers(UID),json={'studentNo':UID,'password':'!'})
    assert response.status_code==200
    assert response.json()['name']=='김태정'
    assert response.json()['grade']==2
    assert original==db.execute('SELECT to_jsonb(a) AS raw FROM academic.v_usr_inf a WHERE intg_uid=%s',(UID,)).fetchone()['raw']
