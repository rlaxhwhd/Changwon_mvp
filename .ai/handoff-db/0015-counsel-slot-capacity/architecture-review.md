# 0015 상담 가능 시간대 1시간당 인원 — Astra 설계 리뷰

- 판정: **ASTRA_APPROVED**
- 승인한 `work-order.md` revision: **2** (revision 1 + 이 리뷰의 교정 반영)
- 리뷰일: 2026-11-19 · 읽기 전용 검토 — 마이그레이션은 어떤 DB에도 적용·실행하지 않았고 docker:up 도 하지 않았다.
- 업무 의미(1시간마다 n명 · 학생 신청에도 적용 · 기존 1명)는 사용자 확정이라 바꾸지 않았다.

## 1. 마이그레이션 167

`ALTER TABLE dc.counsel_schedule_slot ADD COLUMN capacity smallint NOT NULL DEFAULT 1 CONSTRAINT ck_… CHECK (capacity BETWEEN 1 AND 20)`

- 상수 기본값 ADD COLUMN → 테이블 재작성 없음. CHECK 검증을 위한 스캔은 있지만 행 수가 수백 건 규모라 ACCESS EXCLUSIVE 잠금은 순간적이다.
- 기존 행 = 1 → 종전 「담당자 한 시각 1건」과 동일. EXCLUDED 행은 앱이 항상 1을 넣는다(의미 없음, 허용).
- 1~20 범위가 Pydantic `Slot.capacity`(ge=1, le=20)·화면 검증과 같다.
- 권한: 035 의 `SELECT,INSERT,DELETE` 로 충분(UPDATE 경로 없음 — 저장은 DELETE+INSERT 치환).
- 038 백필은 컬럼을 명시한 INSERT 라 새 컬럼 기본값으로 동작한다.
- SQL 은 수정하지 않았다. SHA256 `3b3c2442006bade57d3cb1b740f018b7c0fc1a8d2488e897e93d1271702c359b` 유지 확인(LF·BOM 없음 → `migrate.py` 의 `read_text` 체크섬과 파일 해시가 같다).
- 롤백: 앱만 되돌리고 컬럼은 둔다(작업지시서대로). 옛 앱의 위치 기반 6값 INSERT 는 기본값으로 동작, 인원>1 행은 옛 앱에서 1명 취급 — 데이터 손실 없음.

## 2. 검토 요청 5건 답

### (1) 카운트 기준 불일치 — **교정함**

세 곳이 서로 다른 규칙을 쓰고 있었다.

| 위치 | 교정 전 | 교정 후 |
|---|---|---|
| 서버 `check_slot` | 새 구간과 겹치는 담당자 건 **총수** ≥ 인원이면 거절 | **동시 진행 최대 건수**(peak) ≥ 인원이면 거절 |
| `/counsel-slots` | 1시간 칸과 겹치는 건수 < 인원 | 그대로(정시 칸 기준이라 peak 와 같다) |
| 화면 `buildDaySchedule.booked` | **시작 시각** 버킷만 셈 | 1시간 칸과 **겹치는** 대기·확정 건수 |

- 서버 교정 이유: 총수 기준은 긴 일정에서 과잉 거절한다. 인원 2, 13시 1건·14시 1건이 있을 때 13~15시로 일정 변경하면 각 시간은 2명이 되어 허용돼야 하는데 총수 2 ≥ 2 로 거절됐다. peak 는 겹치는 건의 시작 시각과 새 구간 시작 시각에서만 동시 건수를 재면 된다(동시 건수는 시작 시각에서만 늘어난다). **인원 1이면 peak≥1 ⇔ 겹침 존재라 종전 동작과 정확히 같다** — 기존 1명 전제를 깨지 않는다. 시작이 정시가 아닌 일정(13:30~14:30)에도 「한 시간 버킷」 대신 「같은 순간 n명」으로 판정해, 인원 1의 종전 의미(13:00~13:30 과 13:30~14:30 공존 허용)를 보존한다.
- 화면 교정 이유: 13~15시 확정 건이 14시 칸에 안 잡혀 「학생 추가」가 보였다가 서버 409 로 막혔다. 이제 14시 칸도 차지한다. 목록 위치(items)는 계속 시작 시각 칸이다.
- 정시 1시간 슬롯(학생 신청·학생 추가의 유일한 모양)에서는 세 곳이 같은 숫자를 낸다.

### (2) `fetchone()` 한 행 — **맞다**

`save_schedule` 이 정렬 후 인접 쌍 `a.end > b.start` 로 같은 요일의 겹침을 422 로 막는다. 정렬된 구간에서 겹침이 하나라도 있으면 인접 쌍에도 겹침이 있으므로 이 검사는 완전하다. 겹치지 않는 구간들 중 양의 길이 구간 `[start,end)` 를 **포함**하는 구간은 많아야 하나다. 맞닿은 두 구간(09~12 3명, 12~15 2명)도 12시 슬롯은 뒤 구간만 포함한다. 두 구간에 걸친 일정(11~13시)은 어느 쪽도 포함하지 못해 「가능 시간대 밖」 409 — 종전과 같은 동작이며 이번 변경 범위 밖이다. 화면 `getOpenHours` 의 `Map.set` 덮어쓰기도 같은 전제에서 충돌이 없다.

### (3) 가능 시간대 밖 기존 일정 · 미설정 담당자 — **문제 없음**

- 확정·일정변경·재배정은 모두 `check_slot` → `check_personal_schedule` 을 지나 가능 시간대 밖이면 409 이다. 밖에 놓인 일정은 「일정 확정 뒤 가능 시간대를 줄인 경우」나 시간대 설정 전 데이터뿐이다. 이 행은 화면에서 capacity 0 행(「가능 시간대 밖」, 학생 추가 없음)으로 나타나고, 겹치는 칸의 booked 에도 잡힌다.
- 인원을 현재 예약보다 줄이면 기존 예약은 그대로 두고 신규만 막는다(booked > capacity 표시, `remaining` 은 `Math.max(0, …)` 로 0). 정상.
- 가능 시간대가 하나도 없는 담당자 = 1명(서버 `return 1`, `/counsel-slots` `capacity=1`). 화면은 openHours 가 비어 학생 추가 행이 없다 — 종전 화면과 같다.
- 동시성: `check_slot` 은 담당자·학생 advisory lock 을 잡은 뒤 인원을 읽고, `save_schedule` 도 같은 `counsel:{staff_uid}` 잠금을 잡는다. 인원 축소와 예약이 직렬화되어 lost update 가 없다.

### (4) `/counsel-slots` 파이썬 집계 비용 — **보완함**

담당자(교수 포함) × 일(≤14) × 9시간 루프가 매번 기간 전체 `busy` 를 훑었다(종전도 같은 규모). `busy` 를 날짜별 dict 로 한 번 나눠 루프마다 그날 건만 본다 — 비용이 일수만큼 줄고 결과는 같다. 남은 비용(전체 `counsel_schedule_slot` 적재, `busy` 쿼리의 `slot_date` 선두 인덱스 부재)은 종전부터 있던 것으로 후속 항목에 둔다.

### (5) 교수 — **문제 없음**

`/settings/availability` 라우트는 `staffPageLoader(['career','psych'])` 라 교수는 인원 입력 화면에 들어오지 않는다. 교수 시간대는 038 백필·기본값으로 1이며, 같은 `check_slot` 에서 인원 1 = 종전 「겹치면 거절」과 동일(위 (1)). 교수 화면에서 저장해도 `Slot.capacity` 기본값 1.

## 3. 교정한 파일

| 파일 | 교정 |
|---|---|
| `backend/app/counsel.py` `check_slot` | FILTER 카운트 → 겹치는 행을 받아 담당자 peak 동시 건수로 판정. 학생 겹침 ≥1 거절·문구 규칙은 그대로 |
| `backend/app/counsel_operations.py` `public_slots` | `busy` 날짜별 사전 분할(결과 동일) |
| `src_admin/data/counselRequests.ts` `buildDaySchedule` | booked 를 시작 시각 버킷 → 1시간 칸 겹침 기준. items 배치는 그대로 |
| `backend/tests/contracts/test_remaining_contract.py` | `test_availability_fixture_contract` 가 정확한 키 일치(`assert_same_json_shape`)라 새 `capacity` 키에서 실패했을 것 — 기대 계약에 `capacity:1` 추가. **시드 JSON 은 고치지 않는다**(`app.seed` 가 `seed_source` 체크섬 변경 시 RuntimeError) |

검증: 수정 파이썬 3개 구문 검사 통과 · peak 계산 단위 사례 5건 통과(스크래치 스크립트, DB 미사용) · `npx tsc -b` 통과.

## 4. 예상 주요 query 와 인덱스

| query | 경로 | 인덱스 |
|---|---|---|
| EXCLUDED 겹침 · AVAILABLE 포함(capacity) 조회 | `check_personal_schedule` | `ix_schedule_lookup(staff_uid,weekday,kind,start_time,end_time)` |
| 담당자/학생 겹침 행 | `check_slot` | `counsel_request_staff(counselor_uid,status_code,slot_date)` · `counsel_request_student(student_uid,…)` BitmapOr — 반환 행은 그날 겹치는 몇 건 |
| 기간 내 REQ/CONFIRMED | `/counsel-slots` | slot_date 선두 인덱스 없음(종전부터). 현 규모에선 허용, 후속 항목 |
| 담당자 시간대 DTO | `schedule_dto` | `ix_schedule_lookup` 선두 staff_uid |

## 5. JSON 호환성 테스트 항목

- `GET /counsel-schedules/{id}` `available[]`·`excluded[]` 항목 키 = `{id,weekday,start,end,capacity}` (계약 테스트 교정 반영).
- `PUT /counsel-schedules/{id}/{kind}` 가 `capacity` 없는 옛 본문(기본 1)과 있는 본문을 모두 받는다. `excluded` 에 capacity 를 보내도 1로 저장.
- `GET /counsel-slots` 응답 모양 불변(`available` bool).
- 추가할 pytest(테스트 DB 적용 후):
  1. 인원 2인 시간대: 서로 다른 학생 2명 신청 성공, 3번째 409 「이 시간대의 상담 인원이 모두 찼습니다.」, 같은 학생 같은 시각 재신청 409 「학생 또는 담당자의 예약 시간과 겹칩니다.」.
  2. 인원 2, 13시·14시 각 1건 → 한 건을 13~15시로 reschedule 허용, 같은 상태에서 13시 신규 1건 추가 시 409.
  3. 인원 1(기본) 기존 동작: 겹침 409 문구 종전과 동일.
  4. `/counsel-slots`: 인원 2에 1건 예약 → 그 시각 available=true, 2건 → false.
  5. `capacity` 0·21 → 422. excluded 저장 시 capacity 1.

## 6. 위험

- 브라우저 캐시의 옛 프론트는 capacity 를 보내지 않아 시간대를 추가할 때 1명으로 저장된다 — 새로고침으로 해소, 데이터 손실 없음.
- `remove`·추가가 시간대 전체 치환이라, 옛 프론트가 저장하면 기존 인원>1 행이 서버 DTO 의 capacity 를 그대로 되돌려 보내므로 유지된다(스토어가 DTO 를 그대로 들고 있음). 문제 없음.
- 마이그레이션 SQL 의 체크섬은 LF 기준이다. `.gitattributes` 에 `backend/migrations/*.sql` eol 고정이 없어 CRLF 체크아웃 환경에서 체크섬이 달라질 수 있다(이번 변경 이전부터 있던 위험).

## 7. Sol(또는 팀장)이 그대로 실행할 순서

1. 테스트 DB(dreamcatch_test)에 167 적용.
2. pytest: `test_remaining_migrations` · `contracts/test_remaining_contract` · counsel 계열(기존 실패 4건 제외) + §5 인원 테스트 5건 추가·통과.
3. `npx tsc -b`.
4. `npm run docker:up` → 로컬 DB 167 적용 확인.
5. ego-browser: 설정에서 월 13~15시 2명 추가 → 학생(/v2) 13시 신청 → 접수함 13시 「1/2명」·학생 추가 가능 → 두 번째 추가 후 「인원 마감」 → 세 번째 학생 신청 화면에서 13시 비활성. 콘솔 오류 0 · 실패 요청 0 · `/counsel-slots` 응답 시간 기록(교정 전후 비교).
6. 커밋·푸시. CentOS 배포 없음.

## 8. 후속(차단 아님)

- `/counsel-slots` 의 `SELECT * FROM dc.counsel_schedule_slot` 전체 적재와 `busy` 쿼리용 `(slot_date) WHERE status_code IN ('REQ','CONFIRMED')` 부분 인덱스 — 실측 후 판단.
- `.gitattributes` 에 `backend/migrations/*.sql text eol=lf` 고정 검토.
- `docs/dbmeta/SCHEMA_INVENTORY_2026-09-16.md` 는 시점 스냅샷이라 고치지 않았다. 다음 인벤토리 갱신 때 capacity 반영.
