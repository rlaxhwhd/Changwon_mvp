-- Data only. Existing question IDs and submitted snapshots remain unchanged.
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order)
VALUES('TOEIC_DIFFICULTY','TOEIC 단어 난이도','OPERATIONAL',true,95);
INSERT INTO dc.code_item(group_code,code,label,sort_order,payload) VALUES
('TOEIC_DIFFICULTY','LOW','하',0,'{}'),
('TOEIC_DIFFICULTY','MEDIUM','중',1,'{}'),
('TOEIC_DIFFICULTY','HIGH','상',2,'{}');
INSERT INTO dc.toeic_vocabulary(question_id,english_word,difficulty_code)
SELECT id,content->>'word','MEDIUM' FROM dc.mission_question WHERE kind='TOEIC';
-- Reconstruct historical publication from audited snapshots, including withdrawn weeks.
INSERT INTO dc.mission_question_publication(question_id,week_id,first_published_at)
SELECT q.id,w.id,min(e.changed_at)
FROM dc.admin_event e
JOIN dc.mission_week w ON w.id::text=e.after_value->>'id'
CROSS JOIN LATERAL jsonb_array_elements(e.after_value->'items') item
JOIN dc.mission_question q ON q.id::text=item->>'id'
WHERE e.entity='mission_week' AND e.after_value->>'published'='true'
GROUP BY q.id,w.id ON CONFLICT DO NOTHING;
-- Published records predating an audit are also supported.
INSERT INTO dc.mission_question_publication(question_id,week_id,first_published_at)
SELECT q.id,w.id,w.updated_at FROM dc.mission_week w
CROSS JOIN LATERAL jsonb_array_elements(w.items) item
JOIN dc.mission_question q ON q.id::text=item->>'id'
WHERE w.published ON CONFLICT DO NOTHING;
