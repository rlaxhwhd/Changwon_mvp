-- 비교과 운영 — 신청·선발·출석·수료를 분리한다(spec_v1 §5.4 "신청/선발/출석/수료 분리").
-- 코드는 두 층이다(DB.md §8-5): 분류는 운영 코드(관리자 화면에서 추가·수정),
-- 상태·결과는 구조 코드(앱이 값으로 분기하므로 CHECK 로 고정하고 배포로만 바뀐다).
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order) VALUES
 ('PROGRAM_CATEGORY','비교과 분류','OPERATIONAL',false,40),
 ('PROGRAM_STATUS','비교과 모집 상태','STRUCTURAL',true,41),
 ('PROGRAM_SELECTION','비교과 선발 상태','STRUCTURAL',true,42),
 ('PROGRAM_ATTENDANCE','비교과 출석 상태','STRUCTURAL',true,43),
 ('PROGRAM_OUTCOME','비교과 이수 결과','STRUCTURAL',true,44);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('PROGRAM_CATEGORY','CAREER','진로',0),
 ('PROGRAM_CATEGORY','EMPLOY','취업',1),
 ('PROGRAM_CATEGORY','LANGUAGE','어학',2),
 ('PROGRAM_CATEGORY','STARTUP','창업',3),
 ('PROGRAM_CATEGORY','CERT','자격증',4),
 ('PROGRAM_CATEGORY','ETC','기타',5),
 ('PROGRAM_STATUS','RECRUITING','모집중',0),
 ('PROGRAM_STATUS','CLOSED','모집마감',1),
 ('PROGRAM_STATUS','ENDED','종료',2),
 ('PROGRAM_SELECTION','PENDING','대기',0),
 ('PROGRAM_SELECTION','SELECTED','선발',1),
 ('PROGRAM_SELECTION','REJECTED','탈락',2),
 ('PROGRAM_SELECTION','CANCELLED','취소',3),
 ('PROGRAM_ATTENDANCE','UNKNOWN','미확인',0),
 ('PROGRAM_ATTENDANCE','PRESENT','출석',1),
 ('PROGRAM_ATTENDANCE','NO_SHOW','노쇼',2),
 ('PROGRAM_OUTCOME','COMPLETED','수료',0),
 ('PROGRAM_OUTCOME','NOT_COMPLETED','미수료',1),
 ('PROGRAM_OUTCOME','ATTENDED','참석',2),
 ('PROGRAM_OUTCOME','ABSENT','불참',3);

-- 공고 속성을 payload jsonb 에서 열로 끌어올린다. 목록 필터·마감 판정·통계가
-- jsonb 안을 뒤지지 않아야 인덱스와 제약이 붙는다.
ALTER TABLE dc.program
 ADD COLUMN summary text NOT NULL DEFAULT '',
 ADD COLUMN detail text,
 ADD COLUMN category_code text,
 ADD COLUMN category_group text GENERATED ALWAYS AS ('PROGRAM_CATEGORY') STORED,
 ADD COLUMN status_code text NOT NULL DEFAULT 'RECRUITING'
   CHECK(status_code IN ('RECRUITING','CLOSED','ENDED')),
 ADD COLUMN apply_start date,
 ADD COLUMN apply_end date,
 ADD COLUMN run_start date,
 ADD COLUMN run_end date,
 ADD COLUMN sessions integer NOT NULL DEFAULT 1 CHECK(sessions BETWEEN 1 AND 999),
 ADD COLUMN manager text NOT NULL DEFAULT '',
 ADD COLUMN fiscal_year text NOT NULL DEFAULT '',
 ADD COLUMN location text NOT NULL DEFAULT '',
 ADD COLUMN image text,
 ADD COLUMN pinned boolean NOT NULL DEFAULT false,
 ADD COLUMN roadmap_entry text NOT NULL DEFAULT 'NONE'
   CHECK(roadmap_entry IN ('NONE','RECOMMEND','REQUIRED')),
 ADD COLUMN care_types text[] NOT NULL DEFAULT '{}'
   CHECK(care_types <@ ARRAY['T1','T2','T3','T4','T5','T6']),
 ADD COLUMN satisfaction_survey boolean NOT NULL DEFAULT false,
 ADD COLUMN satisfaction_form_id text,
 ADD COLUMN competency_survey boolean NOT NULL DEFAULT false,
 ADD COLUMN competency_areas text[] NOT NULL DEFAULT '{}',
 ADD COLUMN include_in_stats boolean NOT NULL DEFAULT true,
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN created_by text REFERENCES dc.person,
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN updated_by text REFERENCES dc.person,
 ADD CONSTRAINT program_apply_period CHECK(apply_end IS NULL OR apply_start IS NULL OR apply_end>=apply_start),
 ADD CONSTRAINT program_run_period CHECK(run_end IS NULL OR run_start IS NULL OR run_end>=run_start),
 -- 로드맵 편입은 대상 유형이 있어야 성립한다. 유형 없이 편입하면 붙을 학생이 없다.
 ADD CONSTRAINT program_entry_needs_types
   CHECK(roadmap_entry='NONE' OR array_length(care_types,1)>=1);

-- 적재된 공고를 새 열로 옮긴다. 원본 JSON 은 dc.seed_source 가 계속 보관한다.
UPDATE dc.program SET
 summary=COALESCE(payload->>'desc',''),
 detail=payload->>'detail',
 category_code=(SELECT code FROM dc.code_item WHERE group_code='PROGRAM_CATEGORY' AND label=category),
 status_code=COALESCE((SELECT code FROM dc.code_item WHERE group_code='PROGRAM_STATUS' AND label=status_label),'RECRUITING'),
 apply_start=NULLIF(payload->>'startDate','')::date,
 apply_end=NULLIF(payload->>'endDate','')::date,
 run_start=NULLIF(payload->>'runStartDate','')::date,
 run_end=NULLIF(payload->>'runEndDate','')::date,
 sessions=COALESCE(NULLIF(payload->>'sessions','')::integer,1),
 manager=COALESCE(payload->>'manager',''),
 fiscal_year=COALESCE(payload->>'fiscalYear',''),
 location=COALESCE(payload->>'location',''),
 image=payload->>'image',
 pinned=COALESCE((payload->>'pinned')::boolean,false),
 roadmap_entry=COALESCE(payload->>'roadmapEntry','NONE'),
 care_types=COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'careTypes')),'{}'),
 satisfaction_survey=COALESCE((payload->>'satisfactionSurvey')::boolean,false),
 satisfaction_form_id=payload->>'satisfactionFormId',
 competency_survey=COALESCE((payload->>'competencySurvey')::boolean,false),
 competency_areas=COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'competencyAreas')),'{}'),
 include_in_stats=COALESCE((payload->>'includeInStats')::boolean,true),
 created_at=COALESCE(NULLIF(payload->>'createdAt','')::timestamptz,now());

-- 매핑되지 않은 분류가 있으면 여기서 실패한다. 조용히 기본값으로 밀어 넣지 않는다.
ALTER TABLE dc.program
 ALTER COLUMN category_code SET NOT NULL,
 ADD CONSTRAINT program_category_fk FOREIGN KEY(category_group,category_code)
   REFERENCES dc.code_item(group_code,code);
-- 한글 라벨 열과 중복 payload 는 정본이 두 곳이 되는 원인이다(CURRENT.md #10).
ALTER TABLE dc.program DROP COLUMN category, DROP COLUMN status_label, DROP COLUMN payload;
CREATE INDEX program_listing ON dc.program(status_code,pinned DESC,created_at DESC);

-- 신청 1행이 신청·선발·출석·결과를 한 칸(outcome)에 뭉쳐 갖고 있었다. 넷은 서로 다른
-- 시점에 서로 다른 담당자가 정하는 값이라 분리한다.
ALTER TABLE dc.program_apply
 ADD COLUMN round_no integer NOT NULL DEFAULT 1 CHECK(round_no BETWEEN 1 AND 999),
 ADD COLUMN selection_code text NOT NULL DEFAULT 'PENDING'
   CHECK(selection_code IN ('PENDING','SELECTED','REJECTED','CANCELLED')),
 ADD COLUMN selected_at timestamptz,
 ADD COLUMN attendance_code text NOT NULL DEFAULT 'UNKNOWN'
   CHECK(attendance_code IN ('UNKNOWN','PRESENT','NO_SHOW')),
 ADD COLUMN outcome_code text CHECK(outcome_code IN ('COMPLETED','NOT_COMPLETED','ATTENDED','ABSENT')),
 ADD COLUMN absence_points integer NOT NULL DEFAULT 0 CHECK(absence_points BETWEEN 0 AND 3),
 ADD COLUMN cancelled_at timestamptz,
 ADD COLUMN apply_path text,
 ADD COLUMN motive text,
 ADD COLUMN consents jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN updated_by text REFERENCES dc.person,
 ADD CONSTRAINT apply_selected_at CHECK((selection_code='SELECTED')=(selected_at IS NOT NULL)),
 -- 결과는 선발된 신청에만 붙는다. 선발하지 않은 학생에게 수료가 남으면 통계가 거짓이 된다.
 ADD CONSTRAINT apply_outcome_needs_selection CHECK(outcome_code IS NULL OR selection_code='SELECTED'),
 ADD CONSTRAINT apply_points_need_absence CHECK(absence_points=0 OR outcome_code='ABSENT');

UPDATE dc.program_apply SET
 round_no=COALESCE(NULLIF(snapshot->>'round','')::integer,1),
 attendance_code=COALESCE((SELECT code FROM dc.code_item WHERE group_code='PROGRAM_ATTENDANCE'
   AND label=snapshot->>'attendance'),'UNKNOWN'),
 selection_code=COALESCE((SELECT code FROM dc.code_item WHERE group_code='PROGRAM_SELECTION'
   AND label=snapshot->>'selectionStatus'),'PENDING'),
 selected_at=NULLIF(snapshot->>'selectedAt','')::timestamptz,
 cancelled_at=NULLIF(snapshot->>'canceledAt','')::timestamptz;
-- 선발인데 시점이 없던 적재분은 신청 시점으로 채운다(제약을 만족시키되 값을 지어내지 않는다).
UPDATE dc.program_apply SET selected_at=applied_at WHERE selection_code='SELECTED' AND selected_at IS NULL;
ALTER TABLE dc.program_apply DROP COLUMN outcome;
COMMENT ON COLUMN dc.program_apply.snapshot IS '신청 시점 학적 스냅샷(CLAUDE.md 규칙 2). 상태값은 여기 두지 않는다.';
CREATE INDEX program_apply_student ON dc.program_apply(student_uid);

-- 신청 이력. 행이 삭제돼도 남아야 하므로 신청을 FK 로 참조하지 않는다.
CREATE TABLE dc.program_apply_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 program_id text NOT NULL, student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 action text NOT NULL CHECK(action IN ('APPLY','CANCEL','SELECTION','ATTENDANCE','OUTCOME','REMOVE')),
 before_value jsonb, after_value jsonb NOT NULL, reason text NOT NULL DEFAULT '',
 changed_by text NOT NULL REFERENCES dc.person, changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX program_apply_event_target ON dc.program_apply_event(program_id,student_uid,changed_at DESC);
CREATE TRIGGER program_apply_event_immutable BEFORE UPDATE OR DELETE ON dc.program_apply_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- 벌점은 합계 열을 두지 않는다. 부여·회수를 모두 행으로 쌓고 합으로 읽는다
-- (CLAUDE.md 규칙 11 append-only · CURRENT.md #2 "변경 이력이 없다"의 교정).
-- 과거 이력은 현재 카탈로그에 없는 프로그램을 가리키므로 FK 를 걸지 않고
-- 제목을 스냅샷으로 남긴다(dc.student_program_history 와 같은 규약).
CREATE TABLE dc.penalty_entry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 kind text NOT NULL CHECK(kind IN ('NOSHOW','MANUAL','WAIVE')),
 points integer NOT NULL CHECK(points BETWEEN -100 AND 100 AND points<>0),
 reason text NOT NULL,
 program_id text, program_title text,
 source text NOT NULL DEFAULT 'app' CHECK(source IN ('app','import')),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by text REFERENCES dc.person,
 CHECK(source='import' OR created_by IS NOT NULL),
 -- 회수는 음수, 부여는 양수. 부호가 뒤집히면 합계가 조용히 틀린다.
 CHECK((kind='WAIVE')=(points<0))
);
CREATE INDEX penalty_entry_student ON dc.penalty_entry(student_uid,created_at DESC);
CREATE TRIGGER penalty_entry_immutable BEFORE UPDATE OR DELETE ON dc.penalty_entry
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

CREATE VIEW dc.penalty_total AS
 SELECT student_uid, sum(points)::integer AS total, count(*)::integer AS entry_count,
        max(created_at) AS last_at
 FROM dc.penalty_entry GROUP BY student_uid;

-- 로스터에 박혀 있던 벌점을 이력 행으로 환원한다.
INSERT INTO dc.penalty_entry(student_uid,kind,points,reason,program_id,program_title,source,created_at)
SELECT s.intg_uid,
 CASE e->>'kind' WHEN 'noshow' THEN 'NOSHOW' WHEN 'waive' THEN 'WAIVE' ELSE 'MANUAL' END,
 (e->>'points')::integer, COALESCE(e->>'reason',''),
 e->>'programId', e->>'programTitle', 'import',
 COALESCE(NULLIF(e->>'at','')::timestamptz,now())
FROM dc.student s, jsonb_array_elements(COALESCE(s.roster->'penaltyEntries','[]'::jsonb)) e
WHERE (e->>'points')::integer<>0;

GRANT SELECT ON dc.program_apply_event,dc.penalty_entry,dc.penalty_total TO dc_app;
GRANT INSERT ON dc.program_apply_event,dc.penalty_entry TO dc_app;
GRANT DELETE ON dc.program,dc.program_apply TO dc_app;
