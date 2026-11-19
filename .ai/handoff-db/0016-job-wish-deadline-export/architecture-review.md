# 0016 Astra 설계 리뷰 — 채용공고 마감 시각 · 찜 수 · 찜한 학생 · 목록 다운로드

- 판정: **ASTRA_APPROVED** (교정 후 승인 — 업무 의미 변경 없음, USER_DECISION_REQUIRED 없음)
- 승인한 `work-order.md` revision: **2**
- 마이그레이션 168: 어떤 DB에도 적용하지 않았다(테스트 DB 포함). 앱 코드·프론트는 건드리지 않았다.

## 검토 요청 답변

### 1. `time` 별도 컬럼 vs `deadline_at timestamptz` → **별도 `time(0)` 컬럼 승인**
- `deadline_date` 는 `job_posting_deadline(stored_status,deadline_date,id)` 인덱스, 대시보드 술어, ON_HIRE 계산(`plus_one_month`),
  `posting_deadline_shape` CHECK, LEGACY 행(날짜 NULL 허용), 외부 수집 공고(`deadline_raw`)가 모두 날짜로 쓴다. timestamptz 로 바꾸면 이 전부와
  DTO `deadline` 계약을 다시 써야 하고 테이블 재작성이 생긴다.
- KST 는 DST 가 없어 「날짜 + KST 벽시계 시각」이 한 순간으로 유일하게 정해진다 — timestamptz 의 이점이 없다.
- 상수 DEFAULT ADD COLUMN 이라 재작성 없음(PG11+ fast default). 옛 앱 INSERT 는 명시 컬럼 목록(`POSTING_WRITABLE`)이라 기본값 23:59 를 받는다.
- 교정: 의미(KST·분 단위·ALWAYS/ON_HIRE 고정값)를 `COMMENT ON COLUMN` 으로 스키마에 남겼다.

### 2. `wish_counts` 비용·인덱스 → **승인, 인덱스 그대로**
- `/jobs` 한 페이지(≤100 id)당 `posting_id=ANY(...) GROUP BY` 1쿼리. PK `(student_uid,posting_id)` 는 공고 기준 탐색에 못 쓰므로 새 인덱스가 필요하다.
- `(posting_id, created_at DESC)` 는 찜 수(인덱스 범위 스캔) + 찜한 학생 목록 정렬(`ORDER BY created_at DESC`)을 함께 덮는다. 표 크기 상한 = 학생(약 8천) × 찜 수로 작아
  트랜잭션 안 일반 `CREATE INDEX`(migrate.py 가 파일 전체를 한 트랜잭션으로 실행 — CONCURRENTLY 불가)로 충분하다. 쓰기 비용은 찜 저장 1건당 인덱스 1개 추가로 무시 가능.
- 찜 수는 원본에서 매번 계산 — 공고 행에 카운터를 두지 않는다(규칙 3, 동시 찜 lost update 원천 차단).

### 3. 대시보드 `recruiting_jobs` 날짜 단위 유지 → **반려, 교정함**
- `recruiting_jobs` docstring 이 「`effective_status` POSTED 와 같은 조건」을 계약으로 선언한다. 날짜만 보면 같은 상담사가 홈에선 「모집중」,
  채용관리에선 「마감」을 동시에 본다. 대시보드는 `today()` 고정 화면이 아니라 매 요청 현재 시각(`no-store`)이다.
- 교정안: 날짜 인덱스 술어는 유지하고 당일만 시각을 비교 —
  `j.deadline_mode='ALWAYS' OR j.deadline_date>%s OR (j.deadline_date=%s AND j.deadline_time>=%s)` (값 `day, day, clock()`).
  `clock()` 을 모듈 함수로 둬 기존 `today` monkeypatch 테스트 방식(DAY=2070-01-08)과 맞춘다. SQL `now()` 를 쓰지 않는다 — 테스트가 고정한 날짜와 어긋난다.

### 4. 찜 목록 권한 → **승인**
- `require_manage`(메뉴 `jobs` — 현재 career 에만 부여) + `scope_condition(user,'w')`. 상담사는 전 학생, 그 밖에 메뉴를 받은 교직원은 `staff_student_scope` 만.
  지원자 목록(`applicant_filters`)과 같은 술어라 범위 누락 경로가 없다.
- 비상담사 메뉴 보유자는 카드의 `wishCount`(전체)와 모달 `totalCount`(범위)가 다를 수 있다. 의도된 차이 — 화면은 모달에서 `totalCount` 를 쓴다.
- 개인정보: 응답은 alias·이름·학번·대학·학과·학년·찜 시각 7필드로 제한(연락처 없음). 학생은 403, 학생 응답 어디에도 찜한 학생 신원이 없다.

### 5. 삭제 공고·탈퇴 학생 → **승인**
- 삭제 공고: `get_posting`(deleted_at IS NULL) 404 — 상세와 같다. 목록 `/jobs` 는 삭제 공고를 안 내므로 찜 수도 없다. 학생 본인 찜 목록은 기존 `unavailableCount` 로 처리.
- 탈퇴 학생: `dc.student` 에 논리삭제 개념이 없고 `job_wishlist.student_uid` 는 FK 다. 퇴역 마이그레이션(062·104·106)은 찜을 먼저 지운다 →
  고아 행이 생길 수 없어 별도 처리 불필요. 졸업생 등 학적 변화는 학사 미러 값을 그대로 보여 준다(규칙 1).

## 교정한 설계(revision 1 → 2)

| # | 교정 | 근거 |
|---|---|---|
| 1 | 168 SQL 에 `COMMENT ON COLUMN deadline_time` | KST 벽시계·분 단위 의미를 스키마에 고정 |
| 2 | `now_kst()` 단일 시계 + `combine(date,time) < now_kst()` | `today()` 와 시각을 따로 읽으면 자정 경계에서 어긋남, 테스트 고정 가능 |
| 3 | `deadlineTime` 은 `strftime('%H:%M')` | psycopg `time` 을 그대로 직렬화하면 `'23:59:00'` — 입력 패턴과 왕복 불일치 |
| 4 | `posting_event` before/after 에서 `wishCount` 제외 | 다른 학생 행위의 집계가 공고 append-only 이력에 차이로 섞인다 |
| 5 | ALWAYS·ON_HIRE 는 서버가 23:59 정규화 | 모드가 정하는 값. 사용자 입력 몰래 자르기 아님(DATE 만 입력 저장) |
| 6 | 대시보드 시각 반영(위 3번) | docstring 계약·화면 간 일관성 |
| 7 | wishers: 정렬 tie-break `student_uid`, 순서 require_manage→get_posting→조회, 7필드 고정 | 결정적 순서·정보 최소 노출 |
| 8 | 다운로드 지원자 수: 지원 스토어 권한이 없으면 빈 칸 | 모르는 값을 0 으로 위장하지 않는다 |
| 9 | 배포 순서: API(168 포함) → 웹 | `PostingBody extra='forbid'` — 새 웹이 옛 API 에 `deadlineTime` 을 보내면 422 |

## 예상 주요 query 와 인덱스 대응

| query | 빈도 | 인덱스 |
|---|---|---|
| `/jobs` 페이지 목록 `WHERE deleted_at IS NULL ORDER BY posted_at DESC,id` | 부팅마다 readAll | `job_posting_listing`(기존) |
| `wish_counts`: `job_wishlist WHERE posting_id=ANY($ids) GROUP BY posting_id` | `/jobs` 페이지·상세·쓰기 응답마다 1회 | **`job_wishlist_posting`(168)** |
| wishers: `job_wishlist w JOIN student JOIN person LEFT JOIN department WHERE w.posting_id=$1 AND scope ORDER BY w.created_at DESC` | 모달 열 때 | `job_wishlist_posting` + 각 PK |
| 학생 본인 찜 `WHERE student_uid=$1 ORDER BY created_at DESC` | 학생 부팅 | `job_wishlist_recent`(기존) |
| 대시보드 `stored_status='POSTED' AND (ALWAYS OR date>d OR (date=d AND time>=t))` | 상담사 홈 | `job_posting_deadline`(기존, 날짜 prefilter) |

## 위험 · migration · rollback

- additive 2문(ADD COLUMN 상수 기본값, CREATE INDEX) + COMMENT. 재작성 없음, 짧은 ACCESS EXCLUSIVE 만. 재실행은 migrate.py 체크섬 대장이 막는다.
- 권한: dc_app 은 job_posting SELECT/UPDATE·job_wishlist SELECT 를 이미 가진다(022 GRANT). 새 GRANT 불필요.
- 롤백: 앱만 되돌리면 된다. 컬럼·인덱스는 옛 앱에 무해(옛 앱은 날짜만 보고 그날 끝까지 열어 둔다). 되돌린 뒤 저장되는 공고는 23:59 기본값.
- 경쟁: 찜 수는 매번 집계라 lost update 없음. 마감 판정은 지원 트랜잭션의 `get_posting(lock=True)` 행 위에서 계산되므로 공고 수정과 직렬화된다.
- 기존 공고의 GENDER 옵션은 다음 수정 저장 때 지워진다(사용자 요청 4의 결과, UPDATE 이벤트 before 에 남음).
- 백필 없음: 기존 행 23:59 = 종전 동작(사용자 확정).

## JSON 호환성 테스트 항목

work-order.md 「테스트」 1~12. 핵심:
- `posting_dto` 에 `deadlineTime`('HH:MM' 정확히), `wishCount`(int) 추가, 기존 키·타입 불변(`deadline` 은 여전히 날짜 문자열).
- `/jobs/{id}/wishers` 응답 키 집합 정확히 `{items:[{studentId,name,studentNo,college,department,grade,wishedAt}], totalCount}`.
- `job_posting_event` 스냅샷에 `wishCount` 없음.
- 기존 `test_effective_status_beats_stored_status`(당일 마감 POSTED)는 23:59 기본값으로 계속 통과해야 한다 — 단 `now_kst` 를 고정하지 않으면
  23:59~24:00 실행 시 흔들릴 수 있으니 새 테스트는 반드시 시계를 고정한다.

## Sol(또는 팀장)이 그대로 실행할 순서

1. `dreamcatch_test` 에 168 적용(팀장 지시 후에만).
2. `jobs.py`: `now_kst` → `effective_status` → `PostingBody.deadlineTime`·정규화 → `POSTING_WRITABLE`/`posting_values` → `wish_counts`·`posting_dto`
   → `posting_event` 에서 `wishCount` 제외 → `GET /jobs/{posting_id}/wishers`(라우트 순서: `/jobs/capabilities`·`/jobs/eligibility` 와 충돌 없음, 경로 깊이가 다름).
3. `counsel_dashboard.py`: `clock()` + `recruiting_jobs` 술어.
4. `tests/test_job_wish_deadline.py` 신규 + 기존 계약 기대값 갱신 → pytest(기존 실패 4건 제외).
5. 프론트(schema/job.ts → JobForm → JobDetailView → JobBoard → jobsSource → JobManage → jobWishlist) → `npx tsc -b`.
6. `npm run docker:up` → ego-browser 로 등록(시각)·카드 찜 수·찜 목록·다운로드·학생 찜 왕복, 콘솔 오류 0·실패 요청 0·`/jobs` 응답 시간 전후 비교.
