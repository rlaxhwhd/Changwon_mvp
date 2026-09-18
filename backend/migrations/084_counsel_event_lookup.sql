-- /counsel-events?requestId=... joins by request and orders by created_at,id.
-- The full index also supports the request FK; an event-kind partial index would not.
-- Transactional migrator: bounded lock wait, atomic rollback. For large live tables
-- prebuild the identical index CONCURRENTLY using the documented deployment plan.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE INDEX IF NOT EXISTS ix_counsel_event_request_timeline
 ON dc.counsel_event(request_id,created_at,id);
-- Recovery: a new migration may DROP INDEX dc.ix_counsel_event_request_timeline.
-- No rows, unique constraints, or access controls are changed.
