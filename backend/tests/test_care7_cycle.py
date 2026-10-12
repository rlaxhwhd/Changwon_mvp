from datetime import datetime
from zoneinfo import ZoneInfo

from app import care7_cycle
from app.diagnosis_retake import state
from app.gates import employment_gate, program_gate
from app.roadmap import check_counsel_basis
from fastapi import HTTPException
import pytest
from test_diagnosis_retake import student, result
from test_psych_referrals import db  # noqa: F401
from test_api import headers


def set_year(monkeypatch, year):
    start = datetime(year, 1, 1, tzinfo=ZoneInfo('Asia/Seoul'))
    monkeypatch.setattr(care7_cycle, 'year_start', lambda: start)
    return start


def test_retest_keeps_access_during_approval_and_new_type(client, db, monkeypatch):
    set_year(monkeypatch, 2026)
    who = student(db)
    uid = who['intg_uid']
    assert state(db, uid)['annual']['eligible']
    result(db, who)
    response = client.post('/api/v1/diagnosis/students/chaewon/retakes/ccore', headers=headers('career_kim'))
    assert response.status_code == 200
    assert response.json()['guide']['stage'] == 'core'
    assert response.json()['annual']['eligible']
    assert program_gate(db, uid)['eligible'] and employment_gate(db, uid)['eligible']
    result(db, who, kind='역량성장형', future=True)
    db.execute("UPDATE dc.roadmap SET status_code='DRAFT',confirmed_at=NULL WHERE student_uid=%s", (uid,))
    assert state(db, uid)['annual']['eligible']
    assert program_gate(db, uid)['eligible'] and employment_gate(db, uid)['eligible']


def test_annual_reset_full_renewal_and_history_preserved(client, db, monkeypatch):
    who = student(db)
    uid = who['intg_uid']
    result(db, who, kind='역량성장형')
    result(db, who, test='c3')
    before = db.execute('SELECT count(*) AS n FROM dc.diagnosis_attempt WHERE student_uid=%s', (uid,)).fetchone()['n']
    set_year(monkeypatch, 2027)
    data = state(db, uid)
    assert not data['annual']['eligible'] and data['guide']['stage'] == 'core'
    assert data['permissions']['ccore'] and not data['annual']['coreDone']
    assert not program_gate(db, uid)['eligible'] and not employment_gate(db, uid)['eligible']
    assert client.get('/api/v1/students/chaewon/care7-history', headers=headers('chaewon')).json()['plans']
    assert client.get('/api/v1/diagnosis/students/chaewon', headers=headers('chaewon')).json()['results']
    # An old result re-import does not satisfy the new year's mandatory diagnosis.
    assert not care7_cycle.annual_status(db, uid)['coreDone']
    for test in ('ccore', 'c3'):
        db.execute("UPDATE dc.diagnosis_attempt SET started_at='2027-01-02 09:00+09',completed_at='2027-01-02 10:00+09' WHERE student_uid=%s AND test_id=%s AND status_code='DONE'", (uid, test))
        data = state(db, uid)
        assert not data['annual']['eligible']
        assert data['guide']['stage'] == ('followup' if test == 'ccore' else 'counsel')
    counsel = db.execute("SELECT id FROM dc.counsel_request WHERE student_uid=%s AND status_code='DONE' AND care_track='care7' LIMIT 1", (uid,)).fetchone()['id']
    with pytest.raises(HTTPException):
        check_counsel_basis(db, uid, counsel)
    db.execute("UPDATE dc.counsel_request SET completed_at='2027-01-03 12:00+09' WHERE id=%s", (counsel,))
    assert state(db, uid)['guide']['stage'] == 'roadmap'
    # An unrelated extra test after counseling does not invalidate its annual basis.
    result(db, who, test='c2')
    db.execute("UPDATE dc.diagnosis_attempt SET started_at='2027-01-05 09:00+09',completed_at='2027-01-05 10:00+09' WHERE student_uid=%s AND test_id='c2'", (uid,))
    check_counsel_basis(db, uid, counsel)
    before += 1
    db.execute("UPDATE dc.roadmap SET basis_kind='COUNSEL',counsel_request_id=%s,confirmed_at='2027-01-04 12:00+09' WHERE student_uid=%s", (counsel, uid))
    assert state(db, uid)['annual']['eligible']
    # Same-year optional retest and draft do not revoke the earned year.
    db.execute("UPDATE dc.roadmap SET status_code='DRAFT',confirmed_at=NULL WHERE student_uid=%s", (uid,))
    assert program_gate(db, uid)['eligible']
    set_year(monkeypatch, 2028)
    assert not state(db, uid)['annual']['eligible']
    assert db.execute('SELECT count(*) AS n FROM dc.diagnosis_attempt WHERE student_uid=%s', (uid,)).fetchone()['n'] == before


def test_history_scope_and_drafts_are_not_exposed(client, db):
    assert client.get('/api/v1/students/changwon/care7-history', headers=headers('chaewon')).status_code in (403, 404)
    uid = student(db)['intg_uid']
    db.execute("UPDATE dc.roadmap SET status_code='DRAFT',confirmed_at=NULL WHERE student_uid=%s", (uid,))
    assert client.get('/api/v1/students/chaewon/care7-history', headers=headers('chaewon')).json()['plans'] == []


def test_korean_new_year_boundary():
    assert care7_cycle.year_start(datetime.fromisoformat('2026-12-31T14:59:59+00:00')).year == 2026
    assert care7_cycle.year_start(datetime.fromisoformat('2026-12-31T15:00:00+00:00')).year == 2027
