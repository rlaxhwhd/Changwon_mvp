from decimal import Decimal
from uuid import uuid4

from psycopg.types.json import Jsonb

from test_psych_referrals import db  # noqa: F401 -- isolated rollback fixture
from test_api import headers


def test_precomputed_hidden_and_development_completion_projects_scores(client,db):
    identity='numeric-test-'+uuid4().hex
    db.execute("INSERT INTO dc.person VALUES(%s,%s,'Numeric test','STUDENT','fixture','{}',1)",(identity,identity))
    db.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,detail)
      VALUES(%s,%s,'test',%s)''',(identity,identity,Jsonb({'diagnosisOutcome':{'studentType':'T1'}})))
    db.execute("INSERT INTO dc.diagnosis_attempt VALUES(%s,%s,'ccore',1,'PRECOMPUTED',NULL,NULL,'{}','fixture')",(uuid4().hex,identity))
    db.execute("INSERT INTO dc.diagnosis_result VALUES(%s,'ccore',1,now(),%s,'fixture')",
      (identity,Jsonb({'testId':'ccore','factors':[{'name':'외부 영역','tScore':52.25}]})))
    response=client.get('/api/v1/diagnosis/students/'+identity,headers=headers(identity))
    assert response.status_code==200 and response.json()['results']==[]
    head={**headers(identity),'Idempotency-Key':uuid4().hex}
    response=client.post('/api/v1/development/diagnosis/ccore/complete',headers=head)
    assert response.status_code==200
    assert client.post('/api/v1/development/diagnosis/ccore/complete',headers=head).json()==response.json()
    rows=client.get('/api/v1/diagnosis/students/'+identity,headers=headers(identity)).json()['results']
    assert len(rows)==1 and rows[0]['factors'][0]['tScore']==52.25
    assert scores(db,identity,2,'ccore')[0]['t_score']==Decimal('52.25')


def result(conn, factors, test='c2'):
    uid=conn.execute("SELECT intg_uid FROM dc.person WHERE alias='chaewon'").fetchone()['intg_uid']
    attempt=conn.execute('SELECT coalesce(max(attempt_no),0)+1 AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND test_id=%s',(uid,test)).fetchone()['n']
    conn.execute("INSERT INTO dc.diagnosis_attempt VALUES(%s,%s,%s,%s,'DONE',now(),now(),'{}','test:external')",(uuid4().hex,uid,test,attempt))
    body={'testId':test,'attemptNo':attempt,'factors':factors,'externalResultId':uuid4().hex}
    conn.execute("INSERT INTO dc.diagnosis_result VALUES(%s,%s,%s,now(),%s,'test:external')",(uid,test,attempt,Jsonb(body)))
    return uid,attempt,body


def scores(conn,uid,attempt,test='c2'):
    return conn.execute('SELECT * FROM dc.diagnosis_factor_score WHERE student_uid=%s AND test_id=%s AND attempt_no=%s ORDER BY position',(uid,test,attempt)).fetchall()


def test_numeric_fields_and_source_preserved(client,db):
    uid,attempt,body=result(db,[{'factorCode':'EXPERIENCE','name':'경험 지향형','rawScore':'32.125','tScore':59.68,'percentile':83.2,'level':'외부 판정'}])
    row=scores(db,uid,attempt)[0]
    assert row['raw_score']==Decimal('32.125')
    assert row['t_score']==Decimal('59.68')
    assert row['percentile']==Decimal('83.2')
    assert row['level']=='외부 판정' and row['validation_issues']==[]
    stored=db.execute('SELECT payload FROM dc.diagnosis_result WHERE student_uid=%s AND test_id=%s AND attempt_no=%s',(uid,'c2',attempt)).fetchone()['payload']
    assert stored==body
    response=client.get('/api/v1/diagnosis/students/chaewon',headers=headers('career_kim'))
    assert response.status_code==200
    found=next(r for r in response.json()['results'] if r['testId']=='c2' and r['attemptNo']==attempt)
    assert found['factors'][0]['rawScore']==32.125
    assert found['factors'][0]['level']=='외부 판정'


def test_zero_missing_and_unmapped_not_invented(client,db):
    uid,attempt,_=result(db,[{'name':'새 외부 영역','tScore':0},{'name':'경험 지향형'}])
    rows=scores(db,uid,attempt)
    assert rows[0]['t_score']==0 and rows[0]['factor_code'] is None
    assert rows[0]['validation_issues']==['UNMAPPED_FACTOR']
    assert rows[1]['factor_code']=='EXPERIENCE' and rows[1]['t_score'] is None
    assert rows[1]['level'] is None and rows[1]['raw_score'] is None


def test_invalid_values_retained_but_not_used_as_numbers(client,db):
    uid,attempt,body=result(db,[{'name':'경험 지향형','rawScore':'NaN','tScore':'not-a-score','percentile':101}])
    row=scores(db,uid,attempt)[0]
    assert row['raw_score'] is None and row['t_score'] is None and row['percentile'] is None
    assert row['raw_factor']==body['factors'][0]
    assert set(row['validation_issues'])=={'INVALID_RAW_SCORE','INVALID_T_SCORE','INVALID_PERCENTILE'}


def test_result_update_rebuilds_projection_and_removes_old_rows(client,db):
    uid,attempt,body=result(db,[{'name':'경험 지향형','tScore':50},{'name':'새 영역','tScore':60}])
    body['factors']=[{'name':'경험 지향형','tScore':51.125}]
    db.execute('UPDATE dc.diagnosis_result SET payload=%s WHERE student_uid=%s AND test_id=%s AND attempt_no=%s',(Jsonb(body),uid,'c2',attempt))
    rows=scores(db,uid,attempt)
    assert len(rows)==1 and rows[0]['t_score']==Decimal('51.125')


def test_retake_is_separate_and_empty_results_have_no_scores(client,db):
    uid,first,_=result(db,[{'name':'경험 지향형','tScore':51}])
    _,second,_=result(db,[])
    assert scores(db,uid,first)[0]['t_score']==51
    assert scores(db,uid,second)==[]
    response=client.get('/api/v1/diagnosis/students/chaewon',headers=headers('changwon'))
    assert response.status_code==404


def test_existing_backfill_matches_every_original_factor(client,db):
    rows=db.execute('''SELECT r.student_uid,r.test_id,r.attempt_no,r.payload FROM dc.diagnosis_result r''').fetchall()
    assert rows
    for r in rows:
        projected=scores(db,r['student_uid'],r['attempt_no'],r['test_id'])
        assert [x['raw_factor'] for x in projected]==r['payload'].get('factors',[])
        for x in projected:
            if isinstance(x['raw_factor'].get('tScore'),(int,float)):
                assert x['t_score']==Decimal(str(x['raw_factor']['tScore']))
