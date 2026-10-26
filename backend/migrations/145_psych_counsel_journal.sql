-- 심리상담 상담일지 양식([붙임 14] 상담일지 — 학생상담센터 제공, 2026-10-26 사용자 지시).
-- 진로취업 template(정성진단·AI 일지)과 업무 규칙이 달라 별도 열에 둔다. 기록 1건이 소유하는 문서 하나이며
-- JSON 키로 조회하지 않는다(093 과 같은 원칙). summary 에는 상담내용 본문을 함께 저장해 목록·검색·내보내기가 그대로 동작한다.
-- Rollback: 앱을 먼저 되돌리고 이 nullable 열은 남겨 둔다. 지워야 하면 값을 내보낸 뒤 새 마이그레이션으로 지운다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE dc.counsel_record ADD COLUMN psych_journal jsonb;
ALTER TABLE dc.counsel_record ADD CONSTRAINT counsel_record_psych_journal_object
  CHECK (psych_journal IS NULL OR (jsonb_typeof(psych_journal) = 'object' AND psych_journal->>'schemaVersion' = '1') IS TRUE);
