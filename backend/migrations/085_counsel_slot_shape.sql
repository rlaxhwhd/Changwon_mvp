-- API Slot requires date/start/end together. Direct counselor records legitimately
-- have only a date, or no reservation at all. Preserve those existing contracts.
-- The original start<end CHECK allows NULL, including an end without a start.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE dc.counsel_request ADD CONSTRAINT ck_counsel_request_slot_shape
 CHECK ((slot_start IS NULL)=(slot_end IS NULL)
        AND (slot_start IS NULL OR slot_date IS NOT NULL)) NOT VALID;
ALTER TABLE dc.counsel_request VALIDATE CONSTRAINT ck_counsel_request_slot_shape;
-- Forward recovery: drop only this CHECK in a new migration. Retain the original
-- time-order CHECK. Do not invent dates or times for malformed legacy records.
