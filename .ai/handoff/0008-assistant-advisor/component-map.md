# assistant-advisor — 컴포넌트 맵

> team-lead 작성(재사용 섹션). Codex/구현자는 신규 섹션에 실제 추가분을 갱신한다.
> 원칙: **재생성 금지** — 아래 재사용 목록에 있는 것을 다시 만들면 리젝.

## 재사용 (team-lead 작성)

### 컴포넌트·훅·유틸

| 화면 영역 | 기존 자산 | 경로 | 용도 |
|---|---|---|---|
| 상세·배정 모달 | `AdminModal` | `src_admin/components/AdminModal.tsx` | 배정 모달(size="sm") — title/size/onClose props |
| 빈 상태 | `EmptyState` | `src_admin/components/EmptyState.tsx` | icon={LuFrown} + message |
| 목록 조회 훅 | `useListData` | `src_admin/hooks/useListData.ts` | `async (params) => Paginated<T>` 로더 + 레이스 cleanup + refetch. 배정 확정 후 `refetch()` 호출 |
| 페이징 계약 | `paginate` / `totalPages` / `mockLatency` / `ListParams` / `Paginated` | `src_admin/data/query.ts` | 신규 로더 2개가 그대로 사용 |
| 로그인 신원 | `getActiveUser` | `src_admin/data/staff.ts` | `(user as Assistant).departments` 스코프 — AssistantStudents.tsx:27-28 동일 |
| 조교 타입 | `Assistant` | `src_admin/data/assistants.ts` | departments 필드 |
| 학생 로스터 | `getFullRoster` / `getRosterFilterOptions` / `collegeOf` / `enrollStatusClass` | `src_admin/data/studentRoster.ts` | 배정 화면의 학생 축. 신규 로더가 내부에서 호출(화면 직접 호출은 필터 옵션만) |
| 교수 풀 | `PROFESSOR_GROUPS` / `Professor` | `src_v2/data/professors.ts` | 배정 대상 교수 단일소스. cross-SPA import는 studentRoster.ts와 동일한 임시 비계 |
| 아이콘 | `LuSearch/LuFrown/LuLoaderCircle/LuChevronLeft/LuChevronRight` | react-icons/lu | AssistantStudents와 동일 세트 |
| 페이지 골격 | `AssistantStudents.tsx` **패턴 미러**(복사 아님) | `src_admin/pages/AssistantStudents.tsx` | 필터 state·onFilter·페이징·로딩 분기 구조를 동일하게 |
| CSV 생성 | `ProgramBlacklist.tsx:175 downloadCsv` **패턴 미러**(해당 파일 수정 금지) | `src_admin/pages/ProgramBlacklist.tsx` | BOM `﻿` + Blob + createObjectURL + `<a download>` |
| 저장 패턴 | `counselRecords.ts` **패턴 미러** | `src_admin/data/counselRecords.ts` | LS 전체 ?? seed 폴백 · try/catch · persist 전체 리스트 |

### CSS (기존 클래스 — 그대로 사용)

`admin-page` `admin-page-head` `admin-page-title` `admin-page-desc` `admin-card` ·
`admin-tabs` `admin-tab` `admin-tab-count` ·
`admin-filterbar` `admin-search` `admin-select` ·
`admin-toolbar` `admin-toolbar-count` ·
`admin-roster` `admin-roster-head` `admin-roster-row` `admin-roster-cell` ·
`admin-btn` `admin-btn-primary` `admin-btn-ghost` `.sm` ·
`admin-enroll admin-enroll-{active|leave|graduate|done}` (enrollStatusClass가 반환) ·
`admin-pagination` `admin-page-btn` `admin-page-info` `admin-loading` `admin-spin` `admin-kv` `admin-field-hint`

## 신규 (구현자 추가 · 구현 완료 2026-07-30)

### 페이지 (2)

| 컴포넌트 | 책임 | props | 경로 |
|---|---|---|---|
| `AssistantAdvisor` | 배정 현황: 탭·필터·로스터 표·배정 모달·CSV | 없음(라우트 컴포넌트 — getActiveUser로 스코프) | `src_admin/pages/AssistantAdvisor.tsx` |
| `AssistantAdvisorRecords` | 상담 실적: 교수별 집계 표 + 학생별 현황 표 + 독려 | 없음(라우트 컴포넌트) | `src_admin/pages/AssistantAdvisorRecords.tsx` |

- 배정 모달은 `AssistantAdvisor.tsx` 내부 구현(AdminModal 사용) — 단일 사용처라 별도 파일 금지(단순성 원칙).
- App.tsx 122~131행: `NotReady` 2개 → 위 페이지로 element 교체.

### 데이터 (6 — 상세 계약은 ui-spec.md §4)

| 파일 | 책임 |
|---|---|
| `src_admin/data/schema/advisorAssign.ts` | `AdvisorAssign` + `AssignStatus` |
| `src_admin/data/advisorAssigns.seed.json` | 배정 seed (컴공 11/4 · 경영 5/3, 2023~2026 분포) |
| `src_admin/data/advisorAssigns.ts` | `dc_advisor_assign` 로더 + `queryAdvisorRoster` + `assignAdvisor` + 년도·탭카운트·export |
| `src_admin/data/schema/profCounselRecord.ts` | `ProfCounselRecord` + `PROF_COUNSEL_CATEGORIES`(SY_CODE 0131) + `AdvisorNudge` |
| `src_admin/data/profCounselRecords.seed.json` | 교수상담 기록 seed (교수별 편차·미상담 잔존) |
| `src_admin/data/profCounselRecords.ts` | `dc_prof_counsel_records`/`dc_advisor_nudges` 로더 + 집계 2종 + `sendNudge` |

### CSS (src_admin/index.css 추가만 — modifier 3 + 강조 1)

`admin-asst-roster` 블록(index.css:1029-1037) 바로 아래에 같은 방식으로 추가:

| 클래스 | 내용 | 이유 |
|---|---|---|
| `.admin-advisor-roster` | `.admin-roster-head/.admin-roster-row`의 `grid-template-columns` 9열(번호·학번·이름·소속·학년·학적·연락처·지도교수·배정일자, 예: `0.5fr 1fr 0.9fr 1.6fr 0.6fr 0.8fr 1.2fr 1.1fr 1fr`) + 중앙정렬(admin-asst-roster 미러) | 페이지별 열폭은 modifier로 지정하는 기존 규약(admin-job-roster·admin-applicant-roster 동일) |
| `.admin-profstat-roster` | 5열(교수·학과·배정 학생 수·상담 건수·최근 상담일) | 〃 |
| `.admin-advisee-roster` | 9열(번호·학번·이름·학년·지도교수·상담횟수·최근상담일·상담구분·독려) | 〃 |
| `.admin-advisor-name` | `color: var(--color-primary); font-weight: 800;` | 캡처의 녹색 교수명 강조를 토큰으로 치환. 두 화면 공용 |

**금지:** 신규 색상값·폰트·radius·shadow 선언, 기존 클래스 수정, 캡처 팔레트(#0A7D3E 계열·주황) 도입.

### 구현 확인

- 두 라우트는 `NotReady` 대신 실제 페이지로 연결했고, 배정·독려는 각각 append-only localStorage 이벤트(`dc_advisor_assign`, `dc_advisor_nudges`)로 반영한다.
- 신규 로더가 조교 `departments` 스코프, 탭·필터·정렬·페이징과 CSV 전체 내보내기를 처리한다. 페이지는 현재 페이지 데이터만 렌더한다.
- `studentsRoster.json`의 기존 연락처 30명은 보존하고, 누락 82명에 규칙형 연락처를 보강했다.
