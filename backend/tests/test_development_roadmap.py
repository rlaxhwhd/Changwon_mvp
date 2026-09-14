"""Temporary roadmap generation and scoped staff job selection regression."""
from uuid import uuid4

import pytest
from app.settings import settings
from app import roadmap_generator as generator
from app.seed_roadmap_templates import seed
from test_api import headers
from test_psych_referrals import db  # noqa: F401 -- rollback-only connection fixture


@pytest.fixture
def template(db, monkeypatch):
    monkeypatch.setattr(settings, 'roadmap_provider', 'development-template')
    monkeypatch.setattr(settings, 'environment', 'development')
    seed(db)
    return db.execute('SELECT job_id,label FROM dc.job_role ORDER BY job_id LIMIT 1').fetchone()


def save(client, identity, actor, job_id, on=True):
    return client.put(f'/api/v1/students/{identity}/job-interests/{job_id}',
                      headers=headers(actor), json={'on': on})


def test_career_can_add_and_remove_scoped_job(client, db, template):
    db.execute('''DELETE FROM dc.student_job_interest WHERE intg_uid=(SELECT intg_uid FROM dc.person WHERE alias='chaewon') AND job_id=%s''', (template['job_id'],))
    assert save(client, 'chaewon', 'career_kim', template['job_id']).status_code == 200
    assert save(client, 'chaewon', 'career_kim', template['job_id']).status_code == 200
    count = db.execute('''SELECT count(*) AS n FROM dc.student_job_interest WHERE intg_uid=(SELECT intg_uid FROM dc.person WHERE alias='chaewon') AND job_id=%s''', (template['job_id'],)).fetchone()['n']
    assert count == 1
    assert save(client, 'chaewon', 'career_kim', template['job_id'], False).status_code == 200


def test_student_self_only_and_psych_denied(client, db, template):
    assert save(client, 'chaewon', 'chaewon', template['job_id']).status_code == 200
    assert save(client, 'chaewon', 'changwon', template['job_id']).status_code == 404
    assert save(client, 'chaewon', 'psych_lee', template['job_id']).status_code == 403
    response = client.put('/api/v1/students/chaewon/certs/not-real', headers=headers('career_kim'), json={'on': True})
    assert response.status_code == 403  # certificate writes remain student-only


def test_staff_requires_both_menu_and_student_scope(client, db, template):
    db.execute("DELETE FROM dc.menu_auth WHERE menu_code='roadmap.0' AND role_code='career'")
    # Explicitly remove any extra role grants for this isolated identity as well.
    db.execute("DELETE FROM dc.auth_user WHERE person_uid=(SELECT intg_uid FROM dc.person WHERE alias='career_kim')")
    assert save(client, 'chaewon', 'career_kim', template['job_id']).status_code == 403


def test_out_of_scope_student_denied(client, db, template):
    identity = 'roadmap-scope-' + uuid4().hex
    db.execute("INSERT INTO dc.person VALUES(%s,%s,'Scope test','STUDENT','local','{}',1)", (identity, identity))
    db.execute("INSERT INTO dc.student(intg_uid,student_no,major_label) VALUES(%s,%s,'test')", (identity, identity))
    assert save(client, identity, 'career_kim', template['job_id']).status_code == 404


def basis(db):
    request_id = 'template-' + uuid4().hex
    db.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,
      status_code,method_code,topic,requested_at,snapshot,source_payload)
      SELECT %s,p.intg_uid,(SELECT intg_uid FROM dc.person WHERE alias='career_kim'),
      'CAREER','진로취업','care7','CONFIRMED','OFFLINE','Temporary roadmap test',now(),'{}','{}'
      FROM dc.person p WHERE p.alias='chaewon' ''', (request_id,))
    return request_id


def generate(client, db, target):
    old = client.get('/api/v1/students/chaewon/roadmap', headers=headers('career_kim')).json()['roadmap']
    path = '/api/v1/students/chaewon/roadmap/' + ('regenerate' if old else 'generate')
    body = {'counselRequestId': basis(db), 'targetRole': target,
            'expectedRoadmapVersion': old['roadmapVersion'] if old else 0,
            'expectedVersion': old['version'] if old else 0}
    request_headers = {**headers('career_kim'), 'Idempotency-Key': uuid4().hex}
    response = client.post(path, headers=request_headers, json=body)
    return response, path, body, request_headers


def test_template_is_stored_as_draft_with_provenance_and_idempotency(client, db, template, monkeypatch):
    monkeypatch.setattr(generator, 'provider_client', lambda: pytest.fail('Template must not call a model'))
    response, path, body, request_headers = generate(client, db, template['label'])
    assert response.status_code in (200, 201), response.text
    plan = response.json()
    assert plan['status'] == 'DRAFT' and plan['targetRole'] == template['label']
    assert len(plan['axes']) == 3
    assert all(len(a['cells']) == 5 for a in plan['axes'])
    assert all(c['status'] == 'TODO' and c['programId'] is None for a in plan['axes'] for c in a['cells'])
    run = db.execute('SELECT * FROM dc.ai_run WHERE id=%s', (plan['aiRunId'],)).fetchone()
    assert run['source_ref']['kind'] == 'DEVELOPMENT_TEMPLATE'
    assert run['source_ref']['llmUsed'] is False and run['source_ref']['ragUsed'] is False
    assert run['input_snapshot']['targetRole'] == template['label']
    assert client.post(path, headers=request_headers, json=body).json() == plan


def test_missing_job_template_preserves_existing_plan(client, db, template):
    old = client.get('/api/v1/students/chaewon/roadmap', headers=headers('career_kim')).json()['roadmap']
    response, _, _, _ = generate(client, db, 'Unregistered job')
    assert response.status_code == 422
    after = client.get('/api/v1/students/chaewon/roadmap', headers=headers('career_kim')).json()['roadmap']
    assert old == after


def test_temporary_provider_disabled_in_production(monkeypatch):
    monkeypatch.setattr(settings, 'roadmap_provider', 'development-template')
    monkeypatch.setattr(settings, 'environment', 'production')
    assert generator.provider_name() is None


def test_all_catalog_templates_obey_schema(db, template):
    rows = db.execute('SELECT outcome FROM dc.development_roadmap_template').fetchall()
    assert rows
    for row in rows:
        generator.Outcome.model_validate(row['outcome'])
