-- DeepResume 연동: 우리 자소서(dc.job_resume) 1건 = Deep 자소서(cover) 1건 · 문항(topic) 1개.
-- 우리 DB가 자소서 정본이다(포트폴리오·이력서가 여기서 읽는다). Deep 에는 같은 본문을 PATCH 로 맞춘다.
-- deep_synced_version = Deep 에 마지막으로 반영한 우리 version. version 과 다르면 다음 저장·AI·평가 때 다시 보낸다.
-- AI 평가 결과는 우리 DB에 저장하지 않는다(Deep 평가본이 정본, 2026-11-13 사용자 확정).
-- Runs inside migrate.py's single transaction. Table is small (students × a few rows), so no CONCURRENTLY.
-- Rollback: revert the app first (old app never reads the columns); then the columns can be dropped:
--   ALTER TABLE dc.job_resume DROP COLUMN deep_synced_version, DROP COLUMN deep_topic_id, DROP COLUMN deep_cover_id;
--   (CHECK 두 개와 uq_job_resume_deep_cover 는 컬럼과 함께 사라진다. Deep 쪽 사본은 남으므로 연결 정보를 잃는다 —
--    되돌린 뒤 다시 올리면 첫 저장이 Deep 자소서를 새로 만든다.)
-- CHECK 는 갱신 후 행에 대해 검사한다. ai_draft 의 SET version=version+1, deep_synced_version=version+1 은
-- 두 칸 모두 갱신 전 version 을 읽으므로 같은 값이 되고, 삭제의 version+1 은 synced <= version 을 유지한다.

ALTER TABLE dc.job_resume
 ADD COLUMN deep_cover_id uuid,
 ADD COLUMN deep_topic_id uuid,
 ADD COLUMN deep_synced_version bigint,
 ADD CONSTRAINT ck_job_resume_deep_topic_needs_cover CHECK(deep_topic_id IS NULL OR deep_cover_id IS NOT NULL),
 ADD CONSTRAINT ck_job_resume_deep_synced_version CHECK(
   deep_synced_version IS NULL OR (deep_cover_id IS NOT NULL AND deep_synced_version BETWEEN 1 AND version));

-- 한 Deep 자소서는 우리 자소서 하나에만 연결된다.
CREATE UNIQUE INDEX uq_job_resume_deep_cover ON dc.job_resume(deep_cover_id) WHERE deep_cover_id IS NOT NULL;
