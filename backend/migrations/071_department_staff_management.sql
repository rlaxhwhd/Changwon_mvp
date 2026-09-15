-- Operational assignments are separate from the read-only academic mirrors.
CREATE VIEW dc.department_staff_candidates AS
SELECT DISTINCT ON (u.intg_uid) u.intg_uid AS staff_uid,u.usr_nm AS name,
 u.intg_uid AS employee_no,
 CASE u.user_ty_cd WHEN '1501' THEN 'assistant' ELSE 'professor' END AS role_code,
 u.hp AS mobile,u.tel AS phone,u.orgz_nm AS organization,u.hofc_sta_cd='89' AS is_active
FROM academic.v_usr_inf u WHERE u.user_ty_cd IN ('1501','1301')
ORDER BY u.intg_uid,u.hofc_sta_cd='89' DESC,u.usr_nm;

CREATE VIEW dc.department_assignment_targets AS
WITH org AS (SELECT * FROM dc.academic_organizations WHERE use_yn='Y'), academic_targets AS (
 SELECT c.dept_cd AS college_code,c.dept_nm AS college_name,d.dept_cd AS dept_code,d.dept_nm AS dept_name,
 COALESCE(m.dept_cd,'') AS major_code,m.dept_nm AS major_name
 FROM org d JOIN org c ON c.lvl='1' AND c.dept_cd=d.dept_up_cd
 LEFT JOIN org m ON m.lvl='3' AND m.dept_up_cd=d.dept_cd
 WHERE d.lvl='2'
)
SELECT DISTINCT * FROM academic_targets
UNION ALL
SELECT d.college_code,d.college_name,d.dept_code,d.dept_name,''::text,NULL::text
FROM dc.department d WHERE NOT EXISTS (
 SELECT 1 FROM academic_targets a WHERE (a.college_code,a.dept_code)=(d.college_code,d.dept_code));

CREATE TABLE dc.department_staff_assignment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 college_code text NOT NULL,dept_code text NOT NULL,major_code text NOT NULL DEFAULT '',
 staff_uid text NOT NULL,role_code text NOT NULL CHECK(role_code IN ('assistant','professor')),
 snapshot jsonb NOT NULL DEFAULT '{}',
 legacy_id uuid UNIQUE REFERENCES dc.org_assignment(id),
 is_active boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text REFERENCES dc.person(intg_uid)
);
CREATE UNIQUE INDEX department_staff_assignment_active ON dc.department_staff_assignment
 (college_code,dept_code,major_code,staff_uid,role_code) WHERE is_active;
CREATE INDEX department_staff_assignment_target ON dc.department_staff_assignment(college_code,dept_code,major_code,role_code) WHERE is_active;

INSERT INTO dc.department_staff_assignment(college_code,dept_code,staff_uid,role_code,legacy_id,snapshot)
SELECT a.college_code,a.dept_code,a.staff_uid,a.role_code,a.id,
 jsonb_build_object('name',p.name,'employee_no',COALESCE(s.profile->>'empNo',p.intg_uid),
 'mobile',s.profile->>'mobile','phone',s.profile->>'phone')
FROM dc.org_assignment a JOIN dc.person p ON p.intg_uid=a.staff_uid JOIN dc.staff s ON s.intg_uid=a.staff_uid
WHERE a.role_code IN ('assistant','professor') AND a.is_active AND a.valid_from<=CURRENT_DATE
 AND (a.valid_to IS NULL OR a.valid_to>=CURRENT_DATE) ON CONFLICT DO NOTHING;

INSERT INTO dc.department_staff_assignment(college_code,dept_code,major_code,staff_uid,role_code,snapshot)
SELECT DISTINCT t.college_code,t.dept_code,t.major_code,p.staff_uid,'assistant',
 jsonb_build_object('name',p.name,'employee_no',p.employee_no,'mobile',p.mobile,'phone',p.phone)
FROM academic.fu_ass_dept a JOIN dc.department_staff_candidates p ON p.staff_uid=a.usr_id AND p.role_code='assistant'
JOIN dc.department_assignment_targets t ON t.dept_code=a.dept_cd AND t.major_code=COALESCE(a.major_cd,'')
ON CONFLICT DO NOTHING;

GRANT SELECT ON dc.department_staff_candidates,dc.department_assignment_targets TO dc_app;
GRANT SELECT,INSERT,UPDATE ON dc.department_staff_assignment TO dc_app;

-- Only already-provisioned staff gain scope. Mirror membership never creates login accounts.
CREATE VIEW dc.department_assignment_student_scope AS
SELECT DISTINCT a.staff_uid,s.intg_uid AS student_uid,a.role_code
FROM dc.department_staff_assignment a JOIN dc.staff staff ON staff.intg_uid=a.staff_uid AND staff.role_code=a.role_code
JOIN dc.student s ON (s.college_code,s.dept_code)=(a.college_code,a.dept_code)
WHERE a.is_active AND a.legacy_id IS NULL AND (a.major_code='' OR EXISTS (
 SELECT 1 FROM dc.academic_people p WHERE p.intg_uid=s.intg_uid AND p.major_cd=a.major_code
 AND p.daehak_cd=a.college_code AND p.hakbu_cd=a.dept_code));
CREATE OR REPLACE VIEW dc.staff_student_scope AS
 SELECT staff_uid,student_uid,source FROM dc.fixture_student_scope
 UNION SELECT a.staff_uid,s.intg_uid,'org_assignment'::text FROM dc.org_assignment a
 JOIN dc.student s ON (s.college_code,s.dept_code)=(a.college_code,a.dept_code)
 WHERE a.is_active AND a.valid_from<=CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to>=CURRENT_DATE)
 UNION SELECT professor_uid,student_uid,'advisor_assignment'::text FROM dc.advisor_assignment WHERE released_at IS NULL
 UNION SELECT staff_uid,student_uid,'department_staff_assignment'::text FROM dc.department_assignment_student_scope;
GRANT SELECT ON dc.department_assignment_student_scope TO dc_app;

UPDATE dc.menu SET label='조교학과배정',route='/members/assistants',version=version+1 WHERE menu_code='adm-members.0';
UPDATE dc.menu SET label='교수학과배정',route='/members/professors',version=version+1 WHERE menu_code='adm-members.1';
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('adm-members.2','adm-members','admin','기업회원관리','/members/companies',2);
INSERT INTO dc.menu_auth VALUES('adm-members.2','AUTH0006');
