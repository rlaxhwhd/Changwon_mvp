-- diagnosisResults.ts documents results seeded *before* an attempt (e.g. jiwoo).
-- These are test outcome templates, not evidence that a test was completed.
UPDATE dc.diagnosis_attempt SET status_code='PRECOMPUTED',completed_at=NULL,started_at=NULL,
 source='fixture:outcome',payload=payload || '{"precomputed":true}'::jsonb
WHERE source='fixture:result-only';
UPDATE dc.diagnosis_result r SET source='fixture:outcome'
FROM dc.diagnosis_attempt a WHERE a.student_uid=r.student_uid AND a.test_id=r.test_id
 AND a.attempt_no=r.attempt_no AND a.source='fixture:outcome';
UPDATE dc.import_issue SET code='PRECOMPUTED_RESULT',
 detail='Result template exists before an attempt; not exposed as a completed diagnosis.'
WHERE code='RESULT_WITHOUT_ATTEMPT';
