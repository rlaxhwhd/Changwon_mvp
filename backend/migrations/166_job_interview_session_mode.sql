-- AI 인터뷰 질문 방식 3종(Deep_APII_V2, 2026-11-18 사용자 지시 「다 진행해줘」).
-- 164 는 자소서 기반 면접(POST interview/sessions)만 알아 자소서가 반드시 있었다. DeepResume 면접 시작②
-- (POST interview/direct/sessions)는 자소서 없이(no_cover) 또는 기업별 질문(company)으로 면접을 만들므로
-- 자소서 없는 세션 행을 허용하고, 어느 방식이었는지(mode)와 그때 학생이 직접 입력해 Deep 에 보낸 값
-- (direct_input: company·job_category·interview_content — 발생 시점 스냅샷)을 남긴다.
-- interview_info 는 전과 같이 Deep 의 interview_info 그대로다. 기존 행은 모두 자소서 기반(mode='cover').
-- Runs inside migrate.py's single transaction. 기존 행 수는 소량(세션 기록) — CHECK 추가 시 1회 스캔.
-- Rollback (Astra 0014): SELECT count(*) FROM dc.job_interview_session WHERE mode <> 'cover' 가 0 이면 앱만 되돌리고
--   166 은 그대로 둔다(mode 기본값 'cover', direct_input NULL 이라 구 API 가 동작한다). 0 이 아니면 구 API 의
--   interview_dto 가 NULL 스냅샷에서 실패하고 NOT NULL 도 복원할 수 없으므로 되돌리지 않고 앞으로 고친다(forward-fix).
--   컬럼·CHECK 를 지우는 DROP 은 자소서 없는 면접 기록을 잃으므로 일반 롤백으로 실행하지 않는다.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE dc.job_interview_session
  ADD COLUMN mode text NOT NULL DEFAULT 'cover' CHECK (mode IN ('cover', 'no_cover', 'company')),
  ADD COLUMN direct_input jsonb CHECK (jsonb_typeof(direct_input) = 'object'),
  ALTER COLUMN resume_id DROP NOT NULL,
  ALTER COLUMN resume_snapshot DROP NOT NULL;

-- 자소서 기반이면 자소서·스냅샷이 있고 직접 입력은 없다. 자소서 없음·기업별은 그 반대다.
ALTER TABLE dc.job_interview_session
  ADD CONSTRAINT ck_job_interview_mode_resume
    CHECK ((mode = 'cover') = (resume_id IS NOT NULL) AND (resume_id IS NULL) = (resume_snapshot IS NULL)),
  ADD CONSTRAINT ck_job_interview_mode_input
    CHECK ((mode = 'cover') = (direct_input IS NULL));
