-- Retain immutable process rules; move labels into the operational catalog.
DO $$
DECLARE definition text;
BEGIN
 definition := pg_get_viewdef('dc.student_list'::regclass,true);
 DROP VIEW dc.student_list;
 ALTER TABLE dc.student_type_code RENAME TO student_type_rule;
 CREATE VIEW dc.student_type_code AS SELECT r.code,c.label,r.tier,r.tier_label,
   r.follow_up_test,r.program_scope,r.payload || jsonb_build_object('label',c.label) AS payload
 FROM dc.student_type_rule r JOIN dc.code_item c ON c.group_code='STUDENT_TYPE' AND c.code=r.code;
 EXECUTE 'CREATE VIEW dc.student_list AS ' || definition;
END $$;
GRANT SELECT ON dc.student_type_code,dc.student_list TO dc_app;
