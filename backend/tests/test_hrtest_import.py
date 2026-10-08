from copy import deepcopy

from app import hrtest, hrtest_sync
from app.db import pool
from app.gates import diagnosis_gate
from app.ai_comments import CommentRequest, context_for
from fastapi import HTTPException
import pytest
from test_api import headers
from test_hrtest import item
from test_psych_referrals import db  # noqa: F401 -- isolated rollback fixture
from uuid import uuid4


def test_hrtest_import_preserves_history_deduplicates_and_refreshes(client, monkeypatch):
    original_store=hrtest_sync.store_results
    def as_app(conn,*args):
        conn.execute('SET LOCAL ROLE dc_app')
        return original_store(conn,*args)
    monkeypatch.setattr(hrtest_sync,'store_results',as_app)
    head = headers('chaewon')
    with pool.connection() as conn:
        student = conn.execute("SELECT p.intg_uid,s.student_no FROM dc.person p JOIN dc.student s USING(intg_uid) WHERE p.alias='chaewon'").fetchone()
        old = conn.execute('SELECT test_id,attempt_no,payload FROM dc.diagnosis_result WHERE student_uid=%s', (student['intg_uid'],)).fetchall()
    received = item()
    received['student']['id'] = student['student_no']
    calls = []
    def fetch(test, number):
        calls.append((test, number))
        return [deepcopy(received)]
    monkeypatch.setattr(hrtest, 'fetch_results', fetch)
    path = '/api/v1/diagnosis/external/ccore/import'
    first = client.post(path, headers=head)
    assert first.status_code == 200, first.text
    assert first.json()['imported'] == 1
    cached = client.post(path+'?preferStored=true', headers=head)
    assert cached.status_code == 200 and cached.json()['cached'] is True
    assert calls == [('ccore', student['student_no'])]
    again = client.post(path, headers=head)
    assert again.status_code == 200 and again.json()['unchanged'] == 1
    assert calls == [('ccore', student['student_no'])] * 2
    result = client.get('/api/v1/diagnosis/students/chaewon', headers=head).json()
    current = next(r for r in result['results'] if r['testId'] == 'ccore' and r['isCurrent'])
    assert current['source'] == 'hrtest'
    assert current['factors'][0]['tScore'] == 0
    assert current['factors'][1]['tScore'] is None
    received['scales'][0]['t_score'] = 61.5
    changed = client.post(path, headers=head)
    assert changed.status_code == 200 and changed.json()['updated'] == 1
    with pool.connection() as conn:
        for record in old:
            actual = conn.execute('SELECT payload FROM dc.diagnosis_result WHERE student_uid=%s AND test_id=%s AND attempt_no=%s',
                                  (student['intg_uid'], record['test_id'], record['attempt_no'])).fetchone()
            assert actual['payload'] == record['payload']
        assert conn.execute("SELECT count(*) AS n FROM dc.hrtest_result_revision WHERE test_id='ccore' AND external_id=12").fetchone()['n'] == 2
        assert conn.execute("SELECT count(*) AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND source='hrtest'", (student['intg_uid'],)).fetchone()['n'] == 1


def test_hrtest_incomplete_overrides_development_completion_without_ai(client, monkeypatch):
    received = item()
    received.update(attempt_id=500, incomplete=True, missing_items=[1])
    monkeypatch.setattr(hrtest, 'fetch_results', lambda *_: [deepcopy(received)])
    head = headers('changwon')
    response = client.post('/api/v1/diagnosis/external/ccore/import', headers=head)
    assert response.status_code == 200, response.text
    assert response.json()['incomplete'] == 1
    data = client.get('/api/v1/diagnosis/students/changwon', headers=head).json()
    current = next(a for a in data['attempts'] if a['testId'] == 'ccore' and a['isCurrent'])
    assert current['status'] == '응답 누락' and current['completedAt'] is None
    assert not any(r['testId'] == 'ccore' and r['isCurrent'] for r in data['results'])
    with pool.connection() as conn:
        user=conn.execute("SELECT * FROM dc.person WHERE alias='changwon'").fetchone()
        _, reasons=diagnosis_gate(conn,user['intg_uid'])
        assert any(reason['code'] in ('CORE_REQUIRED','TYPE_REQUIRED') for reason in reasons)
        with pytest.raises(HTTPException) as error:
            context_for(conn,user,CommentRequest(studentId='changwon',kind='diagnosis',testId='ccore'))
        assert error.value.status_code==404
    received['incomplete'] = False
    received['missing_items'] = []
    response = client.post('/api/v1/diagnosis/external/ccore/import', headers=head)
    assert response.status_code == 200 and response.json()['updated'] == 1
    data = client.get('/api/v1/diagnosis/students/changwon', headers=head).json()
    assert next(a for a in data['attempts'] if a['testId'] == 'ccore' and a['isCurrent'])['status'] == '완료'


def test_hrtest_import_auth_empty_failure_and_disabled_random(client, monkeypatch):
    path = '/api/v1/diagnosis/external/c2/import'
    assert client.post(path).status_code == 401
    assert client.post(path, headers=headers('career_kim')).status_code == 403
    assert client.post('/api/v1/diagnosis/external/c1/import', headers=headers('jiwoo')).status_code == 409
    monkeypatch.setattr(hrtest, 'fetch_results', lambda *_: [])
    response = client.post(path, headers=headers('jiwoo'))
    assert response.status_code == 200 and response.json()['found'] == 0
    def fail(*_):
        raise hrtest.HRTestError('upstream unavailable')
    monkeypatch.setattr(hrtest, 'fetch_results', fail)
    assert client.post(path, headers=headers('jiwoo')).status_code == 502
    assert client.post('/api/v1/development/diagnosis/ccore/complete', headers={**headers('jiwoo'), 'Idempotency-Key':'disabled-test'}).status_code == 410


def test_hrtest_current_result_uses_completion_time_not_import_order(client,monkeypatch):
    received=item()
    received['attempt_id']=801
    monkeypatch.setattr(hrtest,'fetch_results',lambda *_:[deepcopy(received)])
    head=headers('chaewon')
    path='/api/v1/diagnosis/external/ccore/import'
    assert client.post(path,headers=head).status_code==200
    received['attempt_id']=800
    received['scales'][0]['t_score']=22
    received['types']['overall']='취업준비형'
    received['completed_at']='2026-09-01T09:10:00'
    received['started_at']='2026-09-01T09:00:00'
    response=client.post(path,headers=head)
    assert response.status_code==200,response.text
    data=client.get('/api/v1/diagnosis/students/chaewon',headers=head).json()
    current=next(r for r in data['results'] if r['testId']=='ccore' and r['isCurrent'])
    assert current['externalAttemptId']==801
    history=[r for r in data['results'] if r['testId']=='ccore' and r['source']=='hrtest']
    assert {r['externalAttemptId'] for r in history} >= {800,801}
    assert len({r['attemptNo'] for r in history}) == len(history)
    scores={r['externalAttemptId']:r['factors'][0]['tScore'] for r in history}
    assert scores[800] == 22 and scores[801] == 0
    with pool.connection() as conn:
        assert conn.execute("SELECT student_type FROM dc.student_type_event WHERE student_uid=(SELECT intg_uid FROM dc.person WHERE alias='chaewon') AND source='hrtest' ORDER BY decided_at DESC,id DESC LIMIT 1").fetchone()['student_type']=='T3'


@pytest.mark.parametrize('label,code', list(hrtest.CORE_TYPES.items()))
def test_hrtest_core_type_mapping_and_counsel_priority(client,db,label,code):
    uid='hrtest-type-'+uuid4().hex
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Type test','STUDENT','fixture')",(uid,uid))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label) VALUES(%s,%s,'Test')",(uid,uid))
    student={'intg_uid':uid,'alias':uid,'name':'Type test','student_no':uid,'major_label':None,'grade':None}
    received=item()
    received['attempt_id']=901
    received['types']['overall']=label
    hrtest_sync.store_results(db,student,'ccore',[received])
    current=db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()
    assert current['student_type']==code
    hrtest_sync.store_results(db,student,'ccore',[received])
    assert db.execute("SELECT count(*) AS n FROM dc.student_type_event WHERE student_uid=%s AND source='hrtest'",(uid,)).fetchone()['n']==1
    assert db.execute('SELECT payload FROM dc.diagnosis_result WHERE student_uid=%s',(uid,)).fetchone()['payload']['headline']==label
    db.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source) VALUES(%s,'T6','counsel')",(uid,))
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()['student_type']=='T6'


def test_hrtest_unclassified_preserves_scores_but_blocks_type_and_ai(client,db):
    uid='hrtest-review-'+uuid4().hex
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Review test','STUDENT','fixture')",(uid,uid))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label) VALUES(%s,%s,'Test')",(uid,uid))
    db.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source) VALUES(%s,'T1','development:random')",(uid,))
    student={'intg_uid':uid,'alias':uid,'name':'Review test','student_no':uid,'major_label':'Test','grade':None}
    received=item()
    received['attempt_id']=902
    received['types']['overall']='미분류'
    result=hrtest_sync.store_results(db,student,'ccore',[received])
    assert result['needsReview']==1
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone() is None
    assert db.execute('SELECT status_code,completed_at FROM dc.current_diagnosis_attempt WHERE student_uid=%s',(uid,)).fetchone()=={'status_code':'REVIEW','completed_at':None}
    response=client.get('/api/v1/diagnosis/students/'+uid,headers=headers(uid))
    assert response.status_code==200,response.text
    found=response.json()['results'][0]
    assert found['needsReview'] and found['factors'][0]['tScore']==0
    with pytest.raises(HTTPException) as error:
        context_for(db,{**student,'kind':'STUDENT'},CommentRequest(studentId=uid,kind='diagnosis',testId='ccore',attemptNo=1))
    assert error.value.status_code==404
    received['types']['overall']='진로미탐색형'
    hrtest_sync.store_results(db,student,'ccore',[received])
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()['student_type']=='T1'


def test_db_first_does_not_accept_development_or_incomplete_results(client, monkeypatch):
    head = headers('jiwoo')
    path = '/api/v1/diagnosis/external/c4/import?preferStored=true'
    received = item()
    received.update(attempt_id=9901, incomplete=True, missing_items=[1])
    calls = []
    def fetch(*args):
        calls.append(args)
        return [deepcopy(received)]
    monkeypatch.setattr(hrtest, 'fetch_results', fetch)
    first = client.post(path, headers=head)
    assert first.status_code == 200 and first.json()['cached'] is False
    received.update(incomplete=False, missing_items=[])
    second = client.post(path, headers=head)
    assert second.status_code == 200 and second.json()['updated'] == 1
    assert len(calls) == 2
    def unavailable(*args):
        raise AssertionError('Stored results must not depend on the external API')
    monkeypatch.setattr(hrtest, 'fetch_results', unavailable)
    third = client.post(path, headers=head)
    assert third.status_code == 200 and third.json()['cached'] is True
    assert client.post(path).status_code == 401
    assert client.post(path, headers=headers('career_kim')).status_code == 403
    monkeypatch.setattr(hrtest, 'fetch_results', lambda *_: [])
    other = client.post(path, headers=headers('changwon'))
    # A different student must never receive this student's stored result.
    assert other.status_code == 200 and other.json()['found'] == 0 and not other.json()['cached']
