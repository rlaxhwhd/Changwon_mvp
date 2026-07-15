# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **진입점: [AGENTS.md](AGENTS.md)** — 역할별 라우팅(학생 작업 → `STU_README.md` / 상담사 작업 → `Counsel_README.md`), 하네스, 빠른 참조. 작업 착수 전 참고.

**DB가 없이 진행중이므로 필요한 데이터는 학생json에 추가하여 작업한다.**
## Project

국립창원대학교 역량개발관리시스템 "드림캐치(DREAMCATCH)" 학생 포털 UI 프로토타입.
React 19 + TypeScript 5.9 + Vite 8 기반 SPA. 프론트엔드 전용, 백엔드 없음, 모든 데이터는 하드코딩 mock.
데스크톱 전용 (min-width 1280px).

## Commands

- `npm run dev` — 개발 서버 (Vite, 0.0.0.0)
- `npm run build` — TypeScript 체크 + Vite 프로덕션 빌드
- `npx tsc --noEmit` — 타입 체크만 (빌드 없이)
- `npm run lint` — ESLint

## Architecture

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

## gstack

For all web browsing tasks, use gstack's `/browse` skill.
NEVER use `mcp__claude-in-chrome__*` tools.

### Available gstack skills

- `/office-hours` - Office hours
- `/plan-ceo-review` - Plan CEO review
- `/plan-eng-review` - Plan engineering review
- `/plan-design-review` - Plan design review
- `/design-consultation` - Design consultation
- `/design-shotgun` - Design shotgun
- `/design-html` - Design HTML
- `/review` - Code review
- `/ship` - Ship
- `/land-and-deploy` - Land and deploy
- `/canary` - Canary monitoring
- `/benchmark` - Benchmark
- `/browse` - Browse the web (use this for all web browsing)
- `/connect-chrome` - Connect Chrome
- `/qa` - QA testing
- `/qa-only` - QA only
- `/design-review` - Design review
- `/setup-browser-cookies` - Setup browser cookies
- `/setup-deploy` - Setup deploy
- `/retro` - Retrospective
- `/investigate` - Investigate
- `/document-release` - Document release
- `/codex` - Codex
- `/cso` - CSO mode
- `/autoplan` - Auto-plan
- `/plan-devex-review` - Plan DevEx review
- `/devex-review` - DevEx review
- `/careful` - Careful mode
- `/freeze` - Freeze
- `/guard` - Guard
- `/unfreeze` - Unfreeze

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
