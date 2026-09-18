-- Additive lookup indexes for the shared student/counselor journal store.
-- Existing 025/026 data, ownership, history, and grants remain authoritative.
-- Transactional runner: fail quickly rather than queue behind active writers.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE INDEX growth_entry_timeline ON dc.growth_entry
  (student_uid, occurred_on DESC NULLS LAST, updated_at DESC, id)
  WHERE deleted_at IS NULL;
CREATE INDEX growth_entry_kind_timeline ON dc.growth_entry
  (student_uid, kind_code, occurred_on DESC NULLS LAST, updated_at DESC, id)
  WHERE deleted_at IS NULL;
-- Rollback: revert application changes; indexes are compatible with previous code.
-- If removal is required, use a NEW migration dropping these two indexes only.
-- No table/content deletion or backfill is required.
