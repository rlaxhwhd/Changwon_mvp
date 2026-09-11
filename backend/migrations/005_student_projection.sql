CREATE TABLE dc.student_type_code (
    code text PRIMARY KEY, label text NOT NULL, tier text NOT NULL, tier_label text NOT NULL,
    follow_up_test text NOT NULL, program_scope text NOT NULL, payload jsonb NOT NULL
);
CREATE TABLE dc.star_track (
    student_uid text PRIMARY KEY REFERENCES dc.student(intg_uid), payload jsonb NOT NULL
);
CREATE VIEW dc.student_list AS
SELECT p.intg_uid,p.alias,p.name,s.student_no,s.major_label,s.grade,
       COALESCE(t.student_type,s.detail->>'studentType',s.roster->>'studentType') AS student_type,
       c.tier_label AS tier,c.label AS type_label,
       COALESCE(s.detail->>'enrollmentStatus',s.roster->>'status','재학') AS status,
       COALESCE(s.detail->>'gpa',s.roster->>'gpa') AS gpa,
       COALESCE(r.progress,(s.roster->>'progress')::integer,0) AS progress,
       COALESCE((s.roster->>'programCount')::integer,0) AS program_count,
       COALESCE((s.roster->>'counselCount')::integer,0) AS counsel_count,
       s.roster,s.detail,(st.student_uid IS NOT NULL) AS star,
       EXISTS(SELECT 1 FROM dc.roadmap WHERE student_uid=s.intg_uid) AS has_roadmap
FROM dc.student s JOIN dc.person p USING(intg_uid)
LEFT JOIN LATERAL (SELECT student_type FROM dc.student_type_event WHERE student_uid=s.intg_uid ORDER BY decided_at DESC,id DESC LIMIT 1) t ON true
LEFT JOIN dc.student_type_code c ON c.code=COALESCE(t.student_type,s.detail->>'studentType',s.roster->>'studentType')
LEFT JOIN dc.star_track st ON st.student_uid=s.intg_uid
LEFT JOIN LATERAL (
    SELECT round(100.0*count(*) FILTER(WHERE status='DONE')/NULLIF(count(*),0))::integer AS progress
    FROM dc.roadmap_item WHERE student_uid=s.intg_uid
      AND (status='DONE' OR entry<>'RECOMMEND' OR expires_at IS NULL OR expires_at>=now())
) r ON true;
GRANT SELECT ON dc.student_type_code,dc.star_track,dc.student_list TO dc_app;
