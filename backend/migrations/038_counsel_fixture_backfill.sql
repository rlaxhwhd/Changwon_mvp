-- Archived repository fixtures only. Never import browser overrides or guess owners.
-- A schedule marked version>1 has user changes and is never backfilled again.
INSERT INTO dc.counsel_schedule(staff_uid)
SELECT DISTINCT p.intg_uid FROM dc.seed_source s
CROSS JOIN LATERAL jsonb_array_elements(s.payload) c
JOIN dc.person p ON p.alias=COALESCE(c->>'counselorId',c->>'ownerId')
JOIN dc.staff t ON t.intg_uid=p.intg_uid
WHERE s.path IN ('src_admin/data/availability.seed.json','src_admin/data/excludedHours.seed.json')
AND (p.source='fixture' OR (p.source='local' AND EXISTS(SELECT 1 FROM dc.seed_source origin WHERE origin.path LIKE 'src_admin/data/counselors/%.json' AND origin.payload->>'id'=p.alias)))
ON CONFLICT DO NOTHING;
INSERT INTO dc.counsel_schedule_slot(id,staff_uid,kind,weekday,start_time,end_time)
SELECT v->>'id',p.intg_uid,CASE WHEN s.path LIKE '%excludedHours%' THEN 'EXCLUDED' ELSE 'AVAILABLE' END,
 (v->>'weekday')::integer,(v->>'start')::time,(v->>'end')::time
FROM dc.seed_source s CROSS JOIN LATERAL jsonb_array_elements(s.payload) c
CROSS JOIN LATERAL jsonb_array_elements(c->'slots') v
JOIN dc.person p ON p.alias=COALESCE(c->>'counselorId',c->>'ownerId')
JOIN dc.counsel_schedule cfg ON cfg.staff_uid=p.intg_uid AND cfg.version=1
WHERE s.path IN ('src_admin/data/availability.seed.json','src_admin/data/excludedHours.seed.json')
AND (p.source='fixture' OR (p.source='local' AND EXISTS(SELECT 1 FROM dc.seed_source origin WHERE origin.path LIKE 'src_admin/data/counselors/%.json' AND origin.payload->>'id'=p.alias)))
ON CONFLICT DO NOTHING;
INSERT INTO dc.group_counsel(id,counselor_uid,kind,title,topic,session_date,start_time,end_time,place,capacity,status,test_code,summary,comment,cancel_reason,created_at,updated_at)
SELECT g->>'id',p.intg_uid,CASE g->>'kind' WHEN '집단심리검사' THEN 'PSYCH' ELSE 'CAREER' END,
 g->>'title',g->>'topic',(g->>'date')::date,(g->>'start')::time,(g->>'end')::time,g->>'place',(g->>'capacity')::integer,
 CASE g->>'status' WHEN '완료' THEN 'DONE' WHEN '취소' THEN 'CANCELLED' ELSE 'PLANNED' END,
 g->>'testCode',g->>'summary',g->>'comment',g->>'cancelReason',(g->>'createdAt')::timestamptz,(g->>'updatedAt')::timestamptz
FROM dc.seed_source s CROSS JOIN LATERAL jsonb_array_elements(s.payload) g
JOIN dc.person p ON p.alias=g->>'counselorId' JOIN dc.staff t ON t.intg_uid=p.intg_uid
WHERE s.path='src_admin/data/groupCounsels.seed.json'
AND (p.source='fixture' OR (p.source='local' AND EXISTS(SELECT 1 FROM dc.seed_source origin WHERE origin.path LIKE 'src_admin/data/counselors/%.json' AND origin.payload->>'id'=p.alias))) ON CONFLICT DO NOTHING;
INSERT INTO dc.group_counsel_member(group_id,student_uid,snapshot,attended,added_at)
SELECT g->>'id',p.intg_uid,m-'studentId'-'attended'-'addedAt',(m->>'attended')::boolean,(m->>'addedAt')::timestamptz
FROM dc.seed_source s CROSS JOIN LATERAL jsonb_array_elements(s.payload) g
CROSS JOIN LATERAL jsonb_array_elements(g->'members') m
JOIN dc.person p ON (p.alias=m->>'studentId' OR p.intg_uid=m->>'studentNo')
JOIN dc.student st ON st.intg_uid=p.intg_uid
JOIN dc.group_counsel gc ON gc.id=g->>'id' AND gc.version=1
WHERE s.path='src_admin/data/groupCounsels.seed.json' AND p.source='fixture' ON CONFLICT DO NOTHING;
