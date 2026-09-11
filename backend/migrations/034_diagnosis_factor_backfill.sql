-- Only exact stable codes or original definition labels; never reinterpret scores.
INSERT INTO dc.diagnosis_result_factor
SELECT r.student_uid,r.test_id,r.attempt_no,(f.n-1)::integer,d.test_code,d.factor_code,d.definition_version
FROM dc.diagnosis_result r
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.payload->'factors','[]')) WITH ORDINALITY f(value,n)
JOIN dc.diagnosis_factor_definition d ON d.test_code=upper(r.test_id)
 AND (f.value->>'factorCode'=d.factor_code OR
      (f.value->>'factorCode' IS NULL AND f.value->>'name'=d.label))
ON CONFLICT DO NOTHING;
