-- Additive migration. Existing date-only notices retain unknown (NULL) times.
-- Rollback: revert application first; drop new columns only after exporting their data.
ALTER TABLE dc.program
 ADD COLUMN notice_at timestamptz,
 ADD COLUMN apply_start_time time,
 ADD COLUMN apply_end_time time,
 ADD COLUMN run_start_time time,
 ADD COLUMN run_end_time time,
 ADD COLUMN application_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD CONSTRAINT program_questions_array CHECK (jsonb_typeof(application_questions) = 'array'),
 ADD CONSTRAINT program_apply_time_order CHECK (apply_start + apply_start_time <= apply_end + apply_end_time),
 ADD CONSTRAINT program_run_time_order CHECK (run_start + run_start_time <= run_end + run_end_time);

ALTER TABLE dc.file_object
 DROP CONSTRAINT file_object_owner_kind_check,
 DROP CONSTRAINT file_object_slot_check,
 ADD CONSTRAINT file_object_owner_kind_check CHECK(owner_kind IN
   ('JOB_POSTING','JOB_APPLICATION_ATTEMPT','GROWTH_ENTRY','PROGRAM','PROGRAM_APPLICATION')),
 ADD CONSTRAINT file_object_slot_check CHECK(slot IN
   ('LOGO','ATTACHMENT','RESUME','PORTFOLIO_ATTACHMENT','PROGRAM_ATTACHMENT','PROGRAM_APPLICATION_ATTACHMENT'));
