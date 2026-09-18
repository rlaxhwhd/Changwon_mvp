-- Additive schema only. Forward rollback: stop writes; retain learning history.
SET LOCAL lock_timeout = '5s';
CREATE TABLE dc.mission_question (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind text NOT NULL CHECK(kind IN ('TOEIC','NCS','GSAT')),
 prompt text NOT NULL CHECK(length(prompt) BETWEEN 1 AND 10000),
 category text NOT NULL DEFAULT '', content jsonb NOT NULL CHECK(jsonb_typeof(content)='object'),
 is_active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by text REFERENCES dc.person(intg_uid), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mission_question_kind ON dc.mission_question(kind,is_active,id);
CREATE INDEX mission_question_actor ON dc.mission_question(updated_by);
CREATE TABLE dc.mission_week (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 week_start date NOT NULL CHECK(extract(isodow FROM week_start)=1),
 kind text NOT NULL CHECK(kind IN ('TOEIC','NCS_GSAT')), title text NOT NULL,
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'), published boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by text NOT NULL REFERENCES dc.person(intg_uid), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(week_start,kind)
);
CREATE INDEX mission_week_actor ON dc.mission_week(updated_by);
CREATE TABLE dc.mission_attempt (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 week_id bigint NOT NULL REFERENCES dc.mission_week(id), week_version integer NOT NULL,
 title text NOT NULL, kind text NOT NULL, items jsonb NOT NULL, answers jsonb, result jsonb,
 started_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz,
 CHECK((submitted_at IS NULL)=(result IS NULL)), CHECK((submitted_at IS NULL)=(answers IS NULL))
);
CREATE INDEX mission_attempt_owner ON dc.mission_attempt(student_uid,started_at DESC,id);
CREATE INDEX mission_attempt_week ON dc.mission_attempt(week_id);
CREATE UNIQUE INDEX mission_attempt_open ON dc.mission_attempt(student_uid,week_id,week_version) WHERE submitted_at IS NULL;
GRANT SELECT,INSERT,UPDATE ON dc.mission_question,dc.mission_week,dc.mission_attempt TO dc_app;
GRANT USAGE,SELECT ON SEQUENCE dc.mission_question_id_seq,dc.mission_week_id_seq TO dc_app;
