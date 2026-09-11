-- The legacy student request DTO calls this field professorId.
UPDATE dc.counsel_request r SET counselor_uid=p.intg_uid
FROM dc.person p JOIN dc.staff s USING(intg_uid)
WHERE r.type_code='PROF' AND r.counselor_uid IS NULL
  AND p.alias=r.source_payload->>'professorId' AND s.role_code='professor';
INSERT INTO dc.staff_student_scope(staff_uid,student_uid,source)
SELECT DISTINCT counselor_uid,student_uid,'fixture:professor-request'
FROM dc.counsel_request WHERE type_code='PROF' AND counselor_uid IS NOT NULL
ON CONFLICT DO NOTHING;
