# assistant-advisor — UI 스펙 (역할: 조교)

> team-lead 1단계 산출물 (2026-07-30). **이 문서가 진실의 원천**이다 — `image-analysis.md`는 현행 캡처 기록일 뿐이며, 어긋나면 이 문서가 이긴다.
> 대상: ① `/assistant/advisor` 전담교수 배정 현황 (SPEC §3-2②) ② `/assistant/advisor/records` 전담교수 상담 실적 (SPEC §3-2③)

---

## 0. 팀장 결정 5건 (근거 포함 — 구현·리뷰 기준)

### 결정 1 — 배정 버튼 = **조교의 직접 확정 배정** (요청 발송 아님)

- SPEC §3-2②는 "없음(조회) 또는 배정 요청 발송"이지만, **사용자가 캡처의 배정 버튼(미배정 행 → [교수 배정])을 명시 요구**했다. 사용자 요구 우선.
- 현행 운영도 이 화면이 확정형이다: 캡처에 엑셀업로드(대량 확정 배정 도구)와 배정일자 즉시 기록이 존재. 현행 `CO_ADVISER`(STU_NO+ADV_NO) 입력 주체가 학과 조교다.
- 단, **SPEC §3-4-① 감사 규칙을 데이터층에서 강제**한다:
  - **유일성**: 학생당 active 배정 1건. `assignAdvisor()`는 이미 active 배정이 있으면 거부(throw).
  - **이력**: 스토어는 append-only. 레코드 수정·삭제 없음, 해제는 `status: 'released'` 전이로만 표현.
  - **감사 필드**: `by`(조교 id) + `assignedAt` 필수.
- **해제·재배정 UI는 이 화면 범위 밖**(슈퍼관리자 §3-4-① 소관). 스키마만 `released`를 준비해 둔다 — 나중에 해제 기능이 와도 스토어 무마이그레이션.

### 결정 2 — 버튼줄 = **[초기화] + [엑셀 다운로드]** 2개만

| 현행 버튼 | 판정 | 근거 |
|---|---|---|
| 엑셀업로드 | **제외** | 백엔드 없음(파일 파싱·검증 불가) + 대량 배정은 유일성·이력 검증을 우회 + 조교 권한(담당 학과 보조) 밖의 위험 작업 |
| 전담교수 다운로드 / 엑셀다운로드 | **1개로 통합 → [엑셀 다운로드]** | 기능 중복. 남긴 것은 **브라우저에서 실제 동작**: 현재 탭+필터 적용된 전체 결과(페이지 무시)를 CSV 생성 — `ProgramBlacklist.tsx:175 downloadCsv` 패턴 미러(BOM `﻿` + Blob `text/csv;charset=utf-8` + createObjectURL). 파일명 `전담교수배정_YYYYMMDD.csv` |
| 초기화 | **유지** | 필터 4종+검색이라 리셋 가치 있음. `admin-btn admin-btn-ghost` |
| [검색] 버튼 | **제거** | `admin-search`는 라이브 필터 패턴(AssistantStudents 동일). 별도 검색 버튼 없음 |

### 결정 3 — 연락처 열 = **(b) seed 보강** (+ 미보유 '—' 폴백 유지)

- 근거: 연락처는 학사DB 수신 필드(`V_USR_INF.HP`)라 실서비스에선 사실상 전원 보유. 실측상 조교 스코프에서 컴공 15명 중 phone 1명·경영 8명 중 2명뿐 — '—'가 대다수면 열이 기능을 잃고 현행 화면(전원 표시)과도 어긋난다. mock을 실제 데이터 분포에 맞춰야 DB 전환 시 화면 검증이 유효하다.
- **보강 규칙** (구현자 수행):
  1. `src_v2/data/studentsRoster.json` — phone 미보유 82명 전원에 `phone` 추가. 규칙 = 기존 가짜번호 규칙(`students.ts:137` "010-0XXX-XXXX 실번호 충돌 없는 가짜번호") 계승: **`010-0` + id 숫자부 3자리 + `-` + 학번 뒤 4자리** (예: `stu-089`/20201234 → `010-0089-1234`). **기존 보유 30명은 불변.** phone 외 다른 필드 변경 금지.
  2. `src_admin/data/studentRoster.ts` `detailToRoster()`에 `phone: s.phone` 1줄 추가 — 병합되는 상세 학생(chaewon·changwon)도 연락처 표시. `RosterStudent.phone`은 이미 optional이라 기존 화면 무회귀.
- 렌더: `s.phone ?? '—'` 방어 폴백은 유지.

### 결정 4 — 교수상담 실적 = **신규 단일소스 `profCounselRecords`** (기존 union 불가침)

- 근거: 교수상담은 현행 DB에서도 별도 테이블(`CON_PROF_INFO` 18.4만)이고, 상담사 상담(`COUNSEL_MASTER` → `dc_counsel_records`)과 도메인이 다르다. `CounselRequestType`(`'진로취업'|'심리'`)에 '교수'를 추가하면 상담사 화면 필터·통계가 오염된다 → **금지**.
- 상담구분은 현행 `SY_CODE` GRP `0131` 6종을 미러하되, **코드+라벨 분리**(CLAUDE.md 코드 작성 규칙 4)로 신설: 전공및학업·진로·취업·봉사및실습·사제동행프로그램·기타.
- localStorage 키 신설: `dc_prof_counsel_records` (기존 `dc_counsel_records`와 별개).

### 결정 5 — 배정 스키마 = **append-only 이력 + 발생 시점 스냅샷 포함**

- 스냅샷 포함 판정: **포함한다.** CLAUDE.md 규칙 2(현행 `EP_PRM_APP`이 신청 시점 `HOFC_STA_CD`·`STU_SCHGR` 복사) 준수. 배정 당시 학년·학적은 시간이 지나면 바뀌므로(4학년→졸업) 이력 감사에 필수.
- 단, **화면 표시는 라이브 로스터 기준**(이름·학과·학년·학적은 `getFullRoster` 병합 결과) — 스냅샷은 이력·감사용이지 표시용이 아니다(CLAUDE.md 규칙 1: 학사 유래 데이터는 읽기 전용, 파생 표시도 원본에서).
- localStorage 키: `dc_advisor_assign` (현행 `CO_ADVISER` 대응). seed JSON + 오버레이.

---

## 1. 라우트 / 진입

| 항목 | 값 |
|---|---|
| 라우트 | `/assistant/advisor` (배정 현황) · `/assistant/advisor/records` (상담 실적) — React Router, basename `/admin` |
| App.tsx | 122~131행 조교 블록의 `NotReady` 2개를 신규 페이지로 **element만 교체** (`AssistantAdvisor`, `AssistantAdvisorRecords`) |
| 네비 | `navConfig.ts` `asst-advisor` 섹션(전담교수 → 배정 현황·상담 실적) **이미 존재 — 변경 금지** |
| 가드 | 기존 `RequireRole roles={['assistant']}` 그대로 |
| 접근범위 | `getActiveUser()` → `(user as Assistant).departments` — **모든 로더에 `departments` 파라미터로 전달, 범위 판정은 데이터층**(SPEC §2 구현 규약. 화면 filter 금지) |

---

## 2. 화면 ① 전담교수 배정 현황 (`/assistant/advisor`)

### 목적
조교가 담당 학과 학생의 지도교수(전담교수) 배정 상태를 조회하고, 미배정 학생에게 교수를 확정 배정한다.

### 레이아웃 (위 → 아래)

```
admin-page
├ admin-page-head        제목 "전담교수 배정 현황" · desc "{user.dept} · 담당 학과 · 배정 {assigned}/{total}명"
├ admin-tabs             [전체 n] [미배정 n] [배정 n]   ← admin-tab + admin-tab-count, 캡처 순서 유지
├ admin-filterbar        검색(이름·학번) · 학과 · 학년 · 학적 · 배정년도
├ admin-toolbar          좌: "검색 결과 {n}명"(+로딩 스피너) · 우: [초기화] [엑셀 다운로드]
└ admin-card
   ├ admin-roster admin-advisor-roster (9열, 10개 페이징)
   └ admin-pagination    "{p} / {pages} 페이지 · 총 {n}명"
```

### 탭
- **전체 / 미배정 / 배정** 3개. 카운트는 **담당 범위 전체 기준(필터 무시)** — `getAdvisorTabCounts(departments)`.
- 탭 전환 시 page=1 리셋. 활성 탭은 `admin-tab.active`(기존 토큰 — 캡처의 녹색 상단테두리형은 채택 안 함).

### 필터 (admin-filterbar — AssistantStudents 패턴 미러)
| 필터 | 옵션 소스 | 기본값 | 비고 |
|---|---|---|---|
| 검색 | 입력 즉시(라이브) | '' | placeholder "이름·학번 검색". 이름+학번 대상 |
| 학과 | `getRosterFilterOptions(depts).majors` | 전체 | 담당 범위 내 학과만 |
| 학년 | 〃 `.grades` | 전체 | |
| 학적 | 〃 `.statuses` | **재학** | SPEC §2 학적상태 필터 필수. 배정 업무 대상은 재적생이므로 기본 '재학'(AssistantStudents의 기본 '전체'와 의도적 차이 — 졸업·휴학은 명시 선택 시만). seed의 컴공 졸업생 1명이 이 필터 동작을 시연한다 |
| 배정년도 | `getAssignYearOptions(depts)` — 배정 데이터에서 파생 | 전체 | 특정 년도 선택 시 **미배정 행은 자연 제외**(배정일 없음). 하드코딩 년도 목록 금지 |

### 표 — 9열 (`admin-advisor-roster` modifier)

| # | 열 | 데이터 출처 | 렌더 |
|---|---|---|---|
| 1 | 번호 | `startIndex + i + 1` | 화면 순번(오름차순). 캡처의 내림차순 번호는 순번+정렬 규칙으로 대체 |
| 2 | 학번 | `RosterStudent.studentNo` | |
| 3 | 이름 | `RosterStudent.name` | `<strong>` |
| 4 | 소속 | `collegeOf(s.major) + ' ' + s.major` | 캡처처럼 한 셀(예: "공과대학 컴퓨터공학과"). 미매핑 대학은 collegeOf가 '—' 반환 → 학과명만 |
| 5 | 학년 | `RosterStudent.grade` | |
| 6 | 학적 | `RosterStudent.status` | `enrollStatusClass(s.status)` 배지 (캡처에 없으나 SPEC §2 이유로 추가) |
| 7 | 연락처 | `RosterStudent.phone` | `s.phone ?? '—'` (결정 3 보강 후 사실상 전원 표시) |
| 8 | 지도교수 | `AdvisorRosterRow.advisor` | **상태별 렌더 ↓** |
| 9 | 배정일자 | `advisor.assignedAt` | `YYYY.MM.DD` 점 구분(캡처 미러 — 저장은 `YYYY-MM-DD`, 표시만 변환). 미배정 `—` |

**지도교수 열 상태별 렌더 (이 화면의 심장):**
- **배정됨** → 교수 이름 `<span class="admin-advisor-name">` (캡처의 녹색 강조를 `var(--color-primary)` 토큰으로 치환)
- **미배정** → `[교수 배정]` 버튼 (`admin-btn admin-btn-primary sm`) → 배정 모달 오픈

**정렬(고정):** 미배정 우선 → 배정일 최신순 → 학번 오름차순. (미배정=액션 필요 행이 위. 캡처의 "최신 배정 위" 의도 계승)

### 배정 모달 (AdminModal size="sm", 페이지 내부 구현 — 별도 파일 불필요)
- 제목 "교수 배정"
- 학생 요약: 이름 · 학번 · 소속 · 학년 (읽기 전용, `admin-kv`)
- **교수 select**: `professorsOfMajor(s.major)` — 해당 학생 **학과의 교수만**(src_v2 `PROFESSOR_GROUPS` 단일소스). 각 옵션에 현재 배정 학생 수 병기: "박지훈 (소프트웨어공학) · 배정 4명" — 조교가 편중을 보게. 학과가 교수 풀에 없으면 EmptyState 안내("해당 학과의 교수 정보가 없습니다") + 배정 버튼 비활성
- **배정일**: date input, 기본 오늘. 저장 `YYYY-MM-DD`
- 액션: [취소](admin-btn-ghost) · [배정 확정](admin-btn-primary) → `assignAdvisor()` → 성공 시 모달 닫고 `refetch()` — **행이 배정 상태로 전환되는 것이 피드백**(src_admin에 toast 인프라 없음 — 신설 금지)
- 유일성 위반(이론상 불가하나 방어): 로더가 거부 시 모달 내 인라인 에러 문구

### 엑셀 다운로드 (실동작)
- `getAdvisorRosterForExport(현재 탭+필터)` — 페이지 무시 전체 행
- 헤더: 학번,이름,소속,학년,학적,연락처,지도교수,배정일자 · 미배정은 지도교수/배정일자 빈칸
- `﻿` BOM + `text/csv;charset=utf-8` Blob + createObjectURL + `<a download>` (ProgramBlacklist.tsx 패턴 미러 — **ProgramBlacklist 자체는 수정 금지**)

### 빈 상태 / 로딩 / 페이징
- 빈: `EmptyState icon={LuFrown} message="조건에 맞는 학생이 없습니다."` · 미배정 탭 0건 시 "미배정 학생이 없습니다. 전원 배정 완료."
- 로딩: `admin-loading` + `LuLoaderCircle`(admin-spin) — `useListData.isLoading`
- 페이징: PAGE_SIZE=10 · `admin-pagination` · `totalPages()` — AssistantStudents와 동일

---

## 3. 화면 ② 전담교수 상담 실적 (`/assistant/advisor/records`)

### 목적
담당 학과의 전담교수별 상담 실적(건수·최근 상담일)과 배정 학생별 상담 현황을 조회하고, 미상담 학생에게 독려를 발송한다. **읽기 전용 집계 + 독려 발송만** — 기록 작성·수정 없음(기록 작성은 교수 화면 §3-5 소관).

### 레이아웃

```
admin-page
├ admin-page-head        제목 "전담교수 상담 실적" · desc "{user.dept} · 배정 학생 {n}명 기준"
├ admin-card ── 섹션 1: 교수별 실적
│   └ admin-roster admin-profstat-roster (5열 — 교수 3명 내외라 페이징 없음)
└ admin-card ── 섹션 2: 학생별 현황
    ├ admin-tabs         [전체 n] [미상담 n]
    ├ admin-filterbar    검색(이름·학번) · 학적(기본 재학)
    └ admin-roster admin-advisee-roster (9열, 10개 페이징) + admin-pagination
```

### 섹션 1 — 교수별 실적 (5열, `getProfessorStats(departments)`)
| 열 | 출처 |
|---|---|
| 교수 | `ProfessorStatRow.professorName` (+ `major` 전공 병기 small) |
| 학과 | 배정 학생들의 학과 (담당 범위) |
| 배정 학생 수 | active 배정 집계 |
| 상담 건수 | `dc_prof_counsel_records` 해당 교수 기록 수 |
| 최근 상담일 | 기록 중 최신 `date` (`YYYY.MM.DD`) · 0건이면 `—` + '기록 없음' 뉘앙스 |

- **대상 교수 = 담당 학과에서 active 배정을 1건 이상 보유한 교수**(배정 데이터에서 파생 — 교수 풀 전체 나열 아님).
- 배정 0명이면 섹션 전체를 EmptyState("배정된 전담교수가 없습니다. 배정 현황에서 먼저 배정하세요.").

### 섹션 2 — 학생별 현황 (9열, `queryAdviseeCounselStatus`)
- **대상 = active 배정된 학생만.** 미배정 학생은 배정 현황 화면 소관 — desc 아래 보조 문구로 "미배정 {n}명은 배정 현황에서 관리" 안내(값은 `getAdvisorTabCounts`에서).
- 탭: [전체] [미상담] — 미상담 = 교수상담 기록 0건. 카운트는 담당 범위 전체 기준.

| # | 열 | 출처 | 렌더 |
|---|---|---|---|
| 1 | 번호 | 순번 | |
| 2 | 학번 | 로스터 | |
| 3 | 이름 | 로스터 | `<strong>` |
| 4 | 학년 | 로스터 | |
| 5 | 지도교수 | active 배정 | `admin-advisor-name` |
| 6 | 상담 횟수 | 기록 집계 | 0이면 강조 없이 "0회" |
| 7 | 최근 상담일 | 기록 최신 `date` | `YYYY.MM.DD` · 없으면 `—` |
| 8 | 최근 상담구분 | 최신 기록 `categoryCode` → 라벨 | `PROF_COUNSEL_CATEGORIES` 맵으로 렌더(코드→라벨). 없으면 `—` |
| 9 | 독려 | nudge 스토어 | **상태별 렌더 ↓** |

**독려 열 상태별 렌더:**
- 미상담 + 미발송 → `[독려 발송]` 버튼(`admin-btn admin-btn-ghost sm`) → `sendNudge()` append → 행 갱신
- 발송됨 → 텍스트 "발송 {MM.DD}" (최신 nudge의 `sentAt`) — 재발송 없음(mock 범위)
- 상담 이력 있음 → `—` (독려 불필요)

**정렬(고정):** 미상담 우선 → 최근 상담일 오래된 순 → 학번. 빈/로딩/페이징은 화면 ①과 동일 규약.

---

## 4. 데이터 계약 (신규 파일 전체 목록)

> 모든 로더는 counselRecords.ts 저장 패턴 미러: **읽기 = localStorage 전체 ?? seed 폴백, 쓰기 = 전체 리스트 persist.** 원본 seed 파일은 불변(CLAUDE.md 런타임 반영 방식). 배열 아닌 파싱 결과·접근 실패는 seed 폴백. `queryX`는 `async + Paginated` 봉투(query.ts 계약), `mockLatency()` 포함.

### 4-1. `src_admin/data/schema/advisorAssign.ts` (신규 — 스키마)

```ts
// 전담교수 배정 스키마 (단일 소스) — 현행 CO_ADVISER(STU_NO+ADV_NO) 대응.
// append-only: 레코드 수정·삭제 없음. 해제는 status 전이(신규 화면 범위 밖, 스키마만 준비).
// SPEC §3-4-①: 학생당 active 1건(유일성) + 배정/해제 이력 보존.

/** 배정 상태 — 'released'는 향후 해제 기능용(현재 화면은 생성만) */
export type AssignStatus = 'active' | 'released'

export interface AdvisorAssign {
  /** 배정 레코드 id (adv_ prefix) */
  id: string
  /** 학생 id (RosterStudent.id / StudentData.id) */
  studentId: string
  /** 교수 id (src_v2 professors.seed.json Professor.id — 현행 ADV_NO) */
  professorId: string
  /** 교수 이름 스냅샷 (표시 폴백용) */
  professorName: string
  /** 배정일 YYYY-MM-DD — 배정년도 필터의 축 */
  assignedAt: string
  status: AssignStatus
  /** 해제일 YYYY-MM-DD (status='released'일 때만) */
  releasedAt?: string
  /** 배정 수행자 (조교 id — 감사) */
  by: string
  /** ── 발생 시점 스냅샷 (CLAUDE.md 규칙 2 · EP_PRM_APP 패턴. 이력·감사용 — 표시는 라이브 로스터) ── */
  snapshot: {
    studentNo: string
    name: string
    major: string
    grade: number
    status: string   // 배정 당시 학적 (EnrollStatus 값)
  }
}
```

### 4-2. `src_admin/data/advisorAssigns.seed.json` (신규 — seed)

- `AdvisorAssign[]`. **분포 요건**(값은 로스터 실데이터에서 복사 — 임의 창작 금지):
  - 컴퓨터공학과 15명(로스터 14 + 상세 chaewon) 중 **11명 배정 / 4명 미배정**. 교수는 `cse-1`(박지훈)·`cse-2`(강민재)·`cse-3`(신유라)에 편중 있게 분산(예: 5/4/2 — 교수별 실적 차이 시연)
  - 경영학과 8명(7 + changwon) 중 **5명 배정 / 3명 미배정**. `biz-1`~`biz-3` 분산
  - `assignedAt` 2023~2026 분포(배정년도 필터 검증). 컴공 졸업생 1명은 2023 배정 상태로 포함(기본 학적필터 '재학'에 가려지는 것을 시연)
  - 전 레코드 `status: 'active'`, `by`는 해당 학과 조교 id(`asst_kim`/`asst_park`), snapshot은 로스터 현재값 복사

### 4-3. `src_admin/data/advisorAssigns.ts` (신규 — 로더)

```ts
const STORAGE_KEY = 'dc_advisor_assign'

/** 전체 배정 이력. localStorage 전체 ?? seed 폴백 (counselRecords.ts 미러) */
export function getAdvisorAssigns(): AdvisorAssign[]

/** 학생 id → active 배정 (학생당 1건 보장 파생) */
export function getActiveAssignByStudent(): Map<string, AdvisorAssign>

/** 배정 확정 — 유일성 검증(이미 active 존재 시 Error) 후 append + 전체 persist */
export function assignAdvisor(input: {
  studentId: string; professorId: string; assignedAt: string; by: string
}): AdvisorAssign   // professorName·snapshot은 로더가 로스터·교수 풀에서 채운다

/** 배정년도 옵션 — 담당 범위의 배정 데이터에서 파생(내림차순). 하드코딩 금지 */
export function getAssignYearOptions(departments: string[]): string[]

/** 학생 학과의 교수 풀 — src_v2 PROFESSOR_GROUPS 구독 (cross-SPA import는 studentRoster.ts와 동일한 임시 비계, DB 전환 시 제거) */
export function professorsOfMajor(major: string): Professor[]

/** 로스터 ⊕ active 배정 병합 행 */
export interface AdvisorRosterRow extends RosterStudent {
  advisor?: { professorId: string; professorName: string; assignedAt: string }
}

export type AdvisorTab = 'all' | 'unassigned' | 'assigned'

/** [DB-ready] 배정 현황 목록 — getFullRoster(departments) ⊕ 배정 병합 → 탭·필터·정렬·페이징 */
export async function queryAdvisorRoster(
  params: ListParams & { departments?: string[]; tab?: AdvisorTab },
): Promise<Paginated<AdvisorRosterRow>>
// filters: { major?, grade?, status?, year? } · q: 이름+학번
// 정렬: 미배정 우선 → assignedAt desc → studentNo asc

/** 탭 카운트 — 담당 범위 전체 기준(필터 무시) */
export function getAdvisorTabCounts(departments: string[]): { all: number; assigned: number; unassigned: number }

/** CSV 내보내기용 — 현재 탭+필터 전체 행(페이지 무시). penalties.ts 주석 규약 동일 */
export function getAdvisorRosterForExport(
  params: { departments?: string[]; tab?: AdvisorTab; q?: string; filters?: Record<string, string | undefined> },
): AdvisorRosterRow[]
```

### 4-4. `src_admin/data/schema/profCounselRecord.ts` (신규 — 스키마)

```ts
// 교수(전담교수) 상담 기록 스키마 — 현행 CON_PROF_INFO 대응.
// 상담사 상담(counselRecord.ts / dc_counsel_records)과 별개 도메인 — CounselRequestType 오염 금지.

/** 상담구분 — 현행 SY_CODE GRP '0131' 미러 (코드+라벨 분리, CLAUDE.md 규칙 4).
 *  실코드 미확인으로 잠정 '01'~'06' 부여 — DB 전환 시 SY_CODE 실값으로 치환. */
export const PROF_COUNSEL_CATEGORIES = [
  { code: '01', label: '전공 및 학업' },
  { code: '02', label: '진로' },
  { code: '03', label: '취업' },
  { code: '04', label: '봉사 및 실습' },
  { code: '05', label: '사제동행프로그램' },
  { code: '06', label: '기타' },
] as const

export type ProfCounselCategoryCode = (typeof PROF_COUNSEL_CATEGORIES)[number]['code']

export interface ProfCounselRecord {
  id: string                 // pcr_ prefix
  studentId: string
  professorId: string        // Professor.id (현행 CON_PROF_INFO의 교수 식별)
  professorName: string      // 스냅샷
  categoryCode: ProfCounselCategoryCode
  date: string               // 상담일 YYYY-MM-DD
  summary?: string           // 상담 요지 (조교 화면은 표시 안 함 — 집계만. 교수 화면 §3-5용 예비)
  createdAt: string          // ISO
  /** 발생 시점 학생 스냅샷 (EP_PRM_APP 패턴) */
  snapshot: { studentNo: string; name: string; major: string; grade: number }
}

/** 독려 발송 이벤트 — append-only (이벤트→JSON 원칙) */
export interface AdvisorNudge {
  id: string                 // ndg_ prefix
  studentId: string
  professorId: string
  sentAt: string             // ISO
  by: string                 // 조교 id
}
```

### 4-5. `src_admin/data/profCounselRecords.seed.json` (신규 — seed)

- `ProfCounselRecord[]`. 분포 요건: **배정된(4-2 seed의 active) 학생 중 일부만** 기록 보유. 교수별 편차를 둔다(예: cse-1 다건 · cse-3 0건 → 교수별 실적 차이 시연). 미상담 학생을 학과당 3명 이상 남긴다(미상담 탭·독려 버튼 시연). `date` 2025~2026, `categoryCode` 6종 분산. **배정되지 않은 학생의 기록을 넣지 않는다.**

### 4-6. `src_admin/data/profCounselRecords.ts` (신규 — 로더)

```ts
const STORAGE_KEY = 'dc_prof_counsel_records'
const NUDGE_KEY = 'dc_advisor_nudges'

export function getProfCounselRecords(): ProfCounselRecord[]   // LS 전체 ?? seed

export interface ProfessorStatRow {
  professorId: string; professorName: string; professorMajor: string  // Professor.major(전공)
  dept: string                 // 배정 학생들의 학과
  adviseeCount: number         // active 배정 수
  recordCount: number
  lastDate?: string            // YYYY-MM-DD
}
/** 교수별 실적 — active 배정 보유 교수만, 배정 데이터에서 파생 */
export function getProfessorStats(departments: string[]): ProfessorStatRow[]

export interface AdviseeCounselRow {
  studentId: string; studentNo: string; name: string; major: string; grade: number
  status: EnrollStatus         // 라이브 로스터 학적 (필터 축)
  professorId: string; professorName: string
  recordCount: number
  lastDate?: string
  lastCategoryCode?: ProfCounselCategoryCode
  nudgedAt?: string            // 최신 독려 발송 ISO
}
export type AdviseeTab = 'all' | 'none'

/** [DB-ready] 학생별 상담 현황 — active 배정 학생 ⊕ 기록·독려 집계 → 탭·필터·페이징 */
export async function queryAdviseeCounselStatus(
  params: ListParams & { departments?: string[]; tab?: AdviseeTab },
): Promise<Paginated<AdviseeCounselRow>>
// filters: { status? } · q: 이름+학번 · 정렬: 미상담 우선 → lastDate asc → studentNo

/** 탭 카운트 — 담당 범위 전체 기준 */
export function getAdviseeTabCounts(departments: string[]): { all: number; none: number }

/** 독려 발송 — dc_advisor_nudges append (수정·삭제 없음) */
export function sendNudge(input: { studentId: string; professorId: string; by: string }): AdvisorNudge
export function getNudgesByStudent(): Map<string, AdvisorNudge>   // 학생별 최신 1건
```

### 4-7. 기존 파일 수정 (허용 범위 — 이것 외 금지)

| 파일 | 변경 | 성격 |
|---|---|---|
| `src_v2/data/studentsRoster.json` | phone 미보유 82명 보강 (결정 3 규칙) | 데이터 seed 보강 — 예외 허용 항목 |
| `src_admin/data/studentRoster.ts` | `detailToRoster()`에 `phone: s.phone` 1줄 | additive, 무회귀 |
| `src_admin/App.tsx` | 122~131행 NotReady 2개 → 신규 페이지 element 교체 + import | 라우팅 배선 |
| `src_admin/index.css` | §5의 modifier 클래스만 추가 (기존 규칙 수정 금지) | 스타일 |

### 4-8. 이벤트 → JSON 매핑 (이 화면이 추가하는 것)

| 이벤트 | 스토어 | 키 | 방식 |
|---|---|---|---|
| 조교가 교수 배정 확정 | 배정 이력 | `dc_advisor_assign` | append (유일성 검증 후) |
| 조교가 독려 발송 | 독려 이벤트 | `dc_advisor_nudges` | append |
| (예비) 배정 해제 | 배정 이력 | `dc_advisor_assign` | status 전이 — 이번 범위 밖 |

---

## 5. 디자인 레이어

- base: `DESIGN.md` · 역할 레이어: `src_admin/index.css` (상담사/교직원 토큰). **새 팔레트·폰트·토큰 생성 금지** — 캡처의 녹색/주황은 전부 기존 토큰으로 치환.
- 쓸 토큰·클래스: `--color-primary`(강조·활성탭·배정버튼) · `--color-border`/`--color-section-bg` · `admin-page/admin-page-head/admin-card` · `admin-tabs/admin-tab/admin-tab-count` · `admin-filterbar/admin-search/admin-select` · `admin-toolbar/admin-toolbar-count` · `admin-roster*` · `admin-btn(-primary/-ghost/.sm)` · `admin-enroll*` · `admin-pagination/admin-page-btn/admin-page-info` · `admin-loading/admin-spin` · `admin-kv`
- **신규 CSS는 modifier 3개 + 강조 1개만** (component-map.md 참조): `.admin-advisor-roster` `.admin-profstat-roster` `.admin-advisee-roster` (grid-template-columns 지정, `admin-asst-roster` 미러) + `.admin-advisor-name` (`color: var(--color-primary); font-weight: 800`)
- frontend-design은 craft(간격·위계·정렬)만.

---

## 6. 교정표 (이미지 → 프로젝트, image-analysis.md §4 확장판)

| 이미지 요소 | 교정 결과 | 근거 |
|---|---|---|
| 녹색(#0A7D3E 계열)/주황 팔레트 | admin 토큰(`--color-primary` 블루 계열)으로 전면 치환 | 디자인 토큰 잠금 — drift는 결함 |
| 탭 상단/좌우 테두리형(녹색 글자) | `.admin-tabs` 하단 보더형 + `admin-tab-count` | 기존 컴포넌트 재사용(재생성 금지) |
| 탭 순서 전체·미배정·배정 | **유지** | 업무 흐름(미배정 우선 확인)에 부합 |
| 넓은 소속 select "전체" | 학과 select(담당 범위 내 옵션) | 조교는 담당 학과만(FU_ASS_DEPT) — 전교 소속 트리 불필요 |
| 자유 검색 + [검색] 버튼 | 라이브 검색(admin-search), 버튼 제거 | 기존 목록 화면 공통 패턴 |
| 학적 필터·열 없음 | 학적 select(기본 재학) + 학적 배지 열 추가 | SPEC §2 학적상태 필터 필수 |
| 엑셀업로드 | 제거 | 결정 2 — 백엔드 없음·권한 밖·감사 우회 |
| 전담교수 다운로드 + 엑셀다운로드 | [엑셀 다운로드] 1개(CSV 실동작) | 결정 2 — 기능 중복 통합 |
| "총 98개" (전교 규모) | "검색 결과 {n}명" — 담당 범위 카운트 | 조교 접근범위는 데이터층에서 좁힘 |
| 체크박스 열 | 제거 | 일괄 작업(엑셀업로드) 소멸로 용도 없음 |
| 번호 내림차순(98→94) | 순번(오름차순) + 정렬 규칙(미배정 우선→배정일 최신) | 순번·정렬 분리로 같은 의도("액션 필요·최신이 위") 달성 |
| 소속 "GAST-인공지능대학 스마트그린공학부…" | `collegeOf(major) + ' ' + major` (예: "공과대학 컴퓨터공학과") | 우리 단일소스 조직 체계. 실조직명 복제 금지 |
| 지도교수 녹색 텍스트 | `.admin-advisor-name` (primary 토큰) | 강조 의도만 계승, 색은 토큰 |
| 배정일자 `YYYY.MM.DD` | 표시 형식 유지(저장은 ISO `YYYY-MM-DD`) | 캡처 미러 + 코드·표시 분리 |
| (이미지에 없음) 미배정 행 | 지도교수 열 = [교수 배정] 버튼, 배정일자 `—` | 사용자 구두 요구(image-analysis §3) |

---

## 7. 금지사항 (리뷰어 리젝 기준)

1. **하드코딩 리터럴 금지** — 학생·교수·배정·기록·년도 옵션·카운트를 화면에 박지 않는다. 전부 스키마→JSON seed→로더→구독.
2. **새 팔레트·폰트·토큰 금지** — 캡처의 녹색/주황 복제 금지. §5의 기존 토큰·클래스 + 명시된 modifier 4개만.
3. **navConfig.ts 변경 금지** — 네비는 이미 있다.
4. **`CounselRequestType`·`counselRecord.ts`·`counselRequests` 계열 수정 금지** — 교수상담은 신규 단일소스로 격리.
5. **src_v2 화면(컴포넌트) 수정 금지** — 예외는 §4-7의 seed 보강·detailToRoster 1줄뿐.
6. **화면 컴포넌트에서 전체 배열 filter로 범위 좁히기 금지** — departments는 로더 파라미터로(SPEC §2).
7. **기존 상담사·조교 화면 회귀 금지** — StudentList·AssistantStudents·ProgramBlacklist 등 무수정(패턴 미러만).
8. **배정 레코드 수정·삭제 금지** — append-only. 유일성은 `assignAdvisor()` 내부 검증.
9. **학사 유래 필드(이름·학과·학년·학적) 편집 UI 금지** — 읽기 전용(CLAUDE.md 규칙 1).
