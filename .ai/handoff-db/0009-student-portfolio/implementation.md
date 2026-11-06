# student-portfolio 구현 기록

- 상태: `PASS`
- 기준: `work-order.md` revision 3, `architecture-review.md` `ASTRA_APPROVED`(revision 3), `.ai/db/GOLDEN_PATH.md` `READY`
- 구현일: 2026-11-06
- migration: `159_student_portfolio.sql`. 시작·종료 때 최신 번호를 확인했다(시작 158, 종료 159, dev HEAD `7b4bc4f` 변동 없음)
- 커밋·푸시·`docker:up`·로컬 개발 DB 적용은 하지 않았다. `dreamcatch` DB는 158 그대로다

## 변경 파일

**DDL**: `backend/migrations/159_student_portfolio.sql`(4장 DDL 그대로. 복구 주석만 더했다)

**FastAPI**
- 신규: `backend/app/portfolio_document.py`, `backend/app/student_portfolio.py`
- 수정: `backend/app/jobs.py`(지원 경로, `current_attempt`, capability, 제출본·파일 경로, 감사), `files.py`(슬롯·`store()` 사전), `growth.py`(모듈 설명), `main.py`(라우터)

**테스트**
- 신규: `backend/tests/contracts/fixtures/student_portfolio.json`, `backend/tests/contracts/test_student_portfolio_contract.py`, `backend/tests/test_student_portfolio.py`, `backend/tests/portfolio_test_support.py`
- 수정: `backend/tests/test_jobs.py`(`test_portfolio_submission_is_not_faked`를 `test_portfolio_submission_requires_a_chosen_portfolio`로 교체)

**공유 프론트**
- 신규: `shared/portfolioStore.ts`, `shared/portfolioSections.ts`, `shared/usePortfolioStore.ts`, `shared/ProtectedImage.tsx`, `shared/PortfolioSheet.tsx`, `shared/PortfolioSheet.css`
- 수정: `shared/api.ts`(`ApiError.code` 추가), `shared/studentCache.ts`(`portfolios` 도메인)

**학생 화면**
- 신규: `src_v2/pages/mypage/portfolio/{PortfolioVersions,PortfolioEditor,PortfolioImportModal}.tsx`, `PortfolioEditor.css`, `src_v2/pages/mypage/SubmittedPortfolio.tsx`
- 수정: `Portfolio.tsx`(탭 `versions`, `?tab=versions&edit=id`), `MyApplications.tsx`, `JobApplyModal.tsx`·`.css`, `JobDetail.tsx`, `App.tsx`, `GNB.tsx`, `navConfig.ts`, `GrowthHome.tsx`·`.css`(4학년 안내 제거)

**교직원 화면**
- 신규: `src_admin/pages/JobApplicantPortfolio.tsx`(라우트 `/jobs/applications/:applicationId/portfolio`, 레이아웃 밖)
- 수정: `src_admin/App.tsx`, `JobApplicants.tsx`, `data/jobApplications.ts`, `data/schema/jobApplication.ts`

**문서**: `DB_SCHEMA.md`, `DB.md`(§8-3 4번과 503 문구 전부), `SPEC.md`(S16), `STU_README.md`

## 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| 158까지 migrate + seed 한 `dc_sp0009_fixture_test`에 `app.migrate` | 159 적용 성공(기존 fixture DB) |
| `scripts/run_regression.py -k "not (기존 실패 4건)"` | 빈 DB에 001~159 적용·seed 성공. **685 passed, 2 skipped, 4 failed** |
| 대상 pytest(계약·기능·`test_jobs`·`test_jobs_review_security`) | 위 회귀에 포함, 전부 통과 |
| `npx.cmd tsc -b` | 오류 없음 |
| `npm run build` | exit 0 |
| `eslint`(신규·수정 프론트 파일) | 오류 없음 |

회귀의 4 failed는 이번 변경과 무관하다. 변경 전 HEAD를 별도 `_test` DB에서 돌려도 같은 4건이 실패했다. 사용자가 제외를 지시한 4건과는 **다른** 테스트다.
- `test_api.py::test_server_pagination_and_aggregates`
- `test_development_roadmap.py::test_out_of_scope_student_denied`
- `test_retire_jiwoo.py::test_exact_fixture_retirement_preserves_other_students_and_masters`
- `test_roadmap_generator.py::test_live_provider_creates_without_fixture_and_records_actual_inputs`

## 브라우저 왕복 QA (EgoLite)

조건: vite dev(5199) + uvicorn(18199, `dc_app` 계정) + `dc_sp0009_fixture_test`. **로컬 Docker가 아니다.** 학생 세션은 `_test` DB에 행을 직접 넣었다(이 DB의 fixture 로그인 뷰가 비어 있다). 실제 로그인 화면은 거치지 않았다.

3학년 학생 기준으로 다음을 실행했다. 콘솔 오류 0, 4xx·5xx 0.
생성 → 입력·사진 업로드 → 항목 추가·제거 → 임시저장 → 미리보기 → 지원 모달 첨부 → 지원 내역 「제출본 보기」 → 교직원 제출본 → 지원자 목록 표시.

- 포트폴리오 전용 호출: 페이지 진입 0건, 탭을 열 때 목록 1건. 지원 내역 목록에서 제출본 선조회 0건
- 390px: 가로 스크롤 없음, 패널이 본문 위, 항목 목록 접힘
- 인쇄 매체: 학생·교직원 모두 상단바·도구모음 숨김, 뺀 항목 없음, 사진 표시
- `Page.printToPDF`로 교직원 PDF 생성(214KB). **PDF 페이지 자체는 렌더링 도구가 없어 눈으로 보지 못했다**
- QA 중 고친 결함: 미리보기 도구모음이 상단바 뒤로 숨음, 빈 항목이 「(제목 없음)」으로 인쇄됨, 패널이 뷰포트보다 길 때 저장 버튼이 닿지 않음, 모바일에서 패널 제목 중복, 목록 시각이 UTC로 표시됨, 숙련도 라벨이 기존 `LEVEL_LABELS`와 달랐음
- 마지막 인쇄 CSS 수정(챗봇 버튼 숨김)은 브라우저로 재확인하지 않았다

측정 기준 비교: 작업지시서의 「첫 진입 7건」은 Docker 빌드 값이다. 이번 dev 서버 값(15건, StrictMode 포함)과 같은 조건이 아니므로 비교하지 않았다. Docker 재측정은 팀장 왕복 QA에 남는다.

## mock → API 매핑 결과

mock 없음. 원본 → 문서 매핑은 작업지시서 6장 표대로다. 표가 값을 정하지 않은 자리는 아래처럼 뒀다.

| 항목 | 처리 |
|---|---|
| `training.organizer`, `training.hours` | 빈 값. `program.manager`·`sessions`는 뜻이 달라 넣지 않았다 |
| `experience.startOn`(PROJECT) | `periodText`, 없으면 `occurred_on`/`date_text`. 기간 문자열 전체가 시작 칸에 들어간다 |
| PROJECT의 `stack` | 옮기지 않았다. 허용 키가 없다 |
| `coverLetter.question` | `job_resume.title` |
| `document`의 `sourceRef` | 형식대로 `growth:{entryId}`. 한 기록에 첨부가 여럿이면 겹치므로 프론트는 이 항목만 `fileId`로 거른다 |
| `certificate` | 학사 인증이 있는 자격의 성장 기록은 `cert:` 항목과 겹치므로 후보에서 뺐다 |

## fixture

`fixtures/student_portfolio.json`을 6장대로 작성했다. **팀장 대조·승인 대기.** 6장과 다른 응답 key는 만들지 않았다. 오류 응답에는 6장의 「현재 바이트 수를 함께 준다」를 `currentBytes`·`limitBytes`로 구현했다.

`files` 사전은 키가 파일 id라 fixture의 `<fileId>` 값으로 값 형태만 비교한다. `created`는 `document`와 `files`를 뺀 형태만 비교한다. 문서 형태는 `detail`이 맡는다.

## 작업지시서 외 판단

- `ApiError`에 선택 필드 `code`를 더했다. 저장 409가 버전 충돌인지 제목 충돌인지 화면이 구분해야 한다. 기존 호출자는 영향이 없다
- `PORTFOLIO`에 `fileId`를 같이 보내거나 `RESUME_FILE`에 포트폴리오 값을 같이 보내면 422다
- 형식이 잘못된 경로·본문 id는 패턴 검사로 422다(NUL이 SQL까지 가면 500). 형식이 맞고 없는 id는 6장대로 404다
- `fields`는 저장 때 허용 키 전체로 정규화한다. 빠진 키는 빈 문자열이 된다
- `portfolio-source`는 한도를 넘는 항목도 그대로 준다. 6장 응답에 `notImported`가 없어 숨기면 몰래 빠지기 때문이다. 고르면 학생이 줄여야 저장된다(저장 시 422)
- 이메일이 200자를 넘는 등 인적사항 자동 채움 실패는 `notImported`에 `sourceRef='personal:email'`로 알린다. 6장의 `sourceRef` 형식 목록에 없는 값이다

## 남은 제한

- `coverLetter.question`과 `experience.link`는 「짧은 값 200자」 규칙을 따른다. 200자가 넘는 회사 문항은 저장되지 않고, 2,000자까지 허용하는 성장 기록 링크는 200자를 넘으면 `notImported`가 된다. 한도 변경은 계약 변경이다
- 개발 서버 StrictMode에서는 제출본 화면이 두 번 호출돼 감사가 2행 남을 수 있다. 빌드에서는 1회일 것으로 보지만 확인하지 않았다
- 임시저장과 저장은 같은 PUT이다. 저장은 목록으로 돌아가고 임시저장은 편집기에 남는다. 자동 저장은 없다
- 미저장 경고는 「목록으로」 버튼에만 있다. 탭 전환이나 페이지 이동에는 없다
- 기존 「이력서」 탭과 이번 PDF 저장은 `window.print()`이고 서버 PDF가 아니다
- 사용자 제공 사진은 저장소에 없어 구현자가 대조하지 못했다. 항목 라벨은 작업지시서를 따랐다
- `_test` DB `dc_sp0009_fixture_test`, `dc_sp0009_baseline_test`, `dc_regression_*`가 남아 있다
- Atlas 공유 기억 도구가 이 세션에 없어 조회·저장하지 못했다

## 팀장 검수 (2026-11-06)

fixture는 6장 응답과 대조해 승인했다.

팀장 변경:

- `coverLetter.question`, `experience.link` 한도를 200자에서 2,000자로 넓혔다. 항목 이름은 200자로 두고 표시는 대표 칸 원문을 쓴다. key·구조 변경은 없다.
- 미저장 보호: 다른 메뉴 이동은 `useBlocker`, 새로고침·닫기는 `beforeunload`로 묻는다. 「포트폴리오」 탭은 한 번 열면 숨기기만 해서 탭 전환으로 입력을 잃지 않는다.
- 사진에 맞춰 학력·병역의 정해진 값을 선택 상자로 바꾸고 라벨을 맞췄다. 저장값은 문자열이다.

로컬 Docker 확인(학생 20180001, 실제 로그인): 생성, 자동 채움, 학사 칸 읽기 전용, 항목 추가, 선택 상자, 긴 문항 저장, 탭 전환 유지, 미리보기, 인쇄 화면, 삭제. 콘솔 오류·실패 요청 0건. `npm run docker:up`으로 백업 후 159 적용.
테스트: 포트폴리오·채용 117 passed, `tsc -b`, `npm run build` 통과.

제한:

- 지원 첨부 → 교직원 제출본 → PDF는 로컬 Docker에서 팀장이 돌리지 못했다. 로컬에 마감 전 공고가 없고 테스트 학생이 단계 잠금 상태다. API 테스트와 Sol의 격리 DB 브라우저 왕복으로만 확인했다.
- 인쇄 PDF(132KB)는 생성만 확인했고, 화면은 인쇄 매체 스크린샷으로 봤다.
- 포트폴리오 페이지 진입 시 `/students/{id}/portfolio`가 2회 호출된다. 기존 탭 코드 동작으로 보이며 이번에 고치지 않았다.
