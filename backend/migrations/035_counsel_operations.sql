-- New tables only. Existing staff/person and counsel_event remain canonical.
-- Recovery is forward-only; stop new writes before reverting the application.
CREATE TABLE dc.counsel_schedule (
 staff_uid text PRIMARY KEY REFERENCES dc.staff, version bigint NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE TABLE dc.counsel_schedule_slot (
 id text PRIMARY KEY, staff_uid text NOT NULL REFERENCES dc.counsel_schedule,
 kind text NOT NULL CHECK(kind IN ('AVAILABLE','EXCLUDED')),
 weekday integer NOT NULL CHECK(weekday BETWEEN 0 AND 6),
 start_time time NOT NULL, end_time time NOT NULL, CHECK(start_time<end_time),
 UNIQUE(staff_uid,kind,weekday,start_time,end_time)
);
CREATE INDEX ix_schedule_lookup ON dc.counsel_schedule_slot(staff_uid,weekday,kind,start_time,end_time);
CREATE TABLE dc.group_counsel (
 id text PRIMARY KEY, counselor_uid text NOT NULL REFERENCES dc.staff,
 kind text NOT NULL CHECK(kind IN ('CAREER','PSYCH')),
 title text NOT NULL CHECK(btrim(title)<>''), topic text NOT NULL, session_date date NOT NULL,
 start_time time NOT NULL,end_time time NOT NULL,CHECK(start_time<end_time),
 place text NOT NULL,capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000),
 status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','DONE','CANCELLED')),
 test_code text,summary text,comment text,cancel_reason text,
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'CANCELLED' OR (cancel_reason IS NOT NULL AND btrim(cancel_reason)<>'')),
 CHECK(status<>'DONE' OR (summary IS NOT NULL AND btrim(summary)<>'' AND comment IS NOT NULL AND btrim(comment)<>''))
);
CREATE INDEX ix_group_counsel_owner ON dc.group_counsel(counselor_uid,session_date DESC,id);
CREATE TABLE dc.group_counsel_member (
 group_id text NOT NULL REFERENCES dc.group_counsel,student_uid text NOT NULL REFERENCES dc.student,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 attended boolean,added_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(group_id,student_uid)
);
CREATE INDEX ix_group_member_student ON dc.group_counsel_member(student_uid,group_id);
CREATE TABLE dc.counsel_operation_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),staff_uid text NOT NULL REFERENCES dc.staff,
 entity text NOT NULL CHECK(entity IN ('PROFILE','SCHEDULE','GROUP')),
 entity_id text NOT NULL,action text NOT NULL,before_value jsonb,after_value jsonb NOT NULL,
 actor_uid text NOT NULL REFERENCES dc.person,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_counsel_operation_history ON dc.counsel_operation_event(staff_uid,created_at DESC,id);
CREATE TRIGGER counsel_operation_immutable BEFORE UPDATE OR DELETE ON dc.counsel_operation_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
-- Capacity also holds for direct imports, not just API writes.
CREATE FUNCTION dc.guard_group_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; maximum integer;
BEGIN
 IF TG_TABLE_NAME='group_counsel' THEN target:=NEW.id; ELSE target:=NEW.group_id; END IF;
 SELECT capacity INTO maximum FROM dc.group_counsel WHERE id=target FOR UPDATE;
 IF (SELECT count(*) FROM dc.group_counsel_member WHERE group_id=target)>maximum THEN
  RAISE EXCEPTION 'Group capacity exceeded' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER group_capacity AFTER INSERT OR UPDATE ON dc.group_counsel_member
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.guard_group_capacity();
CREATE CONSTRAINT TRIGGER group_capacity_change AFTER UPDATE ON dc.group_counsel
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.guard_group_capacity();
GRANT SELECT,INSERT,UPDATE ON dc.counsel_schedule,dc.group_counsel,dc.group_counsel_member TO dc_app;
GRANT SELECT,INSERT,DELETE ON dc.counsel_schedule_slot TO dc_app;
GRANT DELETE ON dc.group_counsel_member TO dc_app;
GRANT SELECT,INSERT ON dc.counsel_operation_event TO dc_app;
