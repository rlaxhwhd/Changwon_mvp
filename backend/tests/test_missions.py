from datetime import timedelta
from uuid import uuid4

import pytest
from app.missions import monday
from app.db import pool
from test_api import headers

ADMIN = 'system-admin'

def question(client, kind='TOEIC'):
    body = dict(expectedVersion=0,kind=kind,prompt='성취하다' if kind=='TOEIC' else '2 + 3 = ?',
                word='accomplish' if kind=='TOEIC' else '', aliases=['achieve'] if kind=='TOEIC' else [],
                choices=[] if kind=='TOEIC' else ['4','5','6'],answer=0 if kind=='TOEIC' else 1,
                category='TEST-'+uuid4().hex,explanation='검증용 해설')
    r=client.put('/api/v1/system/missions/questions/0',headers=headers(ADMIN),json=body)
    assert r.status_code==200,r.text
    return r.json(),body

def publish(client, items, kind='TOEIC', published=True, start=None):
    path=f'/api/v1/system/missions/weeks/{start or monday()}/{kind}'
    before=client.get(path,headers=headers(ADMIN)).json()
    body=dict(expectedVersion=before['version'] if before else 0,title='통합 테스트 미션',questionIds=[i['id'] for i in items],published=published)
    r=client.put(path,headers=headers(ADMIN),json=body)
    assert r.status_code==200,r.text
    return r.json(),path,body

def start(client, week, who='chaewon'):
    r=client.post('/api/v1/missions/attempts',headers=headers(who),json={'weekId':week['id'],'version':week['version']})
    assert r.status_code==200,r.text
    return r.json()

def test_permissions(client):
    assert client.get('/api/v1/missions/current').status_code==401
    assert client.get('/api/v1/missions/current',headers=headers(ADMIN)).status_code==403
    for identity in ('chaewon','career_kim'):
        assert client.get('/api/v1/system/missions/questions?kind=TOEIC',headers=headers(identity)).status_code==403
        assert client.put('/api/v1/system/missions/questions/0',headers=headers(identity),json={'kind':'TOEIC','expectedVersion':0,'prompt':'뜻','word':'word'}).status_code==403

def test_publication_and_version_conflicts(client):
    item,_=question(client)
    week,path,body=publish(client,[item],published=False)
    visible=client.get('/api/v1/missions/current',headers=headers('chaewon')).json()['items']
    assert not any(w['id']==week['id'] for w in visible)
    assert client.post('/api/v1/missions/attempts',headers=headers('chaewon'),json={'weekId':week['id'],'version':week['version']}).status_code==409
    assert client.put(path,headers=headers(ADMIN),json=body).status_code==409
    week,_,_=publish(client,[item])
    assert any(w['id']==week['id'] for w in client.get('/api/v1/missions/current',headers=headers('chaewon')).json()['items'])
    future,_,_=publish(client,[item],start=monday()+timedelta(days=7))
    assert client.post('/api/v1/missions/attempts',headers=headers('chaewon'),json={'weekId':future['id'],'version':future['version']}).status_code==409

@pytest.mark.parametrize('kind',['TOEIC','NCS','GSAT'])
def test_scoring_private_history_and_snapshot(client,kind):
    item,body=question(client,kind)
    week,_,_=publish(client,[item],kind='TOEIC' if kind=='TOEIC' else 'NCS_GSAT')
    attempt=start(client,week)
    assert start(client,week)['id']==attempt['id']
    assert 'content' not in attempt['questions'][0] and 'answer' not in attempt['questions'][0]
    visible=client.get('/api/v1/missions/current',headers=headers('chaewon')).json()
    if kind!='TOEIC':
        public=next(w for w in visible['items'] if w['id']==week['id'])['questions'][0]
        assert 'explanation' not in public and 'answer' not in public
    # Editing the bank and publication cannot change a started attempt.
    changed={**body,'expectedVersion':1,'word':'different' if kind=='TOEIC' else '', 'answer':0}
    edited=client.put(f"/api/v1/system/missions/questions/{item['id']}",headers=headers(ADMIN),json=changed)
    assert edited.status_code==200,edited.text
    publish(client,[edited.json()],kind='TOEIC' if kind=='TOEIC' else 'NCS_GSAT')
    payload={'answers':{str(item['id']):'  AcCoMpLiSh  ' if kind=='TOEIC' else 1}}
    path=f"/api/v1/missions/attempts/{attempt['id']}/submit"
    assert client.post(path,headers=headers('changwon'),json=payload).status_code==404
    assert client.post(path,headers=headers('chaewon'),json={'answers':{}}).status_code==422
    result=client.post(path,headers=headers('chaewon'),json=payload)
    assert result.status_code==200,result.text
    assert result.json()['correctCount']==1
    assert client.post(path,headers=headers('chaewon'),json=payload).json()==result.json()
    assert client.post(path,headers=headers('chaewon'),json={'answers':{str(item['id']):'wrong' if kind=='TOEIC' else 0}}).status_code==409
    mine=client.get('/api/v1/missions/history',headers=headers('chaewon')).json()['items']
    others=client.get('/api/v1/missions/history',headers=headers('changwon')).json()['items']
    assert any(x['id']==attempt['id'] for x in mine)
    assert not any(x['id']==attempt['id'] for x in others)
    with pool.connection() as conn:
        assert conn.execute('SELECT count(*) n FROM dc.mission_attempt WHERE id=%s AND submitted_at IS NOT NULL',(attempt['id'],)).fetchone()['n']==1

def test_invalid_questions_and_selection(client):
    base=dict(expectedVersion=0,kind='NCS',prompt='문제',choices=['동일','동일'],answer=0)
    assert client.put('/api/v1/system/missions/questions/0',headers=headers(ADMIN),json=base).status_code==422
    item,body=question(client)
    assert client.put(f"/api/v1/system/missions/questions/{item['id']}",headers=headers(ADMIN),json=body).status_code==409
    week,path,payload=publish(client,[item],published=False)
    for ids in ([item['id'],item['id']], [999999999]):
        assert client.put(path,headers=headers(ADMIN),json={**payload,'expectedVersion':week['version'],'questionIds':ids}).status_code==422
    inactive=client.put(f"/api/v1/system/missions/questions/{item['id']}",headers=headers(ADMIN),json={**body,'expectedVersion':1,'isActive':False})
    assert inactive.status_code==200
    assert client.put(path,headers=headers(ADMIN),json={**payload,'expectedVersion':week['version']}).status_code==422

def test_toeic_requires_exact_answer_and_preserves_alternative(client):
    item,_=question(client)
    week,_,_=publish(client,[item])
    for value,score in [('accomp',0),('achieve',1)]:
        attempt=start(client,week)
        response=client.post(f"/api/v1/missions/attempts/{attempt['id']}/submit",headers=headers('chaewon'),json={'answers':{str(item['id']):value}})
        assert response.status_code==200,response.text
        assert response.json()['correctCount']==score
