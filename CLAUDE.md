# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
