-- 프로그램 공고에 담당자 연락처를 싣는다. 담당자 행(프로그램×교직원)마다 등록 화면에서 고친다.
-- 전산원 교직원 뷰가 들어오면 사번으로 기본값을 채울 예정이며, 그 전까지는 비어 있다(NULL).
-- Rollback: deploy the previous API while retaining this additive nullable column.
ALTER TABLE dc.program_manager ADD COLUMN phone text CHECK (phone ~ '^[0-9+() -]{1,30}$');
