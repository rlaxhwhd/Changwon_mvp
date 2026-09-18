-- Counseling remains authoritative during the interval between retest and recounseling.
-- Original diagnosis and counseling events remain append-only and separately available.
-- Rollback: restore the previous student_list definition and application reads in a
-- new migration; retain the event history. No destructive data backfill is performed.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE INDEX student_type_event_authoritative ON dc.student_type_event
  (student_uid, (source='counsel') DESC, decided_at DESC, id DESC);
CREATE VIEW dc.current_student_type AS
SELECT DISTINCT ON (student_uid) * FROM dc.student_type_event
ORDER BY student_uid,(source='counsel') DESC,decided_at DESC,id DESC;
GRANT SELECT ON dc.current_student_type TO dc_app;
CREATE OR REPLACE VIEW dc.student_list AS
SELECT p.intg_uid,p.alias,p.name,s.student_no,s.major_label,s.grade,
 t.student_type,c.tier_label AS tier,c.label AS type_label,
 COALESCE(s.detail->>'enrollmentStatus','재학') AS status,
 (SELECT g.gpa FROM dc.student_gpa(s.intg_uid) g) AS gpa,COALESCE(r.pct,0) AS progress,
 (SELECT count(*) FROM dc.program_apply a WHERE a.student_uid=s.intg_uid AND a.outcome_code='COMPLETED')::integer AS program_count,
 (SELECT count(*) FROM dc.counsel_request q WHERE q.student_uid=s.intg_uid AND q.status_code='DONE')::integer AS counsel_count,
 s.detail,st.student_uid IS NOT NULL AS star,
 EXISTS(SELECT 1 FROM dc.roadmap rm WHERE rm.student_uid=s.intg_uid) AS has_roadmap,
 s.college_code,s.dept_code,d.college_name
FROM dc.student s JOIN dc.person p USING(intg_uid)
LEFT JOIN LATERAL (
 SELECT e.student_type FROM dc.current_student_type e WHERE e.student_uid=s.intg_uid
 ORDER BY e.decided_at DESC,e.id DESC LIMIT 1
) t ON true
LEFT JOIN dc.student_type_code c ON c.code=t.student_type
LEFT JOIN dc.star_track st ON st.student_uid=s.intg_uid
LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid,now()) r(done,total,pct) ON true
LEFT JOIN dc.department d ON (d.college_code,d.dept_code)=(s.college_code,s.dept_code);
