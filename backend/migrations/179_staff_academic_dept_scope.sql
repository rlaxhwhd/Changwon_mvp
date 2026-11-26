-- 179_staff_academic_dept_scope.sql
-- 0022: 교수·조교 학과 배정 범위를 학사 학생 전체로(사용자 확정 2026-11-26). 의존 뷰 0 → CREATE OR REPLACE(열 이름·타입·순서 동일).
-- 롤백: 176 의 staff_student_scope 정의로 CREATE OR REPLACE 후 DROP VIEW dc.department_academic_student_scope, dc.department_academic_grant.
SET LOCAL lock_timeout = '5s';

-- 현재 유효한 학과 배정(두 표). major_code '' = 학과 전체.
CREATE VIEW dc.department_academic_grant AS
SELECT a.staff_uid, a.college_code, a.dept_code, ''::text AS major_code
FROM dc.org_assignment a
WHERE a.is_active AND a.valid_from <= CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
UNION ALL
SELECT a.staff_uid, a.college_code, a.dept_code, a.major_code
FROM dc.department_staff_assignment a
JOIN dc.staff st ON st.intg_uid = a.staff_uid AND st.role_code = a.role_code
WHERE a.is_active AND a.legacy_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM dc.department_staff_candidates c
                  WHERE c.staff_uid = a.staff_uid AND c.role_code = a.role_code AND NOT c.is_active);

-- 배정 학과의 학사 학생(서비스 등록 여부·학적 무관). dc.student_login_source 와 같은 소속 규칙을
-- 인덱스 순서(hakbu_cd / intg_uid)로 쓴 것 — 결과 동일성은 계약 테스트가 지킨다.
CREATE VIEW dc.department_academic_student_scope AS
SELECT g.staff_uid, u.intg_uid::text AS student_uid
FROM dc.department_academic_grant g
JOIN academic.dc_v_dept_inf d ON d.dept_code::text = g.dept_code AND d.col_code::text = g.college_code
JOIN academic.usr_inf u ON u.hakbu_cd::text = g.dept_code AND u.user_ty_cd = '0001'
WHERE (g.major_code = '' OR u.major_cd::text = g.major_code)
  AND NOT EXISTS (SELECT 1 FROM dc.student_login_override o WHERE o.intg_uid = u.intg_uid::text)
UNION ALL
SELECT g.staff_uid, o.intg_uid
FROM dc.department_academic_grant g
JOIN dc.student_login_override o ON o.college_code = g.college_code AND o.dept_code = g.dept_code
JOIN academic.usr_inf u ON u.intg_uid::text = o.intg_uid AND u.user_ty_cd = '0001'
WHERE (g.major_code = '' OR u.major_cd::text = g.major_code);

CREATE OR REPLACE VIEW dc.staff_student_scope AS
SELECT staff_uid, student_uid, source FROM dc.fixture_student_scope
UNION
SELECT a.staff_uid, s.intg_uid AS student_uid, 'org_assignment'::text AS source
FROM dc.org_assignment a
JOIN dc.student s ON s.college_code = a.college_code AND s.dept_code = a.dept_code
WHERE a.is_active AND a.valid_from <= CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
UNION
SELECT professor_uid AS staff_uid, student_uid, 'advisor_assignment'::text AS source
FROM dc.advisor_assignment WHERE released_at IS NULL
UNION
SELECT staff_uid, student_uid, 'department_staff_assignment'::text AS source
FROM dc.department_assignment_student_scope
UNION
SELECT staff_uid, student_uid, 'department_academic'::text AS source
FROM dc.department_academic_student_scope;

-- security_invoker 는 켜지 않는다(176 과 같이 소유자 권한으로 academic 을 읽는다).
GRANT SELECT ON dc.department_academic_grant, dc.department_academic_student_scope, dc.staff_student_scope TO dc_app;
