import pytest
from test_api import headers
from test_missions import ADMIN, publish

@pytest.mark.parametrize('count',[10,20])
def test_random_returns_requested_active_unique_questions(client,count):
    r=client.get('/api/v1/system/missions/questions/random',headers=headers(ADMIN),params={'kind':'TOEIC','count':count,'difficulty':'LOW'})
    assert r.status_code==200,r.text
    items=r.json()['items']
    assert len(items)==count and len({x['id'] for x in items})==count
    assert all(x['kind']=='TOEIC' and x['is_active'] and x['difficulty_code']=='LOW' for x in items)
    params=[('kind','TOEIC'),('count',count),('difficulty','LOW')]+[('excludeIds',x['id']) for x in items[:3]]
    extra=client.get('/api/v1/system/missions/questions/random',headers=headers(ADMIN),params=params)
    assert extra.status_code==200,extra.text
    assert len(extra.json()['items'])==count-3
    assert not {x['id'] for x in items[:3]} & {x['id'] for x in extra.json()['items']}

def test_random_validation_and_permissions(client):
    path='/api/v1/system/missions/questions/random'
    assert client.get(path,headers=headers('chaewon'),params={'kind':'TOEIC'}).status_code==403
    assert client.get(path,headers=headers(ADMIN),params={'kind':'TOEIC','count':15}).status_code==422
    assert client.get(path,headers=headers(ADMIN),params={'kind':'TOEIC','q':'NO_SUCH_WORD_987XYZ'}).status_code==422
    r=client.get(path,headers=headers(ADMIN),params=[('kind','TOEIC'),('count',10)]+[('excludeIds',x) for x in range(10)])
    assert r.status_code==200 and r.json()['items']==[]

def test_week_limit_persistence_and_clear(client):
    items=client.get('/api/v1/system/missions/questions/random?kind=TOEIC&count=20',headers=headers(ADMIN)).json()['items']
    week,path,body=publish(client,items,published=False)
    r=client.put(path,headers=headers(ADMIN),json={**body,'expectedVersion':week['version'],'selectionLimit':10})
    assert r.status_code==422
    saved=client.put(path,headers=headers(ADMIN),json={**body,'expectedVersion':week['version'],'selectionLimit':10,'questionIds':[x['id'] for x in items[:10]]})
    assert saved.status_code==200,saved.text
    assert client.get(path,headers=headers(ADMIN)).json()['selection_limit']==10
    cleared=client.put(path,headers=headers(ADMIN),json={**body,'expectedVersion':saved.json()['version'],'selectionLimit':10,'questionIds':[]})
    assert cleared.status_code==200 and cleared.json()['items']==[]
    # Clearing a weekly selection does not delete the question bank.
    assert client.get('/api/v1/system/missions/questions?kind=TOEIC',headers=headers(ADMIN)).json()['totalCount']>=340
