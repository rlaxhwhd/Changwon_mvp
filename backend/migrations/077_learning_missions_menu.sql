-- Data only. Rollback via a new migration disabling these menus; retain attempts.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('adm-quests',NULL,'admin','퀘스트 관리','/quests/missions',85),
 ('adm-quests.0','adm-quests','admin','미션 관리','/quests/missions',0);
INSERT INTO dc.menu_auth VALUES ('adm-quests','AUTH0006'),('adm-quests.0','AUTH0006');
