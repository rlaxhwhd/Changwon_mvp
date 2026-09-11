-- 후속진단 점수 채우기 — 결과표가 「미등록」으로만 보이던 것을 고친다.
--
-- 두 가지가 어긋나 있었다.
--   ① 이름 불일치 — dc.diagnosis_factor_definition 의 C3 라벨은 「진로몰입 수준」인데
--      결과 payload 는 「진로몰입」이었다. 화면(getResultRows)은 정의표 행을 세우고
--      점수를 **이름으로** join 하므로, 한 글자만 달라도 전 행이 미등록이 된다.
--   ② 요인 수 부족 — C3 정의는 5요인인데 결과에는 4개뿐이라 「고용적합성 수준」은
--      점수 자체가 없었다.
--   ③ 김창원(T4)은 후속진단이 C4 인데 응시·결과가 아예 없었다.
--
-- ⚠ factorCode 를 넣지 않는다. 프론트 모듈 정의(careerProcess.DIAGNOSIS_MODULES)에는
--   code 가 없고, scoreOf 가 `factorCode ?? name` 을 키로 쓴다. 코드를 넣으면 이름
--   조회가 오히려 실패한다. 이름을 정의표 라벨과 정확히 일치시키는 것이 유일한 열쇠다.
--
-- ⚠ level 을 함께 저장한다. c2·c3·c4 는 화면이 T점수에서 수준을 파생하지 않고
--   payload 의 level 을 그대로 쓴다(없으면 「미등록」). 값은 T점수 밴드와 같게 둔다 —
--   40 미만 낮음 / 40~60 보통 / 60 이상 높음(schema/diagnosisResult.ts).
--
-- ★ 이 점수는 사람이 적은 시연용이다. 실제 채점 엔진이 붙으면 그 결과로 대체된다.
--   판정식이 미확정이므로 여기서 계산하지 않는다(CLAUDE.md 14조) — 값을 적어 둘 뿐이다.
--
-- 이 파일은 두 번 실행된다: 마이그레이션으로 한 번, 신규 DB 에서는 seed 직후 한 번 더
-- (마이그레이션 시점엔 학생·결과가 아직 없다). 그래서 전부 멱등이다.

-- ① 김채원 C3 — 정의표 라벨로 이름을 맞추고, 빠진 「고용적합성 수준」을 더한다.
--    기존 4개의 T점수는 그대로 보존한다. 코멘트가 「네트워킹이 가장 낮다」고 말하므로
--    새로 넣는 고용적합성은 그보다 높게 둔다 — 결과표와 코멘트가 어긋나면 안 된다.
UPDATE dc.diagnosis_result SET payload = jsonb_set(payload, '{factors}', '[
  {"name":"진로몰입 수준",     "tScore":59.68, "level":"보통"},
  {"name":"네트워킹 활용능력", "tScore":41.30, "level":"보통"},
  {"name":"문제해결능력",      "tScore":46.06, "level":"보통"},
  {"name":"대인상호작용능력",  "tScore":48.20, "level":"보통"},
  {"name":"고용적합성 수준",   "tScore":42.10, "level":"보통"}
]'::jsonb)
 WHERE student_uid='20211304' AND test_id='c3'
   AND NOT (payload->'factors' @> '[{"name":"고용적합성 수준"}]'::jsonb);

-- ② 김창원 C4 — 응시 기록과 결과를 만든다. T4(취업준비형)의 후속진단이다.
--    프로필과 어긋나지 않게 둔다: 공모전 2회·인턴 1회로 브랜딩은 강하고,
--    모의면접 1회뿐이라 면접 표현력이 최대 약점이며, 데이터분석이 보강 대상이다.
INSERT INTO dc.diagnosis_attempt(id,student_uid,test_id,attempt_no,status_code,started_at,completed_at,payload,source)
SELECT 'da_changwon_c4_1','20196208','c4',1,'DONE','2026-04-17 00:00:00+00','2026-04-17 00:00:00+00',
       jsonb_build_object('studentName',p.name,'studentNo',s.student_no,'studentMajor',s.major_label,
                          'studentGrade',s.grade,'resultSummary','Employability branding'),
       'fixture'
  FROM dc.student s JOIN dc.person p ON p.intg_uid=s.intg_uid
 WHERE s.intg_uid='20196208'
 ON CONFLICT DO NOTHING;

INSERT INTO dc.diagnosis_result(student_uid,test_id,attempt_no,tested_at,payload,source)
SELECT '20196208','c4',1,'2026-04-17 00:00:00+00', jsonb_build_object(
  'testId','c4','studentId','changwon','attemptNo',1,'testedAt','2026-04-17',
  'headline','Employability branding','headlineCaption','강점 요인',
  'comment','취업 브랜딩은 또래보다 뚜렷하게 앞서 있습니다. 공모전과 인턴 경험을 직무 언어로 정리해 둔 것이 강점으로 나타났습니다. 반면 면접 표현력이 가장 낮게 나왔는데, 준비된 내용을 말로 옮기는 연습이 부족한 것으로 보입니다. PT·토론 모의면접을 반복하고, 데이터 해석 근거를 답변에 넣으면 취업 준비도가 함께 올라갑니다.',
  'factors', '[
    {"name":"Research & Analysis",            "tScore":46.80, "level":"보통"},
    {"name":"Employability branding",         "tScore":61.40, "level":"높음"},
    {"name":"Articulation for interview",     "tScore":38.50, "level":"낮음"},
    {"name":"Design of Employment Strategy",  "tScore":55.20, "level":"보통"}
  ]'::jsonb), 'fixture'
 WHERE EXISTS(SELECT 1 FROM dc.student WHERE intg_uid='20196208')
 ON CONFLICT DO NOTHING;

-- ③ AI 코멘트도 ai_* 로 갈라 둔다(020 과 같은 규약). 진단 해설은 LLM 산출물이다.
INSERT INTO dc.ai_run(id,kind_code,student_uid,subject_kind,subject_id,model,created_at)
SELECT 'ai_diag_20196208_c4_1','DIAGNOSIS_COMMENT','20196208','DIAGNOSIS_RESULT','c4:1','fixture','2026-04-17 00:00:00+00'
 WHERE EXISTS(SELECT 1 FROM dc.diagnosis_result WHERE student_uid='20196208' AND test_id='c4')
 ON CONFLICT DO NOTHING;
INSERT INTO dc.ai_comment(run_id,body)
SELECT 'ai_diag_20196208_c4_1', payload->>'comment'
  FROM dc.diagnosis_result WHERE student_uid='20196208' AND test_id='c4'
 ON CONFLICT DO NOTHING;
