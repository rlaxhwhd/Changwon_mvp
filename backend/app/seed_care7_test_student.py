"""Explicitly requested local CARE 7+ test identity; never writes academic mirrors."""
import psycopg
from psycopg.rows import dict_row
from .settings import settings

UID = '20261231'
COURSE = 'DEV-CARE7-20261231'
SOURCE = 'DEVELOPMENT_CARE7_TEST'


def seed(conn):
    if settings.environment != 'development':
        raise RuntimeError('This fixture is development-only')
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('student-login:'+UID,))
    existing = conn.execute('SELECT name,kind,source FROM dc.person WHERE intg_uid=%s', (UID,)).fetchone()
    if existing and dict(existing) != dict(name='김태정',kind='STUDENT',source='local'):
        raise RuntimeError('An unrelated service identity already exists; refusing to overwrite')
    dept = conn.execute("SELECT * FROM dc.department WHERE college_code='C05' AND dept_code='C05-03' AND dept_name='경영학과'").fetchone()
    if not dept:
        raise RuntimeError('Business administration department mapping is missing')
    conn.execute('''INSERT INTO dc.student_login_override
      (intg_uid,name,college_code,dept_code,college_name,dept_name)
      VALUES(%s,'김태정',%s,%s,%s,%s) ON CONFLICT(intg_uid) DO NOTHING''',
      (UID,dept['college_code'],dept['dept_code'],dept['college_name'],dept['dept_name']))
    conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'김태정','STUDENT','local') ON CONFLICT DO NOTHING", (UID,UID))
    conn.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,grade,college_code,dept_code)
      VALUES(%s,%s,'경영학과',2,%s,%s) ON CONFLICT(intg_uid) DO NOTHING''',
      (UID,UID,dept['college_code'],dept['dept_code']))
    conn.execute('''INSERT INTO dc.fixture_student_scope(staff_uid,student_uid,source)
      SELECT intg_uid,%s,'development:care7-test' FROM dc.person WHERE alias='career_kim'
      ON CONFLICT DO NOTHING''', (UID,))
    conn.execute("INSERT INTO dc.subject VALUES(%s,'[개발 테스트] 경영 기초 역량 이수',3,%s,'TEST',true) ON CONFLICT DO NOTHING", (COURSE,dept['dept_code']))
    conn.execute("INSERT INTO dc.student_course VALUES(%s,'2026','1',%s,'TEST',NULL,NULL,'Y','N') ON CONFLICT DO NOTHING", (UID,COURSE))
    conn.execute('''INSERT INTO dc.core_competency_allocation
      (kind,curi_num,academic_year,academic_term,source_system,source_key,source_revision,active)
      VALUES('COURSE',%s,'2026','1',%s,%s,'v1',true)
      ON CONFLICT(source_system,source_key,source_revision) DO NOTHING''', (COURSE,SOURCE,UID))
    allocation = conn.execute('SELECT id FROM dc.core_competency_allocation WHERE source_system=%s AND source_key=%s AND source_revision=%s', (SOURCE,UID,'v1')).fetchone()['id']
    for code, ratio, points in [('LOCAL_LEADER','.20',70),('CREATIVE','.24',84),
        ('CONVERGENCE','.18',63),('COMMUNICATION','.22',77),('GLOBAL','.16',56)]:
        conn.execute('''INSERT INTO dc.core_competency_allocation_axis VALUES(%s,%s,%s,%s)
          ON CONFLICT(allocation_id,competency_code) DO NOTHING''', (allocation,code,ratio,points))
    # Never reset diagnoses, counseling, or roadmaps on rerun.
    return UID


if __name__ == '__main__':
    with psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row) as conn:
        print('Prepared local test student:', seed(conn))
