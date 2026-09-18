# DB 전체 구조 명세 — 카탈로그 추출

업무 행·개인정보 없이 카탈로그만 추출. estimated_rows는 통계 추정값이며 -1은 미수집이다.
정규화·변경 판단은 [DB 리뷰](../DB_REVIEW_2026-09-16.md)를 함께 본다.
FK 인덱스 후보는 전체 키의 비부분 B-tree 선두 포함 여부만 검사한다. 부분 인덱스와 더 짧은 UNIQUE 인덱스가 충분할 수 있으므로 결함 목록이 아니다.

## academic.com_con_inf

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| conid | character varying(20) | O | — |
| inout_gb | character varying(1) | — | — |
| con_nm | character varying(30) | O | — |
| con_gb | character varying(1) | — | — |
| con_area1 | character varying(1) | — | — |
| con_area2 | character varying(1) | — | — |
| con_type1 | character varying(1) | — | — |
| con_type2 | character varying(1) | — | — |
| target | character varying(200) | — | — |
| limit_gb | character varying(1) | — | — |
| limit_num | numeric | — | — |
| con_day | character varying(4) | — | — |
| con_w1 | character varying(1) | — | — |
| con_w2 | character varying(1) | — | — |
| con_w3 | character varying(1) | — | — |
| con_w4 | character varying(1) | — | — |
| con_w5 | character varying(1) | — | — |
| place | character varying(50) | — | — |
| place_num | character varying(30) | — | — |
| tel | character varying(20) | — | — |
| email | character varying(100) | — | — |
| regid | character varying(20) | O | — |
| regdate | timestamp without time zone | O | — |
| updid | character varying(20) | O | — |
| upddate | timestamp without time zone | O | — |
| status | character varying(4) | — | — |
| app_tel | character varying(20) | — | — |
| app_place | character varying(50) | — | — |
| memo | character varying(200) | — | — |
| con_type3 | character varying(1) | — | — |
| con_area3 | character varying(1) | — | — |
| con_area_code1 | character varying(1) | — | — |
| con_area_code2 | character varying(1) | — | — |
| con_area_code3 | character varying(1) | — | — |
| con_area_code4 | character varying(1) | — | — |
| con_area_code5 | character varying(1) | — | — |
| con_area_code6 | character varying(1) | — | — |
| con_area_code7 | character varying(1) | — | — |
| con_area_code8 | character varying(1) | — | — |
| con_area_code9 | character varying(1) | — | — |
| con_area4 | character varying(1) | — | — |
| conpwd | character varying(32) | — | — |
| con_gb2 | character varying(100) | — | — |
| con_comp_nm | character varying(100) | — | — |
| con_area_code10 | character varying(1) | — | — |
| con_area_code11 | character varying(1) | — | — |
| con_area_code12 | character varying(1) | — | — |
| con_area_code13 | character varying(1) | — | — |
| con_area | character varying(1) | — | — |
| agree_date | timestamp without time zone | — | — |
| agree_yn | character varying(1) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.com_con_tar

추정 행수 325, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| conid | character varying(20) | O | — |
| daehak_cd | character varying(20) | O | — |
| regid | character varying(20) | O | — |
| regdate | timestamp without time zone | O | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.com_hakbyundong

추정 행수 -1, 테이블·인덱스 총 0 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| byun_hakbun | character varying(10) | O | — |
| byun_ilja | character varying(10) | O | — |
| byun_code | character varying(20) | O | — |
| byun_sayu_code | character varying(20) | — | — |
| byun_term | character varying(100) | — | — |
| byun_bigo | character varying(100) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.com_hakjuk

추정 행수 -1, 테이블·인덱스 총 8192 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| hj_korname | character varying(20) | O | — |
| hj_hakjuk_sangtae | character varying(10) | — | — |
| hj_hakbun | character varying(10) | O | — |
| korname1 | character varying(40) | — | — |
| hj_hakyun | character varying(1) | — | — |
| hj_isu_hakgi_count | numeric(38,0) | — | — |
| hj_saengil | character varying(8) | — | — |
| hj_sex | character varying(2) | — | — |
| hj_iphak_ilja | character varying(8) | — | — |
| hj_jol_ilja | character varying(8) | — | — |
| nugye_hakgi | character varying(10) | — | — |
| hj_hakwe_code1 | character varying(20) | — | — |
| hj_hakwe_jeungseo_bunho1 | character varying(20) | — | — |
| hyunjuso | character varying(300) | — | — |
| email | character varying(50) | — | — |
| handphone | character varying(20) | — | — |
| hj_bujun | character varying(100) | — | — |
| hj_boksu | character varying(100) | — | — |
| hj_bujun2 | character varying(100) | — | — |
| hj_boksu2 | character varying(100) | — | — |
| dae_pyosi_gwamok | character varying(300) | — | — |
| dae_jeungsu_bunho | character varying(100) | — | — |
| hj_sahoi_sin_check | character varying(100) | — | — |
| dae_pass_gubun | character varying(100) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.fu_ass_dept

추정 행수 202, 테이블·인덱스 총 40960 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| dept_cd | character varying(20) | — | — |
| usr_id | character varying(20) | — | — |
| usr_nm | character varying(30) | — | — |
| major_cd | character varying(20) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.sync_run

추정 행수 2, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | — |
| started_at | timestamp with time zone | O | — |
| finished_at | timestamp with time zone | O | now() |
| source_label | text | O | — |
| snapshot_mode | text | O | — |
| report | jsonb | O | — |

**제약**

- `sync_run_pkey`: `PRIMARY KEY (id)`
- `sync_run_snapshot_mode_check`: `CHECK ((snapshot_mode = 'per-table-select'::text))`

**인덱스**

- `sync_run_pkey`: `CREATE UNIQUE INDEX sync_run_pkey ON academic.sync_run USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.v_add_job_part

추정 행수 -1, 테이블·인덱스 총 8192 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | character varying(30) | — | — |
| emp_no | character varying(20) | — | — |
| orgid | character varying(10) | — | — |
| partid | character varying(10) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.v_dep_inf

추정 행수 1688, 테이블·인덱스 총 196608 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| dept_cd | character varying(40) | — | — |
| dept_nm | character varying(100) | — | — |
| dept_up_cd | character varying(20) | — | — |
| grp_cd | character varying(4) | — | — |
| grp_nm | character varying(20) | — | — |
| ordering | character varying(40) | — | — |
| lvl | character varying(1) | — | — |
| use_yn | character varying(1) | — | — |
| dept_sub_nm | character varying(100) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.v_dep_inf_all

추정 행수 1926, 테이블·인덱스 총 229376 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| dept_cd | character varying(40) | — | — |
| dept_nm | character varying(100) | — | — |
| dept_up_cd | character varying(20) | — | — |
| grp_cd | character varying(4) | — | — |
| grp_nm | character varying(20) | — | — |
| ordering | character varying(40) | — | — |
| lvl | character varying(1) | — | — |
| use_yn | character varying(1) | — | — |
| dept_sub_nm | character varying(100) | — | — |
| univ_code | character varying(2) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.v_lect_inf

추정 행수 -1, 테이블·인덱스 총 8192 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| year | character varying(4) | — | — |
| smt | character varying(2) | — | — |
| grad_div | character varying(2) | — | — |
| dept_cd | character varying(8) | — | — |
| curi_num | character varying(6) | — | — |
| course_cls | character varying(3) | — | — |
| deu_hakgi | character varying(2) | — | — |
| curi_nm | character varying(80) | — | — |
| cdt_num | numeric(3,1) | — | — |
| prof_id | character varying(6) | — | — |
| prof_nm | character varying(20) | — | — |
| comdiv_cd_nm | character varying(4000) | — | — |
| abo_tp | character varying(1) | — | — |
| cap_per1 | numeric | — | — |
| cap_per2 | numeric | — | — |
| cap_per3 | numeric | — | — |
| cap_per4 | numeric | — | — |
| cap_per5 | numeric | — | — |
| cap_per6 | numeric | — | — |
| cap_per | numeric | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.v_sugang

추정 행수 -1, 테이블·인덱스 총 0 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| year | character varying(4) | — | — |
| smt | character varying(2) | — | — |
| student_cd | character varying(10) | — | — |
| curi_num | character varying(6) | — | — |
| course_cls | character varying(3) | — | — |
| grad_div | character varying(2) | — | — |
| student_year | numeric(1,0) | — | — |
| chk_recuri | character varying(1) | — | — |
| cancel_yn | character varying(1) | — | — |
| serial_num | character varying(6) | — | — |
| grade | character varying(2) | — | — |
| gpa | numeric(4,2) | — | — |
| finish_yn | character varying(1) | — | — |
| finish_opt | character varying(6) | — | — |
| edu_hakgi | character varying(2) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.v_usr_inf

추정 행수 114174, 테이블·인덱스 총 33071104 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | character varying(40) | O | — |
| orgid | character varying(10) | — | — |
| orgz_nm | character varying(200) | — | — |
| stu_schgr | character varying(20) | — | — |
| hofc_sta_cd | character varying(4) | — | — |
| user_ty_cd | character varying(4) | — | — |
| usr_nm | character varying(100) | — | — |
| sex | character varying(4) | — | — |
| daehak_cd | character varying(10) | — | — |
| hakbu_cd | character varying(10) | — | — |
| major_cd | character varying(10) | — | — |
| major_cd2 | character varying(4000) | — | — |
| tel | character varying(40) | — | — |
| hp | character varying(40) | — | — |
| post | character varying(6) | — | — |
| addr1 | character varying(500) | — | — |
| addr2 | character varying(500) | — | — |
| email | character varying(100) | — | — |
| age | character varying(26) | — | — |
| for_yn | character varying(1) | — | — |
| grade | numeric | — | — |
| egnm | character varying(100) | — | — |
| chnm | character varying(100) | — | — |
| mj2_nm | character varying(20) | — | — |
| out_dt | character varying(8) | — | — |
| enter_dt | character varying(8) | — | — |
| out_gb | character varying(20) | — | — |
| out_todo | character varying(24) | — | — |
| out_stat | character varying(6) | — | — |
| isu_cnt | numeric | — | — |
| dean_flag | character varying(1) | — | — |
| prof_id | character varying(20) | — | — |
| usr_gbn | character varying(1) | — | — |
| uuid | character varying(50) | — | — |
| hs_uid | character varying(50) | — | — |
| plur_grad_yn | character varying(1) | — | — |
| photo | character varying(100) | — | — |
| login_id | character varying(20) | — | — |
| rankid | character varying(10) | — | — |
| univ_cd | character varying(10) | — | — |
| erase_dt | character varying(10) | — | — |
| usr_enm | character varying(100) | — | — |
| usr_hnm | character varying(100) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## academic.v_usr_inf_dup_inf

추정 행수 129, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | character varying(40) | — | — |
| orgid | character varying(10) | — | — |
| orgz_nm | character varying(200) | — | — |
| stu_schgr | character varying(20) | — | — |
| hofc_sta_cd | character varying(4) | — | — |
| user_ty_cd | character varying(4) | — | — |
| usr_nm | character varying(100) | — | — |
| sex | character varying(4) | — | — |
| daehak_cd | character varying(10) | — | — |
| hakbu_cd | character varying(10) | — | — |
| major_cd | character varying(10) | — | — |
| major_cd2 | character varying(4000) | — | — |
| tel | character varying(40) | — | — |
| hp | character varying(40) | — | — |
| post | character varying(6) | — | — |
| addr1 | character varying(500) | — | — |
| addr2 | character varying(500) | — | — |
| email | character varying(100) | — | — |
| age | character varying(26) | — | — |
| for_yn | character varying(1) | — | — |
| grade | numeric | — | — |
| egnm | character varying(100) | — | — |
| chnm | character varying(100) | — | — |
| mj2_nm | character varying(20) | — | — |
| out_dt | character varying(8) | — | — |
| enter_dt | character varying(8) | — | — |
| out_gb | character varying(20) | — | — |
| out_todo | character varying(24) | — | — |
| out_stat | character varying(6) | — | — |
| isu_cnt | numeric | — | — |
| dean_flag | character varying(1) | — | — |
| prof_id | character varying(20) | — | — |
| usr_gbn | character varying(1) | — | — |
| uuid | character varying(50) | — | — |
| hs_uid | character varying(50) | — | — |
| plur_grad_yn | character varying(1) | — | — |
| photo | character varying(100) | — | — |
| login_id | character varying(20) | — | — |
| rankid | character varying(10) | — | — |
| univ_cd | character varying(10) | — | — |
| erase_dt | character varying(10) | — | — |
| usr_enm | character varying(100) | — | — |
| usr_hnm | character varying(100) | — | — |

**제약**

없음.

**인덱스**

없음.

**트리거**

없음.

**앱 계정 권한**

없음.

## dc.admin_event

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| entity | text | O | — |
| entity_id | text | O | — |
| before_value | jsonb | — | — |
| after_value | jsonb | O | — |
| reason | text | O | — |
| changed_by | text | O | — |
| changed_at | timestamp with time zone | O | now() |

**제약**

- `admin_event_changed_by_fkey`: `FOREIGN KEY (changed_by) REFERENCES dc.person(intg_uid)`
- `admin_event_pkey`: `PRIMARY KEY (id)`

**인덱스**

- `admin_event_pkey`: `CREATE UNIQUE INDEX admin_event_pkey ON dc.admin_event USING btree (id)`

**트리거**

- `admin_event_immutable`: `CREATE TRIGGER admin_event_immutable BEFORE DELETE OR UPDATE ON dc.admin_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.advisor_assignment

추정 행수 2, 테이블·인덱스 총 81920 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| professor_uid | text | O | — |
| assigned_by_uid | text | O | — |
| assigned_on | date | O | — |
| released_at | timestamp with time zone | — | — |
| released_by_uid | text | — | — |
| release_reason | text | — | — |
| snapshot | jsonb | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `advisor_assignment_assigned_by_uid_fkey`: `FOREIGN KEY (assigned_by_uid) REFERENCES dc.person(intg_uid)`
- `advisor_assignment_pkey`: `PRIMARY KEY (id)`
- `advisor_assignment_professor_uid_fkey`: `FOREIGN KEY (professor_uid) REFERENCES dc.staff(intg_uid)`
- `advisor_assignment_released_by_uid_fkey`: `FOREIGN KEY (released_by_uid) REFERENCES dc.person(intg_uid)`
- `advisor_assignment_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `ck_advisor_assignment_release`: `CHECK (((released_at IS NULL) = (released_by_uid IS NULL)))`
- `ck_advisor_assignment_snapshot`: `CHECK ((snapshot ?& ARRAY['studentNo'::text, 'name'::text, 'major'::text, 'grade'::text, 'professorName'::text]))`

**인덱스**

- `advisor_assignment_pkey`: `CREATE UNIQUE INDEX advisor_assignment_pkey ON dc.advisor_assignment USING btree (id)`
- `ix_advisor_assignment_professor`: `CREATE INDEX ix_advisor_assignment_professor ON dc.advisor_assignment USING btree (professor_uid, assigned_on DESC) WHERE (released_at IS NULL)`
- `ix_advisor_assignment_student_history`: `CREATE INDEX ix_advisor_assignment_student_history ON dc.advisor_assignment USING btree (student_uid, assigned_on DESC, id)`
- `uq_advisor_assignment_active`: `CREATE UNIQUE INDEX uq_advisor_assignment_active ON dc.advisor_assignment USING btree (student_uid) WHERE (released_at IS NULL)`

**트리거**

- `advisor_assignment_no_delete`: `CREATE TRIGGER advisor_assignment_no_delete BEFORE DELETE ON dc.advisor_assignment FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`
- `advisor_assignment_release_only`: `CREATE TRIGGER advisor_assignment_release_only BEFORE UPDATE ON dc.advisor_assignment FOR EACH ROW EXECUTE FUNCTION dc.advisor_assignment_release_only()`

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.ai_comment

추정 행수 8, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| run_id | text | O | — |
| body | text | O | — |

**제약**

- `ai_comment_body_not_blank`: `CHECK ((btrim(body) <> ''::text))`
- `ai_comment_pkey`: `PRIMARY KEY (run_id)`
- `ai_comment_run_id_fkey`: `FOREIGN KEY (run_id) REFERENCES dc.ai_run(id) ON DELETE CASCADE`

**인덱스**

- `ai_comment_pkey`: `CREATE UNIQUE INDEX ai_comment_pkey ON dc.ai_comment USING btree (run_id)`

**트리거**

- `ai_comment_immutable`: `CREATE TRIGGER ai_comment_immutable BEFORE DELETE OR UPDATE ON dc.ai_comment FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.ai_run

추정 행수 22, 테이블·인덱스 총 81920 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| kind_group | text | — | 'AI_RUN_KIND'::text |
| kind_code | text | O | — |
| student_uid | text | O | — |
| subject_kind | text | — | — |
| subject_id | text | — | — |
| model | text | O | — |
| requested_by | text | — | — |
| created_at | timestamp with time zone | O | now() |
| input_snapshot | jsonb | — | — |
| input_hash | text | — | — |
| schema_version | smallint | — | — |
| source_ref | jsonb | — | — |

**제약**

- `ai_run_kind_fk`: `FOREIGN KEY (kind_group, kind_code) REFERENCES dc.code_item(group_code, code)`
- `ai_run_pkey`: `PRIMARY KEY (id)`
- `ai_run_provenance`: `CHECK (((schema_version IS NULL) OR ((input_hash IS NOT NULL) AND (input_snapshot IS NOT NULL))))`
- `ai_run_requested_by_fkey`: `FOREIGN KEY (requested_by) REFERENCES dc.person(intg_uid)`
- `ai_run_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `ai_run_subject_pair`: `CHECK (((subject_kind IS NULL) = (subject_id IS NULL)))`

**인덱스**

- `ai_run_pkey`: `CREATE UNIQUE INDEX ai_run_pkey ON dc.ai_run USING btree (id)`
- `ai_run_student`: `CREATE INDEX ai_run_student ON dc.ai_run USING btree (student_uid, kind_code, created_at DESC)`
- `ai_run_subject`: `CREATE INDEX ai_run_subject ON dc.ai_run USING btree (subject_kind, subject_id) WHERE (subject_id IS NOT NULL)`

**트리거**

- `ai_run_immutable`: `CREATE TRIGGER ai_run_immutable BEFORE DELETE OR UPDATE ON dc.ai_run FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.ai_score

추정 행수 18, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | bigint | O | IDENTITY a |
| run_id | text | O | — |
| position | integer | O | — |
| label | text | O | — |
| score | numeric(6,2) | O | — |
| comment | text | — | — |

**제약**

- `ai_score_pkey`: `PRIMARY KEY (id)`
- `ai_score_run_id_fkey`: `FOREIGN KEY (run_id) REFERENCES dc.ai_run(id) ON DELETE CASCADE`
- `ai_score_run_id_position_key`: `UNIQUE (run_id, "position")`

**인덱스**

- `ai_score_pkey`: `CREATE UNIQUE INDEX ai_score_pkey ON dc.ai_score USING btree (id)`
- `ai_score_run_id_position_key`: `CREATE UNIQUE INDEX ai_score_run_id_position_key ON dc.ai_score USING btree (run_id, "position")`

**트리거**

- `ai_score_immutable`: `CREATE TRIGGER ai_score_immutable BEFORE DELETE OR UPDATE ON dc.ai_score FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.ai_suggestion

추정 행수 135, 테이블·인덱스 총 114688 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | bigint | O | IDENTITY a |
| run_id | text | O | — |
| position | integer | O | — |
| category | text | — | — |
| title | text | O | — |
| detail | text | — | — |
| meta | jsonb | O | '{}'::jsonb |

**제약**

- `ai_suggestion_pkey`: `PRIMARY KEY (id)`
- `ai_suggestion_run_id_fkey`: `FOREIGN KEY (run_id) REFERENCES dc.ai_run(id) ON DELETE CASCADE`
- `ai_suggestion_run_id_position_key`: `UNIQUE (run_id, "position")`
- `ai_suggestion_title_not_blank`: `CHECK ((btrim(title) <> ''::text))`

**인덱스**

- `ai_suggestion_pkey`: `CREATE UNIQUE INDEX ai_suggestion_pkey ON dc.ai_suggestion USING btree (id)`
- `ai_suggestion_run_id_position_key`: `CREATE UNIQUE INDEX ai_suggestion_run_id_position_key ON dc.ai_suggestion USING btree (run_id, "position")`

**트리거**

- `ai_suggestion_immutable`: `CREATE TRIGGER ai_suggestion_immutable BEFORE DELETE OR UPDATE ON dc.ai_suggestion FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.auth_role

추정 행수 5, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| role_code | text | O | — |
| label | text | O | — |
| is_active | boolean | O | true |
| base_group | boolean | O | false |
| legacy_code | text | — | — |
| description | text | — | — |
| sort_order | integer | O | 0 |

**제약**

- `auth_role_legacy_code_format`: `CHECK (((legacy_code IS NULL) OR (legacy_code ~ '^AUTH[0-9]{4}$'::text)))`
- `auth_role_pkey`: `PRIMARY KEY (role_code)`

**인덱스**

- `auth_role_pkey`: `CREATE UNIQUE INDEX auth_role_pkey ON dc.auth_role USING btree (role_code)`

**트리거**

- `auth_role_revision`: `CREATE TRIGGER auth_role_revision AFTER UPDATE ON dc.auth_role FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision()`

**앱 계정 권한**

SELECT

## dc.auth_user

추정 행수 1, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| person_uid | text | O | — |
| role_code | text | O | — |
| valid_from | timestamp with time zone | O | now() |
| valid_to | timestamp with time zone | — | — |

**제약**

- `auth_user_check`: `CHECK (((valid_to IS NULL) OR (valid_to > valid_from)))`
- `auth_user_person_uid_fkey`: `FOREIGN KEY (person_uid) REFERENCES dc.person(intg_uid)`
- `auth_user_pkey`: `PRIMARY KEY (person_uid, role_code)`
- `auth_user_role_code_fkey`: `FOREIGN KEY (role_code) REFERENCES dc.auth_role(role_code)`

**인덱스**

- `auth_user_pkey`: `CREATE UNIQUE INDEX auth_user_pkey ON dc.auth_user USING btree (person_uid, role_code)`

**트리거**

- `auth_user_revision`: `CREATE TRIGGER auth_user_revision AFTER INSERT OR DELETE OR UPDATE ON dc.auth_user FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision()`

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.auth_user_event

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| person_uid | text | O | — |
| role_code | text | O | — |
| action | text | O | — |
| before | jsonb | — | — |
| after | jsonb | O | — |
| reason | text | O | — |
| changed_at | timestamp with time zone | O | now() |
| changed_by | text | O | — |

**제약**

- `auth_user_event_action_check`: `CHECK ((action = ANY (ARRAY['GRANT'::text, 'REVOKE'::text, 'EXTEND'::text])))`
- `auth_user_event_changed_by_fkey`: `FOREIGN KEY (changed_by) REFERENCES dc.person(intg_uid)`
- `auth_user_event_person_uid_fkey`: `FOREIGN KEY (person_uid) REFERENCES dc.person(intg_uid)`
- `auth_user_event_pkey`: `PRIMARY KEY (id)`
- `auth_user_event_role_code_fkey`: `FOREIGN KEY (role_code) REFERENCES dc.auth_role(role_code)`

**인덱스**

- `auth_user_event_person_idx`: `CREATE INDEX auth_user_event_person_idx ON dc.auth_user_event USING btree (person_uid, changed_at DESC)`
- `auth_user_event_pkey`: `CREATE UNIQUE INDEX auth_user_event_pkey ON dc.auth_user_event USING btree (id)`

**트리거**

- `auth_user_event_immutable`: `CREATE TRIGGER auth_user_event_immutable BEFORE DELETE OR UPDATE ON dc.auth_user_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.cert

추정 행수 14, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| cert_id | text | O | — |
| label | text | O | — |
| issuer | text | O | — |
| kind | text | O | — |
| icon | text | O | — |
| active | boolean | O | — |

**제약**

- `cert_pkey`: `PRIMARY KEY (cert_id)`

**인덱스**

- `cert_pkey`: `CREATE UNIQUE INDEX cert_pkey ON dc.cert USING btree (cert_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.cert_skill

추정 행수 15, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| cert_id | text | O | — |
| skill_id | text | O | — |

**제약**

- `cert_skill_cert_id_fkey`: `FOREIGN KEY (cert_id) REFERENCES dc.cert(cert_id)`
- `cert_skill_pkey`: `PRIMARY KEY (cert_id, skill_id)`
- `cert_skill_skill_id_fkey`: `FOREIGN KEY (skill_id) REFERENCES dc.skill(skill_id)`

**인덱스**

- `cert_skill_pkey`: `CREATE UNIQUE INDEX cert_skill_pkey ON dc.cert_skill USING btree (cert_id, skill_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.code_group

추정 행수 45, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| group_code | text | O | — |
| label | text | O | — |
| managed_by | text | O | — |
| fixed_codes | boolean | O | false |
| legacy_group | text | — | — |
| is_active | boolean | O | true |
| sort_order | integer | O | 0 |

**제약**

- `code_group_managed_by_check`: `CHECK ((managed_by = ANY (ARRAY['STRUCTURAL'::text, 'OPERATIONAL'::text])))`
- `code_group_pkey`: `PRIMARY KEY (group_code)`

**인덱스**

- `code_group_pkey`: `CREATE UNIQUE INDEX code_group_pkey ON dc.code_group USING btree (group_code)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.code_item

추정 행수 788, 테이블·인덱스 총 262144 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| group_code | text | O | — |
| code | text | O | — |
| label | text | O | — |
| legacy | text | — | — |
| up_group_code | text | — | — |
| up_code | text | — | — |
| sort_order | integer | O | 0 |
| is_active | boolean | O | true |
| payload | jsonb | O | '{}'::jsonb |
| version | integer | O | 1 |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |

**제약**

- `code_item_check`: `CHECK (((up_group_code IS NULL) = (up_code IS NULL)))`
- `code_item_check1`: `CHECK (((up_group_code IS NULL) OR (up_group_code <> group_code) OR (up_code <> code)))`
- `code_item_group_code_fkey`: `FOREIGN KEY (group_code) REFERENCES dc.code_group(group_code)`
- `code_item_label_check`: `CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 200)))`
- `code_item_pkey`: `PRIMARY KEY (group_code, code)`
- `code_item_up_group_code_up_code_fkey`: `FOREIGN KEY (up_group_code, up_code) REFERENCES dc.code_item(group_code, code)`
- `code_item_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`

**인덱스**

- `code_item_pkey`: `CREATE UNIQUE INDEX code_item_pkey ON dc.code_item USING btree (group_code, code)`

**트리거**

- `code_revision`: `CREATE TRIGGER code_revision AFTER INSERT OR UPDATE ON dc.code_item FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision()`

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.code_item_event

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| group_code | text | O | — |
| code | text | O | — |
| action | text | O | — |
| before | jsonb | — | — |
| after | jsonb | O | — |
| reason | text | O | — |
| changed_at | timestamp with time zone | O | now() |
| changed_by | text | O | — |

**제약**

- `code_item_event_action_check`: `CHECK ((action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DEACTIVATE'::text, 'REACTIVATE'::text])))`
- `code_item_event_changed_by_fkey`: `FOREIGN KEY (changed_by) REFERENCES dc.person(intg_uid)`
- `code_item_event_group_code_code_fkey`: `FOREIGN KEY (group_code, code) REFERENCES dc.code_item(group_code, code)`
- `code_item_event_pkey`: `PRIMARY KEY (id)`

**인덱스**

- `code_item_event_pkey`: `CREATE UNIQUE INDEX code_item_event_pkey ON dc.code_item_event USING btree (id)`

**트리거**

- `code_item_event_immutable`: `CREATE TRIGGER code_item_event_immutable BEFORE DELETE OR UPDATE ON dc.code_item_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.company

추정 행수 1, 테이블·인덱스 총 57344 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| display_name | text | O | — |
| company_type_group | text | — | 'JOB_COMPANY_TYPE'::text |
| company_type_code | text | — | — |
| website_url | text | — | — |
| source_system | text | — | — |
| source_key | text | — | — |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |
| deleted_at | timestamp with time zone | — | — |
| deleted_by | text | — | — |

**제약**

- `company_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `company_deleted_by_fkey`: `FOREIGN KEY (deleted_by) REFERENCES dc.person(intg_uid)`
- `company_display_name_check`: `CHECK ((btrim(display_name) <> ''::text))`
- `company_pkey`: `PRIMARY KEY (id)`
- `company_source_pair`: `CHECK (((source_system IS NULL) = (source_key IS NULL)))`
- `company_type_fk`: `FOREIGN KEY (company_type_group, company_type_code) REFERENCES dc.code_item(group_code, code)`
- `company_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `company_version_check`: `CHECK ((version > 0))`

**인덱스**

- `company_active`: `CREATE INDEX company_active ON dc.company USING btree (display_name) WHERE (deleted_at IS NULL)`
- `company_pkey`: `CREATE UNIQUE INDEX company_pkey ON dc.company USING btree (id)`
- `company_source`: `CREATE UNIQUE INDEX company_source ON dc.company USING btree (source_system, source_key) WHERE (source_key IS NOT NULL)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.company_auth_rate

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| bucket | text | O | — |
| attempts | integer | O | — |
| reset_at | timestamp with time zone | O | — |

**제약**

- `company_auth_rate_pkey`: `PRIMARY KEY (bucket)`

**인덱스**

- `company_auth_rate_pkey`: `CREATE UNIQUE INDEX company_auth_rate_pkey ON dc.company_auth_rate USING btree (bucket)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.company_login_session

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| token_hash | text | O | — |
| member_id | uuid | O | — |
| expires_at | timestamp with time zone | O | (now() + '08:00:00'::interval) |

**제약**

- `company_login_session_member_id_fkey`: `FOREIGN KEY (member_id) REFERENCES dc.company_member(id)`
- `company_login_session_pkey`: `PRIMARY KEY (token_hash)`

**인덱스**

- `company_login_session_expiry`: `CREATE INDEX company_login_session_expiry ON dc.company_login_session USING btree (expires_at)`
- `company_login_session_pkey`: `CREATE UNIQUE INDEX company_login_session_pkey ON dc.company_login_session USING btree (token_hash)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT

## dc.company_member

추정 행수 -1, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| business_no | text | O | — |
| password_hash | text | O | — |
| company_name | text | O | — |
| contact_name | text | O | — |
| contact_email | text | O | — |
| contact_phone | text | O | — |
| status | text | O | 'PENDING'::text |
| company_id | text | — | — |
| review_note | text | O | ''::text |
| reviewed_by | text | — | — |
| reviewed_at | timestamp with time zone | — | — |
| created_at | timestamp with time zone | O | now() |
| version | integer | O | 1 |

**제약**

- `company_member_business_no_check`: `CHECK ((business_no ~ '^[0-9]{10}$'::text))`
- `company_member_business_no_key`: `UNIQUE (business_no)`
- `company_member_check`: `CHECK (((status = 'APPROVED'::text) = (company_id IS NOT NULL)))`
- `company_member_check1`: `CHECK (((status = 'PENDING'::text) = (reviewed_at IS NULL)))`
- `company_member_company_id_fkey`: `FOREIGN KEY (company_id) REFERENCES dc.company(id)`
- `company_member_pkey`: `PRIMARY KEY (id)`
- `company_member_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES dc.person(intg_uid)`
- `company_member_status_check`: `CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])))`

**인덱스**

- `company_member_business_no_key`: `CREATE UNIQUE INDEX company_member_business_no_key ON dc.company_member USING btree (business_no)`
- `company_member_pkey`: `CREATE UNIQUE INDEX company_member_pkey ON dc.company_member USING btree (id)`
- `company_member_queue`: `CREATE INDEX company_member_queue ON dc.company_member USING btree (status, created_at DESC, id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.core_competency

추정 행수 5, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| code | text | O | — |
| label | text | O | — |
| sort_order | smallint | O | — |

**제약**

- `core_competency_pkey`: `PRIMARY KEY (code)`
- `core_competency_sort_order_check`: `CHECK (((sort_order >= 1) AND (sort_order <= 5)))`
- `core_competency_sort_order_key`: `UNIQUE (sort_order)`

**인덱스**

- `core_competency_pkey`: `CREATE UNIQUE INDEX core_competency_pkey ON dc.core_competency USING btree (code)`
- `core_competency_sort_order_key`: `CREATE UNIQUE INDEX core_competency_sort_order_key ON dc.core_competency USING btree (sort_order)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.core_competency_allocation

추정 행수 1, 테이블·인덱스 총 73728 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| kind | text | O | — |
| curi_num | text | — | — |
| academic_year | text | — | — |
| academic_term | text | — | — |
| program_id | text | — | — |
| source_system | text | O | — |
| source_key | text | O | — |
| source_revision | text | O | — |
| source_updated_at | timestamp with time zone | — | — |
| imported_at | timestamp with time zone | O | now() |
| active | boolean | O | false |

**제약**

- `core_competency_allocation_check`: `CHECK ((((kind = 'COURSE'::text) AND (curi_num IS NOT NULL) AND (academic_year IS NOT NULL) AND (length(TRIM(BOTH FROM academic_year)) > 0) AND (academic_term IS NOT NULL) AND (length(TRIM(BOTH FROM academic_term)) > 0) AND (program_id IS NULL)) OR ((kind = 'PROGRAM'::text) AND (program_id IS NOT NULL) AND (curi_num IS NULL) AND (academic_year IS NULL) AND (academic_term IS NULL))))`
- `core_competency_allocation_curi_num_fkey`: `FOREIGN KEY (curi_num) REFERENCES dc.subject(curi_num)`
- `core_competency_allocation_kind_check`: `CHECK ((kind = ANY (ARRAY['COURSE'::text, 'PROGRAM'::text])))`
- `core_competency_allocation_pkey`: `PRIMARY KEY (id)`
- `core_competency_allocation_program_id_fkey`: `FOREIGN KEY (program_id) REFERENCES dc.program(id)`
- `core_competency_allocation_source_key_check`: `CHECK ((length(TRIM(BOTH FROM source_key)) > 0))`
- `core_competency_allocation_source_revision_check`: `CHECK ((length(TRIM(BOTH FROM source_revision)) > 0))`
- `core_competency_allocation_source_system_check`: `CHECK ((length(TRIM(BOTH FROM source_system)) > 0))`
- `core_competency_allocation_source_system_source_key_source__key`: `UNIQUE (source_system, source_key, source_revision)`

**인덱스**

- `core_competency_allocation_pkey`: `CREATE UNIQUE INDEX core_competency_allocation_pkey ON dc.core_competency_allocation USING btree (id)`
- `core_competency_allocation_source_system_source_key_source__key`: `CREATE UNIQUE INDEX core_competency_allocation_source_system_source_key_source__key ON dc.core_competency_allocation USING btree (source_system, source_key, source_revision)`
- `core_competency_course_active`: `CREATE UNIQUE INDEX core_competency_course_active ON dc.core_competency_allocation USING btree (curi_num, academic_year, academic_term) WHERE (active AND (kind = 'COURSE'::text))`
- `core_competency_program_active`: `CREATE UNIQUE INDEX core_competency_program_active ON dc.core_competency_allocation USING btree (program_id) WHERE (active AND (kind = 'PROGRAM'::text))`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.core_competency_allocation_axis

추정 행수 5, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| allocation_id | uuid | O | — |
| competency_code | text | O | — |
| ratio | numeric | O | — |
| allocated_points | numeric | — | — |

**제약**

- `core_competency_allocation_axis_allocated_points_check`: `CHECK (((allocated_points >= (0)::numeric) AND (allocated_points < 'Infinity'::numeric)))`
- `core_competency_allocation_axis_allocation_id_fkey`: `FOREIGN KEY (allocation_id) REFERENCES dc.core_competency_allocation(id)`
- `core_competency_allocation_axis_competency_code_fkey`: `FOREIGN KEY (competency_code) REFERENCES dc.core_competency(code)`
- `core_competency_allocation_axis_pkey`: `PRIMARY KEY (allocation_id, competency_code)`
- `core_competency_allocation_axis_ratio_check`: `CHECK (((ratio >= (0)::numeric) AND (ratio <= (1)::numeric)))`

**인덱스**

- `core_competency_allocation_axis_pkey`: `CREATE UNIQUE INDEX core_competency_allocation_axis_pkey ON dc.core_competency_allocation_axis USING btree (allocation_id, competency_code)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.counsel_event

추정 행수 8, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| request_id | text | O | — |
| actor_uid | text | O | — |
| kind | text | O | — |
| payload | jsonb | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `counsel_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `counsel_event_pkey`: `PRIMARY KEY (id)`
- `counsel_event_request_id_fkey`: `FOREIGN KEY (request_id) REFERENCES dc.counsel_request(id)`

**인덱스**

- `counsel_event_pkey`: `CREATE UNIQUE INDEX counsel_event_pkey ON dc.counsel_event USING btree (id)`
- `ix_counsel_event_request_timeline`: `CREATE INDEX ix_counsel_event_request_timeline ON dc.counsel_event USING btree (request_id, created_at, id)`

**트리거**

- `counsel_event_immutable`: `CREATE TRIGGER counsel_event_immutable BEFORE DELETE OR UPDATE ON dc.counsel_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`
- `notify_counsel`: `CREATE TRIGGER notify_counsel AFTER INSERT ON dc.counsel_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event()`

**앱 계정 권한**

INSERT, SELECT

## dc.counsel_operation_event

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| staff_uid | text | O | — |
| entity | text | O | — |
| entity_id | text | O | — |
| action | text | O | — |
| before_value | jsonb | — | — |
| after_value | jsonb | O | — |
| actor_uid | text | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `counsel_operation_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `counsel_operation_event_entity_check`: `CHECK ((entity = ANY (ARRAY['PROFILE'::text, 'SCHEDULE'::text, 'GROUP'::text])))`
- `counsel_operation_event_pkey`: `PRIMARY KEY (id)`
- `counsel_operation_event_staff_uid_fkey`: `FOREIGN KEY (staff_uid) REFERENCES dc.staff(intg_uid)`

**인덱스**

- `counsel_operation_event_pkey`: `CREATE UNIQUE INDEX counsel_operation_event_pkey ON dc.counsel_operation_event USING btree (id)`
- `ix_counsel_operation_history`: `CREATE INDEX ix_counsel_operation_history ON dc.counsel_operation_event USING btree (staff_uid, created_at DESC, id)`

**트리거**

- `counsel_operation_immutable`: `CREATE TRIGGER counsel_operation_immutable BEFORE DELETE OR UPDATE ON dc.counsel_operation_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.counsel_record

추정 행수 5, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| request_id | text | O | — |
| counselor_uid | text | O | — |
| summary | text | O | — |
| comment | text | O | — |
| follow_up | text | O | — |
| status_code | text | O | — |
| created_at | timestamp with time zone | O | — |
| updated_at | timestamp with time zone | O | — |
| snapshot | jsonb | O | — |
| version | integer | O | 1 |

**제약**

- `counsel_record_counselor_uid_fkey`: `FOREIGN KEY (counselor_uid) REFERENCES dc.staff(intg_uid)`
- `counsel_record_pkey`: `PRIMARY KEY (id)`
- `counsel_record_request_id_fkey`: `FOREIGN KEY (request_id) REFERENCES dc.counsel_request(id)`
- `counsel_record_request_id_key`: `UNIQUE (request_id)`
- `counsel_record_status_code_check`: `CHECK ((status_code = ANY (ARRAY['DRAFT'::text, 'DONE'::text])))`

**인덱스**

- `counsel_record_pkey`: `CREATE UNIQUE INDEX counsel_record_pkey ON dc.counsel_record USING btree (id)`
- `counsel_record_request_id_key`: `CREATE UNIQUE INDEX counsel_record_request_id_key ON dc.counsel_record USING btree (request_id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.counsel_request

추정 행수 19, 테이블·인덱스 총 122880 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| student_uid | text | O | — |
| counselor_uid | text | — | — |
| type_code | text | O | — |
| legacy_type | text | O | — |
| care_track | text | — | — |
| status_code | text | O | — |
| method_code | text | O | — |
| topic | text | O | — |
| requested_at | timestamp with time zone | O | — |
| slot_date | date | — | — |
| slot_start | time without time zone | — | — |
| slot_end | time without time zone | — | — |
| place | text | — | — |
| intake | jsonb | — | — |
| snapshot | jsonb | O | — |
| source_payload | jsonb | O | — |
| completed_at | timestamp with time zone | — | — |
| version | integer | O | 1 |
| topic_code | text | — | — |
| topic_group | text | — | 
CASE
    WHEN (type_code = 'PROF'::text) THEN 'PROF_COUNSEL_TYPE'::text
    ELSE 'COUNSEL_TOPIC'::text
END |

**제약**

- `ck_counsel_request_slot_shape`: `CHECK ((((slot_start IS NULL) = (slot_end IS NULL)) AND ((slot_start IS NULL) OR (slot_date IS NOT NULL))))`
- `counsel_request_care_track_check`: `CHECK ((care_track = ANY (ARRAY['general'::text, 'care7'::text])))`
- `counsel_request_check`: `CHECK (((slot_end IS NULL) OR (slot_start < slot_end)))`
- `counsel_request_counselor_uid_fkey`: `FOREIGN KEY (counselor_uid) REFERENCES dc.staff(intg_uid)`
- `counsel_request_method_code_check`: `CHECK ((method_code = ANY (ARRAY['ONLINE'::text, 'OFFLINE'::text])))`
- `counsel_request_pkey`: `PRIMARY KEY (id)`
- `counsel_request_status_code_check`: `CHECK ((status_code = ANY (ARRAY['REQ'::text, 'CONFIRMED'::text, 'DONE'::text, 'CANCEL_UNKNOWN'::text, 'CANCEL_STU'::text, 'CANCEL_CNS'::text])))`
- `counsel_request_student_key`: `UNIQUE (id, student_uid)`
- `counsel_request_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `counsel_request_type_code_check`: `CHECK ((type_code = ANY (ARRAY['CAREER'::text, 'JOB'::text, 'PSY'::text, 'PROF'::text])))`
- `counsel_topic_fk`: `FOREIGN KEY (topic_group, topic_code) REFERENCES dc.code_item(group_code, code)`
- `counsel_track_only_for_career`: `CHECK (((type_code = ANY (ARRAY['CAREER'::text, 'JOB'::text])) = (care_track IS NOT NULL)))`

**인덱스**

- `counsel_request_pkey`: `CREATE UNIQUE INDEX counsel_request_pkey ON dc.counsel_request USING btree (id)`
- `counsel_request_staff`: `CREATE INDEX counsel_request_staff ON dc.counsel_request USING btree (counselor_uid, status_code, slot_date)`
- `counsel_request_student`: `CREATE INDEX counsel_request_student ON dc.counsel_request USING btree (student_uid, requested_at DESC)`
- `counsel_request_student_key`: `CREATE UNIQUE INDEX counsel_request_student_key ON dc.counsel_request USING btree (id, student_uid)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.counsel_schedule

추정 행수 4, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| staff_uid | text | O | — |
| version | bigint | O | 1 |

**제약**

- `counsel_schedule_pkey`: `PRIMARY KEY (staff_uid)`
- `counsel_schedule_staff_uid_fkey`: `FOREIGN KEY (staff_uid) REFERENCES dc.staff(intg_uid)`
- `counsel_schedule_version_check`: `CHECK ((version > 0))`

**인덱스**

- `counsel_schedule_pkey`: `CREATE UNIQUE INDEX counsel_schedule_pkey ON dc.counsel_schedule USING btree (staff_uid)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.counsel_schedule_slot

추정 행수 8, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| staff_uid | text | O | — |
| kind | text | O | — |
| weekday | integer | O | — |
| start_time | time without time zone | O | — |
| end_time | time without time zone | O | — |

**제약**

- `counsel_schedule_slot_check`: `CHECK ((start_time < end_time))`
- `counsel_schedule_slot_kind_check`: `CHECK ((kind = ANY (ARRAY['AVAILABLE'::text, 'EXCLUDED'::text])))`
- `counsel_schedule_slot_pkey`: `PRIMARY KEY (id)`
- `counsel_schedule_slot_staff_uid_fkey`: `FOREIGN KEY (staff_uid) REFERENCES dc.counsel_schedule(staff_uid)`
- `counsel_schedule_slot_staff_uid_kind_weekday_start_time_end_key`: `UNIQUE (staff_uid, kind, weekday, start_time, end_time)`
- `counsel_schedule_slot_weekday_check`: `CHECK (((weekday >= 0) AND (weekday <= 6)))`

**인덱스**

- `counsel_schedule_slot_pkey`: `CREATE UNIQUE INDEX counsel_schedule_slot_pkey ON dc.counsel_schedule_slot USING btree (id)`
- `counsel_schedule_slot_staff_uid_kind_weekday_start_time_end_key`: `CREATE UNIQUE INDEX counsel_schedule_slot_staff_uid_kind_weekday_start_time_end_key ON dc.counsel_schedule_slot USING btree (staff_uid, kind, weekday, start_time, end_time)`
- `ix_schedule_lookup`: `CREATE INDEX ix_schedule_lookup ON dc.counsel_schedule_slot USING btree (staff_uid, weekday, kind, start_time, end_time)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT

## dc.course_skill

추정 행수 56, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| curi_num | text | O | — |
| skill_id | text | O | — |
| weight | numeric | O | — |
| source | text | O | — |

**제약**

- `course_skill_curi_num_fkey`: `FOREIGN KEY (curi_num) REFERENCES dc.subject(curi_num)`
- `course_skill_pkey`: `PRIMARY KEY (curi_num, skill_id)`
- `course_skill_skill_id_fkey`: `FOREIGN KEY (skill_id) REFERENCES dc.skill(skill_id)`

**인덱스**

- `course_skill_pkey`: `CREATE UNIQUE INDEX course_skill_pkey ON dc.course_skill USING btree (curi_num, skill_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.curriculum

추정 행수 60, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| dept_code | text | O | — |
| curri_year | text | O | — |
| curi_num | text | O | — |
| course_cls | text | O | — |
| rec_grade | integer | O | — |
| rec_smt | text | O | — |
| required | boolean | O | — |

**제약**

- `curriculum_curi_num_fkey`: `FOREIGN KEY (curi_num) REFERENCES dc.subject(curi_num)`
- `curriculum_pkey`: `PRIMARY KEY (id)`

**인덱스**

- `curriculum_pkey`: `CREATE UNIQUE INDEX curriculum_pkey ON dc.curriculum USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.department

추정 행수 80, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| college_code | text | O | — |
| dept_code | text | O | — |
| college_name | text | O | — |
| dept_name | text | O | — |
| course | text | O | — |

**제약**

- `department_pkey`: `PRIMARY KEY (college_code, dept_code)`

**인덱스**

- `department_pkey`: `CREATE UNIQUE INDEX department_pkey ON dc.department USING btree (college_code, dept_code)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.department_staff_assignment

추정 행수 1767, 테이블·인덱스 총 630784 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| college_code | text | O | — |
| dept_code | text | O | — |
| major_code | text | O | ''::text |
| staff_uid | text | O | — |
| role_code | text | O | — |
| snapshot | jsonb | O | '{}'::jsonb |
| legacy_id | uuid | — | — |
| is_active | boolean | O | true |
| version | integer | O | 1 |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |
| source | text | O | 'manual'::text |

**제약**

- `department_staff_assignment_legacy_id_fkey`: `FOREIGN KEY (legacy_id) REFERENCES dc.org_assignment(id)`
- `department_staff_assignment_legacy_id_key`: `UNIQUE (legacy_id)`
- `department_staff_assignment_pkey`: `PRIMARY KEY (id)`
- `department_staff_assignment_role_code_check`: `CHECK ((role_code = ANY (ARRAY['assistant'::text, 'professor'::text])))`
- `department_staff_assignment_source_check`: `CHECK ((source = ANY (ARRAY['manual'::text, 'legacy'::text, 'academic_assistant'::text, 'academic_professor_retired'::text])))`
- `department_staff_assignment_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `retired_professor_assignment_inactive`: `CHECK (((source <> 'academic_professor_retired'::text) OR (NOT is_active)))`

**인덱스**

- `department_staff_assignment_active`: `CREATE UNIQUE INDEX department_staff_assignment_active ON dc.department_staff_assignment USING btree (college_code, dept_code, major_code, staff_uid, role_code) WHERE is_active`
- `department_staff_assignment_legacy_id_key`: `CREATE UNIQUE INDEX department_staff_assignment_legacy_id_key ON dc.department_staff_assignment USING btree (legacy_id)`
- `department_staff_assignment_pkey`: `CREATE UNIQUE INDEX department_staff_assignment_pkey ON dc.department_staff_assignment USING btree (id)`
- `department_staff_assignment_target`: `CREATE INDEX department_staff_assignment_target ON dc.department_staff_assignment USING btree (college_code, dept_code, major_code, role_code) WHERE is_active`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.development_roadmap_template

추정 행수 13, 테이블·인덱스 총 73728 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| job_id | text | O | — |
| revision | text | O | — |
| outcome | jsonb | O | — |
| updated_at | timestamp with time zone | O | now() |

**제약**

- `development_roadmap_template_job_id_fkey`: `FOREIGN KEY (job_id) REFERENCES dc.job_role(job_id)`
- `development_roadmap_template_outcome_check`: `CHECK ((jsonb_typeof(outcome) = 'object'::text))`
- `development_roadmap_template_pkey`: `PRIMARY KEY (job_id)`

**인덱스**

- `development_roadmap_template_pkey`: `CREATE UNIQUE INDEX development_roadmap_template_pkey ON dc.development_roadmap_template USING btree (job_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.diagnosis_attempt

추정 행수 8, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| student_uid | text | O | — |
| test_id | text | O | — |
| attempt_no | integer | O | — |
| status_code | text | O | — |
| started_at | timestamp with time zone | — | — |
| completed_at | timestamp with time zone | — | — |
| payload | jsonb | O | — |
| source | text | O | 'fixture'::text |

**제약**

- `diagnosis_attempt_attempt_no_check`: `CHECK ((attempt_no > 0))`
- `diagnosis_attempt_pkey`: `PRIMARY KEY (id)`
- `diagnosis_attempt_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `diagnosis_attempt_student_uid_test_id_attempt_no_key`: `UNIQUE (student_uid, test_id, attempt_no)`
- `uq_diagnosis_attempt_id_student`: `UNIQUE (id, student_uid)`

**인덱스**

- `diagnosis_attempt_pkey`: `CREATE UNIQUE INDEX diagnosis_attempt_pkey ON dc.diagnosis_attempt USING btree (id)`
- `diagnosis_attempt_student_uid_test_id_attempt_no_key`: `CREATE UNIQUE INDEX diagnosis_attempt_student_uid_test_id_attempt_no_key ON dc.diagnosis_attempt USING btree (student_uid, test_id, attempt_no)`
- `uq_diagnosis_attempt_id_student`: `CREATE UNIQUE INDEX uq_diagnosis_attempt_id_student ON dc.diagnosis_attempt USING btree (id, student_uid)`

**트리거**

- `notify_retake`: `CREATE TRIGGER notify_retake AFTER INSERT ON dc.diagnosis_attempt FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event()`

**앱 계정 권한**

INSERT, SELECT

## dc.diagnosis_comment

추정 행수 -1, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| attempt_id | text | O | — |
| student_uid | text | O | — |
| body | text | O | — |
| actor_uid | text | O | — |
| actor_name | text | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `diagnosis_comment_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.staff(intg_uid)`
- `diagnosis_comment_body_check`: `CHECK ((length(TRIM(BOTH FROM body)) > 0))`
- `diagnosis_comment_pkey`: `PRIMARY KEY (id)`
- `diagnosis_comment_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `fk_diagnosis_comment_attempt_student`: `FOREIGN KEY (attempt_id, student_uid) REFERENCES dc.diagnosis_attempt(id, student_uid)`

**인덱스**

- `diagnosis_comment_pkey`: `CREATE UNIQUE INDEX diagnosis_comment_pkey ON dc.diagnosis_comment USING btree (id)`
- `ix_diagnosis_comment_latest`: `CREATE INDEX ix_diagnosis_comment_latest ON dc.diagnosis_comment USING btree (attempt_id, created_at DESC, id DESC)`
- `ix_diagnosis_comment_student`: `CREATE INDEX ix_diagnosis_comment_student ON dc.diagnosis_comment USING btree (student_uid, created_at, id)`

**트리거**

- `diagnosis_comment_immutable`: `CREATE TRIGGER diagnosis_comment_immutable BEFORE DELETE OR UPDATE ON dc.diagnosis_comment FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.diagnosis_factor_definition

추정 행수 12, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| test_code | text | O | — |
| test_group | text | O | 'DIAGNOSIS_TEST'::text |
| factor_code | text | O | — |
| label | text | O | — |
| secondary_label | text | — | — |
| sort_order | integer | O | — |
| definition_version | integer | O | 1 |
| label_group | text | O | 'DIAGNOSIS_FACTOR'::text |
| label_code | text | — | ((test_code &#124;&#124; '_'::text) &#124;&#124; factor_code) |

**제약**

- `diagnosis_factor_definition_label_group_check`: `CHECK ((label_group = 'DIAGNOSIS_FACTOR'::text))`
- `diagnosis_factor_definition_pkey`: `PRIMARY KEY (test_code, factor_code)`
- `diagnosis_factor_definition_test_group_check`: `CHECK ((test_group = 'DIAGNOSIS_TEST'::text))`
- `diagnosis_factor_definition_test_group_test_code_fkey`: `FOREIGN KEY (test_group, test_code) REFERENCES dc.code_item(group_code, code)`
- `factor_label_fk`: `FOREIGN KEY (label_group, label_code) REFERENCES dc.code_item(group_code, code)`

**인덱스**

- `diagnosis_factor_definition_pkey`: `CREATE UNIQUE INDEX diagnosis_factor_definition_pkey ON dc.diagnosis_factor_definition USING btree (test_code, factor_code)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.diagnosis_factor_score

추정 행수 33, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| test_id | text | O | — |
| attempt_no | integer | O | — |
| position | integer | O | — |
| test_code | text | O | — |
| factor_code | text | — | — |
| definition_version | integer | — | — |
| source_factor_code | text | — | — |
| factor_name | text | — | — |
| raw_score | numeric | — | — |
| t_score | numeric | — | — |
| percentile | numeric | — | — |
| level | text | — | — |
| raw_factor | jsonb | O | — |
| validation_issues | text[] | O | '{}'::text[] |

**제약**

- `diagnosis_factor_score_check`: `CHECK ((test_code = upper(test_id)))`
- `diagnosis_factor_score_check1`: `CHECK (((factor_code IS NULL) = (definition_version IS NULL)))`
- `diagnosis_factor_score_percentile_check`: `CHECK (((percentile >= (0)::numeric) AND (percentile <= (100)::numeric)))`
- `diagnosis_factor_score_pkey`: `PRIMARY KEY (student_uid, test_id, attempt_no, "position")`
- `diagnosis_factor_score_position_check`: `CHECK (("position" >= 0))`
- `diagnosis_factor_score_raw_factor_check`: `CHECK ((jsonb_typeof(raw_factor) = 'object'::text))`
- `diagnosis_factor_score_raw_score_check`: `CHECK (((raw_score > '-Infinity'::numeric) AND (raw_score < 'Infinity'::numeric)))`
- `diagnosis_factor_score_student_uid_test_id_attempt_no_fkey`: `FOREIGN KEY (student_uid, test_id, attempt_no) REFERENCES dc.diagnosis_result(student_uid, test_id, attempt_no) ON DELETE CASCADE`
- `diagnosis_factor_score_t_score_check`: `CHECK (((t_score > '-Infinity'::numeric) AND (t_score < 'Infinity'::numeric)))`
- `diagnosis_factor_score_test_code_factor_code_fkey`: `FOREIGN KEY (test_code, factor_code) REFERENCES dc.diagnosis_factor_definition(test_code, factor_code)`

**인덱스**

- `diagnosis_factor_score_analysis`: `CREATE INDEX diagnosis_factor_score_analysis ON dc.diagnosis_factor_score USING btree (test_code, factor_code)`
- `diagnosis_factor_score_pkey`: `CREATE UNIQUE INDEX diagnosis_factor_score_pkey ON dc.diagnosis_factor_score USING btree (student_uid, test_id, attempt_no, "position")`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.diagnosis_nudge

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| test_id | text | O | — |
| actor_uid | text | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `diagnosis_nudge_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.staff(intg_uid)`
- `diagnosis_nudge_pkey`: `PRIMARY KEY (id)`
- `diagnosis_nudge_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `diagnosis_nudge_pkey`: `CREATE UNIQUE INDEX diagnosis_nudge_pkey ON dc.diagnosis_nudge USING btree (id)`
- `ix_diagnosis_nudge_recent`: `CREATE INDEX ix_diagnosis_nudge_recent ON dc.diagnosis_nudge USING btree (student_uid, test_id, created_at DESC)`

**트리거**

- `diagnosis_nudge_immutable`: `CREATE TRIGGER diagnosis_nudge_immutable BEFORE DELETE OR UPDATE ON dc.diagnosis_nudge FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`
- `notify_nudge`: `CREATE TRIGGER notify_nudge AFTER INSERT ON dc.diagnosis_nudge FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event()`

**앱 계정 권한**

INSERT, SELECT

## dc.diagnosis_result

추정 행수 8, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| test_id | text | O | — |
| attempt_no | integer | O | — |
| tested_at | timestamp with time zone | O | — |
| payload | jsonb | O | — |
| source | text | O | 'fixture'::text |

**제약**

- `diagnosis_result_pkey`: `PRIMARY KEY (student_uid, test_id, attempt_no)`
- `diagnosis_result_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `diagnosis_result_student_uid_test_id_attempt_no_fkey`: `FOREIGN KEY (student_uid, test_id, attempt_no) REFERENCES dc.diagnosis_attempt(student_uid, test_id, attempt_no)`

**인덱스**

- `diagnosis_result_pkey`: `CREATE UNIQUE INDEX diagnosis_result_pkey ON dc.diagnosis_result USING btree (student_uid, test_id, attempt_no)`

**트리거**

- `diagnosis_result_bind`: `CREATE TRIGGER diagnosis_result_bind AFTER INSERT ON dc.diagnosis_result FOR EACH ROW EXECUTE FUNCTION dc.bind_result_factors()`
- `diagnosis_score_sync`: `CREATE TRIGGER diagnosis_score_sync AFTER INSERT OR UPDATE OF payload ON dc.diagnosis_result FOR EACH ROW EXECUTE FUNCTION dc.sync_diagnosis_scores()`

**앱 계정 권한**

INSERT, SELECT

## dc.diagnosis_result_factor

추정 행수 9, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| test_id | text | O | — |
| attempt_no | integer | O | — |
| position | integer | O | — |
| test_code | text | O | — |
| factor_code | text | O | — |
| definition_version | integer | O | — |

**제약**

- `diagnosis_result_factor_check`: `CHECK ((test_code = upper(test_id)))`
- `diagnosis_result_factor_definition_version_check`: `CHECK ((definition_version > 0))`
- `diagnosis_result_factor_pkey`: `PRIMARY KEY (student_uid, test_id, attempt_no, "position")`
- `diagnosis_result_factor_position_check`: `CHECK (("position" >= 0))`
- `diagnosis_result_factor_student_uid_test_id_attempt_no_fact_key`: `UNIQUE (student_uid, test_id, attempt_no, factor_code)`
- `diagnosis_result_factor_student_uid_test_id_attempt_no_fkey`: `FOREIGN KEY (student_uid, test_id, attempt_no) REFERENCES dc.diagnosis_result(student_uid, test_id, attempt_no)`
- `diagnosis_result_factor_test_code_factor_code_fkey`: `FOREIGN KEY (test_code, factor_code) REFERENCES dc.diagnosis_factor_definition(test_code, factor_code)`

**인덱스**

- `diagnosis_result_factor_pkey`: `CREATE UNIQUE INDEX diagnosis_result_factor_pkey ON dc.diagnosis_result_factor USING btree (student_uid, test_id, attempt_no, "position")`
- `diagnosis_result_factor_student_uid_test_id_attempt_no_fact_key`: `CREATE UNIQUE INDEX diagnosis_result_factor_student_uid_test_id_attempt_no_fact_key ON dc.diagnosis_result_factor USING btree (student_uid, test_id, attempt_no, factor_code)`

**트리거**

- `diagnosis_result_factor_immutable`: `CREATE TRIGGER diagnosis_result_factor_immutable BEFORE DELETE OR UPDATE ON dc.diagnosis_result_factor FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.file_object

추정 행수 6, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| owner_kind | text | O | — |
| owner_id | text | — | — |
| slot | text | O | — |
| original_name | text | O | — |
| content_type | text | O | — |
| byte_size | bigint | O | — |
| checksum | text | O | — |
| state | text | O | 'READY'::text |
| uploaded_by | text | O | — |
| uploaded_at | timestamp with time zone | O | now() |
| deleted_at | timestamp with time zone | — | — |
| deleted_by | text | — | — |

**제약**

- `file_object_byte_size_check`: `CHECK ((byte_size > 0))`
- `file_object_deleted_by_fkey`: `FOREIGN KEY (deleted_by) REFERENCES dc.person(intg_uid)`
- `file_object_deleted_pair`: `CHECK (((state = 'DELETED'::text) = (deleted_at IS NOT NULL)))`
- `file_object_original_name_check`: `CHECK ((btrim(original_name) <> ''::text))`
- `file_object_owner_kind_check`: `CHECK ((owner_kind = ANY (ARRAY['JOB_POSTING'::text, 'JOB_APPLICATION_ATTEMPT'::text, 'GROWTH_ENTRY'::text])))`
- `file_object_pkey`: `PRIMARY KEY (id)`
- `file_object_slot_check`: `CHECK ((slot = ANY (ARRAY['LOGO'::text, 'ATTACHMENT'::text, 'RESUME'::text, 'PORTFOLIO_ATTACHMENT'::text])))`
- `file_object_state_check`: `CHECK ((state = ANY (ARRAY['READY'::text, 'DELETED'::text])))`
- `file_object_uploaded_by_fkey`: `FOREIGN KEY (uploaded_by) REFERENCES dc.person(intg_uid)`

**인덱스**

- `file_object_owner`: `CREATE INDEX file_object_owner ON dc.file_object USING btree (owner_kind, owner_id, slot) WHERE (owner_id IS NOT NULL)`
- `file_object_pkey`: `CREATE UNIQUE INDEX file_object_pkey ON dc.file_object USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.fixture_student_login

추정 행수 2, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_no | text | O | — |
| student_uid | text | O | — |

**제약**

- `fixture_student_login_pkey`: `PRIMARY KEY (student_no)`
- `fixture_student_login_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `fixture_student_login_student_uid_key`: `UNIQUE (student_uid)`

**인덱스**

- `fixture_student_login_pkey`: `CREATE UNIQUE INDEX fixture_student_login_pkey ON dc.fixture_student_login USING btree (student_no)`
- `fixture_student_login_student_uid_key`: `CREATE UNIQUE INDEX fixture_student_login_student_uid_key ON dc.fixture_student_login USING btree (student_uid)`

**트리거**

없음.

**앱 계정 권한**

없음.

## dc.fixture_student_scope

추정 행수 27, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| staff_uid | text | O | — |
| student_uid | text | O | — |
| source | text | O | — |

**제약**

- `staff_student_scope_pkey`: `PRIMARY KEY (staff_uid, student_uid)`
- `staff_student_scope_staff_uid_fkey`: `FOREIGN KEY (staff_uid) REFERENCES dc.staff(intg_uid)`
- `staff_student_scope_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `staff_student_scope_pkey`: `CREATE UNIQUE INDEX staff_student_scope_pkey ON dc.fixture_student_scope USING btree (staff_uid, student_uid)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.gpa_policy

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| singleton | boolean | O | true |
| active | boolean | O | false |
| revision | text | O | — |
| retakes | text | O | — |
| excluded_grades | text[] | O | — |
| term_scope | text | O | — |
| through_year | integer | — | — |
| through_term_order | integer | — | — |
| decimal_places | integer | O | — |
| approved_by | text | O | — |
| approved_at | timestamp with time zone | O | — |

**제약**

- `gpa_policy_approved_by_check`: `CHECK ((length(TRIM(BOTH FROM approved_by)) > 0))`
- `gpa_policy_check`: `CHECK ((((term_scope = 'ALL'::text) AND (through_year IS NULL) AND (through_term_order IS NULL)) OR ((term_scope = 'THROUGH'::text) AND (through_year IS NOT NULL) AND (through_term_order IS NOT NULL))))`
- `gpa_policy_decimal_places_check`: `CHECK (((decimal_places >= 0) AND (decimal_places <= 4)))`
- `gpa_policy_excluded_grades_check`: `CHECK ((array_position(excluded_grades, NULL::text) IS NULL))`
- `gpa_policy_pkey`: `PRIMARY KEY (singleton)`
- `gpa_policy_retakes_check`: `CHECK ((retakes = ANY (ARRAY['ALL'::text, 'LATEST'::text, 'HIGHEST'::text])))`
- `gpa_policy_revision_check`: `CHECK ((length(TRIM(BOTH FROM revision)) > 0))`
- `gpa_policy_singleton_check`: `CHECK (singleton)`
- `gpa_policy_term_scope_check`: `CHECK ((term_scope = ANY (ARRAY['ALL'::text, 'THROUGH'::text])))`

**인덱스**

- `gpa_policy_pkey`: `CREATE UNIQUE INDEX gpa_policy_pkey ON dc.gpa_policy USING btree (singleton)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.gpa_term_order

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| code | text | O | — |
| sort_order | integer | O | — |

**제약**

- `gpa_term_order_pkey`: `PRIMARY KEY (code)`
- `gpa_term_order_sort_order_key`: `UNIQUE (sort_order)`

**인덱스**

- `gpa_term_order_pkey`: `CREATE UNIQUE INDEX gpa_term_order_pkey ON dc.gpa_term_order USING btree (code)`
- `gpa_term_order_sort_order_key`: `CREATE UNIQUE INDEX gpa_term_order_sort_order_key ON dc.gpa_term_order USING btree (sort_order)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.group_counsel

추정 행수 3, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| counselor_uid | text | O | — |
| kind | text | O | — |
| title | text | O | — |
| topic | text | O | — |
| session_date | date | O | — |
| start_time | time without time zone | O | — |
| end_time | time without time zone | O | — |
| place | text | O | — |
| capacity | integer | O | — |
| status | text | O | 'PLANNED'::text |
| test_code | text | — | — |
| summary | text | — | — |
| comment | text | — | — |
| cancel_reason | text | — | — |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |

**제약**

- `group_capacity_change`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`
- `group_counsel_capacity_check`: `CHECK (((capacity >= 1) AND (capacity <= 1000)))`
- `group_counsel_check`: `CHECK ((start_time < end_time))`
- `group_counsel_check1`: `CHECK (((status <> 'CANCELLED'::text) OR ((cancel_reason IS NOT NULL) AND (btrim(cancel_reason) <> ''::text))))`
- `group_counsel_check2`: `CHECK (((status <> 'DONE'::text) OR ((summary IS NOT NULL) AND (btrim(summary) <> ''::text) AND (comment IS NOT NULL) AND (btrim(comment) <> ''::text))))`
- `group_counsel_counselor_uid_fkey`: `FOREIGN KEY (counselor_uid) REFERENCES dc.staff(intg_uid)`
- `group_counsel_kind_check`: `CHECK ((kind = ANY (ARRAY['CAREER'::text, 'PSYCH'::text])))`
- `group_counsel_pkey`: `PRIMARY KEY (id)`
- `group_counsel_status_check`: `CHECK ((status = ANY (ARRAY['PLANNED'::text, 'DONE'::text, 'CANCELLED'::text])))`
- `group_counsel_title_check`: `CHECK ((btrim(title) <> ''::text))`
- `group_counsel_version_check`: `CHECK ((version > 0))`

**인덱스**

- `group_counsel_pkey`: `CREATE UNIQUE INDEX group_counsel_pkey ON dc.group_counsel USING btree (id)`
- `ix_group_counsel_owner`: `CREATE INDEX ix_group_counsel_owner ON dc.group_counsel USING btree (counselor_uid, session_date DESC, id)`

**트리거**

- `group_capacity_change`: `CREATE CONSTRAINT TRIGGER group_capacity_change AFTER UPDATE ON dc.group_counsel DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.guard_group_capacity()`

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.group_counsel_member

추정 행수 1, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| group_id | text | O | — |
| student_uid | text | O | — |
| snapshot | jsonb | O | — |
| attended | boolean | — | — |
| added_at | timestamp with time zone | O | now() |

**제약**

- `group_capacity`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`
- `group_counsel_member_group_id_fkey`: `FOREIGN KEY (group_id) REFERENCES dc.group_counsel(id)`
- `group_counsel_member_pkey`: `PRIMARY KEY (group_id, student_uid)`
- `group_counsel_member_snapshot_check`: `CHECK ((jsonb_typeof(snapshot) = 'object'::text))`
- `group_counsel_member_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `group_counsel_member_pkey`: `CREATE UNIQUE INDEX group_counsel_member_pkey ON dc.group_counsel_member USING btree (group_id, student_uid)`
- `ix_group_member_student`: `CREATE INDEX ix_group_member_student ON dc.group_counsel_member USING btree (student_uid, group_id)`

**트리거**

- `group_capacity`: `CREATE CONSTRAINT TRIGGER group_capacity AFTER INSERT OR UPDATE ON dc.group_counsel_member DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.guard_group_capacity()`

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.growth_entry

추정 행수 9, 테이블·인덱스 총 147456 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| student_uid | text | O | — |
| kind_code | text | O | — |
| kind_group | text | — | 'GROWTH_ENTRY_KIND'::text |
| category_code | text | — | — |
| category_group | text | — | 
CASE kind_code
    WHEN 'JOURNAL'::text THEN 'GROWTH_JOURNAL_CATEGORY'::text
    WHEN 'SKILL'::text THEN 'GROWTH_SKILL_CATEGORY'::text
    WHEN 'RECORD'::text THEN 'GROWTH_RECORD_CATEGORY'::text
    ELSE NULL::text
END |
| title | text | O | — |
| occurred_on | date | — | — |
| date_text | text | — | — |
| date_precision | text | O | 'UNKNOWN'::text |
| tags | text[] | O | '{}'::text[] |
| content | jsonb | O | '{}'::jsonb |
| bookmarked | boolean | O | false |
| resume_used | boolean | O | false |
| cert_id | text | — | — |
| source_kind | text | O | 'SELF_REPORTED'::text |
| source_group | text | — | 'GROWTH_SOURCE_KIND'::text |
| legacy_ref | jsonb | — | — |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |
| deleted_at | timestamp with time zone | — | — |
| deleted_by | text | — | — |

**제약**

- `growth_entry_category_fk`: `FOREIGN KEY (category_group, category_code) REFERENCES dc.code_item(group_code, code)`
- `growth_entry_cert_id_fkey`: `FOREIGN KEY (cert_id) REFERENCES dc.cert(cert_id)`
- `growth_entry_cert_scope`: `CHECK (((cert_id IS NULL) OR (kind_code = 'CERTIFICATE'::text)))`
- `growth_entry_content_check`: `CHECK ((jsonb_typeof(content) = 'object'::text))`
- `growth_entry_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `growth_entry_date_pair`: `CHECK (((date_precision <> 'DAY'::text) OR (occurred_on IS NOT NULL)))`
- `growth_entry_date_precision_check`: `CHECK ((date_precision = ANY (ARRAY['DAY'::text, 'MONTH'::text, 'YEAR'::text, 'RANGE'::text, 'UNKNOWN'::text])))`
- `growth_entry_date_text_check`: `CHECK (((date_text IS NULL) OR (length(date_text) <= 100)))`
- `growth_entry_deleted_by_fkey`: `FOREIGN KEY (deleted_by) REFERENCES dc.person(intg_uid)`
- `growth_entry_deleted_pair`: `CHECK (((deleted_at IS NULL) = (deleted_by IS NULL)))`
- `growth_entry_kind_fk`: `FOREIGN KEY (kind_group, kind_code) REFERENCES dc.code_item(group_code, code)`
- `growth_entry_pkey`: `PRIMARY KEY (id)`
- `growth_entry_source_fk`: `FOREIGN KEY (source_group, source_kind) REFERENCES dc.code_item(group_code, code)`
- `growth_entry_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.growth_profile(student_uid)`
- `growth_entry_student_uid_id_key`: `UNIQUE (student_uid, id)`
- `growth_entry_tags_check`: `CHECK (((array_length(tags, 1) IS NULL) OR (array_length(tags, 1) <= 20)))`
- `growth_entry_title_check`: `CHECK (((btrim(title) <> ''::text) AND (length(title) <= 200)))`
- `growth_entry_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `growth_entry_version_check`: `CHECK ((version > 0))`

**인덱스**

- `growth_entry_bookmark`: `CREATE INDEX growth_entry_bookmark ON dc.growth_entry USING btree (student_uid, updated_at DESC, id) WHERE ((deleted_at IS NULL) AND bookmarked)`
- `growth_entry_category`: `CREATE INDEX growth_entry_category ON dc.growth_entry USING btree (student_uid, category_code, updated_at DESC, id) WHERE (deleted_at IS NULL)`
- `growth_entry_kind`: `CREATE INDEX growth_entry_kind ON dc.growth_entry USING btree (student_uid, kind_code, occurred_on DESC NULLS LAST, id) WHERE (deleted_at IS NULL)`
- `growth_entry_pkey`: `CREATE UNIQUE INDEX growth_entry_pkey ON dc.growth_entry USING btree (id)`
- `growth_entry_student_uid_id_key`: `CREATE UNIQUE INDEX growth_entry_student_uid_id_key ON dc.growth_entry USING btree (student_uid, id)`
- `growth_entry_tags`: `CREATE INDEX growth_entry_tags ON dc.growth_entry USING gin (tags)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.growth_entry_file

추정 행수 -1, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| entry_id | text | O | — |
| file_id | text | O | — |
| position | integer | O | 0 |
| linked_at | timestamp with time zone | O | now() |
| linked_by | text | — | — |
| unlinked_at | timestamp with time zone | — | — |
| unlinked_by | text | — | — |

**제약**

- `growth_entry_file_entry_fk`: `FOREIGN KEY (student_uid, entry_id) REFERENCES dc.growth_entry(student_uid, id) ON DELETE RESTRICT`
- `growth_entry_file_file_id_fkey`: `FOREIGN KEY (file_id) REFERENCES dc.file_object(id) ON DELETE RESTRICT`
- `growth_entry_file_linked_by_fkey`: `FOREIGN KEY (linked_by) REFERENCES dc.person(intg_uid)`
- `growth_entry_file_pkey`: `PRIMARY KEY (id)`
- `growth_entry_file_position_check`: `CHECK (("position" >= 0))`
- `growth_entry_file_unlinked_by_fkey`: `FOREIGN KEY (unlinked_by) REFERENCES dc.person(intg_uid)`
- `growth_entry_file_unlinked_pair`: `CHECK (((unlinked_at IS NULL) = (unlinked_by IS NULL)))`

**인덱스**

- `growth_entry_file_current`: `CREATE UNIQUE INDEX growth_entry_file_current ON dc.growth_entry_file USING btree (entry_id, file_id) WHERE (unlinked_at IS NULL)`
- `growth_entry_file_order`: `CREATE INDEX growth_entry_file_order ON dc.growth_entry_file USING btree (entry_id, "position", id) WHERE (unlinked_at IS NULL)`
- `growth_entry_file_pkey`: `CREATE UNIQUE INDEX growth_entry_file_pkey ON dc.growth_entry_file USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.growth_event

추정 행수 9, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| entry_id | text | — | — |
| action | text | O | — |
| entry_version_before | bigint | — | — |
| entry_version_after | bigint | — | — |
| profile_version_before | bigint | — | — |
| profile_version_after | bigint | — | — |
| before_value | jsonb | — | — |
| after_value | jsonb | O | — |
| reason | text | O | ''::text |
| actor_uid | text | — | — |
| transaction_id | uuid | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `growth_event_action_check`: `CHECK ((action = ANY (ARRAY['PROFILE_CREATE'::text, 'PROFILE_UPDATE'::text, 'CREATE'::text, 'UPDATE'::text, 'DELETE'::text, 'FILE_LINK'::text, 'FILE_UNLINK'::text, 'IMPORT'::text])))`
- `growth_event_actor`: `CHECK (((action = 'IMPORT'::text) OR (actor_uid IS NOT NULL)))`
- `growth_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `growth_event_entry_fk`: `FOREIGN KEY (student_uid, entry_id) REFERENCES dc.growth_entry(student_uid, id) ON DELETE RESTRICT`
- `growth_event_entry_scope`: `CHECK (((entry_id IS NULL) = (action = ANY (ARRAY['PROFILE_CREATE'::text, 'PROFILE_UPDATE'::text]))))`
- `growth_event_pkey`: `PRIMARY KEY (id)`
- `growth_event_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.growth_profile(student_uid)`

**인덱스**

- `growth_event_entry`: `CREATE INDEX growth_event_entry ON dc.growth_event USING btree (entry_id, created_at DESC, id) WHERE (entry_id IS NOT NULL)`
- `growth_event_pkey`: `CREATE UNIQUE INDEX growth_event_pkey ON dc.growth_event USING btree (id)`
- `growth_event_timeline`: `CREATE INDEX growth_event_timeline ON dc.growth_event USING btree (student_uid, created_at DESC, id)`

**트리거**

- `growth_event_immutable`: `CREATE TRIGGER growth_event_immutable BEFORE DELETE OR UPDATE ON dc.growth_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.growth_profile

추정 행수 2, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| intro | text | O | ''::text |
| contact_email | text | — | — |
| contact_phone | text | — | — |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |

**제약**

- `growth_profile_contact_email_check`: `CHECK (((contact_email IS NULL) OR ((length(contact_email) >= 3) AND (length(contact_email) <= 320))))`
- `growth_profile_contact_phone_check`: `CHECK (((contact_phone IS NULL) OR ((length(contact_phone) >= 3) AND (length(contact_phone) <= 40))))`
- `growth_profile_intro_check`: `CHECK ((length(intro) <= 5000))`
- `growth_profile_pkey`: `PRIMARY KEY (student_uid)`
- `growth_profile_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `growth_profile_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `growth_profile_version_check`: `CHECK ((version > 0))`

**인덱스**

- `growth_profile_pkey`: `CREATE UNIQUE INDEX growth_profile_pkey ON dc.growth_profile USING btree (student_uid)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.idempotency

추정 행수 11, 테이블·인덱스 총 827392 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| actor_uid | text | O | — |
| route | text | O | — |
| key | text | O | — |
| request_hash | text | O | — |
| response | jsonb | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `idempotency_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `idempotency_pkey`: `PRIMARY KEY (actor_uid, route, key)`

**인덱스**

- `idempotency_pkey`: `CREATE UNIQUE INDEX idempotency_pkey ON dc.idempotency USING btree (actor_uid, route, key)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT

## dc.import_issue

추정 행수 6, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | bigint | O | IDENTITY a |
| source_path | text | O | — |
| source_key | text | O | — |
| code | text | O | — |
| detail | text | O | — |

**제약**

- `import_issue_pkey`: `PRIMARY KEY (id)`
- `import_issue_source_path_fkey`: `FOREIGN KEY (source_path) REFERENCES dc.seed_source(path)`
- `import_issue_source_path_source_key_code_key`: `UNIQUE (source_path, source_key, code)`

**인덱스**

- `import_issue_pkey`: `CREATE UNIQUE INDEX import_issue_pkey ON dc.import_issue USING btree (id)`
- `import_issue_source_path_source_key_code_key`: `CREATE UNIQUE INDEX import_issue_source_path_source_key_code_key ON dc.import_issue USING btree (source_path, source_key, code)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.job_access_event

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| actor_uid | text | O | — |
| action | text | O | — |
| target_kind | text | O | — |
| target_id | text | — | — |
| filter_hash | text | O | — |
| row_count | integer | O | — |
| occurred_at | timestamp with time zone | O | now() |

**제약**

- `job_access_event_action_check`: `CHECK ((action = ANY (ARRAY['EXPORT_CSV'::text, 'VIEW_DOCUMENT'::text])))`
- `job_access_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `job_access_event_pkey`: `PRIMARY KEY (id)`
- `job_access_event_row_count_check`: `CHECK ((row_count >= 0))`

**인덱스**

- `job_access_event_actor`: `CREATE INDEX job_access_event_actor ON dc.job_access_event USING btree (actor_uid, occurred_at DESC)`
- `job_access_event_pkey`: `CREATE UNIQUE INDEX job_access_event_pkey ON dc.job_access_event USING btree (id)`

**트리거**

- `job_access_event_immutable`: `CREATE TRIGGER job_access_event_immutable BEFORE DELETE OR UPDATE ON dc.job_access_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.job_application

추정 행수 -1, 테이블·인덱스 총 57344 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| posting_id | text | O | — |
| student_uid | text | O | — |
| current_attempt_no | integer | O | — |
| status | text | O | — |
| current_stage_id | text | — | — |
| applied_at | timestamp with time zone | O | — |
| canceled_at | timestamp with time zone | — | — |
| record_origin | text | O | 'LIVE'::text |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |

**제약**

- `job_application_canceled_at`: `CHECK (((status = 'CANCELED'::text) = (canceled_at IS NOT NULL)))`
- `job_application_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `job_application_current_attempt`: `FOREIGN KEY (id, current_attempt_no) REFERENCES dc.job_application_attempt(application_id, attempt_no) DEFERRABLE INITIALLY DEFERRED`
- `job_application_current_attempt_no_check`: `CHECK ((current_attempt_no > 0))`
- `job_application_pkey`: `PRIMARY KEY (id)`
- `job_application_posting_id_fkey`: `FOREIGN KEY (posting_id) REFERENCES dc.job_posting(id)`
- `job_application_posting_id_id_key`: `UNIQUE (posting_id, id)`
- `job_application_posting_id_student_uid_key`: `UNIQUE (posting_id, student_uid)`
- `job_application_record_origin_check`: `CHECK ((record_origin = ANY (ARRAY['LIVE'::text, 'LEGACY'::text])))`
- `job_application_stage_fk`: `FOREIGN KEY (posting_id, current_stage_id) REFERENCES dc.job_stage(posting_id, id)`
- `job_application_stage_scope`: `CHECK (((current_stage_id IS NULL) OR (status = ANY (ARRAY['IN_PROGRESS'::text, 'PASSED'::text, 'REJECTED'::text]))))`
- `job_application_status_check`: `CHECK ((status = ANY (ARRAY['APPLIED'::text, 'IN_PROGRESS'::text, 'PASSED'::text, 'REJECTED'::text, 'CANCELED'::text])))`
- `job_application_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `job_application_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `job_application_version_check`: `CHECK ((version > 0))`

**인덱스**

- `job_application_by_posting`: `CREATE INDEX job_application_by_posting ON dc.job_application USING btree (posting_id, status, applied_at DESC, id)`
- `job_application_by_student`: `CREATE INDEX job_application_by_student ON dc.job_application USING btree (student_uid, applied_at DESC, id)`
- `job_application_on_stage`: `CREATE INDEX job_application_on_stage ON dc.job_application USING btree (posting_id, current_stage_id) WHERE (status = 'IN_PROGRESS'::text)`
- `job_application_pkey`: `CREATE UNIQUE INDEX job_application_pkey ON dc.job_application USING btree (id)`
- `job_application_posting_id_id_key`: `CREATE UNIQUE INDEX job_application_posting_id_id_key ON dc.job_application USING btree (posting_id, id)`
- `job_application_posting_id_student_uid_key`: `CREATE UNIQUE INDEX job_application_posting_id_student_uid_key ON dc.job_application USING btree (posting_id, student_uid)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.job_application_attempt

추정 행수 -1, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| application_id | text | O | — |
| attempt_no | integer | O | — |
| submitted_at | timestamp with time zone | O | now() |
| snap_student_no | text | — | — |
| snap_name | text | — | — |
| snap_major_label | text | — | — |
| snap_grade | integer | — | — |
| snap_enrollment_status | text | — | — |
| snap_college_code | text | — | — |
| snap_college_label | text | — | — |
| snap_dept_code | text | — | — |
| snap_dept_label | text | — | — |
| snap_student_type | text | — | — |
| attachment_kind | text | — | — |
| attachment_file_id | text | — | — |
| portfolio_owner_uid | text | — | — |
| attachment_state | text | O | 'UNKNOWN'::text |
| legacy_file_name | text | — | — |
| eligibility_evidence | jsonb | — | — |
| record_origin | text | O | 'LIVE'::text |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |

**제약**

- `attempt_portfolio_owner`: `CHECK (((attachment_kind <> 'PORTFOLIO'::text) OR (portfolio_owner_uid IS NOT NULL)))`
- `attempt_resume_file`: `CHECK (((record_origin = 'LEGACY'::text) OR (attachment_kind <> 'RESUME_FILE'::text) OR (attachment_file_id IS NOT NULL)))`
- `job_application_attempt_application_id_attempt_no_key`: `UNIQUE (application_id, attempt_no)`
- `job_application_attempt_application_id_fkey`: `FOREIGN KEY (application_id) REFERENCES dc.job_application(id)`
- `job_application_attempt_attachment_file_id_fkey`: `FOREIGN KEY (attachment_file_id) REFERENCES dc.file_object(id)`
- `job_application_attempt_attachment_kind_check`: `CHECK ((attachment_kind = ANY (ARRAY['PORTFOLIO'::text, 'RESUME_FILE'::text])))`
- `job_application_attempt_attachment_state_check`: `CHECK ((attachment_state = ANY (ARRAY['AVAILABLE'::text, 'MISSING_BINARY'::text, 'DEPENDENCY_UNAVAILABLE'::text, 'UNKNOWN'::text])))`
- `job_application_attempt_attempt_no_check`: `CHECK ((attempt_no > 0))`
- `job_application_attempt_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `job_application_attempt_pkey`: `PRIMARY KEY (id)`
- `job_application_attempt_portfolio_owner_uid_fkey`: `FOREIGN KEY (portfolio_owner_uid) REFERENCES dc.student(intg_uid)`
- `job_application_attempt_record_origin_check`: `CHECK ((record_origin = ANY (ARRAY['LIVE'::text, 'LEGACY'::text])))`

**인덱스**

- `job_application_attempt_application_id_attempt_no_key`: `CREATE UNIQUE INDEX job_application_attempt_application_id_attempt_no_key ON dc.job_application_attempt USING btree (application_id, attempt_no)`
- `job_application_attempt_pkey`: `CREATE UNIQUE INDEX job_application_attempt_pkey ON dc.job_application_attempt USING btree (id)`
- `job_attempt_latest`: `CREATE INDEX job_attempt_latest ON dc.job_application_attempt USING btree (application_id, attempt_no DESC)`

**트리거**

- `job_attempt_immutable`: `CREATE TRIGGER job_attempt_immutable BEFORE DELETE OR UPDATE ON dc.job_application_attempt FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.job_application_event

추정 행수 -1, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| application_id | text | O | — |
| posting_id | text | O | — |
| attempt_no | integer | O | — |
| seq | bigint | O | — |
| action | text | O | — |
| from_status | text | — | — |
| to_status | text | — | — |
| from_stage_id | text | — | — |
| to_stage_id | text | — | — |
| from_stage_name | text | — | — |
| to_stage_name | text | — | — |
| reason | text | O | ''::text |
| actor_uid | text | — | — |
| actor_name_snapshot | text | — | — |
| occurred_at | timestamp with time zone | — | — |
| recorded_at | timestamp with time zone | O | now() |

**제약**

- `job_application_event_action_check`: `CHECK ((action = ANY (ARRAY['APPLY'::text, 'REAPPLY'::text, 'ADVANCE'::text, 'REJECT'::text, 'PASS'::text, 'CANCEL'::text, 'IMPORT'::text])))`
- `job_application_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `job_application_event_application_id_fkey`: `FOREIGN KEY (application_id) REFERENCES dc.job_application(id)`
- `job_application_event_application_id_seq_key`: `UNIQUE (application_id, seq)`
- `job_application_event_attempt_no_check`: `CHECK ((attempt_no > 0))`
- `job_application_event_pkey`: `PRIMARY KEY (id)`
- `job_application_event_seq_check`: `CHECK ((seq > 0))`
- `job_event_application_fk`: `FOREIGN KEY (posting_id, application_id) REFERENCES dc.job_application(posting_id, id)`
- `job_event_attempt_fk`: `FOREIGN KEY (application_id, attempt_no) REFERENCES dc.job_application_attempt(application_id, attempt_no) DEFERRABLE INITIALLY DEFERRED`
- `job_event_from_stage_fk`: `FOREIGN KEY (posting_id, from_stage_id) REFERENCES dc.job_stage(posting_id, id)`
- `job_event_to_stage_fk`: `FOREIGN KEY (posting_id, to_stage_id) REFERENCES dc.job_stage(posting_id, id)`

**인덱스**

- `job_application_event_application_id_seq_key`: `CREATE UNIQUE INDEX job_application_event_application_id_seq_key ON dc.job_application_event USING btree (application_id, seq)`
- `job_application_event_pkey`: `CREATE UNIQUE INDEX job_application_event_pkey ON dc.job_application_event USING btree (id)`
- `job_application_event_timeline`: `CREATE INDEX job_application_event_timeline ON dc.job_application_event USING btree (application_id, attempt_no, seq)`

**트리거**

- `job_application_event_immutable`: `CREATE TRIGGER job_application_event_immutable BEFORE DELETE OR UPDATE ON dc.job_application_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`
- `notify_job`: `CREATE TRIGGER notify_job AFTER INSERT ON dc.job_application_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event()`

**앱 계정 권한**

INSERT, SELECT

## dc.job_posting

추정 행수 7, 테이블·인덱스 총 876544 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| company_id | text | — | — |
| company_name_snapshot | text | O | — |
| role | text | O | — |
| tags | text[] | O | '{}'::text[] |
| salary_text | text | — | — |
| location_text | text | — | — |
| career_primary_group | text | — | 'JOB_CAREER_TYPE'::text |
| career_primary_code | text | — | — |
| company_type_group | text | — | 'JOB_COMPANY_TYPE'::text |
| company_type_code | text | — | — |
| source | text | O | — |
| source_system | text | — | — |
| source_key | text | — | — |
| recruit_type | text | O | — |
| stored_status | text | O | — |
| deadline_mode | text | O | — |
| deadline_date | date | — | — |
| deadline_raw | text | — | — |
| posted_at | timestamp with time zone | O | — |
| salary_negotiable | boolean | O | false |
| url_title_link | boolean | O | false |
| email_apply | boolean | O | false |
| apply_url | text | — | — |
| email | text | — | — |
| content_html | text | — | — |
| content_format | text | O | 'HTML'::text |
| logo_file_id | text | — | — |
| record_origin | text | O | 'LIVE'::text |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |
| deleted_at | timestamp with time zone | — | — |
| deleted_by | text | — | — |

**제약**

- `job_posting_company_id_fkey`: `FOREIGN KEY (company_id) REFERENCES dc.company(id)`
- `job_posting_company_name_snapshot_check`: `CHECK ((btrim(company_name_snapshot) <> ''::text))`
- `job_posting_content_format_check`: `CHECK ((content_format = ANY (ARRAY['HTML'::text, 'TEXT'::text])))`
- `job_posting_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `job_posting_deadline_mode_check`: `CHECK ((deadline_mode = ANY (ARRAY['DATE'::text, 'ALWAYS'::text, 'ON_HIRE'::text])))`
- `job_posting_deleted_by_fkey`: `FOREIGN KEY (deleted_by) REFERENCES dc.person(intg_uid)`
- `job_posting_logo_file_id_fkey`: `FOREIGN KEY (logo_file_id) REFERENCES dc.file_object(id)`
- `job_posting_pkey`: `PRIMARY KEY (id)`
- `job_posting_record_origin_check`: `CHECK ((record_origin = ANY (ARRAY['LIVE'::text, 'LEGACY'::text])))`
- `job_posting_recruit_type_check`: `CHECK ((recruit_type = ANY (ARRAY['GENERAL'::text, 'RECOMMENDATION'::text])))`
- `job_posting_role_check`: `CHECK ((btrim(role) <> ''::text))`
- `job_posting_source_check`: `CHECK ((source = ANY (ARRAY['manual'::text, 'external'::text])))`
- `job_posting_stored_status_check`: `CHECK ((stored_status = ANY (ARRAY['POSTED'::text, 'CLOSED'::text])))`
- `job_posting_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `job_posting_version_check`: `CHECK ((version > 0))`
- `posting_career_fk`: `FOREIGN KEY (career_primary_group, career_primary_code) REFERENCES dc.code_item(group_code, code)`
- `posting_company_type_fk`: `FOREIGN KEY (company_type_group, company_type_code) REFERENCES dc.code_item(group_code, code)`
- `posting_deadline_shape`: `CHECK (((record_origin = 'LEGACY'::text) OR ((deadline_date IS NULL) = (deadline_mode = 'ALWAYS'::text))))`
- `posting_manual_company`: `CHECK (((source <> 'manual'::text) OR (company_id IS NOT NULL)))`
- `posting_source_pair`: `CHECK (((source_system IS NULL) = (source_key IS NULL)))`

**인덱스**

- `job_posting_company`: `CREATE INDEX job_posting_company ON dc.job_posting USING btree (company_id) WHERE (company_id IS NOT NULL)`
- `job_posting_deadline`: `CREATE INDEX job_posting_deadline ON dc.job_posting USING btree (stored_status, deadline_date, id) WHERE (deleted_at IS NULL)`
- `job_posting_listing`: `CREATE INDEX job_posting_listing ON dc.job_posting USING btree (source, recruit_type, posted_at DESC, id) WHERE (deleted_at IS NULL)`
- `job_posting_pkey`: `CREATE UNIQUE INDEX job_posting_pkey ON dc.job_posting USING btree (id)`
- `job_posting_source`: `CREATE UNIQUE INDEX job_posting_source ON dc.job_posting USING btree (source_system, source_key) WHERE (source_key IS NOT NULL)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.job_posting_event

추정 행수 7, 테이블·인덱스 총 835584 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| posting_id | text | O | — |
| seq | bigint | O | — |
| action | text | O | — |
| before_value | jsonb | — | — |
| after_value | jsonb | O | — |
| reason | text | O | ''::text |
| actor_uid | text | — | — |
| occurred_at | timestamp with time zone | O | now() |

**제약**

- `job_posting_event_action_check`: `CHECK ((action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'CLOSE'::text, 'REOPEN'::text, 'DELETE'::text, 'STAGES_CHANGE'::text, 'IMPORT'::text])))`
- `job_posting_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `job_posting_event_pkey`: `PRIMARY KEY (id)`
- `job_posting_event_posting_id_fkey`: `FOREIGN KEY (posting_id) REFERENCES dc.job_posting(id)`
- `job_posting_event_posting_id_seq_key`: `UNIQUE (posting_id, seq)`
- `job_posting_event_seq_check`: `CHECK ((seq > 0))`

**인덱스**

- `job_posting_event_pkey`: `CREATE UNIQUE INDEX job_posting_event_pkey ON dc.job_posting_event USING btree (id)`
- `job_posting_event_posting_id_seq_key`: `CREATE UNIQUE INDEX job_posting_event_posting_id_seq_key ON dc.job_posting_event USING btree (posting_id, seq)`

**트리거**

- `job_posting_event_immutable`: `CREATE TRIGGER job_posting_event_immutable BEFORE DELETE OR UPDATE ON dc.job_posting_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.job_posting_option

추정 행수 32, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| posting_id | text | O | — |
| kind | text | O | — |
| group_code | text | — | 
CASE kind
    WHEN 'EMPLOYMENT'::text THEN 'JOB_EMPLOYMENT_TYPE'::text
    WHEN 'CATEGORY'::text THEN 'JOB_CATEGORY'::text
    WHEN 'CAREER'::text THEN 'JOB_CAREER_TYPE'::text
    WHEN 'GENDER'::text THEN 'JOB_GENDER'::text
    WHEN 'REGION'::text THEN 'JOB_REGION'::text
    ELSE NULL::text
END |
| code | text | O | — |

**제약**

- `job_posting_option_fk`: `FOREIGN KEY (group_code, code) REFERENCES dc.code_item(group_code, code)`
- `job_posting_option_kind_check`: `CHECK ((kind = ANY (ARRAY['EMPLOYMENT'::text, 'CATEGORY'::text, 'CAREER'::text, 'GENDER'::text, 'REGION'::text])))`
- `job_posting_option_pkey`: `PRIMARY KEY (posting_id, kind, code)`
- `job_posting_option_posting_id_fkey`: `FOREIGN KEY (posting_id) REFERENCES dc.job_posting(id)`

**인덱스**

- `job_posting_option_filter`: `CREATE INDEX job_posting_option_filter ON dc.job_posting_option USING btree (kind, code, posting_id)`
- `job_posting_option_pkey`: `CREATE UNIQUE INDEX job_posting_option_pkey ON dc.job_posting_option USING btree (posting_id, kind, code)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT

## dc.job_resume

추정 행수 2, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| student_uid | text | O | — |
| title | text | O | — |
| company_text | text | — | — |
| job_type_text | text | — | — |
| position_text | text | — | — |
| category_group | text | — | 'JOB_RESUME_CATEGORY'::text |
| category_code | text | — | — |
| category_label_legacy | text | — | — |
| content | text | O | — |
| origin | text | O | — |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |
| deleted_at | timestamp with time zone | — | — |
| deleted_by | text | — | — |

**제약**

- `job_resume_category_fk`: `FOREIGN KEY (category_group, category_code) REFERENCES dc.code_item(group_code, code)`
- `job_resume_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `job_resume_deleted_by_fkey`: `FOREIGN KEY (deleted_by) REFERENCES dc.person(intg_uid)`
- `job_resume_origin_check`: `CHECK ((origin = ANY (ARRAY['USER'::text, 'LEGACY'::text])))`
- `job_resume_pkey`: `PRIMARY KEY (id)`
- `job_resume_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `job_resume_title_check`: `CHECK ((btrim(title) <> ''::text))`
- `job_resume_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `job_resume_version_check`: `CHECK ((version > 0))`

**인덱스**

- `job_resume_owner`: `CREATE INDEX job_resume_owner ON dc.job_resume USING btree (student_uid, updated_at DESC, id) WHERE (deleted_at IS NULL)`
- `job_resume_pkey`: `CREATE UNIQUE INDEX job_resume_pkey ON dc.job_resume USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.job_resume_event

추정 행수 2, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| resume_id | text | O | — |
| seq | bigint | O | — |
| action | text | O | — |
| changed_fields | text[] | O | '{}'::text[] |
| actor_uid | text | — | — |
| occurred_at | timestamp with time zone | O | now() |

**제약**

- `job_resume_event_action_check`: `CHECK ((action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text, 'IMPORT'::text])))`
- `job_resume_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `job_resume_event_pkey`: `PRIMARY KEY (id)`
- `job_resume_event_resume_id_fkey`: `FOREIGN KEY (resume_id) REFERENCES dc.job_resume(id)`
- `job_resume_event_resume_id_seq_key`: `UNIQUE (resume_id, seq)`
- `job_resume_event_seq_check`: `CHECK ((seq > 0))`

**인덱스**

- `job_resume_event_pkey`: `CREATE UNIQUE INDEX job_resume_event_pkey ON dc.job_resume_event USING btree (id)`
- `job_resume_event_resume_id_seq_key`: `CREATE UNIQUE INDEX job_resume_event_resume_id_seq_key ON dc.job_resume_event USING btree (resume_id, seq)`

**트리거**

- `job_resume_event_immutable`: `CREATE TRIGGER job_resume_event_immutable BEFORE DELETE OR UPDATE ON dc.job_resume_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.job_role

추정 행수 13, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| job_id | text | O | — |
| label | text | O | — |
| category | text | O | — |
| icon | text | O | — |
| summary | text | O | — |
| what_to_do | jsonb | O | — |
| target_orgs | jsonb | O | — |

**제약**

- `job_role_pkey`: `PRIMARY KEY (job_id)`

**인덱스**

- `job_role_pkey`: `CREATE UNIQUE INDEX job_role_pkey ON dc.job_role USING btree (job_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.job_skill

추정 행수 93, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| job_id | text | O | — |
| skill_id | text | O | — |
| weight | numeric | O | — |
| required | boolean | O | — |

**제약**

- `job_skill_job_id_fkey`: `FOREIGN KEY (job_id) REFERENCES dc.job_role(job_id)`
- `job_skill_pkey`: `PRIMARY KEY (job_id, skill_id)`
- `job_skill_skill_id_fkey`: `FOREIGN KEY (skill_id) REFERENCES dc.skill(skill_id)`

**인덱스**

- `job_skill_pkey`: `CREATE UNIQUE INDEX job_skill_pkey ON dc.job_skill USING btree (job_id, skill_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.job_stage

추정 행수 5, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| posting_id | text | O | — |
| id | text | O | — |
| system_key | text | — | — |
| position | integer | O | — |
| name | text | O | — |
| deleted_at | timestamp with time zone | — | — |
| deleted_by | text | — | — |

**제약**

- `job_stage_deleted_by_fkey`: `FOREIGN KEY (deleted_by) REFERENCES dc.person(intg_uid)`
- `job_stage_name_check`: `CHECK ((btrim(name) <> ''::text))`
- `job_stage_pkey`: `PRIMARY KEY (posting_id, id)`
- `job_stage_posting_id_fkey`: `FOREIGN KEY (posting_id) REFERENCES dc.job_posting(id)`
- `job_stage_system_key_check`: `CHECK ((system_key = ANY (ARRAY['REVIEW'::text, 'FORWARD'::text])))`

**인덱스**

- `job_stage_pkey`: `CREATE UNIQUE INDEX job_stage_pkey ON dc.job_stage USING btree (posting_id, id)`
- `job_stage_position`: `CREATE UNIQUE INDEX job_stage_position ON dc.job_stage USING btree (posting_id, "position") WHERE (deleted_at IS NULL)`
- `job_stage_system`: `CREATE UNIQUE INDEX job_stage_system ON dc.job_stage USING btree (posting_id, system_key) WHERE ((system_key IS NOT NULL) AND (deleted_at IS NULL))`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.job_wishlist

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| posting_id | text | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `job_wishlist_pkey`: `PRIMARY KEY (student_uid, posting_id)`
- `job_wishlist_posting_id_fkey`: `FOREIGN KEY (posting_id) REFERENCES dc.job_posting(id)`
- `job_wishlist_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `job_wishlist_pkey`: `CREATE UNIQUE INDEX job_wishlist_pkey ON dc.job_wishlist USING btree (student_uid, posting_id)`
- `job_wishlist_recent`: `CREATE INDEX job_wishlist_recent ON dc.job_wishlist USING btree (student_uid, created_at DESC, posting_id)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT

## dc.main_popup

추정 행수 4, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| image_path | text | O | — |
| alt | text | O | — |
| href | text | O | — |
| sort_order | integer | O | — |
| active | boolean | O | true |
| starts_at | date | — | — |
| ends_at | date | — | — |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |
| version | bigint | O | 1 |

**제약**

- `main_popup_alt_check`: `CHECK ((btrim(alt) <> ''::text))`
- `main_popup_check`: `CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at <= ends_at)))`
- `main_popup_href_check`: `CHECK (((href ~~ '/%'::text) AND (href !~~ '//%'::text)))`
- `main_popup_image_path_check`: `CHECK (((image_path ~~ '/%'::text) AND (image_path !~~ '//%'::text)))`
- `main_popup_pkey`: `PRIMARY KEY (id)`
- `main_popup_version_check`: `CHECK ((version > 0))`

**인덱스**

- `ix_main_popup_active`: `CREATE INDEX ix_main_popup_active ON dc.main_popup USING btree (sort_order) WHERE active`
- `main_popup_pkey`: `CREATE UNIQUE INDEX main_popup_pkey ON dc.main_popup USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.menu

추정 행수 77, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| menu_code | text | O | — |
| parent_code | text | — | — |
| portal | text | O | — |
| label | text | O | — |
| route | text | O | — |
| sort_order | integer | O | 0 |
| is_active | boolean | O | true |
| version | integer | O | 1 |

**제약**

- `menu_check`: `CHECK (((parent_code IS NULL) OR (parent_code <> menu_code)))`
- `menu_parent_code_fkey`: `FOREIGN KEY (parent_code) REFERENCES dc.menu(menu_code)`
- `menu_pkey`: `PRIMARY KEY (menu_code)`
- `menu_portal_check`: `CHECK ((portal = ANY (ARRAY['admin'::text, 'student'::text])))`

**인덱스**

- `menu_pkey`: `CREATE UNIQUE INDEX menu_pkey ON dc.menu USING btree (menu_code)`

**트리거**

- `menu_revision`: `CREATE TRIGGER menu_revision AFTER INSERT OR UPDATE ON dc.menu FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision()`

**앱 계정 권한**

SELECT, UPDATE

## dc.menu_auth

추정 행수 92, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| menu_code | text | O | — |
| role_code | text | O | — |

**제약**

- `menu_auth_menu_code_fkey`: `FOREIGN KEY (menu_code) REFERENCES dc.menu(menu_code)`
- `menu_auth_pkey`: `PRIMARY KEY (menu_code, role_code)`
- `menu_auth_role_code_fkey`: `FOREIGN KEY (role_code) REFERENCES dc.auth_role(role_code)`

**인덱스**

- `menu_auth_pkey`: `CREATE UNIQUE INDEX menu_auth_pkey ON dc.menu_auth USING btree (menu_code, role_code)`

**트리거**

- `menu_auth_revision`: `CREATE TRIGGER menu_auth_revision AFTER INSERT OR DELETE OR UPDATE ON dc.menu_auth FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision()`

**앱 계정 권한**

SELECT

## dc.metadata_revision

추정 행수 1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | boolean | O | true |
| revision | bigint | O | 1 |

**제약**

- `metadata_revision_id_check`: `CHECK (id)`
- `metadata_revision_pkey`: `PRIMARY KEY (id)`

**인덱스**

- `metadata_revision_pkey`: `CREATE UNIQUE INDEX metadata_revision_pkey ON dc.metadata_revision USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

SELECT, UPDATE

## dc.mission_attempt

추정 행수 -1, 테이블·인덱스 총 40960 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| week_id | bigint | O | — |
| week_version | integer | O | — |
| title | text | O | — |
| kind | text | O | — |
| items | jsonb | O | — |
| answers | jsonb | — | — |
| result | jsonb | — | — |
| started_at | timestamp with time zone | O | now() |
| submitted_at | timestamp with time zone | — | — |

**제약**

- `mission_attempt_check`: `CHECK (((submitted_at IS NULL) = (result IS NULL)))`
- `mission_attempt_check1`: `CHECK (((submitted_at IS NULL) = (answers IS NULL)))`
- `mission_attempt_pkey`: `PRIMARY KEY (id)`
- `mission_attempt_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `mission_attempt_week_id_fkey`: `FOREIGN KEY (week_id) REFERENCES dc.mission_week(id)`

**인덱스**

- `mission_attempt_open`: `CREATE UNIQUE INDEX mission_attempt_open ON dc.mission_attempt USING btree (student_uid, week_id, week_version) WHERE (submitted_at IS NULL)`
- `mission_attempt_owner`: `CREATE INDEX mission_attempt_owner ON dc.mission_attempt USING btree (student_uid, started_at DESC, id)`
- `mission_attempt_pkey`: `CREATE UNIQUE INDEX mission_attempt_pkey ON dc.mission_attempt USING btree (id)`
- `mission_attempt_week`: `CREATE INDEX mission_attempt_week ON dc.mission_attempt USING btree (week_id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.mission_question

추정 행수 340, 테이블·인덱스 총 180224 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | bigint | O | IDENTITY a |
| kind | text | O | — |
| prompt | text | O | — |
| category | text | O | ''::text |
| content | jsonb | O | — |
| is_active | boolean | O | true |
| version | integer | O | 1 |
| updated_by | text | — | — |
| updated_at | timestamp with time zone | O | now() |

**제약**

- `mission_question_content_check`: `CHECK ((jsonb_typeof(content) = 'object'::text))`
- `mission_question_kind_check`: `CHECK ((kind = ANY (ARRAY['TOEIC'::text, 'NCS'::text, 'GSAT'::text])))`
- `mission_question_pkey`: `PRIMARY KEY (id)`
- `mission_question_prompt_check`: `CHECK (((length(prompt) >= 1) AND (length(prompt) <= 10000)))`
- `mission_question_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `mission_question_version_check`: `CHECK ((version > 0))`

**인덱스**

- `mission_question_actor`: `CREATE INDEX mission_question_actor ON dc.mission_question USING btree (updated_by)`
- `mission_question_kind`: `CREATE INDEX mission_question_kind ON dc.mission_question USING btree (kind, is_active, id)`
- `mission_question_pkey`: `CREATE UNIQUE INDEX mission_question_pkey ON dc.mission_question USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.mission_question_publication

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| question_id | bigint | O | — |
| week_id | bigint | O | — |
| first_published_at | timestamp with time zone | O | now() |

**제약**

- `mission_question_publication_pkey`: `PRIMARY KEY (question_id, week_id)`
- `mission_question_publication_question_id_fkey`: `FOREIGN KEY (question_id) REFERENCES dc.mission_question(id)`
- `mission_question_publication_week_id_fkey`: `FOREIGN KEY (week_id) REFERENCES dc.mission_week(id)`

**인덱스**

- `mission_publication_week`: `CREATE INDEX mission_publication_week ON dc.mission_question_publication USING btree (week_id)`
- `mission_question_publication_pkey`: `CREATE UNIQUE INDEX mission_question_publication_pkey ON dc.mission_question_publication USING btree (question_id, week_id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT

## dc.mission_week

추정 행수 -1, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | bigint | O | IDENTITY a |
| week_start | date | O | — |
| kind | text | O | — |
| title | text | O | — |
| items | jsonb | O | — |
| published | boolean | O | false |
| version | integer | O | 1 |
| updated_by | text | O | — |
| updated_at | timestamp with time zone | O | now() |
| selection_limit | smallint | O | 20 |

**제약**

- `mission_week_items_check`: `CHECK ((jsonb_typeof(items) = 'array'::text))`
- `mission_week_kind_check`: `CHECK ((kind = ANY (ARRAY['TOEIC'::text, 'NCS_GSAT'::text])))`
- `mission_week_pkey`: `PRIMARY KEY (id)`
- `mission_week_selection_limit_check`: `CHECK ((selection_limit = ANY (ARRAY[10, 20])))`
- `mission_week_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `mission_week_version_check`: `CHECK ((version > 0))`
- `mission_week_week_start_check`: `CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))`
- `mission_week_week_start_kind_key`: `UNIQUE (week_start, kind)`

**인덱스**

- `mission_week_actor`: `CREATE INDEX mission_week_actor ON dc.mission_week USING btree (updated_by)`
- `mission_week_pkey`: `CREATE UNIQUE INDEX mission_week_pkey ON dc.mission_week USING btree (id)`
- `mission_week_week_start_kind_key`: `CREATE UNIQUE INDEX mission_week_week_start_kind_key ON dc.mission_week USING btree (week_start, kind)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.notice

추정 행수 5, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| category | text | O | — |
| title | text | O | — |
| summary | text | O | — |
| body | text[] | O | — |
| posted_at | date | O | — |
| pinned | boolean | O | false |
| version | bigint | O | 1 |
| deleted_at | timestamp with time zone | — | — |
| created_by | text | — | — |
| updated_by | text | — | — |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |

**제약**

- `notice_category_check`: `CHECK ((category = ANY (ARRAY['PROGRAM'::text, 'CAREER'::text, 'SYSTEM'::text])))`
- `notice_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `notice_pkey`: `PRIMARY KEY (id)`
- `notice_title_check`: `CHECK ((btrim(title) <> ''::text))`
- `notice_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`
- `notice_version_check`: `CHECK ((version > 0))`

**인덱스**

- `ix_notice_listing`: `CREATE INDEX ix_notice_listing ON dc.notice USING btree (pinned DESC, posted_at DESC, id) WHERE (deleted_at IS NULL)`
- `notice_pkey`: `CREATE UNIQUE INDEX notice_pkey ON dc.notice USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.notice_event

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| notice_id | text | O | — |
| actor_uid | text | O | — |
| action | text | O | — |
| before_value | jsonb | — | — |
| after_value | jsonb | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `notice_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `notice_event_notice_id_fkey`: `FOREIGN KEY (notice_id) REFERENCES dc.notice(id)`
- `notice_event_pkey`: `PRIMARY KEY (id)`

**인덱스**

- `notice_event_pkey`: `CREATE UNIQUE INDEX notice_event_pkey ON dc.notice_event USING btree (id)`

**트리거**

- `notice_event_immutable`: `CREATE TRIGGER notice_event_immutable BEFORE DELETE OR UPDATE ON dc.notice_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.notification

추정 행수 158, 테이블·인덱스 총 147456 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| recipient_uid | text | O | — |
| source_kind | text | O | — |
| source_id | text | O | — |
| tone | text | O | — |
| title | text | O | — |
| body | text | O | ''::text |
| route | text | O | — |
| occurred_at | timestamp with time zone | O | now() |

**제약**

- `notification_pkey`: `PRIMARY KEY (id)`
- `notification_recipient_uid_fkey`: `FOREIGN KEY (recipient_uid) REFERENCES dc.person(intg_uid)`
- `notification_recipient_uid_source_kind_source_id_key`: `UNIQUE (recipient_uid, source_kind, source_id)`
- `notification_route_check`: `CHECK (((route ~~ '/%'::text) AND (route !~~ '//%'::text)))`
- `notification_tone_check`: `CHECK ((tone = ANY (ARRAY['counsel'::text, 'roadmap'::text, 'diagnosis'::text, 'job'::text, 'program'::text])))`

**인덱스**

- `ix_notification_recipient`: `CREATE INDEX ix_notification_recipient ON dc.notification USING btree (recipient_uid, occurred_at DESC, id)`
- `notification_pkey`: `CREATE UNIQUE INDEX notification_pkey ON dc.notification USING btree (id)`
- `notification_recipient_uid_source_kind_source_id_key`: `CREATE UNIQUE INDEX notification_recipient_uid_source_kind_source_id_key ON dc.notification USING btree (recipient_uid, source_kind, source_id)`

**트리거**

- `notification_immutable`: `CREATE TRIGGER notification_immutable BEFORE DELETE OR UPDATE ON dc.notification FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.notification_read

추정 행수 2, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| notification_id | uuid | O | — |
| read_at | timestamp with time zone | O | now() |

**제약**

- `notification_read_notification_id_fkey`: `FOREIGN KEY (notification_id) REFERENCES dc.notification(id)`
- `notification_read_pkey`: `PRIMARY KEY (notification_id)`

**인덱스**

- `notification_read_pkey`: `CREATE UNIQUE INDEX notification_read_pkey ON dc.notification_read USING btree (notification_id)`

**트리거**

- `notification_read_immutable`: `CREATE TRIGGER notification_read_immutable BEFORE DELETE OR UPDATE ON dc.notification_read FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.org_assignment

추정 행수 30, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| staff_uid | text | O | — |
| college_code | text | O | — |
| dept_code | text | O | — |
| role_code | text | O | — |
| valid_from | date | O | — |
| valid_to | date | — | — |
| is_active | boolean | O | true |
| version | integer | O | 1 |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |

**제약**

- `org_assignment_check`: `CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)))`
- `org_assignment_college_code_dept_code_fkey`: `FOREIGN KEY (college_code, dept_code) REFERENCES dc.department(college_code, dept_code)`
- `org_assignment_pkey`: `PRIMARY KEY (id)`
- `org_assignment_role_code_check`: `CHECK ((role_code = ANY (ARRAY['assistant'::text, 'professor'::text, 'counselor'::text])))`
- `org_assignment_staff_uid_college_code_dept_code_role_code_v_key`: `UNIQUE (staff_uid, college_code, dept_code, role_code, valid_from)`
- `org_assignment_staff_uid_fkey`: `FOREIGN KEY (staff_uid) REFERENCES dc.staff(intg_uid)`
- `org_assignment_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`

**인덱스**

- `ix_org_assignment_dept`: `CREATE INDEX ix_org_assignment_dept ON dc.org_assignment USING btree (college_code, dept_code) WHERE is_active`
- `org_assignment_pkey`: `CREATE UNIQUE INDEX org_assignment_pkey ON dc.org_assignment USING btree (id)`
- `org_assignment_staff_uid_college_code_dept_code_role_code_v_key`: `CREATE UNIQUE INDEX org_assignment_staff_uid_college_code_dept_code_role_code_v_key ON dc.org_assignment USING btree (staff_uid, college_code, dept_code, role_code, valid_from)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.penalty_entry

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| kind | text | O | — |
| points | integer | O | — |
| reason | text | O | — |
| program_id | text | — | — |
| program_title | text | — | — |
| source | text | O | 'app'::text |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |

**제약**

- `penalty_entry_check`: `CHECK (((source = 'import'::text) OR (created_by IS NOT NULL)))`
- `penalty_entry_check1`: `CHECK (((kind = 'WAIVE'::text) = (points < 0)))`
- `penalty_entry_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `penalty_entry_kind_check`: `CHECK ((kind = ANY (ARRAY['NOSHOW'::text, 'MANUAL'::text, 'WAIVE'::text])))`
- `penalty_entry_pkey`: `PRIMARY KEY (id)`
- `penalty_entry_points_check`: `CHECK (((points >= '-100'::integer) AND (points <= 100) AND (points <> 0)))`
- `penalty_entry_source_check`: `CHECK ((source = ANY (ARRAY['app'::text, 'import'::text])))`
- `penalty_entry_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `penalty_entry_pkey`: `CREATE UNIQUE INDEX penalty_entry_pkey ON dc.penalty_entry USING btree (id)`
- `penalty_entry_student`: `CREATE INDEX penalty_entry_student ON dc.penalty_entry USING btree (student_uid, created_at DESC)`

**트리거**

- `penalty_entry_immutable`: `CREATE TRIGGER penalty_entry_immutable BEFORE DELETE OR UPDATE ON dc.penalty_entry FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.person

추정 행수 45, 테이블·인덱스 총 81920 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| alias | text | O | — |
| name | text | O | — |
| kind | text | O | — |
| source | text | O | — |
| profile | jsonb | O | '{}'::jsonb |
| version | integer | O | 1 |

**제약**

- `person_alias_key`: `UNIQUE (alias)`
- `person_kind_check`: `CHECK ((kind = ANY (ARRAY['STUDENT'::text, 'STAFF'::text])))`
- `person_pkey`: `PRIMARY KEY (intg_uid)`
- `person_source_check`: `CHECK ((source = ANY (ARRAY['fixture'::text, 'academic'::text, 'local'::text])))`

**인덱스**

- `person_alias_key`: `CREATE UNIQUE INDEX person_alias_key ON dc.person USING btree (alias)`
- `person_pkey`: `CREATE UNIQUE INDEX person_pkey ON dc.person USING btree (intg_uid)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT

## dc.program

추정 행수 3, 테이블·인덱스 총 794624 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| title | text | O | — |
| capacity | integer | O | — |
| version | integer | O | 1 |
| summary | text | O | ''::text |
| detail | text | — | — |
| category_code | text | O | — |
| category_group | text | — | 'PROGRAM_CATEGORY'::text |
| status_code | text | O | 'RECRUITING'::text |
| apply_start | date | — | — |
| apply_end | date | — | — |
| run_start | date | — | — |
| run_end | date | — | — |
| sessions | integer | O | 1 |
| manager | text | O | ''::text |
| fiscal_year | text | O | ''::text |
| location | text | O | ''::text |
| image | text | — | — |
| pinned | boolean | O | false |
| roadmap_entry | text | O | 'NONE'::text |
| care_types | text[] | O | '{}'::text[] |
| satisfaction_survey | boolean | O | false |
| satisfaction_form_id | text | — | — |
| competency_survey | boolean | O | false |
| competency_areas | text[] | O | '{}'::text[] |
| include_in_stats | boolean | O | true |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |
| middle_category_code | text | — | — |
| middle_category_group | text | — | 'PROGRAM_MIDDLE_CATEGORY'::text |
| target_statuses | text[] | O | '{}'::text[] |
| target_grades | text[] | O | '{}'::text[] |

**제약**

- `ck_program_entry_needs_types`: `CHECK (((roadmap_entry = 'NONE'::text) OR (cardinality(care_types) > 0)))`
- `program_apply_period`: `CHECK (((apply_end IS NULL) OR (apply_start IS NULL) OR (apply_end >= apply_start)))`
- `program_capacity_check`: `CHECK ((capacity >= 0))`
- `program_care_types_check`: `CHECK ((care_types <@ ARRAY['T1'::text, 'T2'::text, 'T3'::text, 'T4'::text, 'T5'::text, 'T6'::text]))`
- `program_category_fk`: `FOREIGN KEY (category_group, category_code) REFERENCES dc.code_item(group_code, code)`
- `program_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `program_middle_category_group_middle_category_code_fkey`: `FOREIGN KEY (middle_category_group, middle_category_code) REFERENCES dc.code_item(group_code, code)`
- `program_pkey`: `PRIMARY KEY (id)`
- `program_roadmap_entry_check`: `CHECK ((roadmap_entry = ANY (ARRAY['NONE'::text, 'RECOMMEND'::text, 'REQUIRED'::text])))`
- `program_run_period`: `CHECK (((run_end IS NULL) OR (run_start IS NULL) OR (run_end >= run_start)))`
- `program_sessions_check`: `CHECK (((sessions >= 1) AND (sessions <= 999)))`
- `program_status_code_check`: `CHECK ((status_code = ANY (ARRAY['RECRUITING'::text, 'CLOSED'::text, 'ENDED'::text])))`
- `program_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`

**인덱스**

- `program_listing`: `CREATE INDEX program_listing ON dc.program USING btree (status_code, pinned DESC, created_at DESC)`
- `program_pkey`: `CREATE UNIQUE INDEX program_pkey ON dc.program USING btree (id)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.program_apply

추정 행수 3, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| program_id | text | O | — |
| student_uid | text | O | — |
| applied_at | timestamp with time zone | O | — |
| snapshot | jsonb | O | — |
| version | integer | O | 1 |
| round_no | integer | O | 1 |
| selection_code | text | O | 'PENDING'::text |
| selected_at | timestamp with time zone | — | — |
| attendance_code | text | O | 'UNKNOWN'::text |
| outcome_code | text | — | — |
| absence_points | integer | O | 0 |
| cancelled_at | timestamp with time zone | — | — |
| apply_path | text | — | — |
| motive | text | — | — |
| consents | jsonb | O | '{}'::jsonb |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |

**제약**

- `apply_outcome_needs_selection`: `CHECK (((outcome_code IS NULL) OR (selection_code = 'SELECTED'::text)))`
- `apply_selected_at`: `CHECK (((selection_code = 'SELECTED'::text) = (selected_at IS NOT NULL)))`
- `ck_program_apply_points_need_absence`: `CHECK (((absence_points = 0) OR (NOT (outcome_code IS DISTINCT FROM 'ABSENT'::text))))`
- `program_apply_absence_points_check`: `CHECK (((absence_points >= 0) AND (absence_points <= 3)))`
- `program_apply_attendance_code_check`: `CHECK ((attendance_code = ANY (ARRAY['UNKNOWN'::text, 'PRESENT'::text, 'NO_SHOW'::text])))`
- `program_apply_outcome_code_check`: `CHECK ((outcome_code = ANY (ARRAY['COMPLETED'::text, 'NOT_COMPLETED'::text, 'ATTENDED'::text, 'ABSENT'::text])))`
- `program_apply_pkey`: `PRIMARY KEY (program_id, student_uid)`
- `program_apply_program_id_fkey`: `FOREIGN KEY (program_id) REFERENCES dc.program(id)`
- `program_apply_round_no_check`: `CHECK (((round_no >= 1) AND (round_no <= 999)))`
- `program_apply_selection_code_check`: `CHECK ((selection_code = ANY (ARRAY['PENDING'::text, 'SELECTED'::text, 'REJECTED'::text, 'CANCELLED'::text])))`
- `program_apply_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `program_apply_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`

**인덱스**

- `program_apply_pkey`: `CREATE UNIQUE INDEX program_apply_pkey ON dc.program_apply USING btree (program_id, student_uid)`
- `program_apply_student`: `CREATE INDEX program_apply_student ON dc.program_apply USING btree (student_uid)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.program_apply_event

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| program_id | text | O | — |
| student_uid | text | O | — |
| action | text | O | — |
| before_value | jsonb | — | — |
| after_value | jsonb | O | — |
| reason | text | O | ''::text |
| changed_by | text | O | — |
| changed_at | timestamp with time zone | O | now() |

**제약**

- `program_apply_event_action_check`: `CHECK ((action = ANY (ARRAY['APPLY'::text, 'CANCEL'::text, 'SELECTION'::text, 'ATTENDANCE'::text, 'OUTCOME'::text, 'REMOVE'::text])))`
- `program_apply_event_changed_by_fkey`: `FOREIGN KEY (changed_by) REFERENCES dc.person(intg_uid)`
- `program_apply_event_pkey`: `PRIMARY KEY (id)`
- `program_apply_event_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `program_apply_event_pkey`: `CREATE UNIQUE INDEX program_apply_event_pkey ON dc.program_apply_event USING btree (id)`
- `program_apply_event_target`: `CREATE INDEX program_apply_event_target ON dc.program_apply_event USING btree (program_id, student_uid, changed_at DESC)`

**트리거**

- `notify_program`: `CREATE TRIGGER notify_program AFTER INSERT ON dc.program_apply_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event()`
- `program_apply_event_immutable`: `CREATE TRIGGER program_apply_event_immutable BEFORE DELETE OR UPDATE ON dc.program_apply_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.program_wishlist

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| program_id | text | O | — |
| wished | boolean | O | true |
| version | bigint | O | 1 |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |

**제약**

- `program_wishlist_pkey`: `PRIMARY KEY (student_uid, program_id)`
- `program_wishlist_program_id_fkey`: `FOREIGN KEY (program_id) REFERENCES dc.program(id) ON DELETE RESTRICT`
- `program_wishlist_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `program_wishlist_version_check`: `CHECK ((version > 0))`

**인덱스**

- `program_wishlist_owner`: `CREATE INDEX program_wishlist_owner ON dc.program_wishlist USING btree (student_uid, wished, updated_at DESC, program_id)`
- `program_wishlist_pkey`: `CREATE UNIQUE INDEX program_wishlist_pkey ON dc.program_wishlist USING btree (student_uid, program_id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.program_wishlist_event

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| program_id | text | O | — |
| wished_before | boolean | — | — |
| wished_after | boolean | O | — |
| version_before | bigint | — | — |
| version_after | bigint | O | — |
| actor_uid | text | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `program_wishlist_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `program_wishlist_event_fk`: `FOREIGN KEY (student_uid, program_id) REFERENCES dc.program_wishlist(student_uid, program_id) ON DELETE RESTRICT`
- `program_wishlist_event_pkey`: `PRIMARY KEY (id)`

**인덱스**

- `program_wishlist_event_pkey`: `CREATE UNIQUE INDEX program_wishlist_event_pkey ON dc.program_wishlist_event USING btree (id)`
- `program_wishlist_event_target`: `CREATE INDEX program_wishlist_event_target ON dc.program_wishlist_event USING btree (student_uid, program_id, created_at DESC, id)`

**트리거**

- `program_wishlist_event_immutable`: `CREATE TRIGGER program_wishlist_event_immutable BEFORE DELETE OR UPDATE ON dc.program_wishlist_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.psych_referral

추정 행수 -1, 테이블·인덱스 총 40960 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| sender_uid | text | O | — |
| recipient_uid | text | O | — |
| reason_code | text | O | — |
| status | text | O | 'PENDING'::text |
| version | integer | O | 1 |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |
| accepted_at | timestamp with time zone | — | — |
| completed_at | timestamp with time zone | — | — |
| cancelled_at | timestamp with time zone | — | — |

**제약**

- `psych_referral_check`: `CHECK ((sender_uid <> recipient_uid))`
- `psych_referral_check1`: `CHECK ((((status = 'PENDING'::text) AND (accepted_at IS NULL) AND (completed_at IS NULL) AND (cancelled_at IS NULL)) OR ((status = 'IN_PROGRESS'::text) AND (accepted_at IS NOT NULL) AND (completed_at IS NULL) AND (cancelled_at IS NULL)) OR ((status = 'DONE'::text) AND (accepted_at IS NOT NULL) AND (completed_at IS NOT NULL) AND (cancelled_at IS NULL)) OR ((status = 'CANCELLED'::text) AND (accepted_at IS NULL) AND (completed_at IS NULL) AND (cancelled_at IS NOT NULL))))`
- `psych_referral_pkey`: `PRIMARY KEY (id)`
- `psych_referral_reason_code_fkey`: `FOREIGN KEY (reason_code) REFERENCES dc.psych_referral_reason(code)`
- `psych_referral_recipient_uid_fkey`: `FOREIGN KEY (recipient_uid) REFERENCES dc.staff(intg_uid)`
- `psych_referral_sender_uid_fkey`: `FOREIGN KEY (sender_uid) REFERENCES dc.staff(intg_uid)`
- `psych_referral_status_check`: `CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'DONE'::text, 'CANCELLED'::text])))`
- `psych_referral_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `psych_referral_version_check`: `CHECK ((version > 0))`

**인덱스**

- `psych_referral_open_student`: `CREATE UNIQUE INDEX psych_referral_open_student ON dc.psych_referral USING btree (student_uid) WHERE (status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text]))`
- `psych_referral_pkey`: `CREATE UNIQUE INDEX psych_referral_pkey ON dc.psych_referral USING btree (id)`
- `psych_referral_recipient`: `CREATE INDEX psych_referral_recipient ON dc.psych_referral USING btree (recipient_uid, created_at DESC)`
- `psych_referral_sender`: `CREATE INDEX psych_referral_sender ON dc.psych_referral USING btree (sender_uid, created_at DESC)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.psych_referral_event

추정 행수 -1, 테이블·인덱스 총 16384 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| referral_id | uuid | O | — |
| actor_uid | text | O | — |
| action | text | O | — |
| occurred_at | timestamp with time zone | O | now() |

**제약**

- `psych_referral_event_action_check`: `CHECK ((action = ANY (ARRAY['CREATE'::text, 'ACCEPT'::text, 'COMPLETE'::text, 'CANCEL'::text])))`
- `psych_referral_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.staff(intg_uid)`
- `psych_referral_event_pkey`: `PRIMARY KEY (id)`
- `psych_referral_event_referral_id_fkey`: `FOREIGN KEY (referral_id) REFERENCES dc.psych_referral(id)`

**인덱스**

- `psych_referral_event_pkey`: `CREATE UNIQUE INDEX psych_referral_event_pkey ON dc.psych_referral_event USING btree (id)`

**트리거**

- `psych_referral_event_immutable`: `CREATE TRIGGER psych_referral_event_immutable BEFORE DELETE OR UPDATE ON dc.psych_referral_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.psych_referral_reason

추정 행수 5, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| code | text | O | — |
| label | text | O | — |
| sort_order | integer | O | — |
| active | boolean | O | true |

**제약**

- `psych_referral_reason_pkey`: `PRIMARY KEY (code)`
- `psych_referral_reason_sort_order_key`: `UNIQUE (sort_order)`

**인덱스**

- `psych_referral_reason_pkey`: `CREATE UNIQUE INDEX psych_referral_reason_pkey ON dc.psych_referral_reason USING btree (code)`
- `psych_referral_reason_sort_order_key`: `CREATE UNIQUE INDEX psych_referral_reason_sort_order_key ON dc.psych_referral_reason USING btree (sort_order)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.psych_test_result

추정 행수 -1, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| request_id | text | O | — |
| student_uid | text | O | — |
| counselor_uid | text | O | — |
| test_code | text | O | — |
| test_name_etc | text | — | — |
| tested_at | date | O | — |
| scales | jsonb | O | '[]'::jsonb |
| interpretation | text | O | ''::text |
| opinion | text | O | ''::text |
| open_to_student | boolean | O | false |
| status_code | text | O | — |
| snapshot | jsonb | O | — |
| created_at | timestamp with time zone | O | now() |
| updated_at | timestamp with time zone | O | now() |
| version | integer | O | 1 |

**제약**

- `ck_psych_test_result_scales_array`: `CHECK ((jsonb_typeof(scales) = 'array'::text))`
- `ck_psych_test_result_snapshot_object`: `CHECK ((jsonb_typeof(snapshot) = 'object'::text))`
- `fk_psych_test_result_request_student`: `FOREIGN KEY (request_id, student_uid) REFERENCES dc.counsel_request(id, student_uid)`
- `psych_test_result_check`: `CHECK (((test_code <> 'ETC'::text) OR (btrim(COALESCE(test_name_etc, ''::text)) <> ''::text)))`
- `psych_test_result_check1`: `CHECK (((status_code = 'DRAFT'::text) OR ((btrim(interpretation) <> ''::text) AND (btrim(opinion) <> ''::text))))`
- `psych_test_result_counselor_uid_fkey`: `FOREIGN KEY (counselor_uid) REFERENCES dc.staff(intg_uid)`
- `psych_test_result_pkey`: `PRIMARY KEY (id)`
- `psych_test_result_request_id_key`: `UNIQUE (request_id)`
- `psych_test_result_status_code_check`: `CHECK ((status_code = ANY (ARRAY['DRAFT'::text, 'DONE'::text])))`
- `psych_test_result_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `psych_test_result_version_check`: `CHECK ((version > 0))`

**인덱스**

- `ix_psych_test_result_student`: `CREATE INDEX ix_psych_test_result_student ON dc.psych_test_result USING btree (student_uid, tested_at DESC)`
- `psych_test_result_pkey`: `CREATE UNIQUE INDEX psych_test_result_pkey ON dc.psych_test_result USING btree (id)`
- `psych_test_result_request_id_key`: `CREATE UNIQUE INDEX psych_test_result_request_id_key ON dc.psych_test_result USING btree (request_id)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.roadmap

추정 행수 3, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| target_role | text | O | — |
| target_company | jsonb | O | — |
| version | integer | O | 1 |
| created_at | timestamp with time zone | O | now() |
| created_by | text | — | — |
| lock_version | bigint | O | 1 |
| status_code | text | O | — |
| status_group | text | — | 'ROADMAP_STATUS'::text |
| basis_kind | text | O | 'LEGACY_IMPORT'::text |
| basis_group | text | — | 'ROADMAP_BASIS'::text |
| counsel_request_id | text | — | — |
| ai_run_id | text | — | — |
| updated_at | timestamp with time zone | O | now() |
| updated_by | text | — | — |
| confirmed_at | timestamp with time zone | — | — |
| confirmed_by | text | — | — |
| confirmed | boolean | — | (status_code = 'CONFIRMED'::text) |

**제약**

- `roadmap_ai_run_id_fkey`: `FOREIGN KEY (ai_run_id) REFERENCES dc.ai_run(id)`
- `roadmap_basis_fk`: `FOREIGN KEY (basis_group, basis_kind) REFERENCES dc.code_item(group_code, code)`
- `roadmap_basis_needs_counsel`: `CHECK (((basis_kind = 'COUNSEL'::text) = (counsel_request_id IS NOT NULL)))`
- `roadmap_confirmed_by_fkey`: `FOREIGN KEY (confirmed_by) REFERENCES dc.person(intg_uid)`
- `roadmap_counsel_fk`: `FOREIGN KEY (counsel_request_id, student_uid) REFERENCES dc.counsel_request(id, student_uid) ON DELETE RESTRICT`
- `roadmap_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES dc.person(intg_uid)`
- `roadmap_lock_version_check`: `CHECK ((lock_version > 0))`
- `roadmap_pkey`: `PRIMARY KEY (student_uid)`
- `roadmap_shape`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`
- `roadmap_status_fk`: `FOREIGN KEY (status_group, status_code) REFERENCES dc.code_item(group_code, code)`
- `roadmap_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `roadmap_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES dc.person(intg_uid)`

**인덱스**

- `roadmap_counsel`: `CREATE INDEX roadmap_counsel ON dc.roadmap USING btree (counsel_request_id) WHERE (counsel_request_id IS NOT NULL)`
- `roadmap_pkey`: `CREATE UNIQUE INDEX roadmap_pkey ON dc.roadmap USING btree (student_uid)`
- `roadmap_status`: `CREATE INDEX roadmap_status ON dc.roadmap USING btree (status_code, updated_at DESC, student_uid)`

**트리거**

- `roadmap_shape`: `CREATE CONSTRAINT TRIGGER roadmap_shape AFTER INSERT OR DELETE OR UPDATE ON dc.roadmap DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.roadmap_shape_valid()`

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.roadmap_axis

추정 행수 9, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| axis | text | O | — |
| headline | text | O | — |
| rationale | text | O | — |
| axis_group | text | — | 'ROADMAP_AXIS'::text |
| ai_suggestion_id | bigint | — | — |
| editor_note | text | O | ''::text |

**제약**

- `roadmap_axis_ai_suggestion_id_fkey`: `FOREIGN KEY (ai_suggestion_id) REFERENCES dc.ai_suggestion(id)`
- `roadmap_axis_axis_check`: `CHECK ((axis = ANY (ARRAY['IAP'::text, 'CORE'::text, 'GROWTH'::text])))`
- `roadmap_axis_code_fk`: `FOREIGN KEY (axis_group, axis) REFERENCES dc.code_item(group_code, code)`
- `roadmap_axis_pkey`: `PRIMARY KEY (student_uid, axis)`
- `roadmap_axis_shape`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`
- `roadmap_axis_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.roadmap(student_uid)`

**인덱스**

- `roadmap_axis_pkey`: `CREATE UNIQUE INDEX roadmap_axis_pkey ON dc.roadmap_axis USING btree (student_uid, axis)`

**트리거**

- `roadmap_axis_shape`: `CREATE CONSTRAINT TRIGGER roadmap_axis_shape AFTER INSERT OR DELETE OR UPDATE ON dc.roadmap_axis DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.roadmap_shape_valid()`

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.roadmap_event

추정 행수 5, 테이블·인덱스 총 81920 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| roadmap_version | integer | O | — |
| lock_version_before | bigint | — | — |
| lock_version_after | bigint | — | — |
| action_code | text | O | — |
| cause_kind | text | — | — |
| cause_id | text | — | — |
| actor_uid | text | — | — |
| before_value | jsonb | — | — |
| after_value | jsonb | O | — |
| reason | text | O | ''::text |
| transaction_id | uuid | O | — |
| occurred_at | timestamp with time zone | O | now() |

**제약**

- `roadmap_event_action_code_check`: `CHECK ((action_code = ANY (ARRAY['CREATE'::text, 'REGENERATE'::text, 'EDIT'::text, 'REVIEW'::text, 'CONFIRM'::text, 'REOPEN'::text, 'PROGRAM_INSERT'::text, 'PROGRAM_EXPIRE'::text, 'ITEM_COMPLETION'::text, 'REQUEST_APPLIED'::text, 'RESTORE_EDIT'::text, 'IMPORT'::text])))`
- `roadmap_event_actor`: `CHECK (((action_code = 'IMPORT'::text) OR (actor_uid IS NOT NULL)))`
- `roadmap_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `roadmap_event_cause_pair`: `CHECK (((cause_kind IS NULL) = (cause_id IS NULL)))`
- `roadmap_event_pkey`: `PRIMARY KEY (id)`
- `roadmap_event_roadmap_version_check`: `CHECK ((roadmap_version > 0))`
- `roadmap_event_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `roadmap_event_student_uid_id_key`: `UNIQUE (student_uid, id)`

**인덱스**

- `roadmap_event_pkey`: `CREATE UNIQUE INDEX roadmap_event_pkey ON dc.roadmap_event USING btree (id)`
- `roadmap_event_student_uid_id_key`: `CREATE UNIQUE INDEX roadmap_event_student_uid_id_key ON dc.roadmap_event USING btree (student_uid, id)`
- `roadmap_event_timeline`: `CREATE INDEX roadmap_event_timeline ON dc.roadmap_event USING btree (student_uid, occurred_at DESC, id)`

**트리거**

- `roadmap_event_immutable`: `CREATE TRIGGER roadmap_event_immutable BEFORE DELETE OR UPDATE ON dc.roadmap_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.roadmap_item

추정 행수 46, 테이블·인덱스 총 131072 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| axis | text | O | — |
| id | text | O | — |
| position | integer | O | — |
| title | text | O | — |
| priority | text | O | — |
| importance | text | O | — |
| why | text | O | — |
| status | text | O | — |
| program_id | text | — | — |
| entry | text | O | — |
| expires_at | timestamp with time zone | — | — |
| version | integer | O | 1 |
| status_group | text | — | 'ROADMAP_ITEM_STATUS'::text |
| entry_group | text | — | 'ROADMAP_ENTRY'::text |
| priority_group | text | — | 'ROADMAP_PRIORITY'::text |
| importance_group | text | — | 'ROADMAP_IMPORTANCE'::text |
| origin_code | text | O | 'BASE'::text |
| origin_group | text | — | 'ROADMAP_ITEM_ORIGIN'::text |
| completed_at | timestamp with time zone | — | — |
| completion_source_code | text | — | — |
| completion_source_group | text | — | 'ROADMAP_COMPLETION_SOURCE'::text |
| completion_ref | jsonb | — | — |
| created_at | timestamp with time zone | — | — |
| ai_suggestion_id | bigint | — | — |
| editor_note | text | O | ''::text |
| entry_event_id | uuid | — | — |

**제약**

- `roadmap_item_ai_suggestion_id_fkey`: `FOREIGN KEY (ai_suggestion_id) REFERENCES dc.ai_suggestion(id)`
- `roadmap_item_auto_shape`: `CHECK (((origin_code <> 'AUTO_PROGRAM'::text) OR ((axis = 'IAP'::text) AND (program_id IS NOT NULL) AND (entry = ANY (ARRAY['RECOMMEND'::text, 'REQUIRED'::text])))))`
- `roadmap_item_completion_fk`: `FOREIGN KEY (completion_source_group, completion_source_code) REFERENCES dc.code_item(group_code, code)`
- `roadmap_item_completion_pair`: `CHECK (((status = 'DONE'::text) = (completion_source_code IS NOT NULL)))`
- `roadmap_item_completion_time`: `CHECK (((completion_source_code IS NULL) OR (completion_source_code = 'LEGACY'::text) OR (completed_at IS NOT NULL)))`
- `roadmap_item_entry_check`: `CHECK ((entry = ANY (ARRAY['NONE'::text, 'RECOMMEND'::text, 'REQUIRED'::text])))`
- `roadmap_item_entry_event_fk`: `FOREIGN KEY (student_uid, entry_event_id) REFERENCES dc.roadmap_event(student_uid, id) DEFERRABLE INITIALLY DEFERRED`
- `roadmap_item_entry_fk`: `FOREIGN KEY (entry_group, entry) REFERENCES dc.code_item(group_code, code)`
- `roadmap_item_importance_fk`: `FOREIGN KEY (importance_group, importance) REFERENCES dc.code_item(group_code, code)`
- `roadmap_item_origin_fk`: `FOREIGN KEY (origin_group, origin_code) REFERENCES dc.code_item(group_code, code)`
- `roadmap_item_pkey`: `PRIMARY KEY (student_uid, id)`
- `roadmap_item_position`: `CHECK (("position" > 0))`
- `roadmap_item_priority_fk`: `FOREIGN KEY (priority_group, priority) REFERENCES dc.code_item(group_code, code)`
- `roadmap_item_program_id_fkey`: `FOREIGN KEY (program_id) REFERENCES dc.program(id)`
- `roadmap_item_recommend_expiry`: `CHECK (((origin_code <> 'AUTO_PROGRAM'::text) OR (entry <> 'RECOMMEND'::text) OR (expires_at IS NOT NULL)))`
- `roadmap_item_shape`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`
- `roadmap_item_slot`: `UNIQUE (student_uid, axis, "position") DEFERRABLE INITIALLY DEFERRED`
- `roadmap_item_status_check`: `CHECK ((status = ANY (ARRAY['TODO'::text, 'DONE'::text])))`
- `roadmap_item_status_fk`: `FOREIGN KEY (status_group, status) REFERENCES dc.code_item(group_code, code)`
- `roadmap_item_student_uid_axis_fkey`: `FOREIGN KEY (student_uid, axis) REFERENCES dc.roadmap_axis(student_uid, axis)`

**인덱스**

- `roadmap_item_auto_program`: `CREATE UNIQUE INDEX roadmap_item_auto_program ON dc.roadmap_item USING btree (student_uid, program_id) WHERE (origin_code = 'AUTO_PROGRAM'::text)`
- `roadmap_item_expiry`: `CREATE INDEX roadmap_item_expiry ON dc.roadmap_item USING btree (expires_at) WHERE ((entry = 'RECOMMEND'::text) AND (expires_at IS NOT NULL))`
- `roadmap_item_pkey`: `CREATE UNIQUE INDEX roadmap_item_pkey ON dc.roadmap_item USING btree (student_uid, id)`
- `roadmap_item_program`: `CREATE INDEX roadmap_item_program ON dc.roadmap_item USING btree (program_id, student_uid) WHERE (program_id IS NOT NULL)`
- `roadmap_item_slot`: `CREATE UNIQUE INDEX roadmap_item_slot ON dc.roadmap_item USING btree (student_uid, axis, "position")`

**트리거**

- `roadmap_item_shape`: `CREATE CONSTRAINT TRIGGER roadmap_item_shape AFTER INSERT OR DELETE OR UPDATE ON dc.roadmap_item DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.roadmap_shape_valid()`

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.roadmap_item_event

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| item_id | text | O | — |
| actor_uid | text | — | — |
| before_value | jsonb | O | — |
| after_value | jsonb | O | — |
| created_at | timestamp with time zone | O | now() |
| schema_version | smallint | O | 1 |
| roadmap_version | integer | — | — |
| action_code | text | — | — |
| cause_kind | text | — | — |
| cause_id | text | — | — |
| item_version_before | integer | — | — |
| item_version_after | integer | — | — |
| transaction_id | uuid | — | — |

**제약**

- `roadmap_item_event_action_code_check`: `CHECK ((action_code = ANY (ARRAY['CREATE'::text, 'EDIT'::text, 'REPLACE'::text, 'REMOVE'::text, 'COMPLETE'::text, 'REOPEN'::text, 'PROGRAM_INSERT'::text, 'PROGRAM_SYNC'::text])))`
- `roadmap_item_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `roadmap_item_event_pkey`: `PRIMARY KEY (id)`
- `roadmap_item_event_shape`: `CHECK (((schema_version = 1) OR ((roadmap_version IS NOT NULL) AND (action_code IS NOT NULL) AND (actor_uid IS NOT NULL) AND (transaction_id IS NOT NULL))))`
- `roadmap_item_event_student_fk`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `roadmap_item_event_pkey`: `CREATE UNIQUE INDEX roadmap_item_event_pkey ON dc.roadmap_item_event USING btree (id)`
- `roadmap_item_event_timeline`: `CREATE INDEX roadmap_item_event_timeline ON dc.roadmap_item_event USING btree (student_uid, created_at DESC, id)`

**트리거**

- `roadmap_item_event_immutable`: `CREATE TRIGGER roadmap_item_event_immutable BEFORE DELETE OR UPDATE ON dc.roadmap_item_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.roadmap_request

추정 행수 4, 테이블·인덱스 총 81920 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | text | O | — |
| student_uid | text | O | — |
| axis | text | — | — |
| title | text | O | — |
| reason | text | O | — |
| status_code | text | O | — |
| requested_at | timestamp with time zone | O | — |
| payload | jsonb | O | — |
| version | integer | O | 1 |
| axis_group | text | — | 'ROADMAP_AXIS'::text |
| status_group | text | — | 'ROADMAP_REQUEST_STATUS'::text |
| roadmap_version | integer | — | — |
| target_item_id | text | — | — |
| handled_at | timestamp with time zone | — | — |
| handled_by | text | — | — |
| handling_note | text | O | ''::text |
| applied_event_id | uuid | — | — |

**제약**

- `roadmap_request_applied_fk`: `FOREIGN KEY (student_uid, applied_event_id) REFERENCES dc.roadmap_event(student_uid, id) DEFERRABLE INITIALLY DEFERRED`
- `roadmap_request_axis_check`: `CHECK ((axis = ANY (ARRAY['IAP'::text, 'CORE'::text, 'GROWTH'::text])))`
- `roadmap_request_axis_fk`: `FOREIGN KEY (axis_group, axis) REFERENCES dc.code_item(group_code, code)`
- `roadmap_request_handled`: `CHECK (((status_code = 'REQ'::text) = (handled_at IS NULL)))`
- `roadmap_request_handled_by_fkey`: `FOREIGN KEY (handled_by) REFERENCES dc.person(intg_uid)`
- `roadmap_request_pkey`: `PRIMARY KEY (id)`
- `roadmap_request_status_fk`: `FOREIGN KEY (status_group, status_code) REFERENCES dc.code_item(group_code, code)`
- `roadmap_request_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `uq_roadmap_request_id_student`: `UNIQUE (id, student_uid)`

**인덱스**

- `roadmap_request_pkey`: `CREATE UNIQUE INDEX roadmap_request_pkey ON dc.roadmap_request USING btree (id)`
- `roadmap_request_queue`: `CREATE INDEX roadmap_request_queue ON dc.roadmap_request USING btree (status_code, requested_at DESC, id)`
- `roadmap_request_student`: `CREATE INDEX roadmap_request_student ON dc.roadmap_request USING btree (student_uid, status_code, requested_at DESC, id)`
- `uq_roadmap_request_id_student`: `CREATE UNIQUE INDEX uq_roadmap_request_id_student ON dc.roadmap_request USING btree (id, student_uid)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.roadmap_request_event

추정 행수 -1, 테이블·인덱스 총 24576 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| request_id | text | O | — |
| student_uid | text | O | — |
| action | text | O | — |
| status_before | text | — | — |
| status_after | text | O | — |
| version_before | integer | — | — |
| version_after | integer | — | — |
| actor_uid | text | — | — |
| reason | text | O | ''::text |
| transaction_id | uuid | O | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `fk_roadmap_request_event_request_student`: `FOREIGN KEY (request_id, student_uid) REFERENCES dc.roadmap_request(id, student_uid) ON DELETE RESTRICT`
- `roadmap_request_event_action_check`: `CHECK ((action = ANY (ARRAY['CREATE'::text, 'APPLY'::text, 'REJECT'::text, 'RETARGET'::text, 'IMPORT'::text])))`
- `roadmap_request_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `roadmap_request_event_pkey`: `PRIMARY KEY (id)`
- `roadmap_request_event_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `roadmap_request_event_pkey`: `CREATE UNIQUE INDEX roadmap_request_event_pkey ON dc.roadmap_request_event USING btree (id)`
- `roadmap_request_event_timeline`: `CREATE INDEX roadmap_request_event_timeline ON dc.roadmap_request_event USING btree (request_id, created_at DESC, id)`

**트리거**

- `notify_roadmap`: `CREATE TRIGGER notify_roadmap AFTER INSERT ON dc.roadmap_request_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event()`
- `roadmap_request_event_immutable`: `CREATE TRIGGER roadmap_request_event_immutable BEFORE DELETE OR UPDATE ON dc.roadmap_request_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.roadmap_snapshot

추정 행수 2, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| version | integer | O | — |
| payload | jsonb | O | — |
| actor_uid | text | — | — |
| created_at | timestamp with time zone | O | now() |

**제약**

- `roadmap_snapshot_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `roadmap_snapshot_pkey`: `PRIMARY KEY (id)`
- `roadmap_snapshot_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`
- `roadmap_snapshot_student_uid_version_key`: `UNIQUE (student_uid, version)`

**인덱스**

- `roadmap_snapshot_pkey`: `CREATE UNIQUE INDEX roadmap_snapshot_pkey ON dc.roadmap_snapshot USING btree (id)`
- `roadmap_snapshot_student_uid_version_key`: `CREATE UNIQUE INDEX roadmap_snapshot_student_uid_version_key ON dc.roadmap_snapshot USING btree (student_uid, version)`

**트리거**

- `roadmap_snapshot_immutable`: `CREATE TRIGGER roadmap_snapshot_immutable BEFORE DELETE OR UPDATE ON dc.roadmap_snapshot FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.schema_migration

추정 행수 84, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| version | text | O | — |
| checksum | text | O | — |
| applied_at | timestamp with time zone | O | now() |

**제약**

- `schema_migration_pkey`: `PRIMARY KEY (version)`

**인덱스**

- `schema_migration_pkey`: `CREATE UNIQUE INDEX schema_migration_pkey ON dc.schema_migration USING btree (version)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.seed_source

추정 행수 43, 테이블·인덱스 총 245760 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| path | text | O | — |
| checksum | text | O | — |
| payload | jsonb | O | — |
| imported_at | timestamp with time zone | O | now() |

**제약**

- `seed_source_pkey`: `PRIMARY KEY (path)`

**인덱스**

- `seed_source_pkey`: `CREATE UNIQUE INDEX seed_source_pkey ON dc.seed_source USING btree (path)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.skill

추정 행수 36, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| skill_id | text | O | — |
| label | text | O | — |
| category | text | O | — |
| icon | text | O | — |

**제약**

- `skill_pkey`: `PRIMARY KEY (skill_id)`

**인덱스**

- `skill_pkey`: `CREATE UNIQUE INDEX skill_pkey ON dc.skill USING btree (skill_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.staff

추정 행수 39, 테이블·인덱스 총 65536 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| role_code | text | O | — |
| profile | jsonb | O | — |
| version | integer | O | 1 |

**제약**

- `staff_intg_uid_fkey`: `FOREIGN KEY (intg_uid) REFERENCES dc.person(intg_uid)`
- `staff_pkey`: `PRIMARY KEY (intg_uid)`

**인덱스**

- `staff_pkey`: `CREATE UNIQUE INDEX staff_pkey ON dc.staff USING btree (intg_uid)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## dc.star_track

추정 행수 1, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| student_uid | text | O | — |
| payload | jsonb | O | — |

**제약**

- `star_track_pkey`: `PRIMARY KEY (student_uid)`
- `star_track_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `star_track_pkey`: `CREATE UNIQUE INDEX star_track_pkey ON dc.star_track USING btree (student_uid)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.student

추정 행수 6, 테이블·인덱스 총 180224 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| student_no | text | O | — |
| major_label | text | O | — |
| grade | integer | — | — |
| college_code | text | — | — |
| dept_code | text | — | — |
| entry_year | text | — | — |
| roster | jsonb | O | '{}'::jsonb |
| detail | jsonb | — | — |

**제약**

- `student_college_code_dept_code_fkey`: `FOREIGN KEY (college_code, dept_code) REFERENCES dc.department(college_code, dept_code)`
- `student_grade_check`: `CHECK (((grade >= 1) AND (grade <= 10)))`
- `student_intg_uid_fkey`: `FOREIGN KEY (intg_uid) REFERENCES dc.person(intg_uid)`
- `student_pkey`: `PRIMARY KEY (intg_uid)`
- `student_student_no_key`: `UNIQUE (student_no)`

**인덱스**

- `ix_student_dept`: `CREATE INDEX ix_student_dept ON dc.student USING btree (college_code, dept_code) WHERE (dept_code IS NOT NULL)`
- `student_major_grade`: `CREATE INDEX student_major_grade ON dc.student USING btree (major_label, grade)`
- `student_pkey`: `CREATE UNIQUE INDEX student_pkey ON dc.student USING btree (intg_uid)`
- `student_student_no_key`: `CREATE UNIQUE INDEX student_student_no_key ON dc.student USING btree (student_no)`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT

## dc.student_cert

추정 행수 9, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| cert_id | text | O | — |
| acquired_dt | date | — | — |
| cert_no | text | — | — |
| verified | boolean | O | false |
| added | boolean | O | true |

**제약**

- `student_cert_cert_id_fkey`: `FOREIGN KEY (cert_id) REFERENCES dc.cert(cert_id)`
- `student_cert_intg_uid_fkey`: `FOREIGN KEY (intg_uid) REFERENCES dc.student(intg_uid)`
- `student_cert_pkey`: `PRIMARY KEY (intg_uid, cert_id)`

**인덱스**

- `student_cert_pkey`: `CREATE UNIQUE INDEX student_cert_pkey ON dc.student_cert USING btree (intg_uid, cert_id)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.student_course

추정 행수 60, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| year | text | O | — |
| smt | text | O | — |
| curi_num | text | O | — |
| course_cls | text | O | — |
| grade | text | — | — |
| gpa | numeric | — | — |
| finish_yn | text | O | — |
| chk_recuri | text | O | — |

**제약**

- `student_course_curi_num_fkey`: `FOREIGN KEY (curi_num) REFERENCES dc.subject(curi_num)`
- `student_course_finish_yn_check`: `CHECK ((finish_yn = ANY (ARRAY['Y'::text, 'N'::text])))`
- `student_course_intg_uid_fkey`: `FOREIGN KEY (intg_uid) REFERENCES dc.student(intg_uid)`
- `student_course_pkey`: `PRIMARY KEY (intg_uid, year, smt, curi_num)`

**인덱스**

- `student_course_pkey`: `CREATE UNIQUE INDEX student_course_pkey ON dc.student_course USING btree (intg_uid, year, smt, curi_num)`
- `student_course_subject`: `CREATE INDEX student_course_subject ON dc.student_course USING btree (curi_num)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.student_job_interest

추정 행수 9, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| job_id | text | O | — |
| pinned | boolean | O | false |
| added | boolean | O | true |
| created_at | timestamp with time zone | O | now() |

**제약**

- `student_job_interest_intg_uid_fkey`: `FOREIGN KEY (intg_uid) REFERENCES dc.student(intg_uid)`
- `student_job_interest_job_id_fkey`: `FOREIGN KEY (job_id) REFERENCES dc.job_role(job_id)`
- `student_job_interest_pkey`: `PRIMARY KEY (intg_uid, job_id)`

**인덱스**

- `student_job_interest_pkey`: `CREATE UNIQUE INDEX student_job_interest_pkey ON dc.student_job_interest USING btree (intg_uid, job_id)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT, UPDATE

## dc.student_login_override

추정 행수 2, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| name | text | O | — |
| college_code | text | O | — |
| dept_code | text | O | — |
| college_name | text | O | — |
| dept_name | text | O | — |

**제약**

- `student_login_override_pkey`: `PRIMARY KEY (intg_uid)`

**인덱스**

- `student_login_override_pkey`: `CREATE UNIQUE INDEX student_login_override_pkey ON dc.student_login_override USING btree (intg_uid)`

**트리거**

없음.

**앱 계정 권한**

없음.

## dc.student_login_session

추정 행수 2, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| token_hash | text | O | — |
| student_uid | text | O | — |
| created_at | timestamp with time zone | O | now() |
| expires_at | timestamp with time zone | O | (now() + '08:00:00'::interval) |

**제약**

- `student_login_session_pkey`: `PRIMARY KEY (token_hash)`
- `student_login_session_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `student_login_session_expiry`: `CREATE INDEX student_login_session_expiry ON dc.student_login_session USING btree (expires_at)`
- `student_login_session_pkey`: `CREATE UNIQUE INDEX student_login_session_pkey ON dc.student_login_session USING btree (token_hash)`

**트리거**

없음.

**앱 계정 권한**

DELETE, INSERT, SELECT

## dc.student_program_history

추정 행수 8, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| intg_uid | text | O | — |
| program_id | text | O | — |
| title | text | O | — |
| applied_at | date | O | — |
| completed | boolean | O | — |
| source | text | O | 'fixture'::text |

**제약**

- `student_program_history_intg_uid_fkey`: `FOREIGN KEY (intg_uid) REFERENCES dc.student(intg_uid)`
- `student_program_history_pkey`: `PRIMARY KEY (intg_uid, program_id)`

**인덱스**

- `student_program_history_pkey`: `CREATE UNIQUE INDEX student_program_history_pkey ON dc.student_program_history USING btree (intg_uid, program_id)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.student_type_event

추정 행수 3, 테이블·인덱스 총 49152 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| id | uuid | O | gen_random_uuid() |
| student_uid | text | O | — |
| student_type | text | O | — |
| source | text | O | — |
| actor_uid | text | — | — |
| decided_at | timestamp with time zone | O | now() |

**제약**

- `student_type_event_actor_uid_fkey`: `FOREIGN KEY (actor_uid) REFERENCES dc.person(intg_uid)`
- `student_type_event_pkey`: `PRIMARY KEY (id)`
- `student_type_event_student_type_check`: `CHECK ((student_type = ANY (ARRAY['T1'::text, 'T2'::text, 'T3'::text, 'T4'::text, 'T5'::text, 'T6'::text])))`
- `student_type_event_student_uid_fkey`: `FOREIGN KEY (student_uid) REFERENCES dc.student(intg_uid)`

**인덱스**

- `ix_student_type_event_latest`: `CREATE INDEX ix_student_type_event_latest ON dc.student_type_event USING btree (student_uid, decided_at DESC, id DESC)`
- `student_type_event_pkey`: `CREATE UNIQUE INDEX student_type_event_pkey ON dc.student_type_event USING btree (id)`

**트리거**

- `student_type_event_immutable`: `CREATE TRIGGER student_type_event_immutable BEFORE DELETE OR UPDATE ON dc.student_type_event FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change()`

**앱 계정 권한**

INSERT, SELECT

## dc.student_type_rule

추정 행수 6, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| code | text | O | — |
| label | text | O | — |
| tier | text | O | — |
| tier_label | text | O | — |
| follow_up_test | text | O | — |
| program_scope | text | O | — |
| payload | jsonb | O | — |

**제약**

- `student_type_code_pkey`: `PRIMARY KEY (code)`

**인덱스**

- `student_type_code_pkey`: `CREATE UNIQUE INDEX student_type_code_pkey ON dc.student_type_rule USING btree (code)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.subject

추정 행수 52, 테이블·인덱스 총 32768 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| curi_num | text | O | — |
| curi_nm | text | O | — |
| cdt_num | numeric | O | — |
| open_dept_cd | text | O | — |
| grad_div | text | O | — |
| active | boolean | O | — |

**제약**

- `subject_pkey`: `PRIMARY KEY (curi_num)`

**인덱스**

- `subject_pkey`: `CREATE UNIQUE INDEX subject_pkey ON dc.subject USING btree (curi_num)`

**트리거**

없음.

**앱 계정 권한**

SELECT

## dc.toeic_vocabulary

추정 행수 340, 테이블·인덱스 총 139264 bytes.

| 컬럼 | 타입 | NOT NULL | 기본값·생성식 |
|---|---|---|---|
| question_id | bigint | O | — |
| english_word | text | O | — |
| difficulty_group | text | O | 'TOEIC_DIFFICULTY'::text |
| difficulty_code | text | O | — |

**제약**

- `toeic_vocabulary_difficulty_group_check`: `CHECK ((difficulty_group = 'TOEIC_DIFFICULTY'::text))`
- `toeic_vocabulary_difficulty_group_difficulty_code_fkey`: `FOREIGN KEY (difficulty_group, difficulty_code) REFERENCES dc.code_item(group_code, code)`
- `toeic_vocabulary_english_word_check`: `CHECK (((length(btrim(english_word)) >= 1) AND (length(btrim(english_word)) <= 150)))`
- `toeic_vocabulary_pkey`: `PRIMARY KEY (question_id)`
- `toeic_vocabulary_question_id_fkey`: `FOREIGN KEY (question_id) REFERENCES dc.mission_question(id)`

**인덱스**

- `toeic_vocabulary_difficulty`: `CREATE INDEX toeic_vocabulary_difficulty ON dc.toeic_vocabulary USING btree (difficulty_code, question_id)`
- `toeic_vocabulary_pkey`: `CREATE UNIQUE INDEX toeic_vocabulary_pkey ON dc.toeic_vocabulary USING btree (question_id)`
- `toeic_vocabulary_word`: `CREATE INDEX toeic_vocabulary_word ON dc.toeic_vocabulary USING btree (lower(english_word))`

**트리거**

없음.

**앱 계정 권한**

INSERT, SELECT, UPDATE

## 뷰 정의

### dc.academic_assistant_assignments

```sql
 SELECT dept_cd,
    usr_id,
    usr_nm,
    major_cd
   FROM academic.fu_ass_dept;
```

### dc.academic_counselors

```sql
 SELECT conid,
    con_nm AS name,
    inout_gb,
    con_gb,
    con_gb2,
    status,
    con_area1,
    con_area2,
    con_area3,
    con_area4,
    con_type1,
    con_type2,
    con_type3,
    target,
    place,
    place_num,
    tel,
    email,
    con_comp_nm,
    ( SELECT array_agg(t.daehak_cd ORDER BY t.daehak_cd) AS array_agg
           FROM academic.com_con_tar t
          WHERE ((t.conid)::text = (c.conid)::text)) AS college_codes
   FROM academic.com_con_inf c;
```

### dc.academic_joint_appointments

```sql
 SELECT intg_uid,
    emp_no,
    orgid,
    partid
   FROM academic.v_add_job_part;
```

### dc.academic_organizations

```sql
 SELECT dept_cd,
    dept_nm,
    dept_up_cd,
    grp_cd,
    grp_nm,
    ordering,
    lvl,
    use_yn,
    dept_sub_nm,
    univ_code
   FROM academic.v_dep_inf_all;
```

### dc.academic_people

```sql
 SELECT intg_uid,
    usr_nm AS name,
    user_ty_cd,
    hofc_sta_cd,
    orgid,
    orgz_nm,
    daehak_cd,
    hakbu_cd,
    major_cd,
    major_cd2,
    stu_schgr,
    prof_id,
    rankid,
    univ_cd,
        CASE user_ty_cd
            WHEN '1301'::text THEN 'professor'::text
            WHEN '1501'::text THEN 'assistant'::text
            WHEN '1401'::text THEN 'employee'::text
            WHEN '1101'::text THEN 'student'::text
            WHEN '1201'::text THEN 'student'::text
            WHEN '1102'::text THEN 'graduate'::text
            WHEN '1202'::text THEN 'graduate'::text
            ELSE 'other'::text
        END AS category
   FROM academic.v_usr_inf;
```

### dc.academic_sync_status

```sql
 SELECT id,
    started_at,
    finished_at,
    source_label,
    snapshot_mode,
    report
   FROM academic.sync_run;
```

### dc.core_competency_allocation_status

```sql
 SELECT a.id,
    ((count(x.competency_code) = 5) AND (sum(x.ratio) = (1)::numeric)) AS ratios_ready,
    ((count(x.competency_code) = 5) AND (sum(x.ratio) = (1)::numeric) AND (count(x.allocated_points) = 5)) AS points_ready
   FROM (dc.core_competency_allocation a
     LEFT JOIN dc.core_competency_allocation_axis x ON ((x.allocation_id = a.id)))
  GROUP BY a.id;
```

### dc.department_assignment_student_scope

```sql
 SELECT DISTINCT a.staff_uid,
    s.intg_uid AS student_uid,
    a.role_code
   FROM ((dc.department_staff_assignment a
     JOIN dc.staff staff ON (((staff.intg_uid = a.staff_uid) AND (staff.role_code = a.role_code))))
     JOIN dc.student s ON (((s.college_code = a.college_code) AND (s.dept_code = a.dept_code))))
  WHERE (a.is_active AND (a.legacy_id IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM dc.department_staff_candidates c
          WHERE (((c.staff_uid)::text = a.staff_uid) AND (NOT c.is_active))))) AND ((a.major_code = ''::text) OR (EXISTS ( SELECT 1
           FROM dc.academic_people p
          WHERE (((p.intg_uid)::text = s.intg_uid) AND ((p.major_cd)::text = a.major_code))))));
```

### dc.department_assignment_targets

```sql
 WITH org AS (
         SELECT academic_organizations.dept_cd,
            academic_organizations.dept_nm,
            academic_organizations.dept_up_cd,
            academic_organizations.grp_cd,
            academic_organizations.grp_nm,
            academic_organizations.ordering,
            academic_organizations.lvl,
            academic_organizations.use_yn,
            academic_organizations.dept_sub_nm,
            academic_organizations.univ_code
           FROM dc.academic_organizations
          WHERE ((academic_organizations.use_yn)::text = 'Y'::text)
        ), academic_targets AS (
         SELECT c.dept_cd AS college_code,
            c.dept_nm AS college_name,
            d.dept_cd AS dept_code,
            d.dept_nm AS dept_name,
            COALESCE(m.dept_cd, ''::character varying) AS major_code,
            m.dept_nm AS major_name
           FROM ((org d
             JOIN org c ON ((((c.lvl)::text = '1'::text) AND ((c.dept_cd)::text = (d.dept_up_cd)::text))))
             LEFT JOIN org m ON ((((m.lvl)::text = '3'::text) AND ((m.dept_up_cd)::text = (d.dept_cd)::text))))
          WHERE ((d.lvl)::text = '2'::text)
        )
 SELECT DISTINCT academic_targets.college_code,
    academic_targets.college_name,
    academic_targets.dept_code,
    academic_targets.dept_name,
    academic_targets.major_code,
    academic_targets.major_name
   FROM academic_targets
UNION ALL
 SELECT d.college_code,
    d.college_name,
    d.dept_code,
    d.dept_name,
    ''::text AS major_code,
    NULL::text AS major_name
   FROM dc.department d
  WHERE (NOT (EXISTS ( SELECT 1
           FROM academic_targets a
          WHERE (((a.college_code)::text = d.college_code) AND ((a.dept_code)::text = d.dept_code)))));
```

### dc.department_assignment_whole_targets

```sql
 SELECT DISTINCT c.dept_cd AS college_code,
    c.dept_nm AS college_name,
    d.dept_cd AS dept_code,
    d.dept_nm AS dept_name,
    ''::text AS major_code,
    NULL::text AS major_name
   FROM (dc.academic_organizations d
     JOIN dc.academic_organizations c ON ((((c.dept_cd)::text = (d.dept_up_cd)::text) AND ((c.lvl)::text = '1'::text))))
  WHERE (((d.lvl)::text = '2'::text) AND ((d.use_yn)::text = 'Y'::text) AND ((c.use_yn)::text = 'Y'::text) AND (EXISTS ( SELECT 1
           FROM dc.department_staff_assignment a
          WHERE ((a.college_code = (c.dept_cd)::text) AND (a.dept_code = (d.dept_cd)::text) AND (a.major_code = ''::text) AND a.is_active))));
```

### dc.department_staff_candidates

```sql
 SELECT DISTINCT ON (intg_uid) intg_uid AS staff_uid,
    usr_nm AS name,
    intg_uid AS employee_no,
        CASE user_ty_cd
            WHEN '1501'::text THEN 'assistant'::text
            ELSE 'professor'::text
        END AS role_code,
    hp AS mobile,
    tel AS phone,
    orgz_nm AS organization,
    ((hofc_sta_cd)::text = '89'::text) AS is_active
   FROM academic.v_usr_inf u
  WHERE ((user_ty_cd)::text = ANY (ARRAY[('1501'::character varying)::text, ('1301'::character varying)::text]))
  ORDER BY intg_uid, ((hofc_sta_cd)::text = '89'::text) DESC, usr_nm;
```

### dc.diagnosis_status

```sql
 SELECT v.intg_uid,
    v.alias,
    v.name,
    v.student_no,
    v.major_label,
    v.grade,
    v.status AS enrollment_status,
    t.test_id,
    c.label AS test_name,
    a.id AS attempt_id,
    COALESCE(a.status_code, 'NOT_STARTED'::text) AS status_code,
    COALESCE(a.attempt_no, 0) AS attempt_no,
    a.started_at,
    a.completed_at,
    (a.payload ->> 'resultSummary'::text) AS result_summary
   FROM ((((dc.student_list v
     LEFT JOIN dc.student_type_rule r ON ((r.code = v.student_type)))
     CROSS JOIN LATERAL ( SELECT 'ccore'::text AS test_id
        UNION
         SELECT lower(r.follow_up_test) AS lower
          WHERE (r.follow_up_test IS NOT NULL)) t)
     JOIN dc.code_item c ON (((c.group_code = 'DIAGNOSIS_TEST'::text) AND (c.code = upper(t.test_id)))))
     LEFT JOIN LATERAL ( SELECT d.id,
            d.student_uid,
            d.test_id,
            d.attempt_no,
            d.status_code,
            d.started_at,
            d.completed_at,
            d.payload,
            d.source
           FROM dc.diagnosis_attempt d
          WHERE ((d.student_uid = v.intg_uid) AND (lower(d.test_id) = t.test_id) AND (d.status_code <> 'PRECOMPUTED'::text))
          ORDER BY d.attempt_no DESC
         LIMIT 1) a ON (true));
```

### dc.fixture_student_login_source

```sql
 SELECT p.intg_uid,
    f.student_no,
    p.name,
    s.college_code,
    s.dept_code,
    d.college_name,
    s.major_label AS dept_name,
    (s.grade)::text AS stu_schgr,
    true AS local_override
   FROM (((dc.fixture_student_login f
     JOIN dc.person p ON (((p.intg_uid = f.student_uid) AND (p.kind = 'STUDENT'::text) AND (p.source = 'fixture'::text))))
     JOIN dc.student s ON ((s.intg_uid = p.intg_uid)))
     LEFT JOIN dc.department d USING (college_code, dept_code))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM academic.v_usr_inf a
          WHERE (((a.intg_uid)::text = f.student_no) OR ((a.login_id)::text = f.student_no)))));
```

### dc.penalty_total

```sql
 SELECT student_uid,
    (sum(points))::integer AS total,
    (count(*))::integer AS entry_count,
    max(created_at) AS last_at
   FROM dc.penalty_entry
  GROUP BY student_uid;
```

### dc.staff_student_scope

```sql
 SELECT fixture_student_scope.staff_uid,
    fixture_student_scope.student_uid,
    fixture_student_scope.source
   FROM dc.fixture_student_scope
UNION
 SELECT a.staff_uid,
    s.intg_uid AS student_uid,
    'org_assignment'::text AS source
   FROM (dc.org_assignment a
     JOIN dc.student s ON (((s.college_code = a.college_code) AND (s.dept_code = a.dept_code))))
  WHERE (a.is_active AND (a.valid_from <= CURRENT_DATE) AND ((a.valid_to IS NULL) OR (a.valid_to >= CURRENT_DATE)))
UNION
 SELECT advisor_assignment.professor_uid AS staff_uid,
    advisor_assignment.student_uid,
    'advisor_assignment'::text AS source
   FROM dc.advisor_assignment
  WHERE (advisor_assignment.released_at IS NULL)
UNION
 SELECT department_assignment_student_scope.staff_uid,
    department_assignment_student_scope.student_uid,
    'department_staff_assignment'::text AS source
   FROM dc.department_assignment_student_scope;
```

### dc.student_core_competency_activity

```sql
 SELECT c.intg_uid AS student_uid,
    'COURSE'::text AS kind,
    c.curi_num,
    c.year AS academic_year,
    c.smt AS academic_term,
    NULL::text AS program_id,
    a.id AS allocation_id
   FROM (dc.student_course c
     LEFT JOIN dc.core_competency_allocation a ON ((a.active AND (a.kind = 'COURSE'::text) AND (a.curi_num = c.curi_num) AND (a.academic_year = c.year) AND (a.academic_term = c.smt))))
  WHERE (c.finish_yn = 'Y'::text)
UNION ALL
 SELECT p.student_uid,
    'PROGRAM'::text AS kind,
    NULL::text AS curi_num,
    NULL::text AS academic_year,
    NULL::text AS academic_term,
    p.program_id,
    a.id AS allocation_id
   FROM (dc.program_apply p
     LEFT JOIN dc.core_competency_allocation a ON ((a.active AND (a.kind = 'PROGRAM'::text) AND (a.program_id = p.program_id))))
  WHERE ((p.outcome_code = 'COMPLETED'::text) AND (p.cancelled_at IS NULL));
```

### dc.student_core_competency_points

```sql
 SELECT s.student_uid,
    k.code AS competency_code,
    sum(x.allocated_points) AS accumulated_points
   FROM (((dc.student_core_competency_status s
     JOIN dc.student_core_competency_activity a ON ((a.student_uid = s.student_uid)))
     JOIN dc.core_competency_allocation_axis x ON ((x.allocation_id = a.allocation_id)))
     JOIN dc.core_competency k ON ((k.code = x.competency_code)))
  WHERE (s.status = 'READY'::text)
  GROUP BY s.student_uid, k.code;
```

### dc.student_core_competency_status

```sql
 SELECT s.intg_uid AS student_uid,
    count(a.kind) AS activity_count,
    count(a.kind) FILTER (WHERE (a.allocation_id IS NULL)) AS unmapped_count,
        CASE
            WHEN (count(a.kind) = 0) THEN 'NO_ACTIVITY'::text
            WHEN (count(a.kind) FILTER (WHERE (a.allocation_id IS NULL)) > 0) THEN 'ALLOCATION_MISSING'::text
            WHEN (bool_and(COALESCE(v.ratios_ready, false)) IS NOT TRUE) THEN 'ALLOCATION_INCOMPLETE'::text
            WHEN (bool_and(COALESCE(v.points_ready, false)) IS NOT TRUE) THEN 'POINTS_MISSING'::text
            ELSE 'READY'::text
        END AS status
   FROM ((dc.student s
     LEFT JOIN dc.student_core_competency_activity a ON ((a.student_uid = s.intg_uid)))
     LEFT JOIN dc.core_competency_allocation_status v ON ((v.id = a.allocation_id)))
  GROUP BY s.intg_uid;
```

### dc.student_list

```sql
 SELECT p.intg_uid,
    p.alias,
    p.name,
    s.student_no,
    s.major_label,
    s.grade,
    t.student_type,
    c.tier_label AS tier,
    c.label AS type_label,
    COALESCE((s.detail ->> 'enrollmentStatus'::text), '재학'::text) AS status,
    ( SELECT g.gpa
           FROM dc.student_gpa(s.intg_uid) g(gpa, source)) AS gpa,
    COALESCE(r.pct, 0) AS progress,
    (( SELECT count(*) AS count
           FROM dc.program_apply a
          WHERE ((a.student_uid = s.intg_uid) AND (a.outcome_code = 'COMPLETED'::text))))::integer AS program_count,
    (( SELECT count(*) AS count
           FROM dc.counsel_request q
          WHERE ((q.student_uid = s.intg_uid) AND (q.status_code = 'DONE'::text))))::integer AS counsel_count,
    s.detail,
    (st.student_uid IS NOT NULL) AS star,
    (EXISTS ( SELECT 1
           FROM dc.roadmap rm
          WHERE (rm.student_uid = s.intg_uid))) AS has_roadmap,
    s.college_code,
    s.dept_code,
    d.college_name
   FROM ((((((dc.student s
     JOIN dc.person p USING (intg_uid))
     LEFT JOIN LATERAL ( SELECT e.student_type
           FROM dc.student_type_event e
          WHERE (e.student_uid = s.intg_uid)
          ORDER BY e.decided_at DESC, e.id DESC
         LIMIT 1) t ON (true))
     LEFT JOIN dc.student_type_code c ON ((c.code = t.student_type)))
     LEFT JOIN dc.star_track st ON ((st.student_uid = s.intg_uid)))
     LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid, now()) r(done, total, pct) ON (true))
     LEFT JOIN dc.department d ON (((d.college_code = s.college_code) AND (d.dept_code = s.dept_code))));
```

### dc.student_login_source

```sql
 SELECT a.intg_uid,
    COALESCE(NULLIF((a.login_id)::text, ''::text), (a.intg_uid)::text) AS student_no,
    COALESCE(o.name, (a.usr_nm)::text) AS name,
    COALESCE(o.college_code, (a.daehak_cd)::text) AS college_code,
    COALESCE(o.dept_code, NULLIF((a.major_cd)::text, ''::text), NULLIF((a.hakbu_cd)::text, ''::text), (a.orgid)::text) AS dept_code,
    o.college_name,
    COALESCE(o.dept_name, (a.orgz_nm)::text) AS dept_name,
    a.stu_schgr,
    a.hofc_sta_cd,
    a.user_ty_cd,
    (o.intg_uid IS NOT NULL) AS local_override
   FROM (academic.v_usr_inf a
     LEFT JOIN dc.student_login_override o USING (intg_uid))
  WHERE ((a.user_ty_cd)::text = ANY (ARRAY[('1101'::character varying)::text, ('1102'::character varying)::text, ('1201'::character varying)::text, ('1202'::character varying)::text]));
```

### dc.student_type_code

```sql
 SELECT r.code,
    c.label,
    r.tier,
    r.tier_label,
    r.follow_up_test,
    r.program_scope,
    (r.payload || jsonb_build_object('label', c.label)) AS payload
   FROM (dc.student_type_rule r
     JOIN dc.code_item c ON (((c.group_code = 'STUDENT_TYPE'::text) AND (c.code = r.code))));
```
