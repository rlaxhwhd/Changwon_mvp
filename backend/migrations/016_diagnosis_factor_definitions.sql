-- User-supplied result rows (2026-09-08). Example numbers are NOT student scores.
CREATE TABLE dc.diagnosis_factor_definition (
 test_code text NOT NULL, test_group text NOT NULL DEFAULT 'DIAGNOSIS_TEST' CHECK(test_group='DIAGNOSIS_TEST'),
 factor_code text NOT NULL, label text NOT NULL, secondary_label text,
 sort_order integer NOT NULL, definition_version integer NOT NULL DEFAULT 1,
 PRIMARY KEY(test_code,factor_code), FOREIGN KEY(test_group,test_code) REFERENCES dc.code_item(group_code,code)
);
INSERT INTO dc.diagnosis_factor_definition(test_code,factor_code,label,secondary_label,sort_order) VALUES
 ('C2','EXPERIENCE','경험 지향형',NULL,1),
 ('C2','REFLECTION','반성적 관찰형',NULL,2),
 ('C2','CONCEPTUALIZATION','추상적 개념화형',NULL,3),
 ('C3','DIRECTION','진로몰입 수준','Direction',1),
 ('C3','ENRICHMENT','네트워킹 활용능력','Enrichment',2),
 ('C3','FOUNDATION','문제해결능력','Foundation',3),
 ('C3','INTERPERSONAL','대인상호작용능력',NULL,4),
 ('C3','TARGET_FITNESS','고용적합성 수준','Target fitness',5),
 ('C4','RESEARCH_ANALYSIS','Research & Analysis',NULL,1),
 ('C4','EMPLOYABILITY_BRANDING','Employability branding',NULL,2),
 ('C4','INTERVIEW_ARTICULATION','Articulation for interview',NULL,3),
 ('C4','EMPLOYMENT_STRATEGY','Design of Employment Strategy',NULL,4);
-- Existing fixtures use obsolete factors. Preserve their raw results, never silently
-- assign their numbers to new factor meanings. C5/C6 definitions remain pending.
GRANT SELECT ON dc.diagnosis_factor_definition TO dc_app;
