from uuid import uuid4

from app.company_members import password_matches
from app.db import pool
from test_api import headers


def registration():
    return dict(businessNo=str(uuid4().int % 10**10).zfill(10),password='Member-test-2026!',
                companyName='Membership '+uuid4().hex,contactName='Applicant',
                contactEmail='test@example.com',contactPhone='010-1234-5678')


def test_registration_approval_and_session(client):
    body=registration()
    response=client.post('/api/v1/auth/company/register',json=body)
    assert response.status_code==201,response.text
    assert response.json()['status']=='PENDING'
    assert client.post('/api/v1/auth/company/register',json=body).status_code==409
    credentials={key:body[key] for key in ('businessNo','password')}
    assert client.post('/api/v1/auth/company/login',json=credentials).status_code==403
    assert client.post('/api/v1/auth/company/login',json={**credentials,'password':'wrong'}).status_code==401
    head=headers('system-admin')
    response=client.get('/api/v1/system/company-members',params={'q':body['businessNo']},headers=head)
    assert response.status_code==200,response.text
    member=response.json()['items'][0]
    assert 'password' not in response.text
    review=dict(expectedVersion=member['version'],decision='APPROVED',note='verified')
    path=f"/api/v1/system/company-members/{member['id']}/review"
    assert client.post(path,json=review,headers=headers('career_kim')).status_code==403
    approved=client.post(path,json=review,headers=head)
    assert approved.status_code==200,approved.text
    assert approved.json()['company_id']
    assert client.post(path,json=review,headers=head).status_code==409
    with pool.connection() as conn:
        stored=conn.execute('SELECT password_hash FROM dc.company_member WHERE id=%s',(member['id'],)).fetchone()['password_hash']
        assert body['password'] not in stored and password_matches(body['password'],stored)
        event=conn.execute("SELECT after_value FROM dc.admin_event WHERE entity='company_member' AND entity_id=%s",(member['id'],)).fetchone()
        assert 'password_hash' not in event['after_value']
    login=client.post('/api/v1/auth/company/login',json=credentials)
    assert login.status_code==200,login.text
    cookie=login.headers['set-cookie'].lower()
    assert 'httponly' in cookie and 'samesite=strict' in cookie
    assert 'password' not in login.text
    assert client.get('/api/v1/auth/company/me').json()['id']==member['id']
    assert client.get('/api/v1/system/company-members').status_code==401
    assert client.post('/api/v1/auth/company/logout',headers={'Sec-Fetch-Site':'cross-site'}).status_code==403
    assert client.post('/api/v1/auth/company/logout').status_code==204
    assert client.get('/api/v1/auth/company/me').status_code==401


def test_rejection_validation_and_rate_limit(client):
    body=registration()
    invalid=client.post('/api/v1/auth/company/register',json={**body,'password':'tinyPw1'})
    assert invalid.status_code==422 and 'tinyPw1' not in invalid.text
    assert all('input' not in error for error in invalid.json()['detail'])
    assert client.post('/api/v1/auth/company/register',json={**body,'businessNo':'invalid'}).status_code==422
    assert client.post('/api/v1/auth/company/register',json=body).status_code==201
    head=headers('system-admin')
    member=client.get('/api/v1/system/company-members',params={'q':body['businessNo']},headers=head).json()['items'][0]
    path=f"/api/v1/system/company-members/{member['id']}/review"
    review=dict(expectedVersion=1,decision='REJECTED',note='')
    assert client.post(path,json=review,headers=head).status_code==422
    assert client.post(path,json={**review,'note':'Business information needs review'},headers=head).status_code==200
    assert client.post('/api/v1/auth/company/login',json={k:body[k] for k in ('businessNo','password')}).status_code==403
    # Failed requests must still count; isolate the final throttle state from other tests.
    with pool.connection() as conn:
        conn.execute('DELETE FROM dc.company_auth_rate')
    for _ in range(30):
        response=client.post('/api/v1/auth/company/login',json={'businessNo':'0000000000','password':'wrong'})
        assert response.status_code==401
    assert client.post('/api/v1/auth/company/login',json={'businessNo':'0000000000','password':'wrong'}).status_code==429
    with pool.connection() as conn:
        conn.execute('DELETE FROM dc.company_auth_rate')
