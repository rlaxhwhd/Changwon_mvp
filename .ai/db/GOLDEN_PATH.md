# 골든 패스

상태: **READY** <span>(2026-09-09 고정 — 비교과)</span>

첫 DB 전환 엔티티 하나를 끝까지 구현하고 팀장이 검증한 뒤 이 문서를 `READY`로 바꾼다.

**부트스트랩 라운드를 새로 돌지 않고 비교과를 골든 패스로 고정했다.** 이유는 이것이 이미
그 역할을 했기 때문이다 — 채용(022·`jobs.py`)과 로드맵·성장(024~026·`roadmap.py`·`growth.py`)
두 도메인이 이 구조를 그대로 복제해 각각 독립 검증을 통과했다. **패턴이 따라 하기 좋다는 증거로는
새 부트스트랩 1회보다 실제 복제 2회가 강하다.** READY 전에는 Sol에게 반복 DB 엔티티 구현을 맡기지 않는다. `NO_DB_CHANGE` UI 작업은 이 게이트와 무관하다.

## 선정 기준

- 실제 mock JSON과 읽기·쓰기 화면이 모두 존재한다.
- 새 table 또는 의미 있는 기존 table 확장, API, frontend 교체가 모두 포함된다.
- 권한과 오류 처리, 최소 한 개의 목록 query/index가 있다.
- 너무 복잡한 도메인 전체가 아니라 다른 엔티티가 따라 할 수 있는 크기다.

## 고정할 참조 파일

| 계층 | 파일 | 복제할 패턴 |
|---|---|---|
| DDL | `backend/migrations/018_program_operations.sql` | 두 층 코드(운영=`code_item` FK / 구조=`CHECK`), 생성열+복합 FK, append-only 이벤트 테이블 + `dc.reject_history_change()` 트리거, `payload` 에서 실컬럼으로 backfill 후 `DROP` |
| API schema/model | `backend/app/programs.py` (`WRITABLE`·`PROGRAM_COLUMNS`) | 컬럼 목록을 한 곳에만 둔다. DTO 와 SQL 이 같은 상수를 본다 |
| query/service | `backend/app/programs.py` (`applicant_scope`·`record`·`sync_roadmap`) | 권한 범위는 `dc.staff_student_scope`, 이력은 이벤트 행으로, 도메인 간 연동은 같은 트랜잭션 |
| router | `backend/app/programs.py` | `Idempotency-Key`, `expectedVersion` 낙관적 잠금 409, 서버 페이징, 오류는 `{code,message}` |
| frontend API | `src_admin/data/programs.ts` + `shared/api.ts` | 읽기는 스토어에서 동기, 쓰기만 async. 정합성 판정을 프론트에서 다시 하지 않는다 |
| loader/selector | `shared/programStore.ts` | `programList()` 동기 selector + `loadPrograms()` 적재 + `refreshProgram(id)` 부분 갱신 + 이벤트 브로드캐스트 |
| 화면 | `src_admin/pages/ProgramList.tsx` | selector 구독만. 하드코딩 리터럴 0 |
| contract test | `backend/tests/test_boot_contract.py` | 화면이 읽는 키가 응답에 남아 있는지, 게이트 술어가 소스에서 옳은 함수를 부르는지 — **서버 DTO 만 보면 놓치는 것을 건다** |
| behavior test | `backend/tests/test_programs.py` | 권한·중복·정원·잘못된 상태 전이·동시성. 규칙 하나에 테스트 하나 |

## 팀장 승인 기록

- **엔티티:** 비교과 (`dc.program` · `program_apply` · `program_apply_event` · `penalty_entry`)
- **handoff:** 이 라운드 이전에 완료 — 기록은 `DB.md` §8-6, 마이그레이션 018
- **구현:** `backend/migrations/018_program_operations.sql` 외 (Astra 부트스트랩 아님 — 아래 사유)
- **팀장 리뷰 결과:** `PASS`. 이후 두 도메인이 이 구조를 복제해 각각 독립 검증을 통과했다
  (채용 `06-verification.md` `PASS`, 로드맵·성장 브라우저 왕복 확인)
- **실행한 테스트:** 빈 DB migration 001~026 → seed 43파일/120명 → `pytest` 98 passed → `tsc -b` → `npm run build`
- **고정일:** 2026-09-09

**주의 — 골든 패스가 가르치지 못하는 것.** 018 은 서버 계약만 보여준다. 이번 로드맵 라운드에서
`pytest` 98개와 `tsc -b` 가 전부 통과하는데 **두 SPA 가 죽어 있던 결함이 3건** 나왔다.
그래서 Sol 은 018 복제로 끝내지 말고 **`test_boot_contract.py` 계약 테스트와 브라우저 왕복까지**
같은 무게로 복제해야 한다. 서버가 옳아도 화면은 틀릴 수 있다.
