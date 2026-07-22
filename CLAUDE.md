# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **진입점: [AGENTS.md](AGENTS.md)** — 역할별 라우팅(학생 작업 → `STU_README.md` / 상담사 작업 → `Counsel_README.md`), 하네스, 빠른 참조. 작업 착수 전 참고.

## 🔑 데이터 원칙 — DB 없음: 모든 상태는 JSON (★가장 중요)

**백엔드·DB가 없다. 따라서 모든 데이터와 "상태 변화(이벤트)"는 DB 대신 JSON으로 표현한다.**
어떤 이벤트가 일어나면 그 결과를 **해당 단일소스(JSON)에 항목을 추가/수정**하는 방식으로 구현한다. 하드코딩 리터럴로 화면에 박지 말 것 (skill `json-dynamic-screen`, `students.ts` 패턴 미러).

### 단일소스 3+1 (여기 말고 다른 데 데이터 두지 말 것)
| 단일소스 | 위치 | 담는 것 |
|---|---|---|
| **학생 JSON** | `src_v2/data/students/*.json` | 학생 프로필·진단·IAP·로드맵·성장·포트폴리오·벌점 |
| **상담사 JSON** | `src_admin/data/counselors/*.json` *(신설 예정)* | 상담사 프로필·역할·담당범위 |
| **비교과프로그램 리스트** | 프로그램 단일소스 JSON | 프로그램 목록·정원·신청자·출석 |
| **채용공고 리스트** | 채용공고 단일소스 JSON *(데이터 추후 제공)* | 상담사가 CRUD하는 공고 |

### 이벤트 → JSON 반영 매핑 (이게 이 프로젝트의 심장)
"무슨 일이 일어나면 → 어디에 무엇을 추가/수정하나"를 항상 이 표대로 설계한다.

| 이벤트 | 추가/수정 대상 (단일소스) | 런타임 키(localStorage) |
|---|---|---|
| 학생이 비교과 신청 | 학생 JSON 신청목록 + 프로그램 신청자 | `dc_program_apply` |
| 상담 신청 | 상담 요청 스토어 | `dc_counsel_requests` |
| 상담 완료·코멘트 | 상담 기록(→ 학생에 반영) | `dc_counsel_records` |
| IAP 유형 확정 | 학생 JSON IAP | `dc_iap_result` |
| 상담사가 로드맵 수정 | 학생 로드맵 override | `dc_roadmap_overrides` |
| 로드맵 변경 요청 | 로드맵 요청 스토어 | `dc_roadmap_requests` |
| 비교과 미참여 벌점 | 학생 JSON 벌점 | `dc_penalty` |
| 상담사가 채용공고 등록/수정/삭제 | 채용공고 리스트 | `dc_jobs` |
| 상담사가 새 프로그램 등록 | 비교과프로그램 리스트 | `dc_programs` |

### 런타임 반영 방식 (파일은 못 쓰니까)
브라우저에서 JSON 파일을 직접 못 쓰므로, **base JSON(seed) + `localStorage` 오버레이 = 병합 렌더**로 처리한다.
원본 JSON은 그대로 두고 이벤트 결과(override)만 localStorage에 쌓아, 읽을 때 병합해서 보여준다. → 이래야 "상담사가 고치면 학생 화면에 반영", "학생이 신청하면 상담사 접수함에 뜸"이 DB 없이 성립. 상세 흐름은 `Counsel_README.md` §7.

---

## Project

국립창원대학교 역량개발관리시스템 "드림캐치(DREAMCATCH)" 학생 포털 UI 프로토타입.
React 19 + TypeScript 5.9 + Vite 8 기반 SPA. 프론트엔드 전용, 백엔드 없음, 모든 데이터는 **JSON 동적 mock**(하드코딩 금지 — 위 "데이터 원칙" 참조).
데스크톱 전용 (min-width 1280px).

## 🧪 진단검사 명칭·학년 매핑 (확정)

학생 진단센터·AI라운지의 진단검사는 **4종**이다. 옛 명칭(유형분류·자기이해·CARES·KVCT·SPRINT·NEO 등)은 **전부 폐기**하고 아래 C-체계로 통일한다. **C-1은 존재하지 않는다(번호는 C-2부터).**

| 명칭 | 진단 영역 | 상태 |
|---|---|---|
| **C-2 진로설정 진단검사** | 진로 목표·설계 수준 | 검사시작 |
| **C-3 역량수준 진단검사** | 핵심역량 보유 수준 | 검사시작 |
| **C-4 구직역량 진단검사** | 취업 준비·구직 전략 | 검사시작 |
| **C-CORE 핵심진단검사** | 6유형 분류(핵심·공통) | 결과보기(완료) |

**학년별 응시 — 선택(1개 필수) + 공통(1개 필수):**

| 학년 | 선택 | 공통 |
|---|---|---|
| 1 | C-2 | C-CORE |
| 2 | C-2 · C-3 | C-CORE |
| 3 | C-2 · C-3 | C-CORE |
| 4 | C-3 · C-4 | C-CORE |

- 상태 규칙: **C-CORE만 결과보기(done)**, 나머지는 검사시작(available).
- 단일소스: `src_v2/data/careerProcess.ts`(`DIAGNOSIS_MODULES`). 라운지 결과요약은 `AiLounge.tsx`(`TEST_SUMMARIES`), 상세 이름맵은 `DiagnosisResultDetail.tsx`(`TEST_NAMES`).
- 학년별 선택/공통은 **정책(문서)** 이며 현재 진단센터 UI는 4종을 모두 노출한다(학년 필터링 미구현).

### 개발 준수사항
# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. 재생성 금지
기존 코드를 재사용 할 수 있으면 재사용해라 똑같은 기능을 굳이 재생성 하지말라

### Routing
React Router 미사용. `App.tsx`에서 `useState<PageId>` + `switch` 문으로 라우팅.
`useRef<PageId[]>` 기반 히스토리 스택으로 뒤로가기 지원 (불필요한 리렌더 방지).

### Page Hierarchy
- TopHeader: 아이콘 네비게이션 바 (카테고리 → 드롭다운 메뉴)
- 1-depth 메뉴 → 2-depth 페이지 구조 (예: 진로심리검사 → 9CORE검사, 인적성검사)

### Components
- `Modal` (sm/md/lg) — 모든 상세보기에 사용. Drawer 사용하지 않음.
- `FormField` — 라벨+인풋 래퍼
- `ConfirmDialog` — 확인/취소 다이얼로그
- `EmptyState` — 데이터 없음 상태
- `TopHeader` — 상단 로고바 + 아이콘 네비게이션
- `CRAReport` — CRA 진로준비도 진단검사 결과표 (HTML)

### Patterns
- 모든 페이지는 `onNavigate`, `onToast` props를 받음
- Chart.js + react-chartjs-2 (Radar: NineCore, Bar: Aptitude)
- Font Awesome 6 아이콘, Noto Sans KR 폰트
- 스타일: `src/index.css` (단일 CSS 파일, CSS 변수 기반)


## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- UI/UX 디자인 해줘, 디자인 개선해줘, 예쁘게 만들어줘, UI 만들어줘 → invoke ui-ux-pro-max
- 사진/이미지를 코드로 변환해줘, 이 디자인 그대로 구현해줘 → invoke image-to-ui
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## 하네스: 드림캐치 화면 제작 팀

**목표:** 상담사·관리자·교수·학생 화면을 **Claude Code(기획·검수) × Codex(구현)** 협업으로 실서비스 투입 수준(JSON 동적)으로 제작·유지한다.

**트리거:** 드림캐치 UI 화면 제작·수정 요청("화면 만들어줘/추가/수정/재실행/개선", "이 이미지대로 만들어줘", "상담사·관리자·교수·학생 화면 작업") 시 `dreamcatch-orchestrator` 스킬로 팀장(`team-lead`)이 주도한다. 단순 질문·조회는 직접 응답 가능.

**핵심 원칙:** Claude와 Codex는 메모리를 공유하지 않으며 **파일(`.ai/handoff/`)로만 소통**한다(규약 `.ai/interop.md`). 5단계 흐름: ①팀장(Fable)이 메모리 읽고 이미지를 프로젝트에 맞게 교정·기획 → ②③Codex가 이미지 분석·컴포넌트 분리·구현 → ④⑤리뷰어(Opus)가 디자인토큰/유지보수·내용 정합성 검수. 로그인 역할(학생/상담사/교수/관리자)은 에이전트가 아니라 컨텍스트로 주입하고 **읽기 범위를 역할별로 격리**한다. 신규 화면은 하드코딩 금지·JSON 동적(skill `json-dynamic-screen`). 디자인은 `DESIGN.md`(base)+역할 레이어 토큰만, `frontend-design`은 craft만(새 팔레트·폰트 금지).

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-10 | 초기 구성 | 전체 | 팀장+기획/디자인/개발/QA 팀 + dreamcatch-orchestrator·json-dynamic-screen 스킬 신규 구축 |
| 2026-07-10 | 디자인 리뷰 단계 추가 + 디자인 스킬 라우팅 | designer.md, orchestrator, CLAUDE.md | 실제 렌더 시각 리뷰 도입, MengTo/Skills 참조 배선 |
| 2026-07-10 | 상담사 포털 /admin 전체 사이트맵 구현 | src_admin/ 전체 | 상담관리·학생관리·로드맵편집기·채용공고·비교과·설정 (JSON 동적) |
| 2026-07-10 | 전용 design-reviewer 에이전트 추가 | .claude/agents/design-reviewer.md, orchestrator | Phase 3.5 렌더 검수를 designer에서 gstack 기반 전용 에이전트로 분리 |
| 2026-07-10 | 유지보수 감사·리팩터 설계 에이전트 추가 | .claude/agents/{maintainability-reviewer,architecture-planner}.md | 스택(React/TS/Vite) 맞춤 부채 감사(sonnet)→ADR 설계(opus) 미니 파이프라인. 리포트 JSON 핸드오프(.claude/analysis/) |
| 2026-07-10 | 유지보수 감사 단계를 파이프라인에 편입 | orchestrator, AGENTS.md | Phase 3.7(QA 직전): maintainability-reviewer→architecture-planner 드리프트 감사·설계 |
| 2026-07-14 | **Codex 협업 하네스로 재구성** | agents 전체·orchestrator·AGENTS.md·`.ai/` | Claude Code(기획·검수) × Codex(구현) 5단계 파일 핸드오프. 기존 8에이전트 삭제 → `team-lead`(fable)·`codex-implementer`·`design-reviewer`·`content-reviewer`(opus). 소통 버스 `.ai/interop.md`+`.ai/handoff/_schema.md` 신설. frontend-design=craft만·토큰 잠금, 역할별 읽기 범위 격리 |
| 2026-07-14 | **모드 B(데이터 파이프라인) 추가** | agents(+developer·architecture-planner 복원)·orchestrator·AGENTS.md | 디자인/Codex 없이 실제 JSON 데이터 흐름(학생↔상담사 연계·하드코딩 제거)용. team-lead가 모드 A(Codex-UI)/B(데이터) 판별 라우팅. architecture-planner 입력을 maintainability-report→team-lead 데이터-흐름 스펙으로 적응. Codex 하네스는 보존(코이그지스트) |

### 디자인 스킬 라우팅 (가드레일)

**디자인은 `DESIGN.md`에 잠겨 있다. 어떤 디자인 스킬도 새 팔레트·스타일을 생성하지 않는다 — 적용/리뷰만.**
- 렌더 후 시각 리뷰·drift 감사 → gstack `/design-review` + `/browse`
- 구현 기법·캡처·레퍼런스→스펙 참조 → MengTo/Skills(설치 아님, 참조): `C:\Users\njob\.claude\refs\MengTo-Skills\agent-skills\` 에서 해당 SKILL.md만 Read
- ui-ux-pro-max·MengTo의 landing/style 생성류는 **직접 디자인 생성에 쓰지 않음**(아이디어만, DESIGN.md 토큰으로 환원)
