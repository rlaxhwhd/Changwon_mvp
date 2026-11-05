-- The teacher a student names when applying to a recommended job. NULL means none was chosen.
-- Kept per attempt: a reapplication can name someone else, and attempts are append-only.
-- Rollback: deploy the previous API while retaining these additive nullable columns.
ALTER TABLE dc.job_application_attempt
  ADD COLUMN recommender_uid text REFERENCES dc.staff(intg_uid),
  ADD COLUMN snap_recommender_name text,
  ADD CONSTRAINT attempt_recommender_snapshot CHECK ((recommender_uid IS NULL) = (snap_recommender_name IS NULL));
CREATE INDEX job_attempt_by_recommender ON dc.job_application_attempt(recommender_uid) WHERE recommender_uid IS NOT NULL;
