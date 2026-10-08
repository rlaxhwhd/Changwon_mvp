import json
import asyncio

import pytest

from app import ai_comments
from app.ai_context import diagnosis_factors, company_goal
from app.db import pool
from app.settings import settings
from test_api import headers


@pytest.fixture
def enabled(monkeypatch):
    monkeypatch.setattr(settings, 'chatbot_enabled', True)
    monkeypatch.setattr(settings, 'rag_enabled', True)
    captured = []
    async def generate(body, context, progress):
        captured.append(context)
        await progress('working')
        return {'text': 'Evidence draft', 'sources': [], 'notices': [], 'elapsedMs': 1}
    monkeypatch.setattr(ai_comments, 'generate_comment', generate)
    return captured


def test_comment_scope_and_input_validation(client, enabled):
    path = '/api/v1/ai/comments'
    body = {'studentId': 'changwon', 'kind': 'comprehensive'}
    assert client.post(path, json=body).status_code == 401
    assert client.post(path, headers=headers('chaewon'), json=body).status_code == 404
    assert client.post(path, headers=headers('career_kim'), json={**body, 'context': 'injected'}).status_code == 422
    assert not enabled


def test_unvalidated_scores_and_illustrative_match_scores_are_not_model_evidence(client):
    good, excluded = diagnosis_factors([
        {'name': 'unmapped', 'tScore': 30, 'validationIssues': ['UNMAPPED_FACTOR']},
        {'name': 'valid', 'tScore': 51, 'level': 'registered'},
        {'name': 'invalid', 'tScore': None, 'validationIssues': ['INVALID_T_SCORE']},
    ])
    assert good == [{'name': 'unmapped', 'tScore': 30, 'definitionStatus': 'UNMAPPED_FACTOR'},
                    {'name': 'valid', 'tScore': 51, 'level': 'registered'}]
    assert excluded == [{'name': 'invalid', 'issues': ['INVALID_T_SCORE']}]
    assert company_goal({'name': 'Goal', 'matchScore': 68, 'requirements': [1]}) == {'name': 'Goal'}


def test_missing_valid_scores_never_trigger_model_interpretation(client, monkeypatch):
    async def retrieve(*args): return [{'id': 'R1', 'title': 'Score evidence'}]
    async def progress(message): pass
    def forbidden(): raise AssertionError('No model call without validated scores')
    monkeypatch.setattr(ai_comments.rag, 'retrieve', retrieve)
    monkeypatch.setattr(ai_comments, 'provider_client', forbidden)
    result = asyncio.run(ai_comments.generate_comment(
        ai_comments.CommentRequest(studentId='chaewon', kind='diagnosis'),
        {'diagnoses': [{'source': 'fixture', 'factors': []}]}, progress))
    assert '해석을 생성하지 않았습니다' in result['text']
    assert '예시' in result['notices'][0]


def test_comment_minimizes_identity_and_is_read_only(client, enabled):
    response = client.post('/api/v1/ai/comments', headers=headers('career_kim'),
                           json={'studentId': 'chaewon', 'kind': 'diagnosis'})
    assert response.status_code == 200, response.text
    assert 'event: done' in response.text
    context = json.dumps(enabled[0], ensure_ascii=False)
    for field in ('studentName', 'studentNo', 'counselorName', 'student_uid', 'template'):
        assert field not in context
    assert enabled[0]['diagnoses']


def test_student_context_excludes_counselor_private_fields(client, enabled):
    response = client.post('/api/v1/ai/comments', headers=headers('chaewon'),
                           json={'studentId': 'chaewon', 'kind': 'counsel'})
    assert response.status_code == 403, response.text
    assert not enabled
    with pool.connection() as conn:
        user = conn.execute("SELECT * FROM dc.person WHERE alias='chaewon'").fetchone()
        context = ai_comments.context_for(conn, user, ai_comments.CommentRequest(studentId='chaewon', kind='counsel'))
    for record in context['counsel']:
        assert not record.get('summary') and not record.get('followUp')


def test_comment_rejects_another_student_counsel(client, enabled):
    with pool.connection() as conn:
        row = conn.execute('''SELECT r.id FROM dc.counsel_request r JOIN dc.person p
          ON p.intg_uid=r.student_uid WHERE p.alias='chaewon' LIMIT 1''').fetchone()
    assert row
    response = client.post('/api/v1/ai/comments', headers=headers('career_kim'),
        json={'studentId': 'changwon', 'kind': 'counsel', 'counselRequestId': row['id']})
    assert response.status_code == 404
    assert not enabled
