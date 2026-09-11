-- Explicit user-requested local test identity. Raw academic record stays intact.
INSERT INTO dc.student_login_override
  (intg_uid,name,college_code,dept_code,college_name,dept_name)
VALUES ('20180001','홍길동','5','714','공과대학','전자공학과');
INSERT INTO dc.department(college_code,dept_code,college_name,dept_name,course)
VALUES ('5','714','공과대학','전자공학과','학부')
ON CONFLICT(college_code,dept_code) DO NOTHING;
INSERT INTO dc.person(intg_uid,alias,name,kind,source)
VALUES ('20180001','20180001','홍길동','STUDENT','local');
INSERT INTO dc.student(intg_uid,student_no,major_label,college_code,dept_code)
VALUES ('20180001','20180001','전자공학과','5','714');
