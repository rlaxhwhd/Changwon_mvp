CREATE TABLE dc.diagnosis_comment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_id text NOT NULL REFERENCES dc.diagnosis_attempt,
 student_uid text NOT NULL REFERENCES dc.student,body text NOT NULL CHECK(length(trim(body))>0),
 actor_uid text NOT NULL REFERENCES dc.staff,actor_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dc.diagnosis_nudge (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_uid text NOT NULL REFERENCES dc.student,
 test_id text NOT NULL,actor_uid text NOT NULL REFERENCES dc.staff,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER diagnosis_comment_immutable BEFORE UPDATE OR DELETE ON dc.diagnosis_comment
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER diagnosis_nudge_immutable BEFORE UPDATE OR DELETE ON dc.diagnosis_nudge
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
GRANT SELECT,INSERT ON dc.diagnosis_comment,dc.diagnosis_nudge TO dc_app;
CREATE VIEW dc.diagnosis_status AS
SELECT v.intg_uid,v.alias,v.name,v.student_no,v.major_label,v.grade,v.status AS enrollment_status,
 t.test_id,c.label AS test_name,a.id AS attempt_id,COALESCE(a.status_code,'NOT_STARTED') AS status_code,
 COALESCE(a.attempt_no,0) AS attempt_no,a.started_at,a.completed_at,a.payload->>'resultSummary' AS result_summary
FROM dc.student_list v LEFT JOIN dc.student_type_rule r ON r.code=v.student_type
CROSS JOIN LATERAL (SELECT 'ccore'::text AS test_id UNION SELECT lower(r.follow_up_test) WHERE r.follow_up_test IS NOT NULL) t
JOIN dc.code_item c ON c.group_code='DIAGNOSIS_TEST' AND c.code=upper(t.test_id)
LEFT JOIN LATERAL (SELECT * FROM dc.diagnosis_attempt d WHERE d.student_uid=v.intg_uid
 AND lower(d.test_id)=t.test_id AND d.status_code<>'PRECOMPUTED' ORDER BY d.attempt_no DESC LIMIT 1) a ON true;
GRANT SELECT ON dc.diagnosis_status TO dc_app;
