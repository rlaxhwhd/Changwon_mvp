-- Forward only. Rollback: disable the new routes; retain blocking and audit data.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE dc.sms_blacklist (
 student_uid text PRIMARY KEY REFERENCES dc.student(intg_uid),
 blocked boolean NOT NULL,
 reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 1000),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text NOT NULL REFERENCES dc.person(intg_uid)
);
CREATE INDEX sms_blacklist_actor ON dc.sms_blacklist(updated_by);
CREATE INDEX sms_blacklist_active ON dc.sms_blacklist(updated_at DESC,student_uid) WHERE blocked;
CREATE TABLE dc.sms_blacklist_event (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_uid text NOT NULL REFERENCES dc.sms_blacklist(student_uid),
 blocked boolean NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 1000),
 version bigint NOT NULL CHECK(version>0),
 actor_uid text NOT NULL REFERENCES dc.person(intg_uid),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_uid,version)
);
CREATE INDEX sms_blacklist_event_actor ON dc.sms_blacklist_event(actor_uid);
CREATE TRIGGER sms_blacklist_event_immutable BEFORE UPDATE OR DELETE ON dc.sms_blacklist_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
GRANT SELECT,INSERT,UPDATE ON dc.sms_blacklist TO dc_app;
GRANT SELECT,INSERT ON dc.sms_blacklist_event TO dc_app;
GRANT USAGE ON SEQUENCE dc.sms_blacklist_event_id_seq TO dc_app;
