-- Data only. Existing TOEIC publications retain a 60% default; future edits snapshot it.
UPDATE dc.mission_week SET quest_pass_count=greatest(1,ceil(jsonb_array_length(items)*0.6)::integer)
 WHERE kind='TOEIC' AND jsonb_array_length(items)<=20;
UPDATE dc.mission_attempt SET quest_pass_count=greatest(1,ceil(jsonb_array_length(items)*0.6)::integer)
 WHERE kind='TOEIC' AND jsonb_array_length(items)<=20 AND submitted_at IS NULL;
UPDATE dc.code_item SET payload=jsonb_set(payload,'{quota}','2'),version=version+1
 WHERE group_code='QUEST_XP_REWARD' AND code='DAILY';
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
 VALUES('adm-quests.1','adm-quests','admin','퀘스트 관리','/quests/manage',1);
INSERT INTO dc.menu_auth VALUES('adm-quests.1','AUTH0006');
