-- UP: Reserve a generation across student/admin requests without holding a DB transaction during the LLM call.
CREATE TABLE dc.ai_comprehensive_claim (
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 day date NOT NULL,
 token text NOT NULL UNIQUE CHECK (btrim(token)<>''),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(student_uid,day)
);
GRANT SELECT, INSERT, UPDATE ON dc.ai_comprehensive_claim TO dc_app;
-- DOWN (manual forward migration): DROP TABLE dc.ai_comprehensive_claim;
