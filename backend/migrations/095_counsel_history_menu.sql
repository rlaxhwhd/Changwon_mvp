-- Additive menu data migration. Keep existing counsel.0 through counsel.7 identities.
-- Rollback: disable counsel.8 in a new migration; restore existing sort_order to its code suffix.
UPDATE dc.menu SET sort_order=sort_order+1
WHERE menu_code IN ('counsel.2','counsel.3','counsel.4','counsel.5','counsel.6','counsel.7');
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('counsel.8','counsel','admin','상담기록','/counsel/records',2);
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('counsel.8','career'),('counsel.8','psych');
