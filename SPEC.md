# SPEC.md — 역할별 화면·기능 명세 + 데이터 설계 원칙

> **이 문서의 용도**
> 새 세션에서 드림캐치 화면을 **React로 구현할 때 읽는 기준 문서**다.
> 화면 목록·기능·필드는 **현행 운영 시스템(JSP)에서 실측 확정**한 것이고, 구현 방식은 **우리 프로젝트 규약(React 19 + TS + Vite)** 이다.
>
> - **무엇을 만들지** → §3 화면 명세
> - **누가 무엇을 볼 수 있는지** → §2 데이터 접근 범위
> - **어떻게 만들지** → §4 React 구현 규약
> - **필드명·상태값을 무엇으로 쓸지** → §6 필드 사전 · §7 코드 체계 ← **일관성의 핵심**
> - **대학원생이 왜 안 보이는지** → §8-1 (관문이 두 겹이다)
> - **왜 그런지 (근거)** → `DB.md`, `docs/DB_CURRENT.html`, `docs/_analysis/`
>
> ⚠️ **현행은 JSP다. 화면 레이아웃을 베끼지 않는다.** 가져오는 것은 **기능 목록·데이터 항목·상태 전이**이고, UI는 `DESIGN.md` 토큰으로 새로 만든다.

---

## 1. 로그인 유형 (역할)

현행 `SY_AUTH` 13개 중 실제 운영되는 것과 우리 구현 대응.

| 역할 | 현행 코드 | 현행 배정 | 판정 방식 | 우리 구현 위치 | 우선순위 |
|---|---|---|---|---|---|
| **학생** | `AUTH0001` | 0명 | **`USER_TY_CD`(학사 신분)로 자동** — 권한 부여 안 함 | `src_v2/` | 구현 중 |
| **상담사** | `AUTH0012` | **19명** | 명시 부여 | `src_admin/` | 구현 중 |
| **상담센터 총괄** | `AUTH0005` | 1명 | 명시 부여 | `src_admin/` | 2순위 |
| **조교** | `AUTH0002` | 2명 | **`USER_TY_CD`로 자동** + `FU_ASS_DEPT` 배정 | `src_admin/` (신규) | **1순위** |
| **교수(교원)** | `AUTH0003` | 1명 | **`USER_TY_CD`로 자동** | 신규 | 2순위 |
| **슈퍼관리자** | `AUTH0006` | 28명 | 명시 부여 | `src_admin/` | 2순위 |
| 교무과 학사관리과 | `AUTH0011` | 1명 | 명시 부여 | 보류 | — |
| 기업 담당자 | `AUTH0008` | 0명 | **SSO 밖 자체 인증**(`TB_CARR_USER_LOGIN`) | 보류 | — |

**핵심 규칙 — 역할 판정이 두 갈래다.**

```
학사 신분 기반 (자동)   학생 · 조교 · 교수 · 직원
  → V_USR_INF.USER_TY_CD 로 판정. 권한 테이블에 등록하지 않는다.
  → 현행 SY_AUTH.BASEGRUP_YN='Y' 가 이 뜻이다.

명시 부여 (수동)        상담사 · 관리자 · 기타 백오피스
  → SY_AUTH_USER 에 등록해야 화면에 들어온다.
```

> 상담사 역할이 두 개인 이유: `AUTH0012`(14메뉴)가 실무 상담사, `AUTH0005`(183메뉴)가 회원·시스템 관리까지 하는 총괄이다. **우리도 상담사 화면을 이 두 단계로 나눈다.**

> ⚠️ **정정 (2026-07-31 소스 확인).** 위 "현행 배정" 인원수는 `SY_AUTH_USER` 등록자 수인데, **이 테이블은 전체 권한자 명단이 아니다.** 학생·조교·교수·직원의 기본권한은 **코드가 자동 부여**하고(`PUtil.java:1002-1031`), 테이블에서 오는 것은 `AUTH0006`(슈퍼관리자) 등 추가권한뿐이다. 따라서 "조교 2명"은 조교가 2명이라는 뜻이 아니다. 전체 코드 대장은 **§7-1**.

---

## 2. 데이터 접근 범위 (행 수준) — 구현 필수

현행은 이 규칙이 도메인마다 흩어져 있다. **우리는 한 곳에서 판정한다.**

| 역할 | 볼 수 있는 학생 | 현행 근거 테이블 | 범위 단위 |
|---|---|---|---|
| 학생 | **본인만** | — | 개인 |
| 조교 | 담당 **학과 + 전공** 학생 | `FU_ASS_DEPT` (`DEPT_CD`+`MAJOR_CD`) | 학과·전공 |
| 교수 | 담당 학과 학생 + **지도학생** | `TB_CARR_PROF_ASSI_DEPT` · `CO_ADVISER` | 학과 / 개인 |
| 상담사 | 담당 **단과대** 학생 | `COM_CON_TAR` (`DAEHAK_CD`) | 단과대 |
| 상담센터 총괄 · 슈퍼관리자 | 전체 | — | 전체 |

### 구현 규약

```ts
// src_admin/data/accessScope.ts (신설)
export interface AccessScope {
  kind: 'self' | 'dept' | 'college' | 'advisee' | 'all'
  deptCodes?: string[]      // 조교·교수: (deptCode, majorCode) 쌍
  collegeCodes?: string[]   // 상담사: 단과대
  studentIds?: string[]     // 교수: 지도학생
}

/** 로그인 사용자 → 접근 범위. 모든 목록·상세 조회가 이 함수를 거친다. */
export function getAccessScope(user: SessionUser): AccessScope

/** 범위 적용된 학생 목록. 화면은 이 함수만 호출한다. */
export function queryStudents(scope: AccessScope, params: ListParams): Promise<Paginated<Student>>
```

**금지** — 화면 컴포넌트에서 전체 학생 배열을 받아 `filter`로 범위를 좁히는 것. 범위 판정은 반드시 데이터 층에서 끝낸다(DB 전환 시 `WHERE` 절이 되어야 함).

**필수** — 모든 학생 조회에 **학적상태 필터**를 건다. 현행 `V_USR_INF`는 113,733행이고 졸업생·퇴직자가 누적돼 있다. 필터 없으면 학과당 수십 년치 졸업생이 나온다.

---

## 3. 화면 명세

각 화면: **목적 → 표시 데이터 → 액션 → 데이터 소스**. 현행 경로는 근거 추적용이며 구현 시 참조하지 않는다.

### 3-1. 상담사 <span>(현행 활성 9개)</span>

| # | 화면 | 우리 구현 | 상태 |
|---|---|---|---|
| 1 | 마이홈 (대시보드) | `Home.tsx` | ✅ |
| 2 | 상담 현황 (접수·진행·완료) | `CounselRequests` + `CounselSession` + `CounselRecords` | ✅ |
| 3 | 상담 스케줄 (캘린더) | `CounselSchedule` | ✅ |
| 4 | **검사 현황** | — | ❌ **신규** |
| 5 | **학생 포트폴리오 관리** | — | ❌ **신규** |
| 6 | **상담 통계** | — | ❌ **신규** |
| 7 | **상담 제한일정 관리** | `SettingsAvailability` **재설계** | ⚠️ |
| 8 | 학생 관리 (목록·상세) | `StudentList` + `StudentDetail` | ✅ |
| 9 | 프로필 설정 | `SettingsProfile` | ✅ |

#### ① 마이홈 (대시보드)

| 항목 | 내용 |
|---|---|
| 목적 | 오늘 할 일과 담당 학생 요약을 한 화면에 |
| 표시 | 오늘 상담 일정 · 대기 중 신청 건수 · 담당 학생 수 · 트랙별 분포(집중관리/위험/표준/우수) · 미작성 기록지 수 |
| 액션 | 각 카드 → 해당 목록으로 이동 |
| 소스 | `counselRequests` · `counselRecords` · `queryStudents(scope)` 집계 |

#### ② 상담 현황

| 항목 | 내용 |
|---|---|
| 목적 | 신청 접수 → 확정 → 진행 → 기록 완료까지 한 흐름 |
| 표시 | 학번 · 이름 · 학과 · 학년 · **학적상태 배지** · **과정 배지(학부/석사/박사)** · 상담유형 · 방식(대면/비대면) · 주제 · 신청일시 · 상태 · 담당상담사 |
| 액션 | 확정(슬롯 지정) · **재배정**(다른 상담사 이관) · 취소(**사유 필수**) · 기록지 작성 · 완료 |
| 필터 | 상태 · 상담유형 · 학과 · 학년 · 학적상태 · 기간 · 검색(이름/학번) |
| 소스 | `dc_counsel_requests` · `dc_counsel_records` |

> **현행에서 가져올 누락 기능** — 현행 `COUNSEL_MASTER`에는 우리 화면에 없는 항목이 있다.
> - **취소 사유·취소자·취소일시** (`CANCELREASON`/`CANCELUSERID`/`CANCELDATE`) — 취소 시 사유 입력 필수
> - **학생 공개 여부** (`STUD_OTP_YN`) — 기록지의 어느 부분을 학생에게 보일지 토글
> - **재배정 이력** (`ASSIGN_YN`/`ASSIGN_ID`) — 현행은 최종값만 있고 이력이 없다 → **우리는 이력 테이블로**
> - **연계 발송/접수** (`LINK_YN`/`LINK_TYPE`/`LINK_RCT_YN`/`LINK_RCT_TYPE`) — 진로↔심리 상담 간 이송
> - **상담 전 진단 4문항** (`MAJOR_YN` 전공만족 / `COURS_YN` 진로목표 / `EMPLO_YN` 취업역량 / `REASON_YN` 취업동기) — 상담 시작 시 상담사가 체크
> - **첨부 작성 여부 플래그** (`CON_ADD1~4`: 첨부파일·이력서·희망사항·가족관계) — 학생이 무엇을 제출했는지 표시
> - **가족관계**(`COUNSEL_FAM`) · **문제유형 다중선택**(`COUNSEL_PROBLEM`) — 심리상담에서 사용

#### ③ 상담 스케줄

| 항목 | 내용 |
|---|---|
| 목적 | 본인 상담 일정 확인 + 예약 가능 시간 관리 |
| 표시 | 월/주 캘린더 · 확정 상담 · 제한(불가) 시간 · 집단상담 |
| 액션 | 슬롯 확정 · 일정 메모 · 제한일정 등록 |
| 소스 | `dc_counsel_requests.slot` · `dc_counsel_excluded` (신설, §3-1-⑦) |

#### ④ 검사 현황 <span>(신규)</span>

| 항목 | 내용 |
|---|---|
| 목적 | 담당 학생의 진단·심리검사 응시 현황과 결과를 상담 준비용으로 열람 |
| 표시 | 학생 · 검사명 · 응시일 · 상태(미응시/진행/완료) · 결과 요약 · 재검사 여부 |
| 액션 | 결과 상세 열기 · 검사 권유 발송 · 결과 코멘트 작성 |
| 소스 | 우리 진단 4종(C-2/C-3/C-4/C-CORE) + `dc_diag_attempt`·`dc_diag_result` |
| 참고 | 현행은 심리검사 8종(`CHECK_*`)이며 **PK가 `COUNSELIDX+USERID+IN_GUBUN`으로 상담 건에 종속**돼 있다. 우리는 학생 단독 응시가 가능한 구조로 신설한다 |

#### ⑤ 학생 포트폴리오 관리 <span>(신규 · 3역할 공용)</span>

| 항목 | 내용 |
|---|---|
| 목적 | 학생의 이력서·자소서·자격증·어학·프로젝트를 상담사가 열람하고 첨삭 |
| 표시 | 학생 · 제출 항목 목록 · 상태(미신청/신청/완료) · 요청사항 · 상담사 의견 · 답변일 |
| 액션 | **첨삭 의견 작성** · 상태 변경 · 반환 |
| 소스 | `dc_portfolio` · `dc_portfolio_item` |
| 참고 | 현행 `SS_JOB_RES`에 `STATUS`(미신청/신청/완료) · `CON_ID`(담당상담사) · `CONCONT`(상담사 의견) · `REQCONT`(학생 요청사항) · `RE_DATE`(답변일)로 **첨삭 워크플로가 이미 구현돼 있다.** 그대로 계승 |
| ★ | **현행은 같은 화면을 `TYPE` 파라미터로 3역할이 공유한다** (`TYPE=T` 상담사 / `TYPE=A` 조교 / `TYPE=M` 프로그램담당자). 우리도 한 컴포넌트 + 역할 prop으로 만든다 (§4-3) |

#### ⑥ 상담 통계 <span>(신규)</span>

| 항목 | 내용 |
|---|---|
| 목적 | 본인 상담 실적 집계 (총괄은 전체) |
| 표시 | 기간별 건수 · 유형별(진로/취업/심리) · 학과별 · 학년별 · 완료율 · 평균 소요일 · 취소율 |
| 액션 | 기간·범위 필터 · CSV 내려받기 |
| 소스 | `dc_counsel_records` 집계 (**화면에서 계산하지 않고 집계 함수 층에서**) |

#### ⑦ 상담 제한일정 관리 <span>(설계 변경)</span>

> **현행 방식을 채택할 것을 권한다.**
>
> | | 우리 현재 | 현행 |
> |---|---|---|
> | 방식 | **가능 시간을 등록** (`dc_availability`) | **제한(불가) 시간을 등록** (`TB_CARR_CNSL_EXCL_HR`) |
> | 기본값 | 전부 불가 | **전부 가능** |
> | 입력량 | 매주 반복 등록 필요 | 예외만 등록 |
>
> 현행 `BASICSETTING`이 **573,897행**까지 부푼 이유가 슬롯을 일자×시×분 행으로 전개했기 때문이다. **규칙 기반 + 예외 제외** 방식으로 가면 수백 행으로 줄고 상담사 입력 부담도 준다.

| 항목 | 내용 |
|---|---|
| 표시 | 기본 상담 가능 요일·시간대(규칙) · 제한 일정 목록(날짜/시간/사유) |
| 액션 | 기본 규칙 설정 · 제한 일정 추가·삭제 · 일괄(휴가 기간) |
| 소스 | `dc_counselor_rule`(요일 규칙) + `dc_counselor_excluded`(예외) |

---

### 3-2. 조교 <span>(현행 전용 5개)</span>

**조교의 본질: 담당 학과 학생 현황 조회 + 전담교수 배정 보조.** 기능이 적으므로 **기존 컴포넌트 재사용으로 대부분 해결한다.**

| # | 화면 | 우리 구현 | 신규 여부 |
|---|---|---|---|
| 1 | 담당 학과 학생 현황 | `StudentList` **+ 역할 prop** | 재사용 |
| 2 | 전담교수 배정 (조회) | 신규 (읽기 전용 목록) | 신규 |
| 3 | 전담교수 상담 실적 | 신규 (읽기 전용 집계) | 신규 |
| 4 | 학생 포트폴리오 (`TYPE=A`) | `Portfolio` **+ 역할 prop** | 재사용 |
| 5 | 취업통계 조사 | 보류 | — |

#### ① 담당 학과 학생 현황

| 항목 | 내용 |
|---|---|
| 목적 | 본인이 배정받은 학과·전공의 학생을 조회 |
| 표시 | 학번 · 이름 · 학과 · 전공 · 학년 · **과정(학부/석사/박사)** · 학적상태 · 진단 완료 여부 · 상담 이력 수 · 비교과 참여 수 |
| 액션 | 학생 상세 열기 (**읽기 전용** — 조교는 로드맵·IAP 수정 불가) |
| 필터 | 학과 · 전공 · 학년 · 학적상태 · 검색 |
| 소스 | `queryStudents(getAccessScope(user))` — 범위는 `FU_ASS_DEPT` 배정에서 파생 |
| ⚠️ | **배정이 삭제되면 즉시 안 보여야 한다.** 화면 진입 시마다 배정을 다시 읽고, 캐시하지 않는다 |

#### ② 전담교수 배정 (조회)

| 항목 | 내용 |
|---|---|
| 표시 | 학생 ↔ 지도교수 매핑 · 배정일 · 미배정 학생 목록 (탭: 전체/미배정/배정) |
| 액션 | **조교가 직접 확정 배정** — 미배정 행의 `[교수 배정]` 버튼 → 학생 학과의 교수 선택 |
| 소스 | `dc_advisor_assign` (현행 `CO_ADVISER`: `STU_NO`+`ADV_NO`) |
| ⚠️ | 확정형이므로 §3-4-① 감사 규칙을 **데이터층에서 강제**한다 — 학생당 active 1건 유일성 · append-only(해제는 `status` 전이) · `by`+`assignedAt` 기록 |

#### ③ 전담교수 상담 실적

| 항목 | 내용 |
|---|---|
| 표시 | 교수별 상담 건수 · 학생별 최근 상담일 · 미상담 학생 |
| 액션 | 독려 발송 (`dc_advisor_nudges` append) |
| 소스 | **`dc_prof_counsel_records`** — 교수상담 전용 단일소스 (현행 `CON_PROF_INFO` 대응) |
| ⚠️ | 상담사 상담(`dc_counsel_records`)과 **다른 도메인**이다. 현행도 `COUNSEL_MASTER`와 `CON_PROF_INFO`가 별도 테이블이므로 `CounselRequestType`(`진로취업`\|`심리`)에 '교수'를 추가하지 않는다 — 상담사 화면 필터·통계가 오염된다. 상담구분은 `SY_CODE` GRP `0131` 6종을 코드+라벨로 미러 |

---

### 3-3. 상담센터 총괄 <span>(상담사 화면 + 아래 추가)</span>

| 화면 | 목적 | 신규 |
|---|---|---|
| **상담사 관리** | 상담사 등록·수정·비활성. **내외부 구분** · 상담분야(진로/취업/클리닉) · 담당 단과대 · 상담 요일 · 장소 · 온라인 제한수 | 신규 |
| **조교학과 배정** | 학과 트리에서 조교 지정·해제 (§3-4-① 참조) | 신규 |
| **교수학과 배정** | 학과 트리에서 교수 지정·해제 | 신규 |
| 심리검사 현황 (전체) | 전 학생 검사 현황 | 신규 |
| 집단상담 / 집단심리검사 | 현행은 비활성(`X-`)이나 데이터 292건 존재 | 보류 |
| 상담 통계 (전체) | 전체 범위 집계 | 신규 |

> **상담사 관리 화면의 필드는 현행 `COM_CON_INF`(51컬럼)에서 가져온다.**
> `INOUT_GB`(내외부) · `CON_AREA1/2/3`(진로/취업/이력서클리닉) · `CON_TYPE1/2/3`(방문/온라인/클리닉) · `CON_W1~5`(월~금 가능) · `PLACE`+`PLACE_NUM`(건물/호수) · `LIMIT_GB`+`LIMIT_NUM`(온라인 제한) · `TARGET`(신청대상) · `STATUS`
> ⚠️ **`CONPWD`(자체 비밀번호)가 있다** — 외부 위촉 상담사는 SSO 밖 자체 인증을 쓴다. 신규 설계도 이 경로를 전제한다

---

### 3-4. 슈퍼관리자

현행 238메뉴 중 우리가 만들 영역만.

| 영역 | 화면 | 우선순위 |
|---|---|---|
| **회원관리** | 조교학과 배정 · 교수학과 배정 · 학생 포트폴리오 · 일반회원 관리 | **1순위** |
| **권한관리** | 역할 목록 · 사용자별 역할 부여 · 권한 변경 이력 | **1순위** |
| **비교과** | 프로그램 개설현황 · 프로그램 분류 관리 · 블랙리스트(벌점) · 참여후기 관리 | 구현 중 |
| **포인트·마일리지** | 지급 기준 · 승인 관리 · 학생별 현황 · 자격증 관리 | 2순위 |
| **채용** | 공고 관리 · 지원 현황 · 기업회원 관리 | 구현 중 |
| **데이터 분석** | 상담 · 비교과 · 마일리지 구간·순위 | 3순위 |
| **취업통계** | 취업조사 · 예비조사 · 조사 차수 관리 | 3순위 |
| **시스템** | 공통코드 · 메뉴 · 게시판 · 배너·팝업 · 접속이력 · **열람 감사로그(신설)** | 3순위 |

#### ① 조교/교수 학과 배정 <span>★ 구현 시 반드시 아래를 따를 것</span>

| 항목 | 내용 |
|---|---|
| 목적 | 학과 트리에서 특정 학과·전공에 조교(또는 교수)를 지정/해제 |
| 표시 | **단대 → 학과 → 전공** 3단 트리 · 학과코드 · 전공코드 · **과정 배지(학부/석사/박사)** · 배정된 담당자(이름·연락처) · 해당 학과 학생 수 |
| 액션 | 담당자 등록(사용자 검색) · 해제 · 일괄 SMS |
| 소스 | 학과 트리 = `V_DEP_INF_ALL` 미러 / 배정 = `dc_dept_assign` |

> 🔴 **현행 버그를 반복하지 말 것.** 현행 `Fu.assDeptList2`는 대학원 학과가 목록에 안 나온다. 원인 두 가지:
> 1. **`V_DEP_INF`(1,679행)를 쓴다** — `V_DEP_INF_ALL`(1,921행)보다 242개 적음
> 2. `LEFT OUTER JOIN`한 전공 테이블에 **`WHERE C.USE_YN='Y'`** 를 걸어 **outer join이 inner join으로 붕괴** → **전공이 없는 학과가 전부 탈락**
>
> **우리 구현:** `V_DEP_INF_ALL` 사용 + 전공 없는 학과도 노출(전공 컬럼 빈값) + `UNIV_CODE` 표시.

> ⚠️ **배정 저장 규칙** — 현행 `FU_ASS_DEPT`는 **PK가 없어** 중복 등록이 가능하고, 삭제 시 **이력이 남지 않는다.**
> 우리는 ① `(deptCode, majorCode, userId)` 유일성을 애플리케이션에서 보장하고, ② **배정/해제 이력을 남긴다**(학생 개인정보 접근 범위를 바꾸는 일이므로 감사 대상).

---

### 3-5. 교수 (교원)

| 화면 | 목적 | 소스 |
|---|---|---|
| 지도학생 목록 | 본인 지도학생 조회 | `V_USR_INF.PROF_ID` + `dc_advisor_assign` |
| 상담 신청 접수 | 학생이 신청한 교수상담 접수·일정 확정 | `dc_counsel_requests`(type=교수) |
| 상담 기록 작성 | 상담 결과 입력 | `dc_counsel_records` |
| 상담 제한일정 | 상담 불가 시간 등록 | `dc_counselor_excluded` |
| **상담 노출 설정** | 상담 받을지 여부·오피스아워·소개 | `dc_professor_profile` (**신설** — 현행 `CO_PROF`·`PC_CON_PROF_*` 전부 0행) |
기본값은 모든 시간대가 가능이며 불가능한 시간대를 설정가능

> 현행 교수상담은 `CON_PROF_INFO` **184,126건**으로 이 시스템에서 가장 많이 쓰이는 기능이다. 상담구분은 `SY_CODE` 그룹 `0131`: 전공 및 학업 · 진로 · 취업 · 봉사 및 실습 · 사제동행프로그램 · 기타.

---

## 4. React 구현 규약

### 4-1. 라우팅

React Router를 쓰지 않는다. `App.tsx`에서 `useState<PageId>` + `switch`, 뒤로가기는 `useRef<PageId[]>` 히스토리 스택.

```ts
type PageId = 'home' | 'counsel/requests' | 'students' | 'admin/dept-assign' | ...
```

### 4-2. 역할 주입

역할은 **에이전트나 별도 앱이 아니라 컨텍스트로 주입**하고, **읽기 범위를 역할별로 격리**한다.

```tsx
<SessionProvider user={{ id, name, role, scope }}>
```

화면은 `useSession()`으로 역할을 읽고, 데이터는 `queryXxx(scope, params)`로만 가져온다.

### 4-3. 한 화면을 여러 역할이 공유하는 패턴 <span>(현행에서 배울 점)</span>

현행은 같은 JSP를 `TYPE` 파라미터로 3역할이 쓴다.

```
CoMc070L.do?TYPE=T  상담사 → 포트폴리오 관리
CoMc070L.do?TYPE=A  조교   → 학생현황
CoMc070L.do?TYPE=M  프로그램담당자
```

**우리 방식** — 컴포넌트 하나 + 역할별 설정 객체.

```tsx
// 화면은 하나, 역할별 차이는 설정으로
const VIEW_CONFIG: Record<Role, { columns: ColumnKey[]; actions: ActionKey[]; readonly: boolean }> = {
  counselor: { columns: [...], actions: ['review','comment'], readonly: false },
  assistant: { columns: [...], actions: [],                   readonly: true  },
  admin:     { columns: [...], actions: ['review','comment','delete'], readonly: false },
}
```

**조교 화면 대부분은 이 방식으로 신규 개발 없이 해결된다.**

### 4-4. 목록 화면 필수 요소

모든 학생·신청 목록에 아래를 빠뜨리지 않는다.

1. **학적상태 필터** (기본값: 재학) — 졸업생 누적 때문에 필수
2. **과정 필터** (전체/학부/석사/박사) — 대학원 지원 요건
3. **학과 트리 필터** (단대 → 학과 → 전공)
4. **서버 페이징 계약** — 화면은 전체 배열을 받지 않고 `Paginated<T>`만 받는다 (`src_admin/data/query.ts` 패턴)
5. **빈 상태** — `EmptyState` 컴포넌트
6. **스냅샷 표기** — 목록의 학과·학년은 **신청 시점 스냅샷**임을 배지나 툴팁으로 구분

### 4-5. 컴포넌트 재사용

`Modal`(sm/md/lg) · `FormField` · `ConfirmDialog` · `EmptyState` · `AdminModal` · `SectionSidebar` · `RichEditor`. **Drawer는 쓰지 않는다.**

새 화면을 만들 때 먼저 기존 컴포넌트로 되는지 확인한다 (CLAUDE.md 규칙 5: 재생성 금지).

---

## 5. 데이터 설계 원칙

프로토타입은 JSON mock이지만 **실서비스 전환 대상은 Oracle이다.** 아래 원칙을 JSON 단계에서 지켜야 DB 전환이 로더 교체만으로 끝난다.

| # | 원칙 | 코드에서 이렇게 |
|---|---|---|
| 1 | **학사 유래 데이터는 읽기 전용** | 학생 이름·학과·학년·학적상태를 수정하는 UI·로직을 만들지 않는다. 수정 필요 시 "학사팀 문의" 안내 |
| 2 | **조인키는 `INTG_UID` 하나** (학생=학번, 교직원=사번) | 내부 surrogate를 새로 만들지 않는다. JSON에서도 `id`가 곧 학번. 기존 상담 이력 24만 건이 이 키로 묶여 있다 |
| 3 | **학사 마스터를 복사·저장하지 않는다** | 학과 목록을 자체 JSON에 스냅샷으로 두지 말고 미러 로더(`deptTree.ts`)를 읽는다. 현행 `FU_CODE`가 6년간 갱신 0건이 된 것이 반례 |
| 4 | **이벤트에 발생 시점 스냅샷 동반** | 신청·상담·벌점 레코드에 `snapDeptName`·`snapGrade`·`snapEnrollStatus`·`snapEmail`·`snapPhone`을 함께 저장. 현행 `EP_PRM_APP`이 이미 이 패턴 |
| 5 | **파생값은 원본에 넣지 않는다** | 매칭도·적합도·진행률·집계는 별도 구조. `job.match`처럼 공고에 학생별 값을 박지 않는다 |
| 6 | **상태값은 코드 + 라벨 분리** | `status: 'REQ'` + `STATUS_LABEL['REQ'] = '신청'`. 한글 문자열을 값 자체로 쓰지 않는다 (§7) |
| 7 | **정합성은 애플리케이션이 전담** | 실DB에 FK가 3건뿐이다. 참조 무효(삭제된 학과·프로그램)를 항상 방어하고 화면이 깨지지 않게 폴백 |
| 8 | **역할은 `SY_AUTH` 체계 계승** | 새 role 열거형을 만들지 말고 역할 코드를 추가. 학생·조교·교수는 `USER_TY_CD`로 판정(권한 부여 대상 아님) |
| 9 | **학사 유래와 자체 발급 인원을 섞지 않는다** | 현행은 외부 위촉 상담사를 `INSERT INTO V_USR_INF`로 학사 적재본에 밀어넣는다 → 야간 적재가 지울 위험. 우리는 `source: 'academic' \| 'local'`로 분리 |
| 10 | **조회는 학적상태 필터 필수** | 기본값 `재학`. `V_USR_INF` 11.3만 행에 졸업생·퇴직자 누적 |
| 11 | **민감정보는 컬럼 분리 + 동의 + 감사** | 상담 소견(내부)과 학생 공개 코멘트를 분리. 심리상담은 민감정보 → 동의 이력·열람 감사 필요 |
| 12 | **override는 버전으로** | base + localStorage override 병합 구조는 DB에서 버전 테이블이 된다. `version`·`confirmed`·`updatedBy`를 JSON에도 둔다 |
| 13 | **★ 우리는 빈 DB로 출발하지 않는다 — 이관이 전제다** | 아래 참조 |

### 원칙 13 — 데이터 이관 전제 <span>★ 가장 중요</span>

**마일리지를 제외한 사실상 전 도메인이 현행 운영 데이터를 이관받는다.** 신규 구축이 아니라 **기존 데이터를 새 스키마로 옮기는 작업**이다. 이것이 설계 자유도를 실질적으로 제한한다.

| | 이관 | 이유 |
|---|---|---|
| 상담 (`COUNSEL_MASTER` 5.4만 · `CON_PROF_INFO` 18.4만) | **O** | 학생별 상담 이력이 화면의 기본 데이터 |
| 비교과 (`EP_PRM`·`_APP` 6.8만) | **O** | 참여 이력·수료·벌점이 이어져야 함 |
| 상담사·배정 (`COM_CON_INF`·`FU_ASS_DEPT`·`CO_ADVISER`) | **O** | 운영 주체 정보 |
| 채용·이력서 (`JOBSMASTER`·`SS_JOB_RES`) | **O** | |
| 역량 (`CA_*`·`TB_CARR_CAPA_STTS`) | **O** | |
| 공통코드·첨부·권한 (`SY_CODE`·`SY_FILE`·`SY_AUTH*`) | **O** | |
| **마일리지 (`EX_ITEM`·`_APP`·`_SCORE`)** | **X — 제외** | 새로 시작 |
| 진단(C-2~C-CORE)·IAP·로드맵 등 신설 도메인 | 대상 없음 | |

**이 전제에서 나오는 설계 제약 5가지**

1. **`INTG_UID`를 키로 쓴다는 결정은 되돌릴 수 없다.** surrogate로 바꾸면 24만 건 상담 이력의 재매핑이 필요해진다.
2. **모든 코드에 `legacy` 값을 반드시 채운다** (§7-0 규칙 2). `legacy`가 비면 그 코드는 **이관 스크립트를 쓸 수 없다.**
3. **현행에 없는 필드는 이관 시 NULL이 된다.** 신설 필드(`CONFIRMED` 상태·배정 이력·학생 공개 코멘트 등)는 **NULL 허용 + 화면 폴백**을 전제로 설계한다. NOT NULL로 잡으면 이관이 막힌다.
4. **현행 데이터의 오염을 이관 시점에 정제할 것인지 미리 정한다.** 예: `COM_ASS_DEPT`(읽는 곳 0건인 고아 테이블)에 남은 배정, 상담사 구분 `CON_GB` 1/3이 둘 다 '심리상담'으로 표시되는 문제.
5. **이관 대상 도메인은 스키마를 임의로 재설계하지 않는다.** 구조 변경은 "이관 매핑을 쓸 수 있는가"를 통과해야 한다 — 1:1이 아니면 변환 규칙을 SPEC에 함께 적는다 (예: `COUNSEL_MASTER` 1행 → 신청/결과 2행 분해).

### 런타임 반영 방식 (프로토타입 단계)

브라우저에서 JSON 파일을 쓸 수 없으므로 **base JSON(seed) + `localStorage` 오버레이 = 병합 렌더**로 처리한다. 원본 JSON은 불변, 이벤트 결과만 오버레이에 쌓고 읽을 때 병합한다.

**로더 = 단일 스왑 seam.** 화면은 로더 함수만 호출하고, DB 전환 시 그 함수 내부만 API 호출로 교체한다.

```ts
// ✅ 이렇게
const students = await queryStudents(scope, params)   // 로더만 호출

// ❌ 이렇게 하지 않는다
import roster from '../data/studentsRoster.json'      // 화면에서 직접 import
const filtered = roster.filter(s => s.major === myDept)
```

---

## 6. 필드 사전 — 화면에서 쓸 표준 필드명

**일관성의 핵심 섹션.** 새 화면·새 JSON을 만들 때 아래 이름을 그대로 쓴다. 현행 컬럼과의 대응을 명시해 DB 전환 시 매핑이 자동으로 되게 한다.

### 6-1. 학생 (`Student`)

| 우리 필드 | 타입 | 현행 컬럼 | 출처 | 비고 |
|---|---|---|---|---|
| `id` | string | `V_USR_INF.INTG_UID` | 학사 | **PK. 학번** |
| `name` | string | `USR_NM` | 학사 | |
| `collegeCode` / `collegeName` | string | `DAEHAK_CD` → `DEPT_NM` | 학사 | 단대 |
| `facultyCode` | string | `HAKBU_CD` | 학사 | 학부 |
| `deptCode` / `deptName` | string | `MAJOR_CD` → `DEPT_NM` | 학사 | **전공.** 화면의 "학과" |
| `grade` | number | `STU_SCHGR` / `GRADE` | 학사 | 학부 1~4, **대학원 1~3** |
| `courseType` | `CourseType` | `UNIV_CODE` | 학사 | **학부/석사/박사/전문** (§7-5) |
| `enrollStatus` | `EnrollStatus` | `HOFC_STA_CD` | 학사 | 재학/휴학/졸업/수료/제적 |
| `enterDate` / `outDate` | string | `ENTER_DT` / `OUT_DT` | 학사 | |
| `completedTerms` | number | `ISU_CNT` | 학사 | 이수학기 |
| `advisorId` | string | **`PROF_ID`** | 학사 | 지도교수 교번 |
| `phone` / `email` | string | `HP` / `EMAIL` | 학사 | |
| `photo` | string | `PHOTO` | 학사 | |
| `isForeigner` | boolean | `FOR_YN` | 학사 | |
| `minorMajors` | string[] | `MAJOR_CD2` / `MJ2_NM` | 학사 | 복수·부전공 |
| — 아래는 **우리가 만드는 값** — | | | | |
| `studentType` | `StudentType` | — | 자체 | 6유형 (C-CORE 결과) |
| `iapType` | `IapType` | — | 자체 | R1~R6 |
| `track` | `Track` | — | 자체 | 집중관리/위험/표준/우수 |
| `competencyScore` | number | — | 자체 | 0~100 |
| `gpa` | string | `TB_CARR_CAPA_STTS.GRADE` | 자체* | *학사 미연계 → 자체 입력 |
| `languageScore` | string | `TB_CARR_CAPA_STTS.TOEIC` 등 | 자체 | |
| `penaltyTotal` | number | — | 자체 | 노쇼 벌점 (신설) |
| `level` / `expPoint` | number | — | 자체 | 게임화 (신설) |

### 6-2. 조직 (`Dept`)

| 우리 필드 | 타입 | 현행 컬럼 | 비고 |
|---|---|---|---|
| `code` | string | `V_DEP_INF_ALL.DEPT_CD` | PK |
| `name` | string | `DEPT_NM` | |
| `shortName` | string | `DEPT_SUB_NM` | 있으면 우선 표시 (현행 로직) |
| `parentCode` | string | **`DEPT_UP_CD`** | 계층 |
| `level` | 1\|2\|3\|4 | `LVL` | |
| `kind` | `DeptKind` | **`GRP_CD`** | `0001`단대 / `0002`학과 / `0003`전공 / `0004`기관 |
| `courseType` | `CourseType` | **`UNIV_CODE`** | 학부/석사/박사 |
| `active` | boolean | `USE_YN` | `N`=폐과 (639건 존재) |
| `sortOrder` | string | `ORDERING` | |

> ⚠️ **`(collegeCode, deptCode)` 쌍으로 식별한다.** 동명 학과가 여러 개다 — `신소재공학부`가 `505`(공과대), `501`(메카트로닉스대), `1528`(석사), `2528`(박사)로 4개. **학과명 매칭 금지.**

### 6-3. 상담 (`CounselRequest` / `CounselRecord`)

| 우리 필드 | 현행 컬럼 (`COUNSEL_MASTER`) | 비고 |
|---|---|---|
| `id` | `IDX` | |
| `studentId` | `USERID` | = `INTG_UID` |
| `counselorId` | `CONSULTID` | |
| `type` | `COUNSELTYPEIDX` | 진로/취업/심리/교수 (§7-1) |
| `status` | `COUNSELSTATUSIDX` | 신청/완료/학생취소/상담사취소 (§7-2) |
| `method` | `ON_OFF_TTYPE` | 대면/비대면 |
| `topic` | `CONSULTTITLE` | 상담 제목 |
| `requestBody` | `CONSULTINFO` | 학생이 쓴 신청 내용 |
| `hopeNote` | `HOPE_INFO` | 희망사항 |
| `requestedAt` | `IDATE` | |
| `slotDate` / `slotStart` / `slotEnd` / `slotPlace` | `COUNSELSDATE` / `COUNSELEDATE` | 확정 슬롯 |
| `resultTitle` / `resultBody` | `RESULTTITLE` / `RESULTINFO` | **상담사 소견 (내부)** |
| `commentToStudent` | — | **학생 공개 코멘트** (신설 — 현행은 분리 안 됨) |
| `publicToStudent` | `STUD_OTP_YN` | 학생 공개 여부 |
| `recordedAt` | `CONSULTDATE` | 결과 입력일 |
| `reassigned` / `reassignedBy` | `ASSIGN_YN` / `ASSIGN_ID` | **이력은 별도 테이블로 신설** |
| `cancelReason` / `cancelAt` / `cancelBy` | `CANCELREASON` / `CANCELDATE` / `CANCELUSERID` | **취소 시 사유 필수** |
| `preCheck.majorSatisfied` | `MAJOR_YN` | 전공 만족/불만족 |
| `preCheck.careerGoalSet` | `COURS_YN` | 진로목표 설정/미설정 |
| `preCheck.employability` | `EMPLO_YN` | 취업역량 높음/낮음 |
| `preCheck.motivation` | `REASON_YN` | 취업동기 높음/낮음 |
| `link.sent` / `link.sentType` / `link.received` / `link.receivedType` | `LINK_YN` / `LINK_TYPE` / `LINK_RCT_YN` / `LINK_RCT_TYPE` | 진로↔심리 연계 이송 |
| `attach.file` / `attach.resume` / `attach.hope` / `attach.family` | `CON_ADD1~4` | 학생 제출물 여부 |
| `problemCodes` | `COUNSEL_PROBLEM` | 문제유형 다중선택 |
| `family` | `COUNSEL_FAM` | 가족관계 (심리상담) |
| **스냅샷** `snapName`·`snapDeptName`·`snapGrade`·`snapEnrollStatus`·`snapTrack` | — | 발생 시점 값 (원칙 4) |

### 6-4. 비교과 프로그램 (`Program` / `ProgramApply`)

| 우리 필드 | 현행 컬럼 | 비고 |
|---|---|---|
| `id` | `EP_PRM.PRM_SEQ` | |
| `title` | `PRM_NM` | |
| `groupType` | `PRM_GB` | 개인(P) / 그룹(G) |
| `year` / `term` | `PRM_YEAR` / `PRM_HAKGI` | |
| `status` | `PRM_STAT_GB` | 생성(C)/운영(O)/종료(E) |
| `openRequestStatus` | `REQ_STAT_GB` | 임시저장(T)/신청(A)/반려(R)/승인(S) — **개설 승인 워크플로** |
| `applyStart` / `applyEnd` | `APP_ST_DATE` / `APP_ED_DATE` | |
| `runStart` / `runEnd` | `PRM_ST_DATE` / `PRM_ED_DATE` | |
| `capacity` / `selectedCount` | `PRM_NUM` / `SEL_NUM` | |
| `firstComeFirstServed` | `SEL_NUM_FST_YN` | 선착순 여부 |
| `deptCode` | `DEPT_CD` | 주관부서 |
| `place` | `PLACE` | |
| `categoryCodes` | `PRM_GB_1~4` | 1~4차 분류 (`EP_CUR_GUBUN`) |
| `competencyRatio[]` | `CAP_PER1~6` | 역량 반영 비율 6종 |
| `mileage` / `point` | `POINT1/2` · `MIN/MAX_MILEAGE` | 균등/차등 (`MILEAGE_DIV`) |
| `targets` | `TRGT_STU11~15`·`TRGT_STU21~24`·`TRGT_STU31~35`·`TRGT_EMP`·`TRGT_OUT` | **참가대상 — 학적상태/대학원학년/학부학년/교직원/외부인** |
| `rounds[]` | `EP_PRM_STEP` | **차수** (`PRM_STEP`) — 차수별 기간·정원 |
| — 신청 — | | |
| `applyId` | `EP_PRM_APP.PRM_APP_SEQ` | |
| `round` | `PRM_STEP` | |
| `selectionStatus` | `STATUS` | 신청/선발/탈락/취소/수료/미수료 (§7-3) |
| `motiveCode` / `routeCode` | `MOTIVE_CD` / `ROUTE_CD` | 지원동기·경로 |
| `reflection` | `THKL` | 성찰 |
| **스냅샷** `snapEnrollStatus`·`snapGrade`·`snapEmail`·`snapPhone` | `HOFC_STA_CD`·`STU_SCHGR`·`EMAIL`·`HP` | **현행이 이미 이 패턴** |
| `competencyScores[]` | `EP_PRM_RESULT.CAP_PNT1~6` | 참여 결과 = 역량점수 |
| `mileageScores[]` | `MILEAGE_PNT1~6` | |

### 6-5. 상담사 (`Counselor`)

| 우리 필드 | 현행 컬럼 (`COM_CON_INF`) |
|---|---|
| `id` | `CONID` |
| `name` | `CON_NM` |
| `internal` | **`INOUT_GB`** (내부/외부 위촉) |
| `areas` | `CON_AREA1`(진로) `CON_AREA2`(취업) `CON_AREA3`(이력서·자소서 클리닉) |
| `methods` | `CON_TYPE1`(방문) `CON_TYPE2`(온라인) `CON_TYPE3`(클리닉) |
| `availableWeekdays` | `CON_W1~5` (월~금) |
| `place` / `placeRoom` | `PLACE` / `PLACE_NUM` |
| `onlineLimit` | `LIMIT_GB` / `LIMIT_NUM` |
| `targetNote` | `TARGET` (신청대상 설명) |
| `collegeCodes` | `COM_CON_TAR.DAEHAK_CD` (담당 단과대) |
| `active` | `STATUS` |
| — | `CONPWD` — **외부 상담사 자체 비밀번호 (SSO 밖 인증)** |

### 6-6. 배정 (`DeptAssign`)

| 우리 필드 | 현행 컬럼 (`FU_ASS_DEPT` / `TB_CARR_PROF_ASSI_DEPT`) |
|---|---|
| `deptCode` | `DEPT_CD` (학과) |
| `majorCode` | `MAJOR_CD` (전공) |
| `userId` | `USR_ID` (= `INTG_UID`) |
| `userName` | `USR_NM` (스냅샷) |
| `role` | — (조교 / 교수 구분, 우리 추가) |
| `assignedAt` / `assignedBy` | — (**신설 — 현행에 없음**) |

---

## 7. 코드 체계 — 분류·그룹·권한 코드 <span>★ 유지보수의 핵심</span>

현행은 코드가 **세 군데에 흩어져** 있다: ① `SY_CODE` 테이블(3,874행) ② SQL의 `CASE WHEN` ③ JSP의 `<th>` 하드코딩.
그래서 역량명 하나를 바꾸려면 8곳 이상을 고쳐야 하고, 실제로 `1101`(학부 재학생) 같은 신분코드가 **sqlmap 229곳에 리터럴로 박혀** 있다. **우리는 코드를 한 곳에 모은다.**

### 7-0. 운영 규칙

| # | 규칙 |
|---|---|
| 1 | **코드는 `src_v2/data/codes/` 단일 소스에 둔다.** 화면·JSON 어디에도 한글 라벨을 값으로 쓰지 않는다 |
| 2 | **모든 코드 항목은 4열을 갖는다** — `code`(우리 값) · `label`(표시) · `legacy`(현행 값) · `active`. **`legacy`가 곧 이관 매핑표다** (§5 원칙 13) |
| 3 | **2단 계층을 지원한다.** 현행 `SY_CODE.UP_GRP_CODE`/`UP_CODE` 패턴을 계승 (상담분야 → 세부분야) |
| 4 | **코드값은 의미 있는 영문 상수.** `'1'`·`'0002'` 같은 현행 숫자는 `legacy` 열에만 두고 화면 로직에 노출하지 않는다 |
| 5 | **폐지 코드는 지우지 않고 `active: false`.** 과거 이벤트 레코드가 그 값을 참조한다 |
| 6 | **신분·학년·학적으로 대상을 거를 때 리터럴 금지.** 반드시 §7-2 `UserType` 집합 상수를 쓴다 — 현행이 대학원생을 잃은 원인이 이것이다 |
| 7 | 코드는 **기동 시 1회 로드 후 메모리 캐시.** 현행은 매 요청 DB를 쳐서 `SY_CODE` 참조 statement가 108개다 |

---

### 7-1. 권한 코드 `AuthCode` <span>(백오피스 전용)</span>

**중요 — 부여 방식이 두 갈래다.** 역할 기본권한은 **코드가 자동 부여**하고, `SY_AUTH_USER` 테이블에서 오는 것은 추가권한뿐이다. (`PUtil.java:1002-1031`)

| 코드 | 역할 | 부여 방식 | 우리 구현 |
|---|---|---|---|
| `AUTH0000` | 비로그인 | 자동 (세션 없음) | 진입 차단 |
| `AUTH0001` | 학생 | **자동** — `UserType`이 학생군 | `src_v2/` |
| `AUTH0002` | 조교 | **자동** — `ASSISTANT` + `FU_ASS_DEPT` 배정 | `src_admin/` |
| `AUTH0003` | 교수 | **자동** — `FACULTY` | `src_admin/` |
| `AUTH0004` | 직원 | **자동** — `STAFF` | 보류 |
| `AUTH0005` | 상담센터 총괄 | 명시 부여 | `src_admin/` |
| `AUTH0006` | **슈퍼관리자** | 명시 부여 (`SY_AUTH_USER`) | `src_admin/` |
| `AUTH0012` | 상담사 | 명시 부여 + `COM_CON_INF` 등록 | `src_admin/` |
| `AUTH0008` / `AUTH0010` | 기업 / 멘토 | 자동 (외부 로그인 경로) | 보류 |
| `AUTH0011` | 교무·학사관리과 | 명시 부여 | 보류 |

> **학생은 권한 테이블에 등록하지 않는다.** 52명뿐인 `SY_AUTH_USER`는 전체 권한자 명단이 아니라 **추가권한 보유자 명단**이다.
> 통제 범위는 **메뉴까지**다. "어떤 학생 행을 볼 수 있나"는 §2 `AccessScope`가 전담한다 — 현행처럼 SQL `<if>`에 흩뿌리지 않는다.

### 7-2. 신분 코드 `UserType` <span>★ 대학원 지원의 1차 관문</span>

`V_USR_INF.USER_TY_CD` (학사DB 발급, 4자리). **집합 상수로만 쓴다.**

| 우리 코드 | 라벨 | `USER_TY_CD` | 세션 1글자 |
|---|---|---|---|
| `STU_UG` | 재학생-학부 | `1101` | `S` |
| `STU_UG_ALUM` | 졸업생-학부 | `1102` | `S` |
| `STU_GR` | **재학생-대학원** | `1201` | `S` |
| `STU_GR_ALUM` | **졸업생-대학원** | `1202` | `S` |
| `FACULTY` | 교원 | `1301` | `P` |
| `STAFF` | 직원 | `1401` | `M` |
| `ASSISTANT` | 조교 | `1501` | `A` |
| `COUNSELOR` | 상담사 | — (`COM_CON_INF` 조회 후 덮어씀) | `T` |

**필수 집합 상수** — 화면·로더는 이것만 쓴다.

```ts
export const STUDENT_ENROLLED = ['STU_UG', 'STU_GR'] as const   // 재학생 전체 ★ 기본값
export const STUDENT_ALL      = ['STU_UG','STU_UG_ALUM','STU_GR','STU_GR_ALUM'] as const
export const STUDENT_UG_ONLY  = ['STU_UG'] as const              // 학부 한정이 정책일 때만
```

> ⚠️ **현행의 `1101` 리터럴 229곳을 그대로 옮기면 대학원생이 다시 사라진다.** 이관 시 각 지점을 위 집합으로 치환하되, **`STUDENT_UG_ONLY`를 쓰는 곳은 "왜 학부만인지" 주석을 남긴다**(예: 학부 기준 취업통계).

### 7-3. 학적·재직 상태 `EnrollStatus`

`V_USR_INF.HOFC_STA_CD` + `SY_CODE` 그룹 `0034`.

| 코드 | 라벨 | 현행 | 비고 |
|---|---|---|---|
| `ENROLLED` | 재학 | `0001` | **목록 기본 필터** |
| `LEAVE` | 휴학 | | |
| `GRADUATED` | 졸업 | | `V_USR_INF`에 대량 누적 |
| `COMPLETED` | 수료 | | 대학원 수료생 — 대학원 지원 시 누락 주의 |
| `EXPELLED` | 제적·자퇴 | `OUT_STAT` | |
| `EMPLOYED` / `RETIRED` | 재직 / 퇴직 | `89` / `90` | **교직원 전용** — 같은 컬럼을 학생/교직원이 공유한다 |

### 7-4. 과정 구분 `CourseType` <span>★ 대학원 지원의 2차 관문</span>

`V_DEP_INF_ALL.UNIV_CODE`.

| 코드 | 라벨 | 현행 | 건수 |
|---|---|---|---|
| `UNDERGRAD` | 학부 | `00` | 725 |
| `MASTER` | 대학원 석사 | `01` | 364 |
| `DOCTOR` | 대학원 박사 | `02` | 69 |
| `PROFESSIONAL` | 전문·특수대학원 | `03`~`12` | 226 |
| `ETC` | 기타 | `90` | 21 |

### 7-5. 조직 종류 `DeptKind`

`V_DEP_INF_ALL.GRP_CD` + `LVL`.

| 코드 | 라벨 | 현행 `GRP_CD` | `LVL` | 건수 |
|---|---|---|---|---|
| `COLLEGE` | 단대 | `0001` | 1 | 16 |
| `DEPT` | 학과 | `0002` | 2 | 599 |
| `MAJOR` | 전공 | `0003` | 3 | 808 |
| `ORG` | 기관 | `0004` | 4 | 498 |

> 대학원 조직 자체(`대학원`·`교육대학원`·`행정대학원`…)는 **`ORG`(기관)** 로 등록돼 있고, 대학원 학과는 `DEPT`로 학부 학과와 나란히 있다. **상위조직이 `COLLEGE`인 것만 훑으면 대학원이 통째로 빠진다** — 현행 `Fu.assDeptList2`의 실패 원인.

### 7-6. 상담 `CounselType` / `CounselStatus` / `CounselLink`

**유형** — `COUNSEL_MASTER.COUNSELTYPEIDX`

| 코드 | 라벨 | 현행 |
|---|---|---|
| `CAREER` | 진로 | `1` |
| `JOB` | 취업 | `2` |
| `PSYCH` | 심리 | `3` |
| `PROF` | 교수상담 | — (`CON_PROF_INFO` 별도 테이블) |

**상태** — `COUNSEL_MASTER.COUNSELSTATUSIDX`

| 코드 | 라벨 | 현행 | 일으키는 주체 |
|---|---|---|---|
| `REQ` | 신청 | `1` | 학생 (또는 상담사 대리등록) |
| `CONFIRMED` | 확정 | **없음 — 우리 추가** | 상담사 |
| `DONE` | 완료 | `2` | 상담사 (결과 작성 시) |
| `CANCEL_STU` | 학생취소 | `3` | 학생 — **상담일 3일 전까지만** |
| `CANCEL_CNS` | 상담사취소 | `4` | 상담사·관리자 |

> 현행은 **배정 대기 상태가 없다.** 학생이 슬롯을 고르는 순간 상담사가 확정된다. 재배정은 `CONSULTID`만 바꾸고 **상태도 이력도 남지 않는다** → 우리는 `CONFIRMED` 단계와 배정 이력을 신설한다.

**연계 이송** `CounselLink` — 상태가 아니라 **완료 시 부가정보**다. 라벨이 상담 유형에 따라 달라진다.

| 코드 | `JOB`(취업상담)일 때 | `CAREER`(진로상담)일 때 | 현행 |
|---|---|---|---|
| `NONE` | 미결정 | 미결정 | `0001` |
| `SWAP` | **진로** | **취업** | `0002` |
| `OTHER_DEPT` | 타부서 | 타부서 | `0003` |
| `ADVISOR` | 지도교수 | 지도교수 | `0004` |
| `ETC` | 기타 | 기타 | `0005` |

보낸 쪽 `link.sent`/`link.sentType`, 받은 쪽 `link.received`/`link.receivedType`. **현행은 연계해도 새 상담건이 생기지 않고 컬럼만 기록된다** — 접수 여부는 상담사가 수기 갱신. 우리는 연계를 **새 `CounselRequest` 생성**으로 바꾼다.

### 7-7. 교수상담 `ProfCounsel`

`CON_PROF_INFO`. **상담사 상담과 상태값 체계가 다르다 — 합치지 말 것.**

| 축 | 코드 | 현행 |
|---|---|---|
| 상태 | `REQ` 신청 / `DONE` 완료 / `CANCEL_STU` 학생취소 | `0001` / `0002` / `0003` |
| 방식 | `ONLINE` / `OFFLINE` | `CON_KIND` = `ON` / `OF` |
| 세부구분 | 전공 및 학업 · 진로 · 취업 · 봉사 및 실습 · 사제동행프로그램 · 기타 | `CON_TYPE` (`SY_CODE` 그룹 `0131`) |
| 예약 여부 | `RESERVED` / `WALK_IN` | `ISRESERVATION` |

> 오프라인 교수상담 슬롯은 **상담사와 같은 `BASICSETTING` 테이블**을 쓴다(`CONSULTANTID`에 교수 `INTG_UID`가 들어감). 슬롯 모델을 상담사 전용으로 설계하면 안 된다.
> `CON_PROF_INFO`는 신청 시점의 `USER_TY_CD`·`STU_SCHGR`를 **스냅샷으로 저장**한다 — §5 원칙 4의 현행 선례.

### 7-8. 비교과 신청 상태 `ApplyStatus`

`EP_PRM_APP.STATUS`. 현행이 **단계별로 쓸 수 있는 값이 갈린다**(`APP_GB`=A 신청자관리 / C 선발자관리).

| 코드 | 라벨 | 현행 | 단계 |
|---|---|---|---|
| `REQ` | 신청(접수대기) | `1` | 신청자관리 |
| `RECEIVED` | 접수완료(대기) | `7` | 신청자관리 |
| `SELECTED` | 선발 | `2` | 양쪽 |
| `REJECTED` | 탈락 | `3` | 신청자관리 |
| `CANCELED` | 취소 | `4` | 신청자관리 |
| `ATTENDED` | 참석 | `8` | 선발자관리 |
| `NOSHOW_1` | **불참 (벌점 1점)** | `9` | 선발자관리 |
| `NOSHOW_3` | **불참 (벌점 3점)** | `10` | 선발자관리 |
| `COMPLETED` | 수료 | `5` | 선발자관리 |
| `INCOMPLETE` | 미수료 | `6` | 선발자관리 |
| `DELETED` | 삭제 | `9999` | 양쪽 |

> **노쇼 벌점은 신설이 아니라 계승**이다. 현행이 이미 2단계 벌점(1점/3점)을 상태값에 내장하고 블랙리스트 화면도 운영한다.
> 집계 정의도 그대로 계승: 신청자수 = `≠CANCELED` · 수료자수 = `COMPLETED`.
> ⚠️ 현행은 그룹형 수료 판정이 두 벌이다(`EP_PRM_MAPPING.STATUS='2'` vs `EP_PRM_APP.STATUS='5'`) — **우리는 `ApplyStatus` 하나로 통일한다.**

### 7-9. 역량 `Competency` <span>(2026-07-31 확정)</span>

**현행이 쓰는 것은 아래 계열이다.** 화면 표시는 5종이고 6번째 `HUMANITY`는 전 화면에서 주석 처리되어 있다 — **스키마는 6, 화면은 5.**

| 코드 | 라벨 | 현행 | 상태 |
|---|---|---|---|
| `LOCAL_LEADER` | 지역형리더 | `PA_1` / `CAP_PER1` | 활성 |
| `CREATIVE` | 창의적사고 | `PA_2` | 활성 |
| `CONVERGENCE` | 실용적융복합 | `PA_3` | 활성 |
| `COMMUNICATION` | 의사소통 | `PA_4` | 활성 |
| `GLOBAL` | 글로벌 | `PA_5` | 활성 |
| `HUMANITY` | 인문 | `PA_6` | **비활성** — 되살릴지 정책 결정 필요 (§9) |

**"역량"이라는 축이 3개 공존한다. 셋은 서로 다른 테이블이고 라벨만 공유한다 — 화면을 만들 때 어느 축인지 명시할 것.**

| 축 | 무엇 | 현행 테이블 |
|---|---|---|
| **진단 설문** | 회차별 응시 결과 | `CA_SURVEY` · `CA_SURVEY_QUS` · `CA_SURVEY_TAR` |
| **누적 점수** | 교과(`SUB_PA_n`) + 비교과(`EXT_PA_n`) 달성률 | `CA_GOAL`(학과 목표) · `CA_GOAL_DATA`(학생별) |
| **마일리지 배분** | 항목별 역량 반영비율 | `EX_ITEM` — **컬럼명이 아직 옛 체계**(`job_rate`·`fusion_rate`…)인데 화면 라벨만 바꿔 달았다 |

하위역량 17종(`CAP_QUS_GB2`)도 존재한다: 인성·소양 / 비전제시 및 실행능력 / 공동체 윤리의식 / 도전정신 / 분석적·비판적 사고력 / 추론적·대안적 사고력 / 문제해결력 / 전공지식활용능력 / 통합적 사고력 / 가치창출능력 / 토론과 조정력 / 의사표현 및 전달능력 / 경청과 이해능력 / 다문화 이해 및 수용능력 / 외국어 구사능력 / 국제적 교류 및 협업능력 / 세계시민의식

### 7-10. 진단 `DiagnosisTest`

| 코드 | 명칭 | 결정하는 것 |
|---|---|---|
| `C2` | C-2 진로설정 진단검사 | 진로 목표 구체성 |
| `C3` | C-3 역량수준 진단검사 | 역량강화 프로그램 추천 |
| `C4` | C-4 구직역량 진단검사 | 취업지원 단계 |
| `CCORE` | C-CORE 핵심진단검사 | **학생 6유형 분류** |

**C-1은 존재하지 않는다.** 학부 학년별 응시: 1학년 `C2` / 2·3학년 `C2`·`C3` / 4학년 `C3`·`C4` + 전학년 공통 `CCORE`.

**계승 범위** — 현행 `CA_SURVEY`의 **"회차 개설 → 대상자 지정 → 응시(`진행중`/`완료`) → 결과" 4단 뼈대와 "진단은 상담에 종속되지 않는다"는 원칙만 가져온다.** 문항·역량축·판정 로직은 신설이다. 현행 `CHECK_*` 8종은 소스에서 참조 0건인 죽은 스키마이므로 무시한다.
⚠️ **대상자 지정 규칙은 계승하지 않는다.** 현행 "전체"는 `USER_TY_CD='1101'`이라 대학원생이 빠진다 (§7-2). **대학원생 진단 정책은 미정** (§9).

### 7-11. 첨부 `FileRef`

현행 `SY_FILE`의 **다형 참조 모델을 그대로 계승한다.** 도메인마다 첨부 테이블을 만들지 않는다.

| 우리 필드 | 현행 | 의미 |
|---|---|---|
| `ownerKind` | `TAB_NM` | 어느 도메인의 첨부인가 (문자열 구분자) |
| `ownerId` | `TAB_SEQ` | 그 도메인 레코드의 PK |
| `slot` | `FILE_CD` | 같은 레코드 안 첨부 종류 (본문 / 결과보고서 …) |
| `realName` / `storedName` / `path` / `size` / `ext` | `REAL_FILE_NM` / `TRANS_FILE_NM` / `FILE_PATH` / `FILE_SIZE` / `FILE_TYPE` | |
| `deleted` | `DEL_YN` | **논리삭제** |

> 현행은 업로드 파일을 **웹 문서 루트 안**에 두고 확장자를 부분문자열로 검사한다. **이 두 가지는 계승하지 않는다** — 저장은 웹루트 밖, 확장자는 완전일치, 다운로드는 소유자 검증.

### 7-12. `SY_CODE` 그룹코드 대장 <span>(소스에서 확인된 것)</span>

이관 시 **`GRP_CODE` 단위로 우리 코드 테이블에 대응**시킨다.

| 그룹 | 용도 | 우리 대응 |
|---|---|---|
| `0024` | 상담사 상태 | `Counselor.active` |
| `0034` | 학적·재직 상태명 | §7-3 `EnrollStatus` |
| `0053` · `0054` · `0103` | 상담 세부분야 (취업전략센터 / 학생과 / 기초교육원) | `CounselTopic` (부서별) |
| `0060` | 비교과 그룹 상태 | `Program.groupStatus` |
| `0131` | **교수상담 세부구분** | §7-7 `CON_TYPE` |
| `0143` · `0146` | 상담 유형 계열 | §7-6 `CounselType` |
| `0145` → `0147` | **상담분야 → 세부분야 (2단 계층)** | `CounselTopic` 부모/자식 — §7-0 규칙 3의 실례 |
| `0150` | 역량 | §7-9 `Competency` |
| `0012` · `0037` | **현행 코드관리 화면에서 숨김 처리** | 정체 미확인 — 이관 전 확인 필요 |

> 그룹코드 전수는 `docs/dbmeta/out/E4_tables.csv`(3,874행)에 있다. **이관 전 이 CSV를 코드 테이블 초기 데이터로 변환한다.**

---

## 8. 대학원 지원 요건 <span>(필수)</span>

**대학원 학생·조교·교수가 모두 시스템을 써야 한다.** 데이터는 학사DB에 이미 있다 — 막고 있는 것은 전부 **애플리케이션 쪽 하드코딩**이다.

### 8-1. 대학원생이 지금 막혀 있는 지점 <span>(소스 실측)</span>

관문이 **두 겹**이다. 학과 트리만 고치면 절반만 열린다.

| 관문 | 증상 | 원인 | 우리 대응 |
|---|---|---|---|
| **① 신분코드** | 대학원생이 **학생 목록·검색·배정 대상에서 사라진다** | `USER_TY_CD` 리터럴 `'1101'`이 sqlmap **229곳**에 박혀 있다. `'1201'`(재학생-대학원)이 조건에 들어간 곳은 **단 3곳** | §7-2 `STUDENT_ENROLLED` 집합 상수로만 판정 |
| **② 학과 트리** | 대학원 **학과 자체가 목록에 안 뜬다** | ⓐ `V_DEP_INF`(대학원 미포함) 사용 ⓑ `WHERE C.USE_YN='Y'`로 outer join 붕괴 → **전공 없는 학과 탈락** ⓒ 상위조직을 `LVL=1 AND GRP_CD='0001'`로 한정 | `V_DEP_INF_ALL` + `ON`절 이동 + `ORG`(기관) 상위 허용 |

**① 신분코드가 막는 구체적 화면**

| 화면 | 현행 조건 | 결과 |
|---|---|---|
| 전담교수 배정 대상 목록 | `USER_TY_CD IN ('1101')` | **대학원생에게 전담교수를 배정할 수 없다** |
| 조교 담당 학생 목록 | `USER_TY_CD IN ('1101')` | 조교 화면에 대학원생이 안 보인다 |
| 상담 학생검색 팝업 (6곳) | `USER_TY_CD = '1101'` | 상담사가 대학원생을 검색할 수 없다 |
| 역량진단 대상자 "전체" | `USER_TY_CD = '1101'` | 대학원생이 진단 대상에서 빠진다 |
| 비교과 선발자 SMS | `USER_TY_CD = '1101'` | 대학원생이 선발돼도 문자를 못 받는다 |

> 반대로 **현행도 대학원을 인지하는 곳이 있다.** 상담 슬롯의 재학/졸업 대상 제한은 `1101 OR 1201`·`1102 OR 1202`로 4종을 모두 본다. **일관성이 없을 뿐, 스키마는 이미 대학원을 담고 있다.**

### 8-2. 반드시 열어야 하는 것 <span>(요구사항 확정)</span>

| # | 요건 | 현행 상태 | 우리 구현 |
|---|---|---|---|
| **A** | **대학원생이 비교과 프로그램에 신청할 수 있어야 한다** | **이미 열려 있다.** `ep.xml`에 학부 한정 필터가 없고, 참가대상 플래그가 `TRGT_STU21~24`(대학원 1~4)와 `TRGT_STU31~35`(학부)로 **분리되어 존재** | 참가대상 UI에 **대학원 학년 옵션을 노출**하고, 신청 자격 판정에 `STUDENT_ENROLLED` 사용. SMS·알림 대상에서 빠지지 않게 할 것 |
| **B** | **대학원생이 교수에게 상담을 신청할 수 있어야 한다** | **신청 기록(`CON_PROF_INFO`)에는 제약이 없다.** 막히는 곳은 **교수 목록 조회**: `ORGID = 학생의 HAKBU_CD` 매칭 + `RANKID IN ('1001','1002','1003')`(교수·부교수·조교수) 한정 | 교수 목록을 **`V_DEP_INF_ALL` 기준 소속 매칭**으로 바꾸고, 대학원 전담 교원의 직급이 3종 밖이면 포함되도록 **직급 화이트리스트를 코드 테이블로** 뺀다 |
| C | 학과 트리는 **`V_DEP_INF_ALL`** 기준 | `V_DEP_INF`는 242개 적음 | §8-1 ② |
| D | **`courseType` 필터·배지를 모든 학생 목록에** | 없음 | §7-4 |
| E | **학년 범위를 하드코딩하지 않는다** | 학부 1~4 고정 | 학부 1~4 / 대학원 1~3. `courseType`에 따라 선택 범위가 바뀜 |
| F | 학과명 접미 `(대학원-석사)` 처리 | 이름에 포함되어 옴 | 그대로 표시하거나 `courseType` 배지로 대체 |
| G | **`(collegeCode, deptCode)` 쌍 식별** | 학과명 매칭 | 동명 학과가 과정별로 존재 — **학과명 매칭 금지** |
| H | 전공이 없는 학과도 목록에 노출 | outer join 붕괴로 탈락 | 대학원 학과는 전공 미등록이 많다 |
| I | **`COMPLETED`(수료) 학적상태를 학생 목록에서 빠뜨리지 않는다** | 기본 필터가 재학 | 대학원 수료생이 상담·비교과 대상이 될 수 있는지 정책 확인 (§9) |

**전산원 요청 항목** (사용자 진행 예정)
1. `V_DEP_INF_ALL` 사용 승인 (대학원 포함 조직 트리)
2. `V_SUGANG` · `V_LECT_INF` 적재 활성화 — `GRAD_DIV`(과정구분) 포함
3. 학사 원본 뷰 `수강전체`(`VIEW_SUGANG_ALL`) · `수업개설`(`VIEW_SUUP_GAESUL`) 연계

---

## 9. 구현 전 확인 필요 <span>(임의 확정 금지)</span>

### 답이 나온 것 <span>(2026-07-31 원격 소스 분석)</span>

| 항목 | 답 |
|---|---|
| 역량 체계 3개 중 무엇인가 | **확정** — §7-9. 표시 5종, `인문`은 비활성 |
| 상담 가능시간 "가능" vs "제한" | **확정** — **"가능"을 등록**한다. `BASICSETTING`(상담사가 등록) ↔ `TB_CARR_CNSL_EXCL_HR`(관리자 제한)는 역할이 분리돼 있고, **학생 예약 화면은 `BASICSETTING`만 조회**한다 |
| 진로설계(`STU_COURSE_*`)가 살아 있나 | **살아 있다.** 학생 화면·관리자 집계·인재검색 탭에서 사용 중 |
| 교수 상담이 실제로 동작하나 | **동작한다.** `CON_PROF_INFO` 계통(18.4만 건). `PC_CON_PROF_*`·`CO_PROF`는 미사용 |
| 진단을 계승할 수 있나 | **구조만 계승** — §7-10 |

### 남은 미결

| # | 항목 | 영향 화면 |
|---|---|---|
| 1 | **역량 `인문`(6번째)을 되살릴지** — 스키마는 6, 화면은 5 | 역량 현황 · 비교과 결과 · 대시보드 |
| 2 | **관리자 제한일정을 학생 예약 화면에 반영할지** — 현행은 반영 안 함(상담사가 슬롯을 지워야 함). 의도인지 미구현인지 현업 확인 필요 | 상담 제한일정 관리 · 학생 예약 |
| 3 | 조교에게 학생 상세 **어디까지 공개**할지 (로드맵·진단결과 포함 여부) | 조교 학생현황 |
| 4 | **대학원생 진단 정책** — C-2/C-3/C-4를 학년별로 어떻게 배정할지 (학부는 1~4, 대학원은 1~3) | 진단센터 |
| 5 | 교수상담을 **본인 학과만** vs **타 학과 포함** — 현행은 본인 소속(`HAKBU_CD`) 교수만 | 교수상담 신청 |
| 6 | **대학원 수료생(`COMPLETED`)을 상담·비교과 대상에 포함할지** | 전 학생 목록 |
| 7 | 집단상담·집단심리검사를 되살릴지 (현행 비활성, 데이터 292건) | 상담 관리 |
| 8 | **이관 시 현행 데이터를 정제할지** — 고아 테이블 `COM_ASS_DEPT` 잔여 배정, `CON_GB` 1/3 라벨 오류 | 이관 스크립트 |
| 9 | `SY_CODE` 그룹 `0012`·`0037`의 정체 (현행 코드관리 화면에서 숨김 처리) | 코드 이관 |

---

## 10. 참고 문서

| 문서 | 용도 |
|---|---|
| `CLAUDE.md` | 프로젝트 전역 규칙 · DB 구조 요약 · 코드 작성 규칙 |
| **`DB.md`** | **이 문서의 근거** — 현행 DB 실측·소스 분석 결과 |
| `docs/DB_CURRENT.html` | 현행 DB 상세 (테이블 전수 · 다이어그램) |
| `docs/DB_ERD.html` | 신규 설계 ERD |
| `DESIGN.md` | 디자인 토큰 (새 팔레트·폰트 생성 금지) |
| `Counsel_README.md` · `STU_README.md` | 역할별 기존 작업 문서 |
| `docs/dbmeta/*.sql` | 재조사용 추출 스크립트 |
| `origin/` | 현행 운영 소스 (MyBatis sqlmap 34 + 상담 컨트롤러 4) |
| **`docs/_analysis/`** | **현행 소스 전수 분석 결과** (2026-07-31, 원격 수행) — 사이트맵 1,596 URL · 화면별 데이터흐름 22 · 역할별 접근범위 · 테이블 사용처 335 · 지정질문 15 답변 · 발견사항 |

> `docs/_analysis/06_findings.md`는 **운영 시스템의 취약점 21건**을 담고 있다. 외부 공유 금지.
