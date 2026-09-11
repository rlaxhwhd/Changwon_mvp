-- Student roster truth: academic identity plus values derived from normalized events.
INSERT INTO dc.student_type_event(student_uid,student_type,source,actor_uid)
SELECT s.intg_uid,s.detail->>'studentType','fixture:detail-backfill',NULL
FROM dc.student s
WHERE s.detail->>'studentType' IN ('T1','T2','T3','T4','T5','T6')
  AND NOT EXISTS (SELECT 1 FROM dc.student_type_event e WHERE e.student_uid=s.intg_uid);

-- dc.diagnosis_status(015) 가 student_list 를 참조한다 — 컬럼 제거는 DROP 이 필요하므로
-- 의존 뷰를 내렸다가 같은 정의로 다시 만든다(권한 포함).
DROP VIEW dc.diagnosis_status;
DROP VIEW dc.student_list;
CREATE VIEW dc.student_list AS
SELECT p.intg_uid,p.alias,p.name,s.student_no,s.major_label,s.grade,
 t.student_type,c.tier_label AS tier,c.label AS type_label,
 COALESCE(s.detail->>'enrollmentStatus','재학') AS status,
 s.detail->>'gpa' AS gpa,COALESCE(r.pct,0) AS progress,
 (SELECT count(*) FROM dc.program_apply a WHERE a.student_uid=s.intg_uid AND a.outcome_code='COMPLETED')::integer AS program_count,
 (SELECT count(*) FROM dc.counsel_request q WHERE q.student_uid=s.intg_uid AND q.status_code='DONE')::integer AS counsel_count,
 s.detail,st.student_uid IS NOT NULL AS star,
 EXISTS(SELECT 1 FROM dc.roadmap rm WHERE rm.student_uid=s.intg_uid) AS has_roadmap,
 s.college_code,s.dept_code,d.college_name
FROM dc.student s JOIN dc.person p USING(intg_uid)
LEFT JOIN LATERAL (
 SELECT e.student_type FROM dc.student_type_event e WHERE e.student_uid=s.intg_uid
 ORDER BY e.decided_at DESC,e.id DESC LIMIT 1
) t ON true
LEFT JOIN dc.student_type_code c ON c.code=t.student_type
LEFT JOIN dc.star_track st ON st.student_uid=s.intg_uid
LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid,now()) r(done,total,pct) ON true
LEFT JOIN dc.department d ON (d.college_code,d.dept_code)=(s.college_code,s.dept_code);
GRANT SELECT ON dc.student_list TO dc_app;

-- 015 와 같은 정의. student_list 의 status 컬럼은 이름·의미가 유지된다.
CREATE VIEW dc.diagnosis_status AS
SELECT v.intg_uid,v.alias,v.name,v.student_no,v.major_label,v.grade,v.status AS enrollment_status,
       t.test_id,c.label AS test_name,a.id AS attempt_id,
       COALESCE(a.status_code,'NOT_STARTED') AS status_code,COALESCE(a.attempt_no,0) AS attempt_no,
       a.started_at,a.completed_at,a.payload->>'resultSummary' AS result_summary
FROM dc.student_list v
LEFT JOIN dc.student_type_rule r ON r.code=v.student_type
CROSS JOIN LATERAL (SELECT 'ccore' AS test_id UNION SELECT lower(r.follow_up_test) WHERE r.follow_up_test IS NOT NULL) t
JOIN dc.code_item c ON c.group_code='DIAGNOSIS_TEST' AND c.code=upper(t.test_id)
LEFT JOIN LATERAL (SELECT d.* FROM dc.diagnosis_attempt d
  WHERE d.student_uid=v.intg_uid AND lower(d.test_id)=t.test_id AND d.status_code<>'PRECOMPUTED'
  ORDER BY d.attempt_no DESC LIMIT 1) a ON true;
GRANT SELECT ON dc.diagnosis_status TO dc_app;
