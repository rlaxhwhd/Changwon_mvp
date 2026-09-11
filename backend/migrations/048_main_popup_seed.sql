-- 시드 backfill — 새 DB 에서는 시드 전에 돌아 0건이고 seed.py 가 다시 실행한다(멱등).
INSERT INTO dc.main_popup(id,image_path,alt,href,sort_order)
SELECT j->>'id',j->>'image',j->>'alt',j->>'href',ord
FROM dc.seed_source s CROSS JOIN LATERAL jsonb_array_elements(s.payload) WITH ORDINALITY AS t(j,ord)
WHERE s.path='src_v2/data/popups.seed.json'
ON CONFLICT (id) DO NOTHING;
