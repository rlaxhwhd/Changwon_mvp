-- Forward-only: isolated academic mirror; no application tables are modified.

-- Source: Oracle USER_TAB_COLUMNS, inspected 2026-09-11 (9 tables, 174 columns).

-- CHAR uses varchar to preserve source padding as returned by JDBC.

CREATE SCHEMA academic;

REVOKE ALL ON SCHEMA academic FROM PUBLIC;

CREATE TABLE academic.com_hakbyundong (
  "byun_hakbun" varchar(10) NOT NULL,
  "byun_ilja" varchar(10) NOT NULL,
  "byun_code" varchar(20) NOT NULL,
  "byun_sayu_code" varchar(20),
  "byun_term" varchar(100),
  "byun_bigo" varchar(100)
);

CREATE TABLE academic.com_hakjuk (
  "hj_korname" varchar(20) NOT NULL,
  "hj_hakjuk_sangtae" varchar(10),
  "hj_hakbun" varchar(10) NOT NULL,
  "korname1" varchar(40),
  "hj_hakyun" varchar(1),
  "hj_isu_hakgi_count" numeric(38,0),
  "hj_saengil" varchar(8),
  "hj_sex" varchar(2),
  "hj_iphak_ilja" varchar(8),
  "hj_jol_ilja" varchar(8),
  "nugye_hakgi" varchar(10),
  "hj_hakwe_code1" varchar(20),
  "hj_hakwe_jeungseo_bunho1" varchar(20),
  "hyunjuso" varchar(300),
  "email" varchar(50),
  "handphone" varchar(20),
  "hj_bujun" varchar(100),
  "hj_boksu" varchar(100),
  "hj_bujun2" varchar(100),
  "hj_boksu2" varchar(100),
  "dae_pyosi_gwamok" varchar(300),
  "dae_jeungsu_bunho" varchar(100),
  "hj_sahoi_sin_check" varchar(100),
  "dae_pass_gubun" varchar(100)
);

CREATE TABLE academic.v_add_job_part (
  "intg_uid" varchar(30),
  "emp_no" varchar(20),
  "orgid" varchar(10),
  "partid" varchar(10)
);

CREATE TABLE academic.v_dep_inf (
  "dept_cd" varchar(40),
  "dept_nm" varchar(100),
  "dept_up_cd" varchar(20),
  "grp_cd" varchar(4),
  "grp_nm" varchar(20),
  "ordering" varchar(40),
  "lvl" varchar(1),
  "use_yn" varchar(1),
  "dept_sub_nm" varchar(100)
);

CREATE TABLE academic.v_dep_inf_all (
  "dept_cd" varchar(40),
  "dept_nm" varchar(100),
  "dept_up_cd" varchar(20),
  "grp_cd" varchar(4),
  "grp_nm" varchar(20),
  "ordering" varchar(40),
  "lvl" varchar(1),
  "use_yn" varchar(1),
  "dept_sub_nm" varchar(100),
  "univ_code" varchar(2)
);

CREATE TABLE academic.v_lect_inf (
  "year" varchar(4),
  "smt" varchar(2),
  "grad_div" varchar(2),
  "dept_cd" varchar(8),
  "curi_num" varchar(6),
  "course_cls" varchar(3),
  "deu_hakgi" varchar(2),
  "curi_nm" varchar(80),
  "cdt_num" numeric(3,1),
  "prof_id" varchar(6),
  "prof_nm" varchar(20),
  "comdiv_cd_nm" varchar(4000),
  "abo_tp" varchar(1),
  "cap_per1" numeric,
  "cap_per2" numeric,
  "cap_per3" numeric,
  "cap_per4" numeric,
  "cap_per5" numeric,
  "cap_per6" numeric,
  "cap_per" numeric
);

CREATE TABLE academic.v_sugang (
  "year" varchar(4),
  "smt" varchar(2),
  "student_cd" varchar(10),
  "curi_num" varchar(6),
  "course_cls" varchar(3),
  "grad_div" varchar(2),
  "student_year" numeric(1,0),
  "chk_recuri" varchar(1),
  "cancel_yn" varchar(1),
  "serial_num" varchar(6),
  "grade" varchar(2),
  "gpa" numeric(4,2),
  "finish_yn" varchar(1),
  "finish_opt" varchar(6),
  "edu_hakgi" varchar(2)
);

CREATE TABLE academic.v_usr_inf (
  "intg_uid" varchar(40) NOT NULL,
  "orgid" varchar(10),
  "orgz_nm" varchar(200),
  "stu_schgr" varchar(20),
  "hofc_sta_cd" varchar(4),
  "user_ty_cd" varchar(4),
  "usr_nm" varchar(100),
  "sex" varchar(4),
  "daehak_cd" varchar(10),
  "hakbu_cd" varchar(10),
  "major_cd" varchar(10),
  "major_cd2" varchar(4000),
  "tel" varchar(40),
  "hp" varchar(40),
  "post" varchar(6),
  "addr1" varchar(500),
  "addr2" varchar(500),
  "email" varchar(100),
  "age" varchar(26),
  "for_yn" varchar(1),
  "grade" numeric,
  "egnm" varchar(100),
  "chnm" varchar(100),
  "mj2_nm" varchar(20),
  "out_dt" varchar(8),
  "enter_dt" varchar(8),
  "out_gb" varchar(20),
  "out_todo" varchar(24),
  "out_stat" varchar(6),
  "isu_cnt" numeric,
  "dean_flag" varchar(1),
  "prof_id" varchar(20),
  "usr_gbn" varchar(1),
  "uuid" varchar(50),
  "hs_uid" varchar(50),
  "plur_grad_yn" varchar(1),
  "photo" varchar(100),
  "login_id" varchar(20),
  "rankid" varchar(10),
  "univ_cd" varchar(10),
  "erase_dt" varchar(10),
  "usr_enm" varchar(100),
  "usr_hnm" varchar(100)
);

CREATE TABLE academic.v_usr_inf_dup_inf (
  "intg_uid" varchar(40),
  "orgid" varchar(10),
  "orgz_nm" varchar(200),
  "stu_schgr" varchar(20),
  "hofc_sta_cd" varchar(4),
  "user_ty_cd" varchar(4),
  "usr_nm" varchar(100),
  "sex" varchar(4),
  "daehak_cd" varchar(10),
  "hakbu_cd" varchar(10),
  "major_cd" varchar(10),
  "major_cd2" varchar(4000),
  "tel" varchar(40),
  "hp" varchar(40),
  "post" varchar(6),
  "addr1" varchar(500),
  "addr2" varchar(500),
  "email" varchar(100),
  "age" varchar(26),
  "for_yn" varchar(1),
  "grade" numeric,
  "egnm" varchar(100),
  "chnm" varchar(100),
  "mj2_nm" varchar(20),
  "out_dt" varchar(8),
  "enter_dt" varchar(8),
  "out_gb" varchar(20),
  "out_todo" varchar(24),
  "out_stat" varchar(6),
  "isu_cnt" numeric,
  "dean_flag" varchar(1),
  "prof_id" varchar(20),
  "usr_gbn" varchar(1),
  "uuid" varchar(50),
  "hs_uid" varchar(50),
  "plur_grad_yn" varchar(1),
  "photo" varchar(100),
  "login_id" varchar(20),
  "rankid" varchar(10),
  "univ_cd" varchar(10),
  "erase_dt" varchar(10),
  "usr_enm" varchar(100),
  "usr_hnm" varchar(100)
);

CREATE TABLE academic.sync_run (
 id uuid PRIMARY KEY,
 started_at timestamptz NOT NULL,
 finished_at timestamptz NOT NULL DEFAULT now(),
 source_label text NOT NULL,
 snapshot_mode text NOT NULL CHECK (snapshot_mode = 'per-table-select'),
 report jsonb NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA academic FROM PUBLIC;
