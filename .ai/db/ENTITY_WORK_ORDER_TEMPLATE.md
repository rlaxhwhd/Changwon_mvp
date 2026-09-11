# {entity} DB 전환 작업지시서

- 상태: `DRAFT`
- revision: `1` — schema/API/권한/JSON 계약 변경 시 증가시키고 Astra 재리뷰
- 담당 구현: `GOLDEN_PATH_BOOTSTRAP` 또는 `SOL`
- 대상 handoff: `.ai/handoff-db/000X-{entity}/`
- 관련 화면/기능:

## 1. 기존 계약

| 항목 | 경로/값 |
|---|---|
| 원본 mock JSON | 정확한 파일 경로. 신규 기능이면 `없음 — 신규 계약` |
| 계약 fixture | 기존 mock의 경로+JSON pointer 또는 팀장이 선승인한 `backend/tests/contracts/fixtures/{entity}.json` |
| 현재 loader/selector | 파일과 함수 |
| 현재 localStorage key | 없으면 `없음` |
| 쓰는 화면 | 파일·동작 |
| 읽는 화면 | 파일·표시 |
| 기존 API | method + path 또는 `없음` |
| 기존 table | `schema.table` 또는 `없음` |

## 2. 데이터 요구

| 동작 | 읽기/쓰기 | 필드·타입·nullable | 소유자 | 권한 | 생명주기/이력 |
|---|---|---|---|---|---|

## 3. 재사용 판정

- 판정: `REUSE_TABLE_AND_API` / `EXTEND_QUERY_OR_API` / `ALTER_EXISTING_TABLE` / `CREATE_TABLE_AND_API` / `NO_DB_CHANGE`
- 근거: 의미, 소유권, cardinality, 생명주기, 권한을 각각 설명
- 재사용할 table/column/API:
- 만들거나 바꿀 것:
- 새 테이블을 만들지 않는 경우 그 이유:

## 4. DDL

- migration 후보 번호·파일:
- table/column/type/default/nullability:
- PK/FK/unique/check:
- timestamp/version/idempotency:
- seed/backfill 순서:
- rollback 또는 roll-forward 복구:

## 5. Query와 인덱스

| API/동작 | 예상 규모·호출 빈도 | filter/join/order/page | 인덱스 | EXPLAIN 확인 조건 |
|---|---|---|---|---|

## 6. API 계약

| method/path | request | response | 권한 | 오류·동시성 |
|---|---|---|---|---|

## 7. mock → API 매핑

| mock JSON path | API JSON path | DB source | 변환/nullable 규칙 |
|---|---|---|---|

API의 공개 key는 기존 mock 계약을 유지한다. 바꿔야 하면 모든 소비처와 migration 전략을 명시하고 팀장 승인을 받는다.

## 8. 구현 파일

- DDL:
- FastAPI schema/model/query/router:
- frontend API/loader/selector:
- 교체할 화면:
- 제거할 JSON/localStorage 코드:
- 갱신할 `DB_SCHEMA.md` / `DB.md` 항목:

## 9. 자동 검증 게이트

- 계약 테스트: `backend/tests/contracts/test_{entity}_contract.py`
- 대표 mock fragment:
- 신규 기능의 팀장 승인 response fixture(해당 시):
- API response 추출 위치:
- exact keys/nesting/type 비교:
- 권한·오류·idempotency/concurrency 테스트:
- 대상 pytest 명령:
- build 명령: `npm run build`
- 왕복 QA: 쓰기 화면 → API/DB → 읽기 화면

## 10. 완료 조건

- [ ] 현재 revision에 Astra `ASTRA_APPROVED`
- [ ] migration이 빈 테스트 DB와 기존 fixture DB에 적용됨
- [ ] mock/API 계약 테스트 통과
- [ ] 권한·오류·동시성 테스트 통과
- [ ] 프론트가 loader/selector만 사용
- [ ] 대상 JSON/localStorage 정본 제거
- [ ] `npm run build` 통과
- [ ] `DB_SCHEMA.md`, `DB.md` 갱신
- [ ] 팀장 왕복 QA와 최종 `PASS`
