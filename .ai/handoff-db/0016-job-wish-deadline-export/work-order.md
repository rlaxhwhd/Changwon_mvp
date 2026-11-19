# 0016 채용공고 — 목록 다운로드 · 찜한 학생 · 찜 수 · 성별 무관 · 마감 시각 — 적용 전 Astra 검토

- revision: 2 (Astra 교정 — 변경점은 `architecture-review.md` 「교정」)
- 상태: ASTRA_APPROVED (마이그레이션 미적용 — 테스트 DB 포함 어떤 DB에도 적용하지 않았다)
- 사용자 요청(2026-11-19):
  1. 상담사 채용공고 — 공고 리스트 다운로드(기간 설정)
  2. 학생 채용공고 찜 + 상담사·학생이 공고별 찜한 학생 리스트 확인
  3. 채용공고 카드에 찜한 학생 수
  4. 공고 등록 시 성별 선택 삭제, 공고 화면은 항상 「성별 무관」
  5. 지원마감일에 시간 추가(지금은 년-월-일)
- 사용자 확정(질문 답): 학생은 **명수만**(누가 찜했는지는 상담사만) · 다운로드 기간 = **등록일 기준** ·
  기존 공고 마감 시각 = **23:59** · 찜 수는 **상담사·학생 카드 모두**.
- 이미 있는 것: 학생 찜 저장/해제(`/job-wishlist`, `dc.job_wishlist`, 학생 카드 별·상세 버튼). 2번은 「목록 보기」만 새로 만든다.

## 데이터 판단

| 요구 | 판단 |
|---|---|
| 찜 수 | 원본(`job_wishlist`)에서 계산 — 파생값을 공고 행에 넣지 않는다(규칙 3). `posting_rows` 가 공고 id 묶음으로 1쿼리 GROUP BY |
| 찜한 학생 목록 | 같은 원본 조회 — 새 endpoint `GET /jobs/{id}/wishers` |
| 마감 시각 | 같은 엔티티의 단일 속성 → `job_posting.deadline_time` 컬럼 확장 |
| 성별 | 데이터 변경 없음. 폼에서 행 제거·저장 시 `genders: []`, 상세는 항상 「성별 무관」. API 필드는 호환 위해 유지 |
| 다운로드 | 부팅 스토어에 교내 공고 전체가 이미 있다(`/jobs` readAll) → 행 조립은 데이터층 `jobsSource` 함수, 엑셀은 기존 `shared/xlsx` |

## 마이그레이션

`backend/migrations/168_job_deadline_time_wish_count.sql`

```sql
ALTER TABLE dc.job_posting ADD COLUMN deadline_time time(0) NOT NULL DEFAULT '23:59';
COMMENT ON COLUMN dc.job_posting.deadline_time IS 'KST 벽시계 마감 시각(분 단위) …';  -- rev2
CREATE INDEX job_wishlist_posting ON dc.job_wishlist(posting_id,created_at DESC);
```

- 상수 기본값이라 재작성 없음. 기존 행 23:59 → 종전(그날 끝까지 열림)과 같다.
- `job_wishlist` 는 학생×찜 수준의 작은 표. 트랜잭션 안 일반 CREATE INDEX 로 충분하다고 본다.
- 권한: dc_app 은 job_posting UPDATE·job_wishlist SELECT 를 이미 가진다(022). 새 GRANT 불필요.
- 롤백: 앱만 되돌리면 컬럼·인덱스는 무해하다. 옛 앱은 날짜만 보고 그날 끝까지 열어 둔다.

## 코드

- `backend/app/jobs.py`
  - `PostingBody.deadlineTime: str` (`^([01]\d|2[0-3]):[0-5]\d$`, 기본 `'23:59'`). `POSTING_WRITABLE`·`posting_values` 에 `deadline_time`.
    ON_HIRE 최초 계산·ALWAYS 일 때는 `'23:59'` 저장.
  - **rev2 시계 하나:** `def now_kst(): return datetime.now(SEOUL).replace(second=0, microsecond=0, tzinfo=None)` 를 두고
    `effective_status` 는 이것만 본다(`today()` 와 두 번 시계를 읽지 않는다). 테스트는 `monkeypatch.setattr(jobs,'now_kst',…)` 로 고정한다.
  - `effective_status`: `datetime.combine(deadline_date, deadline_time) < now_kst()` 이면 CLOSED (= 분 단위, 그 분이 끝날 때까지 열림.
    23:59 는 23:59:59 까지 열림 — 종전과 같다. 18:00 마감은 18:00:59 까지 접수). 지원 시 마감 검사(858행)는 이 함수를 그대로 쓴다 — 별도 비교를 만들지 않는다.
  - `posting_dto`: `deadlineTime` 은 **반드시 `row['deadline_time'].strftime('%H:%M')`** (time 그대로 내보내면 `'23:59:00'`), `wishCount: int` 추가.
    `posting_rows` 에 `wish_counts(conn, ids)` 1쿼리:
    `SELECT posting_id,count(*)::int AS n FROM dc.job_wishlist WHERE posting_id=ANY(%s) GROUP BY posting_id` — 없는 id 는 0.
  - **rev2 이력 오염 금지:** `posting_event` 의 before/after 에는 `wishCount` 를 넣지 않는다(공고 속성이 아니라 다른 학생 행위의 집계 —
    찜이 바뀐 것만으로 UPDATE 이력에 차이가 생긴다). `posting_event` 안에서 dict 이면 `wishCount` 키를 빼고 저장한다.
    멱등 응답(`remember`)에는 그대로 둔다(재전송 시 그 시점 값 — 무해).
  - `PostingBody.deadlineTime` 은 ALWAYS·ON_HIRE 에서 서버가 `'23:59'` 로 정규화한다(모드가 정하는 값). DATE 만 사용자 값을 저장한다.
    `extra='forbid'` 라 새 웹 → 옛 API 는 422 — **API 를 먼저(같이) 올린다.**
  - 성별: 폼이 `genders: []` 를 보내면 수정 시 `write_options` 가 기존 GENDER 옵션 행을 지운다. 의도된 동작(사용자 요청 4)이며 이력은 UPDATE 이벤트 before 에 남는다.
  - 새 `GET /jobs/{posting_id}/wishers` — `require_manage`(채용 메뉴 = career). 범위는 지원 목록과 같은 `scope_condition(user,'w')`.
    `dc.job_wishlist w JOIN dc.student s JOIN dc.person p LEFT JOIN dc.department d ON (단대,학과) 쌍` →
    `{items:[{studentId(alias), name, studentNo, college, department, grade, wishedAt}], totalCount}` 최근 찜 순
    (`ORDER BY w.created_at DESC, w.student_uid` — 동시각 tie-break). 페이지네이션 없음(행 수 상한 = 학생 수, 행당 수십 바이트).
    순서: `require_manage` → `get_posting`(삭제 공고 404) → 조회. 연락처·이메일 등 위 7필드 밖은 내지 않는다.
    학생은 403(명수만 — `wishCount`).
- `backend/app/counsel_dashboard.py` `recruiting_jobs` — **rev2 교정: 바꾼다.** docstring 이 「effective_status POSTED 와 같은 조건」을 계약으로 적고 있고,
  같은 상담사가 홈에서 「모집중」, 채용관리에서 「마감」을 보게 된다. 날짜 인덱스 술어는 유지하고 당일만 시각을 본다:
  `AND (j.deadline_mode='ALWAYS' OR j.deadline_date>%s OR (j.deadline_date=%s AND j.deadline_time>=%s))` — 값은 `(day, day, clock())`,
  `clock()` = `datetime.now(SEOUL).time().replace(second=0,microsecond=0)` 를 모듈 함수로 둬서 테스트가 `today` 와 함께 고정할 수 있게 한다.
  (기존 테스트는 DAY±1 이라 영향 없음.) 응답 item 에 `deadlineTime`('HH:MM') 을 더해도 되나 필수는 아니다.
- 화면
  - `src_admin/data/schema/job.ts`: `JobPosting.deadlineTime`, `wishCount`, `JobPostingInput.deadlineTime`, `JobWisher` 타입.
  - `src_admin/pages/JobForm.tsx`: 「성별」 행 삭제(저장 `genders: []`), 지원마감일 옆 `type="time"`(기본 23:59).
  - `src_v2/components/JobDetailView.tsx`: 성별 = 항상 「성별 무관」, 마감일 표시에 시각.
  - `src_v2/components/JobBoard.tsx`: 카드 하단 「찜 N명」(상담사·학생), 마감 라벨에 시각.
    상담사 화면에서 찜 수를 누르면 찜한 학생 목록 모달(`onWishersOpen` prop — 교직원 화면만 넘긴다).
  - `src_admin/data/jobsSource.ts`: `loadJobWishers(id)`, `jobExportRows(from,to)`(등록일 KST 기준 교내 공고 → 번호·채용유형·회사명·공고제목·
    근무형태·직종·지역·연봉·마감일시·상태·등록일·지원자수·찜수), `jobDdayLabel` 이 마감 시각을 본다.
  - `src_admin/pages/JobManage.tsx`: 「목록 다운로드」(시작일·종료일, 기본 최근 1년) → `downloadXlsx`.
    **rev2:** 지원자 수는 지원 스토어(`jobs.4` 권한)에서 온다 — 지원 스토어를 못 읽는 사용자(`canManageApplicants=false`)면 `0` 이 아니라 빈 칸으로 낸다
    (모르는 값을 0 으로 위장하지 않는다). 시작일 > 종료일은 버튼 비활성.
  - `src_v2/data/jobWishlist.ts`: 저장/해제 후 `refreshPosting(id)` 로 찜 수 갱신.

## 테스트(신규 `backend/tests/test_job_wish_deadline.py`)

1. 마감 시각: 오늘 마감 + 지난 시각 → CLOSED, 오늘 + 23:59 → POSTED, 지원 POST 가 지난 시각에서 거절.
2. `deadlineTime` 형식 422(`24:00`, `9:00`), 생략 시 23:59 저장.
3. `wishCount`: 학생 2명 찜 → 목록·상세 2, 해제 → 1.
4. `/jobs/{id}/wishers`: 상담사 200·이름 포함, 학생 403, 없는 공고 404.
5. 계약: `posting_dto` 키 추가(`deadlineTime`,`wishCount`) — 기존 계약 테스트 기대값 갱신.
6. (rev2) 시계 고정(`now_kst` monkeypatch) 경계: 마감 18:00 + now 18:00 → POSTED, 18:01 → CLOSED, 다음날 00:00 + 23:59 마감 → CLOSED.
   `deadlineTime` 응답은 정확히 `'HH:MM'`(초 없음). 생략한 옛 본문 → `'23:59'`.
7. (rev2) ALWAYS·ON_HIRE 에 `deadlineTime:'10:00'` 을 보내도 저장·응답은 `'23:59'`. ON_HIRE 제목만 수정 시 날짜·시각 모두 유지.
8. (rev2) 지원 POST: 오늘 마감 + 지난 시각 → 409 `마감된 공고입니다.`, 같은 공고 시각 전 → 201.
9. (rev2) 찜 후 PATCH → `dc.job_posting_event` after_value/before_value 에 `wishCount` 키 없음.
10. (rev2) wishers: 삭제 공고 404, 채용 메뉴 없는 교직원 403, 순서 최근 찜 우선, 응답 키 집합 정확히 7개 + `totalCount`.
11. (rev2) 대시보드: `today`·`clock` 고정 → 당일 마감 시각 전 공고 포함, 지난 공고 제외, ALWAYS 포함.
12. `wishCount` 가 학생 응답(`/jobs`, `/jobs/{id}`)에도 있고 찜 학생 신원은 어떤 학생 응답에도 없다.

## 검토 요청 사항

1. 마감 시각을 별도 `time` 컬럼으로 둘지, `deadline_at timestamptz` 로 바꿀지(외부 수집·대시보드·인덱스 영향 때문에 별도 컬럼안).
2. `wish_counts` 를 `/jobs` 전체 readAll(페이지 100건씩) 마다 GROUP BY 하는 비용과 인덱스 `(posting_id,created_at DESC)` 적정성.
3. 대시보드 `recruiting_jobs` 를 날짜 단위로 남겨도 되는지(마감 당일 시각이 지난 공고가 그날 대시보드에 남는다).
4. 찜 목록 권한: 채용 메뉴(`jobs`) 보유자 + 지원자와 같은 범위 술어. 교수 등 비상담사 교직원은 범위 학생만.
5. 삭제된 공고·탈퇴 학생 처리(목록은 활성 공고만 `get_posting`).

## 적용 순서(승인 뒤)

테스트 DB(dreamcatch_test) 168 적용 → 관련 pytest(test_jobs 계열·계약, 기존 실패 4건 제외) + 신규 테스트 → `npx tsc -b`
→ `npm run docker:up` → ego-browser 로 등록(시각)·카드 찜 수·찜 목록·다운로드·학생 찜 왕복 → 커밋·푸시. CentOS 배포 없음.
