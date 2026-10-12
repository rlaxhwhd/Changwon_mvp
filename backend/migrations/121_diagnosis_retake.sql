-- Additive. Roll back application code first; preserve requests as audit history.
SET LOCAL lock_timeout='3s';
CREATE TABLE dc.diagnosis_retake (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 test_id text NOT NULL CHECK(test_id IN ('ccore','c1','c2','c3','c4','c5','c6')),
 roadmap_version integer,
 source text NOT NULL CHECK(source IN ('STUDENT','COUNSELOR','PROGRESS')),
 status text NOT NULL CHECK(status IN ('PENDING','APPROVED','COMPLETED')),
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 approved_at timestamptz,
 approved_by text REFERENCES dc.person(intg_uid),
 completed_attempt_id text REFERENCES dc.diagnosis_attempt(id),
 CHECK ((status='PENDING' AND approved_at IS NULL AND completed_attempt_id IS NULL)
     OR (status='APPROVED' AND approved_at IS NOT NULL AND completed_attempt_id IS NULL)
     OR (status='COMPLETED' AND approved_at IS NOT NULL AND completed_attempt_id IS NOT NULL))
);
CREATE UNIQUE INDEX diagnosis_retake_open ON dc.diagnosis_retake(student_uid,test_id) WHERE status IN ('PENDING','APPROVED');
CREATE UNIQUE INDEX diagnosis_retake_progress ON dc.diagnosis_retake(student_uid,roadmap_version) WHERE source='PROGRESS';
CREATE INDEX diagnosis_retake_student_history ON dc.diagnosis_retake(student_uid,id DESC);
CREATE INDEX diagnosis_retake_pending ON dc.diagnosis_retake(requested_at,id) WHERE status='PENDING';
CREATE INDEX diagnosis_retake_actor ON dc.diagnosis_retake(approved_by);
CREATE INDEX diagnosis_retake_attempt ON dc.diagnosis_retake(completed_attempt_id);
GRANT SELECT,INSERT,UPDATE ON dc.diagnosis_retake TO dc_app;
GRANT USAGE,SELECT ON SEQUENCE dc.diagnosis_retake_id_seq TO dc_app;
