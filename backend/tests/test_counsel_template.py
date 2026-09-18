from test_api import headers
from test_psych_referrals import db  # noqa: F401
from test_counsel_roadmap_completion import draft, template  # noqa: F401
from uuid import uuid4
import pytest
from app.gates import diagnosis_gate


from counsel_test_support import counsel_form as form


def complete(client, draft, data=None, **changes):
    request_id, plan = draft
    body = dict(expectedVersion=1, expectedRecordVersion=0, template=data or form(),
                summary='ignored client summary', comment='PUBLIC COMMENT',
                expectedRoadmapVersion=plan['roadmapVersion'], expectedRoadmapLockVersion=plan['version'])
    body.update(changes)
    return client.post(f'/api/v1/counsel-requests/{request_id}/complete', headers=headers('career_kim'), json=body)


def test_template_draft_conflict_and_student_privacy(client, db, draft):
    request_id, _ = draft
    path=f'/api/v1/counsel-requests/{request_id}/record'
    body=dict(expectedVersion=0, summary='ignored', comment='PUBLIC COMMENT', status='작성중', template=form())
    before=db.execute("SELECT count(*) AS n FROM dc.student_type_event WHERE source='counsel'").fetchone()['n']
    saved=client.put(path,headers=headers('career_kim'),json=body)
    assert saved.status_code==200, saved.text
    record=saved.json()
    assert record['template']=={**form(),'legacySummary':''}
    assert 'PRIVATE PROGRAM NOTES' in record['summary']
    assert db.execute("SELECT count(*) AS n FROM dc.student_type_event WHERE source='counsel'").fetchone()['n']==before
    assert client.put(path,headers=headers('career_kim'),json=body).status_code==409
    assert complete(client,draft).status_code==409  # form opened before another editor saved
    response=complete(client,draft,expectedRecordVersion=record['version'])
    assert response.status_code==200,response.text
    student=db.execute('SELECT p.alias FROM dc.counsel_request r JOIN dc.person p ON p.intg_uid=r.student_uid WHERE r.id=%s',(request_id,)).fetchone()['alias']
    public=client.get('/api/v1/counsel-records',headers=headers(student)).json()
    shown=next(r for r in public['items'] if r['requestId']==request_id)
    assert shown['summary']=='' and shown['template'] is None and shown['followUp']==''
    assert shown['comment']=='PUBLIC COMMENT'
    assert 'PRIVATE PROGRAM NOTES' not in str(public)
    events=client.get('/api/v1/counsel-events',params={'requestId':request_id},headers=headers(student))
    assert 'PRIVATE PROGRAM NOTES' not in events.text
    assert client.get(f'/api/v1/counsel-requests/{request_id}/record-context',headers=headers(student)).status_code==403
    assert client.put(path,headers=headers(student),json=body).status_code==403


def test_latest_diagnosis_does_not_override_counsel_type(client, db, draft):
    response=complete(client,draft)
    assert response.status_code==200,response.text
    request_id,_=draft
    uid=db.execute('SELECT student_uid FROM dc.counsel_request WHERE id=%s',(request_id,)).fetchone()['student_uid']
    db.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source,decided_at) VALUES (%s,'T4','diagnosis',now()+interval '1 second')",(uid,))
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()['student_type']=='T2'
    assert db.execute('SELECT student_type FROM dc.student_list WHERE intg_uid=%s',(uid,)).fetchone()['student_type']=='T2'
    context=client.get(f'/api/v1/counsel-requests/{request_id}/record-context',headers=headers('career_kim')).json()
    assert context['diagnosisType']=='T4'
    assert context['record']['template']['finalType']=='T2'
    # Downstream gating uses the counseling type, not the more recent diagnosis.
    gate_type,_=diagnosis_gate(db,uid)
    assert gate_type['code']=='T2'
    record=context['record']
    changed=form('T3')
    path=f'/api/v1/counsel-requests/{request_id}/record'
    edit=dict(expectedVersion=record['version'],summary='Notes',comment='Revised public comment',status='완료',template=changed)
    assert client.put(path,headers=headers('career_kim'),json=edit).status_code==409
    edit['template']=form('T2')
    assert client.put(path,headers=headers('career_kim'),json=edit).status_code==200
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()['student_type']=='T2'


def test_general_track_cannot_write_care7_assessment(client,db,draft):
    request_id,_=draft
    db.execute("UPDATE dc.counsel_request SET care_track='general' WHERE id=%s",(request_id,))
    path=f'/api/v1/counsel-requests/{request_id}/record'
    body=dict(expectedVersion=0,summary='Notes',comment='Comment',status='작성중',template=form())
    assert client.put(path,headers=headers('career_kim'),json=body).status_code==422
    body['template']['finalType']=None
    body['template']['qualitative']={}
    response=client.put(path,headers=headers('career_kim'),json=body)
    assert response.status_code==200,response.text


def test_new_care7_counsel_requires_retest_then_updates_type(client,db,draft):
    assert complete(client,draft).status_code==200
    old_id,_=draft
    new_id=str(uuid4())
    db.execute('''INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,care_track,status_code,
      method_code,topic,requested_at,slot_date,slot_start,slot_end,place,intake,snapshot,source_payload)
      SELECT %s,student_uid,counselor_uid,type_code,legacy_type,care_track,'CONFIRMED',method_code,topic,now(),
      slot_date,slot_start,slot_end,place,intake,snapshot,source_payload FROM dc.counsel_request WHERE id=%s''',(new_id,old_id))
    uid=db.execute('SELECT student_uid FROM dc.counsel_request WHERE id=%s',(new_id,)).fetchone()['student_uid']
    db.execute('UPDATE dc.roadmap SET counsel_request_id=%s WHERE student_uid=%s',(new_id,uid))
    body=dict(expectedVersion=1,expectedRecordVersion=0,template=form('T3'),summary='Notes',comment='Public')
    path=f'/api/v1/counsel-requests/{new_id}/complete'
    response=client.post(path,headers=headers('career_kim'),json=body)
    assert response.status_code==409,response.text
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()['student_type']=='T2'
    db.execute("INSERT INTO dc.student_type_event(student_uid,student_type,source,decided_at) VALUES (%s,'T4','diagnosis',clock_timestamp())",(uid,))
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()['student_type']=='T2'
    response=client.post(path,headers=headers('career_kim'),json=body)
    assert response.status_code==200,response.text
    assert db.execute('SELECT student_type FROM dc.current_student_type WHERE student_uid=%s',(uid,)).fetchone()['student_type']=='T3'


@pytest.mark.parametrize('missing',['finalType','program','application','all'])
def test_completion_rejects_missing_selected_content_or_type(client,db,draft,missing):
    value=form()
    if missing=='finalType': value['finalType']=None
    elif missing=='all':
        value['program']['selected']=False
        value['application']['selected']=False
    else: value[missing]['content']='   '
    response=complete(client,draft,value)
    assert response.status_code==422,response.text
    assert db.execute('SELECT status_code FROM dc.counsel_request WHERE id=%s',(draft[0],)).fetchone()['status_code']=='CONFIRMED'


@pytest.mark.parametrize('missing',['motivation','employmentWill','feasibility','communication','selfUnderstanding','comment','template'])
def test_required_assessment_and_comment_on_both_write_routes(client,db,draft,missing):
    value=form()
    if missing in value['qualitative']: del value['qualitative'][missing]
    changes={'comment':'   '} if missing=='comment' else {}
    if missing=='template': changes['template']=None
    assert complete(client,draft,value,**changes).status_code==422
    body=dict(expectedVersion=0,summary='Notes',comment='Public',template=value,status='완료')
    body.update(changes)
    path=f'/api/v1/counsel-requests/{draft[0]}/record'
    assert client.put(path,headers=headers('career_kim'),json=body).status_code==422
    body['status']='작성중'
    assert client.put(path,headers=headers('career_kim'),json=body).status_code==200
