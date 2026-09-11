-- Resolve legacy labels once. Runtime directory membership uses organization codes only.
-- Existing personnel assignments (including expired assignments) always take precedence.
INSERT INTO dc.org_assignment(staff_uid,college_code,dept_code,role_code,valid_from)
SELECT s.intg_uid,d.college_code,d.dept_code,'professor',CURRENT_DATE
FROM dc.staff s JOIN dc.department d
 ON d.college_name=s.profile->>'collegeName' AND d.dept_name=s.profile->>'dept'
WHERE s.role_code='professor'
 AND NOT EXISTS(SELECT 1 FROM dc.org_assignment a WHERE a.staff_uid=s.intg_uid AND a.role_code='professor')
 AND (SELECT count(*) FROM dc.department x WHERE x.college_name=s.profile->>'collegeName'
      AND x.dept_name=s.profile->>'dept')=1
ON CONFLICT DO NOTHING;

INSERT INTO dc.import_issue(source_path,source_key,code,detail)
SELECT src.path,p.alias,'PROFESSOR_ORG_UNRESOLVED',
 concat_ws(' / ',s.profile->>'collegeName',s.profile->>'dept')
FROM dc.staff s JOIN dc.person p USING(intg_uid)
JOIN dc.seed_source src ON src.path='src_v2/data/professors.seed.json'
WHERE s.role_code='professor'
 AND NOT EXISTS(SELECT 1 FROM dc.org_assignment a WHERE a.staff_uid=s.intg_uid AND a.role_code='professor')
ON CONFLICT DO NOTHING;
