# 채용·취업(jobs) 현행 조사

- 작성: 2026-09-09 / codex-db-architect / C1
- 대상: `DB.md` §8-3의 2번. 조사 기준은 현재 작업 트리이며 기존 미커밋 변경을 포함한다.
- 상태: `DRAFT_FOR_OPUS_REVIEW`
- 짝 문서: [02-migration-design.md](02-migration-design.md)
- 이번 작업은 정적 조사와 설계뿐이다. DB 접속·migration 적용·테스트 실행·브라우저 저장소 추출은 하지 않았다. 아래 “없음”은 저장소 코드 조사 결과이며 운영 Oracle 데이터 부재를 뜻하지 않는다.

## 1. 입력과 우선순위

읽은 필수 입력: `AGENTS.md`, `.claude/agents/codex-db-architect.md`, `.ai/interop.md`, `.ai/handoff-db/_schema.md`, **`spec_v1.md` 전체(1~538행)**, `DB.md` §8-3·8-4·9, `PROCESS.md` 전체, `SPEC.md` 전체. 소유권·코드 계약 해석을 위해 `DB.md` §3·8-0·8-1·8-2·8-5도 확인했다. 두 SPA 대상 문서 `STU_README.md`, `Counsel_README.md`도 읽었다.

실제 구조는 SQL migration, 상태·소유권·미결은 DB.md, 업무 게이트는 PROCESS.md, 제품 계약은 SPEC.md를 우선한다. 원안과의 차이는 §7 및 설계의 추적표로 보존한다. 이번 요청은 기존 도메인 DB 전환이며 새 화면 handoff가 입력으로 지정되지 않았다.

조사 범위:

| 층 | 실제 확인 대상 |
|---|---|
| DB | `backend/migrations/` 001~018 목록과 채용·기업·파일·포트폴리오 관련 DDL 검색. 기반 001·002·003·005·006·009, 메뉴 012, 비교과 018 상세 확인 |
| API | `backend/app/` 전체의 관련 endpoint/테이블 참조 검색. `main.py`, `auth.py`, `db.py`, `migrate.py`, `seed.py`, `seed_domains.py`, `students.py`, `academic.py`, `diagnosis.py`, `administration.py`, `metadata.py`, `programs.py` 관련 흐름 확인 |
| 테스트 | `backend/tests/` 목록·관련 테스트 검색. `test_programs.py` 전체, `conftest.py`, 기존 API 동시성·인가 및 코드/배정 테스트 구조 확인 |
| 채용 데이터 | `jobsSource.ts`, `jobs.seed.json`, `schema/job.ts`, `schema/jobApplication.ts`, `jobApplications.ts`, `jobApplicationEvents.ts`, `jobApplicationExport.ts`, `src_v2/data/jobWishlist.ts` |
| 학생 소비 | JobSupport, JobDetail, JobBoard, JobDetailView, JobApplyModal, MyApplications, JobsHome, AiResume, AiConsulting, AiJobs; portfolio.ts, resumeMock.ts, pipeline.ts, careerProcess.ts 및 bootstrap/profiles 경로 |
| 상담사 소비 | JobList, JobManage, JobForm, JobView, JobApplicantsList, JobApplicants, StudentDetailView의 포트폴리오, RichEditor |
| 비교과 참조 | 지정된 018 SQL·programs.py·test_programs.py·shared/programStore.ts·src_admin/data/programs.ts 전부 |

## 2. 결론과 저장 경계

**채용공고·지원·상태이력·찜·자소서의 전용 DB/API는 없다.** `backend/app/main.py:34`의 router 등록과 migration 전수 검색으로 확인했다. `dc.job_role`, `dc.job_skill`, `dc.student_job_interest`는 직무 사전·스킬·직무 관심 관계이며 채용공고/공고 찜이 아니다(`001_foundation.sql:63`, `academic.py:38`). 이름이 비슷하다는 이유로 재사용하면 안 된다.

반면 UI 지원 왕복은 이미 존재한다. `SPEC.md:467`의 “지원 경로가 없다”는 현 코드와 불일치한다. 존재하는 것은 **브라우저 기반 지원 시연**이지 DB 이관 완료가 아니다. `DB.md:298`의 미착수 판정은 유효하다.

| 원천 | 키/식별 | 읽기·쓰기 | 위험/전환 지점 |
|---|---|---|---|
| 교내 공고 | `dc_jobs`, `job_<Date.now()>` | jobsSource.ts:24·142·152·163·170 | 배열 전체 overwrite. 작성자·version 없음. 삭제 시 지원/찜 정합성 없음 |
| 외부 공고 | jobs.seed.json 6건, `job_seed_*` | jobsSource.ts:18·39 | 불변 파일. 외부 수집 API가 구현된 것은 아님 |
| 지원 | `dc_job_applications`, `japp_*` | jobApplications.ts:154·167·243 | 학생×공고 최대 1행을 JS로만 검사. 저장 오류 무시 |
| 전형 | 공고의 `stages[]`; `stg_*`, 기본 `<jobId>__default_N` | jobApplications.ts:79·100 | 헤더의 `dc_job_stages`는 잔재. 실제 별도 키 read/write는 없음 |
| 이력 | `dc_job_app_events`, `jae_*` | jobApplicationEvents.ts:13·28·37 | append를 배열 전체 저장으로 모사. 상태 저장과 별개로 실패 가능 |
| 찜 | `dc_job_wishlist`, string[] | jobWishlist.ts:10·27 | **학생 ID 없음**, 계정 전환 시 공유. 실패도 성공 목록처럼 반환 |
| 자소서 | `dc_user_resumes_v1`, `user-*` + 고정 r1~r3 | pages/jobs/resumeMock.ts:51·73·78·87 | **학생 ID 없음**, 전역 예시 혼합, 중복 ID 가능, 실패 무시 |
| 포트폴리오 | INITIAL_* 공통 상수 + 화면 useState | portfolio.ts:103, Portfolio.tsx:35 | 학생별 영속 저장 자체 없음. 채용 지원의 라이브 참조 전제 미충족 |
| AI 맞춤채용 | 학생 JSON의 `jobs[]`·`jobSkills[]` → `dc.student.detail` 투영 | AiJobs.tsx:69, students.py:11 | jobsSource와 다른 데이터. 숫자 ID·근거 없는 match가 공고 정본을 대체할 수 없음 |

외부 seed 6건은 모두 `source=external`, `status=게시`, `match=0`이다. 넥슨·LG CNS는 `recruitType=추천채용`이지만 external이므로 교내 지원 대상이 아니다. 마감은 2026-08-05~08-20로 조사일에 모두 지났다. 테스트 편의를 위해 이 날짜를 연장하거나 출처를 manual로 바꾸면 안 된다.

`seed.py:30`은 두 데이터 디렉터리 JSON을 `dc.seed_source`에 보관한다. **JSON 원본이 archive에 있을 가능성과 업무 테이블로 이관되었다는 사실은 다르다.** `seed_domains.py`에는 채용 업무 테이블 적재가 없다. 실제 DB archive 존재 여부는 이번 작업에서 확인하지 않았다.

## 3. 화면→데이터 흐름

### 3.1 공고

- 학생: `src_v2/App.tsx:115`의 `/jobs`, `/jobs/external` → `JobSupport.tsx:36` → `getJobsByScope` → 공용 JobBoard.
- 상담사: `src_admin/App.tsx:141`의 목록·관리·등록·수정·상세 → 같은 jobsSource. 관리/목록의 `useMemo`는 mount나 scope 변화 때만 읽는다(`JobManage.tsx:19`, `JobList.tsx:25`).
- 상세는 두 SPA가 `JobDetailView.tsx:67`을 공유한다. 기존 cross-SPA import를 곧 별도 상태 정본으로 오해하지 않는다. API 전환은 shared store seam에서 수행하고 디자인은 변경하지 않는다.
- 공고 스키마 전체 필드는 `schema/job.ts:54` 참조: 회사·직무·태그·급여문구·지역·마감·신입/경력·지원 URL·match, 추천 여부, 로고, 기업 구분, 제목 링크/이메일 옵션, 복수 분류, 본문, 첨부명, 단계, 게시상태·출처·등록시각.
- `JobForm.tsx:145`는 채용시 마감을 **저장할 때마다 현재 날짜+1개월**로 재계산하고 jobType·tags·location을 다른 입력에서 합성한다. 마감 연장 의도인지 단순 저장 부작용인지 구분해야 한다.
- `jobDdayLabel`/`isJobClosed`는 날짜까지 보지만 `canApplyTo`와 `countJobs`·`sortJobs`는 저장 status만 본다(`jobsSource.ts:63·87·114·125`, `jobApplications.ts:55`). 지난 공고가 “게시” 목록에 있으며 지원도 통과할 수 있다.

### 3.2 추천채용 지원·전형·이력

`isRecommendedInternal`은 **manual AND 추천채용**만 허용한다(`jobApplications.ts:45`). 일반공고/외부공고는 URL로 나갈 뿐 시스템 내 지원 실적을 만들지 않는다.

| 현재 행위 | 현재 코드와 의미 |
|---|---|
| 지원 | `applyToJob:243`. 서류 필수. 최초 APPLIED. 클라이언트 학생 신원을 그대로 스냅샷 저장 |
| 재지원 | 같은 함수에서 CANCELED 행 재활성화. ID 유지, appliedAt·서류·신원 스냅샷 갱신, currentStage/canceledAt 제거 |
| 진행 | `advanceStage:307`. APPLIED→sys_review(서류 검토)→sys_forward(기업 전달)→공고별 기업 전형→마지막 단계에서 한 번 더 실행 시 PASSED |
| 탈락 | `rejectApplication:351`. APPLIED/IN_PROGRESS에서만 REJECTED, 사유 선택, 현재 단계 보존 |
| 취소 | `cancelApplication:286`. 본인이라는 서버 검사 없음. APPLIED/IN_PROGRESS만 취소, 단계 제거. 합격·탈락은 취소 불가 |
| 단계 편집 | add/rename/remove/move, `:100~149`. sys_* 편집 불가. 진행 중 점유 단계 삭제만 차단. 완료 건이 가리키는 단계는 삭제 가능 |
| 타임라인 | `getProgressTimeline:423`. 모든 회차 이벤트를 합쳐 도달시각 Map 구성. **재지원 후 예전 도달시각이 남을 수 있음**. 삭제·재정렬된 단계의 현재 배열로 과거 경로 재해석 |
| 집계 | `stageCounts:392`, `getApplicantFilterOptions:470`, `summarizeJob:519`. 현재 지원행을 세며 취소도 total에 포함; 단계 인원은 IN_PROGRESS만 |

단계명은 자유 운영 데이터이고 상태 APPLIED/IN_PROGRESS/PASSED/REJECTED/CANCELED는 구조 코드다. `schema/jobApplication.ts`의 legacy 맵은 전부 null이다. Oracle 상태 코드를 추측해 채우지 않는다. 처리자·시각·단계명은 이벤트에 있으나 DB 불변성, seq, before/after 상태, 재지원 회차는 없다.

학생 `/jobs/:id`는 StageGate로 감싸지지 않았다(`App.tsx:125`), `JobDetail.tsx:41`은 canApplyTo만 부른다. 목록의 게이트를 직접 URL로 우회할 수 있다. 취업지원 서버 게이트 API도 없다. 프론트 게이트는 `pipeline.ts:65`의 진단/CARE 7+ 완료/hasRoadmap과 `careerProcess.ts:448`이다. DB의 `roadmap.confirmed`와 localStorage 기반 hasRoadmap은 같은 근거가 아니다.

### 3.3 개인정보·CSV·권한

- `JobApplicants.tsx:67`, `JobApplicantsList.tsx:16`은 범위 조건 없는 지원 배열을 읽고 처리한다. 학생 선택·직원 이름은 브라우저 컨텍스트로 정한다.
- CSV 14열은 `jobApplicationExport.ts:21`: 공고명/회사/이름/학번/대학/학과/학년/학적/진단유형/제출서류/현재전형/상태/지원일/최종변경일. `rowOf:27`의 주석은 스냅샷 우선이라지만 **실제는 최신 studentLite 우선**이다. collegeOf는 학과명에 기대며 과정·전공 코드가 없다.
- 학생 MyApplications는 자신의 ID로 filter하지만 서버 인가가 아니다(`MyApplications.tsx:48`). 지원자 상세 서류 다운로드는 구현되지 않았고 관리표는 서류 라벨만 표시한다.
- 실제 역할 제한 근거: `Counsel_README.md` §2, `schema/counselor.ts:42`, `012_menu_seed.sql:61`은 career 전용. `require_staff`만 복사하면 psych/assistant/professor도 관리하게 된다.
- 비교과 `applicant_scope`는 `dc.staff_student_scope`를 SQL에 적용한다(`programs.py:64`). 그러나 통계 `:121`은 같은 scope 없이 전체 집계한다. **통계까지 그대로 복사하지 않는다.**
- `auth.student_access:24`는 scope 외에 과거 상담 담당 관계를 UNION한다. 채용 학생범위에 이 우회 권한을 가져오지 않는다.

## 4. 파일이 필요한 정확한 지점 — #41

| 지점 | 현재 저장 실체 | 필요한 결정/후속 계약 |
|---|---|---|
| 추천공고 기업 로고 | JobForm.tsx:19·27·117·229: 160px PNG data URL, 200,000 문자 길이 검사. schema/job.ts:77; JobBoard/JobDetailView의 img | #41 저장 위치·이미지 제공 경로·기존 data URL 추출. 현재는 공고별 로고이므로 기업 공용 로고로 자동 합치지 않음 |
| 모집요강 삽입 이미지/포스터 | JobForm.tsx:372→RichEditor.tsx:9·143의 readAsDataURL/insertImage→content HTML | 본문 inline 파일 슬롯·권한·기존 HTML 재작성. 외부/붙여넣기 이미지도 검사 |
| 공고 첨부파일 | schema/job.ts:110 `attachments?: string[]`, JobDetailView의 파일명 목록 | **현재 JobForm에는 일반 첨부 업로드 컨트롤이 없다.** 파일명만으로 실재 파일을 복원할 수 없음. 신규 업로드/다운로드는 #41 뒤 구현 |
| 개별 이력서·자소서 등 지원 문서 | JobApplyModal.tsx:100 파일 선택: pdf/doc/docx/hwp/hwpx. onChange는 name만 저장. jobApplications.ts:227 이름 존재만 검사 | 바이트 업로드→검사완료 FileRef→지원 회차 귀속. 파일명만 있던 행은 재업로드 전 MISSING_BINARY로 표시 |
| 드림캐치 포트폴리오 | schema/jobApplication.ts의 PORTFOLIO는 **현재 본문 참조**. JobApplyModal은 INITIAL_*로 ResumeSheet 렌더 | 파일이 아님. #41로 묶지 않음. 실제 학생별 라이브 저장소는 DB.md #4 도메인 선행 의존 |
| AI 자소서 텍스트 | resumeMock.ts의 content 문자열 | 파일이 아님. 텍스트 저장·수정·삭제는 독립 설계 가능 |
| 자소서 “성장일지 첨부” | AiResume.tsx:56·169: 선택 일지를 텍스트 snippet으로 삽입 | 바이너리 첨부 아님. 성장일지 원본 이관은 #4, 본문 저장은 jobs |
| 이력서 PDF | Portfolio.tsx:49·92의 UI/알림 상태 | 저장된 PDF 파일이 아님. 향후 서버 보관 PDF를 도입할 경우만 #41 의존 |
| CSV 내보내기 | JobApplicants.tsx:117의 Blob/object URL | 즉시 응답 생성이므로 영구 파일 저장소 불필요 |

결정 정본은 `DB.md:639`(#41), 파일 보안/참조 계약은 `SPEC.md:1048` 및 `spec_v1.md:334`다. 기존 파일들의 실제 바이너리 위치·용량·브라우저별 수량은 알 수 없다. “이관 완료”라고 기록할 수 없다. 레거시 SY_FILE owner 매핑(#18)은 신규 파일 저장 선택과 별개 미결이다.

## 5. 자소서·포트폴리오·AI의 별도 상태

1. **jobs 텍스트 자소서**: SavedResume(id,title,company,jobType,position,categoryLabel,content,createdAt). AiResume에서 저장한 사용자 문서를 AiConsulting은 getAllResumes로 읽는다. JobsHome.tsx:12는 SAVED_RESUMES만 state로 만들고 삭제도 state에서만 수행한다.
2. **포트폴리오 자소서**: portfolio.ts의 Resume은 category/isAi/updatedAt 필드로 SavedResume과 다르다. INITIAL_RESUMES의 r1은 카카오이고 resumeMock의 r1은 삼성전자다. **같은 r1이 동일 문서라는 뜻이 아니다.**
3. Portfolio.tsx:35~41의 변경은 React 메모리뿐이고, JobApplyModal 및 StudentDetailView.tsx:627은 INITIAL_*를 다시 읽는다. “학생이 수정하면 담당자도 최신을 본다”는 주석 계약이 실제로 구현되어 있지 않다.
4. AiResume.tsx:70·148은 고정 AI_DRAFT_SAMPLE을 timeout 뒤 주입한다. AiConsulting.tsx:13·41은 고정 82점 평가다. 실제 AI 호출·모델·프롬프트·입력 근거는 없다. 이 값을 진짜 AI 결과로 DB에 승격하지 않는다.
5. AiJobs.tsx:69의 학생별 jobs 숫자 ID는 채용공고 ID와 매핑되지 않는다. 기존 `dc.student.detail`에 들어 있는 투영을 별도 채용추천 정본으로 취급하지 않는다. `SPEC.md:1200·1267`에 따라 실제 추천/평가 결과는 AI DB 책임이다.
6. 사람 첨삭 SS_JOB_RES 워크플로는 SPEC.md:209·470에서 요구되나 현재 요청/의견 API가 없다. jobs 지원 상태와 첨삭 상태를 하나로 합치지 않는다. 후속 포트폴리오 도메인 책임과 접점을 설계 문서에 분리한다.

## 6. 비교과 참조에서 가져올 것과 보완할 것

| 참조 | 재사용 | jobs 보완 |
|---|---|---|
| 018 SQL:1·38 | 구조 CHECK/운영 code_item FK, 검색·관계 필드 컬럼화, audit actor/time/version | 채용용 별도 테이블. program/selection/outcome 재사용 금지 |
| 018 SQL:141·149 | append-only trigger + SELECT/INSERT grant | 지원 ID·회차·seq·단계 이름 스냅샷 추가, 원행 논리삭제로 FK 유지 |
| programs.py:275 | 멱등키 잠금/hash/result와 업무 쓰기 한 transaction | 공고 생성·단계 변경·취소·재지원도 적용; 새 지원 회차에는 새 키 |
| programs.py:112·215·256 | 부모행 FOR UPDATE, version 충돌, join 잠금 대상 한정 | 공고→지원 순서 고정; 단계 편집과 진행 동시성 보호 |
| programs.py:64 | 학생 self / 직원 scope SQL | career 역할과 현재 scope 동시 검증, 목록·상세·이력·통계·export 동일화 |
| programStore.ts:30·43 | 기동 적재, 동기 selector, 성공 후 재조회/발행 | identity 분리, focus/주기 refresh, 오래된 응답 폐기. 지원 전량 preload 금지 |
| programs.ts:43·124·247 | 마감 파생·Promise 쓰기·서버 통계 | 실패 후 UI 닫지 않기, 재조회 실패와 쓰기 실패 구분 |
| test_programs.py:31·51·180·198·242 | 실 DB scope/멱등/불변/이력/version 검증 | 타직종 거부, 실제 동시 요청, 재지원·단계편집 race, CSV 범위 검증 추가 |

기존 공통 API 클라이언트 `shared/api.ts:14`는 응답을 항상 JSON으로 읽는다. 204와 CSV/Blob 업로드·다운로드를 직접 재사용하면 실패한다. jobs JSON 삭제는 200 명시 응답으로 설계하고 CSV/파일은 인증 헤더를 공유하는 별도 응답 처리 seam을 둔다.

## 7. 충돌·누락 대장

| ID | 근거 충돌 | 채택/처리 |
|---|---|---|
| C01 | SPEC S16 미구현 vs App·JobDetail·jobApplications | UI 시연 있음 / DB 미착수로 구분. SPEC 상태 갱신은 후속 담당자 |
| C02 | DB.md:334 “다른 도메인 의존 없음” vs 필수 PORTFOLIO와 pipeline | 파일 지원 또는 포트폴리오 DB 선행 필요, 게이트 DB 근거도 필요 |
| C03 | spec_v1 §8.1 전 코드 TS/코드 폴더 신설 vs SPEC:803·811, DB §8-5 | 도메인별 구조 코드 + DB 운영 코드. codes/ 새 집합 디렉터리 생성하지 않음 |
| C04 | spec_v1 §4 SQLAlchemy·modules/·db/migrations 제안 vs 현재 psycopg 평면 모듈 | backend/app/jobs.py + backend/migrations 후속 번호로 설계 |
| C05 | spec_v1 §6.1 total/통일 오류 vs 현재 totalCount/detail 및 ApiError | totalCount 유지, jobs 오류는 detail 문자열 + code 등 추가 |
| C06 | spec_v1 §8.1 비동기 읽기 서술 vs SPEC §5 동기 selector | 캐시 selector 동기, 초기화·쓰기·페이징만 async |
| C07 | PROCESS 취업지원 게이트 vs 직접 상세 접근/서버 미검사 | 서버 employment policy + 학생 상세 경로 보강. 진단 판정식 신설 안 함 |
| C08 | 마감 UI와 canApplyTo/count/sort 판정 불일치 | 서버 KST 마감 policy, stored/effective status 구분 |
| C09 | PORTFOLIO 라이브 공유 주석 vs 화면별 INITIAL_*·useState | 가짜 제출 금지, #4 의존 명시. 임의 immutable 제출본 정책으로 바꾸지 않음 |
| C10 | 전역 자소서·찜 vs self 권한 | 신규는 UID 소유. 기존 소유자 자동 추정 금지 |
| C11 | CSV snapshot 우선 주석 vs 최신 우선 구현 | 신청 당시 snapshot 표시, 필터 기준 명시, 현재 소속은 권한에만 사용 |
| C12 | stage fallback/삭제/재지원 vs 과거 timeline | 회차/seq/단계명 스냅샷으로 과거 복원. 없는 과거를 생성하지 않음 |
| C13 | spec_v1 §5.4 파일 격리 vs 로고·본문 data URL / 첨부명 | #41 USER_DECISION_REQUIRED, 파일 없는 나머지 독립 설계 |
| C14 | SPEC FileRef 신규 다형 모델 vs DB #18 legacy 미결 | 신규 ownerKind/ownerId/slot 계약 채택, Oracle owner 변환 보류 |
| C15 | 비교과 require_staff/전체통계 vs 채용 career/행 범위 | 메커니즘만 재사용, 인가 누락은 계승하지 않음 |
| C16 | spec_v1 학사 fixture FK 유보 vs 실제 dc.student/person FK | 현재 안정된 서비스 참조에 FK. 학사 직접 연결 전환은 별도 작업 |
| C17 | SPEC §10 폐기 직무관심/스킬매핑 vs 001·academic.py 잔존 | 이번에 정리하지 않으며 공고 찜에 재사용하지 않음 |
| C18 | STU/Counsel 문서 옛 백엔드 없음·R1~R6·단중장기 vs 최신 정본 | 최신 DB/PROCESS 우선. jobs에 옛 로드맵 정책 도입 안 함 |
| C19 | spec_v1 공고→기업→지원 동의 vs 현재 기업명 inline·동의 없음 | 기업 식별/지원 동의 기록 설계. 실제 동의 문안/제공 범위는 결정 필요 |
| C20 | spec_v1 운영/health/인증 향후안 vs main.py 개발 전용 단일 health | 이번 설계는 개발 배선. 공개 운영·실제 인증 완료 주장 안 함 |

## 8. 후속 검증의 기준

파일 저장 #41의 세 가지 결정, 지원 동의의 승인 문안, PORTFOLIO 실제 공급 여부를 별도 gate로 추적해야 한다. 파일 없는 공고·기업·전형·찜·자소서 텍스트·조회/통계 설계는 완료할 수 있다. 지원 상태 전이는 합성 검증 데이터로 독립 검증할 수 있지만 **필수 서류를 충족하는 실제 제출 경로 없이 새 지원 왕복 완료를 선언할 수 없다.**

코드 변경 없는 이번 단계에서는 build/pytest를 실행하지 않는다. C5/C6에서 수행할 SQL·API·프론트·실제 왕복 수용 기준은 짝 문서에 정의했다.

**DRAFT_FOR_OPUS_REVIEW**
