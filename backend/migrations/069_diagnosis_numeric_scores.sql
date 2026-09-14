-- Preserve received results; project numeric scores without calculating grades.
CREATE FUNCTION dc.diagnosis_numeric(value jsonb) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result numeric;
BEGIN
 IF value IS NULL OR jsonb_typeof(value) NOT IN ('number','string') THEN RETURN NULL; END IF;
 BEGIN result := (value #>> '{}')::numeric;
 EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN NULL;
 END;
 IF result IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) THEN RETURN NULL; END IF;
 RETURN result;
END $$;

CREATE TABLE dc.diagnosis_factor_score (
 student_uid text NOT NULL,test_id text NOT NULL,attempt_no integer NOT NULL,
 position integer NOT NULL CHECK(position>=0),
 test_code text NOT NULL, factor_code text, definition_version integer,
 source_factor_code text, factor_name text,
 raw_score numeric,t_score numeric,percentile numeric,
 level text,raw_factor jsonb NOT NULL CHECK(jsonb_typeof(raw_factor)='object'),
 validation_issues text[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(student_uid,test_id,attempt_no,position),
 FOREIGN KEY(student_uid,test_id,attempt_no) REFERENCES dc.diagnosis_result ON DELETE CASCADE,
 FOREIGN KEY(test_code,factor_code) REFERENCES dc.diagnosis_factor_definition,
 CHECK(test_code=upper(test_id)),
 CHECK((factor_code IS NULL)=(definition_version IS NULL)),
 CHECK(raw_score>'-Infinity'::numeric AND raw_score<'Infinity'::numeric),
 CHECK(t_score>'-Infinity'::numeric AND t_score<'Infinity'::numeric),
 CHECK(percentile BETWEEN 0 AND 100)
);
CREATE INDEX diagnosis_factor_score_analysis ON dc.diagnosis_factor_score(test_code,factor_code);

CREATE FUNCTION dc.project_diagnosis_scores(uid text,test text,attempt integer,body jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE item record; definition record; raw numeric; t numeric; pct numeric; issues text[];
BEGIN
 DELETE FROM dc.diagnosis_factor_score WHERE student_uid=uid AND test_id=test AND attempt_no=attempt;
 FOR item IN SELECT value,ordinality FROM jsonb_array_elements(COALESCE(NULLIF(body->'factors','null'::jsonb),'[]')) WITH ORDINALITY LOOP
  IF jsonb_typeof(item.value)<>'object' THEN RAISE EXCEPTION 'Diagnosis factor must be an object'; END IF;
  SELECT d.factor_code,d.definition_version INTO definition FROM dc.diagnosis_factor_definition d
   WHERE d.test_code=upper(test) AND
    (d.factor_code=item.value->>'factorCode' OR
     (item.value->>'factorCode' IS NULL AND d.label=item.value->>'name'))
   ORDER BY d.factor_code LIMIT 1;
  raw:=dc.diagnosis_numeric(item.value->'rawScore');
  t:=dc.diagnosis_numeric(item.value->'tScore');
  pct:=dc.diagnosis_numeric(item.value->'percentile');
  issues:='{}';
  IF item.value->>'rawScore' IS NOT NULL AND raw IS NULL THEN issues:=array_append(issues,'INVALID_RAW_SCORE'); END IF;
  IF item.value->>'tScore' IS NOT NULL AND t IS NULL THEN issues:=array_append(issues,'INVALID_T_SCORE'); END IF;
  IF item.value->>'percentile' IS NOT NULL AND (pct IS NULL OR pct<0 OR pct>100) THEN
   issues:=array_append(issues,'INVALID_PERCENTILE'); pct:=NULL;
  END IF;
  IF definition.factor_code IS NULL THEN issues:=array_append(issues,'UNMAPPED_FACTOR'); END IF;
  INSERT INTO dc.diagnosis_factor_score VALUES(uid,test,attempt,(item.ordinality-1)::integer,
   upper(test),definition.factor_code,definition.definition_version,item.value->>'factorCode',
   item.value->>'name',raw,t,pct,item.value->>'level',item.value,issues);
 END LOOP;
END $$;

-- Existing response originals stay byte-for-byte equivalent as jsonb values.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM dc.diagnosis_result LOOP
  PERFORM dc.project_diagnosis_scores(r.student_uid,r.test_id,r.attempt_no,r.payload);
 END LOOP;
END $$;
CREATE FUNCTION dc.sync_diagnosis_scores() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM dc.project_diagnosis_scores(NEW.student_uid,NEW.test_id,NEW.attempt_no,NEW.payload);
 RETURN NULL;
END $$;
CREATE TRIGGER diagnosis_score_sync AFTER INSERT OR UPDATE OF payload ON dc.diagnosis_result
 FOR EACH ROW EXECUTE FUNCTION dc.sync_diagnosis_scores();
GRANT SELECT,INSERT,UPDATE,DELETE ON dc.diagnosis_factor_score TO dc_app;
COMMENT ON TABLE dc.diagnosis_factor_score IS
 'Numeric projection of preserved external result factors. NULL is missing/invalid, never zero. Unknown factors remain with UNMAPPED_FACTOR. Update the source result in one transaction; do not edit projection independently.';
