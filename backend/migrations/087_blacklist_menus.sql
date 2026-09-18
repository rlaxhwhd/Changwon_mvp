-- Data only. Restore old menu positions through a new migration if needed.
UPDATE dc.menu SET is_active=false,version=version+1 WHERE menu_code IN ('adm-roadmap','programs.3');
UPDATE dc.menu SET sort_order=sort_order-1,version=version+1
 WHERE menu_code IN ('adm-programs','adm-companies','adm-notices','system');
UPDATE dc.menu SET sort_order=9,version=version+1 WHERE menu_code='adm-quests';
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('adm-blacklists',NULL,'admin','블랙리스트 관리','/blacklists/programs',10),
 ('adm-blacklists.0','adm-blacklists','admin','비교과 블랙리스트','/blacklists/programs',0),
 ('adm-blacklists.1','adm-blacklists','admin','SMS 블랙리스트','/blacklists/sms',1);
INSERT INTO dc.menu_auth VALUES
 ('adm-blacklists','AUTH0006'),('adm-blacklists.0','AUTH0006'),('adm-blacklists.1','AUTH0006');
