# 목록 표 디자인 통일 — UI 작업지시서

- 상태: `READY_FOR_SOL`
- 판정: `NO_DB_CHANGE` — table·API·loader·화면 동작을 바꾸지 않는다. CSS와 className만 바꾼다.
- 작성: 팀장(2026-11-04), 사용자 확정 사항 반영

## 1. 사용자 확정

1. 기준은 `/professor/home`의 「학과학생 현황」 표다. 폰트와 굵기까지 같게 한다.
2. **표 안 글자는 전부 14px이다.** 기준 표 자체도 13px에서 14px로 바꾼다.
3. 헤더 위 강조선은 각 SPA의 `--primary`를 쓴다(교직원 초록, 학생 보라).
4. 열 제목이 있는 목록·현황 표만 바꾼다. 문서형 표, 달력, 제목 없는 카드형 목록은 그대로 둔다.
5. 헤더와 짧은 값은 가운데 정렬이다. 제목·주제·내용처럼 긴 글이 들어가는 **본문 칸만** 왼쪽 정렬한다.

## 2. 공용 스타일 — `shared/listTable.css` 신설

`src_admin/main.tsx`, `src_v2/main.tsx`에서 `index.css` 다음, `tableAlignment.css` 앞에 import한다.
두 SPA의 토큰이 다르다(admin `--text`, v2 `--foreground`, v2에는 `--sel`이 없을 수 있음). 실제 정의를 확인하고 `var(--x, 폴백)`으로 쓴다.

| 요소 | 값 |
|---|---|
| 표 | `width:100%; border-collapse:collapse; font-size:14px; font-variant-numeric:tabular-nums` |
| 모든 칸 | `padding:16px 12px; border-bottom:1px solid var(--border)`, 글자색은 본문색, `font-weight:400` |
| `thead th` | `background:var(--muted); border-top:2px solid var(--primary); font-weight:600; white-space:nowrap` |
| `tbody th`(행 제목) | `background:var(--muted); font-weight:600; border-top:0` |
| `tfoot th, tfoot td` | `background:var(--muted); font-weight:700` |
| `tbody tr:hover` | `background:var(--sel, var(--muted))` — 행 제목과 tfoot 배경은 유지 |
| 칸 안의 `small`, `strong`, `b`, `span`, 칩, 배지, 링크, 버튼 | `font-size:14px`. `strong`, `b`, `small`은 `font-weight:400`. 칩·배지·버튼의 색과 모양은 유지. 아이콘(`svg`, `i`)은 크기를 바꾸지 않는다 |

- 표: 대상 `<table>`에 `dc-list-table` 클래스를 붙인다.
- div 격자 목록: `<table>`로 바꾸지 않는다. `grid-template-columns`는 유지하고, 같은 파일에서 `.admin-roster-head`·`.admin-roster-row`, `.counsel-request-columns`·`.counsel-request-row`, `.blk-thead`·`.blk-row`(실제 행 클래스 확인)에 같은 값을 준다. 헤더 행은 `thead th`, 본문 행은 모든 칸과 같은 모습이어야 한다. `.admin-roster-no`도 14px·400이다.
- 공용 파일이 지연 로드되는 페이지 CSS에 밀리지 않도록, **변환한 표의 페이지별 시각 규칙(font-size, font-weight, 칸 padding, th 배경·색, 테두리, hover)은 삭제한다.** 열 폭, `min-width`, `table-layout`, `white-space`, 배치 규칙은 유지한다. `listTable.css`에는 `!important`를 쓰지 않는다.
- 14px·패딩 증가로 격자 열이 넘치면 해당 목록의 `min-width`나 열 폭만 조정한다. 표 바깥의 가로 스크롤 래퍼는 유지한다.
- `.professor-report-table`의 시각 규칙(`ProfessorCounsel.css` 6~9행)은 공용 파일로 옮긴다. `min-width:1050px`만 남기고, 쓰는 표 전부에 `dc-list-table`을 붙인다. `.professor-home-grade-table`의 시각 규칙도 공용과 겹치면 삭제한다.

## 3. 긴 글 왼쪽 정렬 — `shared/tableAlignment.css`

`table th,td` 가운데 정렬 정책은 그대로 둔다. 학생 이름 왼쪽 정렬 예외(`.admin-name-cell`, `td.cs-name-cell`)도 유지한다.
같은 방식으로 예외 `dc-cell-long`을 추가한다. `table td.dc-cell-long`과 격자 본문 칸(`.admin-roster-row > .dc-cell-long`, `.counsel-request-row > .dc-cell-long`)만 왼쪽 정렬하고 **헤더는 가운데로 둔다**.
각 대상 표에서 제목·프로그램명·공고명·주제·내용·사유·메모처럼 길어질 수 있는 본문 칸에 이 클래스를 붙인다. 학과명, 날짜, 상태, 숫자, 유형은 짧은 값이다. 행 제목이 없는 목록의 첫 칸(번호, 체크박스)은 흰 배경의 `td`로 둔다.

## 4. 대상

**교직원 `<table>`:** `professor-report-table` 전부(ProfessorHome, ProfessorMonthlyTable, ProfessorCounselRecords, ProfessorCounselRequests, ProfessorCounselStats, EmploymentForecast, PsychTests, PsychExtraRequests 포함), `data-table`(NoticeManagement, AcademicDirectory, MenuVisibility, SystemManagement), `mm-table`(MissionManagement, QuestManagement), `pss-table`(ProgramSatisfaction, ProgramSurveyStats), `referral-table`(PsychReferrals), `dmm-table`(DiagnosisManagementModal), 클래스 없는 표(StudentDetailView:490, AssistantAdvisor:357, DepartmentAssignments 2개, CompanyMembers).

**교직원 div 격자:** `admin-roster` 전부(StudentRosterTable, StudentChargeTable, StudentPicker, AssistantAdvisor, AssistantAdvisorRecords, CounselJournals, CounselSessions, DiagnosisStatus, GroupCounsels, JobApplicants, JobApplicantsList, ProgramDetail, ProgramManage, RoadmapRequests), `counsel-request-*`(CounselRequests), `blk-*`(ProgramBlacklist, SmsBlacklist).

**공용·학생:** `cs-table`(`shared/components/CounselHistory.tsx`, `/counsel/records`와 학생 상담내역이 함께 쓴다), `cs-table mp-table`(MyPrograms), `pn-rounds-table`(ProgramNotice).

목록을 찾다 위 목록에 없는 열 제목형 목록을 발견하면 대상에 넣고 `implementation.md`에 적는다.

## 5. 제외 — 고치지 않는다

- `print-table`(CounselRecordPrint), `pf-resume-skill-table`(ResumeSheet), `pam-*`(신청서), `ccm-*`(동의서), `crm-table`(학생 정보 양식), `pxw-table`, `drr-table`(진단 결과), `CRAReport`, `qb-calendar`, QuestGrowthChart, `cc-grid-*`(시간표)
- **`pf-manager-table`, `pf-round-table`(`programs/new`) — `UI.md` 팔레트를 쓰는 의도된 예외다. 되돌리지 않는다.**
- `notice-row`, `job-row` 같은 제목 없는 카드형 목록

## 6. 제약

- 작업 트리의 기존 변경(`.gitignore`, `CLAUDE.md`, `docs/external-program-view-spec.html`, `.scratch_*`, `backend/app/graphify-out/`)은 건드리지 않는다.
- 커밋·푸시·`docker:up`은 하지 않는다. 팀장이 검수 후 수행한다.
- 코드를 찾을 때는 Graft를 먼저 쓴다(`powershell -NoProfile -File tools/graft/graft.ps1 ...`). 공유 컴포넌트는 두 SPA의 폭에서 모두 깨지지 않아야 한다.
- `src_v2`는 모바일 반응형이다. 표는 기존 가로 스크롤 래퍼 안에서 스크롤되고 페이지 전체가 넘치면 안 된다.
- `DESIGN.md`의 표 항목에 기준을 한 줄 적는다(없으면 알맞은 절에 추가). 다른 문서에 복사하지 않는다.

## 7. 완료 기준

- `npx.cmd tsc -b`, `npm run build` 통과
- 4장의 모든 표에 공용 클래스 또는 격자 규칙이 적용되고, 해당 표의 페이지 CSS에 `font-size`·`font-weight`·칸 `padding`·th 배경 규칙이 남아 있지 않다
- 5장 파일의 시각 규칙 변경 0건
- `implementation.md`에 변경 파일, 표별 긴 글 칸, 실행 명령과 결과, 남은 제한을 적고 상태를 `IMPLEMENTED_FOR_LEAD_REVIEW`로 둔다
