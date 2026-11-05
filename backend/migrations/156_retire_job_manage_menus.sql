-- /jobs already links to registration and editing, so these two menus only repeat it.
-- Routes stay in place. Rollback in a new migration: reactivate jobs.1 and jobs.2, then restore their navConfig entries.
UPDATE dc.menu SET is_active=false,version=version+1 WHERE menu_code IN ('jobs.1','jobs.2');
