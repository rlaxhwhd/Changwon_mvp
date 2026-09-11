# CLAUDE.md

국립창원대학교 역량개발관리시스템 **드림캐치(DREAMCATCH)** — 현행 운영 시스템의 **고도화** 프로젝트.
React 19 + TypeScript 5.9 + Vite 8 두 SPA + FastAPI + PostgreSQL.
**뷰포트 — `src_v2/`(학생) 모바일 반응형 · `src_admin/`(교직원) 데스크톱 전용(min-width 1280px)** <span>(2026-09-08)</span>
**백엔드(FastAPI) + PostgreSQL 구축이 2026-09-08 착수됐다** — 아직 붙지 않았다. 배선 검증용이며 설계는 `DB.md` §8-4.
**프로세스 관련 지시사항이나 질문시 `/grilling` 스킬을 자동 호출한다** <span>(2026-09-07 — 옛 `.agents/skills/grill-me` 는 `.claude/skills/grilling` 으로 옮겨졌다)</span>
> **이 문서는 "매번 지켜야 할 규칙"만 담는다. 찾아볼 사실은 아래 문서로 간다.**
> 같은 내용을 여러 문서에 복사하지 않는다 — 한 사실은 한 문서에만 둔다.

---

## 사용자 확정 — 심리상담과 외부 진단 결과 연계 (2026-09-11)

**SSO 전 학생 로그인 후속 요청(2026-09-11)은 별도로 구현됨:** 학사 복제본의 학생 학번 + 공통 비밀번호 `!`, 서버 세션, 요청 학생 `20180001` 등록. 원본 Oracle 수정 금지. 상세는 [`docs/STUDENT_LOGIN.md`](docs/STUDENT_LOGIN.md). 아래 문서 기록 전용 지시는 심리상담·외부 진단 결과 연계에 대한 당시 지시다.

**이번 지시는 기억을 위한 문서 기록만이다. API·백엔드·DB·화면 구현을 시작하라는 지시가 아니다.** 아래는 향후 구현 시 적용할 확정 방향이며, 구현 완료 상태를 뜻하지 않는다. 기존 문서의 심리검사 존치·자체 채점식 대기 설명과 충돌하면 이 사용자 지시를 우선한다.

- **심리상담사는 별도 로그인 역할 `psych`다.** 진로취업상담사(`career`)와 `src_admin`의 공통 화면을 재사용하고, 역할마다 SPA나 최상위 폴더를 만들 필요는 없다. 시스템 관리자 `admin` 역할과도 구분한다. 메뉴 표시뿐 아니라 API에서 역할·본인 담당 상담·학생 범위를 검사하여 조회와 작성·수정을 통제한다.
- **심리상담은 CARE 7+와 완전히 독립된 업무다.** 심리상담사가 자체 보유 설문지와 실제 상담으로 검사·상담을 진행하고, 이 웹사이트에서는 검사 결과와 상담 결과·일지를 직접 작성·저장·수정·조회한다. 웹사이트 내 설문 출제·자동 채점·CARE 7+ 유형 판정·로드맵 연계를 전제로 삼지 않는다. 이 기록 기능은 CARE 7+ 채점식이나 검사 존치 결정을 기다릴 필요가 없다.
- **심리상담사 메뉴 범위:** 상담스케줄, 상담현황, 검사현황, 포트폴리오 관리, 상담통계, 추가 심리상담신청. 여기서 **포트폴리오 관리는 관리자 페이지의 학생관리 기능**을 뜻하며, 채용 지원 시 포트폴리오 제출 기능과 다르다. 추가 심리상담신청의 상세 처리 흐름은 아직 확정하지 않았다.
- **CARE 7+ 진단은 우리 회사의 다른 웹사이트에서 진행한다.** 해당 사이트가 검사·채점·유형 판정과 결과표 표시를 담당한다. 이 프로젝트는 외부에서 확정된 진단 결과·유형·결과표를 받아 저장하고 활용하는 방향이다. **이 프로젝트에 자체 진단 채점 엔진이나 계산식을 구현하지 않는다.** 기존의 “채점식 제공 후 자체 엔진 구현” 계획은 이 방향으로 대체한다.
- 외부 결과의 전달 방식(API 조회·수신 등), 학생 식별자 매핑, 결과표 형식과 연계 규격은 아직 정하지 않았다. 구체적인 계약이나 계산식을 임의로 만들지 않는다. 심리상담사의 수기 기록과 외부 CARE 7+ 진단 결과 수신을 혼동하지 않는다.

---

## 📚 문서 라우팅 <span>(작업 전 여기서 목적지를 고른다)</span>

**정본 문서 4개와 DB 구축 원안 1개가 있다.** 각 확정 사실은 정본 한 곳에만 두고, `spec_v1.md`는 설계 근거와 변경 이력을 보존한다.

| 문서 | 소유하는 것 |
|---|---|
| **`CURRENT.md`** | **현행 드림캐치의 사실** — 사이트맵 · 기능 · 권한 · DB구조 |
| **`PROCESS.md`** | **프로세스 최종안** — 게이팅 · 6유형 · 24주제 · 로드맵 3축 · 승급 |
| **`SPEC.md`** | **우리가 만들 것** — 화면 명세 · 구현 상태 · 필드 사전 · 코드 체계 |
| **`DB.md`** | **우리 DB 설계** — 소유권 경계 · 이관 전제 · **개발 DB·백엔드(§8-4)** · **미결 대장** |
| **`spec_v1.md`** | **Astra가 작성한 PostgreSQL·백엔드 구축 원안** — DB 전환의 상세 설계 근거. 실제 스키마·`DB.md`와 충돌하면 변경 이유를 추적 |

| 무엇을 하려는가 | 읽을 문서 |
|---|---|
| **화면·기능을 만든다** — 무엇이 필요하고 지금 어디까지 됐나 | **`SPEC.md` §3** |
| **진단·상담·로드맵 순서와 잠금 규칙** | **`PROCESS.md`** |
| 필드명·상태값을 정한다 | `SPEC.md` §6 필드 사전 · §7 코드 체계 |
| 누가 어떤 학생을 볼 수 있나 | `SPEC.md` §2 |
| **현행이 어떻게 돼 있나** (사이트맵·기능·권한·DB) | **`CURRENT.md`** |
| DB 소유권 경계·이관 전제 | `DB.md` |
| DB 전환 설계·구축 원안 대조 | **`spec_v1.md` 전체** + `DB.md` §8-3·§8-4·§9 |
| 현행 근거 원문 | `docs/_analysis/` · `docs/DB_CURRENT.html` |
| 아직 못 정한 것 | `DB.md` §9 **(미결 대장 — 여기 하나뿐)** |
| 디자인 토큰 | `DESIGN.md` · `UI.md` (새 팔레트·폰트 생성 금지) |
| 포털별 컨셉·사이트맵 원안 | `STU_README.md`(학생) · `Counsel_README.md`(교직원) |
| 하네스·에이전트 | `AGENTS.md` · `.ai/interop.md` |

⚠️ `docs/_analysis/06_findings.md`는 **운영 시스템 취약점 21건**을 담는다 — **외부 공유 금지.**

---

## 🔑 데이터 원칙 — 정본은 서버 DB다 <span>(★ 가장 중요)</span>

> **JSON·localStorage 는 더 이상 정본이 아니다.** 학생·상담·진단·비교과·채용·로드맵·교직원·전담배정은 PostgreSQL 이 정본이고,
> 프론트는 부팅 때 API 로 적재한 스토어를 읽는다. **API 가 없으면 화면은 렌더되지 않는다.**
> 로컬에서 화면을 보려면 DB·API 를 함께 띄운다 → [`docs/LOCAL_DEV.md`](docs/LOCAL_DEV.md)
>
> **프론트 `src_v2/data`·`src_admin/data` 에는 JSON 파일이 없다** <span>(2026-09-11 · `0003-seed-retirement`)</span>.
> 시드 입력은 `backend/seeds/{v2,admin}/` 에만 있고 `app.seed` 가 읽는다. 프론트에 `.json` import 를 다시 만들지 않는다.
>
> **어느 도메인이 아직 안 옮겨졌는지는 `DB.md` §8-3 이관 대장이 정본이다.** 여기에 목록을 복사하지 않는다.
> 작업을 시작하기 전에 그 표에서 해당 도메인의 상태와 막고 있는 것을 먼저 확인한다.
>
> 교체 후에도 **바뀌는 것은 로더 내부뿐**이다 — 화면은 여전히 셀렉터만 구독하고, 로더 시그니처는 **동기를 유지한다**(`SPEC.md` §5).
> 아래 「이벤트 → 정본 반영」 표는 **각 이벤트가 어느 테이블에 쌓이는지의 설계 입력**이다. 표를 지우지 말 것.

이벤트가 일어나면 그 결과를 **정본 테이블에 행을 추가/수정**하는 방식으로 구현한다.
**하드코딩 리터럴을 화면에 박지 말 것** (skill `json-dynamic-screen`, `students.ts` 패턴 미러).

### 단일소스 (여기 말고 다른 데 데이터 두지 말 것)

`✅ DB` 는 서버가 정본이라는 뜻이다 — 시드는 최초 적재용으로만 남는다. 시드를 고쳐도 반영되지 않는다.

| 단일소스 | 정본 | 위치 | 담는 것 |
|---|---|---|---|
| **학생** | ✅ DB | `dc.student` · `dc.student_list` 뷰 — fixture 는 상세 프로필 3명(`backend/seeds/v2/students/*.json`)뿐, **로스터 더미는 062 에서 퇴역**. 실제 학생은 학사 미러(`academic.*`)에서 들어온다 | 프로필·진단·유형·로드맵·성장·포트폴리오·벌점·상담신청. **유형은 `student_type_event`, 이행률은 `roadmap_progress` 에서만 파생** — 더미 학생을 다시 만들지 않는다 |
| **교직원** | ✅ DB | `dc.staff` · `dc.org_assignment` · `dc.advisor_assignment` (시드 `backend/seeds/admin/…`) | 상담사·교수·조교 프로필·역할·담당 학과·전담교수 배정 |
| **조직** | ✅ DB | `dc.department` (`GET /departments`) | 학과 트리 — `(단대코드, 학과코드)` 쌍 |
| **비교과 프로그램** | ✅ DB | `dc.program` · `dc.program_apply` | 목록·정원·신청자·선발·출석·수료 |
| **채용공고** | ✅ DB | `dc.job_posting` · `dc.job_application` · `dc.company` | 공고·기업·지원·전형단계·찜·자소서 |
| **공지·팝업** | ✅ DB | `dc.notice` · `dc.main_popup` | 공지 본문 · 학생 메인 캐러셀 |

### 이벤트 → 정본 반영 매핑 <span>(이 프로젝트의 심장)</span>

"무슨 일 즉, 데이터값 변경이 일어나면 → 어디에 무엇을 추가/수정하나"를 항상 이 표대로 설계한다.

| 이벤트 | 정본 | 어디에 쌓이나 |
|---|---|---|
| 학생이 비교과 신청 | ✅ DB | `dc.program_apply` (+ `program_apply_event`) |
| 상담 신청 | ✅ DB | `dc.counsel_request` |
| **상담 상태 전이**(확정·일정변경·재배정·취소·완료) | ✅ DB | `dc.counsel_event` — append-only |
| 상담 완료·코멘트 | ✅ DB | `dc.counsel_record` |
| **교수가 신청 없이 남기는 지도학생 상담기록** | ✅ DB | `POST /counsel-records/professor` → `counsel_request(type=PROF, DONE, origin=PROF_RECORD)` + `counsel_record` 한 트랜잭션. 분류는 `topic_code`(`PROF_COUNSEL_TYPE`) |
| 진단 응시·코멘트·권유 | ✅ DB | `dc.diagnosis_attempt` · `diagnosis_result` · 이벤트 |
| **상담에서 6유형 확정** | ✅ DB | `dc.student_type_event` — append-only |
| **비교과 수료** | ✅ DB | `dc.program_apply.outcome_code` |
| **비교과 미참여 벌점** | ✅ DB | `dc.penalty_entry` — 부여·회수를 행으로 쌓고 합으로 읽는다 |
| **수료한 프로그램의 IAP 칸 완료** | ✅ DB | `dc.roadmap_item.status` → `DONE`<br>★ **선발·출석은 칸을 닫지 않는다. 수료만 닫는다**(`spec_v1` §7.2) |
| **로드맵 생성**(상담과 동시 · 재료3→축3 · 15칸) | ✅ DB | `POST /students/{id}/roadmap/generate` → `dc.roadmap*` — 생성기는 시드 `roadmapOutcome` 채택(AI 계약 미확정 `DB.md` #38) |
| 상담사가 로드맵 수정 | ✅ DB | `PATCH /students/{id}/roadmap` — 칸 단위 op + 낙관적 잠금 |
| 로드맵 변경 요청·반려 | ✅ DB | `dc.roadmap_request` (+ 이벤트) |
| **로드맵 스냅샷·재생성** | ✅ DB | `dc.roadmap_snapshot` · `POST …/roadmap/regenerate` |
| **프로그램 개설 시 로드맵 편입**(추천/필수) | ❌ 미구현 | `program.roadmap_entry` · `care_types` 는 저장되나 **칸을 자동 생성하지 않는다** |
| 집단상담 개설·참여·완료 | ✅ DB | `POST /group-counsels` · `…/{id}/{action}` |
| 심리검사 결과 작성 | ✅ DB | `PUT /psych-tests/{requestId}` → `dc.psych_test_result` — 심리상담 신청 1건당 결과 1건. **CARE 7+ 진단과 별개 도메인**(채점 없음, 유형·로드맵과 연결 금지). 이로써 localStorage 업무 데이터 0 |
| **심리상담사가 신청 없이 남기는 상담 기록**(추가 심리상담신청) | ✅ DB | `POST /counsel-records/psych` → `counsel_request(type=PSY, DONE, origin=PSY_RECORD)` + `counsel_record` — 교수 발의 기록과 같은 방식 |
| 전담교수 배정·해제 | ✅ DB | `dc.advisor_assignment` — 활성 1건 부분 unique, 해제는 `released_at`. 교수 열람 범위(`staff_student_scope`)가 배정을 따라간다 |
| 지도학생 독려 | ✅ DB | `dc.notification(source_kind=ADVISOR_NUDGE)` — 기록이 아니라 알림 |
| 상담사가 공고 CRUD | ✅ DB | `dc.job_posting` (+ `job_posting_event`) |
| **학생이 채용 지원** | ✅ DB | `dc.job_application` (+ `job_application_event`) |
| **첨부파일 업로드** | ✅ DB+볼륨 | `dc.file_object` — 웹루트 밖 보관, API 가 권한 확인 후 스트리밍 |

### 런타임 반영 방식

**교직원 화면의 상담 투영은 `shared/counselStore` 의 서버 DTO 를 직접 읽는다** — 학생 owner(`STUDENTS`·`counselSeed`)를 거치면 상세 프로필이 없는 로스터 학생의 신청이 접수함·일지·통계에서 조용히 사라진다(2026-09-11 발견). 학생 스냅샷은 신청 행이 들고 있다.
**심리상담사는 `visibility()` 가 `legacy_type='심리'` 만 준다** — 진로취업·교수 상담 기록은 API 응답에 없다. 화면에서 다시 가릴 필요 없고, 반대로 우회 경로를 만들지 않는다.

부팅 로더가 API 로 스토어를 채우고 화면은 동기 셀렉터를 구독한다. 쓰기는 API 를 부른 뒤 해당 스토어를 다시 읽고 이벤트(`dc:*-updated`)를 발행한다.
**쓰기 호출은 반드시 `await` + 실패 표시** — `shared/useAsyncAction` 의 `run()` 또는 `.catch(setError)`. 응답을 기다리지 않고 "저장됨"을 띄우면 실패가 화면에 남지 않는다(2026-09-10 로드맵 편집기·교수상담에서 실제로 발생).
다른 사용자가 쓴 변경은 새로고침·다음 화면 이동에서 보인다(실시간 푸시 없음).

---

## 🧭 코드 작성 규칙 <span>(현행 DB 구조에서 나온 것 — 근거는 `DB.md`)</span>

1. **학사 유래 데이터는 읽기 전용으로 다룬다.** 학생 이름·학과·학년·학적상태를 우리 쪽에서 수정하는 UI/로직을 만들지 않는다.
2. **이벤트 레코드에는 발생 시점 스냅샷을 함께 저장한다.** 현행 `EP_PRM_APP`이 신청 시점 학적·학년·연락처를 복사해 둔다. 우리 테이블도 같은 패턴을 지킨다.
3. **파생값은 원본에 넣지 않는다.** 매칭도·적합도·집계는 별도 구조로 분리한다.
4. **상태값은 코드+라벨로 분리한다.** 한글 리터럴을 값 자체로 쓰지 않는다. → `SPEC.md` §7
5. **FK가 없는 DB다**(제약 157건 중 FK 3건). **정합성은 애플리케이션이 전담한다** — 로더에서 중복·정원·상태 위반을 거부한다.
6. **역할·권한은 `SY_AUTH` 체계를 계승한다.** 새 role 열거형을 만들지 말고 역할 코드를 추가한다. 학생은 권한 부여 대상이 아니라 `USER_TY_CD`로 판정한다.
7. **학과 트리는 `V_DEP_INF_ALL`로 구성한다.** `V_DEP_INF`를 쓰면 대학원이 빠진다. **동명 학과가 과정별로 존재하므로 학과명 매칭 금지 — `(단대코드, 학과코드)` 쌍으로 식별.**
8. **★ 신분코드를 리터럴로 쓰지 않는다.** 재학생 조회는 반드시 집합 상수 `STUDENT_ENROLLED`(=`1101`,`1201`)를 쓴다. 현행이 `'1101'`(학부 한정)을 **229곳**에 박아 대학원생이 사라진 것이 이 프로젝트의 대표적 부채다. 학부 한정이 정책인 곳은 **이유를 주석으로 남긴다.** → `SPEC.md` §7-2
9. **대학원생은 비교과 신청과 교수 상담신청이 가능해야 한다** (요구사항 확정). → `SPEC.md` §8
10. **집계는 데이터 층에서 한다.** 화면 컴포넌트에서 전체 배열을 받아 계산하지 않는다 — DB 전환 시 집계 SQL이 되어야 한다.
11. **이력은 append-only.** 상태 변경·배정·코멘트·권유는 수정·삭제하지 않고 쌓는다.
12. **재생성 금지.** 기존 코드를 재사용할 수 있으면 재사용한다. 같은 기능을 굳이 다시 만들지 않는다.
13. **★ 순차 게이팅은 데이터층 단일 정책으로 판정한다.** 진단→상담→로드맵→역량강화→취업지원 순서를 화면마다 다시 판단하지 않는다. 잠긴 UI에는 **비활성 + 안내 + 다음 단계 링크**를 준다(빈 화면 금지). → `PROCESS.md` §2
14. **자체 진단 채점·판정 엔진을 구현하지 않는다.** 우리 회사의 외부 검사 사이트가 확정한 진단 결과·6유형·결과표를 받아 사용한다. 임시 판정 로직을 만들지 않는다. → 위 「사용자 확정 — 심리상담과 외부 진단 결과 연계」(2026-09-11)

---

## 🛠 구현 규약 <span>(v2 = 실제 버전)</span>

- **`src_v2/`(학생) · `src_admin/`(교직원)만 서비스 버전.** `src/`(v1)은 폐기 예정.
- 라우팅은 **React Router**(`createBrowserRouter`). basename `/v2` · `/admin`.
- 상세 규약(역할 주입 · 컴포넌트 공유 · 목록 화면 필수 요소)은 **`SPEC.md` §4**.
- 스타일: 각 SPA의 단일 `index.css`, CSS 변수 기반. Font Awesome 6(v2) · react-icons/lu(admin).
- **★ 뷰포트 — 두 SPA의 방침이 다르다.**

  | | 방침 | 셸이 하는 일 |
  |---|---|---|
  | **`src_v2/` 학생** | **모바일 반응형** | `index.css` 가 **1240**에서 `body { min-width }` 를 풀고 **900**에서 GNB를 햄버거로 바꾼다 |
  | **`src_admin/` 교직원** | **데스크톱 전용** (min-width 1280px) | 해제하지 않는다. 표·목록이 고정폭 전제다 |

  화면 CSS는 **셸이 준 브레이크포인트 위에** 그 화면 고유의 고정 폭·고정 높이만 푼다. 셸 규칙을 화면마다 다시 쓰지 않는다.
  ⚠️ **공유 컴포넌트는 admin 쪽 데스크톱 폭에서도 깨지지 않아야 한다** — 두 SPA가 같이 쓴다.
  🔲 미적용 화면 6개 — `AiLounge` · `ProgramDetail` · `Notices` · `MyApplications` · `Portfolio` · `StarTrack` (CSS에 `@media` 없음).
- 빌드 게이트는 **`npx tsc -b`** — 루트 `tsconfig`가 `files: []`라 `tsc --noEmit`은 아무것도 검사하지 않는다.
- **로컬 API 재기동 시 워커 고아를 정리한다.** Windows 에서 `uvicorn --reload` 는 리로더를 죽여도 `multiprocessing.spawn` 워커가 18100 소켓을 물고 **옛 코드로 응답**한다. 재기동 전 그 python 프로세스를 함께 끝내거나 reload 없이 띄운다 <span>(2026-09-11 두 번 발생)</span>.

---

## 개발 준수사항

**새로운 페이지나 기능을 만들라고 지시할 때 필요한 데이터를 파악하고 DB 테이블·API·계약 테스트까지 생각해서 작업한다.** 임시 JSON/localStorage 우회는 만들지 않는다.

글로벌 `~/.claude/CLAUDE.md`의 **Karpathy Guidelines**를 따른다 (가정 금지 · 단순함 우선 · 외과적 변경 · 목표 기반 실행). 여기에 중복 기재하지 않는다.

---

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

| 요청 | 스킬 |
|---|---|
| 드림캐치 화면·기능·DB 전환 | `dreamcatch-orchestrator` — Opus 팀장 → Astra 설계 리뷰 → Sol 구현 |
| Bugs, errors, "why is this broken" | `investigate` |
| Ship, deploy, PR | `ship` · `land-and-deploy` |
| QA, test the site | `qa` |
| Code review | `review` · `codex` |
| Visual audit, design polish | `design-review` · `impeccable` |
| Architecture review | `plan-eng-review` |
| Code quality, health check | `health` |

단순 질문·조회는 직접 응답 가능. **사용자가 "하네스 없이/가볍게"라고 하면 팀장이 직접 구현하되 설계 이탈은 `.ai/handoff-db/*/05-implementation.md` 에 남긴다.**

### 디자인 가드레일

- 렌더 후 시각 리뷰·drift 감사 → gstack `/design-review` + `/browse`
- 레퍼런스 참조 → MengTo/Skills(설치 아님): `~/.claude/refs/MengTo-Skills/agent-skills/`에서 해당 SKILL.md만 Read
- `ui-ux-pro-max`·MengTo의 landing/style 생성류는 **직접 디자인 생성에 쓰지 않는다**(아이디어만, DESIGN.md 토큰으로 환원)

> 예외: `programs/new`만 `UI.md` `#2563EB` 팔레트(`.pf` 스코프 격리) — **의도된 divergence, 되돌리지 말 것.**

---

## gstack

`~/.claude/skills/gstack`에 설치된 스킬 모음. 이 프로젝트는 테스트 러너가 없으므로 **시각 검증·QA를 gstack에 의존한다.**

### ★ 웹 브라우징은 `/browse` + chrome-devtools MCP 병행 <span>(2026-09-11)</span>

**렌더 확인·스크린샷·QA·스크래핑·조작은 gstack `/browse` 가 기본 경로다.**
**`mcp__plugin_ecc_chrome-devtools__*` 는 진단 전용으로 함께 쓴다** — 화면을 띄운 뒤 콘솔 오류
(`list_console_messages`)·네트워크 요청/응답·실패(`list_network_requests`·`get_network_request`)·
성능 트레이스(`performance_start_trace`/`stop_trace`/`analyze_insight`)·Lighthouse(`lighthouse_audit`)
를 확인한다. 화면 검증을 「보였다」로 끝내지 말고 **콘솔 오류 0 · 실패 요청 0 · 느린 API 여부**까지 본다.
같은 origin 이면 `evaluate_script` 안에서 숨긴 iframe 으로 여러 역할·경로를 한 번에 돌 수 있다(2026-09-11 5역할 11화면 검증 방식).

**`mcp__claude-in-chrome__*` 도구는 절대 사용하지 않는다.**

> ⚠️ `_workspace` 함정 — browse/스크린샷 도구의 크롬 프로필 덤프가 vite dev를 hang시킨다.
> `.gitignore`·vite `watch.ignored` mitigation을 유지할 것.
> ⚠️ chrome-devtools MCP 가 "browser is already running" 을 내면 `chrome-devtools-mcp` 프로필을 잡은 이전 세션의 Chrome 이 남은 것이다 — 그 프로세스만 종료한다.

### 사용 가능한 스킬

`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`,
`/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`,
`/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`,
`/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`,
`/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`,
`/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`,
`/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

### 이 프로젝트에서의 제약

- **디자인 스킬은 리뷰·적용 전용.** `/design-consultation`·`/design-shotgun`·`/design-html`은 **새 팔레트·폰트를 생성하는 데 쓰지 않는다** — 디자인은 `DESIGN.md`에 잠겨 있다(위 디자인 가드레일).
- **빌드 게이트는 `npx tsc -b`.** `/ship`·`/review`가 무엇을 실행하든 이 게이트는 별도로 통과해야 한다.
- Windows(Git Bash) 설치라 skill 파일이 **심볼릭 링크가 아니라 복사본**이다 → `git pull` 후에는 `cd ~/.claude/skills/gstack && ./setup`을 다시 실행해야 갱신된다.

---

## 하네스: 3역할 엔지니어링 팀

Claude Code와 Codex는 메모리를 공유하지 않으며 `.ai/handoff-db/` 파일로 전달한다. 역할은 세 개뿐이다.

1. **팀장 `team-lead` — Claude Code Opus:** 프로젝트 프로세스·기존 JSON을 분석하고 `DB_SCHEMA.md`, 골든 패스, 엔티티 작업지시서, 최종 검증을 소유한다.
2. **DB 설계 리뷰 `codex-astra-db-reviewer` — Codex gpt-6-astra:** 기존 table/API 재사용, 트래픽, query, index, constraint, transaction, 권한을 검토하고 지침서를 직접 교정한다.
3. **실제 작업 `codex-sol-implementer` — Codex gpt-5.6-sol:** 승인 지침서와 골든 패스를 따라 SQL → FastAPI → 계약 테스트 → frontend를 구현한다.

첫 엔티티는 Astra가 골든 패스로 정성껏 구현하고 팀장이 직접 리뷰한다. 이후 Sol은 해당 파일 구조를 복제한다. 모든 엔티티는 API 응답의 key·중첩·type이 기존 mock JSON 계약과 맞는 자동 테스트를 통과해야 한다.

새 화면·기능도 팀장이 데이터 요구를 먼저 판단한다. 기존 구조의 의미·소유권·생명주기·권한이 맞으면 재사용하고, 독립 영속 상태가 필요하면 table/API/test를 UI보다 먼저 만든다. 임시 JSON/localStorage 우회는 금지한다. 업무 의미 선택이 필요할 때만 사용자에게 묻는다.

**Codex 토큰이 소진되면 팀장이 직접 구현한다.** 이때도 작업지시서·결정 기록·구현 기록은 같은 폴더에 남기고, Astra 승인 설계와 다르게 간 곳을 명시한다.

로그인 역할(학생/상담사/교수/조교)은 에이전트가 아니라 컨텍스트다. 상세 계약은 `AGENTS.md`, `.ai/interop.md`, `.ai/db/`를 따른다.
