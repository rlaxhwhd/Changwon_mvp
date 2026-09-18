"""A draft regenerated from a confirmed follow-up counsel and that counsel's record must be finalized atomically.

첫 로드맵은 완료된 상담에서만 나므로(2026-09-18) 여기서는 확정된 재상담으로 재생성한 초안을 쓴다 —
그 재상담의 완료가 초안을 함께 확정한다."""
import pytest
from counsel_test_support import counsel_form
from app.db import connection
from app.main import app
from test_api import headers
from test_psych_referrals import db  # noqa: F401
from test_development_roadmap import template, generate, basis  # noqa: F401


@pytest.fixture
def draft(client, db, template):
    response, _, body, _ = generate(client, db, template['label'])
    assert response.status_code in (200, 201), response.text
    if response.status_code == 201:
        # 첫 생성의 근거는 이미 완료된 상담이라 다시 완료할 수 없다 — 확정 재상담으로 재생성해 둔다.
        response, _, body, _ = generate(client, db, template['label'])
        assert response.status_code == 200, response.text
    # Production dependency rolls a failed request back. Preserve that boundary
    # inside the outer rollback-only test transaction as well.
    def isolated_request():
        with db.transaction():
            yield db
    app.dependency_overrides[connection] = isolated_request
    return body['counselRequestId'], response.json()


def complete(client, draft, actor='career_kim', **changes):
    request_id, plan = draft
    body = dict(expectedVersion=1, expectedRecordVersion=0, template=counsel_form(), summary='Counseling summary', comment='Student comment',
                expectedRoadmapVersion=plan['roadmapVersion'],
                expectedRoadmapLockVersion=plan['version'])
    body.update(changes)
    return client.post(f'/api/v1/counsel-requests/{request_id}/complete',
                       headers=headers(actor), json=body)


def state(db, request_id):
    return db.execute('''SELECT c.status_code AS counsel,r.status_code AS plan,
      r.lock_version,(SELECT count(*) FROM dc.counsel_record WHERE request_id=c.id) AS records
      FROM dc.counsel_request c JOIN dc.roadmap r USING(student_uid) WHERE c.id=%s''',
                      (request_id,)).fetchone()


def test_completion_confirms_generated_draft_and_counsel_type(client, db, draft):
    before_types = db.execute('SELECT count(*) AS n FROM dc.student_type_event').fetchone()['n']
    response = complete(client, draft)
    assert response.status_code == 200, response.text
    assert state(db, draft[0]) == dict(counsel='DONE', plan='CONFIRMED',
                                     lock_version=draft[1]['version']+1, records=1)
    assert db.execute('SELECT count(*) AS n FROM dc.student_type_event').fetchone()['n'] == before_types + 1
    event = db.execute('''SELECT action_code FROM dc.roadmap_event
      WHERE student_uid=%s AND lock_version_after=%s''',
                       (draft[1]['studentUid'], draft[1]['version']+1)).fetchone()
    assert event['action_code'] == 'CONFIRM'
    response = complete(client, draft)
    assert response.status_code == 409  # repeated click cannot create a second record
    assert state(db, draft[0])['records'] == 1


@pytest.mark.parametrize('changes', [dict(expectedVersion=999),
    dict(expectedRoadmapVersion=999), dict(expectedRoadmapLockVersion=999)])
def test_stale_or_invalid_completion_changes_nothing(client, db, draft, changes):
    before = state(db, draft[0])
    assert complete(client, draft, **changes).status_code == 409
    assert state(db, draft[0]) == before


def test_other_counselor_cannot_finalize(client, db, draft):
    before = state(db, draft[0])
    assert complete(client, draft, actor='career_park').status_code in (403, 404)
    assert state(db, draft[0]) == before


def test_other_counsel_basis_cannot_finalize(client, db, draft):
    other = basis(db)
    assert complete(client, (other, draft[1])).status_code == 409
    assert state(db, draft[0])['plan'] == 'DRAFT'


def test_record_failure_rolls_back_plan_confirmation(client, db, draft):
    # Force a failure AFTER the roadmap transition; the whole request rolls back.
    db.execute('''CREATE FUNCTION pg_temp.reject_test_record() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'test record failure'; END $$''')
    db.execute('''CREATE TRIGGER test_reject_record BEFORE INSERT ON dc.counsel_record
      FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_record()''')
    before = state(db, draft[0])
    with pytest.raises(Exception, match='test record failure'):
        complete(client, draft)
    assert state(db, draft[0]) == before


def test_plan_confirmation_permission_is_required(client, db, draft):
    db.execute("DELETE FROM dc.menu_auth WHERE role_code='career' AND menu_code='roadmap.0'")
    db.execute("DELETE FROM dc.auth_user WHERE person_uid=(SELECT intg_uid FROM dc.person WHERE alias='career_kim')")
    before = state(db, draft[0])
    assert complete(client, draft).status_code == 403
    assert state(db, draft[0]) == before
