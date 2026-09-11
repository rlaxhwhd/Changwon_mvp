-- Forward-only: source mirror schema, no source Oracle writes.

CREATE TABLE academic.com_con_inf (
  "conid" varchar(20) NOT NULL,
  "inout_gb" varchar(1),
  "con_nm" varchar(30) NOT NULL,
  "con_gb" varchar(1),
  "con_area1" varchar(1),
  "con_area2" varchar(1),
  "con_type1" varchar(1),
  "con_type2" varchar(1),
  "target" varchar(200),
  "limit_gb" varchar(1),
  "limit_num" numeric,
  "con_day" varchar(4),
  "con_w1" varchar(1),
  "con_w2" varchar(1),
  "con_w3" varchar(1),
  "con_w4" varchar(1),
  "con_w5" varchar(1),
  "place" varchar(50),
  "place_num" varchar(30),
  "tel" varchar(20),
  "email" varchar(100),
  "regid" varchar(20) NOT NULL,
  "regdate" timestamp without time zone NOT NULL,
  "updid" varchar(20) NOT NULL,
  "upddate" timestamp without time zone NOT NULL,
  "status" varchar(4),
  "app_tel" varchar(20),
  "app_place" varchar(50),
  "memo" varchar(200),
  "con_type3" varchar(1),
  "con_area3" varchar(1),
  "con_area_code1" varchar(1),
  "con_area_code2" varchar(1),
  "con_area_code3" varchar(1),
  "con_area_code4" varchar(1),
  "con_area_code5" varchar(1),
  "con_area_code6" varchar(1),
  "con_area_code7" varchar(1),
  "con_area_code8" varchar(1),
  "con_area_code9" varchar(1),
  "con_area4" varchar(1),
  "conpwd" varchar(32),
  "con_gb2" varchar(100),
  "con_comp_nm" varchar(100),
  "con_area_code10" varchar(1),
  "con_area_code11" varchar(1),
  "con_area_code12" varchar(1),
  "con_area_code13" varchar(1),
  "con_area" varchar(1),
  "agree_date" timestamp without time zone,
  "agree_yn" varchar(1)
);

CREATE TABLE academic.com_con_tar (
  "conid" varchar(20) NOT NULL,
  "daehak_cd" varchar(20) NOT NULL,
  "regid" varchar(20) NOT NULL,
  "regdate" timestamp without time zone NOT NULL
);

CREATE TABLE academic.fu_ass_dept (
  "dept_cd" varchar(20),
  "usr_id" varchar(20),
  "usr_nm" varchar(30),
  "major_cd" varchar(20)
);

REVOKE ALL ON ALL TABLES IN SCHEMA academic FROM PUBLIC;
