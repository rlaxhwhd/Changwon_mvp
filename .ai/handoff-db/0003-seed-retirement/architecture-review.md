# Astra 재개 리뷰

- 판정: `ASTRA_APPROVED`
- 승인 work-order revision: `4` (E0~E5)
- E4: `ASTRA_APPROVED`; 기술 계약은 [e4-review.md](e4-review.md) 전문을 작업지시서에 편입한다. 기존 (b) 결정을 유지하고 누락된 원자성·FK·DTO·권한을 보완했다.
- 근거: work-order.md의 「Astra 리뷰 (revision 1)」 13건 및 「팀장 승인 (revision 2)」. revision 2는 E0·E1·E2·E3·E5 계약을 바꾸지 않았으므로 해당 승인을 revision 2에 명시적으로 연결한다.
- 실제 migration 최종 번호 041 확인. 새 migration 042~048 예약을 유지한다.
- 골든 패스 `READY` 확인. E0+E2 → E1+E3 → E5 → E4 순으로 구현한다.
- 기존 변경사항은 보존한다. 프론트 JSON은 승인대로 backend/seeds로 이동하며 seed_source의 기존 보관 키는 변경하지 않는다.
- 검증 기준과 query/index, rollback 검토는 work-order 각 절 및 기존 13건 리뷰를 따른다. 실제 실행 결과는 별도로 기록한다.

- revision 4: E0~E3·E4 승인 유지. [e5-addendum.md](e5-addendum.md)의 기간·집계·소비처 보완 검토 후 ASTRA_APPROVED.
