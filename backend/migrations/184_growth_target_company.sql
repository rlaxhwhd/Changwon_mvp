-- 0027: 학생이 직접 적은 목표 기업. Astra 승인(0027 architecture-review rev2).
-- 롤백(forward-only 관례, 필요 시 수동): ① API·화면을 0027 이전으로 되돌린다(키 제거)
--   ② ALTER TABLE dc.growth_profile DROP COLUMN target_company;  — 학생 입력값이 사라진다. growth_event 이력은 남는다.
SET LOCAL lock_timeout = '5s';

ALTER TABLE dc.growth_profile
  ADD COLUMN target_company text,
  ADD CONSTRAINT ck_growth_profile_target_company CHECK (
    target_company IS NULL
    OR (char_length(target_company) BETWEEN 1 AND 200
        AND target_company = btrim(target_company)
        AND target_company !~ '[[:cntrl:]]'));

COMMENT ON COLUMN dc.growth_profile.target_company IS
 '학생이 직접 적은 목표 기업(0027). 확정 로드맵에 상담사가 정한 기업({"name"})이 있으면 화면은 그쪽을 보이고 이 값은 보존만 한다. 로드맵 값을 여기 복사하지 않고, 이 값을 로드맵·회사 제출 문서로 옮기지 않는다.';
