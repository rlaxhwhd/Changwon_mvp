-- 프로그램 관리의 「인증여부」 필터와 학생 명단 엑셀(2026-11-06 사용자 지시).
-- 참여 인증서 발급 여부는 등록 화면에만 있고 저장되지 않았다. 기존 프로그램은 화면 기본값인 발급으로 둔다.
-- 엑셀의 휴대전화·EMAIL 은 학사 v_usr_inf 를 읽는다 — 기존 뷰 끝에 열을 붙인다(147 과 같은 방식, 원본 쓰기 없음).
-- Rollback: API 의 certificate_issued·mobile·email 읽기를 되돌린 뒤 새 마이그레이션에서 컬럼을 지운다.
--           뷰는 CREATE OR REPLACE 로 열을 지울 수 없어 DROP VIEW → 147 정의로 CREATE VIEW → GRANT SELECT TO dc_app 순서로 한다.
SET LOCAL lock_timeout='3s';
ALTER TABLE dc.program ADD COLUMN certificate_issued boolean NOT NULL DEFAULT true;
CREATE OR REPLACE VIEW dc.academic_student_details AS
SELECT intg_uid, sex AS sex_code, grade AS academic_gpa, out_dt, for_yn AS foreigner_code, hp AS mobile, email
FROM academic.v_usr_inf
WHERE user_ty_cd IN ('1101','1102','1201','1202');
