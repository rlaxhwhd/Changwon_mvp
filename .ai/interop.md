# Claude Code × Codex 전달 규약

역할은 세 개뿐이다.

| 순서 | 담당 | 산출물 |
|---|---|---|
| 1 | 팀장 / Claude Code Opus | `work-order.md` |
| 2 | DB 설계 리뷰어 / Codex gpt-6-astra | 교정된 `work-order.md` + `architecture-review.md` |
| 3 | 실제 작업 / Codex gpt-5.6-sol | 코드 + `implementation.md` |
| 4 | 팀장 / Claude Code Opus | `verification.md` |

모든 전달은 `.ai/handoff-db/000X-{entity}/`의 파일로 한다. 채팅의 구두 지시는 정본이 아니다.

## 상태 전이

```text
DRAFT
  -> ASTRA_APPROVED
  -> READY_FOR_SOL                    # 일반 엔티티
  -> IMPLEMENTED_FOR_LEAD_REVIEW
  -> PASS

첫 골든 패스는 `ASTRA_APPROVED -> READY_FOR_ASTRA_BOOTSTRAP -> IMPLEMENTED_FOR_LEAD_REVIEW -> READY` 분기를 쓴다.
```

업무 결정이 필요하면 어느 단계에서든 `USER_DECISION_REQUIRED`, 작업지시서 밖 변경이 필요하면 `BLOCKED_BY_WORK_ORDER`를 기록한다.

## 실행 예시

Astra 리뷰:

```powershell
codex exec -m gpt-6-astra `
  "AGENTS.md와 .claude/agents/codex-astra-db-reviewer.md를 읽고 .ai/handoff-db/000X-entity/work-order.md를 검토·교정하라."
```

Sol 구현:

```powershell
codex exec -m gpt-5.6-sol `
  "AGENTS.md와 .claude/agents/codex-sol-implementer.md를 읽고 .ai/handoff-db/000X-entity의 READY_FOR_SOL 작업지시서를 구현하라."
```

## 변경 권한

- 팀장: 작업 범위·상태·최종 판정, `DB_SCHEMA.md`, `DB.md`
- Astra: 설계 기술 교정, 작업지시서와 `DB_SCHEMA.md` 수정. `GOLDEN_PATH_BOOTSTRAP`일 때만 구현
- Sol: 승인된 범위의 migration·backend·frontend·test와 구현 기록

기존 `.ai/handoff-db/` 폴더의 `01-*`~`06-*` 파일은 과거 이력으로 보존한다. 새 작업부터 네 파일 계약을 사용한다.

`architecture-review.md`에는 승인한 work-order revision을 반드시 적는다. 팀장이 schema/API/권한/JSON 계약을 바꾸면 revision을 증가시키고 Astra 승인을 다시 받아야 한다.
