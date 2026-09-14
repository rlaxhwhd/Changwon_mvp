-- Explicitly requested temporary material while RAG/LLM integration is pending.
-- Populated by an owner-only command, never a production fallback or student seed.
CREATE TABLE dc.development_roadmap_template (
 job_id text PRIMARY KEY REFERENCES dc.job_role(job_id),
 revision text NOT NULL,
 outcome jsonb NOT NULL CHECK(jsonb_typeof(outcome)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON dc.development_roadmap_template TO dc_app;
