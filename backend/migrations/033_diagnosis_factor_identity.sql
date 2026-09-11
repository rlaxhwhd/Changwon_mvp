-- Additive identity binding. Raw result payloads and scores remain untouched.
-- Roll-forward recovery: stop reading the binding table; retain raw results.
CREATE TABLE dc.diagnosis_result_factor (
 student_uid text NOT NULL, test_id text NOT NULL, attempt_no integer NOT NULL,
 position integer NOT NULL CHECK(position>=0), test_code text NOT NULL, factor_code text NOT NULL,
 definition_version integer NOT NULL CHECK(definition_version>0),
 PRIMARY KEY(student_uid,test_id,attempt_no,position),
 UNIQUE(student_uid,test_id,attempt_no,factor_code),
 FOREIGN KEY(student_uid,test_id,attempt_no) REFERENCES dc.diagnosis_result,
 FOREIGN KEY(test_code,factor_code) REFERENCES dc.diagnosis_factor_definition,
 CHECK(test_code=upper(test_id))
);
CREATE FUNCTION dc.bind_result_factors() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO dc.diagnosis_result_factor
 SELECT NEW.student_uid,NEW.test_id,NEW.attempt_no,(f.n-1)::integer,
        d.test_code,d.factor_code,d.definition_version
 FROM jsonb_array_elements(COALESCE(NEW.payload->'factors','[]')) WITH ORDINALITY f(value,n)
 JOIN dc.diagnosis_factor_definition d ON d.test_code=upper(NEW.test_id)
 AND (f.value->>'factorCode'=d.factor_code OR
      (f.value->>'factorCode' IS NULL AND f.value->>'name'=d.label))
 ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;
CREATE TRIGGER diagnosis_result_bind AFTER INSERT ON dc.diagnosis_result
 FOR EACH ROW EXECUTE FUNCTION dc.bind_result_factors();
CREATE TRIGGER diagnosis_result_factor_immutable BEFORE UPDATE OR DELETE ON dc.diagnosis_result_factor
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
GRANT SELECT,INSERT ON dc.diagnosis_result_factor TO dc_app;
