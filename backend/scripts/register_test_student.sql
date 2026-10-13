-- User-authorized synthetic account data migration, PostgreSQL only.
-- Required psql variables: student_no, student_name, college_name, dept_name,
-- service_college, service_dept, academic_college, academic_dept, grade, gpa,
-- sex_code, apply. Supply verified organization codes; no name-based guessing.
-- Back up first. Rehearse with apply=false, then apply=true. Re-running is safe.
-- Recovery: the inserts do not replace existing records. Retain the account
-- after activity starts; any removal must be a reviewed forward data migration.
-- Full academic snapshot replacement can remove the mirror-only fixture, while
-- its fallback login remains. Re-run this migration to restore the roster row.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='20s';
SET LOCAL jit=off;
SELECT pg_advisory_xact_lock(20261013, 1);
CREATE TEMP TABLE requested_test_student ON COMMIT DROP AS
SELECT :'student_no'::text AS uid, :'student_name'::text AS name,
       :'college_name'::text AS college_name, :'dept_name'::text AS dept_name,
       :'service_college'::text AS service_college, :'service_dept'::text AS service_dept,
       :'academic_college'::text AS academic_college, :'academic_dept'::text AS academic_dept,
       :'grade'::integer AS grade, :'gpa'::numeric AS gpa, :'sex_code'::text AS sex_code;
DO $$
DECLARE t record;
BEGIN
  SELECT * INTO STRICT t FROM requested_test_student;
  IF t.uid !~ '^[0-9]{8}$' OR t.name='' OR t.grade NOT BETWEEN 1 AND 10
     OR t.gpa < 0 OR t.sex_code NOT IN ('0001','0002') THEN
    RAISE EXCEPTION 'Invalid synthetic student profile';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM dc.department WHERE college_code=t.service_college
      AND dept_code=t.service_dept AND college_name=t.college_name AND dept_name=t.dept_name)
     OR NOT EXISTS (SELECT 1 FROM dc.academic_organizations WHERE dept_cd=t.academic_college
      AND dept_nm=t.college_name)
     OR NOT EXISTS (SELECT 1 FROM dc.academic_organizations WHERE dept_cd=t.academic_dept
      AND dept_up_cd=t.academic_college AND dept_nm=t.dept_name) THEN
    RAISE EXCEPTION 'Synthetic account organization contract does not match';
  END IF;
  IF EXISTS (SELECT 1 FROM dc.person WHERE (intg_uid=t.uid OR alias=t.uid)
      AND NOT (intg_uid=t.uid AND alias=t.uid AND kind='STUDENT' AND source='fixture'
        AND name=t.name AND profile->>'fixtureMarker' IS NOT DISTINCT FROM 'requested-test-student'))
     OR EXISTS (SELECT 1 FROM dc.student WHERE (intg_uid=t.uid OR student_no=t.uid)
      AND NOT (intg_uid=t.uid AND student_no=t.uid))
     OR EXISTS (SELECT 1 FROM dc.fixture_student_login WHERE (student_uid=t.uid OR student_no=t.uid)
      AND NOT (student_uid=t.uid AND student_no=t.uid))
     OR EXISTS (SELECT 1 FROM dc.student_login_override WHERE intg_uid=t.uid)
     OR EXISTS (SELECT 1 FROM academic.v_usr_inf WHERE (intg_uid=t.uid OR login_id=t.uid)
      AND (intg_uid IS DISTINCT FROM t.uid OR login_id IS DISTINCT FROM t.uid
        OR uuid IS DISTINCT FROM 'requested-test-student')) THEN
    RAISE EXCEPTION 'Requested synthetic account collides with an existing identity';
  END IF;
END $$;
INSERT INTO dc.person(intg_uid,alias,name,kind,source,profile)
SELECT uid,uid,name,'STUDENT','fixture','{"fixtureMarker":"requested-test-student"}'::jsonb
FROM requested_test_student ON CONFLICT DO NOTHING;
INSERT INTO dc.student(intg_uid,student_no,major_label,grade,college_code,dept_code,detail)
SELECT uid,uid,dept_name,grade,service_college,service_dept,
       jsonb_build_object('gpa',to_char(gpa,'FM999999990.00'),
                          'collegeName',college_name,'enrollmentStatus','재학')
FROM requested_test_student ON CONFLICT DO NOTHING;
INSERT INTO dc.fixture_student_login(student_no,student_uid)
SELECT uid,uid FROM requested_test_student ON CONFLICT DO NOTHING;
INSERT INTO academic.v_usr_inf(intg_uid,login_id,usr_nm,user_ty_cd,hofc_sta_cd,stu_schgr,
                               orgid,orgz_nm,daehak_cd,hakbu_cd,major_cd,grade,sex,uuid)
SELECT uid,uid,name,'1101','0001',grade::text,academic_dept,dept_name,
       academic_college,academic_dept,academic_dept,gpa,sex_code,'requested-test-student'
FROM requested_test_student t
WHERE NOT EXISTS (SELECT 1 FROM academic.v_usr_inf a WHERE a.intg_uid=t.uid);
DO $$ BEGIN
  IF (SELECT count(*) FROM requested_test_student t
      JOIN dc.student_login_source a ON a.intg_uid=t.uid
      JOIN dc.academic_people p ON p.intg_uid=t.uid
      JOIN dc.academic_student_details x ON x.intg_uid=t.uid
      JOIN dc.academic_organizations c ON c.dept_cd=a.college_code
      JOIN dc.student s ON s.intg_uid=t.uid
      WHERE a.student_no=t.uid AND a.name=t.name AND a.stu_schgr=t.grade::text
        AND a.hofc_sta_cd='0001' AND a.dept_code=t.academic_dept
        AND x.academic_gpa=t.gpa AND x.sex_code=t.sex_code AND c.dept_nm=t.college_name
        AND s.grade=t.grade AND s.detail->>'gpa'=to_char(t.gpa,'FM999999990.00')) <> 1 THEN
    RAISE EXCEPTION 'Synthetic profile verification failed';
  END IF;
END $$;
SELECT count(*) AS registered_synthetic_accounts FROM requested_test_student;
\if :apply
COMMIT;
\else
ROLLBACK;
\endif
