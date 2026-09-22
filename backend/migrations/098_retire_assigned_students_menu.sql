-- Keep stable menu identifiers; student detail access uses students.1.
-- Rollback: restore the previous UI and growth VIEW_MENU, then reactivate students.0
-- and restore the students parent route to /students in a new migration.
UPDATE dc.menu SET is_active=false WHERE menu_code='students.0';
UPDATE dc.menu SET route='/students/all' WHERE menu_code='students';
