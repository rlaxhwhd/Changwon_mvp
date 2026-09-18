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


def test_random_results_for_student_without_fixture(client):
    """fixture 가 없는 학사 미러 학생: C-CORE 임의 결과 → 유형 확정 → 그 유형의 후속진단도 임의 결과."""
    from test_student_login import login, owner, student_headers
    with owner() as conn:
        conn.execute('''INSERT INTO academic.v_usr_inf(intg_uid,login_id,user_ty_cd,usr_nm,orgz_nm,stu_schgr)
          VALUES('20180777','20180777','1101','임의결과','전자공학과','2')''')
    assert login(client, number='20180777').status_code == 200
    head = student_headers()
    before = client.get('/api/v1/diagnosis/students/20180777', headers=head).json()
    assert before['attempts'] == [] and before['results'] == []

    core = client.post('/api/v1/development/diagnosis/ccore/complete', headers={**head, 'Idempotency-Key': str(uuid4())})
    assert core.status_code == 200, core.text
    assert core.json()['source'] == 'development:random'
    with pool.connection() as conn:
        student_type = conn.execute("SELECT student_type FROM dc.student_list WHERE intg_uid='20180777'").fetchone()['student_type']
        rule = conn.execute('SELECT label,lower(follow_up_test) AS follow_up FROM dc.student_type_rule WHERE code=%s', (student_type,)).fetchone()
        scores = conn.execute("SELECT count(*) AS n FROM dc.diagnosis_factor_score WHERE student_uid='20180777' AND test_id='ccore'").fetchone()['n']
    assert student_type in ('T1', 'T2', 'T3', 'T4')  # C5·C6 는 결과표가 없어 임의 유형에서 제외
    assert scores == 4
    after_core = client.get('/api/v1/diagnosis/students/20180777', headers=head).json()
    assert after_core['results'][0]['headline'] == rule['label']
    assert all(30 <= f['tScore'] <= 70 for f in after_core['results'][0]['factors'])

    # 다른 유형의 후속진단은 이 학생의 응시 대상이 아니다.
    other = next(t for t in ('c1', 'c2', 'c3', 'c4') if t != rule['follow_up'])
    assert client.post(f'/api/v1/development/diagnosis/{other}/complete', headers={**head, 'Idempotency-Key': str(uuid4())}).status_code == 409

    follow = client.post(f"/api/v1/development/diagnosis/{rule['follow_up']}/complete", headers={**head, 'Idempotency-Key': str(uuid4())})
    assert follow.status_code == 200, follow.text
    rows = client.get('/api/v1/diagnosis/students/20180777', headers=head).json()
    result = next(r for r in rows['results'] if r['testId'] == rule['follow_up'])
    assert result['source'] == 'development:random'
    assert result['headline'] == max(result['factors'], key=lambda f: f['tScore'])['name']
    if rule['follow_up'] in ('c2', 'c3', 'c4'):
        assert all(f.get('factorCode') for f in result['factors'])  # 정의 테이블과 매핑돼 UNMAPPED 가 없다
        assert not any(f.get('validationIssues') for f in result['factors'])
    # 같은 회차를 두 번 만들 수 없다.
    assert client.post(f"/api/v1/development/diagnosis/{rule['follow_up']}/complete", headers={**head, 'Idempotency-Key': str(uuid4())}).status_code == 409
