"""DB-only competency foundation. Fixture writes always roll back in *_test."""
from decimal import Decimal
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
import pytest
from app.settings import settings


@pytest.fixture
def db():
    assert settings.db_name.endswith('_test')
    with psycopg.connect(**settings.connection_kwargs(), row_factory=dict_row) as conn:
        assert conn.execute('SELECT current_user AS u').fetchone()['u'] == 'postgres'
        try:
            uid = 'core-test-' + uuid4().hex
            conn.execute("INSERT INTO dc.person VALUES(%s,%s,'Core DB test','STUDENT','local','{}',1)", (uid, uid))
            conn.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade) VALUES(%s,%s,'test',1)", (uid, uid))
            yield conn, uid
        finally:
            conn.rollback()


def status(conn, uid):
    return conn.execute('SELECT * FROM dc.student_core_competency_status WHERE student_uid=%s', (uid,)).fetchone()['status']


def points(conn, uid):
    return conn.execute('SELECT * FROM dc.student_core_competency_points WHERE student_uid=%s', (uid,)).fetchall()


def course(conn, uid, finished='Y', term='1'):
    subject = 'core-subject-' + uuid4().hex
    conn.execute("INSERT INTO dc.subject VALUES(%s,'Core course',3,'test','test',true)", (subject,))
    conn.execute("INSERT INTO dc.student_course VALUES(%s,'2070',%s,%s,'test',NULL,NULL,%s,'N')", (uid, term, subject, finished))
    return subject


def allocation(conn, subject=None, program=None, term='1', point=Decimal('2.5'), axes=5, ratio=Decimal('.2'), active=True):
    row = conn.execute('''INSERT INTO dc.core_competency_allocation
      (kind,curi_num,academic_year,academic_term,program_id,source_system,source_key,source_revision,active)
      VALUES(%s,%s,%s,%s,%s,'test',%s,'v1',%s) RETURNING id''',
      ('COURSE' if subject else 'PROGRAM', subject, '2070' if subject else None,
       term if subject else None, program, uuid4().hex, active)).fetchone()
    conn.execute('''INSERT INTO dc.core_competency_allocation_axis
      SELECT %s,code,%s,%s FROM dc.core_competency ORDER BY sort_order LIMIT %s''', (row['id'], ratio, point, axes))
    return row['id']


@pytest.mark.parametrize('grade', [1, 3])
def test_no_activity_has_no_scores_regardless_of_grade(db, grade):
    conn, uid = db
    conn.execute('UPDATE dc.student SET grade=%s WHERE intg_uid=%s', (grade, uid))
    assert status(conn, uid) == 'NO_ACTIVITY'
    assert points(conn, uid) == []


def test_unfinished_course_does_not_earn_points(db):
    conn, uid = db
    allocation(conn, course(conn, uid, finished='N'))
    assert status(conn, uid) == 'NO_ACTIVITY'
    assert points(conn, uid) == []


def test_missing_mapping_and_exact_term_match(db):
    conn, uid = db
    subject = course(conn, uid)
    allocation(conn, subject, term='2')
    assert status(conn, uid) == 'ALLOCATION_MISSING'
    assert points(conn, uid) == []


@pytest.mark.parametrize('axes,ratio,point,expected', [
    (4, Decimal('.2'), 2, 'ALLOCATION_INCOMPLETE'),
    (5, Decimal('.1'), 2, 'ALLOCATION_INCOMPLETE'),
    (5, Decimal('.2'), None, 'POINTS_MISSING'),
])
def test_incomplete_source_never_becomes_zero_score(db, axes, ratio, point, expected):
    conn, uid = db
    allocation(conn, course(conn, uid), axes=axes, ratio=ratio, point=point)
    assert status(conn, uid) == expected
    assert points(conn, uid) == []


def test_sum_and_revoked_completion_and_incomplete_total(db):
    conn, uid = db
    first = course(conn, uid)
    allocation(conn, first)
    second = course(conn, uid)
    allocation(conn, second, point=Decimal('1.25'))
    assert status(conn, uid) == 'READY'
    assert len(points(conn, uid)) == 5
    assert {r['accumulated_points'] for r in points(conn, uid)} == {Decimal('3.75')}
    conn.execute("UPDATE dc.student_course SET finish_yn='N' WHERE intg_uid=%s AND curi_num=%s", (uid, second))
    assert {r['accumulated_points'] for r in points(conn, uid)} == {Decimal('2.5')}
    course(conn, uid)
    assert status(conn, uid) == 'ALLOCATION_MISSING'
    assert points(conn, uid) == []


def test_zero_official_points_differ_from_no_activity(db):
    conn, uid = db
    allocation(conn, course(conn, uid), point=0)
    assert status(conn, uid) == 'READY'
    assert len(points(conn, uid)) == 5
    assert all(r['accumulated_points'] == 0 for r in points(conn, uid))


def test_program_requires_completion_and_cancellation_removes_points(db):
    conn, uid = db
    program = conn.execute('SELECT id FROM dc.program ORDER BY id LIMIT 1').fetchone()['id']
    conn.execute('UPDATE dc.core_competency_allocation SET active=false WHERE program_id=%s', (program,))
    allocation(conn, program=program)
    conn.execute('''INSERT INTO dc.program_apply(program_id,student_uid,applied_at,snapshot,
      selection_code,selected_at,outcome_code) VALUES(%s,%s,now(),'{}','SELECTED',now(),'ATTENDED')''', (program, uid))
    assert status(conn, uid) == 'NO_ACTIVITY'
    conn.execute("UPDATE dc.program_apply SET outcome_code='COMPLETED' WHERE student_uid=%s", (uid,))
    assert status(conn, uid) == 'READY'
    assert len(points(conn, uid)) == 5
    conn.execute('UPDATE dc.program_apply SET cancelled_at=now() WHERE student_uid=%s', (uid,))
    assert points(conn, uid) == []


def test_new_revision_atomic_switch_no_double_count(db):
    conn, uid = db
    subject = course(conn, uid)
    old = allocation(conn, subject)
    new = allocation(conn, subject, active=False, point=7)
    conn.execute('UPDATE dc.core_competency_allocation SET active=false WHERE id=%s', (old,))
    conn.execute('UPDATE dc.core_competency_allocation SET active=true WHERE id=%s', (new,))
    assert {r['accumulated_points'] for r in points(conn, uid)} == {7}


def test_duplicate_active_mapping_rejected(db):
    conn, uid = db
    subject = course(conn, uid)
    allocation(conn, subject)
    with pytest.raises(psycopg.errors.UniqueViolation), conn.transaction():
        allocation(conn, subject)


@pytest.mark.parametrize('ratio,point', [(-1, 1), (2, 1), (Decimal('NaN'), 1), (Decimal('.2'), -1), (Decimal('.2'), Decimal('NaN'))])
def test_invalid_values_rejected(db, ratio, point):
    conn, uid = db
    subject = course(conn, uid)
    with pytest.raises(psycopg.errors.CheckViolation), conn.transaction():
        allocation(conn, subject, ratio=ratio, point=point)


def test_api_role_cannot_write_allocations(db):
    conn, _ = db
    conn.execute('SET LOCAL ROLE dc_app')
    assert len(conn.execute('SELECT * FROM dc.core_competency').fetchall()) == 5
    with pytest.raises(psycopg.errors.InsufficientPrivilege), conn.transaction():
        conn.execute("DELETE FROM dc.core_competency_allocation")
