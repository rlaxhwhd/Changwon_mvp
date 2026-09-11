from uuid import uuid4
from app.db import pool
from test_api import headers


def test_result_access_and_precomputed_not_exposed(client):
    assert client.get('/api/v1/diagnosis/students/chaewon',headers=headers('jiwoo')).status_code==404
    response=client.get('/api/v1/diagnosis/students/jiwoo',headers=headers('jiwoo'))
    assert response.status_code==200,response.text
    assert response.json()['results']==[]
    metadata=client.get('/api/v1/metadata',headers=headers('jiwoo')).json()
    assert len([r for r in metadata['factors'] if r['test_code']=='C2'])==3
    assert len([r for r in metadata['factors'] if r['test_code']=='C3'])==5
    assert not [r for r in metadata['factors'] if r['test_code'] in ('C5','C6')]


def test_diagnosis_simulation_is_persisted_idempotent_and_labeled(client):
    head={**headers('jiwoo'),'Idempotency-Key':str(uuid4())}
    path='/api/v1/development/diagnosis/ccore/complete'
    response=client.post(path,headers=head)
    assert response.status_code==200,response.text
    assert response.json()['source']=='development:fixture'
    assert client.post(path,headers=head).json()==response.json()
    rows=client.get('/api/v1/diagnosis/students/jiwoo',headers=headers('jiwoo')).json()
    assert len(rows['attempts'])==1 and len(rows['results'])==1
    assert rows['attempts'][0]['source']=='development:fixture'
    with pool.connection() as conn:
        assert conn.execute("SELECT count(*) AS n FROM dc.diagnosis_attempt WHERE source='development:fixture'").fetchone()['n']==1
    assert client.post('/api/v1/development/diagnosis/c5/complete',headers=head).status_code==409


def test_paginated_status_comments_and_nudges(client):
    head=headers('career_kim')
    response=client.get('/api/v1/diagnosis/status?pageSize=5',headers=head)
    assert response.status_code==200,response.text
    assert len(response.json()['items'])==5
    assert response.json()['totalCount']>5
    rows=client.get('/api/v1/diagnosis/students/chaewon',headers=head).json()['attempts']
    attempt=next(row for row in rows if row['status']=='완료')
    path='/api/v1/diagnosis/attempts/'+attempt['id']+'/comments'
    assert client.post(path,headers=headers('chaewon'),json={'body':'unauthorized'}).status_code==403
    for message in ('first','second'):
        result=client.post(path,headers=head,json={'body':message})
        assert result.status_code==201,result.text
    result=client.get('/api/v1/diagnosis/students/chaewon',headers=head).json()
    assert [row['body'] for row in result['comments']]==['first','second']
    summary=client.get('/api/v1/diagnosis/summary',headers=head)
    assert summary.status_code==200,summary.text
    assert sum(row['target'] for row in summary.json())==response.json()['totalCount']


def test_status_list_query_count_does_not_grow_with_page_size(client):
    # 목록은 행마다 최신 코멘트와 최근 권유를 물었다. 그래서 pageSize 100 이면 이 함수
    # 하나가 202 회를 실행했다 — 대상이 8천 명이 되면 그대로 비용이 된다. 페이지를
    # 20 배로 키워도 조회 횟수가 그만큼 늘지 않는다는 것을 여기에 고정한다.
    # 근거: .ai/db/SCHEMA_REVIEW_2026-09-10.md §4 F4
    import psycopg
    head=headers('career_kim')
    original=psycopg.Connection.execute
    counts=[]
    def counted(self,*args,**kwargs):
        counts[-1]+=1
        return original(self,*args,**kwargs)
    psycopg.Connection.execute=counted
    try:
        for size in (5,100):
            counts.append(0)
            assert client.get(f'/api/v1/diagnosis/status?pageSize={size}',headers=head).status_code==200
    finally:
        psycopg.Connection.execute=original
    small,large=counts
    # 20 배 페이지에 조회가 2 회를 넘게 늘면 다시 행마다 묻고 있다는 뜻이다.
    assert large-small<=2,f'pageSize 5 에서 {small} 회, 100 에서 {large} 회 — 행마다 조회하고 있다'


def test_status_list_shows_the_latest_comment_on_the_right_attempt(client):
    # 일괄 조회로 바꾸면서 코멘트를 행에 되붙이는 코드가 새로 생겼다. 잘못 붙으면
    # **남의 코멘트가 남의 행에** 뜨는데, 코멘트가 0 행이면 그 경로가 실행되지 않아
    # 테스트가 초록으로 지나간다. 그래서 코멘트를 직접 만들고 확인한다.
    head=headers('career_kim')
    attempts=client.get('/api/v1/diagnosis/students/changwon',headers=head).json()['attempts']
    attempt=next(row for row in attempts if row['status']=='완료')
    for message in ('예전 코멘트','최신 코멘트'):
        assert client.post('/api/v1/diagnosis/attempts/'+attempt['id']+'/comments',
                           headers=head,json={'body':message}).status_code==201
    items=client.get('/api/v1/diagnosis/status?pageSize=100',headers=head).json()['items']
    row=next(item for item in items if item['attemptId']==attempt['id'])
    assert row['comment'] is not None and row['comment']['body']=='최신 코멘트'
    assert row['comment']['studentId']==row['studentId']
    assert row['comment']['attemptId']==attempt['id']
    # 코멘트가 없는 행에는 남의 것이 새어 들어오지 않는다
    assert all(item['comment'] is None for item in items if item['attemptId']!=attempt['id']
               and item['attemptId'] not in {c['attemptId'] for c in
                   (i['comment'] for i in items) if c})
