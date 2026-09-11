-- 비교과 CHECK 두 개가 NULL·빈 배열을 통과시키던 구멍을 막는다.
--
-- PostgreSQL 의 CHECK 는 **false 만 거부하고 NULL 은 통과시킨다.** 그래서 아래 두 식은
-- 막으려던 조합을 실제로는 막지 못했다.
--
--   program_entry_needs_types  : array_length('{}',1) 은 0 이 아니라 NULL 이다.
--                                → roadmap_entry='REQUIRED' + care_types='{}' 가 통과했다.
--   apply_points_need_absence  : outcome_code 가 NULL 이면 `=`  비교가 NULL 이다.
--                                → absence_points=1 + outcome_code=NULL 이 통과했다.
--
-- 두 컬럼(care_types·absence_points)은 NOT NULL 이므로 구멍은 위 두 가지뿐이다.
-- 교정식은 cardinality() 와 IS NOT DISTINCT FROM 으로 NULL 을 값처럼 다룬다.
--
-- ★ 현재 위반 데이터는 각각 0 건이다(적용 전 조회). API 는 ProgramBody·OutcomeBody 가
--   막고 있었으므로 이것은 화면 결함 수정이 아니라 **DB 직접 적재·후속 서비스에 대한
--   방어**다. 그래서 데이터 보정 DML 이 없다 — 제약만 바꾼다.
--
-- 순서는 NOT VALID 추가 → VALIDATE → 옛 제약 제거다. 기존 행을 다시 훑는 잠금을
-- ACCESS EXCLUSIVE 로 잡지 않기 위해서다(VALIDATE 는 SHARE UPDATE EXCLUSIVE).
-- 근거: .ai/db/SCHEMA_REVIEW_2026-09-10.md §4 F3

ALTER TABLE dc.program
  ADD CONSTRAINT ck_program_entry_needs_types
  CHECK (roadmap_entry = 'NONE' OR cardinality(care_types) > 0) NOT VALID;
ALTER TABLE dc.program VALIDATE CONSTRAINT ck_program_entry_needs_types;
ALTER TABLE dc.program DROP CONSTRAINT program_entry_needs_types;

ALTER TABLE dc.program_apply
  ADD CONSTRAINT ck_program_apply_points_need_absence
  CHECK (absence_points = 0 OR outcome_code IS NOT DISTINCT FROM 'ABSENT') NOT VALID;
ALTER TABLE dc.program_apply VALIDATE CONSTRAINT ck_program_apply_points_need_absence;
ALTER TABLE dc.program_apply DROP CONSTRAINT apply_points_need_absence;
