from uuid import uuid4
import pytest
from app import roadmap
from test_api import headers
from test_psych_referrals import db  # noqa: F401
from test_roadmap_generator import outcome


@pytest.fixture
def setup(client, db, monkeypatch):
    uid = db.execute("SELECT intg_uid FROM dc.person WHERE alias='chaewon'").fetchone()['intg_uid']
    request = 'undo-test-' + uuid4().hex
    db.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,
      status_code,method_code,topic,requested_at,completed_at,snapshot,source_payload)
      SELECT %s,%s,intg_uid,'CAREER','진로취업','care7','DONE','OFFLINE','Test',now(),now(),'{}','{}'
      FROM dc.person WHERE alias='career_kim' ''', (request, uid))
    monkeypatch.setattr(roadmap, 'available', lambda student: True)
    calls = []
    def generate(conn, student, counsel, target, before_network=None):
        calls.append(target)
        return {**outcome(), 'targetRole': target}
    monkeypatch.setattr(roadmap, 'generate_outcome', generate)
    return uid, request, calls


def post(client, action, plan, **changes):
    return client.post('/api/v1/students/chaewon/roadmap/' + action,
        headers={**headers('career_kim'), 'Idempotency-Key': uuid4().hex}, json={
        'expectedRoadmapVersion': plan['roadmapVersion'], 'expectedVersion': plan['version'], **changes})


def current(client):
    return client.get('/api/v1/students/chaewon/roadmap', headers=headers('career_kim')).json()['roadmap']


def test_restore_previous_content_completion_and_immutable_history(client, db, setup):
    uid, request, calls = setup
    original = current(client)
    items = db.execute('SELECT * FROM dc.roadmap_item WHERE student_uid=%s ORDER BY id', (uid,)).fetchall()
    generated = post(client, 'regenerate', original, counselRequestId=request, targetRole='자동차 부품 품질관리 엔지니어')
    assert generated.status_code == 200, generated.text
    assert calls == ['자동차 부품 품질관리 엔지니어']
    draft = generated.json()
    assert draft['capabilities']['undoGeneration'] == 'restore'
    assert post(client, 'generation/undo', original).status_code == 409
    denied = client.post('/api/v1/students/chaewon/roadmap/generation/undo', headers={**headers('chaewon'),
        'Idempotency-Key': uuid4().hex}, json={'expectedRoadmapVersion':draft['roadmapVersion'],'expectedVersion':draft['version']})
    assert denied.status_code == 403
    key = {**headers('career_kim'), 'Idempotency-Key':uuid4().hex}
    body = {'expectedRoadmapVersion':draft['roadmapVersion'], 'expectedVersion':draft['version']}
    restored = client.post('/api/v1/students/chaewon/roadmap/generation/undo', headers=key, json=body)
    assert restored.status_code == 200, restored.text
    assert client.post('/api/v1/students/chaewon/roadmap/generation/undo',headers=key,json=body).json() == restored.json()
    plan = restored.json()['roadmap']
    assert plan['targetRole'] == original['targetRole'] and plan['status'] == original['status']
    assert plan['roadmapVersion'] > draft['roadmapVersion']
    assert plan['capabilities']['undoGeneration'] is None
    after = db.execute('SELECT * FROM dc.roadmap_item WHERE student_uid=%s ORDER BY id', (uid,)).fetchall()
    assert [{k:v for k,v in r.items() if k!='version'} for r in items] == [{k:v for k,v in r.items() if k!='version'} for r in after]
    assert all(b['version'] > a['version'] for a,b in zip(items,after))
    # A restored generation can be regenerated without colliding with old snapshots.
    again = post(client,'regenerate',plan,counselRequestId=request,targetRole='직무 재설정')
    assert again.status_code == 200, again.text
    confirmed = post(client,'confirm',again.json())
    assert confirmed.status_code == 200, confirmed.text
    assert post(client,'generation/undo',confirmed.json()).status_code == 409
    reopened = post(client,'reopen',confirmed.json(),reason='review')
    assert reopened.status_code == 200
    assert reopened.json()['capabilities']['undoGeneration'] is None
    db.execute('SET CONSTRAINTS ALL IMMEDIATE')


def test_first_generation_cancel_then_generate_uses_new_version(client, db, setup):
    uid, request, _ = setup
    db.execute('DELETE FROM dc.roadmap_item WHERE student_uid=%s',(uid,))
    db.execute('DELETE FROM dc.roadmap_axis WHERE student_uid=%s',(uid,))
    db.execute('DELETE FROM dc.roadmap WHERE student_uid=%s',(uid,))
    empty = {'roadmapVersion':0,'version':0}
    generated = post(client,'generate',empty,counselRequestId=request,targetRole='새로운 자유 입력 직무')
    assert generated.status_code == 201, generated.text
    draft = generated.json()
    assert draft['capabilities']['undoGeneration'] == 'cancel'
    cancelled = post(client,'generation/undo',draft)
    assert cancelled.status_code == 200, cancelled.text
    assert current(client) is None
    assert db.execute('SELECT count(*) n FROM dc.roadmap_item WHERE student_uid=%s',(uid,)).fetchone()['n'] == 0
    again = post(client,'generate',empty,counselRequestId=request,targetRole='다른 자유 직무')
    assert again.status_code == 201, again.text
    assert again.json()['roadmapVersion'] > draft['roadmapVersion']
    assert post(client,'generation/undo',draft).status_code == 409
    db.execute('SET CONSTRAINTS ALL IMMEDIATE')
