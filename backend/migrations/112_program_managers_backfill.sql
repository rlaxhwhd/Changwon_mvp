-- Only unambiguous existing staff names can be linked safely.
-- Unmatched/duplicate names remain as legacy display text for explicit reassignment.
-- This does not generate notifications for historical applications.
INSERT INTO dc.program_manager(program_id,staff_uid,position)
SELECT pr.id,min(s.intg_uid),0
FROM dc.program pr
JOIN dc.person p ON p.name=pr.manager AND p.kind='STAFF'
JOIN dc.staff s ON s.intg_uid=p.intg_uid
GROUP BY pr.id HAVING count(*)=1
ON CONFLICT DO NOTHING;
