-- student_login_source filters by its COALESCE student_no OR intg_uid.
-- Preserve duplicate rows: login must still reject ambiguous identities.
-- The local academic mirror currently has ~114k rows and is not written by the API.
-- Rollback: retain indexes when rolling back the app; drop only via a new migration.
SET LOCAL lock_timeout = '5s';
CREATE INDEX ix_academic_user_login_number ON academic.v_usr_inf
  ((COALESCE(NULLIF(login_id::text, ''), intg_uid::text)));
CREATE INDEX ix_academic_user_intg_uid ON academic.v_usr_inf (intg_uid);
ANALYZE academic.v_usr_inf;
