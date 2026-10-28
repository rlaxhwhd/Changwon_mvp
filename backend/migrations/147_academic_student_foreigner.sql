-- 학생 상세정보 모달의 「외국인」 칸(2026-10-28 사용자 지시). 학사 v_usr_inf.for_yn(Y/N)을 읽기 모델에 더한다.
-- 원본 쓰기·권한 확대 없음 — 기존 뷰 끝에 열 하나를 붙인다(CREATE OR REPLACE 는 끝에 추가만 허용).
-- Rollback: API 의 foreigner 읽기를 되돌린 뒤 새 마이그레이션에서 097 정의로 뷰를 다시 만든다.
SET LOCAL lock_timeout='3s';
CREATE OR REPLACE VIEW dc.academic_student_details AS
SELECT intg_uid, sex AS sex_code, grade AS academic_gpa, out_dt, for_yn AS foreigner_code
FROM academic.v_usr_inf
WHERE user_ty_cd IN ('1101','1102','1201','1202');
