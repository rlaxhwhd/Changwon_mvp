-- AI 인터뷰 개인정보 동의를 한 번만 받는다(2026-11-16 사용자 지시 「한 번만 받게 해줘」).
-- 164 는 동의를 면접 세션 행에만 남겨 면접을 시작할 때마다 다시 받았다. 동의를 학생·동의서 버전당 1행으로
-- 따로 두고, 면접 시작은 이 행이 있는지만 확인한다. 동의서 문구가 바뀌어 버전이 오르면 새 버전 행이 없으므로
-- 다시 동의를 받는다. 동의서 원문은 화면(src_v2/pages/jobs/AiInterview.tsx)이 버전별로 소유한다.
-- 세션 행(dc.job_interview_session)의 consent_version·consent_answers·agreed_at 은 그대로 둔다 —
-- 그 면접이 어느 동의에 근거했는지의 발생 시점 스냅샷이며, 앞으로는 이 테이블의 행을 복사해 채운다.
-- 동의 기록은 고치거나 지우지 않는다(UPDATE 금지, DELETE 권한 없음).
-- Runs inside migrate.py's single transaction. New table + 기존 세션에서의 1회 백필(세션 수 = 소량).
-- Rollback: revert the app first; then DROP TABLE dc.job_interview_consent; DROP FUNCTION dc.guard_job_interview_consent();
--   (동의 기록이 지워지므로 필요하면 먼저 내보낸다. 세션 행의 스냅샷은 남는다.)
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE dc.job_interview_consent (
  student_uid     text NOT NULL REFERENCES dc.student(intg_uid),
  consent_version text NOT NULL CHECK (length(consent_version) BETWEEN 1 AND 40),
  consent_answers jsonb NOT NULL CHECK (jsonb_typeof(consent_answers) = 'object'),
  agreed_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_uid, consent_version)
);

-- 이미 동의하고 면접을 시작한 학생은 다시 묻지 않는다 — 학생·버전별 가장 이른 동의를 옮긴다.
INSERT INTO dc.job_interview_consent(student_uid, consent_version, consent_answers, agreed_at)
SELECT DISTINCT ON (student_uid, consent_version) student_uid, consent_version, consent_answers, agreed_at
  FROM dc.job_interview_session
 ORDER BY student_uid, consent_version, agreed_at, id;

CREATE FUNCTION dc.guard_job_interview_consent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Consent records are immutable';
END $$;

CREATE TRIGGER job_interview_consent_immutable BEFORE UPDATE ON dc.job_interview_consent
  FOR EACH ROW EXECUTE FUNCTION dc.guard_job_interview_consent();

GRANT SELECT, INSERT ON dc.job_interview_consent TO dc_app;
