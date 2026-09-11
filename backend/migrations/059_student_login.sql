-- Forward-only. Local login records; no Oracle writes or raw mirror edits.
CREATE TABLE dc.student_login_override (
  intg_uid text PRIMARY KEY,
  name text NOT NULL,
  college_code text NOT NULL,
  dept_code text NOT NULL,
  college_name text NOT NULL,
  dept_name text NOT NULL
);
CREATE VIEW dc.student_login_source AS
SELECT a.intg_uid, COALESCE(NULLIF(a.login_id,''),a.intg_uid) AS student_no,
       COALESCE(o.name,a.usr_nm) AS name,
       COALESCE(o.college_code,a.daehak_cd) AS college_code,
       COALESCE(o.dept_code,NULLIF(a.major_cd,''),NULLIF(a.hakbu_cd,''),a.orgid) AS dept_code,
       o.college_name, COALESCE(o.dept_name,a.orgz_nm) AS dept_name,
       a.stu_schgr, a.hofc_sta_cd, a.user_ty_cd,
       (o.intg_uid IS NOT NULL) AS local_override
FROM academic.v_usr_inf a LEFT JOIN dc.student_login_override o USING(intg_uid)
WHERE a.user_ty_cd IN ('1101','1102','1201','1202');
CREATE TABLE dc.student_login_session (
  token_hash text PRIMARY KEY,
  student_uid text NOT NULL REFERENCES dc.student(intg_uid),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '8 hours'
);
CREATE INDEX student_login_session_expiry ON dc.student_login_session(expires_at);
GRANT SELECT ON dc.student_login_source TO dc_app;
GRANT SELECT,INSERT,DELETE ON dc.student_login_session TO dc_app;
