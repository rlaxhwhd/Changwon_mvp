-- Retire the standalone schedule menu without renumbering existing menu codes.
-- Rollback in a new migration: reactivate counsel.1 after restoring the standalone route.
UPDATE dc.menu SET is_active=false WHERE menu_code='counsel.1';
