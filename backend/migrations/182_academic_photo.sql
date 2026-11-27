-- 0025: 학사 증명사진 파일명(사용자 확정 2026-11-27). Astra 조건부 승인(0025 architecture-review).
-- 롤백(forward-only 관례, 필요 시 수동, 순서 중요):
--   ① API 가 photo_file 을 읽지 않게 되돌린다(growth.academic_contact·academic_photo.academic_photo_name·
--      academic_students.photo).
--   ② dc.academic_student_details 에 의존하는 뷰가 없음을 확인한다(182 시점 0개).
--   ③ DROP VIEW dc.academic_student_details; → 아래 181 정의(16열)로 CREATE VIEW(열 삭제는 OR REPLACE 불가)
--      → GRANT SELECT ON dc.academic_student_details TO dc_app;
--      181 정의:
--        CREATE VIEW dc.academic_student_details AS
--        SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
--               a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year,
--               a.post AS post_code, a.addr1 AS address,
--               a.enter_dt AS admission_date, a.isu_smt_cnt AS completed_semesters, a.age AS birth_date, a.tel AS home_phone
--        FROM academic.usr_inf a
--        WHERE a.user_ty_cd = '0001';
-- 이 뷰를 읽는 명단 엑셀·설문·학사 목록이 AccessExclusive 를 잠깐 기다린다.
SET LOCAL lock_timeout = '5s';

-- 기존 16열 이름·타입·순서 유지, 끝에만 1열 추가(CREATE OR REPLACE 규칙). 형식 검사는 API 한 곳(academic_photo.photo_name).
-- photo_file 은 학사 사진 서버의 파일명이다. 어떤 API 응답에도 내지 않는다(프록시 URL 만 낸다).
-- local 원천(테스트 계정)의 photo 는 실학생 값 복사본이라 다른 사람 얼굴이 붙는다(2026-11-27 집계: local 7/7 접두 불일치).
-- source 원천만 낸다. 학번 접두 강제는 source 의 정상 예외까지 숨길 수 있어 쓰지 않는다.
CREATE OR REPLACE VIEW dc.academic_student_details AS
SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
       a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year,
       a.post AS post_code, a.addr1 AS address,
       a.enter_dt AS admission_date, a.isu_smt_cnt AS completed_semesters, a.age AS birth_date, a.tel AS home_phone,
       CASE WHEN a.origin = 'source' THEN a.photo END AS photo_file
FROM academic.usr_inf a
WHERE a.user_ty_cd = '0001';
