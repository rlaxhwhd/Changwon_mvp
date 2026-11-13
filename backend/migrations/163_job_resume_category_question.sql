-- 자소서 분야(JOB_RESUME_CATEGORY)마다 DeepResume 에 보낼 문항 질문 문장(payload.question).
-- Deep 평가는 문항 title 을 "질문"으로 읽는다. 분야 이름("지원동기")만 보내면 평가가
-- "지원 직무가 '지원동기'로 모호하다"고 잘못 지적했다(2026-11-13 실평가). 질문 문장을 보내면 사라진다.
-- 이 그룹의 payload 는 관리자 화면에서 바꿀 수 없다(administration.save_item — 배포로 관리).
-- 질문이 없는 분야(나중에 추가된 코드)는 앱이 분야 이름으로 보낸다(deep.topic_fields).
--
-- 이미 Deep 에 올라간 자소서는 옛 제목("지원동기")을 들고 있다. deep_synced_version 을 비워
-- 다음 저장·AI 초안·평가 때 새 질문 문장으로 다시 맞추게 한다(본문·version 은 그대로).
-- 22개 분야 전부(022 시드)가 학생 화면 선택지다 — 하나라도 빠지면 그 분야는 같은 오지적이 남는다.
-- code_item_event 는 쓰지 않는다: changed_by NOT NULL(사람)인 관리자 변경 이력이고, 배포 갱신은
-- 040·070·109 처럼 이벤트 없이 version 만 올린다. code_revision 트리거가 metadata revision 을 올린다.
-- 부작용: 연결된 자소서는 다음 동기화 전까지 deepSynced=false·최근 평가 stale=true 로 보인다(1회성).
-- Runs inside migrate.py's single transaction. Small tables (22 codes, students × a few resumes).
-- Rollback: revert the app first; then
--   UPDATE dc.code_item SET payload=payload-'question',version=version+1,updated_at=now()
--    WHERE group_code='JOB_RESUME_CATEGORY' AND payload ? 'question';
--   UPDATE dc.job_resume SET deep_synced_version=NULL
--    WHERE deep_cover_id IS NOT NULL AND deep_synced_version IS NOT NULL AND deleted_at IS NULL;
--   (두 번째 문장이 있어야 Deep 쪽 제목이 다음 동기화 때 분야 이름으로 돌아간다.)

UPDATE dc.code_item c SET payload=c.payload||jsonb_build_object('question',q.question),
  version=c.version+1, updated_at=now()
FROM (VALUES
 ('MOTIVE','우리 회사와 해당 직무에 지원한 동기를 구체적으로 기술해 주십시오.'),
 ('GROWTH','본인의 성장 과정과 그 과정이 현재의 가치관에 준 영향을 기술해 주십시오.'),
 ('PERSONALITY','본인 성격의 장점과 단점을 사례와 함께 기술하고, 단점을 보완하려는 노력을 적어 주십시오.'),
 ('ACADEMIC','지원 직무와 관련해 학업 과정에서 쌓은 전문성을 구체적으로 기술해 주십시오.'),
 ('EXPERIENCE','지원 직무와 관련된 경험 및 경력을 본인의 역할과 성과 중심으로 기술해 주십시오.'),
 ('ASPIRATION','입사 후 이루고 싶은 목표와 이를 위한 계획을 기술해 주십시오.'),
 ('COMPETENCY','지원 직무에 필요한 역량은 무엇이며, 이를 갖추기 위해 어떤 노력을 했는지 기술해 주십시오.'),
 ('PROJECT','가장 의미 있었던 프로젝트 경험과 그 안에서 맡은 역할, 결과를 기술해 주십시오.'),
 ('TEAMWORK','팀과 함께 목표를 이룬 경험과 그 과정에서 본인이 기여한 바를 기술해 주십시오.'),
 ('LEADERSHIP','리더십을 발휘해 구성원을 이끈 경험과 그 결과를 기술해 주십시오.'),
 ('PROBLEM','어려운 문제를 해결한 경험과 해결 과정에서 본인이 취한 방법을 기술해 주십시오.'),
 ('CONFLICT','다른 사람과의 갈등을 조정하거나 해결한 경험과 그 과정에서 배운 점을 기술해 주십시오.'),
 ('CHALLENGE','어려운 목표에 도전한 경험과 그 과정에서 기울인 노력, 결과를 기술해 주십시오.'),
 ('FAILURE','실패를 경험한 사례와 이를 극복한 과정, 그로부터 배운 점을 기술해 주십시오.'),
 ('CREATIVITY','창의적인 생각으로 새로운 방법을 시도한 경험과 그 결과를 기술해 주십시오.'),
 ('CUSTOMER','고객이나 상대방의 입장에서 생각하고 행동한 경험과 그 결과를 기술해 주십시오.'),
 ('DATA','데이터를 수집·분석해 문제를 해결하거나 의사결정에 활용한 경험을 기술해 주십시오.'),
 ('MAJOR_CHOICE','현재 전공을 선택한 이유와 전공 공부가 지원 직무에 어떻게 연결되는지 기술해 주십시오.'),
 ('COMPANY_CHOICE','회사를 선택할 때 중요하게 생각하는 기준과 그 이유를 기술해 주십시오.'),
 ('VALUES','사회공헌 활동 경험이나 본인이 중요하게 여기는 가치관을 기술해 주십시오.'),
 ('STRENGTH','본인의 가장 큰 강점과 이를 보여 주는 구체적인 사례를 기술해 주십시오.'),
 ('JOB_RELATED','지원 직무와 관련해 직접 수행한 경험과 그 경험에서 얻은 역량을 기술해 주십시오.')
) AS q(code,question)
WHERE c.group_code='JOB_RESUME_CATEGORY' AND c.code=q.code;

UPDATE dc.job_resume SET deep_synced_version=NULL
WHERE deep_cover_id IS NOT NULL AND deep_synced_version IS NOT NULL AND deleted_at IS NULL;
