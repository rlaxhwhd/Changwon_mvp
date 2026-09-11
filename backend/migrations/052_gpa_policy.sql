-- Forward-only. Rollback: deactivate policy; existing roster GPA returns to legacy data.
-- No policy is seeded: school approval is required before activation.
CREATE TABLE dc.gpa_policy (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 active boolean NOT NULL DEFAULT false,
 revision text NOT NULL CHECK(length(trim(revision))>0),
 retakes text NOT NULL CHECK(retakes IN ('ALL','LATEST','HIGHEST')),
 excluded_grades text[] NOT NULL CHECK(array_position(excluded_grades,NULL) IS NULL),
 term_scope text NOT NULL CHECK(term_scope IN ('ALL','THROUGH')),
 through_year integer,
 through_term_order integer,
 decimal_places integer NOT NULL CHECK(decimal_places BETWEEN 0 AND 4),
 approved_by text NOT NULL CHECK(length(trim(approved_by))>0),
 approved_at timestamptz NOT NULL,
 CHECK((term_scope='ALL' AND through_year IS NULL AND through_term_order IS NULL)
    OR (term_scope='THROUGH' AND through_year IS NOT NULL AND through_term_order IS NOT NULL))
);
CREATE TABLE dc.gpa_term_order (
 code text PRIMARY KEY,
 sort_order integer NOT NULL UNIQUE
);
GRANT SELECT ON dc.gpa_policy,dc.gpa_term_order TO dc_app;
-- An activated policy uses completed attempts with positive subject credits. Unknown
-- term/year/grade points fail closed (null), rather than quietly dropping coursework.
-- chk_recuri is deliberately unused: its source-system meaning is unconfirmed.
CREATE FUNCTION dc.student_gpa(student_id text)
RETURNS TABLE(gpa text,source text)
LANGUAGE sql STABLE AS $$
 WITH policy AS (SELECT * FROM dc.gpa_policy WHERE active),
 attempts AS (
  SELECT c.*,s.cdt_num,t.sort_order,
    CASE WHEN c.year ~ '^[0-9]{4}$' THEN c.year::integer END AS numeric_year
  FROM dc.student_course c JOIN dc.subject s USING(curi_num)
  LEFT JOIN dc.gpa_term_order t ON t.code=c.smt
  WHERE c.intg_uid=student_id AND c.finish_yn='Y'
 ),
 scoped AS (
  SELECT a.* FROM attempts a CROSS JOIN policy p
  WHERE p.term_scope='ALL' OR numeric_year IS NULL OR sort_order IS NULL
     OR (numeric_year,sort_order)<=(p.through_year,p.through_term_order)
 ),
 eligible AS (
  SELECT a.* FROM scoped a CROSS JOIN policy p
  WHERE a.grade IS NULL OR NOT(a.grade=ANY(p.excluded_grades))
 ),
 ranked AS (
  SELECT a.*,row_number() OVER(PARTITION BY curi_num ORDER BY
    CASE WHEN p.retakes='HIGHEST' THEN a.gpa END DESC NULLS LAST,
    numeric_year DESC,sort_order DESC) AS attempt_rank
  FROM eligible a CROSS JOIN policy p
 ),
 aggregate_grade AS (
  SELECT round(sum(a.gpa*a.cdt_num)/nullif(sum(a.cdt_num),0),p.decimal_places)::text AS value
  FROM policy p LEFT JOIN ranked a ON p.retakes='ALL' OR a.attempt_rank=1
  GROUP BY p.decimal_places
 ),
 invalid AS (
  SELECT 1 FROM eligible WHERE gpa IS NULL OR cdt_num<=0 OR grade IS NULL
   OR numeric_year IS NULL OR sort_order IS NULL LIMIT 1
 )
 SELECT CASE WHEN p.singleton IS NULL THEN s.detail->>'gpa'
             WHEN EXISTS(SELECT 1 FROM invalid) THEN NULL
             ELSE (SELECT value FROM aggregate_grade) END,
        CASE WHEN p.singleton IS NULL THEN 'legacy_detail'
             WHEN EXISTS(SELECT 1 FROM invalid) THEN 'course_data_incomplete'
             ELSE 'course_weighted:'||p.revision END
 FROM dc.student s LEFT JOIN policy p ON true WHERE s.intg_uid=student_id
$$;
GRANT EXECUTE ON FUNCTION dc.student_gpa(text) TO dc_app;

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
 SELECT e.student_type FROM dc.student_type_event e WHERE e.student_uid=s.intg_uid
 ORDER BY e.decided_at DESC,e.id DESC LIMIT 1
) t ON true
LEFT JOIN dc.student_type_code c ON c.code=t.student_type
LEFT JOIN dc.star_track st ON st.student_uid=s.intg_uid
LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid,now()) r(done,total,pct) ON true
LEFT JOIN dc.department d ON (d.college_code,d.dept_code)=(s.college_code,s.dept_code);
