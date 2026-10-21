-- Professor GNB: drop the shared '설정' menu for professors only and add '마이홈' last.
-- Career/psych keep '설정'. No counseling data changes.
-- Rollback: in a new migration, re-grant settings/settings.0 to professor and deactivate prof-home,
-- together with the previous frontend.
DELETE FROM dc.menu_auth WHERE role_code='professor' AND menu_code IN ('settings','settings.0');
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
 VALUES('prof-home',NULL,'admin','마이홈','/professor/home',16);
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('prof-home','professor');
