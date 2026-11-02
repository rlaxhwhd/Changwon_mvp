-- 취업예측분석시스템(/admin/forecast) — 시스템관리자가 졸업(예정)자 취업 현황을 등록·조회·엑셀 입출력한다(2026-11-02 사용자 지시).
-- 현행 ST_CAR_STAT_REPORT(조사차수·예비/본조사 30여 열)를 옮긴 것이 아니라, 지시받은 화면의 열만 담는 신규 대장이다.
-- 학생 열(학번·이름·단과대학·학과·성별)은 학사에서 읽은 등록 시점 스냅샷이다(CLAUDE.md 규칙 2) — 학사 값을 고치지 않는다.
-- 분류는 운영 코드(code_item 복합 FK + 생성열, 022 규약). 기업분류는 채용의 JOB_COMPANY_TYPE 을 그대로 쓰고,
-- 지역은 JOB_REGION 17개 시도에 '전국'·'해외'를 더한 이 대장 전용 그룹이다 — 채용 공고 지역에 전국·해외를 섞지 않는다.
-- 삭제는 deleted_at 으로 숨기고 변경 이력은 admin_event(entity='employment_report')에 남긴다.
-- Rollback: 앱을 먼저 되돌린다. 테이블·코드 그룹은 남겨 둔다(행이 있으면 내보낸 뒤 새 마이그레이션으로 지운다).
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';

INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order)
VALUES('EMPLOYMENT_REGION','취업 지역','OPERATIONAL',false,67);
INSERT INTO dc.code_item(group_code,code,label,sort_order)
SELECT 'EMPLOYMENT_REGION',code,label,sort_order FROM dc.code_item WHERE group_code='JOB_REGION';
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('EMPLOYMENT_REGION','NATIONWIDE','전국',100),
 ('EMPLOYMENT_REGION','OVERSEAS','해외',101);

CREATE TABLE dc.employment_report (
  id                 bigserial PRIMARY KEY,
  survey_year        smallint NOT NULL CHECK(survey_year BETWEEN 2000 AND 2100),
  intg_uid           text NOT NULL,
  student_no         text NOT NULL,
  student_name       text,
  college_name       text,
  dept_name          text,
  sex_code           text,
  graduation_month   text CHECK(graduation_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  company_name       text NOT NULL CHECK(btrim(company_name)<>''),
  duty               text NOT NULL CHECK(btrim(duty)<>''),
  company_type_group text GENERATED ALWAYS AS ('JOB_COMPANY_TYPE') STORED,
  company_type_code  text NOT NULL,
  region_group       text GENERATED ALWAYS AS ('EMPLOYMENT_REGION') STORED,
  region_code        text NOT NULL,
  employed_month     text NOT NULL CHECK(employed_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         text NOT NULL REFERENCES dc.person(intg_uid),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         text NOT NULL REFERENCES dc.person(intg_uid),
  deleted_at         timestamptz,
  deleted_by         text REFERENCES dc.person(intg_uid),
  CONSTRAINT employment_report_company_type_fk FOREIGN KEY(company_type_group,company_type_code) REFERENCES dc.code_item(group_code,code),
  CONSTRAINT employment_report_region_fk FOREIGN KEY(region_group,region_code) REFERENCES dc.code_item(group_code,code),
  CONSTRAINT employment_report_deleted_pair CHECK((deleted_at IS NULL)=(deleted_by IS NULL))
);
-- 한 조사년도에 학생 1명은 1건 — 엑셀 업로드는 이 키로 갱신한다.
CREATE UNIQUE INDEX employment_report_year_student ON dc.employment_report(survey_year,intg_uid) WHERE deleted_at IS NULL;
CREATE INDEX employment_report_list ON dc.employment_report(id DESC) WHERE deleted_at IS NULL;
GRANT SELECT,INSERT,UPDATE ON dc.employment_report TO dc_app;
GRANT USAGE ON SEQUENCE dc.employment_report_id_seq TO dc_app;
