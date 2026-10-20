-- Add counseling as an owner of the existing validated, private file storage.
-- Rollback: revert the app first. Preserve claimed files and bytes; only narrow
-- these constraints after exporting/removing COUNSEL_ATTACHMENT references.
ALTER TABLE dc.file_object
 DROP CONSTRAINT file_object_owner_kind_check,
 DROP CONSTRAINT file_object_slot_check,
 ADD CONSTRAINT file_object_owner_kind_check CHECK(owner_kind IN
  ('JOB_POSTING','JOB_APPLICATION_ATTEMPT','GROWTH_ENTRY','PROGRAM','PROGRAM_APPLICATION','COUNSEL_REQUEST')),
 ADD CONSTRAINT file_object_slot_check CHECK(slot IN
  ('LOGO','ATTACHMENT','RESUME','PORTFOLIO_ATTACHMENT','PROGRAM_ATTACHMENT','PROGRAM_APPLICATION_ATTACHMENT','COUNSEL_ATTACHMENT'));
