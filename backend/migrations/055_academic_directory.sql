-- Forward-only read models. Raw mirrors remain inaccessible to the API role.
-- No login, counseling permission or student scope is granted by directory presence.
CREATE VIEW dc.academic_people AS
SELECT intg_uid, usr_nm AS name, user_ty_cd, hofc_sta_cd,
       orgid, orgz_nm, daehak_cd, hakbu_cd, major_cd, major_cd2,
       stu_schgr, prof_id, rankid, univ_cd,
       CASE user_ty_cd WHEN '1301' THEN 'professor' WHEN '1501' THEN 'assistant'
         WHEN '1401' THEN 'employee' WHEN '1101' THEN 'student' WHEN '1201' THEN 'student'
         WHEN '1102' THEN 'graduate' WHEN '1202' THEN 'graduate' ELSE 'other' END AS category
FROM academic.v_usr_inf;
CREATE VIEW dc.academic_organizations AS SELECT * FROM academic.v_dep_inf_all;
CREATE VIEW dc.academic_counselors AS
SELECT conid, con_nm AS name, inout_gb, con_gb, con_gb2, status,
       con_area1, con_area2, con_area3, con_area4, con_type1, con_type2, con_type3,
       target, place, place_num, tel, email, con_comp_nm,
       (SELECT array_agg(t.daehak_cd ORDER BY t.daehak_cd)
        FROM academic.com_con_tar t WHERE t.conid=c.conid) AS college_codes
FROM academic.com_con_inf c;
CREATE VIEW dc.academic_assistant_assignments AS SELECT * FROM academic.fu_ass_dept;
CREATE VIEW dc.academic_joint_appointments AS SELECT * FROM academic.v_add_job_part;
CREATE VIEW dc.academic_sync_status AS
SELECT id, started_at, finished_at, source_label, snapshot_mode, report FROM academic.sync_run;
GRANT SELECT ON dc.academic_people, dc.academic_organizations, dc.academic_counselors,
  dc.academic_assistant_assignments, dc.academic_joint_appointments, dc.academic_sync_status TO dc_app;
