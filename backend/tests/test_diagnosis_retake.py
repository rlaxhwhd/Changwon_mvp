from datetime import datetime, timedelta, timezone
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi import HTTPException

from app import hrtest_sync
from app.diagnosis_retake import state
from app.gates import diagnosis_gate
from app.db import pool
from app.roadmap import check_counsel_basis
from test_api import headers
from test_hrtest import item
from test_psych_referrals import db  # noqa: F401


def student(db):
    return db.execute("SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE p.alias='chaewon'").fetchone()


def result(db, who, test='ccore', kind='진로설정형', future=False):
    body = item()
    body['attempt_id'] = int(uuid4().hex[:12], 16)
    moment = datetime.now(timezone.utc) + (timedelta(seconds=2) if future else -timedelta(days=2))
    body.update(started_at=moment.isoformat(), completed_at=(moment + timedelta(seconds=1)).isoformat())
    body['types'] = {'overall': kind}
    hrtest_sync.store_results(db, who, test, [body])
    return body


def test_shared_request_approval_permissions_and_history(client, db):
    who = student(db)
    result(db, who)
    result(db, who, test='c2')
    c2_count = db.execute("SELECT count(*) AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id='c2'", (who['intg_uid'],)).fetchone()['n']
    db.execute("UPDATE dc.diagnosis_attempt SET status_code='NOT_STARTED',completed_at=NULL WHERE student_uid=%s AND test_id='c3'", (who['intg_uid'],))
    db.execute("UPDATE dc.roadmap_item SET status='TODO',completion_source_code=NULL,completed_at=NULL WHERE student_uid=%s", (who['intg_uid'],))
    assert client.post('/api/v1/diagnosis/external/ccore/launch', headers=headers('chaewon')).status_code == 403
    first = client.post('/api/v1/diagnosis/retake-request', headers=headers('chaewon'))
    assert first.status_code == 201, first.text
    second = client.post('/api/v1/diagnosis/retake-request', headers=headers('chaewon'))
    assert len(second.json()['requests']) == len(first.json()['requests']) == 1
    key = str(first.json()['requests'][0]['id'])
    assert db.execute("SELECT count(*) AS n FROM dc.notification WHERE source_kind='diagnosis-request' AND source_id=%s", (key,)).fetchone()['n'] == 8
    # No assignment is needed for any career counselor.
    url = '/api/v1/diagnosis/students/chaewon/retakes/ccore'
    assert client.post(url, headers=headers('chaewon')).status_code == 403
    assert client.post(url, headers=headers('kor-1')).status_code == 403
    for counselor in ('career_park', 'career_kim', 'psych_lee'):
        approved = client.post(url, headers=headers(counselor))
        assert approved.status_code == 200, approved.text
        assert approved.json()['permissions']['ccore'] is True
        assert len(approved.json()['requests']) == 1
    assert client.post('/api/v1/diagnosis/external/ccore/launch', headers=headers('chaewon')).status_code == 200
    result(db, who)  # Old imported history cannot consume approval.
    assert state(db, who['intg_uid'])['permissions']['ccore']
    result(db, who, kind='역량성장형', future=True)
    data = state(db, who['intg_uid'])
    assert data['requests'][0]['status'] == 'COMPLETED'
    assert data['diagnosticType'] == 'T3'
    assert data['permissions']['ccore'] is False
    assert data['permissions']['c3'] is True
    assert 'c2' not in data['permissions']
    assert db.execute("SELECT count(*) AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id='c2'", (who['intg_uid'],)).fetchone()['n'] == c2_count
    assert diagnosis_gate(db, who['intg_uid'])[0]['code'] == 'T3'


def test_progress_exact_threshold_and_repeat_per_plan(client, db):
    who = student(db)
    uid = who['intg_uid']
    result(db, who)
    # Use the actual roadmap aggregation over 200 live required items.
    db.execute('DELETE FROM dc.roadmap_item WHERE student_uid=%s', (uid,))
    db.execute('''INSERT INTO dc.roadmap_item(id,student_uid,axis,position,title,priority,importance,why,entry,status,completion_source_code)
      SELECT 'retake-'||%s||'-'||n,%s,'IAP',n,'Threshold test','P0','REQUIRED','Test','REQUIRED',CASE WHEN n<=99 THEN 'DONE' ELSE 'TODO' END,
      CASE WHEN n<=99 THEN 'LEGACY' END
      FROM generate_series(1,200) n''', (uuid4().hex, uid))
    assert db.execute('SELECT pct FROM dc.roadmap_progress(%s,now())', (uid,)).fetchone()['pct'] == 50
    assert state(db, uid)['requests'] == []
    db.execute("UPDATE dc.roadmap_item SET status='DONE',completion_source_code='LEGACY' WHERE student_uid=%s AND position=100", (uid,))
    data = state(db, uid)
    assert data['guide']['stage'] == 'core'
    assert len(state(db, uid)['requests']) == 1
    result(db, who, future=True)
    db.execute('UPDATE dc.roadmap SET version=version+1 WHERE student_uid=%s', (uid,))
    assert len(state(db, uid)['requests']) == 2


def test_t5_no_automatic_grant_and_first_attempt_no_request(client, db):
    who = student(db)
    db.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source) VALUES(%s,'T5','counsel')", (who['intg_uid'],))
    db.execute("UPDATE dc.roadmap_item SET status='DONE',completion_source_code='LEGACY' WHERE student_uid=%s", (who['intg_uid'],))
    assert state(db, who['intg_uid'])['requests'] == []
    assert client.post('/api/v1/diagnosis/retake-request', headers=headers('jiwoo')).status_code == 409


def test_concurrent_requests_and_approvals_are_single_use(client):
    uid = 'retake-' + uuid4().hex
    with pool.connection() as conn:
        conn.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Retake concurrency fixture','STUDENT','fixture')", (uid, uid))
        conn.execute("INSERT INTO dc.student(intg_uid,student_no,major_label,grade) VALUES(%s,%s,'Test',1)", (uid, uuid4().hex[:18]))
        conn.execute("INSERT INTO dc.diagnosis_attempt(id,student_uid,test_id,attempt_no,status_code,started_at,completed_at,payload) VALUES(%s,%s,'ccore',1,'DONE',now(),now(),'{}')", (uuid4().hex, uid))
    def request(_):
        return client.post('/api/v1/diagnosis/retake-request', headers=headers(uid))
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(request, range(2)))
    assert all(r.status_code == 201 for r in responses)
    assert responses[0].json()['requests'][0]['id'] == responses[1].json()['requests'][0]['id']
    def approve(actor):
        return client.post(f'/api/v1/diagnosis/students/{uid}/retakes/ccore', headers=headers(actor))
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(approve, ('career_kim', 'psych_lee')))
    assert all(r.status_code == 200 for r in responses)
    with pool.connection() as conn:
        assert conn.execute('SELECT count(*) AS n FROM dc.diagnosis_retake WHERE student_uid=%s', (uid,)).fetchone()['n'] == 1
        assert conn.execute("SELECT count(*) AS n FROM dc.notification WHERE recipient_uid=%s AND source_kind='diagnosis-approved'", (uid,)).fetchone()['n'] == 1


def test_diagnosed_roster_and_metadata_use_same_filter(client, db):
    who = student(db)
    uid = who['intg_uid']
    db.execute('''INSERT INTO academic.v_usr_inf(intg_uid,login_id,usr_nm,user_ty_cd,hofc_sta_cd,stu_schgr,orgz_nm)
      SELECT %s,%s,'Retake Test','1101','0001','3','Test Major'
      WHERE NOT EXISTS(SELECT 1 FROM academic.v_usr_inf WHERE intg_uid=%s)''', (uid, who['student_no'], uid))
    db.execute('SET LOCAL ROLE dc_app')
    response = client.get('/api/v1/academic-students?filters.diagnosed=Y', headers=headers('psych_lee'))
    assert response.status_code == 200, response.text
    metadata = client.get('/api/v1/academic-students/metadata?diagnosed=true', headers=headers('psych_lee'))
    assert metadata.status_code == 200, metadata.text
    assert response.json()['totalCount'] == metadata.json()['summary']['total']
    assert any(r['id'] == uid for r in response.json()['items'])
    for row in response.json()['items']:
        assert db.execute("SELECT 1 FROM dc.diagnosis_attempt WHERE student_uid=%s AND status_code IN ('DONE','REVIEW','INCOMPLETE')", (row['id'],)).fetchone()


def test_old_counsel_cannot_bypass_retest_roadmap_cycle(client, db):
    who = student(db)
    uid = who['intg_uid']
    result(db, who)
    old = db.execute("SELECT id FROM dc.counsel_request WHERE student_uid=%s AND care_track='care7' AND status_code='DONE' LIMIT 1", (uid,)).fetchone()
    assert old
    response = client.post('/api/v1/diagnosis/students/chaewon/retakes/ccore', headers=headers('career_kim'))
    assert response.status_code == 200
    with pytest.raises(HTTPException) as error:
        check_counsel_basis(db, uid, old['id'])
    assert error.value.detail['code'] == 'RETEST_COUNSEL_REQUIRED'
    result(db, who, kind='역량성장형', future=True)
    with pytest.raises(HTTPException) as error:
        check_counsel_basis(db, uid, old['id'])
    assert error.value.detail['code'] == 'RETEST_COUNSEL_REQUIRED'
