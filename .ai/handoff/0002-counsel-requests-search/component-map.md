# counsel-requests (검색/필터 바) — 컴포넌트 맵

> 갭 1건(검색/필터 바)만. **재사용 기본, 신규 컴포넌트 0.** 기존 `CounselRequests.tsx` 내부에 인라인으로 추가한다(새 파일·새 컴포넌트 만들지 말 것).

## 재사용 (변경 없음)

| 영역 | 자산 | 경로 |
|---|---|---|
| 페이지 본체·탭·캘린더·테이블·CSV | `CounselRequests` | `src_admin/pages/CounselRequests.tsx` |
| 상세/재배정 인라인 폼 | `SlotForm` · `ReassignForm` | 동일 파일 내부 |
| 1차/2차 버튼 | `.counsel-primary-btn` · `.counsel-outline-btn` | `src_admin/index.css` |
| 상담 신청 스키마(유형 enum `진로취업`\|`심리`) | `CounselRequestType` 외 | `src_admin/data/schema/counselRequest.ts` |
| 로더·필터 셀렉터 | `getRequestsByAssignee` 등 | `src_admin/data/counselRequests.ts` |
| 디자인 토큰(:root) | `index.css` | `src_admin/index.css`(변경 없음) |

## 신규 (Codex 인라인 추가 — 새 컴포넌트 아님)

| 추가물 | 위치 | 비고 |
|---|---|---|
| 검색/필터 바 마크업(`.counsel-filter-bar`) | `CounselRequests.tsx` 헤더와 탭 사이 | ui-spec 마크업 구조대로 |
| `query`·`typeFilter` 상태 + `resetFilters` | `CounselRequests` 함수 본문 | `selectedDate`는 기존 재사용 |
| `list` useMemo 필터 2개 확장 | 기존 useMemo | deps에 `typeFilter`,`query` 추가 |
| `.counsel-filter-*` CSS | `index.css` counsel 블록 근처 | 기존 토큰만, 버튼은 기존 클래스 재사용 |
