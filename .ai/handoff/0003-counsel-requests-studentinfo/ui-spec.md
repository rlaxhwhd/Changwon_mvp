# counsel-requests 학생정보 열 개편 — UI 스펙 (역할: counsel, 모드 A)

기존 화면 `src_admin/pages/CounselRequests.tsx` + `src_admin/index.css` 접수함 테이블의 **레이아웃만** 수정. 데이터·셀렉터·다른 패널(캘린더/탭/현황) 무변경. DESIGN.md+`src_admin/index.css :root` 토큰만(새 색·폰트 금지, craft만).

## 요구 (3건)
1. **학생 정보 열에서 프로필 사진 제거** → 이름·학과만.
2. **학번을 별도 열로 분리**, 위치는 학생 정보 열 바로 뒤(오른쪽).
3. **가로 슬라이드 제거** — 목록이 오른쪽으로 스크롤되지 않고 한 영역(카드) 안에 다 담기게.

## 구현 지점 (정확)

### `src_admin/pages/CounselRequests.tsx`
- 컬럼 헤더(현재 6): `신청 시간 · 학생 정보 · 상담 유형 · 상담 주제 · 상태/담당 · 관리`
  → `학생 정보` 뒤에 `<span>학번</span>` 삽입해 **7컬럼**: `신청 시간 · 학생 정보 · 학번 · 상담 유형 · 상담 주제 · 상태/담당 · 관리`.
- 행의 `.counsel-request-person`:
  - `<span className="counsel-person-photo" />` **삭제**(아바타 제거).
  - 정보 span을 **이름·학과만**: `<span><strong>{req.studentName}</strong><small>{req.studentMajor}</small></span>` (기존 `<em>{req.studentId}</em>` 제거).
  - person 셀 **뒤에** 학번 셀 추가: `<div className="counsel-request-studentid">{req.studentId}</div>`.
- 나머지 셀(유형/주제/상태·담당/관리) 그대로. `req.studentId`는 학번 열로 이동만 — 데이터·검색(query가 studentId 포함)·CSV는 유지.

### `src_admin/index.css`
- `.counsel-request-table-scroll` — `overflow-x: auto` **제거**(가로 스크롤 금지).
- `.counsel-request-table` — `min-width: 660px` **제거**(컨테이너에 맞게 축소, 오버플로우 원인).
- `.counsel-request-columns, .counsel-request-row`의 `grid-template-columns`(현재 `80px minmax(130px,1.2fr) 110px minmax(120px,1.2fr) 65px 110px`) → **7컬럼**으로: 학생 정보 뒤에 학번 열 추가, 아바타 제거로 확보된 폭(≈54px)으로 상쇄해 **가로 스크롤 없이 카드 폭 안에 맞게** 튜닝(고정폭은 compact, 학생정보·상담주제는 fr로 신축, 나머지 compact). 예시 시작점: `80px minmax(96px,1.1fr) 80px 92px minmax(104px,1.3fr) 62px 84px` — 실측으로 넘치지 않게 조정.
- `.counsel-person-photo` 블록 **삭제**(미사용).
- `.counsel-request-studentid` 스타일 추가 — 다른 셀과 정렬·톤 일치(예: `font-size:13px; font-weight:700; color:var(--color-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`). 토큰만.
- ≤1440 미디어쿼리 `.counsel-requests-layout` 우측 패널 minmax는 유지하되, min-width 제거·fr 컬럼으로 내부가 넘치지 않으면 OK.

## 검증
- `npx tsc --noEmit` 통과.
- 접수함 테이블이 **가로 스크롤 없이** 카드 안에 7컬럼 전부 표시(아바타 없음, 학생정보=이름·학과, 학번 별도 열).
- 캘린더·탭·현황 카드·상태 뱃지 등 나머지 무변경. 새 색·폰트 유입 0.
