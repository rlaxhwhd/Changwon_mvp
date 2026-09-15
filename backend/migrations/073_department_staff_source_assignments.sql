-- Primary professor appointments use source codes, never name matching.
-- Snapshot once: later manual releases must not be recreated on each mirror refresh.
INSERT INTO dc.department_staff_assignment(college_code,dept_code,major_code,staff_uid,role_code,snapshot)
SELECT DISTINCT c.dept_cd,d.dept_cd,COALESCE(NULLIF(p.major_cd,''),''),candidate.staff_uid,'professor',
 jsonb_build_object('name',candidate.name,'employee_no',candidate.employee_no,'mobile',candidate.mobile,'phone',candidate.phone)
FROM dc.academic_people p JOIN dc.department_staff_candidates candidate
 ON candidate.staff_uid=p.intg_uid AND candidate.role_code='professor' AND candidate.is_active
JOIN dc.academic_organizations d ON d.dept_cd=COALESCE(NULLIF(p.hakbu_cd,''),p.orgid) AND d.lvl='2' AND d.use_yn='Y'
JOIN dc.academic_organizations c ON c.dept_cd=d.dept_up_cd AND c.lvl='1' AND c.use_yn='Y'
WHERE NULLIF(p.major_cd,'') IS NULL OR EXISTS (SELECT 1 FROM dc.department_assignment_targets t
 WHERE (t.college_code,t.dept_code,t.major_code)=(c.dept_cd,d.dept_cd,p.major_cd))
ON CONFLICT DO NOTHING;

CREATE VIEW dc.department_assignment_whole_targets AS
SELECT DISTINCT c.dept_cd AS college_code,c.dept_nm AS college_name,d.dept_cd AS dept_code,d.dept_nm AS dept_name,
 ''::text AS major_code,NULL::text AS major_name
FROM dc.academic_organizations d JOIN dc.academic_organizations c ON c.dept_cd=d.dept_up_cd AND c.lvl='1'
WHERE d.lvl='2' AND d.use_yn='Y' AND c.use_yn='Y'
 AND EXISTS (SELECT 1 FROM dc.department_staff_assignment a WHERE a.college_code=c.dept_cd AND a.dept_code=d.dept_cd AND a.major_code='');
GRANT SELECT ON dc.department_assignment_whole_targets TO dc_app;

CREATE OR REPLACE VIEW dc.department_assignment_student_scope AS
SELECT DISTINCT a.staff_uid,s.intg_uid AS student_uid,a.role_code
FROM dc.department_staff_assignment a JOIN dc.staff staff ON staff.intg_uid=a.staff_uid AND staff.role_code=a.role_code
JOIN dc.student s ON (s.college_code,s.dept_code)=(a.college_code,a.dept_code)
WHERE a.is_active AND a.legacy_id IS NULL
 AND NOT EXISTS(SELECT 1 FROM dc.department_staff_candidates c WHERE c.staff_uid=a.staff_uid AND NOT c.is_active)
 AND (a.major_code='' OR EXISTS (SELECT 1 FROM dc.academic_people p WHERE p.intg_uid=s.intg_uid AND p.major_cd=a.major_code));
