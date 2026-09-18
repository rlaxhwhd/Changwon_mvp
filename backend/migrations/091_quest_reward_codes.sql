-- Operational XP values, not student accomplishments. Prior grants retain their snapshots.
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order)
VALUES('QUEST_XP_REWARD','퀘스트 · XP 보상','OPERATIONAL',true,96);
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order)
VALUES('QUEST_SEMESTER','퀘스트 · 학기 운영 일정','OPERATIONAL',false,97);
INSERT INTO dc.code_item(group_code,code,label,sort_order,payload) VALUES
('QUEST_XP_REWARD','DAILY','일일 퀘스트',0,'{"xp":50,"quota":3,"cyclesPerSemester":80}'),
('QUEST_XP_REWARD','MONTHLY','월간 퀘스트',1,'{"xp":300,"quota":4,"cyclesPerSemester":4}'),
('QUEST_XP_REWARD','SEMESTER','학기 퀘스트',2,'{"xp":1000,"quota":3,"cyclesPerSemester":1}');
