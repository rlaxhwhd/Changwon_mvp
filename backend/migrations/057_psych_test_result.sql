-- 심리검사 결과 — 예전 localStorage 'dc_psych_tests' 를 대체한다(마지막 남은 localStorage 업무 데이터).
-- 심리검사는 CARE 7+ 진단(dc.diagnosis_*)과 다른 도메인이다: 문항·채점이 없고 외부 검사도구 결과를
-- 상담사가 입력한다. 척도는 도구마다 달라 jsonb 배열로 둔다. 결과 1건 = 심리상담 신청 1건.
CREATE TABLE dc.psych_test_result (
 id text PRIMARY KEY,
 request_id text NOT NULL UNIQUE REFERENCES dc.counsel_request(id),
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 counselor_uid text NOT NULL REFERENCES dc.staff(intg_uid),
 test_code text NOT NULL,
 test_name_etc text,
 tested_at date NOT NULL,
 scales jsonb NOT NULL DEFAULT '[]',
 interpretation text NOT NULL DEFAULT '',
 opinion text NOT NULL DEFAULT '',
 open_to_student boolean NOT NULL DEFAULT false,
 status_code text NOT NULL CHECK(status_code IN ('DRAFT','DONE')),
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 CHECK(test_code<>'ETC' OR btrim(coalesce(test_name_etc,''))<>''),
 CHECK(status_code='DRAFT' OR (btrim(interpretation)<>'' AND btrim(opinion)<>''))
);
CREATE INDEX ix_psych_test_result_student ON dc.psych_test_result(student_uid,tested_at DESC);
GRANT SELECT,INSERT,UPDATE ON dc.psych_test_result TO dc_app;
