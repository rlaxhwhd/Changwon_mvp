# 03. 역할별 데이터 접근 범위

> 현행은 "누가 어떤 학생 데이터를 볼 수 있는가"가 도메인마다 흩어져 있다. 이 문서가 그것을 한곳에 모은다.
> 범위: **sqlmap 34파일 전수 스캔**으로 역할 분기(`SESSION_USER_TY_CD`, `USR_TYPE`, `ADMIN_YN`, `USER_YN`, `USER_DIV_CD`) 를 뽑고, 대표 화면을 추적.

---

## 0. 결론부터 — 범위 규칙이 통일되어 있지 않다

| 층위 | 실태 |
|---|---|
| **URL 접근 제어** | 인터셉터/필터 **없음**. 컨트롤러별 `RETOK` 플래그 방식이고, **REFERER 헤더가 있으면 검사 자체를 건너뛴다.** |
| **화면 노출 제어** | `SY_MENU_AUTH`(DB) 기반 메뉴 트리로만. 메뉴에 없어도 URL은 살아 있다. |
| **데이터 범위 제어** | **SQL의 `<if>` 안에 흩어져 있음.** 세션 기반(안전)과 파라미터 기반(위험)이 혼재. |

---

## 요약

| 역할 | 범위 | 결정 테이블 | 통일된 규칙인가 |
|---|---|---|---|
| **관리자** (`AUTH0006` / `/Sa/*`) | **전체 (제한 조건 자체가 없음)** | — | 예 — 일관되게 "무제한". 단과대·학과 단위 관리자 개념이 **없다.** |
| **상담사** (`T` / `AUTH0005`) | ① 자기 담당 상담건: `COUNSEL_MASTER.CONSULTID = 세션ID`<br>② 학생에게 노출되는 범위: **담당 단과대** `COM_CON_TAR.DAEHAK_CD` | `COUNSEL_MASTER`, `COM_CON_TAR` | **아니오** — 상담사 자신의 목록은 세션 기반(안전)이나, 학생 쪽 슬롯 필터는 `ADMIN_YN` 파라미터로 우회 가능 |
| **교수** (`P` / `AUTH0003`) | ① 본인 상담건: `CON_PROF_INFO.PROF_ID = 세션ID`<br>② 학과 범위: 본인 소속(`V_USR_INF.ORGID`/`HAKBU_CD`) **OR** `TB_CARR_PROF_ASSI_DEPT.DEPT_CD`<br>③ 지도학생: `V_USR_INF.PROF_ID = 세션ID` (`TUTOR_FLAG`) | `CON_PROF_INFO`, `TB_CARR_PROF_ASSI_DEPT`, `V_USR_INF.PROF_ID` | **아니오** — 소속·배정·지도 3개 축이 화면마다 다르게 조합됨 |
| **조교** (`A` / `AUTH0002`) | 배정 학과: **`FU_ASS_DEPT.USR_ID = 세션ID`** → `MAJOR_CD` 또는 `DEPT_CD` 로 학생 필터 | `FU_ASS_DEPT` (**`COM_ASS_DEPT` 는 사실상 죽은 테이블**) | **아니오** — 화면 4개 중 1개(`CoAs020L`)가 파라미터 신뢰 |
| **학생** (`S` / `AUTH0001`) | 본인 건만: `USERID`/`INTG_UID`/`USRID` `= 세션ID` | 도메인별 | 예 (대체로 일관) |
| **기업** (`C` / `AUTH0008`) | 본인 등록 공고: `RE_REC_INFO` 등에서 `SESSION_USER_TY_CD == 'C'` 분기 | `RE_REC_INFO`, `COM_CPRT_MEBR` | 부분적 |
| **멘토** (`MT` / `AUTH0010`) | 본인 멘티: `TB_MENTEE_INFO.MENTO_ID = 세션ID` | `TB_MENTOR_INFO`, `TB_MENTEE_INFO` | 예 |
| **비교과 담당자** (`Mn` 화면) | 본인 등록 프로그램: `EP_PRM.REGID = 세션ID` (단 `SESSION_ADMIN_YN='Y'` 면 해제) | `EP_PRM` | 예 |
| **직원** (`M` / `AUTH0004`) | 제한 규칙이 사실상 없음 (전체) | — | — |

---

## 화면별 상세

**`판정` 열 범례** — 🟢 세션 기반(안전) / 🟡 세션 기반이나 조건 누락 · 일관성 결여 / 🔴 요청 파라미터 신뢰(위조 가능) / ⚪ 범위 조건 없음(설계상 전체 권한)

| 판정 | 역할 | 화면 | 세션에서 꺼내는 값 | WHERE 절 요약 | 예외·구멍 | 근거 파일:라인 |
|---|---|---|---|---|---|---|
| 🟢 | 조교 | 전담교수 배정 확인 `/user/Co/CoAs010L.do` | `SESSION_USR_ID` | `FU_ASS_DEPT.USR_ID = 세션ID` ⨝ `V_USR_INF.MAJOR_CD` | `MAJOR_CD` NULL 배정행은 학생 0명 | co.xml:6352,6362 |
| 🟢 | 조교 | 담당학과 셀렉트 `Co.getMyAssDeptList` | `SESSION_USR_ID` | `FU_ASS_DEPT.USR_ID = 세션ID` | — | co.xml:10066 |
| 🔴 | 조교 | **전담교수 상담실적 `/user/Co/CoAs020L.do`** | (없음) | **`HB.DEPT_CD = #{HAKBU_CD}`** — 화면 파라미터만 | **`HAKBU_CD` 변조 시 타 학과 교수 상담실적 전면 열람.** 컨트롤러는 기본값만 넣고 검증하지 않음 | co.xml:10102 / CoMasController.java:251-272 |
| 🟢 | 조교 | 학생별 역량현황 `/user/Co/CoAs030L·040L.do` | `SESSION_USER_TY_CD`→`USR_TYPE`, `SESSION_USR_ID` | `USR_TYPE='A'` 이면 `V_USR_INF.MAJOR_CD IN (SELECT MAJOR_CD FROM FU_ASS_DEPT WHERE USR_ID=세션ID)` | — | ca.xml:55-56 / CoMasController.java:350 |
| 🟢 | 조교 | 진로목표 현황 (`Fu` 계열) | 동상 | 동일 패턴 | — | fu.xml:296-297 |
| 🟢 | 조교 | 취업통계 `/User/St/*` | `SESSION_USER_TY_CD` | `'A'` → `FU_ASS_DEPT` INNER JOIN `MAJOR_CD` / `HAKBU_CD` | — | st.xml:485-491, 613-617, 5466-5467 |
| 🟢 | 조교/교수 | 대학·학부 셀렉트 `getDaehakAllListV1`/`getHakbuAllListV1` | `SESSION_USER_TY_CD`, `SESSION_USR_ID` | `'A'`→ 본인 소속 OR `FU_ASS_DEPT` / `'P'`→ 본인 소속 OR `TB_CARR_PROF_ASSI_DEPT` | 하드코딩 `DEPT_CD NOT IN ('3')` 존재 | co.xml:6578-6612, 6635-6660 |
| 🟢 | 상담사 | 예약상담 `/user/Co/CoMc010L.do` | `SESSION_USR_ID`, `SESSION_CON_USER_TYPE` | `COUNSEL_MASTER.CONSULTID = 세션ID` (+ `J`→진로 / `C`→취업 상담종류 제한) | — | co.xml:2960-2965 |
| 🟡 | 상담사 | 상담현황 `Co.getCoCu_List` (관리자와 공유) | `SESSION_USER_TY_CD` | `'T' AND ADMIN_YN != 'Y'` 일 때만 `CONSULTID = 세션ID` | `ADMIN_YN` 은 관리자 컨트롤러가 서버에서 `"Y"` 강제 → **관리자 경로는 안전.** 다만 조건이 **역할 문자열 비교라 `T` 가 아닌 다른 역할이 이 쿼리를 타면 전체가 보인다** | co.xml:1185-1187 / CoController.java:995 |
| 🟡 | 상담사 | 상담 상세 `Co.getConsultDetailInfo` | (없음) | `WHERE IDX = #{IDX}` + `<if USER_DIV_CD=='USER'> AND USERID = #{APP_ID}` | **`USER_DIV_CD`·`APP_ID` 모두 요청 파라미터.** 이 값이 안 오면 IDX만으로 임의 상담 상세 조회 (**미확인** — 전 호출부 확인 필요) | co.xml:7711-7714 |
| 🔴 | 학생 | **상담 예약 슬롯 `/user/Co/CoVi010M.do`** | `SESSION_USR_ID` | `<if ADMIN_YN != 'Y'> EXISTS(COM_CON_TAR WHERE CONID=상담사 AND DAEHAK_CD = 학생의 DAEHAK_CD)` | **`ADMIN_YN=Y` 파라미터를 붙이면 단과대 제한이 사라져 전 상담사 슬롯 노출.** 사용자측 컨트롤러가 `ADMIN_YN` 을 세팅하지 않음 | co.xml:6030-6036 / CoUserController.java:118-273 |
| 🔴 | 학생 | 비교과 프로그램 목록/달력 | `SESSION_HAKBU_CD` | `<if USER_YN!='Y' and ADMIN_YN!='Y'> AND EP_PRM.DEPT_CD = #{SESSION_HAKBU_CD}` | 동일 — `ADMIN_YN=Y` 로 전 학부 프로그램 노출 | ep.xml:1188-1191, 1239, 1376, 1757 |
| 🔴 | 공용 | 아르바이트 목록 | (없음) | `<if ADMIN_YN != 'Y'> AND ALBAMASTER.ISAUTH = 1` | `ADMIN_YN=Y` → **미승인(미검수) 아르바이트 공고까지 노출** | re.xml:6304-6306 |
| 🟢 | 교수 | 지도교수 상담 `/user/Pc/PcMp*` | `SESSION_USR_ID` | `PC_CON_PROF_ADV.PROF_ID = 세션ID` ⨝ `PC_CON_PROF_USR` | — | pc.xml:119, 295 |
| 🟢 | 교수 | 학생 목록 (진로/역량) | `SESSION_USR_ID` | `V_USR_INF.ORGID IN (SELECT DEPT_CD FROM FU_ASS_DEPT WHERE USR_ID=세션ID)` 등 | ⚠️ **교수인데 `FU_ASS_DEPT`(조교용)를 본다** — pc.xml:746,771,788 | pc.xml:746-788 |
| 🟢 | 교수 | 학생 상세 접근 `ss.xml` | `SESSION_USER_TY_CD`,`SESSION_USR_ID` | `'P'`→`TB_CARR_PROF_ASSI_DEPT`, `'A'`→`FU_ASS_DEPT` EXISTS | — | ss.xml:1128-1148, 1255-1275 |
| 🟢 | 비교과 담당자 | 프로그램 관리 | `SESSION_USR_ID`, `SESSION_ADMIN_YN` | `<if SCH_USRID=='' and SESSION_ADMIN_YN!='Y'> AND EP_PRM.REGID = 세션ID` | `SCH_USRID` 파라미터를 채우면 조건 자체가 사라짐 🔴 | ep.xml:97-99, 802, 1021, 8542 |
| 🟢 | 학생 | 비교과 신청내역 | `SESSION_USR_ID` | `EP_PRM_APP.USRID = 세션ID` | — | ep.xml:545, 582 |
| 🟢 | 기업 | 채용공고 관리 | `SESSION_USER_TY_CD`,`SESSION_USR_ID` | `'C'` 분기로 본인 기업 공고만 | — | re.xml:2458-2461 외 12곳 |
| 🟢 | 학생 | 게시판 | `SESSION_USER_TY_CD` | `'S'` 분기 | — | bd.xml:381, 1060 |
| ⚪ | 관리자 | 상담현황·상담사관리·전담교수매칭·제한일정·역량진단·통계 등 **관리자 화면 전체** | — | **범위 조건 없음** | 설계상 전체 권한. 단과대 관리자 개념 없음 | 02 문서 각 항목 |

---

## 확인 사항

### 1. 범위 조건이 아예 없는 화면이 있는가? → **있다. 두 종류.**

**(A) 설계상 전체 권한 (관리자) — 문제 아님**
`/Sa/*` 305화면 전부. 관리자에게 부여된 `SY_MENU_AUTH` 만이 유일한 통제 수단이다.

**(B) 인가 검사 자체가 없는 엔드포인트 — 보안 이슈**

| 유형 | 대상 | 엔드포인트 수 | 문제 |
|---|---|---|---|
| **엑셀 다운로드 컨트롤러 14종** | `CaExcel`, `CoExcel`, `CpExcel`, `DtExcel`, `EcExcel`, `ExExcel`, `MtExcel`, `PcExcel`, `ReExcel`, `StExcel`, `SyExcel`, `WaExcel`, `EpExcel`, `ExcelDownload` | **130** | `MultiActionController` 직접 상속 → `setSessionMenu()`·`RETOK` 모두 없음. **세션 없이도 URL만 알면 학생 개인정보 대량 엑셀 다운로드 가능**(추정 — 내부 SQL이 세션값을 요구하면 빈 결과일 수 있음). `CoExcelController` 18건·`ExcelDownload` 44건이 특히 위험 |
| **`CareerActionController` 상속이나 RETOK 미검사** | `MtController`(23), `RmController`(8), `WaController`(3), `CommonController`(46), `CodingController`(15), `MainController`(21), `SmsController`, `MtMm/MtMs/MtUser`(19), `MyMgController`(4), `PaUserController`, `WaUserController`(4), `SessionController`(19) | 약 165 | 메뉴 조회는 하되 `RETOK='N'` 이어도 그냥 진행 |
| **`SmsController`** | `/smsCont/*` 9건 | 9 | **SMS 발송 기능에 인가 검사 없음** |

전체: **1,600 매핑 중 약 295건(18%)** 이 `RETOK` 검사를 아예 거치지 않는다.

### 2. 범위를 화면단(JSP)에서만 거르고 SQL은 전체를 가져오는 화면이 있는가?

**있다 — 다만 "JSP 필터링"이라기보다 "차단이 형식적"인 형태다.**

- `RETOK='N'` 판정 시 컨트롤러는 `response.sendRedirect("/main.do")` 를 호출한 **직후 `return paramMap;` 으로 정상 진행**한다 (예: `CoMcController.java:69-72`).
  → Spring은 그대로 핸들러 메서드를 실행하므로 **SQL은 전부 실행된다.** 응답이 이미 커밋되어 화면에는 안 보이지만, **DB 부하와 감사로그 관점에서는 "조회가 일어난 것"** 이다.
- 관리자 상단 메뉴 `Common.getMenuAdnTop` 은 **`SY_MENU_AUTH` 조인이 없다** (common.xml:409-424). 즉 **권한과 무관하게 관리자 최상위 메뉴 전체를 조회**한 뒤, 화면(JSP)에서 `ADN_LEFT_MENU` 유무로만 관리자 버튼을 노출한다 (`incHeader.jsp:335`).
  → 관리자 메뉴 **구성 정보(메뉴명·URL)가 모든 로그인 사용자에게 전달**된다. 대응하는 `getMenuUserTop`·`getMenuAdnLeft` 는 정상적으로 `SY_MENU_AUTH` 를 조인한다.

### 3. 조교/교수 배정 테이블이 두 벌인 이유(`COM_ASS_DEPT` vs `FU_ASS_DEPT`)는 무엇인가?

**소스 근거로 확인된 사실:**

| 테이블 | 읽는 곳 | 쓰는 곳 | 상태 |
|---|---|---|---|
| `FU_ASS_DEPT` | **18개 statement** (co, fu, ca, pc, ss, st, sy 전 도메인) | `Fu.insertAssDept`(fu.xml:374), `Fu.deleteAssDept`(fu.xml:389) — `/Sa/Fu/sys_assDept.do` | **살아 있는 정본** |
| `COM_ASS_DEPT` | **읽는 곳 없음** | `Co.insertAssDept`(co.xml:6203), `Co.deleteAssDept`(co.xml:6219) — `/Sa/Co/sys_assDept.do` | **쓰기 전용 고아 테이블** |

**해석(추정):**
`Co` 도메인(상담)에서 먼저 만든 `COM_ASS_DEPT` 를, 이후 `Fu` 도메인(진로목표)에서 `FU_ASS_DEPT` 로 **복제·이관**하면서 화면 `Co.assDeptList` 의 **SELECT만 새 테이블로 바꾸고 INSERT/DELETE는 옛 테이블에 남겨둔 것**이다. 두 SELECT문(co.xml:6150 / fu.xml:331)이 컬럼 순서까지 동일한 복붙이라는 점이 이를 뒷받침한다.

**결과:**
- `/Sa/Co/sys_assDept.do` (상담관리>조교/학과 관리) 에서 배정해도 **아무 효과가 없다.** 목록에도 안 나오고 조교 권한도 안 생긴다.
- 실제 배정은 `/Sa/Fu/sys_assDept.do` (진로목표관리>전담조교 매칭) 에서만 가능하다.
- **재구축 시 `COM_ASS_DEPT` 는 폐기하고 `FU_ASS_DEPT` 만 승계할 것.** 단, 운영 DB의 `COM_ASS_DEPT` 에 `FU_ASS_DEPT` 에 없는 배정이 남아 있을 수 있으므로 **이관 전 두 테이블 diff 확인 필요.**

교수 쪽은 별도 3번째 테이블 **`TB_CARR_PROF_ASSI_DEPT`** 를 쓴다(`/Sa/Fu/sys_profDept.do`). 조교/교수 배정을 **하나의 `사용자↔조직 배정` 테이블(역할 컬럼 포함)** 로 통합하는 것이 재구축의 명확한 개선점이다.

---

## 재구축 팀에 주는 권고 (범위 규칙 통일안)

1. **범위 판정은 100% 서버 세션에서만 파생한다.** `ADMIN_YN`·`USER_YN`·`HAKBU_CD`·`USER_DIV_CD`·`APP_ID`·`SCH_USRID` 처럼 클라이언트가 보낸 값으로 범위가 넓어지는 구조를 전부 제거.
2. **범위 결정을 SQL `<if>` 에서 빼내 공통 계층(Repository/Policy)으로 올린다.** 현재는 같은 규칙이 co.xml·fu.xml·ca.xml·st.xml·ss.xml·pc.xml 에 중복 복사되어 있어, 한 곳만 고치면 나머지가 남는다.
3. **역할 표준 4종만 남긴다**: `본인` / `담당 조직(학과·단과대)` / `담당 대상(배정 학생·상담건)` / `전체`. 현행은 여기에 "본인 소속 OR 배정" 같은 OR 조합이 화면마다 다르게 붙어 있다.
4. **관리자에도 조직 범위를 넣을지 결정 필요.** 현행은 관리자=전교 무제한이다. 단과대 행정직원에게 관리자 권한을 주는 순간 전교 상담기록이 열린다.
