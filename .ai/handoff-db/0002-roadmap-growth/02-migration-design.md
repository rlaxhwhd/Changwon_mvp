# 로드맵·IAP + 성장활동 — DB 전환 설계

작성일: 2026-09-09 · 작성 역할: codex-db-architect

대상: DB.md §8-3 3번·4번 · 입력 조사: `01-current-state.md`

설계 상태: **DRAFT_FOR_OPUS_REVIEW**

## 1. 설계 결론과 승인 단위

기존 `roadmap / roadmap_axis / roadmap_item / roadmap_item_event / roadmap_snapshot / roadmap_request`를 현재 계획의 정본으로 유지하고 전용 API를 연결한다. **roadmap.version은 세대 번호로 유지하며 generation·현재 최종 유형 컬럼을 추가하지 않는다.** 편집 충돌 토큰, 상담 근거, 기존 AI 산출물 참조, 자동편입·완료 근거와 필요한 이력만 보강한다.

성장 기록은 학생이 쓴 내용의 정본을 한 벌로 만들고, 성장 홈·일지·포트폴리오·상담사 상세가 그것을 읽는다. STAR는 기존 `star_track`, AI는 기존 4테이블, 파일은 `file_object`, 자기소개서는 `job_resume`를 재사용한다. 포트폴리오는 이 자료들의 **조회·제출 projection**이며 새로운 자소서/파일/AI 저장소가 아니다.

설계 범위를 다음처럼 나눈다. 이는 구현 승인이 아니다.

| 단위 | 포함할 결과 | 승인/의존성 |
|---|---|---|
| R — 로드맵 배선 | 현재/축/칸/요청/스냅샷 API, SQL 집계, CARE7 상담 근거, 생성 provider, 비교과 개설 편입·수료 연동 | D01~D05 및 Opus 검토 후 구현 |
| G — 성장 기록 | 소유된 성장 항목·일지·포트폴리오 조회/편집, 기존 STAR·추천 조회, 비교과 찜 | 기존 기록 의미를 유지하되 G의 공유/개인정보 결정 D06 확인 |
| P — 포트폴리오 제출 | 기존 채용의 PORTFOLIO provider + 불변 제출 사본 + 기존 파일 재사용 | D07의 제출 항목/공유 범위 확정 후 capability 개방 |
| M — 학습 미션·퀘스트 | 현재 샘플 화면의 실데이터 계약과 조건부 스키마 | D08~D10 전에는 점수/보상/선발 엔진 구현 금지. 미지원 상태를 사실대로 응답 |

M이 보류되면 화면이 연결되었다고 성장활동 전체를 “전환 완료”로 표시하지 않는다. `04-decisions.md`에서 보류 범위와 제공 가능한 기능을 명시하고, 구현 후 DB.md 대장에도 부분 상태를 기록해야 한다.

## 2. 정본·코드·데이터 소유권

### 2.1 정본 판정

| 요구 데이터 | 판정 | 이유 |
|---|---|---|
| 현재 목표·3축·칸·확정 | 기존 roadmap 계열 확장 | 현재 PK와 자식 구조가 요구를 수용함 |
| 최종 유형 | `student_type_event` 최신 유효 이벤트 조회 | roadmap에 복제하지 않음. 당시 유형은 snapshot/input 증거로만 보관 |
| 생성 상담 | 기존 `counsel_request` 관계 추가 | 학생·CARE7·진로취업·상태를 함께 검증해야 함 |
| AI 축 근거·칸 이유·생성 결과 | 기존 ai_run/suggestion/comment/score | 새 AI 테이블 금지. ACTIVITY_RECO는 그대로 성장 추천에 사용 |
| 사용자 일지·프로젝트·숙련도·자기신고 실적 | 신규 growth_entry 및 공통 프로필/이력 | 소유된 수정 가능 자료를 담는 기존 테이블이 없음 |
| 공식 학사 이수·검증 자격 | student_course / student_cert 등 기존 원천 조회 | 성장 CRUD에서 원천을 바꾸지 않음. 자격 선택 행은 취득 사실이 아님 |
| STAR 선발·배정 현황 | 기존 star_track | 현재는 읽기 중심. 정책 불명 상태에서 트랙/포인트 테이블을 재신설하지 않음 |
| 자소서 본문·평가 | job_resume 및 기존 RESUME_REVIEW run | r1/r2 소유권·평가 연결 유지 |
| 첨부 bytes·메타 | file_object 확장 | 별도 blob/base64/localStorage 저장 금지 |
| 프로그램 찜 | 신규 program_wishlist | job_wishlist는 채용 FK이므로 재사용 불가. 프로그램 신청 행과 의미도 다름 |
| 진단·수료 타임라인 | 원천의 완료 이벤트 SQL projection | 사용자가 적은 “수료” 문구로 공식 이벤트를 만들지 않음 |

### 2.2 코드 규약

새 분류는 `dc.code_group`/`dc.code_item`으로 관리한다. 코드 컬럼 옆에 상수 또는 kind에 따른 **STORED 생성열 group**을 두고 `(group, code)` 복합 FK를 건다. 예: request의 `status_group GENERATED ... 'ROADMAP_REQUEST_STATUS'`, growth entry의 `kind_group='GROWTH_ENTRY_KIND'`. API는 쓰기 시 `is_active`를 검사하고 기존 비활성 코드가 붙은 과거 기록은 계속 읽는다.

- 구조 코드: ROADMAP_AXIS(IAP/CORE/GROWTH), ROADMAP_ITEM_STATUS(TODO/DONE), ROADMAP_ENTRY(NONE/RECOMMEND/REQUIRED), ROADMAP_PRIORITY(P0/P1/P2), ROADMAP_REQUEST_STATUS(REQ/APPLIED/REJECTED), GROWTH_ENTRY_KIND(RECORD/JOURNAL/PROJECT/SKILL/CERTIFICATE/LANGUAGE/AWARD). 생성열+복합 FK와 구조 CHECK를 함께 둔다. 기존 같은 그룹이 있으면 **그룹 이름을 중복 생성하지 않고 재사용**한다.
- 상태 3종 승인 시 ROADMAP_STATUS(DRAFT/REVIEW/CONFIRMED). 미승인 시 status_code를 먼저 추가하지 않는다.
- 운영 분류: 성장일지 분류(아르바이트/팀프로젝트/기타 활동), 자기입력 스킬 분류 등은 DB 코드. 한국어 label은 코드값 대신 표시용으로 사용한다. 기존 `skillCatalog`의 표현용 후보와 학사 `dc.skill`을 이름으로 매칭하지 않는다.
- AI_RUN_KIND에는 **ROADMAP_GENERATION, STAR_COMMENT**만 필요한 경우 추가한다. 성장 추천은 기존 ACTIVITY_RECO, 자소서 평가는 RESUME_REVIEW를 재사용한다. 칸/축마다 별도 종류 코드를 만들지 않는다. STAR_COMMENT는 기존 STAR 코멘트가 실제로 있을 때만 적재한다.
- 중요도는 현재 저장된 한글 값을 inventory한 뒤 코드 매핑을 만든다. 알 수 없는 값은 import_issue로 보내고 “보통” 등으로 임의 치환하지 않는다.

학과 필터/권한은 `(college_code,dept_code)` 쌍이고, 학생 상태는 `STUDENT_ENROLLED` 코드 조회다. 학과 이름 검색은 표시 검색일 뿐 scope 판정이 아니다. 현재 정본의 유형 이벤트를 SQL로 읽으며 유형 판정식이나 학년별 유형 추정은 만들지 않는다.

## 3. 최소 스키마 확장 — 로드맵

아래는 **DDL 파일이 아니라 구현 계약**이다. 사람이 작성한 신규 SQL로 구현하며 적용된 001~023은 수정하지 않는다.

### 3.1 현재 계획과 상담 관계

`dc.roadmap`의 PK `student_uid`, 목표 필드, 세대 `version`을 유지한다.

| 확장 | 제약·의미 |
|---|---|
| `lock_version bigint NOT NULL DEFAULT 1 CHECK > 0` | 계획 aggregate 편집 토큰. 칸/축/메타/확정/프로그램 결과/편입 변경 시 트랜잭션당 1 증가. 세대 version과 독립 |
| `counsel_request_id text NULL` | 기존 seed는 근거 없으면 NULL. 신규 생성은 필수. counsel_request에 UQ `(id,student_uid)` 추가 후 `(counsel_request_id,student_uid)` 복합 FK, ON DELETE RESTRICT |
| `basis_kind` + 생성 group/FK | COUNSEL / LEGACY_IMPORT. LEGACY_IMPORT는 사용자 POST로 선택 불가. 기존 관계 미확인 상태를 정직하게 표현 |
| `ai_run_id text NULL REFERENCES ai_run(id)` | 초기/재생성 산출물 근거. 학생·kind·대상 세대 일치 검증 |
| `updated_at`, `updated_by` FK person | 서버 시각·로그인 actor, 클라이언트 이름 수신 금지 |
| `confirmed_at`, `confirmed_by` FK person | 새 확정의 근거. 기존 true의 시각·행위자를 모르면 NULL 허용, migration 시각을 확정시각으로 꾸미지 않음 |
| 조건부 `status_code` | D01 승인 시 DRAFT/REVIEW/CONFIRMED. `confirmed`는 `status_code='CONFIRMED'`의 STORED 생성열로 교체하여 기존 게이트 읽기 호환. 두 필드를 독립 쓰기하지 않음 |

새 상담 관계는 FK만으로 충분하지 않다. 서비스는 해당 학생의 진로취업·CARE7, 취소되지 않은 확정 예약/진행 상태와 권한을 검사한다. 다른 학생 상담·일반 상담·심리/교수 상담은 거부한다. DB의 제약 트리거도 학생/트랙 불일치를 막고, 시간/진행·권한은 서비스에서 검사한다. 기존 NULL careTrack의 처리에는 현행 진로취업 fallback만 적용하고 #36 미결을 전체 상담에 확대하지 않는다.

기존 계획에 상담 근거가 없을 때는 `LEGACY_IMPORT`로 조회를 유지한다. **새 상담 완료 요건을 충족하는 계획으로 자동 인정하지 않는다.** 명시적 연결 작업은 실제 근거를 확인한 상담사가 버전·사유와 함께 수행하고 이벤트를 남긴다. 대응 근거가 없으면 새 상담에서 새 계획을 생성해야 한다. 기존 학생 단계 개방을 어느 기간 유지할지는 D03 승인 사항이다.

`target_company`는 지금의 JSONB를 유지하되 DTO는 `{name, ...기존 허용 필드}`로 스키마를 제한한다. 과거 string은 `{name: original}`로 명시 변환한다. 기업 적합도·진단 점수는 없으면 null이며 생성하지 않는다. 목표 직무의 기존 text는 유지한다. 학사 관심직무는 추천 재료일 뿐 현재 목표의 두 번째 정본이 아니다.

### 3.2 축·칸과 AI 근거

- 축의 PK/FK 유지. 축별 별도 잠금 컬럼은 만들지 않고 부모 lock_version으로 보호한다. headline은 채택한 계획 문구다. `ai_suggestion_id bigint NULL` FK와 `editor_note text`를 추가한다.
- 칸의 PK/FK와 기존 `version`을 유지한다. `ai_suggestion_id`, `editor_note`, `completed_at timestamptz NULL`, `completion_source_code`, `completion_ref jsonb`, `created_at`, `origin_code`(BASE/AUTO_PROGRAM), `entry_event_id uuid NULL`을 추가한다. `(student_uid,entry_event_id)`는 roadmap_event 복합 FK(DEFERRED)로 편입 사건을 가리킨다. completion_ref는 비교과 apply의 복합 키 `(program_id,student_uid)`/round/event ID, 수동 완료 시 해당 roadmap item event ID와 사유를 포함하는 **식별 근거**이며 점수 원천이 아니다. 삭제될 수 있는 현재 program_apply 행에는 강제 FK를 걸지 않고, 보존되는 program_apply_event ID 및 학생/프로그램 일치를 검증한다.
- BASE 15칸은 학생당 축별 position 1~5. AUTO_PROGRAM은 IAP에만, 위치는 6 이상. `UNIQUE(student_uid,axis,position) DEFERRABLE INITIALLY DEFERRED`, position>0. 현재 item.id가 임의 문자열이므로 새 ID는 서버 UUID text, 기존 ID는 보존한다.
- 현재 행만 저장하므로 자동편입 유일성은 부분 UQ `(student_uid,program_id)` WHERE origin_code=AUTO_PROGRAM. 이것이 **현재 roadmap.version에서 프로그램당 한 칸**이라는 의미다. 세대 교체 시 현재 칸을 교체하고 과거는 snapshot으로 보존하므로 칸에 generation을 추가할 필요가 없다. 동일 프로그램의 목적을 늘리는 program_step은 이번에 만들지 않는다.
- `origin=AUTO_PROGRAM ⇒ axis=IAP AND program_id IS NOT NULL AND entry IN(RECOMMEND,REQUIRED)`. BASE에 live program 연결이 필요한 기존 데이터가 있으면 별도 inventory/이관 판정하고 자동 칸으로 추정하지 않는다. 신규 생성 fixture의 기본 15칸은 live program FK 없이 받는다.
- 신규 DONE은 completed_at·completion_source 필요, TODO는 현재 완료 근거가 NULL. 기존 DONE의 시각을 알 수 없으면 legacy completion source와 NULL 시각을 허용한다. 과거 사실의 원래 값은 이벤트/snapshot에 남는다.
- 3축 및 축별 BASE 정확히 5개는 확정 시 검증하고, 확정 계획 수정 시 deferred constraint trigger로 보장한다. DRAFT는 불완전 저장을 허용하되 축/ID/코드 무결성은 유지한다. CORE/GROWTH를 6칸으로 확정하거나 프로그램 칸을 수동 삭제하는 요청은 422/409다.

AI 원문은 ai_suggestion.detail/meta에 적재한다. legacy rationale/why를 먼저 불변 run에 옮기고 mutable 축/칸에 참조를 연결한다. 호환 기간 중 기존 text는 읽기 전용 legacy로 두고 **새 AI 원문의 정본으로 갱신하지 않는다**. 모든 소비자가 참조를 읽는 후속 단계에서 legacy text를 NULL/제거한다. AI 원문 수정 요청은 거부하고, 상담사가 바꾸는 설명은 editor_note로 기록한다. DTO의 기존 rationale/why는 `editorNote ?? aiReason ?? legacyReason` 호환 표시값이며 `reasonOrigin`, `aiRunId`, `originalReason`을 별도로 내려준다. 인간이 채택한 계획 문구와 AI 원문을 구분한다.

ai_run 및 suggestion은 FK만 있으면 다른 학생의 결과를 연결할 수 있다. 삽입/참조 서비스와 제약 트리거는 run.student_uid, kind_code=ROADMAP_GENERATION, suggestion.run_id, meta의 axis/item 식별자를 확인한다. 원문 ai_run 조회 API도 같은 scope를 적용하고 학생에게 상담사 전용 input_snapshot을 내려주지 않는다.

### 3.3 불변 이력과 스냅샷

기존 `roadmap_item_event`를 재사용한다. 신규 행용 `schema_version=2`, `roadmap_version`, `action_code`, `cause_kind/cause_id`, `transaction_id`, before/after item.version을 추가한다. 기존 행은 schema_version=1이며 없는 세대/인과를 추정해서 UPDATE하지 않는다. 새 행은 세대·action·actor 필수(자동 시스템 작업은 식별 가능한 시스템 actor+initiated_by). item은 세대 교체로 없어질 수 있으므로 **현재 item FK를 새로 걸지 않는다**. student/person FK는 유지·보강한다.

신규 `roadmap_event`가 필요한 이유는 기존 item_event가 계획/축/확정/상담연결/재생성을 담는 테이블이 아니기 때문이다. UUID PK, student FK, roadmap_version, lock_version_before/after, action_code, actor FK, occurred_at, transaction_id, cause, before/after JSONB, reason을 둔다. 가짜 item_id로 계획 사건을 적재하지 않는다.

roadmap_event에는 UQ `(student_uid,id)`도 두고 요청의 반영 이벤트 FK를 학생까지 묶는다. 기존 snapshot은 그대로 재사용한다. 새 snapshot payload schemaVersion=2에는 다음을 저장한다.

- 전체 목표·상담 근거·확정 상태·생성/확정자·세대·편집 version.
- 3축과 **숨김/만료 칸을 포함한 모든 현재 칸**, 각각 상태·완료 근거·자동편입/만료·AI 참조와 당시 표시 문구.
- `asOf`와 당시 SQL 계산 done/total/pct, 축별 수치. 숨김 여부도 당시 값으로 동결.
- 당시 최신 student_type_event ID/코드와 표시 label, generator input 식별자·hash·schemaVersion.

스냅샷은 재생성 직전 세대당 한 번만 append한다. 같은 세대 편집 이력마다 snapshot을 만들지 않는다. 과거 snapshot은 현재 프로그램·코드 label·유형으로 재렌더링하지 않고 동결 payload를 읽는다. 기존 스냅샷 payload가 불완전하면 schemaVersion=1과 limitations를 응답하고 원문 수정 금지. 보존기간/학생 과거조회는 D05이며 자동 삭제/TTL 없음.

### 3.4 변경 요청

`roadmap_request`를 유지한다. axis는 NULL 허용(일반 목표 변경 요청); 구조 코드 FK 추가. `roadmap_version NULL`, `target_item_id NULL`, `handled_at`, `handled_by` FK, `handling_note`, `applied_event_id`를 추가한다. `(student_uid,applied_event_id)`는 roadmap_event의 같은 학생 이벤트로 복합 FK를 건다. 요청의 student_uid FK는 유지한다. 구세대 요청을 보존해야 하므로 현재 item FK를 만들지 않는다. 신규 요청은 접수 시 실제 현재 세대·선택한 칸 소속을 서버가 검증한다.

상태는 REQ→APPLIED 또는 REJECTED. 처리 완료 후 되돌리거나 삭제하지 않고 새 요청을 만든다. 별도 `roadmap_request_event`는 UUID PK, request FK RESTRICT, student FK, actor FK, action/status before/after, version before/after, reason, created_at, transaction_id를 가진다. 기존 상태는 대기/REQ→REQ, 반영완료/APPROVED→APPLIED, 반려/REJECTED→REJECTED로 변환한다. **legacy APPLIED에 실제 수정 이벤트를 꾸며 붙이지 않는다.**

요청 반영은 requestId만 눌러 완료하는 별도 무근거 API가 아니라 실제 계획 편집/재생성 transaction에 requestIds와 각 expectedVersion을 포함한다. 요청의 학생·세대가 맞는지 확인하고 성공한 roadmap_event를 applied_event_id로 남긴다. 구세대 요청은 409 STALE_REQUEST_TARGET이며 새 계획으로의 명시적 반영 대상 변경+설명을 받아 이력을 남긴 뒤 반영한다. 자동 반려/자동 전체 완료 금지. 반려 메모를 반드시 요구할지는 D04로 분리한다.

### 3.5 제약·인덱스·권한

- append-only 대상: 기존 AI 4테이블, item_event, snapshot, student_type_event 및 신규 roadmap_event/request_event/growth_event. 모두 `BEFORE UPDATE OR DELETE ... dc.reject_history_change()`와 앱 INSERT/SELECT 권한만 부여. JSON 내용 수정도 금지. RESTRICT FK로 삭제 전파 금지.
- roadmap: `(counsel_request_id,student_uid)`, 상태/updated_at/학생. 축은 기존 PK. item: `(student_uid,axis,position)`, `(program_id,student_uid)` 부분 인덱스, RECOMMEND의 expires_at 인덱스. NOW()를 partial index 조건에 넣지 않는다.
- event/snapshot: `(student_uid,created_at DESC,id)`; snapshot 기존 `(student_uid,version)` 유지. request: `(student_uid,status_code,requested_at DESC,id)` 및 `(status_code,requested_at DESC,id)`.
- archive는 유지하고 현재 계획의 축·칸 삭제는 재생성 transaction 안에서만 허용한다. 앱의 직접 SQL 쓰기 경로 목록을 제한하고 배치도 같은 service/락 계약을 따른다.

## 4. 성장 기록·STAR·포트폴리오 스키마

### 4.1 G의 최소 신규 구조

새 테이블은 아래 6개다(사용자 자료 4개, 미이관 비교과 찜의 현재 상태·이력 2개). 성장 홈과 포트폴리오의 동일 항목을 각각 별도 테이블에 복제하지 않는다.

| 테이블 | 키·필드·제약 |
|---|---|
| `growth_profile` | PK student_uid FK student, intro, contact_email/contact_phone(nullable 자기입력 연락처), version bigint>0, created/updated_at, updated_by FK. 학번/학과/GPA/이름 복제 안 함. 학생당 전체 성장자료 변경 revision이기도 함 |
| `growth_entry` | UUID text PK, student_uid FK growth_profile, UQ(student_uid,id), kind_code/group FK, title, category_code/group(필요 kind만), occurred_on date NULL, date_text·date_precision, tags text[], content jsonb, bookmarked boolean, resume_used boolean, cert_id NULL FK cert, source_kind, version bigint>0, created/updated_at, created/updated_by, deleted_at/by. 소유자·kind 변경 금지 |
| `growth_event` | UUID PK, student_uid FK growth_profile, entry_id NULL, 복합 FK(student_uid,entry_id)→growth_entry, actor FK, action, entry/profile version before/after, before/after JSONB, reason, created_at, transaction_id. entry_id NULL이면 PROFILE 이벤트만 허용 |
| `growth_entry_file` | PK(entry_id,file_id), student_uid, 복합 FK(student_uid,entry_id)→growth_entry, file_id FK file_object RESTRICT, position, linked_at/by, unlinked_at/by. 원래 연결 이력을 지우지 않고 해제 표시, 변경은 growth_event에 남김 |
| `program_wishlist` | PK(student_uid,program_id), 두 실체 FK RESTRICT, wished boolean, version bigint>0, updated_at. false 행도 남겨 remove/readd의 토큰 재사용(ABA)을 막음. 물리삭제 없음 |
| `program_wishlist_event` | UUID PK, `(student_uid,program_id)` FK→program_wishlist RESTRICT, wished/version before/after, actor FK, created_at. INSERT/SELECT만 허용하고 reject_history_change 트리거. 동일 상태 재전송은 새 이력 없음 |

프로필이 아직 없는 학생의 GET은 학사 표시와 version=0인 미생성 응답을 주며 읽기에서 행을 만들지 않는다. 최초 profile/entry 쓰기는 student 행을 먼저 잠그고 expectedProfileVersion=0 검사 후 growth_profile(version=1)을 만든다. 이후 모든 entry/첨부/profile mutation은 같은 부모 lock 아래 entry.version과 profile.version을 증가시키고 growth_event를 append한다. 신규 프로필 생성과 첫 entry 생성은 한 transaction이다. 최초성 경쟁으로 두 프로필이 생기지 않는다.

growth_entry에는 `(student_uid,kind_code,occurred_on DESC,id)` WHERE deleted_at IS NULL, `(student_uid,category_code,updated_at DESC,id)`, bookmark partial index를 둔다. tags 검색은 GIN(tags), 본문 검색은 승인한 검색 범위의 SQL 검색 인덱스를 사용한다. growth_event는 `(student_uid,created_at DESC,id)`와 `(entry_id,created_at DESC,id)`, wishlist는 `(student_uid,wished,updated_at DESC,program_id)`를 둔다. 부분 날짜/NULL 정렬 순서를 DTO 계약에 고정한다.

growth_entry는 무제한 임의 payload 저장소가 아니다. 검색·소유권·날짜·분류·상태·동시성은 일반 컬럼이고, **종류마다 아래 고정 content DTO**를 가진다. API는 extra=forbid와 길이·배열·URL 검증을 사용한다. DB도 JSON object/필수 키/타입, kind별 사용 가능 필드 CHECK를 둔다. payload에 owner·verified·score·status 등 권한 필드를 섞을 수 없다.

| kind | content 계약과 기존 필드 대응 |
|---|---|
| RECORD | description, displayType. 사용자 타임라인이며 공식 진단/수료와 sourceKind로 구분. tone/icon은 code 기반 표시값으로 계산 |
| JOURNAL | situation, role, action, result, learning, resumeMemo, desc. bookmark/resumeUsed/tags는 일반 컬럼. desc와 situation의 과거 차이가 있으면 둘 다 보존 |
| PROJECT | role, periodText, startDate/endDate(optional), stack[], description, result, link(optional http/https). 제목은 일반 컬럼 |
| SKILL | level integer 1~5. 이름은 title, 분류는 code. 자기평가 수준이며 AI/진단 점수 아님 |
| CERTIFICATE | issuer, certificateNumber(optional), scoreText(optional), description. cert_id는 명시 선택한 기존 사전 ID일 때만 연결 |
| LANGUAGE | language, testName, scoreText, issuer(optional), description. 다회 응시별 별도 ID. 시험명/점수만으로 자격증 원천과 합치지 않음 |
| AWARD | rank, host, description. 날짜는 공통 날짜 계약 |

문자열 상한 제안: title 200, 설명/STAR 각 10,000, 소개 5,000, tags 최대 20개·각 50, stack 30개, URL 2,000, 첨부 10개/항목. 이는 기술적 한계로 OpenAPI에 고정하며 업무상 더 큰 값이 필요하면 Opus가 조정한다. partial date(월 단위·기간 문자열)를 첫날로 조작하지 않고 date_precision과 원문을 보존한다. 범위 검색에서 날짜 미상은 별도 필터로 취급한다.

새 사용자 자료는 `source_kind=SELF_REPORTED`. verified 필드를 받지 않는다. 학사에서 받은 취득 자격은 기존 student_cert 중 실제 취득 근거가 있는 행을 `sourceKind=ACADEMIC_CERT`로 읽기 전용 projection한다. **student_cert의 on/off 선택 API로 자기신고를 검증된 취득으로 쓰지 않는다.** 같은 자격의 자기신고·기관 확인 사실은 서로 다른 출처로 표시하며 이름으로 자동 중복제거하지 않는다. 검증·반려 workflow는 별도 미결 범위이며 이번에 verified=true나 검증자 필드를 임의 생성하지 않는다.

일지 삭제는 logical delete + append event다. 제출/AI input에 사용된 과거 내용은 immutable snapshot에서 유지한다. 성장자료 작성/수정만으로 로드맵 칸을 DONE으로 만들지 않는다. 비프로그램 칸의 수동 완료는 권한 있는 상담사가 별도 명시 전이하며 자기신고는 그 근거 중 하나일 뿐이다.

### 4.2 STAR 재사용

`star_track(student_uid,payload)` 그대로 읽기 정본으로 사용하고 기존 seed import를 재활용한다. read service는 payload schema를 검사하고 selected/cohort/track/axes 등 기존 StarTrackRecord를 반환한다. 사용자·상담사에게 새 선발/점수 수정 API를 제공하지 않는다. 트랙 기록이 없으면 notSelected이며 전 학생 공통 레코드를 생성하지 않는다.

기존 aiComment는 학생별 STAR_COMMENT run+ai_comment로 옮기고 payload의 원문은 legacy 보존 후 런타임 읽기에서 제외한다. STAR의 선발 자격·검사 재사용·인증단계·장학 산식은 D09/D10 전까지 재계산하지 않는다. API는 `metricsStatus=POLICY_PENDING`인 미확정 수치를 null로 반환한다. 이미 확인된 step DONE/total, 기록 수 등은 SQL의 jsonb 전개 집계로 반환할 수 있지만 합격/장학금을 유도하지 않는다. 화면은 null을 0점/탈락으로 바꾸지 않는다.

연계 조회는 실제 counsel/diagnosis/program/academic 원천을 읽고 source ID를 제공한다. 해당 검사 시드의 done 배열만으로 현 진단 완료를 판정하지 않는다. 어떤 과거 응시를 STAR 자격에 인정할지는 D09의 결정 후 별도 policy version을 적용한다.

### 4.3 포트폴리오 조회와 파일

`PortfolioDTO`는 academic identity + growth_profile + growth_entry(자기입력) + 기존 공식 원천 projection + job_resume(실제 본인 자료)를 합친다. `/growth`와 `/mypage/portfolio`가 동일한 entry ID를 쓰며 상담사 StudentDetail도 같은 projection을 쓴다. INITIAL_*와 합성 연락처 fallback을 제거한다. 학사 값은 포트폴리오 폼에서 편집할 수 없고 빈 연락처는 빈 값이다.

file_object에 owner_kind=GROWTH_ENTRY, slot=PORTFOLIO_ATTACHMENT를 **기존 CHECK allowlist에 추가**한다. job_file의 소유 규칙을 완화하여 모든 종류를 허용하지 않는다. `/growth-files`가 기존 파일 저장 service를 호출하되 새 owner/slot을 서버가 지정한다. file_id 직접 전달 시 uploaded_by=본인, READY, 일치 slot/owner_kind, 미결합 또는 동일 entry인지를 잠금 아래 검증한다. 다른 학생·다른 문서의 파일을 재소유시키지 않는다.

파일 목록 DTO는 id/name/mime/size/downloadUrl만 반환하고 storage_key·실제 경로는 숨긴다. 스트리밍 최대 크기·확장자/MIME 검증은 현재 files.py 기준을 유지한다. 새 포트폴리오 첨부에서 허용할 추가 형식이 있다면 별도 승인한 allowlist로만 확장한다. 미결합 업로드는 재시도 가능한 staging 상태로 관리하고 이력 있는 파일을 자동 삭제하지 않는다. bytes 저장 성공 후 DB transaction이 실패하는 orphan도 정기 inventory 대상이며 #42 보존 결정 전 물리 GC를 수행하지 않는다.

채용 제출 P를 승인하면 **기존 `job_application_attempt`에 새 nullable portfolio_snapshot JSONB, portfolio_schema_version, portfolio_hash, portfolio_source_version**만 추가한다. 기존 attempt는 UPDATE하지 않는다. 새 PORTFOLIO 신청 transaction이 다음을 수행한다.

1. 기존 jobs gate·공고·동의·본인 검증을 통과한다. provider unavailable/선택 항목 부족이면 503/422이며 attempt를 만들지 않는다.
2. growth_profile 부모와 선택 entry·resume·file을 §6.2의 순서로 잠그고 요청 expectedPortfolioVersion 및 선택 resume versions를 검사한다. 그 뒤 **한 SQL statement**에서 학사·프로필·선택자료를 합쳐 같은 statement snapshot으로 읽는다. READ COMMITTED의 여러 SELECT 결과를 무조건 같은 시점이라고 가정하지 않는다. 관련 원천은 academic 식별/조회시각과 함께 저장한다. serialization/deadlock 재시도는 동일 key로 transaction 전체를 다시 실행한다.
3. **선택한 제출 항목만** 본문과 근거 file IDs/hash로 동결해 새 attempt에 insert한다. 개인 일지 전체·비공개 메모·다른 자소서를 자동 포함하지 않는다.
4. 제출 파일은 성장 entry 소유 그대로 두고 attempt snapshot에 참조한다. 파일 재업로드/재소유를 하지 않는다. 이후 현재 entry의 첨부 해제나 수정이 과거 제출의 byte 접근을 끊지 않도록 submitted reference를 파일 retention/download 권한 근거로 검사한다.
5. 재지원은 새로운 snapshot을 가진 새 attempt. 기존 제출본·평가 연결·거절/재지원 이력은 그대로다. 문서 접근은 기존 `job_access_event` 패턴으로 남기며 단순 내용 수정 이력과 구분한다.

`jobs/capabilities.portfolio`는 provider 배포·검증·D07 승인 모두 끝난 뒤에만 true로 바꾼다. 이력서 PDF/인쇄는 저장된 projection을 사용하고 현재 비영속 출력 동작을 별도 공식 파일 저장으로 가장하지 않는다.

## 5. 생성 결과 provider — 임시 AI/판정 금지

로드맵 생성 service는 점수·유형·추천 문장을 계산하지 않는다. 입력을 검증하고 **이미 존재하는 승인 산출물**을 받아 계획으로 채택한다. provider 인터페이스는 `resolvePlan(inputSnapshot) → {runId, schemaVersion, inputHash, axes[3], baseItems[15]}`다.

### 5.1 입력과 fixture 이전

- student_uid, 대상 세대, counsel_request_id, 목표 직무/기업, 사용한 진단 attempt/result ID, 최신 student_type_event ID, 학사 자료 revision/시각, provider schemaVersion을 immutable input으로 기록한다.
- 상담에서 확정하려는 유형이 기존 이벤트와 다르면 요청의 `proposedFinalType`은 **상담사의 제안 입력**으로만 기록한다. ai input에 `typeContext={source:COUNSEL_PROPOSAL,baseTypeEventId,code,counselRequestId}`를 남기며 학생의 현재 유형을 바꾸지 않는다. 이후 상담 complete에서 제안과 finalType의 일치 및 최신성 검증 후 기존 student_type_event에 한 번 append한다. roadmap에 final_type 컬럼을 두거나 진단 결과를 수정하지 않는다.
- 기존 `roadmapOutcome`을 가진 학생만 명시적 manifest로 ai_run(kind=ROADMAP_GENERATION,model=fixture), ai_suggestion에 적재한다. 축 3개는 category=axis·meta.axis, 기본 칸 15개는 category=item·meta.axis/position/priority/importance 및 원문 이유. ai_score는 원래 점수가 있을 때만 쓰며 생성 성공을 위해 새 점수를 만들지 않는다.
- ai_run의 신규 provenance는 `input_snapshot jsonb`, `input_hash`, `schema_version`, `source_ref` nullable 확장으로 저장한다. 기존 append-only run에 값을 UPDATE하지 않는다. 새 run부터 필수인 조건을 둔다. source_ref에는 seed_source path/checksum/학생 키 또는 실제 provider 근거를 둔다.
- seed의 outcome와 현재 roadmapAxes는 서로 다른 자료다. 현재 채택된 계획의 rationale/why 분리용 run과 향후 생성 후보 run을 별도 source_ref로 구분한다. 새 생성 fixture는 그대로 재사용 가능한 승인 입력 범위/목표를 manifest에 명시해야 한다.

fixture 원본 산출물과 특정 세대의 채택 기록도 구분한다. provider가 원본을 이번 세대에 사용하도록 명시 허용한 경우에는 채택 transaction에서 이번 입력·대상 세대를 가진 새 ROADMAP_GENERATION run 및 그 출력 행을 append하고 `source_ref`에 원본 run/checksum을 남긴다. `model=fixture` 그대로이며 실제 LLM 재호출로 기록하지 않는다. roadmap/axis/item은 이 **세대별 채택 run**을 참조한다. 같은 key 재시도는 같은 채택 run, 실제 다음 재생성은 다른 run이다. 원본 fixture에 허용되지 않은 목표/유형을 붙이는 우회는 이 경로에서도 불가하다.

### 5.2 생성 시 처리

서버는 student·counsel·목표·typeContext가 fixture의 명시된 입력 계약과 맞을 때만 사용한다. 임의 목표 이름으로 바꾸고 같은 15칸을 붙이지 않는다. 매칭 결과 없음은 **503 ROADMAP_GENERATOR_UNAVAILABLE** 및 capabilities.canGenerate=false(reason)다. 문구 채우기, 평균점수·학년·학과 기반 판정, 15칸 템플릿 자동 생성은 하지 않는다. 자유 목표 입력이 가능하더라도 provider가 없으면 생성할 수 없다는 상태를 보여준다.

미래 실제 AI provider는 같은 계약으로 새 immutable run을 append하며 모델/입력/schemaVersion을 기록한다. 외부 호출은 긴 DB 락 밖에서 수행하고, 채택 transaction에서 입력 근거와 expectedVersion을 다시 검사한다. source=fixture를 실시간 AI 성공으로 표시하지 않는다. 성장 추천의 가짜 타이머는 ACTIVITY_RECO의 기존 결과 조회 또는 실제 새 run의 상태 표시로 교체한다.

## 6. 상태·트랜잭션·자동편입

### 6.1 상태와 중간 저장 — 조건부 권고안

D01의 권고는 **초안 저장 허용**이다. 승인 시 DRAFT→REVIEW→CONFIRMED; REVIEW→DRAFT는 수정 재개. 새 계획·재생성 계획은 DRAFT, 형식 검증 후 REVIEW, 권한 있는 상담사가 3축·15칸·근거를 확인하면 CONFIRMED다. review가 다른 직원을 요구하는 별도 결재를 뜻하지는 않는다. 이중 결재 업무가 필요하면 추가 결정해야 한다.

**최소 스키마를 유지하는 D02 권고안:** 처음 생성/재생성한 현재 계획의 draft만 DB에 보관한다. 재생성 저장이 성공하면 구계획은 snapshot으로 이동하고 현재는 DRAFT이므로 학생의 다음 단계는 재확정까지 잠긴다. 이미 확정한 계획의 일반 편집은 로컬 미저장 form에서 작성해 검증된 변경을 원자적으로 확정 상태에 반영한다. 확정 계획 위에 별도 영속 편집본을 병행 보관하지 않는다.

이 방식은 재생성 중 학생 접근성에 영향을 주므로 **사용자 답변 없이 선택하지 않는다**. 구확정본을 계속 서비스하면서 별도 초안을 저장하라는 답이면 현 구조 1벌로 두 상태를 표현하지 말고 별도 draft aggregate 설계를 재검토한다. ai_run·request.payload·snapshot을 mutable draft 저장소로 전용하지 않는다. D01에서 중간 저장 불필요라고 답하면 confirmed boolean을 유지하고 생성/편집/확정을 한 transaction으로 제한한다. 이하 API의 draft/review만 제외하며 나머지 구조는 같다.

### 6.2 잠금과 멱등성

모든 신규 사용자 쓰기는 `Idempotency-Key`와 version 조건을 받는다. 기존 dc.idempotency의 actor+route+key/hash/response 저장을 재사용한다. 같은 키/같은 정규화 payload는 같은 응답, 다른 payload는 409 IDEMPOTENCY_CONFLICT. 재시도 전에 **현재 인증·메뉴·scope를 다시 검사**하여 이전 응답으로 권한 철회를 우회하지 못하게 한다. 실패/rollback은 성공 응답을 남기지 않는다.

잠금 순서는 모든 관련 진입점에서 통일한다.

1. 멱등성 advisory lock.
2. roadmap lifecycle advisory lock: 개설·편입 조건 변경·최초편입 배치는 **exclusive**, 학생별 생성/편집/확정·수료/철회·CARE7 완료는 **shared**. PostgreSQL transaction-scoped shared/exclusive lock으로 개설 대상 누락 race를 막는다.
3. 필요한 program 행 ID 정렬 → counsel_request ID 정렬 → student 행 UID 정렬 → roadmap → child items/requests ID 정렬.
4. 성장/제출은 growth_profile → growth_entry ID → job_resume ID → file_object ID 정렬. 채용 transaction은 기존 공고/신청 lock 다음 이 순서를 사용하고, 성장 CRUD가 역으로 채용 행을 잠그지 않는다.

학생 행 lock은 **roadmap이 아직 없는 동시 생성**을 직렬화한다. 부모 roadmap FOR UPDATE 이후 expectedRoadmapVersion과 expectedVersion(lock_version)을 검사한다. 칸 변경은 필요 시 expectedItemVersion도 검사한다. 프로그램 연동도 부모를 잠근 뒤 수정한다. `sync_roadmap()` 안에서 뒤늦게 lifecycle lock을 잡으면 기존 호출부의 program lock과 역전될 수 있으므로 **programs/counsel 진입점부터** 순서를 변경해야 한다.

자동편입은 초기에는 동기 SQL transaction으로 구현한다. fanout이 큰 경우 exclusive lock 지연·timeout을 부하검증하고 완료 가능한 상한을 정한다. 실패하면 개설 전체 rollback; 성공처럼 응답한 뒤 일부 학생만 편입하는 방식 금지. outbox는 운영 부하로 동기 처리가 불가능함이 확인되면 별도 확장하며 현재 설계에서 근거 없이 테이블을 미리 만들지 않는다.

### 6.3 재생성 원자성

1. 생성 근거 준비 → 잠금 → scope/CARE7/input/버전 재검증.
2. 현재 계획이 있으면 서버 시각 asOf로 전체 구성·완료 상태·분자/분모를 계산해 **기존 세대 version의 snapshot을 append**한다. legacy base/override/가상 칸을 프론트에서 받아 snapshot으로 삼지 않는다.
3. 기존 현재 items/axes 교체, roadmap.version을 1 증가, lock_version 증가, 새 상담·목표·AI 근거 설정. 처음 생성은 version=1.
4. 새 3축/15칸 모두 TODO. 구세대 완료·미완료·자동 프로그램 칸 **모두 이월하지 않는다**. 구 item ID를 새 결과로 재사용하지 않는다. 새 provider가 DONE이나 기존 live programId를 넣으면 거부한다.
5. 재생성·삭제/추가 item events와 roadmap_event append, 명시 요청 반영이 있으면 같은 transaction에서 처리. 어느 단계 실패든 snapshot 포함 전부 rollback한다.

구세대 request/event에는 원래 세대가 남는다. 기존 수료·진단·학사 사실을 삭제하는 것은 아니다. 그 사실이 새 계획 완료로 자동 승계되지 않는다는 뜻이다. 이전 프로그램을 새 계획에 다시 연결할지/어떤 새 수료를 인정할지는 D11이며, 승인 전에는 과거 프로그램 스캔으로 칸을 재생성하지 않는다.

### 6.4 프로그램 개설 편입 — 이번 R에 포함

PROCESS §6.4와 기존 `programCells()`의 대체에 필수이므로 범위에 넣는다.

- 신규 개설 transaction에서 roadmap_entry=NONE이면 0칸, RECOMMEND/REQUIRED이면 저장된 care_types에 해당하는 **현재 유형의 현재 계획**에 프로그램당 IAP 자동칸 하나를 insert한다. 최신 student_type_event를 SQL로 조회하고 `(college,dept)`와 대상 신분은 승인된 정책으로 검사한다. 연계 도메인 한정 자동 시스템 작업이므로 호출 상담사의 담당 학생만 골라 fanout하지 않는다. 개설 권한은 menu_auth로 검사하되 시스템 편입 결과에서 다른 학생 ID/상세를 응답하지 않는다.
- draft가 존재하면 같은 현재 세대에 붙이되 학생 공개 여부는 계획 상태를 따른다. 계획이 없는 학생에게 계획/축을 새로 만들지 않는다. 개설 직후 처음 계획을 갖게 된 학생/과거 개설분은 D11 결정 전 자동 backfill하지 않는다.
- 칸은 title 등 개설 당시 표시값과 program FK를 가지며 origin=AUTO_PROGRAM, entry/마감/개설 cause를 기록한다. `UNIQUE`와 멱등성으로 중복 차단. 프로그램 타이틀이나 순위 계산을 브라우저에서 합성하지 않는다.
- RECOMMEND의 expiry는 신청 마감일 **다음 날 00:00 Asia/Seoul**의 timestamptz(배타적 상한), REQUIRED는 expires_at=NULL. 신청 마감 없는 RECOMMEND는 신규 쓰기 422이며 기존 결측은 import_issue로 올린다. 서버 현재 시각 `< expires_at`일 때만 미완료 추천이 alive다. DONE은 마감 후에도 alive, REQUIRED는 영구 유지.
- 신규 편입마다 학생별 roadmap_event(action=PROGRAM_INSERT)에 program ID/version·대상 유형 event ID·entry·마감의 당시 값을 남기고 item.entry_event_id로 연결한다. 개설 transaction_id는 모든 대상 사건에 같게 둔다. 프로그램 개설 헤더용 별도 이벤트 테이블을 중복 신설하지 않고 이 도메인의 실제 편입 사건으로 원인과 대상 수를 추적한다.
- 삭제가 아니라 SQL alive 필터로 숨긴다. 만료 job이 이력을 지우거나 snapshot을 바꾸지 않는다. DST/브라우저 시간대에 의존하지 않는다.
- 기존 프로그램의 편입구분/대상유형 변경은 D11 답 전까지 자동 삭제·소급 완료·유형 승격 시 제거를 하지 않는다. 안전한 초기 경계는 **이미 연결된 프로그램의 편입 조건 변경을 409로 차단**, 제목/운영설명 등 비편입 필드만 수정 허용이다. 이 제한도 사용자 승인 범위에 포함한다. 단순 신청 마감 변경의 기존 추천칸 expiry 갱신 여부 역시 D11에서 명시한다.
- 기존 프로그램 물리삭제가 연결 칸 FK로 실패하는 경우 500 대신 409 PROGRAM_IN_ROADMAP. 연결 사실/이력이 있는 프로그램을 cascade 삭제하지 않는다.

### 6.5 수료·철회와 수동 완료

비교과 결과 처리에서 selection·attendance는 item을 변경하지 않는다. **outcome COMPLETED 전이만** 현재 연결 item을 DONE으로 만들고 completion_ref에 실제 program_apply/round 및 결과 event를 기록한다. 수료 철회·취소·신청 제거는 동일 transaction에서 TODO로 전이하며 이전 DONE event는 유지한다. 부모 lock_version·item.version·item_event·program 결과 event가 함께 commit/rollback한다.

이미 동일 outcome인 재시도는 새로운 수료 사건을 만들지 않는다. 같은 과거 수료를 재전송하여 재생성 이후 칸을 닫는 것을 막는다. 서로 다른 세대에 같은 item ID를 쓰지 않고 event에는 세대를 기록한다. 프로그램 칸의 status/programId/entry/expiry/origin은 roadmap 편집 DTO에서 수신 금지다.

수동 칸은 상담사 명시 completion API로 TODO↔DONE, 이유/참조를 남긴다. 성장일지 작성·찜·프로그램 선발·출석·자기신고만으로 닫지 않는다. 학생의 직접 칸 완료 권한은 현재 확정 계약에 없으므로 제공하지 않는다.

## 7. SQL 읽기·단일 게이트·권한

### 7.1 SQL projection

공통 SQL read service는 한 요청의 동일 asOf를 사용한다. alive 조건은 `status='DONE' OR entry<>'RECOMMEND' OR (expires_at IS NOT NULL AND asOf<expires_at)`이며 신규 RECOMMEND 결측을 허용하지 않는다. 기존 결측 처리 방식은 import_issue와 함께 legacy 표시로 분리하고 임의 기한을 만들지 않는다. API cutover 전 이슈를 해결하거나 읽기 정책을 명시 승인한다.

done=`COUNT(*) FILTER (alive AND status='DONE')`, total=`COUNT(*) FILTER(alive)`, pct는 total=0이면 0 아니면 SQL round(100.0*done/total). 축별·전체·목록·통계·snapshot 모두 같은 view/function을 사용한다. hasRoadmap(존재), confirmed(확정), canAccess(게이트)를 따로 반환한다. `student_list`의 roster fallback progress를 이 도메인에서 제거하고, 미생성은 숫자 시드가 아니라 hasRoadmap=false다.

목록은 SQL WHERE+ORDER BY+LIMIT/OFFSET 및 같은 조건 COUNT. 정렬은 날짜/점수 뒤 ID tie-breaker. `items,totalCount,page,pageSize`(기본 20, 최대 100)로 기존 programs/jobs 응답을 따른다. 검색·상태 tab count·학생별 요청수·성장 분류/태그 수·STAR 완료수·이행률 분포 모두 SQL이다. 프론트의 `.length`, 전체 다운로드 후 filter/reduce를 전체 모수로 쓰지 않는다. scoped 응답의 global count 노출 여부도 권한 계약으로 고정한다.

### 7.2 순차 게이팅

기존 gates.py를 확장한 데이터층 **단일 정책 함수**가 단계별 allowed/reasonCode/message/nextRoute와 capabilities를 만든다. jobs·program 신청·학생 roadmap/growth·프론트 pipeline이 같은 결과를 사용한다. 진단 상태는 기존 persisted attempts+student_type_event를 읽으며 fixture 유형만으로 검사를 완료 처리하지 않는다.

| 행위 | 필요한 상태 |
|---|---|
| 상담사 최초/재생성 | 진로취업 CARE7 확정 예약/진행 맥락, menu+scope, 적합한 생성 근거. 상담 DONE을 선행 요구하지 않음 |
| 상담사 계획 조정·확정 | 현재 담당 scope 및 roadmap 편집 권한, 근거가 맞는 계획. 새 상담으로 재생성할 때 해당 상담 명시 |
| CARE7 상담 완료 | 해당 request에 연결된 confirmed 계획, finalType 입력과 생성/상담 제안 맥락 검증, 기존 완료 조건. 유형 이벤트+기록+완료를 같은 transaction에 append |
| 학생 다음 단계 | 필요한 진단 완료 + 진로취업 CARE7 완료 + **그 완료 상담에 연결된 현재 확정 계획**. legacy 예외는 D03에만 명시 |
| 일반/심리/교수 상담 | CARE7 계획을 만들거나 다음 단계를 열지 않음 |
| 기존 자료 조회·편집 | 성장/포트폴리오가 CARE7 이전에도 허용될 범위는 D06. 규칙 확정 전 클라이언트 학년 분기를 서버 자격으로 승격하지 않음 |

재상담에서 유형이 바뀌면 새 student_type_event에 따른 기존 진단 정책을 다시 읽는다. 원래 완료한 검사 기록을 지우거나 새 검사 완료를 만들어 주지 않는다. 기존 jobs/counsel gate 회귀 테스트의 개방 사례는 명시적 상담 관계 또는 승인된 legacy 근거를 갖추게 한다. 기존 과도하게 열린 상태를 영구 우회로 보존하지 않는다.

### 7.3 권한 행렬

모든 identity는 principal과 DB에서 alias→intg_uid로 해석한다. actor/owner는 body에서 신뢰하지 않는다. 교직원은 **dc.menu_auth와 dc.staff_student_scope 모두** 통과해야 한다. jobs.py의 staff.role_code OR 활성 auth_user 역할 해석을 재사용한다. 시스템관리자·과거 담당 상담사라는 이유만으로 허용하지 않는다.

| 주체/행위 | 권한 |
|---|---|
| 학생 | 본인 공개 계획/성장/STAR 읽기, 본인 변경요청·성장 CRUD·wish. 타인 ID 404 또는 동일한 정책의 403. 계획 생성/편집/확정·공식 완료·STAR 점수쓰기 금지 |
| 진로취업 상담사 계획 | 활성 `roadmap.0` + scope. 요청 목록/처리는 `roadmap.1`, 통계는 `roadmap.2`. 편집과 요청 반영 동시 수행은 둘 다 필요 |
| 포트폴리오/STAR 상담사 조회 | 기존 학생 상세 계약에 맞춘 `students.0` 또는 `students.1` **및 career 업무 권한 및 scope**, D06의 공유 항목만. 광범위 전체학생 메뉴로 scope를 우회하지 않음 |
| 성장·퀘스트 상담사 조회 | 학생 상세 menu+scope와 필드별 공개 계약. 현행 psychAllowed=true를 조사 근거로 남기고 심리상담사의 기존 제한 열람까지 일괄 차단하지 않음. 본문/메모/연락처의 상세 범위는 D06에서 확정 |
| 심리/교수/조교 | 현재 요청 범위의 진로 로드맵 편집·포트폴리오 본문/파일 기본 거부. 과거 UI 숨김만 믿지 않음. 조교 상세 확대 #12 미결은 별도 |
| 프로그램 자동편입 | programs 등록/관리 menu 검증 후 제한된 서버 시스템 동작. 전체 대상에게 적용되더라도 개인 자료 조회 권한을 호출자에게 추가하지 않음 |
| 채용 담당 제출본 조회 | 기존 채용 menu+학생 scope, 해당 attempt에 포함된 snapshot/file만. 현재 개인 일지 전체 열람 권한 아님 |

bootstrap/profile/student_detail/AI/raw file 및 export를 포함한 **모든 우회 경로**에서 같은 필드·scope 정책을 적용한다. 특히 학생 detail/roster의 roadmapOutcome, legacy roadmap/phases, recommendations, star/growth/portfolio에 해당하는 복사 필드는 전용 provider로 대체하거나 응답에서 제거한다. source archive 자체는 운영 API로 노출하지 않는다.

## 8. API·DTO 계약

경로는 기존 router와 동일한 API prefix 내부 상대 경로다. 성공 후 cache를 갱신할 수 있도록 새 version과 변경 DTO를 반환한다. 생성 ID는 서버가 발급한다. JSON 날짜는 ISO, 시간은 timezone 포함, 화면 한글 label은 code 메타로 표시한다.

### 8.1 로드맵

| API | 요청/응답·원자성 |
|---|---|
| `GET /students/{identity}/roadmap` | `{roadmapVersion,version,status,confirmed,targetRole,targetCompany,counselRequestId,axes,progress,byAxis,capabilities,asOf}`. 없으면 `{roadmap:null,capabilities}`. raw student.detail fallback 없음 |
| `GET /roadmaps` | 학생 목록/미생성/상태/유형/조직쌍/q/page 필터. generation 가능한 후보 여부도 서버 capability. 전체 상세 선적재 금지 |
| `GET /roadmaps/summary` | 동일 scope/filter SQL 통계. 학생별 민감 데이터 전체를 내려 계산하지 않음 |
| `GET /students/{identity}/roadmap/generation-capability` | canGenerate/providerSource/reasonCode/허용 context. outcome 본문·정답/상담 메모는 노출 안 함 |
| `POST /students/{identity}/roadmap/generate` | `{counselRequestId,targetRole,targetCompany,proposedFinalType?,providerResultId?,expectedRoadmapVersion:0,expectedVersion:0}` + key. 첫 생성만; 15칸 payload를 클라이언트가 생성해 보내지 않음 |
| `POST .../roadmap/regenerate` | 같은 근거 + 현재 두 version + reason + requestIds/version(optional). snapshot/교체/event 원자적 |
| `PATCH .../roadmap` | `{expectedRoadmapVersion,expectedVersion,operations[],note,requests?}`. operations는 axisHeadline/editorNote 수정, BASE 칸 필드 수정/교체/순서 변경 등 allowlist. 전체 axes overwrite DTO 없음 |
| `POST .../roadmap/review`, `.../confirm` | 두 version + key. D01 승인 시 상태 전이. confirm은 3×5·근거·코드 재검증 |
| `POST .../roadmap/items/{itemId}/completion` | 두 parent version + expectedItemVersion + `{done,reason,evidenceRef?}` + key. 수동 칸만 |
| `POST .../roadmap/restore-edit` | 되돌릴 roadmap_event ID + 현재 두 version + key. 현재 세대의 허용 필드만 역변경하고 새 event. 과거 snapshot 통째 복원/원래 history 삭제 금지 |
| `GET .../roadmap/events`, `.../snapshots`, `.../snapshots/{version}` | 목록 서버 page, 상세 동결 payload. D05에 따른 학생 공개 설정. snapshot/version을 현재 계획으로 수정하는 endpoint 없음 |
| `POST /students/{identity}/roadmap-requests` | `{title,reason,axis?,targetItemId?,expectedRoadmapVersion,expectedVersion}` + key. 학생 정보/현재 세대는 서버 확인 |
| `GET /roadmap-requests`, `GET .../{id}/events` | 본인 또는 menu+scope, status/student/조직/q/page. count는 별도 summary 또는 같은 응답 summary |
| `POST /roadmap-requests/reject` | 최대 100개의 `{id,expectedVersion}` + reason + key. 모두 scope·상태검사 후 전부 commit 또는 전부 rollback |

계획 편집 예시(설명용 DTO):

```json
{
  "expectedRoadmapVersion": 2,
  "expectedVersion": 9,
  "operations": [
    {"op": "editItem", "itemId": "server-issued-id", "expectedItemVersion": 3,
     "fields": {"title": "프로젝트 결과 정리", "editorNote": "상담에서 합의한 제출물"}}
  ],
  "requests": [{"id": "request-id", "expectedVersion": 1}],
  "note": "변경 요청 반영"
}
```

응답 `roadmapVersion`은 세대, `version`은 aggregate lock_version이다. 기존 meta.version이 생성 모듈에서는 세대, override에서는 편집횟수였으므로 프론트 타입을 명시적으로 분리한다. 둘을 한 필드에 번갈아 매핑하지 않는다.

### 8.2 성장·STAR·파일·추천

| API | 계약 |
|---|---|
| `GET /students/{identity}/growth/profile` | 학사 읽기 전용 필드 + 자기입력 소개/연락처 + version/capabilities |
| `PATCH .../growth/profile` | 자기입력 필드만 + expectedVersion + key |
| `GET .../growth/entries` | kind/category/tag/bookmarked/date/q/page 필터, Page<EntryDTO>. deleted 제외, sourceKind·version 포함 |
| `GET .../growth/entries/{id}` | 소유권/공유 범위 확인 후 상세 |
| `POST .../growth/entries` | kind별 DTO + expectedProfileVersion(최초 0 허용) + key, 서버 ID 발급 |
| `PATCH .../growth/entries/{id}` | 부분 fields + expectedVersion + expectedProfileVersion + key |
| `DELETE .../growth/entries/{id}` | expectedVersion/expectedProfileVersion + key, logical delete + event |
| `GET .../growth/summary`, `.../growth/timeline` | SQL counts/tags, 공식 원천/자기기록 구분한 paginated timeline |
| `GET .../growth/events` | 본인/허용 staff scope, page. 민감 삭제 전 원문 공개 범위는 D06 적용 |
| `GET .../star-track` | 기존 payload의 typed projection + SQL 확인 가능 summary + metricsStatus/capabilities + 별도 AI comment DTO |
| `GET .../growth/recommendations` | 기존 ACTIVITY_RECO를 공통 AI read service로 조회; source/model/runId 표시. 새 AI 생성 성공을 흉내내지 않음 |
| `GET .../portfolio` | 선택 범위의 통합 projection + version과 원천별 version. 제출 snapshot과 현재 조회는 구분 |
| `POST /growth-files`, `GET /growth-files/{id}` | 기존 streaming storage 사용. 학생 본인 upload; download는 entry 또는 submitted attempt에 대한 실제 접근권한 재검사 |
| `POST .../growth/entries/{id}/files`, `DELETE .../files/{fileId}` | file claim/unlink + 양쪽 version + key. 직접 URL·base64 수신 금지 |
| `GET /program-wishlist` | 본인 것만 page 응답 |
| `PUT /program-wishlist/{programId}` | `{wished,expectedVersion}` + key, 최초 version=0. toggle API 대신 원하는 상태 명시 |

기존 program list에 `wished=true`, 필요한 sort/filter와 SQL 허용 summary를 확장한다. 프로그램 운영을 새 성장 API로 복제하지 않는다. 본인 resume CRUD는 기존 jobs API를 사용하고 상담사 포트폴리오 읽기는 승인된 projection을 통해서만 제공한다.

### 8.3 오류 계약

HTTPException의 기존 detail 구조와 공존하도록 신규 API는 `detail={code,message,fieldErrors?,currentVersion?,currentRoadmapVersion?,nextRoute?}`를 쓰고 shared/api가 문자열/구조 둘 다 처리하도록 C5에서 변경한다. 해당 학생에 대한 권한 없는 요청에는 버전·소유자·본문을 넣지 않는다.

| HTTP | 대표 code |
|---|---|
| 401/403/404 | UNAUTHENTICATED / MENU_DENIED / SCOPE_DENIED 또는 존재 비노출 NOT_FOUND |
| 409 | VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, INVALID_TRANSITION, STALE_REQUEST_TARGET, GENERATION_INPUT_CHANGED, PROGRAM_IN_ROADMAP |
| 422 | INVALID_AXIS_COUNT, INVALID_CODE, INVALID_FIELD, INVALID_FILE_OWNER, INVALID_COUNSEL_BASIS, DEADLINE_REQUIRED |
| 413/415 | 기존 파일 크기/형식 거부 |
| 503 | ROADMAP_GENERATOR_UNAVAILABLE, PORTFOLIO_PROVIDER_UNAVAILABLE, GROWTH_POLICY_UNAVAILABLE |

network/500/503에서 JSON/localStorage로 fallback하거나 성공 toast를 먼저 띄우지 않는다. 409는 최신 DB를 재조회하고 사용자의 미저장 form을 보존하여 비교할 수 있게 한다. 멱등 재시도는 동일 key를 유지한다.

## 9. 미션·퀘스트의 조건부 상세 계약

현재 페이지는 영속 상태가 아니므로 “기존 이력 DB화”와 “신규 운영 서비스”를 구분해야 한다. D08~D10 답 전에는 capability=false/reason=POLICY_PENDING과 소유된 기록 없음 상태를 제공한다. 공통 9개 로그·달력·랭킹을 실사용자 데이터로 넣지 않는다.

### 9.1 학습 미션을 운영하기로 승인한 경우에만

최소 구조는 다음 3테이블이다. 진단 attempt 테이블은 생명주기·판정 권한이 달라 재사용하지 않는다.

- `growth_mission_definition`: immutable UUID PK, kind WORD/MAJOR/NCS(code FK), revision, content_schema_version, 공개 학습/문항 payload, **서버 전용 answer/policy payload**, policy_version, source_ref/checksum, created actor/time. 동일 definition 수정은 새 revision. 문제은행 전체 CMS는 만들지 않는다.
- `growth_mission_assignment`: UUID PK, student FK, definition FK RESTRICT, learning_date(Asia/Seoul), kind, UQ(student_uid,learning_date,kind), created_at. 승인된 배정 정책이 확정한 definition을 고정한다. 재조회 때 최신 문제로 바뀌지 않는다.
- `growth_mission_attempt`: UUID PK, assignment FK, attempt_no, answers JSONB, result payload, earned_score NULL 가능, passed NULL 가능, policy_version, submitted_at, actor, UQ(assignment_id,attempt_no). **제출 후 append-only**. 작업 중 답안은 현행처럼 메모리 form으로 두고 제출만 저장한다. 재응시는 새 attempt.

정답/부분일치·성공기준·일일 인정 횟수·전공 배정의 `(college,dept)` 조건을 정책으로 받아야 한다. 현재 프론트의 includes 채점·6/10·2/3을 서버 함수에 고정하지 않는다. 정책 제공 전에는 결과를 판정하지 않고 503. 학습 퀴즈 정책이 승인되어도 CCORE/CARE 유형 판정에는 쓰지 않는다.

API: `GET /growth/missions/today`(본인 assignment·공개 content만), `POST /growth/missions/{assignmentId}/attempts`(answers, expectedAttemptNo, key), `GET /growth/missions/attempts`(본인 또는 승인 scope, page), `GET .../summary`(SQL). 서버가 종료/재응시·모든 문항 응답·정답/점수를 검증하고 client passed/xp는 수신 금지다. 정답 payload는 bootstrap/preview에도 노출하지 않는다. 제출 성공 한 건이 TodayGrowthMission·GrowthMissionLog·달력의 같은 근거가 된다.

### 9.2 퀘스트·XP 운영을 승인한 경우에만

행동 인정·기간·XP·중복/철회·보상 정책이 필요하다. `growth_quest_definition` immutable revision(기간 종류·수행조건·승인 policy_version·보상)과 `growth_quest_event` immutable ledger(student,definition,period_key,source_kind/source_id,delta,occurred_at,actor)를 최소 추가안으로 둔다. source/event/quest/policy별 UQ로 이중 적립 방지, 회수는 원 event FK와 반대 delta의 새 event이며 원행 UPDATE 금지다.

다만 일반형 조건 DSL/임시 자동 판정기를 만들지 않는다. 정책이 명시한 기존 완료 event만 adaptor로 소비하고 진단/미션/수료의 실제 원천 ID를 검증한다. XP·레벨·연속일·랭킹은 SQL, 레벨 구간/동률/모수·개인정보 공개 범위가 없으면 null이다. 지급 금액·장학 결과는 STAR 정책으로 별도 확인하며 화면 상수의 100점·Lv23를 공식 규칙으로 채택하지 않는다. 고부하 이벤트 비동기 전달/outbox는 승인된 이벤트량과 전달보장을 확인한 뒤 설계 확장한다.

이 조건부 테이블들은 기본 024~026 계획에 **포함하지 않는다**. 답변으로 범위가 확정되면 다음 미사용 migration 번호를 배정하고 본 설계/Opus 리뷰를 갱신한다.

## 10. 프론트 교체와 호환 경계

### 10.1 유지할 공개 읽기와 교체할 쓰기

| 기존 모듈/시그니처 | 전환 |
|---|---|
| `getStudentRoadmap(studentId)`, `getRoadmapProgress(studentId)`, `getRoadmapProgressOf(student)` | sync cache selector 유지. 첫 함수는 StudentRoadmap/null, 뒤 두 함수는 서버 progress.pct의 number를 반환. programCells/JS 모수 계산 제거 |
| `getGeneratedRoadmap`, `hasRoadmap`, `canGenerateRoadmap`, `needsRoadmap` | sync API cache projection 유지하되 존재/확정/capability 분리. 시드 outcome/roster 추정 금지 |
| `getRoadmapProgressStats(departments: string[])` | 학과명 기반 인수를 폐기하고 조직 코드쌍/query cache로 전환. async queryRoadmapProgressStats와 SQL summary, 현재 화면의 캐시 읽기 selector를 분리 |
| `getMergedRoadmap` | 이름을 유지할 수 있으나 로컬 overlay 병합 없음. 서버 current+editor 표시 DTO만 반환 |
| `generateRoadmap`, `saveRoadmapOverride`, `resetRoadmapOverride` | Promise 반환 + 버전/key 필수로 변경. 화면 await, reset은 restore-edit event로 교체 |
| `getRoadmapRequests/countRoadmapRequests` | 현재 query cache/서버 summary의 sync 읽기. 신규 `queryRoadmapRequests` async page API. 전체 목록처럼 사용하는 소비자는 변경 |
| `addRoadmapRequest/markHandled/rejectRoadmapRequests` | Promise mutation. markHandled는 실제 수정 transaction의 requestIds로 대체; 단독 처리완료 호출 제거 |
| `getGrowthRecords(studentId)` | sync cache 조회 유지, 소유 없는 GROWTH_RECORDS fallback 제거. 공식 timeline과 사용자 기록 sourceKind 구분 |
| `loadJournalEntries(studentId)` | 기존 이름의 sync cache 조회 adapter 가능. 실제 로딩은 queryJournalEntries/hook로 분리. 서버 page의 entries를 전체 이력으로 오인하지 않음 |
| `saveJournalEntries(studentId,entries[])` | 일괄 overwrite API 폐기. create/update/deleteJournalEntry Promise, ID는 서버 text로 변경하여 route/Entry 타입 소비자 모두 교체 |
| `buildProfile`/INITIAL_* | buildProfile은 허용된 projection 표시 adapter, INITIAL_* 런타임 import 제거. 자기입력 프로필은 서버 데이터 |
| `getStarTrack/getStarSummary/getAxisProgress/getStarLinkedData` | typed cache selector 유지, aggregate는 서버 SQL 결과. 정책 미확정 null 지원을 타입에 반영 |
| wishlist `getWishlist/isWished/toggleWish` | 본인 query cache selector + async setWish(wished,version,key). ID 없는 로컬 목록 폐기 |

동기 시그니처를 유지한다고 네트워크 완료 전 빈 자료를 확정 “미생성”으로 보이면 안 된다. cache는 idle/loading/ready/error와 identity+query+revision을 가진다. selector와 별도 hook의 load state를 함께 사용한다. 큰 목록/본문은 화면 진입·필터 변경 때 page/detail API로 읽고 bootstrap에서 전 학생·전 일지·전 snapshot을 가져오지 않는다.

### 10.2 두 SPA 동기화

shared roadmap/growth cache service를 두 SPA가 공유한다. 프로그램 pattern의 성공 후 재조회·변경 event 방식은 따르되 무한 전체 page 선적재는 복제하지 않는다. write 성공 후 현재 resource·summary·profile 관련 cache를 invalidate하고, 열린 화면은 15초 polling+window focus 재조회한다. 탭 내 event/BroadcastChannel은 빠른 갱신 힌트일 뿐 정본은 API다. 탭이 달라도 DB의 새 revision을 읽는다.

identity 변경 시 cache를 비우고 이전 학생 body/AI/file을 재사용하지 않는다. RoadmapStatus/StudentDetail/requests의 빈 dependency useMemo를 resource revision 구독으로 바꾼다. 학생 pipeline은 server eligibility를 표시하며 브라우저마다 hasRoadmap 판정을 재구현하지 않는다.

전환 화면 목록: RoadmapCreate/Editor/Requests/Progress·StudentDetail의 roadmap/growth/portfolio/star·학생 roadmap/request/skill-tree·성장 TSX 11개·mypage Portfolio·라운지 기록·공용 보드/STAR/ResumeSheet 및 roster/detail selector. 디자인은 기존 DESIGN.md 그대로, 새 팔레트/레이아웃 생성 없음.

## 11. 마이그레이션·seed·override·롤백

### 11.1 번호와 이행 순서

023까지 적용된다는 전제에서 다음 **계획 번호**를 사용한다. 실제 C5 착수 시 다른 팀의 신규 migration 유무를 다시 확인하고 이미 사용된 번호/파일은 덮어쓰지 않는다.

1. `024_roadmap_operations.sql`: R의 확장·code/FK/trigger/index·SQL projection. D01/D02 승인한 상태 분기만 포함. 기존 column을 파괴적으로 제거하는 단계는 뒤로 미룬다.
2. `025_growth_operations.sql`: G의 6테이블 및 file owner 확장. P 승인 시 attempt snapshot 컬럼 포함, 미승인 시 제외/후속 번호. 임시 미션/XP 테이블 없음.
3. `026_roadmap_growth_backfill.sql`: 소유권 확인된 기존 DB/seed의 derived import, 기존 AI 근거 분리, 요청 status 매핑. 이미 수정된 런타임 행을 seed로 덮어쓰지 않음.
4. Python service/router/DTO와 대상 테스트 → shared stores/selectors → 기존 화면 배선 → 실제 두 SPA 왕복 QA → legacy read 제거 및 별도 cleanup migration 필요 여부 판단.

새 빈 DB는 migrations 후 seed가 실행되므로 derived backfill은 **seed 직후에도 재실행**할 수 있어야 한다(020/021/023 패턴). 기존 DB는 migration 시 현재 데이터에 적용한다. `seed.py`의 already_imported 조기 return 때문에 이미 적재한 DB의 새 자료가 누락되지 않도록 C5에서는 derived 실행 경로를 분리한다. seed_domains의 옛 roadmap/axis/item INSERT가 새 필수 제약을 통과하는지 함께 변경·테스트한다.

### 11.2 backfill 원칙과 대조 항목

- 기존 김채원/김창원의 **현재 DB 3축/15칸과 version/상태를 우선 보존**한다. source JSON이 더 오래되면 현재 DB를 덮어쓰지 않는다. 실제 live 수량이 전제와 다르면 차이를 기록하고 이관을 중단/분리한다.
- rationale/why 현재값은 학생+세대+source checksum으로 식별한 fixture run에 append하고 참조만 현재 행에 연결한다. ON CONFLICT DO NOTHING만 믿고 다른 내용의 동일키를 숨기지 않고 hash 비교 후 불일치를 import_issue로 기록한다.
- 성장일지·STAR의 명시 studentId는 person alias로 해석한다. 학생 없는 행은 import_issue. 이름/학과 유사성으로 소유자를 정하지 않는다. 일지 ID는 `(source_path,student_uid,legacy_id)`에서 결정적 새 ID를 부여하여 학생 간 충돌을 방지한다.
- GrowthHome 공통 상수·INITIAL portfolio·샘플 mission/quest/calendar는 자동 import하지 않는다. 개별 학생에 귀속할 승인된 fixture manifest가 생긴 경우에만 fixture source로 넣는다. 기존 자소서 r1/r2는 023의 소유권/본문을 그대로, r3는 주인 확인 전 보류한다.
- star_track payload는 이미 있으므로 같은 학생을 다시 INSERT하지 않는다. 기존 코멘트를 AI로 분리하되 원 payload archive는 유지한다.
- 요청 NULL 축, 알 수 없는 코드/날짜, 상담 미연결, 중복 snapshot version, program 추천 마감 결측, 기본칸 count 위반을 각각 issue code로 남긴다. 승인되지 않은 입력을 자동 보정하여 통과시키지 않는다.
- source archive는 기존 `seed_source(path,checksum,payload)`와 `import_issue` 재사용. 임의 JSON runtime override 또는 새 “최종 결과” 파일을 만들지 않는다.

### 11.3 브라우저 자료

앱 첫 접속 자동 업로드 금지. 전환 후 localStorage를 읽어 DB 응답에 overlay하는 것도 금지다. 사용자에게 실제 자료가 필요하면 별도 **명시적 export→dry-run 검증→선택 import** 작업으로 처리한다. 소유자가 없는 program wish/portfolio 공통값은 자동 귀속하지 않는다.

로드맵 로컬 백업을 가져올 때는 base+generated+override의 선택 근거를 설명하고 사용자가 검토한 **최종 채택 계획**을 서버 mutation으로 넣는다. DB 세대/현재 version 충돌을 검출하고 기존 snapshot(version)과 같은 키의 자료는 덮어쓰지 않는다. 다른 내용은 원본 archive+import_issue로 남기고 현재 DB 복구/merge 판정을 별도로 받는다. local history의 by가 이름뿐이면 actor를 위조하지 않고 imported actor/legacy text를 분리한다.

성장 자료는 학생 접두사 키도 자동 생성 샘플일 수 있으므로 행별 포함/제외 확인이 필요하다. source checksum+학생+legacy ID/hash로 재실행 멱등성을 확보한다. import 자체의 실행자/일시/source/hash/선택 수/거부 수를 이벤트 또는 import 결과 기록으로 남긴다. 업무 API body의 source_kind를 클라이언트가 fixture/import로 지정하지 못하게 한다.

local keys는 DB 대조·학생↔상담사 확인·복구용 export가 끝난 뒤 해당 키만 제거한다. 로그인 선택 키나 다른 미이관 도메인의 localStorage는 건드리지 않는다.

### 11.4 cutover·롤백

cutover 전 새 read API와 기존 UI 결과를 사용자별로 대조한다. shadow read 비교는 가능하지만 **양쪽 쓰기 금지**다. 도메인별 server capability/배포 설정으로 새 읽기·쓰기를 함께 전환하고 이전 탭의 저장 요청은 명시적 중단/업데이트 안내로 막는다.

문제가 생기면 새 mutation을 일시 비활성하고 마지막 정상 **API-backed** 버전으로 롤백한다. localStorage 쓰기로 되돌리지 않는다. schema는 additive 단계에서 보존하고 새 이력/스냅샷을 삭제하는 down migration을 하지 않는다. restore-edit는 현재 계획의 허용 필드에 대한 새 사건이며 과거 세대를 되살리는 데이터 복구와 다르다.

배포 전 DB dump+파일 volume의 대응 백업을 확보하고 별도 PostgreSQL/volume에서 복구 검증한다. 이 설계 작업에서는 백업 실행·배포·live 변경을 수행하지 않았다. 파일 물리 삭제·보존기간은 #42/#37 결정 이후 별도 정책으로 한다.

## 12. USER_DECISION_REQUIRED 대장

다음 질문은 `03-opus-review.md` 검토 후 team-lead가 사용자 답변과 승인 범위를 `04-decisions.md`에 기록한다. 권고는 승인된 규칙이 아니다.

| ID | 질문과 권고 | 답 없을 때 / 영향 |
|---|---|---|
| D01 | 상담사가 만들다 만 계획을 저장해야 하는가? **권고: DRAFT/REVIEW/CONFIRMED 허용**, 별도 2인 결재는 없음 | status DDL·draft/review API 보류. 현행 2값을 조용히 3값으로 바꾸지 않음 |
| D02 | 재생성 초안 저장 시 구확정본은 snapshot으로 넘기고 학생 단계를 재확정까지 잠가도 되는가? 최소 구조는 이 방식. 구계획 계속 제공+새 영속 초안 병행이면 별도 설계 필요 | 재생성 공개 전이 구현 보류. snapshot을 초안 저장소로 사용하지 않음 |
| D03 | 상담 FK 없는 기존 확정 계획의 단계 접근을 어떻게 유지·검증할 것인가? 권고: legacy 조회 유지, 새 상담 완료 근거에는 불인정, 실제 근거만 수동 연결 | 최신 상담 자동 연결/영구 gate bypass 금지. 기존 게이트 cutover blocker |
| D04 | 변경요청 반려 사유를 필수로 받을 것인가? DB.md #21과 맞춰 결정 | actor/시각/상태 이력은 필수, 사유 필수화는 미확정 |
| D05 | 구세대 snapshot의 학생/상담사 조회 범위와 보존기간은? #37 | 보존·제한된 검수 조회만, 학생 history capability 미개방·자동 삭제 없음 |
| D06 | CARE7 이전 성장/포트폴리오 작성·기존자료 열람, 저학년/졸업생 범위, 진로/심리 상담사에게 공유할 일지 메모/연락처 범위는? 현행 성장 탭은 심리에게도 열려 있다. 권고: 기존 제한 열람을 일괄 차단하거나 확대하지 말고 필드별 공개 계약 명시 | 신분 대상 #6, 조교 #12 미결 확대 금지. 본인 소유 저장과 공유/open gate를 구분해 승인 |
| D07 | 채용 포트폴리오 제출에 어떤 항목·첨부가 필수이고 누가 볼 수 있는가? 권고: 학생이 선택한 항목만 불변 제출 | provider/capability false 및 기존 503 유지. 동의 #43 문구 임의 생성 금지 |
| D08 | 오늘 미션을 이번에 운영할 것인가? 문제 원천·전공 배정·정답 인정·합격·재응시·일자 정책 제공 필요 | 샘플 로그/점수 import 없음. M 서비스 미지원, 보류 항목으로 표시 |
| D09 | STAR 검사 #29, C-PASS 단계 #30, 선발/마일리지/장학 기준의 정본과 버전은? | 기존 배정 사실만 조회. 공식 합격/장학 계산·점수 쓰기 금지 |
| D10 | 퀘스트·XP·레벨·랭킹의 인정 이벤트/중복·철회·기간·모수·공개 정책은? | 고정 레벨/랭킹 제거, null/미지원. 포인트 엔진 임의 제작 금지 |
| D11 | 기존 개설 프로그램의 최초편입, 계획이 나중에 생긴 학생 편입, 재생성 후 과거 프로그램 재연결, 조건/마감 변경, 유형 승격 시 기존 칸(#33)은? 권고: 새 개설부터 확정 대상 편입, 과거소급/삭제는 별도 승인 | 런타임 가상 칸을 무조건 DB로 복제하지 않음. 연결된 편입조건 변경 차단을 배포 조건에 포함 |
| D12 | 연간 재생성 기준일/대상(#31)과 실제 생성 provider(#38)는? | 수동 재상담 경로와 명시 fixture만. scheduler/임시 판정기 없음 |

#34 교과 수강 원천, #35 문진표, #36 legacy 상담 트랙도 생성 입력의 출처 문제로 남긴다. 이 설계가 학사 API·문진표·진단 엔진을 새로 구현했다는 것으로 간주하지 않는다.

## 13. spec_v1 반영·변경·보류 추적표

**전체를 읽은 후** 대상과의 관계를 아래처럼 추적한다. “보류”는 누락이 아니라 현행 정본/업무결정/범위로 인한 명시적 비적용이다.

| spec_v1 위치·요구 | 판정 | 이번 설계의 적용/차이와 이유 |
|---|---|---|
| 서두 구현 차이표, §1·1.1 정본 우선순위 | 반영+정정 | 실제 DDL 우선. generation 미구현이라는 서술은 현재 roadmap.version 및 사용자 설명으로 정정 |
| §2·2.1 구성/스택 | 반영 | 기존 FastAPI/PostgreSQL/두 SPA 사용, 별도 서버/ORM/AI DB 신설 없음 |
| §3·3.1~3.4 Rocky/Docker/접속/DB 역할 | 범위 외 보류 | 인프라 변경 없음. dc_app 최소 권한·migration 권한 분리는 수용 기준에 반영 |
| §4 백엔드 구조·수동 SQL | 반영 | roadmap/growth read/mutation service, 사람이 쓴 024 이후 SQL |
| §4.1 요청 순서 | 반영 | 인증/메뉴/scope/게이트/버전/transaction, 멱등 재시도에 재인가 포함 |
| §4.2 권한/민감정보 | 반영·구체화 | menu_auth+staff_student_scope, 프로필/AI/file 우회 경로 제거, 제출본 범위 분리 |
| §5.1 학사 원천·append-only·코드 | 반영+변경 | 학사/자기신고 분리, immutable trigger. 모든 TS 코드 고정 대신 DB.md §8-5의 운영 code DB 정본 적용 |
| §5.2 공통 기반/조회 모델 | 재사용 | person/student/org/code/idempotency/file/seed_source/import_issue/SQL 집계 사용 |
| §5.3 상담 모델 | 최소 확장 | 기존 counsel_request 복합 UQ/FK 근거만 추가, 상담 테이블 재설계/슬롯 신설 없음 |
| §5.4 로드맵·포트폴리오 후속 도메인 | 반영·최소화 | roadmap 재사용, 사용자 기록 한 벌+portfolio projection. 첨삭 workflow·미션 정책은 별도 승인 |
| §6.1 상담 API | 유지 | 새 상담 API 복제 없음. 기존 complete service의 동일 상담 관계 검증만 연결 |
| §6.2 CARE7 완료 원자성 | 반영 | 해당 상담의 확정 계획 + 제안 유형 일치, type_event/기록/완료 transaction. legacy D03 |
| §7.1 상담 중 생성/순환 방지 | 반영 | 상담 DONE 없이 확정 예약 맥락에서 생성·확정, 학생 다음 단계는 완료 이후 |
| §7.1 AI/진단 공식 미구현·fixture 명시 | 반영 | 승인 immutable output provider, model=fixture, 미지원 503, 임시 산식 금지 |
| §7.2 roadmap generation+version | 변경 | 기존 roadmap.version=세대, 새 lock_version=편집토큰. generation 신설 안 함 |
| §7.2 roadmap 최종 유형 | 변경 | 현재 유형은 student_type_event만. snapshot/input의 당시 유형은 불변 근거로 허용 |
| §7.2 상담 FK | 반영·구체화 | 학생 포함 복합 FK+CARE7 검증, 근거 없는 legacy NULL을 추정 backfill하지 않음 |
| §7.2 초안/검토중/확정 | USER_DECISION_REQUIRED | D01/D02로 조건부 설계. bool 독립 중복 정본 방지 |
| §7.2 item generation/현재 계획 | 변경 | 현재 item만 유지, event+snapshot에 세대 기록. 기존 PK를 무리하게 세대형으로 재구성하지 않음 |
| §7.2 3×5·IAP만 증가·칸별 수정 | 반영 | BASE 제약+AUTO_PROGRAM 부분 UQ, op 단위 DTO, 확정 시 count 검사 |
| §7.2 재생성 snapshot/이월 없음/rollback | 반영 | 숨긴 칸·완료·당시 SQL 분모까지 동결 후 새 TODO 15칸, 원자성 테스트 |
| §7.2 추천 만료/필수 유지/COMPLETED만 완료 | 반영 | SQL asOf+Seoul 경계, selection/attendance 불변, 철회 원자적 |
| §7.2 프로그램 개설 편입/유일성/이력 | 반영·구체화 | 이번 R 포함. 현재 세대 부분 UQ+system cause. 과거/변경 정책 D11 |
| §7.2 대량 outbox | 조건부 보류 | 먼저 동기 transaction+락 검증, 부하 상한 초과 시 별도 확장. 부분성공을 숨기지 않음 |
| §8.1 단일 소스/로더 교체 | 반영 | sync reader cache와 async mutation/list 분리, profile/roster legacy까지 교체 |
| §8.1 legacy CARE7 fallback | 유지+보류 | 현재 진로취업에만 제한, #36의 역사적 사실 판정은 별도 |
| §8.2 seed/override | 반영 | archive/checksum/dry-run/명시 import, 자동 업로드·오류 fallback·무소유 샘플 복제 금지 |
| §8.3 두 SPA 15초/focus 반영 | 반영 | 열린 query invalidate/poll, identity별 cache, DB 정본 |
| §9·9.1 배포/백업/복구 | 수용조건으로 반영 | DB+file bytes 대응 백업/복구 검증, 실제 배포는 이번 문서 작업 밖 |
| §9.2 학교 VM/Oracle | 범위 외 보류 | 서버 이전·Oracle INSERT/DDL 스크립트 없음, #39 유지 |
| §10 구현 순서·실DB 테스트 | 반영 | SQL→API→프론트→실학생/상담사 왕복, build만으로 완료 금지 |
| §11 미결 | 유지·확장 | D01~D12 및 DB.md 미결 번호 연결. #32 이월 없음은 재질문하지 않고 적용 |
| §12 근거/후속 산출물 | 반영 | 두 문서 → Opus → 명시적 결정/APPROVED → ECC 구현/독립 검증 |

SPEC의 과거 AI 별도 DB/legacy roadmap 단계, Counsel_README의 로컬 공유, PROCESS 일부 선발 체크 표현도 현행 상위 정본과 사용자 지시로 각각 기존 AI 4테이블·DB 공유·수료만 완료로 정리했다. 코드의 결함을 업무 승인으로 해석하지 않았다.

## 14. 구현 후 검증·수용 기준

이 문서 작성 단계에서는 build/pytest를 실행하거나 테스트 파일을 만들지 않았다. 아래는 **C5/C6에서 실제 PostgreSQL과 실제 API로 수행할 계약**이다. SQLite/mock DB로 대체하지 않는다.

### 14.1 SQL·이관

- 기존 023 DB upgrade 및 빈 DB migrations→seed 둘 다 성공, derived 재실행 checksum/idempotence 확인. 적용된 migration checksum 변동 0.
- 두 fixture 학생 기존 현재 3축·15칸·상태·세대 보존, AI 근거 문자열 정확 일치, r1/r2 소유자/RESUME_REVIEW 연결 유지. 소유 없는 공통 portfolio/mission 실적 0건.
- generated group/복합 FK에 다른 그룹의 동명 코드 넣기 거부, 잘못된 학생-상담/AI suggestion/첨부 관계 거부, inactive code 신규쓰기 거부.
- dc_app로 snapshot/item_event/roadmap_event/request_event/growth_event/program_wishlist_event/ai_* UPDATE/DELETE 시 SQLSTATE 55000. 새 M 승인 시 해당 immutable 정의/attempt/ledger도 동일.
- deferred 3×5/position 제약, AUTO_PROGRAM 유일성·IAP 제한, source/완료시각 legacy 예외가 신규 쓰기 우회가 되지 않는지 확인.

### 14.2 로드맵·상담·경쟁

- CARE7 예약 진행 중 생성→검토→확정→동일 상담 완료→학생 단계 개방. 일반·심리·교수 상담/타학생 상담/취소 상담 거부. 계획 없는 상담 완료와 완료를 요구하는 생성 순환 둘 다 방지.
- 근거 없는 신규 목표/provider에 503, 기존 목표의 fixture만 올바른 source로 채택. 타학생 run/목표 mismatch/진단 입력 변동은 거부. 유형 이벤트 중복 append 없음.
- 두 상담사가 같은 expectedVersion으로 수정: 정확히 한 성공, 다른 하나 409, 부분 칸/요청 변경 없음. 같은 key 재전송 snapshot/event/칸 수 증가 없음.
- 동시 최초 생성·재생성, regenerate 대 sync_roadmap, program create 대 first generate, request apply 대 reject를 **별도 DB 연결/transaction**으로 실행. deadlock/완료 덮어쓰기/중복세대 없음, serialization 결과를 검증.
- 재생성 전 override에 해당하는 실제 DB 편집·숨김추천·DONE을 포함한 snapshot 정확성. 새 15칸은 전부 TODO, 구 프로그램 칸 미이월, 기존 snapshot 불변. 중간 실패 주입 시 구계획/snapshot 모두 rollback.
- 수동 편집으로 프로그램 완료/만료 수정 거부. CORE/GROWTH 6칸 확정 거부. restore-edit는 새 이력이며 원 이력/프로그램 결과를 삭제하지 않음.
- 구세대 요청이 새 칸을 잘못 가리키지 않음. 요청 반영 변경과 status APPLIED/event FK가 같은 transaction, 실패하면 REQ 유지.

### 14.3 비교과 회귀와 만료

- 기존 `test_programs.py` 전체, 특히 `test_outcome_not_selection_closes_the_roadmap_cell` 유지. 선발 TODO→출석 TODO→수료 DONE→철회 TODO 및 events 보존.
- NONE 0칸, RECOMMEND/REQUIRED 대상 유형만 한 칸. scope 없는 타학생 정보는 응답에 없지만 시스템 fanout의 승인 대상은 누락 없음. 반복 개설 retry 중복 0.
- Seoul 마감 직전/정각/직후, 브라우저 UTC·다른 TZ에서 동일 alive. DONE 추천 유지, REQUIRED 영구, 추천 철회 후 만료된 칸은 숨김. 분자/분모·상세·목록·snapshot 일치.
- 연결된 프로그램 삭제/편입조건 변경의 승인된 409 정책, 재생성 뒤 과거 수료 재전송의 비승계, 기존 비교과 결과/벌점 사건 원자성 유지.

### 14.4 성장·STAR·파일·채용

- 학생 A의 일지 생성/수정/삭제/북마크가 학생 A의 성장/portfolio와 허용 상담사 상세에 동일 ID/version으로 반영. 학생 B/조교/범위 밖 상담사는 본문·파일을 읽거나 바꾸지 못함. 심리상담사는 D06으로 허용된 성장 필드만 읽고 career 전용 계획·포트폴리오·파일을 우회 열람하지 못함.
- stale entry/profile version, owner/kind/source/verified 위조, 타인 첨부 claim, 삭제 entry 수정, 자기신고를 공식 진단/수료/자격으로 변환하는 입력 모두 거부.
- SQL 페이지/필터/summary 모수 일치, 태그·partial date·빈 기록·한글 검색, 학생 전환 cache 비움, 초기 샘플 자동 생성 없음.
- STAR 미선발은 실제 없음, 기존 소유 payload 표시, 정책 미결 결과는 null/POLICY_PENDING. 임시 합격·장학·진단 완료 기록 0.
- P 승인 전 기존 `test_jobs.py:215`의 fake portfolio 거부 유지. 승인 후 provider disabled 경로는 계속 503, enabled 본인 선택자료 제출은 실제 snapshot insert로 검증. 기존 jobs 테스트 전부 회귀.
- 제출 후 entry/resume 수정·삭제·첨부 해제→구 attempt 본문/hash/파일 bytes 그대로. 재지원 새 snapshot, 원 attempt UPDATE 금지. file upload 제한·streaming·rollback orphan inventory·다운로드 scope 검증.
- M 승인 시 문제답안 비노출, 제출 replay 한 attempt, 재응시 새 attempt, policy 없이 결과/XP 지급 없음, reward duplicate/철회 ledger, SQL 모수/기간 경계 검증.

### 14.5 실제 두 SPA 왕복 및 완료 조건

1. 학생 A 로그인으로 성장일지 저장·변경요청 제출 → 다른 브라우저의 담당 진로상담사가 서버 페이지에서 확인.
2. 상담사가 실제 CARE7 맥락에서 근거 있는 생성/수정·요청 반영·확정 → 학생 보드/성장 RoadmapStatus/라운지/상담사 목록의 동일 진행률 확인.
3. 비교과 개설로 IAP 한 칸 → 선발/출석/수료/철회 순서 → 두 SPA 진행률·이력 확인.
4. 재생성에서 구snapshot/새 TODO/게이트 전이 확인. stale 탭 저장은 409, 리로드 후 DB 결과, localStorage 우회 없음.
5. 학생 portfolio 수정 → 상담사 허용 내용 확인 → P 승인 시 채용 제출 → 이후 편집에도 제출본 동결 확인.
6. network 실패에서 가짜 성공/seed fallback 없음, identity 전환 데이터 잔상 없음, 미지원 AI/M 기능의 사실에 맞는 상태 표시.

`npm run build` + 신규 roadmap/growth 대상 pytest + 영향받는 기존 programs/jobs/counsel/gates/seed/academic/profile 테스트를 통과하고 필요 시 gstack `/browse`로 위 왕복을 검증한다. **Opus 독립 `06-verification.md=PASS`와 DB.md §8-3의 실제 상태 일치 전에는 완료 선언하지 않는다.**

## 15. 다음 검토자에게

Opus는 특히 (1) 3상태·재생성 공개 전이 D01/D02, (2) legacy 상담 관계/게이트 D03, (3) 프로그램 과거편입·조건변경 D11, (4) 성장 개인정보/제출 범위 D06/D07, (5) 실제 영속 기능과 미션 정책 보류 경계를 검토한다. 기술 교정과 사용자 업무 결정을 분리하고 `03-opus-review.md`를 작성한다.

이 설계는 승인되지 않았다. 구현·DDL 적용·데이터 적재는 수행하지 않았으며, user decision과 `04-decisions.md=APPROVED` 이후에만 C5로 넘긴다.

**DRAFT_FOR_OPUS_REVIEW**
