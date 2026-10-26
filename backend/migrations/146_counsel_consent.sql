-- 상담 신청 동의서 기록(2026-10-26 사용자 지시). 학생이 상담·심리검사를 신청할 때 동의한 서식·응답·서명을
-- 신청과 한 트랜잭션에 남긴다. 신청 1건당 1행. 동의서 원문은 화면 코드가 버전별로 소유하고 여기에는 버전만 둔다.
-- 서식: CAREER = 취업전략센터 상담 동의서(진로취업·교수 상담), PSYCH = 학생상담센터 [붙임 9](심리상담·심리검사).
-- 동의 내용은 고치지 않는다(UPDATE 금지). 신청이 지워지는 유일한 경로(교수 상담 삭제 함수)는 동의 행도 함께 지운다.
-- Rollback: 앱을 먼저 되돌린다. 테이블을 지워야 하면 기록을 내보낸 뒤 새 마이그레이션으로 지운다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE dc.counsel_consent (
  request_id   text PRIMARY KEY,
  student_uid  text NOT NULL,
  form_code    text NOT NULL CHECK (form_code IN ('CAREER', 'PSYCH')),
  form_version text NOT NULL CHECK (length(form_version) BETWEEN 1 AND 40),
  answers      jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  signature    text NOT NULL CHECK (length(btrim(signature)) BETWEEN 1 AND 100),
  agreed_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_counsel_consent_request FOREIGN KEY (request_id, student_uid)
    REFERENCES dc.counsel_request (id, student_uid) ON DELETE CASCADE
);

CREATE FUNCTION dc.guard_counsel_consent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Consent records are immutable';
END $$;

CREATE TRIGGER counsel_consent_immutable BEFORE UPDATE ON dc.counsel_consent
  FOR EACH ROW EXECUTE FUNCTION dc.guard_counsel_consent();

GRANT SELECT, INSERT ON dc.counsel_consent TO dc_app;
