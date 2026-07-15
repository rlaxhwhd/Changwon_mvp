# counsel-requests — UI 스펙 (역할: counsel)

> **note:** `image.png`(참조 UI 이미지)는 사용자가 세션 이미지를 이 폴더에 직접 저장할 예정이다. 이미지는 레퍼런스일 뿐 — **이 문서가 진실의 원천**이다(`.ai/interop.md` 하드룰 3).
>
> **중요 — 기존 구현 존재:** 이 화면은 `src_admin/pages/CounselRequests.tsx`로 **이미 구현되어 있고** 이미지와 구조가 거의 일치한다(캘린더+테이블 2패널, 상태 필터탭, CSV 다운로드). 이번 handoff는 **재작성 금지** — 아래 "구현 범위(갭)"의 5개 항목만 추가·교정한다. 나머지는 현행 유지.

## 라우트 / 진입

- 라우트: `/counsel/requests` (SPA basename `/admin` → 브라우저 URL `/admin/counsel/requests`)
- 라우팅 정의: `src_admin/App.tsx` — 이미 등록됨(`RequireLogin` → `Layout` 하위). **변경 불필요.**
- 네비 위치(단일 소스 `src_admin/components/navConfig.ts`): 상단 GNB **상담 관리** 섹션 → 사이드바 1번째 항목 **신청 접수함**(`fa-inbox`). **변경 불필요.**
- 진입 컨텍스트: 로그인 역할은 에이전트가 아닌 **컨텍스트 주입** — `getActiveCounselor()`(`src_admin/data/counselors.ts`, localStorage `dc_active_counselor`)가 활성 상담사를 결정하고, 접수함은 그 상담사 기준으로 렌더된다.

## 내용 교정 (이미지 → 프로젝트)

| # | 이미지 원문 | 프로젝트 정정 | 이유 |
|---|---|---|---|
| 1 | 상단 로고 "CWNU 상담사 포털" | **"DC DREAMCATCH 상담사"** (기존 GNB 유지) | 프로젝트 브랜딩은 드림캐치. `GNB.tsx`의 기존 로고를 바꾸지 않는다 |
| 2 | 프로필 "김상담 선생님 / 진로취업상담사" | **"김진로 / 진로취업상담사"** — `counselors/career_kim.json`의 `name`·`roleLabel`에서 렌더 | 상담사 이름은 JSON 단일 소스. 이미지 맞추려고 개명 금지 |
| 3 | **김지연 행: 심리상담 요청이 진로취업상담사 접수함에 노출** | **노출 금지 — 접수함은 상담사별 필터(전체 공유풀 아님).** 시드 `req_011`을 `type: '심리'`, `assignedCounselorId: 'psych_lee'`로 교정 → 김진로 접수함에서 사라지고, 데모 전환으로 심리상담사(이마음) 로그인 시 그의 접수함에 보인다 | Counsel_README §4 "신청 접수함 (내 담당 유형만)" + §2 권한 매트릭스(진로취업상담사는 심리 접수 불가). 기존 구현도 `getRequestsByAssignee()` 기반. ※현 시드는 이 행을 `진로취업` 유형으로 뒤틀어 넣어놨는데(주제는 "스트레스 관리 및 심리적 안정"으로 명백히 심리) 이것이 데이터 오류 — 유형을 되살리고 담당을 옮기는 쪽이 정답 |
| 4 | 사이드바 상담 관리 하위 4항목: 신청 접수함·일정·예약·**상담 진행**·완료 상담 내역 | **"상담 진행" 정적 메뉴 추가 금지** — navConfig 3항목 유지 | 상담 진행은 `/counsel/session/:studentId` 파라미터 라우트라 단독 진입 불가. 접수함·학생 목록에서 학생을 골라 진입한다. navConfig가 네비 단일 소스 |
| 5 | 캘린더 "2024년 6월", 푸터 "© 2024" | 시드 시간대는 **2026-07** 유지·보강. 캘린더 초기 월은 데이터에서 파생(현행 `initialKey` 로직 유지). 푸터 연도는 `new Date().getFullYear()` 파생 | 날짜·연도 리터럴 하드코딩 금지 (하드룰 1) |
| 6 | 테이블 컬럼 5 "상태" | **"상태/담당" 유지** (상태 뱃지 + 담당 상담사 태그) | 기존 구현이 재배정 기능과 함께 담당 표시를 이미 제공 — 이미지보다 상위 집합, 축소 금지 |
| 7 | 관리 컬럼 "상세 보기 ⋮"만 | **"상세 보기 · 재배정 · ⋮" 유지**, 완료 건은 "기록 보기"(→`/counsel/records`) | 동일 — 기존 상위 집합 유지 |
| 8 | 알림벨 뱃지 "8" | 뱃지 수 = **활성 상담사 접수함의 '대기' 건수 파생** (0이면 뱃지 숨김) | 이미지의 8은 임의 수치. 모든 카운트는 데이터 파생 |
| 9 | 용어 전반 | "학생/상담사"로 일관 — 이미지에 회원·유저·admin user 류 용어 없음, 유입도 금지 | 프로젝트 도메인 용어 규칙 |

**핵심 판정(못박기): 신청 접수함은 상담사(담당자)별 필터된 개인 접수함이다. 전체 공유풀이 아니다.** 진로취업상담사 화면에 심리상담 행이 보이면 결함. 단, 화면 코드는 유형을 하드코딩하지 않고 `getRequestsByAssignee(활성 상담사 id)`를 쓰므로, 심리상담사로 전환하면 같은 화면이 심리 접수함이 된다(`counsel-type-badge.is-psych` 뱃지 기존 지원).

## 네비게이션

- 상단 GNB(`GNB.tsx`): 홈 · **상담 관리(active)** · 학생 관리 · 로드맵 관리`[진로]` · 채용공고`[진로]` · 비교과 운영`[진로]` · 설정. 진로 전용 섹션은 `requiresRole:'career'`로 심리상담사에게 자동 숨김 — 현행 유지.
- 좌측 사이드바(`SectionSidebar.tsx`): 상담 관리 → **신청 접수함(active)** · 일정·예약 · 완료 상담 내역. ("상담 진행" 추가 금지 — 교정표 #4)
- 사이드바 하단: **[신규] "오늘의 상담 현황" 카드** — counsel 섹션에서만 노출 (아래 페이지 내용·데이터 참조).
- GNB 우측: 알림벨(뱃지 = 대기 건수 파생, 교정표 #8) + 프로필 드롭다운(현행: 내 프로필·설정, 데모 상담사 전환).

## 페이지 내용

확정 카피 (전부 현행 유지, 변경 금지):

- 페이지 제목: **"신청 접수함"** / 부제: **"학생들이 신청한 상담 요청을 확인하고 관리할 수 있습니다."**
- 상태 필터탭: **전체 · 대기 · 확정 · 완료 · 취소** — 각 탭에 건수(접수함 전체 기준 파생). 기본 활성 "전체".
- 좌측 패널: **"상담 신청 캘린더"** — `<` `>` 월 이동, "{YYYY}년 {M}월", **[오늘]** 버튼, 일~토 그리드, 날짜별 신청 건수 뱃지, 선택일 강조. 범례: **"● 해당 날짜의 상담 신청 건수"**.
- 우측 패널 헤더: **"{YYYY.MM.DD (요일)} 상담 신청 목록"** + **"{N}건"** 뱃지 + 버튼 **[필터]** · **[엑셀 다운로드]**(CSV, 현행 `downloadCsv` 유지).
- 테이블 컬럼: **신청 시간 · 학생 정보 · 상담 유형 · 상담 주제 · 상태/담당 · 관리**
  - 신청 시간 셀: 큰 시각(확정·완료는 `slot.start`, 대기·취소는 `requestedAt` 시각 — 현행 `requestTime`) + **[신규] 보조 라벨 상대시간** "N분 전 신청"/"N시간 전 신청"/"N일 전 신청"(`requestedAt` 파생, 현행 정적 "신청" 라벨 대체).
  - 학생 정보 셀: 이름 · 학과(학년 포함 문자열) · 학번(현행 `studentId` 표기).
  - 상담 유형 뱃지: **"진로취업 상담"** / **"심리상담"**(현행 `requestTypeLabel`).
  - 상태 뱃지: 대기 · 확정 · 완료 · 취소 (`CounselRequestStatus`와 1:1).
  - 관리: 상세 보기(인라인 SlotForm — 확정/일정 변경/신청 취소) · 재배정(같은 역할 상담사만 후보) · ⋮ / 완료 건은 "기록 보기".
- 빈 상태(현행 유지): 아이콘 + **"선택한 날짜의 상담 신청이 없습니다."** + **"다른 날짜 또는 상태를 선택해 주세요."**
- 테이블 푸터(현행 유지): "총 {N}건" · "10개씩 보기" · 페이지네이션 `< 1 >`(시드 규모에서 단일 페이지 — 페이지 분할 구현은 이번 범위 아님).
- **[신규] 사이드바 카드 "오늘의 상담 현황"** — 4개 수치: **신청 접수**(접수함 전체 건수) · **오늘 상담**(오늘 날짜 slot의 확정+완료 건수) · **상담 완료**(완료 상태 건수) · **취소**(취소 상태 건수). 이미지의 12/6/4/1은 예시일 뿐 — 실제 수치는 데이터 파생.
- **[신규] 페이지 최하단 푸터**: "© {연도} Changwon National University" — 연도 파생(교정표 #5). `Layout.tsx`에 공용 추가(전 화면 공유, 다른 화면 영향 최소 확인).

### 구현 범위 (갭 — Codex가 할 일 전부)

1. 시드 교정·보강 (`counselRequests.seed.json` — 데이터만):
   - `req_011`(김지연): `type` → `"심리"`, `assignedCounselorId` → `"psych_lee"` (교정표 #3).
   - 추가 `req_012`: 최우진 · 전기공학과 2학년 · `studentId "202312345"` · 진로취업 · **확정** · 대면 · 주제 "직무 탐색 및 포트폴리오 준비" · `requestedAt "2026-07-10T14:30:00+09:00"` · slot `{date "2026-07-10", start "14:30", end "15:10", place "진로취업지원센터 상담실 1"}` · 담당 `career_kim`.
   - 추가 `req_013`: 정유진 · 컴퓨터공학과 4학년 · `studentId "201965432"` · 진로취업 · **확정** · 대면 · 주제 "면접 준비 및 자기소개서 피드백" · `requestedAt "2026-07-10T16:00:00+09:00"` · slot `{date "2026-07-10", start "16:00", end "16:40", place "진로취업지원센터 상담실 2"}` · 담당 `career_kim`.
2. 신청 시간 셀 상대시간 라벨 (파생 함수, 아래 데이터 스키마).
3. 사이드바 "오늘의 상담 현황" 카드 (counsel 섹션 한정 노출).
4. GNB 알림벨 뱃지 (대기 건수 파생, 0이면 숨김).
5. Layout 푸터 (연도 파생).

그 외(캘린더·탭·테이블·CSV·SlotForm·재배정) **전부 현행 유지 — 손대지 않는다.**

## 데이터 스키마 (JSON 동적 — 하드코딩 금지)

**단일 소스는 전부 기존 자산 — 새 스키마·새 JSON 파일 만들지 않는다.**

- 스키마: `src_admin/data/schema/counselRequest.ts` (변경 불필요)

```ts
export type CounselRequestType = '진로취업' | '심리'
export type CounselRequestStatus = '대기' | '확정' | '완료' | '취소'   // 이미지 4상태와 1:1
export type CounselMethod = '대면' | '비대면'

export interface CounselRequest {
  id: string
  studentId: string          // 학번 또는 src_v2 로스터 id (이미지 행 학생은 데모 학번-id 허용, 기존 컨벤션)
  studentName: string
  studentMajor: string       // "경영학과 3학년" 처럼 학년 포함 스냅샷
  type: CounselRequestType
  status: CounselRequestStatus
  method: CounselMethod
  topic: string
  requestedAt: string        // ISO 8601 — 상대시간·캘린더 날짜의 원천
  slot?: CounselSlot         // 확정/완료 시 { date, start, end, place? }
  assignedCounselorId?: string  // 접수함 필터 키 (counselors.ts Counselor.id)
}
```

- JSON: `src_admin/data/counselRequests.seed.json` (배열 — 위 "구현 범위 1"의 교정·보강만)

```json
{
  "id": "req_009",
  "studentId": "202112345",
  "studentName": "이수현",
  "studentMajor": "경영학과 3학년",
  "type": "진로취업",
  "status": "대기",
  "method": "대면",
  "topic": "진로 방향 설정 및 취업 준비 전략",
  "requestedAt": "2026-07-10T09:30:00+09:00",
  "assignedCounselorId": "career_kim"
}
```

- 로더/구독: `src_admin/data/counselRequests.ts` — localStorage `dc_counsel_requests` 우선, 없으면 seed 폴백 (Counsel_README §7: 학생 SPA가 이 키에 신청을 쓰고 상담사가 읽는 공유 스토어). 상태 전이는 `confirmRequest`/`rejectRequest`/`rescheduleRequest`/`completeRequest`/`reassignRequest` → persist 후 reload. **화면은 이 로더만 구독하고 리터럴을 박지 않는다.**

**파생값 목록 (전부 `getRequestsByAssignee(getActiveCounselor().id)` 한 배열에서 파생 — 하나라도 하드코딩이면 리젝):**

| 파생값 | 계산 | 위치 |
|---|---|---|
| 상태 필터탭 카운트(전체/대기/확정/완료/취소) | 상태별 count | 기존 `counts` useMemo — 유지 |
| 캘린더 날짜별 건수 뱃지 | `slot?.date ?? requestedAt 날짜` 기준 그룹 count | 기존 `dateCounts` — 유지 |
| 캘린더 초기 선택일·월 | 최다 신청일 파생 | 기존 `initialKey` — 유지 |
| 선택일 목록·"N건" 뱃지·"총 N건" | 날짜+탭 필터 결과 | 기존 `list` — 유지 |
| 신청 시간 상대 라벨 | **[신규]** `formatRelativeTime(requestedAt)` — 60분 미만 "N분 전", 24시간 미만 "N시간 전", 이후 "N일 전" (+"신청" 접미) | `counselRequests.ts`에 순수 함수 추가 |
| 오늘의 상담 현황 4수치 | **[신규]** `getTodaySummary(counselorId, today = 오늘)` → `{ total(전체 건수), todaySessions(오늘 slot 확정+완료), completed(완료), cancelled(취소) }` | `counselRequests.ts`에 셀렉터 추가 |
| 알림벨 뱃지 | **[신규]** `countPendingByAssignee(counselorId)` = 대기 건수 | `counselRequests.ts`에 셀렉터 추가 |
| CSV 다운로드 행 | 선택일 목록 매핑 | 기존 `downloadCsv` — 유지 |
| 푸터 연도 | `new Date().getFullYear()` | Layout |

## 디자인 레이어

- base: `DESIGN.md` (BMW-inspired 공통 기반 — 간격·위계 감각만)
- 역할 레이어: **`src_admin/index.css`** (admin 디자인 단일소스 — 헤더 주석대로 `src_admin/design.md`와 1:1 동기화). `design_counsel.md`는 미생성이므로 index.css의 `:root` 토큰이 진실.
- **쓸 토큰 (이 안에서만 — 새 색·새 폰트·새 radius 발명 금지):**
  - 색: `--color-primary`(#0653B6) · `--color-primary-bg` · `--color-primary-light` · `--color-page-bg` · `--color-bg` · `--color-border` · `--color-divider` · `--color-title` · `--color-text` · `--color-text-secondary` · `--color-caption` · `--color-success` · `--color-warning` · `--color-danger`
  - radius: `--radius-xs/sm/md/lg/pill` · 그림자: `--shadow-sm/md` · 폰트: `--font`(Pretendard/Noto Sans KR)
- 기존 컴포넌트 클래스 재사용(이미 `index.css` 1398행~ "상담 신청 접수함" 블록에 존재): `counsel-status-tabs` · `counsel-requests-layout` · `counsel-calendar-card` · `counsel-request-table-card` · `counsel-status-badge.is-waiting/.is-confirmed/.is-complete/.is-cancelled` · `counsel-type-badge(.is-psych)` · `counsel-outline-btn` · `counsel-primary-btn` 등.
- 신규 요소(현황 카드·상대시간 라벨·벨 뱃지·푸터)도 위 토큰과 기존 뱃지·카드 문법을 따른다. `frontend-design`은 **craft(간격·위계·모션·디테일)만** — 팔레트·폰트·토큰 생성 금지. drift = 결함.

## 검증 (Codex 완료 기준)

- `npx tsc --noEmit` 통과.
- 김진로(진로취업상담사) 접수함: 심리상담 행 0건. 데모 전환→이마음(심리상담사): 김지연 행 노출(심리상담 뱃지).
- 화면·GNB·사이드바 카드의 모든 숫자가 seed JSON 수정만으로 함께 변한다(리터럴 0개).
- localStorage `dc_counsel_requests`·`dc_active_counselor` 초기화 후에도 seed 폴백으로 정상 렌더.
