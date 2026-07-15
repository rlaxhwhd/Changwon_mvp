# AGENTS.md — 하네스 엔지니어링 진입점

> 국립창원대 **드림캐치(DREAMCATCH)** 프로젝트에서 일하는 모든 에이전트의 진입점.
> 작업 착수 전 이 문서로 "어느 역할·어느 문서를 먼저 읽어야 하는지" 를 라우팅한다.
> Claude Code는 `CLAUDE.md`가 이 문서를 가리키고, **Codex는 이 `AGENTS.md`를 자동 로드**한다.

## 0. Codex라면 여기부터 (구현 담당)

너가 **Codex**라면 이 하네스의 2·3단계(이미지 분석·컴포넌트 분리 → 구현) 담당이다.
1. 네 역할 계약: **[.claude/agents/codex-implementer.md](.claude/agents/codex-implementer.md)** 를 읽어라.
2. 협업 규약·읽기 범위: **[.ai/interop.md](.ai/interop.md)**.
3. 작업 입력: `.ai/handoff/000X-{role}-{screen}/`(`ui-spec.md`+`component-map.md`+`image.png`). 계약: [.ai/handoff/_schema.md](.ai/handoff/_schema.md).
4. **핵심:** 이미지 그대로 재현 금지 — 팀장이 교정한 `ui-spec.md`가 진실. 데이터는 JSON 동적(하드코딩 금지). 디자인 토큰 잠금(새 팔레트·폰트 금지).

---

## 1. 이 프로젝트

국립창원대학교 역량개발관리시스템 "드림캐치" — React 19 + TypeScript + Vite 프론트엔드 프로토타입.
백엔드 없음 · 데이터는 **JSON 동적 mock** · 데스크톱 전용(min-width 1280px) · 한국어 UI.

- **학생 포털** `/v2` — `src_v2/` (실서비스 버전. v1·src는 폐기 예정)
- **상담사 포털** `/admin` — `src_admin/` (별도 SPA. 상담사 2종: 진로취업 · 심리)
- 교수 포털 — 추후 별도

## 2. 하네스 (Claude Code × Codex 협업)

화면 제작·수정은 **`dreamcatch-orchestrator`** 스킬로 팀장(`team-lead`)이 주도한다. Claude Code(기획·검수)와 Codex(구현)가 **파일(`.ai/handoff/`)로만 소통**하며 5단계로 협업한다:

| 단계 | 담당 | 도구 | 일 |
|---|---|---|---|
| 0 | (사용자) | — | UI 이미지 업로드 |
| 1 | `team-lead` | Claude·Fable | 메모리 읽고 이미지를 프로젝트에 맞게 교정·기획 → `ui-spec.md` |
| 2·3 | `codex-implementer` | **Codex** | 이미지 분석·컴포넌트 분리(MengTo image-to-code) → 구현(frontend-design, JSON 동적) |
| 4 | `design-reviewer` | Claude·Opus | 코드+디자인토큰/유지보수 감사(drift·하드코딩) |
| 5 | `content-reviewer` | Claude·Opus | 기획 대비 내용 정합성(용어 교정 반영) |

**모드 B — 데이터 파이프라인** (실데이터·연동·하드코딩 제거, 디자인/Codex 미개입):

| 단계 | 담당 | 도구 | 일 |
|---|---|---|---|
| B1 | `team-lead` | Claude·Fable | 현행 mock/하드코딩 조사 → 데이터-흐름 스펙 확정 |
| B2 | `architecture-planner` | Claude·Opus | 단일소스 데이터 아키텍처 설계(스키마·스토어·override·마이그레이션) — 설계만 |
| B3 | `developer` | Claude·Opus | 스키마→JSON→로더→구독 구현, `dc_*` override, 하드코딩 0 |

- 로그인 역할(학생/상담사/교수/관리자)은 에이전트가 아니라 **컨텍스트**다 → §3.
- 정의: `.claude/agents/` · 워크플로우: `.claude/skills/dreamcatch-orchestrator/` · 협업 규약: [.ai/interop.md](.ai/interop.md).
- 팀장은 착수 시 **agentmemory → 파일 메모리 → 해당 역할 문서**를 먼저 읽고 **모드(A/B)를 판별**해 계획을 제안한다.

## 3. 역할별 지시 (작업 착수 전 필수)

작업 대상 역할의 문서를 **먼저 읽고** 그 스펙대로 지시·구현한다.

| 작업 대상 | 먼저 읽을 문서 | 소스 |
|---|---|---|
| **학생** 화면 | **`STU_README.md`** 읽고 지시 | `src_v2/` |
| **상담사** 포털 | **`Counsel_README.md`** 읽고 지시 | `src_admin/` |
| 교수 포털 | (추후) | — |

- 디자인은 역할 불문 **`DESIGN.md` 단일 소스** — 새 팔레트·스타일 **생성 금지**, 적용·리뷰만. 상담사 전용 색 토큰은 `src_admin/index.css`.
- 신규 역할 화면 데이터는 **`json-dynamic-screen`** 규칙 — 하드코딩 리터럴 금지, `students.ts` 패턴(스키마→JSON→로더→구독) 미러.

## 4. 빠른 참조

| 구분 | 문서 / 위치 |
|---|---|
| 학생 화면 스펙 | [STU_README.md](STU_README.md) |
| 상담사 포털 스펙 | [Counsel_README.md](Counsel_README.md) |
| 디자인 시스템 (단일 소스) | [DESIGN.md](DESIGN.md) · [src_v2/DESIGN.md](src_v2/DESIGN.md) |
| 하네스 / 팀 오케스트레이션 | [CLAUDE.md](CLAUDE.md) "하네스" 섹션 · `.claude/agents/` · `.claude/skills/dreamcatch-orchestrator/` |
| 실서비스 JSON 동적 규칙 | `.claude/skills/json-dynamic-screen/` |
| 디자인 스킬 라우팅 (참조) | `~/.claude/refs/MengTo-Skills/` · gstack `/design-review` (생성 금지, 적용·리뷰만) |
| 진단·로드맵 프로세스 (기획 원문) | [src_v2/CLAUDE.md](src_v2/CLAUDE.md) · `src_v2/data/careerProcess.ts` |
| 프로젝트 메모리 | agentmemory (1순위) · `~/.claude/projects/.../memory/MEMORY.md` |

## 5. 불변 규칙 (하드룰)

- **단일 소스:** 네비 `navConfig.ts` · 진단 `careerProcess.ts` · 학생 데이터 `students.ts` · 디자인 `DESIGN.md`.
- **JSON 동적 · 하드코딩 금지** (실서비스 투입 기준). 학생↔상담사 연계는 원본 JSON 불변 + **override 레이어**(localStorage) 패턴.
- **디자인 생성 금지** — DESIGN.md 토큰만 적용. drift = 결함.
- 빌드 검증: `npx tsc --noEmit` 통과. 시각 검증: gstack `/browse` (이 프로젝트는 테스트 러너 없음).
- `/v2`(학생)와 `/admin`(상담사)는 **분리된 SPA**. 공유는 데이터 계층(localStorage)·디자인 토큰뿐.
