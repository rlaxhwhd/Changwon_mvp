import psycopg
import pytest

from app.seed_core_competency_examples import EXAMPLES, TARGETS, seed
from app.settings import settings
from app.students import profile
from test_psych_referrals import db  # noqa: F401


def prepare(db):
    for _, uid, number, _ in TARGETS:
        db.execute('UPDATE dc.student SET student_no=%s WHERE intg_uid=%s', (number, uid))


def student(db, uid):
    return db.execute('SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE s.intg_uid=%s', (uid,)).fetchone()


def test_examples_are_idempotent_and_do_not_change_earned_points(db, monkeypatch):
    prepare(db)
    before = db.execute('SELECT to_jsonb(c) AS row FROM dc.student_core_competency_activity c ORDER BY to_jsonb(c)::text').fetchall()
    seed(db); seed(db)
    assert db.execute('SELECT count(*) n FROM dc.development_core_competency_score').fetchone()['n'] == 10
    for _, uid, _, _ in TARGETS:
        assert profile(db, student(db, uid))['coreCompetencyScores'] == EXAMPLES
    assert db.execute('SELECT to_jsonb(c) AS row FROM dc.student_core_competency_activity c ORDER BY to_jsonb(c)::text').fetchall() == before
    monkeypatch.setattr(settings, 'environment', 'production')
    assert profile(db, student(db, TARGETS[0][1]))['coreCompetencyScores'] is None
    with pytest.raises(RuntimeError):
        seed(db)


def test_incomplete_examples_and_non_fixture_identity_remain_hidden(db):
    prepare(db); seed(db)
    uid = TARGETS[0][1]
    db.execute("DELETE FROM dc.development_core_competency_score WHERE student_uid=%s AND competency_code='GLOBAL'", (uid,))
    assert profile(db, student(db, uid))['coreCompetencyScores'] is None
    db.execute("UPDATE dc.person SET source='academic' WHERE intg_uid=%s", (TARGETS[1][1],))
    assert profile(db, student(db, TARGETS[1][1]))['coreCompetencyScores'] is None
    with pytest.raises(RuntimeError):
        seed(db)


def test_application_role_cannot_write_examples(db):
    with db.transaction():
        db.execute('SET LOCAL ROLE dc_app')
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with db.transaction():
                db.execute('DELETE FROM dc.development_core_competency_score')
