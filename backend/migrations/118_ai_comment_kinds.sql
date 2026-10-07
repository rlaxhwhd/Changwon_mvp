-- Reference data separated from schema migration 117.
-- Rollback: keep codes referenced by immutable AI history.
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('AI_RUN_KIND','COUNSEL_COMMENT','상담 AI 코멘트',7),
 ('AI_RUN_KIND','ROADMAP_COMMENT','로드맵 AI 검토 코멘트',8);
