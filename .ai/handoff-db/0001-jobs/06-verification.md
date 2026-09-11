# 채용·취업(jobs) DB 전환 — 독립 검증

- 작성: 2026-09-09 / db-ecc-reviewer / C6
- 입력: [03-opus-review.md](03-opus-review.md) (교정 정본) · [04-decisions.md](04-decisions.md) (승인 범위) · [05-implementation.md](05-implementation.md) · 실제 작업 트리
- **상태: `PASS`** <span>(2026-09-09 2차 — 1차 `REJECT` 2건이 수정되어 재검증 통과)</span>

| 회차 | 판정 | 내용 |
|---|---|---|
| 1차 | `REJECT` | §2 V1(업로드 본문 무제한 버퍼링) · V2(`/jobs/:id` 게이트 누락) |
| **2차** | **`PASS`** | 두 건 모두 수정 확인 — **§9 재검증 기록**. 다른 항목은 1차 판정 그대로 유효하며 다시 보지 않았다 |

---

## 1. 완료 게이트 — 실행한 명령과 결과

### 1-1. 빈 테스트 DB 를 새로 만들어 전 과정 재현 (검증자가 직접 실행)

```bash
docker exec -i dreamcatch-dev-db psql -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS dreamcatch_test WITH (FORCE);" -c "CREATE DATABASE dreamcatch_test;"
docker exec -i dreamcatch-dev-db psql -U postgres -d dreamcatch_test \
  -c "GRANT CONNECT ON DATABASE dreamcatch_test TO dc_app;" \
  -c "REVOKE CREATE ON SCHEMA public FROM PUBLIC;" \
  -c "CREATE SCHEMA dc AUTHORIZATION dc_owner;" \
  -c "GRANT USAGE ON SCHEMA dc TO dc_app;" \
  -c "ALTER ROLE dc_app IN DATABASE dreamcatch_test SET search_path = dc, pg_catalog;"
cd backend && rm -rf var/files
… -m app.migrate   …   -m app.seed --root ..   …   -m pytest -q
```

| 단계 | 결과 |
|---|---|
| `app.migrate` | `001` ~ `023` 전부 적용. `022_job_operations.sql` · `023_job_seed.sql` 오류 없음 |
| `app.seed --root ..` | `{"status": "imported", "sourceFiles": 43, "students": 120}` |
| `pytest -q` | **62 passed** (구현자 54 + 검증자 신규 8) · 5.58s |
| `npx.cmd tsc -b` | 통과 (exit 0, 출력 없음) |
| `npm run build` | `✓ built in 1.70s` (exit 0) |

DB 를 두 번 재생성해 두 번 다 돌렸고 두 번 다 같은 수가 나왔다 —
**「기존 DB 를 재사용해서 통과한 수」가 아니다.**

### 1-2. 브라우저 왕복 QA 는 생략했다 (사용량 절약 — 지시에 따름)

대신 **API 왕복 테스트**를 대체 증거로 삼았다.
`backend/tests/test_jobs_review_security.py::test_two_session_round_trip_student_then_staff_then_student`
— 학생 세션(`chaewon`)이 지원 → 교직원 세션(`career_kim`)의 접수함·통계에 뜨고 전형을 진행 →
**다시 학생 세션**에서 `status='IN_PROGRESS'` 와 이벤트 `['APPLY','ADVANCE']` 가 보이고,
교직원의 취소 시도는 403·학생 본인의 취소는 200 인 것까지 한 테스트 안에서 확인했다.
**시각·CSS·반응형은 이 검증의 범위가 아니다.**

### 1-3. 검증자가 새로 쓴 테스트

`backend/tests/test_jobs_review_security.py` (신규 8건, 구현 코드는 고치지 않았다)

| 테스트 | 확인한 것 |
|---|---|
| `test_no_static_mount_exists_anywhere_in_the_app` | `app.routes` 에 `Mount`·`StaticFiles` 0건 — 정적 서빙 우회로가 없다 |
| `test_file_root_is_outside_the_served_tree_and_names_are_server_made` | `name=../../../evil<script>.pdf` 로 올려도 저장 경로는 `root/<id[:2]>/<id>` 뿐이고 볼륨 전체를 훑어 `evil` 이라는 이름이 하나도 없음을 확인 |
| `test_traversal_in_the_download_path_finds_nothing` | `..%2F..%2F..%2Fetc%2Fpasswd` 등 4종 프로브 전부 200 아님 |
| `test_a_student_cannot_download_another_students_reserved_file` | 아직 귀속되지 않은 예약 파일(`owner_id IS NULL`)을 남이 받으면 404 |
| `test_scope_is_what_gates_a_managing_staff_not_the_menu_alone` | 범위 있는 교직원은 200 + 감사 1행, 메뉴 권한 없는 `psych_yoon` 은 403 |
| `test_students_cannot_read_each_others_applications_resumes_or_wishlists` | 남의 지원 상세·이력·자소서 GET/PATCH/DELETE 전부 404 |
| `test_anonymous_and_bad_token_are_refused_on_every_job_route` | 6개 경로 × (무토큰·틀린토큰) = 12건 전부 401 |
| `test_two_session_round_trip_…` | 위 1-2 |

---

## 2. 1차 REJECT 사유 2건 <span>(→ 둘 다 수정됨. 결과는 §9)</span>

### V1 — 업로드 본문을 크기 검사 **전에** 통째로 메모리에 올린다 (가용성)

- `backend/app/jobs.py:1231` — `files.store(conn, user, slot, name, await request.body())`
- `backend/app/files.py:64` — 크기 검사는 바이트를 **다 읽은 뒤**에 한다.
- `deploy/compose.api.yaml:5` — `mem_limit: 384m`.

`await request.body()` 는 스트림 전체를 RAM 에 담는다. `Content-Length` 를 먼저 보지 않으므로
선언 한도(10MB)를 몇 배로 넘겨도 **일단 다 받고 나서** 422 를 낸다. 재현:

```
POST /api/v1/job-files?slot=RESUME&name=big.pdf   (본문 40MB)
→ status 422 "파일은 10MB 이하만 올릴 수 있습니다."
→ tracemalloc 서버측 peak = 41.9 MB
```

인증된 학생 한 명이 큰 본문을 몇 개만 동시에 던지면 384MB 컨테이너가 OOM 으로 죽는다.
파일 저장은 이번 범위에서 새로 연 경로이고(#41 확정), **한도를 정해 놓고 그 한도를 넘긴
요청을 먼저 받아 버리는 것**은 그 결정의 취지와 어긋난다.

**수정 범위** — `upload()` 에서 바이트를 읽기 전에 `Content-Length` 를
`settings.file_max_bytes` 와 비교해 413(또는 기존과 같은 422)으로 끊는다.
헤더가 없거나 거짓일 때를 대비해 `request.stream()` 으로 누적하며 한도 초과 시 중단한다.
`files.store` 의 사후 검사는 그대로 둔다(이중 방어).

### V2 — 승인된 교정 E14 의 「학생 공고 상세 게이트」가 구현되지 않았고 보고도 없다

- `src_v2/App.tsx:125` — `{ path: '/jobs/:id', element: <JobDetail /> }` (`StageGate` 없음)
- `01-current-state.md:77` 이 **「목록의 게이트를 직접 URL로 우회할 수 있다」**로 이미 지목했고,
  `02-migration-design.md:266` 이 **「상세 StageGate」**를 약속했고,
  `03-opus-review.md:203` 이 **「`/jobs/:id` 에 게이트를 두고 `/mypage/applications` 는
  게이트 밖으로 유지한다」**로 확정했다. `04-decisions.md` 가 교정 설계 전부를 승인했다.
- 같은 파일의 `/jobs`·`/jobs/external`·`/jobs/joblist`·`/jobs/home` 은 전부
  `StageGate stage="employment"` 로 감쌌다 — **상세 하나만 빠졌다.**
- `05-implementation.md` §4(이탈 3건)·§5(안 한 것)에 **이 항목이 없다.** 자기 보고에서
  누락된 유일한 승인범위 이탈이다.

지원 자체는 서버가 막으므로(403) **데이터 유출은 없다.** 문제는 순차 게이팅이
화면마다 다시 판단되는 상태로 되돌아간 것이다(CLAUDE.md 13조).

**수정 범위** — 한 줄이다.
`{ path: '/jobs/:id', element: <StageGate stage="employment" title="채용공고 상세"><JobDetail /></StageGate> }`.
`/mypage/applications`(`:131`)는 교정 정본대로 **게이트 밖으로 그대로 둔다.**
`JobDetail` 안의 CTA 비활성·사유 표시는 지금 것을 유지한다(게이트가 열린 뒤의 마감·중복 사유는 여전히 필요하다).

---

## 3. 구현자가 신고한 이탈 3건 — 판정

### D-1. 취업 게이트가 `legacy_type` 까지 보는 것 → **채택 (구현이 옳다)**

주장의 사실 여부를 DB 로 먼저 확인했다.

```sql
SELECT type_code, legacy_type, status_code, count(*) FROM dc.counsel_request GROUP BY 1,2,3;
```

| type_code | legacy_type | status_code | count |
|---|---|---|---|
| **(NULL)** | 진로취업 | CONFIRMED | 10 |
| **(NULL)** | 진로취업 | REQ | 9 |
| **(NULL)** | 진로취업 | DONE | **6** |
| PROF | 교수 | REQ / CONFIRMED | 3 / 1 |
| PSY | 심리 | REQ / CONFIRMED / DONE | 2 / 1 / 1 |

**`type_code IN ('CAREER','JOB')` 인 행은 0건이다.** 교정 E03 의 4번 조건을 문자 그대로
구현하면 게이트가 **아무에게도 열리지 않는다** — 구현자의 주장은 사실이다.

그럼 `counsel.py` 를 고치는 쪽이 옳은가? **아니다.**
- `counsel.py:187` 은 진로취업에 `typeCode` 를 **선택**으로 받는다(`{'CAREER','JOB',None}`).
  현행 프론트가 보내지 않아 NULL 이 된다.
- 기존 25행을 채우려면 `CAREER` 냐 `JOB` 이냐를 **골라야 한다.** 그 구분은 legacy
  `'진로취업'` 한 값에 뭉쳐 있어 원천에 없다. 임의로 `CAREER` 로 채우는 것은
  **없는 업무 사실을 지어내는 것**이고, 이 프로젝트가 반복해 금지한 일이다
  (`code_item.legacy` 를 NULL 로 둔 것과 같은 이유 · CLAUDE.md 14조).
- `counsel.py` 는 이미 `legacy_type` 을 실질 판별자로 쓴다 — `dto` 의 `'type'`(`:85`),
  범위 술어(`:73`), `resolve_assignee`. 게이트만 다른 판별자를 쓰면 그쪽이 어긋난다.

또 폴백이 지나치게 넓지 않은지도 확인했다. `counsel.py:173` 이 진로취업 신청에
`careTrack` 을 **필수**로 받고 시드도 전부 채워져 있어(`care7` 21행 · `general` 4행),
`COALESCE(care_track,'care7')` 는 현재 한 행도 승격시키지 않는다. **`general` DONE 1건은
게이트를 열지 않는다** — 2트랙 규칙대로다.

> 후속: `counsel.py` 가 진로취업에도 `type_code` 를 채우도록 하는 것은 **앞으로 들어올 행**에
> 대해서는 옳다. 다만 그것은 상담 도메인 변경이고 기존 행 backfill 은 업무 판단이 필요하므로
> `DB.md` §9 후속 미결로 team-lead 가 잡는다. 그때에도 `legacy_type` 분기는 **지우지 않는다.**

### D-2. `job_posting.company_type_code` 추가 → **채택 (중복이 아니라 스냅샷이다)**

- E08 로 `company_id` 가 nullable 이 되어 외부 수집 공고 6건은 기업 실체가 없다.
  DB 확인 — 6건 전부 `company_id IS NULL`, `company_type_code` 는 `LARGE`×5·`MIDSIZE`×1.
  이 열이 없었으면 원천이 갖고 있던 값을 **버렸어야 한다.**
- `company_name_snapshot NOT NULL` 과 같은 자리의 같은 규약이다(CLAUDE.md 2조).
- 두 벌 읽기 위험도 없다 — `posting_dto`(`jobs.py:183`)는 `company_type_code` **하나만** 읽는다.
  `dc.company.company_type_code` 는 기업 사전의 현재값이고 화면 공고 표시에 쓰이지 않는다.
- 두 열 모두 생성열 + `(group_code, code)` 복합 FK 로 코드 그룹이 고정돼 있다(E06 규약 준수).

### D-3. 포트폴리오 제출 503 → **채택 (막다른 길이 아니다)**

- `jobs.py:783` 이 `503 PORTFOLIO_SERVICE_UNAVAILABLE`, `jobs.py:224-227` 이
  `canApplyWithPortfolio=false` + 사유를 함께 내려보낸다.
- 화면이 죽지 않는다 — `src_v2/components/JobApplyModal.tsx:62-83` 이 그 선택지를
  **`disabled` + 서버가 준 사유 문구**로 그리고, 바로 옆에 **살아 있는 대안**(개별 이력서 파일 업로드)이 있다.
  학생은 어느 경우에도 지원을 완료할 수 있다.
- 「없는 제출을 성공한 것처럼 만들지 않는다」는 판단이 옳다. `INITIAL_*` 를 provider 로
  승격하지 않은 것도 D03 보류와 일치한다.

---

## 4. 「채용시 마감」 — 최초 등록 1회 고정 (Q3) · **통과**

- `jobs.py:472` — 등록: `deadlineMode=='ON_HIRE'` 이면 `plus_one_month(today())`.
- `jobs.py:519-521` — 수정: **이미 `ON_HIRE` 였으면 저장된 `deadline_date` 를 그대로 쓴다.**
  다른 모드 → `ON_HIRE` 전환일 때만 새로 계산한다. Q3 문구 그대로다.
- `test_on_hire_deadline_is_fixed_at_registration` — 제목만 바꿔 PATCH 해도 마감이 그대로.
- `test_plus_one_month_matches_the_javascript_rule` — 월말 넘침(1/31→3/3)까지 JS 규칙과 parity.
- 프론트에서 마감을 재계산하던 코드는 사라졌다 — `grep -rn "setMonth" src_admin src_v2 shared`
  결과에 채용 파일이 하나도 없다(상담 통계·달력만 남는다).
- ⚠️ **비차단 관찰** — `023_job_seed.sql:50` 이 legacy 문자열 `'채용시'` 를
  `deadline_mode='ALWAYS'`(상시)로 떨어뜨린다. Q3 의 «등록일 +1개월» 과 의미가 다르다.
  지금은 **행이 0건**이고(seed 6건 전부 `DATE`) 그 시드 파일은 더 이상 커지지 않으므로
  이번에는 문제가 아니다. Oracle 이관(#39) 때 같은 매핑을 그대로 쓰면 그때는 틀린다 —
  이관 설계에 메모로 남길 것.

---

## 5. CLAUDE.md 규칙 스캔

| 조 | 판정 | 근거 |
|---|---|---|
| **2** 이벤트에 발생 시점 스냅샷 | ✅ | `job_application_attempt` 에 학번·학과·학년·학적·대학코드/라벨을 회차마다 복사(`jobs.py:728-738`). 재지원해도 직전 회차가 남는다(`test_cancel_then_reapply_keeps_the_previous_attempt`) |
| **4** 상태값은 코드+라벨 | ✅ | 값은 전부 코드. `schema/job.ts` 에서 한글 배열 6개가 사라지고 `jobOptions()`/`jobLabelOf()` 가 `metadataStore` 를 읽는다 |
| **5** 정합성은 애플리케이션이 | ✅ | 그 위에 DB 제약까지 걸었다 — CHECK·복합 FK·부분 UNIQUE(`job_stage_position`·`job_stage_system`·`job_posting_source`) |
| **6** 역할·권한은 `SY_AUTH` 계승 | ✅ | 새 role 열거형 없음. `menu_auth('jobs'·'jobs.4')` + `staff.role_code`/`auth_user` 를 `metadata.py` 와 같은 술어로 읽는다(`jobs.py:66-72`) |
| **7** 학과명 매칭 금지 | ✅ | `jobs.py:728` 이 `WHERE (college_code,dept_code)=(%s,%s)`. 목록 필터도 `s.college_code`/`s.dept_code`(`:848-853`). 학과명 Map 조회(`departments.ts:25`)는 채용 경로에서 사라졌다 |
| **8** 신분코드 리터럴 금지 | ✅ | `'1101'`·`'1201'` 리터럴 0건. 채용은 학적으로 거르지 않고 **스냅샷만 남긴다** → 9조(대학원생 신청 가능)도 자동으로 지켜진다 |
| **10** 집계는 데이터 층에서 | ✅ | `/job-applications/summary` 가 `count(*) FILTER(...)` + `GROUP BY` 로 SQL 집계(`jobs.py:896-911`). 목록·통계·CSV 가 `applicant_filters()` **한 함수**를 공유해 수와 행이 어긋나지 않는다 |
| **11** 이력은 append-only | ✅ | `reject_history_change()` 트리거 5개(`022:226,302,334,382,397`) **+ 최소권한** — 이력·회차·감사 테이블에 `GRANT SELECT,INSERT` 만 준다(`022:405`). 이중 방어이고 `test_apply_advance_pass_and_history_is_append_only` 가 UPDATE·DELETE 가 실제로 튕기는 것을 확인한다 |
| **12** 재생성 금지 | ✅ | `care_gate` 를 새로 쓰지 않고 `gates.diagnosis_gate` 로 분리해 나눠 쓴다. 기존 상담 테스트 무변경 통과 |
| **13** 순차 게이팅 단일 판정 | ✅ <span>(2차)</span> | 서버는 `gates.py` 한 곳이고 사유마다 `nextRoute` 를 준다. 1차에 빠져 있던 `/jobs/:id` 라우트 게이트가 2차에서 채워졌다 → §9 V2 |
| **14** 임시 판정 로직 금지 | ✅ | 유형→후속검사 매핑을 파이썬으로 복제하지 않고 `dc.student_type_rule.follow_up_test` 를 읽는다(`gates.py:58-62`). T1~T6 리터럴 0건 |

**추가로 확인한 것(요구 밖)**
- SQL 조립은 전부 정적 조각 + 파라미터 바인딩. f-string 에 들어가는 것은 코드가 만든
  `where` 문자열과 컬럼명 dict 키뿐이고 사용자 입력은 없다. ILIKE 의 `%`·`_` 도 이스케이프한다(`jobs.py:857`).
- CSV 수식 주입 무력화(`jobs.py:924-929`) — `=`·`+`·`-`·`@` 로 시작하는 셀에 `'` 를 붙인다.
- 멱등은 `pg_advisory_xact_lock(actor+route+key)` 로 직렬화하고 같은 키·다른 본문은 409(`jobs.py:110-117`).
- 전이는 부모(공고) → 자식(지원) 순서로 `FOR UPDATE`, `expectedVersion` 낙관적 잠금(`jobs.py:1015-1021`).
- 컨테이너는 `read_only`·`cap_drop: ALL`·`no-new-privileges`·`127.0.0.1` 바인딩. 파일 볼륨만 쓰기 가능.

---

## 6. `DB.md` §8-3 「완료」 표기 — **사실이다**

`grep -rn "dc_jobs|dc_job_applications|dc_job_app_events|dc_job_wishlist|dc_user_resumes_v1"`
→ 업무 데이터 접근 **0건**. 남은 것은 `shared/jobStore.ts:17` 의 CustomEvent 이름
`'dc_jobs_changed'`(스토리지 키가 아니다)뿐이다.
`localStorage` 호출은 신원 키 조회 3곳(`jobsSource.ts:209-210` · `jobApplicationExport.ts:33`)만
남았고 이는 `shared/api.ts` 와 같은 용도다.
`src_admin/data/jobs.seed.json` 은 **코드 어디에서도 import 되지 않는다** — 이제 `dc.seed_source`
경유 최초 적재용 시드일 뿐이다(`023_job_seed.sql:22`).

**⚠️ 문서 드리프트 (비차단 · team-lead 몫)** — `CLAUDE.md` 두 줄이 아직 옛 사실을 말한다.
`DB.md` §8-3 이 정본이라고 `CLAUDE.md` 스스로 밝히고 있으므로 완료 게이트는 통과지만,
이 표를 먼저 읽는 다음 작업자가 채용에 localStorage 를 다시 쓸 위험이 있다.

- `CLAUDE.md:68` — `| **채용공고** | ❌ 아직 JSON | src_admin/data/jobs.seed.json | …` → `✅ DB`(`dc.job_posting` · `dc.job_application` …)
- `CLAUDE.md:93` — `| 상담사가 공고 CRUD | ❌ localStorage | dc_jobs |` → `✅ DB`
- 함께 볼 것: `SPEC.md` §10-3(구현자 §5 가 team-lead 몫으로 남긴 019~021 충돌)

---

## 7. 비차단 관찰 (이번에 고치지 않아도 되는 것)

| # | 관찰 | 판단 |
|---|---|---|
| O1 | 업로드에 학생별 **수량·용량 한도가 없고** orphan(귀속 실패한 예약 파일) 정리 배치도 없다 | R1 이 이미 인정. 파기 정책(#42)과 함께 잡을 항목이지 이번 차단 사유는 아니다. V1 을 고치면 **한 요청의 크기**는 막힌다 |
| O2 | 외부 시드 공고 6건이 전부 마감일 2026-08-xx 라 오늘 기준 `effectiveStatus='CLOSED'` 로 보인다 | 023 이 「테스트 편의로 마감일을 늘리지 않는다」고 선언한 결과다. 원천 충실성이 옳다 — 결함 아님 |
| O3 | 교내 추천채용(`source='manual'` + `RECOMMENDATION`)만 사이트 안 지원을 받으므로, 시드만으로는 학생이 지원할 공고가 0건이다 | 의도된 것. 교직원이 공고를 만들어야 왕복이 시작된다 |
| O4 | `PATCH /job-resumes/{id}` 는 본문 검증(422)이 소유 검증(404)보다 먼저 돈다 | 존재 여부를 흘리지 않으므로(둘 다 남의 자원에서 같은 응답) 정보 노출이 아니다. 고칠 필요 없음 |
| O5 | 여러 공고 CSV 를 화면이 나눠 받아 잇는다(R5) · 전형 재정렬이 진행 중 지원의 다음 순서를 바꾼다(R3) | 구현자가 이미 위험으로 기록했고 둘 다 업무 결정이 필요한 항목이다. 이번 범위에서 다루지 않는다 |

---

## 8. 재검증 절차 (1차에 지시한 것)

1. `src_v2/App.tsx:125` · `backend/app/jobs.py:1231` **두 곳만** 고친다.
2. 빈 `dreamcatch_test` 를 §1-1 절차로 다시 만들고 `migrate → seed → pytest -q`.
3. `npx.cmd tsc -b` · `npm run build`.

---

## 9. 2차 재검증 — V1·V2 만 다시 본다 <span>(2026-09-09)</span>

1차에 통과 판정한 항목(파일 다운로드 권한 · 이탈 3건 · CLAUDE.md 규칙 · 「채용시 마감」 ·
`DB.md` §8-3 완료 표기)은 **재검증하지 않았다.** 아래 두 건과 회귀만 확인했다.

### 9-1. V1 — 해소 ✅ (메모리 실측)

수정: `backend/app/files.py:58-59` `too_large()` · `:62-78` `read_body()` 신설,
`:88-90` `store()` 의 사후 검사 유지(2중 방어), `backend/app/jobs.py:1235` 가
`await files.read_body(request)` 로 교체.

**1차와 같은 방식(tracemalloc)으로 다시 쟀다.** 422 가 나오는지가 아니라 **피크가 떨어졌는지**가 기준이다.

| 시나리오 (본문 40MB · 한도 10MB) | 서버가 소비한 양 | traced peak | 판정 |
|---|---|---|---|
| **1차(수정 전)** 왕복 40MB | 40MB 전량 | **41.9 MB** | ❌ 무제한 |
| **2차** 왕복 40MB (`Content-Length` 정직) | 0 | **1.9 MB** | ✅ 읽기 전 거절 |
| **2차** `Content-Length` **없음**(chunked)으로 40MB 밀어넣기 | **11.0 MB 에서 중단** | 13.4 MB | ✅ 스트림 검사가 막는다 |
| **2차** `Content-Length` **거짓**(1KB 선언 후 40MB 밀어넣기) | **11.0 MB 에서 중단** | 13.4 MB | ✅ 선언값을 신뢰하지 않는다 |
| **2차** `Content-Length` 40MB 정직 선언 | **0 B** | 0.0 MB | ✅ 한 바이트도 읽지 않는다 |

`Content-Length` 는 빠른 거절에만 쓰이고 **실제 방어선은 스트림 누적 검사**다 — 지시한 대로다.
상한은 「한도 + 청크 1개」에서 멈추고 `bytearray` 의 용량 배증 때문에 최악 ≈ 한도의 2배(13.4MB)에서
묶인다. **무제한이던 것이 요청당 상수로 바뀌었다** — `mem_limit: 384m` 안에서 안전하다.

**우회 경로 없음** — `grep -n "request.body()" backend/app/*.py` 결과 **호출 0건**
(`jobs.py:1227` 의 주석 한 줄뿐이다).
바이트를 받는 진입점은 `POST /job-files`(`jobs.py:1235`) 하나뿐이고 그것이 `read_body` 를 쓴다.

### 9-2. V1 회귀 테스트가 진짜 회귀 테스트인지 — 확인 ✅

`backend/tests/test_jobs.py:473 test_oversized_upload_stops_reading_instead_of_buffering`.
TestClient 가 본문을 미리 모아 버려 왕복으로는 증명되지 않는다는 구현자의 설명은 맞다 —
그래서 `files.read_body` 를 직접 호출해 **서버가 소비한 청크 수**를 센다(한도 64KB, 32KB 청크 200개 투입 → `<=3` 이어야 통과).

되돌려서 실제로 실패하는지 확인했다.

```
# files.py 의 스트림 안 한도 검사만 제거
async for chunk in request.stream():
    body.extend(chunk)          # ← if len(body) > limit: raise too_large() 를 뺌
→ pytest tests/test_jobs.py::test_oversized_upload_stops_reading_instead_of_buffering
→ 1 failed
```

원복 완료(현재 트리는 수정본 그대로). `Content-Length` 빠른 경로를 지워도
`consumed['chunks'] == before` 단언이 잡으므로 **두 갈래 모두 커버**된다.

### 9-3. V2 — 해소 ✅

`src_v2/App.tsx:126`
```tsx
{ path: '/jobs/:id', element: <StageGate stage="employment" title="채용공고 상세"><JobDetail /></StageGate> },
```

- `stage="employment"` — `/jobs`·`/jobs/external`·`/jobs/joblist`·`/jobs/home`·`/jobs/home/resume`·
  `/jobs/home/consulting` 과 **같은 단계**다. 상세만 다른 기준을 쓰지 않는다.
- `/mypage/applications`(`:134`)는 `StageGate` **밖으로 그대로** 남았다 — 교정 E14 대로다.
- 라우트 순서도 유지 — `/jobs/notices` 가 `/jobs/:id` 위에 있어 정적 세그먼트가 먼저 읽힌다.
- **빈 화면이 아니다**(CLAUDE.md 13조) — `StageGate.tsx:27` 이 `StageLockNotice` 를 그리고,
  그 컴포넌트가 ① 사유(`next.detail`) ② 남은 4단계 진행 표시 ③ **다음 단계 링크**
  (`<Link to={next.ctaPath}>`)를 함께 준다(`StageLockNotice.tsx:33-53`). 목록 화면과 동일한 안내다.

### 9-4. 회귀 — 빈 DB 재생성 후 재실행

| 단계 | 결과 |
|---|---|
| `migrate` (빈 `dreamcatch_test`) | `001`~`023` 전부 적용 |
| `seed --root ..` | `{"status": "imported", "sourceFiles": 43, "students": 120}` |
| `pytest -q` | **63 passed** · 5.47s (1차 62 + V1 회귀 1) |
| `npx.cmd tsc -b` | exit 0 |
| `npm run build` | `✓ built in 1.62s` |

스키마는 바뀌지 않았다(`022`·`023` 무수정) — 개발 DB 재적용이 필요 없다는 보고와 일치한다.

### 9-5. 남은 결함

**없다.** §7 의 비차단 관찰(O1~O5)과 §6 의 `CLAUDE.md:68`·`CLAUDE.md:93` 문서 드리프트는
그대로 남아 있고, 1차와 같이 **team-lead 몫의 비차단 후속**이다.

**PASS — 2026-09-09**
