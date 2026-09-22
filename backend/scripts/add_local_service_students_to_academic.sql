-- Local Docker fixture only. Never apply to upstream Oracle.
-- Existing service identities and activities remain unchanged.
-- Run with psql -v apply=false first; use -v apply=true to commit.
-- Recovery: delete ONLY the two inserted academic rows (20196208,20211304),
-- after verifying they still have login_id 20990002,20990001 respectively.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
SELECT pg_advisory_xact_lock(20260921, 2099);
DO $$ BEGIN
  IF current_database() <> 'dreamcatch' THEN
    RAISE EXCEPTION 'This fixture is restricted to local dreamcatch';
  END IF;
  IF (SELECT count(*) FROM dc.student_list
      WHERE (intg_uid,student_no) IN (('20196208','20990002'),('20211304','20990001'))
        AND status='재학') <> 2 THEN
    RAISE EXCEPTION 'Expected existing service students missing or changed';
  END IF;
  IF EXISTS (SELECT 1 FROM academic.v_usr_inf
      WHERE intg_uid IN ('20196208','20211304') OR login_id IN ('20990001','20990002')) THEN
    RAISE EXCEPTION 'Academic identity already exists; inspect before proceeding';
  END IF;
END $$;
INSERT INTO academic.v_usr_inf
  (intg_uid,login_id,usr_nm,user_ty_cd,hofc_sta_cd,stu_schgr,
   orgid,orgz_nm,daehak_cd,hakbu_cd,major_cd)
SELECT intg_uid,student_no,name,'1101','0001',grade::text,
       dept_code,major_label,college_code,dept_code,dept_code
FROM dc.student_list WHERE intg_uid IN ('20196208','20211304');
DO $$ BEGIN
  IF (SELECT count(*) FROM dc.student_login_source a
      JOIN dc.academic_people p USING(intg_uid)
      JOIN dc.academic_student_details x USING(intg_uid)
      WHERE (a.intg_uid,a.student_no) IN (('20196208','20990002'),('20211304','20990001'))) <> 2 THEN
    RAISE EXCEPTION 'Academic roster joins failed';
  END IF;
END $$;
SELECT intg_uid,student_no,name,stu_schgr,dept_name
FROM dc.student_login_source WHERE student_no IN ('20990001','20990002');
\if :apply
COMMIT;
\else
ROLLBACK;
\endif
