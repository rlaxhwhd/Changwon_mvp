-- Additive optional field: the company a student names when applying for CARE 7+ counseling.
-- Roll back code first; retain the column (NULL for every earlier request).
SET LOCAL lock_timeout='3s';
ALTER TABLE dc.counsel_request
  ADD COLUMN desired_company text
  CHECK (desired_company IS NULL OR char_length(desired_company) BETWEEN 1 AND 200);
