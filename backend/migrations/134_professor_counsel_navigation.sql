-- Move professor settings into counseling. No counseling history is removed.
-- Rollback: restore the previous menu labels/routes/active flags in a new migration,
-- together with the previous frontend. Preserve menu permissions and records.
UPDATE dc.menu SET label='상담관리',version=version+1 WHERE menu_code='prof-counsel';
UPDATE dc.menu SET label='신청접수',version=version+1 WHERE menu_code='prof-counsel.0';
UPDATE dc.menu SET label='오프라인 상담현황',route='/professor/counsel/offline',sort_order=1,version=version+1
 WHERE menu_code='prof-counsel.1';
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('prof-counsel.2','prof-counsel','admin','온라인 상담현황','/professor/counsel/online',2),
 ('prof-counsel.3','prof-counsel','admin','상담실적','/professor/counsel/stats',3),
 ('prof-counsel.4','prof-counsel','admin','상담 설정','/professor/counsel/settings',4);
INSERT INTO dc.menu_auth(menu_code,role_code)
 SELECT new_menu,role_code FROM dc.menu_auth
 CROSS JOIN (VALUES ('prof-counsel.2'),('prof-counsel.3'),('prof-counsel.4')) x(new_menu)
 WHERE menu_code='prof-counsel.0' ON CONFLICT DO NOTHING;
UPDATE dc.menu SET is_active=false,version=version+1 WHERE menu_code IN ('prof-setup','prof-setup.0','prof-setup.1');
