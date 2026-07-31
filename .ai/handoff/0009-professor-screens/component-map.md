# professor-screens — 컴포넌트 맵

> team-lead 작성 (2026-07-31). 재사용이 원칙(CLAUDE.md 규칙 5) — 신규는 페이지 5개(그중 1개는 재작성)와 로더뿐, 공용 컴포넌트 신설 없음.

## 재사용 (team-lead 작성)

| 화면 영역 | 기존 자산 | 경로 | 재사용 방식 |
|---|---|---|---|
| 셸(GNB·사이드바) | `Layout` + `getNavSections('professor')` | `src_admin/components/Layout.tsx`·`navConfig.ts` | 그대로 (prof-* 섹션 기존재 — 무수정) |
| 지도학생 목록 표 전체 | `StudentRosterTable` | `src_admin/components/StudentRosterTable.tsx` | optional prop `studentIds` 1개 추가(additive) — 열·필터·모달 무수정 |
| 학생 상세 '보기' 모달 | `StudentDetailView` (professor=읽기 전용 전탭) | `src_admin/components/StudentDetailView.tsx` | 무수정 (StudentRosterTable 경유) |
| 접수함·기록 목록 표 | `admin-roster` 계열 클래스 + `useListData` + `totalPages` | `src_admin/index.css`·`hooks/useListData.ts`·`data/query.ts` | AssistantAdvisor 페이지 패턴 미러 |
| 탭·필터바·툴바·페이징 | `admin-tabs`·`admin-filterbar`·`admin-toolbar`·`admin-pagination` | `src_admin/index.css` | 클래스 재사용 |
| 상태 배지 | `counsel-status-badge is-waiting/is-confirmed/is-complete/is-cancelled` (`statusClass` 로직은 페이지 로컬 미러) · `enrollStatusClass` | `src_admin/index.css`·`data/studentRoster.ts` | 클래스·헬퍼 재사용 |
| 확정 모달 | `AdminModal` (`md`) | `src_admin/components/AdminModal.tsx` | 무수정 — sm 없음 주의 |
| 빈 상태 | `EmptyState` | `src_admin/components/EmptyState.tsx` | 무수정 |
| 상대시간 표기 | `formatRelativeTime` | `src_admin/data/counselRequests.ts` | **읽기 import만** (파일 수정 금지) |
| 제한일정 폼·목록 | `admin-avail-add`·`admin-avail-list*`·`admin-avail-slot-tag` + `WEEKDAY_LABEL/ORDER` | `src_admin/index.css`·`data/schema/availability.ts` | SettingsAvailability 구조 미러(화면 파일은 신규, 원본 무수정) |
| 노출 설정 폼 | `admin-profile-card`·`admin-profile-hero`·`admin-form-grid`·`admin-field`·`admin-form-actions` | `src_admin/index.css` | SettingsProfile 구조 미러 |
| 상담구분 코드·라벨 | `PROF_COUNSEL_CATEGORIES` | `src_admin/data/schema/profCounselRecord.ts` | 그대로 (0131 6종) |
| 지도학생·배정 파생 | `getActiveAssignByStudent`·`getAdvisorAssigns` | `src_admin/data/advisorAssigns.ts` | 헬퍼 `getAdviseeStudentIds` 1개 추가 |
| 신청 상태 전이 | `patchCounselRequest`·`addCounselRequest` | `src_v2/data/students.ts` | 신규 투영·writer가 위임 호출 (재생성 금지) |
| 학생 신청 모달 | `CounselReserveModal` (`onSubmit(purpose)`) · `CounselConsentModal` | `src_v2/components/` | 무수정 — 핸들러에서 writer 호출만 |
| 교수 풀 트리 | `PROFESSOR_GROUPS`·`findDefaultSelection` | `src_v2/data/professors.ts` | `findDefaultSelection`에 optional `groups`만 추가 |

## 신규 (Codex/구현자 추가)

| 파일 | 책임 | 비고 |
|---|---|---|
| `src_admin/pages/ProfessorCounselRequests.tsx` | 화면 ② 접수함 — `queryProfCounselRequests` 구독, 탭/필터/확정 모달 | ui-spec §3 |
| `src_admin/pages/ProfessorCounselRecords.tsx` | 화면 ③ 기록 작성+목록 — `addProfCounselRecord`·`queryProfRecords`, `?requestId` 연계(useSearchParams) | ui-spec §4 |
| `src_admin/pages/ProfessorSchedule.tsx` | 화면 ④ 제한일정 — `excludedHours.ts` 구독 (SettingsAvailability 미러·문구 반전) | ui-spec §5 |
| `src_admin/pages/ProfessorProfile.tsx` | 화면 ⑤ 노출 설정 — `professorProfiles.ts` 구독 (SettingsProfile 미러) | ui-spec §6 |
| `src_admin/pages/ProfessorAdvisees.tsx` | 화면 ① 재작성 — `getAdviseeStudentIds` → `StudentRosterTable studentIds` | 기존 파일 교체, ui-spec §2 |
| `src_admin/data/profCounselRequests.ts` | 교수 접수함 투영 로더 + 전이 위임 | ui-spec §7-4 |
| `src_admin/data/schema/professorProfile.ts` + `data/professorProfiles.ts` | 노출 설정 스키마·로더 (`dc_professor_profile`) | ui-spec §7-5 |
| `src_admin/data/schema/excludedHours.ts` + `data/excludedHours.ts` + `excludedHours.seed.json` | 제한일정 스키마·로더·seed (`dc_counselor_excluded`) | ui-spec §7-8 |
| `src_admin/data/professors/cse-1.json`·`biz-1.json` | 통일된 교수 로그인 신원 (prof_lee·prof_jung 대체) | ui-spec §7-1 |
| `src_v2/data/professorProfilesRead.ts` | 학생 측 노출 어댑터 `getCounselableProfessorGroups` (cross-SPA 비계) | ui-spec §7-9 |

## 신규 CSS (`src_admin/index.css` — 이것만)

| 클래스 | 내용 |
|---|---|
| `.admin-profreq-roster` | 접수함 8열 grid-template-columns (`admin-asst-roster` 미러) |
| `.admin-profrec-roster` | 기록 목록 7열 grid-template-columns |
| `.admin-td-ellipsis` | 주제·내용 셀 말줄임(overflow ellipsis) — **동등 유틸 기존재 시 신설 금지, 그것 재사용** |

## 구현 반영 (Codex)

- 교수 접수함·기록·제한일정·노출 설정 페이지와 전용 데이터 로더를 추가했다.
- 지도학생 목록은 `StudentRosterTable.studentIds` additive prop으로 `dc_advisor_assign` 범위만 조회한다.
- 교수 상담 기록은 `dc_prof_counsel_records` append와 학생 owner 신청의 완료 patch를 함께 수행한다.
- 교수 노출 설정과 제한일정은 각각 `dc_professor_profile`, `dc_counselor_excluded` override 레이어를 사용한다.

새 색상값·팔레트·폰트·토큰 생성 금지. 상태 배지·버튼·태그는 전부 기존 클래스.
