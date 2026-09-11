# 채용·취업(jobs) DB 전환 설계

- 작성: 2026-09-09 / codex-db-architect / C2
- 대상: `DB.md` §8-3 #2 / 현재 개발 PostgreSQL·FastAPI 배선
- 상태: `DRAFT_FOR_OPUS_REVIEW`
- 조사 근거·충돌 대장: [01-current-state.md](01-current-state.md)
- **설계만 작성했다. 아래 테이블·API·수정 대상·검증은 모두 후속 구현 제안이며 현재 구현 사실이 아니다.** 승인 파일·Opus 리뷰·DDL·소스·테스트를 이번 작업에서 만들지 않는다.

## 1. 범위와 승인 단위

비교과의 `018_program_operations.sql` → `programs.py` → `test_programs.py` → `shared/programStore.ts` → `src_admin/data/programs.ts` 구조를 채용에 적용한다. 공고·지원·상태이력·집계를 SQL로 옮기되 program 테이블에 채용 데이터를 넣거나 비교과의 선발/출석/수료 코드를 채용 상태로 사용하지 않는다.

| 묶음 | 이번 설계의 완결 범위 | 실행·공개 조건 |
|---|---|---|
| J1 파일 독립 핵심 | 기업 식별, 공고 텍스트·분류·마감, 전형, 학생 찜, 텍스트 자소서, 권한·통계·CSV·이관 계약 | C3 검증 및 C4 승인 후 구현 가능. 파일 입력은 capability로 비활성화 |
| J2 지원 상태 엔진 | 지원자/회차/동의 영수증/상태이력, 게이트·멱등·동시성·취소·재지원 | 합성 테스트 데이터로 독립 검증 가능. **실제 신규 제출은 유효 서류 공급과 동의 정책 없이는 열지 않음** |
| J3 파일 연계 | 공통 FileRef의 공고 로고·본문·첨부·지원서 소유 계약 | #41 결정 후 공통 파일 설계·구현 및 왕복 검증 필요. 물리 저장 방식은 미확정 |
| J4 포트폴리오 접점 | 학생 소유 라이브 포트폴리오 참조·인가 | DB.md #4의 실제 영속 provider 필요. INITIAL_*를 provider로 승인하지 않음 |
| 별도 후속 | 실제 AI 생성/평가/추천, 사람 첨삭 요청·의견, 기업 회원 로그인, Oracle 대량 이관 | 각각 AI/포트폴리오/인증/운영 이관 책임. 이번 UI 저장 전환으로 완료 처리하지 않음 |

J1·J2 완료만으로 jobs 도메인을 “완료”로 바꾸지 않는다. 지원의 기존 필수 서류를 선택사항으로 변경해 차단을 숨기지 않는다. 파일을 전혀 쓰지 않는 J1의 동작·스키마·API는 아래에서 확정 가능한 설계로 제시한다. DB.md §9 #41의 “착수 전” 문구와 이번 설계 작성 요청은, **미결을 유지한 조건부 설계 작성**으로 양립한다.

## 2. 기존 구조 재사용과 코드 체계

### 2.1 재사용/확장/신규 판정

| 데이터 | 판정 | 이유 |
|---|---|---|
| 학생·직원·현재 소속 | `dc.person`, `dc.student`, `dc.staff`, `dc.student_list`, `dc.staff_student_scope` 조회 재사용 | 현재 서비스 UID FK 사용. 기업/지원에 학사 마스터 복제 금지 |
| 운영 코드 | `dc.code_group`, `dc.code_item`, metadata revision/API 재사용 | 구조 코드와 운영 선택지 분리, 비활성 과거 코드 표시 보존 |
| 진단·유형·상담·로드맵 | 현재 테이블 조회 + 취업 게이트 서비스 추가 | 유형 점수/판정식·로드맵 새 세대 모델을 jobs에서 만들지 않음 |
| 멱등·이력 방어 | `dc.idempotency`, `dc.reject_history_change()` 재사용 | 프로그램과 같은 DB 트랜잭션, jobs 전용 route namespace |
| 기업 | 신규 `dc.job_company` | 회사명 문자열은 식별자 아님. `COM_COMP_INF` 사전과 `COM_CPRT_MEBR` 회원을 합치지 않음 |
| 공고·지원·전형·찜·자소서 | jobs 전용 신규 테이블 | 직무 사전/직무 관심, program_apply와 의미·생명주기 불일치 |
| 파일 | 후속 공통 file 모델 참조 | jobs_attachment 전용 바이너리/저장경로 테이블 금지 |
| 포트폴리오 | 외부 도메인 provider 조회 | 라이브 공유를 유지. 제출 당시 전체 포트폴리오 복제 금지 |

### 2.2 코드 분류

구조값은 도메인별 TS 타입 및 SQL CHECK의 대응을 테스트한다. `source=manual|external`, `recruit_type=GENERAL|RECOMMENDATION`, 게시 상태 `POSTED|CLOSED`, 마감 방식 `DATE|ALWAYS|ON_HIRE`, 지원 상태 `APPLIED|IN_PROGRESS|PASSED|REJECTED|CANCELED`, 제출종류 `PORTFOLIO|RESUME_FILE` 및 이벤트 action은 구조 코드다. NULL인 레거시 값은 UNKNOWN으로 표시하되 새 쓰기에서 허용하지 않는다. 구조 코드의 운영자 임의 추가 금지.

기업구분·근무형태·직종·경력구분·성별 선택지·근무지역·자소서 분야는 운영 코드 제안이다. 그룹명은 각각 `JOB_COMPANY_TYPE`, `JOB_EMPLOYMENT_TYPE`, `JOB_CATEGORY`, `JOB_CAREER_TYPE`, `JOB_GENDER`, `JOB_REGION`, `JOB_RESUME_CATEGORY`. §9 #40에 따라 Opus가 기존 그룹과 중복 여부를 확인하고 같은 의미 그룹이 있으면 그 그룹을 재사용한다. 현재 상수의 모든 라벨을 초기 seed로 보존하고 stable code와 명시 매핑한다. 라벨을 FK로 사용하지 않는다. `전체` 지역은 UI 필터 sentinel이며 DB 지역 항목으로 저장하지 않는다(공고의 지역 제한 없음은 관계행 0개).

분류 삭제 대신 비활성화한다. 새 지정에는 활성 코드만, 변경하지 않은 기존 값의 저장에는 과거 비활성 값도 허용한다. `jobType`은 이름과 달리 신입/경력 표시값이므로 `career_primary_code`로 매핑하며 근무형태와 섞지 않는다. 복수 `careerTypes`와 별개로 현재 대표 표시 필드를 보존한다. 태그는 자유 문구라 별도 운영 코드가 아니다. 임의 전역 codes/ 폴더는 만들지 않는다.

## 3. 논리 스키마와 제약

사람이 작성하는 `backend/migrations/<다음 미사용 번호>_job_operations.sql`이 후속 DDL 정본이다. 019라고 선점하지 않고 구현 당시 migration head를 확인한다. flat `backend/app/jobs.py`와 필요할 때 같은 디렉터리의 정책 모듈을 사용한다. ORM/DB 재설치·전역 디렉터리 개편은 범위 밖이다.

이 절의 공통 규칙:

- 서비스 ID는 `text` PK, 새 값은 서버 UUID 문자열, 이관 시 검증된 기존 문자열 ID 보존. 학생/actor는 `dc.person(intg_uid)`, 학생 소유자는 `dc.student(intg_uid)` FK. FK 실제 컬럼명은 migration 정본과 일치시킨다.
- 업무 날짜는 `date`, 시각은 `timestamptz`; KST 날짜 경계 사용. 새 행 시각·actor는 서버가 채운다. `version bigint NOT NULL DEFAULT 1 CHECK(version>0)`.
- mutable 루트에는 `created_at/created_by/updated_at/updated_by`, 필요한 논리삭제에는 `deleted_at/deleted_by`를 둔다. legacy actor는 NULL 가능하며 임의 상담사로 채우지 않는다.
- FK 삭제 기본은 RESTRICT/NO ACTION. 본문·이력·동의를 cascade로 지우지 않는다. 찜 같은 종속 관계도 삭제 API에서 명시 처리한다. DB hard delete를 서비스 사용자에게 부여하지 않는다.
- 기존 미입력 필드는 nullable로 수용한다. 새 API는 필수값을 검증하고 `record_origin=LIVE|LEGACY`로 출처를 구분한다. LEGACY 지정은 이관 경로만 허용한다. 유효하지 않은 관계·ID는 NULL로 뭉개지 않고 검역한다.

### 3.1 기업·공고·분류

| 테이블 | 컬럼·키·제약 |
|---|---|
| `job_company` | id PK; display_name text NOT NULL; company_type_group/code nullable composite FK(code_item), group 고정; website_url text nullable; source_system/source_key nullable; version·audit·deleted_at. source 두 값은 같이 존재하거나 같이 NULL, 존재 시 UNIQUE(source_system,source_key). 회사명 UNIQUE 금지 |
| `job_posting` | id PK; company_id FK NOT NULL(검증된 기업으로만 이관), company_name_snapshot text NOT NULL; role text NOT NULL; tags text[] NOT NULL default '{}'; salary_text/location_text text nullable; career_primary_group/code nullable FK; source 구조값 NOT NULL; source_system/source_key nullable UNIQUE pair; recruit_type nullable; stored_status nullable; deadline_mode nullable; deadline_date date nullable; deadline_raw text nullable(레거시 원문 보존); posted_at timestamptz nullable; salary_negotiable/url_title_link/email_apply bool nullable; apply_url/email/content_html text nullable; content_format `HTML|TEXT` NOT NULL; record_origin; version·audit·deleted_at |
| `job_posting_option` | posting_id FK, kind `EMPLOYMENT|CATEGORY|CAREER|GENDER|REGION`, group_code/code composite FK; PK(posting_id,kind,code), CHECK로 kind↔group 대응 고정. 필터용 INDEX(kind,code,posting_id) |
| `job_posting_event` | id PK, posting_id FK, seq bigint, action `CREATE|UPDATE|CLOSE|REOPEN|DELETE|STAGES_CHANGE|IMPORT`, before/after jsonb, reason nullable, actor_uid nullable, occurred_at NOT NULL; UNIQUE(posting_id,seq). append-only. 파일 바이너리·자소서·전체 지원자 목록을 payload에 넣지 않음 |

LIVE 공고는 `recruit_type/stored_status/deadline_mode/posted_at` 필수. DATE는 date 필수, ALWAYS는 date NULL, ON_HIRE는 현재 폼이 산출하는 기한을 date로 보존(§4). LEGACY의 모호한 날짜는 raw와 nullable parsed 값을 함께 보존하고 제출 불가로 반환한다. 회사명/직무 빈 문자열, 잘못된 URL·email은 새 API에서 거부한다.

로고·본문 이미지·첨부는 §8의 공통 FileRef에 귀속된다. J1은 그 테이블 존재를 전제하는 FK/SQL JOIN을 만들지 않는다. DTO의 파일 목록은 capability false일 때 빈 목록과 상태를 명시한다. 기존 file name/data URL은 이관 검역 산출물에서 추적하며 새 정상 파일처럼 저장하지 않는다. 본문 이미지를 제외한 텍스트를 사용할 경우 원본과 달라진 부분을 이관 보고서로 확인한다.

company 수정은 회사명 사전만 바꾸며 기존 공고의 표시 스냅샷을 소급 변경하지 않는다. 공고 편집에서 기업 재선택 시 해당 공고의 snapshot을 갱신하고 이력 기록. 동일 이름을 자동 통합하거나 사업자번호를 새 필수 항목으로 요구하지 않는다. 기업 삭제는 참조가 있으면 409 COMPANY_IN_USE, 참조 없으면 논리삭제. 회사 회원 가입/인증을 생성하지 않는다.

목록 인덱스: posting(source,recruit_type,posted_at DESC,id), posting(stored_status,deadline_date,id), posting(company_id), 활성 행 partial index(deleted_at IS NULL). 검색은 회사 snapshot/role의 parameterized ILIKE로 시작하며 검색량을 측정한 뒤 trigram 도입을 별도 판단한다. 집계치를 JSON/별도 mutable counter로 중복 저장하지 않는다.

### 3.2 전형

`job_stage`: id text PK, posting_id FK, system_key nullable `REVIEW|FORWARD`, position integer >0, name text NOT NULL, version, audit, deleted_at. UNIQUE(posting_id,id), 활성 position에 UNIQUE(posting_id,position) partial index, system_key 존재 시 UNIQUE(posting_id,system_key). 활성 position은 1부터 연속으로 API에서 검증한다.

추천 manual 공고 생성 시 실체화: 내부 두 단계(`sys_review`/서류 검토, `sys_forward`/기업 전달) + 기본 3단계(서류 전형/면접 전형/최종 결과). 서버 ID는 공고별로 유일하게 만들고 DTO의 `systemKey`로 구분한다. 기존 공통 `sys_review`를 전역 stage PK로 쓰지 않는다. legacy `<jobId>__default_N` 매핑은 import에서 실체화한다.

내부 단계의 이름·삭제·위치·순서는 수정 불가. 사용자 단계만 이름·순서 편집/추가/논리삭제 가능하며 전체 집합 변경을 한 트랜잭션으로 한다. 재정렬은 임시 순서 영역을 사용해 UNIQUE 충돌을 피한 뒤 최종 연속 순서 검증. IN_PROGRESS가 현재 점유한 단계는 삭제 불가. terminal 지원의 참조는 삭제된 stage 행으로 보존한다. 단계 ID를 다른 공고로 이동할 수 없다.

활성 지원이 있는 공고의 재정렬은 현재 코드처럼 **다음 진행 시점의 현재 순서**를 사용한다. 이미 지났던 단계가 재등장할 수 있음을 편집 화면과 이벤트로 드러낸다. 이를 지원별 전형 고정판으로 바꾸려면 별도 업무 결정이 필요하며 이번 설계에서 임의 변경하지 않는다. 현재 단계가 소실된 legacy 지원은 자동 진행하지 않고 DATA_REPAIR_REQUIRED.

### 3.3 지원·회차·불변 이력

| 테이블 | 컬럼·키·제약 |
|---|---|
| `job_application` | id PK; posting_id FK; student_uid FK(student); UNIQUE(posting_id,student_uid), UNIQUE(posting_id,id); current_attempt_no int >0; status nullable 구조값; current_stage_id nullable; applied_at/canceled_at timestamptz nullable; record_origin; version·audit. 복합 FK(posting_id,current_stage_id)→job_stage(posting_id,id). canceled_at은 CANCELED일 때만 값 허용 |
| `job_application_attempt` | id PK; application_id FK, attempt_no int >0, UNIQUE(application_id,attempt_no); submitted_at timestamptz nullable; student_no/name/major_label/grade/enrollment_status/college_code/college_label/dept_code/dept_label/course_code/student_type 등 `snap_*` nullable 컬럼; attachment_kind nullable; portfolio_owner_uid nullable FK(student); attachment_state `AVAILABLE|MISSING_BINARY|DEPENDENCY_UNAVAILABLE|UNKNOWN`; legacy_file_name nullable; eligibility_evidence jsonb nullable; record_origin; created_by/created_at. append-only |
| `job_application_event` | id PK; application_id FK; posting_id FK 및 복합 FK(posting_id,application_id); attempt_no; seq bigint >0; action `APPLY|REAPPLY|ADVANCE|REJECT|PASS|CANCEL|IMPORT`; from_status/to_status nullable; from_stage_id/to_stage_id nullable 및 각각 posting 복합 FK; from_stage_name/to_stage_name nullable 스냅샷; reason nullable; actor_uid nullable; actor_name_snapshot nullable; occurred_at timestamptz nullable(legacy 미상), recorded_at NOT NULL; UNIQUE(application_id,seq); FK(application_id,attempt_no)→attempt. append-only |

application의 `(id,current_attempt_no)`→attempt(application_id,attempt_no) FK는 DEFERRABLE INITIALLY DEFERRED로 설정한다. 첫 신청에서 application→attempt 삽입 순환을 transaction 끝에 검증한다. event.seq는 잠긴 application의 새 version 값을 사용하되 최초 1부터 시작한다. 각 지원 변경은 정확히 한 version 증가·한 event를 생성한다. 게시물 수정은 application version을 바꾸지 않는다. legacy 이벤트를 가져올 때는 import 순서대로 seq를 배정하되 원본 ID/time/order를 매핑 보고서에 남긴다.

새 attempt의 스냅샷은 서버가 현재 학생 데이터에서 생성한다. 클라이언트 제공 학번·성명·소속·상태·actor는 무시하지 말고 DTO extra forbid로 거부한다. 값이 학사 정본에 없는 경우 NULL과 미상 표시를 사용한다. 현재 인가/필터용 소속은 snapshot과 분리한다. 진단유형은 현재 서버 유형 근거를 저장하되 과거 레거시 신청에 현재 유형을 소급 입력하지 않는다.

PORTFOLIO는 portfolio_owner_uid=지원자 조건, RESUME_FILE은 portfolio_owner_uid NULL. 파일 연결은 공통 FileRef의 ownerId=attempt.id(§8)로 표현한다. J2는 바이너리 존재를 스스로 증명하지 않으며 서류 검증 provider가 AVAILABLE이라고 확인한 경우에만 LIVE attempt를 생성한다. attempt의 attachment_state는 제출 당시의 검증 사실이고 이후 접근 가능성은 provider를 다시 조회한다. 파일이 삭제/격리되더라도 과거 제출 사실·이력은 보존한다.

취소 후 재지원은 application.id 유지, attempt_no+1 및 새 attempt/event 생성, status APPLIED, current_stage NULL, canceled_at NULL, applied_at 새 시각. **직전 제출 스냅샷·서류 귀속·취소 이력을 덮어쓰지 않는다.** 기존 브라우저가 덮어쓴 과거 snapshot은 복구 불가로 표시하고 추측하여 만들지 않는다. 같은 학생·공고의 별도 application 행을 생성하지 않는다.

지원자 목록 INDEX(posting_id,status,applied_at DESC,id), 내 지원 INDEX(student_uid,applied_at DESC,id), 현 단계 INDEX(posting_id,current_stage_id) WHERE status='IN_PROGRESS', 이벤트 INDEX(application_id,attempt_no,seq), attempt INDEX(application_id,attempt_no DESC). 지원·attempt·event hard delete 금지. 공고 논리삭제 후에도 해당 학생/인가 직원의 지원 기록 조회는 최소 공고 snapshot과 함께 유지한다.

### 3.4 동의 기록

spec_v1 §5.4의 지원 동의와 SPEC의 동의 분리 원칙을 위해 `job_consent_policy`와 `job_application_consent`를 설계한다. 현재 승인 문안이 없으므로 초기 활성 동의 seed를 만들지 않는다.

- policy: id PK, policy_key text, revision int, title/body text, body_hash text, effective_from timestamptz, effective_to nullable, required bool, published_at nullable, approved_by nullable FK(person), created_at. UNIQUE(policy_key,revision). 게시 이후 본문 수정/삭제 금지, 변경은 새 revision. 활성 기간 중복은 같은 policy_key의 기간 exclusion 또는 잠금된 게시 API로 방지한다.
- receipt: id PK, attempt_id FK, policy_id FK, student_uid FK, accepted_at timestamptz, body_hash, purpose_snapshot/recipient_snapshot nullable. UNIQUE(attempt_id,policy_id), append-only. accepted=false는 제출을 거부하며 동의한 것처럼 저장하지 않는다.
- 유효 policy set 조회→사용자가 읽고 동의→신청 트랜잭션에서 동일 revision/hash/활성기간 재검사→attempt와 receipt 동시 INSERT. 동의가 바뀌었으면 409 CONSENT_CHANGED. 서버가 자동 체크하거나 과거 지원에 동의를 생성하지 않는다. 실제 문안·제공 대상·보관 범위는 D02 결정 필요.

정책 편집 공개 UI는 이번 범위 밖이며 승인된 정책을 관리 migration/운영 절차로 발행한다. 기존 공통 동의 모델이 후속 구현 시 먼저 생겼다면 의미·version·소유권이 같은지 확인 후 재사용한다.

### 3.5 찜·텍스트 자소서

`job_wishlist`: student_uid FK, posting_id FK, created_at; PK(student_uid,posting_id), INDEX(student_uid,created_at DESC,posting_id). POST toggle 대신 PUT 추가/DELETE 제거를 멱등 동작으로 제공한다. 조회는 현재 identity만. 논리삭제 공고는 일반 찜 목록에서 제외하고 unavailableCount로 구분하거나 해제 가능 상태로 보여주며 아무 공고로 치환하지 않는다.

`job_resume`: id PK, student_uid FK, title text NOT NULL, company_text/job_type_text/position_text nullable, category_group/code nullable FK(code_item), category_label_legacy nullable, content text NOT NULL, origin `USER|AI_ASSISTED|LEGACY` NOT NULL, ai_result_ref nullable text, created_at/updated_at, created_by/updated_by, version, deleted_at/deleted_by. created_at은 수정 때 유지한다. INDEX(student_uid,updated_at DESC,id) WHERE deleted_at IS NULL. AI_ASSISTED의 실제 근거가 없는 timeout 예시는 LIVE AI 결과로 입력하지 않는다. 사용자가 편집·저장한 본문은 USER, legacy 사용자 문서는 LEGACY로 보존할 수 있다. AI DB FK를 서비스 DB에 만들지 않는다.

`job_resume_event`: id PK, resume_id FK, seq bigint, action CREATE/UPDATE/DELETE/IMPORT, changed_fields text[], actor_uid FK nullable, occurred_at, UNIQUE(resume_id,seq), append-only. 본문 전체를 이력에 중복 적재하지 않는다. 문서 버전 복원 기능은 현재 요구가 아니며 삭제 이후 보관/파기 기간은 별도 승인 정책을 따른다.

이 테이블은 resumeMock의 텍스트 문서 정본이다. portfolio.ts의 r1~r3와 합치지 않는다. 사람 첨삭 상태를 content나 application.status에 끼워 넣지 않는다. 향후 포트폴리오 도메인의 review request는 `(documentKind='JOB_RESUME', documentId, submittedVersion)`을 참조하고, 제출 시점 사본 필요 여부는 그 도메인의 업무 계약으로 정한다. 이번에는 “첨삭 완료” 같은 실적을 생성하지 않는다.

## 4. 업무 판정·상태 전이

### 4.1 마감·지원 가능 여부

`effectiveStatus`는 서버가 응답마다 계산한다. deleted→UNAVAILABLE, stored CLOSED→CLOSED, DATE/ON_HIRE에서 KST 오늘>deadline_date→CLOSED, 그 외 POSTED. 마감일 당일 23:59:59 KST까지 열림. 날짜가 미상인 legacy는 UNKNOWN 및 apply 불가. UI status는 이 effective 값으로 목록·정렬·버튼을 통일하고 storedStatus는 관리 DTO에 별도로 둔다.

현재 `deadlineOnHire`는 폼에서 1개월 뒤 날짜를 계산해 저장한다. 이관은 저장된 date를 보존하고 날짜를 오늘 기준으로 다시 연장하지 않는다. 새 ON_HIRE는 기존 폼의 달력 1개월 계산 방식과 같은 산출값을 서버에서 결정해 반환한다(월말 넘침 포함 실제 JobForm 계산을 parity test). 진짜 무기한 “채용 시까지”로 변경하려면 D05. ALWAYS는 기존 `상시` 입력에만 대응한다. 명시 CLOSED를 날짜 변경만으로 자동 재게시하지 않는다.

내부 신규 신청 조건은 active posting + manual + RECOMMENDATION + effective POSTED + 취업 게이트 충족 + 유효 서류 + 필요한 동의 + 기존 지원 없음 또는 CANCELED. external 추천 seed/일반 공고의 교내 신청을 허용하지 않는다. 기존 지원의 취소와 직원 진행/탈락 처리는 공고 마감 이후에도 가능하다. 새 재지원에는 마감/게이트/서류/동의를 모두 다시 검사한다.

### 4.2 서버 취업 게이트

학생용 `GET /jobs/eligibility`와 신청 transaction에서 같은 판정 함수를 사용한다. 근거는 `PROCESS.md`, `careerProcess.ts` 및 현재 migrations다.

1. principal 본인 student UID로 `dc.diagnosis_attempt`의 test_id='ccore', status='DONE' 존재 확인.
2. 현재 유형은 `dc.student_list`와 같은 최신 type event 우선 규칙을 재사용한다. `dc.student_type_code`는 011 이후 view라는 점을 따른다. 유형 문자열만으로 검사 완료를 인정하지 않는다.
3. 현재 T1~T6에 대응하는 c1~c6 DONE 존재. 대응은 careerProcess의 구조 매핑과 서버 테스트로 일치시킨다. 점수/심리검사/분류 알고리즘 추가 금지.
4. 본인의 counsel_request 중 CAREER 또는 JOB 의미의 진로취업, care_track='care7', status='DONE'. 일반/general·psych·prof·NULL을 임의로 care7로 보정하지 않는다.
5. 본인의 `dc.roadmap.confirmed=true`. 존재 여부나 has_roadmap만 사용하지 않는다. 현재 PK는 student_uid이며 없는 roadmap generation/counsel FK를 가정하지 않는다.

응답 `{eligible, reasons:[{code,message}], evidenceVersion}`. reason 예: CORE_REQUIRED, TYPE_REQUIRED, FOLLOWUP_REQUIRED, CARE7_REQUIRED, ROADMAP_CONFIRMATION_REQUIRED. 완료율 100%·특정 유형/tier·프로그램 접근범위를 추가 조건으로 만들지 않는다. evidenceVersion은 근거 ID·version/확정값으로 만든 opaque fingerprint이지 새 판정 버전 시스템이 아니다. 서버 attempt에는 조회 시점 근거를 기록한다.

현재 데이터만으로 “현재 로드맵이 특정 상담에서 생성됨”을 엄밀히 연결할 FK가 없다. PROCESS보다 더 엄격한 회차 연계 조건은 이번에 만들지 않는다. 게이트와 신청은 한 transaction의 일관된 읽기 snapshot으로 판정하며 외부 도메인 쓰기와의 전역 잠금이 있는 것처럼 주장하지 않는다.

학생 공고 탐색·상세·찜·새 자소서 접근은 기존 취업지원 StageGate 의미를 유지하고 상세 직접 URL도 보강한다. 서버의 신규 사용은 동일 gate로 검사한다. **이미 제출한 자신의 이력 열람·취소, 기존 자소서 조회/수정/삭제, 찜 해제는 게이트가 뒤로 잠겨도 소유권으로 허용**하여 기록·문서 접근을 잃지 않게 한다. 이 예외는 Opus가 PROCESS와 대조할 항목이며 새로운 지원은 허용하지 않는다.

### 4.3 전이표

| 요청 | 이전 | 이후 / 처리 |
|---|---|---|
| 최초 지원 | 없음 | APPLIED, currentStage=NULL, attempt=1, APPLY |
| 다음 단계 | APPLIED | IN_PROGRESS, 내부 REVIEW, ADVANCE |
| 다음 단계 | IN_PROGRESS이며 다음 활성 단계 있음 | IN_PROGRESS, next stage, ADVANCE |
| 다음 단계 | IN_PROGRESS이며 마지막 활성 단계 | PASSED, 현재 마지막 stage 유지, PASS |
| 탈락 | APPLIED 또는 IN_PROGRESS | REJECTED, 현재 stage 유지, REJECT; 사유 선택(§9 #21을 필수로 결정하지 않음) |
| 지원 취소 | APPLIED 또는 IN_PROGRESS | CANCELED, canceledAt=now, currentStage=NULL; event에는 직전 stage 보존 |
| 재지원 | CANCELED | 새 회차 APPLIED, REAPPLY; 이전 회차 불변 |
| 그 외 | PASSED/REJECTED 포함 | 409 INVALID_TRANSITION |

임의 targetStage/status를 PATCH로 받지 않는다. advance/reject/cancel intent API만 제공한다. 되돌리기·합격 취소·terminal 재지원은 기존 기능이 아니며 별도 결정 없이 추가하지 않는다. history는 currentAttemptNo와 모든 회차 목록을 제공하며 기본 timeline은 현재 회차, 과거 회차는 구분하여 펼친다.

## 5. 권한·트랜잭션·오류

### 5.1 인가

개발 인증은 기존 `get_principal` 경로를 재사용한다. X-DC-Identity/개발 토큰을 실서비스 SSO로 포장하지 않는다. body/query studentId는 권한 근거가 아니다.

| 주체 | 공고/기업 | 지원·이력·통계·CSV | 자소서·서류 |
|---|---|---|---|
| 학생 | gate 범위 읽기, 자신의 찜 | 자기 것만 조회/신청/취소 | 자기 자소서 CRUD, 자기 제출 서류 |
| 진로취업 상담사 | 관리 메뉴 권한을 가진 active career 직원의 CRUD | `staff_student_scope`에 현재 포함된 학생만 | 지원 회차의 제출 서류/동의한 라이브 portfolio만. 학생의 전체 개인 자소서 목록 접근 불가 |
| 명시적 총괄/관리자 | 활성 auth 역할·기간과 메뉴 정책 검증 | 해당 역할이 명시적으로 허용한 전체 범위 | 업무에 필요한 제출 문서만; 사적 자소서의 자동 전체공개 금지 |
| 심리·교수·조교·비인가 STAFF | 채용 관리 거부 | 거부 | 거부 |

`require_staff`만 사용하지 않는다. `administration.py`의 유효 auth_user/auth_role 검사 재사용. AUTH0006 관리자는 실제 활성 부여 확인, AUTH0005 등 총괄은 기존 계약상의 부여/메뉴가 있을 때만 허용한다. role label/부서명에 “센터”가 들어간다고 전권 부여하지 않는다. 개발 fixture_student_scope도 현행 view의 명시 배정만 따른다.

모든 지원 SQL은 동일 `jobs_student_scope(principal)` predicate를 적용한다. 목록·상세·이력·전형별 count·summary·export·문서 다운로드에서 조건 누락 금지. auth.student_access의 “과거 상담 담당이면 허용” OR 경로는 재사용하지 않는다. 현재 소속 없음은 추정 매핑하지 않고 범위 밖 처리. 직원이 공고를 관리할 수 있어도 범위 밖 학생 수/PII는 알 수 없다. 직원용 totalCount와 통계는 **인가된 집합의 크기**이다. 공고 조회 DTO에 전역 지원자 수를 노출하지 않는다.

보호된 객체는 인가되지 않은 id에 404, 관리 기능 자체 미허용은 403. 본인 문서/지원은 소유권을 먼저 검사한다. PII CSV는 화면과 동일 scope로 생성하고 다운로드 사실을 audit한다. `dc.admin_event`의 현재 action/target 제약과 맞는 범위는 재사용하고, 맞지 않으면 최소 `job_access_event(id,actor_uid,action,target_kind,target_id,filter_hash,row_count,occurred_at)` append-only를 추가한다. payload에 CSV/자소서 본문을 저장하지 않는다. 반환 데이터의 최소화는 기술 계약이며 보관기한/동의 문구를 임의 확정하지 않는다.

### 5.2 잠금·멱등·낙관적 충돌

programs.py 패턴의 `dc.idempotency(actor_uid,route,key,request_hash,response,created_at)`를 그대로 사용한다. 키 길이 8~200, canonical JSON hash에는 method+route entity ID+body+expectedVersion 포함. route는 실제 entity ID와 operation을 포함한다. 동일 키/동일 입력은 저장 응답, 동일 키/다른 입력은 409 IDEMPOTENCY_MISMATCH. 민감 응답 재생 전에도 현재 사용자·scope를 재검증한다. 새 의도·새 재지원에는 새 키, 네트워크 재시도에는 같은 키를 쓴다.

잠금 순서: actor/route/key advisory transaction lock → 필요한 company 행 → posting FOR UPDATE → application 행(복수면 id 정렬) → stage/관련 문서 행(정렬). 공고 편집에서 기업과 공고를 함께 잠글 때도 company→posting 순서 유지. student·counsel·roadmap에 역방향 업무 잠금을 추가하지 않는다. 없는 최초 application은 부모 posting lock+UNIQUE(posting,student)로 보호한다. 자소서는 별도 aggregate이므로 idem→resume만 잠근다.

지원/진행/취소/재지원: 현재 인가→멱등 조회→부모·지원 잠금→expectedVersion/마감·전이·서류/동의 검증→application 변경→attempt/consent(해당 시)→event→idempotency 응답 저장→한 번 commit. 어느 단계라도 실패하면 전부 rollback. stage 편집도 같은 posting lock으로 advance와 직렬화한다. row joined SELECT는 `FOR UPDATE OF <root>`로 실제 잠금 대상을 제한한다.

모든 mutable API는 expectedVersion 필수(신규 생성/찜 제외). 최초 지원은 expectedPostingVersion, 재지원/취소/진행은 application expectedVersion도 필수. 공고 필드와 stage 편집은 posting version 공유. stale은 409 VERSION_CONFLICT로 최신 version을 전달한다. 클라이언트가 서버 최신값으로 자동 재시도하여 다른 사람 변경을 덮지 않는다.

append-only attempt/event/consent는 UPDATE/DELETE trigger 거부 및 최소 grant로 방어한다. 프로그램 이력 방어 함수를 재사용한다. 이관 전용 프로세스도 원본 누락 이력을 새 업무 이벤트로 위조하지 않는다. idempotency 정리 정책은 기존 공통 운영 정책을 따르고 진행 중 key를 제거하지 않는다.

### 5.3 오류/응답

성공은 JSON 200(생성도 200으로 일관, 멱등 저장 응답과 동일); 삭제 `{id,deleted:true}`/찜 `{postingId,saved:false}`. shared/api.ts의 무조건 JSON 파싱과 충돌하는 204 금지. 오류는 기존 호환 `{detail:"한국어 메시지",code:"...",fieldErrors?:...,currentVersion?:...}`. 공통 클라이언트는 기존 ApiError(status,message)를 유지하며 code/fieldErrors 선택 필드만 확장한다.

400 malformed filters, 401 인증 없음, 403 기능/게이트 미충족, 404 객체 없음/범위 밖, 409 충돌·중복·마감·잘못된 전이, 422 필드/코드/파일 검증, 503 FILE_SERVICE_UNAVAILABLE 또는 PORTFOLIO_SERVICE_UNAVAILABLE. capability상 미제공 기능 버튼을 막아도 서버 검사는 유지한다. 예: ALREADY_APPLIED, JOB_CLOSED, NOT_INTERNAL_RECOMMENDATION, STAGE_IN_USE, SYSTEM_STAGE_IMMUTABLE, ATTACHMENT_REQUIRED, MISSING_BINARY, CONSENT_POLICY_UNAVAILABLE, DATA_REPAIR_REQUIRED. 서버 traceback·경로·개인정보는 오류에 포함하지 않는다.

## 6. API와 DTO

기존 `/api` prefix가 있다면 공통 api helper 설정을 따르며 아래는 router 상대경로다. 목록은 `{items,totalCount,page,pageSize}`; page≥1, pageSize 1~100, 기본 20. 정렬은 고정 allowlist와 id tie-breaker. 응답 날짜는 ISO8601+offset, date는 YYYY-MM-DD. 모든 쓰기 DTO extra forbid, 본문/문구 길이 상한을 명시하고 UI와 공유한다(제안: title/role/company 200, tag 50×30개, 이유 2,000, content 100,000자; 기존 초과 데이터는 잘라 넣지 않고 보고).

| method/path | 요청·응답 핵심 |
|---|---|
| GET `/jobs/capabilities` | identity별 canManage, canApplyWithFile, canApplyWithPortfolio, canUseTextResume 및 unavailable reason. 활성 동의·provider 상태를 반영 |
| GET `/jobs/eligibility` | §4.2; 학생 자기 UID만 |
| GET `/jobs` | source, recruitType, effectiveStatus, companyId, q, option codes, page/size, sort; JobSummary[] |
| GET `/jobs/{id}` | JobDetail + effectiveStatus + version + stages + applyEligibility(학생), 파일 상태. 보호된 지원자 데이터 없음 |
| POST `/jobs` | PostingWrite; Idempotency-Key. 회사 선택 id 또는 createCompany 입력 중 하나, source=manual 서버 고정 |
| PATCH `/jobs/{id}` | PostingWrite 변경필드 + expectedVersion; Idempotency-Key. 일반↔추천 변경은 지원 존재 시 409 POSTING_HAS_APPLICATIONS; external 수정은 수집/관리 별도 권한 없으면 거부 |
| POST `/jobs/{id}/close`, `/reopen` | expectedVersion, reason?; 재게시해도 지난 deadline은 여전히 마감이므로 함께 날짜 수정 필요 |
| DELETE `/jobs/{id}` | expectedVersion + key; 논리삭제. 지원·동의·이력 보존 |
| PUT `/jobs/{id}/stages` | expectedVersion, stages:[{id?,name,position}]; 내부 단계 입력 수정 거부, 삭제·재정렬 일괄 검증 |
| GET `/job-companies` | q/page/size, 관리 권한, 중복 후보 제공 가능; 회사명만으로 자동 결정하지 않음 |
| POST/PATCH/DELETE `/job-companies[/{id}]` | CompanyWrite(displayName,companyTypeCode?,websiteUrl?) 및 변경 version/key; 참조 기업 삭제 거부 |
| GET `/jobs/{id}/consent-policies` | 실제 게시된 필수/선택 policy id/revision/title/body/hash/기간; 없는 필수 정책을 빈 동의로 통과시키지 않음 |
| POST `/jobs/{id}/applications` | expectedPostingVersion, expectedVersion?(재지원), attachment:{kind,fileId?}, consents:[{policyId,revision,hash,accepted}]; key. PORTFOLIO UID는 서버 본인, RESUME_FILE fileId는 READY 본인 파일 |
| GET `/job-applications/mine` | status/postingId/page/size → 본인 최신회차 목록 |
| GET `/job-applications/{id}` | ApplicationDetail + currentAttempt + 제한된 posting snapshot; 현재 scope 적용 |
| GET `/job-applications/{id}/events` | attemptNo?, cursor?, limit≤100; seq 기반 페이지. `{items,nextCursor}` |
| POST `/job-applications/{id}/cancel` | 학생 본인 expectedVersion/key |
| POST `/job-applications/{id}/advance`, `/reject` | career/관리자 범위, expectedVersion/key, reject reason? |
| GET `/jobs/{id}/applications` | 관리: status/stageId/대학/학과/학년/학적/유형/q/page/size/sort, 동일 scope |
| GET `/job-applications` | 관리 전체목록: 위 + postingId/dateFrom/dateTo; 이름검색은 parameterized |
| GET `/jobs/{id}/application-summary`, `/job-applications/summary` | 동일 필터·scope의 counts, scope 설명, current/attempt 기준 구분 |
| GET `/job-applications/export` | 목록과 같은 필터/scope, CSV 스트리밍 + access audit, filename 안전화 |
| GET `/job-wishlist` | 본인 saved 목록 페이징, closed/unavailable 구분 |
| PUT/DELETE `/job-wishlist/{postingId}` | 명시 desired state; PUT 신규 gate, DELETE 소유권; 재호출 같은 결과 |
| GET/POST `/job-resumes` | 본인 목록/생성; ResumeWrite(title,company,jobType,position,categoryCode,content). origin/ai reference는 서버 검증 |
| GET/PATCH/DELETE `/job-resumes/{id}` | 본인 상세/수정/논리삭제; expectedVersion/key. 목록은 content 제외, 상세만 본문 |

고정 경로 capabilities/eligibility/export/mine/summary를 `{id}`보다 먼저 등록한다. PostingWrite는 company/role/tags/salary/location/careerPrimaryCode, recruitType, status, deadlineMode/deadlineDate, applyUrl, urlTitleLink, email/emailApply, salaryNegotiable, content/contentFormat 및 5종 optionCodes를 포함한다. match는 입력/서비스 정본에서 제외한다. 학생 UI와의 호환 DTO에서만 match=0/추천정보없음으로 표시하고 근거 없는 순위를 만들지 않는다. `logoUrl`, `attachments:[{id,name,availability,downloadUrl?}]`는 파일 provider 연결 후 제공한다.

URL은 http/https만 허용하고 서버가 임의 URL을 fetch하지 않는다. HTML은 server allowlist sanitize, script/event handler/javascript/data URL 차단. J1의 inline 이미지 쓰기는 거부하고 텍스트·안전한 기본 서식만 받는다. 파일 활성 후에도 image src는 인가 가능한 FileRef 렌더링 경로만 허용한다. 이메일 지원이면 email 필수, 제목 링크 모드이면 유효 applyUrl 필수. 원문 임의 truncation 금지.

ApplicationSummary는 id/jobId/studentId(인가된 경우), snapshots, status/currentStage/currentAttemptNo/appliedAt/canceledAt/version, attachmentKind/availability, lastEventAt. 이벤트는 id/seq/attemptNo/kind/from/to(stage name 포함)/reason/byName/at. employee UI는 snapshot과 현재 소속을 서로 다른 명명 필드로 받는다. 서류 본문은 목록 DTO에서 반환하지 않는다.

통계는 **현재 application 1행** 기준 total=applied+inProgress+passed+rejected+canceled+unknown. open=applied+inProgress; 단계별 count는 IN_PROGRESS만. legacy unknown을 분모에서 몰래 빼지 않는다. 재지원은 total을 늘리지 않으며 별도 attemptCount가 필요할 때만 명시 반환한다. 이것은 채용 지원 실적이지 졸업자 취업률/실제 입사 실적이 아니다. PASSED를 취업완료로 명명하지 않는다.

기본 직원 필터의 대학/학과/학년/학적/유형은 현재 학생 정보 기준이며 UI에 “현재 학생 정보 기준”을 표시한다. 제출 당시 기준 분석을 요청하면 별도 `basis=submitted`를 명시하고 snapshot 컬럼으로 필터하되 **인가만큼은 항상 현재 scope**다. CSV의 제출자 정보는 snapshot 우선, 미상은 빈칸/미상으로 출력한다. 현재 정보를 보충하면 별도 “현재” 열로만 노출한다. 현재 CSV 14열 호환을 유지하고 합의 없이 소속 값을 바꿔치기하지 않는다. UTF-8 BOM, CSV escape, `= + - @` 등 수식 주입 무력화, KST 시각, 권한 predicate 테스트가 필요하다.

## 7. 프론트 저장 경계·호환

`shared/jobStore.ts`를 programStore 방식의 API-backed cache/subscribe 경계로 만든다. 공유 타입·mapping을 통해 두 SPA가 같은 응답을 해석한다. 데이터 접근을 학생 화면→상담사 localStorage 구현에 의존시키지 않는다. 기존 모듈 경로는 facade로 남길 수 있다.

| 현행 | 유지할 공개 표면 / 내부 교체 |
|---|---|
| jobsSource.ts | getJobs/getJobById/getInternalJobs/getExternalJobs 및 마감/표시 순수 helper는 동기 selector 유지. CRUD는 Promise<서버 결과>로 변경, 조용한 false/빈 배열 실패 제거 |
| jobApplications.ts | getApplications/getApplicationsByJob/getApplicationsByStudent/getApplicationById/getFlowStages 등 동기 캐시 selector. apply/cancel/advance/reject/stage 변경은 Promise. 지원 가능 helper는 서버 eligibility+현재 캐시를 표시할 뿐 서버 검사를 대체하지 않음 |
| jobApplicationEvents.ts | 동기 읽기 facade 유지; 공개 클라이언트 append 제거, 서버 event만 읽음 |
| jobApplicationExport.ts | 브라우저 전체 지원 배열/학생 목록 조합 제거. 인증 헤더를 공유하는 CSV fetch helper로 전환 |
| jobWishlist.ts | 본인 cache selector와 명시 save/remove Promise. UI toggle은 현재값에서 desired state를 계산하며 pending 중 연타 방지 |
| resumeMock.ts | SavedResume 형태 mapping 유지, getAllResumes는 로드된 본인 cache만 반환. 고정 SAVED_RESUMES 병합 제거. upsert/delete Promise |
| shared/bootstrap.ts | identity 확인 뒤 capabilities/eligibility 및 화면 필요 초기 페이지 적재. 로딩 실패를 정상 0건으로 publish하지 않음 |

동기 selector가 전체 DB를 읽은 것처럼 반환하면 안 된다. 캐시 상태는 `{items,loaded,totalCount,queryKey,error,lastFetchedAt}`로 별도 공개하고, 목록 소비 화면은 query/page loading state를 사용하도록 함께 전환한다. 기존 동기 시그니처 유지가 “모든 페이지를 선적재한다”는 뜻은 아니다. 각 페이지 queryKey에 대응하는 캐시를 읽고 상세는 route loader에서 await loadJob(id) 후 selector를 사용한다. 집계/검색/정렬은 전체 모집단 기준 서버 응답 사용. 지원·자소서 전량 preload 금지.

성공 쓰기 응답을 우선 cache에 반영하고 관련 목록·상세·summary·event 페이지를 invalidate/refetch한다. 쓰기는 commit됐지만 refresh가 실패한 경우 “저장됨, 최신 목록 재조회 필요”로 표시하며 새 멱등키로 같은 지원을 재생성하지 않는다. 네트워크 timeout이면 원래 키 유지 후 확인/재시도. window focus와 화면 활성 시 재검증, 열린 목록은 30초 간격의 bounded refresh 제안. 다른 SPA 이벤트를 즉시 받았다고 가정하지 않는다.

로그아웃/identity 변경 시 개인 cache·pending key를 비우고 요청 generation token을 증가시킨다. 이전 identity로 시작한 느린 응답은 폐기한다. localStorage로 개인 응답을 영속 캐싱하지 않는다. metadata revision 변경은 선택지 재조회만 유발하며 과거 label fallback을 유지한다.

화면별 변경 지점:

- JobSupport/JobBoard/JobDetail/JobDetailView: API 목록·상세, 서버 마감, 상세 StageGate, file capability, 추천/외부 분기. 추천 external은 외부 경로 유지.
- JobApplyModal: 파일명만 선택해 제출하는 경로 제거; provider 준비 상태·동의·server eligibility 사용. 미제공 기능은 이유를 표시하고 성공 toast를 만들지 않음.
- MyApplications: 자기 지원 페이지/회차 timeline, async 취소/재지원 충돌 처리.
- admin JobList/JobManage/JobForm/JobView: API CRUD+version, DB 선택지, 텍스트 우선 공고 저장, 기업 식별 adapter. 파일 결정 전 로고/inline 업로드 비활성.
- JobApplicantsList/JobApplicants: 서버 scope·페이징·count·CSV, 서버 advance/reject, snapshot 표시. 모든 학생을 로드한 뒤 브라우저 필터하는 패턴 제거.
- JobsHome/AiResume/AiConsulting: 동일 본인 job_resume loader 사용, 저장·삭제 즉시 다른 화면 반영. 고정 예시와 AI mock 점수를 개인 정본으로 병합하지 않음. 실제 AI 기능은 별도 unavailable 상태.
- Portfolio/StudentDetailView: 이번 jobs CRUD로 INITIAL_*를 영속화하지 않는다. 지원 포트폴리오 열람은 J4 provider 준비 후에만 연결한다.

새 디자인 생성 없이 DESIGN.md와 기존 컴포넌트를 따른다. 다음 동작을 만들려면 별도 UI 범위 검토가 필요한 부분(동의 표시, 실제 업로드, 회차 선택)은 C4 승인 범위에 명시한다.

## 8. #41 파일 의존 계약 — USER_DECISION_REQUIRED

물리 저장을 결정하기 전에도 **소유·참조 의미**는 다음으로 고정할 수 있다. 공통 FileRef는 SPEC §7-11의 ownerKind/ownerId/slot, original/stored name, size/ext, storage reference, deleted 상태를 따른다. ownerId의 다형 FK는 파일 서비스가 owner별 DB 인가·존재 검증을 해야 하며 문자열 일치만으로 허가하지 않는다.

| ownerKind / ownerId / slot | 용도·접근 | 차단점 |
|---|---|---|
| JOB_POSTING / posting.id / LOGO | 공고별 추천 로고. 공고 읽기 권한 범위의 이미지 제공 | JobForm data URL을 실제 파일로 변환·업로드 필요. 기업 공용 logo로 자동 이동 금지 |
| JOB_POSTING / posting.id / CONTENT_IMAGE | 본문 삽입 이미지/포스터 | HTML의 inline data URL 추출·파일 참조로 재작성, 붙여넣기 검사 |
| JOB_POSTING / posting.id / ATTACHMENT | 공고 첨부 문서 | 기존 string[]은 파일명이므로 실바이너리 없는 항목 재업로드 필요 |
| JOB_APPLICATION_ATTEMPT / attempt.id / RESUME | 개별 지원 서류 | 본인 및 현재 jobs scope 직원만. 같은 파일을 타인 지원/다른 회차로 임의 재귀속 금지 |

저장소 독립 흐름은 업로드 예약(본인/작성권한)→바이트 저장→형식·크기 검사→READY→신청 트랜잭션에서 파일 소유/상태 검증 및 회차 귀속 확정→다운로드마다 소유/현재 scope 재검증이다. 예약 시 아직 attempt.id가 없으면 temporary upload token으로 소유하고 신청 commit 때 최종 owner를 연결한다. 클라이언트가 임의 ownerId를 넣어 READY로 전환할 수 없다. 파일과 DB 사이의 실패는 staged orphan 정리/재시도로 처리하며 외부 업로드를 긴 DB transaction 안에서 수행하지 않는다.

J3 후속 공통 file migration은 READY 소유·연결의 원자성, 중복 소비 방지, 삭제/격리 이후 접근 차단, orphan 정리, 백업·복원 일치성까지 정의해야 한다. 이 문서는 그 물리 DDL·API endpoint를 선결정하지 않는다. 지원 text resume를 자동 PDF화해서 RESUME_FILE 요건을 우회하지 않는다.

**D01 / DB.md #41 / USER_DECISION_REQUIRED**

사용자가 결정할 항목:

1. 바이트 정본: 서버의 웹루트 밖 관리 volume / 객체 저장소 중 무엇인가. 운영 VM 이전·백업 책임과 용량 기준도 함께 정한다.
2. 제공 방식: 인증 다운로드 API proxy / 인가 후 단기 signed URL 중 무엇인가. 비공개 지원 문서는 public URL 금지. 로고·본문의 공개 범위도 별도로 정한다.
3. 기존 파일의 이관 대상·실바이너리 수집 방법, 파일 종류별 허용 확장자/검사·크기 한도·보관/파기 정책. 현재 200,000 data URL 문자를 byte limit로 그대로 사용하지 않는다.

이 답이 없어도 J1·J2 설계/검증은 가능하다. **로고 업로드·본문 이미지·공고 첨부·RESUME_FILE 실지원은 구현 승인 범위에서 보류**한다. #18의 SY_FILE legacy owner 매핑은 별도 결정이며 #41 선택만으로 해결된 것으로 표시하지 않는다. CSV와 자소서 텍스트·성장일지 text snippet은 #41 차단 대상이 아니다.

## 9. 기타 미결·의존성과 범위별 영향

| ID/상태 | 필요한 판단 | 보류되는 범위 / 독립 진행 |
|---|---|---|
| D02 USER_DECISION_REQUIRED | 실제 지원 동의 문안·버전·필수/선택·제공 대상·보관 정책 승인. 현 데이터에 동의가 없다는 사실 확인 | 신규 지원 공개만 차단. 동의 테이블·검증·공고/자소서 CRUD 설계 가능 |
| D03 DEPENDENCY_REQUIRED | DB.md #4 포트폴리오의 학생별 영속 라이브 provider와 제출 열람 인가. 어느 승인 범위에서 먼저 제공할지 팀장이 기록 | PORTFOLIO 제출/열람 차단. 파일 경로가 준비되면 RESUME_FILE만 가능. 둘 다 없으면 실제 신규 지원 차단 |
| D04 USER_DECISION_REQUIRED | UID 없는 dc_job_wishlist/dc_user_resumes_v1을 누구의 실제 자료로 인정할지 및 어느 브라우저 export를 수집할지 | 소유 불명 기존 데이터 이관만 보류. 신규 UID 소유 CRUD는 진행 |
| D05 USER_DECISION_REQUIRED (변경 요청 시) | “채용시 마감”의 현행 1개월 규칙을 무기한으로 바꿀지 | 답이 없으면 현재 날짜·계산 규칙 유지. 일반 DATE 공고는 영향 없음 |
| D06 기존 §9 #21 유지 | 탈락 사유를 필수로 할지 | 현재 선택 입력 유지로 완결. 필수화는 승인 전 금지 |
| D07 기존 §9 #17/#18/#20/#39 | 레거시 중복·파일 소유·사용 안 하는 컬럼·운영 Oracle/PG 전환 | 이번 개발 fixture/승인 export 외 운영 대량 이관 차단. Oracle DDL 생성 금지 |

포트폴리오 provider의 최소 계약은 `resolveLivePortfolio(studentUid,principal,purpose,applicationAttemptId?)`→`{available,ownerUid,revision,viewData}`다. 본인 제출 시 owner 일치, 직원 열람 시 실제 지원·현재 scope·동의 검증. submitted attempt에는 owner만 고정하고 열람 때 최신 내용을 읽는다. 과거 제출 내용의 불변 사본 보관으로 바꾸려면 업무 결정을 받아야 한다. provider 장애와 빈 포트폴리오는 다른 상태로 응답한다.

## 10. 데이터 이관·seed 종료·롤백

### 10.1 단계와 수입 규칙

1. C3에서 충돌 C01~C20 및 D01~D07 검토. C4는 승인 묶음(J1/J2/J3/J4)·보류·답변을 명시한다. 이 설계를 승인 기록으로 대신하지 않는다.
2. C5는 현재 DB backup/복구 방법 확인, 다음 번호 additive SQL 적용, code seed, 서버/API/test를 먼저 구현한다. 기존 programs 기능을 바꾸지 않는다.
3. 별도 승인된 이관 도구로 브라우저 export를 받는다. manifest는 source, exportTime, declaredOwner, sourceKey, recordId, rawHash와 row count를 포함한다. 서버는 임의 사용자 전체 브라우저 저장소를 자동 업로드하지 않는다. 검역/보고 파일의 실제 위치·접근은 후속 구현 승인 범위에서 정한다(이번 작업에서 만들지 않음).
4. 공고·기업→단계→지원/회차→이력→찜/자소서 순서로 dry-run mapping, 중복/누락/소유 검증 후 transaction import. 각 import는 source+legacyId의 stable mapping과 해시를 기록하여 재실행 멱등. 이미 운영자가 수정한 행을 seed가 overwrite하지 않는다.
5. API 읽기와 기존 export를 지정 계정에서 대조하고 UI를 한 도메인 단위로 전환한다. 검증을 위해 legacy를 read-only 비교할 수 있지만 사용자의 실제 요청에는 한 정본만 사용한다. DB 쓰기+localStorage 이중 쓰기 금지.
6. 양 SPA 왕복·권한·집계·파일 실제 증거까지 승인된 범위별 검증 후 loader에서 legacy fallback 제거. 보관된 export 정리 시점은 승인 정책에 따른다. 새 DB 변경 뒤 localStorage를 다시 정본으로 사용하지 않는다.

외부 jobs.seed 6건은 개발 reference import만 허용하고 ID/출처/마감일을 보존한다. 외부 수집기가 있는 것으로 간주하지 않는다. 후속 provider upsert는 (source_system,source_key)로만 동일성 판정하고 manual 행을 건드리지 않는다. 신규 회사는 provider company key가 있으면 그 키, 없으면 source manifest의 명시 mapping으로 만든다. 이름만 같은 두 회사 자동 병합 금지.

legacy 지원은 studentId가 실제 person UID로 resolve될 때만 가져온다. dangling posting/student는 검역. status 알 수 없음은 nullable+LEGACY로 보존하고 자동 전이 불가. portfolio는 실제 소유자 provider 미준비 표시, RESUME_FILE 이름만 있으면 MISSING_BINARY. default/internal stage는 공고별 매핑한다. 이벤트 누락/날짜 누락·재지원의 이전 snapshot 소실은 보고한다. 원본으로 분리할 수 없는 과거 회차는 임의 attempt 순서를 추정하지 않고 검역하거나 명시한 legacy history로 보존한다. 정상 현재행에 fake 지원/동의 이벤트를 붙이지 않는다.

text resume의 SAVED_RESUMES r1~r3는 개인 데이터로 자동 seed하지 않는다. 사용자 저장 export는 D04 이후 원본 namespace와 ID를 함께 mapping한다. portfolio r1과 resumeMock r1은 다른 namespace다. 찜의 소유 불명 배열은 로그인한 마지막 사용자의 것으로 추측하지 않는다. 학생 JSON jobs[]의 숫자 ID/점수와 posting.id 자동 join 금지.

검증 보고에는 원천 수, 성공 수, 검역 수, 중복 수, FK 해결 수, 상태별 지원 수, 실제 바이너리 확보 수를 기록한다. 이관 카운트와 UI 합계는 canceled/unknown 포함 동일 정의로 비교한다. 신규 API가 쓴 데이터는 legacy export 재실행으로 덮어쓰지 않는다.

### 10.2 롤백

API/프론트 release 전 migration 실패는 transaction rollback. release 후 장애는 쓰기를 잠시 제한하고 직전 API-backed 버전으로 되돌리며 additive table/history는 유지한다. 이미 생성된 지원을 잃는 DROP/down migration 또는 localStorage fallback은 금지한다. DB restore가 필요하면 백업 시점 이후 지원/동의/idempotency 손실 범위를 확인하고 승인된 복구 절차를 따른다. 파일 활성 이후는 DB backup만 복구해서 READY 문서가 사라지는 상황을 별도 검증한다.

## 11. 후속 테스트·수용 기준

이번에는 build/pytest/migration을 실행하지 않았다. 아래는 C5·C6 구현자가 실제 증거를 남겨야 할 목록이다. 테스트는 conftest의 `_test` DB 제한을 유지하고 운영 DB에 실행하지 않는다.

| 영역 | 필수 검증 |
|---|---|
| DDL | 빈 DB 순차 migration, 현재 018까지 DB에서 upgrade, PK/FK·복합 stage FK·current attempt deferred FK, active position UNIQUE, append-only UPDATE/DELETE 거부, app role 최소 grant |
| 공고 | 회사명 중복 허용/source key 중복 방지, external/manual 권한, unknown legacy, 코드 비활성 표시/신규 지정 거부, XSS/URL 검증, soft delete 후 지원 보존 |
| 마감 | KST 전날/당일/익일, UTC 경계, ON_HIRE 기존 달력 계산 parity·월말, ALWAYS, explicit close, expired reopen, expired external seed |
| 게이트 | CCORE만/유형만으로 불허, 현재 유형별 후속, 일반·심리·교수 상담 불허, care7 DONE 허용, roadmap 존재하지만 confirmed=false 불허, 100% 추가조건 없음, 상세 직접 URL/API 우회 차단 |
| 권한 | 학생 A가 B의 지원/이력/자소서/file id 추측 불가; career 현재 배정 내 허용/밖 거부; 과거 담당 관계 예외 없음; psych/prof/assistant 거부; 유효기간 지난 관리자 거부; 메뉴와 scope 교차검사 |
| 집계·CSV | 같은 filter+scope에 목록/count/summary/export 일치; 0건 및 unknown/canceled 포함; 재지원 total 불변; 현재 소속 변경 후 scope 즉시 반영, snapshot 표시 보존; CSV 수식·따옴표·개행·한글·KST |
| 전이 | 최초→내부2단계→사용자3단계→PASS; APPLIED/IN_PROGRESS reject/cancel; terminal 거부; optional reason; 취소 후 새 회차·이전 이력/서류 보존 |
| 동시성 | 별도 DB connection의 동시 최초지원 1행; 동일키 동일응답, 다른 payload 충돌; 다른키 중복 409; cancel/reject/advance 동시 경쟁 단일 성공; stage reorder/delete와 advance 직렬화; stale posting/app version |
| 원자성 | event 또는 consent INSERT 실패를 유도하면 application/attempt/idempotency도 rollback; commit 후 응답 단절 재시도 시 중복 없음; DB 불변 트리거 검증 |
| 파일/포트폴리오 | J1/J2에는 capability false·필수서류 우회 불가 테스트. J3 이후 실제 bytes 왕복·타인 파일·staged/격리/삭제 파일 거부·orphan 정리. J4 이후 본인 수정→직원 최신 열람, 범위 제거 후 접근 거부 |
| 동의 | 승인 정책 없음 차단, 체크하지 않음 차단, stale hash/revision 충돌, immutable receipt, 과거 지원에 동의 생성 없음 |
| 텍스트 자소서/찜 | identity 소유, r1 namespace 분리, createdAt 유지/version 충돌, JobsHome과 AiResume 저장/삭제 일치, mock 재등장 없음, 찜 PUT/DELETE 재호출 |
| 프론트 | pending/error/empty 구분, API 장애 시 seed fallback 없음, 계정 전환 느린 응답 폐기, 페이지 completeness/count, 쓰기성공+refresh실패, 동일키 timeout 재시도 |
| 이관·롤백 | dry-run 재현, 재수입 멱등, 소유/파일명만인 행 검역, 원천 합계 보존, legacy import가 LIVE 수정 덮지 않음, 승인된 복구 연습 |

실제 왕복 시나리오: career 담당자가 텍스트 추천공고/전형 생성→게이트 충족 학생이 조회→승인된 실제 서류 경로와 동의로 지원→동일 범위 직원에게 1건 노출→내부 검토·기업 전달·후속 전형 진행→학생 timeline 확인→취소/재지원 별도 사례에서 회차 보존→합격/탈락 집계/CSV 일치→범위 밖 직원 접근 거부. 파일 또는 포트폴리오가 미준비면 제출 전 단계까지만 검증했다고 기록한다.

필수 실행은 `npm run build`, 새 `backend/tests/test_jobs.py` 및 영향을 받는 기존 auth/administration/diagnosis/programs pytest다. 실 파일/양 SPA 동기화·권한 흐름은 브라우저 왕복으로 별도 확인한다. 테스트 PASS가 없는 지금 문서에 PASS를 기록하지 않는다. 도메인 완료는 `06-verification.md=PASS`와 DB.md §8-3 정합성까지 확인한 뒤 담당자가 판정한다.

## 12. spec_v1.md 전체 반영 추적표

| 원안 절 | jobs 반영 / 현행과의 차이 |
|---|---|
| 서두·§1·§1.1 | 설계/구현/운영 사실 구분. 공고 UI 시연은 있지만 지원 DB 없음(C01). 상위 정본 우선과 충돌 기록 유지 |
| §2·§2.1 | 서비스/AI DB 책임 분리, 현재 개발 스택 활용. VPS 자원·버전·실제 설치 완료를 추정하지 않음 |
| §3·§3.1~3.4 | DB 재설치/Compose/네트워크 변경 없음. 기존 migration runner·계정·스키마·최소 grant 재사용. 운영 접속 검증은 이번 작업 아님 |
| §4·§4.1 | 요청→인증→정책→transaction→DTO 흐름 채택. 실제 psycopg flat app 구조 사용, SQLAlchemy/modules 제안 미채택(C04) |
| §4.2 | self/career scope, 제출 문서 최소노출, CSV·다운로드 인가. 실제 인증 전환은 별도(C20) |
| §5.1 | relational columns/FK/index/version/immutable event 채택. nullable legacy와 LIVE validation 구분 |
| §5.2 | 현재 person/student/code/scope 기반 재사용. 이미 있는 서비스 FK를 제거하지 않음(C16). 학사 투영을 공고 정본으로 오인하지 않음 |
| §5.3 | 상담 테이블은 읽기 게이트 근거만. jobs 상태를 counsel에 저장하지 않음 |
| §5.4 | company/posting/apply/동의/이력 신규 설계. common file은 #41, legacy owner는 #18. portfolio review와 AI 책임 분리 |
| §6·§6.1 | jobs intent endpoints·DTO·오류·page 설계. 현행 totalCount/detail 호환(C05) |
| §6.2 | 부모 잠금·멱등·트랜잭션·stale 충돌 재사용, 지원 회차와 전형 race 추가 |
| §7·§7.1 | PROCESS 검사→CARE7→확정 로드맵 게이트 서버화. 점수/AI 판정식 미생성(C07) |
| §7.2 | 현재 roadmap.confirmed 조회. 원안의 미래 세대·snapshot 상세가 이미 있는 것으로 가정하지 않음 |
| §8·§8.1 | 동기 selector/비동기 load·write 분리, 도메인별 구조 코드+DB 운영 코드(C03/C06), 내부 저장 경계만 API로 교체 |
| §8.2 | 승인 export·소유 검역·stable import·seed 종료. localStorage 이중쓰기/실패 fallback 금지 |
| §8.3 | 양 SPA 성공 후 invalidate/refetch, focus/주기 refresh·identity 격리 |
| §9·§9.1·§9.2 | 후속 backup/restore·파일 일관성·VM 이전 검증 명시. 개발 health 하나를 live/ready로 허위 기록하지 않음(C20) |
| §10 | SQL→API/test→frontend→학생/직원 왕복, 실제 PASS와 이관 대장 갱신이 완료 조건 |
| §11 | #41/#18/#39 등 사용자/업무 미결 분리. 가짜 파일/동의/소유권/AI 결과로 채우지 않음 |
| §12 | 원안의 출처 링크를 운영 사실로 승격하지 않음. 이번 조사 근거는 읽은 문서/실제 코드, 후속 산출물은 handoff 규약 준수 |

## 13. Opus 검토 요청과 최종 상태

Opus는 첫 문서 C01~C20, 본 문서 D01~D07, 프로그램 패턴 보완(인가·통계·회차·잠금), 게이트의 현재 스키마 근거, 파일 없는 승인 단위와 실제 지원 공개 조건을 검증한다. 특히 현재 단계 재정렬 의미 유지, 취소 후 재지원 회차, 동의 정책, UID 없는 legacy 자료 처리에 대한 판정을 남긴다. 기능 범위를 넓혀 임시 포트폴리오·파일 저장소·AI 결과를 만들지 않는다.

소스·DDL·테스트·migration은 변경하지 않았으며, 이 문서 자체는 C4의 APPROVED가 아니다. 후속 review/decision/implementation/verification 파일과 DB.md 갱신은 해당 단계 담당자의 작업이다.

**DRAFT_FOR_OPUS_REVIEW**
