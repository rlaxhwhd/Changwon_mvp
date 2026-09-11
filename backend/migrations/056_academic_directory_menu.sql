-- Forward-only menu data migration, separate from directory schema.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('adm-members.1','adm-members','admin','학사 인원·조직 조회','/members/academic',1);
INSERT INTO dc.menu_auth VALUES('adm-members.1','AUTH0006');
