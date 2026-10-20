-- 2026-10-20 사용자 확정: 성장 레벨을 학기(0~12.5) · 학년(0~25, 학년마다 초기화) · 누적(최대 100)으로 나눈다.
-- 1 LV = 1,000 XP. 고학년 신규 가입자에게 레벨을 지급하지 않는다 — 각 학년은 0 LV에서 시작한다.
-- 지급 시점의 학년과 학기 코드를 원장에 남겨, 학기·학년 레벨을 원장 합계로 파생한다(계정 누계는 그대로 누적 XP).
ALTER TABLE dc.growth_xp_event
  ADD COLUMN grade smallint CHECK (grade > 0),
  ADD COLUMN semester_code text;

COMMENT ON COLUMN dc.growth_xp_event.grade IS '지급 시점 학년 — 학년 성장 레벨(0~25) 합계 기준';
COMMENT ON COLUMN dc.growth_xp_event.semester_code IS '지급일이 속한 QUEST_SEMESTER 코드 — 학기 성장 레벨(0~12.5) 합계 기준. 학기 밖 지급은 NULL';
COMMENT ON COLUMN dc.growth_xp_event.level_cap IS '130부터 지급 당시 학년 상한 레벨(25). 이전 행은 학년×25 누적 상한';

-- 기존 지급분: 학년은 현재 학년, 학기는 지급일을 포함하는 학기 일정으로 채운다(일정이 없으면 NULL).
UPDATE dc.growth_xp_event e SET grade = s.grade
  FROM dc.student s WHERE s.intg_uid = e.student_uid AND s.grade > 0;
UPDATE dc.growth_xp_event e SET semester_code = (
  SELECT c.code FROM dc.code_item c WHERE c.group_code = 'QUEST_SEMESTER'
    AND c.payload->>'startDate' <= e.earned_on::text AND c.payload->>'endDate' >= e.earned_on::text
  ORDER BY c.is_active DESC, c.code LIMIT 1);

CREATE INDEX growth_xp_event_semester ON dc.growth_xp_event(student_uid, semester_code) INCLUDE (granted_xp);
CREATE INDEX growth_xp_event_grade ON dc.growth_xp_event(student_uid, grade) INCLUDE (granted_xp);

-- 학기 성장 보상 단계 — 장학금·주요 보상은 현재 학기 성장 레벨로 판정한다. 기준 XP는 사용자 확정값(명칭만 수정 가능).
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order)
VALUES('QUEST_SEMESTER_TIER','퀘스트 · 학기 성장 보상 단계','OPERATIONAL',true,98);
INSERT INTO dc.code_item(group_code,code,label,sort_order,payload) VALUES
('QUEST_SEMESTER_TIER','BASIC','기본 보상',0,'{"minXp":3000}'),
('QUEST_SEMESTER_TIER','GROWTH','성장 보상',1,'{"minXp":6000}'),
('QUEST_SEMESTER_TIER','EXCELLENT','우수 보상',2,'{"minXp":9000}'),
('QUEST_SEMESTER_TIER','TOP','최우수 보상',3,'{"minXp":11000}'),
('QUEST_SEMESTER_TIER','BEST','학기 최고 성취',4,'{"minXp":12500}');
