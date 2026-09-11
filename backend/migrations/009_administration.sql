-- Operational metadata is maintained through audited administrator APIs.
CREATE TABLE dc.code_group (
 group_code text PRIMARY KEY, label text NOT NULL,
 managed_by text NOT NULL CHECK(managed_by IN ('STRUCTURAL','OPERATIONAL')),
 fixed_codes boolean NOT NULL DEFAULT false, legacy_group text,
 is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE dc.code_item (
 group_code text NOT NULL REFERENCES dc.code_group, code text NOT NULL,
 label text NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 200), legacy text,
 up_group_code text, up_code text, sort_order integer NOT NULL DEFAULT 0,
 is_active boolean NOT NULL DEFAULT true, payload jsonb NOT NULL DEFAULT '{}',
 version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text REFERENCES dc.person, PRIMARY KEY(group_code,code),
 CHECK((up_group_code IS NULL)=(up_code IS NULL)),
 CHECK(up_group_code IS NULL OR up_group_code<>group_code OR up_code<>code),
 FOREIGN KEY(up_group_code,up_code) REFERENCES dc.code_item(group_code,code)
);
CREATE TABLE dc.code_item_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_code text NOT NULL, code text NOT NULL,
 action text NOT NULL CHECK(action IN ('CREATE','UPDATE','DEACTIVATE','REACTIVATE')),
 before jsonb, after jsonb NOT NULL, reason text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(), changed_by text NOT NULL REFERENCES dc.person,
 FOREIGN KEY(group_code,code) REFERENCES dc.code_item(group_code,code)
);
CREATE TRIGGER code_item_event_immutable BEFORE UPDATE OR DELETE ON dc.code_item_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TABLE dc.metadata_revision (id boolean PRIMARY KEY DEFAULT true CHECK(id), revision bigint NOT NULL DEFAULT 1);
INSERT INTO dc.metadata_revision DEFAULT VALUES;
CREATE FUNCTION dc.bump_metadata_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN UPDATE dc.metadata_revision SET revision=revision+1; RETURN NULL; END $$;
CREATE TRIGGER code_revision AFTER INSERT OR UPDATE ON dc.code_item FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();

CREATE TABLE dc.auth_role (role_code text PRIMARY KEY,label text NOT NULL,is_active boolean NOT NULL DEFAULT true);
INSERT INTO dc.auth_role VALUES ('AUTH0006','슈퍼관리자',true);
CREATE TABLE dc.auth_user (
 person_uid text REFERENCES dc.person,role_code text REFERENCES dc.auth_role,
 valid_from timestamptz NOT NULL DEFAULT now(),valid_to timestamptz,
 PRIMARY KEY(person_uid,role_code), CHECK(valid_to IS NULL OR valid_to>valid_from)
);
-- Deliberate, isolated development identity; never promote an existing counselor.
INSERT INTO dc.person(intg_uid,alias,name,kind,source,profile)
 VALUES('local:system-admin','system-admin','개발 시스템관리자','STAFF','local',
 '{"role":"admin","roleLabel":"시스템관리자","dept":"개발 운영"}');
INSERT INTO dc.staff(intg_uid,role_code,profile)
 VALUES('local:system-admin','admin','{"role":"admin","roleLabel":"시스템관리자","dept":"개발 운영"}');
INSERT INTO dc.auth_user(person_uid,role_code) VALUES('local:system-admin','AUTH0006');

CREATE TABLE dc.org_assignment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),staff_uid text NOT NULL REFERENCES dc.staff,
 college_code text NOT NULL,dept_code text NOT NULL,
 role_code text NOT NULL CHECK(role_code IN ('assistant','professor','counselor')),
 valid_from date NOT NULL,valid_to date,is_active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now(),updated_by text REFERENCES dc.person,
 FOREIGN KEY(college_code,dept_code) REFERENCES dc.department,
 CHECK(valid_to IS NULL OR valid_to>=valid_from),
 UNIQUE(staff_uid,college_code,dept_code,role_code,valid_from)
);
ALTER TABLE dc.staff_student_scope RENAME TO fixture_student_scope;
-- Fixtures remain explicit development grants, separate from organization assignments.
CREATE VIEW dc.staff_student_scope AS
 SELECT staff_uid,student_uid,source FROM dc.fixture_student_scope
 UNION
 SELECT a.staff_uid,s.intg_uid,'org_assignment'::text FROM dc.org_assignment a
 JOIN dc.student s ON (s.college_code,s.dept_code)=(a.college_code,a.dept_code)
 WHERE a.is_active AND a.valid_from<=CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to>=CURRENT_DATE);

CREATE TABLE dc.menu (
 menu_code text PRIMARY KEY,parent_code text REFERENCES dc.menu,portal text NOT NULL CHECK(portal IN ('admin','student')),
 label text NOT NULL,route text NOT NULL,sort_order integer NOT NULL DEFAULT 0,is_active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1, CHECK(parent_code IS NULL OR parent_code<>menu_code)
);
CREATE TABLE dc.menu_auth (
 menu_code text REFERENCES dc.menu,role_code text REFERENCES dc.auth_role,
 PRIMARY KEY(menu_code,role_code)
);
CREATE TABLE dc.admin_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),entity text NOT NULL,entity_id text NOT NULL,
 before_value jsonb,after_value jsonb NOT NULL,reason text NOT NULL,
 changed_by text NOT NULL REFERENCES dc.person,changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER admin_event_immutable BEFORE UPDATE OR DELETE ON dc.admin_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER menu_revision AFTER INSERT OR UPDATE ON dc.menu FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();
CREATE TRIGGER menu_auth_revision AFTER INSERT OR UPDATE OR DELETE ON dc.menu_auth FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();
INSERT INTO dc.menu(menu_code,portal,label,route) VALUES ('system','admin','시스템 관리','/system');
INSERT INTO dc.menu_auth VALUES ('system','AUTH0006');
GRANT SELECT ON dc.code_group,dc.code_item,dc.code_item_event,dc.metadata_revision,dc.auth_role,dc.auth_user,
 dc.org_assignment,dc.staff_student_scope,dc.menu,dc.menu_auth,dc.admin_event TO dc_app;
GRANT INSERT,UPDATE ON dc.code_item,dc.org_assignment TO dc_app;
GRANT UPDATE ON dc.menu,dc.metadata_revision TO dc_app;
GRANT INSERT ON dc.code_item_event,dc.admin_event TO dc_app;
