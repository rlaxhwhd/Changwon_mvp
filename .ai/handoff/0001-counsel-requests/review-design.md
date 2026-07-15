# review-design — counsel-requests (Phase 4)

## 4단계: 디자인·유지보수 (design-reviewer)

감사 대상: Codex가 구현한 신청 접수함 갭 5건(시드 교정·상대시간 라벨·오늘의 상담 현황 카드·벨 뱃지·푸터).
방식: 기획(ui-spec.md/component-map.md) · 토큰(index.css `:root`) · 구현을 나란히 대조. 소스 미수정.

---

### 1. 디자인 토큰 drift — **PASS**

신규 요소 4종이 전부 `:root` 토큰만 사용. 하드코딩 hex·px 팔레트·새 폰트 없음.

- 벨 뱃지 `index.css:237-253` (`.gnb-bell-badge`): `background: var(--color-danger)` · `color: var(--color-bg)` · `border-radius: var(--radius-pill)`. 색 리터럴 0. (top/right/min-width 등은 위치·크기 px로, 팔레트 아님 — 허용.)
- 푸터 `index.css:92-98` (`.admin-layout-footer`): `color: var(--color-caption)` 토큰. hex 없음.
- 오늘의 상담 현황 카드 `SectionSidebar.css:103-140` (`.section-sidebar-summary*`): `border/background: var(--color-border|--color-section-bg)`, `border-radius: var(--radius-md)`, 텍스트 `var(--color-title|--color-text-secondary)`. 색 리터럴 0.
- 상대시간 라벨 `index.css:1653-1655` (`.counsel-request-time small`): `color: var(--color-text-secondary)`. 기존 뱃지 문법 준수.
- `frontend-design`을 빌미로 한 새 팔레트 유입 없음(craft=간격·위계만).

참고(리젝 아님): `SectionSidebar.css:94`의 `color: #fff`는 `.section-sidebar-item.active .section-sidebar-icon`(활성 아이콘)로, 이번 갭 5건과 무관한 **기존 코드**다. `src_admin/`이 통째로 미추적(git `??`)이라 diff 격리는 불가하나, 해당 규칙은 신규 요약 카드 블록(103행~) 밖이며 본 handoff 범위 아님. 신규 추가분에는 hex 리터럴 0건.

### 2. JSON 동적·하드코딩 — **PASS**

화면상 모든 수치·라벨·연도가 데이터/`new Date()`에서 파생. 리터럴 숫자·연도·이름 없음.

- 셀렉터 3종이 **새 파일 아님** — `counselRequests.ts`에 추가됨: `formatRelativeTime`(`:44`), `getTodaySummary`(`:65`), `countPendingByAssignee`(`:78`). 각각 `getRequestsByAssignee(counselorId)`/`getCounselRequests()` 한 배열에서 파생.
- 카드 4수치: `SectionSidebar.tsx:32,56-59` — `getTodaySummary(counselor.id)` 구독, props로 숫자 주입 없음. 이미지의 12/6/4/1 리터럴 유입 없음.
- 벨 뱃지: `GNB.tsx:18,77` — `countPendingByAssignee(counselor.id)`, `pendingCount > 0` 일 때만 렌더(0이면 숨김). 이미지의 "8" 리터럴 없음.
- 상대시간: `CounselRequests.tsx:342` — `{formatRelativeTime(req.requestedAt)} 신청`. "신청" 접미는 JSX, 상대값은 `requestedAt` 파생. 스펙 시그니처(60분/24시간 경계) 준수(`counselRequests.ts:48-54`).
- 푸터 연도: `Layout.tsx:6` `new Date().getFullYear()` → `:16` 렌더. 2024/2026 리터럴 없음(components 전역 grep 확인).
- 필터탭 카운트·캘린더 뱃지·"N건"·초기월: 기존 `counts`/`dateCounts`/`initialKey`/`list` useMemo 유지(`CounselRequests.tsx:208-227`), 손대지 않음.

### 3. 단일 소스 — **PASS**

- 상담사 이름·roleLabel은 counselors JSON 단일소스에서 렌더: 카드/뱃지/행 담당표시 모두 `getActiveCounselor()`·`getCounselorById()`(JSON 병합, `counselors.ts:38-99`). 이름 하드코딩 없음.
- 시드 `req_011` 교정 정상: `type:"심리"`·`assignedCounselorId:"psych_lee"`(`counselRequests.seed.json:105-115`). `psych_lee`는 실재 JSON 상담사(`counselors.ts:10`)라 재배정 키 유효.
- 컴포넌트 신규 코드에 산발 localStorage 접근·별도 데이터 스토어 없음(components/*.tsx grep: `Layout.tsx`의 `new Date()` 1건뿐, localStorage 0건). 모든 읽기가 로더 셀렉터 경유.
- navConfig 우회 없음: counsel 섹션 children 정확히 3개(`navConfig.ts:43-45`), "상담 진행" 미추가(교정표 #4 준수). GNB/SectionSidebar 모두 `getNavSections` 구독.

### 4. 컴포넌트 재사용·범위 준수 — **PASS**

- `CounselRequests.tsx` 수술적 변경만: 캘린더·탭·테이블·CSV(`downloadCsv`)·`SlotForm`·`ReassignForm` 전부 현행 유지. 신규는 상대시간 라벨 1줄(`:342`)뿐 — 재작성 없음.
- 중복 컴포넌트 미생성: 요약 카드는 별도 파일이 아니라 기존 `SectionSidebar` 내부에 인라인 확장(`SectionSidebar.tsx:52-62`), 벨·푸터도 기존 `GNB`/`Layout` 확장. component-map의 "신규는 갭 5건뿐, 중복 금지" 준수.
- 범위 격리: `src_v2/`·`src/`·학생 파일 무변경(`git status` 확인 — 변경은 미추적 `src_admin/`에 국한). 읽기 범위 위반 없음.

### 5. 코드 품질 — **PASS**

- `npx tsc --noEmit` **재실행 통과(exit 0, 에러 0)**.
- 미사용 import 없음: `CounselRequests.tsx`가 `formatRelativeTime` 추가 import·사용, `SectionSidebar.tsx`가 `getTodaySummary` 추가 import·사용, `GNB.tsx`가 `countPendingByAssignee` 추가 import·사용. 명백한 결함 없음.
- `getTodaySummary`는 `cancelled`(취소 상태) 집계를 포함하나 현 시드에 취소 건이 없어 항상 0 — 결함 아님(스펙이 요구한 4수치 중 하나, 데이터 파생).

---

### 참고 관찰 (본 4단계 리젝 아님 — content-reviewer/team-lead 확인 권고)

- `req_012` studentMajor가 시드에 **"항공기계공학과 2학년"**(`counselRequests.seed.json:120`)인데, ui-spec "구현 범위 1"(60행)은 **"전기공학과 2학년"**으로 명시. 학과 리터럴 불일치 — 토큰/JSON-dynamic/재사용 규약 위반은 아니므로(값은 여전히 JSON 파생) 디자인·유지보수 축에선 PASS. 다만 기획 명세와의 콘텐츠 정합성은 5단계(content-reviewer) 소관이라 이관 표시.

---

## 종합 판정: **PASS** (5개 항목 전부 PASS, REJECT 0건, tsc exit 0)
