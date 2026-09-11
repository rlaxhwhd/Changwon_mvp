CREATE TABLE dc.advisor_assignment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 professor_uid text NOT NULL REFERENCES dc.staff(intg_uid),assigned_by_uid text NOT NULL REFERENCES dc.person(intg_uid),
 assigned_on date NOT NULL,released_at timestamptz,released_by_uid text REFERENCES dc.person(intg_uid),release_reason text,
 snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ck_advisor_assignment_release CHECK ((released_at IS NULL)=(released_by_uid IS NULL)),
 CONSTRAINT ck_advisor_assignment_snapshot CHECK (snapshot ?& array['studentNo','name','major','grade','professorName'])
);
CREATE UNIQUE INDEX uq_advisor_assignment_active ON dc.advisor_assignment(student_uid) WHERE released_at IS NULL;
CREATE INDEX ix_advisor_assignment_professor ON dc.advisor_assignment(professor_uid,assigned_on DESC) WHERE released_at IS NULL;
CREATE INDEX ix_advisor_assignment_student_history ON dc.advisor_assignment(student_uid,assigned_on DESC,id);
CREATE INDEX ix_org_assignment_dept ON dc.org_assignment(college_code,dept_code) WHERE is_active;
CREATE INDEX ix_student_dept ON dc.student(college_code,dept_code) WHERE dept_code IS NOT NULL;

CREATE FUNCTION dc.advisor_assignment_release_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.released_at IS NOT NULL THEN RAISE EXCEPTION 'advisor assignment already released'; END IF;
 IF (NEW.student_uid,NEW.professor_uid,NEW.assigned_by_uid,NEW.assigned_on,NEW.snapshot,NEW.created_at)
    IS DISTINCT FROM (OLD.student_uid,OLD.professor_uid,OLD.assigned_by_uid,OLD.assigned_on,OLD.snapshot,OLD.created_at)
 THEN RAISE EXCEPTION 'advisor assignment history is immutable'; END IF;
 IF NEW.released_at IS NULL OR NEW.released_by_uid IS NULL THEN RAISE EXCEPTION 'release fields are required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER advisor_assignment_release_only BEFORE UPDATE ON dc.advisor_assignment
 FOR EACH ROW EXECUTE FUNCTION dc.advisor_assignment_release_only();
CREATE TRIGGER advisor_assignment_no_delete BEFORE DELETE ON dc.advisor_assignment
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

CREATE OR REPLACE VIEW dc.staff_student_scope AS
 SELECT staff_uid,student_uid,source FROM dc.fixture_student_scope
 UNION SELECT a.staff_uid,s.intg_uid,'org_assignment'::text FROM dc.org_assignment a
 JOIN dc.student s ON (s.college_code,s.dept_code)=(a.college_code,a.dept_code)
 WHERE a.is_active AND a.valid_from<=CURRENT_DATE AND (a.valid_to IS NULL OR a.valid_to>=CURRENT_DATE)
 UNION SELECT professor_uid,student_uid,'advisor_assignment'::text FROM dc.advisor_assignment WHERE released_at IS NULL;
GRANT SELECT,INSERT,UPDATE ON dc.advisor_assignment TO dc_app;
GRANT SELECT ON dc.staff_student_scope TO dc_app;
