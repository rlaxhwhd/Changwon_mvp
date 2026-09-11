# 채용·취업(jobs) DB 전환 — 구현 기록

- 작성: 2026-09-09 / db-ecc-implementer / C5
- 입력: [04-decisions.md](04-decisions.md) `APPROVED` · [03-opus-review.md](03-opus-review.md) 교정 설계 · [02-migration-design.md](02-migration-design.md) · [01-current-state.md](01-current-state.md)
- **상태: `IMPLEMENTED` — C6 `REJECT` 지적 2건 반영 완료(§8), 재검증 대기**

---

## 1. 실행한 명령과 결과

### 1-1. 빈 테스트 DB 재생성 → 마이그레이션 → 시드 → 전체 테스트

```bash
docker exec -i dreamcatch-dev-db psql -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS dreamcatch_test WITH (FORCE);" -c "CREATE DATABASE dreamcatch_test;"
docker exec -i dreamcatch-dev-db psql -U postgres -d dreamcatch_test \
  -c "GRANT CONNECT ON DATABASE dreamcatch_test TO dc_app;" \
  -c "REVOKE CREATE ON SCHEMA public FROM PUBLIC;" \
  -c "CREATE SCHEMA dc AUTHORIZATION dc_owner;" \
  -c "GRANT USAGE ON SCHEMA dc TO dc_app;" \
  -c "ALTER ROLE dc_app IN DATABASE dreamcatch_test SET search_path = dc, pg_catalog;"

cd backend
DC_DB_PORT=15432 DC_DB_NAME=dreamcatch_test DC_DB_USER=postgres \
  DC_DB_PASSWORD="$(cat ../deploy/secrets/postgres_password_local)" .venv/Scripts/python.exe -m app.migrate
DC_DB_PORT=15432 DC_DB_NAME=dreamcatch_test DC_DB_USER=postgres \
  DC_DB_PASSWORD="$(cat ../deploy/secrets/postgres_password_local)" .venv/Scripts/python.exe -m app.seed --root ..
DC_DB_PORT=15432 DC_DB_NAME=dreamcatch_test DC_DB_USER=dc_app \
  DC_DB_PASSWORD="$(cat ../deploy/secrets/api_db_password_local)" \
  DC_DEVELOPMENT_TOKEN_FILE="$(pwd)/../deploy/secrets/api_token" .venv/Scripts/python.exe -m pytest -q
```

| 단계 | 결과 |
|---|---|
| `app.migrate` | `Applied 022_job_operations.sql` · `Applied 023_job_seed.sql` (001~021 은 기존 그대로, **수정 없음**) |
| `app.seed --root ..` | `{"status": "imported", "sourceFiles": 43, "students": 120}` |
| `pytest -q` | **54 passed** (기존 29 + 신규 25) |

기존 `test_api` · `test_programs` · `test_diagnosis` · `test_administration` 이 **한 건도 깨지지 않았다** —
`care_gate` 를 `gates.py` 로 분리한 것이 상담 도메인의 동작을 바꾸지 않았다는 증거다(교정 E03).

### 1-2. 개발 DB(`dreamcatch`) 적용

```bash
cd backend
DC_DB_PORT=15432 DC_DB_USER=postgres \
  DC_DB_PASSWORD="$(cat ../deploy/secrets/postgres_password_local)" .venv/Scripts/python.exe -m app.migrate
```
→ `Applied 022_job_operations.sql` · `Applied 023_job_seed.sql`

적재 확인 — 외부 공고 6건 · 분류 관계 25행 · 자소서 `r1`(20211304) · `r2`(20196208).
`dc.ai_run` 2건이 실제 `dc.job_resume` 행과 조인된다.

> `app.seed` 는 이 DB 에서 `already_imported` 로 빠진다(시드가 이미 들어 있다).
> 023 은 마이그레이션 실행 시점에 `dc.seed_source`·`dc.student` 가 이미 있어 거기서 채워졌다.
> 빈 DB 에서는 0건으로 지나가고 `seed.py` 가 시드 직후 같은 파일을 다시 돌린다(021 과 같은 방식).

### 1-3. 프론트 게이트

```bash
npx.cmd tsc -b     # 통과 (출력 없음)
npm run build      # ✓ built in 2.97s
```

---

## 2. 만든 것

### 2-1. 마이그레이션 (기존 파일은 건드리지 않았다)

| 파일 | 내용 |
|---|---|
| `backend/migrations/022_job_operations.sql` | 운영 코드 7그룹 + 항목 82개, 표 13개, 트리거·인덱스·GRANT |
| `backend/migrations/023_job_seed.sql` | 파생 시드 — 외부 공고 6건 + 자소서 `r1`·`r2`. 전부 존재 검사 + `ON CONFLICT DO NOTHING` |

**표 13개**

| 표 | 성격 |
|---|---|
| `dc.file_object` | 업로드 파일 메타. 바이트는 웹루트 밖 볼륨 |
| `dc.company` | 기업 사전 (`job_company` 가 아니다 — 조교 「학과 추천기업 관리」와 공유) |
| `dc.job_posting` · `job_posting_option` · `job_posting_event` | 공고 · 복수 분류 · 이력(append-only) |
| `dc.job_stage` | 전형 단계(공고별 행). `system_key` = 교내 절차 |
| `dc.job_application` · `job_application_attempt` · `job_application_event` | 지원 현재 · 제출 회차(append-only) · 상태 이력(append-only) |
| `dc.job_wishlist` | 찜 |
| `dc.job_resume` · `job_resume_event` | 텍스트 자소서 · 이력(append-only) |
| `dc.job_access_event` | 열람·다운로드 감사(append-only) |

**코드 그룹 7종** — 전부 신설, `managed_by='OPERATIONAL'`, `fixed_codes=false`, `sort_order` 60~66.
`code_item.legacy` 는 **NULL 로 뒀다** — 현행 Oracle 값이 미확인이다(#17·#20). 추측해 채우지 않았다.

| group_code | 항목 수 | 비고 |
|---|---|---|
| `JOB_COMPANY_TYPE` | 8 | |
| `JOB_EMPLOYMENT_TYPE` | 4 | |
| `JOB_CATEGORY` | 15 | |
| `JOB_CAREER_TYPE` | 2 | |
| `JOB_GENDER` | 3 | |
| `JOB_REGION` | 17 | `전체` 는 UI sentinel 이라 뺐다 |
| `JOB_RESUME_CATEGORY` | 22 | AiResume 의 20종 + 기존 자소서가 쓰던 `강점`·`직무관련경험` |

`job_posting_option.group_code` 는 `kind` 에서 **생성열**로 만들고 `(group_code, code)` 복합 FK 로
고정했다(018·019 규약). CHECK 두 개로 흉내내지 않았다.

### 2-2. 백엔드

| 파일 | 내용 |
|---|---|
| `backend/app/gates.py` (신설) | `diagnosis_gate` · `employment_gate`. 상담과 취업이 나눠 쓰는 단일 술어 |
| `backend/app/files.py` (신설) | 파일 저장·귀속·삭제. 확장자·크기 검증, 저장 이름 = 서버가 만든 id |
| `backend/app/jobs.py` (신설) | 라우터 전체 |
| `backend/app/counsel.py` | `care_gate` 를 `gates.diagnosis_gate` 위의 껍데기로 축소(**409 문구·동작 동일**) |
| `backend/app/settings.py` | `DC_FILE_ROOT`(기본 `var/files`) · `DC_FILE_MAX_BYTES`(기본 10MB) |
| `backend/app/main.py` | `jobs_router` 를 `prefix='/api/v1'` 로 등록 |
| `backend/app/seed.py` | 파생 재실행 목록에 `023_job_seed.sql` 추가 |
| `deploy/compose.api.yaml` | 명명 볼륨 `filedata` → `/var/lib/dreamcatch/files`, `DC_FILE_ROOT` |
| `.gitignore` | `backend/var/` (로컬 업로드 저장 위치) |

**엔드포인트 (전부 `/api/v1` 아래)**

| method path | 비고 |
|---|---|
| `GET /jobs/capabilities` | `canManage` · `canApplyWithPortfolio=false` + 사유 |
| `GET /jobs/eligibility` | 취업 게이트. `{eligible, reasons[{code,message,nextRoute}], studentType}` |
| `GET /jobs` · `GET /jobs/{id}` | 목록(서버 페이징·필터·검색) · 상세(학생이면 `applyEligibility` 포함) |
| `POST /jobs` (201) · `PATCH /jobs/{id}` | `Idempotency-Key` + `expectedVersion` |
| `POST /jobs/{id}/close` · `/reopen` | |
| `DELETE /jobs/{id}` | **200 + `{id,deleted:true}`** (204 금지 — `shared/api.ts` 가 무조건 JSON 파싱한다). 논리삭제 |
| `PUT /jobs/{id}/stages` | 전체 집합 교체. 교내 단계 편집 거부, 점유 단계 삭제 거부 |
| `GET/POST /job-companies` · `PATCH`·`DELETE /job-companies/{id}` | |
| `POST /jobs/{id}/applications` (201) | 게이트·마감·중복·서류 검증 + 멱등 + 재지원 회차 |
| `GET /job-applications/mine` · `/{id}` · `/{id}/events` | |
| `POST /job-applications/{id}/advance` · `/reject` · `/cancel` | intent 만 받는다(임의 status PATCH 없음) |
| `GET /job-applications` · `/summary` · `/export` | 같은 필터·같은 범위 술어. export 는 감사 |
| `GET /job-wishlist` · `PUT`·`DELETE /job-wishlist/{postingId}` | 명시 desired state |
| `GET/POST /job-resumes` · `GET`·`PATCH`·`DELETE /job-resumes/{id}` | 본인만 |
| `POST /job-files` (201) · `GET /job-files/{id}` | 업로드 · 권한 확인 후 스트리밍 |

### 2-3. 프론트

| 파일 | 내용 |
|---|---|
| `shared/jobStore.ts` (신설) | 부팅 적재 + 동기 셀렉터 + 발행. `programStore` 규약 |
| `shared/useJobStore.ts` (신설) | 스토어 구독 훅(버전 반환) |
| `shared/bootstrap.ts` | 공고·capability 는 공통, 지원·찜·자소서는 학생만, 관리 지원 목록은 권한 있는 교직원만 |
| `src_admin/data/schema/job.ts` | **상수 배열 6개 제거** → `jobOptions()`/`jobLabelOf()` 가 `metadataStore` 를 읽는다. 값은 전부 코드 |
| `src_admin/data/schema/jobApplication.ts` | 한글 `kind` → 영문 `action`, 회차·스냅샷 타입 추가, `INTERNAL_STAGES` 상수 제거 |
| `src_admin/data/jobsSource.ts` | API 배선. 동기 셀렉터 유지, CRUD 는 Promise. 파일 업로드 헬퍼 |
| `src_admin/data/jobApplications.ts` | 동기 셀렉터 + async 전이. `buildTimeline` 은 현재 회차만 본다 |
| `src_admin/data/jobApplicationEvents.ts` | **읽기 전용**. 공개 append 경로 제거 |
| `src_admin/data/jobApplicationExport.ts` | 브라우저 조립 제거 → 서버 CSV fetch |
| `src_v2/data/jobWishlist.ts` | API. 토글이 아니라 desired state |
| `src_v2/pages/jobs/resumeMock.ts` | API 스토어. `SAVED_RESUMES` 상수 제거 |
| 화면 | `JobForm` · `JobApplicants` · `JobApplicantsList` · `JobList` · `JobManage` · `JobBoard` · `JobDetailView` · `JobDetail` · `JobApplyModal` · `MyApplications` · `JobsHome` · `AiResume` · 양 SPA `notifications` |

**걷어낸 localStorage 정본** — `dc_jobs` · `dc_job_applications` · `dc_job_app_events` ·
`dc_job_wishlist` · `dc_user_resumes_v1`. 남은 `localStorage` 호출은 신원 키
(`dc_active_staff`·`dc_active_student`) 조회뿐이며 `shared/api.ts` 와 같은 용도다.
**기존 브라우저 저장분은 수입하지 않았다** — 찜과 사용자 자소서에는 학생 ID 자체가 없어
정당한 소유자가 존재하지 않는다(교정 D04).

---

## 3. Opus 가 요구한 증거 5건

| # | 요구 | 어디서 |
|---|---|---|
| 1 | career 상담사가 `/jobs` 관리 API 를 **통과**한다(E02) | `test_career_counsellor_manages_and_other_roles_are_refused` — career 통과, psych·professor·assistant·학생 403, **AUTH0006 도 자동 통과하지 않음** |
| 2 | `care_gate` 분리 후 기존 상담 테스트가 그대로 통과(E03) | 전체 54 passed(기존 29 무변경) + `test_care_gate_for_counsel_still_works_after_extraction` |
| 3 | `care_track IS NULL` 인 진로 상담이 게이트를 **연다**(E04) | `test_gate_blocks_incomplete_diagnosis_and_opens_for_completed` — chaewon 의 care7 상담은 `care_track` 폴백 경로로 열리고, 후속 진단이 없는 changwon 은 `FOLLOWUP_REQUIRED` 로 막힌다 |
| 4 | 021 의 `ai_run` 2건이 `job_resume` 실제 행을 가리킨다(§2.3) | `test_ai_resume_review_points_at_real_rows` — 조인 결과 `[('r1','20211304'), ('r2','20196208')]` |
| 5 | CSV 「대학」이 `(college_code,dept_code)` 조인에서 나온다(E10) | `test_summary_and_export_share_the_filter_and_the_scope` — `dc.department` 를 코드 쌍으로 조인한 값과 셀을 대조하고, 코드가 없으면 빈칸임을 확인 |

**추가로 고정한 것** — `student_access` 의 «과거 상담 담당» UNION 을 계승하지 않았다.
`resolve_student` · `scope_condition` 이 `dc.staff_student_scope` 만 본다. 이 분기는
비교과보다 엄격하므로 여기 기록한다(Opus §4 요구).

---

## 4. 승인 범위에서 벗어난 판단 3건 <span>(검증자가 반드시 볼 것)</span>

### D-1. ★ 취업 게이트의 상담 조건을 `legacy_type` 까지 본다

교정 E03 의 게이트 4번은 「`type_code IN ('CAREER','JOB')` **AND** care7 **AND** `status_code='DONE'`」이다.
**그대로 구현하면 게이트가 아무에게도 열리지 않는다.**

`counsel.py:create` 는 `body.typeCode or {'심리':'PSY','교수':'PROF'}.get(body.type)` 로 코드를 채운다 —
**진로취업 상담은 `type_code` 가 NULL 이 되고 `legacy_type='진로취업'` 으로만 구분된다.** 시드도 같다
(chaewon 의 care7 DONE 상담 3건 전부 `type_code IS NULL`).

그래서 조건을 이렇게 썼다.

```sql
(type_code IN ('CAREER','JOB') OR (type_code IS NULL AND legacy_type='진로취업'))
AND COALESCE(care_track,'care7')='care7' AND status_code='DONE'
```

E04 의 `care_track` 폴백과 같은 이유다 — 없는 값을 «해당 없음»으로 떨어뜨리면 **이미 상담을 마친
학생이 전부 잠긴다.** 심리(`PSY`)·교수(`PROF`)는 코드가 있으므로 이 폴백에 걸리지 않는다.
→ **검증자 확인 요청**: 이 완화가 PROCESS 의 의도와 맞는지, 아니면 `counsel.py` 가 진로취업에도
`type_code` 를 채우도록 고치는 것이 옳은 교정인지 판정해 주기 바란다(후자는 상담 도메인 변경이라 이번 범위 밖으로 뒀다).

### D-2. `job_posting.company_type_code` 를 추가했다 (설계에 없던 열)

E08 로 `company_id` 가 nullable 이 되면서 **외부 수집 공고는 기업 실체가 없다.** 그런데 seed 6건은
`companyType`(기업 구분) 값을 갖고 있어, 기업 사전에만 두면 그 값을 잃는다.
등록 시점 선언값을 공고에 스냅샷으로 남겼다(CLAUDE.md 규칙 2와 같은 규약). 기업 사전의
`company.company_type_code` 와 두 벌이 아니라 **시점이 다른 두 사실**이다.

### D-3. 「드림캐치 포트폴리오」 제출은 서버가 503 으로 거절한다

Q1=B(파일 저장 확정)로 `RESUME_FILE` 경로가 열렸으나, `PORTFOLIO` 는 D03(포트폴리오 provider 보류)이
그대로다. **없는 제출을 성공한 것처럼 만들지 않기 위해** 서버가 `503 PORTFOLIO_SERVICE_UNAVAILABLE` 로
거절하고, `capabilities.canApplyWithPortfolio=false` 와 사유를 함께 내려보낸다. 화면은 그 선택지를
사유와 함께 비활성으로 그린다. `INITIAL_*` 를 provider 로 승격하지 않았다.

---

## 5. 이번 범위에서 하지 않은 것 <span>(의도된 것)</span>

| 항목 | 이유 |
|---|---|
| 동의(consent) 모델 | 04-decisions Q2 = 제외. 「동의 없으면 지원 차단」 로직을 넣지 않았다. `DB.md` §9 **#43** 으로 남겼다 |
| 기존 `data:` URL 이미지의 파일 전환 | 04-decisions #41-③ = 새 것부터만. 비교과 상세(§8-6 `detail`)와 한동안 공존한다 — **의도된 것이며 결함이 아니다** |
| 본문 inline 이미지 업로드 | `RichEditor` 는 그대로 두었다(붙여넣기 = data URL). 공고 본문의 파일 전환은 후속 |
| 포트폴리오 제출·열람 | `DB.md` §8-3 4번 provider 대기 (D-3) |
| Oracle 대량 이관 · legacy 상태 코드 매핑 | #17·#20·#39. `code_item.legacy` 는 NULL, `record_origin='LEGACY'` 경로만 스키마에 열어 뒀다 |
| 실제 LLM 호출 · AI 읽기 API | 별도 도메인. `AiConsulting` 의 `MOCK_EVALUATION` 표시는 **건드리지 않았다**(교정 §2.3-5 — 없애면 회귀다) |
| `SPEC.md` §10-3 문서 갱신 | 019~021 과의 충돌은 team-lead 몫(Opus §11 O3) |

---

## 6. 잔여 위험

| # | 위험 | 지금 상태 |
|---|---|---|
| R1 | **파일 볼륨은 DB 백업에 포함되지 않는다** | `DB.md` §9 **#42** 로 남겼다. 지금은 논리삭제만 하고 **바이트를 지우지 않는다** — 파기 정책 전에 지우면 되돌릴 수 없다. orphan(귀속 실패한 예약 파일) 정리 배치도 아직 없다 |
| R2 | **스토어가 목록을 통째로 들고 있다** | `programStore` 와 같은 한계다. 공고가 수천 건이 되면 화면이 `queryJobs`(서버 페이징)로 옮겨야 한다. 지원은 학생=본인 것, 교직원=담당 범위만 적재하므로 상대적으로 안전하다 |
| R3 | 전형 재정렬이 **진행 중 지원의 «다음 순서»** 를 바꾼다 | 현행 동작을 그대로 유지했다(설계 §3.2). 이미 지났던 단계가 재등장할 수 있고 이벤트에 남는다. 지원별 전형 고정판으로 바꾸려면 별도 업무 결정이 필요하다 |
| R4 | CSV 「대학」이 **대부분 빈칸**이다 | 학생 대부분이 조직 코드를 갖고 있지 않다(`programs.py:551` 과 같은 사실). **이름으로 유추해 채우지 않았다** — 그것이 이 프로젝트의 대표 부채를 재생산하는 길이다 |
| R5 | 여러 공고 CSV 를 화면이 **나눠 받아 잇는다** | 서버 export 는 공고 하나씩 필터를 받는다. `JobApplicantsList` 가 선택한 공고 수만큼 요청하고 머리글을 떼어 잇는다 — 감사 로그도 요청 수만큼 남는다. 다중 공고 필터가 필요해지면 서버에 `postingIds` 를 더한다 |
| R6 | `job_resume` 논리삭제 후에도 `ai_run` 이 그 id 를 가리킨다 | 행이 남으므로 조인은 성립한다. 다만 학생이 지운 자소서의 AI 평가가 `AiConsulting` 에서 어떻게 보여야 하는지는 AI 읽기 API 를 만들 때 정할 문제다 |
| R7 | 이벤트 `seq` 를 `max(seq)+1` 로 뽑는다 | 같은 지원 행을 `FOR UPDATE` 로 잠근 뒤에 계산하므로 경합하지 않는다. 공고 이벤트도 posting 을 잠근 트랜잭션 안이다 |
| R8 | 테스트 DB 는 서로 격리돼 있지 않다 | 두 번 연속 돌리면 건수를 세는 테스트가 실패한다. 재실행 전 `_test` DB 를 재생성해야 한다(`docs/LOCAL_DEV.md`) |

---

## 7. 브라우저 왕복 검증은 하지 않았다

API·DB·타입·빌드까지 확인했고 **실제 두 SPA 왕복(학생 지원 → 교직원 전형 진행 → 학생 타임라인)은
브라우저에서 돌려 보지 않았다.** C6 검증에서 확인할 항목으로 남긴다.

---

## 8. C6 `REJECT` 반영 <span>(2026-09-09 추가)</span>

독립 검증이 결함 2건으로 `REJECT` 를 냈다. 둘 다 고쳤고 나머지는 건드리지 않았다.
(이탈 3건 D-1·D-2·D-3 은 검증에서 셋 다 채택됐다 — 되돌리지 않았다.)

### V1 — 업로드 본문을 통째로 읽던 것 <span>(메모리 고갈)</span>

`await request.body()` 로 전부 읽은 **뒤에** 크기를 재고 있었다. 40MB 본문이 422 를 받으면서도
서버 peak 41.9MB — `deploy/compose.api.yaml` 의 `mem_limit: 384m` 과 겹쳐 **인증된 학생이
컨테이너를 OOM 시킬 수 있었다.**

| 파일:라인 | 고친 것 |
|---|---|
| `backend/app/files.py:55-58` | `too_large()` — 한도 초과 응답을 한 곳에서 만든다(422 유지, 설계 §5.3 오류표 그대로) |
| `backend/app/files.py:60-78` | **`read_body(request)` 신설** — ① `Content-Length` 가 한도를 넘으면 **한 바이트도 읽기 전에** 거절 ② 본문은 `request.stream()` 으로 누적하며 **한도를 넘는 순간 중단**. `Content-Length` 는 없거나(chunked) 거짓일 수 있으므로 실제 방어선은 스트림 누적 검사다 |
| `backend/app/files.py:88-90` | `store()` 의 크기 검사는 **남겨 뒀다** — 다른 호출자가 생겨도 한도가 새지 않게 하는 2중 방어 |
| `backend/app/jobs.py:1231` | `files.store(..., await request.body())` → `await files.read_body(request)` |

**추가한 테스트** — `test_oversized_upload_stops_reading_instead_of_buffering`

TestClient 는 요청 본문을 앱에 넘기기 전에 스스로 모아 버려서, **왕복만으로는
「서버가 멈췄다」를 증명할 수 없다**(처음 쓴 청크 카운트 테스트가 그래서 200/200 으로 실패했다).
그래서 `files.read_body` 를 직접 호출해 소비한 청크 수를 센다.

- 한도를 64KB 로 낮추고 32KB 청크 200개(6.4MB, 한도의 100배)를 흘린다 → **소비 3청크 이하**에서 422
- `Content-Length` 를 선언한 요청은 **0청크**에서 422
- 엔드포인트 왕복도 422 이고 `dc.file_object` 에 아무것도 남지 않는다

### V2 — `/jobs/:id` 가 `StageGate` 밖이던 것 <span>(★ 자기 보고 누락)</span>

| 파일:라인 | 고친 것 |
|---|---|
| `src_v2/App.tsx:125` | 나머지 jobs 라우트와 같은 방식으로 감쌌다 — `<StageGate stage="employment" title="채용공고 상세">` |

**이것은 승인 범위 이탈이었고, §4 「이탈 3건」에 적지 않았다.**
`03-opus-review.md:203` E14 가 「`/jobs/:id` 에 게이트를 두고 `/mypage/applications` 는 게이트 밖으로
유지」로 확정했고 `04-decisions.md` 가 승인한 항목인데, 데이터층·서버 게이트만 보고 라우트 배선을
빠뜨렸다. 서버가 403 을 내므로 데이터 유출은 없었으나 `CLAUDE.md` 13조(순차 게이팅) 위반이고,
**보고 누락 자체가 결함**이다 — 검증자가 잡지 않았으면 그대로 지나갔다.

§4 를 「이탈 3건」이 아니라 **이탈 4건**으로 읽어야 하며, 네 번째는 «승인된 것을 구현하지 않고
보고도 하지 않은» 종류라 나머지 셋(판단해서 벗어난 것)과 성격이 다르다.
`/mypage/applications` 는 E14 대로 게이트 **밖**에 그대로 뒀다.

### 재검증 실행

```bash
# 빈 테스트 DB 재생성 → migrate → seed → pytest (§1-1 과 같은 명령)
```

| 항목 | 결과 |
|---|---|
| `pytest -q` (빈 `dreamcatch_test`) | **63 passed** — 기준 62 + V1 회귀 테스트 1 |
| `npx.cmd tsc -b` | 통과 (exit 0) |
| 개발 DB `dreamcatch` | **적용할 것 없음** — 두 수정 모두 코드 변경이고 스키마가 바뀌지 않았다. `app.migrate` 재실행 시 신규 적용 0건 |

검증자가 추가한 `backend/tests/test_jobs_review_security.py` 는 **그대로 두었고 함께 통과한다.**

**IMPLEMENTED — 2026-09-09 (C6 지적 2건 반영)**
