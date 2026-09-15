CREATE TABLE dc.company_member (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_no text NOT NULL UNIQUE CHECK(business_no ~ '^[0-9]{10}$'),
 password_hash text NOT NULL,
 company_name text NOT NULL,contact_name text NOT NULL,contact_email text NOT NULL,contact_phone text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 company_id text REFERENCES dc.company(id),
 review_note text NOT NULL DEFAULT '',reviewed_by text REFERENCES dc.person(intg_uid),reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),version integer NOT NULL DEFAULT 1,
 CHECK((status='APPROVED')=(company_id IS NOT NULL)),
 CHECK((status='PENDING')=(reviewed_at IS NULL))
);
CREATE INDEX company_member_queue ON dc.company_member(status,created_at DESC,id);
CREATE TABLE dc.company_login_session (
 token_hash text PRIMARY KEY,member_id uuid NOT NULL REFERENCES dc.company_member(id),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '8 hours'
);
CREATE INDEX company_login_session_expiry ON dc.company_login_session(expires_at);
CREATE TABLE dc.company_auth_rate (
 bucket text PRIMARY KEY,attempts integer NOT NULL,reset_at timestamptz NOT NULL
);
GRANT SELECT,INSERT,UPDATE ON dc.company_member TO dc_app;
GRANT SELECT,INSERT,DELETE ON dc.company_login_session TO dc_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON dc.company_auth_rate TO dc_app;
