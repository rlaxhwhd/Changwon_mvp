-- 채용공고 조회수 — 2026-11-23 사용자 확정(교내공고 관리 표의 「조회」 열).
-- 학생이 공고 상세를 연 날을 학생·공고·날짜(KST) 한 행으로 기록한다. 같은 날 다시 열어도 1회다.
-- 조회수는 이 행을 센다 — 공고 행에 집계값을 저장하지 않는다(CLAUDE.md 규칙 3).
-- Rollback: revert the app first; the additive table can stay. Never backfill invented views.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';

CREATE TABLE dc.job_posting_view (
 posting_id  text NOT NULL REFERENCES dc.job_posting(id),
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 viewed_on   date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
 created_at  timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(posting_id,viewed_on,student_uid)
);
GRANT SELECT,INSERT ON dc.job_posting_view TO dc_app;
