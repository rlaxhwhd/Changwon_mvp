-- Do not revive synthetic/older diagnostic types when the current real Core result
-- is unusable. Keep all events, and preserve the established counseling priority.
-- Rollback: restore the view definition from 115 in a new forward migration.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE OR REPLACE VIEW dc.current_student_type AS
SELECT DISTINCT ON (e.student_uid) e.* FROM dc.student_type_event e
LEFT JOIN dc.current_diagnosis_attempt a
 ON a.student_uid=e.student_uid AND a.test_id='ccore' AND a.source='hrtest'
WHERE e.source='counsel' OR a.id IS NULL OR (e.source='hrtest' AND a.status_code='DONE')
ORDER BY e.student_uid,(e.source='counsel') DESC,(e.source='hrtest') DESC,e.decided_at DESC,e.id DESC;
