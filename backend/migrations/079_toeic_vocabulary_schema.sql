-- Expand-only. Keep old JSON fields temporarily for compatibility with the prior API.
-- Forward rollback: return to old API; retain new vocabulary/publication tables.
SET LOCAL lock_timeout = '5s';
CREATE TABLE dc.toeic_vocabulary (
 question_id bigint PRIMARY KEY REFERENCES dc.mission_question(id),
 english_word text NOT NULL CHECK(length(btrim(english_word)) BETWEEN 1 AND 150),
 difficulty_group text NOT NULL DEFAULT 'TOEIC_DIFFICULTY' CHECK(difficulty_group='TOEIC_DIFFICULTY'),
 difficulty_code text NOT NULL,
 FOREIGN KEY(difficulty_group,difficulty_code) REFERENCES dc.code_item(group_code,code)
);
CREATE INDEX toeic_vocabulary_difficulty ON dc.toeic_vocabulary(difficulty_code,question_id);
CREATE INDEX toeic_vocabulary_word ON dc.toeic_vocabulary(lower(english_word));
CREATE TABLE dc.mission_question_publication (
 question_id bigint NOT NULL REFERENCES dc.mission_question(id),
 week_id bigint NOT NULL REFERENCES dc.mission_week(id),
 first_published_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(question_id,week_id)
);
CREATE INDEX mission_publication_week ON dc.mission_question_publication(week_id);
GRANT SELECT,INSERT,UPDATE ON dc.toeic_vocabulary TO dc_app;
GRANT SELECT,INSERT ON dc.mission_question_publication TO dc_app;
