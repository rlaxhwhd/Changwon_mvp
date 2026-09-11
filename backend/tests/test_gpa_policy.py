"""GPA policy integration. Run with an owner connection in an isolated test DB."""
import psycopg
import pytest
from psycopg.rows import dict_row
from app.settings import settings


@pytest.fixture
def db():
    assert settings.db_name.endswith('_test')
    with psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row) as conn:
        if not conn.execute("SELECT rolsuper FROM pg_roles WHERE rolname=current_user").fetchone()['rolsuper']:
            pytest.skip('GPA policy tests require isolated test DB owner credentials')
        try:
            uid=conn.execute('SELECT intg_uid FROM dc.student ORDER BY intg_uid LIMIT 1').fetchone()['intg_uid']
            conn.execute('DELETE FROM dc.gpa_policy')
            conn.execute('DELETE FROM dc.gpa_term_order')
            conn.execute('DELETE FROM dc.student_course WHERE intg_uid=%s',(uid,))
            yield conn,uid
        finally:
            conn.rollback()


def policy(conn, retakes='ALL', scope='ALL', cutoff=None):
    conn.execute("INSERT INTO dc.gpa_term_order VALUES ('test_first',1),('test_second',2)")
    conn.execute('''INSERT INTO dc.gpa_policy(singleton,active,revision,retakes,excluded_grades,
        term_scope,through_year,through_term_order,decimal_places,approved_by,approved_at)
        VALUES(true,true,'test-policy',%s,ARRAY['P','NP'],%s,%s,%s,2,'test',now())''',
        (retakes,scope,2025 if cutoff else None,cutoff))


def course(conn,uid,subject,term,points,grade='A',credits=3):
    conn.execute('''INSERT INTO dc.subject VALUES (%s,'GPA test',%s,'test','test',true)
        ON CONFLICT(curi_num) DO UPDATE SET cdt_num=excluded.cdt_num''',(subject,credits))
    conn.execute('''INSERT INTO dc.student_course VALUES(%s,'2025',%s,%s,'test',%s,%s,'Y','unknown')''',
        (uid,term,subject,grade,points))


def result(conn,uid):
    return conn.execute('SELECT * FROM dc.student_gpa(%s)',(uid,)).fetchone()


def test_unconfigured_preserves_legacy_and_view(db):
    conn,uid=db
    legacy=conn.execute("SELECT detail->>'gpa' AS gpa FROM dc.student WHERE intg_uid=%s",(uid,)).fetchone()['gpa']
    assert result(conn,uid)==dict(gpa=legacy,source='legacy_detail')
    assert conn.execute('SELECT gpa FROM dc.student_list WHERE intg_uid=%s',(uid,)).fetchone()['gpa']==legacy


@pytest.mark.parametrize('retakes,expected',[('ALL','2.80'),('LATEST','2.00'),('HIGHEST','3.33')])
def test_credit_weighting_and_explicit_retake_policy(db,retakes,expected):
    conn,uid=db
    policy(conn,retakes)
    course(conn,uid,'gpa-test-a','test_first',4,credits=2)
    course(conn,uid,'gpa-test-a','test_second',2,credits=2)
    course(conn,uid,'gpa-test-b','test_first',2,credits=1)
    course(conn,uid,'gpa-test-p','test_first',None,grade='P',credits=9)
    assert result(conn,uid)==dict(gpa=expected,source='course_weighted:test-policy')
    assert conn.execute('SELECT gpa FROM dc.student_list WHERE intg_uid=%s',(uid,)).fetchone()['gpa']==expected


def test_term_cutoff_and_incomplete_data(db):
    conn,uid=db
    policy(conn,'LATEST','THROUGH',1)
    course(conn,uid,'gpa-test-a','test_first',4)
    course(conn,uid,'gpa-test-a','test_second',1)
    assert result(conn,uid)['gpa']=='4.00'
    course(conn,uid,'gpa-test-b','unknown-term',3)
    assert result(conn,uid)==dict(gpa=None,source='course_data_incomplete')


def test_no_courses_is_not_zero_and_policy_can_be_disabled(db):
    conn,uid=db
    policy(conn)
    assert result(conn,uid)['gpa'] is None
    course(conn,uid,'gpa-test-a','test_first',None,grade='A')
    assert result(conn,uid)['source']=='course_data_incomplete'
    conn.execute('UPDATE dc.gpa_policy SET active=false')
    assert result(conn,uid)['source']=='legacy_detail'
