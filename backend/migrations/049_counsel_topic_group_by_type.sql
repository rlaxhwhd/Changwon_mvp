-- 교수상담(PROF)의 분류는 PROF_COUNSEL_TYPE 코드 그룹이고, 진로·심리 상담의 주제는 COUNSEL_TOPIC 이다.
-- topic_group 은 014 에서 상수 생성열이었다 — type_code 로 갈라 (group, code) FK 하나가 두 그룹을 검사하게 한다.
ALTER TABLE dc.counsel_request DROP CONSTRAINT counsel_topic_fk;
ALTER TABLE dc.counsel_request DROP COLUMN topic_group;
ALTER TABLE dc.counsel_request ADD COLUMN topic_group text
  GENERATED ALWAYS AS (CASE WHEN type_code='PROF' THEN 'PROF_COUNSEL_TYPE' ELSE 'COUNSEL_TOPIC' END) STORED;
ALTER TABLE dc.counsel_request ADD CONSTRAINT counsel_topic_fk FOREIGN KEY(topic_group,topic_code)
  REFERENCES dc.code_item(group_code,code);
