# student-portfolio 설계 리뷰

- 판정: `ASTRA_APPROVED`
- 승인 revision: `3` (`work-order.md`). 재리뷰 결과는 맨 아래 「revision 3 재리뷰」에 있고, 그 내용이 이 문서의 앞선 서술보다 우선한다. revision 1은 교정 전 상태이므로 승인하지 않았다.
- 리뷰일: 2026-11-06
- 입력: `work-order.md` r1, `DB_SCHEMA.md`, `DB.md`, `AGENTS.md`, `.ai/interop.md`, `backend/app/{files,jobs,growth,auth,db,migrate,upload_security}.py`, 관련 migration(002·006·018·022·025·135·156·157), `backend/tests/test_jobs.py`, `tests/contracts/README.md`, `shared/api.ts`, `shared/JobLogo.tsx`, `JobApplyModal.tsx`, `jobApplications.ts`, 로컬 `dreamcatch` 읽기 전용 조회
- 사용자 확정 0장은 바꾸지 않았다.

## 승인의 한계

- **159 DDL은 어떤 DB에서도 실행하지 않았다.** `AGENTS.md` 3장이 승인 전 적용을 금지한다. DDL의 문법·제약 동작은 Sol이 `_test` DB에 적용해 처음 확인한다. 실패하면 임의로 고치지 말고 `BLOCKED_BY_WORK_ORDER`로 기록한다.
- **사용자 제공 사진은 저장소에 없어 대조하지 못했다.** 6장 `fields` 허용 키는 항목 이름에서 추정한 기술 계약이다. 팀장이 사진과 대조해 키를 바꾸면 JSON 계약 변경이므로 revision을 올리고 재승인을 받는다.
- 성능은 측정하지 않았다. 로컬은 지원 회차 0건, 파일 6건, 학생 19명이라 실행 계획이 의미가 없다. 표의 인덱스 대응은 설계 판단이다.
- 운영 서버의 `job_application_attempt`·`file_object` 행 수는 확인하지 않았다.
- Atlas 공유 기억 도구가 이 세션에 없어 조회·저장하지 않았다. Graft는 MCP가 없어 CLI로 `current_attempt`·`attempt_dto` 호출자를 확인했다. `files.claim`은 그래프에 호출자가 없어 직접 검색했다. ECC `database-reviewer`는 쓰지 않았다.

## 스킬별 적용 결과

두 파일 모두 직접 읽었다.

### postgres-patterns

| 기준 | 결과 |
|---|---|
| 동등 조건 먼저, 복합 인덱스 순서 | 통과. `(student_uid,updated_at DESC,id)`, `(student_uid,title)` |
| 부분 인덱스 | 통과. 살아 있는 행만. 이름은 표준대로 교정(`uq_`·`ix_`) |
| FK 인덱스 누락 탐지 | **교정.** r1은 `student_uid`의 인덱스가 부분 인덱스뿐이라 삭제 행까지 보는 조회를 받치지 못했다. `UNIQUE(student_uid,id)`로 해결. 스냅샷의 `(student_uid,portfolio_id)`, 파일 참조의 `file_id` 인덱스 추가 |
| 타입: text·timestamptz·boolean | 통과. id는 skill의 bigint 권고 대신 저장소 전체의 text id 규약을 따른다 |
| JSONB 인덱스(GIN) | 해당 없음. **문서 내부를 조회 조건으로 쓰지 않게 설계를 바꿔** GIN이 필요 없다 |
| Cursor pagination | 해당 없음. 학생당 20행 상한 |
| RLS | 해당 없음. 저장소는 API에서 권한을 검사한다(`DB_SCHEMA.md` 2장). `dc_app` 권한은 표마다 최소로 부여 |
| UPSERT·큐 패턴 | 해당 없음 |

### database-migrations

| 기준 | 결과 |
|---|---|
| 스키마와 데이터 마이그레이션 분리 | 통과. 159에 DML 없음 |
| 불변·forward-only | 통과. 새 파일 159. 번호는 최신 158 재확인(파일 158개, 로컬 적용 158건) |
| NOT NULL 컬럼 추가 | 해당 없음. 기존 표에 컬럼을 더하지 않는다 |
| 인덱스 CONCURRENTLY | **예외 승인.** 신규 표는 비어 있어 불필요. 기존 표의 `UNIQUE(id,portfolio_owner_uid)`는 CONCURRENTLY를 못 쓴다. `migrate.py`가 대기 중인 파일 전체를 한 트랜잭션으로 실행하기 때문이다. 표가 작아 수용한다. 아래 위험 2 |
| 운영 규모 테스트 | 미수행. 위 한계 참고 |
| 복구 계획 | 아래 절에 기록 |
| UP/DOWN | DOWN 파일 규약이 없다. 저장소는 앱 우선 복구 + 추가 객체 보존(135·157과 같은 방식) |

## 교정한 설계와 근거

### 기능이 동작하지 않았을 결함

1. **`dc_app` 권한 누락.** `pg_default_acl`이 비어 있다. GRANT 없이는 모든 API가 permission denied다. 4장에 추가.
2. **`complete`와 「목록은 document를 읽지 않는다」가 모순.** `complete`는 문서에서만 나온다. `is_complete` 컬럼으로 물질화하고 쓰기 경로를 POST·PUT으로 한정. 제출 판정은 문서로 재계산한다. 규칙 3(파생값 분리)의 예외이며 `DB_SCHEMA.md` 2장의 「갱신 계약과 함께」 조건을 맞췄다.
3. **순환 import.** `growth`·`roadmap`이 `jobs`를 import한다. `jobs.apply`가 `student_portfolio`를 쓰면 순환이다. 의존 없는 `portfolio_document.py`로 분리. 같은 이유로 `roadmap.fail`을 쓸 수 없다.
4. **파일 경로 부재.** 업로드는 `/job-files`(슬롯 정규식)와 `/growth-files`(슬롯 고정) 모두 불가, 다운로드는 `/job-files`의 `else`가 `owner_id`를 회차 ID로 해석해 404다. 전용 경로 추가. `store()`의 사전도 빠지면 `KeyError`다.
5. **`files.claim`이 성장 첨부를 거부.** `row['owner_kind']!=owner_kind`로 403이다. r1의 「성장 기록 첨부를 고를 수 있음」이 동작하지 않는다. 성장 첨부는 claim 없이 참조만 검증한다.
6. **교직원 사진 표시 불가.** 교직원 인증은 `X-DC-Identity` 헤더라 `<img src>`로 열리지 않는다. `JobLogo` 패턴을 명시.

### 개인정보·권한 결함

7. **`enabled:false` 항목이 제출본으로 유출.** 입력값을 보존하는 설계라 문서를 그대로 복사하면, 학생이 뺀 병역·주소 등이 교직원 API 응답에 실린다. 스냅샷 변환에서 제거하고 참조 파일도 남은 항목에서만 모은다.
8. **학생이 제출본 경로를 통과.** `get_application`은 학생 본인을 허용한다. 0장 7번과 어긋나 `require_staff`를 앞에 둔다.
9. **`verified` 위조.** 학사 인증 표시를 클라이언트가 보낼 수 있었다. 서버가 `dc.student_cert`에서만 정한다. `cert:*` 항목의 값도 학사 유래이므로 덮어쓴다(규칙 1).
10. **교직원 파일 권한 판정이 JSONB 전체 스캔.** r1의 「해당 파일을 참조하는 `job_attempt_portfolio`를 볼 권한」은 파일 ID로 스냅샷을 찾아야 한다. `job_attempt_portfolio_file` 표를 두고, 경로를 회차 기준으로 바꿔 PK 한 건으로 판정한다. `/growth-files`를 재사용하지 않는 이유도 있다. 그 경로는 `staff_student_scope`만 봐서 학사 미러 학생에게 상담사가 막힌다.
11. **`dc.idempotency`에 PII 영구 저장.** 표에 정리 절차가 없고 앱 권한은 SELECT·INSERT뿐이다. POST 응답 전체를 넣으면 연락처·주소가 남는다. `{id,notImported}`만 저장.
12. **오류 코드 표기.** 「권한 없는 교직원 403」은 절반만 맞다. 메뉴 없음 403, 범위 밖 404다.

### 무결성·동시성 결함

13. **소유권 복합 FK 누락.** `DB_SCHEMA.md` 2장 규칙. 스냅샷에 `student_uid`를 두고 양쪽을 복합 FK로 묶는다. 회차에 `UNIQUE(id,portfolio_owner_uid)` 추가. 전체 UNIQUE라 NULL 행은 영향이 없다.
14. **상한 20벌 경쟁.** count 후 INSERT는 동시 요청에 뚫린다. 학생 단위 advisory lock으로 직렬화.
15. **자동 번호.** count+1은 중간 삭제 뒤 충돌한다. 살아 있는 행만의 max는 번호를 재사용해 같은 이름의 제출본이 다른 내용을 가리킨다. 삭제 행 포함 max+1로 고정.
16. **제목 경쟁.** advisory lock 위에 `UniqueViolation`→409도 둔다. 500 금지(`feedback_upload_endpoint_checklist`).
17. **제출 시 포트폴리오 잠금 미지정.** 버전 확인과 스냅샷 사이에 PUT이 끼면 확인한 버전과 다른 내용이 들어간다. `FOR SHARE`로 잠근다. 잠금 순서 공고→지원→포트폴리오, PUT·삭제는 advisory→행이고 지원은 advisory를 잡지 않으므로 순환 대기가 없다.

### JSONB 검증

18. **`extra='forbid'`가 `data`·`fields` 안을 막지 못한다.** 16개 항목의 허용 키, 값 타입, 항목 수, 필드 길이를 명시. 사진의 필드를 볼 수 없어 키는 추정이다(한계 참고).
19. **`\u0000`·외톨이 서로게이트.** JSONB가 거부해 500, UTF-8 측정에서도 예외다. 422로 막는다.
20. **256KB 정의와 자동 채움 충돌.** 측정 방식이 없었다. `job_resume.content`는 10만 자라 한글 한 건이 약 300KB로 한도를 넘고, `JOURNAL`도 필드 7개 × 1만 자다. 생성 자체가 422가 되면 학생이 고칠 방법이 없다. 넘는 항목은 넣지 않고 `notImported`로 알린다. 조용히 자르지 않는다는 원칙은 유지된다.

### 정리

21. `current_attempt`의 `attachment_name`이 PORTFOLIO에서 null이다. 새 DTO 키 없이 `jp.title`로 채운다. 기존 계약 키는 그대로다.
22. `test_jobs.py`는 그대로 통과하지 않는다. `test_portfolio_submission_is_not_faked`가 503과 `False`를 단정한다. 의도된 교체로 명시.
23. `tests/contracts/fixtures/`가 없다. README 규칙상 구현 전 팀장 승인이 필요하다.
24. `제출 행위가 공개 동의다`를 고지로 고쳤다. `DB.md` #43은 임시 동의 문안을 금지하고 공통 모델을 요구한다.
25. 객체 이름을 `DB_SCHEMA.md` 1장 표준으로 교정. DB_SCHEMA에 ERD와 설계 요약을 더했다(미구현 표기).

### 확인 결과 문제가 없던 지점

- `claim`의 재귀속 검사는 같은 `owner_id`를 허용하므로 학생 소유 공유 설계가 맞다.
- `Attachment` 필드 추가는 `model_dump_json()` digest에 자동 포함된다.
- `attempt_portfolio_owner` CHECK, `attachment_kind` CHECK는 PORTFOLIO를 이미 허용한다. `attempt_resume_file`도 영향 없다.
- CSV는 PORTFOLIO 분기가 이미 있다.
- 논리삭제와 FK는 공존한다. 행을 지우지 않고 키도 바꾸지 않는다.
- `job_access_event`는 `VIEW_DOCUMENT`를 이미 허용하고 `target_kind`는 자유 값이다. 제약 변경이 필요 없다.
- `jobs.4`는 활성이다. 156이 끈 것은 `jobs.1`·`jobs.2`다.
- 학년 제한 위치 4곳이 코드와 일치한다. 백엔드에 학년 제한은 없다.
- `person.kind`는 STUDENT·STAFF뿐이다.
- 본문 크기는 nginx `client_max_body_size 12m`이 막는다. 별도 본문 리더는 만들지 않는다.

## 예상 주요 query와 인덱스

| 동작 | SQL 요지 | 인덱스 | 빈도 |
|---|---|---|---|
| 목록 | `SELECT id,title,updated_at,version,is_complete WHERE student_uid=? AND deleted_at IS NULL ORDER BY updated_at DESC,id` | `ix_student_portfolio_listing` | 탭 진입, 지원 모달 |
| 상한 | `count(*)` 같은 조건 | `ix_student_portfolio_listing` | 생성 |
| 제목 중복 | `student_uid=? AND title=? AND deleted_at IS NULL` | `uq_student_portfolio_title` | 생성·제목 변경 |
| 자동 번호 | `max(substring(title ...)) WHERE student_uid=?` | `uq_student_portfolio_owner` | 제목 생략 생성 |
| 상세·저장 | `id=? AND student_uid=? AND deleted_at IS NULL FOR UPDATE` | PK | 임시저장 |
| 제출 | 같은 조건 `FOR SHARE` | PK | 지원 |
| 첨부 이름 | `current_attempt` LEFT JOIN, `jp.title`만 | `pk_job_attempt_portfolio` | 지원자 목록 |
| 제출본 | `attempt_id=?` | PK | 교직원 열람 |
| 파일 권한 | `attempt_id=? AND file_id=?` | `pk_job_attempt_portfolio_file` | 파일 열람 |
| 원본 불러오기 | 종류별 일괄 5회 이내 | `growth_entry_kind`, `job_resume_owner`, `program_apply_student`, `student_cert` PK | 생성·불러오기 |

8천 명 규모: 주 경로가 모두 학생 키 또는 PK 조회라 학생 수에 비례해 느려지지 않는다. 최악 용량은 8,000 × 20 × 256KB ≈ 41GB지만 상한일 뿐이다. 실측값이 아니다. 저장은 버튼 동작이다. 자동 저장을 넣으면 쓰기량 판단이 달라지므로 다시 리뷰한다.

## 위험·migration·rollback

1. **`file_object` CHECK 교체**는 ACCESS EXCLUSIVE와 전체 검사를 쓴다. 135와 같은 방식이고 로컬 6행이다.
2. **`UNIQUE(id,portfolio_owner_uid)`** 도 빌드 동안 쓰기를 막는다. 서버 적용을 지시받으면 먼저 행 수를 확인한다. 지원이 없는 시간대가 안전하다.
3. **단일 트랜잭션 runner.** 실패하면 대기 중인 파일 전체가 롤백된다.
4. **fixture 퇴역 마이그레이션.** 062·104·106처럼 학생을 물리 삭제하는 새 작업은 트리거 해제와 함께 새 표 세 개의 삭제 순서를 넣어야 한다. 적용된 파일은 고치지 않는다.
5. **논리삭제 문서의 PII 보관.** 삭제해도 `document`가 남는다. `job_resume`과 같은 패턴이며 파기 정책은 `DB.md` #42 범위다.
6. **미참조 파일 누적.** 참조를 지워도 파일은 남고, 업로드 뒤 저장하지 않은 파일도 남는다. 기존 `/growth-files`와 같다.
7. **배포 직전 재시도.** `RESUME_FILE`의 digest에 null 키 두 개가 늘어 배포를 걸친 같은 키의 재시도는 409가 된다. 수 초 창이라 수용한다.

**복구.** 앱을 먼저 이전 이미지로 되돌린다. 이전 앱은 새 표를 읽지 않고 PORTFOLIO를 503으로 거절하므로 안전하다. 표·제약·파일은 보존한다. `file_object` CHECK를 좁히는 것은 새 슬롯 행이 없을 때만 가능하다. 제출본이 있으면 스키마를 되돌리지 않는다. 제출 전이고 사용자가 지시한 경우에만 새 forward 마이그레이션으로 표를 지운다. `npm run docker:up`은 적용 전 DB 백업을 만든다. 파일 볼륨은 DB 백업에 포함되지 않는다(#42).

## JSON 호환성 테스트

- fixture `student_portfolio.json`: 목록, 상세(`files`·`missing` 포함), POST 응답(`notImported` 빈 값·있는 값), `portfolio-source`, 제출본. 16개 섹션 전체와 `sourceRef` null, `verified` 참·거짓 변형을 넣는다.
- `assert_same_json_shape`로 key·nesting·type을 비교한다.
- 기존 계약 불변: `attempt_dto` 키 집합 동일, `attachmentName`이 RESUME_FILE에서 원래 파일명(`test_jobs.py:338`), capability 키 집합 동일(`unavailable`은 `[]`).
- 스냅샷 응답 `document.sections`에 `enabled:false`가 없음.

## Sol 실행 순서

1. `backend/migrations/`의 최신 번호를 다시 확인한다.
2. 팀장 승인을 받은 fixture를 만든다.
3. `159_student_portfolio.sql`을 쓰고 **`_test` DB에만** 적용한다. 다른 DB에 적용하기 전에 스키마 제약 테스트를 돌린다.
4. `files.py` 슬롯·사전을 고친다.
5. `portfolio_document.py`와 단위 테스트(검증, 크기, 학사 덮어쓰기, 완성 판정, 스냅샷 변환)를 만든다.
6. `student_portfolio.py`를 만들고 `main.py`에 등록한다.
7. `jobs.py`를 고친다: `Attachment`, `apply`, `current_attempt`, capability, 교직원 경로 두 개, 감사.
8. `test_portfolio_submission_is_not_faked`를 교체하고 9장 테스트를 쓴다. 계약 테스트를 통과시킨다.
9. `shared/portfolioStore.ts`, `jobApplications.ts`를 고친다.
10. 학생 화면, 지원 모달, 학년 제한 해제를 한다.
11. 교직원 제출본·인쇄 화면을 만든다.
12. `npx.cmd tsc -b`, `npm run build`, 대상 pytest를 돌린다.
13. 문서를 갱신하고 `implementation.md`를 쓴다. `DB_SCHEMA.md`의 「미구현·미적용」 표기를 고친다.
14. 팀장 왕복 QA로 넘긴다. EgoLite로 탭 진입 호출 수를 측정 기준(7건)과 비교한다.

## 사용자 결정

승인을 막는 항목은 없다. 아래는 지금 설계대로 진행하되 팀장이 사용자에게 확인할 수 있는 사항이다. 구현 뒤 바꾸면 revision이 필요하다.

1. **학생이 자기가 제출한 내용을 다시 볼 수 없다.** 0장 7번을 문자 그대로 적용했다. 학생은 제목만 보고, 원본을 고쳤으면 제출 당시 내용을 알 방법이 없다.
2. **열람자가 `jobs.4` 보유 역할, 현재 `career`뿐이다.** 교수·조교·심리상담사는 지원자 관리 화면이 없어 제출본도 못 본다.
3. **제출 시 안내만 하고 동의 기록은 남기지 않는다.** 생년월일·주소·병역까지 담길 수 있다. 동의 이력이 필요하면 `DB.md` #43의 공통 모델과 운영 담당자의 문안이 필요하다.

## revision 3 재리뷰

- 판정: `ASTRA_APPROVED`
- 승인 revision: `3`(Astra 교정 반영본). 범위는 revision 3에서 바뀐 부분뿐이다.
- 스킬 적용: 스키마·인덱스·마이그레이션 변경이 없어 두 스킬의 판정은 위와 같다. 새 조회는 기존 `UNIQUE(application_id,attempt_no)`와 PK를 쓴다. 159 DDL은 그대로이고 이번에도 어떤 DB에서도 실행하지 않았다.

### 사용자 확정 반영

1. 제출 학생 본인은 읽기 전용으로 본다. 위 교정 8번(`require_staff`)과 사용자 결정 1번을 대체한다.
2. 교직원 범위는 `jobs.4` 권한자로 유지한다. 사용자 결정 2번이 닫혔다.
3. 공개는 안내 문구만, 동의 이력은 없다. 사용자 결정 3번이 닫혔다.

### 학생 열람 확정

| 쟁점 | 결정 | 근거 |
|---|---|---|
| 경로 | 같은 `/job-applications/{id}/portfolio`에서 분기 | `get_application`이 학생·교직원을 이미 나눈다. 별도 경로는 같은 DTO와 판정의 복제다 |
| `require_staff` | 제거. `get_application`이 첫 판정 | `person.kind`는 두 값뿐이고 어느 쪽도 이 함수를 그냥 통과하지 못한다 |
| 파일 다운로드 | 같은 `/portfolio/files/{file_id}` 사용 | `files` 사전의 URL이 하나로 유지된다. `/portfolio-files`는 `READY`만 열어 제출본 불변성을 지키지 못한다 |
| `job_attempt_portfolio_file` 판정 | 역할과 무관하게 동일. 현재 회차의 `attempt_id`+`file_id` PK | 학생도 제출본 경로로는 제출본에 없는 본인 파일을 열지 못한다 |
| 감사 | 학생 열람은 쓰지 않는다. `STAFF`일 때만 INSERT | 제3자 접근 기록이 목적이다. `/job-files`의 학생 분기와 같다 |
| 회차 범위 | 현재 회차만, 교직원과 동일 | 지원 내역 카드와 DTO가 현재 회차만 갖는다. 전체 회차는 회차 목록 API가 새로 필요하다 |
| 취소된 지원 | 열람 허용, 상태 검사 없음 | 취소해도 `current_attempt_no`와 스냅샷이 남고 카드도 남는다 |
| 학생 PDF | 버튼을 두지 않는다 | 0장은 학생에게 읽기 전용 열람만 정했다 |

재지원을 `RESUME_FILE`로 하면 이전 제출본은 학생·교직원 모두 열 수 없다(404, 행은 보존). 필요해지면 `attemptNo`를 추가하는 계약 변경이다.

### 팀장 변경 검토

- education 필드 5개: 모두 문자열 200자로 처리되어 크기 한도와 검증 규칙에 영향이 없다. 사진 대조로 위 「승인의 한계」의 education 부분은 해소됐다. 다른 항목의 대조 범위는 팀장이 확인한다.
- **교정:** revision 2의 「창원대 행을 지우고 다시 만든다」는 새 필드를 저장할 때마다 지운다. `track`, `admissionType` 등은 학사 원본에 없다. 학사 키 4개(`schoolName`, `major`, `status`, `gpa`)만 덮어쓰고 나머지는 보존하도록 바꿨다. `gpaScale`은 추정해 채우지 않는다.
- fixture: 구현 전 승인을 검수 전 대조로 바꾼 것을 수용한다. `tests/contracts/README.md`의 「구현 전 승인」과는 다르므로 6장과 다른 key는 `BLOCKED_BY_WORK_ORDER`로 처리하는 조건이 유지돼야 한다. 10장 체크 항목을 같은 문구로 맞췄다. 위 Sol 실행 순서 2번은 「6장대로 fixture를 쓴다」로 읽는다.

### 프론트·테스트 반영

- 8장: `MyApplications.tsx`의 「제출본 보기」, 새 라우트 `/mypage/applications/:id/portfolio`, 학생·교직원 공유 표시 컴포넌트. 클릭 시에만 호출하고 `studentCache`에 넣지 않는다.
- 9장: 학생 본인 200(취소 포함), 타 학생 404, 제출본에 없는 파일 404, 재지원 뒤 이전 제출본 404, 학생 열람 감사 0행, 창원대 행 입력 보존.
- Sol 실행 순서 11번에 학생 제출본 화면을 포함한다.
