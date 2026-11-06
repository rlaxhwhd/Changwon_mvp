"""Academic enrolled-student funnel; account creation is not participation."""

# 학사 학년·학적의 판정 — a 는 dc.student_login_source 다. dc.student 는 첫 로그인 값에서 멈춘다.
ACADEMIC_GRADE = "CASE WHEN a.stu_schgr ~ '^[0-9]{1,2}$' THEN a.stu_schgr::int END"
ACADEMIC_STATUS = """CASE a.hofc_sta_cd WHEN '0001' THEN '재학' WHEN '0002' THEN '휴학'
      WHEN '0003' THEN '제적' WHEN '0004' THEN '수료' WHEN '0005' THEN '졸업' ELSE '미상' END"""

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
