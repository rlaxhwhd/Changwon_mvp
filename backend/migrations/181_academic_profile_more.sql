-- 0024: 학사 졸업예정·입학일·이수학기·생년월일·집전화·다전공을 화면에(사용자 확정 2026-11-27). Astra 조건부 승인(0024 architecture-review rev2).
-- 롤백(forward-only 관례, 필요 시 수동, 순서 중요):
--   ① API 가 새 4열·dc.academic_student_majors 를 읽지 않게 되돌린다(growth.academic_contact).
--   ② DROP VIEW dc.academic_student_majors;
--   ③ dc.academic_student_details 에 의존하는 뷰가 없음을 확인한다(181 시점 0개).
--   ④ DROP VIEW dc.academic_student_details; → 아래 180 정의(12열)로 CREATE VIEW(열 삭제는 OR REPLACE 불가)
--      → GRANT SELECT ON dc.academic_student_details TO dc_app;
--      180 정의:
--        CREATE VIEW dc.academic_student_details AS
--        SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
--               a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year,
--               a.post AS post_code, a.addr1 AS address
--        FROM academic.usr_inf a
--        WHERE a.user_ty_cd = '0001';
-- 이 뷰를 읽는 명단 엑셀·설문·학사 목록이 AccessExclusive 를 잠깐 기다린다.
SET LOCAL lock_timeout = '5s';

-- 기존 열 이름·타입·순서 유지, 끝에만 추가(CREATE OR REPLACE 규칙). 원값 그대로 — 문자열 가공은 API 한 곳(growth.academic_contact).
-- age 는 이름과 달리 생년월일(YYYYMMDD)이다(DB_VIEW_REQUEST: 생년월일=AGE).
CREATE OR REPLACE VIEW dc.academic_student_details AS
SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
       a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year,
       a.post AS post_code, a.addr1 AS address,
       a.enter_dt AS admission_date, a.isu_smt_cnt AS completed_semesters, a.age AS birth_date, a.tel AS home_phone
FROM academic.usr_inf a
WHERE a.user_ty_cd = '0001';

-- 학사 다전공(복수·부·융합·연계·마이크로디그리 …). 주전공은 이 원천에 없다.
-- 코드표·전공 마스터 유일성은 sync 차단 검사가 아니라 보고형이다 → LATERAL LIMIT 1 로 원천 1행 = 뷰 1행을 구조로 보장한다.
-- 상태 전체(취소·포기·이수 실패 포함)를 낸다 — 학사 원값을 숨기지 않고 상태 라벨로 구분한다.
-- 인덱스는 176 이 이미 있다(ix_dc_v_usr_major_inf_intg_uid · ix_dc_v_code_inf_code · ix_dc_v_major_inf_major_code).
CREATE VIEW dc.academic_student_majors AS
SELECT u.intg_uid AS student_uid, u.major_seq, u.major_type AS type_code, t.code_nm AS type_label,
       u.major_cd AS major_code, m.major_name, u.major_stat AS status_code, s.code_nm AS status_label
FROM academic.dc_v_usr_major_inf u
LEFT JOIN LATERAL (SELECT x.major_name FROM academic.dc_v_major_inf x
                   WHERE x.major_code = u.major_cd
                   ORDER BY x.major_name LIMIT 1) m ON true
LEFT JOIN LATERAL (SELECT x.code_nm FROM academic.dc_v_code_inf x
                   WHERE x.code_grp = 'MAJOR_TYPE' AND x.code = u.major_type
                   ORDER BY x.use_yn = 'Y' DESC, x.sort_no NULLS LAST, x.code_nm LIMIT 1) t ON true
LEFT JOIN LATERAL (SELECT x.code_nm FROM academic.dc_v_code_inf x
                   WHERE x.code_grp = 'MAJOR_STAT' AND x.code = u.major_stat
                   ORDER BY x.use_yn = 'Y' DESC, x.sort_no NULLS LAST, x.code_nm LIMIT 1) s ON true;
COMMENT ON VIEW dc.academic_student_majors IS
 'Academic DC_V_USR_MAJOR_INF double/minor/convergence majors with labels; one row per source row. API must apply student access scope.';
-- security_invoker 는 켜지 않는다 — 소유자 권한으로 academic 을 읽는다(dc_app 은 academic 스키마 권한 없음, 176·178·180).
REVOKE ALL ON dc.academic_student_majors FROM PUBLIC;
GRANT SELECT ON dc.academic_student_majors TO dc_app;
