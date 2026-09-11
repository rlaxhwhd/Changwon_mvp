---
name: dreamcatch-orchestrator
description: 드림캐치 화면·기능·DB 전환 작업을 3역할(Claude Opus 팀장, Codex Astra 설계 리뷰, Codex Sol 구현)로 실행한다.
---

# 드림캐치 단순 엔지니어링 하네스

## 역할

1. **팀장 — Claude Code Opus:** 요구·프로세스·JSON 분석, 작업지시, 승인, 최종 검증
2. **DB 설계 리뷰 — Codex gpt-6-astra:** table/API 재사용과 DB 아키텍처 교정
3. **실제 작업 — Codex gpt-5.6-sol:** 골든 패스 복제 구현

별도 기획·데이터 감사·프로세스 리뷰·구현 리뷰 에이전트를 추가하지 않는다. 팀장이 그 책임을 가진다.

## 실행

### 1. 팀장 설계

- `AGENTS.md`와 `.claude/agents/team-lead.md`를 따른다.
- `DB_SCHEMA.md`, `DB.md` §8-3, `spec_v1.md` 전체, 관련 `SPEC.md`/`PROCESS.md`, 실제 JSON·migration·API·frontend를 읽는다.
- 기존 table/API 재사용 가능성을 먼저 판정한다.
- `.ai/db/ENTITY_WORK_ORDER_TEMPLATE.md`로 `work-order.md`를 작성한다.

### 2. Astra 교정

- `.claude/agents/codex-astra-db-reviewer.md`를 따른다.
- 트래픽, query, index, constraint, transaction, 권한, migration, JSON 응답 호환성을 검토한다.
- 기술 오류는 작업지시서와 `DB_SCHEMA.md`에서 직접 고친다.
- 첫 엔티티는 Astra 승인 뒤 팀장이 `READY_FOR_ASTRA_BOOTSTRAP`으로 바꾼 경우에만 Astra가 직접 구현할 수 있다.

### 3. 팀장 승인

- 업무 의미가 불명확한 것만 사용자에게 묻는다.
- Astra 교정을 검토하고 `work-order.md`를 `READY_FOR_SOL`로 바꾼다.
- 골든 패스가 없으면 일반 Sol 작업보다 골든 패스 완성을 먼저 한다.

### 4. Sol 구현

- `.claude/agents/codex-sol-implementer.md`를 따른다.
- SQL → FastAPI → mock/API 계약 테스트 통과 → frontend loader/selector → 기존 mock 정본 제거 순서로 구현한다.
- 골든 패스의 디렉터리와 패턴을 복제한다.

### 5. 팀장 검증

- API 응답과 mock의 key·중첩·type 계약 테스트를 최우선으로 실행한다.
- 대상 backend pytest, 빈 DB migration, `npm run build`, 실제 쓰기→읽기 왕복을 확인한다.
- `DB_SCHEMA.md`와 `DB.md` §8-3을 동기화한 뒤 `PASS`를 기록한다.

## 새 화면·기능

팀장이 필요한 데이터를 먼저 분류한다.

- 기존 table/API 의미와 권한이 맞음: 재사용
- 기존 원본으로 계산 가능: query/endpoint/DTO 확장
- 같은 엔티티의 단일 속성: 기존 table column 확장 검토
- 독립 생명주기·복수행·M:N·append-only 이력·별도 권한: 새 table/API

DB/API가 필요하면 그 작업과 계약 테스트를 UI보다 먼저 끝낸다. 임시 JSON/localStorage는 만들지 않는다. 데이터 변화가 없는 화면 작업도 팀장이 기존 loader/selector를 작업지시서에 지정한 뒤 Sol이 구현하고 팀장이 디자인·내용까지 검수한다.

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-09-09 | 다단계 DB 하네스를 Opus 팀장 → Astra 리뷰 → Sol 구현의 3역할로 축소 |
