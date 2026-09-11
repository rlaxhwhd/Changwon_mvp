-- User-authorized local login numbers; keep internal IDs and all history FKs.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM academic.v_usr_inf
    WHERE intg_uid IN ('20990001','20990002') OR login_id IN ('20990001','20990002'))
  THEN RAISE EXCEPTION 'Requested fixture number collides with academic source'; END IF;
END $$;
INSERT INTO dc.fixture_student_login(student_no,student_uid)
SELECT CASE alias WHEN 'chaewon' THEN '20990001' ELSE '20990002' END,intg_uid
FROM dc.person WHERE alias IN ('chaewon','changwon') AND source='fixture' AND kind='STUDENT';
UPDATE dc.student s SET student_no=f.student_no
FROM dc.fixture_student_login f WHERE s.intg_uid=f.student_uid;
