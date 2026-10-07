-- Additive metadata for real LLM comments. Existing immutable artifacts remain intact.
-- Rollback: deploy previous API/web; retain columns and generated history.
SET LOCAL lock_timeout = '5s';
ALTER TABLE dc.ai_run ADD COLUMN comment_scope text;
ALTER TABLE dc.ai_comment ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb
 CHECK(jsonb_typeof(metadata)='object');
-- Only new comment runs enter this initially empty partial index.
CREATE INDEX ai_run_comment_latest ON dc.ai_run
 (student_uid,kind_code,subject_kind,subject_id,comment_scope,created_at DESC,id DESC)
 WHERE comment_scope IS NOT NULL;
