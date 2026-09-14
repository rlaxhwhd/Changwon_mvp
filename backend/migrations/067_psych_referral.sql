CREATE TABLE dc.psych_referral_reason (
 code text PRIMARY KEY,label text NOT NULL,sort_order integer NOT NULL UNIQUE,active boolean NOT NULL DEFAULT true
);
INSERT INTO dc.psych_referral_reason(code,label,sort_order) VALUES
 ('EMOTIONAL','정서적 어려움',1),('RELATIONSHIP','대인관계 어려움',2),
 ('ADJUSTMENT','대학생활 적응 어려움',3),('STRESS','스트레스·생활관리 어려움',4),
 ('SPECIALIST','심리검사·전문상담 필요',5);
CREATE TABLE dc.psych_referral (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 sender_uid text NOT NULL REFERENCES dc.staff(intg_uid),
 recipient_uid text NOT NULL REFERENCES dc.staff(intg_uid),
 reason_code text NOT NULL REFERENCES dc.psych_referral_reason(code),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_PROGRESS','DONE','CANCELLED')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 accepted_at timestamptz,completed_at timestamptz,cancelled_at timestamptz,
 CHECK(sender_uid<>recipient_uid),
 CHECK((status='PENDING' AND accepted_at IS NULL AND completed_at IS NULL AND cancelled_at IS NULL)
 OR (status='IN_PROGRESS' AND accepted_at IS NOT NULL AND completed_at IS NULL AND cancelled_at IS NULL)
 OR (status='DONE' AND accepted_at IS NOT NULL AND completed_at IS NOT NULL AND cancelled_at IS NULL)
 OR (status='CANCELLED' AND accepted_at IS NULL AND completed_at IS NULL AND cancelled_at IS NOT NULL))
);
CREATE UNIQUE INDEX psych_referral_open_student ON dc.psych_referral(student_uid) WHERE status IN ('PENDING','IN_PROGRESS');
CREATE INDEX psych_referral_recipient ON dc.psych_referral(recipient_uid,created_at DESC);
CREATE INDEX psych_referral_sender ON dc.psych_referral(sender_uid,created_at DESC);
CREATE TABLE dc.psych_referral_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),referral_id uuid NOT NULL REFERENCES dc.psych_referral(id),
 actor_uid text NOT NULL REFERENCES dc.staff(intg_uid),
 action text NOT NULL CHECK(action IN ('CREATE','ACCEPT','COMPLETE','CANCEL')),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER psych_referral_event_immutable BEFORE UPDATE OR DELETE ON dc.psych_referral_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
GRANT SELECT ON dc.psych_referral_reason,dc.psych_referral,dc.psych_referral_event TO dc_app;
GRANT INSERT,UPDATE ON dc.psych_referral TO dc_app;
GRANT INSERT ON dc.psych_referral_event TO dc_app;
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
 VALUES('counsel.7','counsel','admin','심리상담센터 연계','/counsel/psych-referrals',7);
INSERT INTO dc.menu_auth VALUES('counsel.7','career'),('counsel.7','psych');
