import asyncio
import json
from contextlib import contextmanager
from uuid import uuid4

import pytest
from app import ai_comments, counsel_ai
from app.counsel_template import CounselTemplate, journal_input, journal_type, validate_ai_journal
from app.settings import settings
from app.db import pool
from psycopg.types.json import Jsonb
from fastapi import HTTPException
from test_api import headers
from test_psych_referrals import db  # noqa: F401
from counsel_test_support import counsel_form


def test_current_input_journal_required_but_body_edit_allowed(client, db):
    request = db.execute("SELECT * FROM dc.counsel_request WHERE legacy_type='진로취업' LIMIT 1").fetchone()
    template = CounselTemplate.model_validate(counsel_form())
    with pytest.raises(HTTPException) as error:
        validate_ai_journal(db, request, template)
    assert error.value.status_code == 422
    run_id = 'test_journal_' + uuid4().hex
    db.execute('''INSERT INTO dc.ai_run(id,kind_code,student_uid,subject_kind,subject_id,model,input_snapshot)
      VALUES(%s,'COUNSEL_COMMENT',%s,'COUNSEL_JOURNAL',%s,'test',%s)''',
      (run_id, request['student_uid'], request['id'], Jsonb({'template': journal_input(template), 'diagnosisType': journal_type(db, request, template)})))
    template.aiJournalRunId = run_id
    template.aiJournal = '상담사가 검토하고 수정한 본문'
    validate_ai_journal(db, request, template)
    template.program.content += 'changed'
    with pytest.raises(HTTPException) as error:
        validate_ai_journal(db, request, template)
    assert error.value.status_code == 422
    # A different request cannot reuse the generation receipt.
    template.program.content = counsel_form()['program']['content']
    with pytest.raises(HTTPException):
        validate_ai_journal(db, {**request, 'id': str(uuid4())}, template)
    validate_ai_journal(db, {**request, 'legacy_type': '심리'}, None)


def test_journal_endpoint_save_completion_edit_and_queue(client, db, monkeypatch):
    request = db.execute("SELECT * FROM dc.counsel_request WHERE legacy_type='진로취업' LIMIT 1").fetchone()
    db.execute("UPDATE dc.counsel_request SET status_code='CONFIRMED',care_track='general' WHERE id=%s", (request['id'],))
    db.execute('DELETE FROM dc.counsel_record WHERE request_id=%s', (request['id'],))
    monkeypatch.setattr(settings, 'chatbot_enabled', True)
    monkeypatch.setattr(settings, 'rag_enabled', True)
    @contextmanager
    def same_connection():
        yield db
    monkeypatch.setattr(pool, 'connection', same_connection)
    async def write(context, progress):
        return {'text': '\n'.join(counsel_ai.HEADINGS), 'sources': [], 'notices': [], 'elapsedMs': 1}
    monkeypatch.setattr(counsel_ai, 'write_journal', write)
    template = counsel_form(None)
    path = f"/api/v1/counsel-requests/{request['id']}/record"
    body = dict(expectedVersion=0, summary='ignored', comment='public', status='작성중', template=template)
    saved = client.put(path, headers=headers('career_kim'), json=body)
    assert saved.status_code == 200, saved.text
    body.update(expectedVersion=saved.json()['version'], status='완료')
    assert client.put(path, headers=headers('career_kim'), json=body).status_code == 422
    response = client.post('/api/v1/ai/counsel-journal', headers=headers('career_kim'), json={'requestId': request['id'], 'template': template})
    assert 'event: done' in response.text, response.text
    frame = next(frame for frame in response.text.split('\n\n') if 'event: done' in frame)
    reply = json.loads(frame.split('data: ', 1)[1])
    template.update(aiJournal=reply['text'] + '\n수정한 본문', aiJournalRunId=reply['commentId'])
    body['template'] = template
    response = client.put(path, headers=headers('career_kim'), json=body)
    assert response.status_code == 200, response.text
    job = db.execute('SELECT * FROM dc.counsel_ai_refresh WHERE student_uid=%s', (request['student_uid'],)).fetchone()
    assert job['revision'] > job['processed_revision']
    body['expectedVersion'] = response.json()['version']
    template['qualitative']['motivation'] = '하'
    assert client.put(path, headers=headers('career_kim'), json=body).status_code == 422
    assert client.post('/api/v1/ai/counsel-journal', headers=headers('chaewon'), json={'requestId': request['id'], 'template': template}).status_code == 403


def test_comprehensive_shared_day_limit_and_roadmap_gate(client, db):
    user = db.execute("SELECT * FROM dc.person WHERE alias='chaewon'").fetchone()
    staff = db.execute("SELECT * FROM dc.person WHERE alias='career_kim'").fetchone()
    body = ai_comments.CommentRequest(studentId='chaewon', kind='comprehensive')
    db.execute("UPDATE dc.roadmap SET status_code='DRAFT' WHERE student_uid=%s", (user['intg_uid'],))
    assert client.get('/api/v1/ai/comments', headers=headers('chaewon'), params=body.model_dump(exclude_none=True)).status_code == 409
    db.execute("UPDATE dc.roadmap SET status_code='CONFIRMED' WHERE student_uid=%s", (user['intg_uid'],))
    context = ai_comments.context_for(db, user, body)
    assert context == ai_comments.context_for(db, staff, body)
    assert ai_comments.scope_for(body, user) == ai_comments.scope_for(body, staff) == 'student'
    ai_comments.store_comment(db, body, staff, context, {'text': 'shared', 'sources': [], 'notices': []}, 'student')
    assert not ai_comments.generation_available(db, body, user['intg_uid'])
    for who in ('chaewon', 'career_kim'):
        result = client.get('/api/v1/ai/comments', headers=headers(who), params=body.model_dump(exclude_none=True))
        assert result.status_code == 200, result.text
        assert result.json()['comment']['text'] == 'shared'
        assert not result.json()['canGenerate']


def test_worker_failure_preserves_pending_refresh(client, db, monkeypatch):
    request = db.execute("SELECT * FROM dc.counsel_request WHERE legacy_type='진로취업' LIMIT 1").fetchone()
    user = db.execute("SELECT * FROM dc.person WHERE alias='career_kim'").fetchone()
    counsel_ai.enqueue_refresh(db, request, user)
    @contextmanager
    def same_connection(): yield db
    monkeypatch.setattr(pool, 'connection', same_connection)
    async def fail(*args): raise RuntimeError('provider unavailable')
    monkeypatch.setattr(ai_comments, 'generate_comment', fail)
    assert asyncio.run(counsel_ai.refresh_one())
    job = db.execute('SELECT * FROM dc.counsel_ai_refresh WHERE student_uid=%s', (request['student_uid'],)).fetchone()
    assert job['revision'] > job['processed_revision']
    assert job['retry_at'] is not None


def test_shared_generation_reservation_blocks_duplicate_calls_and_recovers(client, db, monkeypatch):
    from app.chatbot import WebToolError
    uid = 'claim-' + uuid4().hex[:12]
    db.execute("INSERT INTO dc.person(intg_uid,alias,name,kind,source) VALUES(%s,%s,'Claim test','STUDENT','fixture')", (uid, uid))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label) VALUES(%s,%s,'Test')", (uid, uid))
    staff = db.execute("SELECT * FROM dc.person WHERE alias='career_kim'").fetchone()
    student = db.execute('SELECT * FROM dc.person WHERE intg_uid=%s', (uid,)).fetchone()
    body = ai_comments.CommentRequest(studentId=uid, kind='comprehensive')
    @contextmanager
    def same_connection(): yield db
    monkeypatch.setattr(pool, 'connection', same_connection)
    first = ai_comments.reserve_comprehensive(body, staff)
    assert not ai_comments.generation_available(db, body, uid)
    with pytest.raises(WebToolError):
        ai_comments.reserve_comprehensive(body, student)
    ai_comments.release_comprehensive(first)
    assert ai_comments.generation_available(db, body, uid)
    second = ai_comments.reserve_comprehensive(body, student)
    ai_comments.release_comprehensive(first)
    assert not ai_comments.generation_available(db, body, uid)
    assert ai_comments.generation_available(db, body, uid, second)
