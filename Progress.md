# Progress.md — 구현 이력 · 설계 결정 · 버그 수정

> **이 문서는 "무엇을 왜 그렇게 만들었나"만 담는다.**
> *무엇이 필요하고 지금 어디까지 됐나*는 **`SPEC.md` §3**이 단일 소스다 — 여기에 격차 목록을 다시 적지 않는다.
> DB 구조·이관 전제·미결 대장은 **`DB.md`**.

---

## 작업 기록

### C1 검사 현황 — 완료 <span>(2026-07-31)</span>

**경로** `/admin/students/diagnostics` (학생 관리 > 검사 현황) · 상담사 2종(career·psych) 공통

| 파일 | 역할 |
|---|---|
| `src_v2/data/careerProcess.ts` | **+`DIAGNOSIS_BY_GRADE`·`getGradeTests()`** — 학년별 응시 대상 검사(정책 단일소스). 기존 `DIAGNOSIS_MODULES` 옆에 둠 |
| `src_admin/data/schema/diagnosisAttempt.ts` | 신규 — 응시(`DiagnosisAttempt`) · 코멘트(`DiagnosisComment`) · 권유(`DiagnosisNudge`) |
| `src_admin/data/diagnosisAttempts.seed.json` | 신규 — 응시 이벤트 235건(결정적 생성. 결과 요약은 학생 단일소스 값에서 파생) |
| `src_admin/data/diagnosisAttempts.ts` | 신규 로더 — `dc_diag_attempts`/`dc_diag_comments`/`dc_diag_nudges` 오버레이 + 페이징 조회 + 집계 |
| `src_admin/pages/DiagnosisStatus.tsx` | 신규 화면 |
| `src_admin/{App,components/navConfig,index}.*` | 라우트·네비·스타일 배선 |

**설계 결정**
- **'미응시'는 저장하지 않는다.** (담당 학생 × 학년별 대상검사) 곱집합에서 응시 레코드를 뺀 나머지를 로더가 파생 → 로스터가 늘어도 seed 재생성 불필요.
- **응시 시점 스냅샷**(학번·이름·학과·학년)을 응시 레코드에 함께 저장 — 현행 `EP_PRM_APP` 패턴 계승. 학적 변동 후에도 당시 소속으로 집계 재현.
- **코멘트·권유는 append-only.** 수정·삭제 없이 최신 건만 노출.
- 현행 `CHECK_*`처럼 상담 건(`COUNSELIDX`)에 종속시키지 않음 — 학생 단독 응시 구조.
- 재검사는 회차(`attemptNo`)로 표현하고 표에는 최신 회차만 노출.

**검증** — `tsc -b` 통과 · `vite build` 통과 · 파생 행렬 정합성(114명 × 학년별 검사 = 316행, 중복 0, 학년정책 밖 seed 0, 미응시 81/진행중 36/완료 199) 확인.

> ⚠️ **부수 수정** — `src_admin/data/advisorAssigns.ts`의 `getAdvisorRosterForExport` 파라미터 타입에
> `page`/`pageSize`가 빠져 있어 **`tsc -b`가 이미 깨져 있었다**(직전 커밋 86bd60a부터, `AssistantAdvisor.tsx:84`).
> 빌드 검증이 막혀 타입만 `ListParams &`로 넓혀 고쳤다. 동작 변경 없음.

### C3 상담 통계 — 완료 <span>(2026-07-31)</span>

**경로** `/admin/counsel/stats` (상담 관리 > 상담 통계) · 상담사 2종 공통

| 파일 | 역할 |
|---|---|
| `src_admin/data/counselStats.ts` | 신규 **집계 층** — `getCounselStats(params)` · `toStatsCsv(stats)` |
| `src_admin/pages/CounselStats.tsx` | 신규 화면 (그리기만) |
| `src_admin/{App,components/navConfig,index}.*` | 라우트·네비·스타일 배선 |

**표시** — 요약 5지표(신청·완료·취소·평균 소요일·기록지 작성률) · 월별 추이(신청/완료 2계열) · 유형별 · 방식별 · 학년별 · 학과별 상위 10 · CSV 내려받기
**필터** — 범위(내 상담 / 전체 상담사) · 기간(3·6·12개월 / 전체)

**설계 결정**
- **집계는 전부 `counselStats.ts`에서 한다. 화면은 계산하지 않는다** (SPEC §3-1-⑥ 소스 규정). DB 전환 시 각 함수가 집계 SQL 1개로 1:1 치환된다.
- **완료율·취소율의 모수는 "기간 내 신청 건"**이다. `dc_counsel_records`(완료 기록)만으로는 취소가 보이지 않아 분모가 왜곡된다 → 신청 스토어를 기준으로 잡았다.
- 월별 축은 **상담일이 아니라 신청일**. 빈 달도 0으로 채워 추이가 끊기지 않게 한다.
- 학년은 신청 레코드에 없어 `studentLiteOf(studentId)`로 조인. 미매칭은 `미상`.
- CSV 문자열 조립도 화면이 아니라 집계 층(`toStatsCsv`)에서 한다.

**검증** — `tsc -b` · `vite build` · `eslint` 통과(신규 5파일 무결점).

> 🔴 **미결 — 상담 seed 표본이 얇다.** 현재 상담 신청 단일소스(`counselSeedStudents.json` + 상세 학생 2명)에
> **신청 13건 · 완료 2건 · 취소 0건**밖에 없고 기간도 2026-06-25~07-10 2주뿐이다.
> 화면·집계는 정상 동작하지만 **취소율이 항상 0%, 월별 추이가 2개월**이라 통계로서 보여줄 것이 없다.
> → 상담 신청 seed 확충 여부는 **접수함·일정·완료내역 화면의 표시량을 함께 바꾸므로** 별도 판단이 필요하다.

### C5·C6·C7·C9·C10 — 완료 <span>(2026-07-31)</span>

| 항목 | 경로 | 신규 파일 |
|---|---|---|
| **C5** 재배정 이력·취소 사유 | (기존 접수함 내) | `schema/counselEvent.ts` · `counselEvents.ts` |
| **C6** 집단상담 | `/admin/counsel/groups` | `schema/groupCounsel.ts` · `groupCounsels.ts` · `groupCounsels.seed.json` · `pages/GroupCounsels.tsx` |
| **C7** 심리검사 결과 | `/admin/counsel/psych-tests` <span>(psych 전용)</span> | `schema/psychTest.ts` · `psychTests.ts` · `pages/PsychTests.tsx` |
| **C9** 학생 검색 피커 | (모달) | `components/StudentPicker.tsx` |
| **C10** 상담일지 인쇄 | `/admin/counsel/records/:id/print` | `pages/CounselRecordPrint.tsx` |

**C5 — 재배정은 동작이 이미 있었고 이력이 없었다.**
`reassignRequest`가 `assignedCounselorId`만 갈아끼워 **현행과 똑같이 흔적이 남지 않았다**(현행 `CoMcReAssing`도 `CONSULTID`만 변경, 이력 없음).
→ append-only `dc_counsel_events` 신설. 확정·일정변경·재배정·취소·완료 **5개 전이가 모두 이벤트를 남긴다.**
→ **취소는 사유 필수**로 바꿨다(SPEC §3-1-②). 기존에는 버튼 한 번에 즉시 취소됐다.
→ 상세 모달에 **처리 이력** 섹션 추가. 이것이 CLAUDE.md가 "현행에 없어서 우리가 신설하는 것"으로 적어둔 **상태 변경 이력**이다.

**C6 — 1:N 도메인을 1:1과 분리했다.**
집단상담을 `CounselRequest`에 넣지 않았다 — 접수함·상담 통계 모수에 섞이면 **실적이 이중 계상**된다(현행도 별도 화면).
참여자에는 추가 시점 스냅샷을 저장하고, 정원 초과·중복·상태 위반은 로더에서 거부한다(FK 없는 DB 전제 — 정합성은 애플리케이션 전담).
역할이 유형을 결정한다: 진로 → 집단상담 / 심리 → 집단심리검사.

**C7 — 진단 4종과 다른 도메인이다.**
현행 분석(`05_answers.md` Q9)대로 **심리검사는 상담 신청 절차 안에서만** 이뤄지고 **문항·채점 로직이 시스템에 없다**(외부 도구 결과를 상담사가 입력).
→ 대상 목록을 심리상담 신청(확정·완료)에서 파생. 별도 seed 없음.
→ 척도를 고정 컬럼이 아니라 **자유 배열**로 받는다. 우리가 채점하지 않으므로 특정 검사도구에 스키마가 종속되면 안 된다.
→ 검사 종류는 SPEC §7-0 코드 규약(code·label·legacy·active)을 따랐고, **`TRIALTYPE` 실제 코드값은 미확인이라 `legacy: null`** 로 두고 주석에 남겼다.

**C9 — 지적하신 대로 `StudentList`가 대체한다.**
현행 `CoSs010L`(학생검색 화면)은 우리 `/students`가 이미 커버한다. 남은 건 `CoStuInfoPop` — **다른 화면에서 학생을 고르는 팝업**이라 `StudentPicker` 컴포넌트로만 만들고 C6에서 쓴다. 조회는 학생 로스터 단일소스를 그대로 쓴다.

**C10** — 레이아웃(GNB·사이드바) **밖** 라우트로 두어 화면 그대로가 인쇄물이 된다. 학생·상담 정보 표 + 소견 + 코멘트 + 후속조치 + **처리 이력(C5)** + 서명란. `@media print`로 툴바를 감추고 A4 여백을 지정한다.

**검증** — `vite build` 통과 · `eslint` 신규 10파일 무결점.

> 🔴 **`tsc -b`가 다른 작업 때문에 깨져 있다.** 교수 화면 4개(`ProfessorCounselRequests/Records/Schedule/Profile`)와
> `src_v2/data/counselRequestsWrite.ts` · `src_v2/pages/counsel/ProfessorCounsel.tsx`에 타입 오류 10건이 있다.
> **내가 만지지 않은 파일들**이라 손대지 않았다. 타입체크 통과가 필요하면 그쪽 작업이 마무리돼야 한다.

### 버그 수정 — 학생이 낸 상담 신청이 접수함에 안 보임 <span>(2026-07-31)</span>

**증상** 학생 화면에서 상담을 신청해도 상담사 접수함에 건이 나타나지 않음.

**원인** 데이터는 정상 저장되고 있었다. 접수함은 **선택한 하루치만** 목록에 그리는데, 그 기본 표시일이
*"신청이 가장 많은 날"* 로 계산됐다. seed 신청 6건이 `2026-07-10`에 몰려 있어 화면은 늘 그 날짜를 열었고,
학생 예약 캘린더는 **오늘이 속한 주**(예: 07-27~07-31)만 고를 수 있어 **두 날짜가 절대 만나지 않았다.**
(상태 탭 카운트는 날짜 필터 전 값이라 `대기` 숫자만 늘어나 있었다.)

**수정** 기준일 규칙을 **오늘 → 가장 가까운 예정일 → 가장 최근 지난 날** 로 교체.
규칙을 `counselRequests.pickReferenceDate()` 하나로 모으고 접수함과 홈 대시보드(`getTodaySummary`)가 함께 쓴다
— 대시보드도 같은 휴리스틱이라 같은 이유로 새 신청을 놓치고 있었다.

**검증** 6개 시나리오(seed만 / 오늘 신청 / 이번주 과거 신청 / 미래 신청 / 오늘+미래 / 신청 0건) 전부 기대값 일치.

> ⚠️ **같은 계열의 남은 함정** — 학생 상담신청 화면은 상담사 4명 중 아무나 고를 수 있는데,
> 관리자 로그인은 역할만 고르면 **그 역할의 첫 번째 상담사**(진로=김진로 / 심리=이마음)로 고정된다.
> 학생이 박서준·최민수·강민우를 고르면 김진로 접수함에는 뜨지 않는다. GNB 계정 전환으로 해당 상담사로
> 바꾸면 보인다. 로그인 시 상담사를 직접 고르게 할지는 판단 필요.

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-07-31 | 최초 작성 — 현행 사이트맵 전수 대조, 역할별 격차 목록화 |
| 2026-07-31 | 상담사 C1 검사 현황 · C3 상담 통계 구현 |
| 2026-07-31 | 상담사 C5 재배정 이력 · C6 집단상담 · C7 심리검사 결과 · C9 학생 피커 · C10 상담일지 인쇄 구현 |
| 2026-07-31 | 버그 수정 — 접수함 기본 표시일 규칙 교체(학생 신청이 접수함에 안 보이던 문제) |
