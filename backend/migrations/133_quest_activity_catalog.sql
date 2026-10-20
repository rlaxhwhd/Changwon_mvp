-- 2026-10-20 사용자 확정: 시스템이 판정할 수 있는 활동을 모두 퀘스트 풀에서 고를 수 있게 한다.
-- 관리자는 상위 그룹 → 세부 판정 기준을 고르고 횟수·XP만 입력한다. 판정 쿼리는 서버(quest_management.ACTIVITIES)가 소유한다.
-- 심리상담은 퀘스트 판정 대상에서 제외한다 — 기존 COUNSEL(상담 완료)도 이제 심리상담을 세지 않는다.
ALTER TABLE dc.quest_definition DROP CONSTRAINT quest_definition_activity_check;
ALTER TABLE dc.quest_definition ADD CONSTRAINT quest_definition_activity_check CHECK (activity IN (
  'ATTENDANCE','DIAGNOSIS','COUNSEL','COUNSEL_CAREER','COUNSEL_PROF','GROUP_COUNSEL','ROADMAP_ITEM',
  'PROGRAM','CERTIFICATE','GROWTH_RECORD','GROWTH_JOURNAL','GROWTH_PROJECT',
  'MISSION_TOEIC','MISSION_NCS_GSAT','RESUME_WRITE','AI_RESUME','JOB_APPLY'));
