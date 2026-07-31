# Progress.md — 현행 사이트맵 대비 구현 격차 · 진행 관리

> **작성 2026-07-31.** 현행 드림캐치 사이트맵(`docs/_analysis/01_sitemap.md`, 매핑 1,600 / 화면 847)과
> 우리 두 SPA(`src_v2` 학생 · `src_admin` 교직원)의 **실제 라우팅된 화면**을 역할별로 대조한 결과.
>
> **판정 기준**
> - 현행 역할 귀속은 URL 네임스페이스·컨트롤러 주석 기반 **추정**이다. 실제 노출은 `SY_MENU_AUTH`(DB) 판정.
> - 우리 쪽은 `src_v2/App.tsx` · `src_admin/App.tsx`에 **라우팅된 것만** 구현으로 센다.
>   파일만 있고 참조가 없는 것은 §0 고아로 분류.
> - 관련 문서: 화면 명세 `SPEC.md` §3 · DB 근거 `DB.md` · 데이터 원칙 `CLAUDE.md`

**상태 표기** — `[ ]` 미착수 / `[~]` 진행중 / `[x]` 완료 / `[?]` 결정 필요 / `[-]` 스코프 제외

---

## 커버율 요약

| 역할 | 현행 화면 | 우리 라우트 | 커버율 | 진행 |
|---|---|---|---|---|
| 조교 | 7 | 3 + 1 NotReady | ~55% | |
| **상담사** | 29 | 9 | ~30% | **← 작업 중** |
| 학생 | 약 200 | 27 | ~15% | |
| 교수 | 33 | 1 + 4 NotReady | ~5% | |
| 비교과 운영자 | 30 | 0 (career 겸함) | — | 역할 신설 여부 미정 |
| 슈퍼관리자 | 315 | 0 | 0% | SPA 없음 |
| 직원·기업·멘토·지역청년 | 약 87 | 0 | 0% | 스코프 미정 |

**작업 순서** — ② 상담사 → ③ 조교 → ④ 교수 → ⑤ 관리자·기타

---

## 0. 고아 파일 — 만들어 두고 라우팅이 안 된 것

신규 구현이 아니라 **배선만 하면 되는 건**. 우선 처리 대상.

- [ ] `src_v2/pages/diagnosis/DiagnosisCenter.tsx` — 참조 0건. **진단검사 응시 화면이 없다** (C-2/C-3/C-4 "검사시작"이 갈 곳 없음)
- [ ] `src_v2/pages/diagnosis/PersonalityTest.tsx` — 참조 0건. 문항 응시 UI 미연결
- [ ] `src_v2/pages/competency/CompetencyCenter.tsx` — 참조 0건. **역량 화면이 통째로 없다** (현행 `CaMsSs010D`·`CaMsDm010L`)
- [ ] `src_v2/components/GrowthSidebar.tsx` — 참조 0건

---

## 1. 학생 <span>(현행 약 200 / 우리 27)</span>

### A. 상담

| | 항목 | 현행 | 비고 |
|---|---|---|---|
| [ ] | S1 **상담 취소 · 취소사유** | `CoMsCancelPop`·`CoMsCancelViewPop` | SPEC §3-1-②에 "취소 사유 필수"인데 학생측 취소 경로 없음 |
| [ ] | S2 **검사 신청** | `CoVi020M` | 상담과 별개 트랙인 심리검사 단독 신청 |
| [ ] | S3 상담내역 인쇄 | `CoMs010Print` | |
| [ ] | S4 지도교수 **온라인 상담**(게시판형) | `CoMs020L`·`030L`·`040L` | `/counsel/professor`는 신청만. 현행은 온·오프라인 2트랙 |

### B. 진단 · 역량

| | 항목 | 현행 | 비고 |
|---|---|---|---|
| [ ] | S5 **역량진단 응시·결과** | `CaMsDm010L`·`010R` | §0 고아 파일 존재 |
| [ ] | S6 **학생별 역량현황** | `CaMsSs010D` | 5역량 축. 조교 A1 · 교수 P9와 **같은 데이터** → 1컴포넌트 3역할 공유 |
| [ ] | S7 **핵심역량 시뮬레이션** | `CaMsEp010D`·`010V` | "이 프로그램 이수 시 역량 +N" — 우리 로드맵과 직결 |
| [ ] | S8 핵심역량 로드맵 | `ExCm010L`·`010D` | |

### C. 비교과

| | 항목 | 현행 | 비고 |
|---|---|---|---|
| [ ] | S9 **그룹형(팀) 신청** | `extMyGroup`·`group_app_popup`·`EpMp010DL` | 현행 개인형/그룹형 2종, 우리는 개인형만 |
| [ ] | S10 **차수(회차) 선택** | `extStep` | `EP_PRM_STEP` |
| [ ] | S11 **만족도조사 응답** | `EpMs040L`·`040D` | 종료 후 설문 |
| [ ] | S12 **참여후기 게시판** | `/user/poss/pgmPoss*` | |
| [ ] | S13 참여 활동내역 | `EpActivePopup` | 관심(찜)은 `wishlist.ts` 구현됨 |

### D. 취업

| | 항목 | 현행 | 비고 |
|---|---|---|---|
| [ ] | S14 **채용 지원 프로세스** | `ReAppD`·`ReAgree`(개인정보동의) | `APPLICATIONMASTER` 1.7만건 이관 대상. **현재 공고 열람만 가능** |
| [ ] | S15 **MY추천채용** | `ReMs010D`·`MsRd010L` | 추천 공고 + 지원현황 |
| [ ] | S16 채용 카테고리 8종 | 추천/일반/공공기관/인턴십/공모전/교육·박람회/아르바이트/해외취업 | 우리는 단일 목록 `/jobs` |
| [ ] | S17 **이력서·자소서 첨삭 요청** | `portfolio_resume`·`portfolio_selfHistory` | `SS_JOB_RES` 워크플로 계승 → 상담사 C2와 짝 |
| [ ] | S18 진로취업카드 | `SsMsRs010M` + 인쇄 | |
| [ ] | S19 취업수기 | `IpBd010L/I/D` | |

### E. 포트폴리오 세부 <span>(현행 18화면 → 우리 1화면)</span>

- [ ] S20 자기성찰 `introspection`
- [ ] S21 교과 이수·선후수 조회 `study_courses`·`coursesSunAfterSearch`
- [ ] S22 장학·수상 이력 `study_scholarship`
- [ ] S23 상담이력 연동 `activity_counsel`
- [ ] S24 비교과 참여이력 + 성찰 `extState`·`extStateThkl`

### F. 진로설계 <span>(이관 대상 1.4만건인데 화면 없음)</span>

- [ ] S25 진로목표 설정 `FuAp050L`
- [ ] S26 진로설계서 3단계(교과/비교과 학습계획) `MyCuStep3_Pop`·`Pop2`
- [ ] S27 워크넷 검사결과 `FuAp0*`

### G. 공통 인프라

- [ ] S28 공지·게시판 `Bd`
- [ ] S29 센터안내 `Ki`
- [ ] S30 알림·푸시 수신함 (현행은 발신 `EpPushSend`·`PcPushSend`만 확인)
- [ ] S31 약관·개인정보 동의 `SY_AGREE`

### H. 결정 필요

- [?] S32 **마일리지**(`Ex` 11화면) — 이관 제외 확정. 화면을 퀘스트·레벨로 대체할지 없앨지 미정
- [?] S33 **멘토·멘티**(`Mt` 8화면) — 스코프 포함 여부

---

## 2. 상담사 <span>(현행 29 / 우리 9)</span> ← **작업 중**

### SPEC §3-1에 명세되어 있으나 미구현

| | 항목 | 근거 | 비고 |
|---|---|---|---|
| [x] | **C1 검사 현황** | SPEC §3-1-④ | `/students/diagnostics` — 검사별 응시율 카드 + 학생×검사 표 + 검사 권유 + 결과 코멘트. 상세는 아래 |
| [ ] | **C2 학생 포트폴리오 관리(첨삭)** | SPEC §3-1-⑤ | 현행 `SS_JOB_RES` 첨삭 워크플로 계승. **3역할 공용**(상담사/조교/운영자) |
| [x] | **C3 상담 통계** | SPEC §3-1-⑥ | `/counsel/stats` — 요약 5지표 + 월별 추이 + 유형·방식·학년·학과별 + CSV. C8 흡수. ⚠️ seed 표본 얇음(아래) |
| [ ] | **C4 상담 제한일정 재설계** | SPEC §3-1-⑦ | 現 `SettingsAvailability`는 "가능" 등록 → **"제한(불가)" 등록**으로 전환 |

### 현행에 있으나 SPEC에도 없던 것

| | 항목 | 현행 | 비고 |
|---|---|---|---|
| [x] | C5 **재배정 이력·사유** | `CoMcReAssing` | 재배정 **동작은 이미 있었고 이력이 없었다**. `dc_counsel_events` 신설 + 취소 사유 필수화 |
| [x] | C6 **집단상담 관리** | `CoMc050L`(일반)·`CoMc060L`(심리검사) | `/counsel/groups` — 회차 개설·참여자·출석·완료·취소 |
| [x] | C7 **심리검사 결과 작성** | `CoMc010TrialConWrite`·`CoSimriResultWrite` | `/counsel/psych-tests` — 심리 상담사 전용 |
| [x] | C8 통계 6종 | `CoMc040L`·`070L`·`080L/P`·`084P`·`085P`·`090L` | C3에 흡수 완료 |
| [x] | C9 학생 검색 | `CoSs010L`·`CoStuInfoPop` | **단독 화면은 `StudentList`가 대체.** 팝업 피커만 `StudentPicker` 컴포넌트로 신설 |
| [x] | C10 상담일지 인쇄 | `CoMs010Print`·`pop_adminConsultingInfoPrint` | `/counsel/records/:id/print` — 레이아웃 밖 A4 인쇄면 |

### C11. 기록지 필드 누락 <span>(SPEC §3-1-② 주석)</span>

`src_admin/data/schema/counselRecord.ts`에 아래가 없다.

- [x] 취소사유 · 취소자 · 취소일시 (`CANCELREASON`/`CANCELUSERID`/`CANCELDATE`) → **C5에서 `dc_counsel_events`로 해결.** 3컬럼 덮어쓰기가 아니라 이벤트 이력
- [x] 재배정 이력 (`ASSIGN_YN`/`ASSIGN_ID`) — 현행은 최종값만, 우리는 이력으로 → **C5 완료**
- [ ] **학생 공개 여부** (`STUD_OTP_YN`) — 기록지 어느 부분을 학생에게 보일지 (심리검사 결과에는 C7에서 적용됨, 상담 기록지는 미적용)
- [ ] **진로↔심리 연계 발송·접수** (`LINK_YN`/`LINK_TYPE`/`LINK_RCT_YN`/`LINK_RCT_TYPE`)
- [ ] 상담 전 진단 4문항 (`MAJOR_YN`/`COURS_YN`/`EMPLO_YN`/`REASON_YN`)
- [ ] 첨부 작성 플래그 (`CON_ADD1~4`)
- [ ] 가족관계(`COUNSEL_FAM`) · 문제유형 다중선택(`COUNSEL_PROBLEM`) — 심리상담

---

## 3. 조교 <span>(현행 7 / 우리 3 + 1 NotReady)</span>

- [ ] **A1 학생별 역량현황** `CoAs030L`·`CoAs040L` — **현행 조교 5화면 중 2개가 이것.** 학생 S6 · 교수 P9와 동일 컴포넌트
- [ ] **A2 학생 포트폴리오**(`TYPE=A`) — 상담사 C2와 **같은 컴포넌트 + 역할 prop** (SPEC §3-2-④)
- [?] A3 학과 추천기업 관리 — 現 `NotReady`. 우리 신설 항목, 현행 대응 없음
- [?] A4 진로목표 현황 · 취업통계 (`Fu`·`St` 조교 접근) — SPEC에서 "보류"

---

## 4. 교수 <span>(현행 33 / 우리 1 + 4 NotReady)</span>

**커버율 최저.** 현행 `CON_PROF_INFO` **18.4만건** — 이 시스템에서 가장 많이 쓰이는 기능.

| | 항목 | 현행 | 현재 |
|---|---|---|---|
| [ ] | P1 **상담 기록 작성** | `PcMp010M`/`PcMa010M` | `NotReady` |
| [ ] | P2 **상담 신청 접수** | — | `NotReady` |
| [ ] | P3 **상담 제한일정** | `PcMp030L`·`040L`·`CoMp040MonthL` | `NotReady` · ⚠️ 슬롯이 **상담사와 같은 `BASICSETTING`** |
| [ ] | P4 **상담 노출 설정** | 신설(`CO_PROF` 0행) | `NotReady` |
| [ ] | P5 **온라인 상담**(게시판형) | `PcMpOnlineL`·`onlineConProf`·`pop_onlineProfCont` | 학생 S4와 짝 |
| [ ] | P6 **오프라인 상담 일괄등록** | `pop_offLineProfContDirNew` | 2025-04 신설된 현행 최신 기능 |
| [ ] | P7 집단상담 작성 | `pop_PcMp010M` | |
| [ ] | P8 상담내역 목록·상세·인쇄 | `PcMp020L`·`020D`·`010D_Print` | |
| [ ] | P9 **학생별 역량현황** | `CaMpSs010L`·`010D` | 학생 S6 · 조교 A1과 동일 데이터 |
| [ ] | P10 역량진단 관리(교수) | `CaMp010L`·`CaMpDm010P` | |
| [ ] | P11 학생별 진로목표 현황·상세 | `FuAp050A`·`050D` | |
| [ ] | P12 푸시 전송 | `PcPushSend` | |
| [?] | P13 `PcMa*` vs `PcMp*` 2계열 | — | **담당교수/지도교수 구분 여부 확인 필요** |

---

## 5. 역할 자체가 없는 것

### 5-1. 비교과 운영자 <span>(현행 30)</span>

현재 진로상담사(`career`)가 겸한다. 현행은 별도 역할(`Mn`)이며 `EP_PRM.REGID = 세션ID`로 **본인 등록 프로그램만** 본다.

- [?] N0 **역할 신설 여부** — 겸한다면 "본인 등록 프로그램만" 범위 규칙을 어떻게 할지
- [ ] N1 그룹형 등록
- [ ] N2 차수 관리 `extStep*`
- [ ] N3 선발그룹 관리 `extGroupBindMng`·`extGroupMake`
- [ ] N4 외부인 관리 `EpTb050D` + 엑셀업로드
- [ ] N5 만족도조사 관리 `EpMn050*` (학생 S11과 짝)
- [ ] N6 결과보고서 `EpTb060D`
- [ ] N7 참가대상 설정 — 부서 `EpMnselectPrmTrgtDept` / 국적 `EpMnsearchNat`
- [ ] N8 달력·월력 뷰 `EpMnCalendar`·`EpMnSchedule`
- [ ] N9 푸시 발송 `EpPushSend`

### 5-2. 슈퍼관리자 <span>(현행 315)</span> — **SPA 자체가 없음**

SPEC §3-4에서 **1순위**로 잡아둔 것이 전부 미구현.

- [ ] M1 **조교/교수 학과 배정** — SPEC §3-4-① 상세 명세 있음. 🔴 현행 `Fu.assDeptList2` 버그(대학원 누락) 반복 금지
- [ ] M2 **권한관리** — 역할 목록 · 사용자별 역할 부여 · 권한 변경 이력
- [ ] M3 **상담사 관리** — `COM_CON_INF` 51컬럼. `CONPWD` 외부 상담사 자체 인증 전제
- [ ] M4 상담 현황(전체) · 전담교수 매칭 · 상담 제한일정
- [ ] M5 **공통코드 관리** `SY_CODE` — SPEC §7 코드 체계의 운영 화면
- [ ] M6 **열람 감사로그** (신설 — 현행에 없음)
- [ ] M7 데이터분석 6종 · 취업통계

### 5-3. 직원(교무·학사) <span>(현행 23)</span>

- [?] W1 장기결석·학사경고 명단 관리 `Wa010L` + 엑셀업로드
- [?] W2 취업통계 18화면 — 조사차수 · 예비/본조사 · 취업자현황 · KEDI · 프로그램별 취업률 · 졸업생 취업조사
- [?] W3 직원 상담 `CoEm*`

### 5-4. 스코프 미정

- [?] X1 기업 (13화면)
- [?] X2 멘토 (6화면)
- [?] X3 지역청년 (45화면) — `RegLoginSession` **세션 체계가 분리**돼 사실상 별도 사이트

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
