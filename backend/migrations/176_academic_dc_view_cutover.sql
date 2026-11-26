-- 0021 학사 복제본 전산원 DC_V_* 전환 · 조직코드 통일 · 학생 로그인 새 코드체계
-- 승인: .ai/handoff-db/0021-academic-dc-view-cutover/ work-order revision 2, architecture-review ASTRA_APPROVED.
-- Forward-only. 이 파일은 backend/academic/dc_view_columns.json 과 c-code-map.csv 에서 한 번 생성한 정적 SQL 이다.
-- 기존 053/054 미러 테이블·sync_run 은 롤백 경로로 남긴다(삭제는 검증 PASS 뒤 별도 마이그레이션, DB.md §9).
-- 롤백: 앱만 되돌리지 않는다. 새 마이그레이션으로 옛 뷰 정의 재생성 + dc.org_code_remap 역순 적용 + seed_source 원장 복원.
SET LOCAL lock_timeout = '5s';

-- 1. 전산원 원본 사본 16개. PK·NOT NULL 없음(원본 중복·NULL 보존 — 동기화의 메타 대조가 계약을 지킨다).
--    VARCHAR2/CHAR → varchar(n)(BYTE 길이 ≥ 문자 수, CHAR 패딩 보존), NUMBER → numeric, DATE → timestamp.
CREATE TABLE academic.dc_v_add_job_part (
  "intg_uid" varchar(40),
  "emp_no" varchar(10),
  "orgid" varchar(8),
  "partid" varchar(8)
);
CREATE TABLE academic.dc_v_col_inf (
  "col_code" varchar(2),
  "col_name" varchar(40),
  "col_name_eng" varchar(200),
  "col_short_name" varchar(40),
  "edu_col_code" varchar(16),
  "process_date" timestamp without time zone,
  "process_man" varchar(40),
  "listorder" numeric(2,0),
  "status_col_code" varchar(10),
  "use_flag" varchar(1)
);
CREATE TABLE academic.dc_v_dept_inf (
  "dept_code" varchar(8),
  "col_code" varchar(2),
  "dept_name" varchar(200),
  "dept_name_eng" varchar(200),
  "dept_short_name" varchar(60),
  "edu_dept_code" varchar(8),
  "class1" varchar(2),
  "class2" varchar(2),
  "class3" varchar(2),
  "univ_code" varchar(4),
  "day_flag" varchar(2),
  "use_flag" varchar(2),
  "degree_code" varchar(6),
  "display_subject_code" varchar(4),
  "open_year" varchar(8),
  "close_year" varchar(8),
  "major_code" varchar(8),
  "order_no" numeric(2,0),
  "process_date" timestamp without time zone,
  "process_man" varchar(40),
  "class_dept" varchar(8),
  "faculty_class" varchar(2),
  "group_flag" varchar(2),
  "manage_code" varchar(8),
  "display_dept" varchar(60),
  "suup_useflag" varchar(2),
  "labact_grade" varchar(2),
  "suup_dept_code" varchar(8),
  "listorder" numeric(5,0),
  "gubun_code" varchar(2),
  "join_flag" varchar(2),
  "major_display_flag" varchar(2),
  "edu_code" varchar(4),
  "status_dept_code" varchar(40),
  "status_class_year_code" varchar(2),
  "ask_date" timestamp without time zone,
  "ask_id" varchar(20),
  "state" varchar(1),
  "scyc_2022" varchar(2),
  "scyc_2021" varchar(2),
  "scyc_2020" varchar(2),
  "scyc_2019" varchar(2),
  "scyc_2018" varchar(2),
  "scyc_2017" varchar(2),
  "scyc_2016" varchar(2),
  "scyc_2015" varchar(2),
  "scyc_2014" varchar(2),
  "scyc_2013" varchar(2),
  "scyc_2012" varchar(2),
  "scyc_2011" varchar(2),
  "scyc_2010" varchar(2)
);
CREATE TABLE academic.dc_v_major_inf (
  "major_code" varchar(8),
  "major_name" varchar(100),
  "major_name_eng" varchar(200),
  "univ_code" varchar(4),
  "process_date" timestamp without time zone,
  "process_man" varchar(40),
  "apply_flag" varchar(2),
  "dept_code" varchar(8),
  "use_flag" varchar(2),
  "major_ename_tech" varchar(400),
  "major_ename_notech" varchar(400),
  "tech_flag" varchar(2),
  "labact_grade" varchar(2),
  "listorder" numeric(5,0),
  "abeek_start_ym" varchar(12),
  "abeek_end_ym" varchar(12),
  "linc_flag" varchar(2),
  "gubun_code" varchar(2),
  "ask_date" timestamp without time zone,
  "ask_id" varchar(20),
  "state" varchar(1),
  "degree_code" varchar(3),
  "special_flag" varchar(1)
);
CREATE TABLE academic.dc_v_org_inf (
  "org_code" varchar(8),
  "org_name" varchar(200),
  "org_name_eng" varchar(200),
  "org_short_name" varchar(80),
  "kind" varchar(60),
  "process_date" timestamp without time zone,
  "process_man" varchar(40),
  "use_flag" varchar(1),
  "post_code" varchar(8),
  "view_order" numeric(3,0),
  "budget_dept_code" varchar(4),
  "kind_order" numeric(2,0),
  "kind_code" varchar(4),
  "post_order" numeric(3,0),
  "new_org_code" varchar(8),
  "korus_code" varchar(20),
  "open_date" timestamp without time zone,
  "close_date" timestamp without time zone
);
CREATE TABLE academic.dc_v_part_inf (
  "part_code" varchar(8),
  "part_name" varchar(120),
  "part_name_eng" varchar(200),
  "part_short_name" varchar(60),
  "part_short_ename" varchar(50),
  "org_code" varchar(8),
  "process_date" timestamp without time zone,
  "process_man" varchar(40),
  "new_part_code" varchar(8),
  "use_flag" varchar(2),
  "dept_code" varchar(8),
  "major_code" varchar(8),
  "univ_part_code" varchar(8),
  "phome_flag" varchar(2),
  "view_order" numeric(3,0),
  "labact_grade" varchar(2),
  "homepage" varchar(200),
  "dept_flag" varchar(2),
  "korus_part_code" varchar(14),
  "overtime_wed" varchar(1),
  "gubun_code" varchar(2),
  "assistant_flag" varchar(2),
  "korus_code" varchar(20),
  "short_flag" varchar(1),
  "open_date" timestamp without time zone,
  "close_date" timestamp without time zone
);
CREATE TABLE academic.dc_v_usr_inf (
  "intg_uid" varchar(40),
  "emp_no" varchar(10),
  "orgid" varchar(8),
  "partid" varchar(8),
  "rankid" varchar(8),
  "hofc_sta_cd" varchar(5),
  "hofc_sta_nm" varchar(6),
  "user_ty_cd" varchar(4),
  "user_ty_nm" varchar(6),
  "usr_nm" varchar(100),
  "tel" varchar(40),
  "hp" varchar(40),
  "post" varchar(12),
  "addr1" varchar(400),
  "email" varchar(200),
  "sex" varchar(1),
  "stu_schgr" varchar(1),
  "univ_cd" varchar(2),
  "daehak_cd" varchar(2),
  "hakbu_cd" varchar(8),
  "major_cd" varchar(8),
  "major_cd1" varchar(8),
  "age" varchar(16),
  "for_yn" varchar(1),
  "grade" numeric,
  "out_dt" varchar(8),
  "enter_dt" varchar(8),
  "isu_grade" numeric,
  "photo" varchar(60),
  "isu_smt_cnt" numeric(2,0),
  "curri_year" varchar(4),
  "track_cd" varchar(10),
  "track_nm" varchar(100),
  "grad_exp_ym" varchar(6),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_cap_inf (
  "cap_div" varchar(10),
  "dept_cd" varchar(8),
  "cap_cd" varchar(10),
  "cap_nm" varchar(500),
  "cap_seq" numeric(2,0),
  "max_score" numeric,
  "use_yn" varchar(1),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_code_inf (
  "code_grp" varchar(20),
  "code" varchar(10),
  "code_nm" varchar(100),
  "sort_no" numeric,
  "use_yn" varchar(1),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_curri_inf (
  "curri_year" varchar(4),
  "dept_cd" varchar(8),
  "grad_div" varchar(2),
  "curi_num" varchar(14),
  "comdiv_cd" varchar(4),
  "rec_grade" numeric(1,0),
  "rec_smt" varchar(4),
  "req_yn" varchar(1),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_stu_cap_inf (
  "intg_uid" varchar(40),
  "cap_div" varchar(10),
  "dept_cd" varchar(8),
  "cap_cd" varchar(10),
  "cap_score" numeric,
  "base_dt" varchar(8),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_stu_sugang_inf (
  "intg_uid" varchar(40),
  "year" varchar(4),
  "smt" varchar(4),
  "grad_div" varchar(2),
  "curi_num" varchar(14),
  "course_cls" varchar(4),
  "comdiv_cd" varchar(4),
  "grade" varchar(2),
  "gpa" numeric(4,2),
  "get_cdt" numeric(3,1),
  "finish_yn" varchar(1),
  "chk_recuri" varchar(1),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_subj_inf (
  "grad_div" varchar(2),
  "curi_num" varchar(14),
  "curi_nm" varchar(200),
  "cdt_num" numeric(3,1),
  "own_dept_cd" varchar(8),
  "comdiv_cd" varchar(4),
  "use_yn" varchar(1),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_usr_major_inf (
  "intg_uid" varchar(40),
  "major_type" varchar(2),
  "major_seq" numeric,
  "major_cd" varchar(10),
  "major_stat" varchar(2),
  "curri_year" varchar(4)
);
CREATE TABLE academic.dc_v_lect_open_inf (
  "year" varchar(4),
  "smt" varchar(4),
  "grad_div" varchar(2),
  "curi_num" varchar(14),
  "course_cls" varchar(4),
  "open_dept_cd" varchar(8),
  "comdiv_cd" varchar(4),
  "prof_id" varchar(10),
  "target_dept_cd" varchar(4000),
  "target_grade" varchar(20),
  "open_stat" varchar(2),
  "lect_goal" varchar(4000),
  "upd_dt" timestamp without time zone
);
CREATE TABLE academic.dc_v_lect_cap_inf (
  "year" varchar(4),
  "smt" varchar(4),
  "grad_div" varchar(2),
  "curi_num" varchar(14),
  "course_cls" varchar(4),
  "cap_div" varchar(10),
  "dept_cd" varchar(8),
  "cap_cd" varchar(10),
  "cap_point" numeric,
  "upd_dt" timestamp without time zone
);
-- 인덱스는 로그인·스코프·조직 투영·향후 학생 단위 조회 경로만(EXPLAIN 근거 — architecture-review §4).
CREATE INDEX ix_dc_v_usr_inf_intg_uid ON academic.dc_v_usr_inf (intg_uid);
CREATE INDEX ix_dc_v_usr_inf_emp_no ON academic.dc_v_usr_inf (emp_no) WHERE emp_no IS NOT NULL;
CREATE INDEX ix_dc_v_usr_inf_hakbu_cd ON academic.dc_v_usr_inf (hakbu_cd);
CREATE INDEX ix_dc_v_stu_sugang_inf_intg_uid ON academic.dc_v_stu_sugang_inf (intg_uid);
CREATE INDEX ix_dc_v_dept_inf_dept_code ON academic.dc_v_dept_inf (dept_code);
CREATE INDEX ix_dc_v_major_inf_major_code ON academic.dc_v_major_inf (major_code);
CREATE INDEX ix_dc_v_code_inf_code ON academic.dc_v_code_inf (code_grp, code);
CREATE INDEX ix_dc_v_usr_major_inf_intg_uid ON academic.dc_v_usr_major_inf (intg_uid);
CREATE INDEX ix_dc_v_stu_cap_inf_intg_uid ON academic.dc_v_stu_cap_inf (intg_uid);

-- 2. 로컬 테스트 인원. 동기화가 건드리지 않는다(학사/자체 분리, DB.md §3-4). dc_app 권한 없음.
CREATE TABLE academic.local_usr_inf (
  "intg_uid" varchar(40) NOT NULL PRIMARY KEY,
  "emp_no" varchar(10),
  "orgid" varchar(8),
  "partid" varchar(8),
  "rankid" varchar(8),
  "hofc_sta_cd" varchar(5),
  "hofc_sta_nm" varchar(6),
  "user_ty_cd" varchar(4),
  "user_ty_nm" varchar(6),
  "usr_nm" varchar(100),
  "tel" varchar(40),
  "hp" varchar(40),
  "post" varchar(12),
  "addr1" varchar(400),
  "email" varchar(200),
  "sex" varchar(1),
  "stu_schgr" varchar(1),
  "univ_cd" varchar(2),
  "daehak_cd" varchar(2),
  "hakbu_cd" varchar(8),
  "major_cd" varchar(8),
  "major_cd1" varchar(8),
  "age" varchar(16),
  "for_yn" varchar(1),
  "grade" numeric,
  "out_dt" varchar(8),
  "enter_dt" varchar(8),
  "isu_grade" numeric,
  "photo" varchar(60),
  "isu_smt_cnt" numeric(2,0),
  "curri_year" varchar(4),
  "track_cd" varchar(10),
  "track_nm" varchar(100),
  "grad_exp_ym" varchar(6),
  "upd_dt" timestamp without time zone,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 원본 우선은 방어선일 뿐이다. 충돌 자체는 동기화가 공개 전에 막는다(전체 중단).
CREATE VIEW academic.usr_inf AS
SELECT intg_uid, emp_no, orgid, partid, rankid, hofc_sta_cd, hofc_sta_nm, user_ty_cd, user_ty_nm, usr_nm, tel, hp, post, addr1, email, sex, stu_schgr, univ_cd, daehak_cd, hakbu_cd, major_cd, major_cd1, age, for_yn, grade, out_dt, enter_dt, isu_grade, photo, isu_smt_cnt, curri_year, track_cd, track_nm, grad_exp_ym, upd_dt, 'source'::text AS origin
FROM academic.dc_v_usr_inf
UNION ALL
SELECT l.intg_uid, l.emp_no, l.orgid, l.partid, l.rankid, l.hofc_sta_cd, l.hofc_sta_nm, l.user_ty_cd, l.user_ty_nm, l.usr_nm, l.tel, l.hp, l.post, l.addr1, l.email, l.sex, l.stu_schgr, l.univ_cd, l.daehak_cd, l.hakbu_cd, l.major_cd, l.major_cd1, l.age, l.for_yn, l.grade, l.out_dt, l.enter_dt, l.isu_grade, l.photo, l.isu_smt_cnt, l.curri_year, l.track_cd, l.track_nm, l.grad_exp_ym, l.upd_dt, 'local'::text AS origin
FROM academic.local_usr_inf l
WHERE NOT EXISTS (SELECT 1 FROM academic.dc_v_usr_inf s WHERE s.intg_uid = l.intg_uid);

-- 3. 조직 코드 이관 로그(append-only). 역변환은 이 로그로만 한다 — dc_app 권한 없음.
CREATE TABLE dc.org_code_remap (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_key text NOT NULL,
  old_college text,
  old_dept text,
  old_major text,
  new_college text,
  new_dept text,
  new_major text,
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER org_code_remap_immutable BEFORE UPDATE OR DELETE ON dc.org_code_remap
  FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
REVOKE ALL ON dc.org_code_remap FROM PUBLIC;

-- 4. dc.department = 학사 학과 투영. 상수 기본값 ADD COLUMN 은 rewrite 없음.
ALTER TABLE dc.department
  ADD COLUMN univ_code text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN source text NOT NULL DEFAULT 'academic';

-- 5. 자체 C-코드 → 학사 코드(c-code-map.csv: MAP 63 · DELETE 16, 단사·DELETE 대상 참조 0 확인).
CREATE TEMP TABLE c_code_map (
  old_college text NOT NULL, old_dept text NOT NULL, action text NOT NULL,
  new_college text, new_dept text, new_college_name text, new_dept_name text
) ON COMMIT DROP;
INSERT INTO c_code_map VALUES
('C01','C01-01','MAP','1','101','인문대학','국어국문학과'),
('C01','C01-02','MAP','1','102','인문대학','영어영문학과'),
('C01','C01-03','MAP','1','103','인문대학','독어독문학과'),
('C01','C01-04','MAP','1','104','인문대학','불어불문학과'),
('C01','C01-05','MAP','1','106','인문대학','일어일문학과'),
('C01','C01-06','MAP','1','105','인문대학','사학과'),
('C01','C01-07','MAP','1','108','인문대학','철학과'),
('C01','C01-08','DELETE',NULL,NULL,NULL,NULL),
('C01','C01-09','DELETE',NULL,NULL,NULL,NULL),
('C01','C01-10','DELETE',NULL,NULL,NULL,NULL),
('C02','C02-01','MAP','6','701','예술대학','음악과'),
('C02','C02-02','MAP','6','702','예술대학','미술학과'),
('C02','C02-03','MAP','6','703','예술대학','산업디자인학과'),
('C02','C02-04','MAP','6','705','예술대학','무용학과'),
('C03','C03-01','MAP','2','201','사회과학대학','법학과'),
('C03','C03-02','MAP','2','202','사회과학대학','행정학과'),
('C03','C03-03','MAP','2','208','사회과학대학','국제관계학과'),
('C03','C03-04','MAP','2','211','사회과학대학','중국학과'),
('C03','C03-05','MAP','2','210','사회과학대학','사회학과'),
('C03','C03-06','MAP','2','221','사회과학대학','미디어커뮤니케이션학과'),
('C03','C03-07','MAP','2','487','사회과학대학','사회복지학과'),
('C03','C03-08','DELETE',NULL,NULL,NULL,NULL),
('C04','C04-01','DELETE',NULL,NULL,NULL,NULL),
('C04','C04-02','MAP','10','918','본부','자산경영빅데이터학과'),
('C04','C04-03','MAP','10','920','본부','빅데이터창업비즈니스학과'),
('C04','C04-04','MAP','10','923','본부','에너지융합공학과'),
('C04','C04-05','MAP','10','137','본부','사림아너스학부'),
('C05','C05-01','DELETE',NULL,NULL,NULL,NULL),
('C05','C05-02','MAP','8','212','경영대학','국제무역학과'),
('C05','C05-03','MAP','8','205','경영대학','경영학과'),
('C05','C05-04','MAP','8','206','경영대학','회계학과'),
('C05','C05-05','MAP','8','214','경영대학','세무학과'),
('C05','C05-06','DELETE',NULL,NULL,NULL,NULL),
('C05','C05-07','DELETE',NULL,NULL,NULL,NULL),
('C06','C06-01','MAP','4','309','자연과학대학','통계학과'),
('C06','C06-02','MAP','4','307','자연과학대학','의류학과'),
('C06','C06-03','MAP','4','308','자연과학대학','식품영양학과'),
('C06','C06-04','MAP','4','704','자연과학대학','체육학과'),
('C06','C06-05','MAP','4','334','자연과학대학','간호학과'),
('C06','C06-06','MAP','4','921','자연과학대학','스마트헬스케어학과'),
('C07','C07-01','MAP','5','405','공과대학','산업시스템공학과'),
('C07','C07-02','MAP','5','439','공과대학','스마트오션모빌리티공학과'),
('C07','C07-03','MAP','5','425','공과대학','스마트그린공학부 환경에너지공학전공'),
('C07','C07-04','MAP','5','426','공과대학','스마트그린공학부 건설시스템공학전공'),
('C07','C07-05','MAP','5','442','공과대학','건축학부 건축공학전공'),
('C07','C07-06','MAP','5','441','공과대학','건축학부 건축학전공'),
('C07','C07-07','MAP','5','414','공과대학','컴퓨터공학과'),
('C07','C07-08','MAP','5','413','공과대학','정보통신공학과'),
('C07','C07-09','DELETE',NULL,NULL,NULL,NULL),
('C07','C07-10','MAP','5','714','공과대학','전자공학과'),
('C07','C07-11','MAP','5','715','공과대학','지능로봇융합공학과'),
('C07','C07-12','MAP','5','505','공과대학','신소재공학부'),
('C07','C07-13','DELETE',NULL,NULL,NULL,NULL),
('C07','C07-14','DELETE',NULL,NULL,NULL,NULL),
('C07','C07-15','DELETE',NULL,NULL,NULL,NULL),
('C07','C07-16','DELETE',NULL,NULL,NULL,NULL),
('C08','C08-01','MAP','11','142','글로컬첨단과학기술대학','이학융합학부'),
('C08','C08-02','MAP','11','143','글로컬첨단과학기술대학','공학융합학부'),
('C08','C08-03','MAP','11','154','글로컬첨단과학기술대학','기계공학부'),
('C08','C08-04','MAP','11','144','글로컬첨단과학기술대학','우주항공공학부'),
('C08','C08-05','MAP','11','146','글로컬첨단과학기술대학','반도체물리학과'),
('C08','C08-06','MAP','11','156a','글로컬첨단과학기술대학','기초과학부 수리과학전공'),
('C08','C08-07','DELETE',NULL,NULL,NULL,NULL),
('C08','C08-08','DELETE',NULL,NULL,NULL,NULL),
('C08','C08-09','MAP','11','164','글로컬첨단과학기술대학','미생물생명공학과'),
('C08','C08-10','MAP','11','165','글로컬첨단과학기술대학','생명보건학과'),
('C08','C08-11','MAP','11','157','글로컬첨단과학기술대학','메타융합콘텐츠학부'),
('C08','C08-12','MAP','11','153','글로컬첨단과학기술대학','기술경영공학과'),
('C09','C09-01','MAP','13','619','GAST-기계공학대학','스마트제조융합공학과'),
('C09','C09-02','MAP','13','610','GAST-기계공학대학','에너지기계공학과'),
('C09','C09-03','MAP','13','611','GAST-기계공학대학','모빌리티기계공학과'),
('C09','C09-04','MAP','13','620','GAST-기계공학대학','원자력기계공학과'),
('C09','C09-05','MAP','13','609','GAST-기계공학대학','우주항공공학부'),
('C09','C09-06','MAP','13','621','GAST-기계공학대학','기계항공자율전공학부'),
('C10','C10-01','MAP','12','605','GAST-인공지능대학','인공지능공학과'),
('C10','C10-02','MAP','12','606','GAST-인공지능대학','인공지능화학공학과'),
('C10','C10-03','MAP','12','607','GAST-인공지능대학','AI생명과학과'),
('C10','C10-04','DELETE',NULL,NULL,NULL,NULL),
('C10','C10-05','MAP','12','603','GAST-인공지능대학','지능로봇융합공학과');
-- ① 대상 학사 학과를 먼저 넣는다(FK 대상). 기존 (5,714) 등은 보존, 이름은 다음 동기화가 갱신.
WITH added AS (
  INSERT INTO dc.department (college_code, dept_code, college_name, dept_name, course, univ_code)
  SELECT m.new_college, m.new_dept, m.new_college_name, m.new_dept_name, '학부', '00'
  FROM c_code_map m
  WHERE m.action = 'MAP'
    AND EXISTS (SELECT 1 FROM dc.department d WHERE d.college_code = m.old_college AND d.dept_code = m.old_dept)
  ON CONFLICT DO NOTHING
  RETURNING college_code, dept_code)
INSERT INTO dc.org_code_remap (table_name, row_key, new_college, new_dept, reason)
SELECT 'department', college_code || ':' || dept_code, college_code, dept_code, 'c_code_target' FROM added;
-- ② 참조 6곳(FK 2 + FK 없는 4).
WITH changed AS (
  UPDATE dc.student t SET college_code = m.new_college, dept_code = m.new_dept
  FROM c_code_map m
  WHERE m.action = 'MAP' AND t.college_code = m.old_college AND t.dept_code = m.old_dept
  RETURNING t.intg_uid AS row_key, m.old_college, m.old_dept, m.new_college, m.new_dept)
INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
SELECT 'student', row_key, old_college, old_dept, new_college, new_dept, 'c_code_map' FROM changed;
WITH changed AS (
  UPDATE dc.org_assignment t SET college_code = m.new_college, dept_code = m.new_dept
  FROM c_code_map m
  WHERE m.action = 'MAP' AND t.college_code = m.old_college AND t.dept_code = m.old_dept
  RETURNING t.id::text AS row_key, m.old_college, m.old_dept, m.new_college, m.new_dept)
INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
SELECT 'org_assignment', row_key, old_college, old_dept, new_college, new_dept, 'c_code_map' FROM changed;
WITH changed AS (
  UPDATE dc.department_staff_assignment t SET college_code = m.new_college, dept_code = m.new_dept
  FROM c_code_map m
  WHERE m.action = 'MAP' AND t.college_code = m.old_college AND t.dept_code = m.old_dept
  RETURNING t.id::text AS row_key, m.old_college, m.old_dept, m.new_college, m.new_dept)
INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
SELECT 'department_staff_assignment', row_key, old_college, old_dept, new_college, new_dept, 'c_code_map' FROM changed;
WITH changed AS (
  UPDATE dc.student_login_override t SET college_code = m.new_college, dept_code = m.new_dept
  FROM c_code_map m
  WHERE m.action = 'MAP' AND t.college_code = m.old_college AND t.dept_code = m.old_dept
  RETURNING t.intg_uid AS row_key, m.old_college, m.old_dept, m.new_college, m.new_dept)
INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
SELECT 'student_login_override', row_key, old_college, old_dept, new_college, new_dept, 'c_code_map' FROM changed;
WITH changed AS (
  UPDATE dc.curriculum t SET dept_code = m.new_dept
  FROM c_code_map m
  WHERE m.action = 'MAP' AND t.dept_code = m.old_dept
  RETURNING t.id AS row_key, m.old_dept, m.new_dept)
INSERT INTO dc.org_code_remap (table_name, row_key, old_dept, new_dept, reason)
SELECT 'curriculum', row_key, old_dept, new_dept, 'c_code_map' FROM changed;
WITH changed AS (
  UPDATE dc.subject t SET open_dept_cd = m.new_dept
  FROM c_code_map m
  WHERE m.action = 'MAP' AND t.open_dept_cd = m.old_dept
  RETURNING t.curi_num AS row_key, m.old_dept, m.new_dept)
INSERT INTO dc.org_code_remap (table_name, row_key, old_dept, new_dept, reason)
SELECT 'subject', row_key, old_dept, new_dept, 'c_code_map' FROM changed;
-- ③ C-코드 학과 행 삭제(참조는 ②에서 모두 옮겼다).
WITH gone AS (
  DELETE FROM dc.department d USING c_code_map m
  WHERE d.college_code = m.old_college AND d.dept_code = m.old_dept
  RETURNING d.college_code, d.dept_code, m.action, m.new_college, m.new_dept)
INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
SELECT 'department', college_code || ':' || dept_code, college_code, dept_code, new_college, new_dept,
       CASE action WHEN 'MAP' THEN 'c_code_map' ELSE 'c_code_delete' END FROM gone;
DROP TABLE c_code_map;
-- ④ 잔존 검사. ASSERT 는 plpgsql.check_asserts=off 로 꺼질 수 있어 RAISE 를 쓴다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM dc.department WHERE college_code ~ '^C(0[1-9]|10)$' OR dept_code ~ '^C(0[1-9]|10)-[0-9]{2}$')
     OR EXISTS (SELECT 1 FROM dc.student WHERE college_code ~ '^C(0[1-9]|10)$' OR dept_code ~ '^C(0[1-9]|10)-[0-9]{2}$')
     OR EXISTS (SELECT 1 FROM dc.org_assignment WHERE college_code ~ '^C(0[1-9]|10)$' OR dept_code ~ '^C(0[1-9]|10)-[0-9]{2}$')
     OR EXISTS (SELECT 1 FROM dc.department_staff_assignment WHERE college_code ~ '^C(0[1-9]|10)$' OR dept_code ~ '^C(0[1-9]|10)-[0-9]{2}$')
     OR EXISTS (SELECT 1 FROM dc.student_login_override WHERE college_code ~ '^C(0[1-9]|10)$' OR dept_code ~ '^C(0[1-9]|10)-[0-9]{2}$')
     OR EXISTS (SELECT 1 FROM dc.curriculum WHERE dept_code ~ '^C(0[1-9]|10)-[0-9]{2}$')
     OR EXISTS (SELECT 1 FROM dc.subject WHERE open_dept_cd ~ '^C(0[1-9]|10)-[0-9]{2}$')
  THEN
    RAISE EXCEPTION '176: self-made C-code organization values remain after remap';
  END IF;
END $$;

-- curriculum.dept_code·subject.open_dept_cd 가 학과 코드만으로 참조하므로 학과 코드 단독 유일.
CREATE UNIQUE INDEX department_dept_code_key ON dc.department (dept_code);
-- 학과 단대 이동은 dc.department 키를 제자리 UPDATE 하고 FK 가 따라오게 한다.
ALTER TABLE dc.student
  DROP CONSTRAINT student_college_code_dept_code_fkey,
  ADD CONSTRAINT student_college_code_dept_code_fkey FOREIGN KEY (college_code, dept_code)
    REFERENCES dc.department (college_code, dept_code) ON UPDATE CASCADE;
ALTER TABLE dc.org_assignment
  DROP CONSTRAINT org_assignment_college_code_dept_code_fkey,
  ADD CONSTRAINT org_assignment_college_code_dept_code_fkey FOREIGN KEY (college_code, dept_code)
    REFERENCES dc.department (college_code, dept_code) ON UPDATE CASCADE;

-- 6. 전공 코드: 옛 미러 트리의 'M'+전공코드 → 새 MAJOR_INF.MAJOR_CODE(접두어 없음). 전 행(이력 포함).
--    원본 존재 검증은 첫 동기화 직후(마이그레이션 시점엔 학사 사본이 비어 있다).
WITH changed AS (
  UPDATE dc.department_staff_assignment t SET major_code = substr(t.major_code, 2)
  WHERE t.major_code LIKE 'M%'
  RETURNING t.id::text AS row_key, t.college_code, t.dept_code, 'M' || t.major_code AS old_major, t.major_code AS new_major)
INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, old_major, new_college, new_dept, new_major, reason)
SELECT 'department_staff_assignment', row_key, college_code, dept_code, old_major, college_code, dept_code, new_major,
       'major_prefix' FROM changed;

-- 7. 시드 가져오기 원장. 원장은 이력이 아니다 — 바뀐 시드 파일과 같은 커밋에서 checksum·payload 를 맞춘다.
--    옛 checksum(LF·CRLF 작업본)일 때만 바꾸고, 그 밖의 값이 남아 있으면 중단한다(조용한 원장 불일치 금지).
UPDATE dc.seed_source SET checksum = '258ad3e102e1d33f22284a377c1a14d472110bd10968de0342818f1a1411af0c', payload = $seed176$[
    {
        "collegeCode": "1",
        "collegeName": "인문대학",
        "deptCode": "101",
        "deptName": "국어국문학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "1",
        "collegeName": "인문대학",
        "deptCode": "102",
        "deptName": "영어영문학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "1",
        "collegeName": "인문대학",
        "deptCode": "103",
        "deptName": "독어독문학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "1",
        "collegeName": "인문대학",
        "deptCode": "104",
        "deptName": "불어불문학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "1",
        "collegeName": "인문대학",
        "deptCode": "106",
        "deptName": "일어일문학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "1",
        "collegeName": "인문대학",
        "deptCode": "105",
        "deptName": "사학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "1",
        "collegeName": "인문대학",
        "deptCode": "108",
        "deptName": "철학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "6",
        "collegeName": "예술대학",
        "deptCode": "701",
        "deptName": "음악과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "6",
        "collegeName": "예술대학",
        "deptCode": "702",
        "deptName": "미술학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "6",
        "collegeName": "예술대학",
        "deptCode": "703",
        "deptName": "산업디자인학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "6",
        "collegeName": "예술대학",
        "deptCode": "705",
        "deptName": "무용학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "2",
        "collegeName": "사회과학대학",
        "deptCode": "201",
        "deptName": "법학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "2",
        "collegeName": "사회과학대학",
        "deptCode": "202",
        "deptName": "행정학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "2",
        "collegeName": "사회과학대학",
        "deptCode": "208",
        "deptName": "국제관계학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "2",
        "collegeName": "사회과학대학",
        "deptCode": "211",
        "deptName": "중국학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "2",
        "collegeName": "사회과학대학",
        "deptCode": "210",
        "deptName": "사회학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "2",
        "collegeName": "사회과학대학",
        "deptCode": "221",
        "deptName": "미디어커뮤니케이션학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "2",
        "collegeName": "사회과학대학",
        "deptCode": "487",
        "deptName": "사회복지학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "10",
        "collegeName": "본부",
        "deptCode": "918",
        "deptName": "자산경영빅데이터학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "10",
        "collegeName": "본부",
        "deptCode": "920",
        "deptName": "빅데이터창업비즈니스학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "10",
        "collegeName": "본부",
        "deptCode": "923",
        "deptName": "에너지융합공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "10",
        "collegeName": "본부",
        "deptCode": "137",
        "deptName": "사림아너스학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "8",
        "collegeName": "경영대학",
        "deptCode": "212",
        "deptName": "국제무역학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "8",
        "collegeName": "경영대학",
        "deptCode": "205",
        "deptName": "경영학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "8",
        "collegeName": "경영대학",
        "deptCode": "206",
        "deptName": "회계학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "8",
        "collegeName": "경영대학",
        "deptCode": "214",
        "deptName": "세무학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "4",
        "collegeName": "자연과학대학",
        "deptCode": "309",
        "deptName": "통계학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "4",
        "collegeName": "자연과학대학",
        "deptCode": "307",
        "deptName": "의류학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "4",
        "collegeName": "자연과학대학",
        "deptCode": "308",
        "deptName": "식품영양학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "4",
        "collegeName": "자연과학대학",
        "deptCode": "704",
        "deptName": "체육학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "4",
        "collegeName": "자연과학대학",
        "deptCode": "334",
        "deptName": "간호학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "4",
        "collegeName": "자연과학대학",
        "deptCode": "921",
        "deptName": "스마트헬스케어학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "405",
        "deptName": "산업시스템공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "439",
        "deptName": "스마트오션모빌리티공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "425",
        "deptName": "스마트그린공학부 환경에너지공학전공",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "426",
        "deptName": "스마트그린공학부 건설시스템공학전공",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "442",
        "deptName": "건축학부 건축공학전공",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "441",
        "deptName": "건축학부 건축학전공",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "414",
        "deptName": "컴퓨터공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "413",
        "deptName": "정보통신공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "714",
        "deptName": "전자공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "715",
        "deptName": "지능로봇융합공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "5",
        "collegeName": "공과대학",
        "deptCode": "505",
        "deptName": "신소재공학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "142",
        "deptName": "이학융합학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "143",
        "deptName": "공학융합학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "154",
        "deptName": "기계공학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "144",
        "deptName": "우주항공공학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "146",
        "deptName": "반도체물리학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "156a",
        "deptName": "기초과학부 수리과학전공",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "164",
        "deptName": "미생물생명공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "165",
        "deptName": "생명보건학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "157",
        "deptName": "메타융합콘텐츠학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "11",
        "collegeName": "글로컬첨단과학기술대학",
        "deptCode": "153",
        "deptName": "기술경영공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "13",
        "collegeName": "GAST-기계공학대학",
        "deptCode": "619",
        "deptName": "스마트제조융합공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "13",
        "collegeName": "GAST-기계공학대학",
        "deptCode": "610",
        "deptName": "에너지기계공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "13",
        "collegeName": "GAST-기계공학대학",
        "deptCode": "611",
        "deptName": "모빌리티기계공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "13",
        "collegeName": "GAST-기계공학대학",
        "deptCode": "620",
        "deptName": "원자력기계공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "13",
        "collegeName": "GAST-기계공학대학",
        "deptCode": "609",
        "deptName": "우주항공공학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "13",
        "collegeName": "GAST-기계공학대학",
        "deptCode": "621",
        "deptName": "기계항공자율전공학부",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "12",
        "collegeName": "GAST-인공지능대학",
        "deptCode": "605",
        "deptName": "인공지능공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "12",
        "collegeName": "GAST-인공지능대학",
        "deptCode": "606",
        "deptName": "인공지능화학공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "12",
        "collegeName": "GAST-인공지능대학",
        "deptCode": "607",
        "deptName": "AI생명과학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    },
    {
        "collegeCode": "12",
        "collegeName": "GAST-인공지능대학",
        "deptCode": "603",
        "deptName": "지능로봇융합공학과",
        "course": "학부",
        "univCode": "00",
        "active": true
    }
]
$seed176$::jsonb
WHERE path = 'src_admin/data/departments.seed.json' AND checksum IN ('3fb3c560f89468a760330fe39f3bd1d03f1732d94976f4a9152b120f97c81a82', 'ae64d7c218a1afb6935ce303082ff2554ff6f14cec22365246a03f3bd13160b0', 'b6e13d13b3d9f480c1ab9001b60bdbb6cf4b3d45a61e2b245a126ef9709ba469');
UPDATE dc.seed_source SET checksum = '8d45c8919d4f6d32c378dd4b55eb5bb1618e21b6914e72f8866c4fcbc4430386', payload = $seed176$[
  {
    "id": "da-001",
    "intgUid": "cse-1",
    "role": "professor",
    "deptCode": "714",
    "majorCode": null,
    "status": "active",
    "assignedAt": "2026-03-02",
    "handledBy": "admin-1"
  },
  {
    "id": "da-002",
    "intgUid": "biz-1",
    "role": "professor",
    "deptCode": "206",
    "majorCode": null,
    "status": "active",
    "assignedAt": "2026-03-02",
    "handledBy": "admin-1"
  },
  {
    "id": "da-003",
    "intgUid": "biz-1",
    "role": "professor",
    "deptCode": "212",
    "majorCode": null,
    "status": "released",
    "assignedAt": "2025-09-01",
    "releasedAt": "2026-02-28",
    "handledBy": "admin-1"
  }
]
$seed176$::jsonb
WHERE path = 'src_admin/data/deptAssigns.seed.json' AND checksum IN ('b83c4abb76e4e5746bd6558e567be32376603be715479dc3298dc461cc878852', 'c7f6b33ad62dd4749945189402ea6595e71a15537898bd28f786f623ed7d1ebc', 'e94f831ebee0364fda8ece3826da2a4f61c90f29ce7bf906c237c595804ce5e6');
UPDATE dc.seed_source SET checksum = '84b37312c3ca10ec4cbb6367c542a40ee361c62a7eb3b693013cf48fa73ee8ed', payload = $seed176$[
  {
    "id": "cur_001",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE1001",
    "courseCls": "전공필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_002",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE1002",
    "courseCls": "전공필수",
    "recGrade": 1,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_003",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE1003",
    "courseCls": "전공필수",
    "recGrade": 1,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_004",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE1004",
    "courseCls": "전공선택",
    "recGrade": 1,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_005",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE2001",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_006",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE2002",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_007",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE2003",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_008",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE2004",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_009",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE2005",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_010",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE2006",
    "courseCls": "전공선택",
    "recGrade": 2,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_011",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE2007",
    "courseCls": "전공선택",
    "recGrade": 2,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_012",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE3001",
    "courseCls": "전공필수",
    "recGrade": 3,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_013",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE3002",
    "courseCls": "전공필수",
    "recGrade": 3,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_014",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE3003",
    "courseCls": "전공필수",
    "recGrade": 3,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_015",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE3004",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_016",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE3005",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_017",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE3006",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_018",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE3007",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_019",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE4001",
    "courseCls": "전공필수",
    "recGrade": 4,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_020",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE4002",
    "courseCls": "전공필수",
    "recGrade": 4,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_021",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE4003",
    "courseCls": "전공선택",
    "recGrade": 4,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_022",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE4004",
    "courseCls": "전공선택",
    "recGrade": 4,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_023",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE4005",
    "courseCls": "전공선택",
    "recGrade": 4,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_024",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "CSE4006",
    "courseCls": "전공선택",
    "recGrade": 4,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_025",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN1001",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_026",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN1002",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_027",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN1003",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_028",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN1004",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_029",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN2001",
    "courseCls": "교양필수",
    "recGrade": 2,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_030",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN2002",
    "courseCls": "교양필수",
    "recGrade": 2,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_031",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN2003",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_032",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN3001",
    "courseCls": "교양선택",
    "recGrade": 3,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_033",
    "deptCode": "214",
    "curriYear": "2021",
    "curiNum": "GEN3002",
    "courseCls": "교양선택",
    "recGrade": 2,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_034",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS1001",
    "courseCls": "전공필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_035",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS1002",
    "courseCls": "전공필수",
    "recGrade": 1,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_036",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS1003",
    "courseCls": "전공선택",
    "recGrade": 1,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_037",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS2001",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_038",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS2002",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_039",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS2003",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_040",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS2004",
    "courseCls": "전공필수",
    "recGrade": 2,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_041",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS2005",
    "courseCls": "전공선택",
    "recGrade": 2,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_042",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS3001",
    "courseCls": "전공필수",
    "recGrade": 3,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_043",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS3002",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_044",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS3003",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_045",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS3004",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_046",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS3005",
    "courseCls": "전공선택",
    "recGrade": 3,
    "recSmt": "2",
    "required": false
  },
  {
    "id": "cur_047",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS4001",
    "courseCls": "전공필수",
    "recGrade": 4,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_048",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS4002",
    "courseCls": "전공필수",
    "recGrade": 4,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_049",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS4003",
    "courseCls": "전공선택",
    "recGrade": 4,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_050",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "BUS4004",
    "courseCls": "전공선택",
    "recGrade": 4,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_051",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN1001",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_052",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN1002",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_053",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN1003",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_054",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN1004",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_055",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN2001",
    "courseCls": "교양필수",
    "recGrade": 2,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_056",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN2002",
    "courseCls": "교양필수",
    "recGrade": 2,
    "recSmt": "2",
    "required": true
  },
  {
    "id": "cur_057",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN2003",
    "courseCls": "교양필수",
    "recGrade": 1,
    "recSmt": "1",
    "required": true
  },
  {
    "id": "cur_058",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN3001",
    "courseCls": "교양선택",
    "recGrade": 3,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_059",
    "deptCode": "201",
    "curriYear": "2019",
    "curiNum": "GEN3002",
    "courseCls": "교양선택",
    "recGrade": 2,
    "recSmt": "1",
    "required": false
  },
  {
    "id": "cur_060",
    "deptCode": "142",
    "curriYear": "2021",
    "curiNum": "IDS2001",
    "courseCls": "전공선택",
    "recGrade": 2,
    "recSmt": "2",
    "required": false
  }
]
$seed176$::jsonb
WHERE path = 'src_v2/data/academic/curriculum.json' AND checksum IN ('75e5de3f0c8aaffd82da9b2c40ce828248d34152b2a1f173b84039f3a1c1744b', '7dc34d036408099bec1fef29ca0cba59349dbd0a8fa9d3e0b52632a7fa54ea75');
UPDATE dc.seed_source SET checksum = '66f94dea0898e61a3616a17667f122b5f8a36af02878dc1976405063ee80a62a', payload = $seed176$[
  {
    "curiNum": "CSE1001",
    "curiNm": "컴퓨터프로그래밍I",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE1002",
    "curiNm": "컴퓨터프로그래밍II",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE1003",
    "curiNm": "이산수학",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE1004",
    "curiNm": "컴퓨터개론",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE2001",
    "curiNm": "자료구조",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE2002",
    "curiNm": "알고리즘",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE2003",
    "curiNm": "객체지향프로그래밍",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE2004",
    "curiNm": "컴퓨터구조",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE2005",
    "curiNm": "데이터베이스",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE2006",
    "curiNm": "웹프로그래밍",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE2007",
    "curiNm": "확률과통계",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE3001",
    "curiNm": "운영체제",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE3002",
    "curiNm": "컴퓨터네트워크",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE3003",
    "curiNm": "소프트웨어공학",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE3004",
    "curiNm": "오픈소스소프트웨어",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE3005",
    "curiNm": "모바일프로그래밍",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE3006",
    "curiNm": "데이터마이닝",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE3007",
    "curiNm": "서버프로그래밍",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE4001",
    "curiNm": "캡스톤디자인I",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE4002",
    "curiNm": "캡스톤디자인II",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE4003",
    "curiNm": "빅데이터처리",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE4004",
    "curiNm": "정보보호",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE4005",
    "curiNm": "클라우드컴퓨팅",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "CSE4006",
    "curiNm": "인공지능",
    "cdtNum": 3,
    "openDeptCd": "214",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS1001",
    "curiNm": "경영학원론",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS1002",
    "curiNm": "회계원리",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS1003",
    "curiNm": "경제학원론",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS2001",
    "curiNm": "마케팅원론",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS2002",
    "curiNm": "조직행동론",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS2003",
    "curiNm": "재무관리",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS2004",
    "curiNm": "경영통계",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS2005",
    "curiNm": "경영정보시스템",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS3001",
    "curiNm": "마케팅관리",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS3002",
    "curiNm": "소비자행동론",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS3003",
    "curiNm": "브랜드관리",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS3004",
    "curiNm": "광고론",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS3005",
    "curiNm": "디지털마케팅",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS4001",
    "curiNm": "마케팅전략",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS4002",
    "curiNm": "경영전략",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS4003",
    "curiNm": "창업론",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "BUS4004",
    "curiNm": "마케팅조사",
    "cdtNum": 3,
    "openDeptCd": "201",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "IDS2001",
    "curiNm": "서비스디자인",
    "cdtNum": 3,
    "openDeptCd": "142",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN1001",
    "curiNm": "대학글쓰기",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN1002",
    "curiNm": "실용영어I",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN1003",
    "curiNm": "실용영어II",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN1004",
    "curiNm": "컴퓨팅사고와SW",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN2001",
    "curiNm": "진로와직업",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN2002",
    "curiNm": "의사소통과리더십",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN2003",
    "curiNm": "대학생활설계",
    "cdtNum": 1,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN3001",
    "curiNm": "인공지능과미래사회",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  },
  {
    "curiNum": "GEN3002",
    "curiNm": "창의적문제해결",
    "cdtNum": 2,
    "openDeptCd": "GEN",
    "gradDiv": "학부",
    "active": true
  }
]
$seed176$::jsonb
WHERE path = 'src_v2/data/academic/subjects.json' AND checksum IN ('14d94f2c4a5f8d93c9194ab7d15cfedaf54806ba75575a1ebeae08df3ba8d010', 'b8fe6ece038735a47c33e9584398620bab456f9a8eced92766eb61ebe2004e2c');
UPDATE dc.seed_source SET checksum = 'cfa0a0f811295db9640b7f65bd8a2e729c625d6657f9c8eb60b6ff12ec8f38d0', payload = $seed176$[
  {
    "studentId": "chaewon",
    "deptCode": "214",
    "entryYear": "2021",
    "certs": [
      {
        "certId": "ct_sqld",
        "acquiredDt": "2023-06-16",
        "certNo": "SQLD-23-0413",
        "verified": true
      },
      {
        "certId": "ct_history",
        "acquiredDt": "2022-09-24",
        "certNo": "한국사-3급",
        "verified": true
      },
      {
        "certId": "ct_comp",
        "acquiredDt": "2021-11-05",
        "certNo": "컴활-1급-2021",
        "verified": true
      },
      {
        "certId": "ct_toeic",
        "acquiredDt": "2023-04-09",
        "certNo": "TOEIC 815",
        "verified": true
      }
    ],
    "jobInterests": [
      {
        "jobId": "job_pm",
        "pinned": true
      },
      {
        "jobId": "job_web",
        "pinned": false
      },
      {
        "jobId": "job_dataeng",
        "pinned": false
      },
      {
        "jobId": "job_fullstack",
        "pinned": false
      }
    ],
    "programRecords": [
      {
        "programId": "pg_resume",
        "title": "이력서 클리닉",
        "appliedAt": "2023-04-12",
        "completed": true
      },
      {
        "programId": "pg_capstone",
        "title": "SW 캡스톤 사전캠프",
        "appliedAt": "2023-07-03",
        "completed": true
      },
      {
        "programId": "pg_pm",
        "title": "IT 서비스 기획 부트캠프",
        "appliedAt": "2023-09-18",
        "completed": false
      }
    ]
  },
  {
    "studentId": "changwon",
    "deptCode": "201",
    "entryYear": "2019",
    "certs": [
      {
        "certId": "ct_adsp",
        "acquiredDt": "2021-09-17",
        "certNo": "ADsP-21-1180",
        "verified": true
      },
      {
        "certId": "ct_comp",
        "acquiredDt": "2020-05-22",
        "certNo": "컴활-1급-2020",
        "verified": true
      },
      {
        "certId": "ct_socmkt",
        "acquiredDt": "2022-03-11",
        "certNo": "SMP-2022-334",
        "verified": true
      },
      {
        "certId": "ct_history",
        "acquiredDt": "2019-12-06",
        "certNo": "한국사-2급",
        "verified": true
      },
      {
        "certId": "ct_distrib",
        "acquiredDt": "2022-11-13",
        "certNo": "유통2급-22-0917",
        "verified": true
      }
    ],
    "jobInterests": [
      {
        "jobId": "job_brand",
        "pinned": true
      },
      {
        "jobId": "job_digitalmkt",
        "pinned": false
      },
      {
        "jobId": "job_mktresearch",
        "pinned": false
      },
      {
        "jobId": "job_hr",
        "pinned": false
      }
    ],
    "programRecords": [
      {
        "programId": "pg_resume",
        "title": "이력서 클리닉",
        "appliedAt": "2021-04-08",
        "completed": true
      },
      {
        "programId": "pg_brand",
        "title": "브랜드 마케팅 실무",
        "appliedAt": "2021-10-15",
        "completed": true
      },
      {
        "programId": "pg_intern",
        "title": "기업연계 인턴십",
        "appliedAt": "2022-01-10",
        "completed": true
      },
      {
        "programId": "pg_interview",
        "title": "모의면접 캠프",
        "appliedAt": "2022-09-06",
        "completed": true
      },
      {
        "programId": "pg_portfolio",
        "title": "포트폴리오 워크숍",
        "appliedAt": "2022-11-21",
        "completed": false
      }
    ]
  },
  {
    "studentId": "jiwoo",
    "deptCode": "214",
    "entryYear": "2026",
    "certs": [],
    "jobInterests": [],
    "programRecords": []
  }
]
$seed176$::jsonb
WHERE path = 'src_v2/data/academic/studentAcademic.json' AND checksum IN ('0c1631ba2e1833a438b84edb0cfa8abc19ce5f7e66ec23e44890f98e836b2c75', 'cd72c37fadeb5405c859ae30d8cdd099971c3dffdce78d3b9cf3c8c46b6b8a38');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM dc.seed_source s JOIN (VALUES
    ('src_admin/data/departments.seed.json', '258ad3e102e1d33f22284a377c1a14d472110bd10968de0342818f1a1411af0c'),
    ('src_admin/data/deptAssigns.seed.json', '8d45c8919d4f6d32c378dd4b55eb5bb1618e21b6914e72f8866c4fcbc4430386'),
    ('src_v2/data/academic/curriculum.json', '84b37312c3ca10ec4cbb6367c542a40ee361c62a7eb3b693013cf48fa73ee8ed'),
    ('src_v2/data/academic/subjects.json', '66f94dea0898e61a3616a17667f122b5f8a36af02878dc1976405063ee80a62a'),
    ('src_v2/data/academic/studentAcademic.json', 'cfa0a0f811295db9640b7f65bd8a2e729c625d6657f9c8eb60b6ff12ec8f38d0')
  ) v(path, checksum) ON v.path = s.path WHERE s.checksum <> v.checksum) THEN
    RAISE EXCEPTION '176: seed ledger has an unknown checksum for a remapped seed file';
  END IF;
END $$;

-- 8. 읽기 모델 뷰 재구성. varchar 길이가 바뀌어 CREATE OR REPLACE 불가 — 의존 역순 명시 DROP(CASCADE 금지).
DROP VIEW dc.staff_student_scope;
DROP VIEW dc.department_assignment_student_scope;
DROP VIEW dc.department_assignment_whole_targets;
DROP VIEW dc.department_assignment_targets;
DROP VIEW dc.department_staff_candidates;
DROP VIEW dc.academic_joint_appointments;
DROP VIEW dc.academic_organizations;
DROP VIEW dc.academic_student_details;
DROP VIEW dc.academic_people;
DROP VIEW dc.fixture_student_login_source;
DROP VIEW dc.student_login_source;

-- 학생 로그인 투영: 학적 상태 무관 학생 전체(USER_TY_CD='0001', 사용자 확정). 학과 = HAKBU_CD, 단대 = 그 학과의 COL_CODE.
-- 로그인 번호는 dc.fixture_student_login 으로만 바뀐다(로컬 인원). 조회는 intg_uid 단일 조건으로 한다.
CREATE VIEW dc.student_login_source AS
SELECT a.intg_uid,
       COALESCE(f.student_no, a.intg_uid::text) AS student_no,
       COALESCE(o.name, a.usr_nm::text) AS name,
       COALESCE(o.college_code, d.col_code::text) AS college_code,
       COALESCE(o.dept_code, NULLIF(a.hakbu_cd::text, '')) AS dept_code,
       COALESCE(o.college_name, c.col_name::text) AS college_name,
       COALESCE(o.dept_name, d.dept_name::text) AS dept_name,
       a.stu_schgr, a.hofc_sta_cd, a.user_ty_cd, a.univ_cd,
       (o.intg_uid IS NOT NULL OR a.origin = 'local') AS local_override
FROM academic.usr_inf a
LEFT JOIN dc.fixture_student_login f ON f.student_uid = a.intg_uid
LEFT JOIN dc.student_login_override o ON o.intg_uid = a.intg_uid
LEFT JOIN academic.dc_v_dept_inf d ON d.dept_code = a.hakbu_cd
LEFT JOIN academic.dc_v_col_inf c ON c.col_code = d.col_code
WHERE a.user_ty_cd = '0001';

-- 소속명: 학과 → 부서 → 기관(교직원은 학과가 없을 수 있다). 논리 키 중복이 행을 불리지 않게 키당 1행.
CREATE VIEW dc.academic_people AS
SELECT a.intg_uid, a.usr_nm AS name, a.user_ty_cd, a.hofc_sta_cd, a.orgid,
       COALESCE(d.dept_name::text, pt.part_name::text, og.org_name::text) AS orgz_nm,
       a.daehak_cd, a.hakbu_cd, a.major_cd, a.major_cd1 AS major_cd2, a.stu_schgr,
       NULL::text AS prof_id, a.rankid, a.univ_cd,
       CASE
         WHEN a.user_ty_cd = '0001' AND a.hofc_sta_cd IN ('0001', '0002') THEN 'student'
         WHEN a.user_ty_cd = '0001' AND a.hofc_sta_cd IN ('0003', '0004', '0005') THEN 'graduate'
         WHEN a.user_ty_cd = '0001' THEN 'other'
         WHEN a.user_ty_cd = '0002' THEN 'professor'
         WHEN a.user_ty_cd = '0004' THEN 'assistant'
         WHEN a.user_ty_cd = '0003' THEN 'employee'
         ELSE 'other'
       END AS category,
       a.emp_no
FROM academic.usr_inf a
LEFT JOIN (SELECT DISTINCT ON (dept_code) dept_code, dept_name FROM academic.dc_v_dept_inf
           ORDER BY dept_code, use_flag DESC NULLS LAST) d ON d.dept_code = a.hakbu_cd
LEFT JOIN (SELECT DISTINCT ON (part_code) part_code, part_name FROM academic.dc_v_part_inf
           ORDER BY part_code, use_flag DESC NULLS LAST) pt ON pt.part_code = a.partid
LEFT JOIN (SELECT DISTINCT ON (org_code) org_code, org_name FROM academic.dc_v_org_inf
           ORDER BY org_code, use_flag DESC NULLS LAST) og ON og.org_code = a.orgid;

CREATE VIEW dc.academic_student_details AS
SELECT a.intg_uid, a.sex AS sex_code, a.grade AS academic_gpa, a.out_dt, a.for_yn AS foreigner_code,
       a.hp AS mobile, a.email, a.grad_exp_ym, a.isu_grade, a.curri_year
FROM academic.usr_inf a
WHERE a.user_ty_cd = '0001';

-- (lvl, dept_cd) 쌍이 키다 — MAJOR_CODE 와 DEPT_CODE 가 겹친다. lvl3 는 gubun 0 을 포함한 전체 전공.
CREATE VIEW dc.academic_organizations AS
SELECT c.col_code::text AS dept_cd, c.col_name::text AS dept_nm, NULL::text AS dept_up_cd,
       '0001'::text AS grp_cd, '단대'::text AS grp_nm, c.listorder::text AS ordering, '1'::text AS lvl,
       CASE WHEN c.use_flag = '1' THEN 'Y' ELSE 'N' END AS use_yn, c.col_short_name::text AS dept_sub_nm,
       NULL::text AS univ_code, NULL::text AS gubun_code
FROM academic.dc_v_col_inf c
UNION ALL
SELECT d.dept_code::text, d.dept_name::text, d.col_code::text, '0002', '학과', d.listorder::text, '2',
       CASE WHEN d.use_flag = '1' THEN 'Y' ELSE 'N' END, d.dept_short_name::text, d.univ_code::text,
       d.gubun_code::text
FROM academic.dc_v_dept_inf d
UNION ALL
SELECT m.major_code::text, m.major_name::text, m.dept_code::text, '0003', '전공', m.listorder::text, '3',
       CASE WHEN m.use_flag = '1' THEN 'Y' ELSE 'N' END, NULL::text, m.univ_code::text, m.gubun_code::text
FROM academic.dc_v_major_inf m
WHERE m.dept_code IS NOT NULL;

-- 교직원 키는 사번(EMP_NO). 한 사번이 교원·조교 행을 모두 가져도 역할별로 남기고, 결정적으로 고른다.
-- DISTINCT ON 키가 출력 열(staff_uid, role_code)이라 staff_uid 술어가 emp_no 부분 인덱스로 내려간다.
CREATE VIEW dc.department_staff_candidates AS
SELECT DISTINCT ON (x.staff_uid, x.role_code)
       x.staff_uid, x.name, x.employee_no, x.role_code, x.mobile, x.phone, x.organization, x.is_active
FROM (
  SELECT u.emp_no::text AS staff_uid, u.usr_nm::text AS name, u.emp_no::text AS employee_no,
         CASE u.user_ty_cd WHEN '0004' THEN 'assistant' ELSE 'professor' END AS role_code,
         u.hp::text AS mobile, u.tel::text AS phone,
         COALESCE(d.dept_name::text, pt.part_name::text, og.org_name::text) AS organization,
         u.hofc_sta_cd = '0006' AS is_active, u.upd_dt, u.intg_uid
  FROM academic.usr_inf u
  LEFT JOIN (SELECT DISTINCT ON (dept_code) dept_code, dept_name FROM academic.dc_v_dept_inf
             ORDER BY dept_code, use_flag DESC NULLS LAST) d ON d.dept_code = u.hakbu_cd
  LEFT JOIN (SELECT DISTINCT ON (part_code) part_code, part_name FROM academic.dc_v_part_inf
             ORDER BY part_code, use_flag DESC NULLS LAST) pt ON pt.part_code = u.partid
  LEFT JOIN (SELECT DISTINCT ON (org_code) org_code, org_name FROM academic.dc_v_org_inf
             ORDER BY org_code, use_flag DESC NULLS LAST) og ON og.org_code = u.orgid
  WHERE u.user_ty_cd IN ('0002', '0004') AND u.emp_no IS NOT NULL
) x
ORDER BY x.staff_uid, x.role_code, x.is_active DESC, x.upd_dt DESC NULLS LAST, x.intg_uid;

CREATE VIEW dc.academic_joint_appointments AS
SELECT intg_uid, emp_no, orgid, partid FROM academic.dc_v_add_job_part;

CREATE VIEW dc.department_assignment_targets AS
WITH org AS (
  SELECT * FROM dc.academic_organizations WHERE use_yn = 'Y'
), academic_targets AS (
  SELECT c.dept_cd AS college_code, c.dept_nm AS college_name, d.dept_cd AS dept_code, d.dept_nm AS dept_name,
         COALESCE(m.dept_cd, '') AS major_code, m.dept_nm AS major_name
  FROM org d
  JOIN org c ON c.lvl = '1' AND c.dept_cd = d.dept_up_cd
  LEFT JOIN org m ON m.lvl = '3' AND m.dept_up_cd = d.dept_cd
  WHERE d.lvl = '2'
)
SELECT DISTINCT college_code, college_name, dept_code, dept_name, major_code, major_name FROM academic_targets
UNION ALL
SELECT d.college_code, d.college_name, d.dept_code, d.dept_name, ''::text, NULL::text
FROM dc.department d
WHERE NOT EXISTS (SELECT 1 FROM academic_targets a WHERE a.college_code = d.college_code AND a.dept_code = d.dept_code);

CREATE VIEW dc.department_assignment_whole_targets AS
SELECT DISTINCT c.dept_cd AS college_code, c.dept_nm AS college_name, d.dept_cd AS dept_code, d.dept_nm AS dept_name,
       ''::text AS major_code, NULL::text AS major_name
FROM dc.academic_organizations d
JOIN dc.academic_organizations c ON c.dept_cd = d.dept_up_cd AND c.lvl = '1'
WHERE d.lvl = '2' AND d.use_yn = 'Y' AND c.use_yn = 'Y'
  AND EXISTS (SELECT 1 FROM dc.department_staff_assignment a
              WHERE a.college_code = c.dept_cd AND a.dept_code = d.dept_cd AND a.major_code = '' AND a.is_active);

-- 비활성 판정은 역할까지 맞춘다(한 사번 두 역할).
CREATE VIEW dc.department_assignment_student_scope AS
SELECT DISTINCT a.staff_uid, s.intg_uid AS student_uid, a.role_code
FROM dc.department_staff_assignment a
JOIN dc.staff staff ON staff.intg_uid = a.staff_uid AND staff.role_code = a.role_code
JOIN dc.student s ON s.college_code = a.college_code AND s.dept_code = a.dept_code
WHERE a.is_active AND a.legacy_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM dc.department_staff_candidates c
                  WHERE c.staff_uid = a.staff_uid AND c.role_code = a.role_code AND NOT c.is_active)
  AND (a.major_code = '' OR EXISTS (SELECT 1 FROM dc.academic_people p
                                    WHERE p.intg_uid = s.intg_uid AND p.major_cd = a.major_code));

CREATE VIEW dc.staff_student_scope AS
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
FROM dc.department_assignment_student_scope;

-- DROP 으로 권한이 사라졌다. security_invoker 는 켜지 않는다(소유자 권한으로 academic 을 읽는다).
GRANT SELECT ON dc.student_login_source, dc.academic_people, dc.academic_student_details, dc.academic_organizations,
  dc.department_staff_candidates, dc.academic_joint_appointments, dc.department_assignment_targets,
  dc.department_assignment_whole_targets, dc.department_assignment_student_scope, dc.staff_student_scope TO dc_app;

-- 9. 학과 투영 갱신. 동기화 공개 트랜잭션의 마지막 단계에서 호출한다. 삭제하지 않는다.
CREATE FUNCTION dc.refresh_department_from_academic() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE
  moved integer := 0;
  upserted integer := 0;
  deactivated integer := 0;
  aligned integer := 0;
  college_unlinked integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM academic.dc_v_dept_inf) THEN
    RAISE EXCEPTION 'academic.dc_v_dept_inf is empty; refusing to refresh dc.department';
  END IF;

  -- (1) 학과 단대 이동(같은 DEPT_CODE, COL_CODE 변경): 한 문장 안에서 로그 → FK 없는 참조 → dc.department 키 제자리 UPDATE.
  --     dc.student·dc.org_assignment 는 FK ON UPDATE CASCADE 로 따라온다(로그는 여기서 함께 남긴다).
  WITH mv AS (
    SELECT d.college_code AS old_college, d.dept_code, s.col_code::text AS new_college
    FROM dc.department d JOIN academic.dc_v_dept_inf s ON s.dept_code::text = d.dept_code
    WHERE s.col_code::text <> d.college_code
  ), logged AS (
    INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
    SELECT t.table_name, t.row_key, mv.old_college, mv.dept_code, mv.new_college, mv.dept_code, 'college_move'
    FROM (
      SELECT 'department'::text AS table_name, d.college_code || ':' || d.dept_code AS row_key, d.college_code, d.dept_code
      FROM dc.department d
      UNION ALL SELECT 'student', x.intg_uid, x.college_code, x.dept_code FROM dc.student x
      UNION ALL SELECT 'org_assignment', x.id::text, x.college_code, x.dept_code FROM dc.org_assignment x
      UNION ALL SELECT 'department_staff_assignment', x.id::text, x.college_code, x.dept_code FROM dc.department_staff_assignment x
      UNION ALL SELECT 'student_login_override', x.intg_uid, x.college_code, x.dept_code FROM dc.student_login_override x
    ) t JOIN mv ON mv.dept_code = t.dept_code AND mv.old_college = t.college_code
    RETURNING 1
  ), staff AS (
    UPDATE dc.department_staff_assignment a SET college_code = mv.new_college
    FROM mv WHERE a.dept_code = mv.dept_code AND a.college_code = mv.old_college
    RETURNING 1
  ), override AS (
    UPDATE dc.student_login_override o SET college_code = mv.new_college
    FROM mv WHERE o.dept_code = mv.dept_code AND o.college_code = mv.old_college
    RETURNING 1
  ), dept AS (
    UPDATE dc.department d SET college_code = mv.new_college
    FROM mv WHERE d.dept_code = mv.dept_code AND d.college_code = mv.old_college
    RETURNING 1
  )
  -- 데이터 변경 CTE 는 참조 여부와 무관하게 정확히 한 번 실행된다.
  SELECT count(*) INTO moved FROM dept;

  -- (2) 학사 학과 upsert. 이동을 먼저 처리했으므로 dept_code 유일 인덱스에 걸리지 않는다.
  INSERT INTO dc.department AS d (college_code, dept_code, college_name, dept_name, course, univ_code, is_active, source)
  SELECT s.col_code::text, s.dept_code::text,
         COALESCE((SELECT c.col_name::text FROM academic.dc_v_col_inf c WHERE c.col_code = s.col_code
                   ORDER BY c.use_flag DESC NULLS LAST LIMIT 1), s.col_code::text),
         s.dept_name::text,
         COALESCE((SELECT k.code_nm::text FROM academic.dc_v_code_inf k
                   WHERE k.code_grp = 'UNIV_CD' AND k.code = s.univ_code
                   ORDER BY k.use_yn DESC NULLS LAST LIMIT 1), s.univ_code::text, '미상'),
         s.univ_code::text, s.use_flag = '1', 'academic'
  FROM academic.dc_v_dept_inf s
  ON CONFLICT (college_code, dept_code) DO UPDATE
    SET college_name = EXCLUDED.college_name, dept_name = EXCLUDED.dept_name, course = EXCLUDED.course,
        univ_code = EXCLUDED.univ_code, is_active = EXCLUDED.is_active, source = EXCLUDED.source
    WHERE (d.college_name, d.dept_name, d.course, d.univ_code, d.is_active, d.source)
          IS DISTINCT FROM (EXCLUDED.college_name, EXCLUDED.dept_name, EXCLUDED.course, EXCLUDED.univ_code,
                            EXCLUDED.is_active, EXCLUDED.source);
  GET DIAGNOSTICS upserted = ROW_COUNT;
  SELECT count(*) INTO college_unlinked FROM academic.dc_v_dept_inf s
  WHERE NOT EXISTS (SELECT 1 FROM academic.dc_v_col_inf c WHERE c.col_code = s.col_code);

  -- (3) 원본에서 사라진 행은 삭제하지 않고 비활성.
  UPDATE dc.department d SET is_active = false
  WHERE d.is_active AND NOT EXISTS (SELECT 1 FROM academic.dc_v_dept_inf s
                                    WHERE s.dept_code::text = d.dept_code AND s.col_code::text = d.college_code);
  GET DIAGNOSTICS deactivated = ROW_COUNT;

  -- (4) dc.student 조직 정합. 학사가 정본(CLAUDE.md 규칙 1) — 전과 학생은 새 학과 스코프로 옮긴다.
  --     학과명 라벨도 함께 맞춘다(첫 로그인 때 '소속 미등록'으로 굳은 학생).
  WITH target AS (
    SELECT x.intg_uid, x.college_code AS old_college, x.dept_code AS old_dept,
           l.college_code, l.dept_code, NULLIF(l.dept_name, '') AS dept_name
    FROM dc.student x
    JOIN dc.student_login_source l ON l.intg_uid = x.intg_uid
    JOIN dc.department d ON d.college_code = l.college_code AND d.dept_code = l.dept_code
    WHERE (x.college_code, x.dept_code) IS DISTINCT FROM (l.college_code, l.dept_code)
  ), changed AS (
    UPDATE dc.student x SET college_code = t.college_code, dept_code = t.dept_code,
           major_label = COALESCE(t.dept_name, x.major_label)
    FROM target t WHERE t.intg_uid = x.intg_uid
    RETURNING t.intg_uid, t.old_college, t.old_dept, t.college_code, t.dept_code)
  INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
  SELECT 'student', intg_uid, old_college, old_dept, college_code, dept_code, 'academic_alignment' FROM changed;
  GET DIAGNOSTICS aligned = ROW_COUNT;

  RETURN jsonb_build_object('moved', moved, 'upserted', upserted, 'deactivated', deactivated,
                            'studentsAligned', aligned, 'collegeUnlinked', college_unlinked,
                            'departments', (SELECT count(*) FROM dc.department),
                            'activeDepartments', (SELECT count(*) FROM dc.department WHERE is_active));
END
$fn$;
REVOKE EXECUTE ON FUNCTION dc.refresh_department_from_academic() FROM PUBLIC;
