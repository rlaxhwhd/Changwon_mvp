-- AI 인터뷰(DeepResume 면접 IFRAME) 세션 기록 + 개인정보 동의 기록(2026-11-16 사용자 지시).
-- 학생이 동의하고 면접을 시작할 때 1행. 영상·질문·평가 결과는 Deep 에만 있다(2026-11-13 사용자 확정) —
-- 여기에는 누가·언제·어떤 자소서로·무엇에 동의하고 시작했는지와 Deep 세션/결과 id 만 둔다.
-- 발생 시점 스냅샷: 자소서 제목·분야·version(resume_snapshot), Deep 에 보낸 지원정보(interview_info).
-- 동의서 원문은 화면(src_v2/pages/jobs/AiInterview.tsx)이 버전별로 소유하고 여기에는 버전·응답만 둔다
-- (dc.counsel_consent, 146 과 같은 방식). 동의·스냅샷은 고치지 않는다 — UPDATE 는 종료 기록 1회만.
-- Runs inside migrate.py's single transaction. New empty table — no locks on existing rows.
-- Rollback: revert the app first; then DROP TABLE dc.job_interview_session; DROP FUNCTION dc.guard_job_interview_session();
--   (동의 기록이 지워지므로 필요하면 먼저 내보낸다. Deep 쪽 면접 결과는 남는다.)
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE dc.job_interview_session (
  id              text PRIMARY KEY CHECK (id ~ '^ivs_[0-9a-f]{12}$'),
  student_uid     text NOT NULL REFERENCES dc.student(intg_uid),
  resume_id       text NOT NULL REFERENCES dc.job_resume(id),
  resume_snapshot jsonb NOT NULL CHECK (jsonb_typeof(resume_snapshot) = 'object'),
  interview_info  jsonb NOT NULL CHECK (jsonb_typeof(interview_info) = 'object'),
  consent_version text NOT NULL CHECK (length(consent_version) BETWEEN 1 AND 40),
  consent_answers jsonb NOT NULL CHECK (jsonb_typeof(consent_answers) = 'object'),
  agreed_at       timestamptz NOT NULL DEFAULT now(),
  deep_session_id text NOT NULL CHECK (length(deep_session_id) BETWEEN 1 AND 100),
  deep_result_id  text CHECK (length(deep_result_id) BETWEEN 1 AND 100),
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_job_interview_finished CHECK ((deep_result_id IS NULL) = (finished_at IS NULL))
);

-- 본인 면접 이력(최신순).
CREATE INDEX ix_job_interview_session_student ON dc.job_interview_session(student_uid, created_at DESC);
-- Deep 세션 1건 = 우리 기록 1행, Deep 결과 1건은 한 세션에만 붙는다(다른 세션의 result_id 재사용 차단).
CREATE UNIQUE INDEX uq_job_interview_session_deep_session ON dc.job_interview_session(deep_session_id);
CREATE UNIQUE INDEX uq_job_interview_session_deep_result ON dc.job_interview_session(deep_result_id)
  WHERE deep_result_id IS NOT NULL;

-- 종료 기록(deep_result_id·finished_at)을 한 번 채우는 것만 허용한다.
CREATE FUNCTION dc.guard_job_interview_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.finished_at IS NOT NULL
     OR (to_jsonb(NEW) - 'deep_result_id' - 'finished_at') <> (to_jsonb(OLD) - 'deep_result_id' - 'finished_at') THEN
    RAISE EXCEPTION 'Interview session records are immutable except for the one-time finish';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER job_interview_session_immutable BEFORE UPDATE ON dc.job_interview_session
  FOR EACH ROW EXECUTE FUNCTION dc.guard_job_interview_session();

GRANT SELECT, INSERT, UPDATE ON dc.job_interview_session TO dc_app;
