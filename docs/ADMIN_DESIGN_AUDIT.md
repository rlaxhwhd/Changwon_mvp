# 관리자 화면 디자인 점검 목록

점검일: 2026-09-15 · 브랜치: `design` · 목적: 수정 전 문제 목록 작성

## 요약

**35개 정비 항목을 찾았다.** 가장 먼저 볼 것은 홈의 데스크톱 레이아웃 깨짐, 챗봇의 작업 버튼 가림, 비교과 카드 아이콘 누락, 제목·경로 표시 오류다. 그다음 검색·탭·표·폼의 공통 규격을 정리하는 순서가 적절하다.

단순히 색이나 배치가 다르다는 이유만으로 오류로 분류하지 않았다. 업무가 달라 필요한 필드·정보량이 다른 것은 유지하고, 같은 역할을 하는 요소의 표현과 조작 방법이 달라지는 부분을 정비 대상으로 삼았다.

- 실제 브라우저에서 **43개 URL 경로**를 확인했다. 진로취업상담사·심리상담사·교수·조교 계정을 사용했다.
- 기본 점검 크기는 1440×1000. 홈과 비교과 신청자 표는 1280×900에서도 확인했다.
- 학생 상세 8개 탭, 등록 폼 하단, 상담 처리·일지·학생 상세·집단상담·교수 배정·벌점 이력 모달도 확인했다.
- 시각 관찰을 소스 및 브라우저 계산 스타일과 대조했다. 모든 저장·삭제·배정·발송·선발 작업은 실행하지 않았다.
- **이번 작업은 이 문서 작성뿐이다.** 이전에 수정한 GNB 파일은 유지했다.

### 우선순위와 근거 표기

- **P1:** 깨짐, 가림, 잘못된 상태·위치 표시 등 우선 수정할 문제.
- **P2:** 같은 업무 요소의 규격·배치·사용법을 통일할 문제.
- **P3:** 문구·세부 표현·미구현 화면 안내 등 후속 정리.
- **화면+코드:** 실제 화면에서 확인하고 구현도 대조함.
- **코드:** 현재 데이터로 해당 상태를 열 수 없거나 저장을 실행해야 하므로 구현으로만 확인함.

## 1. 우선 수정할 화면 오류

### 01 · P1 · 1280px에서 홈의 열 배치가 깨짐

- **화면:** 상담사 홈 `/admin`.
- **관찰:** 오른쪽 열은 아래로 내려가는데 상단 그리드에는 세 번째 열의 빈 공간이 남는다. 가로 스크롤도 생긴다. 인사 문구가 3줄이 되면서 밑줄 장식과 소속·날짜 줄이 겹친다.
- **원인:** 1399px 분기에서 오른쪽 열을 전체 폭으로 보내는 규칙과, 뒤에서 다시 3열로 지정하는 규칙이 함께 살아 있다. 후반 2열 분기는 1199px부터라 1200~1399px 사이가 어긋난다.
- **방향:** 그리드와 오른쪽 열의 전환 조건을 한곳에서 관리하고 인사 카드 높이를 내용에 맞춘다.
- **근거:** 화면+코드 · [Home.css:259](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/Home.css:259), [Home.css:352](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/Home.css:352), [Home.css:542](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/Home.css:542).

### 02 · P1 · 챗봇이 실제 작업 버튼을 가림

- **화면:** 상담 진행, 학생 상세의 로드맵 탭, 화면 오른쪽 끝에 작업 버튼이 있는 표.
- **관찰:** 1440×1000 상담 진행 화면에서 `저장 후 완료 처리` 버튼과 챗봇이 겹친다. 버튼 영역 x=1228~1380, y=912~954이고 챗봇은 x=1339~1401, y=914~976이다. 학생 상세의 `로드맵 편집`도 같은 위치에서 가려진다.
- **방향:** 플로팅 버튼을 위한 공간을 확보하거나 편집 화면에서 위치를 조정한다. 스크롤 위치가 달라도 주요 작업을 가리지 않도록 한다.
- **근거:** 화면+코드 · [index.css:2474](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:2474), [CounselSession.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselSession.tsx).

### 03 · P1 · 비교과 목록 카드의 날짜·인원 아이콘 누락

- **화면:** 비교과 프로그램 목록.
- **관찰:** 모집기간·진행기간·정원 앞에 아이콘 공간만 남는다. DOM의 `#i-calendar`, `#i-calendar-check`, `#i-users` 참조 대상이 모두 없다.
- **원인:** 공유 `ProgramCardGrid`는 `Icon`을 쓰지만 관리자 공통 셸에 해당 `IconSprite`가 없다. 홈 전용 스프라이트와도 별개다.
- **방향:** 공유 아이콘의 의존성을 관리자 진입점에도 연결하거나, 컴포넌트가 단독으로 렌더되도록 정리한다.
- **근거:** 화면+코드 · [ProgramCardGrid.tsx:64](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/pages/growth/ProgramCardGrid.tsx:64), [Icon.tsx:12](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/components/Icon.tsx:12), [Layout.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/Layout.tsx).

### 04 · P1 · 제목 앞 아이콘이 제목 윗줄로 떨어짐

- **화면:** 로드맵 편집, 프로그램 수정·신청자·선발자 공통 헤더.
- **관찰:** 아이콘이 별도 줄을 차지해 제목 높이가 일반 화면 약43px에서 약71px로 커진다.
- **원인:** `h1.admin-page-title`에 SVG를 바로 넣지만 아이콘과 텍스트의 가로 정렬 규칙이 없다. 현재 계산 스타일에서 SVG는 block이다.
- **방향:** 아이콘 선택 기능이 있는 공통 페이지 헤더로 정리한다.
- **근거:** 화면+코드 · [ProgramShell.tsx:54](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramShell.tsx:54), [RoadmapEditor.tsx:173](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/RoadmapEditor.tsx:173), [index.css:551](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:551).

### 05 · P1 · 등록 화면에 경로 표시가 두 번 나옴

- **화면:** 프로그램 등록, 채용공고 등록.
- **관찰:** GNB 아래 공통 경로와 제목 아래 개별 경로가 중복된다. 프로그램 화면은 `프로그램 등록`과 `프로그램 개설 관리`라는 서로 다른 명칭까지 함께 보인다.
- **방향:** 공통 `PageCrumb`만 쓰고 화면 제목·메뉴명을 맞춘다.
- **근거:** 화면+코드 · [ProgramForm.tsx:250](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramForm.tsx:250), [JobForm.tsx:191](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/JobForm.tsx:191), [Layout.tsx:21](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/Layout.tsx:21).

### 06 · P1 · 상세 화면의 현재 위치가 잘못되거나 부족함

- **화면:** 외부 채용공고 상세, 프로그램 관리 상세, 상담 진행.
- **관찰:** 외부 공고 상세의 경로가 `교내 공고 목록`으로 표시된다. 프로그램 수정·신청자·선발자는 모두 `프로그램 목록`까지만 표시된다. 상담 진행은 `상담 관리`까지만 나온다.
- **원인:** URL 접두어 중심으로 메뉴를 찾는 구조이고 상세 화면별 경로 보완이 충분하지 않다. `ProgramShell`에는 leaf 등록이 없다.
- **방향:** 데이터의 공고 출처와 현재 관리 탭을 경로에 반영한다. 동적 상세 경로의 부모를 명시할 수 있어야 한다.
- **근거:** 화면+코드 · [navConfig.ts:257](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/navConfig.ts:257), [PageCrumb.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/PageCrumb.tsx), [JobView.tsx:19](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/JobView.tsx:19).

### 07 · P1 · 요약·필터와 카드의 마감 상태가 서로 다름

- **화면:** 비교과 프로그램 목록·관리 상세, 외부 채용공고 목록.
- **관찰:** 비교과는 상단 `모집중 2`인데 두 카드가 모두 `마감`이다. 관리 상세의 모집 상태도 `모집중`으로 남는다. 외부 채용은 `게시 6 · 마감 0`인데 여섯 카드가 모두 `마감`이다.
- **원인:** 저장된 status로 세는 집계·필터와 날짜까지 고려하는 카드 표시가 분리되어 있다.
- **방향:** 게시 상태와 접수 상태를 구분해 이름을 붙이거나, 같은 마감 판정을 공유한다. 운영 상태와 모집 상태가 다른 것은 정상이며 그 차이를 명확히 표시해야 한다.
- **근거:** 화면+코드 · [ProgramList.tsx:26](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramList.tsx:26), [jobsSource.ts:87](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/data/jobsSource.ts:87), [jobsSource.ts:125](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/data/jobsSource.ts:125).

### 08 · P1 · 일부 버튼·마감 카드의 글자 대비가 약함

- **화면:** 블랙리스트 엑셀 다운로드, 외부 채용공고 카드.
- **관찰:** 블랙리스트의 흰색14px 글자와 밝은 초록 `#24B37A`의 대비는 약2.69:1이다. 공통 진한 초록 `#157A52`와 흰색은 약5.33:1이다. 마감 채용 카드는 전체에 opacity 0.62를 적용해 설명·날짜·태그까지 흐려진다.
- **방향:** 버튼 글자를 읽기 쉬운 색 조합으로 통일하고, 마감은 배지·버튼 상태로 표현한다. 열람 가능한 카드 본문 전체를 흐리게 처리할 필요가 있는지 재검토한다.
- **근거:** 화면+코드 및 색 대비 계산 · [ProgramBlacklist.css:111](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramBlacklist.css:111), [JobBoard.css:91](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/components/JobBoard.css:91).

### 09 · P1 · 모달 위에 챗봇이 남고 배경 격리가 불완전함

- **화면:** 학생 상세·교수 배정·상담일지·집단상담·벌점 모달 공통.
- **관찰:** 배경은 어두워지지만 챗봇은 밝은 상태로 모달 위에 남는다.
- **원인:** 모달 z-index1200, 챗봇1300. `AdminModal`에는 배경 스크롤 잠금·초기 포커스·포커스 복귀/가두기 처리가 없다. 홈의 별도 문진표에는 스크롤 잠금이 있어 동작도 다르다.
- **방향:** 모달 열림 상태를 공통으로 관리해 플로팅 UI와 배경을 함께 비활성화한다. 포커스 관련 부분은 코드 확인 사항으로, 전 경로 키보드 테스트는 후속 검증이 필요하다.
- **근거:** 화면+코드 · [AdminModal.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/AdminModal.tsx), [index.css:2440](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:2440), [index.css:2475](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:2475).

## 2. 공통 컴포넌트로 정리할 항목

| ID / 우선 | 대상 | 확인한 차이·어색함 | 정리 방향 / 근거 |
|---|---|---|---|
| **10 / P2** | 버튼 전반 | 공통 `admin-btn`, 홈 `btn`, 상담 `counsel-*`, 비교과 `pf-*`, 채용 `jf-*`, 블랙리스트 `blk-*`가 별도 규격. 같은 작은 버튼도34/36px, 보통 버튼42/44/46px, 모서리8/10/11/12px로 갈린다. 공통 버튼조차 ghost만 테두리가 있어 같은 padding에서 높이가2px 차이 난다. | 크기·강조 단계·아이콘 간격을 Button 변형으로 관리. [index.css:555](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:555), [Home.css:38](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/Home.css:38), [ProgramBlacklist.css](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramBlacklist.css). |
| **11 / P2** | 내보내기 버튼 | 같은 엑셀 다운로드가 상담 접수·통계에서는 테두리형, 일지·조교 배정에서는 진한 초록, 블랙리스트에서는 밝은 초록이다. 보조 작업이 페이지마다 주 작업처럼 강조된다. | 내보내기의 강조 수준과 위치를 ListToolbar에서 고정. [CounselJournals.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselJournals.tsx), [CounselStats.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselStats.tsx), [AssistantAdvisor.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/AssistantAdvisor.tsx). |
| **12 / P2** | 상태 탭·범위 전환 | 상담 접수는40px·짙은 배경 선택, 그룹/교수/프로그램은34px·흰 배경+초록 글자, 로드맵 범위 전환은36px. 트랙 폭도 내용만큼/전폭이 섞인다. | 업무 탭과 작은 범위 전환을 두 종류로 정의하고 같은 용도끼리 통일. [index.css:836](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:836), [CounselRequests.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselRequests.tsx), [RoadmapProgress.css](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/RoadmapProgress.css). |
| **13 / P2** | 검색·필터 배치 | 상담은 흰 카드 한 줄, 진단/학생은 배경 위 라벨형, 채용은38px 선택값형, 블랙리스트는46px 두 줄이다. 블랙리스트의 검색 버튼은 첫 줄 오른쪽, 검색어는 둘째 줄이라 동작 관계가 멀다. | 공통 FilterBar에 검색·조건·실행·초기화 영역을 둔다. 프로그램 관리의 필터 부재는 데이터 증가 시 확장 검토 항목으로 남긴다. [StudentChargeTable.tsx:165](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentChargeTable.tsx:165), [JobBoard.css:17](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/components/JobBoard.css:17), [ProgramBlacklist.css:7](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramBlacklist.css:7). |
| **14 / P2** | 검색 실행 방법 | 담당/전체 학생은 검색 제출, 진단·교수 학생 검색·채용 목록은 입력에 따른 조회로 구현되어 있다. 화면에는 작동 방식 차이를 알려주는 공통 표현이 없다. 초기화도 제목 오른쪽/필터 안/없음으로 갈린다. | 즉시 검색과 조건 적용형을 구분하고 같은 목록군에서 일관되게 사용. [StudentChargeTable.tsx:166](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentChargeTable.tsx:166), [StudentRosterTable.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentRosterTable.tsx), [DiagnosisStatus.tsx:112](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/DiagnosisStatus.tsx:112). |
| **15 / P2** | 표의 밀도·열 표현 | 대부분 목록은 CSS grid, 학생 상세 비교과는 table, 채용은 전용 행/카드다. 헤더 흰색/회색, 본문500/700, 이름·학번 순서, 학과·대학 합침 여부가 다르다. 비교과 신청자는 선택 열 포함15열이라1280px에서 가로 스크롤로 첨부/벌점이 밀린다. | 데이터별 열은 유지하고 헤더·행 높이·보조 텍스트·고정 열·가로 스크롤 방식을 공통 Table 틀로 제공. 단순히 table 태그 사용 여부 자체를 오류로 보지는 않는다. [index.css:1321](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:1321), [ProgramDetail.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramDetail.tsx), [StudentDetailView.tsx:358](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentDetailView.tsx:358). |
| **16 / P2** | 상세로 들어가는 방법 | 상담일지는 초록 이름 링크, 학생 목록은 행 전체+상세 표시, 교수 학생 목록은 `보기` 버튼, 프로그램 관리는 행 전체, 블랙리스트도 행 전체다. 클릭 가능한 이름과 단순 이름을 구별하는 규칙이 일정하지 않다. | 이름 링크 또는 명시적 상세 버튼을 목록군별로 고정. 행 클릭은 보조로 제공하고 선택 체크박스와 충돌하지 않게 한다. [StudentChargeTable.tsx:244](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentChargeTable.tsx:244), [StudentRosterTable.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentRosterTable.tsx), [ProgramManage.tsx:150](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramManage.tsx:150). |
| **17 / P2** | 페이지 이동·건수 | 진단/학생은 이전·다음+`1 / N 페이지`, 블랙리스트는 숫자 버튼, 상담 접수는 건수·페이지 크기·숫자 페이지가 분리된다. 버튼도34/38px로 다르다. | Pagination과 ResultCount를 공통화하고 번호 범위·페이지 크기 표시는 옵션으로 둔다. [index.css:1466](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:1466), [ProgramBlacklist.css:166](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramBlacklist.css:166), [CounselRequests.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselRequests.tsx). |
| **18 / P2** | 요약 지표 카드 | 일지/신청자는 아이콘46px 가로형120px 카드, 상담통계·심리검사는 숫자 중심, 로드맵은 왼쪽 색 띠, 홈은 또 별도다. 특히 심리검사는4개 지표를5열 `admin-statsum`에 배치해 오른쪽 한 칸이 빈다. | 일반 지표 카드를 공통화하고 개수에 따라 열 수를 지정. 진행률 등 추가정보는 슬롯으로 제공. 학생 공용 StudentStatCards는 별도 의미가 있으므로 유지. [PsychTests.tsx:156](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/PsychTests.tsx:156), [index.css:1404](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:1404), [RoadmapProgress.css](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/RoadmapProgress.css). |
| **19 / P2** | 카드의 중첩·모양 | 홈 브리핑은 카드 안에 기록 카드·지표 카드·정보 상자가 중첩된다. 비교과 목록도 카드 그리드 전체를 큰 흰 카드로 감싸 여분의 흰 공간을 만든다. 채용 카드는 명시적으로 radius0이라 관리자 둥근 카드와 차이가 크다. | 카드 목록 바깥 카드가 필요한지 정리하고 계층별 테두리/배경 사용을 줄인다. 채용 radius0은 의도된 공용 디자인이므로 학생 쪽 영향까지 보고 결정. [Home.css](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/Home.css), [ProgramList.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramList.tsx), [JobBoard.css:83](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/components/JobBoard.css:83). |
| **20 / P2** | 섹션 간격·빈 공간 | 진단·심리검사·조교 실적에서 제목과 본문 사이가 크게 벌어진다. 바깥 flex gap22px와 `admin-card-head` margin-bottom16px가 겹친다. 상담 일정의 우측 가능 시간대 카드는 짧은 내용인데 좌측 긴 일정 목록 높이까지 늘어난다. | 페이지 섹션과 카드 내부 헤더를 분리하고 여백 책임을 한곳에 둔다. 독립된 양쪽 카드는 시작점만 정렬한다. [index.css:259](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:259), [index.css:618](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:618), [CounselSchedule.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselSchedule.tsx). |
| **21 / P2** | 입력 필드·폼의 시각 언어 | 기본 프로필은12px 모서리·위쪽 라벨, 프로그램은10px·큰 세로 폼, 채용은6px·회색 왼쪽 라벨 표, 집단상담 개설은 작은 모서리의 별도 필드다. 별표/도움말의 색·간격도 다르다. | FormField·RequiredMark·Hint의 기본 규격을 공유하고 가로/세로 폼은 변형으로 관리. **ProgramForm의 파란 팔레트는 기존 명시적 예외이므로 자동으로 초록색으로 바꾸지 않는다.** [JobForm.css:5](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/JobForm.css:5), [ProgramForm.css:5](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramForm.css:5), [SettingsProfile.tsx:58](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/SettingsProfile.tsx:58). |
| **22 / P2** | 저장·취소 영역 | 프로그램 등록은 상단+하단, 채용 등록은 하단 오른쪽, 교수 상담 기록은 하단 중앙, 프로필은 카드 내부 오른쪽이다. 취소/목록/닫기가 같은 위치에서 서로 다른 역할을 한다. | FormActions의 정렬·순서를 통일. 긴 폼에 상하단 작업을 함께 두는 차이는 유지하되 규칙으로 명시. [ProgramForm.tsx:709](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramForm.tsx:709), [JobForm.tsx:375](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/JobForm.tsx:375), [ProfessorCounselRecords.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProfessorCounselRecords.tsx). |
| **23 / P2** | 모달 안의 정보·하단 버튼 | 외곽 AdminModal은 공유하지만 내부 정보는 회색 요약 카드/흰2열 정의목록/구분선 섹션으로 제각각이다. 벌점 차감 버튼은 왼쪽, 배정·일지는 오른쪽. 공통 footer가 없어 닫기·취소·주 작업 배치가 각자다. | ModalSummary·ModalSection·ModalFooter를 제공. 내용을 모달마다 복사해 만들기보다 조합한다. [AdminModal.tsx:35](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/AdminModal.tsx:35), [CounselJournals.tsx:68](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselJournals.tsx:68), [ProgramBlacklist.tsx:327](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramBlacklist.tsx:327), [AssistantAdvisor.tsx:317](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/AssistantAdvisor.tsx:317). |
| **24 / P2** | 상담 처리 모달의 정보 순서 | 학생 기본정보→진단→이번 요청→처리 이력→로드맵 뒤에 처리 탭/입력이 온다.1440×1000에서도 최초 화면에 실제 처리 입력이 보이지 않아 긴 스크롤을 해야 한다. | 현재 요청과 처리 영역을 먼저 배치하고 참고 정보는 접기 또는 별도 탭으로 제공. 공통 footer로 완료 동작을 찾기 쉽게 한다. [CounselRequests.tsx:166](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselRequests.tsx:166). |
| **25 / P2** | 상태 배지의 의미색 | 집단상담의 `예정`과 `완료`가 모두 초록 계열이다. 일지 `작성중`은 요약 카드 파랑/행 배지 회색. 비교과 `대기`는 관리 화면 노랑/학생 상세 탭 무채색이다. 상담 확정도 채널 카드에서는 채널색을 따른다. | 상태를 나타내는 색과 카테고리를 나타내는 색을 분리하고 공통 StatusBadge로 매핑. 유형T1~T6의 고유색은 유지. [GroupCounsels.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/GroupCounsels.tsx), [CounselJournals.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/CounselJournals.tsx), [StudentDetailView.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentDetailView.tsx). |
| **26 / P2** | 빈 상태·로딩 상태 | 채용 목록은 페이지 배경 위 회색 폴더, 지원자 목록은 흰 카드 안 초록 선 아이콘+CTA, 학생 상세는 작은 텍스트다. 교수 상담 접수는 처음 로딩 중에도 `신청이 없습니다`가 잠깐 보인다. | 빈 데이터/검색결과 없음/로딩/오류를 공통 AsyncState로 구분하고 카드 안/페이지 전체 크기만 변형. 로딩 중0건은 실제 빈 상태로 판정하지 않게 한다. [EmptyState.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/EmptyState.tsx), [JobBoard.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/components/JobBoard.tsx), [ProfessorCounselRequests.tsx:187](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProfessorCounselRequests.tsx:187). |
| **27 / P2** | 학생 상세의 임베드 밀도·제목 | 동일 상세를 페이지/모달/상담 분할 화면에 재사용하는 것은 좋다. 다만 분할 화면에는 h1이2개이며5개 요약 카드와8개 탭이 좁은 폭에 유지된다. 학생 전체 페이지에 비해 숫자·보조 설명이 조밀하다. | 임베드용 제목 단계와 정보 밀도 변형을 추가. 공유 StudentStatCards의 원형을 임의로 바꾸기보다 컨테이너 폭과 배치를 조절. [StudentDetailView.tsx:746](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentDetailView.tsx:746), [index.css:1024](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/index.css:1024). |
| **28 / P2** | 학생 상세 탭별 시작 간격 | 진단·상담·비교과·GAP은 탭 아래 여백이 있는데 성장·퀘스트의 첫 지표 카드, 포트폴리오 안내 배너, STAR 메타 줄은 탭에 바로 붙는다. 전환할 때 본문 시작선이 달라진다. | 탭 패널의 바깥 여백을 공통 wrapper에서 관리. 탭별 내부 카드 구조는 유지. [StudentDetailView.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentDetailView.tsx), [StudentDetailView.css](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/StudentDetailView.css). |
| **29 / P2** | 프로필 아바타 | 상담사 프로필과 교수 상담 노출 설정에서66px 초록 원만 있고 사람 아이콘·이니셜·이미지가 전혀 없다. GNB의 사람 아이콘 아바타와도 다르다. | 공통 Avatar에 이미지→이니셜/아이콘 fallback을 제공. [SettingsProfile.tsx:46](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/SettingsProfile.tsx:46), [ProfessorProfile.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProfessorProfile.tsx). |
| **30 / P2** | 편집기·완료/확인 UI | RichEditor는 재사용하지만 Summernote 기본32px 도구막대·3px 모서리·아이콘 스타일이 주변 폼과 달라 보인다. 저장 피드백은 버튼 `저장됨`, 별도 모달, 프로필의 dirty 해제 등으로 다르며 삭제·반려 확인에는 브라우저 confirm/prompt/alert도 섞인다. | 편집기 외곽 스킨, Toast/SaveStatus, ConfirmDialog를 공통화. 네이티브 대화상자와 저장 결과 차이는 코드 근거이며 실제 저장은 실행하지 않음. [RichEditor.css](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/RichEditor.css), [JobForm.tsx:182](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/JobForm.tsx:182), [JobApplicants.tsx:101](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/JobApplicants.tsx:101), [RoadmapEditor.tsx:146](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/RoadmapEditor.tsx:146). |

## 3. 메뉴·문구·세부 표현

| ID / 우선 | 대상 | 확인한 문제 | 정리 방향 / 근거 |
|---|---|---|---|
| **31 / P3** | 미구현 메뉴 | 교수의 `내 프로필`, 조교의 `학과추천기업관리`가 일반 메뉴와 같은 상태로 표시되지만 들어가면 준비 중이다. 조교 프로필 메뉴도 준비 중 화면으로 연결된다. | 메뉴에서 준비 중 표시 또는 노출 정책 통일. [NotReady.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/NotReady.tsx), [App.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/App.tsx), [GNB.tsx:139](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/GNB.tsx:139). |
| **32 / P2** | 역할별 홈의 작업 카드 | 심리상담사 홈에도 `로드맵 변경요청` 카드가 있지만 GNB에는 로드맵 메뉴가 없고 해당 경로는 진로상담사 전용이다. 역할에 맞는 메뉴와 홈의 바로가기 구성이 일치하지 않는다. | 같은 권한·메뉴 정의로 홈 카드도 노출 제어. 관찰은 심리 홈 카드, 권한 제한은 코드 확인. [Home.tsx:178](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/Home.tsx:178), [navConfig.ts:87](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/components/navConfig.ts:87), [App.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/App.tsx). |
| **33 / P3** | 구현 설명이 화면 문구로 노출 | 로드맵 편집의 `JSON`, `override`, `병합`, 집단상담의 `별도 도메인`, 프로그램 목록의 `공급 측`, 로드맵 통계의 데모 담당 범위 설명 등이 관리자 업무 문장에 섞인다. | 데이터 영향은 유지하되 업무 용어로 표현. 예: `확정한 변경 내용이 학생의 로드맵에 반영됩니다.` [RoadmapEditor.tsx:195](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/RoadmapEditor.tsx:195), [GroupCounsels.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/GroupCounsels.tsx), [ProgramList.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramList.tsx). |
| **34 / P3** | 명칭·날짜·단위·글자 체계 | 학생 건수를 블랙리스트는 `개`, 다른 목록은 `명`으로 표기한다. `2026-08-21`/`2026.03.12`, `임시 저장`/`임시저장`, `대면·비대면`/`온라인·오프라인`이 섞인다. 채용 제목에 `기업일반정보 영역` 같은 설계용 명칭이 남고, 카드/목록 헤더는15/16/17/18px 및700/800이 섞인다. | 날짜·시간·단위 포매터와 화면 용어집, 제목 단계별 폰트 토큰 정리. 의미가 다른 용어는 무조건 치환하지 않고 정의부터 확인. [ProgramBlacklist.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramBlacklist.tsx), [JobForm.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/JobForm.tsx), [ProfessorCounselRecords.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProfessorCounselRecords.tsx). |
| **35 / P2** | 프로그램 공고 미리보기 요약 폭 | 오른쪽 신청 정보 요약의 운영기간이 좁은 셀에서 날짜 마지막 숫자만 다음 줄로 떨어진다. 본문과 요약에 동일한 날짜·정원·장소가 반복되어 페이지가 길다. | 날짜를 하나의 읽기 단위로 줄바꿈하고 요약 필드 폭/구성을 조절. 미리보기는 실제 학생 화면과 동일해야 하므로 공유 컴포넌트에서 함께 검토. [ProgramNoticeView.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_admin/pages/ProgramNoticeView.tsx), [ProgramDetail.tsx](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/pages/growth/ProgramDetail.tsx). |

## 4. 화면별 점검표

경로의 공통 앞부분은 `/admin`이다. 서로 다른 URL 43개에는 단건·다건 인쇄 경로를 각각 포함했다. 같은 경로의 역할별 변형과 학생 상세 하위 탭은 별도 URL 수에 더하지 않았다.

| 화면 / 경로 | 확인한 범위 | 관련 항목 |
|---|---|---|
| 홈 `/` | 진로·심리, 1440 및 진로1280 | 01, 10, 18, 19, 32 |
| 검사 현황 `/diagnosis/status` | 지표, 로딩 후 표, 하단 페이지 이동 | 13, 14, 17, 20, 26 |
| 신청 접수 `/counsel/requests` | 달력·표·처리 모달·학생 상세 모달 | 10~17, 23, 24 |
| 일정 `/counsel/schedule` | 날짜별 목록·가능 시간대 | 20 |
| 상담 진행 `/counsel/session/chaewon` | 학생정보+기록지 | 02, 06, 21, 22, 27 |
| 상담일지 `/counsel/journals` | 지표·목록·수정 모달 | 11, 15~18, 23, 25 |
| 집단상담 `/counsel/groups` | 목록·회차 개설·참여자 모달 | 12, 21, 23, 25, 33 |
| 상담 통계 `/counsel/stats` | 지표·분포 차트 | 11, 18, 20 |
| 심리검사 `/counsel/psych-tests` | 심리 계정 대상 목록·미작성 상태 | 18, 20, 25 |
| 담당 학생 `/students` | 조건·표·상세 연결 | 13~17 |
| 전체 학생 `/students/all` | 조건·표, 담당 목록과 공유 확인 | 13~17 |
| 학생 상세 `/students/chaewon` | 진단·상담·로드맵·비교과·GAP·성장·포트폴리오·STAR 8개 탭 | 02, 25, 27, 28 |
| 로드맵 요청 `/roadmap/requests` | 대기 요청 목록 | 10, 12, 15, 30 |
| 로드맵 이행률 `/roadmap/progress` | 지표·차트·대학별·하위 학생 목록 | 12, 18, 33, 34 |
| 로드맵 편집 `/roadmap/chaewon` | 3축 편집 구성, 저장 안 함 | 04, 21, 30, 33 |
| 비교과 목록 `/programs` | 카드·검색·상태 | 03, 07, 13, 19 |
| 프로그램 관리 `/programs/manage` | 표·고정/선택 UI, 일괄 내보내기 구현 확인 | 15, 16, 17 |
| 프로그램 등록 `/programs/new` | 상단부터 하단 편집기·버튼까지 | 05, 21, 22, 30 |
| 블랙리스트 `/programs/blacklist` | 로딩 후 표·벌점 이력 모달 | 08, 11, 13, 17, 23, 34 |
| 공고 미리보기 `/programs/prog_001/notice` | 학생 공개 공고 | 35 |
| 프로그램 수정 `/programs/prog_001/edit` | 공통 셸·수정 폼 | 04, 06, 21 |
| 신청자 `/programs/prog_001/applicants` | 지표·2명 표,1440/1280 | 04, 06, 07, 15, 18 |
| 선발자 `/programs/prog_001/selected` | 지표·선발자 없음 | 04, 06, 26 |
| 교내 공고 `/jobs` | 0건 빈 상태 | 13, 26 |
| 교내 공고 관리 `/jobs/manage` | 0건 빈 상태 | 13, 26 |
| 공고 등록 `/jobs/new` | 상단부터 하단 편집기·버튼까지 | 05, 21, 22, 30, 34 |
| 외부 공고 `/jobs/external` | 6개 마감 카드 | 07, 08, 13, 19 |
| 외부 공고 상세 `/jobs/job_seed_nexon` | 학생과 공유하는 공고 상세 | 06 |
| 지원자 목록 `/jobs/applicants` | 대상 공고 없음·CTA | 11, 26 |
| 프로필 `/settings` | 상담사 프로필, 교수·조교 준비 중 변형 | 21, 22, 29, 31 |
| 가능 시간대 `/settings/availability` | 추가 폼·요일별 기존 슬롯 | 10, 21 |
| 교수 지도학생 `/professor/advisees` | 5명 목록 | 13~17 |
| 교수 학생 검색 `/professor/students` | 20명 목록·페이지 이동 표시 | 13~17 |
| 교수 신청 접수 `/professor/counsel/requests` | 로딩 완료 후3건 표·탭·검색·일정 확정 모달 | 10, 12~15, 23, 25, 26 |
| 교수 상담 기록 `/professor/counsel/records` | 작성 폼·내 기록 영역 | 21, 22, 26, 34 |
| 교수 제한일정 `/professor/schedule` | 추가 폼·요일별 기존 슬롯 | 10, 21 |
| 교수 상담 노출 `/professor/profile` | 프로필·신청 허용·소개 폼 | 21, 22, 29 |
| 조교 학생 현황 `/assistant/students` | 25명 목록 | 13~17 |
| 교수 배정 `/assistant/advisor` | 조건·배정 목록·교수 배정 모달 | 11~17, 23 |
| 교수 실적 `/assistant/advisor/records` | 교수 통계 및 학생 현황 구조 | 15, 20, 34 |
| 학과 추천기업 `/assistant/companies` | 준비 중 | 31 |
| 단건 인쇄 `/counsel/records/rec_003/print` | 브라우저의 인쇄용 서식 | 별도 서식으로 유지 |
| 다건 인쇄 `/counsel/records/print?ids=rec_003,rec_004,rec_001` | 같은 서식3건 구성 | 별도 서식으로 유지 |

### 코드로만 확인하거나 범위를 제한한 부분

교수 신청 접수의 로딩 완료 상태에서 추가로 확인한 사항은 기존 항목에 포함한다. `정보보기`와 관리 버튼이 셀 너비만큼 늘어나며(10), 긴 상담 주제가 중간에서 잘리고(15), 상태 배지도 긴 직사각형으로 늘어나 다른 목록의 작은 pill과 다르다(25). 일정 확정 모달의 버튼은 중앙 정렬이어서 우측 정렬인 배정·일지 모달과 다르다(23).

- `/login`: 세션 및 역할 선택 구현만 확인. 로그인 화면의 별도 시각 평가는 하지 않았다.
- `/jobs/:id/edit`, `/jobs/applicants/:jobId`: 현재 교내 공고가0건이므로 실제 수정 데이터·전형 진행 상태는 화면 검증하지 않았다. JobForm 공통 등록 UI와 JobApplicants 구현만 확인했다.
- `/programs/:id`, `/counsel/records`: 각각 수정 탭·상담일지로 이어지는 별칭/리다이렉트로 확인했다. 독립 디자인으로 중복 집계하지 않았다.
- 선발자 표·출석·수료·벌점 부여, 심리검사 작성 완료, 각 모달의 저장 성공/오류 등 데이터 변경이 필요한 상태는 실행하지 않았다.
- 인쇄는 브라우저에 표시된 서식까지 확인했다. 실제 프린터 출력·PDF 페이지 분할 검증은 하지 않았다.
- 모바일 전수 점검, 모든 교수/상담사 계정 및 모든 학생 데이터 조합, 모든 모달 하위 상태까지 완료했다는 의미는 아니다.

## 5. 이미 잘 재사용하는 부분과 유지할 예외

- 담당/전체 학생은 **StudentChargeTable**을 공유한다. 역할·조회 범위가 다른 것을 중복 화면이라는 이유로 합칠 필요는 없다.
- 교수 지도학생·교수 학생 검색·조교 학생은 **StudentRosterTable**을 공유한다.
- 학생 상세 페이지·모달·상담 화면은 **StudentDetailView**를 공유한다. 필요한 작업은 밀도·제목 단계·컨테이너 대응이다.
- **AdminModal, EmptyState, StudentPicker, RichEditor**는 이미 널리 쓰인다. 새로 유사한 컴포넌트를 또 만들기보다 내부 영역·상태 처리까지 확장하는 편이 낫다.
- 학생/관리자 공고는 **JobBoard, JobDetailView, ProgramCardGrid, 프로그램 상세**를 공유한다. 관리자만 CSS를 덮어써 학생과 다시 달라지는 수정은 피한다.
- **GNB·PageCrumb·SiteFooter**가 공통 구조를 갖는다. GNB 서브메뉴와 화살표는 직전 작업에서 이미 정리했으므로 이번 목록의 미완료 항목으로 다시 세지 않았다.
- **ProgramForm의 파란 테마**, 채용 등록의 좌측 라벨 폼, 학생 공고 미리보기의 배너, 인쇄 전용 서식은 기존 목적/시안에 따른 차이다. 사용성과 재사용을 개선하되 일괄 색상·배치 변경 대상으로 간주하지 않는다.
- 채용 카드의 radius0은 [JobBoard.css:83](C:/Users/desig/Desktop/dreamcatch_pr/src_v2/components/JobBoard.css:83)에 명시된 값이다. 토큰 누락으로 인한 렌더링 오류가 아니다.
- 프로그램 관리의 체크박스는 선택 후 나타나는 일괄 다운로드에 사용된다. 사용처 없는 체크박스는 아니다.

## 6. 중구난방으로 보이는 구조적 이유

1. **CSS 클래스 공유와 컴포넌트 공유가 섞여 있다.** `admin-btn`, `admin-roster`를 써도 JSX 구조·여백·상태 처리는 각 페이지가 따로 결정한다.
2. **여러 시안에서 가져온 CSS가 누적되었다.** 홈·학생 상세·상담 접수·블랙리스트·두 등록 폼이 서로 다른 스타일 묶음을 유지한다. 홈의 중복 미디어쿼리는 실제 깨짐으로 이어졌다.
3. **공유 컴포넌트의 의존성이 완결되지 않았다.** 비교과 카드 아이콘처럼 학생 SPA에서만 충족되는 조건이 있다.
4. **상태·포매터가 표현과 분리되지 않았다.** 카드·요약·필터의 판정이나 단위/날짜 문자열이 각자다.

## 7. 수정할 때의 권장 순서

1. **화면 오류:** 01~09. 가림·누락·경로·상태를 먼저 해결한다.
2. **공통 목록 틀:** Button → FilterBar/ListToolbar → Tabs → Table → Pagination → StatusBadge/AsyncState.
3. **작성 흐름:** PageHeader → FormField/FormActions → ModalSection/ModalFooter → 공통 확인·저장 피드백.
4. **대시보드·상세:** 지표 카드 변형, 카드 계층, 학생 상세 임베드와 탭 간격.
5. **표현 마무리:** 문구·날짜·단위·미구현 메뉴 안내·공고 요약 줄바꿈.

각 단계는 기존 화면에 하나씩 적용해 검토하는 것이 적절하다. 현재 문서는 정비 후보와 오류의 목록이며 디자인 변경이나 구현을 확정한 문서는 아니다.
