-- New page for all career counselors; no student assignment predicate.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('diagnosis.manage','diagnosis','admin','진단 관리','/diagnosis/manage',1);
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('diagnosis.manage','career');
