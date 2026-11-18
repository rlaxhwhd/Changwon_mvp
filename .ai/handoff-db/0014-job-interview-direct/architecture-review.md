# 0014 AI 인터뷰 질문 방식 3종(자소서 없이·기업별) — Astra 적용 전 검토

- 판정: **ASTRA_APPROVED** (아래 「적용 전 필수 후속」 4건은 코드·SQL 변경 없이 팀장이 문서·운영 절차에 반영한다)
- 검토일: 2026-11-18
- 승인 work-order: `work-order.md` **revision 1**
- 승인 코드: dev 브랜치 미커밋 워킹트리(`backend/app/deep.py`, `backend/app/jobs.py`, `backend/tests/test_deep.py`, `src_v2/pages/jobs/AiInterview.tsx`, `src_v2/pages/jobs/interviewApi.ts`, `src_v2/pages/jobs/AiInterview.css`, `src_v2/pages/roadmap/ResumeApplicationFields.tsx`) — 커밋 뒤 해시를 verification 에 적는다
- 승인 SQL: `backend/migrations/166_job_interview_session_mode.sql`
- SHA256: `bd5833decaaf5bdc42e78e4572c0b38c131d4f77c7b3df90e8c0f4038c7f4821` (리뷰어가 직접 계산해 work-order 와 일치 확인)

이 판정은 해당 코드와 SQL 의 설계·적용 순서를 승인한다. 실제 DB 적용 성공, 테스트 통과, 운영 권한 상태나 성능을 인증하는 기록이 아니다. 리뷰어는 어떤 DB 에도 접속·적용하지 않았고 테스트를 실행하지 않았으며 서버에 접속하지 않았다. SQL/API/권한/JSON 계약이 달라지면 재검토한다.

## 검토 근거와 구조

AGENTS.md 의 역할 규칙, work-order, 164/165/166 원본, `migrate.py`(단일 트랜잭션 + advisory lock + checksum ledger), `deep.py`·`jobs.py`·`test_deep.py` 의 diff, `interviewApi.ts`·`AiInterview.tsx`, `DB.md` §AI 인터뷰, `DB_SCHEMA.md` 164~165 항목, `docs/Deep_APII_V2.xlsx`(읽기만: 면접 시작②·기업 목록·오류 코드 시트)를 대조했다. 0013 리뷰 형식을 따른다.

설계 판단: 자소서 없이·기업별 면접은 **같은 생명주기(동의 → Deep 세션 생성 → 종료 1회)·같은 소유자(학생 본인)·같은 cardinality(Deep 세션 1 = 행 1)** 이므로 새 테이블이 아니라 `dc.job_interview_session` 에 `mode` 와 `direct_input` 을 더하는 것이 맞다. `direct_input` 은 독립 엔티티가 아니라 「그때 Deep 에 보낸 값」의 발생 시점 스냅샷(164 의 `resume_snapshot`·`interview_info` 와 같은 패턴)이므로 JSONB 가 적절하다. 기업명·직무 목록은 Deep 이 소유하는 참조 데이터라 우리 DB 에 두지 않고 프록시만 하는 것이 맞다.

## 정합성·제약·불변성

- `mode text NOT NULL DEFAULT 'cover' CHECK IN (...)`: 기존 행은 전부 자소서 기반이므로 기본값 'cover' 로 의미가 맞다. `INTERVIEW_MODES` 가 화면값 `none` 을 DB·Deep 값 `no_cover` 로 바꿔 DB·Deep·DTO(`mode`) 가 같은 어휘를 쓴다.
- `ck_job_interview_mode_resume`: `(mode='cover') = (resume_id IS NOT NULL) AND (resume_id IS NULL) = (resume_snapshot IS NULL)`. `=` 가 `AND` 보다 먼저 묶이므로 의도대로다. 기존 행(cover, resume_id·snapshot 모두 NOT NULL) → true AND true 통과. 새 행(no_cover/company, 둘 다 NULL) → false=false, true=true 통과. 혼합(cover 인데 snapshot 만 NULL 등)은 거부.
- `ck_job_interview_mode_input`: cover ⇔ direct_input NULL. 기존 행 NULL 통과. 자소서 없이 경험 글을 비웠을 때도 `{'interview_content': ''}` 객체가 들어가 NOT NULL 이므로 통과(아래 권고 1 참조).
- `resume_id` FK 는 그대로 남아 cover 행의 참조 무결성은 유지된다. NULL 허용은 FK 와 충돌하지 않는다.
- 불변 트리거 `guard_job_interview_session` 은 `to_jsonb(NEW)/to_jsonb(OLD)` 에서 `deep_result_id`·`finished_at` 만 빼고 비교하므로 새 컬럼 `mode`·`direct_input` 도 자동으로 불변 범위에 들어간다. 종료 1회 UPDATE 는 영향이 없다. 166 이 트리거를 건드리지 않아도 되는 이유가 이것이다.
- 권한: 164 의 `GRANT SELECT, INSERT, UPDATE ON dc.job_interview_session TO dc_app` 은 테이블 단위라 새 컬럼에 자동 적용된다. 추가 GRANT 불필요.
- UNIQUE(`deep_session_id`, 부분 `deep_result_id`)·`ix_job_interview_session_student` 는 그대로 유효하다. 새 읽기 경로(mode 로 필터)는 없다. **새 인덱스 불필요.**

## API·Deep 계약 대조(Deep_APII_V2)

| 항목 | Deep 계약 | 구현 | 판정 |
|---|---|---|---|
| 면접 시작② 경로·mode | `POST interview/direct/sessions`, `no_cover`/`company`, cover_id/cover 금지 | `create_direct_interview` 가 `mode`·`parent_origin`·`interview_info` + 직접 입력만 보내고 cover 키를 넣지 않음 | 일치 |
| interview_info 필수 6개·한도 | job_type/industry_type/corporate_type/career 15자, companyName/supportDepartment 100자, workTask 선택 100자 | `InterviewBody` jobType·industry·companyType·experience 15, company·position·workTask 100; `direct_interview_info` 가 6개 빈값을 Deep 호출 전 422 | 일치. company 방식의 companyName 은 Deep 이 「생략 가능」이지만 선택 기업명을 그대로 넣으므로 무해 |
| interview_content | no_cover 선택, 1000자 | `content` ≤1000, 비면 Deep 에 보내지 않음 | 일치 |
| company / job_category | company 필수(목록 값 그대로), job_category 선택·'전체' 허용 | `company` 필수 검사, `job_category` 비면 보내지 않음(= Deep 전체 직무) | 일치 |
| 자동완성 q·limit | q 1~100 필수, limit 1~30 기본 10 | `Query(min_length=1,max_length=100)`, limit 고정 10 | 일치 |
| 오류 코드 | `company_not_found`·`question_not_found` 404, `origin_not_allowed`·`interview_not_enabled` 403, 형식 400 | 404/404/503/503/422 로 안내 문구 매핑 | 적절. 401/403/429 는 기존 `failure` 공통 처리 |
| 응답 | `{session_id, iframe_url, expires_in, mode}` | `_launch` 가 session_id·iframe_url 만 사용(mode 는 우리가 보낸 값으로 기록) | 적절 |

JSON 호환성: `GET /job-interviews` 의 기존 키(`id, resumeId, resumeTitle, company, createdAt, finishedAt`) 는 유지되고 `mode` 가 추가된다. `resumeId` 가 **string → string|null** 로 바뀌는 것이 유일한 타입 변화이며 `interviewApi.ts` 의 `InterviewSession.resumeId: string | null` 과 화면(`item.resumeTitle || …` 폴백)이 이미 대응한다. 기존 자소서 기반 요청 본문(`source` 생략)은 그대로 동작한다.

## 권한·동시성·쿼리

- 세 엔드포인트 모두 `deep_principal` + `require_deep` 로 학생 본인 토큰만 쓰고, Deep 호출은 본인 Bearer 로 나간다. 타인의 uid 를 선택할 입력은 없다. 자동완성 응답은 기업명 문자열 배열만이라 개인정보 노출이 없다.
- 세션 생성은 외부 생성 작업이라 164 때와 같이 멱등하지 않다(이 변경이 새로 나쁘게 만드는 것은 아니다). Deep 호출 전후로 커넥션을 쥐지 않는 구조(동의 조회 → 반환 → Deep → INSERT) 가 유지된다.
- 목록은 LIMIT 50 + 동의 조회 1회, N+1 없음. `direct_input` 은 최대 1000자 문자열 1개라 payload 영향 미미.
- 자동완성 빈도: 화면이 300ms 디바운스 + 「이미 목록에서 고른 이름이면 호출 안 함」을 하므로 서버 측 rate limit 는 지금 불필요. Deep 429 는 공통 매핑으로 429 가 그대로 전달된다. 8천 명 규모에서도 동시 입력자 수 × 초당 3회 미만이라 문제되지 않는다.

| 주요 경로 | 인덱스·비용 |
|---|---|
| 본인 세션 최신 50개 | 기존 `ix_job_interview_session_student(student_uid, created_at DESC)` |
| 종료 1회 UPDATE by id | PK |
| Deep result id 중복 차단 | 기존 부분 UNIQUE |
| 기업명 자동완성·직무 목록 | DB 접근 없음(Deep 프록시) |

## 마이그레이션·잠금·롤백 검토

- `ADD COLUMN … DEFAULT 'cover'`(상수 기본값, PG 11+ 는 재작성 없음), `ADD COLUMN direct_input`(NULL), `DROP NOT NULL` ×2 는 카탈로그 변경이다. 두 번째 ALTER 의 CHECK 2건과 첫 ALTER 의 인라인 CHECK 2건은 기존 행 1회 스캔(세션 기록 = 소량). ACCESS EXCLUSIVE 잠금은 짧고 `lock_timeout 3s / statement_timeout 30s` 가 걸려 있다. `migrate.py` 는 non-autocommit 연결의 단일 트랜잭션이라 `SET LOCAL` 과 전체 롤백이 유효하다.
- compose 의 postgres 이미지는 digest 고정이며 11 미만일 수 없다(기본값 재작성 없음 전제 충족). 테스트 DB 적용 때 `SELECT version()` 으로 한 번 확인해 verification 에 적는다.
- 재실행: ledger 의 checksum 으로 건너뛴다. 적용된 뒤에는 SQL 을 고치지 않는다.
- **롤백 정정(필수 후속 1):** SQL 주석과 work-order 는 「자소서 없는 행을 내보낸 뒤 CHECK·컬럼 DROP」으로 적혀 있는데, 이것만으로는 구 API 가 돌아가지 않는다. 구 `interview_dto` 는 `row['resume_snapshot'].get(...)` 을 호출하므로 **mode≠'cover' 행이 1건이라도 있으면 구 API 의 `GET /job-interviews` 가 그 학생에게 500 을 낸다.** 그리고 컬럼을 DROP 해도 NULL 인 `resume_id`·`resume_snapshot` 행은 남고 `SET NOT NULL` 복원은 실패한다. 세션 행은 불변·DELETE 권한 없음 원칙이라 지울 수도 없다. 따라서 롤백 규칙은 다음과 같이 문서화한다.
  - `SELECT count(*) FROM dc.job_interview_session WHERE mode <> 'cover'` 가 0 이면: 앱만 이전 버전으로 되돌린다. 166 컬럼·제약·ledger 는 그대로 둔다(구 API 는 mode 기본값·direct_input NULL 로 정상 동작).
  - 0 이 아니면: 앱 롤백 대신 **forward-fix** 한다(새 API 유지). 데이터 손실 없는 롤백 경로가 없기 때문이다. SQL 주석의 DROP 절은 개발·테스트 DB 재구축 용도로만 본다.
  - 이 SQL 은 아직 어디에도 적용되지 않았으므로 팀장이 주석을 위 내용으로 고치는 것을 허용한다. 고치면 SHA256 이 바뀌므로 work-order 와 이 파일의 SHA 를 함께 갱신하고 그 사실을 verification 에 남긴다. 주석만 바꾸는 것이면 재검토는 필요 없다.

## 동의서 버전 상향(2026-11-18) 판정

수집 항목 문구에 「직접 입력한 면접 내용(경험 글)」이 추가되어 실제 수집 범위가 넓어졌으므로 버전 상향·전원 1회 재동의가 맞다(165 의 「문구가 바뀌면 버전을 올린다」 규칙). 서버 `INTERVIEW_CONSENT.version`, 화면 `INTERVIEW_CONSENT.version`, 테스트 `CONSENT` 가 모두 `2026-11-18` 로 일치한다. 2026-11-16 동의 행은 불변으로 남고 새 버전 행이 없으므로 `consented=false` 가 되어 화면이 동의 단계로 간다. 기존 세션의 동의 스냅샷은 바뀌지 않는다. 테스트 DB·로컬에 2026-11-16 동의로 시작한 세션이 있어도 166 과 충돌하지 않는다.

## 적용 전 필수 후속(코드·SQL 변경 없음, 팀장)

1. 롤백 규칙을 위 「롤백 정정」대로 work-order 와 DB_SCHEMA.md 에 적는다(SQL 주석 수정은 선택, 수정 시 SHA 갱신).
2. `DB_SCHEMA.md` 에 166 항목을 추가한다: mode 3값·기본 'cover', direct_input JSONB 객체(Deep 필드명 그대로), resume_id/resume_snapshot NULL 허용과 두 CHECK, 불변 트리거가 새 컬럼도 덮는다는 점, 권한 변경 없음, 검토 정본 `.ai/handoff-db/0014-job-interview-direct/`.
3. `DB.md` 636행 「질문 방식은 자소서 기반만 된다(Deep 외부 API 에 자소서 없이·기업별 면접이 없다)」를 2026-11-18 기준으로 고친다(3종, 동의서 버전 2026-11-18, 기업명·직무 목록은 Deep 프록시). 결과 데이터 API 미구현은 그대로 둔다.
4. verification 에 테스트 DB 의 `SELECT version()`, 166 적용 전후 `count(*)`·`count(*) FILTER (WHERE mode='cover')` 가 같음, 재실행 no-op, `\d dc.job_interview_session` 의 제약 4건(인라인 CHECK 2 + 이름 있는 CHECK 2)을 기록한다. 개인정보는 출력하지 않는다.

## 권고(비차단)

1. `direct_input` 은 「Deep 에 보낸 값」 스냅샷이므로 `create_direct_interview` 가 실제로 보낸 것과 같게 `{k: v for k, v in direct.items() if v}` 를 저장하는 쪽이 정확하다(지금은 company 방식에서 보내지 않은 `job_category: ''` 가 저장된다). 빈 경험 글이면 `{}` 가 되어도 CHECK 는 통과한다. 기존 테스트 2건은 비어 있지 않은 값을 쓰므로 그대로 통과한다.
2. `test_deep.py` 에 ① no_cover/company 행에서 종료 1회 UPDATE(`PUT …/finish`)가 되고 ② 그 뒤 mode·direct_input UPDATE 가 트리거로 거부되는 검사를 1건 추가하면 새 컬럼의 불변 보장이 회귀 테스트에 들어간다.
3. `source='cover'` 요청에 직접 입력 필드(content 등)가 섞여 오면 지금은 조용히 버린다. 계약을 엄격히 하려면 422 를 내도 되지만 현재 화면은 섞어 보내지 않으므로 필수는 아니다.
4. `ResumeApplicationFields.tsx` 의 `OCCUPATIONS` export 는 자소서 쪽 직종 목록을 면접 직접 입력에 재사용하는 변경(재생성 금지 원칙에 맞음). 함께 변경된 `shared/useRoadmapStore.ts` 는 이 작업과 무관한 워킹트리 변경이면 커밋을 분리한다.

## Sol/팀장이 그대로 실행할 순서

1. 필수 후속 1~3 문서 반영(SQL 주석을 고치면 SHA 재고정).
2. 테스트 DB(dreamcatch_test, 15432) 에 166 적용 → `pytest backend/tests/test_deep.py` → 기존 실패 4건 제외 회귀.
3. `npx tsc -b`.
4. `npm run docker:up`(166 자동 적용) → ego-browser 로 `/v2/jobs/home/interview`: 재동의 1회 → 자소서 기반 시작(회귀) → 자소서 없이 시작 → 기업별(자동완성 호출 수가 입력 멈춤당 1회인지, 등록되지 않은 기업 404 안내) → `GET /job-interviews` 응답의 `mode`·`resumeId: null`. 콘솔 오류 0, 실패 요청 0.
5. 필수 후속 4 를 verification 에 기록, 커밋·푸시. CentOS 서버 배포는 하지 않는다.
