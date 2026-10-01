-- External result identity and immutable received revisions. Existing results remain intact.
-- Rollback: revert application images and restore view definitions from 042/094 in a
-- new migration. Retain these additive tables and all collected result history.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
ALTER TABLE dc.diagnosis_attempt ADD COLUMN provider_completed_at timestamptz;
CREATE TABLE dc.hrtest_result (
 test_id text NOT NULL CHECK(test_id IN ('ccore','c2','c3','c4')),
 external_id bigint NOT NULL CHECK(external_id>0),
 student_uid text NOT NULL REFERENCES dc.student,
 attempt_no integer NOT NULL,
 content_hash text NOT NULL,
 fetched_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(test_id,external_id),
 UNIQUE(student_uid,test_id,attempt_no),
 FOREIGN KEY(student_uid,test_id,attempt_no) REFERENCES dc.diagnosis_result
);
CREATE TABLE dc.hrtest_result_revision (
 test_id text NOT NULL,external_id bigint NOT NULL,
 content_hash text NOT NULL,payload jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(test_id,external_id,content_hash),
 FOREIGN KEY(test_id,external_id) REFERENCES dc.hrtest_result
);
CREATE TRIGGER hrtest_revision_immutable BEFORE UPDATE OR DELETE ON dc.hrtest_result_revision
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
GRANT SELECT,INSERT,UPDATE ON dc.hrtest_result TO dc_app;
GRANT SELECT,INSERT ON dc.hrtest_result_revision TO dc_app;
GRANT UPDATE ON dc.diagnosis_attempt,dc.diagnosis_result TO dc_app;

-- One shared selection for current results: actual results precede development history.
CREATE VIEW dc.current_diagnosis_attempt AS
SELECT DISTINCT ON (student_uid,test_id) * FROM dc.diagnosis_attempt
WHERE status_code<>'PRECOMPUTED'
ORDER BY student_uid,test_id,(source='hrtest') DESC,
 CASE WHEN source='hrtest' THEN provider_completed_at END DESC NULLS LAST,attempt_no DESC;
GRANT SELECT ON dc.current_diagnosis_attempt TO dc_app;
CREATE OR REPLACE VIEW dc.diagnosis_status AS
SELECT v.intg_uid,v.alias,v.name,v.student_no,v.major_label,v.grade,v.status AS enrollment_status,
 t.test_id,c.label AS test_name,a.id AS attempt_id,COALESCE(a.status_code,'NOT_STARTED') AS status_code,
 COALESCE(a.attempt_no,0) AS attempt_no,a.started_at,a.completed_at,a.payload->>'resultSummary' AS result_summary
FROM dc.student_list v LEFT JOIN dc.student_type_rule r ON r.code=v.student_type
CROSS JOIN LATERAL (SELECT 'ccore'::text AS test_id UNION SELECT lower(r.follow_up_test) WHERE r.follow_up_test IS NOT NULL) t
JOIN dc.code_item c ON c.group_code='DIAGNOSIS_TEST' AND c.code=upper(t.test_id)
LEFT JOIN dc.current_diagnosis_attempt a ON a.student_uid=v.intg_uid AND a.test_id=t.test_id;
CREATE OR REPLACE VIEW dc.current_student_type AS
SELECT DISTINCT ON (student_uid) * FROM dc.student_type_event
ORDER BY student_uid,(source='counsel') DESC,(source='hrtest') DESC,decided_at DESC,id DESC;
