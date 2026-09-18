from datetime import timedelta
from app.db import pool
from app.missions import monday
from test_api import headers
from test_missions import ADMIN, question, publish

def listed(client, item):
    result=client.get('/api/v1/system/missions/questions',headers=headers(ADMIN),params={'kind':'TOEIC','q':item['category']})
    assert result.status_code==200,result.text
    return next(x for x in result.json()['items'] if x['id']==item['id'])

def test_vocabulary_fields_and_filter(client):
    item,body=question(client)
    assert item['difficulty_code']=='MEDIUM'
    assert item['publication_count']==0
    saved=client.put(f"/api/v1/system/missions/questions/{item['id']}",headers=headers(ADMIN),json={**body,'expectedVersion':1,'difficulty':'HIGH'})
    assert saved.status_code==200,saved.text
    for difficulty,count in [('HIGH',1),('LOW',0)]:
        response=client.get('/api/v1/system/missions/questions',headers=headers(ADMIN),params={'kind':'TOEIC','q':item['category'],'difficulty':difficulty,'sort':'least-used'})
        assert response.status_code==200,response.text
        assert response.json()['totalCount']==count
    assert client.put(f"/api/v1/system/missions/questions/{item['id']}",headers=headers(ADMIN),json={**body,'expectedVersion':2,'difficulty':'INVALID'}).status_code==422
    with pool.connection() as conn:
        row=conn.execute('SELECT * FROM dc.toeic_vocabulary WHERE question_id=%s',(item['id'],)).fetchone()
        assert row['difficulty_code']=='HIGH' and row['english_word']=='accomplish'

def test_publication_counts_distinct_weeks_not_saves(client):
    item,_=question(client)
    publish(client,[item],published=False)
    assert listed(client,item)['publication_count']==0
    publish(client,[item])
    publish(client,[item])
    assert listed(client,item)['publication_count']==1
    publish(client,[item],published=False)
    publish(client,[],published=False)
    assert listed(client,item)['publication_count']==1
    publish(client,[item],start=monday()+timedelta(days=7))
    assert listed(client,item)['publication_count']==2

def test_starter_catalog_and_metadata(client):
    data=client.get('/api/v1/metadata',headers=headers(ADMIN)).json()
    codes={x['code'] for x in data['items'] if x['group_code']=='TOEIC_DIFFICULTY' and x['is_active']}
    assert codes=={'LOW','MEDIUM','HIGH'}
    with pool.connection() as conn:
        assert conn.execute('SELECT count(*) n FROM dc.toeic_vocabulary').fetchone()['n']>=340
        for code in codes:
            assert conn.execute('SELECT count(*) n FROM dc.toeic_vocabulary WHERE difficulty_code=%s',(code,)).fetchone()['n']>0
        assert not conn.execute("SELECT q.id FROM dc.mission_question q LEFT JOIN dc.toeic_vocabulary v ON v.question_id=q.id WHERE q.kind='TOEIC' AND v.question_id IS NULL").fetchall()
