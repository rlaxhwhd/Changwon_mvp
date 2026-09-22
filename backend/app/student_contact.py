"""Academic enrolled-student funnel; account creation is not participation."""

CONTACT_CTE = '''WITH contact AS (
 SELECT a.intg_uid,
 EXISTS(SELECT 1 FROM dc.diagnosis_attempt d WHERE d.student_uid=a.intg_uid
   AND d.test_id='ccore' AND d.status_code='DONE') AS diagnosed,
 EXISTS(SELECT 1 FROM dc.counsel_request c WHERE c.student_uid=a.intg_uid
   AND c.status_code='DONE') AS counseled,
 EXISTS(SELECT 1 FROM dc.roadmap r WHERE r.student_uid=a.intg_uid) AS roadmap
 FROM dc.student_login_source a WHERE a.hofc_sta_cd='0001'
)'''

STAGES = {
 'diagnosis': 'NOT diagnosed',
 'counsel': 'diagnosed AND NOT counseled',
 'roadmap': 'diagnosed AND counseled AND NOT roadmap',
}


def contact_summary(conn):
    # Academic read models inflate estimated costs; JIT compilation dominated
    # this short count (302ms vs 43ms with JIT disabled on the local roster).
    conn.execute('SET LOCAL jit=off')
    return conn.execute(CONTACT_CTE + ''' SELECT count(*) AS total,
      count(*) FILTER(WHERE NOT diagnosed) AS diagnosis,
      count(*) FILTER(WHERE diagnosed AND NOT counseled) AS counsel,
      count(*) FILTER(WHERE diagnosed AND counseled AND NOT roadmap) AS roadmap
      FROM contact''').fetchone()
