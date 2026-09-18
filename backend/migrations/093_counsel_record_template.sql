-- Additive form storage; existing summaries and their audit history remain intact.
-- The form is one owned document, read with its record, never queried by JSON keys.
-- Rollback: roll back app first and retain this nullable column, or export values
-- before dropping it in a NEW forward migration. Never edit an applied migration.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE dc.counsel_record ADD COLUMN template jsonb;
ALTER TABLE dc.counsel_record ADD CONSTRAINT counsel_record_template_object
  CHECK (template IS NULL OR (jsonb_typeof(template) = 'object' AND template->>'schemaVersion' = '1') IS TRUE);
