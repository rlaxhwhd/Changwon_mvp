import copy
import hashlib
import json

import httpx
import pytest
from pydantic import SecretStr

from app import roadmap_generator as generator
from app.db import pool
from app.settings import settings
from test_api import headers
from test_roadmap import care7_request, KEY


def outcome():
    return {'targetRole': 'Backend engineer', 'targetCompany': 'Technology', 'axes': [
        {'axis': axis, 'headline': axis + ' plan', 'rationale': 'Based on coursework and counseling',
         'cells': [{'title': f'{axis} task {i}', 'priority': 'P1', 'importance': 'IMPORTANT',
                    'why': 'Develop skills identified in the supplied courses'} for i in range(5)]}
        for axis in ('IAP', 'CORE', 'GROWTH')]}


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setattr(settings, 'roadmap_provider', 'openai-compatible')
    monkeypatch.setattr(settings, 'roadmap_model', 'test-model')
    monkeypatch.setattr(settings, 'roadmap_api_key', SecretStr('test-key'))
    monkeypatch.setattr(settings, 'roadmap_api_key_file', None)
    calls = []
    response = {'value': outcome()}

    def handler(request):
        calls.append(json.loads(request.content))
        if isinstance(response['value'], Exception):
            raise response['value']
        return httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {
            'content': json.dumps(response['value'])}}]})
    monkeypatch.setattr(generator, 'provider_client', lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    return calls, response


def test_live_provider_creates_without_fixture_and_records_actual_inputs(client, provider):
    calls, _ = provider
    # changwon has no roadmapOutcome. Configured provider must work without one.
    capability = client.get('/api/v1/students/changwon/roadmap/generation-capability', headers=headers('career_kim'))
    assert capability.json()['providerSource'] == 'openai-compatible'
    counsel_id = care7_request('changwon')
    current = client.get('/api/v1/students/changwon/roadmap', headers=headers('career_kim')).json()['roadmap']
    route = 'regenerate' if current else 'generate'
    body = {'counselRequestId': counsel_id, 'targetRole': 'Backend engineer',
            'expectedRoadmapVersion': current['roadmapVersion'] if current else 0,
            'expectedVersion': current['version'] if current else 0}
    request_headers = KEY('career_kim')
    path = f'/api/v1/students/changwon/roadmap/{route}'
    response = client.post(path, headers=request_headers, json=body)
    assert response.status_code in (200, 201), response.text
    plan = response.json()
    assert plan['status'] == 'DRAFT'
    assert sum(len(a['cells']) for a in plan['axes']) == 15
    assert all(c['status'] == 'TODO' for a in plan['axes'] for c in a['cells'])
    assert len(calls) == 1
    sent = json.loads(calls[0]['messages'][1]['content'])
    assert sent['courses'] and sent['certificates']
    assert 'roadmapOutcome' not in json.dumps(sent)
    assert 'studentNo' not in json.dumps(sent) and 'cert_no' not in json.dumps(sent)
    with pool.connection() as conn:
        run = conn.execute('SELECT * FROM dc.ai_run WHERE id=%s', (plan['aiRunId'],)).fetchone()
        assert run['model'] == 'test-model' and run['source_ref']['kind'] == 'LLM'
        assert run['input_snapshot'] == sent
        assert run['input_hash'] == hashlib.sha256(json.dumps(sent, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    retry = client.post(path, headers=request_headers, json=body)
    assert retry.json() == plan and len(calls) == 1


@pytest.mark.parametrize('invalid', ['axes', 'count', 'status', 'role', 'timeout'])
def test_provider_failure_preserves_existing_plan(client, provider, invalid):
    calls, result = provider
    bad = copy.deepcopy(outcome())
    if invalid == 'axes': bad['axes'][1]['axis'] = 'IAP'
    if invalid == 'count': bad['axes'][0]['cells'].pop()
    if invalid == 'status': bad['axes'][0]['cells'][0]['status'] = 'DONE'
    if invalid == 'role': bad['targetRole'] = 'Unrequested role'
    if invalid == 'timeout': bad = httpx.ReadTimeout('test timeout')
    result['value'] = bad
    plan = client.get('/api/v1/students/chaewon/roadmap', headers=headers('career_kim')).json()['roadmap']
    response = client.post('/api/v1/students/chaewon/roadmap/regenerate', headers=KEY('career_kim'), json={
        'counselRequestId': care7_request('chaewon'), 'targetRole': 'Backend engineer',
        'expectedRoadmapVersion': plan['roadmapVersion'], 'expectedVersion': plan['version']})
    assert response.status_code == (504 if invalid == 'timeout' else 502), response.text
    after = client.get('/api/v1/students/chaewon/roadmap', headers=headers('career_kim')).json()['roadmap']
    assert after['version'] == plan['version'] and after['axes'] == plan['axes']
    assert len(calls) == 1


def test_disabled_provider_does_not_adopt_fixture(client, monkeypatch):
    monkeypatch.setattr(settings, 'roadmap_provider', 'disabled')
    capability = client.get('/api/v1/students/jiwoo/roadmap/generation-capability', headers=headers('career_kim'))
    assert capability.json()['canGenerate'] is False


def test_explicit_fixture_provider_is_disabled_in_production(monkeypatch):
    monkeypatch.setattr(settings, 'roadmap_provider', 'fixture')
    monkeypatch.setattr(settings, 'environment', 'production')
    assert generator.provider_name() is None
