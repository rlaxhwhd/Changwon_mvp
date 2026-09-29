-- Isolated display examples for explicitly registered development fixtures.
-- No changes to course/program allocations or the official accumulation views.
-- Rollback: stop reading this table; preserve rows for audit/recovery.
SET LOCAL lock_timeout='3s';
CREATE TABLE dc.development_core_competency_score (
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 competency_code text NOT NULL REFERENCES dc.core_competency(code),
 score numeric(5,2) NOT NULL CHECK(score BETWEEN 0 AND 100),
 source text NOT NULL DEFAULT 'DEVELOPMENT_CARE7_TEST' CHECK(source='DEVELOPMENT_CARE7_TEST'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(student_uid,competency_code)
);
GRANT SELECT ON dc.development_core_competency_score TO dc_app;
