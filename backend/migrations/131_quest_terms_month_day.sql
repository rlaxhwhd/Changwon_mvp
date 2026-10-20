-- 2026-10-20 사용자 확정: 학기는 연도 없이 1학기·2학기의 월/일 기간으로 정하고 매년 반복한다.
-- 시스템관리자가 /admin/quests/manage 학기 편성 탭에서 직접 설정한다. 날짜를 임의로 채우지 않는다 —
-- 설정 전에는 비활성이며, 그동안 학기 XP는 지급되지 않는다.
-- 연도별 학기(예: 2026-2)는 이 월/일에서 계산한다. 연도별 일정 코드 QUEST_SEMESTER 는 더 이상 XP·편성 기준이 아니다.
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order)
VALUES('QUEST_TERM','퀘스트 · 학기 기간(월/일, 매년 반복)','OPERATIONAL',true,97);
INSERT INTO dc.code_item(group_code,code,label,sort_order,is_active,payload) VALUES
('QUEST_TERM','FIRST','1학기',0,false,'{}'),
('QUEST_TERM','SECOND','2학기',1,false,'{}');
