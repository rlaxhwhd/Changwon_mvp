# student-portfolio DB 전환 작업지시서

- 상태: `PASS`
- revision: `3` — 팀장 변경: 학생 본인 제출본 열람, education 필드 5개 추가(사진 대조), fixture 승인 절차. Astra가 같은 revision에서 학생 열람 경로를 확정했다
- 담당 구현: `SOL`
- 대상 handoff: `.ai/handoff-db/0009-student-portfolio/`
- 관련 화면/기능: `/v2/mypage/portfolio`의 새 「포트폴리오」 탭, 채용 지원 모달, 교직원 지원자 관리

## 0. 사용자 확정 (2026-11-06)

1. 회사 제출용 이력서를 학생이 보고 다듬는 기능이다. 기존 데이터는 자동으로 채우고, 채울 수 없는 항목은 학생이 추가·수정한다. 이력서 항목을 넣고 뺄 수 있다.
2. 회사별로 포트폴리오_v1, 포트폴리오_v2처럼 여러 벌을 만든다.
3. 채용공고 지원 시 「드림캐치 포트폴리오」에서 한 벌을 골라 첨부한다.
4. 기존 5개 탭은 유지하고 **「포트폴리오」 탭을 추가**한다. 탭 안에 목록과 편집기를 둔다.
5. **전 학년 공개**한다. 기존 4학년 제한을 푼다.
6. 만들 때 원본을 **복사**한다. 버전 안의 수정은 원본을 바꾸지 않는다. 「최신 기록 불러오기」는 항목별로 동작한다.
7. 제출본은 **지원자 관리 권한자(`jobs.4` 메뉴 + 기존 범위)가 열람하고 PDF로 저장**한다. 교수·조교 범위로 넓히지 않고, 기업회원 화면은 만들지 않는다.
   **제출한 학생 본인도 지원 내역에서 자기 제출본을 읽기 전용으로 본다.** 다른 학생은 볼 수 없다.
   제출 시 공개 사실은 안내 문구로만 알린다. 동의 이력은 이번 범위가 아니다.
8. 디자인은 기존 `/mypage/portfolio` 화면 라인을 그대로 따른다. 새 팔레트·폰트를 만들지 않는다. 편집기 구조는 사용자 제공 사진처럼 왼쪽 입력 본문, 오른쪽 항목 패널(필수 / + 추가 / - 제거, 미리보기·임시저장·저장)이다.

## 1. 기존 계약

| 항목 | 경로/값 |
|---|---|
| 원본 mock JSON | 없음 — 신규 계약 |
| 계약 fixture | `backend/tests/contracts/fixtures/student_portfolio.json`(신규. `fixtures/` 폴더도 없으므로 새로 만든다. `tests/contracts/README.md` 규칙대로 **팀장이 승인**한다. 대상은 6장 응답. Sol이 fixture를 먼저 만들어 멈추지 말고 6장대로 작성하고, 팀장이 구현 검수 전에 대조한다. 6장과 다른 key가 생기면 `BLOCKED_BY_WORK_ORDER`) |
| 현재 loader/selector | `shared/growthStore.ts` `loadPortfolio`·`ensurePortfolio`, `src_v2/data/portfolio.ts` `toPortfolioView` |
| 현재 localStorage key | 없음. 새로 만들지 않는다 |
| 쓰는 화면 | 새 `src_v2/pages/mypage/portfolio/*`, `src_v2/components/JobApplyModal.tsx`, `src_v2/pages/jobs/JobDetail.tsx` |
| 읽는 화면 | `src_admin/pages/JobApplicants.tsx`, 새 제출본 인쇄 화면, `src_v2/pages/mypage/MyApplications.tsx`, 새 학생 제출본 화면 |
| 기존 API | `GET /students/{identity}/portfolio`, `POST /jobs/{posting_id}/applications`(PORTFOLIO는 503), `GET /job-applications/{id}` |
| 기존 table | `dc.growth_profile`, `dc.growth_entry`, `dc.job_resume`, `dc.student_cert`, `dc.program_apply`, `dc.job_application_attempt`, `dc.file_object`, `dc.job_access_event` |

측정(2026-11-06, 로컬 Docker, 학생 20180001): 첫 진입 API 7건(`/metadata` 155KB가 최대, 각 약 200ms). 포트폴리오 전용 호출은 학년 제한으로 없었다. 탭을 열 때만 목록을 읽어 다른 탭의 호출을 늘리지 않는다.

## 2. 데이터 요구

| 동작 | 읽기/쓰기 | 필드 | 소유자 | 권한 | 생명주기/이력 |
|---|---|---|---|---|---|
| 목록 | 읽기 | id, title, updatedAt, version, 완성 여부 | 학생 | 본인 | 논리삭제 제외 |
| 생성 | 쓰기 | title, 복제 원본 id(선택) | 학생 | 본인 | 이벤트 CREATE |
| 편집·임시저장 | 쓰기 | document 전체, expectedVersion | 학생 | 본인 | 이벤트는 저장마다 쌓지 않는다. 낙관적 잠금 |
| 삭제 | 쓰기 | expectedVersion | 학생 | 본인 | 논리삭제 + 이벤트 DELETE. 제출본은 영향 없음 |
| 원본 불러오기 | 읽기 | 항목별 정규화 목록 | 학생 | 본인 | 저장은 학생이 편집 후 PUT |
| 파일 업로드·열람 | 쓰기/읽기 | 사진, 첨부 | 학생 | 본인 | 버전 사이에 공유. 참조를 지워도 파일은 지우지 않는다 |
| 제출 | 쓰기 | portfolioId, expectedPortfolioVersion | 학생 | 본인 + 기존 지원 자격 | 회차별 불변 스냅샷. `enabled:false` 항목은 스냅샷에서 뺀다 |
| 제출본 열람 | 읽기 | 스냅샷 전체 | 교직원·제출 학생 | 교직원은 `get_application`의 메뉴(`jobs.4`)·범위. 학생은 본인 지원 건만(타 학생 404) | 교직원 열람만 `dc.job_access_event` 감사 |
| 제출본 파일 열람 | 읽기 | 스냅샷이 참조한 파일 | 교직원·제출 학생 | 위와 같음 + 해당 회차 참조 파일만 | 교직원 열람만 `dc.job_access_event` 감사 |

## 3. 재사용 판정

- 판정: `CREATE_TABLE_AND_API`
- 근거: 포트폴리오는 학생당 여러 벌이고, 생명주기(복제·삭제)가 원본 성장 기록과 독립이며, 버전마다 내용이 달라야 한다. `dc.growth_entry`는 학생당 한 벌의 원본이라 맞지 않는다. `dc.job_resume`은 자소서 본문 한 건이다.
- 재사용: 파일 저장(`dc.file_object`, `files.py`), 지원 트랜잭션, `attachment_kind='PORTFOLIO'`, `portfolio_owner_uid`, `attempt_portfolio_owner` 제약, 감사 테이블, 낙관적 잠금 오류 패턴.
- 문서를 JSONB 한 건으로 둔다: 항상 통째로 읽고 저장하며, 항목별 조회·조인·집계 요구가 없다. **단 목록의 완성 여부와 권한 판정에 쓰는 값은 JSONB에서 꺼내 읽지 않는다**(`is_complete` 컬럼, `job_attempt_portfolio_file` 표. `DB_SCHEMA.md` 2장).
- 제출본은 별도 테이블에 둔다: `job_application_attempt`는 목록·CSV가 자주 읽어 큰 JSONB를 넣지 않는다.

## 4. DDL

마이그레이션 후보: `159_student_portfolio.sql`. 리뷰 시점 최신은 158이다. 시작 전 번호를 다시 확인한다. 데이터 변경(DML)은 없다. 메뉴·코드 행을 더하지 않는다.

```sql
-- 파일 슬롯·소유 종류. 135의 목록을 그대로 두고 더한다.
ALTER TABLE dc.file_object
 DROP CONSTRAINT file_object_owner_kind_check,
 DROP CONSTRAINT file_object_slot_check,
 ADD CONSTRAINT file_object_owner_kind_check CHECK(owner_kind IN
  ('JOB_POSTING','JOB_APPLICATION_ATTEMPT','GROWTH_ENTRY','PROGRAM','PROGRAM_APPLICATION','COUNSEL_REQUEST',
   'STUDENT_PORTFOLIO')),
 ADD CONSTRAINT file_object_slot_check CHECK(slot IN
  ('LOGO','ATTACHMENT','RESUME','PORTFOLIO_ATTACHMENT','PROGRAM_ATTACHMENT','PROGRAM_APPLICATION_ATTACHMENT',
   'COUNSEL_ATTACHMENT','PORTFOLIO_PHOTO','PORTFOLIO_DOCUMENT'));

-- 스냅샷이 회차와 같은 학생임을 DB가 보장하기 위한 복합 FK 대상. 부분 인덱스는 FK 대상이 될 수 없다.
ALTER TABLE dc.job_application_attempt
 ADD CONSTRAINT uq_job_application_attempt_portfolio_owner UNIQUE(id,portfolio_owner_uid);

CREATE TABLE dc.student_portfolio (
 id          text NOT NULL,
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 title       text NOT NULL,
 document    jsonb NOT NULL,
 is_complete boolean NOT NULL DEFAULT false,  -- 목록이 document를 읽지 않기 위한 값. 쓰기 경로에서만 계산한다
 version     bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at  timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 updated_at  timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES dc.person(intg_uid),
 deleted_at  timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 CONSTRAINT pk_student_portfolio PRIMARY KEY(id),
 CONSTRAINT uq_student_portfolio_owner UNIQUE(student_uid,id),  -- 복합 FK 대상이자 삭제 행까지 포함한 학생별 조회 인덱스
 CONSTRAINT ck_student_portfolio_title CHECK(btrim(title)<>'' AND char_length(title)<=60),
 CONSTRAINT ck_student_portfolio_document CHECK(jsonb_typeof(document)='object'
   AND jsonb_typeof(document->'sections')='array'),
 CONSTRAINT ck_student_portfolio_deleted_pair CHECK((deleted_at IS NULL)=(deleted_by IS NULL))
);
CREATE UNIQUE INDEX uq_student_portfolio_title ON dc.student_portfolio(student_uid,title) WHERE deleted_at IS NULL;
CREATE INDEX ix_student_portfolio_listing ON dc.student_portfolio(student_uid,updated_at DESC,id) WHERE deleted_at IS NULL;

CREATE TABLE dc.student_portfolio_event (
 id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 portfolio_id text NOT NULL REFERENCES dc.student_portfolio(id),
 seq          bigint NOT NULL CHECK(seq>0),
 action       text NOT NULL CHECK(action IN ('CREATE','DELETE')),
 actor_uid    text REFERENCES dc.person(intg_uid),
 occurred_at  timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT uq_student_portfolio_event_seq UNIQUE(portfolio_id,seq)
);

CREATE TABLE dc.job_attempt_portfolio (
 attempt_id        text NOT NULL,
 student_uid       text NOT NULL,
 portfolio_id      text NOT NULL,
 portfolio_version bigint NOT NULL CHECK(portfolio_version>0),
 title             text NOT NULL CHECK(btrim(title)<>''),
 document          jsonb NOT NULL CHECK(jsonb_typeof(document)='object'),
 created_at        timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT pk_job_attempt_portfolio PRIMARY KEY(attempt_id),
 CONSTRAINT fk_job_attempt_portfolio_attempt FOREIGN KEY(attempt_id,student_uid)
   REFERENCES dc.job_application_attempt(id,portfolio_owner_uid),
 CONSTRAINT fk_job_attempt_portfolio_source FOREIGN KEY(student_uid,portfolio_id)
   REFERENCES dc.student_portfolio(student_uid,id)
);
CREATE INDEX ix_job_attempt_portfolio_source ON dc.job_attempt_portfolio(student_uid,portfolio_id);

-- 제출본이 참조한 파일. 교직원·제출 학생의 파일 권한을 JSONB 전체 스캔 없이 PK로 판정하고, 파일 행의 물리 삭제를 막는다.
CREATE TABLE dc.job_attempt_portfolio_file (
 attempt_id text NOT NULL REFERENCES dc.job_attempt_portfolio(attempt_id),
 file_id    text NOT NULL REFERENCES dc.file_object(id),
 CONSTRAINT pk_job_attempt_portfolio_file PRIMARY KEY(attempt_id,file_id)
);
CREATE INDEX ix_job_attempt_portfolio_file_file ON dc.job_attempt_portfolio_file(file_id);

CREATE TRIGGER student_portfolio_event_immutable BEFORE UPDATE OR DELETE ON dc.student_portfolio_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER job_attempt_portfolio_immutable BEFORE UPDATE OR DELETE ON dc.job_attempt_portfolio
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER job_attempt_portfolio_file_immutable BEFORE UPDATE OR DELETE ON dc.job_attempt_portfolio_file
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- 기본 권한 설정이 없으므로 빠뜨리면 API가 전부 permission denied다.
GRANT SELECT,INSERT,UPDATE ON dc.student_portfolio TO dc_app;
GRANT SELECT,INSERT ON dc.student_portfolio_event,dc.job_attempt_portfolio,dc.job_attempt_portfolio_file TO dc_app;
```

- 포트폴리오 id는 `spf_` + uuid hex 12자리다(이 저장소의 text id 패턴).
- 학생당 살아 있는 포트폴리오는 20벌까지다. 초과는 422 `PORTFOLIO_LIMIT`.
- 메뉴: `stu-mypage.0` 행은 그대로 둔다. 학년 제한은 프론트 코드에만 있다.
- `is_complete`는 POST·PUT이 같은 트랜잭션에서 계산해 쓴다. 표시 전용이다. **제출 판정은 이 컬럼을 믿지 않고 문서로 다시 계산한다.**
- 논리삭제는 `deleted_at`만 채운다. 행이 남으므로 스냅샷의 FK와 충돌하지 않는다.

### 파일 설계 (`files.py`)

- `ALLOWED`에 `PORTFOLIO_PHOTO`(png, jpg, jpeg), `PORTFOLIO_DOCUMENT`(`PORTFOLIO_ATTACHMENT`와 같은 형식)를 더하고 `store()`의 `owner_kind` 사전에 두 슬롯 모두 `STUDENT_PORTFOLIO`로 더한다. 빠지면 `KeyError`로 500이다.
- 소유자는 포트폴리오가 아니라 학생이다(`owner_kind='STUDENT_PORTFOLIO'`, `owner_id=student_uid`). `files.claim`은 같은 `owner_id`의 재호출을 허용하므로 여러 버전이 같은 파일을 쓸 수 있다.
- 새 업로드 경로 `POST /portfolio-files?slot=&name=`이 필요하다. `/job-files`는 슬롯 정규식이 막고 `/growth-files`는 슬롯이 고정이다. 학생 전용이며 `await files.read_body(request)` 뒤 `run_in_threadpool`로 `files.store`를 호출한다(이미지 재인코딩·동기 DB).
- PUT은 문서가 참조한 파일 전체를 검증한다.

| 위치 | 허용 파일 | 처리 |
|---|---|---|
| `personal.data.photoFileId` | `uploaded_by`=본인, `READY`, 슬롯 `PORTFOLIO_PHOTO` | `files.claim(conn,user,id,'STUDENT_PORTFOLIO',uid,'PORTFOLIO_PHOTO')` |
| `document` 항목의 `fields.fileId` | 위와 같고 슬롯 `PORTFOLIO_DOCUMENT` | 같은 방식으로 claim |
| `document` 항목의 `fields.fileId`(성장 기록 첨부) | `uploaded_by`=본인, `READY`, `owner_kind='GROWTH_ENTRY'`, 슬롯 `PORTFOLIO_ATTACHMENT` | **claim하지 않는다.** 소유 종류가 달라 claim이 403/409를 낸다. 성장 쪽에서 연결을 끊어도 복사본은 유지되므로 현재 연결 여부는 보지 않는다 |
| 그 밖의 전부(타인 파일, `RESUME` 등) | 불가 | 422 `INVALID_FILE` |

- 학생이 참조를 지우거나 버전을 삭제해도 `files.discard`를 부르지 않는다. 다른 버전과 제출본이 쓰고 있을 수 있다. 이번 범위에 파일 삭제 API는 없다.
- 다운로드(학생): 새 `GET /portfolio-files/{file_id}`. 학생 본인(`uploaded_by`)만, `owner_kind='STUDENT_PORTFOLIO'`만. 교직원은 이 경로를 쓰지 않는다(404). 성장 첨부는 기존 `/growth-files/{id}`를 쓴다.
- 다운로드(제출본): 새 `GET /job-applications/{id}/portfolio/files/{file_id}`. 교직원과 제출 학생이 같은 경로를 쓴다. 파일 소유자가 아니라 **지원 회차로 판정한다.** `get_application` → 현재 회차의 `job_attempt_portfolio_file(attempt_id,file_id)` PK 조회 → 교직원이면 감사 → `files.stream`. 학생도 `/portfolio-files`·`/growth-files`로 우회하지 않는다. 그 경로는 `READY`만 열고 제출본에 없는 파일까지 연다. `files.get_file`은 `state='READY'`만 보므로 쓰지 않고 `file_object`를 직접 읽는다. 제출본이 이미 참조한 파일은 나중에 논리삭제돼도 열린다.
- `/job-files/{id}`는 고치지 않는다. 새 소유 종류는 `else` 분기에서 회차를 못 찾아 404가 된다(안전하게 닫힌다). 테스트로 고정한다.
- 바이트 파기 절차(`DB.md` #42)를 만들 때는 `job_attempt_portfolio_file`이 참조한 파일을 제외해야 한다.

## 5. Query와 인덱스

| 동작 | 규모·빈도 | 조건 | 인덱스 |
|---|---|---|---|
| 목록 | 학생당 20행 이하, 탭 열 때·지원 모달 | `id,title,updated_at,version,is_complete`만 읽는다. **document는 읽지 않는다** | `ix_student_portfolio_listing` |
| 상한 검사 | 생성 시 | student_uid, 살아 있는 행 count | `ix_student_portfolio_listing` |
| 제목 중복 | 생성·제목 변경 시 | student_uid + title, 살아 있는 행 | `uq_student_portfolio_title` |
| 자동 번호 | 제목 생략 생성 시 | student_uid 전체 행(삭제 포함) | `uq_student_portfolio_owner` |
| 상세·저장 | 임시저장 시 1건 | id + student_uid + 살아 있는 행 | PK |
| 제출 읽기 | 지원 시 1건 | id + student_uid, `FOR SHARE` | PK |
| 지원자 목록의 첨부 이름 | 페이지당 행 수만큼(기존 N+1) | `current_attempt`의 LEFT JOIN, title만 | `pk_job_attempt_portfolio` |
| 제출본 | 교직원·제출 학생 열람 시 1건 | `get_application` 뒤 (application_id, current_attempt_no) → attempt_id | `job_application_attempt`의 `UNIQUE(application_id,attempt_no)`, PK |
| 제출본 파일 권한 | 파일 1건마다 | attempt_id + file_id | `pk_job_attempt_portfolio_file` |
| 원본 불러오기 | 생성·불러오기 시 | 종류별 일괄 조회 5회 이내, 항목별 쿼리 금지 | `growth_entry_kind`, `job_resume_owner`, `program_apply_student`, `student_cert` PK |

문서 크기 한도: `len(json.dumps(doc, ensure_ascii=False, separators=(',',':')).encode('utf-8')) <= 262144`. 초과는 422 `DOCUMENT_TOO_LARGE`이며 현재 바이트 수를 함께 준다. 몰래 자르지 않는다.

## 6. API 계약

`{identity}`는 본인만 허용한다. 모든 학생 경로의 첫 줄은 `user['kind']!='STUDENT'`이면 403이다. 그 뒤 `jobs.resolve_student`로 본인을 확인한다(타인 404). `growth.resolve_student`는 쓰지 않는다. 모든 SQL은 `id`와 `student_uid`를 함께 건다. 교직원은 미제출 초안을 볼 수 없다.

쓰기(POST 생성·PUT·delete)는 먼저 `pg_advisory_xact_lock(hashtextextended('portfolio:'+uid,0))`를 잡는다. 상한·자동 번호·제목 중복의 조회 후 쓰기를 학생 단위로 직렬화한다(`growth.ensure_profile` 패턴). 그래도 `psycopg.errors.UniqueViolation`은 잡아 409로 바꾼다. 500으로 새지 않는다.

신규 오류는 `HTTPException(status,{'code','message',...})` 형식이다. `roadmap.fail`은 쓰지 못한다. `roadmap.py`가 `jobs.py`를 import하므로 순환이 된다.

| method/path | request | response | 오류·동시성 |
|---|---|---|---|
| GET `/students/{identity}/portfolios` | — | `{items:[{id,title,updatedAt,version,complete}], limit:20}` | |
| POST `/students/{identity}/portfolios` | `{title?, sourcePortfolioId?}` + Idempotency-Key | 전체 DTO + `notImported` | 제목 중복 409 `TITLE_CONFLICT`, 상한 422 `PORTFOLIO_LIMIT`, 복제 원본 없음·타인 404 |
| GET `/students/{identity}/portfolios/{id}` | — | `{id,title,document,version,updatedAt,complete,missing:[...],files:{}}` | 없음·타인 404 |
| PUT `/students/{identity}/portfolios/{id}` | `{title,document,expectedVersion}` | 전체 DTO | `FOR UPDATE` 후 비교. 버전 충돌 409 `VERSION_CONFLICT`(+`currentVersion`), 제목 중복 409, 형식 위반 422, 파일 422 `INVALID_FILE` |
| POST `/students/{identity}/portfolios/{id}/delete` | `{expectedVersion}` | 204 | 버전 충돌 409, 없음 404. 삭제도 `version+1` |
| GET `/students/{identity}/portfolio-source` | — | `{personal:{...},sections:[{key,items:[...]}]}` `document.sections` 항목 형식, 항목마다 `sourceRef` | |
| POST `/portfolio-files?slot=&name=` | 바이트 | `files.file_dto(row,'/api/v1/portfolio-files/')` | 학생 외 403 |
| GET `/portfolio-files/{file_id}` | — | 바이트 | 본인 외 404 |
| POST `/jobs/{posting_id}/applications` | `attachment:{kind:'PORTFOLIO',portfolioId,expectedPortfolioVersion}` | 기존 응답 | 값 누락 422, 미완성 422 `PORTFOLIO_INCOMPLETE`, 버전 불일치 409, 타인·삭제 404. 기존 `RESUME_FILE` 경로 불변 |
| GET `/job-applications/{id}/portfolio` | — | `{attemptNo,title,document,submittedAt,version,files:{}}` | 교직원: 메뉴 없음 403, 범위 밖 404. 학생: 본인 지원만, 타 학생 404. 공통: 현재 회차 첨부가 다르거나 스냅샷 없는 legacy 404. 취소된 지원도 열린다. 교직원 열람만 감사 기록 |
| GET `/job-applications/{id}/portfolio/files/{file_id}` | — | 바이트 | 위와 같음 + 참조하지 않는 파일 404. 교직원 열람만 감사 기록 |

- 제목 생략 시 번호: `SELECT COALESCE(max(substring(title from '^포트폴리오_v([0-9]{1,9})$')::bigint),0)+1 FROM dc.student_portfolio WHERE student_uid=%s`. **삭제 행을 포함한다.** count+1은 중간 삭제 뒤 충돌하고, 번호를 재사용하면 같은 이름의 제출본이 서로 다른 내용을 가리킨다.
- 제목은 `str_strip_whitespace`, 1~60자, NFC 정규화 뒤 저장·비교한다.
- 복제는 살아 있는 본인 문서를 복사하고 번호를 새로 매긴다. `sourcePortfolioId`가 없으면 현재 기록으로 채운다.
- 자동 채움이 256KB나 필드 한도를 넘으면 그 항목은 넣지 않고 `notImported:[{sourceRef,title}]`로 돌려준다. 생성은 실패시키지 않는다. 학생 잘못이 아니기 때문이다(`job_resume.content`는 10만 자까지여서 한 건이 약 300KB일 수 있다). 복제 응답의 `notImported`는 `[]`이다.
- 자동 채움 순서는 아래 표 순서, 각 항목은 최신순이다. `coverLetter`는 가장 최근 수정한 `job_resume` 한 건만 넣고 나머지는 불러오기로 고른다. 데이터가 없는 선택 항목은 `enabled:false`로 만든다.
- POST의 멱등 저장(`remember`)에는 `{id,notImported}`만 넣고 재시도 때 다시 읽어 전체 DTO를 만든다. `dc.idempotency`는 정리 절차가 없어 문서 본문(연락처·주소)을 남기지 않는다.
- `files`는 `{fileId:{id,name,size,contentType,downloadUrl}}` 사전이다. 학생 DTO는 소유 종류에 맞는 경로(`/api/v1/portfolio-files/`, `/api/v1/growth-files/`), 제출본은 `/api/v1/job-applications/{id}/portfolio/files/`를 준다.

### 지원 트랜잭션 (`jobs.py`)

- `Attachment`에 `portfolioId: str|None`, `expectedPortfolioVersion: int|None(ge=1)`을 더한다. 필드가 모델에 있으므로 `body.model_dump_json()` 멱등 digest에 자동 포함된다. 별도 처리는 없다. 조합 검사는 기존처럼 핸들러의 서류 블록에서 한다. 모델 검증으로 옮기면 마감·중복 지원 409보다 422가 먼저 나와 기존 순서가 바뀐다.
- 잠금 순서는 공고 → 지원 → 포트폴리오다. 503 블록 자리에서, 쓰기를 시작하기 전에 `SELECT ... WHERE id=%s AND student_uid=%s AND deleted_at IS NULL FOR SHARE`로 읽고 버전과 완성 여부(문서로 재계산)를 확인한다. PUT·삭제는 이 잠금이 풀릴 때까지 기다린다. 같은 포트폴리오로 다른 공고에 동시 지원하는 것은 막지 않는다.
- 회차 INSERT의 `'RESUME_FILE'` 리터럴과 고정 컬럼을 파라미터로 바꾼다. PORTFOLIO 저장값은 `attachment_kind='PORTFOLIO'`, `attachment_file_id=NULL`, `portfolio_owner_uid=학생`, `attachment_state='AVAILABLE'`이다.
- 순서: 회차 INSERT → `job_attempt_portfolio` INSERT → 참조 파일을 `id=ANY(...) AND uploaded_by=학생 AND state='READY'`로 한 번에 확인(불일치 422 `INVALID_FILE`) → `job_attempt_portfolio_file` INSERT. `files.claim`은 부르지 않는다.
- 스냅샷 문서는 학사값을 최신으로 덮어쓰고 **`enabled:false` 항목을 뺀 것**이다. 학생이 뺀 항목의 입력값이 교직원 API로 나가면 안 된다. 참조 파일도 남은 항목에서만 모은다.
- 재지원은 새 회차와 새 스냅샷을 만든다.
- `current_attempt`에 `LEFT JOIN dc.job_attempt_portfolio jp ON jp.attempt_id=t.id`를 더하고 `COALESCE(f.original_name,jp.title) AS attachment_name`으로 읽는다. **새 DTO 키를 만들지 않고 `jp.document`를 SELECT하지 않는다.** 호출자 5곳(`apply`, `my_applications`, `applications`, `application_detail`, `transition`)이 모두 이 경로를 탄다.
- CSV(`export_applications`)는 바꾸지 않는다. PORTFOLIO 분기가 이미 있고 스냅샷 테이블을 조인하지 않는다.
- `capabilities`: `canApplyWithPortfolio`는 학생에게 `true`, `unavailable`은 `[]`이다. `PORTFOLIO_SERVICE_UNAVAILABLE`을 제거한다.

### 열람 경계와 감사

- **같은 경로에서 분기한다.** `GET /job-applications/{id}/portfolio`와 파일 경로는 `require_staff` 없이 `get_application`을 첫 판정으로 쓴다. 이 함수가 교직원은 `jobs.4`와 `scope_condition`으로, 학생은 `student_uid=본인`으로 이미 나눈다(타 학생 404). `person.kind`는 STUDENT·STAFF뿐이다. 별도 학생 경로를 두면 같은 DTO와 판정이 둘로 갈라진다. 경로 안의 역할 분기는 감사 한 곳뿐이다.
- 회차: 교직원과 학생 모두 **현재 회차**만 본다. `attemptNo` 파라미터를 두지 않는다. 재지원을 `RESUME_FILE`로 했으면 이전 회차의 제출본은 열리지 않는다(404). 스냅샷 행은 남는다.
- 취소된 지원: 상태를 검사하지 않는다. 취소해도 `current_attempt_no`와 스냅샷이 그대로이고, 지원 내역 카드도 남으므로 학생·교직원 모두 열람할 수 있다. 공고가 논리삭제돼도 같다.
- 학생 응답은 교직원과 같은 DTO다. 스냅샷에는 `enabled:false` 항목이 없다.
- 실제 열람자는 `jobs.4` 메뉴 보유자다. 현재 로컬에서 이 메뉴의 역할은 `career`뿐이다. 메뉴관리에서 다른 역할에 주면 함께 열린다. 범위 판정은 `scope_condition`을 따른다.
- 감사: `INSERT INTO dc.job_access_event(actor_uid,action,target_kind,target_id,filter_hash,row_count)`. 제출본은 `('VIEW_DOCUMENT','JOB_ATTEMPT_PORTFOLIO',attempt_id,sha256(attempt_id),1)`, 파일은 기존 `/job-files`와 같은 `('VIEW_DOCUMENT','FILE',file_id,sha256(file_id),1)`이다. `action` CHECK는 두 값뿐이고 `VIEW_DOCUMENT`가 이미 있으며 `target_kind`는 제약이 없다. **제약 변경은 필요 없다.** 본문·PII는 넣지 않는다. **`user['kind']=='STAFF'`일 때만 쓴다.** 학생의 본인 열람은 제3자 접근이 아니고 `/job-files`의 학생 분기도 감사하지 않는다.

### document 형식 (`schemaVersion: 1`, pydantic `extra='forbid'`)

```json
{"schemaVersion":1,"sections":[{"key":"personal","enabled":true,"data":{}},{"key":"language","enabled":true,"items":[{"id":"...","sourceRef":"growth:abc","verified":false,"title":"...","fields":{}}]}]}
```

| key | 사진의 항목 | 필수 | 자동 채움 | 학생 입력 | `fields` 허용 키 |
|---|---|---|---|---|---|
| personal | 인적사항 | 예 | 이름·학번·학교·학과·학년(읽기 전용), 이메일·휴대폰·자기소개(`growth_profile`) | 사진, 영문명, 생년월일, 주소 | `data`: name, studentNo, school, dept, grade, email, phone, intro, photoFileId, nameEn, birthDate, address |
| education | 학력사항 | 예 | 창원대 재학 행(읽기 전용), 학점(`detail.gpa`, 없으면 빈 값) | 다른 학력 행, 입학·졸업, 전공 | schoolName, degree, track(계열), major, additionalMajorType(전공 추가), additionalMajor, status(졸업 구분), admissionType(입학 구분), admittedOn, graduatedOn, gpa, gpaScale(기준학점) |
| military | 병역사항 | 아니오 | 없음 | 사진의 필드 전체 | serviceType, branch, rank, startOn, endOn, dischargeType, exemptionReason |
| training | 교육사항(NCS) | 아니오 | 수료한 비교과(`outcome_code='COMPLETED'`) | 추가 입력 | organizer, startOn, endOn, hours, description |
| experience | 경험사항 | 아니오 | PROJECT, JOURNAL 항목 | 추가 입력 | organization, role, startOn, endOn, description, result, link |
| career | 경력사항 | 아니오 | 없음 | 입력 | company, department, position, employmentType, startOn, endOn, description |
| language | 어학 | 아니오 | LANGUAGE | 추가 입력 | language, testName, scoreText, issuer, acquiredOn, description |
| certificate | 자격증 | 아니오 | CERTIFICATE + 학사 인증 `academicCerts`(인증 표시 유지) | 추가 입력 | issuer, certNo, scoreText, acquiredOn, description |
| skill | 보유 스킬 | 아니오 | SKILL | 추가 입력 | level, description |
| award | 수상경력 | 아니오 | AWARD | 추가 입력 | host, rank, awardedOn, description |
| overseas | 해외경험/경력 | 아니오 | 없음 | 입력 | country, purpose, startOn, endOn, description |
| volunteer | 봉사활동 | 아니오 | 없음 | 입력 | organization, startOn, endOn, hours, description |
| coverLetter | 자기소개서 | 아니오 | `job_resume`을 문항 한 건으로 | 회사별 문항 + 답변 쌍 추가·수정 | question, answer |
| document | 포트폴리오 및 기타문서 | 아니오 | 성장 기록 첨부를 고를 수 있음 | 파일 첨부 | fileId, description |
| specialty | 특기사항 | 아니오 | 없음 | 입력 | description |
| careerDescription | 경력기술서 | 아니오 | 없음 | 입력 | company, description |

**검증 범위.** `extra='forbid'`는 위 모델의 바깥 키만 막는다. `data`·`fields`를 `dict`로 두면 임의 JSON이 그대로 들어가므로 아래를 서버에서 전부 검사한다.

- `sections`는 16개 키를 각각 정확히 한 번 담는다. 빠짐·중복·모르는 키는 422다. `personal`만 `data`, 나머지는 `items`다.
- `fields` 키는 위 표의 허용 목록만 받는다. 값은 문자열이며 `skill.level`만 정수 1~5다. 중첩 객체·배열은 422다. 빈 값은 빈 문자열이다.
- 길이: `id` `^[A-Za-z0-9_-]{1,64}$`(항목 안에서 유일), `sourceRef` 100자, `title` 200자, 날짜·짧은 값 200자, `intro`·`description`·`result` 10,000자(성장 기록 원본 한도와 같다), `coverLetter.answer` 100,000자(`job_resume.content` 한도와 같다).
- 항목 수: 항목당 50건, `document`는 10건.
- `\u0000`과 짝이 맞지 않는 서로게이트는 422다. JSONB가 거부해 500이 되고, 크기 계산의 UTF-8 인코딩도 예외를 낸다.
- `experience.fields.link`는 `http://`, `https://`만 받는다. 화면은 문서 값을 HTML로 넣지 않는다(`dangerouslySetInnerHTML` 금지).
- `schemaVersion`은 정확히 1이다.

**학사 유래 값.** `portfolio_document.apply_academic(document, student, certs)` 한 함수를 GET·PUT·제출이 모두 쓴다. 클라이언트 값은 무시한다.

- `personal.data`: `name`, `studentNo`, `school`(`국립창원대학교`), `dept`(`major_label`), `grade`는 `growth.profile_dto`와 같은 `dc.student` 값으로 쓴다. 회차의 `snapshot_values`와 출처가 같아 제출본 안에서 어긋나지 않는다.
- `education`: `sourceRef='academic:enrollment'` 항목을 맨 앞에 둔다(없으면 만든다). **학사 키만 덮어쓴다**: `schoolName`(`국립창원대학교`), `major`(`major_label`), `status`(`detail.enrollmentStatus` 없으면 `재학`), `gpa`(`detail.gpa`). 나머지 키(`degree`, `track`, `additionalMajorType`, `additionalMajor`, `admissionType`, `admittedOn`, `graduatedOn`, `gpaScale`)는 학사 원본에 없으므로 학생 입력을 보존한다. 행 자체는 지울 수 없다. `gpaScale`은 추정해 채우지 않는다.
- `certificate`: `sourceRef='cert:{certId}'` 항목은 `dc.student_cert`·`dc.cert`의 값으로 다시 쓰고 `verified`도 그 행에서 읽는다. 행이 없으면 `sourceRef=null`, `verified=false`로 내려 일반 항목이 된다. **그 밖의 항목은 `verified=false`로 강제한다.** 위조한 인증 표시가 제출본에 남지 않아야 한다.
- GET에서 적용한 값은 저장하지 않고 `version`도 올리지 않는다.

**`sourceRef` 형식**: `growth:{entryId}`, `program:{programId}`, `resume:{resumeId}`, `cert:{certId}`, `academic:enrollment`. 중복 거르기에만 쓰며 권한 근거로 쓰지 않는다.

**`JOURNAL` 매핑**: `description`은 `desc`, `situation`, `action`, `learning` 중 값이 있는 것을 빈 줄로 잇고, `role`·`result`는 같은 이름으로 옮긴다. 필드 한도를 넘으면 잘라 넣지 않고 `notImported`로 돌린다.

- 항목을 빼면 `enabled:false`로만 두어 입력값을 잃지 않는다. 필수 두 항목은 뺄 수 없다(서버 검증).
- `complete`는 personal의 이름·이메일·휴대폰과 education 한 행 이상이다. `missing`은 `personal.name`, `personal.email`, `personal.phone`, `education` 중 빠진 것의 목록이다.
- 불러오기는 프론트가 `sourceRef`로 중복을 거른다. 이미 있는 항목은 덮어쓰지 않고, 추가할 항목을 학생이 고른 뒤 저장한다. `personal`의 이메일·휴대폰·자기소개는 칸별로 고른다.
- 학사 유래 칸은 입력 불가다(코드 규칙 1). PUT이 값을 보내도 서버가 학사값으로 덮어쓴다.
- 이름 변경도 전체 PUT이다. 목록에서 바꿀 때는 상세를 읽어 `document`와 함께 보낸다.

## 7. mock → API 매핑

mock 없음. 원본 → 문서 매핑은 6장 표를 따른다. 없는 값은 빈 값이며, 합성 연락처를 만들지 않는다.

## 8. 구현 파일

- DDL: `backend/migrations/159_student_portfolio.sql`
- FastAPI:
  - 새 `backend/app/portfolio_document.py`: 문서 모델·검증·크기·`apply_academic`·완성 판정·스냅샷 변환. `fastapi`, `pydantic`, `files`만 import한다. **`jobs`·`growth`·`roadmap`을 import하지 않는다.** `jobs.py`가 이 모듈을 쓰고 `growth`·`roadmap`이 `jobs`를 import하므로 순환을 끊는 자리다.
  - 새 `backend/app/student_portfolio.py`: 학생 라우터, 원본 투영, `/portfolio-files`. `jobs`·`growth`·`portfolio_document`를 import해도 된다. `main.py`에 등록한다.
  - `jobs.py`: 지원 경로, `current_attempt`, capability, 교직원·학생 공용 제출본·파일 경로(`get_application`을 쓴다).
  - `files.py`: 슬롯, `store()` 사전.
  - `growth.py` 모듈 설명의 「jobs 는 계속 503」 문구와 `jobs.py`의 503 주석을 고친다.
- 프론트 데이터: 새 `shared/portfolioStore.ts`. `shared/studentCache` 재사용, 쓰기 후 재조회와 `dc:portfolio-updated` 발행. `src_admin/data/jobApplications.ts`의 `applyToJob`은 첨부를 판별 유니언으로 받는다. `attachmentLabel`은 PORTFOLIO 행에서 `attachmentName`(제목)을 덧붙인다. `src_admin/data/schema/jobApplication.ts`의 「provider 미착수」 주석을 고친다
- 학생 화면:
  - `src_v2/pages/mypage/Portfolio.tsx`에 탭 `versions` 추가(TabId, TabDef). 기존 5개 탭의 동작은 바꾸지 않는다
  - 새 `src_v2/pages/mypage/portfolio/*`: 목록(새로 만들기, 복제, 이름 변경, 삭제), 편집기, 미리보기
  - 항목 패널은 사진 구조를 따르고 임시저장 시각을 보여 준다. 900px 이하는 패널이 본문 위로 접힌다
  - 미리보기는 `ResumeSheet`의 인쇄 스타일을 재사용하고 PDF는 `window.print()`다
  - 409 `VERSION_CONFLICT`는 덮어쓰지 않고 최신본을 다시 읽도록 안내한다. `notImported`가 있으면 어떤 항목이 빠졌는지 표시한다
- 사진: 파일 API는 교직원 인증이 헤더라 `<img src>`로 열리지 않는다. `shared/JobLogo.tsx`처럼 blob으로 읽어 표시하는 공통 컴포넌트를 쓰고, 인쇄는 이미지 로드가 끝난 뒤 호출한다
- 학년 제한 해제: `App.tsx` 154~155행, `GNB.tsx` 70행, `navConfig.ts` 149행의 `minGrade`, `GrowthHome.tsx` 270행의 「4학년부터 제공」 안내. `GrowthHome`의 다른 `isSenior` 분기는 유지한다
- 지원 모달: `JobApplyModal.tsx`에서 포트폴리오 선택지를 활성화하고, 고르면 내 포트폴리오 목록을 보여 준다. 미완성은 비활성 + 이유 + 편집 링크, 0건이면 만들기 링크. **제출 시 연락처 등 내용이 교직원에게 공개된다는 안내를 표시**한다(D06: 연락처는 본인 전용이다). 이것은 고지이며 `DB.md` #43의 동의 기록이 아니다. 동의 문안을 새로 짓지 않는다
- 교직원: `JobApplicants.tsx`의 PORTFOLIO 행에 「제출본 보기」, 새 인쇄 라우트(`CounselRecordPrint` 패턴, `staffPageLoader`)와 「PDF 저장」. 파일은 `files` 사전의 `downloadUrl`을 쓴다. `attachmentUrl`은 `attachmentFileId`가 없으므로 PORTFOLIO에서 null을 그대로 둔다
- 학생 지원 내역: `MyApplications.tsx` 카드에서 `currentAttempt.attachmentKind==='PORTFOLIO'`이면 「제출본 보기」를 보인다. 취소된 카드도 같다. 새 라우트 `/mypage/applications/:id/portfolio`(`src_v2/App.tsx`, `MyApplications`와 같은 게이트 없는 마이페이지 영역)로 이동하고, 읽기 전용이며 편집·PDF 저장 버튼을 두지 않는다. 404는 빈 화면 대신 안내와 지원 내역 링크를 준다. 목록 진입 때 제출본을 미리 읽지 않는다. 클릭할 때만 호출해 지원 내역의 API 수를 늘리지 않는다
- 제출본 표시 컴포넌트는 학생·교직원 화면이 공유한다. 두 SPA가 쓰므로 CSS는 `var(--x, 폴백)`을 쓰고 admin 데스크톱 폭에서도 깨지지 않게 한다. 조회는 `shared/portfolioStore.ts`의 함수 하나이며 `studentCache`에 넣지 않는다. 교직원 열람마다 감사가 남아야 한다
- 문서: `DB_SCHEMA.md`, `DB.md` §8-3 4번(301행), 324·356·362·640행의 503 문구, `SPEC.md`, `STU_README.md`

## 9. 자동 검증 게이트

- 계약 테스트: `backend/tests/contracts/test_student_portfolio_contract.py`, fixture exact key·nesting·type
- 기능 테스트: `backend/tests/test_student_portfolio.py`
- 권한: 타 학생 404, 교직원의 초안·원본·파일 경로 403 또는 404(6장 표), **학생이 본인 제출본·파일 경로 호출 시 200(취소된 지원 포함)**, **다른 학생의 제출본·파일 경로 404**, 학생이 제출본에 없는 본인 파일을 그 경로로 호출 시 404, `RESUME_FILE`로 재지원한 뒤 이전 제출본 404, `jobs.4` 없는 교직원 403, 범위 밖 교직원 404, 스냅샷이 참조하지 않는 파일 404, 타인 파일 ID를 문서에 넣으면 422, `/job-files/{id}`로 새 소유 파일 접근 404
- 동시성: 버전 충돌 409, 제목 중복 경쟁 409(500 아님), 21벌 동시 생성에서 살아 있는 행 20 이하, 지원 Idempotency 재시도, 제출과 PUT 동시 실행 시 스냅샷이 한쪽 버전과 정확히 일치
- 불변성: 제출 후 원본 수정·삭제해도 제출본 동일, 스냅샷·파일 참조 UPDATE·DELETE 거부, 재지원 시 회차별 스냅샷, 다른 학생의 포트폴리오로 스냅샷 행을 넣으면 복합 FK 위반
- 규칙: 필수 항목 제거 거부, 학사값 위조 무시, 창원대 행의 학사 키는 덮어쓰고 `track` 등 학생 입력 키는 보존, **`verified` 위조 무시**, **`enabled:false` 항목과 그 파일이 제출본에 없음**, 256KB 초과 422(한글 바이트 기준), 허용 외 `fields` 키·중첩 값 422, `\u0000` 422, 20벌 초과 422, 미완성 제출 422, 자동 번호가 중간 삭제 뒤 충돌하지 않고 재사용되지 않음, 큰 `job_resume`으로 생성해도 201 + `notImported`
- 파일: 여러 버전이 같은 파일 참조, 버전 삭제 뒤에도 제출본 파일 열림, 성장 첨부 참조(소유 종류 유지), 논리삭제된 참조 파일을 제출본 경로로 열림
- 감사: 교직원의 제출본·파일 열람 시 `job_access_event` 1행, 실패 시 0행, **학생 본인 열람 시 0행**
- `RESUME_FILE` 지원 회귀: 기존 `test_jobs.py` 통과. 단 `test_portfolio_submission_is_not_faked`(503·`False` 단정)는 이번 변경의 의도된 교체 대상이다. PORTFOLIO 값 누락 422와 capability `True`로 바꾼다
- 명령: 대상 pytest(기존 실패 4건은 사용자 지시로 보고에서 제외), `npx.cmd tsc -b`, `npm run build`
- 왕복 QA: 생성 → 편집·항목 제거 → 저장 → 재조회 → 지원 첨부 → 학생 지원 내역의 제출본 보기 → 교직원 열람 → PDF 인쇄 화면(사진 포함, 뺀 항목 없음)

## 10. 완료 조건

- [x] 현재 revision에 Astra `ASTRA_APPROVED`(revision 3)
- [ ] fixture를 구현 검수 전에 팀장이 대조·승인
- [ ] migration이 빈 테스트 DB와 기존 fixture DB에 적용됨
- [ ] 계약 테스트 통과
- [ ] 권한·오류·동시성·불변성 테스트 통과
- [ ] 프론트가 store/selector만 사용
- [ ] `npm run build` 통과
- [ ] `DB_SCHEMA.md`, `DB.md` 갱신
- [ ] 팀장 왕복 QA와 최종 `PASS`

## 11. 범위 밖

기업회원 열람, 상담사 첨삭, AI 문구 생성, 서버 PDF 생성, 공고별 문항 자동 연결, 기존 5개 탭의 동작 변경(「이력서 PDF」 버튼이 토스트만 띄우는 기존 문제 포함), 파일 삭제 API·바이트 파기, 과거 회차 제출본 조회, 지원자 목록의 기존 `current_attempt` N+1 해소.
