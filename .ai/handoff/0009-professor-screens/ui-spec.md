# professor-screens — UI 스펙 (역할: 교수)

> team-lead 1단계 산출물 (2026-07-31). **이 문서가 진실의 원천**이다. 직전 handoff `0008-assistant-advisor`의 후속 — 조교가 만든 배정(`dc_advisor_assign`)·기록(`dc_prof_counsel_records`) 단일소스를 교수 화면이 잇는다.
> 대상 (SPEC §3-5 · Progress §4):
> ① `/professor/advisees` 지도학생 목록 **재배선** (임시 구현 → `dc_advisor_assign` 기반)
> ② `/professor/counsel/requests` 상담 신청 접수 (P2)
> ③ `/professor/counsel/records` 상담 기록 (P1)
> ④ `/professor/schedule` 상담 제한일정 (P3)
> ⑤ `/professor/profile` 상담 노출 설정 (P4)

---

## 0. 팀장 결정 6건 (근거 포함 — 구현·리뷰 기준)

### 결정 1 — 교수 신원 통합 = **(a) 로그인 신원 id를 풀 id로 통일** (prof_lee → `cse-1` 박지훈, prof_jung → `biz-1` 김세환)

두 id 공간(백오피스 로그인 `prof_lee`/`prof_jung` vs 배정 풀 `cse-*`/`biz-*`)을 **풀 id 하나로 통일**한다. 실DB에서 이 둘은 같은 사람의 같은 `INTG_UID`(교번)다 — 한 사람에 id 2개를 두고 링크 필드로 잇는 (b)안은 CLAUDE.md "내부 surrogate 만들지 말 것" 위반이고, 풀에 로그인 교수를 추가하는 (c)안은 배정 seed 16건이 참조하지 않는 교수라 지도학생 0명으로 화면이 빈다.

**파급 전수 조사 결과 (실측 — grep `prof_lee|prof_jung` 전체 4곳뿐):**

| 참조 지점 | 실측 내용 | 조치 |
|---|---|---|
| `src_admin/data/professors/prof_lee.json` · `prof_jung.json` | id 자기 선언 | **파일 교체** → `cse-1.json` · `biz-1.json` (§7-1) |
| `src_admin/data/professors.ts` 8~9행 | JSON import 2건 | import 경로·변수명만 교체 |
| `src_admin/pages/Login.tsx` | `getStaffByRole('professor')` — id 리터럴 없음 | **무수정** (첫 교수 = cse-1로 자동) |
| `src_landing/Login.tsx` | `STAFF_USERS.find(u => u.empNo === id)` — 사번으로 조회, id 리터럴 없음 | **무수정** (empNo 70201·70202는 새 JSON에 계승) |
| `src_admin/data/staff.ts` / `session.ts` (`dc_active_staff`) | id 값 저장만, 리터럴 없음 | 무수정 |
| `advisorAssigns.seed.json` 16건 · `profCounselRecords.seed.json` 7건 | 전부 `cse-*`/`biz-*` 참조 | **무수정 — 통일 즉시 로그인 교수의 데이터가 된다** (cse-1: 지도학생 5·기록 4 / biz-1: 지도학생 2·기록 2) |
| `src_v2/data/professors.seed.json` (학생 화면 교수 목록) | `cse-1` 박지훈 등 | 무수정 |

- id 체계 문서화: 목업의 `id`(slug)는 `INTG_UID` 역할의 조인키, `empNo`는 정문 로그인용 사번 표시 필드 — 학생 로스터의 `id`(stu-089)/`studentNo`(20230089) 이원화와 동일 규약. DB 전환 시 둘 다 `INTG_UID`로 수렴.
- 알려진 데모 마이그레이션: 기존 브라우저의 `dc_active_staff`='prof_lee'는 `getActiveUser()` 폴백(첫 사용자=상담사)으로 빠진다 → 재로그인 1회로 해소. 코드 마이그레이션 불필요.
- 로그인 카드의 교수 이름이 이정민→**박지훈**, 정수현→**김세환**으로 바뀐다(의도된 것 — 배정 풀과 사람 통일). email 이니셜만 이름에 맞게 교정, empNo·officeHours는 기존 값 계승.
- 경영 로그인을 `biz-1` 김세환으로 정한 이유: biz-2(휴학생 포함 2명)·biz-3(1명·기록 0건)보다 데이터가 풍부(지도학생 2·기록 2)해 화면 시연이 성립.

### 결정 2 — 교수상담 신청 스토어 = **학생 owner 스토어(`dc_counsel_owners`)의 type `'교수'` 레인** (신규 키 만들지 않음)

SPEC §3-5의 "`dc_counsel_requests`(type=교수)" 표기는 낡았다 — 상담사 신청도 물리적으로는 `dc_counsel_owners`(학생 JSON append) 위의 투영이다(`counselRequests.ts` 헤더 주석 실측). 그리고 **`src_v2/data/students.ts:107`에 `CounselRequestType = '진로취업' | '심리' | '교수'`가 이미 선언**되어 있고, 상담사 투영은 `ADMIN_TYPES`로 `'교수'`를 의도적으로 제외한다("'교수'는 접수함 밖" 주석). 즉 신청 스토어는 신설이 아니라 **예비된 레인에 배선**이다.

- **0008 격리 결정과의 정합**: 그 결정의 본질은 "src_admin 상담사 도메인(`schema/counselRequest.ts`의 `CounselRequestType`, `dc_counsel_records`)을 오염시키지 말라"였다. 학생 측 type `'교수'`는 이미 존재하며 상담사 접수함·통계에 흘러들지 않는다(투영 필터). **상담사 측 `schema/counselRequest.ts`·`counselRequests.ts`·`counselRecords.ts`는 이번에도 무수정.**
- 교수 접수함은 **신규 투영 모듈 `src_admin/data/profCounselRequests.ts`**가 owner 스토어에서 type `'교수'` + `professorId`=본인만 투영한다(§7-4). 상태 전이(확정·취소·완료)는 기존 `patchCounselRequest`(students.ts) 재사용 — 재생성 금지.
- `StudentCounselRequest`에 **`professorId?: string` 필드 1개 추가**(additive — 기존 상담사 신청 레코드 무영향). `assignedCounselorId`(상담사 id 공간)를 교수 id로 오염시키지 않기 위한 별도 필드다.
- **현행 `CON_PROF_INFO`(신청+결과 한 행)와의 관계**: 우리는 신청(owner 스토어)과 기록(`dc_prof_counsel_records`)을 분리하고 **`ProfCounselRecord.requestId?`로 연결**한다(§7-3). 이관 매핑 = requestId join으로 한 행 복원, 신청 없는 직접 작성 기록(현행 P1·P6 오프라인 일괄등록 패턴)은 requestId 없는 행. 1:1이 아닌 변환이므로 이 규칙을 스키마 주석으로 남긴다(CLAUDE.md 이관 강제사항 4).
- **접수→확정→완료 시 기록이 쌓이는 곳**: 확정 건에서 [기록 작성] → 기록 화면 프리필 → 저장 시 `dc_prof_counsel_records`에 append **+ 신청 status '완료' patch** 동시 수행. 이로써 조교 "전담교수 상담 실적"(`getProfessorStats`)이 교수가 쓴 기록을 즉시 집계한다 — **이번 작업의 핵심 가치 연결.**

### 결정 3 — 학생 신청 화면 배선 = **포함 (최소 수정으로)**

- 근거: CLAUDE.md "이벤트 → JSON 반영 매핑이 이 프로젝트의 심장". 배선하지 않으면 교수 접수함은 seed 장식이고, "학생이 신청하면 교수 접수함에 뜸" 흐름이 성립하지 않는다. writer 패턴(`counselRequestsWrite.submitCounselRequest`)이 이미 있어 추가 비용이 작다.
- **src_v2 수정 범위를 다음으로 못박는다** (이 외 금지):
  1. `counselRequestsWrite.ts`에 `submitProfessorCounselRequest()` **함수 추가**(기존 함수 무수정, §7-6).
  2. `ProfessorCounsel.tsx` — ⓐ 온라인 폼 2필드(주제·내용)를 controlled로 전환(값 캡처용), ⓑ `handleConsentAgree` 온라인 분기에서 writer 호출 1줄, ⓒ `CounselReserveModal onSubmit={(purpose) => ...}`에서 writer 호출 1줄(모달이 `purpose`를 이미 넘긴다 — 실측), ⓓ 결정 6의 어댑터 교체 2줄(아래). **레이아웃·CSS·그리드 로직 무수정.**
  3. 주간 그리드의 `reservedSlots` 하드코딩은 **이번 범위 밖**(그리드 실데이터화는 후속 슬라이스 — 결정 4 참조).

### 결정 4 — 상담 제한일정 = **`dc_counselor_excluded` · 요일 반복 규칙 · 기존 availability 타입 재사용**

사용자 지시: **기본값 = 모든 시간대 가능, 불가 시간대를 등록** (상담사 `dc_availability` "가능 등록"과 반대 방향).

- **키 = `dc_counselor_excluded`** (SPEC §3-5 명기 준수). 레코드에 `ownerId`를 두어 교수 전용이 아닌 구조로 — 현행 오프라인 교수상담 슬롯이 상담사와 **같은 `BASICSETTING`**(`CONSULTANTID`)을 쓴다는 CLAUDE.md 경고 계승. 향후 상담사·관리자 제한도 같은 스토어에 담을 수 있다.
- **스키마 = 요일 반복 규칙** (`weekday × start~end`). `schema/availability.ts`의 `AvailabilitySlot`·`WeekdayKey`·`WEEKDAY_LABEL`·`WEEKDAY_ORDER`를 **type import로 재사용**(재생성 금지) — 의미(가능↔불가)만 반대고 형태는 동일하다. 근거: ① 교수의 주된 차단 요인 = 강의 시간표(요일 반복), ② 학생 예약 화면이 요일×시간 주간 그리드라 모델이 직접 매핑, ③ SettingsAvailability 화면 패턴 최대 재사용. 특정 날짜 차단(출장 등)은 후속 — 지금 date 필드를 예비하지 않는다(투기적 유연성 금지).
- **CLAUDE.md 미결 #2와의 관계**: 미결 #2는 "관리자 제한(`TB_CARR_CNSL_EXCL_HR` 대응)을 학생 화면에 반영할지"이고 현행은 미반영이다. 우리 스토어는 **교수 본인이 등록한 제한**이라 별개 사안이며, **학생 예약 화면 반영이 원칙**(그게 이 화면의 존재 이유)이다. 단 반영 시점은 학생 그리드 실데이터화(현재 `reservedSlots` 하드코딩) 슬라이스와 함께 — **이번 범위에서는 등록·조회 화면까지만.** 후속 규칙 명문화: 그리드 상태 = 기본 가능 ⊖ `dc_counselor_excluded` ⊖ 확정 예약.
- **이관 판단 (1줄 이상)**: 현행 `BASICSETTING`은 "가능 슬롯 전개"(57만 행), 우리는 "불가 규칙"이라 1:1 매핑 불가. 이관 규칙 = (운영시간 그리드 − 제한 규칙 전개) → `BASICSETTING` 행 생성, 또는 신규 제한 테이블 신설 후 화면만 우리 방식 유지. `ownerId`가 `CONSULTANTID` 대응이라는 것만 불변으로 문서화한다(스키마 주석).

### 결정 5 — 지도학생 목록 = **`dc_advisor_assign` 재배선, 공유 컴포넌트는 additive prop 1개만**

- `ProfessorAdvisees.tsx`의 "소속 학과 학생 대체" 임시 구현(파일 주석 명시)을 **본인 active 배정 학생**으로 교체한다. 0008 메모리의 "미연결 기회" 항목 그대로.
- 공유 `StudentRosterTable`(조교 학생현황·교수 공유)은 **깨지 않는다**: optional prop **`studentIds?: string[]`** 1개 추가 + 내부 3개 호출(`queryStudentRoster`·`getRosterFilterOptions`·`getRosterSummary`)에 전달. 미전달(undefined) 시 기존 동작과 완전 동일 → `AssistantStudents` 무회귀. 접근범위 판정은 **데이터층**(`studentRoster.ts`의 additive 파라미터, §7-7)에서 — 화면 filter 금지 규약 준수.
- ⚠ **`studentIds`가 주어지면 빈 배열도 "지도학생 0명" 스코프로 취급한다 — 전체 폴백 금지.** (`studentIds !== undefined` 판정. `.length` 판정 시 배정 0명 교수에게 전교생이 보이는 사고.)
- SPEC 소스 표기 `V_USR_INF.PROF_ID` + `dc_advisor_assign` 중 목업은 후자만 구현(학사 PROF_ID 미러 데이터 없음). DB 전환 시 두 소스 union은 로더 내부 일.

### 결정 6 — 상담 노출 설정 = **`dc_professor_profile` override 레이어 (기본 accept=true) + 학생 목록 즉시 반영**

- 스키마(§7-5): `accept`(상담 신청 수락 여부) · `officeHours`(오피스아워 요약) · `intro`(소개) — SPEC §3-5가 명기한 3가지만. 온·오프라인별 토글, 상담 유형 세분화는 넣지 않는다(요청 밖 유연성 금지). 현행 `CO_PROF`·`PC_CON_PROF_*` 전부 0행이라 계승 구조 없음 → 자유 신설이되 최소로.
- 저장 = `counselors.ts`의 `dc_counselor_overrides` 패턴 미러: `dc_professor_profile` = `Record<professorId, Partial<...>>` override, 기본값은 로더가 파생(**accept=true — "기본 전부 노출"이 사용자 지시의 제한일정 철학과 정합**, officeHours는 로그인 신원 JSON 값 폴백, intro '').
- **학생 예약 화면 반영 (이번 범위 포함)**: `accept=false`인 교수는 학생 교수상담 신청 화면의 교수 목록에서 **제외**된다. 배선 = 신규 어댑터 `src_v2/data/professorProfilesRead.ts`(counselorsRead.ts와 동일한 cross-SPA 임시 비계)가 `PROFESSOR_GROUPS`에서 accept=false 교수를 제거하고 **빈 학과·빈 단대를 드랍**한 같은 형태(`DepartmentGroup[]`)를 반환 → `ProfessorCounsel.tsx`는 상수 참조만 어댑터 결과로 교체(2줄). `findDefaultSelection`에 optional groups 파라미터 추가(additive).
- 이미 접수된 신청은 accept를 꺼도 접수함에 남는다(처리 가능) — 차단은 신규 신청 진입만.
- intro·officeHours의 학생 화면 표시(교수 패널)는 후속 — 이번엔 노출 설정 화면 내 미리보기까지만.

---

## 1. 라우트 / 진입 (공통)

| 항목 | 값 |
|---|---|
| 라우트 | `/professor/counsel/requests` · `/professor/counsel/records` · `/professor/schedule` · `/professor/profile` — React Router, basename `/admin` |
| App.tsx | 117~127행 교수 블록의 `NotReady` 4개를 신규 페이지로 **element만 교체** + import 4건. `/professor/advisees`는 element 유지(페이지 파일 내부만 재배선) |
| 네비 | `navConfig.ts` `prof-advisees`·`prof-counsel`·`prof-setup` 섹션 **이미 존재 — 변경 금지** |
| 가드 | 기존 `RequireRole roles={['professor']}` 그대로 |
| 활성 사용자 | `getActiveUser()` — 결정 1로 `user.id`가 곧 풀 교수 id(`cse-1` 등). **모든 로더에 `professorId` 파라미터로 전달, 범위 판정은 데이터층** (SPEC §2. 화면 filter 금지) |

---

## 2. 화면 ① 지도학생 목록 (`/professor/advisees` — 재배선)

### 목적
본인에게 active 배정된 지도학생만 조회한다 (읽기 전용 — 기존과 동일).

### 변경 (ProfessorAdvisees.tsx 전체 재작성 허용 — 17줄 얇은 래퍼)

```tsx
const user = getActiveUser()
const adviseeIds = getAdviseeStudentIds(user.id)   // advisorAssigns.ts 신규 헬퍼 (§7-2)
return <StudentRosterTable
  departments={[]}                                  // 스코프는 전적으로 studentIds
  studentIds={adviseeIds}
  title="지도학생 목록"
  subtitle={`${user.name} · 내 지도학생`}           // 총원은 컴포넌트가 getRosterSummary로 표시
  viewerRole="professor"
/>
```

- 열·필터·페이징·'보기' 모달(StudentDetailView xl) 전부 기존 그대로 — **열 추가 없음.**
- 배정 0명이면 기존 EmptyState가 그대로 뜬다(추가 분기 없음).
- 검증: cse-1 로그인 → 5명(stu-089·091·101·102·103), biz-1 로그인 → 2명(stu-010·012). 조교 학생현황(`AssistantStudents`)은 studentIds 미전달로 무회귀.

---

## 3. 화면 ② 상담 신청 접수 (`/professor/counsel/requests`)

### 목적
학생이 신청한 교수상담(type '교수', 본인 지정분)을 접수하고 일정을 확정·취소한다.

### 레이아웃 (조교 화면과 같은 admin-* 어휘 — 상담사 `counsel-*` 페이지 전용 CSS 미사용)

```
admin-page
├ admin-page-head        제목 "상담 신청 접수" · desc "{user.name} · 나에게 신청된 교수상담"
├ admin-tabs             [전체 n] [대기 n] [확정 n] [완료 n] [취소 n]   ← getProfReqTabCounts(professorId), 필터 무시 전체 기준
├ admin-filterbar        검색(이름·학번, 라이브) · 방식 select(전체/대면/비대면)
├ admin-toolbar          좌: "검색 결과 {n}건"(+로딩 스피너) · 우: [초기화](admin-btn-ghost)
└ admin-card
   ├ admin-roster admin-profreq-roster (8열, 10개 페이징)
   └ admin-pagination
```

### 표 — 8열 (`admin-profreq-roster` modifier)

| # | 열 | 출처 | 렌더 |
|---|---|---|---|
| 1 | 번호 | 순번 | |
| 2 | 학생 | `studentName`+`studentNo`+`studentMajor` | `<strong>이름</strong>` + small 학번·학과. 지도학생이면 `admin-tag admin-tag-soft` "지도" 배지(`isAdvisee`) |
| 3 | 학적 | `enrollmentStatus` | `enrollStatusClass()` 배지 (SPEC §2 학적 표기) |
| 4 | 방식 | `method` | `admin-tag` 대면/비대면 |
| 5 | 주제 | `topic` | 말줄임(§10 ellipsis) |
| 6 | 신청/일정 | `requestedAt`·`slot` | 위: `formatRelativeTime(requestedAt)` 신청 · 아래: slot 있으면 `MM.DD HH:mm–HH:mm`, 없으면 "일정 미정" |
| 7 | 상태 | `status` | 기존 `counsel-status-badge is-*` 클래스 재사용 (index.css 기존 토큰) |
| 8 | 관리 | 상태별 ↓ | |

**관리 열 상태별 렌더 (이 화면의 심장):**
- **대기** → `[접수·일정]`(admin-btn-primary sm, 확정 모달) · `[거절]`(admin-btn-ghost sm, `cancelProfRequest` 후 refetch)
- **확정** → `[일정 변경]`(admin-btn-ghost sm, 같은 모달) · `[기록 작성]`(admin-btn-primary sm → `/professor/counsel/records?requestId={id}` 이동)
- **완료** → 텍스트 "기록 완료" (`admin-advisor-name` 강조) — 기록 화면에서 확인
- **취소** → `—`

### 확정 모달 (AdminModal size="md" — sm 없음)
- 제목 "상담 일정 확정" · 학생 요약(`admin-kv`: 이름·학번·학과·방식·주제)
- 폼: 날짜(date, 기본 = 신청 slot 날짜 ?? 오늘) · 시작/종료(time, 신청 slot 프리필) · 장소/링크(text, 비대면이면 placeholder "화상 링크")
- 유효성: `start < end`. 액션: [취소](ghost) · [확정](primary) → `confirmProfRequest(id, slot)` → 모달 닫고 refetch (toast 인프라 없음 — 행 상태 전환이 피드백)

### 정렬·빈·로딩·페이징
- 정렬(고정): 대기 우선 → `requestedAt` desc. PAGE_SIZE=10, `useListData`, `admin-loading`+`LuLoaderCircle`.
- 빈: `EmptyState message="접수된 교수상담 신청이 없습니다."`

---

## 4. 화면 ③ 상담 기록 (`/professor/counsel/records`)

### 목적
상담 결과를 입력(append)하고 내 기록을 조회한다. **저장된 기록은 반드시 `dc_prof_counsel_records`로 들어간다** — 조교 `/assistant/advisor/records`(`getProfessorStats`·`queryAdviseeCounselStatus`)가 그대로 집계한다. 이 연결이 이번 handoff의 핵심 가치.

> ⚠️ 정정(2026-07-31 리뷰 실측) — 조교 실적 집계는 **조교 담당 학과에 배정된 지도학생의 기록만** 잡는다(0008에서 확정한 스코프 규칙). 교수가 타과생(신청 owner)에게 쓴 기록은 `dc_prof_counsel_records`에는 남지만 조교 화면 집계에는 나타나지 않는다 — 결함이 아니라 접근범위 설계다.

### 레이아웃

```
admin-page
├ admin-page-head        제목 "상담 기록" · desc "{user.name} · 상담 결과를 기록하면 조교 실적 집계에 반영됩니다"
├ admin-card ── 섹션 1: 기록 작성 (admin-form-grid)
│   ├ 학생 select · 상담구분 select · 상담일 date · 상담 내용 textarea
│   └ admin-form-actions [저장]
└ admin-card ── 섹션 2: 내 상담 기록
    ├ admin-filterbar    검색(이름·학번) · 상담구분 select(전체+6종)
    └ admin-roster admin-profrec-roster (7열, 10개 페이징) + admin-pagination
```

### 섹션 1 — 기록 작성 폼

| 필드 | 소스·규칙 |
|---|---|
| 학생 | select — **지도학생만**(`getAdviseeStudentIds(professorId)` → 로스터 join, "이름 (학번)" 표기). 지도학생 0명이면 EmptyState("배정된 지도학생이 없습니다") + 폼 비활성 |
| 상담구분 | select — `PROF_COUNSEL_CATEGORIES` 6종(코드+라벨, 기존 스키마 그대로. 리터럴 금지) |
| 상담일 | date, 기본 오늘. 저장 `YYYY-MM-DD` |
| 상담 내용 | textarea — 기존 `ProfCounselRecord.summary` 필드("교수 화면 §3-5용 예비" 주석 실측 — 예비된 자리에 배선) |

- 저장 → `addProfCounselRecord()`(§7-3) append → 폼 리셋 + 목록 refetch.
- **신청 연계 모드**: `?requestId={id}` 쿼리 파라미터(useSearchParams)로 진입 시 — 해당 신청을 조회해 학생을 고정 표시(select 대신 읽기 전용 `admin-kv` — **지도학생이 아닌 신청자도 기록 가능**, 현행도 타과 신청 허용), 안내 문구 "저장 시 해당 상담 신청이 완료 처리됩니다". 저장 시 `addProfCounselRecord({..., requestId})` + `completeProfRequest(requestId)` 동시 수행. 잘못된 requestId면 일반 모드로 폴백.

### 섹션 2 — 내 상담 기록 (7열, `queryProfRecords(professorId)`)

| # | 열 | 출처 | 렌더 |
|---|---|---|---|
| 1 | 번호 | 순번 | |
| 2 | 상담일 | `date` | `YYYY.MM.DD` |
| 3 | 학생 | `snapshot.name`+`snapshot.studentNo` | 스냅샷 기준(이력 화면 — SPEC §4-4-6 스냅샷 표기) |
| 4 | 학과·학년 | `snapshot.major`·`snapshot.grade` | |
| 5 | 상담구분 | `categoryCode` | `PROF_COUNSEL_CATEGORIES` 맵으로 라벨 렌더 |
| 6 | 내용 | `summary` | 말줄임. 없으면 `—` (기존 seed 7건은 summary 없음 — 폴백 필수) |
| 7 | 연계 | `requestId` | 있으면 `admin-tag admin-tag-soft` "신청 연계" · 없으면 `—` |

- 정렬(고정): `date` desc → `createdAt` desc. 빈: "작성한 상담 기록이 없습니다. 위에서 첫 기록을 작성하세요."
- **기록 수정·삭제 UI 없음** — append-only(0008 결정 계승).

---

## 5. 화면 ④ 상담 제한일정 (`/professor/schedule`)

### 목적
상담이 **불가능한** 요일·시간대를 등록한다. **기본값 = 모든 시간대 가능** (사용자 명시 지시 — 상담사 "가능 시간대 등록"과 반대 방향).

### 레이아웃 — `SettingsAvailability.tsx` 구조 미러 (같은 클래스: admin-avail-add·admin-avail-list·admin-avail-slot-tag)

```
admin-page
├ admin-page-head   제목 "상담 제한일정" · desc "{user.name} · 기본은 모든 시간대 상담 가능입니다. 상담이 불가능한 요일·시간대만 등록하세요."
├ admin-card ── "제한 시간대 추가": 요일 select(WEEKDAY_ORDER·WEEKDAY_LABEL) · 시작 time · 종료 time · [추가]
│               유효성 start<end (기존 힌트 문구 재사용)
└ admin-card ── "등록된 제한 시간대" + 개수 태그
                요일별 그룹 목록, 슬롯 태그 `{start}–{end}` + 삭제(X)
                빈 상태: EmptyState icon={LuClock}
                  message="등록된 제한 시간대가 없습니다. 현재 모든 시간대에 상담 신청을 받을 수 있습니다."
```

- 읽기/쓰기 = `excludedHours.ts`(§7-8): `getExcludedHours(user.id)` · `addExcludedSlot` · `removeExcludedSlot`. 저장 후 reload(기존 화면 동작 미러).
- 빈 상태 문구가 "기본 전부 가능" 의미를 화면에 명시한다 — 이 문구가 모델의 방향(제한 등록)을 사용자에게 각인.
- 학생 예약 그리드 반영은 후속(결정 4) — 이 화면은 등록·조회까지.

---

## 6. 화면 ⑤ 상담 노출 설정 (`/professor/profile`)

### 목적
상담 신청을 받을지 여부·오피스아워·소개를 설정한다. `accept=false`면 학생 교수상담 신청 화면의 교수 목록에서 즉시 제외된다(결정 6).

### 레이아웃 — `SettingsProfile.tsx` 구조 미러 (admin-profile-card·admin-form-grid·admin-field)

```
admin-page
├ admin-page-head   제목 "상담 노출 설정" · desc "{user.name} · 학생 교수상담 신청 화면 노출을 설정합니다"
└ admin-card admin-profile-card
   ├ admin-profile-hero   이름 + 태그(roleLabel · dept)
   ├ admin-form-grid
   │   ├ 상담 신청 수락    select: "신청 받음" / "받지 않음"  (admin-select — 신규 토글 CSS 만들지 않음)
   │   │                  hint: "받지 않음으로 저장하면 학생 신청 화면 교수 목록에서 제외됩니다. 이미 접수된 신청은 유지됩니다."
   │   ├ 오피스아워        text (placeholder "예: 화·목 15:00~17:00")
   │   └ 소개 (full)      textarea (placeholder "학생에게 보여줄 상담 소개를 입력하세요")
   └ admin-form-actions   [저장] — dirty일 때만 활성 (SettingsProfile 패턴)
```

- 읽기 = `getProfessorCounselProfile(user.id)`(기본 accept=true·officeHours=신원 JSON 값·intro ''), 저장 = `updateProfessorCounselProfile(user.id, patch)` → override merge + reload (`updateCounselorProfile` 패턴 미러).
- 검증 시나리오: cse-1에서 "받지 않음" 저장 → 학생 `/v2` 교수상담 신청 화면 컴퓨터공학과 목록에 박지훈 없음(강민재·신유라만). 다시 "받음" → 복귀. 컴공 3명 전원 off → 학과 자체가 목록에서 드랍(어댑터의 빈 학과 제거)되고 화면은 crash 없이 다른 학과로 폴백(기존 `?? PROFESSOR_GROUPS[0]` 폴백 로직 그대로 동작).

---

## 7. 데이터 계약 (신규·수정 파일 전체)

> 모든 로더는 기존 패턴 미러: **읽기 = localStorage ?? seed/기본값 폴백, 쓰기 = 전체 persist 또는 override merge.** 원본 seed 불변. `queryX`는 `async + Paginated` 봉투(query.ts) + `mockLatency()`. 접근범위 파라미터는 로더가 받는다.

### 7-1. `src_admin/data/professors/cse-1.json` · `biz-1.json` (신규 — 기존 prof_lee.json·prof_jung.json **삭제**)

```json
{ "id": "cse-1", "empNo": "70201", "name": "박지훈", "role": "professor", "roleLabel": "교수",
  "dept": "컴퓨터공학과", "collegeName": "공과대학", "email": "park.jh@changwon.ac.kr", "officeHours": "화·목 15:00~17:00" }
```
```json
{ "id": "biz-1", "empNo": "70202", "name": "김세환", "role": "professor", "roleLabel": "교수",
  "dept": "경영학과", "collegeName": "경영대학", "email": "kim.sh@changwon.ac.kr", "officeHours": "월·수 10:00~12:00" }
```
- `professors.ts`(admin)는 import 2줄만 교체. 주석에 "id = 배정 풀(src_v2 professors.seed.json)과 동일 공간 — 한 사람 한 id(INTG_UID 규약)" 명시.

### 7-2. `src_admin/data/advisorAssigns.ts` — 헬퍼 1개 추가 (기존 함수 무수정)

```ts
/** 이 교수에게 active 배정된 학생 id 목록 (지도학생 스코프의 단일 원천) */
export function getAdviseeStudentIds(professorId: string): string[]
// getAdvisorAssigns().filter(a => a.status==='active' && a.professorId===professorId).map(a => a.studentId)
```

### 7-3. `src_admin/data/schema/profCounselRecord.ts` + `profCounselRecords.ts` — additive 확장

```ts
// schema: ProfCounselRecord에 1필드 추가 (기존 seed 7건 무영향 — optional)
/** 연계된 학생 신청 id (owner 스토어 StudentCounselRequest.id). 직접 작성 기록은 없음.
 *  이관 매핑: 현행 CON_PROF_INFO는 신청+결과 한 행 — requestId join으로 한 행 복원, 없으면 결과 단독 행. */
requestId?: string
```

```ts
// 로더 추가 (기존 getProfessorStats·queryAdviseeCounselStatus·sendNudge 등 무수정)

/** 기록 작성 — append + 전체 persist. professorName은 풀에서, snapshot은 로스터(studentLiteOf)에서 로더가 해석.
 *  로스터 밖 학생(신청 연계의 데모 owner)은 snapshot 인자 필수 — 미해석·미제공 시 throw. */
export function addProfCounselRecord(input: {
  studentId: string; professorId: string; categoryCode: ProfCounselCategoryCode
  date: string; summary: string; requestId?: string
  snapshot?: { studentNo: string; name: string; major: string; grade: number }
}): ProfCounselRecord

/** [DB-ready] 내 기록 목록 — professorId 스코프는 데이터층. filters: { categoryCode? } · q: 스냅샷 이름+학번 */
export async function queryProfRecords(
  params: ListParams & { professorId: string },
): Promise<Paginated<ProfCounselRecord>>
// 정렬: date desc → createdAt desc
```

### 7-4. `src_admin/data/profCounselRequests.ts` (신규 — 교수 접수함 투영 로더)

```ts
// ─ 교수상담 신청 투영 — 원천 = 학생 owner 스토어(src_v2 students.ts, dc_counsel_owners)의 type '교수' 레인.
// 상담사 투영(counselRequests.ts)과 파일 분리 — CounselRequestType(진로취업|심리) 도메인 불오염(0008 결정).
// 상태 전이는 patchCounselRequest 재사용(재생성 금지). cross-SPA import는 counselRequests.ts와 동일한 임시 비계.
import { getCounselOwners, patchCounselRequest } from '../../src_v2/data/students'
import { getActiveAssignByStudent } from './advisorAssigns'

export interface ProfCounselRequestRow {
  id: string
  studentId: string; studentNo: string; studentName: string; studentMajor: string; studentGrade: number
  enrollmentStatus: EnrollmentStatus            // 학적 배지 (owner 투영)
  method: CounselMethod; topic: string; requestedAt: string
  status: CounselRequestStatus; slot?: CounselSlot
  /** 나의 active 지도학생 여부 (dc_advisor_assign 파생 — '지도' 배지) */
  isAdvisee: boolean
}
export type ProfReqTab = '전체' | CounselRequestStatus

/** [DB-ready] 내 접수함 — owner 스토어에서 type '교수' && professorId 일치만 투영.
 *  filters: { method? } · q: 이름+학번 · 정렬: 대기 우선 → requestedAt desc */
export async function queryProfCounselRequests(
  params: ListParams & { professorId: string; tab?: ProfReqTab },
): Promise<Paginated<ProfCounselRequestRow>>

/** 탭 카운트 — 본인 전체 기준(필터 무시) */
export function getProfReqTabCounts(professorId: string): Record<ProfReqTab, number>

/** id로 1건 (기록 화면 ?requestId 연계용) */
export function getProfRequestById(id: string): ProfCounselRequestRow | undefined

// 상태 전이 — 전부 patchCounselRequest 위임 (owner override 스토어 dc_counsel_owners에 반영)
export function confirmProfRequest(id: string, slot: CounselSlot): void   // '확정' + slot
export function cancelProfRequest(id: string): void                        // '취소'
export function completeProfRequest(id: string): void                      // '완료' + completedAt
```

### 7-5. `src_admin/data/schema/professorProfile.ts` + `professorProfiles.ts` (신규 — 상담 노출 설정)

```ts
// schema — 현행 CO_PROF·PC_CON_PROF_* 전부 0행(계승 구조 없음)이라 신설. SPEC §3-5 3필드만.
export interface ProfessorCounselProfile {
  professorId: string        // 풀 id (= 로그인 신원 id, 결정 1)
  /** 상담 신청 수락 여부 — false면 학생 신청 화면 교수 목록에서 제외. 기본 true(기본 전부 노출) */
  accept: boolean
  officeHours: string
  intro: string
  updatedAt?: string
}
```

```ts
// 로더 — counselors.ts override 패턴 미러. 키 = dc_professor_profile (Record<professorId, Partial<...>>)
const STORAGE_KEY = 'dc_professor_profile'

/** 기본값 파생 + override 병합. 기본: accept=true · officeHours=로그인 신원 JSON 값 ?? '' · intro '' */
export function getProfessorCounselProfile(professorId: string): ProfessorCounselProfile

/** override merge 저장 후 reload (updateCounselorProfile 패턴) */
export function updateProfessorCounselProfile(professorId: string, patch: Partial<ProfessorCounselProfile>): void

/** 전 교수 accept 판정 맵 — 미설정 교수는 true. 학생 어댑터(professorProfilesRead)가 구독 */
export function getAcceptMap(): Record<string, boolean>
```

### 7-6. `src_v2` 데이터층 — 신청 배선 (결정 2·3)

```ts
// students.ts — StudentCounselRequest에 1필드 추가 (additive)
/** type '교수'일 때 신청 대상 교수 id (professors.seed.json Professor.id — 현행 CON_PROF_INFO의 교수 식별).
 *  assignedCounselorId(상담사 id 공간)와 분리 — id 공간 오염 금지. */
professorId?: string
```

```ts
// counselRequestsWrite.ts — 함수 추가 (기존 submitCounselRequest 무수정)
export interface SubmitProfCounselInput {
  professorId: string                 // 학생이 고른 교수 (풀 id)
  topic: string                       // 온라인=상담내용 입력값 / 오프라인=CounselReserveModal purpose
  method: CounselMethod               // 온라인 신청 → '비대면', 오프라인 예약 → '대면'
  slotDate?: string; time?: string    // 오프라인만 — 희망 슬롯 (Day.iso + HH:mm, 확정은 교수가)
  place?: string                      // 오프라인 — 교수 연구실(room)
}
/** 활성 학생 레코드에 type '교수' 신청 append (addCounselRequest 재사용). 상담사 접수함에는 안 뜬다(투영 필터). */
export function submitProfessorCounselRequest(input: SubmitProfCounselInput): void
// id 'preq_' + Date.now() · status '대기' · slot = slotDate ? {date, start:time, end:+1h(oneHourLater 재사용), place} : undefined
```

### 7-7. `src_admin/data/studentRoster.ts` + `components/StudentRosterTable.tsx` — additive 스코프 (결정 5)

```ts
// studentRoster.ts — 세 함수에 optional studentIds. undefined면 기존 동작과 완전 동일.
// ⚠ studentIds가 배열이면(빈 배열 포함) id 집합으로 제한 — length 판정 금지.
export async function queryStudentRoster(params: ListParams & { departments?: string[]; studentIds?: string[] }): Promise<Paginated<RosterStudent>>
export function getRosterFilterOptions(departments?: string[], studentIds?: string[])
export function getRosterSummary(departments?: string[], studentIds?: string[])
```
```tsx
// StudentRosterTable.tsx — props에 studentIds?: string[] 추가, 내부 3개 호출에 전달 + useMemo 의존키에 포함.
// 그 외(열·필터·모달·페이징) 무수정. AssistantStudents는 미전달 → 무회귀.
```

### 7-8. `src_admin/data/schema/excludedHours.ts` + `excludedHours.ts` + `excludedHours.seed.json` (신규 — 결정 4)

```ts
// schema — 슬롯 형태는 availability 스키마 재사용(재생성 금지). 의미만 반대(불가 등록).
import type { AvailabilitySlot } from './availability'
/** 한 사람의 상담 제한(불가) 시간대. ownerId = 현행 BASICSETTING.CONSULTANTID 대응(교수·상담사 공용 구조).
 *  기본값 = 슬롯 없음 = 모든 시간대 가능. 이관 시 (운영 그리드 − 제한 전개) → BASICSETTING 가능 슬롯 변환 규칙 문서화 필수. */
export interface ExcludedConfig { ownerId: string; slots: AvailabilitySlot[] }
```

```ts
// 로더 — availability.ts 완전 미러 (getAvailability/addSlot/removeSlot 대응)
const STORAGE_KEY = 'dc_counselor_excluded'   // SPEC §3-5 명기 키
export function getExcludedHours(ownerId: string): AvailabilitySlot[]      // LS ?? seed, weekday·start 정렬
export function addExcludedSlot(ownerId: string, weekday: WeekdayKey, start: string, end: string): string  // id 'ex_' prefix
export function removeExcludedSlot(ownerId: string, slotId: string): void
```

```json
// seed — 시연용 (강의·회의 시간 컨셉). 값 그대로 사용.
[
  { "ownerId": "cse-1", "slots": [
    { "id": "ex_cse1_01", "weekday": 1, "start": "09:00", "end": "12:00" },
    { "id": "ex_cse1_02", "weekday": 4, "start": "14:00", "end": "16:00" } ] },
  { "ownerId": "biz-1", "slots": [
    { "id": "ex_biz1_01", "weekday": 3, "start": "10:00", "end": "12:00" } ] }
]
```

### 7-9. `src_v2/data/professorProfilesRead.ts` (신규 — 학생 측 노출 어댑터, 결정 6)

```ts
// counselorsRead.ts와 동일한 cross-SPA 임시 비계 (src_v2 → src_admin import, DB 전환 시 제거)
import { getAcceptMap } from '../../src_admin/data/professorProfiles'
import { PROFESSOR_GROUPS } from './professors'
import type { DepartmentGroup } from './professors'
/** accept=false 교수 제거 + 빈 학과·빈 단대 드랍한 노출용 트리 (형태 동일 — 화면 로직 무변경 교체) */
export function getCounselableProfessorGroups(): DepartmentGroup[]
```
- `professors.ts`의 `findDefaultSelection(major, groups = PROFESSOR_GROUPS)` — optional 파라미터 additive.
- `ProfessorCounsel.tsx` — 모듈 스코프의 `PROFESSOR_GROUPS` 참조를 `getCounselableProfessorGroups()` 결과 상수로 교체(기존 "모듈 스코프 1회 평가" 패턴 유지), `findDefaultSelection` 호출에 그 상수 전달.

### 7-10. 학생 seed — 교수상담 신청 4건 append (결정 3 시연 데이터)

**기존 항목 불변, `counselRequests` 배열 끝에 append만.** 값은 아래 그대로(임의 창작 금지). 지도 관계(stu-089류)와 무관하게 어느 교수에게나 신청 가능함을 반영.

| 파일 | append 레코드 |
|---|---|
| `src_v2/data/students/chaewon.json` | `{ "id":"preq_cw_01", "type":"교수", "professorId":"cse-1", "status":"대기", "method":"비대면", "topic":"전공 심화 과목 선택과 대학원 진학 상담을 요청드립니다.", "requestedAt":"2026-07-30T10:20:00.000Z" }` |
| `src_v2/data/students/counselSeedStudents.json` — major가 "컴퓨터공학과…"인 데모 학생 1명 | `{ "id":"preq_cse_01", "type":"교수", "professorId":"cse-1", "status":"대기", "method":"대면", "topic":"졸업작품 주제 상담", "requestedAt":"2026-07-29T14:00:00.000Z", "slot":{ "date":"2026-08-04", "start":"15:00", "end":"16:00", "place":"공학관 706호" } }` |
| `src_v2/data/students/counselSeedStudents.json` — major가 "미디어커뮤니케이션학과…"인 데모 학생 | `{ "id":"preq_med_01", "type":"교수", "professorId":"cse-1", "status":"확정", "method":"대면", "topic":"복수전공(컴퓨터공학) 진로 상담", "requestedAt":"2026-07-27T09:30:00.000Z", "slot":{ "date":"2026-08-03", "start":"16:00", "end":"17:00", "place":"공학관 706호" } }` — 타과생 신청 + 확정 상태 + [기록 작성] 버튼 시연 |
| `src_v2/data/students/changwon.json` | `{ "id":"preq_cw_02", "type":"교수", "professorId":"biz-1", "status":"대기", "method":"대면", "topic":"하반기 인턴십 지원 전략 상담", "requestedAt":"2026-07-30T16:40:00.000Z", "slot":{ "date":"2026-08-05", "start":"10:00", "end":"11:00", "place":"경영관 302호" } }` |

- 결과 분포: cse-1 접수함 = 대기 2 · 확정 1(기록 작성 플로우 시연), biz-1 = 대기 1. 완료·취소는 시연 중 전이로 생성.

---

## 8. 기존 파일 수정 허용 범위 (이것 외 금지 — 0008 §4-7 형식)

| 파일 | 변경 | 성격 |
|---|---|---|
| `src_admin/data/professors/prof_lee.json`·`prof_jung.json` | **삭제** → `cse-1.json`·`biz-1.json` 신설 (§7-1 값 그대로) | 결정 1 신원 통일 |
| `src_admin/data/professors.ts` | import 2줄·배열 요소명만 교체 + 주석 1줄 | 결정 1 |
| `src_admin/App.tsx` | 교수 블록 `NotReady` 4개 → 신규 페이지 element 교체 + import 4건 | 라우팅 배선 |
| `src_admin/pages/ProfessorAdvisees.tsx` | §2대로 재작성 (임시 구현 교체 — 파일 주석이 예고한 일) | 결정 5 |
| `src_admin/components/StudentRosterTable.tsx` | optional prop `studentIds` 추가 + 3개 호출 전달 (additive) | 결정 5 |
| `src_admin/data/studentRoster.ts` | 3개 함수 optional `studentIds` 파라미터 (additive) | 결정 5 |
| `src_admin/data/advisorAssigns.ts` | `getAdviseeStudentIds` 1함수 추가 | 결정 5 |
| `src_admin/data/schema/profCounselRecord.ts` | `requestId?` 1필드 + 이관 주석 | 결정 2 |
| `src_admin/data/profCounselRecords.ts` | `addProfCounselRecord`·`queryProfRecords` 추가 (기존 함수 무수정) | 화면 ③ |
| `src_admin/index.css` | §10 modifier 클래스만 추가 | 스타일 |
| `src_v2/data/students.ts` | `StudentCounselRequest.professorId?` 1필드 (additive) | 결정 2 |
| `src_v2/data/counselRequestsWrite.ts` | `submitProfessorCounselRequest` 추가 (기존 함수 무수정) | 결정 3 |
| `src_v2/data/professors.ts` | `findDefaultSelection` optional `groups` 파라미터 (additive) | 결정 6 |
| `src_v2/pages/counsel/ProfessorCounsel.tsx` | 결정 3-ⓐⓑⓒ + 결정 6 어댑터 교체 — **레이아웃·CSS·그리드 무수정** | 결정 3·6 |
| `src_v2/data/students/chaewon.json`·`changwon.json`·`counselSeedStudents.json` | §7-10 seed append (기존 항목 불변) | 시연 데이터 |

**명시적 무수정 확인 대상**: `Login.tsx`(양쪽) · `staff.ts` · `session.ts` · `navConfig.ts` · `counselRequests.ts` · `schema/counselRequest.ts` · `counselRecords.ts` · `availability.ts` · `SettingsAvailability.tsx` · `SettingsProfile.tsx` · `advisorAssigns.seed.json` · `profCounselRecords.seed.json` · 조교 페이지 전부.

---

## 9. 이벤트 → JSON 매핑 (이 handoff가 추가·배선하는 것)

| 이벤트 | 추가/수정 대상 (단일소스) | 런타임 키 | 방식 |
|---|---|---|---|
| 학생이 교수상담 신청 (온라인/오프라인) | 학생 JSON `counselRequests` (type '교수') | `dc_counsel_owners` | append (`submitProfessorCounselRequest`) |
| 교수가 신청 접수·일정 확정 | 같은 신청 레코드 | `dc_counsel_owners` | patch ('확정'+slot) |
| 교수가 신청 거절 | 같은 신청 레코드 | `dc_counsel_owners` | patch ('취소') |
| 교수가 상담 기록 작성 | 교수상담 기록 (+연계 신청 '완료') | `dc_prof_counsel_records` (+`dc_counsel_owners`) | append (+patch) → **조교 실적 화면이 즉시 집계** |
| 교수가 제한 시간대 등록/삭제 | 제한 슬롯 (설정 데이터) | `dc_counselor_excluded` | add/remove |
| 교수가 노출 설정 저장 | 프로필 override | `dc_professor_profile` | merge |

---

## 10. 디자인 레이어

- base: `DESIGN.md` · 역할 레이어: `src_admin/index.css`(교직원 토큰). **새 팔레트·폰트·색상값 생성 금지.**
- 쓸 기존 클래스: `admin-page/admin-page-head` · `admin-tabs/admin-tab/admin-tab-count` · `admin-filterbar/admin-search/admin-select` · `admin-toolbar/admin-toolbar-count` · `admin-card/admin-card-head` · `admin-roster*` · `admin-btn(-primary/-ghost/.sm)` · `admin-tag(-soft)` · `admin-enroll*`(`enrollStatusClass`) · `counsel-status-badge is-*`(상태 배지 — 기존 정의 재사용) · `admin-kv` · `admin-field/admin-form-grid/admin-form-actions/admin-form-hint` · `admin-profile-card/admin-profile-hero` · `admin-avail-add/admin-avail-list*/admin-avail-slot-tag` · `admin-pagination*` · `admin-loading/admin-spin` · `admin-advisor-name` · `EmptyState`
- **신규 CSS는 modifier 3개만** (component-map.md §신규 CSS): `.admin-profreq-roster` · `.admin-profrec-roster` (grid-template-columns — `admin-asst-roster` 미러) · `.admin-td-ellipsis` (말줄임 유틸 — 동등 유틸이 이미 있으면 그것을 쓰고 신설하지 않는다)
- frontend-design은 craft(간격·위계·정렬)만.

---

## 11. 금지사항 (리뷰어 리젝 기준)

1. **하드코딩 리터럴 금지** — 신청·기록·상담구분·제한슬롯·프로필 값을 화면에 박지 않는다. 전부 스키마→JSON/스토어→로더→구독.
2. **`schema/counselRequest.ts`(admin)·`counselRequests.ts`·`counselRecords.ts`·상담사 화면 수정 금지** — 교수상담은 owner 스토어 '교수' 레인 + 신규 투영 모듈로 격리. `CounselRequestType`(admin, '진로취업'|'심리')에 '교수' 추가 금지.
3. **navConfig.ts 변경 금지** — 네비는 이미 있다.
4. **화면 컴포넌트에서 전체 배열 filter로 범위 좁히기 금지** — `professorId`·`studentIds`는 로더 파라미터로(SPEC §2).
5. **새 팔레트·토큰 금지** — §10의 기존 클래스 + 명시된 modifier 3개만.
6. **기록·신청 원본 수정/삭제 UI 금지** — 기록은 append-only, 신청은 상태 전이(patch)만.
7. **기존 seed(`advisorAssigns`·`profCounselRecords`) 및 학생 seed의 기존 항목 변경 금지** — append만.
8. **학사 유래 필드(이름·학과·학년·학적) 편집 UI 금지** — 읽기 전용(CLAUDE.md 규칙 1).
9. **`studentIds` 빈 배열을 전체로 폴백 금지** (§7-7 경고) — 배정 0명 교수에게 전교생이 보이면 결함.
10. **id 공간 오염 금지** — `assignedCounselorId`에 교수 id를 넣지 않는다(전용 `professorId` 필드 사용). 새 surrogate id·링크 필드 금지(결정 1).
11. **기존 상담사·조교 화면 회귀 금지** — `AssistantStudents`·`AssistantAdvisor(Records)`·`CounselRequests`·`SettingsAvailability` 등 무수정 화면의 동작 불변(패턴 미러만). `AdminModal`은 `md|lg|xl`만(sm 없음).
12. **src_v2 화면 수정은 §8 표의 `ProfessorCounsel.tsx` 명시 항목만** — 그 외 학생 화면·컴포넌트 불가침.
