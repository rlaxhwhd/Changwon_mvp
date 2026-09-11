INSERT INTO dc.advisor_assignment(id,student_uid,professor_uid,assigned_by_uid,assigned_on,snapshot)
SELECT md5('advisor-fixture:'||(j->>'id'))::uuid,st.intg_uid,pf.intg_uid,actor.intg_uid,
       (j->>'assignedAt')::date,j->'snapshot'||jsonb_build_object('professorName',j->>'professorName')
FROM dc.seed_source src CROSS JOIN LATERAL jsonb_array_elements(src.payload) j
JOIN dc.person sp ON sp.alias=j->>'studentId' JOIN dc.student st ON st.intg_uid=sp.intg_uid
JOIN dc.person pp ON pp.alias=j->>'professorId' JOIN dc.staff pf ON pf.intg_uid=pp.intg_uid
JOIN dc.person actor ON actor.alias=j->>'by'
WHERE src.path='src_admin/data/advisorAssigns.seed.json' AND j->>'status'='active'
ON CONFLICT (id) DO NOTHING;

DELETE FROM dc.fixture_student_scope WHERE source='fixture:advisor-assignment';

INSERT INTO dc.org_assignment(id,staff_uid,college_code,dept_code,role_code,valid_from,updated_by)
SELECT md5('org-fixture:'||v.alias||':'||v.dept)::uuid,s.intg_uid,split_part(v.dept,':',1),split_part(v.dept,':',2),
       'assistant',DATE '2026-03-02','local:system-admin'
FROM (VALUES ('asst_kim','C07:C07-07'),('asst_kim','C05:C05-03'),('asst_park','C05:C05-03')) v(alias,dept)
JOIN dc.person p ON p.alias=v.alias JOIN dc.staff s ON s.intg_uid=p.intg_uid
ON CONFLICT DO NOTHING;

INSERT INTO dc.org_assignment(id,staff_uid,college_code,dept_code,role_code,valid_from,updated_by)
SELECT md5('org-fixture:professor:'||p.alias||':'||d.dept_code)::uuid,s.intg_uid,d.college_code,d.dept_code,
       'professor',DATE '2026-03-02','local:system-admin'
FROM dc.staff s JOIN dc.person p USING(intg_uid) JOIN dc.department d ON d.dept_name=s.profile->>'dept'
WHERE s.role_code='professor'
  AND (SELECT count(*) FROM dc.department x WHERE x.dept_name=s.profile->>'dept')=1
ON CONFLICT DO NOTHING;
