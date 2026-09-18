-- Additive configuration. Existing selections are preserved even if above the new UI cap.
-- Rollback: previous API ignores this column; retain the column and all question data.
SET LOCAL lock_timeout = '5s';
ALTER TABLE dc.mission_week ADD COLUMN selection_limit smallint NOT NULL DEFAULT 20
 CHECK(selection_limit IN (10,20));
