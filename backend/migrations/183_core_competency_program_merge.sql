-- 0026: 핵심역량 교과(학사 CORE) + 비교과(이뤄드림) 합산(사용자 확정 2026-11-27). Astra 조건부 승인(0026 architecture-review).
-- 롤백(forward-only 관례, 필요 시 수동, 순서 중요. CASCADE 금지):
--   ① API 를 dc.academic_student_core_competency(180) 읽기·coreCompetencySource='ACADEMIC' 로 되돌리고 프론트 문구를 되돌린다.
--   ② DROP VIEW dc.student_core_competency_combined;
--   ③ DROP TABLE eco.roadmap_application_skill_point; DROP TABLE eco.roadmap_application; DROP TABLE eco.sync_run; DROP SCHEMA eco;
--   업체 사본은 업체 DB 가 원천이라 재수집으로 복구된다. 180 뷰·학사 사본은 건드리지 않는다.
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA eco;
REVOKE ALL ON SCHEMA eco FROM PUBLIC;
COMMENT ON SCHEMA eco IS
 'Vendor (Iruodream) read-only copy. Written only by backend/scripts/sync_eco_competency.py as the DB owner. dc_app has no privilege.';

-- 수집 실행 기록. 집계만(학번·이름·점수 개별값·접속 정보 금지). append-only.
CREATE TABLE eco.sync_run (
  id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('PUBLISHED', 'ABORTED')),
  report jsonb NOT NULL
);
CREATE TRIGGER eco_sync_run_immutable BEFORE UPDATE OR DELETE ON eco.sync_run
  FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- 업체 신청서 중 skill_scores 가 있는 행의 원값(감사·재처리용). 키 = 업체 application_id.
CREATE TABLE eco.roadmap_application (
  application_id bigint PRIMARY KEY,
  student_id text NOT NULL CHECK (student_id ~ '^\S{1,40}$'),
  program_id bigint,
  topic_id bigint,
  application_status_code text,
  is_completed boolean,
  completion_date timestamp,
  skill_scores jsonb NOT NULL CHECK (jsonb_typeof(skill_scores) = 'array'),
  source_updated_at timestamp,
  sync_run_id uuid NOT NULL REFERENCES eco.sync_run (id),
  UNIQUE (application_id, student_id)
);

-- skill_scores 원소 1개 = 1행(수집기가 검증 후 펼친다). 화면 합계는 이 표만 읽는다.
CREATE TABLE eco.roadmap_application_skill_point (
  application_id bigint NOT NULL,
  seq smallint NOT NULL CHECK (seq >= 1),            -- 배열 위치(1부터)
  student_id text NOT NULL,
  essential smallint NOT NULL CHECK (essential BETWEEN 1 AND 5),
  child integer NOT NULL CHECK (child = 0),          -- 하위역량 의미가 생기면 설계부터 다시
  point numeric NOT NULL CHECK (point >= 0 AND point < 'Infinity'),   -- NaN 은 Infinity 보다 커서 함께 걸러진다
  PRIMARY KEY (application_id, seq),
  FOREIGN KEY (application_id, student_id) REFERENCES eco.roadmap_application (application_id, student_id)
);
-- 프로필 점조회: (student_id, essential) 등치 + point 합 → index-only.
CREATE INDEX ix_eco_skill_point_student ON eco.roadmap_application_skill_point (student_id, essential) INCLUDE (point);

-- 화면 점수 = 교과(180 뷰) + 비교과(업체 지급 합계). 환산·정규화·목표선 없음.
-- 대상 = 학사 원본(dc_v_usr_inf, 즉 origin='source') 학생 중 서비스 로그인이 재정의되지 않은 사람.
--   local·override·fixture 계정은 실학생 값을 받지 않는다(182 사진과 같은 원칙, override·fixture 까지 확장).
-- 교과 행이 있는데 5행·5코드가 아니면(부분·중복·NULL) 그 학생은 행을 내지 않는다 — 부분 합을 전체 점수로 보이지 않는다.
-- 두 원천 모두 없으면 행 없음. 한쪽이라도 있으면 5개 축 전부(없는 축 0).
-- 점조회 전용(WHERE student_uid = $1). CTE 를 쓰지 않는다(두 번 참조되면 물질화되어 전원을 계산한다).
CREATE VIEW dc.student_core_competency_combined AS
SELECT u.intg_uid AS student_uid, m.code AS competency_code,
       a.score AS academic_score, p.score AS program_score,
       COALESCE(a.score, 0) + COALESCE(p.score, 0) AS score
FROM academic.dc_v_usr_inf u
CROSS JOIN LATERAL (SELECT count(*) AS n, count(DISTINCT c.competency_code) AS codes
                    FROM dc.academic_student_core_competency c WHERE c.student_uid = u.intg_uid) av
CROSS JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM eco.roadmap_application_skill_point q
                                   WHERE q.student_id = u.intg_uid) AS has) pv
CROSS JOIN (VALUES (1::smallint, 'LOCAL_LEADER'), (2::smallint, 'CREATIVE'), (3::smallint, 'CONVERGENCE'),
                   (4::smallint, 'COMMUNICATION'), (5::smallint, 'GLOBAL')) m(essential, code)
JOIN dc.core_competency k ON k.code = m.code
LEFT JOIN LATERAL (SELECT c.score FROM dc.academic_student_core_competency c
                   WHERE c.student_uid = u.intg_uid AND c.competency_code = m.code) a ON true
LEFT JOIN LATERAL (SELECT sum(q.point) AS score FROM eco.roadmap_application_skill_point q
                   WHERE q.student_id = u.intg_uid AND q.essential = m.essential) p ON true
WHERE u.user_ty_cd = '0001'
  AND NOT EXISTS (SELECT 1 FROM dc.student_login_override o WHERE o.intg_uid = u.intg_uid)
  AND NOT EXISTS (SELECT 1 FROM dc.fixture_student_login f WHERE f.student_uid = u.intg_uid)
  AND (av.n > 0 OR pv.has)
  AND (av.n = 0 OR (av.n = 5 AND av.codes = 5));
COMMENT ON VIEW dc.student_core_competency_combined IS
 'Core competency raw score = academic CORE (180 view) + vendor program points. Point lookup by student_uid only. API must apply student access scope.';
-- security_invoker 는 켜지 않는다 — 소유자 권한으로 academic·eco 를 읽는다(dc_app 은 두 스키마 권한 없음, 176·180).
REVOKE ALL ON dc.student_core_competency_combined FROM PUBLIC;
GRANT SELECT ON dc.student_core_competency_combined TO dc_app;
