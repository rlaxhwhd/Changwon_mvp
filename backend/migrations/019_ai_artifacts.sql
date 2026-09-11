-- AI 산출물 — LLM 호출로만 생기는 코멘트·분석 결과를 사람이 쓴 데이터와 갈라 둔다.
--
-- 이름을 ai_ 로 시작하는 것이 경계다. 이 접두사가 붙은 행은 전부
--   (1) 사람이 입력한 것이 아니고
--   (2) 재호출하면 다시 만들 수 있으며
--   (3) 어느 호출에서 나왔는지(ai_run)를 반드시 갖는다.
-- 상담사 코멘트(dc.counsel_record.comment)나 학생 입력과 절대 섞지 않는다.
--
-- 이력은 append-only 다(CLAUDE.md 규칙 11). AI 응답은 사후에 고치는 값이 아니라
-- 그때 그 모델이 그렇게 답했다는 사실이므로, 수정하지 않고 새 run 을 쌓는다.
--
-- 산출물의 모양은 세 가지뿐이라 테이블도 셋이다 — 종류마다 테이블을 늘리면
-- 화면이 늘 때마다 스키마가 늘어난다.
--   서술형 1건  → ai_comment     (진단 코멘트 · 학생 종합 인사이트)
--   목록형 N건  → ai_suggestion  (추천 질문 · GAP · 추천 프로그램 · 개선 제안)
--   점수형 N건  → ai_score       (자소서 항목 평가 · 강약점 지표)

INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order) VALUES
 ('AI_RUN_KIND','AI 호출 종류','STRUCTURAL',true,50);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('AI_RUN_KIND','STUDENT_ANALYSIS','학생 종합 분석',0),
 ('AI_RUN_KIND','COUNSEL_QUESTION','상담 추천 질문',1),
 ('AI_RUN_KIND','GAP_ANALYSIS','목표 대비 GAP 분석',2),
 ('AI_RUN_KIND','ACTIVITY_RECO','활동 추천',3),
 ('AI_RUN_KIND','DIAGNOSIS_COMMENT','진단 결과 해설',4),
 ('AI_RUN_KIND','RESUME_REVIEW','자기소개서 평가',5);

-- AI 호출 1건. 모든 산출물의 부모이며, 무엇을 근거로 언제 어느 모델이 답했는지를 남긴다.
-- 근거(subject)를 FK 로 걸지 않는 이유: 진단 결과·자소서·로드맵처럼 서로 다른 테이블을
-- 가리키고, 대상이 지워져도 "그때 이렇게 답했다"는 사실은 남아야 한다.
CREATE TABLE dc.ai_run(
  id           text PRIMARY KEY,
  -- 코드 그룹을 생성열로 박아 복합 FK 로 고정한다(018 program_category_fk 와 같은 규약).
  kind_group   text GENERATED ALWAYS AS ('AI_RUN_KIND') STORED,
  kind_code    text NOT NULL,
  student_uid  text NOT NULL REFERENCES dc.student(intg_uid),
  subject_kind text,
  subject_id   text,
  model        text NOT NULL,
  requested_by text REFERENCES dc.person(intg_uid),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_run_kind_fk FOREIGN KEY(kind_group,kind_code) REFERENCES dc.code_item(group_code,code),
  CONSTRAINT ai_run_subject_pair CHECK((subject_kind IS NULL)=(subject_id IS NULL))
);
CREATE INDEX ai_run_student ON dc.ai_run(student_uid,kind_code,created_at DESC);
CREATE INDEX ai_run_subject ON dc.ai_run(subject_kind,subject_id) WHERE subject_id IS NOT NULL;

-- 서술형 1건 — 호출 하나에 본문 하나다.
CREATE TABLE dc.ai_comment(
  run_id  text PRIMARY KEY REFERENCES dc.ai_run(id) ON DELETE CASCADE,
  body    text NOT NULL,
  CONSTRAINT ai_comment_body_not_blank CHECK(btrim(body)<>'')
);

-- 목록형 N건 — category 로 같은 호출 안의 갈래를 나눈다(programs·activities·certs 처럼).
CREATE TABLE dc.ai_suggestion(
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id    text NOT NULL REFERENCES dc.ai_run(id) ON DELETE CASCADE,
  position  integer NOT NULL,
  category  text,
  title     text NOT NULL,
  detail    text,
  meta      jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(run_id,position),
  CONSTRAINT ai_suggestion_title_not_blank CHECK(btrim(title)<>'')
);

-- 점수형 N건 — 라벨 하나에 점수 하나, 코멘트는 선택.
CREATE TABLE dc.ai_score(
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id    text NOT NULL REFERENCES dc.ai_run(id) ON DELETE CASCADE,
  position  integer NOT NULL,
  label     text NOT NULL,
  score     numeric(6,2) NOT NULL,
  comment   text,
  UNIQUE(run_id,position)
);

-- append-only: AI 응답은 그때의 사실이므로 고치지 않고 새 run 을 쌓는다.
CREATE TRIGGER ai_run_immutable BEFORE UPDATE OR DELETE ON dc.ai_run
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER ai_comment_immutable BEFORE UPDATE OR DELETE ON dc.ai_comment
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER ai_suggestion_immutable BEFORE UPDATE OR DELETE ON dc.ai_suggestion
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER ai_score_immutable BEFORE UPDATE OR DELETE ON dc.ai_score
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

GRANT SELECT,INSERT ON dc.ai_run,dc.ai_comment,dc.ai_suggestion,dc.ai_score TO dc_app;
