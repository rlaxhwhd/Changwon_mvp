-- 171 added menu_auth rows without advancing the role aggregate version (088).
-- Reject menu-management forms loaded before that change instead of allowing
-- their full-set replacement to silently remove the new grants.
-- 171 is already applied locally and must remain immutable.
-- Deploy 171+172 with menu-management writes stopped; the migration runner
-- commits all pending files in one transaction. Restart/reload clients after.
SET LOCAL lock_timeout='3s';

-- Match save_role_menus' aggregate lock, in deterministic order. Include the
-- student role even if its grants were removed after 171, plus any recipient
-- of the parent/new menus. Do not create or restore any permission grants.
SELECT r.role_code FROM dc.auth_role r
 WHERE r.role_code='student' OR EXISTS (
   SELECT 1 FROM dc.menu_auth a WHERE a.role_code=r.role_code
     AND a.menu_code IN ('stu-jobs.3','stu-jobs.3.2','stu-jobs.3.3','stu-jobs.3.4'))
 ORDER BY r.role_code FOR UPDATE OF r;

UPDATE dc.auth_role r SET version=version+1
 WHERE r.role_code='student' OR EXISTS (
   SELECT 1 FROM dc.menu_auth a WHERE a.role_code=r.role_code
     AND a.menu_code IN ('stu-jobs.3','stu-jobs.3.2','stu-jobs.3.3','stu-jobs.3.4'));

-- One-time invalidation, tracked by schema_migration. Never roll versions back;
-- an additional execution only invalidates stale forms again. No data loss.
