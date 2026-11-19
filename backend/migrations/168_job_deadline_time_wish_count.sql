-- 168: 채용공고 지원마감 시각 · 공고별 찜 집계 (2026-11-19 사용자 요청, 작업지시서 0016)
--
-- ① 마감일(deadline_date)에 시각을 더한다. 날짜 컬럼은 그대로 두고(인덱스·대시보드 쿼리 유지) 시각만 붙인다.
--    기존 공고는 23:59 — 지금처럼 그날 하루 끝까지 지원할 수 있다(사용자 확정). 분 단위로 판정한다.
--    상시(ALWAYS) 공고에서는 의미가 없는 값이다.
ALTER TABLE dc.job_posting
  ADD COLUMN deadline_time time(0) NOT NULL DEFAULT '23:59';
COMMENT ON COLUMN dc.job_posting.deadline_time IS
  'KST 벽시계 마감 시각(분 단위). deadline_date 와 합쳐 판정하며 그 분이 끝날 때까지 열림. ALWAYS·ON_HIRE 는 23:59 고정.';

-- ② 카드마다 찜한 학생 수를 낸다. PK 가 (student_uid,posting_id) 라 공고 기준 집계에 쓸 인덱스가 없다.
CREATE INDEX job_wishlist_posting ON dc.job_wishlist(posting_id,created_at DESC);
