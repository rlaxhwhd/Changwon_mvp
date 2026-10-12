-- Additive annual completion ledger. Roll back code first; retain the ledger.
SET LOCAL lock_timeout='3s';
CREATE TABLE dc.care7_annual_access (
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 year integer NOT NULL CHECK(year >= 2026),
 roadmap_version integer NOT NULL,
 completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(student_uid,year)
);
GRANT SELECT,INSERT ON dc.care7_annual_access TO dc_app;
