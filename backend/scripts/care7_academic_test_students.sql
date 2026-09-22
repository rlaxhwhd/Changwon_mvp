-- Explicit local Docker test data, 2026-09-21. Never run against upstream Oracle.
-- psql -v apply=false rehearses and rolls back; -v apply=true commits.
-- Back up the six academic rows before applying. No service activity is seeded.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
SELECT pg_advisory_xact_lock(20260921, 6);
DO $$
BEGIN
  IF (SELECT count(*) FROM academic.v_usr_inf
      WHERE intg_uid BETWEEN '20240001' AND '20240006'
        AND login_id = intg_uid AND user_ty_cd = '1101') <> 6 THEN
    RAISE EXCEPTION 'Expected six existing undergraduate test identities';
  END IF;
  IF EXISTS (SELECT 1 FROM dc.person WHERE intg_uid BETWEEN '20240001' AND '20240006')
     OR EXISTS (SELECT 1 FROM dc.student_login_override WHERE intg_uid BETWEEN '20240001' AND '20240006') THEN
    RAISE EXCEPTION 'Service identity already exists; do not reset an active test';
  END IF;
END $$;

UPDATE academic.v_usr_inf AS a
SET usr_nm = v.name,
    stu_schgr = '1',
    hofc_sta_cd = '0001',
    orgz_nm = '국어국문학과',
    orgid = '101', daehak_cd = '1', hakbu_cd = '101', major_cd = 'M101'
FROM (VALUES
  ('20240001', '홍길원'), ('20240002', '홍길이'),
  ('20240003', '홍길삼'), ('20240004', '홍길사'),
  ('20240005', '홍길오'), ('20240006', '홍길육')
) AS v(uid, name)
WHERE a.intg_uid = v.uid;

DO $$
BEGIN
  IF (SELECT count(*) FROM dc.student_login_source
      WHERE student_no BETWEEN '20240001' AND '20240006'
        AND intg_uid=student_no AND stu_schgr='1'
        AND dept_name='국어국문학과' AND hofc_sta_cd='0001'
        AND college_code='1' AND dept_code='M101') <> 6 THEN
    RAISE EXCEPTION 'Login source verification failed';
  END IF;
END $$;
SELECT student_no, name, stu_schgr, dept_name
FROM dc.student_login_source
WHERE student_no BETWEEN '20240001' AND '20240006'
ORDER BY student_no;
\if :apply
COMMIT;
\else
ROLLBACK;
\endif
