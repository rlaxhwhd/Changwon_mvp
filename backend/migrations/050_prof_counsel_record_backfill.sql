-- 교수 발의 상담기록 시드(src_admin/data/profCounselRecords.seed.json 7행) → counsel_request(DONE)+counsel_record.
-- 현행 CON_PROF_INFO 의 "신청+결과 한 행" 구조를 계승한다(0003 D3). 새 DB 에서는 시드 뒤 seed.py 가 다시 돈다(멱등).
WITH src AS (
  SELECT j, md5('prof-record-fixture:'||(j->>'id'))::uuid AS rid
  FROM dc.seed_source s CROSS JOIN LATERAL jsonb_array_elements(s.payload) j
  WHERE s.path='src_admin/data/profCounselRecords.seed.json'
), cat AS (
  SELECT * FROM (VALUES ('01','MAJOR_STUDY'),('02','CAREER'),('03','JOB'),('04','SERVICE_PRACTICE'),('05','MENTORING_PROGRAM'),('06','ETC')) v(legacy,code)
), ins AS (
  INSERT INTO dc.counsel_request(id,student_uid,counselor_uid,type_code,legacy_type,status_code,method_code,topic,topic_code,
    requested_at,slot_date,intake,snapshot,source_payload,completed_at)
  SELECT src.rid::text,st.intg_uid,pf.intg_uid,'PROF','교수','DONE',
    CASE WHEN src.j->>'method'='비대면' THEN 'ONLINE' ELSE 'OFFLINE' END,ci.label,cat.code,
    (src.j->>'date')::date,(src.j->>'date')::date,'[]',src.j->'snapshot',
    jsonb_build_object('origin','PROF_RECORD','method',src.j->>'method','date',src.j->>'date','fixtureId',src.j->>'id'),
    (src.j->>'date')::date
  FROM src JOIN cat ON cat.legacy=src.j->>'categoryCode'
  JOIN dc.code_item ci ON ci.group_code='PROF_COUNSEL_TYPE' AND ci.code=cat.code
  JOIN dc.person sp ON sp.alias=src.j->>'studentId' JOIN dc.student st ON st.intg_uid=sp.intg_uid
  JOIN dc.person pp ON pp.alias=src.j->>'professorId' JOIN dc.staff pf ON pf.intg_uid=pp.intg_uid
  WHERE NOT EXISTS (SELECT 1 FROM dc.counsel_request r WHERE r.id=src.rid::text)
  RETURNING id,counselor_uid,snapshot,source_payload
)
INSERT INTO dc.counsel_record(id,request_id,counselor_uid,summary,comment,follow_up,status_code,created_at,updated_at,snapshot)
SELECT md5('prof-record-fixture:rec:'||ins.id)::uuid::text,ins.id,ins.counselor_uid,
  COALESCE((SELECT j->>'summary' FROM src WHERE src.rid::text=ins.id),''),'','','DONE',
  (SELECT (j->>'createdAt')::timestamptz FROM src WHERE src.rid::text=ins.id),
  (SELECT (j->>'createdAt')::timestamptz FROM src WHERE src.rid::text=ins.id),ins.snapshot
FROM ins
ON CONFLICT DO NOTHING;

INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload)
SELECT r.id,r.counselor_uid,k.kind,jsonb_build_object('origin','PROF_RECORD')
FROM dc.counsel_request r CROSS JOIN (VALUES ('REQUESTED'),('COMPLETE')) k(kind)
WHERE r.source_payload->>'fixtureId' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dc.counsel_event e WHERE e.request_id=r.id AND e.kind=k.kind);
