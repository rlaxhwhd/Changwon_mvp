-- Factor identifiers are stable; labels are editable through the code-management UI.
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes)
 VALUES('DIAGNOSIS_FACTOR','진단 결과 항목 명칭','OPERATIONAL',true);
INSERT INTO dc.code_item(group_code,code,label,sort_order)
 SELECT 'DIAGNOSIS_FACTOR',test_code||'_'||factor_code,label,sort_order FROM dc.diagnosis_factor_definition;
ALTER TABLE dc.diagnosis_factor_definition ADD COLUMN label_group text NOT NULL DEFAULT 'DIAGNOSIS_FACTOR' CHECK(label_group='DIAGNOSIS_FACTOR');
ALTER TABLE dc.diagnosis_factor_definition ADD COLUMN label_code text GENERATED ALWAYS AS(test_code||'_'||factor_code) STORED;
ALTER TABLE dc.diagnosis_factor_definition ADD CONSTRAINT factor_label_fk FOREIGN KEY(label_group,label_code) REFERENCES dc.code_item(group_code,code);
