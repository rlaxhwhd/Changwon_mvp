# 비교과 프로그램 공유 카드 뷰 (학생 ↔ 상담사 동일 화면) — UI 스펙

> **목표:** 학생 `growth/program`(ProgramApply)과 상담사 `admin/programs`(ProgramList)가 **똑같은 비교과 프로그램 목록 화면**을 보여준다. 학생 리스트를 **4×N 카드 그리드**로 바꾸고, 그 뷰를 재사용 컴포넌트로 추출해 상담사가 import한다.
>
> **사용자 확정:** 단일 데이터 소스 = **상담사 `src_admin/data/programs.ts`**(seed JSON + CRUD, DB-ready. 스키마 주석이 "학생 ProgramApply의 공급 측"이라 명시한 의도와 일치). 학생 화면은 하드코딩 5개를 **제거**하고 이 데이터를 읽는다.

## 아키텍처

```
src_admin/data/programs.ts  (단일 소스, localStorage 'dc_programs' + seed)
   │  getPrograms()  ← 같은 오리진이라 학생·상담사 localStorage 공유
   ├──────────────┬──────────────────────────┐
학생 ProgramApply   상담사 ProgramList          (둘 다 이 데이터 사용)
   │                │
   └──> <ProgramCardGrid programs=... onSelect=... />  (공유 뷰, src_v2)
                    └──> import (src_admin → src_v2, 기존 크로스-SPA 방향 ✓)
```

- **크로스-SPA:** `src_admin`이 `src_v2`를 import하는 방향은 이미 다수 존재(StudentDiagnosticDetail·counselChatbot·counselRequests가 `../../src_v2/data/students`). 학생이 상담사 데이터를 읽는 것도 같은 리포·tsconfig라 동작. 이는 DB 전환 시 제거될 **임시 비계**([[project_counsel_real_service_db_ready]]).

## 1) 공유 컴포넌트 `ProgramCardGrid` (신규, src_v2)

파일: `src_v2/pages/growth/ProgramCardGrid.tsx` (+ `ProgramCardGrid.css`). **프레젠테이션 전용 — 데이터 import 금지, 전부 props.**

```ts
interface ProgramCardVM {          // 뷰모델 (양 포털이 상담사 Program을 이걸로 매핑)
  id: string
  title: string
  desc: string
  category: string                 // 진로/취업/어학/창업/자격증/기타
  startDate: string                // 모집 시작 (YYYY-MM-DD 또는 YYYY.MM.DD)
  endDate: string                  // 모집 마감
  capacity: number
  image?: string
}
interface Props {
  programs: ProgramCardVM[]
  onSelect: (id: string) => void   // 카드 클릭 → 포털별 상세 경로 (학생 /growth/program/:id, 상담사 /programs/:id)
  wished?: Set<string>             // 선택: 학생 찜(상담사는 미전달)
  onToggleWish?: (id: string) => void
}
```

### 레이아웃 — **4×N 그리드 (한 행 4개)**
- `display: grid; grid-template-columns: repeat(4, 1fr); gap: …;` (반응형: 좁아지면 `repeat(auto-fill, minmax(240px, 1fr))`로 자연 축소, 데스크톱 min-width 1280 기준 4열 유지).
- **카드 내용(현재 표시값 + 모집기간):**
  - 썸네일: `image` 있으면 `<img>`, 없으면 카테고리색 플레이스홀더(아이콘)
  - 상단: 카테고리 배지(카테고리색) + **D-Day**(endDate에서 파생: `남은 일수 = ceil((endDate - 오늘)/1일)`, ≤5 긴급색)
  - 제목(`title`), 설명(`desc`, 2줄 클램프)
  - 메타: **모집기간** `{startDate} ~ {endDate}` (아이콘 캘린더) + **정원** `{capacity}명` (아이콘 users)
  - (학생만) 찜 버튼 — `onToggleWish` 있을 때만 렌더
- 스타일: 학생 `pa-*` CSS 톤 계승(현재 ProgramApply 카드 룩 재사용/이관). 상담사가 import하면 **학생과 동일한 룩** 그대로 노출(의도됨 — "학생이 보는 화면 그대로").

## 2) 상담사 데이터 스키마 보강 (`src_admin/data/schema/program.ts` + seed)
- `Program`에 **`image?: string`** 추가(선택). `blankProgram()`엔 넣지 않아도 됨.
- `programs.seed.json` 2건에 `image` 채움: `/비교과프로그램1.png`·`/비교과프로그램2.png` (기존 public 에셋 재사용).
- **모집기간·D-Day는 기존 `startDate`/`endDate`에서 파생** — 새 날짜 필드 추가 불필요.

## 3) 학생 `ProgramApply.tsx` 변경
- 하드코딩 `PROGRAMS` 배열 **삭제.** 대신 `getPrograms()`(`../../../src_admin/data/programs`)를 읽어 `ProgramCardVM[]`으로 매핑(카테고리·날짜·capacity·image). D-Day는 파생.
- 리스트(`.pa-list`) → **`<ProgramCardGrid programs=… onSelect={id => navigate('/growth/program/'+id)} wished=… onToggleWish=… />`**.
- **유지:** AI 맞춤 추천 섹션(pr-reco), 카테고리 탭, 찜 목록 토글, 정렬/페이지네이션(카드 그리드에 맞게). 헤더 카피 유지.
- 카테고리 타입: 상담사 `ProgramCategory`(진로/취업/어학/창업/자격증/기타)와 정합(학생 기존과 동일 라벨).

## 4) 상담사 `ProgramList.tsx` 변경
- **관리 헤더 유지**: 제목·설명·[블랙리스트]·[프로그램 등록] 버튼, 필터바(검색·분류·상태).
- 리스트 테이블(`.admin-roster`) → **`<ProgramCardGrid programs={list매핑} onSelect={id => navigate('/programs/'+id)} />`** (찜 props 미전달 → 찜 버튼 안 뜸).
- 즉 상담사도 학생과 **똑같은 4×N 카드**를 보되, 클릭 시 상담사 상세(`/programs/:id`)로 가고 등록·필터 등 관리 기능은 그대로.

## 하드룰
- **JSON 동적:** 학생 하드코딩 제거, 단일 소스 `getPrograms()`. 데이터 리터럴 0.
- **디자인 토큰:** 공유 카드 CSS는 학생(src_v2) 톤. 상담사에서 그대로 노출(동일 화면이 목적). 새 팔레트 발명 금지 — 기존 pa-* 값 계승.
- **크로스-SPA는 비계**(주석 명시). DB 전환 시 로더만 스왑.
- 상담사 관리 기능(등록/블랙리스트/상세/신청자·출석)은 **손상 금지** — 리스트 표현만 카드로.

## 완료 기준 (verify)
1. `npx tsc --noEmit` + `npm run build` 통과.
2. 학생 `/v2/growth/program`·상담사 `/admin/programs` **동일한 4×N 카드**(같은 프로그램 목록, 같은 룩). 상담사에서 [프로그램 등록]으로 추가 → 학생 화면에도 노출(localStorage 공유 확인).
3. 카드에 카테고리·D-Day·제목·설명·**모집기간**·정원 표시. 학생만 찜 버튼.
4. 하드코딩 프로그램 리터럴 0(`grep PROGRAMS src_v2/pages/growth/ProgramApply.tsx` → 없음).
