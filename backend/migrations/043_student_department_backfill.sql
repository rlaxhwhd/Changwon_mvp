-- Fixture-only label normalization. Production SIS code pairs replace these values.
UPDATE dc.student s SET college_code=d.college_code,dept_code=d.dept_code
FROM dc.department d
WHERE s.dept_code IS NULL AND d.dept_name=s.major_label
  AND (SELECT count(*) FROM dc.department x WHERE x.dept_name=s.major_label)=1;

INSERT INTO dc.import_issue(source_path,code,detail)
SELECT 'src_v2/data/studentsRoster.json','AMBIGUOUS_DEPT',
       jsonb_build_object('studentUid',s.intg_uid,'major',s.major_label)
FROM dc.student s WHERE s.dept_code IS NULL
  AND (SELECT count(*) FROM dc.department d WHERE d.dept_name=s.major_label)>1
ON CONFLICT DO NOTHING;
