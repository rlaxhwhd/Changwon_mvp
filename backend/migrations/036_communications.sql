-- Notice content and immutable recipient-specific notifications have different lifetimes.
CREATE TABLE dc.notice (
 id text PRIMARY KEY,category text NOT NULL CHECK(category IN ('PROGRAM','CAREER','SYSTEM')),
 title text NOT NULL CHECK(btrim(title)<>''),summary text NOT NULL,body text[] NOT NULL,
 posted_at date NOT NULL,pinned boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),deleted_at timestamptz,
 created_by text REFERENCES dc.person,updated_by text REFERENCES dc.person,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_notice_listing ON dc.notice(pinned DESC,posted_at DESC,id) WHERE deleted_at IS NULL;
CREATE TABLE dc.notice_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),notice_id text NOT NULL REFERENCES dc.notice,
 actor_uid text NOT NULL REFERENCES dc.person,action text NOT NULL,
 before_value jsonb,after_value jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER notice_event_immutable BEFORE UPDATE OR DELETE ON dc.notice_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TABLE dc.notification (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipient_uid text NOT NULL REFERENCES dc.person,
 source_kind text NOT NULL,source_id text NOT NULL,
 tone text NOT NULL CHECK(tone IN ('counsel','roadmap','diagnosis','job','program')),
 title text NOT NULL,body text NOT NULL DEFAULT '',route text NOT NULL CHECK(route LIKE '/%' AND route NOT LIKE '//%'),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(recipient_uid,source_kind,source_id)
);
CREATE INDEX ix_notification_recipient ON dc.notification(recipient_uid,occurred_at DESC,id);
CREATE TRIGGER notification_immutable BEFORE UPDATE OR DELETE ON dc.notification
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TABLE dc.notification_read (
 notification_id uuid PRIMARY KEY REFERENCES dc.notification,read_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER notification_read_immutable BEFORE UPDATE OR DELETE ON dc.notification_read
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
GRANT SELECT,INSERT,UPDATE ON dc.notice TO dc_app;
GRANT SELECT,INSERT ON dc.notice_event,dc.notification,dc.notification_read TO dc_app;
