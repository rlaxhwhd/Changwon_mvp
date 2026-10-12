-- Additive history entry; preserve all existing menu indices and permissions.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('stu-mypage.4','stu-mypage','student','나의 활동 기록','/records',4);
INSERT INTO dc.menu_auth(menu_code,role_code)
SELECT 'stu-mypage.4',role_code FROM dc.menu_auth WHERE menu_code='stu-mypage';
