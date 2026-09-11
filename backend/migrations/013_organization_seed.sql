-- Join by unique organization CODE only. Never infer codes from department names.
INSERT INTO dc.org_assignment(id,staff_uid,college_code,dept_code,role_code,valid_from,valid_to,is_active)
SELECT md5('org-fixture:'||(j->>'id'))::uuid,p.intg_uid,d.college_code,d.dept_code,j->>'role',
 (j->>'assignedAt')::date,(j->>'releasedAt')::date,(j->>'status')='active'
FROM dc.seed_source s CROSS JOIN LATERAL jsonb_array_elements(s.payload) j
JOIN dc.person p ON p.alias=j->>'intgUid' JOIN dc.staff f ON f.intg_uid=p.intg_uid
JOIN dc.department d ON d.dept_code=j->>'deptCode'
WHERE s.path='src_admin/data/deptAssigns.seed.json'
 AND (SELECT count(*) FROM dc.department x WHERE x.dept_code=j->>'deptCode')=1
ON CONFLICT DO NOTHING;
