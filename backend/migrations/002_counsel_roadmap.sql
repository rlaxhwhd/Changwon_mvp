CREATE TABLE dc.staff (
    intg_uid text PRIMARY KEY REFERENCES dc.person(intg_uid), role_code text NOT NULL,
    profile jsonb NOT NULL, version integer NOT NULL DEFAULT 1
);
CREATE TABLE dc.counsel_request (
    id text PRIMARY KEY, student_uid text NOT NULL REFERENCES dc.student(intg_uid),
    counselor_uid text REFERENCES dc.staff(intg_uid),
    type_code text CHECK(type_code IN ('CAREER','JOB','PSY','PROF')),
    legacy_type text NOT NULL,
    care_track text CHECK(care_track IN ('general','care7')),
    status_code text NOT NULL CHECK(status_code IN ('REQ','CONFIRMED','DONE','CANCEL_UNKNOWN','CANCEL_STU','CANCEL_CNS')),
    method_code text NOT NULL CHECK(method_code IN ('ONLINE','OFFLINE')),
    topic text NOT NULL, requested_at timestamptz NOT NULL,
    slot_date date, slot_start time, slot_end time, place text,
    intake jsonb, snapshot jsonb NOT NULL, source_payload jsonb NOT NULL,
    completed_at timestamptz, version integer NOT NULL DEFAULT 1,
    CHECK(slot_end IS NULL OR slot_start < slot_end)
);
CREATE INDEX counsel_request_student ON dc.counsel_request(student_uid,requested_at DESC);
CREATE INDEX counsel_request_staff ON dc.counsel_request(counselor_uid,status_code,slot_date);
CREATE TABLE dc.counsel_record (
    id text PRIMARY KEY, request_id text NOT NULL UNIQUE REFERENCES dc.counsel_request(id),
    counselor_uid text NOT NULL REFERENCES dc.staff(intg_uid),
    summary text NOT NULL, comment text NOT NULL, follow_up text NOT NULL,
    status_code text NOT NULL CHECK(status_code IN ('DRAFT','DONE')),
    created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
    snapshot jsonb NOT NULL, version integer NOT NULL DEFAULT 1
);
CREATE TABLE dc.counsel_event (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id text NOT NULL REFERENCES dc.counsel_request(id),
    actor_uid text NOT NULL REFERENCES dc.person(intg_uid), kind text NOT NULL,
    payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dc.diagnosis_attempt (
    id text PRIMARY KEY, student_uid text NOT NULL REFERENCES dc.student(intg_uid),
    test_id text NOT NULL, attempt_no integer NOT NULL CHECK(attempt_no > 0),
    status_code text NOT NULL, started_at timestamptz NOT NULL, completed_at timestamptz,
    payload jsonb NOT NULL, source text NOT NULL DEFAULT 'fixture',
    UNIQUE(student_uid,test_id,attempt_no)
);
CREATE TABLE dc.diagnosis_result (
    student_uid text REFERENCES dc.student(intg_uid), test_id text NOT NULL, attempt_no integer NOT NULL,
    tested_at timestamptz NOT NULL, payload jsonb NOT NULL, source text NOT NULL DEFAULT 'fixture',
    PRIMARY KEY(student_uid,test_id,attempt_no),
    FOREIGN KEY(student_uid,test_id,attempt_no) REFERENCES dc.diagnosis_attempt(student_uid,test_id,attempt_no)
);
CREATE TABLE dc.student_type_event (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_uid text NOT NULL REFERENCES dc.student(intg_uid),
    student_type text NOT NULL CHECK(student_type IN ('T1','T2','T3','T4','T5','T6')),
    source text NOT NULL, actor_uid text REFERENCES dc.person(intg_uid),
    decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dc.program (
    id text PRIMARY KEY, title text NOT NULL, category text NOT NULL,
    status_label text NOT NULL, capacity integer NOT NULL CHECK(capacity >= 0),
    payload jsonb NOT NULL, version integer NOT NULL DEFAULT 1
);
CREATE TABLE dc.program_apply (
    program_id text REFERENCES dc.program(id), student_uid text REFERENCES dc.student(intg_uid),
    applied_at timestamptz NOT NULL, outcome text NOT NULL DEFAULT 'APPLIED'
        CHECK(outcome IN ('APPLIED','SELECTED','REJECTED','CANCELLED','COMPLETED','NO_SHOW')),
    snapshot jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
    PRIMARY KEY(program_id,student_uid)
);
CREATE TABLE dc.roadmap (
    student_uid text PRIMARY KEY REFERENCES dc.student(intg_uid),
    target_role text NOT NULL, target_company jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1, confirmed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid)
);
CREATE TABLE dc.roadmap_axis (
    student_uid text REFERENCES dc.roadmap(student_uid), axis text CHECK(axis IN ('IAP','CORE','GROWTH')),
    headline text NOT NULL, rationale text NOT NULL, PRIMARY KEY(student_uid,axis)
);
CREATE TABLE dc.roadmap_item (
    student_uid text NOT NULL, axis text NOT NULL, id text NOT NULL,
    position integer NOT NULL, title text NOT NULL, priority text NOT NULL,
    importance text NOT NULL, why text NOT NULL, status text NOT NULL CHECK(status IN ('TODO','DONE')),
    program_id text REFERENCES dc.program(id), entry text NOT NULL CHECK(entry IN ('NONE','RECOMMEND','REQUIRED')),
    expires_at timestamptz, version integer NOT NULL DEFAULT 1,
    PRIMARY KEY(student_uid,id), FOREIGN KEY(student_uid,axis) REFERENCES dc.roadmap_axis(student_uid,axis)
);
CREATE TABLE dc.roadmap_item_event (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_uid text NOT NULL, item_id text NOT NULL,
    actor_uid text REFERENCES dc.person(intg_uid), before_value jsonb NOT NULL, after_value jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dc.roadmap_snapshot (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_uid text NOT NULL REFERENCES dc.student(intg_uid),
    version integer NOT NULL, payload jsonb NOT NULL, actor_uid text REFERENCES dc.person(intg_uid),
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_uid,version)
);
CREATE TABLE dc.roadmap_request (
    id text PRIMARY KEY, student_uid text NOT NULL REFERENCES dc.student(intg_uid),
    axis text NOT NULL CHECK(axis IN ('IAP','CORE','GROWTH')), title text NOT NULL, reason text NOT NULL,
    status_code text NOT NULL, requested_at timestamptz NOT NULL, payload jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1
);
-- Append-only audit data is protected independently of application code.
CREATE FUNCTION dc.reject_history_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'History is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER counsel_event_immutable BEFORE UPDATE OR DELETE ON dc.counsel_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER roadmap_snapshot_immutable BEFORE UPDATE OR DELETE ON dc.roadmap_snapshot FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER roadmap_item_event_immutable BEFORE UPDATE OR DELETE ON dc.roadmap_item_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER student_type_event_immutable BEFORE UPDATE OR DELETE ON dc.student_type_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
GRANT SELECT ON ALL TABLES IN SCHEMA dc TO dc_app;
GRANT INSERT,UPDATE ON dc.counsel_request,dc.counsel_record,dc.roadmap,dc.roadmap_axis,dc.roadmap_item,
    dc.roadmap_request,dc.program,dc.program_apply,dc.staff TO dc_app;
GRANT DELETE ON dc.roadmap_item,dc.roadmap_axis TO dc_app;
GRANT INSERT ON dc.counsel_event,dc.roadmap_snapshot,dc.roadmap_item_event,dc.student_type_event,
    dc.diagnosis_attempt,dc.diagnosis_result TO dc_app;
