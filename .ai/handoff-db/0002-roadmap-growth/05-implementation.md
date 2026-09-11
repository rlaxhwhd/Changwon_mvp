# 로드맵·IAP + 성장활동 — 구현 기록

- 작성: 2026-09-09 / `db-ecc-implementer` / C5
- 입력: `04-decisions.md`(APPROVED) · `03-opus-review.md` §3 교정 설계·§4 범위 · `02-migration-design.md`
- 마이그레이션: **024 · 025 · 026** (023 까지 적용된 상태에서 이어 붙였고 기존 파일은 수정하지 않았다)

---

## 1. 결과 요약

| 항목 | 결과 |
|---|---|
| 신규 마이그레이션 | `024_roadmap_operations.sql` · `025_growth_operations.sql` · `026_roadmap_growth_backfill.sql` |
| 신규 테이블 | 8개 — `roadmap_event` · `roadmap_request_event` · `growth_profile` · `growth_entry` · `growth_event` · `growth_entry_file` · `program_wishlist` · `program_wishlist_event` |
| 신규 엔드포인트 | 로드맵 17 · 성장 18 (아래 §3) |
| 백엔드 테스트 | **97 passed** (기존 63 + 도메인 26 + 부팅 계약 8) |
| 프론트 빌드 | `npx.cmd tsc -b` 통과 · `npm run build` 통과 |
| 브라우저 왕복 | `/v2` 3상태 · `/admin` 5역할 **콘솔 오류 0** (§8) |
| 걷힌 localStorage 정본 | 데이터층 6파일 + `GrowthHome` 의 `dc_growth_portfolio_*` 4키 |

**새 테이블은 8개뿐이다.** 로드맵은 002 의 6테이블을 그대로 쓰고 사건 2개만 더했다.
AI 4테이블 · `star_track` · `file_object` · `job_resume` · `idempotency` · `code_group/item` ·
`menu_auth` · `staff_student_scope` 는 전부 재사용했다(`CLAUDE.md` 12조).

---

## 2. 변경 파일

### 2-1. 마이그레이션 (신규 3)

| 파일 | 담은 것 |
|---|---|
| `backend/migrations/024_roadmap_operations.sql` | 구조 코드 10그룹 · `ai_run` provenance · `roadmap` 3상태(`confirmed` 는 생성열) · 상담 근거 복합 FK · `lock_version` · 축·칸 코드 FK·origin·완료 근거 · `roadmap_event` · `roadmap_item_event` 확장 · 요청 상태 정규화·처리 이력 · `roadmap_request_event` · **alive/progress SQL 함수** · `student_list` 뷰 교체 · 3×5 지연 제약 트리거 · 인덱스·GRANT |
| `backend/migrations/025_growth_operations.sql` | 코드 5그룹 · `growth_profile` · `growth_entry` · `growth_event` · `growth_entry_file` · `program_wishlist` · `program_wishlist_event` · `file_object` owner/slot 확장 · 인덱스·트리거·GRANT |
| `backend/migrations/026_roadmap_growth_backfill.sql` | 로드맵 AI 근거 분리(run+suggestion 연결) · 비교과 편입 cutover 1회 · 성장일지 이관. **전부 존재 검사 + `ON CONFLICT DO NOTHING`** 이라 마이그레이션·seed 직후 두 번 돌아도 결과가 같다 |

### 2-2. 백엔드

| 파일 | 변경 |
|---|---|
| `backend/app/roadmap.py` | **신규** 1,102줄 — 로드맵 API 전부 + 비교과 개설 편입(`enroll_program`) + lifecycle 락 |
| `backend/app/growth.py` | **신규** 674줄 — 성장 자료·포트폴리오·STAR 조회·추천·찜 API |
| `backend/app/gates.py` | CARE7 술어를 `CAREER_REQUEST`/`CARE7_TRACK`/`is_care7_request` 한 벌로 통일(E11) · `confirmed_roadmap` · `roadmap_basis_ok` · `program_gate` 추가 |
| `backend/app/counsel.py` | complete 의 트랙 판정을 `is_care7_request` 로, 계획 검증을 `roadmap_basis_ok` 로 교체 |
| `backend/app/programs.py` | `sync_roadmap` 이 완료 근거를 기록 · 개설/수정/삭제/결과처리에 lifecycle 락 · 개설·수정 시 자동 편입 · `PROGRAM_IN_ROADMAP` 409 · 편입 조건 변경 409 · 학생 신청에 `program_gate` |
| `backend/app/students.py` | 프로필의 `roadmapAxes`·`roadmapOutcome` 우회 경로 제거 · 목표는 **확정된 계획**일 때만 · `progress`/`hasRoadmap` 을 SQL 함수로 |
| `backend/app/files.py` | `PORTFOLIO_ATTACHMENT` 슬롯 · `GROWTH_ENTRY` 소유 · `file_dto(prefix)` · `stream()` |
| `backend/app/main.py` | 두 라우터 등록 |
| `backend/app/seed.py` | `insert(conflict=...)` — DEFERRABLE 유니크가 있는 표의 중재자 명시 · 026 을 파생 실행 목록에 추가 |
| `backend/app/seed_domains.py` | **E1** position `start=1` · **E2** `status_code='CONFIRMED'` · **E3** 요청 상태 `{대기:REQ, 승인:APPLIED, 반영완료:APPLIED, 반려:REJECTED}` · 중요도 코드 · `origin_code` · `completion_source_code` · `handled_at` |
| `backend/tests/test_roadmap.py` | **신규** 15케이스 |
| `backend/tests/test_growth.py` | **신규** 11케이스 |
| `backend/tests/test_programs.py` | E19 — 손으로 넣던 편입 칸 대신 **개설이 만든 칸**을 검사한다(의미 불변) |

### 2-3. 프론트

| 파일 | 변경 |
|---|---|
| `shared/roadmapStore.ts` · `shared/growthStore.ts` · `shared/useRoadmapStore.ts` | **신규** — `programStore`·`jobStore` 규약(동기 셀렉터 + async 쓰기 + 저장 후 재조회) |
| `shared/bootstrap.ts` | 학생은 본인 계획·성장·찜, 교직원은 변경 요청 요약을 부팅에 적재 |
| `src_admin/data/roadmap.ts` · `roadmapGenerated.ts` · `roadmapOverrides.ts` · `roadmapRequests.ts` | localStorage 제거, 서버 셀렉터·mutation 으로 교체 |
| `src_admin/data/roadmapProgressStats.ts` | 학과**명** 배열 인수 폐기 · `queryRoadmapProgressStats`(SQL summary) 추가 |
| `src_admin/data/schema/roadmapEdit.ts` | `RoadmapOverride` 삭제, 세대/편집 토큰 분리 |
| `src_v2/data/growthJournal.ts` · `growthRecords.ts` · `wishlist.ts` · `portfolio.ts` · `starTrack.ts` | 서버 정본으로 교체 · 공통 상수(`INITIAL_*`·`GROWTH_RECORDS`)와 합성 연락처 제거 |
| `src_v2/data/schema/roadmap.ts` | 중요도 코드화 + 라벨 맵 · 칸의 origin/editorNote/version 등 서버 필드 |
| 화면 12개 | `GrowthHome` · `GrowthJournal(+Form)` · `Portfolio` · `StarTrack` · `StarRoadmapCard` · `ResumeSheet` · `ProgramApply` · `ProgramNotice` · `RoadmapCreatePanel` · `RoadmapEditorPanel` · `RoadmapEditor` · `RoadmapRequests` · `RoadmapStatus` · `AiRoadmap` · `RoadmapRequest` · `AiResume` · `StudentDetailView` |

---

## 3. 신규 엔드포인트

**로드맵 (17)**
`GET /students/{id}/roadmap` · `GET /roadmaps` · `GET /roadmaps/summary` ·
`GET /students/{id}/roadmap/generation-capability` · `POST …/generate` · `POST …/regenerate` ·
`PATCH /students/{id}/roadmap` · `POST …/roadmap/{review|confirm|reopen}` ·
`POST …/roadmap/items/{itemId}/completion` · `POST …/roadmap/edits/restore` ·
`GET …/roadmap/events` · `GET …/roadmap/snapshots` · `GET …/roadmap/snapshots/{version}` ·
`POST /students/{id}/roadmap-requests` · `GET /roadmap-requests` ·
`GET /roadmap-requests/{id}/events` · `POST /roadmap-requests/reject`

**성장 (18)**
`GET|PATCH /students/{id}/growth/profile` · `GET|POST /students/{id}/growth/entries` ·
`GET|PATCH /students/{id}/growth/entries/{entryId}` · `POST …/entries/{id}/delete` ·
`GET …/growth/summary` · `GET …/growth/events` · `POST /growth-files` · `GET /growth-files/{id}` ·
`POST …/entries/{id}/files` · `POST …/entries/{id}/files/{fileId}/unlink` ·
`GET /students/{id}/star-track` · `GET …/growth/recommendations` · `GET /students/{id}/portfolio` ·
`GET /program-wishlist` · `PUT /program-wishlist/{programId}`

---

## 4. 승인 범위 대조

### 4-1. 사용자 결정 3건

| 결정 | 이행 | 근거 |
|---|---|---|
| **Q1** `status_code(DRAFT/REVIEW/CONFIRMED)` · `confirmed` 는 생성열 | ✅ | 024 의 4단계 전환. `dc.roadmap.confirmed` 는 `GENERATED ALWAYS AS (status_code='CONFIRMED') STORED` |
| **Q1** 학생에게는 확정 전까지 안 보인다 | ✅ | `GET /students/{id}/roadmap` 이 학생에겐 `roadmap:null` + `pending:true` |
| **Q1** 재생성 중 구계획은 스냅샷, 현재는 DRAFT, 확정본+초안 2벌 금지 | ✅ | `regenerate` 가 한 트랜잭션에서 snapshot → 15칸 교체 → `status='DRAFT'` |
| **Q1** 비교과·취업지원이 재확정까지 잠긴다 | ✅ | `gates.program_gate` / `employment_gate`. `POST /programs/{id}/applications` 가 학생 본인 신청에 게이트 적용 |
| **Q1 ⚠** 잠긴 화면이 빈 화면이 되면 안 된다 | ✅ | 응답에 `gate.reasons[].message`·`nextRoute` 포함. 판정은 `gates.py` 한 곳 |
| **Q2** 유형이 바뀌어도 옛 편입 칸 유지, 회수 로직 없음 | ✅ | 유형 변경에 반응하는 코드가 없다. 칸은 재생성에서만 사라진다. `DB.md` #33 닫음 |
| **Q3** 전환: 성장 기록·일지·포트폴리오 조회/편집·STAR 조회·비교과 찜 | ✅ | §3 성장 18엔드포인트 |
| **Q3** 제외: 오늘 미션 | ✅ | 테이블·API 없음. `TodayGrowthMission` 화면 그대로 |
| **Q3** 제외: 퀘스트·XP·레벨·랭킹 | ✅ | 테이블·API 없음. `StarTrack` 의 고정 인증단계·장학 구간 표시를 「기준 미확정」으로 교체 |
| **Q3** 제외: STAR 판정 — payload 읽기 전용 | ✅ | `GET …/star-track` 은 payload+단계 수만. `metricsStatus='POLICY_PENDING'`, `currentTier/nextTier/stageIndex/passed = null`. 쓰기 API 없음 |
| **Q3** 제외: 포트폴리오 제출 503·capability false | ✅ | `jobs.py` 무변경 (`canApplyWithPortfolio: False`, `PORTFOLIO_SERVICE_UNAVAILABLE`) |

### 4-2. 즉시 실패 3건 + 기술 오류 E1~E19

| ID | 이행 | 어디에 |
|---|---|---|
| E1 position 0~4 | ✅ 정규화(1~5) | 024 `UPDATE … position=position+1` · `seed_domains` `enumerate(start=1)` · CHECK `position>0` · AUTO_PROGRAM 은 6 이상 |
| E2 `confirmed` 직접 INSERT | ✅ 4단계 순서 | 024 (add → update → drop → generated) · `seed_domains` 가 `status_code='CONFIRMED'` |
| E3 `승인→APPROVED` FK 위반 | ✅ | 024 가 `대기/반영완료/반려/APPROVED` 를 코드로 정규화(FK 추가 **전**) · `seed_domains` 매핑도 `APPLIED` |
| E4 alive 술어 두 벌 | ✅ | `dc.roadmap_item_alive()` 하나 · `student_list` 뷰도 그것을 쓴다 · roster fallback 제거 |
| E5 만료 경계값 | ✅ | 024 가 기존 RECOMMEND 를 KST 다음날 00:00 배타 상한으로 정규화(**대상 0행**) · 서버 `program_expiry()` 가 이후 값을 만든다 |
| E6 DTO 오기 | ✅ | 단위 P 제외라 실제 변경 없음. 명칭은 `canApplyWithPortfolio`/`PORTFOLIO_SERVICE_UNAVAILABLE` 그대로 |
| E7 item_event 신규 필수값 | ✅ | `schema_version` + `CHECK(schema_version=1 OR (roadmap_version·action_code·actor_uid·transaction_id NOT NULL))` · student FK 추가 |
| E8 시스템 actor 금지 | ✅ | 자동 편입 actor = 개설한 교직원. `cause_kind='PROGRAM'`, payload `initiatedBy='SYSTEM_FANOUT'`. 이관분만 `action='IMPORT'` + actor NULL |
| E9 프로그램 삭제 500 | ✅ | `linked_cells()` → 409 `PROGRAM_IN_ROADMAP` |
| E10 잠금 역전 | ✅ | `create/update/delete_program`(exclusive) · `set_outcome`/`remove_applications`(shared) 가 **함수 첫 줄**에서 lifecycle 락 |
| E11 care_track 술어 불일치 | ✅ | `gates.is_care7_request` 한 함수. `counsel.py:253` 의 `row['care_track']=='care7'` 제거 |
| E12 학과명 매칭 | ✅ | 신규 API 는 `collegeCode`/`deptCode` 쌍만 받는다 · `getRoadmapProgressStats(departments: string[])` 인수 폐기. `students.py:57` 의 기존 결함은 **손대지 않았다**(별건 — §7) |
| E13 스냅샷 중복 세대 | ✅ | 23505 → 409 `SNAPSHOT_VERSION_EXISTS` |
| E14 `growth_entry_file` PK | ✅ | 대리 UUID PK + `UNIQUE(entry_id,file_id) WHERE unlinked_at IS NULL` |
| E15 `ai_run` 확장 필수 | ✅ | `CHECK(schema_version IS NULL OR (input_hash·input_snapshot NOT NULL))` |
| E16 GRANT 누락 | ✅ | 024/025 에 명시. DELETE 는 어디에도 주지 않았다 |
| E17 `created_at` 위조 | ✅ | `roadmap_item.created_at` NULL 허용, 기존 30행은 NULL |
| E18 provider 재고 | ✅ | `jiwoo` 1명만 생성 가능. `chaewon`·`changwon` 은 503 (테스트로 고정) |
| E19 기존 fixture | ✅ | `test_programs.py` 의 직접 INSERT 를 개설 경로로 교체. `test_outcome_not_selection_closes_the_roadmap_cell` 의 **의미 불변** |

### 4-3. §4 승인 범위 8항목

| # | 항목 | 이행 |
|---|---|---|
| 1 | `024_roadmap_operations.sql` | ✅ |
| 2 | 로드맵 API 일체(조회/목록/요약/생성/재생성/편집/검토·확정/수동 완료/이벤트·스냅샷/변경요청) + 낙관적 잠금 + Idempotency-Key + 서버 페이징 + `menu_auth`·`staff_student_scope` | ✅ 17개. `restore-edit` 포함 |
| 3 | 비교과 개설 자동 편입 + 수료·철회 연동 + cutover 1회 | ✅ `enroll_program()` · `sync_roadmap()` 보존 · 026 cutover(**chaewon 1칸**) |
| 4 | 게이트 단일 정책 확장 · `students.py` 우회 경로 제거 | ✅ |
| 5 | `025_growth_operations.sql` 6테이블 + `file_object` 확장 | ✅ |
| 6 | 성장 조회/편집 API · STAR 읽기 전용 · `ACTIVITY_RECO` 조회 | ✅ |
| 7 | `026` — 소유권이 증명된 자료만 | ✅ §5 |
| 8 | 두 SPA 배선 교체 + localStorage 키 제거(로그인·미이관 키는 불변) | ✅ §2-3 |

**§4 제외 목록 7건은 전부 손대지 않았다** — 채용 포트폴리오 제출 · 오늘 미션 · 퀘스트/XP ·
STAR 판정 · 정기 재생성 scheduler · 실제 AI provider · 과거 개설분 소급 재연결.

---

## 5. 성장활동 시드 오염 방지 — 행 단위 판정

| 원천 | 판정 | 실제 |
|---|---|---|
| `growthJournal.seed.json`(chaewon 6 · changwon 3) | **적재** | 학생 ID 키가 소유자를 증명한다. ID 는 `(source_path, student, legacy_id)` 에서 결정적으로 새로 부여 |
| `dc_growth_portfolio_{studentId}_*` localStorage | **미적재** | `useStoredList` 가 mount 직후 공통 상수를 학생 키에 저장했다 — 키 존재가 작성 사실이 아니다 |
| `portfolio.ts` `INITIAL_*` (스킬 9·자격 3·어학 2·수상 3·프로젝트 2·자소서 3) | **미적재** | 전 학생 공통 상수 |
| `buildProfile` 의 `student@cwnu.ac.kr` · `010-1234-5678` | **미적재** | 합성값. 연락처는 빈 값으로 시작 |
| `GROWTH_RECORDS` 공통 4건 | **미적재** | 「진단 완료·수료」라고 적혀 있으나 원천 이벤트가 없다 |
| `dc_program_wishlist` | **미적재** | 학생 ID 없는 공통 키 |
| 오늘 미션·퀘스트·미션 로그 샘플 | **미적재** | 범위 밖 |
| `star_track` payload | **재INSERT 없음** | 읽기만 전환 |
| 자소서 `r1`/`r2` | **불변** | 021·023 의 소유권/평가 연결 유지. `portfolio.ts` 의 동명 `r1` 과 병합하지 않았다 |

검증: `test_growth.py::test_only_owned_seed_material_was_imported` 가
`dc.growth_entry` = chaewon 6 · changwon 3, kind = `JOURNAL` 뿐, `growth_profile` 2행,
연락처·소개문이 빈 값임을 고정한다.

---

## 6. 실행 명령과 결과

```
# 빈 테스트 DB 재생성 → 마이그레이션 → 시드
docker exec -i dreamcatch-dev-db psql -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS dreamcatch_test WITH (FORCE);" -c "CREATE DATABASE dreamcatch_test;"
docker exec -i dreamcatch-dev-db psql -U postgres -d dreamcatch_test \
  -c "GRANT CONNECT ON DATABASE dreamcatch_test TO dc_app;" \
  -c "REVOKE CREATE ON SCHEMA public FROM PUBLIC;" \
  -c "CREATE SCHEMA dc AUTHORIZATION dc_owner;" \
  -c "GRANT USAGE ON SCHEMA dc TO dc_app;" \
  -c "ALTER ROLE dc_app IN DATABASE dreamcatch_test SET search_path = dc, pg_catalog;"
cd backend && DC_DB_PORT=15432 DC_DB_NAME=dreamcatch_test DC_DB_USER=postgres \
  DC_DB_PASSWORD=… .venv/Scripts/python.exe -m app.migrate      # → 024·025·026 Applied
DC_DB_NAME=dreamcatch_test DC_DB_USER=postgres … -m app.seed --root ..
  # → {"status": "imported", "sourceFiles": 43, "students": 120}

# 테스트 (앱 계정으로)
DC_DB_NAME=dreamcatch_test DC_DB_USER=dc_app … -m pytest -q       # → 89 passed

# 개발 DB 적용 (소유자 권한)
DC_DB_NAME=dreamcatch DC_DB_USER=postgres … -m app.migrate        # → 024·025·026 Applied

# 프론트
npx.cmd tsc -b        # → 오류 0
npm run build         # → built in 1.55s
```

> ⚠ **테스트 DB 는 서로 격리돼 있지 않다.** 위 재생성 단계를 빼고 두 번 연속 돌리면
> 건수를 세는 테스트가 깨진다(실측: 18 failed). 재실행 전에 반드시 `_test` DB 를 다시 만든다.

**개발 DB `dreamcatch` 적용 후 확인** — 계획 2건 `CONFIRMED`/`LEGACY_IMPORT`,
`roadmap_item` 31행(BASE 30 + AUTO_PROGRAM 1 = `chaewon`/`auto-prog_001`),
`growth_entry` 9행, `roadmap_request` `rr-000`=`APPLIED`.
`chaewon` 이행률이 40% → 38% 로 바뀌는데, 이는 **가상 칸이 실제 행이 되어 뷰 분모에 들어온 것**이다
(브라우저가 계산하던 6/16=38 과 같은 값 — 뷰와 화면의 어긋남이 해소됐다).

### 회귀 테스트의 실제 실패 확인

수정을 되돌려 각 테스트가 **실제로 깨지는지** 확인했다(가짜 회귀 방지).

| 되돌린 수정 | 테스트 | 결과 |
|---|---|---|
| `counsel.py` 를 `row['care_track']=='care7'` 로 | `test_care7_completion_requires_the_plan_even_when_the_track_is_null` | **1 failed** |
| `programs.apply` 의 `program_gate` 제거 | `test_draft_is_stored_and_hidden_until_the_counselor_confirms` | **1 failed** |
| `delete_program` 의 `PROGRAM_IN_ROADMAP` 제거 | `test_completion_only_from_outcome_survives_regeneration_rules` | **1 failed** |
| `students.py` 의 `roadmapAxes` 우회 경로 복원 | `test_profile_no_longer_carries_the_plan` | **1 failed** |
| (전부 복원 후) | 전체 | **89 passed** |

---

## 7. 잔여 위험 · 남긴 것

1. **비교과 게이트의 범위** — `PROCESS.md` §2 표는 비교과 신청에 진단·CARE7·로드맵 셋을 다
   요구한다. 이번에 서버가 강제하는 것은 **확정된 로드맵 하나**다. 진단·CARE7 은 지금까지
   비교과 신청에 서버 게이트가 아예 없어 한 번도 강제된 적이 없고, 승인 범위는
   「확정 전까지 잠근다」(Q1)였다. 셋 다 요구하면 `changwon`(후속진단 C4 미완료 · 계획은
   `LEGACY_IMPORT`)이 즉시 잠긴다 — D03 의 「기존 게이트 접근 보존」과 충돌한다. **확대는 별건.**
2. **`students.py:57` 의 `major_label=ANY(%s)`** — E12 가 지목한 기존 결함이지만 이번 범위 밖이라
   고치지 않았다(외과적 변경). 신규 API 로 **복제하지는 않았다.**
3. **AI 원문 text 는 아직 살아 있다** — `roadmap_axis.rationale` · `roadmap_item.why` 를 지우지 않고
   `ai_suggestion` 참조만 연결했다. 모든 소비자가 참조를 읽게 된 뒤 별도 마이그레이션으로 걷는다.
4. **`restore-edit` 는 현재 세대의 BASE 칸만 되돌린다** — 과거 세대 복원이나 프로그램 칸 복원은
   하지 않는다(스냅샷은 읽기 전용).
5. **스냅샷은 상담사 전용** — 학생 과거조회는 열지 않았다(`DB.md` #37 미결). 자동 삭제도 없다.
6. **E5 의 만료 정규화 대상은 0행이었다** — 기존 DB 에 `entry='RECOMMEND'` 인 칸이 없다.
   `import_issue` 는 `seed_source(path)` FK 가 필요한데 이 값은 브라우저에서 온 것이라 대응하는
   시드 경로가 없다. 변환 0건이므로 이슈 행을 만들지 않았다 — 실제 변환이 생기면 기록 경로가 필요하다.
7. **`GrowthHome` 의 자격·어학 탭은 `CERTIFICATE` 한 종류로 저장된다** — 화면이 한 목록이라
   `LANGUAGE` 와 가르지 않았다. 화면을 나누면 그때 종류를 나눈다.
8. **실제 브라우저 왕복(gstack `/browse`)은 수행하지 않았다.** 검증은 실제 PostgreSQL + 실제 API
   통합 테스트(89건)와 빌드 게이트까지다. 설계 §14.5 의 두 SPA 왕복 QA 는 C6 검증에 남긴다.
9. **미결 갱신** — `DB.md` #33 닫음. #21(반려 사유 필수화) · #29 · #30 · #31 · #37 · #38 은
   **열린 채로 유지**했고, 구현으로 몰래 닫지 않았다.


---

## 8. C6 REJECT 대응 (2차) — blocker 3건

C6 가 브라우저 왕복에서 blocker 3건을 냈다. **89개 테스트와 `tsc -b` 가 전부 통과하는데 화면이
죽어 있었다.** 왜 안 걸렸는지부터 적는다 — 같은 종류를 또 놓치지 않기 위해서다.

### 8-1. 왜 89개 테스트를 통과했나

| # | 결함 | 통과한 이유 |
|---|---|---|
| D1 | 확정 계획이 없는 학생의 `targetRole`/`targetCompany` 를 프로필에서 제거 | 서버 응답은 **의도대로** 나왔다. 깨진 곳은 그 필드를 옵셔널 체이닝 없이 읽는 화면이고, 프론트 타입이 `targetCompany: TargetCompany`(**필수**)라 `tsc` 는 「없을 수 있다」를 모른다. 도메인 테스트는 로드맵 DTO 만 봤지 **부팅 페이로드의 모양**을 보지 않았다 |
| D2 | DRAFT 동안 학생 포털이 부팅 중 크래시 | 게이트 DTO(`ROADMAP_CONFIRMATION_REQUIRED` + `nextRoute`)는 정확했고 그것만 검증했다. **문구가 화면에 도달하는지**는 아무도 안 봤다 — 실제 원인은 D1 과 같은 프로필 필드였다 |
| D3 | 부팅 로더가 권한 없는 목록을 무조건 호출 | 서버는 **정상적으로** 403 을 냈고 권한 테스트도 그것을 확인했다. 문제는 「그걸 부르면 안 되는 쪽」이 부른 것이고, 그 판단은 `shared/bootstrap.ts` 에만 있어서 pytest 사정권 밖이었다 |

공통점 — **서버 DTO 만 보는 테스트로는 못 잡는다.** 그래서 이번에 추가한 테스트는
「부팅이 실제로 부르는 것」과 「화면이 필수로 읽는 것」을 건다.

### 8-2. 고친 것

| 결함 | 파일:라인 | 수정 |
|---|---|---|
| **D1** | `backend/app/students.py:22~31` | `targetRole`/`targetCompany` 를 **더 이상 pop 하지 않는다.** 확정된 계획이 있을 때만 그 값으로 **덮어쓰고**, 없으면 시드 프로필 값을 그대로 두며 `setdefault('targetCompany',{})` 로 형태를 보장한다. 초안의 목표는 여전히 새지 않는다 |
| **D2** | 위와 동일 + `src_v2/pages/growth/RoadmapStatus.tsx:34~60` | 부팅이 살아난 뒤, 잠긴 화면이 **정확한 사유**를 말하게 했다. 「아직 생성되지 않았습니다」와 「다시 확정하는 중입니다」는 다른 사실이라 `envelope.pending` 으로 가르고, 문구·다음 경로는 게이트가 준 것을 그대로 쓴다(화면이 문구를 다시 만들지 않는다) |
| **D3** | `backend/app/roadmap.py:199~213`(신규 `GET /roadmap/capabilities`) · `shared/roadmapStore.ts`(`roadmapCapability`/`loadRoadmapCapability`) · `shared/bootstrap.ts:33,44` | 교직원 부팅이 `loadRoadmapRequests()` 를 **capability 로 가드**한다. 바로 위 `canManageApplicants` 가드와 같은 규약이다. capability 조회 자체는 전 역할에 열려 있다 |

### 8-3. 추가한 회귀 테스트 — `backend/tests/test_boot_contract.py`

| 테스트 | 무엇을 거는가 |
|---|---|
| `test_profile_keeps_every_field_the_screens_read` | 부팅 페이로드의 **모든** 학생이 화면 필수 필드(`targetRole`·`targetCompany` 포함)를 갖고 `targetCompany` 가 객체인지. 계획 없는 학생(`jiwoo`)이 목록에 있다는 전제도 함께 건다 |
| `test_student_portal_boots_while_the_plan_is_a_draft` | 실제로 `reopen` 해 DRAFT 로 만든 뒤 ① 부팅 프로필이 온전한지 ② 사유·`nextRoute` 가 비어 있지 않은지 ③ 학생 부팅이 부르는 나머지 4개가 살아 있는지. `finally` 로 확정 복원 |
| `test_every_staff_role_can_boot_the_admin_portal` (5역할 parametrize) | `shared/bootstrap.ts` 가 **가드 없이** 부르는 9개 경로가 진로·심리·교수·조교·시스템관리자 전부에서 4xx 가 아닌지 |
| `test_roadmap_request_queue_is_capability_gated` | capability 가 역할별로 갈리는지 + 권한 없는 역할이 부르면 403 인지 + **`bootstrap.ts` 소스에 가드가 실제로 있는지**(서버만 보면 이 결함을 또 놓친다) |

**되돌림 확인** — 각 수정을 되돌려 실제로 실패하는지 확인했다.

| 되돌린 것 | 테스트 | 결과 |
|---|---|---|
| `students.py` 의 pop 복원 | `test_profile_keeps_every_field_the_screens_read` | **1 failed** |
| 〃 | `test_student_portal_boots_while_the_plan_is_a_draft` | **1 failed** |
| `bootstrap.ts` 의 capability 가드 제거 | `test_roadmap_request_queue_is_capability_gated` | **1 failed** |
| `GET /roadmap/capabilities` 제거 | `test_every_staff_role_can_boot_the_admin_portal` | **5 failed** |
| (전부 복원) | 전체 | **97 passed** |

### 8-4. 브라우저 왕복 결과

`npm run dev:db` · API(:18100) · vite(:5173) 3개를 띄우고 gstack `/browse` 로 확인했다.
⚠ **API 를 반드시 재기동했다** — 먼저 붙었던 :18100 은 이전 세션의 프로세스라
`/openapi.json` 경로가 103개(신규 `/roadmap/capabilities` 없음)였다. 죽이고 다시 띄워 104개를 확인한 뒤 QA 했다.

| 대상 | 결과 |
|---|---|
| `/v2/main` · `/v2/growth/roadmap-status` (`jiwoo` — 계획 없음) | 렌더 정상, 잠금 안내 + 「핵심진단 응시하기」, **콘솔 오류 0** |
| `/v2/growth/roadmap-status` (`chaewon` — **DRAFT**) | 「로드맵을 다시 확정하는 중입니다 / 상담사가 로드맵을 확정해야 합니다. 재생성 중에는 확정 전까지 잠깁니다 / 담당 상담사에게 문의」, **콘솔 오류 0** |
| `/v2/main` (`chaewon` — DRAFT) | 렌더 정상(1,832자), **콘솔 오류 0** |
| `/admin` × 5역할(`career_choi`·`psych_han`·`acc-1`·`asst_kim`·`system-admin`) | 전부 렌더, **콘솔 오류 0** |
| `/admin/roadmap/{requests,progress,create}` · `/admin/students` | 전부 렌더(요청함 대기 3·반영완료 1 = DB 와 일치), **콘솔 오류 0** |
| `/v2/{growth, growth/journal, mypage/portfolio, star, growth/program, roadmap/skill-tree, lounge}` | 전부 렌더, **콘솔 오류 0** |

QA 뒤 `chaewon` 은 CONFIRMED 로 되돌려 놓았다(개발 DB 상태 원복).

**성장 화면이 비어 보이는 것은 정상이다** — 프로젝트·스킬·자격 목록이 0건인 이유는 소유자가
증명되지 않은 공통 상수를 이관하지 않았기 때문이고(§5), 화면은 빈 상태와 등록 버튼을 정직하게 보여 준다.

### 8-5. 이번 라운드에서 새로 확인한 잔여 사항

- `/admin` 의 교수(`acc-1`) 화면이 GNB 에 「설정」만 보이고 헤더가 「…상담사님」으로 뜬다.
  로드맵·성장과 무관한 **기존 교수 포털의 표시 문제**이고 이번 변경 전후가 같다 —
  `DB.md` §8-3 5번(교수상담 절반)의 범위다. 여기서 고치지 않았다.
