-- Existing API contract: a result belongs to the student on its request.
-- Keep scale values/tool-specific content flexible; validate only container types.
-- No data repair: inconsistent imports must fail and be reconciled from source.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE dc.psych_test_result
 ADD CONSTRAINT fk_psych_test_result_request_student
 FOREIGN KEY (request_id,student_uid) REFERENCES dc.counsel_request(id,student_uid) NOT VALID,
 ADD CONSTRAINT ck_psych_test_result_scales_array CHECK(jsonb_typeof(scales)='array') NOT VALID,
 ADD CONSTRAINT ck_psych_test_result_snapshot_object CHECK(jsonb_typeof(snapshot)='object') NOT VALID;
ALTER TABLE dc.psych_test_result VALIDATE CONSTRAINT fk_psych_test_result_request_student;
ALTER TABLE dc.psych_test_result VALIDATE CONSTRAINT ck_psych_test_result_scales_array;
ALTER TABLE dc.psych_test_result VALIDATE CONSTRAINT ck_psych_test_result_snapshot_object;
-- Keep request_id UNIQUE (one result per request); only the old FK is redundant.
ALTER TABLE dc.psych_test_result DROP CONSTRAINT psych_test_result_request_id_fkey;
-- Forward recovery, if needed: add back the request-only FK before dropping the
-- three new constraints in a NEW migration. Never discard or rewrite results.
