-- 자기소개서 AI 평가 — 화면(src_v2/pages/jobs/AiConsulting.tsx)이 MOCK_EVALUATION 상수
-- 하나를 모든 학생·모든 자소서에 그대로 보여 주고 있었다. 누가 무엇을 써 내도 점수가 82점이다.
--
-- 자소서 본문은 아직 DB 에 없다(채용 도메인 미이관 — DB.md §8-3 2번). 그래서
-- subject 를 FK 로 걸지 않고 (kind,id) 쌍으로만 가리킨다 — ai_run 이 처음부터
-- 그렇게 설계돼 있다. 채용 도메인이 들어오면 이 포인터가 실제 행을 가리키게 된다.
--
-- ★ 이 파일은 대상 학생이 있을 때만 행을 만든다. 신규 DB 에서는 마이그레이션이
--   시드보다 먼저 돌아 학생이 아직 없으므로 0건이 되고, seed.py 가 시드 직후
--   같은 파일을 다시 실행해 채운다(013_organization_seed.sql 과 같은 방식).
--   그래서 모든 INSERT 가 존재 검사 + ON CONFLICT DO NOTHING 이다.
--
-- 아래 점수·코멘트는 사람이 적은 시연용이다(model='fixture'). 실제 LLM 호출이
-- 붙으면 새 run 으로 쌓이고, 이 행들은 'fixture' 로 골라내 걷을 수 있다.

INSERT INTO dc.ai_run(id,kind_code,student_uid,subject_kind,subject_id,model)
SELECT v.id,'RESUME_REVIEW',v.student_uid,'RESUME',v.subject_id,'fixture'
  FROM (VALUES
    ('ai_resume_20211304_r1','20211304','r1'),
    ('ai_resume_20196208_r2','20196208','r2')
  ) AS v(id,student_uid,subject_id)
 WHERE EXISTS(SELECT 1 FROM dc.student s WHERE s.intg_uid=v.student_uid)
 ON CONFLICT DO NOTHING;

-- 항목별 점수 — 총점은 저장하지 않는다. 항목 평균이 총점이므로 두 벌로 두면 어긋난다.
INSERT INTO dc.ai_score(run_id,position,label,score,comment)
SELECT v.run_id,v.position,v.label,v.score,v.comment
  FROM (VALUES
    ('ai_resume_20211304_r1',1,'논리적 구성',84,'지원동기에서 목표 직무(IT PM)까지 흐름이 끊기지 않습니다.'),
    ('ai_resume_20211304_r1',2,'직무 연관성',62,'프로젝트 경험 서술이 없어 PM 직무와의 연결이 약합니다. 캡스톤을 산출물 중심으로 보강하세요.'),
    ('ai_resume_20211304_r1',3,'차별화 포인트',66,'SQLD 보유는 강점이나 지원자 다수가 갖는 자격이라 단독으로는 변별력이 낮습니다.'),
    ('ai_resume_20211304_r1',4,'구체성',58,'"열정" "노력" 같은 서술이 반복되고 수치가 없습니다. 규모·기간·본인 기여율을 넣으세요.'),
    ('ai_resume_20211304_r1',5,'진정성',80,'게임 산업에 관심을 갖게 된 경험이 본인 이야기로 서술돼 있습니다.'),
    ('ai_resume_20196208_r2',1,'논리적 구성',88,'문항별 두괄식 구성이 일관됩니다.'),
    ('ai_resume_20196208_r2',2,'직무 연관성',86,'공모전 2회와 마케팅 인턴 경험이 지원 직무와 정확히 맞물립니다.'),
    ('ai_resume_20196208_r2',3,'차별화 포인트',82,'GAIQ 보유와 퍼포먼스 마케팅 경험 조합이 지원자군에서 드뭅니다.'),
    ('ai_resume_20196208_r2',4,'구체성',74,'성과를 "매출 증가"로만 적었습니다. 증가율·기간·비교 기준을 넣으세요.'),
    ('ai_resume_20196208_r2',5,'진정성',85,'브랜드에 대한 관점이 본인 소비 경험에서 출발해 설득력이 있습니다.')
  ) AS v(run_id,position,label,score,comment)
 WHERE EXISTS(SELECT 1 FROM dc.ai_run r WHERE r.id=v.run_id)
 ON CONFLICT DO NOTHING;

-- 개선 제안 (목록형)
INSERT INTO dc.ai_suggestion(run_id,position,category,title,detail)
SELECT v.run_id,v.position,'improvement',v.title,v.detail
  FROM (VALUES
    ('ai_resume_20211304_r1',1,'프로젝트 경험을 최우선으로 채우세요',
     '현재 자소서에서 가장 큰 결손입니다. 2학기 캡스톤을 PM 산출물(일정표·요구사항 정의서)로 남기면 문항 2개를 새로 쓸 수 있습니다.'),
    ('ai_resume_20211304_r1',2,'성과를 수치로 바꾸세요',
     '"팀에 기여했다"를 "4인 팀에서 API 12개 중 7개 담당, 응답시간 400ms→180ms"처럼 바꿉니다.'),
    ('ai_resume_20211304_r1',3,'어학 점수 계획을 문장에 넣지 마세요',
     'TOEIC 550은 지원 기준(700) 미달입니다. 취득 후 기재하고, 그 전에는 자소서에서 언급하지 않는 편이 낫습니다.'),
    ('ai_resume_20196208_r2',1,'수치를 붙여 구체성을 올리세요',
     '유일하게 80점 아래인 항목입니다. 공모전 성과와 인턴 기여를 증가율·기간으로 환산해 적으세요.'),
    ('ai_resume_20196208_r2',2,'데이터 역량을 한 문장 추가하세요',
     '퍼포먼스 마케팅 직무에서 GA·SQL 언급은 서류 통과율에 직접 영향을 줍니다. GAIQ 보유를 활용 사례와 함께 적으세요.'),
    ('ai_resume_20196208_r2',3,'입사 후 목표를 마지막 문단에 넣으세요',
     '지원 동기는 충분하나 입사 후 3년 계획이 비어 있습니다. 담당하고 싶은 브랜드·카테고리를 명시하면 마무리가 단단해집니다.')
  ) AS v(run_id,position,title,detail)
 WHERE EXISTS(SELECT 1 FROM dc.ai_run r WHERE r.id=v.run_id)
 ON CONFLICT DO NOTHING;
