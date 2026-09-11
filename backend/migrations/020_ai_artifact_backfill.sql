-- AI 산출물 backfill — 이미 갖고 있던 AI 결과를 ai_* 테이블로 옮긴다.
--
-- 지금까지 이 값들은 두 군데에 묻혀 있었다.
--   dc.student.detail          — 인사이트 · 추천 질문 · GAP · 활동 추천 · 강약점
--   dc.diagnosis_result.payload — 진단 결과 해설
-- 둘 다 "학생의 사실"과 "AI 가 답한 것"이 한 덩어리라, 어느 것이 재생성 가능한
-- 산출물인지 구분되지 않았다. 여기서 갈라 낸다. 원본은 지우지 않는다 —
-- 화면이 ai_* 를 읽도록 바뀐 뒤에 별도 마이그레이션으로 걷는다.
--
-- 이 파일은 두 번 실행된다: 마이그레이션으로 한 번(기존 DB 를 따라잡기 위해),
-- 그리고 신규 DB 에서는 seed 직후 한 번 더(마이그레이션 시점엔 학생이 아직 없다).
-- 그래서 모든 INSERT 가 ON CONFLICT DO NOTHING 이다 — 두 번 돌아도 결과가 같다.
--
-- model='fixture' 는 정직한 값이다. 이 행들은 실제 LLM 이 만든 것이 아니라
-- 시안 단계에서 사람이 적어 둔 것이며, 진짜 호출이 붙으면 그때 모델명이 들어간다.
-- 이 값으로 "아직 AI 를 부른 적 없는 행"을 언제든 골라낼 수 있다.

-- 1) 학생 종합 인사이트 (서술형 1건)
INSERT INTO dc.ai_run(id,kind_code,student_uid,model)
SELECT 'ai_insight_'||intg_uid,'STUDENT_ANALYSIS',intg_uid,'fixture'
  FROM dc.student WHERE detail ? 'insight' AND btrim(detail->>'insight')<>''
 ON CONFLICT DO NOTHING;
INSERT INTO dc.ai_comment(run_id,body)
SELECT 'ai_insight_'||intg_uid, detail->>'insight'
  FROM dc.student WHERE detail ? 'insight' AND btrim(detail->>'insight')<>''
 ON CONFLICT DO NOTHING;

-- 1-1) 강약점 지표 (점수형) — 같은 종합 분석 호출에 딸린다.
INSERT INTO dc.ai_score(run_id,position,label,score,comment)
SELECT 'ai_insight_'||s.intg_uid, e.ord::int, e.item->>'label', (e.item->>'value')::numeric,
       CASE e.item->>'type' WHEN 'strength' THEN '강점' WHEN 'weakness' THEN '보완' END
  FROM dc.student s,
       LATERAL jsonb_array_elements(s.detail->'strengthWeakness') WITH ORDINALITY AS e(item,ord)
 WHERE s.detail ? 'insight' AND s.detail ? 'strengthWeakness'
 ON CONFLICT DO NOTHING;

-- 2) 상담사 추천 질문 (목록형)
INSERT INTO dc.ai_run(id,kind_code,student_uid,model)
SELECT 'ai_question_'||intg_uid,'COUNSEL_QUESTION',intg_uid,'fixture'
  FROM dc.student WHERE jsonb_array_length(COALESCE(detail->'counselorQuestions','[]'::jsonb))>0
 ON CONFLICT DO NOTHING;
INSERT INTO dc.ai_suggestion(run_id,position,category,title)
SELECT 'ai_question_'||s.intg_uid, e.ord::int, 'question', e.item#>>'{}'
  FROM dc.student s,
       LATERAL jsonb_array_elements(s.detail->'counselorQuestions') WITH ORDINALITY AS e(item,ord)
 WHERE jsonb_array_length(COALESCE(s.detail->'counselorQuestions','[]'::jsonb))>0
 ON CONFLICT DO NOTHING;

-- 3) 목표 대비 GAP 분석 (목록형) — 수치·심각도는 meta 로 함께 남긴다.
INSERT INTO dc.ai_run(id,kind_code,student_uid,model)
SELECT 'ai_gap_'||intg_uid,'GAP_ANALYSIS',intg_uid,'fixture'
  FROM dc.student WHERE jsonb_array_length(COALESCE(detail->'gapItems','[]'::jsonb))>0
 ON CONFLICT DO NOTHING;
INSERT INTO dc.ai_suggestion(run_id,position,category,title,detail,meta)
SELECT 'ai_gap_'||s.intg_uid, e.ord::int, e.item->>'severity', e.item->>'title', e.item->>'desc',
       jsonb_strip_nulls(jsonb_build_object(
         'pct', e.item->'pct', 'current', e.item->'current',
         'target', e.item->'target', 'badges', e.item->'badges'))
  FROM dc.student s,
       LATERAL jsonb_array_elements(s.detail->'gapItems') WITH ORDINALITY AS e(item,ord)
 WHERE jsonb_array_length(COALESCE(s.detail->'gapItems','[]'::jsonb))>0
 ON CONFLICT DO NOTHING;

-- 4) 활동 추천 (목록형) — programs·activities·certs 세 갈래가 한 호출에서 나온다.
INSERT INTO dc.ai_run(id,kind_code,student_uid,model)
SELECT 'ai_reco_'||intg_uid,'ACTIVITY_RECO',intg_uid,'fixture'
  FROM dc.student WHERE detail ? 'recommendations'
 ON CONFLICT DO NOTHING;
INSERT INTO dc.ai_suggestion(run_id,position,category,title,detail,meta)
SELECT run_id, row_number() OVER (PARTITION BY run_id ORDER BY cat_order, ord)::int,
       category, title, reason, meta
  FROM (
    SELECT 'ai_reco_'||s.intg_uid AS run_id, c.category,
           CASE c.category WHEN 'programs' THEN 0 WHEN 'activities' THEN 1 ELSE 2 END AS cat_order,
           e.ord, e.item->>'title' AS title, e.item->>'reason' AS reason,
           jsonb_strip_nulls(jsonb_build_object('tag', e.item->'tag')) AS meta
      FROM dc.student s
      CROSS JOIN LATERAL (VALUES ('programs'),('activities'),('certs')) AS c(category)
      CROSS JOIN LATERAL jsonb_array_elements(
             COALESCE(s.detail->'recommendations'->c.category,'[]'::jsonb)) WITH ORDINALITY AS e(item,ord)
     WHERE s.detail ? 'recommendations'
  ) x
 ON CONFLICT DO NOTHING;

-- 5) 진단 결과 해설 (서술형 1건) — 검사·회차마다 한 호출이다.
INSERT INTO dc.ai_run(id,kind_code,student_uid,subject_kind,subject_id,model,created_at)
SELECT 'ai_diag_'||student_uid||'_'||test_id||'_'||attempt_no,'DIAGNOSIS_COMMENT',student_uid,
       'DIAGNOSIS_RESULT', test_id||':'||attempt_no,'fixture',
       COALESCE(tested_at::timestamptz,now())
  FROM dc.diagnosis_result WHERE btrim(COALESCE(payload->>'comment',''))<>''
 ON CONFLICT DO NOTHING;
INSERT INTO dc.ai_comment(run_id,body)
SELECT 'ai_diag_'||student_uid||'_'||test_id||'_'||attempt_no, payload->>'comment'
  FROM dc.diagnosis_result WHERE btrim(COALESCE(payload->>'comment',''))<>''
 ON CONFLICT DO NOTHING;
