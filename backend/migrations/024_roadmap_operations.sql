-- 로드맵·IAP 운영 — 이미 있는 6테이블(002)을 정본으로 두고 전용 API 가 쓸 수 있게 보강한다.
--
-- 새 테이블은 사건 2개(roadmap_event · roadmap_request_event)뿐이다. 계획·축·칸·스냅샷·요청은
-- 002 의 것을 그대로 쓴다(CLAUDE.md 12조 재생성 금지).
--
-- 018(비교과)·022(채용)의 규약을 그대로 따른다:
--   · 분류는 운영 코드, 상태·전이는 구조 코드 — 생성열 group + (group,code) 복합 FK
--   · 이력은 append-only — dc.reject_history_change() 트리거 + INSERT/SELECT 권한만
--   · 쓰기는 version 낙관적 잠금, 중복은 Idempotency-Key
--
-- 이 도메인에만 있는 것 넷:
--   ① 세대(roadmap.version)와 편집 토큰(lock_version)이 다른 수다. 세대는 재생성마다,
--      편집 토큰은 칸 하나를 고쳐도 오른다. generation 컬럼을 새로 만들지 않는다.
--   ② 학생의 최종 유형은 여기 두지 않는다 — dc.student_type_event 가 정본이다.
--      계획에 복제하면 유형이 두 벌이 되고 곧 어긋난다.
--   ③ 「살아 있는 칸」 판정이 목록·상세·통계·스냅샷에 모두 필요하다 → SQL 함수 하나로 고정하고
--      뷰도 그 함수를 쓴다(CLAUDE.md 10조·13조). 술어를 두 벌로 두면 목록과 상세가 어긋난다.
--   ④ 「확정」은 참/거짓 2값이 아니라 초안 → 검토중 → 확정 3상태다(PROCESS.md §6-7).
--      기존 confirmed 는 status_code 의 생성열로 바꾼다 — 정본을 하나로 만든다.

-- ── 구조 코드 ────────────────────────────────────────────────────────────
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order) VALUES
 ('ROADMAP_STATUS','로드맵 상태','STRUCTURAL',true,70),
 ('ROADMAP_BASIS','로드맵 생성 근거','STRUCTURAL',true,71),
 ('ROADMAP_AXIS','로드맵 축','STRUCTURAL',true,72),
 ('ROADMAP_ITEM_STATUS','로드맵 칸 상태','STRUCTURAL',true,73),
 ('ROADMAP_ENTRY','로드맵 편입 구분','STRUCTURAL',true,74),
 ('ROADMAP_PRIORITY','로드맵 칸 우선순위','STRUCTURAL',true,75),
 ('ROADMAP_IMPORTANCE','로드맵 칸 중요도','STRUCTURAL',true,76),
 ('ROADMAP_ITEM_ORIGIN','로드맵 칸 생성 경로','STRUCTURAL',true,77),
 ('ROADMAP_COMPLETION_SOURCE','로드맵 칸 완료 근거','STRUCTURAL',true,78),
 ('ROADMAP_REQUEST_STATUS','로드맵 변경요청 상태','STRUCTURAL',true,79);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('ROADMAP_STATUS','DRAFT','초안',0),
 ('ROADMAP_STATUS','REVIEW','검토중',1),
 ('ROADMAP_STATUS','CONFIRMED','확정',2),
 ('ROADMAP_BASIS','COUNSEL','상담',0),
 ('ROADMAP_BASIS','LEGACY_IMPORT','이관(근거 미확인)',1),
 ('ROADMAP_AXIS','IAP','IAP 실행',0),
 ('ROADMAP_AXIS','CORE','핵심역량 수행',1),
 ('ROADMAP_AXIS','GROWTH','내 성장 활동',2),
 ('ROADMAP_ITEM_STATUS','TODO','미수행',0),
 ('ROADMAP_ITEM_STATUS','DONE','수행 완료',1),
 ('ROADMAP_ENTRY','NONE','미편입',0),
 ('ROADMAP_ENTRY','RECOMMEND','추천',1),
 ('ROADMAP_ENTRY','REQUIRED','필수',2),
 ('ROADMAP_PRIORITY','P0','최우선',0),
 ('ROADMAP_PRIORITY','P1','우선',1),
 ('ROADMAP_PRIORITY','P2','보통',2),
 ('ROADMAP_IMPORTANCE','REQUIRED','필수',0),
 ('ROADMAP_IMPORTANCE','IMPORTANT','중요',1),
 ('ROADMAP_IMPORTANCE','RECOMMENDED','권장',2),
 ('ROADMAP_ITEM_ORIGIN','BASE','생성 기본 칸',0),
 ('ROADMAP_ITEM_ORIGIN','AUTO_PROGRAM','비교과 개설 편입',1),
 ('ROADMAP_COMPLETION_SOURCE','PROGRAM_OUTCOME','비교과 수료',0),
 ('ROADMAP_COMPLETION_SOURCE','MANUAL','상담사 수동 완료',1),
 ('ROADMAP_COMPLETION_SOURCE','LEGACY','이관(근거 미확인)',2),
 ('ROADMAP_REQUEST_STATUS','REQ','대기',0),
 ('ROADMAP_REQUEST_STATUS','APPLIED','반영완료',1),
 ('ROADMAP_REQUEST_STATUS','REJECTED','반려',2);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('AI_RUN_KIND','ROADMAP_GENERATION','로드맵 생성',6);

-- AI 근거의 재현 가능성. 기존 run 은 NULL 이고 사후에 채우지 않는다(append-only).
-- schema_version 이 붙은 새 run 부터 입력 근거를 반드시 갖는다.
ALTER TABLE dc.ai_run
 ADD COLUMN input_snapshot jsonb,
 ADD COLUMN input_hash text,
 ADD COLUMN schema_version smallint,
 ADD COLUMN source_ref jsonb,
 ADD CONSTRAINT ai_run_provenance
   CHECK(schema_version IS NULL OR (input_hash IS NOT NULL AND input_snapshot IS NOT NULL));

-- ── 계획 ─────────────────────────────────────────────────────────────────
-- 상담 근거는 학생까지 묶는 복합 FK 다. id 만으로 걸면 다른 학생의 상담을 붙일 수 있다.
ALTER TABLE dc.counsel_request ADD CONSTRAINT counsel_request_student_key UNIQUE(id,student_uid);

ALTER TABLE dc.roadmap
 ADD COLUMN lock_version bigint NOT NULL DEFAULT 1 CHECK(lock_version>0),
 ADD COLUMN status_code text,
 ADD COLUMN status_group text GENERATED ALWAYS AS ('ROADMAP_STATUS') STORED,
 ADD COLUMN basis_kind text NOT NULL DEFAULT 'LEGACY_IMPORT',
 ADD COLUMN basis_group text GENERATED ALWAYS AS ('ROADMAP_BASIS') STORED,
 ADD COLUMN counsel_request_id text,
 ADD COLUMN ai_run_id text REFERENCES dc.ai_run(id),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN updated_by text REFERENCES dc.person(intg_uid),
 -- 기존 true 의 시각·행위자를 모른다. 이관 시각을 확정 시각으로 꾸미지 않는다.
 ADD COLUMN confirmed_at timestamptz,
 ADD COLUMN confirmed_by text REFERENCES dc.person(intg_uid);

-- confirmed(2값) → status_code(3값). 순서를 지키지 않으면 seed 의 INSERT 가 죽는다.
UPDATE dc.roadmap SET status_code=CASE WHEN confirmed THEN 'CONFIRMED' ELSE 'DRAFT' END;
ALTER TABLE dc.roadmap DROP COLUMN confirmed;
ALTER TABLE dc.roadmap
 ALTER COLUMN status_code SET NOT NULL,
 ADD COLUMN confirmed boolean GENERATED ALWAYS AS (status_code='CONFIRMED') STORED,
 ADD CONSTRAINT roadmap_status_fk FOREIGN KEY(status_group,status_code) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_basis_fk FOREIGN KEY(basis_group,basis_kind) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_counsel_fk FOREIGN KEY(counsel_request_id,student_uid)
   REFERENCES dc.counsel_request(id,student_uid) ON DELETE RESTRICT,
 -- 상담 근거가 있는 계획만 COUNSEL 이다. 근거 없는 이관분을 상담 근거로 승격하지 않는다.
 ADD CONSTRAINT roadmap_basis_needs_counsel CHECK((basis_kind='COUNSEL')=(counsel_request_id IS NOT NULL));
CREATE INDEX roadmap_status ON dc.roadmap(status_code,updated_at DESC,student_uid);
CREATE INDEX roadmap_counsel ON dc.roadmap(counsel_request_id) WHERE counsel_request_id IS NOT NULL;

ALTER TABLE dc.roadmap_axis
 ADD COLUMN axis_group text GENERATED ALWAYS AS ('ROADMAP_AXIS') STORED,
 -- AI 원문은 ai_suggestion 이 갖고, 사람이 고친 문구는 headline/editor_note 다.
 ADD COLUMN ai_suggestion_id bigint REFERENCES dc.ai_suggestion(id),
 ADD COLUMN editor_note text NOT NULL DEFAULT '',
 ADD CONSTRAINT roadmap_axis_code_fk FOREIGN KEY(axis_group,axis) REFERENCES dc.code_item(group_code,code);

-- ── 계획 사건 ────────────────────────────────────────────────────────────
-- roadmap_item_event 는 칸 하나의 before/after 만 담는다. 계획 전체의 사건(생성·재생성·
-- 확정·상담 연결·프로그램 편입)을 담을 자리가 없어 가짜 item_id 로 밀어 넣게 된다 —
-- 그래서 계획 단위 사건 테이블을 따로 둔다.
CREATE TABLE dc.roadmap_event (
 id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_uid        text NOT NULL REFERENCES dc.student(intg_uid),
 roadmap_version    integer NOT NULL CHECK(roadmap_version>0),
 lock_version_before bigint, lock_version_after bigint,
 action_code        text NOT NULL CHECK(action_code IN
   ('CREATE','REGENERATE','EDIT','REVIEW','CONFIRM','REOPEN','PROGRAM_INSERT','PROGRAM_EXPIRE',
    'ITEM_COMPLETION','REQUEST_APPLIED','RESTORE_EDIT','IMPORT')),
 cause_kind         text, cause_id text,
 actor_uid          text REFERENCES dc.person(intg_uid),
 before_value       jsonb, after_value jsonb NOT NULL,
 reason             text NOT NULL DEFAULT '',
 transaction_id     uuid NOT NULL,
 occurred_at        timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_uid,id),
 CONSTRAINT roadmap_event_cause_pair CHECK((cause_kind IS NULL)=(cause_id IS NULL)),
 -- 시스템 계정을 새로 만들지 않는다(DB.md §3-4). 자동 편입의 행위자는 프로그램을 개설한
 -- 교직원 본인이고, 이관분만 행위자를 모른다.
 CONSTRAINT roadmap_event_actor CHECK(action_code='IMPORT' OR actor_uid IS NOT NULL)
);
CREATE INDEX roadmap_event_timeline ON dc.roadmap_event(student_uid,occurred_at DESC,id);
CREATE TRIGGER roadmap_event_immutable BEFORE UPDATE OR DELETE ON dc.roadmap_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 칸 ───────────────────────────────────────────────────────────────────
-- position 이 0부터였다. 축마다 1~5 로 정규화한다 — 자동 편입 칸은 6 이상을 쓴다.
UPDATE dc.roadmap_item SET position=position+1;
-- 한글 중요도를 코드로 옮긴다(CLAUDE.md 4조). 매핑되지 않는 값이 있으면 아래 FK 에서
-- 실패한다 — 조용히 기본값으로 밀어 넣지 않는다(018 program_category_fk 와 같은 규약).
UPDATE dc.roadmap_item SET importance=CASE importance
  WHEN '필수' THEN 'REQUIRED' WHEN '중요' THEN 'IMPORTANT' WHEN '권장' THEN 'RECOMMENDED'
  ELSE importance END;
-- 추천 칸의 만료는 「신청 마감일 다음 날 00:00 (Asia/Seoul)」의 배타 상한이다.
-- 브라우저가 붙이던 `${endDate}T23:59:59`(타임존 없음)는 경계가 흔들린다.
UPDATE dc.roadmap_item SET expires_at=date_trunc('day',expires_at AT TIME ZONE 'Asia/Seoul')
  AT TIME ZONE 'Asia/Seoul' + interval '1 day'
 WHERE entry='RECOMMEND' AND expires_at IS NOT NULL;

ALTER TABLE dc.roadmap_item
 ADD COLUMN status_group text GENERATED ALWAYS AS ('ROADMAP_ITEM_STATUS') STORED,
 ADD COLUMN entry_group text GENERATED ALWAYS AS ('ROADMAP_ENTRY') STORED,
 ADD COLUMN priority_group text GENERATED ALWAYS AS ('ROADMAP_PRIORITY') STORED,
 ADD COLUMN importance_group text GENERATED ALWAYS AS ('ROADMAP_IMPORTANCE') STORED,
 ADD COLUMN origin_code text NOT NULL DEFAULT 'BASE',
 ADD COLUMN origin_group text GENERATED ALWAYS AS ('ROADMAP_ITEM_ORIGIN') STORED,
 ADD COLUMN completed_at timestamptz,
 ADD COLUMN completion_source_code text,
 ADD COLUMN completion_source_group text GENERATED ALWAYS AS ('ROADMAP_COMPLETION_SOURCE') STORED,
 ADD COLUMN completion_ref jsonb,
 -- 이관 시각을 생성 시각으로 위조하지 않는다 — 기존 30행은 「모름」(NULL)이다.
 ADD COLUMN created_at timestamptz,
 ADD COLUMN ai_suggestion_id bigint REFERENCES dc.ai_suggestion(id),
 ADD COLUMN editor_note text NOT NULL DEFAULT '',
 ADD COLUMN entry_event_id uuid;
UPDATE dc.roadmap_item SET completion_source_code='LEGACY' WHERE status='DONE';
ALTER TABLE dc.roadmap_item
 ADD CONSTRAINT roadmap_item_status_fk FOREIGN KEY(status_group,status) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_item_entry_fk FOREIGN KEY(entry_group,entry) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_item_priority_fk FOREIGN KEY(priority_group,priority) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_item_importance_fk FOREIGN KEY(importance_group,importance) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_item_origin_fk FOREIGN KEY(origin_group,origin_code) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_item_completion_fk FOREIGN KEY(completion_source_group,completion_source_code)
   REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_item_entry_event_fk FOREIGN KEY(student_uid,entry_event_id)
   REFERENCES dc.roadmap_event(student_uid,id) DEFERRABLE INITIALLY DEFERRED,
 ADD CONSTRAINT roadmap_item_position CHECK(position>0),
 -- 완료 근거는 완료 칸에만 있다. 미완료 칸에 근거가 남으면 이행률 감사를 못 한다.
 ADD CONSTRAINT roadmap_item_completion_pair CHECK((status='DONE')=(completion_source_code IS NOT NULL)),
 ADD CONSTRAINT roadmap_item_completion_time
   CHECK(completion_source_code IS NULL OR completion_source_code='LEGACY' OR completed_at IS NOT NULL),
 -- 자동 편입 칸은 IAP 축에만 붙고 프로그램과 편입 구분을 반드시 갖는다.
 ADD CONSTRAINT roadmap_item_auto_shape CHECK(origin_code<>'AUTO_PROGRAM'
   OR (axis='IAP' AND program_id IS NOT NULL AND entry IN ('RECOMMEND','REQUIRED'))),
 -- 새로 붙는 추천 칸은 마감(=만료)이 반드시 있다. 기존 결측은 위 조건이 아니라
 -- origin=BASE 로 남아 이 제약을 우회하지 않는다.
 ADD CONSTRAINT roadmap_item_recommend_expiry CHECK(origin_code<>'AUTO_PROGRAM'
   OR entry<>'RECOMMEND' OR expires_at IS NOT NULL);
-- 정렬 유일성. 재생성은 15칸을 통째로 갈아끼우므로 커밋 시점에 검사한다.
ALTER TABLE dc.roadmap_item ADD CONSTRAINT roadmap_item_slot UNIQUE(student_uid,axis,position)
 DEFERRABLE INITIALLY DEFERRED;
-- 현재 세대에서 프로그램당 자동 칸은 하나다. 세대 교체 시 칸을 갈아끼우므로
-- 칸에 generation 을 두지 않아도 이 부분 유니크가 같은 뜻이 된다.
CREATE UNIQUE INDEX roadmap_item_auto_program ON dc.roadmap_item(student_uid,program_id)
 WHERE origin_code='AUTO_PROGRAM';
CREATE INDEX roadmap_item_program ON dc.roadmap_item(program_id,student_uid) WHERE program_id IS NOT NULL;
CREATE INDEX roadmap_item_expiry ON dc.roadmap_item(expires_at)
 WHERE entry='RECOMMEND' AND expires_at IS NOT NULL;

-- ── 칸 사건 ──────────────────────────────────────────────────────────────
-- 기존 행은 세대·행위·인과를 모른다. 없는 값을 추정해 UPDATE 하지 않는다 —
-- schema_version 으로 「그때는 이만큼만 남겼다」를 표시하고 새 행에만 필수를 건다.
ALTER TABLE dc.roadmap_item_event
 ADD COLUMN schema_version smallint NOT NULL DEFAULT 1,
 ADD COLUMN roadmap_version integer,
 ADD COLUMN action_code text CHECK(action_code IN
   ('CREATE','EDIT','REPLACE','REMOVE','COMPLETE','REOPEN','PROGRAM_INSERT','PROGRAM_SYNC')),
 ADD COLUMN cause_kind text, ADD COLUMN cause_id text,
 ADD COLUMN item_version_before integer, ADD COLUMN item_version_after integer,
 ADD COLUMN transaction_id uuid,
 ADD CONSTRAINT roadmap_item_event_student_fk FOREIGN KEY(student_uid) REFERENCES dc.student(intg_uid),
 ADD CONSTRAINT roadmap_item_event_shape CHECK(schema_version=1
   OR (roadmap_version IS NOT NULL AND action_code IS NOT NULL AND actor_uid IS NOT NULL
       AND transaction_id IS NOT NULL));
CREATE INDEX roadmap_item_event_timeline ON dc.roadmap_item_event(student_uid,created_at DESC,id);

-- ── 변경 요청 ────────────────────────────────────────────────────────────
-- 화면은 대기/반영완료/반려, DB 는 REQ/APPROVED 로 어긋나 있었다. 코드를 정본으로 맞춘다.
UPDATE dc.roadmap_request SET status_code=CASE status_code
  WHEN '대기' THEN 'REQ' WHEN '반영완료' THEN 'APPLIED' WHEN '반려' THEN 'REJECTED'
  WHEN 'APPROVED' THEN 'APPLIED' ELSE status_code END;
ALTER TABLE dc.roadmap_request
 ALTER COLUMN axis DROP NOT NULL,
 ADD COLUMN axis_group text GENERATED ALWAYS AS ('ROADMAP_AXIS') STORED,
 ADD COLUMN status_group text GENERATED ALWAYS AS ('ROADMAP_REQUEST_STATUS') STORED,
 ADD COLUMN roadmap_version integer,
 ADD COLUMN target_item_id text,
 ADD COLUMN handled_at timestamptz,
 ADD COLUMN handled_by text REFERENCES dc.person(intg_uid),
 -- 사유 필수화는 아직 정하지 않았다(DB.md #21). 나중에 필수로 바꿔도 마이그레이션이 필요 없게
 -- NOT NULL DEFAULT '' 로 두고 API 가 선택으로 받는다.
 ADD COLUMN handling_note text NOT NULL DEFAULT '',
 ADD COLUMN applied_event_id uuid;
-- 처리 시각을 먼저 채운 뒤에 제약을 건다. payload 에 없으면 신청 시각으로 두고 없는 시각을
-- 지어내지 않는다 — 그러면 언제 처리됐는지 안다고 거짓말하게 된다.
UPDATE dc.roadmap_request SET handled_at=COALESCE(NULLIF(payload->>'handledAt','')::timestamptz,requested_at)
 WHERE status_code<>'REQ' AND handled_at IS NULL;
ALTER TABLE dc.roadmap_request
 ADD CONSTRAINT roadmap_request_axis_fk FOREIGN KEY(axis_group,axis) REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_request_status_fk FOREIGN KEY(status_group,status_code)
   REFERENCES dc.code_item(group_code,code),
 ADD CONSTRAINT roadmap_request_applied_fk FOREIGN KEY(student_uid,applied_event_id)
   REFERENCES dc.roadmap_event(student_uid,id) DEFERRABLE INITIALLY DEFERRED,
 -- legacy APPLIED 에 실제 수정 사건을 꾸며 붙이지 않는다 → applied_event_id 는 NULL 을 허용한다.
 ADD CONSTRAINT roadmap_request_handled CHECK((status_code='REQ')=(handled_at IS NULL));
CREATE INDEX roadmap_request_student ON dc.roadmap_request(student_uid,status_code,requested_at DESC,id);
CREATE INDEX roadmap_request_queue ON dc.roadmap_request(status_code,requested_at DESC,id);

CREATE TABLE dc.roadmap_request_event (
 id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id     text NOT NULL REFERENCES dc.roadmap_request(id) ON DELETE RESTRICT,
 student_uid    text NOT NULL REFERENCES dc.student(intg_uid),
 action         text NOT NULL CHECK(action IN ('CREATE','APPLY','REJECT','RETARGET','IMPORT')),
 status_before  text, status_after text NOT NULL,
 version_before integer, version_after integer,
 actor_uid      text REFERENCES dc.person(intg_uid),
 reason         text NOT NULL DEFAULT '',
 transaction_id uuid NOT NULL,
 created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX roadmap_request_event_timeline ON dc.roadmap_request_event(request_id,created_at DESC,id);
CREATE TRIGGER roadmap_request_event_immutable BEFORE UPDATE OR DELETE ON dc.roadmap_request_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 살아 있는 칸 · 이행률 ────────────────────────────────────────────────
-- 술어는 여기 한 벌뿐이다. 목록 뷰·상세 API·통계·스냅샷이 전부 이 함수를 부른다.
-- expires_at 이 NULL 인 추천 칸은 살아 있다(005·프론트 schema/roadmap.ts 와 같은 판정) —
-- 배타 조건으로 바꾸면 기존 추천 칸이 조용히 죽어 이행률 분모가 흔들린다.
CREATE FUNCTION dc.roadmap_item_alive(status text, entry text, expires_at timestamptz, as_of timestamptz)
 RETURNS boolean LANGUAGE sql IMMUTABLE AS
$$ SELECT status='DONE' OR entry<>'RECOMMEND' OR expires_at IS NULL OR as_of<expires_at $$;

CREATE FUNCTION dc.roadmap_progress(p_student text, p_as_of timestamptz)
 RETURNS TABLE(done integer, total integer, pct integer) LANGUAGE sql STABLE AS
$$ SELECT count(*) FILTER(WHERE status='DONE')::integer, count(*)::integer,
          COALESCE(round(100.0*count(*) FILTER(WHERE status='DONE')/NULLIF(count(*),0))::integer,0)
     FROM dc.roadmap_item
    WHERE student_uid=p_student AND dc.roadmap_item_alive(status,entry,expires_at,p_as_of) $$;

-- 목록 뷰가 자기만의 술어를 갖고 있었고 roster JSON 폴백까지 있어, 상세와 다른 수를 보여줄 수
-- 있었다. 같은 함수로 갈아끼우고 폴백을 걷는다 — 미생성은 숫자 시드가 아니라 has_roadmap=false 다.
CREATE OR REPLACE VIEW dc.student_list AS
SELECT p.intg_uid,p.alias,p.name,s.student_no,s.major_label,s.grade,
       COALESCE(t.student_type,s.detail->>'studentType',s.roster->>'studentType') AS student_type,
       c.tier_label AS tier,c.label AS type_label,
       COALESCE(s.detail->>'enrollmentStatus',s.roster->>'status','재학') AS status,
       COALESCE(s.detail->>'gpa',s.roster->>'gpa') AS gpa,
       COALESCE(r.pct,0) AS progress,
       COALESCE((s.roster->>'programCount')::integer,0) AS program_count,
       COALESCE((s.roster->>'counselCount')::integer,0) AS counsel_count,
       s.roster,s.detail,(st.student_uid IS NOT NULL) AS star,
       EXISTS(SELECT 1 FROM dc.roadmap WHERE student_uid=s.intg_uid) AS has_roadmap
FROM dc.student s JOIN dc.person p USING(intg_uid)
LEFT JOIN LATERAL (SELECT student_type FROM dc.student_type_event WHERE student_uid=s.intg_uid ORDER BY decided_at DESC,id DESC LIMIT 1) t ON true
LEFT JOIN dc.student_type_code c ON c.code=COALESCE(t.student_type,s.detail->>'studentType',s.roster->>'studentType')
LEFT JOIN dc.star_track st ON st.student_uid=s.intg_uid
LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid,now()) r ON true;

-- ── 확정 계획의 모양 ─────────────────────────────────────────────────────
-- 3축 × 기본 5칸은 확정된 계획에서만 강제한다. 초안은 만들다 만 상태를 저장할 수 있어야
-- 하고(PROCESS.md §6-7), 재생성은 15칸을 통째로 갈아끼우므로 커밋 시점에 검사한다.
CREATE FUNCTION dc.roadmap_shape_valid() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE uid text;
BEGIN
  IF TG_OP='DELETE' THEN uid := OLD.student_uid; ELSE uid := NEW.student_uid; END IF;
  IF NOT EXISTS(SELECT 1 FROM dc.roadmap WHERE student_uid=uid AND status_code='CONFIRMED') THEN
    RETURN NULL;
  END IF;
  IF (SELECT count(*) FROM dc.roadmap_axis WHERE student_uid=uid)<>3 THEN
    RAISE EXCEPTION '확정된 로드맵은 3축이어야 합니다.' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM dc.roadmap_axis a WHERE a.student_uid=uid AND 5<>
      (SELECT count(*) FROM dc.roadmap_item i
        WHERE i.student_uid=uid AND i.axis=a.axis AND i.origin_code='BASE')) THEN
    RAISE EXCEPTION '확정된 로드맵은 축마다 기본 5칸이어야 합니다.' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER roadmap_shape AFTER INSERT OR UPDATE OR DELETE ON dc.roadmap
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.roadmap_shape_valid();
CREATE CONSTRAINT TRIGGER roadmap_axis_shape AFTER INSERT OR UPDATE OR DELETE ON dc.roadmap_axis
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.roadmap_shape_valid();
CREATE CONSTRAINT TRIGGER roadmap_item_shape AFTER INSERT OR UPDATE OR DELETE ON dc.roadmap_item
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dc.roadmap_shape_valid();

-- ── 권한 ─────────────────────────────────────────────────────────────────
-- 사건은 INSERT 만 준다. UPDATE/DELETE 는 트리거가 막고 grant 도 주지 않는다.
GRANT SELECT,INSERT ON dc.roadmap_event,dc.roadmap_request_event TO dc_app;
