from datetime import date, timedelta
from uuid import uuid4

from app.db import pool
from test_api import headers


def test_factor_identity_survives_label_edit(client):
    head=headers('chaewon')
    result=client.get('/api/v1/diagnosis/students/chaewon',headers=head).json()
    factors=next(r['factors'] for r in result['results'] if r['testId']=='c3')
    assert all(f.get('factorCode') and f.get('definitionVersion') for f in factors)
    with pool.connection() as conn:
        old=conn.execute("SELECT label FROM dc.code_item WHERE group_code='DIAGNOSIS_FACTOR' AND code='C3_DIRECTION'").fetchone()['label']
        conn.execute("UPDATE dc.code_item SET label='변경된 표시명' WHERE group_code='DIAGNOSIS_FACTOR' AND code='C3_DIRECTION'")
    try:
        after=client.get('/api/v1/diagnosis/students/chaewon',headers=head).json()
        assert next(r['factors'] for r in after['results'] if r['testId']=='c3')==factors
        assert factors[0]['factorCode']=='DIRECTION'
    finally:
        with pool.connection() as conn:
            conn.execute("UPDATE dc.code_item SET label=%s WHERE group_code='DIAGNOSIS_FACTOR' AND code='C3_DIRECTION'",(old,))


def test_schedule_owner_overlap_and_version(client):
    path='/api/v1/counsel-schedules/career_park'
    head=headers('career_park')
    before=client.get(path,headers=head).json()
    body={'expectedVersion':before['version'],'slots':[{'id':'x','weekday':1,'start':'10:00','end':'12:00'}]}
    assert client.put(path+'/excluded',headers=headers('chaewon'),json=body).status_code==403
    assert client.put(path+'/excluded',headers=headers('career_kim'),json=body).status_code==404
    result=client.put(path+'/excluded',headers=head,json=body)
    assert result.status_code==200,result.text
    assert client.put(path+'/excluded',headers=head,json=body).status_code==409
    body['expectedVersion']=result.json()['version']
    body['slots'].append({'id':'y','weekday':1,'start':'11:00','end':'13:00'})
    assert client.put(path+'/excluded',headers=head,json=body).status_code==422
    body['slots']=before['excluded']
    assert client.put(path+'/excluded',headers=head,json=body).status_code==200


def test_group_member_scope_capacity_completion(client):
    head=headers('career_kim')
    body=dict(title='검증 회차',topic='검증',date=str(date.today()+timedelta(days=7)),start='10:00',end='11:00',place='상담실',capacity=1)
    assert client.post('/api/v1/group-counsels',headers=headers('chaewon'),json=body).status_code==403
    result=client.post('/api/v1/group-counsels',headers=head,json=body)
    assert result.status_code==201,result.text
    group=result.json(); path='/api/v1/group-counsels/'+group['id']
    add={'expectedVersion':group['version'],'studentId':'chaewon'}
    assert client.post(path+'/add-member',headers=headers('career_park'),json=add).status_code==404
    saved=client.post(path+'/add-member',headers=head,json=add)
    assert saved.status_code==200,saved.text
    group=saved.json()
    assert group['members'][0]['studentNo']=='20211304'
    assert client.post(path+'/add-member',headers=head,json={**add,'expectedVersion':group['version'],'studentId':'jiwoo'}).status_code==409
    done=client.post(path+'/complete',headers=head,json=dict(expectedVersion=group['version'],attendedIds=['chaewon'],summary='완료 요약',comment='공개 코멘트'))
    assert done.status_code==200,done.text
    assert done.json()['members'][0]['attended'] is True
    assert client.post(path+'/cancel',headers=head,json=dict(expectedVersion=done.json()['version'],reason='종료 후 취소')).status_code==409


def test_notice_authorization_and_notification_ownership(client):
    notice='test-'+str(uuid4())
    body=dict(category='SYSTEM',title='테스트 공지',summary='안내',body=['첫 문단'],postedAt=str(date.today()))
    path='/api/v1/notices/'+notice
    assert client.put(path,headers=headers('career_kim'),json=body).status_code==403
    response=client.put(path,headers=headers('system-admin'),json=body)
    assert response.status_code==200,response.text
    assert client.put(path,headers=headers('system-admin'),json=body).status_code==409
    assert client.get('/api/v1/notices',headers=headers('chaewon')).json()['totalCount']>=1
    with pool.connection() as conn:
        uid=conn.execute("SELECT intg_uid FROM dc.person WHERE alias='chaewon'").fetchone()['intg_uid']
        row=conn.execute("INSERT INTO dc.notification(recipient_uid,source_kind,source_id,tone,title,route) VALUES(%s,'test',%s,'counsel','=CSV formula','/counsel/record') RETURNING id",(uid,str(uuid4()))).fetchone()
    read='/api/v1/notifications/'+str(row['id'])+'/read'
    assert client.post(read,headers=headers('jiwoo')).status_code==404
    first=client.post(read,headers=headers('chaewon'))
    assert first.status_code==200
    assert client.post(read,headers=headers('chaewon')).json()==first.json()
    exported=client.get('/api/v1/notifications/export.csv',headers=headers('chaewon'))
    assert exported.status_code==200 and "'=CSV formula" in exported.text


def test_counsel_event_dto_never_exposes_record_payload(client):
    result=client.get('/api/v1/counsel-events',headers=headers('chaewon'))
    assert result.status_code==200,result.text
    for item in result.json()['items']:
        assert item['studentId']=='chaewon'
        assert not {'payload','summary','comment','reason','intake','finalType'} & item.keys()
