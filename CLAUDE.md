# CLAUDE.md

국립창원대학교 역량개발관리시스템 **드림캐치(DREAMCATCH)** — 현행 운영 시스템의 **고도화** 프로젝트.
React 19 + TypeScript 5.9 + Vite 8. 프론트엔드 전용, 백엔드 없음. 데스크톱 전용(min-width 1280px).

> **이 문서는 "매번 지켜야 할 규칙"만 담는다. 찾아볼 사실은 아래 문서로 간다.**
> 같은 내용을 여러 문서에 복사하지 않는다 — 한 사실은 한 문서에만 둔다.

---

## 📚 문서 라우팅 <span>(작업 전 여기서 목적지를 고른다)</span>

**문서는 4개다.** 각 사실은 한 문서에만 있다.

| 문서 | 소유하는 것 |
|---|---|
| **`CURRENT.md`** | **현행 드림캐치의 사실** — 사이트맵 · 기능 · 권한 · DB구조 |
| **`PROCESS.md`** | **프로세스 최종안** — 게이팅 · 6유형 · 24주제 · 로드맵 3축 · 승급 |
| **`SPEC.md`** | **우리가 만들 것** — 화면 명세 · 구현 상태 · 필드 사전 · 코드 체계 |
| **`DB.md`** | **우리 DB 설계** — 소유권 경계 · 이관 전제 · **미결 대장** |

| 무엇을 하려는가 | 읽을 문서 |
|---|---|
| **화면·기능을 만든다** — 무엇이 필요하고 지금 어디까지 됐나 | **`SPEC.md` §3** |
| **진단·상담·로드맵 순서와 잠금 규칙** | **`PROCESS.md`** |
| 필드명·상태값을 정한다 | `SPEC.md` §6 필드 사전 · §7 코드 체계 |
| 누가 어떤 학생을 볼 수 있나 | `SPEC.md` §2 |
| **현행이 어떻게 돼 있나** (사이트맵·기능·권한·DB) | **`CURRENT.md`** |
| DB 소유권 경계·이관 전제 | `DB.md` |
| 현행 근거 원문 | `docs/_analysis/` · `docs/DB_CURRENT.html` |
| 아직 못 정한 것 | `DB.md` §9 **(미결 대장 — 여기 하나뿐)** |
| 디자인 토큰 | `DESIGN.md` · `UI.md` (새 팔레트·폰트 생성 금지) |
| 포털별 컨셉·사이트맵 원안 | `STU_README.md`(학생) · `Counsel_README.md`(교직원) |
| 하네스·에이전트 | `AGENTS.md` · `.ai/interop.md` |

⚠️ `docs/_analysis/06_findings.md`는 **운영 시스템 취약점 21건**을 담는다 — **외부 공유 금지.**

---

## 🔑 데이터 원칙 — DB 없음: 모든 상태는 JSON <span>(★ 가장 중요)</span>

**백엔드·DB가 없다. 모든 데이터와 "상태 변화(이벤트)"를 DB 대신 JSON으로 표현한다.**
이벤트가 일어나면 그 결과를 **단일소스 JSON에 항목을 추가/수정**하는 방식으로 구현한다.
**하드코딩 리터럴을 화면에 박지 말 것** (skill `json-dynamic-screen`, `students.ts` 패턴 미러).

### 단일소스 (여기 말고 다른 데 데이터 두지 말 것)

| 단일소스 | 위치 | 담는 것 |
|---|---|---|
| **학생** | `src_v2/data/students/*.json` | 프로필·진단·유형·로드맵·성장·포트폴리오·벌점·상담신청 |
| **교직원** | `src_admin/data/counselors/*.json` · `professors/` · `assistants` | 상담사·교수·조교 프로필·역할·담당범위 |
| **비교과 프로그램** | `src_admin/data/programs.*` | 목록·정원·신청자·출석 |
| **채용공고** | `src_admin/data/jobs.seed.json` | 상담사가 CRUD하는 공고 |

### 이벤트 → JSON 반영 매핑 <span>(이 프로젝트의 심장)</span>

"무슨 일 즉, 데이터값 변경이 일어나면 → 어디에 무엇을 추가/수정하나"를 항상 이 표대로 설계한다.

| 이벤트 | 대상 단일소스 | 런타임 키(localStorage) |
|---|---|---|
| 학생이 비교과 신청 | 학생 신청목록 + 프로그램 신청자 | `dc_program_apply` |
| 상담 신청 | 학생 owner 스토어 | `dc_counsel_owners` |
| **상담 상태 전이**(확정·일정변경·재배정·취소·완료) | **처리 이력 (append-only)** | `dc_counsel_events` |
| 상담 완료·코멘트 | 상담 기록 | `dc_counsel_records` |
| 집단상담 개설·참여·완료 | 집단상담 회차 | `dc_group_counsels` |
| 심리검사 결과 작성 | 심리검사 결과 | `dc_psych_tests` |
| 진단 응시·코멘트·권유 | 진단 이력 | `dc_diag_attempts` · `_comments` · `_nudges` |
| **상담에서 6유형 확정** | 학생 유형·계층 (append) | `dc_student_type` |
| **로드맵 생성**(상담과 동시 · 재료3→축3 · 15칸) | 학생 로드맵 1개 | `dc_roadmap` |
| 상담사가 로드맵 수정 | 로드맵 칸 override | `dc_roadmap_overrides` |
| 로드맵 변경 요청 | 로드맵 요청 스토어 | `dc_roadmap_requests` |
| **프로그램 개설 시 로드맵 편입**(추천/필수) | 대상 유형 학생의 **IAP 축에 칸 추가** | `dc_programs.roadmapEntry` → `dc_roadmap` |
| **프로그램 선발** | 그 IAP 칸 **자동 완료** | `dc_program_apply` → `dc_roadmap` |
| **로드맵 연 1회 스냅샷·재생성** | 스냅샷 (append-only) | `dc_roadmap_snapshots` |
| 비교과 미참여 벌점 | 학생 벌점 | `dc_penalty` |
| 전담교수 배정 | 배정 이력 | `dc_advisor_assign` |
| 상담사가 공고·프로그램 CRUD | 각 리스트 | `dc_jobs` · `dc_programs` |

### 런타임 반영 방식 (파일을 못 쓰니까)

브라우저에서 JSON 파일을 직접 쓸 수 없으므로 **base JSON(seed) + `localStorage` 오버레이 = 병합 렌더**로 처리한다.
원본 JSON은 불변, 이벤트 결과(override)만 오버레이에 쌓고 읽을 때 병합한다.
→ 이래야 "상담사가 고치면 학생 화면에 반영", "학생이 신청하면 상담사 접수함에 뜸"이 DB 없이 성립한다.

---

## 🧭 코드 작성 규칙 <span>(현행 DB 구조에서 나온 것 — 근거는 `DB.md`)</span>

1. **학사 유래 데이터는 읽기 전용으로 다룬다.** 학생 이름·학과·학년·학적상태를 우리 쪽에서 수정하는 UI/로직을 만들지 않는다.
2. **이벤트 레코드에는 발생 시점 스냅샷을 함께 저장한다.** 현행 `EP_PRM_APP`이 신청 시점 학적·학년·연락처를 복사해 둔다. 우리 JSON도 같은 패턴을 지킨다.
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
14. **진단 판정식을 코드에 고정하지 않는다.** 문항·판정식이 미확정이므로 6유형은 **주입받는 값**으로 다룬다. 임시 판정 로직을 만들지 않는다. → `PROCESS.md` §9

---

## 🛠 구현 규약 <span>(v2 = 실제 버전)</span>

- **`src_v2/`(학생) · `src_admin/`(교직원)만 서비스 버전.** `src/`(v1)은 폐기 예정.
- 라우팅은 **React Router**(`createBrowserRouter`). basename `/v2` · `/admin`.
- 상세 규약(역할 주입 · 컴포넌트 공유 · 목록 화면 필수 요소)은 **`SPEC.md` §4**.
- 스타일: 각 SPA의 단일 `index.css`, CSS 변수 기반. Font Awesome 6(v2) · react-icons/lu(admin).
- 빌드 게이트는 **`npx tsc -b`** — 루트 `tsconfig`가 `files: []`라 `tsc --noEmit`은 아무것도 검사하지 않는다.

---

## 개발 준수사항

글로벌 `~/.claude/CLAUDE.md`의 **Karpathy Guidelines**를 따른다 (가정 금지 · 단순함 우선 · 외과적 변경 · 목표 기반 실행). 여기에 중복 기재하지 않는다.

---

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

| 요청 | 스킬 |
|---|---|
| 드림캐치 화면 제작·수정 (팀 작업) | `dreamcatch-orchestrator` |
| 신규 역할 화면을 JSON 동적으로 | `json-dynamic-screen` |
| Bugs, errors, "why is this broken" | `investigate` |
| Ship, deploy, PR | `ship` · `land-and-deploy` |
| QA, test the site | `qa` |
| Code review | `review` · `codex` |
| Visual audit, design polish | `design-review` · `impeccable` |
| Architecture review | `plan-eng-review` |
| Code quality, health check | `health` |

단순 질문·조회는 직접 응답 가능.

### 디자인 가드레일

**디자인은 `DESIGN.md`에 잠겨 있다. 어떤 디자인 스킬도 새 팔레트·스타일을 생성하지 않는다 — 적용/리뷰만.**
- 렌더 후 시각 리뷰·drift 감사 → gstack `/design-review` + `/browse`
- 레퍼런스 참조 → MengTo/Skills(설치 아님): `~/.claude/refs/MengTo-Skills/agent-skills/`에서 해당 SKILL.md만 Read
- `ui-ux-pro-max`·MengTo의 landing/style 생성류는 **직접 디자인 생성에 쓰지 않는다**(아이디어만, DESIGN.md 토큰으로 환원)

> 예외: `programs/new`만 `UI.md` `#2563EB` 팔레트(`.pf` 스코프 격리) — **의도된 divergence, 되돌리지 말 것.**

---

## gstack

`~/.claude/skills/gstack`에 설치된 스킬 모음. 이 프로젝트는 테스트 러너가 없으므로 **시각 검증·QA를 gstack에 의존한다.**

### ★ 웹 브라우징은 반드시 `/browse`

**모든 웹 브라우징은 gstack의 `/browse` 스킬을 사용한다.**
**`mcp__claude-in-chrome__*` 도구는 절대 사용하지 않는다.**

렌더 확인·스크린샷·QA·스크래핑 어느 경우든 `/browse`가 유일한 경로다.

> ⚠️ `_workspace` 함정 — browse/스크린샷 도구의 크롬 프로필 덤프가 vite dev를 hang시킨다.
> `.gitignore`·vite `watch.ignored` mitigation을 유지할 것.

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

## 하네스: 드림캐치 화면 제작 팀

**Claude Code(기획·검수) × Codex(구현)** 협업. 둘은 메모리를 공유하지 않고 **파일(`.ai/handoff/`)로만 소통**한다(규약 `.ai/interop.md`).

5단계: ①팀장(`team-lead`)이 기획 확정 → ②③Codex가 이미지 분석·구현 → ④`design-reviewer`(토큰·유지보수) ⑤`content-reviewer`(내용 정합성) 검수.
모드 A(Codex-UI) / 모드 B(데이터 파이프라인)를 팀장이 판별해 라우팅한다.

로그인 역할(학생/상담사/교수/조교)은 에이전트가 아니라 **컨텍스트로 주입**하고 **읽기 범위를 역할별로 격리**한다.

상세·변경 이력은 `AGENTS.md`.
