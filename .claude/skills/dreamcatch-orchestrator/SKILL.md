---
name: dreamcatch-orchestrator
description: 국립창원대 드림캐치(DREAMCATCH) 화면·데이터를 팀으로 만들거나 수정할 때 반드시 사용. 두 모드 — (A) Codex-UI: UI 이미지로 화면 제작·시각 디자인, "화면 만들어줘/추가/붙여줘", "이 이미지대로", "다시 실행/재실행/업데이트/개선/보완". (B) 데이터 파이프라인: "실제 데이터로", "하드코딩 말고 JSON 동적", 학생↔상담사 연계, 현황·집계 실데이터화 등. 팀장(team-lead)이 이 오케스트레이터로 모드를 판별해 팀을 주도한다. 단순 질문·조회는 직접 응답 가능.
---

# 드림캐치 오케스트레이터 — Claude Code × Codex 협업

Claude Code와 Codex는 **메모리·런타임을 공유하지 않는다. 소통 통로는 디스크의 파일뿐이다.** 이 오케스트레이터는 그 파일 계약(`.ai/handoff/`)을 통해 두 도구의 역할을 엮는다. 규약 전문은 `.ai/interop.md`, 폴더 스키마는 `.ai/handoff/_schema.md`.

**실행 모드:** 하이브리드 — Claude 측(1·4·5단계)은 에이전트, Codex 측(2·3단계)은 외부 도구 + 파일 핸드오프.
**데이터 전달:** 파일 기반(`.ai/handoff/000X-{role}-{screen}/`) + 중간 산출물 `_workspace/`.

## 역할 = 컨텍스트 (에이전트 아님)

로그인 역할(학생/상담사/교수/관리자)은 에이전트로 나누지 않는다. 작업 역할 문서(`STU_README.md` / `Counsel_README.md`)와 역할 디자인 레이어를 해당 담당에게 **읽기 범위**로 격리 주입한다(§ 각 에이전트 정의).

## Phase 0: 컨텍스트 확인 (실행 전 필수)

1. 팀장 착수 루틴 — agentmemory `memory_recall` → 파일 메모리(`MEMORY.md`) → 프로젝트 문서. (`.claude/agents/team-lead.md`)
2. 대상 handoff 폴더(`.ai/handoff/000X-{role}-{screen}/`) 존재로 실행 모드 판별:
   - 없음 → **초기 실행**
   - 있음 + 부분 수정 요청 → **부분 재실행**(해당 단계만 재호출)
   - 있음 + 새 이미지·요구 → 다음 번호로 새 폴더 생성 → **새 실행**
3. 사용자 의도 요약 + 실행 계획 제안 → **확인받고 진행.** (구현 먼저 시작 금지)

## Phase 1 — 기획 (team-lead · OPUS)

UI 이미지를 받아 **프로젝트 맞춤으로 교정·확정**한다. 이미지의 부적합 내용(예: "회원"→학생, "admin user"→상담사/교수)을 바로잡고, 네비게이션(navConfig 기준)·버튼·페이지 내용·데이터 스키마(students.ts 패턴)를 정한다.
→ 산출: `.ai/handoff/000X-{role}-{screen}/ui-spec.md` + `component-map.md`(재사용 매핑) + `image.png` 배치.

## Phase 2 — 이미지 분석 + 컴포넌트 분리 (Codex)

Codex가 handoff 폴더를 읽고 MengTo `image-to-code` 방법론으로 이미지를 분석, 재사용 컴포넌트로 분리한다. 코드 가능한 건 전부 코드로, 코드 불가 요소(홀로그램·3D)만 에셋으로 분리해 팀장에 요청.
→ 산출: `component-map.md`에 신규 컴포넌트 목록 추가.

## Phase 3 — 구현 (Codex)

Codex가 `frontend-design`(토큰 내 craft만)로 구현한다. **팔레트·폰트·토큰은 DESIGN.md+역할 레이어에서만, 새 디자인 생성 금지.** 모든 데이터는 JSON 동적(스키마→JSON→로더→구독, students.ts 미러). 출력: 학생=`src_v2/`, 상담사=`src_admin/`. `npx tsc --noEmit` 통과.

> **Codex 바톤(현재):** Codex 확장/CLI 미설치 상태에선 팀장이 handoff 스펙까지 확정 → 사용자가 Codex로 2·3단계 실행. 설치 후엔 gstack `/codex`로 Claude가 직접 호출 가능(자세히는 `.ai/interop.md`). 어느 경우든 **계약은 파일**이라 동일하게 동작한다.

## Phase 4 — 디자인·유지보수 리뷰 (design-reviewer · Opus)

Codex 산출 코드를 감사: **디자인 토큰 drift · 하드코딩 리터럴 · JSON 동적 위반 · 컴포넌트 중복 · 코드 품질 · impeccable 안티패턴(audit/critique).** (impeccable은 vendored 스킬 `.claude/skills/impeccable/`, 리뷰 렌즈로만 — 생성 커맨드 금지, 디자인 락 유지.)
→ 산출: `review.md`의 `## 4단계` 섹션에 PASS/REJECT + 근거(파일:라인) + 수정 지시.

## Phase 5 — 내용 정합성 리뷰 (content-reviewer · Opus)

팀장 `ui-spec.md` 대비 구현 내용 대조: **네비 항목 · 버튼/텍스트 · 용어 교정 반영 · JSON 값 매핑.** 특히 이미지의 부적합 내용이 새어들지 않았는지.
→ 산출: `review.md`의 `## 5단계` 섹션에 PASS/REJECT + 근거.

> Phase 4·5는 병렬(독립 관점). 둘 중 하나라도 REJECT면 팀장이 Codex에 **1회 재작업** 요청 → 재검증. 2회째도 실패면 사용자에게 에스컬레이션.

## Phase 6 — 통합 & 기록 (team-lead)

팀장이 결과 종합 보고(된 것 / 검증된 것 / 남은 것). 중요한 결정·패턴은 `memory_save`로 저장.

---

## 모드 B: 데이터 파이프라인 (디자인·Codex 제외)

실데이터·연동·하드코딩 제거 요청(위 Phase 1~6의 UI 흐름 대신). 디자인/이미지 없이 **실제 JSON 흐름**을 만든다.

- **B0. 컨텍스트 확인** — team-lead 착수 루틴(메모리→문서). `_workspace/` 존재로 초기/재실행 판별.
- **B1. 기획 (team-lead · Fable)** — 현행 mock/하드코딩 지점 조사 → 데이터-흐름 요구 스펙을 `_workspace/01_lead_{topic}.md`로 확정(쓰는 쪽·읽는 쪽·공유 키·파생값·override 패턴).
- **B2. 데이터 아키텍처 설계 (`architecture-planner` · Opus)** — 스펙을 입력으로 단일소스 설계(스키마·스토어·override 레이어·마이그레이션·롤백). **설계만, 코드 없음.** 산출 `_workspace/02_architect_{topic}.md`.
- **B3. 구현 (`developer` · Opus)** — 설계대로 스키마→JSON→로더/스토어→화면 구독 배선. 원본 seed 불변 + `dc_*` override. 하드코딩 리터럴 0. `npx tsc --noEmit` 통과. 산출 코드 + `_workspace/03_developer_{topic}.md`.
- **B4. 통합·검증 (team-lead)** — 하드코딩 grep 0 확인, 실제 흐름(쓰는 쪽→읽는 쪽 반영) 점검, 보고. `memory_save`.

> 모드 B는 `design-reviewer`·`content-reviewer`·Codex를 쓰지 않는다(디자인 미개입). 시각 확인이 필요하면 사후 모드 A 또는 gstack `/browse`.

## 하드룰 (모든 단계에 전달)

1. **JSON 동적 · 하드코딩 리터럴 금지.** students.ts 패턴 미러. (skill `json-dynamic-screen`)
2. **디자인 토큰 잠금.** DESIGN.md(base)+역할 레이어만. frontend-design은 craft만, 새 팔레트·폰트 금지. drift=결함.
3. **읽기 범위 격리.** 학생=DESIGN.md+src_v2/DESIGN.md+STU_README, 상담사=DESIGN.md+src_admin/index.css+Counsel_README. 다른 역할 문서 안 건드림.
4. **단일 소스:** navConfig.ts / careerProcess.ts / students.ts·counsel.
5. **_workspace 함정:** browse/스크린샷 도구의 크롬 프로필 덤프가 vite dev를 hang시킨다. .gitignore·vite watch.ignored mitigation 유지.

## 테스트 시나리오

- **정상:** "이 이미지로 상담사 대시보드 만들어줘"(+이미지) → recall → 팀장이 회원→학생 교정·스키마 확정→ui-spec 작성 → Codex 분리·구현 → design-reviewer+content-reviewer PASS → 보고.
- **에러(내용 누수):** 이미지에 "회원가입" 버튼 → Codex가 그대로 구현 → content-reviewer가 "학생 도메인 위반" REJECT → Codex 재작업(학생 용어) → 재검증 PASS.
- **에러(하드코딩):** Codex가 데이터를 컴포넌트에 하드코딩 → design-reviewer REJECT → 로더+JSON 분리 재작업 → 재검증 PASS.

## 변경 이력

| 날짜 | 변경 | 대상 | 사유 |
|---|---|---|---|
| 2026-07-10 | 초기 구성 | 전체 | 드림캐치 팀 하네스(팀장+기획/디자인/개발/QA) |
| 2026-07-14 | Codex 협업 하네스로 재구성 | agents 전체·orchestrator·.ai/ | Claude Code(기획·검수) × Codex(구현) 5단계 파일 핸드오프. 기존 8에이전트 → team-lead(fable)·codex-implementer·design-reviewer·content-reviewer(opus)로 교체 |
| 2026-07-20 | impeccable 스킬을 design-reviewer Phase 4에 연동 | `.claude/skills/impeccable/`(vendored), design-reviewer.md | Paul Bakaus impeccable(안티패턴 감지·비평) vendor 설치, design-reviewer가 `/impeccable audit`·`critique`로 대비·타이포·간격·AI슬롭 감사. audit/critique만(생성 커맨드 금지) — 디자인 락 유지. 감지기는 Node 빌트인만, 헤드리스 |
