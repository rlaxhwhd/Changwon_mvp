-- 0023: 학사 GPA·연락처·주소·핵심역량을 화면에(사용자 확정 2026-11-27). Astra 조건부 승인(0023 architecture-review).
-- 롤백(forward-only 관례, 필요 시 수동): ① API 가 post_code·address·새 뷰를 읽지 않게 되돌린다
--   ② DROP VIEW dc.academic_student_core_competency;
--   ③ DROP VIEW dc.academic_student_details; → 176 정의로 CREATE VIEW(열 삭제는 OR REPLACE 불가) → GRANT SELECT ... TO dc_app.
--   ③ 직전에 이 뷰에 의존하는 뷰가 없음을 확인한다(180 시점 0개).
SET LOCAL lock_timeout = '5s';

-- 기존 열 이름·타입·순서 유지, 끝에만 추가(CREATE OR REPLACE 규칙). 의존 뷰 0.
CREATE OR REPLACE VIEW dc.academic_student_details AS
SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
       a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year,
       a.post AS post_code, a.addr1 AS address
FROM academic.usr_inf a
WHERE a.user_ty_cd = '0001';

-- 학사 핵심역량 원점수. 100점 환산·목표선 없음(사용자 확정). CORE 만.
-- ACE1~5 ↔ 우리 코드는 학사 cap_nm 으로 확인한 고정 대응(이름 매칭 금지). 바뀌면 같은 열로 CREATE OR REPLACE.
-- 〔rev2〕 쓰지 않는 base_dt(전부 NULL)·upd_dt 는 내지 않는다. 점수 NULL 행은 「점수 없음」이라 내지 않는다.
CREATE VIEW dc.academic_student_core_competency AS
SELECT c.intg_uid AS student_uid, k.code AS competency_code, c.cap_score AS score
FROM academic.dc_v_stu_cap_inf c
JOIN (VALUES ('ACE1','LOCAL_LEADER'),('ACE2','CREATIVE'),('ACE3','CONVERGENCE'),
             ('ACE4','COMMUNICATION'),('ACE5','GLOBAL')) m(cap_cd, code) ON m.cap_cd = c.cap_cd
JOIN dc.core_competency k ON k.code = m.code
WHERE c.cap_div = 'CORE' AND c.cap_score IS NOT NULL;
COMMENT ON VIEW dc.academic_student_core_competency IS
 'Academic DC_V_STU_CAP_INF CORE raw scores (no max, no 0..100 normalization). API must apply student access scope.';
-- security_invoker 는 켜지 않는다 — 소유자 권한으로 academic 을 읽는다(dc_app 은 academic 스키마 권한 없음, 176·178).
REVOKE ALL ON dc.academic_student_core_competency FROM PUBLIC;
GRANT SELECT ON dc.academic_student_core_competency TO dc_app;
