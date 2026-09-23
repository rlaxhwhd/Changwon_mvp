-- 설문지(조립물) = 버전 + 영역 + 영역별 문항. 문항·영역 사전은 dc.code_item 이 정본이고
-- 여기에는 코드와 순서만 담는다 — 문장·척도는 항상 사전에서 실시간으로 읽는다.
-- 게시본 구성은 사전의 is_active 를 이긴다: 운영 중 프로그램의 사전·사후 문항이 달라지면 안 된다.
-- Rollback: 되돌리지 않는다. 문제가 생기면 새 migration 으로 고친다(roll-forward).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE dc.survey_form (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('COMPETENCY','SATISFACTION')),
  version      int  NOT NULL CHECK (version >= 1),          -- 설문지 버전(v1,v2…). 낙관적 잠금 아님
  status       text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  memo         text NOT NULL DEFAULT '' CHECK (length(memo) <= 1000),
  created_by   text REFERENCES dc.person,                   -- NULL = 시스템 적재(103)
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  published_by text REFERENCES dc.person,
  lock_version int NOT NULL DEFAULT 0,                      -- 낙관적 잠금 전용
  UNIQUE (kind, version),
  CHECK ((status='PUBLISHED') = (published_at IS NOT NULL))
);
-- 갈래마다 초안은 1개. 동시 POST 두 건이 같은 version 을 계산해도 여기서 하나가 막힌다.
CREATE UNIQUE INDEX survey_form_single_draft ON dc.survey_form(kind) WHERE status='DRAFT';
-- 「현재 게시본」 = 같은 kind 의 PUBLISHED 중 version 최대. 한 줄 조회용.
CREATE INDEX survey_form_current ON dc.survey_form(kind, version DESC) WHERE status='PUBLISHED';

CREATE TABLE dc.survey_form_area (
  form_id    bigint NOT NULL REFERENCES dc.survey_form(id) ON DELETE CASCADE,
  area_group text NOT NULL DEFAULT 'SURVEY_AREA' CHECK (area_group='SURVEY_AREA'),
  area_code  text NOT NULL,
  area_order int  NOT NULL CHECK (area_order >= 0),
  PRIMARY KEY (form_id, area_code),
  UNIQUE (form_id, area_order),
  FOREIGN KEY (area_group, area_code) REFERENCES dc.code_item(group_code, code)
);

CREATE TABLE dc.survey_form_item (
  form_id    bigint NOT NULL,
  area_code  text   NOT NULL,
  item_group text   NOT NULL DEFAULT 'SURVEY_ITEM' CHECK (item_group='SURVEY_ITEM'),
  item_code  text   NOT NULL,
  item_order int    NOT NULL CHECK (item_order >= 0),
  PRIMARY KEY (form_id, item_code),                         -- 한 설문지에 같은 문항 두 번 금지
  UNIQUE (form_id, area_code, item_order),
  -- 문항의 영역은 반드시 그 설문지가 실제로 담은 영역이어야 한다. form_id 는 이 FK 로 묶이므로
  -- survey_form 을 직접 참조하지 않는다.
  FOREIGN KEY (form_id, area_code) REFERENCES dc.survey_form_area(form_id, area_code) ON DELETE CASCADE,
  FOREIGN KEY (item_group, item_code) REFERENCES dc.code_item(group_code, code)
);

-- /metadata 캐시(_revision)가 게시·구성변경을 못 보고 stale 로 남는 것을 막는다.
CREATE TRIGGER survey_form_revision AFTER INSERT OR UPDATE OR DELETE ON dc.survey_form
  FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();
CREATE TRIGGER survey_form_area_revision AFTER INSERT OR UPDATE OR DELETE ON dc.survey_form_area
  FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();
CREATE TRIGGER survey_form_item_revision AFTER INSERT OR UPDATE OR DELETE ON dc.survey_form_item
  FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();

-- 018 의 text 컬럼(옛 만족도 양식 id, 실데이터 0건)을 같은 이름의 bigint FK 로 갈아 끼운다.
-- 값이 하나라도 있으면 멈춘다 — 타입이 달라 조용히 사라지면 안 된다.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM dc.program WHERE satisfaction_form_id IS NOT NULL) THEN
    RAISE EXCEPTION '102: dc.program.satisfaction_form_id(text) 에 값이 있습니다. 옮길 곳을 정한 뒤 다시 실행하세요.';
  END IF;
END $$;
ALTER TABLE dc.program DROP COLUMN satisfaction_form_id;
ALTER TABLE dc.program
  ADD COLUMN competency_form_id   bigint REFERENCES dc.survey_form(id),
  ADD COLUMN satisfaction_form_id bigint REFERENCES dc.survey_form(id);
-- 참조 측 인덱스가 없으면 survey_form 삭제 때 FK 검사가 program 전체를 훑는다. 잠금 판정에도 쓴다.
CREATE INDEX program_competency_form   ON dc.program(competency_form_id)   WHERE competency_form_id   IS NOT NULL;
CREATE INDEX program_satisfaction_form ON dc.program(satisfaction_form_id) WHERE satisfaction_form_id IS NOT NULL;

-- 001 의 GRANT ALL TABLES 는 그때 있던 테이블만 덮는다. 새 테이블은 여기서 직접 준다.
GRANT SELECT,INSERT,UPDATE,DELETE ON dc.survey_form TO dc_app;
GRANT SELECT,INSERT,DELETE ON dc.survey_form_area,dc.survey_form_item TO dc_app;
GRANT USAGE,SELECT ON SEQUENCE dc.survey_form_id_seq TO dc_app;
