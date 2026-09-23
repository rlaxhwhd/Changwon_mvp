# survey-forms(설문지 버전) DB 전환 작업지시서

- 상태: `PASS` <span>(팀장 검증 완료 2026-09-23)</span>
- revision: `2` <span>(rev1 → rev2 Astra 교정 2026-09-23 — §11 교정 내역)</span>
- 담당 구현: `TEAM_LEAD`(팀장 직접 구현 — 사용자와 실시간 Q&A로 설계 확정)
- 대상 handoff: `.ai/handoff-db/0007-survey-forms/`
- 관련 화면/기능: `/admin/system/surveys`(신설) · 프로그램 개설(영역 선택) · 학생 조사 응답 · 조사 통계 · 조사 엑셀

## 0. 사용자 확정 (2026-09-23)

문항·영역은 **사전(부품)**, 설문지는 그 부품을 **조립한 결과물**이다.

| 결정 | 내용 |
|---|---|
| 문장 수정 | 버전을 올리지 않고 사전에서 그 자리에서 고친다. 문항 코드가 값의 정체성이고, 응답 행이 `item_version` 을 이미 갖고 있어 그때의 문장은 `code_item_event` 로 추적된다 |
| 구성 변경 | 문항·영역을 넣고 빼는 것은 **새 설문지 버전**으로만. 「새 설문지 만들기 → 영역 선택 → 영역별 문항 선택 → 게시」 |
| 버전 갈래 (Q4b) | **역량(COMPETENCY)** 과 **만족도(SATISFACTION)** 두 갈래를 각각 v1, v2… 로 올린다. 개편 주기가 다르다 |
| 프로그램 고정 (Q6a) | 프로그램 **개설 시점**의 게시 버전을 붙잡고 끝까지 바꾸지 않는다. 사전·사후가 같은 문항이어야 한다 |
| 게시본 수정 (Q7b) | 그 버전으로 들어온 응답이 **0건이면** 구성 수정 허용, 1건이라도 생기면 잠금 |
| 설문지 묶음 (Q3a) | 진로·직무·취업·만족도 4종 고정. 묶음 추가는 별도 작업 |
| 영역 관리 (Q2a) | 영역도 이 화면에서 등록·수정·비활성. 단 개설된 프로그램이 고른 영역은 비활성 금지 |
| 통계 | 통계·엑셀은 전부 프로그램 1개 단위이고 프로그램이 버전 하나를 붙잡으므로 자동으로 단일 버전이다. 화면에 기준 버전을 표시한다 |

### 0-1. 확정에서 파생되는 규칙 (Astra rev2 — 구현이 임의 판단하지 말 것)

1. **게시본이 사전(code_item)의 `is_active` 를 이긴다.** 프로그램이 붙잡은 form 의 렌더는 `survey_form_area`·`survey_form_item` 구성만 본다. 관리자가 사전에서 문항을 비활성해도 **이미 게시된 form 의 구성은 줄지 않는다.** `is_active` 는 "새 초안에 담을 수 있는 부품인가"만 가른다. 그러지 않으면 운영 중 프로그램의 사전·사후 문항이 달라져 §0 의 고정 약속이 깨진다.
2. **문장(label)·척도(payload.kind)는 항상 사전에서 실시간으로 읽는다.** 구성 테이블은 코드·순서만 들고 문장을 복사하지 않는다(§0 "문장 수정은 버전을 올리지 않는다"와 일치).
3. **「현재 게시본」의 정의: 같은 `kind` 의 `status='PUBLISHED'` 중 `version` 이 가장 큰 행.** 과거 게시본은 과거 프로그램이 계속 쓰므로 PUBLISHED 는 여러 벌 공존한다. 이 정의를 두 군데(프로그램 개설 pin, `/metadata`)에서 똑같이 쓴다.
4. **pin 은 서버가 정한다.** 프로그램 생성 요청 본문은 form id 를 받지 않는다(클라이언트가 과거 버전을 붙잡게 두지 않는다). 수정(`PUT /programs/{id}`)은 pin 을 건드리지 않는다.

## 1. 기존 계약

| 항목 | 경로/값 |
|---|---|
| 원본 mock JSON | 없음 — DB 정본(`dc.code_item`) |
| 현재 loader/selector | `shared/metadataStore` → `codeItems`; `src_admin/data/schema/program.ts` `competencySurveyGroups()` · `satisfactionSurveySummary()`; `shared/surveyStore.ts` |
| 현재 localStorage key | 없음 |
| 쓰는 화면 | `src_admin/pages/SystemManagement.tsx`(코드관리 탭 — 명칭·정렬·사용만) |
| 읽는 화면 | 프로그램 개설(`ProgramForm`), 학생 `src_v2/pages/mypage/ProgramSurvey.tsx`, `ProgramSurveyStats.tsx`, `ProgramSatisfaction.tsx`, 엑셀 3종 |
| 기존 API | `GET /metadata`(code_item 전량) · `PUT /system/code-groups/{group}/items/{code}` · `GET/POST /programs/{id}/survey/{phase}` · `.../survey/stats` · `.../survey/satisfaction/stats` · `.../survey/{phase}/export.xlsx` |
| 기존 table | `dc.code_item`(SURVEY_AREA 20 · SURVEY_ITEM 84) · `dc.survey_response` · `dc.survey_answer` · `dc.program` |

## 2. 데이터 요구

| 동작 | 읽기/쓰기 | 필드 | 소유자 | 권한 | 생명주기 |
|---|---|---|---|---|---|
| 영역·문항 등록/수정 | 쓰기 | code_item(label, sort_order, is_active, payload{group\|areaKey,kind}) | 시스템관리자 | `administrator` | 수정 이력 `code_item_event` |
| 설문지 초안 생성 | 쓰기 | kind, version, memo | 시스템관리자 | `administrator` | DRAFT 1개/갈래 |
| 설문지 구성 저장 | 쓰기 | (form_id, area_code, area_order) + (form_id, area_code, item_code, item_order) | 시스템관리자 | `administrator` | 게시 후 응답 생기면 잠금 |
| 설문지 게시 | 쓰기 | status, published_at/by | 시스템관리자 | `administrator` | 되돌리기 없음 |
| 프로그램 개설 | 쓰기 | program.competency_form_id / satisfaction_form_id — **서버가 현재 게시본으로 채운다** | 상담사·관리자 | 기존 프로그램 권한 | 개설 후 불변 |
| 학생 응답 문항 | 읽기 | 프로그램이 붙잡은 form 의 구성 ∩ program.competency_areas | — | 기존 | — |

## 3. 재사용 판정

- 판정: `CREATE_TABLE_AND_API` + `ALTER_EXISTING_TABLE` + `EXTEND_QUERY_OR_API`
- 재사용: 문항·영역 **사전**은 `dc.code_item`(SURVEY_AREA/SURVEY_ITEM) 그대로. 쓰기도 기존 `PUT /system/code-groups/...` 를 쓰되 payload 검증 분기만 연다. 응답·답변 테이블·권한·감사(`admin_event`)도 그대로.
- 새로 만드는 것: 설문지 버전(`dc.survey_form`), 그 영역(`dc.survey_form_area`), 영역별 문항(`dc.survey_form_item`). **독립 생명주기(초안→게시)·복수행·M:N(설문지×문항)·프로그램이 붙잡는 참조 대상**이라 code_item payload 로 표현할 수 없다.
- `dc.program` 에 버전 고정 컬럼 2개 추가.

### 3-1. ⚠️ `dc.program.satisfaction_form_id` 는 "죽은 컬럼"이 아니다 (Astra rev2 정정)

rev1 은 "프론트 타입 선언만 있고 쓰는 화면 없음"이라고 적었지만 **백엔드 쓰기 경로가 살아 있다.** 이름을 그대로 재사용하려면 아래 5곳을 같은 변경에서 함께 고쳐야 한다. 안 그러면 `102` 적용 즉시 프로그램 개설·수정·시드가 전부 깨진다.

| 파일 | 지금 | 해야 할 일 |
|---|---|---|
| `backend/app/programs.py:30` `WRITABLE` | `satisfaction_form_id` 가 쓰기 컬럼 목록에 있다 | 목록에서 **뺀다**(pin 은 본문으로 받지 않는다). `PROGRAM_COLUMNS` 에는 읽기용으로 `competency_form_id,satisfaction_form_id` 를 추가 |
| `backend/app/programs.py:51` `program_dto` | `'satisfactionFormId': row['satisfaction_form_id']` (str) | `competencyFormId`·`satisfactionFormId` 를 **int\|null** 로 내려보낸다 |
| `backend/app/programs.py:231` `ProgramBody` | `satisfactionFormId: str \| None` | **필드 삭제** (`extra='forbid'` 가 아니므로 옛 클라이언트가 보내도 무시된다) |
| `backend/app/programs.py:257` `program_values` | `body.satisfactionFormId` 를 INSERT/UPDATE 에 넘긴다 | 인자에서 뺀다 |
| `backend/app/seed_domains.py:112` | `satisfaction_form_id=row.get('satisfactionFormId')` | 줄 삭제(시드 JSON 에 이 키를 쓰는 행이 0건임을 확인했다) |
| `src_admin/data/schema/program.ts:212` | `satisfactionFormId?: string` | `competencyFormId?: number \| null` · `satisfactionFormId?: number \| null` (읽기 전용 주석) |

같은 이름 재사용 자체는 **안전하다** — 실데이터 0건이고 의미도 "이 프로그램의 만족도 양식"으로 이어진다. 다만 `102` 는 DROP 전에 **값이 있으면 실패하는 가드**를 반드시 넣는다(§4). 타입이 text→bigint 로 바뀌므로 가드 없이 DROP 하면 어떤 환경의 데이터든 조용히 사라진다.

## 4. DDL

**migration 을 둘로 나눈다** — DDL(`102`)과 backfill(`103`). backfill 은 `backend/app/seed.py` 가 시드 뒤에 **다시 돌려야** 하고(마이그레이션은 시드보다 먼저 돌아 프로그램이 0건이다), 다시 도는 파일에 `CREATE TABLE` 이 들어 있으면 안 된다. 기존 관례(`079`/`080`, `seed.py` 의 derived 재실행 목록)와 같다.

### 4-1. `backend/migrations/102_survey_forms.sql` — 스키마

```sql
-- 설문지(조립물) = 버전 + 영역 + 영역별 문항. 문항·영역 사전은 dc.code_item 이 정본이고
-- 여기에는 코드와 순서만 담는다 — 문장·척도는 항상 사전에서 실시간으로 읽는다(§0-1).
-- Rollback: 되돌리지 않는다. 문제가 생기면 새 migration 으로 고친다(roll-forward).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE dc.survey_form (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('COMPETENCY','SATISFACTION')),
  version      int  NOT NULL CHECK (version >= 1),          -- 설문지 버전(v1,v2…). 낙관적 잠금 아님
  status       text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  memo         text NOT NULL DEFAULT '' CHECK (length(memo) <= 1000),
  created_by   text REFERENCES dc.person,                    -- NULL = 시스템 적재(103)
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  published_by text REFERENCES dc.person,
  lock_version int NOT NULL DEFAULT 0,                       -- 낙관적 잠금 전용
  UNIQUE (kind, version),
  CHECK ((status='PUBLISHED') = (published_at IS NOT NULL))
);
-- 갈래마다 초안은 1개. 동시 POST 두 건이 같은 version 을 계산해도 여기서 하나가 막힌다.
CREATE UNIQUE INDEX survey_form_single_draft ON dc.survey_form(kind) WHERE status='DRAFT';
-- 「현재 게시본」(§0-1 정의) 한 줄 조회용.
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
  PRIMARY KEY (form_id, item_code),                          -- 한 설문지에 같은 문항 두 번 금지
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

-- 018 의 text 컬럼을 같은 이름의 bigint FK 로 갈아 끼운다. 값이 하나라도 있으면 멈춘다.
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
```

**pin 컬럼은 NULL 을 허용한다.** 마이그레이션이 시드보다 먼저 돌아 새 DB 에는 프로그램이 0건이고, `seed_domains.py` 가 그 뒤에 프로그램을 직접 INSERT 하기 때문이다. NULL pin 은 `items_for` 가 0행으로 보고 기존 문구(`등록된 조사 문항이 없습니다.`)를 그대로 쓴다. 대신 `103` 을 `seed.py` 의 재실행 목록에 넣어 시드 직후 반드시 채운다.

### 4-2. `backend/migrations/103_survey_form_backfill.sql` — v1 고정 (멱등)

`102` 직후에 한 번, `seed.py` 가 시드 끝에 한 번 더 돈다. 전 구문이 재실행 안전해야 한다.

```sql
-- 현행 렌더 결과를 그대로 v1 로 굳힌다. 지금 화면에 보이지 않는 것(is_active=false)은 담지 않는다.
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
```

**정합성 결론:** `competency_areas` 는 그대로 둔다(형태·의미 불변). 전환 뒤 문항 선정은 `pinned form 의 영역 ∩ program.competency_areas` 이고, v1 이 현행 활성 영역 전체를 담으므로 **모든 기존 프로그램의 렌더 결과가 바이트 단위로 같다.** 이것이 §9 계약 테스트의 기준선이다.

## 5. Query와 인덱스

| API/동작 | 규모 | filter/join/order | 인덱스 |
|---|---|---|---|
| `items_for` (응답·통계·엑셀) | 1 form × ≤100 문항 | `survey_form_area ⋈ survey_form_item` 후 `code_item` 2회 PK 조회 | `survey_form_area` PK · `survey_form_item` UNIQUE(form_id,area_code,item_order) · `code_item` PK |
| 설문지 목록 | ≤ 수십 form | form 전량 + pin 집계 1회 + 구성 1회 = **총 3 쿼리** | `program_competency_form`·`program_satisfaction_form` · `survey_response(program_id,…)` UNIQUE 선두 |
| 현재 게시본 조회(개설 pin·/metadata) | 1행 | `kind` + `version DESC` | `survey_form_current` |
| 구성 저장 | ≤100행 치환 | `DELETE`+`INSERT` 한 트랜잭션, form 행 `FOR UPDATE` | PK |
| 게시본 잠금 판정 | — | `EXISTS(survey_response WHERE program_id IN (…))` | 위와 동일 |

### 5-1. `items_for` 재작성 (정확한 형태)

```sql
SELECT fa.area_code AS area_key, a.label AS area_label,
       i.code, i.label, i.version, COALESCE(i.payload->>'kind','SCALE') AS kind
  FROM dc.survey_form_area fa
  JOIN dc.survey_form_item fi ON fi.form_id=fa.form_id AND fi.area_code=fa.area_code
  JOIN dc.code_item a ON (a.group_code,a.code)=('SURVEY_AREA',fa.area_code)
  JOIN dc.code_item i ON (i.group_code,i.code)=('SURVEY_ITEM',fi.item_code)
 WHERE fa.form_id=%s {area_filter}
 ORDER BY fa.area_order, fi.item_order, fi.item_code
```

- `form_id` 는 phase 로 고른다 — `SATISFACTION` → `program['satisfaction_form_id']`, `PRE`/`POST` → `program['competency_form_id']`. **NULL 이면 쿼리하지 말고 곧장 `[]` 를 돌려준다**(기존 "등록된 조사 문항이 없습니다." 경로 재사용).
- `{area_filter}` 는 phase 가 `SATISFACTION` 이면 빈 문자열, 아니면 `AND fa.area_code = ANY(%s)` 에 `list(program['competency_areas'])`.
- **`i.is_active` · `a.is_active` 를 붙이지 않는다** — §0-1 규칙 1. 이게 이번 변경의 핵심이다.
- **`i.version` 을 반드시 함께 선택한다.** `submit_survey` 가 `dc.survey_answer.item_version`(NOT NULL)에 그대로 넣는다. 빠뜨리면 제출이 NOT NULL 위반으로 죽는다.
- 컬럼 별칭(`area_key,area_label,code,label,kind`)을 바꾸지 않는다 — `group_by_area()` 와 §10 JSON 계약이 그대로 통과한다.

### 5-2. 설문지 목록 집계 (N+1 금지)

pin 집계는 **한 쿼리**로 끝낸다. phase 를 갈래에 맞춰 걸러야 한다 — 한 프로그램이 두 form 을 붙잡으므로 phase 를 안 걸면 만족도 form 에 사전·사후 응답이 얹힌다.

```sql
WITH pin AS (
  SELECT id AS program_id, competency_form_id   AS form_id, ARRAY['PRE','POST']     AS phases
    FROM dc.program WHERE competency_form_id IS NOT NULL
  UNION ALL
  SELECT id,             satisfaction_form_id,             ARRAY['SATISFACTION']
    FROM dc.program WHERE satisfaction_form_id IS NOT NULL
)
SELECT p.form_id,
       count(DISTINCT p.program_id)::int AS program_count,
       count(r.id)::int                  AS response_count
  FROM pin p
  LEFT JOIN dc.survey_response r ON r.program_id=p.program_id AND r.phase = ANY(p.phases)
 GROUP BY p.form_id
```

구성은 별도 1쿼리(`WHERE fa.form_id = ANY(%s)`, `ORDER BY fa.form_id, fa.area_order, fi.item_order`)로 한 번에 받아 파이썬에서 form 별로 묶는다. form 마다 쿼리를 돌리지 않는다.

### 5-3. 게시본 잠금 판정

```sql
SELECT EXISTS (
  SELECT 1 FROM dc.survey_response r
   WHERE r.phase = ANY(%s)
     AND r.program_id IN (SELECT id FROM dc.program WHERE {column}=%s)
) AS locked
```
`{column}` 은 `kind` 로 고른 내부 상수(`competency_form_id` / `satisfaction_form_id`), `phases` 는 `['PRE','POST']` / `['SATISFACTION']`. 요청값을 SQL 에 끼워 넣지 않는다.

## 6. API 계약 (신설, `administrator` 전용)

| method/path | request | response | 오류·동시성 |
|---|---|---|---|
| `GET /system/survey-forms` | `?kind=` (선택) | `{items:[{id,kind,version,status,memo,createdAt,publishedAt,lockVersion,isCurrent,programCount,responseCount,locked,areas:[{key,label,group,items:[{code,label,kind}]}]}]}` | — |
| `POST /system/survey-forms` | `{kind,memo,reason}` | 새 DRAFT(최신 게시본 구성 복사) | 409 이미 초안 있음(partial unique 위반도 409로 변환) |
| `PUT /system/survey-forms/{id}` | `{expectedLockVersion,memo,areas:[{areaCode,items:[code…]}],reason}` | form | 409 낙관적 잠금 · 422 게시본에 응답 존재 · 422 빈 영역/모르는 코드/비활성 부품/중복 문항 |
| `POST /system/survey-forms/{id}/publish` | `{expectedLockVersion,reason}` | form | 409 낙관적 잠금 · 422 이미 게시됨 · 422 구성 비어 있음 |
| `DELETE /system/survey-forms/{id}` | `{reason}` | 204 | 422 DRAFT 아님 |
| `PUT /system/code-groups/SURVEY_AREA\|SURVEY_ITEM/items/{code}` | 기존 + payload 허용 | 기존 | 422 areaKey 미존재 · 422 게시본이 쓰는 문항의 영역 이동 · 422 게시본이 쓰는 영역 비활성 |

계약 주의점(rev2):

- **`expectedVersion` → `expectedLockVersion` 으로 이름을 바꾼다.** `survey_form.version` 은 설문지 버전(v1,v2), `lock_version` 은 낙관적 잠금이다. 한 응답에 `version` 과 `lockVersion` 이 같이 나가므로 `expectedVersion` 은 반드시 오해를 부른다.
- 응답의 `areas[].key` / `items[].code|label|kind` 는 **학생 조사 응답(`group_by_area`)과 같은 모양**으로 맞춘다(rev1 의 `areaCode` 는 여기서만 다른 이름이었다). 관리자 화면이 학생 화면과 같은 렌더 코드를 쓸 수 있다.
- `version` 채번: `SELECT COALESCE(max(version),0)+1 FROM dc.survey_form WHERE kind=%s`. 경합은 `survey_form_single_draft` 가 막고, `UNIQUE(kind,version)` 이 2차 방어다. 둘 다 409 로 변환한다. 초안을 버렸다가 다시 만들면 번호가 재사용될 수 있다 — 응답이 0건이라 문제되지 않는다.
- **비활성 부품 검증은 저장 시점에만 한다.** 구성에 담는 코드는 `code_item.is_active` 여야 하고, 한 번 게시된 form 은 사전이 나중에 비활성되어도 그대로 쓴다(§0-1 규칙 1).
- **코드관리 쪽 역방향 가드:** 어떤 PUBLISHED form 이 쓰는 SURVEY_ITEM 의 `payload.areaKey` 변경과, PUBLISHED form 이 쓰는 SURVEY_AREA 의 `is_active=false` 는 422 로 막는다. 소속은 이제 form 이 들고 있으므로 `areaKey` 는 "새 초안을 만들 때의 기본 소속"이라는 역할만 남는다.

### 6-1. 프로그램 개설·수정 (rev2 추가 — rev1 에 빠져 있던 검증)

- `POST /programs`: 서버가 §0-1 규칙 3 으로 두 갈래의 현재 게시본을 찾아 `competency_form_id`·`satisfaction_form_id` 에 넣는다. 게시본이 없으면 422(`게시된 설문지가 없습니다.`).
- `PUT /programs/{id}`: pin 두 컬럼을 **WRITABLE 에서 제외**해 건드리지 않는다.
- `competencyAreas` 검증: `check_program_options` 와 같은 방식으로 **붙잡은 form 의 영역 집합**에 드는지 본다. 단 **이전에 이미 골라 둔 코드는 통과시킨다**(`old_codes` grandfathering) — 그렇게 안 하면 §4-2 5)번 보고에 걸린 옛 프로그램을 저장만 해도 422 가 난다.

### 6-2. `/metadata`

`surveyForms` 에 **두 갈래의 현재 게시본 구성만** 싣는다(약 20영역 + 84문항). 타당성:

- `/metadata` 는 이미 `dc.code_item` **전량**을 학생에게도 내려보내고 있다. 같은 문장이 이미 나가 있으므로 **새로 노출되는 개인정보·비공개 정보는 없다.** 늘어나는 것은 (form_id, area, item, order) 뿐이다.
- 초안(DRAFT)·과거 게시본은 싣지 않는다 — 관리자 화면은 `GET /system/survey-forms` 를 쓴다.
- `metadata.py` 의 `_items` 캐시는 `dc.metadata_revision` 으로 갱신되는데, 그 revision 은 `code_item` 트리거만 올린다. **§4-1 의 세 트리거가 없으면 게시해도 여러 워커가 옛 구성을 계속 내려보낸다.** `surveyForms` 조회는 `_items` 와 같은 `if revision!=_revision:` 블록 안에 두고 모듈 변수로 캐시한다(매 요청 조회 금지).

## 7. 화면

`/admin/system/surveys` — `NotReady` 를 실제 페이지로 교체. 탭 2개(역량 설문지 · 만족도 설문지).

- 상단: 버전 선택(게시본·초안), 「새 설문지 만들기」(최신 게시본 구성을 복사한 초안), 「게시」, 「초안 버리기」
- 본문: **설문지 모양** — 영역 카드마다 5점 척도 머리글(매우 그렇다…전혀 아니다) 아래 문항이 번호와 함께 줄줄이. 편집 가능 상태(초안·응답 0건 게시본)에서는 각 문항에 체크·▲▼·문장 수정, 카드 하단 「이 영역에 문항 추가」, 아래 「영역 추가」
- 부품 사전: 문항 추가 시 그 영역의 미사용 문항 고르기 + 새 문항 등록(문장·척도/서술형) 한 자리에서
- 잠긴 게시본은 `locked=true` 와 `responseCount` 를 근거로 **읽기 전용 + 사유 안내 + 「새 버전 만들기」 링크**를 준다(CLAUDE.md 규칙 13 — 빈 화면·비활성만 두지 않는다).

## 8. 동시성·트랜잭션 (rev2 신설)

| 상황 | 처리 |
|---|---|
| 구성 저장 | ① `SELECT … FROM dc.survey_form WHERE id=%s FOR UPDATE` ② `lock_version` 대조(409) ③ **pin 한 프로그램 행을 `SELECT id FROM dc.program WHERE {column}=%s FOR SHARE`** ④ 잠금 판정(§5-3) ⑤ `DELETE FROM dc.survey_form_area WHERE form_id=%s`(item 은 CASCADE) ⑥ 영역·문항 INSERT ⑦ `UPDATE dc.survey_form SET lock_version=lock_version+1` ⑧ `admin_event` |
| 왜 ③이 필요한가 | ④의 `EXISTS` 는 READ COMMITTED 에서 **커밋되지 않은 동시 제출을 못 본다.** `submit_survey` 는 이미 `get_program(..., lock=True)` 로 program 행을 잠그므로, 편집 쪽이 같은 행을 `FOR SHARE` 로 잡으면 제출이 대기한다. 제출은 form 행을 잡지 않으므로 교착은 없다(잠금 순서: 편집 = form → program, 제출 = program 만) |
| 초안 1개 제약 vs 게시 경합 | `POST …/publish` 가 커밋되면 partial unique 가 풀려 그때부터 새 초안을 만들 수 있다. `POST /system/survey-forms` 가 unique 위반을 받으면 409 로 변환한다(500 금지) |
| 초안 버리기 | `DELETE` 는 `status='DRAFT'` 인 행만. 영역·문항은 `ON DELETE CASCADE`. 게시본은 `dc.program` FK(RESTRICT)가 2차로 막는다 |
| 프로그램 개설 중 게시 | 개설 트랜잭션이 읽은 「현재 게시본」과 동시에 새 버전이 게시되어도, 붙잡은 쪽이 유효한 PUBLISHED 이므로 문제 없다(§0 은 "개설 시점의 게시본"만 요구한다) |

## 9. 구현 파일

- DDL: `backend/migrations/102_survey_forms.sql` · `backend/migrations/103_survey_form_backfill.sql`
- API: `backend/app/survey_forms.py`(신설) · `backend/app/survey.py`(`items_for`·`export_sheets` 를 form 기준으로) · `backend/app/administration.py`(SURVEY_* payload 검증 + 역방향 가드) · `backend/app/programs.py`(§3-1 · §6-1) · `backend/app/metadata.py`(surveyForms + 캐시) · `backend/app/main.py`(router)
- 시드: `backend/app/seed.py` derived 재실행 목록에 **`103_survey_form_backfill.sql` 추가** · `backend/app/seed_domains.py`(§3-1)
- frontend: `shared/metadataStore`(surveyForms) · `src_admin/data/surveyForms.ts`(신설) · `src_admin/pages/SurveyForms.tsx`+`.css`(신설) · `src_admin/App.tsx`(라우트) · `src_admin/data/schema/program.ts`(§3-1 타입 + `competencySurveyGroups()`·`satisfactionSurveySummary()` 를 form 기준으로)
- 갱신: `DB.md` §8-3 · `SPEC.md` 해당 화면 행

### 9-1. `export_sheets` 재작성 주의

지금은 활성 code_item 전량을 훑고 `a.payload->>'group'` 으로 진로·직무·취업 3장을 가른다. form 기준으로 바꾸면:

- 훑는 대상을 **프로그램이 붙잡은 COMPETENCY form 의 구성**으로 좁힌다(안 그러면 v2 의 새 문항이 옛 프로그램 엑셀에 열로 끼어든다).
- 시트를 가르는 `group` 은 여전히 `code_item(SURVEY_AREA).payload->>'group'` 에서 읽는다(`SURVEY_GROUP_LABEL` 유지). form 에는 묶음 정보가 없다 — §0 "설문지 묶음 4종 고정".
- "고르지 않은 영역은 빈칸" 동작을 유지한다 — 열은 form 의 해당 묶음 문항 전체, 값은 `competency_areas` 에 든 영역만.

## 10. JSON 계약 호환 점검 (rev2 신설 — 회귀 기준선)

| 응답 | 무엇이 바뀌나 | 기대 |
|---|---|---|
| `GET /programs/{id}/survey/{phase}` | `items_for` 의 소스만 | **불변.** `areas[].key/label`, `items[].code/prompt/kind/value`, `open/reason/submittedAt` 그대로 — `shared/surveyStore.ts` 의 `SurveyArea`·`SurveyItem` 수정 없음 |
| `POST /programs/{id}/survey/{phase}` | `expected[code]['version']` 출처 | **불변.** `items_for` 가 `version` 을 계속 주면 `survey_answer.item_version` 동작 동일 |
| `GET …/survey/stats` | `items_for('PRE')` | **불변.** `SurveyStats` 타입 수정 없음 |
| `GET …/survey/satisfaction/stats` | `items_for('SATISFACTION')` 에서 `payload.group` 필터가 사라짐 | **불변.** v1 이 현행 SATISFACTION 영역 전체를 담으므로 결과 동일 |
| `GET …/survey/{phase}/export.xlsx` | §9-1 | **불변.** 시트명·`질문1…N` 열 수·값 동일(v1 기준) |
| `GET /programs` · `POST/PUT /programs` | `satisfactionFormId` 가 `string\|null` → `number\|null`, `competencyFormId` 신설, 요청 본문에서 `satisfactionFormId` 제거 | **의도된 변경.** 읽는 화면 0건이라 UI 영향 없음. `program.ts` 타입을 같이 고친다 |
| `GET /metadata` | `surveyForms` 추가 | 기존 `revision/items/menus/factors` 그대로 — 추가만 |

## 11. 검증 게이트

- `backend/tests/test_survey_forms.py`(신설): 초안 생성 · 구성 저장 · 게시 · **응답 1건 뒤 구성 저장 422** · `lockVersion` 불일치 409 · 초안 2개 409 · 프로그램 개설 시 현재 게시본 pin · 개설 후 `PUT /programs` 가 pin 을 안 바꿈 · 비관리자 403 · **게시본이 쓰는 문항을 사전에서 비활성해도 그 form 의 `items_for` 가 줄지 않음**(§0-1 규칙 1) · `competencyAreas` 가 pin 밖 코드면 422, 기존 선택이면 통과
- `backend/tests/test_boot_contract.py`: `/metadata` 에 `surveyForms` 가 있고 PUBLISHED 만 든다
- **회귀 기준선:** §10 표의 "불변" 6줄을 `102`/`103` 적용 전후 같은 프로그램으로 비교하는 테스트(엑셀은 헤더+행 수, stats 는 dict 비교)
- 빈 DB migration(`102`→`103`) · 시드 후 `103` 재실행이 프로그램 pin 을 채움 · `npx.cmd tsc -b` · 브라우저 왕복(문항 추가 → 게시 → 새 프로그램 개설 → 학생 응답 → 통계·엑셀)

## 12. 위험·rollback

| 위험 | 대응 |
|---|---|
| `dc.program.satisfaction_form_id` DROP 이 살아 있는 쓰기 경로를 깬다 | §3-1 의 6곳을 같은 커밋에서 고친다. `102` 의 DO 블록이 값 있는 DB 에서 멈춘다 |
| 새 테이블 GRANT 누락 | `102` 에 명시(001 의 `GRANT ALL TABLES` 는 그때 테이블만 덮는다) |
| 시드 DB 의 프로그램 pin 이 NULL 로 남아 조사 화면이 빈다 | `103` 을 `seed.py` derived 목록에 넣는다. §11 에 전용 검증 |
| `/metadata` 캐시가 게시를 못 본다 | `102` 의 세 statement 트리거가 `metadata_revision` 을 올린다 |
| 응답 있는 게시본이 편집된다 | §8 의 `FOR SHARE` pin 잠금 + `EXISTS` 판정 |
| roll-forward | `102`/`103` 을 되돌리지 않는다. 문제는 `104` 로 고친다. `dc.survey_response`·`survey_answer` 는 이번 변경에서 손대지 않으므로 응답 데이터 위험은 없다 |

## 13. 이번 작업 범위 밖 — 확인만 (USER_DECISION 대상, 착수 금지)

개설 뒤 `PUT /programs/{id}` 로 **`competencyAreas` 를 바꾸는 것**은 지금도 막혀 있지 않다. 사전(PRE) 응답이 이미 들어온 뒤 영역을 바꾸면 사전·사후 짝(`paired`)이 깨져 향상률이 왜곡된다. 이 구멍은 이번 변경이 만든 것이 아니라 **기존 동작**이고, 막으면 운영자의 업무 동작이 바뀐다. 이번 작업지시서에서는 손대지 않는다 — 별도로 사용자에게 물을 것.

## 14. 완료 조건

- [x] Astra 리뷰 반영 (rev2)
- [x] `102`·`103` 이 빈 테스트 DB와 현행 dev DB에 적용 (v1 = 역량 15영역 66문항 · 만족도 5영역 18문항)
- [x] 계약·권한·동시성 테스트 통과 — `backend/tests/test_survey_forms.py` 8건 포함 328 passed
- [x] §10 회귀 기준선: 기존 조사·통계·엑셀 테스트가 form 기준으로 그대로 통과
- [x] `npx.cmd tsc -b` 통과
- [x] 왕복 QA — 새 설문지 v2 → 문항 추가(영역 1) → 구성 저장 → 게시 → `/metadata` 반영 → 새 프로그램이 v2 pin, 기존 4개는 v1 유지
- [x] `DB.md` §8-3 갱신 후 `PASS`

### 사용자 추가 지시 (2026-09-23 · 2차)

1. dev DB 검증 흔적(역량 v2·테스트 프로그램) 삭제 — 완료.
2. **사전(PRE) 응답이 있으면 `competencyAreas` 변경 금지** — rev2 §13 이 범위 밖으로 분리했던 항목을 사용자가 "조사영역 바꾸면 안돼"로 확정.
   `check_competency_areas` 에서 422. `test_competency_areas_freeze_after_a_pre_response` 가 고정한다.
3. `/system/surveys` 도 `.admin-page` 를 써서 다른 서브페이지와 같은 축(좌우 24px · max 1440)으로 맞춤.
4. **역량향상률 설문지는 진로·직무·취업 3종으로 나눠 만든다** — 탭 4개(진로역량·직무역량·취업역량·만족도).
   버전 갈래는 그대로 둘(Q4b)이다: 한 벌 안에서 묶음별로 편집하고, 저장·게시는 역량 한 벌로 함께 간다.
   갈래를 셋으로 쪼개면 프로그램이 영역을 묶음에 걸쳐 고를 때 버전 셋을 붙잡게 된다(Q4 (c)안의 문제).

### 구현에서 rev2 와 달라진 것

- **프로그램 DTO 에 pin 을 내보내지 않는다.** rev2 §3-1 은 `competencyFormId`·`satisfactionFormId` 를 DTO 에 실으라고 했지만
  `ProgramBody` 가 `extra='forbid'` 라 화면의 왕복 저장(GET 응답을 그대로 PUT)이 422 로 깨졌다(`test_programs` 2건이 잡았다).
  pin 은 서버 안에서만 쓰고 DTO 에서 뺐다 — 읽는 화면이 0건이라 손해가 없다.
- **문항의 `is_active=false` 는 막지 않는다.** 영역만 막는다(rev2 §6 의 역방향 가드 그대로). 게시본은 `is_active` 를 보지 않으므로
  문항 비활성은 「새 초안에 담기지 않게」 하는 뜻이고, 그 동작을 `test_published_form_wins_over_the_dictionary` 가 고정한다.

### 사용자 보고 (2026-09-23 · 3차) — 수정 화면이 최신 게시본 기준으로 영역을 보여 준 건

"기존 프로그램 수정 화면이 최신 설문 기준으로 선택지를 보여줍니다. 서버는 프로그램 개설 당시 버전을
유지하지만, 화면은 항상 최신 게시본의 영역을 보여줍니다. … 수정 화면에는 해당 프로그램에 연결된
버전의 영역을 제공해야 합니다."

rev2 는 `/metadata` 에 **갈래별 현재 게시본 1벌**만 실었고, `program_dto` 는 pin 을 감췄다(본문이
extra='forbid' 인데 화면이 GET 응답을 그대로 PUT 으로 돌려보내기 때문). 그래서 v2 가 게시되는 순간
v1 을 붙잡은 프로그램의 수정 화면이 v2 의 영역을 그렸다 — 고른 영역이 사라지거나, 새 영역을 골랐다
`check_competency_areas` 에서 422 를 맞았다.

- `metadata.published_forms` 가 **게시된 설문지 전부**를 싣고 각 벌에 `isCurrent` 를 준다.
  버전은 관리자가 손으로 만드는 것이라 몇 벌뿐이고, revision 캐시에 그대로 올라탄다.
- `program_dto` 가 `competencyFormId`·`satisfactionFormId` 를 **읽기 전용**으로 내보낸다.
  본문 계약(extra='forbid')은 그대로 두고, 보내는 쪽이 떼어 낸다 — `programs.ts updateProgram` 의
  구조 분해와 `test_programs.SERVER_OWNED`.
- `pinnedSurveyForm(kind, formId)` 신설. `competencySurveyGroups(formId)`·`satisfactionSurveySummary(formId)`
  가 붙잡은 버전을 그리고, 못 찾으면 현재 게시본으로 돌아간다(새 프로그램·옛 데이터).
- 화면에 `역량향상률 설문지 v1` / `프로그램 만족도 설문 v1` 을 띄우고, 붙잡은 버전이 최신이 아니면
  "개설 때의 설문지를 그대로 씁니다" 를 덧붙인다.
- `test_edit_screen_gets_the_form_the_program_pinned` 가 고정한다 — v1 을 붙잡은 프로그램 DTO 의 pin,
  `/metadata` 가 싣는 옛 게시본의 영역, 새 게시본의 `isCurrent`.
