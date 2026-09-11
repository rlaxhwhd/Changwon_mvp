ALTER TABLE dc.counsel_request ADD COLUMN topic_code text;
ALTER TABLE dc.counsel_request ADD COLUMN topic_group text GENERATED ALWAYS AS ('COUNSEL_TOPIC') STORED;
ALTER TABLE dc.counsel_request ADD CONSTRAINT counsel_topic_fk FOREIGN KEY(topic_group,topic_code)
 REFERENCES dc.code_item(group_code,code);
-- Only exact codes are projected; free-text purposes remain unmodified snapshots.
UPDATE dc.counsel_request r SET topic_code=c.code FROM dc.code_item c
 WHERE c.group_code='COUNSEL_TOPIC' AND r.topic=c.code;
