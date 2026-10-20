-- 2026-10-20 사용자 재확정: 학기는 코드관리 → 학기 운영 일정(QUEST_SEMESTER)에 연도별 기간으로 등록한다
-- (예: 2026학년도 1학기 2026-03-01~2026-08-15, 2학기 2026-08-16~2027-02-28). 131의 월/일 반복 학기(QUEST_TERM)를 대체한다.
-- QUEST_TERM 은 어떤 테이블도 참조하지 않으며 설정 변경 이력은 admin_event(entity=quest_term)에 남아 있다.
DELETE FROM dc.code_item WHERE group_code = 'QUEST_TERM';
DELETE FROM dc.code_group WHERE group_code = 'QUEST_TERM';
