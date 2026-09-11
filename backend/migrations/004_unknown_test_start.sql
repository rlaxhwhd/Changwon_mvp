-- Some fixtures contain a result without an attempt. Do not invent a start time.
ALTER TABLE dc.diagnosis_attempt ALTER COLUMN started_at DROP NOT NULL;
