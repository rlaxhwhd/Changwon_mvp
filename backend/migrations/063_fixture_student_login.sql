-- Explicit local test identities only. Raw academic mirrors remain unchanged.
CREATE TABLE dc.fixture_student_login (
  student_no text PRIMARY KEY,
  student_uid text NOT NULL UNIQUE REFERENCES dc.student(intg_uid)
);
CREATE VIEW dc.fixture_student_login_source AS
SELECT p.intg_uid,f.student_no,p.name,s.college_code,s.dept_code,
       d.college_name,s.major_label AS dept_name,s.grade::text AS stu_schgr,
       true AS local_override
FROM dc.fixture_student_login f
JOIN dc.person p ON p.intg_uid=f.student_uid AND p.kind='STUDENT' AND p.source='fixture'
JOIN dc.student s ON s.intg_uid=p.intg_uid
LEFT JOIN dc.department d USING(college_code,dept_code)
WHERE NOT EXISTS (SELECT 1 FROM academic.v_usr_inf a
                  WHERE a.intg_uid=f.student_no OR a.login_id=f.student_no);
GRANT SELECT ON dc.fixture_student_login_source TO dc_app;
