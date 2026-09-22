-- 2026-09-22: both counselor roles share student, diagnosis and roadmap work.
-- Rollback: restore menu_auth for these menu codes from the pre-migration backup
-- in a new migration, and deploy the former application access policy together.
INSERT INTO dc.menu_auth(menu_code,role_code)
SELECT m.menu_code,r.role_code FROM dc.menu m
CROSS JOIN (VALUES ('career'),('psych')) r(role_code)
WHERE m.is_active AND (m.menu_code IN ('students','students.1','diagnosis','diagnosis.0','roadmap')
  OR m.parent_code='roadmap' OR m.menu_code='counsel.4')
ON CONFLICT DO NOTHING;
