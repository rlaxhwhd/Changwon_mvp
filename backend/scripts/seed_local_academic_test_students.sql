-- 로컬 전용: 가짜 테스트 학생 7명을 academic.local_usr_inf 에 학사 형식으로 등록한다(0021, migration 아님).
-- 사용자 확정(2026-11-25): 비어 있는 학사 칸은 같은 학과·학부(UNIV 00)·재학(HOFC 0001) 실학생 중 INTG_UID 최소 1명의
-- 값으로 개인정보까지 그대로 채운다. 테스트 고유값은 INTG_UID·USR_NM·USER_TY_CD·HAKBU_CD·DAEHAK_CD·STU_SCHGR·UNIV_CD·EMP_NO.
--
-- 리허설(기본, 쓰기 없음):
--   docker exec -i dreamcatch-dev-db psql -X -U postgres -d dreamcatch -v ON_ERROR_STOP=1 < backend/scripts/seed_local_academic_test_students.sql
-- 적용:
--   docker exec -i dreamcatch-dev-db psql -X -U postgres -d dreamcatch -v ON_ERROR_STOP=1 -v apply=true -v confirm_local=yes < backend/scripts/seed_local_academic_test_students.sql
--
-- 안전장치: DB 이름이 dreamcatch 가 아니면 중단, 적용은 confirm_local=yes 필요, 원본(dc_v_usr_inf)과 INTG_UID 가 겹치면 중단.
-- 복사한 값은 출력하지 않는다(건수·기증자 존재 여부만). 재실행 안전(ON CONFLICT DO NOTHING), 동기화가 지우지 않는다.
-- ★ 복사된 연락처는 실제 학생 것이다. 외부 발송(SMS·메일)을 붙이면 academic.usr_inf.origin='local' 인원은 반드시 제외한다.
-- 이 스크립트를 돌리지 않은 DB(신규 테스트 DB·서버)에서는 fixture 로그인(20990001/2 포함)이 되지 않는다.
\set ON_ERROR_STOP on
\if :{?apply}
\else
  \set apply false
\endif
\if :{?confirm_local}
\else
  \set confirm_local no
\endif

SELECT current_database() = 'dreamcatch' AS on_local_db \gset
\if :on_local_db
\else
  \echo 'ABORT: this script only runs on the local dreamcatch database'
  DO $$ BEGIN RAISE EXCEPTION 'aborted by guard'; END $$;
  \quit
\endif
\if :apply
  SELECT :'confirm_local' = 'yes' AS confirmed \gset
  \if :confirmed
  \else
    \echo 'ABORT: apply=true requires -v confirm_local=yes'
    DO $$ BEGIN RAISE EXCEPTION 'aborted by guard'; END $$;
  \quit
  \endif
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';

-- 시드 fixture 2명(chaewon 20211304·changwon 20196208)은 옛 자체 학과 코드가 처음부터 자기 라벨·로드맵·전담교수와 달랐다
-- (C05-05 세무학과 ↔ 컴퓨터공학과, C03-01 법학과 ↔ 경영학과). 176 이 코드를 이름 그대로 옮겨 214 세무학과·201 법학과가 됐다.
-- 테스트 내용(major_label·로드맵·advisor 스냅샷)에 맞춰 학사 학과로 바로잡는다(팀장 확정 2026-11-25). 변경은 org_code_remap 에 남기고,
-- 이미 만든 로컬 학사 행은 지워 아래 INSERT 가 바로잡힌 학과의 기증자로 다시 만든다. 재실행 시 0건(이미 맞으면 대상 없음).
-- 리허설은 전체 트랜잭션을 롤백하므로 아래 쓰기도 남지 않는다.
CREATE TEMP TABLE fixture_dept_fix ON COMMIT DROP AS
SELECT v.intg_uid, v.college_code, v.dept_code, s.college_code AS old_college, s.dept_code AS old_dept
FROM (VALUES ('20211304', '5', '414'), ('20196208', '8', '205')) v(intg_uid, college_code, dept_code)
JOIN dc.student s USING (intg_uid)
WHERE (s.college_code, s.dept_code) IS DISTINCT FROM (v.college_code, v.dept_code);
SELECT count(*) AS fixture_dept_fixes FROM fixture_dept_fix;
INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
SELECT 'student', intg_uid, old_college, old_dept, college_code, dept_code, 'fixture_correction' FROM fixture_dept_fix;
UPDATE dc.student s SET college_code = f.college_code, dept_code = f.dept_code
FROM fixture_dept_fix f WHERE s.intg_uid = f.intg_uid;
DELETE FROM academic.local_usr_inf l USING fixture_dept_fix f WHERE l.intg_uid = f.intg_uid;

CREATE TEMP TABLE local_test_target ON COMMIT DROP AS
WITH target AS (
  SELECT s.intg_uid, p.name, s.dept_code, s.grade
  FROM dc.student s JOIN dc.person p USING (intg_uid)
  WHERE s.intg_uid IN ('20441231', '20661231', '20771231', '20881231', '20991231', '20211304', '20196208')
)
SELECT t.*, d.col_code AS college_code,
       COALESCE(
         (SELECT min(u.intg_uid) FROM academic.dc_v_usr_inf u
          WHERE u.user_ty_cd = '0001' AND u.hakbu_cd = t.dept_code AND u.univ_cd = '00' AND u.hofc_sta_cd = '0001'),
         (SELECT min(u.intg_uid) FROM academic.dc_v_usr_inf u
          JOIN academic.dc_v_dept_inf ud ON ud.dept_code = u.hakbu_cd
          WHERE u.user_ty_cd = '0001' AND ud.col_code = d.col_code AND u.univ_cd = '00' AND u.hofc_sta_cd = '0001')
       ) AS donor_uid,
       (SELECT count(*) FROM academic.dc_v_usr_inf u
        WHERE u.user_ty_cd = '0001' AND u.hakbu_cd = t.dept_code AND u.univ_cd = '00' AND u.hofc_sta_cd = '0001') > 0
         AS same_dept_donor,
       EXISTS (SELECT 1 FROM academic.dc_v_usr_inf u WHERE u.intg_uid = t.intg_uid) AS collides_with_source,
       EXISTS (SELECT 1 FROM academic.local_usr_inf l WHERE l.intg_uid = t.intg_uid) AS already_local
FROM target t
LEFT JOIN academic.dc_v_dept_inf d ON d.dept_code = t.dept_code;

-- 건수만 보고한다(값 없음).
SELECT count(*) AS targets,
       count(*) FILTER (WHERE dept_code IS NOT NULL AND college_code IS NOT NULL) AS with_academic_dept,
       count(*) FILTER (WHERE same_dept_donor) AS same_dept_donor,
       count(*) FILTER (WHERE donor_uid IS NOT NULL) AS donor_found,
       count(*) FILTER (WHERE collides_with_source) AS source_collisions,
       count(*) FILTER (WHERE already_local) AS already_local
FROM local_test_target;

DO $$
BEGIN
  IF (SELECT count(*) FROM local_test_target) <> 7 THEN
    RAISE EXCEPTION 'expected 7 local test students in dc.student';
  END IF;
  IF EXISTS (SELECT 1 FROM local_test_target WHERE collides_with_source) THEN
    RAISE EXCEPTION 'a local test student number exists in the academic source; aborting';
  END IF;
  IF EXISTS (SELECT 1 FROM local_test_target WHERE college_code IS NULL OR donor_uid IS NULL) THEN
    RAISE EXCEPTION 'a local test student has no academic department or donor; run the dc-views sync first';
  END IF;
END $$;

INSERT INTO academic.local_usr_inf (
  intg_uid, emp_no, orgid, partid, rankid, hofc_sta_cd, hofc_sta_nm, user_ty_cd, user_ty_nm, usr_nm,
  tel, hp, post, addr1, email, sex, stu_schgr, univ_cd, daehak_cd, hakbu_cd, major_cd, major_cd1, age,
  for_yn, grade, out_dt, enter_dt, isu_grade, photo, isu_smt_cnt, curri_year, track_cd, track_nm,
  grad_exp_ym, upd_dt, note)
SELECT t.intg_uid, NULL, d.orgid, d.partid, d.rankid, d.hofc_sta_cd, d.hofc_sta_nm, '0001', d.user_ty_nm, t.name,
       d.tel, d.hp, d.post, d.addr1, d.email, d.sex,
       CASE WHEN t.grade BETWEEN 1 AND 9 THEN t.grade::text ELSE d.stu_schgr END,
       '00', t.college_code, t.dept_code, d.major_cd, d.major_cd1, d.age,
       d.for_yn, d.grade, d.out_dt, d.enter_dt, d.isu_grade, d.photo, d.isu_smt_cnt, d.curri_year, d.track_cd, d.track_nm,
       d.grad_exp_ym, d.upd_dt, 'local test student (0021); blank academic fields copied from a same-department student'
FROM local_test_target t
JOIN academic.dc_v_usr_inf d ON d.intg_uid = t.donor_uid
WHERE :'apply'::boolean
ON CONFLICT (intg_uid) DO NOTHING;

SELECT count(*) AS local_rows_now FROM academic.local_usr_inf;
\if :apply
  COMMIT;
  \echo 'APPLIED'
\else
  ROLLBACK;
  \echo 'REHEARSAL ONLY (no rows written). Re-run with -v apply=true -v confirm_local=yes'
\endif
