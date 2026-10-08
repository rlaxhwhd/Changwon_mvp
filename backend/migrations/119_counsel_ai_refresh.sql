-- UP: Durable per-student refresh requests; no personal journal content in this queue.
CREATE TABLE dc.counsel_ai_refresh (
 student_uid text PRIMARY KEY REFERENCES dc.student(intg_uid),
 requested_by text NOT NULL REFERENCES dc.person(intg_uid),
 revision bigint NOT NULL DEFAULT 1,
 processed_revision bigint NOT NULL DEFAULT 0,
 retry_at timestamptz NOT NULL DEFAULT now(),
 lease_id text,
 CHECK (processed_revision <= revision)
);
CREATE INDEX counsel_ai_refresh_pending ON dc.counsel_ai_refresh(retry_at)
 WHERE revision > processed_revision;
GRANT SELECT, INSERT, UPDATE ON dc.counsel_ai_refresh TO dc_app;
-- DOWN (manual forward migration): DROP TABLE dc.counsel_ai_refresh;
