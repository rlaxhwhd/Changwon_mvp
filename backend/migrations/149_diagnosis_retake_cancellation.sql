-- Preserve approvals and diagnostic results when a counselor revokes an unused grant.
-- Rollback: roll back the application first; keep cancellation history and columns.
-- Do not restore the old CHECK constraints while CANCELLED rows exist.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
ALTER TABLE dc.diagnosis_retake
 ADD COLUMN cancelled_at timestamptz,
 ADD COLUMN cancelled_by text REFERENCES dc.person(intg_uid),
 DROP CONSTRAINT diagnosis_retake_status_check,
 DROP CONSTRAINT diagnosis_retake_check,
 ADD CONSTRAINT diagnosis_retake_status_check CHECK(status IN ('PENDING','APPROVED','COMPLETED','CANCELLED')),
 ADD CONSTRAINT diagnosis_retake_check CHECK (
   (status='PENDING' AND approved_at IS NULL AND completed_attempt_id IS NULL AND cancelled_at IS NULL AND cancelled_by IS NULL)
   OR (status='APPROVED' AND approved_at IS NOT NULL AND completed_attempt_id IS NULL AND cancelled_at IS NULL AND cancelled_by IS NULL)
   OR (status='COMPLETED' AND approved_at IS NOT NULL AND completed_attempt_id IS NOT NULL AND cancelled_at IS NULL AND cancelled_by IS NULL)
   OR (status='CANCELLED' AND approved_at IS NOT NULL AND completed_attempt_id IS NULL AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
 );
CREATE INDEX diagnosis_retake_canceller ON dc.diagnosis_retake(cancelled_by) WHERE cancelled_by IS NOT NULL;
