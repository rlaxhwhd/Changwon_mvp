# 0008 · assistant-advisor — 내용 정합성 리뷰

> content-reviewer(Opus) 5단계 산출물 (2026-07-30). 기준 = `ui-spec.md`(진실의 원천), 대조 = `image-analysis.md`(현행 캡처 기록).
> 검증 방법: 소스 정독 + `node`로 seed↔로스터 실측 대조 + `tsc --noEmit`(통과) + gstack `/browse` 실렌더(조교 2계정 로그인, 두 화면 + 배정 모달 + 독려 발송 실행).
> **소스는 수정하지 않았다.**

## 5단계: 내용 정합성

### 판정 — **REJECT** (블로킹 1건)

블로킹은 **seed 분포 요건 미달 1건**뿐이고, 나머지 감사 항목(교정표 전 항목·열 구성·상태별 렌더·모달·독려 3상태·용어·코드 사전·JSON 매핑)은 전부 PASS다.
수정은 `profCounselRecords.seed.json` **1줄 삭제**로 끝난다.

---

### 항목별 판정

| # | 감사 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | 교정표(§6) 전 항목 이행 | **PASS** | 아래 §1 표 |
| 2 | 화면① 9열 구성·데이터 출처 | **PASS** | 렌더 실측 열 순서·값 일치 |
| 3 | 지도교수 열 상태별 렌더 | **PASS** | 배정=`admin-advisor-name`, 미배정=[교수 배정] 버튼, 배정일자 `—` |
| 4 | 배정 모달 | **PASS** | 학과 교수만·배정수 병기·오늘 기본·행 전환 피드백 확인 |
| 5 | 화면② 섹션1/2·탭·독려 3상태·정렬 | **PASS** | 렌더 실측 |
| 6 | 용어·라벨·권한 밖 액션 | **PASS** | 오염 0건, 편집 UI 없음 |
| 7 | 상담구분 코드 사전 | **PASS** | GRP `0131` 6종 코드+라벨 분리 |
| 8 | **seed 데이터 정합성** | **REJECT** | 경영학과 미상담 요건 미달 (§3-1) |
| 9 | JSON 값 → 화면 매핑 | **PASS** | 스냅샷 아닌 라이브 로스터 표시 확인 |

---

## 1. 교정표(ui-spec §6) 이행 검증 — 전 항목 PASS

| 이미지 요소 | 기획 교정 | 구현 실측 | 판정 |
|---|---|---|---|
| 녹색/주황 팔레트 | admin 토큰 치환 | `index.css` +7줄, 신규 색값 0. `#0A7D3E`·주황 리터럴 grep 0건 | PASS |
| 탭 테두리형 | `.admin-tabs` 하단보더 + `admin-tab-count` | `admin-tab`/`admin-tab-count` 사용, 렌더 확인 | PASS |
| 탭 순서 전체·미배정·배정 | 유지 | `전체15 미배정4 배정11`(asst_kim) | PASS |
| 넓은 소속 select | 담당 범위 학과 select | 옵션 = `전체 / 컴퓨터공학과` (asst_kim), `전체 / 경영학과` (asst_park) | PASS |
| 자유검색 + **[검색] 버튼** | 라이브 검색, 버튼 제거 | `onChange` 즉시 반영, 검색 버튼 DOM 부재 | PASS |
| 학적 필터·열 없음 | 학적 select(기본 재학) + 배지 열 | 기본 `재학` → 컴공 15명 중 13명 표시(휴학1·졸업1 제외) | PASS |
| **엑셀업로드** | 제거 | DOM·소스 부재 | PASS |
| 다운로드 2종 | [엑셀 다운로드] 1개 | 버튼줄 = `[초기화][엑셀 다운로드]` 2개만. BOM+Blob+createObjectURL, 파일명 `전담교수배정_YYYYMMDD.csv` | PASS |
| **"총 98개"**(전교) | 담당 범위 카운트 | `검색 결과 13명`(컴공) / `6명`(경영) — 전교 수치 유출 없음 | PASS |
| **체크박스 열** | 제거 | `type="checkbox"` grep 0건 | PASS |
| 번호 내림차순 | 순번 오름차순 + 정렬규칙 | 1~10 오름차순, 미배정 3행이 최상단 → 배정일 최신순 | PASS |
| **소속 "GAST-인공지능대학…"** | `collegeOf(major) + major` | `공과대학 컴퓨터공학과` / `경영대학 경영학과`. 실조직명·캡처 학생명(구지연·이승화 등) grep 0건 | PASS |
| 지도교수 녹색 텍스트 | `.admin-advisor-name`(primary) | `color: var(--color-primary)` 1줄만 신규 | PASS |
| 배정일자 `YYYY.MM.DD` | 표시 점구분 / 저장 ISO | 화면 `2026.03.04`, seed `2026-03-04` | PASS |
| 미배정 행 (사용자 구두요구) | [교수 배정] 버튼 + `—` | 실렌더 확인, 클릭 시 모달 오픈 | PASS |

**금지사항(§7) 준수:** navConfig.ts diff 0 · `counselRecord`/`counselRequests` 계열 무수정 · src_v2 화면 무수정 · 허용 외 파일 변경 없음(`git status` = App.tsx·studentRoster.ts·index.css·studentsRoster.json 4건 + 신규 6건).
`src_v2/data/studentsRoster.json`은 **phone 82건 추가만**, 다른 필드 변경 0건(전 학생 필드 단위 diff로 확인). 학생 수 112명 불변.

---

## 2. 실렌더 검증 결과 (console 에러 0건)

**화면① `/assistant/advisor` (asst_kim · 컴퓨터공학과)**
- head `전담교수 배정 현황` / `컴퓨터공학과 · 담당 학과 학생 15명`
- 배정년도 옵션 `2026·2025·2024·2023` (경영은 `2026·2025·2024`) — 학과별로 배정 데이터에서 파생됨, 하드코딩 없음
- 미배정 3행(오세훈·문가영·배준영) 상단 → 배정 11행 배정일 내림차순
- 배정 모달: `학생 오세훈 / 학번 20210109 / 소속 컴퓨터공학과 / 학년 4학년` + 교수 select `박지훈 (소프트웨어공학) · 배정 5명 · 강민재 (인공지능) · 배정 4명 · 신유라 (데이터베이스) · 배정 2명` + 배정일 기본 `2026-07-30`(오늘)
- [배정 확정] 실행 → 모달 닫힘, 탭 `미배정 4→3 / 배정 11→12`, 해당 행이 `박지훈 / 2026.07.30`으로 전환. **toast 신설 없음** — 기획대로 행 전환이 피드백

**화면② `/assistant/advisor/records` (asst_kim)**
- head `전담교수 상담 실적` / `컴퓨터공학과 · 배정 학생 11명 기준` / `미배정 4명은 배정 현황에서 관리합니다.`
- 섹션1 5열: 박지훈 5명·4건·2026.03.12 / 강민재 4명·1건·2026.01.27 / 신유라 2명·0건·`—` + `기록 없음`. **active 배정 보유 교수 3명만** 노출(교수 풀 전체 나열 아님)
- 섹션2: 탭 `전체11 / 미상담7`, 학적 기본 재학 → 10명. 미상담 6행이 상단(0회) → 상담이력 4행이 `최근 상담일 오래된 순`
- 최근 상담구분이 코드→라벨로 렌더(`봉사 및 실습`·`사제동행프로그램`·`진로`·`전공 및 학업`) — 한글 리터럴 저장 아님
- 독려 3상태 실측: 미상담+미발송 `[독려 발송]` → 클릭 → `발송 07.30` 텍스트 전환 / 상담이력 행은 `—`

---

## 3. 블로킹 발견 사항

### 3-1. [Major] 경영학과 미상담 배정 학생이 2명 — ui-spec §4-5 "학과당 3명 이상" 미달

**파일:** `src_admin/data/profCounselRecords.seed.json` (전 8행)

**실측(node 대조):**

| 학과 | active 배정 | 기록 보유 | 미상담 | §4-5 요건 |
|---|---|---|---|---|
| 컴퓨터공학과 | 11 | 4 | **7** | 충족 |
| 경영학과 | 5 | 3 | **2** | **미달(3 이상)** |

경영 배정 5명 중 `stu-010`·`stu-012`·`stu-062` 3명이 기록을 가져 미상담이 `stu-019`(류시은·휴학)·`changwon`(김창원·재학) 2명뿐이다.
게다가 화면② 학적 필터 기본값이 `재학`이라 **asst_park 로그인 시 독려 발송 버튼이 화면에 단 1개(김창원)만 뜬다** — 실렌더로 확인했다. ui-spec §4-5가 이 요건을 둔 목적("미상담 탭·독려 버튼 시연")이 경영 조교 계정에서 성립하지 않는다.

> 참고: 다른 §4-2/§4-5 분포 요건은 전부 충족한다. 컴공 11배정/4미배정 · 경영 5배정/3미배정 · 교수 편차 cse-1:5 / cse-2:4 / cse-3:2 (기획 예시 5/4/2와 일치), biz 2/2/1 · `assignedAt` 2023~2026 전 년도 분포 · 컴공 졸업생(신예은 `stu-110`) 2023-03-02 배정 · 전 레코드 `status:'active'` · `by`는 `asst_kim`/`asst_park` · 배정 안 된 학생의 기록 0건 · 기록 교수 = 해당 학생의 배정 교수와 전건 일치 · categoryCode 6종 전부 등장 · date 2025~2026.

**수정 지시 (택1, 앞쪽 권장):**

1. **`pcr_007` 1행 삭제** (`stu-012` 오민재 · biz-1 김세환 · 2025-12-03).
   → 경영 미상담 3명(`stu-012` 재학 · `stu-019` 휴학 · `changwon` 재학), 기본 `재학` 필터에서도 독려 버튼 2개 노출. 교수 실적은 biz-1 1건 · biz-2 1건 · biz-3 0건으로 편차 유지.
2. `pcr_008` 삭제(`stu-062` 이은우 · biz-2 이나경) — 미상담 3명은 동일하나 biz-2가 0건이 되어 경영 섹션1의 "건수 있는 교수"가 1명으로 줄어든다.

`pcr_006`(biz-1)만 남기는 식으로 2행 이상 지우지 말 것 — §4-5의 "교수별 편차" 요건이 약해진다.
삭제 후 `getAdviseeTabCounts('경영학과').none === 3` 인지 재확인할 것.

---

## 4. 사소한 지적 (리젝 사유 아님 — 팀장 판단)

| # | 심각도 | 위치 | 내용 | 지시 |
|---|---|---|---|---|
| 1 | Low | `src_admin/pages/AssistantAdvisor.tsx:52` | page desc가 `{dept} · 담당 학과 학생 {n}명`. ui-spec §2는 `{dept} · 담당 학과 · 배정 {assigned}/{total}명` | 배정 비율을 desc에 복원하거나(탭에 중복 노출이긴 함) ui-spec 문구를 현 구현에 맞춰 정정 |
| 2 | Low | `AssistantAdvisor.tsx:63` | 배정 모달 `size="md"` — ui-spec §2는 `size="sm"` | `sm`으로 맞추거나 스펙 정정 |
| 3 | Low | `AssistantAdvisor.tsx:63` | 모달의 `소속`이 `{student.major}`만. 목록의 `소속` 열은 `collegeOf(major) + major` — 같은 라벨인데 표기가 다름 | 모달도 `{collegeOf(student.major)} {student.major}`로 통일 |
| 4 | Low | `AssistantAdvisor.tsx:39` | CSV의 배정일자가 ISO(`2026-03-04`). 화면은 `2026.03.04` — CSV는 표시물이므로 형식이 갈림 | `row.advisor ? formatDate(row.advisor.assignedAt) : ''` (미배정 빈칸은 유지) |
| 5 | Low | `src_admin/data/profCounselRecords.ts:46` | `getProfessorStats`의 상담 건수·최근 상담일이 `professorId`만으로 집계 — `departments` 스코프 밖 학생 기록까지 셀 수 있다. 현 seed는 교수-학과 1:1이라 무증상이나 SPEC §2(범위 판정=데이터층) 위반 소지 | `scopeAssignments(departments)`의 studentId 집합으로 records를 한 번 더 교집합 |
| 6 | Low | `AssistantAdvisor.tsx:31` | `years`가 `deptKey`에만 memo — 새 배정으로 새 년도가 생겨도 배정년도 옵션이 갱신되지 않음(오늘=2026이라 현재는 무증상) | refetch 트리거를 의존성에 포함하거나 memo 제거 |
| 7 | Nit | `AssistantAdvisorRecords.tsx:35,36` | `<section className="admin-card"><h2>`가 기존 `.admin-card-head h2` 규약(`index.css:476`)을 안 타서 16px/400 무스타일 — 아래 표 헤더보다 약함. **라벨 텍스트("교수별 실적"·"학생별 현황")는 스펙대로** | 위계 문제는 4단계 design-reviewer 소관으로 이관 |
| 8 | Nit | `AssistantAdvisor.tsx:63` | 모달 인라인 에러를 `admin-field-hint`(muted 12px)로 렌더 — 에러 가시성 약함. 문구 자체는 적절 | 동상 |
| 9 | Note | `data/schema/advisorAssign.ts` · `profCounselRecord.ts` | ui-spec §4-1·§4-4의 근거 주석(SPEC §3-4-① 유일성·이력 규칙, `SY_CODE` GRP `0131` 미러 + "실코드 미확인으로 잠정 01~06, DB 전환 시 치환") 이 생략됨. **코드·라벨 값 자체는 정확** | DB 전환 시 근거가 사라지므로 주석 2줄 복원 권장 |
| 10 | Note | 화면② `adviseeRows` | 상담 횟수를 `studentId + 현재 배정 professorId`로 집계 — 지도교수가 교체되면 이전 교수 기록이 학생 행에서 사라진다. 해제·재배정은 이번 범위 밖이라 현재는 무증상 | 해제 기능이 오면 재검토 |
| 11 | Note | `SPEC.md` §3-2②③ | ui-spec 결정 1(액션 = 조회/요청 → **확정 배정**)·결정 4(소스 `dc_counsel_records(type=교수)` → **`dc_prof_counsel_records` 신설**)가 SPEC과 의도적으로 갈린다. 구현은 ui-spec을 정확히 따랐다 | 팀장이 SPEC.md를 갱신해 근거 문서 간 불일치를 없앨 것 |

---

## 5. 재검 대상 (재호출 시 이것만 본다)

- [x] §3-1 경영학과 미상담 3명 이상 — `node`로 `profCounselRecords.seed.json` 재집계 + asst_park 로그인 실렌더에서 독려 버튼 2개 이상 확인 → **해소(아래 재검증)**

---

# 5단계 재검증 (Codex 1차 재작업 후)

> 2026-07-30 · 범위 = 1차 REJECT 1건 + 그 파급 + 팀장 추가 지시 4건. 방법 = `node` 재집계 · `tsc --noEmit`(exit 0) · gstack `/browse` 실렌더(asst_park·asst_kim 양쪽, 배정 확정 1회 실행).

## 최종 판정 — **PASS**

블로킹 1건 해소를 실측으로 확인했다. 재작업으로 새로 생긴 **블로킹은 없다.**
다만 리포맷이 화면② 섹션 구조를 바꿔 **읽기 순서가 역전됐다**(§R-5). 내용(라벨·문구·열)은 온전하므로 5단계는 통과시키되, **4단계(design-reviewer) 통과 전 반드시 처리할 것**으로 넘긴다.

## R-1. 블로킹 해소 확인 — PASS

`pcr_008` 삭제(내가 제시한 **택2안**). 내 1순위 권고는 `pcr_007`이었으나 **택2는 내가 리뷰에 명시적으로 허용한 대안**이므로 재리젝 사유가 아니다. 요건은 값으로 판정한다.

| 요건(ui-spec §4-5) | 재작업 후 실측 | 판정 |
|---|---|---|
| 미상담 학생 학과당 3명 이상 | 컴공 **7** · 경영 **3** | PASS |
| (파생) 기본 학적 `재학`에서 독려 버튼 노출 | 컴공 6개 · 경영 **2개**(김창원·이은우) — asst_park 실렌더 확인 | PASS |
| 교수별 편차 | cse-1 **4건** / cse-2 1건 / cse-3 **0건** · biz-1 **2건** / biz-2 **0건** / biz-3 **0건** | PASS — "다건 vs 0건" 대비 성립. biz 0건 2명이라 §3 섹션1의 `—`+`기록 없음` 렌더가 오히려 더 잘 시연된다 |
| categoryCode 6종 분산 | `01·02×2·03·04·05·06` — 6종 전부 생존 | PASS |
| date 2025~2026 | 2025:3 · 2026:4 (총 7건) | PASS |
| 배정 안 된 학생의 기록 0건 | 위반 0건 | PASS |
| 기록 교수 = 해당 학생의 배정 교수 | 7건 전건 일치 | PASS |

`advisorAssigns.seed.json`은 무변경 확인(스냅샷 16건 로스터 전건 일치 · 컴공 11/4 · 경영 5/3 · 2023~2026 · 졸업생 신예은 2023 배정 · 전건 active · by 2종 · studentId 유일).

## R-2. `getProfessorStats` 스코프 교차 — PASS (내 Low #5 반영)

`profCounselRecords.ts:52-55` — `adviseeIds`(담당 범위 active 배정 학생 id) 교집합 추가.

ui-spec §3 섹션1의 "해당 교수 기록 수"는 **화면 desc가 선언한 기준("{dept} · 배정 학생 {n}명 기준")** 안에서 읽어야 하고, SPEC §2(범위 판정=데이터층)와도 맞는다. 부수 효과로 **섹션1 상담 건수 = 섹션2 상담 횟수 합**이 구조적으로 보장된다:
- 컴공 cse-1 `4건` = 남시은1 + 김지원2 + 이도윤1 ✓
- 경영 biz-1 `2건` = 임주하1 + 오민재1 ✓

두 섹션이 서로 다른 수를 말하던 잠재 결함이 사라졌다. 표시값 정의 위반 없음.

## R-3. 배정년도 옵션 매 렌더 파생 — PASS (내 Low #6 반영)

`AssistantAdvisor.tsx:49-50` useMemo 제거. 실렌더 검증(asst_park): 배정년도 옵션 `전체·2026·2025·2024` → 장예강에게 **2027-01-05** 배정 확정 → 옵션이 즉시 `전체·2027·2026·2025·2024`로 갱신되고 행은 `김세환 / 2027.01.05`로 전환. 하드코딩 년도 없음.

## R-4. JSX 리포맷 — 라벨·문구·열 구성 **무변경** PASS

교정표 16항목을 실렌더로 재대조했고 전부 1차와 동일하다.

- 화면① 9열 헤더 `번호·학번·이름·소속·학년·학적·연락처·지도교수·배정일자` 그대로 · 소속 `경영대학 경영학과` · 미배정 `[교수 배정]`+`—` · 배정일자 `2026.03.03`
- 탭 `전체8 미배정3 배정5` · 필터 5종 · placeholder `이름·학번 검색` · 카운트 `검색 결과 6명` · 버튼 `[초기화][엑셀 다운로드]` 2개 · 체크박스/엑셀업로드/[검색] 버튼 부재
- 화면② 섹션1 5열 · 섹션2 9열 · 탭 `전체5 미상담3` · 독려 3상태 · 상담구분 코드→라벨(`진로`·`기타`)
- EmptyState 4종 문구 · desc 2종 · 보조문구 `미배정 3명은 배정 현황에서 관리합니다.` 동일
- 용어 오염·이미지 유출 재grep 0건(`회원`·`GAST`·`인공지능대학`·`총 N개`·`엑셀업로드`·`checkbox`·캡처 인명) · navConfig diff 0 · `tsc` exit 0

부수 반영 확인: **CSV 배정일자에 `formatDate` 적용**(내 Low #4) · **`admin-card-head` 래퍼로 h2 규약 복귀**(내 Nit #7) · 모달 폼이 `admin-select`→`admin-field`(둘 다 기존 클래스, 폼 필드로는 후자가 적합).

## R-5. 리포맷이 바꾼 것 — 배치 2건 (신규 지적)

라벨·문구·열은 그대로지만 **블록 배치가 ui-spec 레이아웃과 갈렸다.**

| # | 심각도 | 위치 | 기획 | 현재 | 판단 |
|---|---|---|---|---|---|
| R-5a | **Medium** | `AssistantAdvisorRecords.tsx:105-156` | §3 레이아웃: `admin-card ── 섹션2` **안에** `admin-tabs` → `admin-filterbar` → `admin-roster` | 탭·필터·`검색 결과 4명`이 **카드 밖으로 나와 "학생별 현황" 헤딩보다 위**에 온다 | **읽기 순서 역전.** 실렌더상 탭 `전체5 미상담3`이 바로 위 **"교수별 실적" 카드에 붙어 보여** 어느 표의 탭인지 오해할 수 있다. 헤딩이 자기 컨트롤보다 뒤에 나오는 구조는 되돌려야 한다 |
| R-5b | Low | `AssistantAdvisor.tsx:147-154` | §2 레이아웃: `admin-toolbar` 우측에 `[초기화][엑셀 다운로드]` | `admin-page-head` 안 `admin-head-actions`로 이동 | 기능·라벨·동작 동일하고 `admin-head-actions`는 JobList·ProgramList 등 **기존 7개 페이지 관행**이라 되돌릴 필요 없다. **ui-spec §2 레이아웃 문구를 현 구현에 맞춰 정정**할 것 |

**R-5a 수정 지시:** `admin-tabs`·`admin-filterbar`·`admin-toolbar` 블록을 두 번째 `<section className="admin-card">` **안으로**, `<div className="admin-card-head"><h2>학생별 현황</h2></div>` **바로 뒤**에 넣는다. 마크업 이동만이며 로직·라벨은 손대지 않는다.

## R-6. 데이터 4파일 헤더 주석 — PASS

DB 대응 기술이 CLAUDE.md·SPEC·ui-spec과 어긋나지 않는다.

| 파일 | 주석 기술 | 대조 |
|---|---|---|
| `data/advisorAssigns.ts` · `schema/advisorAssign.ts` | `CO_ADVISER(STU_NO + ADV_NO)` · 학생당 active 1건 유일성 = `SPEC §3-4-①` · append-only | CLAUDE.md 현행 테이블표(`CO_ADVISER`=지도교수 배정) 및 ui-spec §4-1과 일치 ✓ |
| `data/profCounselRecords.ts` · `schema/profCounselRecord.ts` | `CON_PROF_INFO` 대응 · `SY_CODE GRP 0131` 미러 · **"실코드가 확인되면 01~06 잠정값을 이 경계에서 치환"** · snapshot은 `EP_PRM_APP` 패턴 | CLAUDE.md 테이블표(교수상담=`CON_PROF_INFO`)·코드 규칙 4(코드+라벨 분리)·규칙 2(발생 시점 스냅샷)와 일치 ✓ |
| 공통 | localStorage 우선 → seed 폴백, 키 `dc_advisor_assign`·`dc_prof_counsel_records`·`dc_advisor_nudges` | CLAUDE.md 런타임 반영 방식(seed+오버레이) 및 ui-spec §4-8과 일치 ✓ |

1차에서 Note로 남겼던 **근거 주석 누락(SPEC §3-4-① · SY_CODE 0131 잠정코드)이 정확히 복원**됐다. 사실오류 없음.

## R-7. 아직 열려 있는 비블로킹 (리젝 사유 아님)

1차 §4의 미반영 항목만 남긴다 — 전부 팀장 판단 사항이다.

- **Low #1** `AssistantAdvisor.tsx:143-145` desc가 `{dept} · 담당 학과 학생 {n}명` (ui-spec §2는 `배정 {assigned}/{total}명`) → 문구를 맞추거나 스펙을 정정
- **Low #2** 배정 모달 `size="md"` (스펙 `sm`)
- **Low #3** 모달 `소속`이 `{student.major}`만 — 목록 열은 `collegeOf + major`
- **Nit #8** 모달 인라인 에러가 `admin-field-hint`(muted 12px) → 에러 가시성
- **Note #10** 상담 횟수를 `현재 배정 교수` 기준으로 집계 — 해제·재배정 도입 시 재검토
- **Note #11** `SPEC.md` §3-2②③ 갱신(확정 배정 · `dc_prof_counsel_records` 신설) — 팀장 액션
- **신규 R-5b** ui-spec §2 버튼줄 위치 문구 정정 — 팀장 액션

## 재검 대상 (다음 재호출 시)

- [ ] R-5a 화면② 섹션2 탭·필터·카운트를 `학생별 현황` 카드 안으로 이동 — 실렌더에서 헤딩이 탭보다 위에 오는지만 확인
