from pathlib import Path

from psycopg import sql

from test_psych_referrals import db  # noqa: F401


MIGRATION = Path(__file__).resolve().parents[1] / 'migrations/106_retire_jiwoo_remaining_dependencies.sql'


def rows(conn, table):
    return conn.execute(sql.SQL('SELECT to_jsonb(t) AS row FROM {} t ORDER BY to_jsonb(t)::text')
                        .format(sql.Identifier(*table.split('.')))).fetchall()


def test_exact_fixture_retirement_preserves_other_students_and_masters(db):
    other_people = db.execute("SELECT * FROM dc.person WHERE alias<>'jiwoo' ORDER BY intg_uid").fetchall()
    other_students = db.execute("SELECT * FROM dc.student WHERE intg_uid<>'20261137' ORDER BY intg_uid").fetchall()
    protected = ['academic.v_usr_inf', 'dc.subject', 'dc.program', 'dc.core_competency', 'dc.seed_source']
    before = {table: rows(db, table) for table in protected}
    triggers = db.execute('SELECT oid,tgenabled FROM pg_trigger WHERE NOT tgisinternal ORDER BY oid').fetchall()
    assert db.execute("SELECT 1 FROM dc.person WHERE alias='jiwoo' AND source='fixture'").fetchone()
    db.execute(MIGRATION.read_text(encoding='utf-8'))
    db.execute(MIGRATION.read_text(encoding='utf-8'))
    assert not db.execute("SELECT 1 FROM dc.person WHERE alias='jiwoo'").fetchone()
    assert db.execute('SELECT * FROM dc.person ORDER BY intg_uid').fetchall() == other_people
    assert db.execute('SELECT * FROM dc.student ORDER BY intg_uid').fetchall() == other_students
    assert {table: rows(db, table) for table in protected} == before
    assert db.execute('SELECT oid,tgenabled FROM pg_trigger WHERE NOT tgisinternal ORDER BY oid').fetchall() == triggers


def test_does_not_delete_real_identity_with_same_alias_or_number(db):
    db.execute("UPDATE dc.person SET source='academic' WHERE alias='jiwoo'")
    before = db.execute("SELECT * FROM dc.person WHERE alias='jiwoo'").fetchone()
    db.execute(MIGRATION.read_text(encoding='utf-8'))
    assert db.execute("SELECT * FROM dc.person WHERE alias='jiwoo'").fetchone() == before
