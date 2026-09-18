"""Exercise real DB permissions, revision invalidation and organizational scope."""
from uuid import uuid4

import psycopg
import pytest

from app.db import pool
from test_api import headers, request_body


def test_admin_required_and_structural_codes_protected(client):
    for identity in ('chaewon','career_kim','cse-1'):
        assert client.get('/api/v1/system/code-groups',headers=headers(identity)).status_code==403
    body=dict(expectedVersion=1,label='Changed',sortOrder=0,isActive=True,payload={},reason='test')
    assert client.put('/api/v1/system/code-groups/COUNSEL_STATUS/items/REQ',headers=headers('system-admin'),json=body).status_code==403
    assert client.put('/api/v1/system/code-groups/STUDENT_TYPE/items/T7',headers=headers('system-admin'),json={**body,'expectedVersion':0}).status_code==422


def test_label_change_history_cache_and_stale_write(client):
    head=headers('system-admin')
    path='/api/v1/system/code-groups/STUDENT_TYPE/items'
    before=client.get(path,headers=head).json()['items'][0]
    metadata_before=client.get('/api/v1/metadata',headers=headers('chaewon')).json()
    body=dict(expectedVersion=before['version'],label='검증용 유형 명칭',sortOrder=before['sort_order'],isActive=True,payload=before['payload'],reason='DB label integration test')
    response=client.put(path+'/'+before['code'],headers=head,json=body)
    assert response.status_code==200,response.text
    assert client.put(path+'/'+before['code'],headers=head,json=body).status_code==409
    result=client.get('/api/v1/metadata',headers=headers('chaewon')).json()
    assert result['revision']>metadata_before['revision']
    assert next(x for x in result['items'] if x['group_code']=='STUDENT_TYPE' and x['code']==before['code'])['label']==body['label']
    history=client.get(path+'/'+before['code']+'/events',headers=head).json()
    assert history['totalCount']==1 and history['items'][0]['before']['label']==before['label']
    with pool.connection() as conn:
        assert conn.execute('SELECT label FROM dc.student_type_code WHERE code=%s',(before['code'],)).fetchone()['label']==body['label']
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('SET LOCAL ROLE dc_app')
            conn.execute('DELETE FROM dc.code_item_event')
    with pytest.raises(psycopg.Error):
        with pool.connection() as conn:
            conn.execute('SET LOCAL ROLE dc_app')
            conn.execute('CREATE TABLE dc.unauthorized_ddl(id integer)')


def test_operational_topic_create_deactivate_and_validation(client):
    path='/api/v1/system/code-groups/COUNSEL_TOPIC/items/TEST_TOPIC'
    body=dict(expectedVersion=0,label='추가 상담 주제',sortOrder=999,isActive=True,payload={'type':'T1','goal':'검증'},reason='test')
    response=client.put(path,headers=headers('system-admin'),json=body)
    assert response.status_code==200,response.text
    body.update(expectedVersion=1,isActive=False)
    assert client.put(path,headers=headers('system-admin'),json=body).status_code==200
    assert client.get(path+'/events',headers=headers('system-admin')).json()['totalCount']==2
    body.update(expectedVersion=2,payload={'type':'T7'})
    assert client.put(path,headers=headers('system-admin'),json=body).status_code==422


def test_assignment_changes_scope_and_overlap_is_rejected(client):
    head=headers('system-admin')
    staff=next(x for x in client.get('/api/v1/system/staff?pageSize=100',headers=head).json()['items'] if x['role_code']=='assistant')
    with pool.connection() as conn:
        student=conn.execute('SELECT * FROM dc.student WHERE college_code IS NOT NULL LIMIT 1').fetchone()
    key=str(uuid4())
    body=dict(expectedVersion=0,staffUid=staff['intg_uid'],collegeCode=student['college_code'],deptCode=student['dept_code'],roleCode='assistant',validFrom='2020-01-01',validTo=None,isActive=True,reason='integration scope test')
    path='/api/v1/system/org-assignments/'+key
    response=client.put(path,headers=head,json=body)
    assert response.status_code==200,response.text
    roster=client.get('/api/v1/students',headers=headers(staff['intg_uid'])).json()
    assert student['student_no'] in {x['studentNo'] for x in roster['items']}
    assert client.put('/api/v1/system/org-assignments/'+str(uuid4()),headers=head,json=body).status_code==409
    assert client.put(path,headers=head,json={**body,'expectedVersion':1,'validTo':'2021-01-01'}).status_code==200
    roster=client.get('/api/v1/students',headers=headers(staff['intg_uid'])).json()
    assert student['student_no'] not in {x['studentNo'] for x in roster['items']}
    assert client.put('/api/v1/system/org-assignments/'+str(uuid4()),headers=head,json={**body,'deptCode':'DOES_NOT_EXIST'}).status_code==422


def test_menu_change_does_not_grant_api_access(client):
    head=headers('system-admin')
    rows=client.get('/api/v1/system/menus',headers=head).json()
    row=next(x for x in rows if x['menu_code']=='home')
    body=dict(expectedVersion=row['version'],label='메뉴 변경 검증',sortOrder=row['sort_order'],isActive=False,reason='menu test')
    assert client.put('/api/v1/system/menus/home',headers=head,json=body).status_code==200
    menus=client.get('/api/v1/metadata',headers=headers('career_kim')).json()['menus']
    assert next(x for x in menus if x['menu_code']=='home')['is_active'] is False
    assert client.get('/api/v1/system/menus',headers=headers('career_kim')).status_code==403
    system=next(x for x in rows if x['menu_code']=='system')
    assert client.put('/api/v1/system/menus/system',headers=head,json={**body,'expectedVersion':system['version']}).status_code==422


def test_request_uses_topic_fk_and_keeps_original_label(client):
    head={**headers('chaewon'),'Idempotency-Key':str(uuid4())}
    invalid=client.post('/api/v1/counsel-requests',headers=head,json={**request_body(4),'topicCode':'TEST_TOPIC'})
    assert invalid.status_code==422
    response=client.post('/api/v1/counsel-requests',headers=head,json={**request_body(4),'topicCode':'A01'})
    assert response.status_code==201,response.text
    row=response.json()
    with pool.connection() as conn:
        stored=conn.execute('SELECT topic_code,snapshot FROM dc.counsel_request WHERE id=%s',(row['id'],)).fetchone()
        assert stored['topic_code']=='A01' and stored['snapshot']['topicLabel']
        original=stored['snapshot']['topicLabel']
    items=client.get('/api/v1/system/code-groups/COUNSEL_TOPIC/items?pageSize=100',headers=headers('system-admin')).json()['items']
    topic=next(x for x in items if x['code']=='A01')
    change=dict(expectedVersion=topic['version'],label='변경된 주제 명칭',sortOrder=topic['sort_order'],isActive=True,payload=topic['payload'],reason='snapshot test')
    assert client.put('/api/v1/system/code-groups/COUNSEL_TOPIC/items/A01',headers=headers('system-admin'),json=change).status_code==200
    with pool.connection() as conn:
        assert conn.execute('SELECT snapshot FROM dc.counsel_request WHERE id=%s',(row['id'],)).fetchone()['snapshot']['topicLabel']==original


def test_role_menu_visibility_is_replaced_per_role(client):
    head=headers('system-admin')
    roles={r['role_code']:r for r in client.get('/api/v1/system/auth-roles',headers=head).json()}
    assert {'student','professor','company','external'}<=set(roles) and 'AUTH0006' not in roles
    assert roles['company']['portal'] is None and roles['student']['portal']=='student'
    assert client.get('/api/v1/system/auth-roles',headers=headers('career_kim')).status_code==403
    menus={m['menu_code']:m for m in client.get('/api/v1/system/menus',headers=head).json()}
    professor=sorted(code for code,m in menus.items() if 'professor' in m['roles'])
    assert 'jobs' not in professor
    path='/api/v1/system/auth-roles/professor/menus'
    body=dict(expectedVersion=roles['professor']['version'],menuCodes=professor+['jobs','jobs.0'],reason='menu grant test')
    assert client.put(path,headers=head,json={**body,'menuCodes':professor+['jobs.0']}).status_code==422
    assert client.put(path,headers=head,json={**body,'menuCodes':professor+['stu-jobs']}).status_code==422
    assert client.put('/api/v1/system/auth-roles/company/menus',headers=head,json={**body,'expectedVersion':roles['company']['version'],'menuCodes':[]}).status_code==422
    assert client.put('/api/v1/system/auth-roles/AUTH0006/menus',headers=head,json=body).status_code==404
    response=client.put(path,headers=head,json=body)
    assert response.status_code==200,response.text
    assert client.put(path,headers=head,json=body).status_code==409
    visible={m['menu_code'] for m in client.get('/api/v1/metadata',headers=headers('cse-1')).json()['menus']}
    assert {'jobs','jobs.0'}<=visible and 'jobs.1' not in visible
    body.update(expectedVersion=response.json()['version'],menuCodes=professor)
    assert client.put(path,headers=head,json=body).status_code==200
    visible={m['menu_code'] for m in client.get('/api/v1/metadata',headers=headers('cse-1')).json()['menus']}
    assert 'jobs' not in visible and 'prof-advisees' in visible
    events=client.get('/api/v1/system/events',headers=head).json()['items']
    assert events[0]['entity']=='menu_auth' and events[0]['entity_id']=='professor' and 'jobs' in events[1]['after_value']['menuCodes']


def test_student_metadata_follows_student_role_menus(client):
    head=headers('system-admin')
    student=next(r for r in client.get('/api/v1/system/auth-roles',headers=head).json() if r['role_code']=='student')
    visible={m['menu_code'] for m in client.get('/api/v1/metadata',headers=headers('chaewon')).json()['menus']}
    assert {'stu-lounge','stu-jobs.3.0','stu-mypage.3'}<=visible and 'counsel' not in visible
    granted=[m['menu_code'] for m in client.get('/api/v1/system/menus',headers=head).json() if 'student' in m['roles'] and m['menu_code']!='stu-jobs.4']
    body=dict(expectedVersion=student['version'],menuCodes=granted,reason='hide notices for students')
    assert client.put('/api/v1/system/auth-roles/student/menus',headers=head,json=body).status_code==200
    visible={m['menu_code'] for m in client.get('/api/v1/metadata',headers=headers('chaewon')).json()['menus']}
    assert 'stu-jobs.4' not in visible and 'stu-jobs.3' in visible
    assert not {m['menu_code'] for m in client.get('/api/v1/metadata',headers=headers('career_kim')).json()['menus']}&{'stu-lounge'}
