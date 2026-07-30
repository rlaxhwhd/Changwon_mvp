# 0008-assistant-advisor — 디자인·유지보수 리뷰

> Phase 4 리뷰어(Opus) 작성 (2026-07-30). 소스 무수정 — 이 문서만 작성했다.
> 기준: `ui-spec.md`(진실의 원천) · `component-map.md` · `DESIGN.md`(base) · `src_admin/DESIGN.md`(역할 레이어) · `src_admin/index.css`(토큰) · CLAUDE.md · skill `json-dynamic-screen` · skill `impeccable`(audit만).

## 4단계: 디자인·유지보수

### 판정: **REJECT** (재작업 4건 — 전부 렌더 검증으로 확인된 구체 결함, 데이터층은 통과)

데이터 계약·JSON 동적·접근범위·append-only·seed 정합성은 **전부 PASS**다. 리젝 사유는 **화면 레이어 4건**에 한정되며, 모두 기존 클래스 재사용만으로 고칠 수 있다. 데이터층 재작업은 필요 없다.

### 검증 방법

- 정적: `git diff`(허용 범위 대조) · `npx.cmd tsc --noEmit`(**통과, exit 0**) · `npx.cmd eslint`(신규 파일 + 기존 파일 baseline 비교) · seed 무결성 Node 스크립트(배정 16건 × 로스터/교수 단일소스 대조) · impeccable `detect.mjs`
- **렌더 검증 수행함**: `npm run dev`(vite 5173) + headless Chrome CDP(Node 24 내장 WebSocket)로 조교(`asst_kim`) 세션 주입 → `/admin/assistant/advisor`, `/admin/assistant/advisor/records`, 배정 모달 실측(computed style + 스크린샷). `_workspace` 크롬 덤프 없음(18파일 유지, 프로필은 scratchpad에 격리). 검증 후 chrome/vite 종료, 리포지토리 무변경 확인.

---

## 항목별 판정

| # | 감사 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | 디자인 토큰 drift(새 색·폰트·radius·shadow, 캡처 녹색/주황) | **PASS** | index.css 추가분 7줄 전부 `grid-template-columns`/`align-items`/`text-align` + `color: var(--color-primary); font-weight: 800`. 신규 색상값·폰트·radius·shadow **0건**. 실측 지도교수명 = `rgb(6,83,182)` = `--color-primary`(#0653B6), 대비 **7.19:1**. 캡처 녹색(#0A7D3E)·주황 유입 없음 |
| 2 | 신규 CSS 허용 범위(modifier 3 + `.admin-advisor-name`) | **PASS** | index.css:1038-1044 정확히 4클래스(6+1줄), `admin-asst-roster` 블록 바로 아래. **기존 규칙 수정 0건** |
| 3 | 하드코딩 리터럴 | **PASS** | 두 페이지에 학생·교수·배정·기록·년도·카운트 리터럴 **0건**. 년도는 `getAssignYearOptions()` 파생, 탭 카운트는 `getAdvisorTabCounts`/`getAdviseeTabCounts` 파생, 상담구분은 `PROF_COUNSEL_CATEGORIES` 코드→라벨 맵 |
| 4 | JSON 동적 규약(로더 시그니처·봉투·LS 키) | **PASS** | `queryAdvisorRoster`/`queryAdviseeCounselStatus` 둘 다 `async` + `mockLatency()` + `paginate()` → `Paginated<T>`. LS 키 3종 스펙 일치(`dc_advisor_assign`·`dc_prof_counsel_records`·`dc_advisor_nudges`). 읽기=LS 전체 ?? seed 폴백 + `Array.isArray` 가드 + try/catch, 쓰기=전체 리스트 persist → `counselRecords.ts` 패턴 정확히 미러. seed 파일 불변 |
| 5 | 접근범위(SPEC §2 — 화면 filter 금지) | **PASS** | 두 페이지 모두 전체 배열 `.filter()` 없음. `departments`를 6개 로더 전부에 파라미터로 전달. 학적 필터 존재(기본 `재학`, 스펙대로) |
| 6 | append-only·유일성 | **PASS** | `assignAdvisor()` advisorAssigns.ts:42에서 active 중복 시 throw, :46에서 **학과-교수 일치까지 추가 검증**(스펙 초과 방어, 좋음). 수정·삭제 경로 없음, `released` UI 없음. `sendNudge()` append only |
| 7 | seed 데이터 정합성 | **PASS** | 배정 16건 전수 검증: 학생·교수 id 전부 단일소스 실재, `professorName`/`snapshot` **드리프트 0건**, 학생당 active 1건, id 유일, `assignedAt` 2023~2026 4개년, 컴공 11/4 · 경영 5/3, 교수 분산 cse-1:5/cse-2:4/cse-3:2(스펙 명시값 정확 일치), 컴공 졸업생 1명 2023 배정 포함. 상담기록 8건 전부 배정 학생 + 배정 교수 일치, 6종 카테고리 전부 사용, cse-3 0건(편차 시연) |
| 8 | 컴포넌트 재사용(component-map) | **PASS** | AdminModal·EmptyState·useListData·paginate/totalPages/mockLatency·getFullRoster/getRosterFilterOptions/collegeOf/enrollStatusClass·PROFESSOR_GROUPS·아이콘 세트 전부 재사용. **중복 생성 0건.** AssistantStudents 통째 복붙 아님(그쪽은 `StudentRosterTable` 얇은 래퍼라 9열+배정 버튼 요구를 못 담음 — 패턴 미러가 옳은 판단) |
| 9 | 회귀(허용 범위 밖 변경) | **PASS** | `git status` 수정 파일 = App.tsx · index.css · studentRoster.ts · studentsRoster.json **4건뿐**(ui-spec §4-7 정확 일치). navConfig.ts·counselRecord 계열·ProgramBlacklist·AssistantStudents·StudentRosterTable·src_v2 화면 **무수정** |
| 10 | 타입 체크 | **PASS** | `npx.cmd tsc --noEmit` exit 0, 출력 없음 |
| 11 | AdminModal `sm` 판단(팀장 확인 요청) | **PASS — Codex 판단 타당** | `AdminModal.tsx:9` `size?: 'md' \| 'lg' \| 'xl'` — `sm` **실제로 미지원**. `sm` 추가는 AdminModal + index.css 수정 = ui-spec §4-7 허용 범위 밖. `md`(실측 520px) 선택이 정답. 근거 없이 넘어간 게 아니라 계약을 지킨 우회다 |
| 12 | impeccable 안티패턴 감지 | **PASS(신규분)** | `detect.mjs` 신규 CSS·두 페이지 히트 **0건**. 검출된 side-tab 2건(index.css:1182, :1902)은 **전부 pre-existing**(diff는 1038-1044만 추가) — 이번 핸드오프 책임 아님 |
| 13 | **역할 레이어 DESIGN.md 타이포 준수** | **REJECT** | 아래 D-1 |
| 14 | **폼 컨트롤 토큰 적용** | **REJECT** | 아래 D-2 |
| 15 | **툴바 정렬·간격** | **REJECT** | 아래 D-3 |
| 16 | **코드 품질(고아 import)** | **REJECT** | 아래 D-4 |

---

## REJECT 상세 (수정 지시 — Codex가 그대로 실행 가능)

### D-1 · **[High] 카드 섹션 제목이 디자인 시스템 타이포를 벗어난다 + 세로 리듬 0**

- **파일**: `src_admin/pages/AssistantAdvisorRecords.tsx:35`, `:36` — `<section className="admin-card"><h2>교수별 실적</h2>`, `<section className="admin-card"><h2>학생별 현황</h2>`
- **무엇이 위반인가** (headless Chrome computed style 실측):
  - `h2` → **font-size 16px / font-weight 400 / margin 0**. `src_admin/index.css`에 `.admin-card h2` 규칙이 **존재하지 않아** UA 기본값으로 떨어졌다.
  - **역할 레이어 `src_admin/DESIGN.md` "Card Title / Section Title: 16px ~ 18px (Bold)" 직접 위반** — 렌더 결과는 Regular(400)다. 섹션 제목이 본문·표 셀과 시각적으로 구분되지 않는다.
  - 하우스 표준은 `.admin-card-head h2`(index.css:476) = **17px / 800** + 래퍼 `margin-bottom: 16px`. 리포지토리 9개 페이지(RoadmapEditor·SettingsAvailability·ProgramDetail·CounselSession·CounselSchedule 등)가 전부 이 패턴을 쓴다. 신규 화면만 이탈했다.
  - **추가 실측 — 카드 내부 세로 간격이 전부 0px**: `.admin-card`는 `display:block; padding:22px`이고 gap이 없다. 실측 gapToNext = `h2 → 0 → admin-tabs → 0 → admin-filterbar → 0 → admin-toolbar → 0 → admin-roster`. **5개 블록이 전부 0px로 붙어 있다.** 화면 ①(`/assistant/advisor`)은 같은 블록들이 `.admin-page`(flex column, **gap 22px**) 직속이라 리듬이 정상이라, **두 화면의 간격 규칙이 서로 다르다**(일관성 결함).
- **수정 지시**
  1. 두 `<h2>`를 하우스 래퍼로 감싼다 (신규 CSS 불필요 — `admin-card-head`는 index.css:470에 이미 있고 `margin-bottom:16px` + 17px/800 h2를 제공):

     ```tsx
     <section className="admin-card">
       <div className="admin-card-head"><h2>교수별 실적</h2></div>
       …
     ```

     `학생별 현황`도 동일하게.
  2. 섹션 2의 `admin-tabs` · `admin-filterbar` · `admin-toolbar` **3블록을 `.admin-card` 밖으로 꺼내 `.admin-page` 직속 형제로 올린다.** 그러면 `.admin-page`의 `gap:22px`가 적용돼 화면 ①과 동일한 리듬이 되고 **신규 CSS가 0줄**이다. 하우스 선례: `RoadmapRequests.tsx:103`(admin-tabs가 admin-page 직속 → 아래 admin-card), `AssistantAdvisor.tsx:53-56`(같은 구조).
     - 주의: 이 배치는 ui-spec §3 레이아웃 다이어그램(탭·필터바를 카드 안에 그림)과 다르다. **팀장 승인 필요.** 다이어그램을 지키려면 대안은 index.css에 간격 규칙 1줄 추가인데, 그건 component-map "신규 CSS = modifier 3 + 강조 1" 제한을 넘으므로 역시 팀장 판단이다. **리뷰어 권고는 (2) 구조 이동** — 신규 CSS 0, 하우스 패턴 일치, 화면 ①과 통일.

### D-2 · **[High] 배정 모달의 날짜 입력이 완전히 무스타일 — 같은 폼 안에서 두 컨트롤이 딴판**

- **파일**: `src_admin/pages/AssistantAdvisor.tsx:63` — `<label className="admin-select"><span>배정일</span><input type="date" …/></label>`
- **무엇이 위반인가**: `.admin-select`는 **필터바용 클래스이고 `.admin-select select`만 스타일한다**(index.css:994-1003). `input`에 대한 규칙이 없어 date input이 UA 기본값으로 렌더된다. 모달 실측:

  | | border | padding | radius | font-size | height |
  |---|---|---|---|---|---|
  | 교수 `<select>` | 1px solid #E6ECF5 | 9px 12px | 8px | 14px | 38px |
  | 배정일 `<input type="date">` | **0px** | **0px** | **0px** | **16px** | **24px** |

  스크린샷상 날짜 필드만 테두리 없이 맨몸으로 떠 있어 바로 위 select와 시각적으로 어긋난다. font-size 16px도 admin 폼 타입스케일(14px) 이탈이다.
- **수정 지시**: 모달 폼 컨트롤 2개를 **모달·폼 전용 하우스 클래스 `.admin-field`로 교체**한다(index.css:733-754 — `input`/`select`/`textarea`를 동일하게 padding 10px 12px · `--radius-md` · focus ring까지 처리. 선례: `RoadmapEditor.tsx:207`, `SettingsAvailability.tsx:53`, `SettingsProfile.tsx:57`). 신규 CSS 0줄:

  ```tsx
  <label className="admin-field"><span>교수</span><select …>…</select></label>
  <label className="admin-field"><span>배정일</span><input type="date" …/></label>
  ```

  `admin-form-actions`(이미 사용 중, index.css:763)와 같은 폼 패밀리라 모달 전체가 하우스 폼 규약으로 정렬된다.

### D-3 · **[Medium] 툴바 버튼이 우측 정렬 안 됨 + 두 버튼 사이 간격 0**

- **파일**: `src_admin/pages/AssistantAdvisor.tsx:55` — `<div className="admin-toolbar"><span className="admin-toolbar-count">…</span><div><button…>초기화</button><button…>엑셀 다운로드</button></div></div>`
- **무엇이 위반인가**:
  - ui-spec §2는 `admin-toolbar 좌: "검색 결과 {n}명" · 우: [초기화] [엑셀 다운로드]`인데, `.admin-toolbar`는 `display:flex; align-items:center; gap:14px`뿐이라 **`justify-content: space-between`이 없다**. 실측 결과 버튼 그룹이 카운트 바로 오른쪽(left 341px)에 붙어 좌측에 몰려 있다 — **스펙의 좌/우 분리 미달성**.
  - 버튼 래퍼 `<div>`에 **className이 없어** `display:block`이 되고, 실측 `초기화` right=415px / `엑셀 다운로드` left=415px — **두 버튼이 간격 0으로 맞붙어 있다**. 고스트+프라이머리가 용접된 모양은 impeccable 간격 안티패턴에 해당한다.
- **수정 지시**: 버튼 2개를 `admin-toolbar`에서 빼고 **`admin-page-head`의 액션 슬롯으로 옮긴다**(신규 CSS 0줄 — `.admin-page-head`가 `justify-content: space-between`(index.css:397-402), `.admin-head-actions`가 `display:flex; gap:8px`(index.css:1078). 선례: `ProgramBlacklist.tsx:206`):

  ```tsx
  <header className="admin-page-head">
    <div><h1 className="admin-page-title">전담교수 배정 현황</h1><p className="admin-page-desc">…</p></div>
    <div className="admin-head-actions">
      <button type="button" className="admin-btn admin-btn-ghost" onClick={reset}>초기화</button>
      <button type="button" className="admin-btn admin-btn-primary" onClick={download}>엑셀 다운로드</button>
    </div>
  </header>
  ```

  그러면 우측 정렬 + 8px 간격이 동시에 해결되고 `admin-toolbar`는 카운트 전용으로 남아 화면 ②와 구조가 통일된다. (툴바 안에 유지하려면 `margin-left:auto`용 신규 CSS가 필요하므로 비권장.)

### D-4 · **[Medium] 고아 import — eslint 에러**

- **파일**: `src_admin/pages/AssistantAdvisorRecords.tsx:10` — `import { enrollStatusClass, getRosterFilterOptions } from '../data/studentRoster'`
- **무엇이 위반인가**: `enrollStatusClass`가 파일 어디에서도 쓰이지 않는다(섹션 2 표는 9열에 학적 배지 열이 없고 학적은 필터 축으로만 쓴다). `npx.cmd eslint` → `error 'enrollStatusClass' is defined but never used @typescript-eslint/no-unused-vars`. CLAUDE.md 개발 준수사항 §3("내 변경이 만든 고아 import는 제거") 위반.
- **수정 지시**: import에서 `enrollStatusClass`를 삭제해 `import { getRosterFilterOptions } from '../data/studentRoster'`로 만든다.
- **참고(리젝 아님)**: 같은 lint 실행의 `react-hooks/preserve-manual-memoization` 4건은 **pre-existing 하우스 노이즈**다 — `StudentRosterTable.tsx:45-46`, `StudentList.tsx:45-46`에 동일 패턴이 있고 레포 전체 30 errors 중 대부분이 이것이다. 신규 파일은 하우스 패턴을 그대로 따랐을 뿐이므로 수정 요구하지 않는다.

---

## 권장(advisory) — 리젝 사유 아님

| # | 내용 | 위치 |
|---|---|---|
| A-1 | `getProfessorStats`의 `recordCount`가 **담당 범위로 스코프되지 않는다**. `records.filter(r => r.professorId === id)` — 조교 `departments` 밖 학생의 기록까지 센다. 현재 단일소스에서 교수는 학과 전속이라 실측 영향 0이지만, SPEC §2("범위 판정은 데이터층") 정신상 `scopeAssignments`의 학생 집합으로 한 번 더 좁히는 게 안전하다 | `profCounselRecords.ts:46` |
| A-2 | `getProfessorAdvisorCounts(major)`가 `major`를 `departments` 배열 자리에 넣는다(`rosterRows([major])`). 지금은 `getFullRoster`가 major로 필터하므로 동작하지만 두 개념이 섞여 있다. 파라미터명을 `department`로 바꾸면 의도가 분명해진다. (이 함수 자체는 ui-spec §4-3에 없는 **추가 export지만, 모달 카운트를 화면에서 계산하지 않고 데이터층에 둔 옳은 판단**이다 — component-map 신규 섹션에 계약으로 기록해 두길 권한다) | `advisorAssigns.ts:105-109` |
| A-3 | `getProfessorStats`의 `dept: items[0].student.major` — 첫 지도학생의 학과를 교수 학과로 삼는다. 조교가 2개 학과를 담당하고 교수가 양쪽에 배정된 경우 한쪽만 표시된다 | `profCounselRecords.ts:47` |
| A-4 | 배정년도 옵션이 `useMemo(…, [deptKey])`라 **배정 확정 후 갱신되지 않는다**. 새 년도(예: 2027)로 배정하면 재마운트 전까지 필터 옵션에 안 뜬다 | `AssistantAdvisor.tsx:31` |
| A-5 | `id: adv_${Date.now()}` / `ndg_${Date.now()}` — 동일 밀리초 2건 생성 시 id 충돌. 현재 UI(모달 1회 확정)에선 발생 불가하나 방어 여지 | `advisorAssigns.ts:48`, `profCounselRecords.ts:27` |
| A-6 | `formatDate` 헬퍼가 두 파일에 동일 중복. 페이지네이션도 `AssistantAdvisor.tsx:66`은 로컬 `<Pagination>` 컴포넌트로 뽑고 `AssistantAdvisorRecords.tsx:36`은 인라인 — **같은 핸드오프 안에서 규칙이 다르다**. 둘 중 하나로 통일 권장(공유 컴포넌트 추출은 이번 범위 밖) | 두 페이지 |
| A-7 | 신규 데이터 로더 2개에 **파일 헤더 블록 주석이 없다.** `src_admin/data/*.ts` 24개 중 22개가 `// ──…` 목적·DB전환 주석을 달고 있고(예외는 pre-existing `dashboard.ts`뿐), ui-spec §4-3/§4-6은 각 export의 JSDoc까지 계약으로 적어 뒀는데 구현에서 대부분 빠졌다. `[DB-ready]` 마커도 없다 — 이 프로젝트의 "DB 전환 시 로더만 교체" 이음새 표식이므로 `queryAdvisorRoster`/`queryAdviseeCounselStatus`에 붙이길 권한다 | `advisorAssigns.ts:1`, `profCounselRecords.ts:1` |
| A-8 | 두 페이지가 **한 줄 초장문 JSX**(AssistantAdvisorRecords.tsx:36 = 3,230자, AssistantAdvisor.tsx:56 = 1,716자). 다만 `CounselRequests.tsx:105`(6,465자)에 **선례가 있어** 신규 이탈이 아니다. 하우스 다수(`StudentRosterTable.tsx` 등)는 정형 포맷이므로 향후 통일 권장 — 이번 리젝 사유에서 제외 | 두 페이지 |
| A-9 | 검색 input에 `aria-label`이 없다(placeholder만). `StudentRosterTable`도 동일하지만 `CounselRequests.tsx:105`는 `aria-label`을 단다. 하우스가 혼재 — 신규 화면은 다는 쪽 권장 | 두 페이지 |
| A-10 | 탭이 `role="tablist"`/`role="tab"`/`aria-selected`는 있으나 `aria-controls`·`tabpanel`이 없다. 하우스 전 페이지가 동일하므로 신규 결함 아님 | 두 페이지 |
| A-11 | `useState('재학')`가 두 파일 3곳에 한글 리터럴로 박혀 있다. `EnrollStatus`가 원래 한글 문자열 union인 기존 규약이라 위반은 아니지만, `const DEFAULT_STATUS: EnrollStatus = '재학'` 모듈 상수로 빼면 초기화 핸들러와 값이 어긋날 위험이 사라진다 | `AssistantAdvisor.tsx:25,55`, `AssistantAdvisorRecords.tsx:25` |
| A-12 | 경영학과 미상담 학생이 **2명**(stu-019 휴학, changwon)이다. ui-spec §4-5는 "미상담 학생을 학과당 3명 이상"을 요구했고, 기본 학적필터 `재학`에서는 경영 조교(`asst_park`) 화면에 **미상담 행이 1건만** 보인다(탭 카운트는 2). 독려 발송 시연 폭이 좁다. seed에 경영 미상담 재학생 1~2명 추가 권장 | `profCounselRecords.seed.json` |

---

## 별건 이슈 (이번 핸드오프 책임 아님 — 팀장 판단용)

| # | 내용 |
|---|---|
| P-1 | **`.admin-enroll-active` 배지 대비 2.05:1 (WCAG AA 4.5:1 미달).** `index.css:537` `background:#EAF9EF; color: var(--color-success)`(#21C67A). 정작 같은 파일 토큰 블록(index.css:52)에 **`--tint-success-bg:#EAF9EF; --tint-success-ink:#0B6B3A; /* 6.07:1 */`** 이 "배지에 raw hex 금지, 이 토큰만 사용"이라는 주석과 함께 준비돼 있는데 `.admin-enroll-*` 4종이 이를 쓰지 않는다. **pre-existing**(diff 미포함)이고 ui-spec §2가 `enrollStatusClass` 재사용을 지시했으므로 **Codex 리젝 사유 아님.** 다만 이번 화면이 학적 배지 열을 새로 노출하므로 노출면이 늘었다 — `admin-enroll-*` 4종을 `--tint-*-ink/bg`로 교체하는 별도 티켓 권장(`leave`·`graduate`도 동일 구조) |
| P-2 | impeccable side-tab 히트 2건(`index.css:1182 border-left-width:4px`, `index.css:1902 border-left:3px solid var(--color-primary)`) — pre-existing, 기존 메모에도 기록된 정리 후보 |
| P-3 | impeccable 스킬 v3.9.1 설치, v4.0.4 사용 가능(`npx impeccable update`). 이번 감사엔 영향 없음 |

---

## 재작업 체크리스트 (Codex용)

1. `AssistantAdvisorRecords.tsx` — `<h2>` 2개를 `<div className="admin-card-head"><h2>…</h2></div>`로 감싼다.
2. `AssistantAdvisorRecords.tsx` — 섹션 2의 `admin-tabs`·`admin-filterbar`·`admin-toolbar`를 `.admin-card` 밖 `.admin-page` 직속으로 이동(팀장 승인 후).
3. `AssistantAdvisor.tsx:63` — 모달의 `label.admin-select` 2개를 `label.admin-field`로 교체.
4. `AssistantAdvisor.tsx:52,55` — `[초기화][엑셀 다운로드]`를 `admin-page-head` 안 `<div className="admin-head-actions">`로 이동, `admin-toolbar`는 카운트만 남긴다.
5. `AssistantAdvisorRecords.tsx:10` — `enrollStatusClass` import 삭제.
6. 재확인: `npx.cmd tsc --noEmit` 통과 · `npx.cmd eslint <신규 4파일>`에 `no-unused-vars` 0건 · **index.css 추가 줄 수 불변(7줄)** — D-1~D-3 수정은 전부 기존 클래스 재사용이라 신규 CSS가 늘면 안 된다.

---

## 4단계 재검증 (Codex 1차 재작업 후, 2026-07-30)

### 최종 판정: **PASS**

REJECT 4건 전부 해소됐다. 렌더 실측으로 확인했고, 재작업 과정에서 새 결함·회귀는 발견되지 않았다.

### 재검증 방법

1차와 동일 — `npm run dev`(vite 5173) + headless Chrome CDP(Node 24 내장 WebSocket) 실측. 조교 **2명 전부**(`asst_kim` 컴공 · `asst_park` 경영) 세션으로 두 화면 + 배정 모달 + 미상담 탭까지 렌더. 프로필은 scratchpad 격리, 검증 후 chrome/vite 종료, `_workspace` **18파일 불변**, 리포지토리 무변경 확인.

> 참고: 1차 리뷰 중 `/assistant/advisor` → `/assistant/students` 리다이렉트가 관측된 건 **제품 결함이 아니라 검증 스크립트의 연속 `Page.navigate` 레이스**였다(`/admin` 로드 직후 `RoleHome`의 `<Navigate replace>`가 후속 내비게이션을 덮어씀). 단일 내비게이션으로 격리해 재현 확인 — **라우팅 정상**. 1차 문서에 오탐으로 기록되지 않았음을 확인한다.

### REJECT 4건 해소 실측

| ID | 항목 | 1차 실측 | 재검증 실측 | 판정 |
|---|---|---|---|---|
| **D-1a** | 카드 섹션 제목 타이포 | `h2` 16px / **weight 400** / margin 0, 부모 `admin-card` | `h2` **17px / weight 800**, 부모 **`admin-card-head`**, wrapper `margin-bottom: 16px` (2개 모두) | **해소** — `src_admin/DESIGN.md` "Card Title 16~18px Bold" 준수 |
| **D-1b** | 카드 내부·섹션 간 세로 리듬 | 카드 내부 5블록 gapToNext **전부 0px** | `.admin-page` 자식 6블록 **전부 22px**, 카드 내부 `admin-card-head → 16px → roster` | **해소** — 화면 ①과 리듬 통일 |
| **D-2** | 모달 폼 컨트롤 | select(1px/9px 12px/8px/14px/38px) vs date(**0/0/0/16px/24px**) | select(1px solid #E6ECF5 / 10px 12px / **12px** / 14px / 40px) · date(**동일 1px / 10px 12px / 12px / 14px** / 43px) — 좌표·너비 동일(left 481, w 478) | **해소** — `admin-field`로 통일. 높이 3px 차는 date 네이티브 캘린더 아이콘 고유값 |
| **D-3** | 툴바 액션 정렬·간격 | 좌측 몰림(left 341), 두 버튼 **간격 0px**(415↔415) | `admin-head-actions` gap **8px**(초기화 …1280 / 엑셀 1288…1400), 우측 정렬(right 1400 = 페이지 우단), `admin-toolbar`는 카운트만 | **해소** |
| **D-4** | 고아 import | `enrollStatusClass` 미사용 lint error | import에서 제거, 신규 6파일 **eslint exit 0 (0 problems)** | **해소** |

### 회귀·신규 결함 점검 (재작업이 깨뜨린 것 없음)

| 점검 | 결과 |
|---|---|
| 신규 CSS·색상 유입 | `git diff src_admin/index.css` **+7줄 그대로**(내용 1자 불변). 두 페이지·두 로더에 hex/rgb/hsl/oklch/font-family/border-radius/box-shadow 리터럴 **0건** |
| impeccable 안티패턴 | `detect.mjs` 두 페이지 결과 **`[]` (0건)** |
| 레이아웃 이동 부작용 | 두 화면 모두 `scrollWidth == clientWidth`(가로 오버플로 없음). 카드 밖으로 뺀 탭·필터·툴바가 22px 리듬에 정상 편입, 표 그리드·페이지네이션 무영향 |
| 리포맷 중 마크업·로직 변질 | 두 페이지 전문 정독. 탭 3종/2종·필터 5개/2개·9열 헤더·정렬·페이징·모달 필드·CSV 헤더 8열·독려 상태 3분기 전부 1차와 동일. **런타임 콘솔 error/warning 0건** |
| eslint 회귀 | 1차에 있던 `react-hooks/preserve-manual-memoization` 4건까지 소멸(`useMemo` 제거 부수효과). 신규 파일 **0 problems** |
| 데이터층 회귀 | 배정 seed 16건 무변경. 상담기록 seed만 8→7건 |
| 스코프 격리(조교 2명) | `asst_kim`: 배정 11·미배정 4·미상담 7 · 교수 3명(5/4/2명, 4/1/0건). `asst_park`: 배정 5·미배정 3·미상담 3 · 교수 3명(2/2/1명, 2/0/0건). **교차 오염 없음** |

### 1차 advisory 반영분 확인

| ID | 조치 | 실측 |
|---|---|---|
| A-1 | `getProfessorStats` 스코프 교차필터 | `profCounselRecords.ts:52-55` `adviseeIds.has(record.studentId)` 추가 — 담당 범위 밖 기록이 건수에 섞이지 않는다. **해소** |
| A-4 | 배정년도 옵션 stale | `useMemo` 제거(`AssistantAdvisor.tsx:49-50`) → 배정 확정 후 옵션 즉시 갱신. **해소** |
| A-7 | 헤더 주석 · `[DB-ready]` | 데이터 4파일에 `// ──` 블록 헤더 + `[DB-ready]` 이음새 주석 추가. `src_admin/data` 하우스 관례 복귀. **해소** |
| A-8 | 초장문 한 줄 JSX | 두 페이지 정형 포맷 리포맷(최대 108자). **해소** |
| A-12 | 경영 미상담 3명 요건 | `pcr_008` 삭제 → 경영 배정 5 / **미상담 3**(재학 2, 독려 버튼 2행) — ui-spec §4-5 "학과당 3명 이상" 충족. seed 전수 재검증: 배정 안 된 학생의 기록 **0건**, 상담구분 6종 전부 사용, 교수별 편차 유지(cse-1 4건·cse-3 0건 / biz-1 2건·biz-2·biz-3 0건). **충족** |

- A-12 처리 방식 메모: 리뷰어는 *미상담 학생 추가*를, Codex는 *기록 삭제*를 택했다. 두 방법 모두 요건을 만족하며(미상담 3 + 교수별 편차 존재), 다만 경영에서 기록 보유 교수가 2명→1명으로 줄었다. ui-spec §4-5는 편차만 요구하고 교수별 커버리지는 요구하지 않으므로 **수용**한다.
- 미반영 advisory(A-2·A-3·A-5·A-6·A-9·A-10·A-11)는 전부 리젝 사유가 아니었고 그대로 유효하다. 후속 슬라이스에서 처리하면 된다.

### 재검증에서 새로 관찰된 것 (전부 nit — 리젝 아님)

| # | 내용 | 위치 |
|---|---|---|
| N-1 | **모달의 두 `admin-field` 사이 간격 0px.** D-2 수정으로 두 컨트롤이 모두 박스가 되면서 드러났다(이전엔 date가 무스타일이라 안 보였음). 하우스는 `.admin-field` 형제를 `.admin-form-grid`(grid, gap 16px)로 감싼다(`SettingsProfile.tsx:56`). 라벨이 구분자 역할을 해 가독성 문제는 없으나, `<div className="admin-form-grid">`로 감싸면 신규 CSS 없이 16px 리듬이 붙는다 | `AssistantAdvisor.tsx:328-345` |
| N-2 | **"학생별 현황" 제목이 자기 탭·필터보다 아래에 온다.** 탭·필터·툴바를 카드 밖으로 뺀 결과(리뷰어 권고안대로)의 부작용이다. 화면 ①·`RoadmapRequests`와 동일한 하우스 구조이고 교수별 실적 카드가 시각적으로 닫혀 있어 오독 소지는 낮지만, 섹션 라벨이 컨트롤 뒤에 오는 건 이상적이지 않다. 개선하려면 `학생별 현황` 제목을 탭 위로 올려야 하는데 카드 밖 제목용 하우스 클래스가 없어 신규 CSS가 필요하다 → **현 상태 수용** | `AssistantAdvisorRecords.tsx:105-158` |
| N-3 | **CSV 배정일자 형식이 ISO → 점 구분으로 바뀌었다.** 리포맷 중 `row.advisor?.assignedAt ?? ''` → `row.advisor ? formatDate(row.advisor.assignedAt) : ''`(`AssistantAdvisor.tsx:99`). 요청되지 않은 동작 변경이지만 화면 표시(`YYYY.MM.DD`)와 일치시키는 방향이고 ui-spec §2는 CSV 날짜 형식을 규정하지 않는다 → **수용**(스프레드시트 날짜 자동인식이 필요해지면 ISO로 되돌릴 것) | `AssistantAdvisor.tsx:99` |
| N-4 | `useMemo` 제거로 `getRosterFilterOptions`·`getAssignYearOptions`·탭 카운트가 매 렌더 재계산된다(A-4 해소의 대가). 로스터 102건 규모라 실측 체감 없음. DB 전환 시 서버 집계로 대체될 지점이므로 현 시점 수용 | 두 페이지 |

### 최종

**PASS.** 5단계(내용 정합성) 및 커밋으로 진행 가능하다. 별건 이슈 **P-1(`.admin-enroll-*` 배지 대비 2.05:1, pre-existing)** 은 이 핸드오프와 무관하게 여전히 열려 있으므로 별도 티켓으로 남긴다.

---

### 최종 확인 — 팀장 직접 수정분 (N-1 · N-2) 렌더 검증

동일 방식(vite + headless Chrome CDP) 재실측. 두 수정 모두 **마크업 이동만**이고 기존 클래스만 썼음을 코드·렌더 양쪽에서 확인했다.

#### N-1 · 배정 모달 필드 그리드 — **확인 완료**

| 측정 항목 | 결과 |
|---|---|
| `.admin-form-grid` | `grid-template-columns: 231px 231px` · `gap: 16px` · `margin-top: 4px` |
| 교수 필드 | `admin-field admin-field-full` → `grid-column: 1 / -1`, **width 478px = 모달 본문 전폭**(l 473 → r 951) |
| 배정일 필드 | `grid-column: auto` → width 231px(반폭), 2행 |
| **두 필드 세로 간격** | **16px** (이전 0px) |
| select 텍스트 잘림 | **없음**(`scrollWidth ≤ clientWidth`). 최장 옵션 `박지훈 (소프트웨어공학) · 배정 5명` **193px** vs select 내부폭 **452px** → 여유 259px |
| 두 컨트롤 스타일 일치 | padding 10px 12px · radius 12px · font-size 14px (동일) |
| 액션 버튼 간격 | `.admin-form-actions` margin-top 14px 정상 |

- **`admin-field-full` 판단 타당**: 반폭(231px, 내부 ≈190px)이었다면 최장 옵션 193px가 **잘렸다**. 전폭 지정이 실제로 필요한 조치였다.

#### N-2 · "학생별 현황" 제목 위치 — **확인 완료**

| 측정 항목 | 결과 |
|---|---|
| 제목 타이포 | **17px / weight 800 / `rgb(28,36,66)`** — 카드 안의 "교수별 실적"과 **완전 동일**. `.admin-card-head h2`가 `.admin-card` 스코프에 묶이지 않는다는 팀장 판단 **정확** |
| 렌더 순서 | `page-head → card(교수별 실적) → **card-head(학생별 현황)** → tabs → filterbar → toolbar → card(표)` ✓ 제목이 자기 컨트롤보다 위 |
| 섹션 리듬 | `.admin-page` gap 22px 유지 — 22 / 22 / **38** / 22 / 22 / 22 |
| 시각적 분리 | 위 "교수별 실적" 카드가 1px `#E6ECF5` 테두리로 y=542에서 명확히 닫히고, 제목은 y=564에서 카드 밖에 위치 → **분리 양호** |
| 오버플로 / 콘솔 | `scrollWidth == clientWidth`(1424), 런타임 error/warning **0건** |
| 조교 2명 재확인 | `asst_park`(경영) 화면에서도 동일하게 정상 렌더 |

#### 잔여 nit 2건 (선택 — 리젝 아님, 현 상태로 출고 가능)

| # | 내용 | 선택적 조치 |
|---|---|---|
| N-2a | **근접성 역전.** "학생별 현황" 제목 기준 위 여백 22px(앞 카드와) · 아래 여백 **38px**(자기 탭과) = `.admin-page` gap 22 + `.admin-card-head` margin-bottom 16. 라벨이 자기 콘텐츠보다 앞 섹션에 더 가깝다. 다만 앞 카드의 테두리가 22px 공백보다 훨씬 강한 구분자라 실제 가독에는 문제가 없다(스크린샷 확인) | 그대로 두어도 무방 |
| N-2b | **두 섹션 제목 좌측 정렬 불일치.** "학생별 현황" left **250px**(페이지 좌단) vs "교수별 실적" left **273px**(카드 padding 22 + border 1). 형제 섹션 제목인데 23px 어긋난다 | 대칭을 원하면 **"교수별 실적"의 `admin-card-head`도 카드 밖(페이지 직속)으로 동일하게 빼면** 둘 다 left 250 · 둘 다 제목→콘텐츠 38px로 완전 대칭이 되고 N-2a도 "섹션 제목 → 콘텐츠 = 38px" 일관 규칙으로 정리된다. **마크업 이동만, 신규 CSS 0줄** |

### 최종 판정: **PASS** — 출고 가능

REJECT 4건 해소 + N-1·N-2 확인 완료. 잔여 N-2a/N-2b는 선택적 폴리시이며 리젝 사유가 아니다. 별건 **P-1(`.admin-enroll-*` 배지 대비 2.05:1, pre-existing)** 만 별도 티켓으로 남는다.
