# DB 엔티티 핸드오프 계약

```text
.ai/handoff-db/000X-{entity}/
├── work-order.md             # 팀장 작성, Astra 교정, 팀장 승인
├── architecture-review.md    # Astra 판정
├── implementation.md         # Astra 골든 패스 또는 Sol 구현 기록
└── verification.md           # 팀장 최종 게이트
```

`work-order.md`는 `.ai/db/ENTITY_WORK_ORDER_TEMPLATE.md`를 복사해 만든다. 기존 6단계 형식 폴더는 감사 이력이며 이름을 바꾸지 않는다.

## 판정 규칙

- Astra가 설계를 교정한 뒤 `architecture-review.md`에 `ASTRA_APPROVED`와 승인 revision을 써야 한다.
- 팀장이 프로젝트 프로세스와 사용자 결정을 확인한 뒤 `work-order.md`를 `READY_FOR_SOL`로 바꾼다.
- Sol은 `READY_FOR_SOL`, 현재 revision의 `ASTRA_APPROVED`, READY 골든 패스가 모두 있을 때만 구현한다.
- 팀장은 계약 테스트·pytest·migration·build·왕복 QA를 직접 확인한 뒤에만 `PASS`를 쓴다.

골든 패스 첫 엔티티는 팀장이 `READY_FOR_ASTRA_BOOTSTRAP`을 기록한 뒤 Astra가 구현한다. schema/API/권한/JSON 계약 변경은 revision 증가와 Astra 재승인이 필요하다. 데이터 변화가 없는 UI의 `NO_DB_CHANGE + READY_FOR_SOL`은 DB 골든 패스와 Astra 승인 대상이 아니다.
