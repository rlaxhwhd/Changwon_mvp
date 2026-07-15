# counsel-requests — 컴포넌트 맵

> 이 화면은 이미 구현돼 있다. **재사용이 기본, 신규는 갭 5건뿐.** 재작성·중복 컴포넌트 생성 금지.

## 재사용 (team-lead 작성)

| 화면 영역 | 기존 컴포넌트/자산 | 경로 |
|---|---|---|
| 페이지 본체 (헤더·탭·캘린더·테이블·푸터·CSV) | `CounselRequests` (기본 export) | `src_admin/pages/CounselRequests.tsx` |
| 상세 보기 인라인 폼 (확정/일정 변경/신청 취소) | `SlotForm` (동일 파일 내부) | `src_admin/pages/CounselRequests.tsx` |
| 재배정 인라인 폼 | `ReassignForm` (동일 파일 내부) | `src_admin/pages/CounselRequests.tsx` |
| 상단 네비 (로고·섹션 메뉴·알림벨·프로필 드롭다운·데모 상담사 전환) | `GNB` | `src_admin/components/GNB.tsx` |
| 좌측 사이드바 (섹션 하위 메뉴) | `SectionSidebar` | `src_admin/components/SectionSidebar.tsx` (+ `SectionSidebar.css`) |
| 레이아웃 셸 (GNB+사이드바+Outlet) | `Layout` | `src_admin/components/Layout.tsx` |
| 네비 단일 소스 (섹션·역할 필터·active 판정) | `navConfig` | `src_admin/components/navConfig.ts` |
| 상담 신청 스키마 (단일 소스) | `CounselRequest` 외 | `src_admin/data/schema/counselRequest.ts` |
| 상담 신청 로더/스토어 (localStorage+seed, 상태 전이) | `counselRequests` | `src_admin/data/counselRequests.ts` |
| 상담 신청 seed 데이터 | `counselRequests.seed.json` | `src_admin/data/counselRequests.seed.json` |
| 활성 상담사 스토어·조회 | `counselors` (`getActiveCounselor` 등) | `src_admin/data/counselors.ts` (+ `data/counselors/*.json`) |
| 스타일 (토큰 + `counsel-*` 클래스 일체, 1398행~ 접수함 블록) | `index.css` | `src_admin/index.css` |
| 라우팅 (이미 등록) | `App` | `src_admin/App.tsx` |

## 신규 (Codex 추가)

> ui-spec.md "구현 범위(갭)" 5건에 대응. props 세부는 Codex가 2단계(컴포넌트 분리)에서 확정해 이 표를 완성한다.

| 컴포넌트 | 책임 | props(스키마) |
|---|---|---|
| `CounselTodaySummary` (자리) | 사이드바 하단 "오늘의 상담 현황" 카드 — counsel 섹션에서만 노출, `getTodaySummary()` 4수치 렌더 | Codex 확정 (데이터는 셀렉터 구독, props로 숫자 주입 금지) |
| `formatRelativeTime` · `getTodaySummary` · `countPendingByAssignee` (함수) | 파생 셀렉터 3종 — `counselRequests.ts`에 추가 (새 파일 아님) | ui-spec "파생값 목록" 시그니처 준수 |
| GNB 벨 뱃지 (기존 `GNB.tsx` 확장) | 대기 건수 뱃지, 0이면 숨김 | 신규 컴포넌트 아님 — 기존 확장 |
| 신청 시간 상대 라벨 (기존 `CounselRequests.tsx` 확장) | 시각 아래 정적 "신청" → "{상대시간} 신청" 파생 라벨 | 신규 컴포넌트 아님 — 기존 확장 |
| Layout 푸터 (기존 `Layout.tsx` 확장) | "© {파생 연도} Changwon National University" | 신규 컴포넌트 아님 — 기존 확장 |

## 시드 데이터 변경 (코드 아님)

| 파일 | 변경 |
|---|---|
| `src_admin/data/counselRequests.seed.json` | `req_011` 유형 교정(`심리`·`psych_lee`) + `req_012`·`req_013` 추가 (ui-spec "구현 범위 1" 값 그대로) |
