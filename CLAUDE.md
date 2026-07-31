# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **진입점: [AGENTS.md](AGENTS.md)** — 역할별 라우팅(학생 작업 → `STU_README.md` / 상담사 작업 → `Counsel_README.md`), 하네스, 빠른 참조. 작업 착수 전 참고.

## 🔑 데이터 원칙 — DB 없음: 모든 상태는 JSON (★가장 중요)

**백엔드·DB가 없다. 따라서 모든 데이터와 "상태 변화(이벤트)"는 DB 대신 JSON으로 표현한다.**
어떤 이벤트가 일어나면 그 결과를 **해당 단일소스(JSON)에 항목을 추가/수정**하는 방식으로 구현한다. 하드코딩 리터럴로 화면에 박지 말 것 (skill `json-dynamic-screen`, `students.ts` 패턴 미러).

### 단일소스 3+1 (여기 말고 다른 데 데이터 두지 말 것)
| 단일소스 | 위치 | 담는 것 |
|---|---|---|
| **학생 JSON** | `src_v2/data/students/*.json` | 학생 프로필·진단·IAP·로드맵·성장·포트폴리오·벌점 |
| **상담사 JSON** | `src_admin/data/counselors/*.json` *(신설 예정)* | 상담사 프로필·역할·담당범위 |
| **비교과프로그램 리스트** | 프로그램 단일소스 JSON | 프로그램 목록·정원·신청자·출석 |
| **채용공고 리스트** | 채용공고 단일소스 JSON *(데이터 추후 제공)* | 상담사가 CRUD하는 공고 |

### 이벤트 → JSON 반영 매핑 (이게 이 프로젝트의 심장)
"무슨 일이 일어나면 → 어디에 무엇을 추가/수정하나"를 항상 이 표대로 설계한다.

| 이벤트 | 추가/수정 대상 (단일소스) | 런타임 키(localStorage) |
|---|---|---|
| 학생이 비교과 신청 | 학생 JSON 신청목록 + 프로그램 신청자 | `dc_program_apply` |
| 상담 신청 | 상담 요청 스토어 | `dc_counsel_requests` |
| 상담 완료·코멘트 | 상담 기록(→ 학생에 반영) | `dc_counsel_records` |
| IAP 유형 확정 | 학생 JSON IAP | `dc_iap_result` |
| 상담사가 로드맵 수정 | 학생 로드맵 override | `dc_roadmap_overrides` |
| 로드맵 변경 요청 | 로드맵 요청 스토어 | `dc_roadmap_requests` |
| 비교과 미참여 벌점 | 학생 JSON 벌점 | `dc_penalty` |
| 상담사가 채용공고 등록/수정/삭제 | 채용공고 리스트 | `dc_jobs` |
| 상담사가 새 프로그램 등록 | 비교과프로그램 리스트 | `dc_programs` |

### 런타임 반영 방식 (파일은 못 쓰니까)
브라우저에서 JSON 파일을 직접 못 쓰므로, **base JSON(seed) + `localStorage` 오버레이 = 병합 렌더**로 처리한다.
원본 JSON은 그대로 두고 이벤트 결과(override)만 localStorage에 쌓아, 읽을 때 병합해서 보여준다. → 이래야 "상담사가 고치면 학생 화면에 반영", "학생이 신청하면 상담사 접수함에 뜸"이 DB 없이 성립. 상세 흐름은 `Counsel_README.md` §7.

---

## 🗄️ 실제 운영 DB 구조 (★ 모든 코드 작성 시 필수 참조)

**이 프로젝트는 신규 구축이 아니라 현재 운영 중인 드림캐치 사이트의 고도화다.** 실제 Oracle DB(`dream` / 스키마 `DREAMCATCH`, 428테이블)가 존재하며 2026-07-29 직접 조사로 구조를 확보했다.
프로토타입은 JSON mock이지만, **JSON 스키마·필드명·데이터 소유권은 아래 실제 DB 구조에 맞춰 설계한다.** 그래야 DB 전환이 로더 교체만으로 끝난다.

| 문서 | 내용 |
|---|---|
| **`SPEC.md`** | **★ 화면 구현 기준** — 로그인 유형별 화면·기능 명세 · React 구현 규약 · **필드 사전 · 코드 사전**(일관성 핵심) · 대학원 요건. **화면 작업 시작 전 필독** |
| **`DB.md`** | SPEC.md의 근거 — 현행 DB 실측 · 소스 분석 결과 · 데이터 소유권 경계 |
| `docs/DB_CURRENT.html` | **현행 운영DB 실사** — 학사DB 수신 데이터 / 자체 구축 데이터 전수 (다이어그램 3 + 표 17) |
| `docs/DB_ERD.html` | 신규 설계 ERD (`DC_*` 2존 구조) — **2026-07-31 실사 반영 개정**. 키=`INTG_UID`, `SY_AUTH` 계승, 현행 자산 판정표(§14) 포함 |
| **`docs/_analysis/`** | **★ 현행 소스 전수 분석 결과 (2026-07-31 회수 완료)** — 사이트맵 1,596 URL · 화면별 데이터흐름 22 · 역할별 접근범위 · 테이블 사용처 335 · 지정질문 15 답변 · 발견사항. ⚠️ `06_findings.md`는 운영 취약점 21건 포함 — **외부 공유 금지** |
| `docs/REMOTE_ANALYSIS_PROMPT.md` | 위 분석을 원격 PC에서 수행시킨 지시서 (재조사 시 재사용) |
| `docs/dbmeta/*.sql` · `out/*.csv` | 추출 스크립트와 원본 조사 결과 (out/은 gitignore) |

### ★ 이것은 신규 구축이 아니라 **이관** 프로젝트다

**마일리지를 제외한 사실상 전 도메인이 현행 운영 데이터를 이관받는다.** 빈 DB로 출발하지 않는다.
이관 대상: 상담(5.4만) · 교수상담(18.4만) · 비교과(6.8만) · 상담사·배정 · 채용·이력서(1.7만) · 역량(8.4만) · 진로설계(1.4만) · 공통코드·첨부·권한.
**제외: 마일리지(`EX_ITEM` 계열).** 신설 도메인(진단·IAP·로드맵·성장일지·퀘스트)은 이관 대상 없음.

이 전제에서 나오는 강제 사항:
1. **`INTG_UID` 키 결정은 되돌릴 수 없다** — surrogate로 바꾸면 24만 건 상담 이력 재매핑.
2. **모든 상태값 코드에 현행 값(`legacy`)을 반드시 남긴다.** 이것이 곧 이관 매핑표다 (`SPEC.md` §7-0).
3. **신설 컬럼은 NULL 허용 + 화면 폴백** 전제로 설계. NOT NULL로 잡으면 이관이 막힌다.
4. **구조 변경은 "이관 매핑을 쓸 수 있는가"를 통과해야 한다.** 1:1이 아닌 변환은 규칙을 함께 문서화.

### 데이터 소유권 경계 — 이것만은 절대 헷갈리지 말 것

| | 학사DB (BRDB) | 드림캐치 (dream) |
|---|---|---|
| 경로 | **DB 링크 `V_BRDB`** (야간 적재, 매일) | 로컬 |
| 권한 | **읽기 전용** — 절대 쓰지 않는다 | 전체 CRUD |
| 담는 것 | **사람과 조직만** | 그 외 전부 (이벤트·판단·산출물) |
| 테이블 | `V_USR_INF` · `V_DEP_INF(_ALL)` · `V_ADD_JOB_PART` | 나머지 424개 |

- **전 시스템 조인키 = `INTG_UID`** (학사DB 발급. 학생=학번, 교직원=사번). 내부 surrogate 만들지 말 것.
- **학생·교직원은 한 테이블(`V_USR_INF`)에 있고 `USER_TY_CD`로 구분**한다. 학생/교수/조교/직원 별도 테이블 없음.
- 조직은 `V_DEP_INF_ALL` **자기참조 계층**(`DEPT_UP_CD` + `LVL`). 대학/학부/학과 별도 테이블 없음.
- **`V_USR_INF`는 113,733행 = 졸업생·퇴직자 누적.** 조회 화면은 반드시 학적상태(`HOFC_STA_CD`) 필터를 건다.

### 학사에서 받는 주요 필드 (`V_USR_INF`, 43컬럼)

`INTG_UID`(PK) · `LOGIN_ID` · `USER_TY_CD`(신분) · `USR_NM` · `SEX` · `AGE` · `PHOTO` ·
`DAEHAK_CD`(대학) · `HAKBU_CD`(학부) · `MAJOR_CD`/`MAJOR_CD2`(전공/복수전공) ·
`STU_SCHGR`/`GRADE`(학년) · `HOFC_STA_CD`(학적상태) · `ENTER_DT` · `OUT_DT`/`OUT_STAT` · `ISU_CNT`(이수학기) ·
**`PROF_ID`(지도교수)** · `DEAN_FLAG` · `TEL`/`HP`/`EMAIL`/`ADDR1`

### 받을 준비만 하고 비어 있는 것 <span>(0행)</span>

`V_SUGANG`(수강·성적: `CURI_NUM` 과목코드·`GRADE` 등급·`GPA`·`COURSE_CLS` 이수구분·`FINISH_YN`) ·
`V_LECT_INF`(강의개설: `CURI_NM` 과목명·`CDT_NUM` 학점·`PROF_ID`·`CAP_PER` 정원)
→ **스킬트리·직무로드맵의 전제 데이터가 여기다.** 테이블도 DB링크도 있으나 적재가 꺼져 있음. 학사 원본 뷰 이름은 `수강전체`(`VIEW_SUGANG_ALL`)·`수업개설`(`VIEW_SUUP_GAESUL`).

### 현행 자체 테이블 ↔ 우리 화면 대응 (재사용 대상)

| 우리 화면 | 현행 테이블 | 행수 |
|---|---|---|
| 상담(진로·취업·심리) | `COUNSEL_MASTER`(신청+결과 한 행) · `COUNSEL_PROBLEM` · `COUNSEL_FAM` | 5.4만 |
| 상담 가능시간 | `BASICSETTING` (일자×시×분 슬롯 전개) | 57만 |
| 상담사 | `COM_CON_INF`(26명) · `COM_CON_TAR`(담당 단과대) · `CO_CON_SCH` | — |
| 교수상담 | `CON_PROF_INFO` · `CO_ADVISER`(지도교수 배정) | 18.4만 |
| 조교 | **`FU_ASS_DEPT`**(정본) — `COM_ASS_DEPT`는 **읽는 곳 0건인 고아 테이블** | 190 |
| 비교과 | `EP_PRM`(125컬럼) → `EP_PRM_STEP`(차수) → `EP_PRM_APP`(신청) → `EP_PRM_RESULT`(역량점수) | 6.8만 |
| 비교과 마일리지 | `EX_ITEM` / `EX_ITEM_APP` / `EX_ITEM_SCORE` | 1.1만 |
| 역량 현황 | `TB_CARR_CAPA_STTS`(학점·토익·자격증·봉사·수상·인턴…) · `TB_CARR_ETR_CAPA`(기업 요구역량) | 8.4만 |
| 진로설계 | `STU_COURSE_INFO`(+`_DTL`) · `STU_COURSE_CAREER_LICN`/`_LANG`/`_ACTIVE` · `ST_GOAL`(목표기업) | 1.4만 |
| 채용 | `JOBSMASTER`(82컬럼) · `JOBSOCCUPATION` · `JOBSAREA` · `APPLICATIONMASTER`(지원) | 1.7만 |
| 직무 분류 | `FU_JOB_MSTR`(3계층) · `FU_PURPOSE_ADD_JOB`(희망직무 3만) | — |
| 이력서·자소서 | `SS_JOB_RES`(+상담사 첨삭 `CONCONT`/`STATUS`/`CON_ID`) · `JOB_SELF_INT` | — |
| 공통코드 | `SY_CODE`(`GRP_CODE`+`CODE`, 3,874행) | — |
| 권한·메뉴·첨부 | `SY_AUTH` · `SY_MENU` · `SY_FILE` · `SY_AGREE`(동의) | — |

### 권한·역할 체계 (RBAC) — 관리자 화면의 기반

역할을 코드로 정의해 사람에게 붙이면 메뉴 접근이 결정되는 구조가 **이미 갖춰져 있다. 새로 만들지 말고 계승한다.**

```
SY_AUTH        역할 마스터   13건   AUTH_CODE(PK)·AUTHNM·AUTH_EXPL·BASEGRUP_YN(기본그룹)·USE_YN
   ↓ AUTH_CODE
SY_AUTH_USER   사람 ↔ 역할   52명   AUTH_USER = INTG_UID
SY_MENU_AUTH   역할 ↔ 메뉴   972건
   ↓ MENU_CODE
SY_MENU        메뉴 트리     343건  MENU_CODE(PK)·MENU_URL·MENU_LEVL·PRTCODE(상위)·USER_DVID
SY_AUTH_LOG    권한 변경 이력 278건
```

- **학생은 권한 테이블에 없다.** 배정 인원이 52명뿐 — 권한 체계는 **백오피스 전용**이다. 학생은 `V_USR_INF.USER_TY_CD`(학사 신분)만으로 학생 화면에 진입한다. `SY_AUTH.BASEGRUP_YN`이 기본값 역할.
- **★ 역할 기본권한은 코드가 자동 부여한다** (`PUtil.java:1002-1031`). 세션의 신분 1글자를 보고 `AUTH0001`(학생)·`AUTH0002`(조교)·`AUTH0003`(교수)·`AUTH0004`(직원)·`AUTH0005`(상담사)를 붙인다. **`SY_AUTH_USER` 52명은 전체 권한자가 아니라 "추가권한(`AUTH0006` 슈퍼관리자 등) 보유자" 명단이다.**
- **모델은 표준적인데 실행부가 강제하지 않는다.** 인가 필터·인터셉터가 없고, 검사가 **`REFERER` 헤더가 없을 때만** 동작하며, 엑셀 다운로드 130개 엔드포인트는 인가 로직 자체가 없다. → **4테이블 모델은 계승하되 "URL ↔ 필요권한"을 서버 단일 지점에서 강제한다.**
- **상담사는 이중 등록**이다. `SY_AUTH_USER`(메뉴 접근 권한) + `COM_CON_INF`(상담사 실체·업무 속성). 그리고 `COM_CON_INF`에 `INOUT_GB`(내외부구분)와 **`CONPWD`(자체 비밀번호)** 가 있다 → **외부 위촉 상담사는 SSO 밖 자체 인증**을 쓴다. 같은 패턴이 `TB_CARR_USER` + `TB_CARR_USER_LOGIN`(기업 담당자·멘토용 2차 인증 경로)에도 있다.
- **통제 범위는 "메뉴"까지다.** "어떤 학생 데이터를 볼 수 있나"(행 수준)는 통합 규칙 없이 도메인마다 흩어져 있다 — 상담사=`COM_CON_TAR`(담당 단과대) · 교수=`TB_CARR_PROF_ASSI_DEPT` · 조교=`COM_ASS_DEPT`/`FU_ASS_DEPT`.
- 2025-03-01에 권한 체계를 개편한 흔적(`SY_AUTH_20250301`·`SY_MENU_20250301` 등 스냅샷). **권한 구조를 건드릴 때 백업을 뜨는 관행**이 있다.
- **데이터 열람 감사는 없다.** `SY_AUTH_LOG`는 권한 변경만 기록한다.

### 현행에 없어서 우리가 신설하는 것

IAP 6유형(R1~R6) · 경력개발 로드맵(단·중·장기) · 스킬트리/직무적합도 · 성장경험일지 · 퀘스트·레벨·랭킹 · **열람 감사로그** · **행 수준 접근 제어 통일**(현재 도메인마다 흩어짐) · **상태 변경 이력**(현행은 권한 변경만 남는다) · 학생×공고 매칭도 · 교수 상담 노출 제어(`CO_PROF`·`PC_CON_PROF_*` 전부 0행)

> **정정 (2026-07-31 소스 전수 분석).** 아래 두 가지는 "신설"이 아니었다.
> - **진단 4종 → 구조 계승.** `CHECK_*` 8종은 **소스 참조 0건인 죽은 스키마**였다. 실제로는 `CA_SURVEY`/`CA_SURVEY_QUS`/`CA_SURVEY_TAR` 계통이 **학생 단독 응시를 이미 지원**한다(회차 개설 → 대상자 지정 → 응시 → 결과 + 로그인 시 미실시 배지). **가져오는 것은 이 4단 뼈대와 "진단은 상담에 종속되지 않는다"는 원칙뿐이고, 문항·역량축·판정 로직·대상자 규칙은 신설한다** — 특히 대상자 규칙은 현행이 `USER_TY_CD='1101'`(학부 재학생)이라 계승하면 대학원생이 빠진다.
> - **비교과 노쇼 벌점 → 그대로 계승.** `EP_PRM_APP.STATUS`에 `9`=불참(벌점 1점)·`10`=불참(벌점 3점)이 이미 상태값으로 있고 블랙리스트 화면도 운영 중이다.

### 코드 작성 규칙 (이 DB 구조에서 나온 것)

1. **학사 유래 데이터는 읽기 전용으로 다룬다.** 학생 이름·학과·학년·학적상태를 우리 쪽에서 수정하는 UI/로직을 만들지 않는다.
2. **이벤트 레코드에는 발생 시점 스냅샷을 함께 저장한다.** 현행 `EP_PRM_APP`이 이미 신청 시점 `HOFC_STA_CD`·`STU_SCHGR`·`EMAIL`·`HP`를 복사해 둔다. JSON mock도 같은 패턴을 지킨다.
3. **파생값은 원본에 넣지 않는다.** 매칭도·적합도·집계는 별도 구조로 분리.
4. **상태값은 코드+라벨로 분리**한다(현행 `SY_CODE` 패턴). 한글 리터럴을 값 자체로 쓰지 않는다.
5. **FK가 없는 DB다**(제약 157건 중 FK 3건). 정합성은 애플리케이션이 전담한다는 전제로 방어 코드를 둔다.
6. **역할·권한은 `SY_AUTH` 체계를 계승한다.** 새 role 열거형을 만들지 말고 역할 코드를 추가하는 방식으로 간다. 학생은 권한 부여 대상이 아니라 `USER_TY_CD`로 판정한다. 외부 상담사·기업 담당자는 SSO 밖 자체 인증 경로가 있다는 것을 전제한다.
7. **학과 트리는 `V_DEP_INF_ALL`로 구성한다. `V_DEP_INF`를 쓰면 대학원이 빠진다.**
   현행 관리자 "조교학과 배정"(`Fu.assDeptList2`)이 **대학원 학과를 누락하는 원인이 두 가지**다(소스 확인 완료 — 상세는 `DB.md` §4-1):
   ① **`V_DEP_INF`(1,679행)를 쓴다** — `V_DEP_INF_ALL`(1,921행)보다 242개 적다.
   ② `LEFT OUTER JOIN V_DEP_INF C` 인데 `WHERE C.USE_YN='Y'` 조건이 있어 **outer join이 inner join으로 붕괴** → **전공(LVL3)이 없는 학과가 전부 탈락**한다. 대학원 학과가 여기서 대량 누락된다.
   → 우리는 `V_DEP_INF_ALL`을 쓰고, `USE_YN` 조건은 `ON` 절로 옮기거나 `OR C.DEPT_CD IS NULL`을 붙인다. `GRP_CD`(`0001`단대/`0002`학과/`0003`전공/`0004`기관) + `DEPT_UP_CD`+`LVL`로 트리를 만들고, **`UNIV_CODE`(`00`학부/`01`석사/`02`박사/`03`~`12`전문대학원)를 필터·표시 축에 반드시 포함**한다. 폐과(`USE_YN='N'`, 639건)는 목록에서 숨기되 **과거 배정·신청 데이터는 보존**한다.
   ※ 동명 학과가 과정별로 여러 개 존재하므로(`신소재공학부` 505·501·1528·2528) **학과명 매칭 금지 — `(단대코드, 학과코드)` 쌍으로 식별**한다.
8. **★ 신분코드를 리터럴로 쓰지 않는다.** 학생 대상 판정은 반드시 집합 상수로 한다.
   현행은 `USER_TY_CD='1101'`(재학생-**학부**)이 sqlmap **229곳**에 박혀 있고 `'1201'`(재학생-**대학원**)이 조건에 들어간 곳은 **단 3곳**이다. **대학원생이 시스템에서 사라지는 1차 원인이 학과 트리가 아니라 이것이다.**

   | 코드 | 의미 | | 코드 | 의미 |
   |---|---|---|---|---|
   | `1101` | 재학생-학부 | | `1301` | 교원 |
   | `1102` | 졸업생-학부 | | `1401` | 직원 |
   | **`1201`** | **재학생-대학원** | | `1501` | 조교 |
   | **`1202`** | **졸업생-대학원** | | | |

   → 재학생 조회는 `STUDENT_ENROLLED = ['STU_UG','STU_GR']`(=`1101`,`1201`)를 쓴다. **학부 한정이 정책인 곳(예: 학부 기준 취업통계)은 그 이유를 주석으로 남긴다.** 전체 코드 대장은 `SPEC.md` §7.
9. **대학원생은 비교과 신청과 교수 상담신청이 가능해야 한다** (요구사항 확정).
   - 비교과: `ep.xml`에 학부 한정 필터가 없어 **이미 열려 있다**. 참가대상 플래그도 `TRGT_STU21~24`(대학원)/`TRGT_STU31~35`(학부)로 분리 존재. UI에 대학원 학년을 노출하고 알림·SMS 대상에서 빠지지 않게 한다.
   - 교수상담: 신청 기록(`CON_PROF_INFO`)에는 제약이 없고, 막히는 곳은 **교수 목록 조회**(`Co.getProfList`)의 소속 매칭 + `RANKID IN ('1001','1002','1003')` 직급 3종 한정이다. 소속 매칭을 `V_DEP_INF_ALL` 기준으로 바꾸고 직급 화이트리스트를 코드 테이블로 뺀다.
   - ※ 오프라인 교수상담 슬롯은 **상담사와 같은 `BASICSETTING` 테이블**을 쓴다(`CONSULTANTID`에 교수 `INTG_UID`). 슬롯 모델을 상담사 전용으로 설계하지 말 것.

### 확정된 것 <span>(2026-07-31 소스 전수 분석)</span>

1. **역량 체계** = `EP_PRM`계. **화면 표시는 5종**(지역형리더·창의적사고·실용적융복합·의사소통·글로벌), **6번째 `인문`은 전 화면 주석 처리**(스키마는 6, 화면은 5). 단 "역량" 축이 3개 공존한다 — 진단설문(`CA_SURVEY`) / 누적점수(`CA_GOAL`+`CA_GOAL_DATA`) / 마일리지 배분(`EX_ITEM`). **화면을 만들 때 어느 축인지 명시할 것.** 상세 `SPEC.md` §7-9.
2. **대학원 포함 = 확정.** 요구사항으로 확정됐다(비교과 신청·교수 상담신청 가능해야 함). 차단 지점은 위 규칙 8·9.
3. **진로설계(`STU_COURSE_*`)는 살아 있다.** 학생 화면·관리자 집계·인재검색 탭에서 사용 중. 단 INSERT 0건 — 행 최초 생성 경로 미확인.
4. **상담 가능시간은 "가능"을 등록한다.** `BASICSETTING`(상담사 슬롯) ↔ `TB_CARR_CNSL_EXCL_HR`(관리자 제한)는 역할이 분리돼 있고 **학생 예약 화면은 `BASICSETTING`만 조회**한다.

### 미결 — 확인 전까지 임의 확정 금지

1. **역량 `인문`(6번째)을 되살릴지** — 스키마·SQL은 6개를 계산하는데 화면만 5개다.
2. **관리자 제한일정을 학생 예약 화면에 반영할지** — 현행은 반영 안 함(상담사가 슬롯을 지워야 함). 의도인지 미구현인지 현업 확인 필요.
3. **대학원생 진단 정책** — C-2/C-3/C-4 학년 매핑이 학부 기준(1~4). 대학원은 1~3.
4. **대학원 수료생을 상담·비교과 대상에 포함할지.**
5. **비교과 참가자격 판정 함수 `FN_GET_PRM_TRGT_YN()` 본문** — PL/SQL 안에 있어 소스로 확인 불가. 대학원생 신청의 최종 관문.
6. **이관 시 현행 데이터를 정제할지** — `COM_ASS_DEPT` 잔여 배정, `CON_GB` 1/3 라벨 중복.

---

## Project

국립창원대학교 역량개발관리시스템 "드림캐치(DREAMCATCH)" 학생 포털 UI 프로토타입.
React 19 + TypeScript 5.9 + Vite 8 기반 SPA. 프론트엔드 전용, 백엔드 없음, 모든 데이터는 **JSON 동적 mock**(하드코딩 금지 — 위 "데이터 원칙" 참조).
데스크톱 전용 (min-width 1280px).

## 🧪 진단검사 명칭·학년 매핑 (확정)

학생 진단센터·AI라운지의 진단검사는 **4종**이다. 옛 명칭(유형분류·자기이해·CARES·KVCT·SPRINT·NEO 등)은 **전부 폐기**하고 아래 C-체계로 통일한다. **C-1은 존재하지 않는다(번호는 C-2부터).**

| 명칭 | 진단 영역 | 상태 |
|---|---|---|
| **C-2 진로설정 진단검사** | 진로 목표·설계 수준 | 검사시작 |
| **C-3 역량수준 진단검사** | 핵심역량 보유 수준 | 검사시작 |
| **C-4 구직역량 진단검사** | 취업 준비·구직 전략 | 검사시작 |
| **C-CORE 핵심진단검사** | 6유형 분류(핵심·공통) | 결과보기(완료) |

**학년별 응시 — 선택(1개 필수) + 공통(1개 필수):**

| 학년 | 선택 | 공통 |
|---|---|---|
| 1 | C-2 | C-CORE |
| 2 | C-2 · C-3 | C-CORE |
| 3 | C-2 · C-3 | C-CORE |
| 4 | C-3 · C-4 | C-CORE |

- 상태 규칙: **C-CORE만 결과보기(done)**, 나머지는 검사시작(available).
- 단일소스: `src_v2/data/careerProcess.ts`(`DIAGNOSIS_MODULES`). 라운지 결과요약은 `AiLounge.tsx`(`TEST_SUMMARIES`), 상세 이름맵은 `DiagnosisResultDetail.tsx`(`TEST_NAMES`).
- 학년별 선택/공통은 **정책(문서)** 이며 현재 진단센터 UI는 4종을 모두 노출한다(학년 필터링 미구현).

### 개발 준수사항
# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. 재생성 금지
기존 코드를 재사용 할 수 있으면 재사용해라 똑같은 기능을 굳이 재생성 하지말라

### Routing
React Router 미사용. `App.tsx`에서 `useState<PageId>` + `switch` 문으로 라우팅.
`useRef<PageId[]>` 기반 히스토리 스택으로 뒤로가기 지원 (불필요한 리렌더 방지).

### Page Hierarchy
- TopHeader: 아이콘 네비게이션 바 (카테고리 → 드롭다운 메뉴)
- 1-depth 메뉴 → 2-depth 페이지 구조 (예: 진로심리검사 → 9CORE검사, 인적성검사)

### Components
- `Modal` (sm/md/lg) — 모든 상세보기에 사용. Drawer 사용하지 않음.
- `FormField` — 라벨+인풋 래퍼
- `ConfirmDialog` — 확인/취소 다이얼로그
- `EmptyState` — 데이터 없음 상태
- `TopHeader` — 상단 로고바 + 아이콘 네비게이션
- `CRAReport` — CRA 진로준비도 진단검사 결과표 (HTML)

### Patterns
- 모든 페이지는 `onNavigate`, `onToast` props를 받음
- Chart.js + react-chartjs-2 (Radar: NineCore, Bar: Aptitude)
- Font Awesome 6 아이콘, Noto Sans KR 폰트
- 스타일: `src/index.css` (단일 CSS 파일, CSS 변수 기반)


## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- UI/UX 디자인 해줘, 디자인 개선해줘, 예쁘게 만들어줘, UI 만들어줘 → invoke ui-ux-pro-max
- 사진/이미지를 코드로 변환해줘, 이 디자인 그대로 구현해줘 → invoke image-to-ui
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## 하네스: 드림캐치 화면 제작 팀

**목표:** 상담사·관리자·교수·학생 화면을 **Claude Code(기획·검수) × Codex(구현)** 협업으로 실서비스 투입 수준(JSON 동적)으로 제작·유지한다.

**트리거:** 드림캐치 UI 화면 제작·수정 요청("화면 만들어줘/추가/수정/재실행/개선", "이 이미지대로 만들어줘", "상담사·관리자·교수·학생 화면 작업") 시 `dreamcatch-orchestrator` 스킬로 팀장(`team-lead`)이 주도한다. 단순 질문·조회는 직접 응답 가능.

**핵심 원칙:** Claude와 Codex는 메모리를 공유하지 않으며 **파일(`.ai/handoff/`)로만 소통**한다(규약 `.ai/interop.md`). 5단계 흐름: ①팀장(Fable)이 메모리 읽고 이미지를 프로젝트에 맞게 교정·기획 → ②③Codex가 이미지 분석·컴포넌트 분리·구현 → ④⑤리뷰어(Opus)가 디자인토큰/유지보수·내용 정합성 검수. 로그인 역할(학생/상담사/교수/관리자)은 에이전트가 아니라 컨텍스트로 주입하고 **읽기 범위를 역할별로 격리**한다. 신규 화면은 하드코딩 금지·JSON 동적(skill `json-dynamic-screen`). 디자인은 `DESIGN.md`(base)+역할 레이어 토큰만, `frontend-design`은 craft만(새 팔레트·폰트 금지).

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-10 | 초기 구성 | 전체 | 팀장+기획/디자인/개발/QA 팀 + dreamcatch-orchestrator·json-dynamic-screen 스킬 신규 구축 |
| 2026-07-10 | 디자인 리뷰 단계 추가 + 디자인 스킬 라우팅 | designer.md, orchestrator, CLAUDE.md | 실제 렌더 시각 리뷰 도입, MengTo/Skills 참조 배선 |
| 2026-07-10 | 상담사 포털 /admin 전체 사이트맵 구현 | src_admin/ 전체 | 상담관리·학생관리·로드맵편집기·채용공고·비교과·설정 (JSON 동적) |
| 2026-07-10 | 전용 design-reviewer 에이전트 추가 | .claude/agents/design-reviewer.md, orchestrator | Phase 3.5 렌더 검수를 designer에서 gstack 기반 전용 에이전트로 분리 |
| 2026-07-10 | 유지보수 감사·리팩터 설계 에이전트 추가 | .claude/agents/{maintainability-reviewer,architecture-planner}.md | 스택(React/TS/Vite) 맞춤 부채 감사(sonnet)→ADR 설계(opus) 미니 파이프라인. 리포트 JSON 핸드오프(.claude/analysis/) |
| 2026-07-10 | 유지보수 감사 단계를 파이프라인에 편입 | orchestrator, AGENTS.md | Phase 3.7(QA 직전): maintainability-reviewer→architecture-planner 드리프트 감사·설계 |
| 2026-07-14 | **Codex 협업 하네스로 재구성** | agents 전체·orchestrator·AGENTS.md·`.ai/` | Claude Code(기획·검수) × Codex(구현) 5단계 파일 핸드오프. 기존 8에이전트 삭제 → `team-lead`(fable)·`codex-implementer`·`design-reviewer`·`content-reviewer`(opus). 소통 버스 `.ai/interop.md`+`.ai/handoff/_schema.md` 신설. frontend-design=craft만·토큰 잠금, 역할별 읽기 범위 격리 |
| 2026-07-14 | **모드 B(데이터 파이프라인) 추가** | agents(+developer·architecture-planner 복원)·orchestrator·AGENTS.md | 디자인/Codex 없이 실제 JSON 데이터 흐름(학생↔상담사 연계·하드코딩 제거)용. team-lead가 모드 A(Codex-UI)/B(데이터) 판별 라우팅. architecture-planner 입력을 maintainability-report→team-lead 데이터-흐름 스펙으로 적응. Codex 하네스는 보존(코이그지스트) |

### 디자인 스킬 라우팅 (가드레일)

**디자인은 `DESIGN.md`에 잠겨 있다. 어떤 디자인 스킬도 새 팔레트·스타일을 생성하지 않는다 — 적용/리뷰만.**
- 렌더 후 시각 리뷰·drift 감사 → gstack `/design-review` + `/browse`
- 구현 기법·캡처·레퍼런스→스펙 참조 → MengTo/Skills(설치 아님, 참조): `C:\Users\njob\.claude\refs\MengTo-Skills\agent-skills\` 에서 해당 SKILL.md만 Read
- ui-ux-pro-max·MengTo의 landing/style 생성류는 **직접 디자인 생성에 쓰지 않음**(아이디어만, DESIGN.md 토큰으로 환원)
