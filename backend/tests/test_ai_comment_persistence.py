import pytest
import asyncio
import json

from app import ai_comments
from app.db import pool
from app.settings import settings
from test_api import headers
from test_ai_comments import enabled


def done(response):
    frames = response.text.split('\n\n')
    return next(json.loads(frame.split('data: ', 1)[1]) for frame in frames if 'event: done' in frame)


@pytest.mark.parametrize('kind', ['diagnosis', 'counsel', 'comprehensive', 'roadmap'])
def test_roundtrip_all_kinds_student_and_counselor_visibility(client, enabled, monkeypatch, kind):
    body = {'studentId': 'chaewon', 'kind': kind}
    path = '/api/v1/ai/comments'
    student = done(client.post(path, headers=headers('chaewon'), json=body))
    staff = done(client.post(path, headers=headers('career_kim'), json=body))
    assert student['commentId'] != staff['commentId']
    # Retrieval must never call the model, even if the model is disabled.
    calls = len(enabled)
    monkeypatch.setattr(settings, 'chatbot_enabled', False)
    student_get = client.get(path, headers=headers('chaewon'), params=body)
    assert student_get.status_code == 200, student_get.text
    assert student_get.json()['comment']['commentId'] == student['commentId']
    assert student_get.json()['studentComment'] is None
    staff_get = client.get(path, headers=headers('career_kim'), params=body)
    assert staff_get.status_code == 200, staff_get.text
    assert staff_get.json()['comment']['commentId'] == staff['commentId']
    assert staff_get.json()['studentComment']['commentId'] == student['commentId']
    assert len(enabled) == calls
    assert client.get(path, headers=headers('changwon'), params=body).status_code == 404
    assert client.get(path, params=body).status_code == 401


def test_failed_save_does_not_report_generation_success(client, enabled, monkeypatch):
    def fail(*args):
        raise RuntimeError('sensitive database detail')
    monkeypatch.setattr(ai_comments, 'persist_comment', fail)
    response = client.post('/api/v1/ai/comments', headers=headers('chaewon'),
                           json={'studentId': 'chaewon', 'kind': 'comprehensive'})
    assert 'event: error' in response.text and 'event: done' not in response.text
    assert 'sensitive database detail' not in response.text


def test_completed_comment_persists_after_client_disconnect():
    from app import chatbot

    async def scenario():
        started, finish, saved = asyncio.Event(), asyncio.Event(), asyncio.Event()
        async def run(progress):
            await progress('working')
            started.set()
            await finish.wait()
            saved.set()
            return {'text': 'persisted'}
        response = chatbot.stream_reply('disconnect-test', run, persist_after_disconnect=True)
        stream = response.body_iterator
        assert 'progress' in await anext(stream)
        await started.wait()
        await stream.aclose()
        assert 'disconnect-test' in chatbot._active
        finish.set()
        await asyncio.wait_for(saved.wait(), 1)
        await asyncio.sleep(0)
        assert 'disconnect-test' not in chatbot._active
    asyncio.run(scenario())


@pytest.mark.parametrize('kind', ['diagnosis', 'counsel', 'comprehensive', 'roadmap'])
def test_comment_storage_preserves_revisions_and_app_permissions(client, kind):
    with pool.connection() as conn:
        user = conn.execute("SELECT * FROM dc.person WHERE alias='career_kim'").fetchone()
        body = ai_comments.CommentRequest(studentId='chaewon', kind=kind)
        context = {'evidence': 'snapshot'}
        reply = {'text': 'First generated comment', 'sources': [{'id': 'R1'}],
                 'notices': ['Draft'], 'elapsedMs': 100, 'generatedAt': '2026-10-02T10:00:00+09:00'}
        conn.execute('SET LOCAL ROLE dc_app')
        first = ai_comments.store_comment(conn, body, user, context, reply, 'test-scope')
        second = ai_comments.store_comment(conn, body, user, context, {**reply, 'text': 'New revision'}, 'test-scope')
        assert first['commentId'] != second['commentId']
        assert first['savedAt'] and not first['stale']
        rows = conn.execute('''SELECT c.body,c.metadata,r.model,r.input_snapshot,r.requested_by
          FROM dc.ai_run r JOIN dc.ai_comment c ON c.run_id=r.id WHERE r.id IN (%s,%s)''',
          (first['commentId'], second['commentId'])).fetchall()
        assert {row['body'] for row in rows} == {'First generated comment', 'New revision'}
        assert all(row['input_snapshot'] == context and row['metadata']['sources'] == [{'id': 'R1'}] for row in rows)
        assert all(row['requested_by'] == user['intg_uid'] for row in rows)
        # Synthetic validation records are never retained outside this transaction.
        conn.rollback()


def test_stale_comment_is_marked_without_changing_saved_text():
    from datetime import datetime, timezone
    context = {'score': 55}
    row = {'id': 'one', 'body': 'Original', 'metadata': {'sources': []},
           'input_hash': ai_comments.context_hash(context), 'created_at': datetime.now(timezone.utc)}
    assert not ai_comments.saved_dto(row, context)['stale']
    changed = ai_comments.saved_dto(row, {'score': 60})
    assert changed['stale'] and changed['text'] == 'Original'
