-- Additive only. Rollback: disable the endpoints, preserve attendance and XP history.
SET LOCAL lock_timeout = '5s';
CREATE TABLE dc.quest_growth_account (
 student_uid text PRIMARY KEY REFERENCES dc.student(intg_uid),
 total_xp bigint NOT NULL DEFAULT 0 CHECK(total_xp>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dc.quest_attendance (
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 attended_on date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(student_uid,attended_on)
);
CREATE TABLE dc.growth_xp_event (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 source_type text NOT NULL CHECK(source_type IN ('ATTENDANCE','QUEST','PROGRAM')),
 source_key text NOT NULL CHECK(length(source_key) BETWEEN 1 AND 200),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
 reward_group text NOT NULL DEFAULT 'QUEST_XP_REWARD' CHECK(reward_group='QUEST_XP_REWARD'),
 reward_code text,
 reward_version integer CHECK(reward_version>0),
 requested_xp integer NOT NULL CHECK(requested_xp>=0),
 granted_xp integer NOT NULL CHECK(granted_xp BETWEEN 0 AND requested_xp),
 level_cap integer NOT NULL CHECK(level_cap>0),
 earned_on date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_uid,source_type,source_key),
 FOREIGN KEY(reward_group,reward_code) REFERENCES dc.code_item(group_code,code),
 CHECK((reward_code IS NULL)=(reward_version IS NULL))
);
CREATE INDEX growth_xp_event_daily ON dc.growth_xp_event(student_uid,earned_on) INCLUDE(granted_xp);
CREATE INDEX growth_xp_event_reward ON dc.growth_xp_event(reward_group,reward_code);
GRANT SELECT,INSERT,UPDATE ON dc.quest_growth_account TO dc_app;
GRANT SELECT,INSERT ON dc.quest_attendance,dc.growth_xp_event TO dc_app;
GRANT USAGE,SELECT ON SEQUENCE dc.growth_xp_event_id_seq TO dc_app;
