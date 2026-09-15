-- Academic affiliation is not an operational counseling assignment.
-- Keep immutable 073 history, but retire only its untouched professor seeds.
ALTER TABLE dc.department_staff_assignment ADD COLUMN source text NOT NULL DEFAULT 'manual'
 CHECK (source IN ('manual','legacy','academic_assistant','academic_professor_retired'));

UPDATE dc.department_staff_assignment SET source='legacy' WHERE legacy_id IS NOT NULL;
UPDATE dc.department_staff_assignment SET source='academic_assistant'
 WHERE role_code='assistant' AND legacy_id IS NULL AND updated_by IS NULL
 AND created_at=(SELECT applied_at FROM dc.schema_migration WHERE version='071_department_staff_management.sql');

UPDATE dc.department_staff_assignment a
 SET source='academic_professor_retired',is_active=false,version=version+1,updated_at=now()
 WHERE role_code='professor' AND legacy_id IS NULL AND updated_by IS NULL AND version=1
 AND created_at=(SELECT applied_at FROM dc.schema_migration WHERE version='073_department_staff_source_assignments.sql')
 AND NOT EXISTS (SELECT 1 FROM dc.admin_event e
   WHERE e.entity='department_staff_assignment' AND e.entity_id=a.id::text);

ALTER TABLE dc.department_staff_assignment ADD CONSTRAINT retired_professor_assignment_inactive
 CHECK (source <> 'academic_professor_retired' OR NOT is_active);

-- Do not retain artificial whole-department rows solely for retired seeds.
CREATE OR REPLACE VIEW dc.department_assignment_whole_targets AS
SELECT DISTINCT c.dept_cd AS college_code,c.dept_nm AS college_name,d.dept_cd AS dept_code,d.dept_nm AS dept_name,
 ''::text AS major_code,NULL::text AS major_name
FROM dc.academic_organizations d JOIN dc.academic_organizations c ON c.dept_cd=d.dept_up_cd AND c.lvl='1'
WHERE d.lvl='2' AND d.use_yn='Y' AND c.use_yn='Y'
 AND EXISTS (SELECT 1 FROM dc.department_staff_assignment a
   WHERE a.college_code=c.dept_cd AND a.dept_code=d.dept_cd AND a.major_code='' AND a.is_active);
