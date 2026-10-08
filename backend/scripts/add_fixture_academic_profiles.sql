-- Explicitly requested fixture data in the PostgreSQL academic mirror only.
-- Never run against Oracle. Supply student1/student2; no identities are stored here.
-- Rehearse: psql -v student1=... -v student2=... -v apply=false -f this-file
-- Apply: use apply=true. Back up the database before applying.
-- Recovery: use remove=true, apply=true with the same two student numbers.
-- A full academic snapshot refresh replaces these mirror-only fixtures.
\set ON_ERROR_STOP on
\if :{?remove}
\else
\set remove false
\endif
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='20s';
SET LOCAL jit=off;
SELECT pg_advisory_xact_lock(20261008, 2);
CREATE TEMP TABLE fixture_targets ON COMMIT DROP AS
SELECT s.intg_uid,s.student_no,p.name,s.major_label
FROM dc.student s JOIN dc.person p USING(intg_uid)
WHERE s.student_no IN (:'student1', :'student2')
  AND p.kind='STUDENT' AND p.source='fixture';
DO $$ BEGIN
  IF (SELECT count(*) FROM fixture_targets) <> 2 THEN
    RAISE EXCEPTION 'Expected two distinct existing fixture students';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM dc.academic_organizations WHERE dept_cd='1' AND dept_nm='인문대학')
     OR NOT EXISTS(SELECT 1 FROM dc.academic_organizations WHERE dept_cd='108' AND dept_nm='철학과')
     OR EXISTS(SELECT 1 FROM fixture_targets WHERE major_label <> '철학과') THEN
    RAISE EXCEPTION 'Academic organization contract does not match these fixtures';
  END IF;
  IF EXISTS(SELECT 1 FROM academic.v_usr_inf a JOIN fixture_targets t
    ON a.intg_uid=t.intg_uid OR a.login_id=t.student_no
    WHERE a.intg_uid<>t.intg_uid OR a.login_id IS DISTINCT FROM t.student_no
       OR a.uuid IS DISTINCT FROM 'fixture-profile-20261008') THEN
    RAISE EXCEPTION 'Existing academic identity is not owned by this fixture';
  END IF;
END $$;
\if :remove
DELETE FROM academic.v_usr_inf a USING fixture_targets t
WHERE a.intg_uid=t.intg_uid AND a.login_id=t.student_no
  AND a.uuid='fixture-profile-20261008';
\else
INSERT INTO academic.v_usr_inf
  (intg_uid,login_id,usr_nm,user_ty_cd,hofc_sta_cd,stu_schgr,
   orgid,orgz_nm,daehak_cd,hakbu_cd,major_cd,grade,uuid)
SELECT t.intg_uid,t.student_no,t.name,'1101','0001','3',
       '108',t.major_label,'1','108','108',3.50,'fixture-profile-20261008'
FROM fixture_targets t
WHERE NOT EXISTS(SELECT 1 FROM academic.v_usr_inf a WHERE a.intg_uid=t.intg_uid);
DO $$ BEGIN
  IF (SELECT count(*) FROM dc.student_login_source a
      JOIN dc.academic_people p USING(intg_uid)
      JOIN dc.academic_student_details x USING(intg_uid)
      JOIN fixture_targets t USING(intg_uid)
      JOIN dc.academic_organizations c ON c.dept_cd=a.college_code
      WHERE a.student_no=t.student_no AND a.name=t.name
        AND a.stu_schgr='3' AND a.hofc_sta_cd='0001'
        AND x.academic_gpa=3.50 AND c.dept_nm='인문대학') <> 2 THEN
    RAISE EXCEPTION 'Academic roster/detail verification failed';
  END IF;
END $$;
\endif
SELECT count(*) AS academic_fixture_count FROM academic.v_usr_inf a
JOIN fixture_targets t USING(intg_uid) WHERE a.uuid='fixture-profile-20261008';
\if :apply
COMMIT;
\else
ROLLBACK;
\endif
