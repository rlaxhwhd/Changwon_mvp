-- Preserve detailed staff fields while restoring the professor directory fields
-- that were overwritten by the legacy per-professor fixture import.
WITH professor_entries AS (
  SELECT professor AS entry
  FROM dc.seed_source source
  CROSS JOIN LATERAL jsonb_array_elements(source.payload) college
  CROSS JOIN LATERAL jsonb_each(college->'divisions') division
  CROSS JOIN LATERAL jsonb_array_elements(division.value) professor
  WHERE source.path = 'src_v2/data/professors.seed.json'
)
UPDATE dc.staff staff
SET profile = entries.entry || staff.profile
FROM professor_entries entries
JOIN dc.person person ON person.alias = entries.entry->>'id'
WHERE staff.intg_uid = person.intg_uid
  AND NOT (staff.profile ?& ARRAY['title','major','room']);
