-- Representative portfolio: a student marks at most one live portfolio as representative.
-- Staff with student-detail access read only that one. Design: .ai/handoff-db/0011-portfolio-representative.
-- Runs inside migrate.py's single transaction, so no CONCURRENTLY. Table is tiny (<=20 rows per student).
-- Rollback: revert the app first (old app never reads the column). Column, CHECK and index are harmless.
-- Narrow the event CHECK only when no REPRESENT/UNREPRESENT rows exist.

ALTER TABLE dc.student_portfolio
 ADD COLUMN is_representative boolean NOT NULL DEFAULT false,
 ADD CONSTRAINT ck_student_portfolio_representative_live CHECK(NOT is_representative OR deleted_at IS NULL);

-- One representative per student. Deleted rows cannot be representative (CHECK above).
CREATE UNIQUE INDEX uq_student_portfolio_representative ON dc.student_portfolio(student_uid)
 WHERE is_representative;

ALTER TABLE dc.student_portfolio_event
 DROP CONSTRAINT student_portfolio_event_action_check,
 ADD CONSTRAINT student_portfolio_event_action_check
  CHECK(action IN ('CREATE','DELETE','REPRESENT','UNREPRESENT'));
