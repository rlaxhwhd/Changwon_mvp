-- 로드맵·성장 파생 적재 — 소유자가 증명된 자료만 옮긴다.
--
-- ★ 이 파일은 두 번 실행된다: 마이그레이션으로 한 번(기존 DB 를 따라잡기 위해),
--   신규 DB 에서는 seed 직후 한 번 더(마이그레이션 시점엔 학생이 아직 없다).
--   그래서 모든 INSERT 가 존재 검사 + ON CONFLICT DO NOTHING 이다
--   (020·021·023 과 같은 방식).
--
-- ★ 옮기지 않는 것 — 소유자가 없기 때문이다. 채용에서 SAVED_RESUMES 를 뺀 것과 같은 판정이다.
--   · GrowthHome 의 공통 초기 상수(PROJECTS·SKILLS·QUALIFICATIONS·RECORDS)
--     — useStoredList 가 mount 직후 학생별 키에 그대로 저장한다. 키가 있다는 것이
--       그 학생이 썼다는 증거가 되지 못한다.
--   · portfolio.ts 의 INITIAL_* 와 buildProfile 의 합성 연락처
--     — 전 학생 공통 상수이고 'student@cwnu.ac.kr'·'010-1234-5678' 은 실제 연락처가 아니다.
--   · dc_program_wishlist — 학생 ID 가 아예 없는 공통 키다.
--   · 오늘 미션·퀘스트·미션 로그 샘플 — 이번 범위 밖이고 소유된 결과가 0건이다.
--   · dc.star_track — 이미 시드가 넣었다. 다시 INSERT 하지 않고 읽기만 바꾼다.

-- ── 1) 로드맵 AI 근거 분리 ───────────────────────────────────────────────
-- 축의 rationale 과 칸의 why 는 AI 원문인데 지금은 상담사가 고칠 수 있는 mutable text 와
-- 한 칸에 있다. 불변 산출물(ai_run/ai_suggestion)로 옮기고 참조만 연결한다.
-- 원문 text 는 지우지 않는다 — 모든 소비자가 참조를 읽게 된 뒤 별도 마이그레이션으로 걷는다.
-- model='fixture' 는 정직한 값이다. 이 문장들은 실제 LLM 이 만든 것이 아니라 시드에 적혀 있었다.
INSERT INTO dc.ai_run(id,kind_code,student_uid,subject_kind,subject_id,model,
                      schema_version,input_hash,input_snapshot,source_ref)
SELECT 'ai_roadmap_'||r.student_uid||'_v'||r.version,'ROADMAP_GENERATION',r.student_uid,
       'ROADMAP',r.student_uid||':'||r.version,'fixture',1,
       encode(sha256(convert_to(r.student_uid||':'||r.version,'UTF8')),'hex'),
       jsonb_build_object('origin','SEED_ROADMAP_AXES','studentUid',r.student_uid,
                          'roadmapVersion',r.version,'targetRole',r.target_role),
       jsonb_build_object('kind','SEED_IMPORT','note','학생 시드의 roadmapAxes 에 이미 적혀 있던 문구')
  FROM dc.roadmap r
 ON CONFLICT (id) DO NOTHING;

-- 축 3건 → position 1~3, 칸 15건 → position 4 이후. 한 호출 안의 갈래는 category 로 가른다.
INSERT INTO dc.ai_suggestion(run_id,position,category,title,detail,meta)
SELECT 'ai_roadmap_'||a.student_uid||'_v'||r.version,
       CASE a.axis WHEN 'IAP' THEN 1 WHEN 'CORE' THEN 2 ELSE 3 END,
       'axis',a.headline,a.rationale,jsonb_build_object('axis',a.axis)
  FROM dc.roadmap_axis a JOIN dc.roadmap r USING(student_uid)
 WHERE EXISTS(SELECT 1 FROM dc.ai_run x WHERE x.id='ai_roadmap_'||a.student_uid||'_v'||r.version)
 ON CONFLICT (run_id,position) DO NOTHING;
INSERT INTO dc.ai_suggestion(run_id,position,category,title,detail,meta)
SELECT 'ai_roadmap_'||i.student_uid||'_v'||r.version,
       3+(CASE i.axis WHEN 'IAP' THEN 0 WHEN 'CORE' THEN 5 ELSE 10 END)+i.position,
       'item',i.title,i.why,
       jsonb_build_object('axis',i.axis,'position',i.position,'itemId',i.id,
                          'priority',i.priority,'importance',i.importance)
  FROM dc.roadmap_item i JOIN dc.roadmap r USING(student_uid)
 WHERE i.origin_code='BASE' AND i.position BETWEEN 1 AND 5
   AND EXISTS(SELECT 1 FROM dc.ai_run x WHERE x.id='ai_roadmap_'||i.student_uid||'_v'||r.version)
 ON CONFLICT (run_id,position) DO NOTHING;

UPDATE dc.roadmap r SET ai_run_id='ai_roadmap_'||r.student_uid||'_v'||r.version
 WHERE r.ai_run_id IS NULL
   AND EXISTS(SELECT 1 FROM dc.ai_run x WHERE x.id='ai_roadmap_'||r.student_uid||'_v'||r.version);
UPDATE dc.roadmap_axis a SET ai_suggestion_id=s.id
  FROM dc.roadmap r, dc.ai_suggestion s
 WHERE r.student_uid=a.student_uid AND a.ai_suggestion_id IS NULL
   AND s.run_id='ai_roadmap_'||a.student_uid||'_v'||r.version
   AND s.category='axis' AND s.meta->>'axis'=a.axis;
UPDATE dc.roadmap_item i SET ai_suggestion_id=s.id
  FROM dc.roadmap r, dc.ai_suggestion s
 WHERE r.student_uid=i.student_uid AND i.ai_suggestion_id IS NULL
   AND s.run_id='ai_roadmap_'||i.student_uid||'_v'||r.version
   AND s.category='item' AND s.meta->>'itemId'=i.id;

-- ── 2) 비교과 개설 편입 cutover ──────────────────────────────────────────
-- 지금 화면은 조회할 때마다 `prog-{id}` 칸을 가상 생성한다. 그 결과와 정확히 같은 집합을
-- 한 번만 행으로 적재한다 — 화면이 보던 것과 달라지면 이관이 아니라 변경이다.
-- 대상은 (a) 편입 구분이 NONE 이 아니고 (b) 학생의 현재 유형이 대상 유형에 들어 있고
-- (c) 지금 살아 있는 칸뿐이다. 마감이 지난 추천은 화면에도 없으므로 만들지 않는다.
-- 이관분의 행위자는 모른다 — 시스템 계정을 새로 만들지 않는다(DB.md §3-4).
WITH target AS (
  SELECT r.student_uid, p.id AS program_id, p.title, p.roadmap_entry,
         CASE WHEN p.roadmap_entry='RECOMMEND'
              THEN (p.apply_end+1)::timestamp AT TIME ZONE 'Asia/Seoul' END AS expires_at
    FROM dc.roadmap r
    JOIN LATERAL (SELECT student_type FROM dc.student_type_event t
                   WHERE t.student_uid=r.student_uid ORDER BY decided_at DESC,id DESC LIMIT 1) t ON true
    JOIN dc.program p ON p.roadmap_entry<>'NONE' AND t.student_type=ANY(p.care_types)
   WHERE p.roadmap_entry='REQUIRED' OR (p.apply_end IS NOT NULL AND now()<(p.apply_end+1)::timestamp AT TIME ZONE 'Asia/Seoul')
), inserted AS (
  INSERT INTO dc.roadmap_event(student_uid,roadmap_version,action_code,cause_kind,cause_id,
                               after_value,reason,transaction_id)
  SELECT t.student_uid,r.version,'IMPORT','PROGRAM_CUTOVER',t.program_id,
         jsonb_build_object('programId',t.program_id,'entry',t.roadmap_entry,'title',t.title),
         '개설 시 편입된 칸의 1회 적재',
         ('00000000-0000-4000-8000-'||lpad(to_hex(hashtext('roadmap-cutover-026')&2147483647),12,'0'))::uuid
    FROM target t JOIN dc.roadmap r ON r.student_uid=t.student_uid
   WHERE NOT EXISTS(SELECT 1 FROM dc.roadmap_item i
                     WHERE i.student_uid=t.student_uid AND i.program_id=t.program_id
                       AND i.origin_code='AUTO_PROGRAM')
  RETURNING id,student_uid,cause_id
)
INSERT INTO dc.roadmap_item(student_uid,axis,id,position,title,priority,importance,why,status,
                            program_id,entry,expires_at,origin_code,entry_event_id,created_at,
                            completion_source_code,completed_at,completion_ref)
SELECT t.student_uid,'IAP','auto-'||t.program_id,
       5+row_number() OVER (PARTITION BY t.student_uid ORDER BY t.program_id),
       t.title,
       CASE t.roadmap_entry WHEN 'REQUIRED' THEN 'P0' ELSE 'P1' END,
       CASE t.roadmap_entry WHEN 'REQUIRED' THEN 'REQUIRED' ELSE 'RECOMMENDED' END,
       CASE t.roadmap_entry WHEN 'REQUIRED' THEN '필수' ELSE '추천' END
         ||' 비교과 — 로드맵에 편입된 프로그램입니다.',
       CASE WHEN a.outcome_code='COMPLETED' THEN 'DONE' ELSE 'TODO' END,
       t.program_id,t.roadmap_entry,t.expires_at,'AUTO_PROGRAM',e.id,NULL,
       CASE WHEN a.outcome_code='COMPLETED' THEN 'LEGACY' END,NULL,
       CASE WHEN a.outcome_code='COMPLETED'
            THEN jsonb_build_object('programId',t.program_id,'origin','CUTOVER') END
  FROM target t
  JOIN inserted e ON e.student_uid=t.student_uid AND e.cause_id=t.program_id
  LEFT JOIN dc.program_apply a ON (a.program_id,a.student_uid)=(t.program_id,t.student_uid)
 -- 중재자를 PK 로 못박는다. 정렬 유니크는 DEFERRABLE 이라 ON CONFLICT 의 중재자가 될 수 없다.
 ON CONFLICT (student_uid,id) DO NOTHING;

-- ── 3) 성장경험일지 ──────────────────────────────────────────────────────
-- growthJournal.seed.json 은 학생 ID 를 키로 갖는다 — 그 키가 소유자를 증명하는 유일한 근거다.
-- ID 는 학생마다 1,2,3… 으로 겹치므로 (source_path, student, legacy_id) 에서 결정적으로 새로 만든다.
INSERT INTO dc.growth_profile(student_uid)
SELECT DISTINCT p.intg_uid
  FROM dc.seed_source s, jsonb_each(s.payload) AS j(alias,entries)
  JOIN dc.person p ON p.alias=j.alias AND p.kind='STUDENT'
 WHERE s.path='src_v2/data/growthJournal.seed.json' AND jsonb_array_length(j.entries)>0
 ON CONFLICT (student_uid) DO NOTHING;

INSERT INTO dc.growth_entry(id,student_uid,kind_code,category_code,title,occurred_on,date_precision,
                            tags,content,bookmarked,resume_used,source_kind,legacy_ref,created_at,updated_at)
SELECT 'gje_'||substr(md5(s.path||':'||p.intg_uid||':'||(e->>'id')),1,20),p.intg_uid,'JOURNAL',
       CASE e->>'category' WHEN '아르바이트' THEN 'PARTTIME' WHEN '팀프로젝트' THEN 'TEAM_PROJECT'
                           ELSE 'ETC' END,
       e->>'title', NULLIF(e->>'date','')::date,
       CASE WHEN NULLIF(e->>'date','') IS NULL THEN 'UNKNOWN' ELSE 'DAY' END,
       ARRAY(SELECT jsonb_array_elements_text(COALESCE(e->'tags','[]'::jsonb))),
       jsonb_build_object('desc',e->>'desc','situation',e->>'situation','role',e->>'role',
                          'action',e->>'action','result',e->>'result','learning',e->>'learning',
                          'resumeMemo',e->>'resumeMemo'),
       COALESCE((e->>'bookmarked')::boolean,false),
       -- resumeUsed 는 학생이 손으로 켠 표식이다. 실제 채용 제출 이력이 아니므로 그대로 옮긴다.
       COALESCE((e->>'resumeUsed')::boolean,false),
       'IMPORTED',jsonb_build_object('sourcePath',s.path,'legacyId',e->>'id'),
       COALESCE(NULLIF(e->>'date','')::timestamptz,now()),COALESCE(NULLIF(e->>'date','')::timestamptz,now())
  FROM dc.seed_source s, jsonb_each(s.payload) AS j(alias,entries)
  JOIN dc.person p ON p.alias=j.alias AND p.kind='STUDENT',
       jsonb_array_elements(j.entries) AS e
 WHERE s.path='src_v2/data/growthJournal.seed.json'
   AND EXISTS(SELECT 1 FROM dc.growth_profile g WHERE g.student_uid=p.intg_uid)
 ON CONFLICT (id) DO NOTHING;

INSERT INTO dc.growth_event(student_uid,entry_id,action,entry_version_after,after_value,reason,transaction_id)
SELECT g.student_uid,g.id,'IMPORT',g.version,
       jsonb_build_object('kind',g.kind_code,'title',g.title,'source',g.legacy_ref),
       '시드 이관', ('00000000-0000-4000-8000-'||lpad(to_hex(hashtext('growth-import-026')&2147483647),12,'0'))::uuid
  FROM dc.growth_entry g
 WHERE g.source_kind='IMPORTED'
   AND NOT EXISTS(SELECT 1 FROM dc.growth_event v WHERE v.entry_id=g.id AND v.action='IMPORT');
