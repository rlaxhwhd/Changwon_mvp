-- Additive configuration and immutable award references. Rollback: disable new routes,
-- retain assignments/completions and XP history; never delete earned student records.
SET LOCAL lock_timeout = '5s';
ALTER TABLE dc.mission_week DROP CONSTRAINT mission_week_selection_limit_check;
ALTER TABLE dc.mission_week ADD CONSTRAINT mission_week_selection_limit_check CHECK(selection_limit BETWEEN 1 AND 20);
ALTER TABLE dc.mission_week ADD COLUMN quest_pass_count smallint CHECK(quest_pass_count BETWEEN 1 AND 20);
ALTER TABLE dc.mission_attempt ADD COLUMN quest_pass_count smallint CHECK(quest_pass_count BETWEEN 1 AND 20);

CREATE TABLE dc.quest_definition (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 description text NOT NULL CHECK(length(description)<=3000),
 activity text NOT NULL CHECK(activity IN ('ATTENDANCE','PROGRAM','COUNSEL','CERTIFICATE','AI_RESUME','JOB_APPLY')),
 target_count integer NOT NULL CHECK(target_count BETWEEN 1 AND 1000),
 xp integer NOT NULL CHECK(xp BETWEEN 0 AND 100000),
 is_active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by text NOT NULL REFERENCES dc.person(intg_uid),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quest_definition_active ON dc.quest_definition(is_active,id DESC);
CREATE INDEX quest_definition_actor ON dc.quest_definition(updated_by);
CREATE TABLE dc.quest_assignment (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 period text NOT NULL CHECK(period IN ('MONTHLY','SEMESTER')),
 period_key text NOT NULL,
 starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on),
 audience text NOT NULL CHECK(audience IN ('ALL','FILTERED')),
 grades integer[] NOT NULL DEFAULT '{}',
 student_types text[] NOT NULL DEFAULT '{}',
 published boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by text NOT NULL REFERENCES dc.person(intg_uid),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(grades <@ ARRAY[1,2,3,4]),
 CHECK(student_types <@ ARRAY['T1','T2','T3','T4','T5','T6','UNDIAGNOSED']),
 CHECK((audience='ALL' AND cardinality(grades)=0 AND cardinality(student_types)=0)
    OR (audience='FILTERED' AND (cardinality(grades)>0 OR cardinality(student_types)>0)))
);
CREATE INDEX quest_assignment_period ON dc.quest_assignment(period,period_key,id DESC);
CREATE INDEX quest_assignment_live ON dc.quest_assignment(starts_on,ends_on) WHERE published;
CREATE INDEX quest_assignment_actor ON dc.quest_assignment(updated_by);
CREATE TABLE dc.quest_assignment_item (
 assignment_id bigint NOT NULL REFERENCES dc.quest_assignment(id),
 quest_id bigint NOT NULL REFERENCES dc.quest_definition(id),
 position integer NOT NULL CHECK(position>=0),
 title text NOT NULL, description text NOT NULL, activity text NOT NULL,
 target_count integer NOT NULL CHECK(target_count BETWEEN 1 AND 1000),
 xp integer NOT NULL CHECK(xp BETWEEN 0 AND 100000),
 definition_version integer NOT NULL CHECK(definition_version>0),
 PRIMARY KEY(assignment_id,quest_id), UNIQUE(assignment_id,position)
);
CREATE INDEX quest_assignment_item_definition ON dc.quest_assignment_item(quest_id);
CREATE TABLE dc.quest_completion (
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 assignment_id bigint NOT NULL, quest_id bigint NOT NULL,
 completed_on date NOT NULL, granted_xp integer NOT NULL CHECK(granted_xp>=0),
 PRIMARY KEY(student_uid,assignment_id,quest_id),
 FOREIGN KEY(assignment_id,quest_id) REFERENCES dc.quest_assignment_item(assignment_id,quest_id)
);
CREATE INDEX quest_completion_item ON dc.quest_completion(assignment_id,quest_id);
GRANT SELECT,INSERT,UPDATE ON dc.quest_definition,dc.quest_assignment TO dc_app;
GRANT SELECT,INSERT,DELETE ON dc.quest_assignment_item TO dc_app;
GRANT SELECT,INSERT ON dc.quest_completion TO dc_app;
GRANT USAGE,SELECT ON SEQUENCE dc.quest_definition_id_seq,dc.quest_assignment_id_seq TO dc_app;
