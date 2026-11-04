# 목록 표 디자인 통일 — 구현 기록

- 상태: `IMPLEMENTED_FOR_LEAD_REVIEW`
- 판정: `NO_DB_CHANGE` — table·API·loader·화면 동작 변경 없음, migration 없음
- 근거: 같은 폴더 `ui-spec.md`
- 커밋·푸시·`docker:up`: 하지 않음(팀장 검수 후 수행)

## 1. 변경 파일

수정 55개, 신규 2개(`shared/listTable.css`, 이 문서). 시작 시점의 기존 변경(`.gitignore`, `CLAUDE.md`, `docs/external-program-view-spec.html`, `.scratch_*`, `backend/app/graphify-out/`)은 건드리지 않았다.

**공용·진입점**
- 신규 `shared/listTable.css` — 표 `dc-list-table`, 격자 헤더·행, 칸 안 글자 14px. `!important` 없음
- `shared/tableAlignment.css` — `dc-cell-long` 예외, 채용공고·로드맵 이행률 격자의 가운데 정렬
- `src_admin/main.tsx`, `src_v2/main.tsx` — `index.css` 다음, `tableAlignment.css` 앞에 import
- `DESIGN.md` — 4장에 `List Table` 기준 한 줄

**페이지 시각 규칙 삭제(CSS)**
- `src_admin/index.css`
- `src_admin/components/`: `DiagnosisManagementModal.css`, `StudentChargeTable.css`(열 폭만), `StudentDetailView.css`
- `src_admin/pages/`: `AssistantAdvisor.css`, `DepartmentAssignments.css`, `MissionManagement.css`, `ProfessorCounsel.css`, `ProgramBlacklist.css`, `ProgramSurveyStats.css`, `PsychReferrals.css`, `RoadmapProgress.css`, `SystemManagement.css`
- `shared/components/CounselHistory.css`
- `src_v2/components/JobBoard.css`, `src_v2/pages/growth/MyPrograms.css`, `src_v2/pages/growth/ProgramDetail.css`

**className만 변경(TSX)**
- `shared/components/CounselHistory.tsx`
- `src_admin/components/`: `DiagnosisManagementModal`, `NoticeManagement`, `ProfessorMonthlyTable`, `StudentDetailView`
- `src_admin/pages/`: `AcademicDirectory`, `AssistantAdvisor`, `CompanyMembers`, `CounselJournals`, `CounselRequests`, `CounselSessions`, `DepartmentAssignments`, `DiagnosisStatus`, `EmploymentForecast`, `GroupCounsels`, `JobApplicantsList`, `MenuVisibility`, `MissionManagement`, `ProfessorCounselRecords`, `ProfessorCounselRequests`, `ProfessorCounselStats`, `ProfessorHome`, `ProgramManage`, `ProgramSatisfaction`, `ProgramSurveyStats`, `PsychExtraRequests`, `PsychReferrals`, `PsychTests`, `QuestManagement`, `RoadmapRequests`, `SystemManagement`
- `src_v2/`: `components/JobBoard`, `pages/growth/MyPrograms`, `pages/growth/ProgramNotice`

격자 목록 중 `StudentRosterTable`, `StudentChargeTable`, `StudentPicker`, `AssistantAdvisor`, `AssistantAdvisorRecords`, `JobApplicants`, `ProgramDetail`, `ProgramBlacklist`, `SmsBlacklist`, `RoadmapProgress`는 공용 격자 규칙으로 적용되어 TSX 변경이 없거나 표 부분만 바뀌었다.

## 2. 표별 긴 글 칸(`dc-cell-long`)

| 화면·표 | 왼쪽 정렬 칸 |
|---|---|
| NoticeManagement | 제목 |
| ProfessorCounselRecords | 상담제목 |
| ProfessorCounselRequests | 주제 |
| PsychExtraRequests | 제목 |
| PsychReferrals | 연계 사유 |
| ProgramSatisfaction, ProgramSurveyStats | 문항 |
| MissionManagement | 문제(영어단어 / 뜻) |
| QuestManagement | 퀘스트 / 완료 조건, 편성 이름 |
| StudentDetailView 2개 | 프로그램 |
| CounselHistory(`cs-table`) | 상담 주제, 공개 코멘트 |
| MyPrograms | 프로그램명 |
| CounselJournals, CounselSessions | 상담 주제 |
| CounselRequests | 상담 주제 |
| DiagnosisStatus | 결과 요약 |
| GroupCounsels | 회차명 |
| RoadmapRequests | 신청사항 |
| JobApplicantsList | 회사 · 공고 |
| ProgramManage | 프로그램명 |
| JobBoard | 공고제목 |

긴 글 칸이 없는 표: ProfessorHome, ProfessorMonthlyTable, ProfessorCounselStats, EmploymentForecast(취업처·부서는 짧은 값으로 판단), PsychTests, AcademicDirectory, MenuVisibility, SystemManagement, DiagnosisManagementModal, AssistantAdvisor, DepartmentAssignments, CompanyMembers, ProgramNotice 회차표, 학생 로스터류, JobApplicants, ProgramDetail, 블랙리스트, RoadmapProgress.

## 3. ui-spec 4장 밖에서 추가한 대상

ui-spec 4장 마지막 줄에 따라 넣었다.

- `StudentDetailView.tsx:469` — 학사 기록 화면의 비교과 표(`:490`과 같은 표 스타일)
- `RoadmapProgress` `rmp-lag-*` — `role="table"` 격자 목록
- `JobBoard` `jb-head`·`jb-row` — 열 제목이 있는 일반채용 목록. 5장의 `job-row`(메인·홈 카드)와 다른 클래스다. 1024px 이하에서는 기존처럼 머리글 없는 카드로 접히므로 가운데 정렬을 1025px 이상에만 적용했다

## 4. ui-spec과 달라진 점

- 빈 상태 칸의 `padding`을 `height`로 바꿨다(`professor-home-empty` 104px, `da-empty` 144px). 칸 padding 규칙을 없애면서 빈 상태 높이를 유지하려는 조치다
- 표 `thead` 두 줄(`mp-table`)은 강조선을 윗줄에만 두도록 공용 규칙 `thead tr + tr th { border-top: 0 }`을 추가했다
- 상담 신청 행은 펼침 패널과 한 묶음이라 밑줄을 `.counsel-request-row`가 아니라 `.counsel-request-row-wrap`에 둔다
- 블랙리스트 격자는 칸 패딩이 아니라 행 패딩으로 맞췄다(다른 격자와 같은 구조). `.blk-thead` 고정 높이 56px을 지웠다
- `td`에 직접 붙은 상태 색은 공용 칸 색에 밀리지 않도록 `td.professor-home-na`, `td.psych-extra-wait`로 선택자를 올렸다
- 남겨 둔 페이지 규칙(열 폭·상태 표시이지 칸 공통 시각 규칙이 아니라고 판단): 선택 행 배경(`.is-selected`, `.selected`), 고정 행(`.is-pinned`), 메뉴 깊이 행(`.mv-row.depth-0`), `td[rowspan]` 배경, 빈 행 hover 해제, 칩·버튼 고유 padding, 640px 이하 채용 카드 padding
- 칩·배지·링크의 굵기는 ui-spec대로 유지했다(`counsel-*-badge`, `professor-report-link`, `mp-survey-*` 등). 그래서 이 안의 글자는 400이 아니다
- 다음 hover 예외는 공용 hover로 통일하려고 지웠다: `.admin-student-roster` 행, `.admin-applicant-row`, `.jb-row.is-static`. 클릭되지 않는 행도 이제 hover 배경이 보인다

열 폭 조정(14px·패딩 증가로 넘친 곳):

| 목록 | 변경 |
|---|---|
| 로드맵 요청(`admin-rmreq-roster`) | 처리 칸 148→190px, min-width 1180→1222px |
| 진단 관리(`diagnosis-management-roster`) | 진단 관리 칸 96→104px |
| 신청자·선발자(`admin-applicant-mgmt-roster`) | 추가정보·첨부 칸 60→104px, min-width 각 +44px |
| 상담 신청(`counsel-request-*`) | 시간 72→96, 유형/상태 108→116, 상담 유형 112→120px |
| 내 프로그램(`mp-table`) | 고정 열 전부 확대, min-width 1030→1260px |

## 5. 실행 명령과 결과

| 명령 | 결과 |
|---|---|
| `npx.cmd tsc -b` | 통과(exit 0, 마지막 CSS 수정 뒤 재실행) |
| `npm run build` | 통과(exit 0, 1816 modules, 마지막 CSS 수정 뒤 재실행) |

### 브라우저 확인(ego-browser, 임시 Vite 5199 → 로컬 Docker API 18101)

임시 Vite는 작업 후 종료했고 저장되는 동작은 하지 않았다. **Ego 창이 최소화되어 있어 스크린샷은 찍지 못했다.** 아래는 계산된 스타일을 스크립트로 읽은 결과이며 눈으로 본 화면 검수가 아니다.

- 교직원 36개 경로 방문(1280px, 5개 역할, 이 중 빈 목록·권한 없는 경로는 표가 나오지 않음): 표가 나온 화면의 헤더 14px·600·강조선 `rgb(21,122,82)`·패딩 16px 12px, 칸 안 글자 14px, `strong`·`b`·`small` 400, 페이지 가로 넘침 0
- 학생 `/v2/program/status`, `/v2/counsel/record`(1280·390px): 헤더 14px·600·강조선 `rgb(124,92,252)`, 페이지 넘침 0, 표는 스크롤 래퍼 안에서만 넘침
- `dc-cell-long` 칸: `text-align:left` 확인, 헤더는 가운데
- 넘침을 찾은 로드맵 요청·진단 관리 칸은 열 폭을 고쳤다. 진단 관리는 재측정으로 해소를 확인했고, 로드맵 요청은 176px에서 184px까지 나와 190px로 올린 뒤 재측정은 하지 않았다
- 데이터가 없어 임시 행을 페이지에 DOM으로 넣어 확인: `counsel-request-row`, `jb-row`(1280px 표, 800px 카드 접힘 확인). `blk-row`도 넣었으나 진로취업상담사 계정이 그 화면에 들어가지 못해 `ProgramBlacklist.css`가 로드되지 않은 상태의 공용 규칙만 확인했다

## 6. 남은 제한

- 실제 데이터로 행을 보지 못한 화면: 상담 신청, 프로그램·SMS 블랙리스트, 채용공고 일반 목록, 상담 진행, 집단상담, 심리 연계, 취업예측, 교수 상담기록 목록, 지도학생, 프로그램 상세 회차표, 신청자 탭(선발자 탭은 확인)
- 열지 않은 화면·모달: 학생 상세 비교과 표, 진단 관리 모달, 전담교수 배정 모달, 학과 담당 검색 모달, 만족도·향상도 통계, 학사 자료 조회
- 마지막에 고친 `td.professor-home-na`, `td.psych-extra-wait` 색은 브라우저 재확인 없이 빌드만 통과했다
- 스크린샷이 없어 실제 모습, 줄바꿈, 칩이 커진 뒤의 균형은 사람이 봐야 한다
- 콘솔 오류·실패 요청·네트워크는 수집하지 않았다(CSS·className 변경만이어서 API 호출은 바꾸지 않았다)
- 로컬 Docker 재측정은 `docker:up` 금지로 하지 않았다
- 지워진 규칙의 클래스명 일부는 TSX에 남아 있다(`mm-id`, `blk-c-no`, `blk-c-name`, `blk-c-mono`, `dmm-strong`). 동작 영향은 없다
- Atlas 공유 기억 도구(`memory_briefing` 등)가 이 세션에 없어 조회·저장하지 않았다
