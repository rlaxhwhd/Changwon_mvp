"""심리상담 상담일지 양식([붙임 14]) — 저장·완료·학생 비공개·진로취업과의 경계(145)."""
from uuid import uuid4

import pytest

from test_api import headers
from test_psych_referrals import db  # noqa: F401
from app.db import connection
from app.main import app


def journal(**changes):
    data = dict(schemaVersion=1, session=3, conductedAt='2026-10-26T14:00', method='전화', methodOther='',
                remoteReason='학생이 지방 실습 중', content='PRIVATE PSYCH NOTES', crisis='없음', remarks='', nextAt='2026-11-02T14:00')
    data.update(changes)
    return data


@pytest.fixture
def psych_request(client, db):
    request_id = 'psych_journal_' + uuid4().hex
    db.execute('''INSERT INTO dc.counsel_request
      (id,student_uid,counselor_uid,type_code,legacy_type,care_track,status_code,method_code,topic,requested_at,snapshot,source_payload)
      SELECT %s,s.intg_uid,c.intg_uid,'PSY','심리',NULL,'CONFIRMED','OFFLINE','상담일지 양식',now(),'{}','{}'
      FROM dc.person s, dc.person c WHERE s.alias='jiwoo' AND c.alias='psych_lee' ''', (request_id,))
    def isolated_request():
        with db.transaction():
            yield db
    app.dependency_overrides[connection] = isolated_request
    return request_id


def test_psych_journal_saves_completes_and_stays_private(client, db, psych_request):
    path = f'/api/v1/counsel-requests/{psych_request}/record'
    body = dict(expectedVersion=0, summary='ignored', comment='PUBLIC COMMENT', status='작성중', psychJournal=journal(methodOther='남은 글'))
    saved = client.put(path, headers=headers('psych_lee'), json=body)
    assert saved.status_code == 200, saved.text
    record = saved.json()
    assert record['psychJournal'] == journal() and record['summary'] == 'PRIVATE PSYCH NOTES'

    missing = client.post(f'/api/v1/counsel-requests/{psych_request}/complete', headers=headers('psych_lee'),
                          json=dict(expectedVersion=1, summary='x', comment='PUBLIC COMMENT', psychJournal=journal(remoteReason='')))
    assert missing.status_code == 422 and '비대면 진행사유' in missing.text
    done = client.post(f'/api/v1/counsel-requests/{psych_request}/complete', headers=headers('psych_lee'),
                       json=dict(expectedVersion=1, summary='x', comment='PUBLIC COMMENT', psychJournal=journal(method='대면', remoteReason='지울 사유')))
    assert done.status_code == 200, done.text
    stored = db.execute('SELECT summary,psych_journal FROM dc.counsel_record WHERE request_id=%s', (psych_request,)).fetchone()
    assert stored['summary'] == 'PRIVATE PSYCH NOTES' and stored['psych_journal']['remoteReason'] == ''

    # 저장된 양식이 있으면 양식 없이 덮어쓸 수 없다.
    version = record['version'] + 1
    bare = dict(expectedVersion=version, summary='plain', comment='PUBLIC COMMENT', status='완료')
    assert client.put(path, headers=headers('psych_lee'), json=bare).status_code == 422

    public = client.get('/api/v1/counsel-records', headers=headers('jiwoo')).json()
    shown = next(r for r in public['items'] if r['requestId'] == psych_request)
    assert shown['psychJournal'] is None and shown['summary'] == '' and shown['comment'] == 'PUBLIC COMMENT'
    assert 'PRIVATE PSYCH NOTES' not in str(public)


def test_psych_completion_requires_form_and_career_cannot_use_it(client, db, psych_request):
    response = client.post(f'/api/v1/counsel-requests/{psych_request}/complete', headers=headers('psych_lee'),
                           json=dict(expectedVersion=1, summary='plain text only', comment='PUBLIC COMMENT'))
    assert response.status_code == 422 and '상담일지 양식' in response.text
    db.execute("UPDATE dc.counsel_request SET type_code='CAREER',legacy_type='진로취업',care_track='general',counselor_uid=(SELECT intg_uid FROM dc.person WHERE alias='career_kim') WHERE id=%s", (psych_request,))
    path = f'/api/v1/counsel-requests/{psych_request}/record'
    body = dict(expectedVersion=0, summary='x', comment='c', status='작성중', psychJournal=journal())
    assert client.put(path, headers=headers('career_kim'), json=body).status_code == 422
