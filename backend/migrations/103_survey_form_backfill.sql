-- 현행 렌더 결과를 그대로 설문지 v1 로 굳힌다. 지금 화면에 보이지 않는 것(is_active=false)은 담지 않는다.
-- 102 직후에 한 번, seed.py 가 시드 끝에 한 번 더 돈다(마이그레이션은 시드보다 먼저 돌아 프로그램이 0건이다).
-- 그래서 전 구문이 재실행 안전해야 한다 — CREATE TABLE 을 여기에 두지 않는다.
SET LOCAL lock_timeout = '5s';

-- 1) 게시본 v1 두 벌. created_by 는 NULL(시스템 적재).
INSERT INTO dc.survey_form(kind,version,status,memo,published_at)
SELECT v.k, 1, 'PUBLISHED', '코드관리 기존 문항 그대로 고정(103)', now()
  FROM (VALUES ('COMPETENCY'),('SATISFACTION')) AS v(k)
ON CONFLICT (kind,version) DO NOTHING;

-- 2) 영역 — COMPETENCY 는 payload.group 이 CAREER/JOB/EMPLOY, SATISFACTION 은 SATISFACTION.
INSERT INTO dc.survey_form_area(form_id,area_code,area_order)
SELECT f.id, a.code, a.sort_order
  FROM dc.survey_form f
  JOIN dc.code_item a
    ON a.group_code='SURVEY_AREA' AND a.is_active
   AND a.payload->>'group' = ANY (CASE f.kind WHEN 'SATISFACTION' THEN ARRAY['SATISFACTION']
                                              ELSE ARRAY['CAREER','JOB','EMPLOY'] END)
 WHERE f.version=1
ON CONFLICT DO NOTHING;

-- 3) 문항 — 사전의 payload.areaKey 가 지금의 소속 정보다. item_order=sort_order.
INSERT INTO dc.survey_form_item(form_id,area_code,item_code,item_order)
SELECT fa.form_id, fa.area_code, i.code, i.sort_order
  FROM dc.survey_form_area fa
  JOIN dc.code_item i
    ON i.group_code='SURVEY_ITEM' AND i.is_active AND i.payload->>'areaKey'=fa.area_code
ON CONFLICT DO NOTHING;

-- 4) 기존 프로그램 전 행을 v1 에 고정. 이미 붙잡은 행은 건드리지 않는다(멱등).
UPDATE dc.program p SET
  competency_form_id   = COALESCE(p.competency_form_id,
                          (SELECT id FROM dc.survey_form WHERE kind='COMPETENCY'   AND version=1)),
  satisfaction_form_id = COALESCE(p.satisfaction_form_id,
                          (SELECT id FROM dc.survey_form WHERE kind='SATISFACTION' AND version=1))
 WHERE p.competency_form_id IS NULL OR p.satisfaction_form_id IS NULL;

-- 5) competency_areas(text[]) 정합성 보고. 실패시키지 않는다 —
--    비활성 영역을 고른 옛 프로그램은 지금도 그 영역이 0문항으로 렌더되고, 전환 뒤에도 똑같이 0문항이다.
--    (v1 에 억지로 끼워 넣으면 오히려 렌더 결과가 바뀐다.)
DO $$
DECLARE stale int;
BEGIN
  SELECT count(*) INTO stale
    FROM dc.program p, unnest(p.competency_areas) AS sel(area_code)
   WHERE NOT EXISTS (SELECT 1 FROM dc.survey_form_area fa
                      WHERE fa.form_id=p.competency_form_id AND fa.area_code=sel.area_code);
  IF stale > 0 THEN
    RAISE NOTICE '103: % program area selections are outside COMPETENCY v1 (렌더 0문항 — 전환 전과 동일)', stale;
  END IF;
END $$;
