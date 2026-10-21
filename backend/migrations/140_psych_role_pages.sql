-- 심리상담사 전용 화면 (2026-10-21 사용자 지시) — 심리상담사와 진로취업상담사는 별개 역할이다.
-- 상담 데이터 분리는 API(counsel.visibility)에서 하고, 여기서는 코드·테이블·메뉴만 바꾼다.
-- Rollback: 새 마이그레이션에서 psych menu_auth 를 099/123 상태로 되돌리고 psy-tests·counsel.10·stu-counsel.4 를 비활성화한다.
--           topic_group 식은 049 로 되돌릴 수 있다(PSY 신청의 topic_code 를 먼저 비워야 한다).

-- ① 심리검사 신청 — 오프라인 심리검사를 심리상담 신청(type PSY)으로 받고 검사 종류를 topic_code 로 남긴다.
--    결과는 기존 dc.psych_test_result(신청 1건당 1건)에 그대로 쌓인다.
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order)
 VALUES('PSYCH_TEST_KIND','심리검사 종류','OPERATIONAL',false,92);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('PSYCH_TEST_KIND','MIND_CHECK','마음검진(SCT,TCI,MMPI-2)',0),
 ('PSYCH_TEST_KIND','CST','CST(성격강점검사)',1),
 ('PSYCH_TEST_KIND','MBTI','MBTI(성격유형검사)',2),
 ('PSYCH_TEST_KIND','ETC','기타검사',3);
ALTER TABLE dc.counsel_request DROP CONSTRAINT counsel_topic_fk;
ALTER TABLE dc.counsel_request DROP COLUMN topic_group;
ALTER TABLE dc.counsel_request ADD COLUMN topic_group text
  GENERATED ALWAYS AS (CASE type_code WHEN 'PROF' THEN 'PROF_COUNSEL_TYPE' WHEN 'PSY' THEN 'PSYCH_TEST_KIND' ELSE 'COUNSEL_TOPIC' END) STORED;
ALTER TABLE dc.counsel_request ADD CONSTRAINT counsel_topic_fk FOREIGN KEY(topic_group,topic_code)
  REFERENCES dc.code_item(group_code,code);
CREATE INDEX ix_counsel_request_psych_test ON dc.counsel_request(requested_at DESC,id) WHERE type_code='PSY' AND topic_code IS NOT NULL;

-- ② 추가 심리상담신청 게시판 — 상담 자리가 없어 신청하지 못한 학생이 남기는 글. 심리상담사 전원이 보고 확인 처리한다.
--    작성 시점의 학생 정보(이름·학번·학년·연락처·이메일·대학·학과)를 snapshot 에 남긴다.
CREATE TABLE dc.psych_extra_request (
  id text PRIMARY KEY,
  student_uid text NOT NULL REFERENCES dc.student(intg_uid),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 20000),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
  created_by text NOT NULL REFERENCES dc.person(intg_uid),
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by text REFERENCES dc.staff(intg_uid),
  confirmed_at timestamptz,
  CHECK ((confirmed_by IS NULL) = (confirmed_at IS NULL))
);
CREATE INDEX ix_psych_extra_request_created ON dc.psych_extra_request(created_at DESC,id);
CREATE INDEX ix_psych_extra_request_student ON dc.psych_extra_request(student_uid,created_at DESC);
GRANT SELECT,INSERT,UPDATE ON dc.psych_extra_request TO dc_app;

-- ③ 심리상담사 GNB: 홈 · 검사관리 · 상담관리(신청접수함·상담현황·상담통계·추가 심리상담신청·심리상담센터 연계) · 학생관리.
--    진로취업상담사 메뉴는 바꾸지 않는다. 상담현황은 상담기록 화면을 쓰되 심리상담사 전용 메뉴 행으로 이름을 따로 단다.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('psy-tests',NULL,'admin','검사관리','/psych/tests',2),
 ('counsel.10','counsel','admin','상담현황','/counsel/records',2);
UPDATE dc.menu SET route='/counsel/psych-board',version=version+1 WHERE menu_code='counsel.6';
DELETE FROM dc.menu_auth WHERE role_code='psych' AND menu_code IN
 ('diagnosis','diagnosis.0','diagnosis.manage','roadmap','roadmap.0','roadmap.1','roadmap.2',
  'counsel.1','counsel.2','counsel.4','counsel.8','counsel.9','students.0');
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('psy-tests','psych'),('counsel.10','psych');

-- ④ 학생 GNB 상담센터에 「심리검사 신청」을 심리상담 바로 뒤에 둔다.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
 VALUES('stu-counsel.4','stu-counsel','student','심리검사 신청','/counsel/psych-test',2);
UPDATE dc.menu SET sort_order=sort_order+1,version=version+1 WHERE menu_code IN ('stu-counsel.2','stu-counsel.3');
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('stu-counsel.4','student');
