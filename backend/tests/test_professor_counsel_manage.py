from uuid import uuid4

import pytest
from psycopg.errors import InsufficientPrivilege, RaiseException

from app import files
from security_fixtures import pdf_bytes
from test_api import headers
from test_psych_referrals import db  # noqa: F401


@pytest.fixture
def scope(db):
    db.execute('''INSERT INTO dc.fixture_student_scope(staff_uid,student_uid,source)
      SELECT p.intg_uid,s.intg_uid,'test:professor-manage' FROM dc.person p CROSS JOIN dc.person s
      WHERE p.alias='cse-1' AND s.alias='chaewon' ON CONFLICT DO NOTHING''')


def create(client, **changes):
    body=dict(studentId='chaewon',categoryCode='MAJOR_STUDY',method='대면',date='2026-10-20',
              title='Report lookup unique',summary='Private report',start='14:00',end='14:30',place='Office',fileIds=[])
    body.update(changes)
    response=client.post('/api/v1/counsel-records/professor',headers={**headers('cse-1'),'Idempotency-Key':str(uuid4())},json=body)
    assert response.status_code==201,response.text
    detail=client.get('/api/v1/professor-counsel/'+response.json()['requestId'],headers=headers('cse-1'))
    assert detail.status_code==200,detail.text
    return detail.json()


def write_body(row, **changes):
    body={key:row[key] for key in ('studentId','categoryCode','title','summary','place')}
    body.update(date=row['date'],start=row['start'] or None,end=row['end'] or None,
                method='비대면' if row['channel']=='online' else '대면',
                expectedRequestVersion=row['requestVersion'],expectedRecordVersion=row['recordVersion'],
                fileIds=[f['id'] for f in row['attachments']])
    body.update(changes)
    return body


def test_professor_lists_filters_stats_and_public_answer(client,db,scope):
    row=create(client)
    online=create(client,method='비대면',summary='Public answer unique')
    endpoint='/api/v1/professor-counsel'
    for channel,expected in (('offline',row),('online',online)):
        result=client.get(endpoint,headers=headers('cse-1'),params=dict(channel=channel,q='Report lookup unique',searchBy='title',pageSize=1,dateFrom='2026-10-20',dateTo='2026-10-20',status='완료'))
        assert result.status_code==200,result.text
        assert result.json()['items'][0]['id']==expected['id']
        assert len(result.json()['items'])==1
    absent=client.get(endpoint,headers=headers('cse-1'),params=dict(channel='offline',q='no-such-unique-student')).json()
    assert absent['totalCount']==0
    assert client.get(endpoint,headers=headers('cse-1'),params=dict(channel='offline',dateFrom='2026-11-01',dateTo='2026-10-01')).status_code==422
    stats=client.get(endpoint+'/stats',headers=headers('cse-1'),params=dict(dateFrom='2026-10-20',dateTo='2026-10-20'))
    assert stats.status_code==200,stats.text
    assert stats.json()['total']>=2
    public=client.get('/api/v1/counsel-records',headers=headers('chaewon'),params=dict(studentId='chaewon',pageSize=100)).json()['items']
    assert next(r for r in public if r['requestId']==online['id'])['comment']=='Public answer unique'
    assert next(r for r in public if r['requestId']==online['id'])['summary']==''
    assert next(r for r in public if r['requestId']==row['id'])['comment']==''


def test_professor_edit_versions_ownership_and_student_access(client,db,scope):
    row=create(client,method='비대면')
    path='/api/v1/professor-counsel/'+row['id']
    payload=write_body(row,summary='Updated public answer',title='Updated title')
    assert client.get(path,headers=headers('acc-1')).status_code==404
    assert client.put(path,headers=headers('acc-1'),json=payload).status_code==404
    saved=client.put(path,headers=headers('cse-1'),json=payload)
    assert saved.status_code==200,saved.text
    assert saved.json()['summary']=='Updated public answer'
    assert saved.json()['publicComment']=='Updated public answer'
    assert saved.json()['recordVersion']>row['recordVersion']
    assert client.put(path,headers=headers('cse-1'),json=payload).status_code==409
    assert client.get('/api/v1/professor-counsel/students/chaewon',headers=headers('cse-1')).status_code==200
    assert client.get('/api/v1/professor-counsel?channel=offline',headers=headers('asst_kim')).status_code==403
    assert client.get(path,headers=headers('chaewon')).status_code==403


def test_professor_completes_existing_confirmed_request(client,db,scope):
    row=create(client)
    db.execute('DELETE FROM dc.counsel_record WHERE request_id=%s',(row['id'],))
    db.execute("UPDATE dc.counsel_request SET status_code='CONFIRMED',completed_at=NULL WHERE id=%s",(row['id'],))
    row=client.get('/api/v1/professor-counsel/'+row['id'],headers=headers('cse-1')).json()
    saved=client.put('/api/v1/professor-counsel/'+row['id'],headers=headers('cse-1'),json=write_body(row,summary='Complete report'))
    assert saved.status_code==200,saved.text
    assert saved.json()['status']=='완료'
    assert db.execute('SELECT count(*) n FROM dc.counsel_record WHERE request_id=%s',(row['id'],)).fetchone()['n']==1


def test_professor_attachments_and_permanent_delete_as_app_role(client,db,scope):
    # Exercise actual API privileges rather than relying on test-owner DELETE rights.
    db.execute('SET LOCAL ROLE dc_app')
    upload=client.post('/api/v1/professor-counsel-files?name=report.pdf',headers={**headers('cse-1'),'Content-Type':'application/octet-stream'},content=pdf_bytes())
    assert upload.status_code==201,upload.text
    file_id=upload.json()['id']
    try:
        row=create(client,fileIds=[file_id])
        path='/api/v1/professor-counsel/'+row['id']
        assert row['attachments'][0]['id']==file_id
        assert client.get('/api/v1/professor-counsel-files/'+file_id,headers=headers('cse-1')).status_code==200
        assert client.get('/api/v1/professor-counsel-files/'+file_id,headers=headers('acc-1')).status_code==404
        assert client.delete(path,headers=headers('acc-1'),params=dict(expectedVersion=row['requestVersion'])).status_code==404
        # Read-receipt cleanup and notification history are part of permanent deletion.
        db.execute('''INSERT INTO dc.notification_read(notification_id)
          SELECT n.id FROM dc.notification n JOIN dc.counsel_event e ON n.source_id=e.id::text
          WHERE e.request_id=%s AND n.source_kind='counsel' ON CONFLICT DO NOTHING''',(row['id'],))
        with db.transaction():
            with pytest.raises(InsufficientPrivilege):
                with db.transaction(): db.execute('DELETE FROM dc.counsel_event WHERE request_id=%s',(row['id'],))
        response=client.delete(path,headers=headers('cse-1'),params=dict(expectedVersion=row['requestVersion']))
        assert response.status_code==204,response.text
        assert client.get(path,headers=headers('cse-1')).status_code==404
        assert not db.execute('SELECT 1 FROM dc.counsel_record WHERE request_id=%s',(row['id'],)).fetchone()
        assert not db.execute('SELECT 1 FROM dc.counsel_event WHERE request_id=%s',(row['id'],)).fetchone()
        assert not db.execute('SELECT 1 FROM dc.file_object WHERE id=%s',(file_id,)).fetchone()
        assert not files.location(file_id).exists()
    finally:
        files.location(file_id).unlink(missing_ok=True)


def test_other_counsel_histories_stay_immutable(client,db):
    response=client.post('/api/v1/counsel-records/psych',headers={**headers('psych_lee'),'Idempotency-Key':str(uuid4())},
      json=dict(studentId='chaewon',topic='Private psych report',method='대면',date='2026-10-20',summary='Private'))
    assert response.status_code==201,response.text
    row=db.execute("SELECT e.id FROM dc.counsel_event e JOIN dc.counsel_request r ON r.id=e.request_id WHERE r.legacy_type<>'교수' LIMIT 1").fetchone()
    assert row
    with pytest.raises(RaiseException):
        with db.transaction(): db.execute('DELETE FROM dc.counsel_event WHERE id=%s',(row['id'],))


def test_professor_menu_order(client):
    response=client.get('/api/v1/metadata',headers=headers('cse-1'))
    assert response.status_code==200
    menus=response.json()['menus']
    children=sorted((m for m in menus if m['parent_code']=='prof-counsel' and m['is_active']),key=lambda m:m['sort_order'])
    assert [m['label'] for m in children]==['신청접수','오프라인 상담현황','온라인 상담현황','상담실적','상담 설정']
    assert not any(m['menu_code']=='prof-setup' and m['is_active'] for m in menus)
