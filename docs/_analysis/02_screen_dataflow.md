# 02. 화면별 데이터 흐름

> **범위: 샘플 22화면** (지시서 §4 우선순위 1~3 = 관리자·조교·상담사 중심). 전수 아님 — 미작성 영역은 `99_progress.md` 참조.
> SQL은 원문 대신 **테이블·조인·조건 요약**. 개인정보·접속정보 없음.
> ★ **범위 제한** = "누가 볼 수 있는가"를 결정하는 WHERE 조건. 재구축의 핵심 정보.

---

## 0. 전 화면 공통 규약 (개별 블록에서 반복하지 않음)

**목록 페이징 — 전 화면 동일 패턴 (Oracle ROWNUM 2중 서브쿼리)**
```
SELECT TT.* FROM (
  SELECT CEIL(ROWNUM/#{VIEW_SIZE}) AS PAGE, TOTAL_CNT-ROWNUM+1 AS RNUM, TA.*
  FROM ( ...본 쿼리..., COUNT(*) OVER() TOTAL_CNT ) TA
) TT WHERE PAGE = #{CURR_PAGE}
```
- 총건수는 **윈도우 함수 `COUNT(*) OVER()`** 로 첫 행에서 뽑아 `dataMap.put("TOTAL_CNT", resultList.get(0).TOTAL_CNT)`.
- `CURR_PAGE` 기본 1, `VIEW_SIZE` 기본 10 (`@RequestParam defaultValue`).
- **주의: 전체 결과셋을 만든 뒤 페이지를 자르므로 대용량에서 느리다.**
- 정렬은 안쪽 `ORDER BY` 고정. 일부 화면만 `${SCH_ORD} ${SCH_ORD_WAY}` 동적(→ SQL 인젝션, `06_findings.md`).

**검색 파라미터 네이밍**: `SCH_*` (`SCH_TYPE` 검색기준, `SCH_WORD`/`SCH_TEXT` 검색어, `SCH_ST_DATE`/`SCH_ED_DATE` 기간, `SCH_STATUS` 상태, `SCH_DAEHAK_CD`/`SCH_HAKBU_CD` 소속).

**코드→라벨 변환**: Oracle 함수 **`FN_CODE('그룹코드','코드')`** 를 SQL 안에서 직접 호출. 셀렉트박스는 자바 `CommonData.getComCodeOrdrList("0146")` 로 `SY_CODE` 조회. (자세히는 `05_answers.md` Q4)

**첨부**: `SY_FILE` 단일 테이블에 `TAB_NM`(도메인 구분) + `TAB_SEQ`(원본 PK) 로 붙인다. (Q5)

**로그**: 모든 `CareerActionController` 요청은 `CURRENT_MENU_CODE` 가 있으면 `SY_MENU_LOG` 에 INSERT. 로그인 시 `SY_LOGIN_LOG`. (`CareerActionController.java:150-173`, `sy.xml:10,30`)

---

# A. 관리자 화면 (우선순위 1)

## [관리자] 상담 현황 — `/Sa/Co/CoCm010L.do`

- **Controller**: `CoController.java#CoCm010L` (CoController.java:976)
- **JSP**: `/WEB-INF/jsp/admin/Co/CoCm010L.jsp`

**① 목록 조회**
- statement: `Co.getCoCu_List` (co.xml:1090)
- FROM/JOIN: `COUNSEL_MASTER A` ⨝(INNER) `V_USR_INF B` ON `A.USERID = B.INTG_UID` ⨝(LEFT) `COM_CON_INF C` ON `A.CONSULTID = C.CONID` ⨝(LEFT) `V_DEP_INF_ALL DH/HB` (대학/학부명) ⨝(LEFT) `STU_WARNING_INFO W` ON 학번+년도+학기
- 고정 WHERE: 없음 (`WHERE 1=1`)
- ★ **범위 제한**: `<if test="SESSION_USER_TY_CD == 'T' and ADMIN_YN != 'Y'"> AND CONSULTID = #{SESSION_USR_ID}` (co.xml:1185)
  → **관리자(`ADMIN_YN='Y'`)는 전교 모든 학생의 상담기록을 제한 없이 조회한다.** 단과대/학과 제한 없음.
  → `ADMIN_YN` 은 컨트롤러가 `dataMap.put("ADMIN_YN","Y")` 로 서버에서 강제(CoController.java:995) — 이 화면은 안전.
- 화면 표시 컬럼: 신청일시(`COUNSELSDATE`) / 상담일시(`CONSULTDATE`) / 등록일 / 상담유형(`CONSULTTYPE`→`FN_CODE('0146',...)`, 단 `COUNSELTYPEIDX='2'`면 '취업' 고정) / 상태 / 학생명·학번·학년·연락처·이메일·성별 / 상담사명 / 대학·학부 / **마일리지 B·C** (`STU_CON_POINT` 합계) / **장기결석·학사경고 이력**(`STU_WARNING_INFO`) / 연계유형·연계접수유형 / 학적상태
- 파생·가공:
  - `COUNSELSTATUSIDX` → CASE 1신청·2완료·3학생취소·4상담사취소 (co.xml:1111-1115)
  - `LINK_TYPE`/`LINK_RCT_TYPE` → **`COUNSELTYPEIDX` 에 따라 라벨이 달라진다** (취업상담이면 0002='진로', 진로상담이면 0002='취업'). 0001은 2025.01.15에 '미연계'→'미결정'으로 변경 (co.xml:1129-1158)
  - 마일리지·경고이력은 **행마다 스칼라 서브쿼리 4개** → N+1 성격의 성능 위험

**② 검색 조건** (모두 `<if>` 동적)
| 화면 입력 | 파라미터 | 매핑 컬럼 | 비교 방식 |
|---|---|---|---|
| 상담구분 | `SCH_CONSULTTYPE` | `A.COUNSELTYPEIDX` | = |
| 상담단계 | `SCH_COUNSELSTEP` | `A.COUNSELSTEP` | = |
| 상태 | `SCH_STATUS` | `A.COUNSELSTATUSIDX` | = |
| 학년 | `SCH_SCHGR` | `B.STU_SCHGR` | = |
| 대학/학부 | `SCH_DAEHAK_CD` / `SCH_HAKBU_CD` | `B.DAEHAK_CD` / `B.HAKBU_CD` | = |
| 성별 | `SCH_SEX` | `B.SEX` | = |
| 전공·진로·취업·사유 상담여부 | `SCH_MAJOR_YN` 외 3 | `A.MAJOR_YN` 외 3 | = |
| 상담사 | `SCH_CONID` | `A.CONSULTID` | = |
| 온/오프라인 | `SCH_ON_OFF_TTYPE` | `A.ON_OFF_TTYPE` | = |
| 기간 | `SCH_ST_DATE`~`SCH_ED_DATE` | `A.COUNSELSDATE` | `TO_CHAR(...,'YYYY.MM.DD') BETWEEN` (**인덱스 무력화**) |
| 검색어 | `SCH_TYPE`(NM/NO) + `SCH_WORD` | `B.USR_NM` / `B.INTG_UID` | LIKE `%..%` |

**③ 페이징 / 정렬**: 공통 ROWNUM 패턴. 기본 정렬 안쪽 쿼리 `ORDER BY`. 페이지 크기 기본 10.
**④ 상세 조회**: `/Sa/Co/CoCm010P.do` → `/common/Co/pop_adminConsultingInfo.jsp` **팝업**. 인쇄는 `/Sa/Co/CoCm010Print.do`. 상세에서 `COUNSEL_FAM`(가족사항), `STU_CON_POINT` 추가 조인 (`Co.getConsultDetailInfo` co.xml:7625, `Co.getConsoultFam_List` co.xml:7717)
**⑤ 저장·수정·삭제**
| 액션 | statement | 대상 테이블 | 쓰는 컬럼 | 트랜잭션 | 이력 |
|---|---|---|---|---|---|
| 상담결과 저장 | `Co.ConsultMstr_ResultSetData` (co.xml:7731) | `COUNSEL_MASTER` | `COUNSELSTATUSIDX`, `CONSULTINFO`, `RESULTINFO`, `RESULTTITLE`, `MAJOR_YN`·`COURS_YN`·`EMPLO_YN`·`REASON_YN`, `LINK_YN`·`LINK_TYPE`·`LINK_RCT_*`, `CONSULTDATE`, `ON_OFF_TTYPE`, `ISOPEN`, `STUD_OTP_YN`, `UDATE`, `UPDUSER` | 컨트롤러 수동 | **이력 테이블 없음. 덮어쓰기.** |
| 엑셀 업로드 | `/Sa/Co/CoExcelUploadPop.do` | `COUNSEL_MASTER` 일괄 | — | — | — |
**⑥ 첨부**: 이 화면 없음.
**⑦ 특이사항**
- 상담사 유형 라벨이 **`CON_GB` 1과 3을 둘 다 '심리상담'** 으로 매핑 (co.xml:27-31). 바로 위 주석 처리된 원본은 1='진로상담'이었다 → 의도적 변경인지 버그인지 **미확인**.
- `V_DEP_INF_ALL`(대학원 포함)로 조인. 반면 상담사 화면(`getCoMc_List`)도 `V_DEP_INF_ALL`, 조교 화면은 `V_DEP_INF`(학부만) — **일관성 없음**.

---

## [관리자] 상담사 관리 — `/Sa/Co/CoCt010L.do`

- **Controller**: `CoController.java#CnCt010L` (CoController.java:115)
- **JSP**: `admin/Co/CoCt010L.jsp`

**① 목록 조회**
- statement: `Co.getCnCt_List` (co.xml:8)
- FROM: `COM_CON_INF CCI` (단일). 담당 단과대는 Oracle 함수 **`fn_con_deptnm(CONID,'2000')`** 로 문자열 조합(없으면 `'전 대학'`)
- ★ **범위 제한**: **없음.** 전체 상담사 목록.
- 표시 컬럼: 상담사ID·성명·담당대학·상담구분(`CON_GB`)·대상(`TARGET`)·내외부(`INOUT_GB`)·인원제한(`LIMIT_GB`,`LIMIT_NUM`)·장소·연락처·이메일·상태(`FN_CODE('0024',STATUS)`)·등록/수정자
**④ 상세**: `/Sa/Co/CoCt010D.do` → `admin/Co/CoCt010D`. 수정 `/Sa/Co/CoCt010U.do`. 신규 `/Sa/Co/CoCt010M.do` + 팝업 `Cn0001pop_selectCons.do`(교내 사용자 검색) / `Cn0001pop_insertCons.do`
**⑤ 저장**: `COM_CON_INF`(상담사 마스터) + **`COM_CON_TAR`**(담당 단과대 N건). ★ `COM_CON_TAR` 가 학생↔상담사 매칭의 근거 테이블이다.
**⑦ 특이사항**: 외부 위촉 상담사의 비밀번호 컬럼 `CONPWD` 도 이 테이블. 저장 시 `FN_MD5()` — 무염 MD5.

---

## [관리자] 조교/학과 관리 — `/Sa/Co/sys_assDept.do` ★★ 버그 화면

- **Controller**: `CoController.java#sys_assDept` (CoController.java:2386)
- **JSP**: `admin/Co/CoDp010L.jsp`

**① 목록 조회**
- statement: `Co.assDeptList` (co.xml:6150)
- FROM/JOIN: `V_DEP_INF A`(학과) ⨝(INNER) `V_DEP_INF B` ON `A.DEPT_UP_CD=B.DEPT_CD`(단과대) ⨝(LEFT) `V_DEP_INF C` ON `C.DEPT_UP_CD=A.DEPT_CD`(전공) ⨝(LEFT) `V_USR_INF D` ON `D.MAJOR_CD=C.DEPT_CD`(학생수 카운트) ⨝(LEFT) **`FU_ASS_DEPT`** CAD/CAD2 (배정 조교)
- 고정 WHERE: `A/B/C.USE_YN='Y'`, `A.DEPT_UP_CD IN (SELECT DEPT_CD FROM V_DEP_INF WHERE LVL='1' AND USE_YN='Y' AND GRP_CD='0001')`, `A.GRP_CD IN ('0002','0003')`
- ★ **범위 제한**: 없음(관리자 전용).
**⑤ 저장·삭제**
| 액션 | statement | 대상 테이블 |
|---|---|---|
| 조교 배정 | `Co.insertAssDept` (co.xml:6203) | **`COM_ASS_DEPT`** |
| 배정 해제 | `Co.deleteAssDept` (co.xml:6219) | **`COM_ASS_DEPT`** |
| 조교 검색 팝업 | `Co.searchAss` (co.xml:6192) — `V_USR_INF.USER_TY_CD='1501'` | — |

**⑦ 특이사항 — 치명적**
> **읽는 테이블(`FU_ASS_DEPT`)과 쓰는 테이블(`COM_ASS_DEPT`)이 다르다.**
> 이 화면에서 배정한 결과는 목록에 절대 반영되지 않고, 조교 권한 판정(`FU_ASS_DEPT` 사용)에도 반영되지 않는다.
> 근거: 조회 co.xml:6186-6187 / 저장 co.xml:6204 / 삭제 co.xml:6220.
> `COM_ASS_DEPT` 는 **전 sqlmap에서 이 2개 statement 외에는 읽히지 않는다**(전수 확인, `04_table_usage.md`).
> → 실제 동작하는 조교 배정 화면은 아래 `/Sa/Fu/sys_assDept.do` 다.

---

## [관리자] 전담조교 매칭 — `/Sa/Fu/sys_assDept.do` ★★ Q3의 핵심

- **Controller**: `FuController.java#sys_fuassDept` (FuController.java:620)
- **JSP**: `admin/Fu/FuDp010L.jsp`

**① 목록 조회**
- statement: `Fu.assDeptList2` (fu.xml:331)
- FROM/JOIN: `Co.assDeptList` 와 **본문 동일**(복붙). 배정 테이블만 `FU_ASS_DEPT` 로 읽고 쓰는 점이 다름. 추가로 조교 `HP`·`TEL` 스칼라 서브쿼리 2개.
- 고정 WHERE (**대학원 누락의 원인 후보 3가지**):
  1. `A.DEPT_UP_CD IN (SELECT DEPT_CD FROM V_DEP_INF WHERE LVL='1' AND USE_YN='Y' AND **GRP_CD='0001'**)` — 상위조직이 **최상위 레벨이면서 그룹코드 0001** 인 것만. 대학원이 별도 `GRP_CD` 이거나 `LVL<>'1'` 이면 통째로 탈락. (fu.xml:358-365)
  2. `A.GRP_CD IN ('0002','0003')` — 학과 자신의 그룹코드가 이 둘이 아니면 탈락. (fu.xml:366)
  3. `LEFT OUTER JOIN V_DEP_INF C ... AND **C.USE_YN='Y'**` 인데 이 조건이 **`WHERE` 절에 있다** (fu.xml:357). → LEFT JOIN이 사실상 INNER JOIN으로 강등되어, **하위 전공(C)이 없는 학과는 목록에서 사라진다.** 대학원 학과처럼 전공 노드를 안 두는 조직은 여기서 전부 누락.
  4. 소스 `V_DEP_INF` 사용 (대학원 미포함 뷰). 같은 시스템의 다른 화면은 `V_DEP_INF_ALL`(대학원 포함)을 쓴다 — 예 `Co.getDaehakAllListV1` (co.xml:6574).
  → **가장 유력한 단일 원인은 4번(테이블 선택) + 3번(조인 강등)** 이다. `V_DEP_INF` vs `V_DEP_INF_ALL` 의 데이터 차이는 DB 확인이 필요하므로 **추정**.
**⑤ 저장·삭제**: `Fu.insertAssDept` → `FU_ASS_DEPT` INSERT (fu.xml:374) / `Fu.deleteAssDept` → DELETE (fu.xml:389). **읽기/쓰기 테이블 일치 → 정상 동작.**
**⑦ 특이사항**: `DEPT_CNT` 와 `MAJOR_CNT` 가 **완전히 같은 서브쿼리**다 (fu.xml:336-337) — 복붙 오류로 보임.

---

## [관리자] 교수학과 배정 — `/Sa/Fu/sys_profDept.do`

- **Controller**: `FuController.java#sys_fuprofDept` (FuController.java:1121) / **JSP**: `admin/Fu/FuDp020L.jsp`
- statement: `Fu.profDeptList2` (fu.xml:721). 구조는 `assDeptList2` 와 동일 계열, 배정 테이블만 **`TB_CARR_PROF_ASSI_DEPT`**.
- ★ 이 테이블이 교수 화면의 학과 범위 판정에 쓰인다 (`co.xml:6588`, `co.xml:6642`).
- **⑦** 조교는 `FU_ASS_DEPT`, 교수는 `TB_CARR_PROF_ASSI_DEPT` — **테이블·화면·컬럼명이 모두 제각각**이지만 의미는 "사람↔학과 배정"으로 동일. 재구축 시 단일 테이블로 통합 권장.

---

## [관리자] 전담교수 매칭 — `/Sa/Co/CoAm010L.do`

- **Controller**: `CoController.java#CoAm010L` (CoController.java:2417) / **JSP**: `/admin/Co/CoAm010L.jsp`
- **①** statement: `Co.getAdminMatch_List` (co.xml:6227)
  - FROM: `V_USR_INF B`(학생) ⨝(LEFT) **`CO_ADVISER CA`** ON `CA.STU_NO=B.INTG_UID` ⨝(LEFT) `V_DEP_INF`×2, `V_USR_INF PF`(교수)
  - 고정 WHERE: `B.USER_TY_CD IN ('1101')` (재학생-학부만), `B.HOFC_STA_CD='0001'` (재학)
  - ★ **범위 제한 없음** — 전교 재학생 대상
- **②** `SCH_GUBUN`(AL전체/NO미배정/OK배정), `SCH_TYPE`(AL/NM/NO)+`SCH_WORD`, 학과·학년
- **⑤** `CO_ADVISER` INSERT/UPDATE/DELETE. 엑셀 일괄 업로드 `/Sa/Co/CoAm010UploadPop.do`
- **⑦** `USER_TY_CD IN ('1101')` 하드코딩 → **대학원생(1201)은 전담교수를 배정할 수 없다.**

---

## [관리자] 상담 제한일정 관리 — `/Sa/Co/CoAm020L.do` ★ Q2 관련

- **Controller**: `CoController.java#CoAm020L` (CoController.java:2464) / **JSP**: `/admin/Co/CoAm020L.jsp`
- **①** `Co.getCounselExclHr` (co.xml:12094) — FROM `TB_CARR_CNSL_EXCL_HR` 단일. 범위 제한 없음.
  - 표시: 제한 시작일시(`CNSL_EXCL_SDT`+`SRT_HR`+`SRT_MNT`) ~ 종료일시, 제한명(`CNSL_EXCL_NM`), 작성자/일시
- **⑤**
| 액션 | statement | 테이블 | 비고 |
|---|---|---|---|
| 중복검사 | `Co.getCounselExclHrChk` (co.xml:12127) | `TB_CARR_CNSL_EXCL_HR` | 4개 OR로 구간 겹침 판정 |
| 등록 | `Co.CounselExclHr_Insert` (co.xml:12137) | 동 | PK를 **`MAX(...)+1`** 로 생성 → 동시 등록 시 충돌 위험 |
| 삭제 | `Co.deleteCounselExclHr` (co.xml:12167) | 동 | |
- **⑦ ★ 중요**: 이 "제한 시간"은 **등록 단계의 겹침 검사에만 쓰이고, 학생이 예약 슬롯을 볼 때는 조회되지 않는다.** (Q2 답 참조)

---

## [관리자] 메뉴 관리 — `/Sa/Sy/SyMn010M.do`

- **Controller**: `SyController.java#SyMn010M` (SyController.java:111) / **JSP**: `/admin/Sy/SyMn010D.jsp`
- **①** Ajax `/Sa/Sy/SyMn010L.do` → `Sy.getMenu_List` (sy.xml:73)
  - FROM `SY_MENU` 단일. `WHERE DLTE_YN='N' AND MENU_CODE!='ROOT'` + `<if>` `USER_DVID`
  - **계층**: `START WITH PRTCODE='ROOT' CONNECT BY PRIOR MENU_CODE = PRTCODE ORDER SIBLINGS BY EXPS_ORDR` — Oracle 계층 쿼리. 트리 렌더링.
  - 컬럼: `MENU_CODE`, `MENUNM`, `EXPS_ORDR`(정렬), `USE_YN`, `DLTE_YN`, `MENU_URL`, **`USER_DVID`('ADMIN'|'USER')**, `MENU_LEVL`(1~3), `MENU_EXPL`, 이미지 3종, `TARGET_LOCT`, `PRTCODE`(부모), `WORK_MENU_CODE`
- **⑤** `/Sa/Sy/SyMn010I.do` 등록·수정, `SyMn010X.do` 삭제 (`DLTE_YN='Y'` 논리삭제 추정)
- **⑦ ★ 재구축 필수 정보**: **메뉴는 최대 3레벨**, `USER_DVID` 2값으로 관리자/사용자 사이트가 갈린다. `MENU_URL` 이 곧 `.do` 경로이고, 인가 판정도 이 URL/코드로 한다.

---

## [관리자] 권한그룹 · 메뉴권한 — `/Sa/Sy/SyAm010M.do`, `/Sa/Sy/SyAm020M.do` ★ 권한체계 원점

- **Controller**: `SyController.java` (361, 614) / **JSP**: `admin/Sy/SyAm010D.jsp`, `admin/Sy/SyAm020D.jsp`
- **① 권한그룹 목록**: `Sy.getAuthGroup_List` (sy.xml:236) — `SY_AUTH` `WHERE DLTE_YN='N'`. 컬럼 `AUTH_CODE`, `AUTHNM`, `AUTH_EXPL`, `USE_YN`, **`BASEGRUP_YN`**(기본그룹 여부)
- **① 메뉴권한 목록**: `Sy.getAuthMenu_List` (sy.xml:311) — `SY_MENU A` 계층 조회 + **상관 서브쿼리**로 `SY_MENU_AUTH` 에 해당 `AUTH_CODE` 행이 있으면 체크 표시. `USER_DVID` 로 관리자/사용자 트리 분리.
- **⑤ 저장 방식(중요)**: `Sy.setAuthMenu_Delete` (sy.xml:326) 로 **해당 권한×해당 USER_DVID 의 `SY_MENU_AUTH` 를 전부 DELETE 후 재INSERT**. 부분 갱신 아님.
- **① 멤버 목록**: `Sy.getAuthMemGroup_List` (sy.xml:335) — `SY_AUTH_USER` ⨝ `V_USR_INF`(USER_TY_CD → S/P/M/A 변환)
- **⑤ 권한 변경 이력**: `Sy.insertAuthLog` → `SY_AUTH_LOG` (`AUTH_ID`,`AUTH_CD`,`CHANGE_GB`,`REG_IP`,`REG_ID`) — **권한만 이력이 남는다.** 다른 도메인은 이력 없음.
- **⑦** 이 화면이 사이트맵의 `역할` 컬럼을 결정한다. 소스만으로는 매핑 내용을 알 수 없으므로 재구축 시 **`SY_MENU_AUTH` 972행 덤프가 반드시 필요**하다.

---

## [관리자] 코드 관리 — `/Sa/Sy/SyCm010M.do`

- **Controller**: `SyController.java#SyCm010M` (SyController.java:1214) / **JSP**: `admin/Sy/SyCm010M.jsp`
- **①** 3단 구조:
  1. 그룹 목록 `Sy.getCodeGroup_List` (sy.xml:906) — `SELECT GRP_CODE, CODE_EXPL FROM SY_CODE WHERE GRP_CODE NOT IN ('0012','0037') GROUP BY ...` ← **0012·0037은 화면에서 숨김(하드코딩)**
  2. 코드 목록 `Sy.getCodeSecond_List` (sy.xml:914) — `WHERE GRP_CODE=#{GRP_CODE}`
  3. 상세 `Sy.getCodeDetail` (sy.xml:925) — `CODE, GRP_CODE, CODENM, CODE_EXPL, **UP_GRP_CODE, UP_CODE**, USE_YN, ETC1...`
- **⑦ ★** `UP_GRP_CODE`/`UP_CODE` 로 **2단 계층 코드**를 표현한다(예: 상담분야 `0145` → 세부분야 `0147`). 재구축 시 코드 테이블은 자기참조 계층으로 설계해야 한다.

---

## [관리자] 사용자 접속이력/통계 — `/Sa/Sy/SyUs010L.do` 외 5화면

- **Controller**: `SyController.java` (1638~) / **JSP**: `/admin/Sy/SyUs010L~050L.jsp`
- **①** `Sy.useStatisticsList` 외. 원천 테이블 **`SY_LOGIN_LOG`**(로그인), **`SY_MENU_LOG`**(메뉴접속). 적재는 `CareerActionController.insertMenuLog` / `SessionController.insertLoginLog`.
- 적재 컬럼: `LOGIN_ID`, `LOGIN_IP`, `LOGIN_DT`, `GRADE`, `DAEHAK_CD`, `HAKBU_CD` / 메뉴는 `MENU_CD` 추가
- **⑦**
  - IP는 **`request.getRemoteAddr()`** 만 쓴다 → **L4/프록시 뒤에서는 전부 프록시 IP로 기록**된다. (`SaIpCheck.do` 는 `X-Forwarded-For` 를 보는데 로그는 안 봄 — 불일치)
  - 메뉴 로그는 `CURRENT_MENU_CODE` **파라미터**가 있을 때만 남는다 → **URL 직접 접근은 로그에 안 남는다.**

---

## [관리자] 역량진단 관리 — `/Sa/Ca/CaDm010L.do` ★ Q1

- **Controller**: `CaController.java#CaDm010L` (CaController.java:1057) / **JSP**: `/admin/Ca/CaDm010L.jsp`
- **①** `Ca.getCapSurvey_List` (ca.xml:702)
  - FROM `CA_SURVEY CS` 단일 + 대상자수/응시자수 스칼라 서브쿼리
  - 대상자수(`DAESANG`): `SURVEY_TAR` 값에 따라 `V_USR_INF` 를 매번 COUNT — `A`전체(`USER_TY_CD='1101'` AND `HOFC_STA_CD='0001'`), `1`~`5`학년, `P`교수(`1301`), `U`사용자지정(`CA_SURVEY_TAR.JIJUNG_YN='Y'`)
  - 응시자수(`ATT`): `CA_SURVEY_TAR.STATUS='Y'` COUNT
  - ★ **범위 제한 없음**
  - 상태 파생: `USE_YN='N'`→검사중단 / `SYSDATE BETWEEN ST_DT AND ED_DT`→검사중 / 이전→검사전 / 이후→검사종료
- **④ 역량 6종 라벨** (`SURVEY_GB`): `0001` 통합진단 / `0002` 지역형리더 / `0003` 창의적사고 / `0004` 실용적융복합 / `0005` 의사소통 / `0006` 글로벌 / **`0007` 인문 — 주석 처리되어 미노출** (ca.xml:725-732)
  - `SURVEY_TAR='P'`(교수) 이면 라벨이 완전히 달라짐: 통합진단/교수(Teaching)역량/연구역량/기본역량 (ca.xml:718-722)
  - 하위역량 `CAP_QUS_GB2` **17종** (ca.xml:1180-1198): 인성·소양 / 비전제시 및 실행능력 / 공동체 윤리의식 / 도전정신 / 분석적·비판적 사고력 / 추론적·대안적 사고력 / 문제해결력 / 전공지식활용능력 / 통합적 사고력 / 가치창출능력 / 토론과 조정력 / 의사표현 및 전달능력 / 경청과 이해능력 / 다문화 이해 및 수용능력 / 외국어 구사능력 / 국제적 교류 및 협업능력 / 세계시민의식
- **⑤** `CA_SURVEY`(회차) / `CA_SURVEY_QUS`(문항) / `CA_SURVEY_TAR`(대상자·응시상태) / 결과 저장. 엑셀 업로드 `/Sa/Ca/CaDm010Eu.do`
- **⑦ 역량 라벨이 SQL CASE에 하드코딩**되어 있다. `SY_CODE` 를 쓰지 않는다 → 역량 명칭 변경 시 SQL 8곳 이상 수정 필요. **재구축 시 반드시 코드테이블로 빼야 한다.**

---

## [관리자] 학과별 PA역량목표 설정 — `/Sa/Ca/CaGs010L.do` / 학생별 역량현황 — `/Sa/Ca/CaSs010L.do`

- **Controller**: `CaController.java` (234 / 105) / **JSP**: `/admin/Ca/CaGs010L.jsp`, `/admin/Ca/CaSs010L.jsp`
- **① 목표설정**: `Ca.getGoalSetting_List` → **`CA_GOAL`** (`YEAR`,`DAEHAK_CD`,`HAKBU_CD`,`GOAL_CREDIT`,`PA_1`~`PA_6` 비율%)
  - 산출식(화면 명시): **학과 역량목표 = 졸업이수학점 × 역량반영비율(%)**, 합이 100이어야 함 (`CaGs010E.jsp:150,292`)
  - 입력 헤더 라벨: 지역형리더/창의적사고/실용적융복합/의사소통/글로벌 (**인문 `<th>` 주석 처리**, `CaGs010E.jsp:309-314`)
- **① 학생별 현황**: `Ca.getGoalState_List` (ca.xml:20~)
  - FROM `V_USR_INF VUI` , (`CA_GOAL_DATA PGD` GROUP BY `STU_ID`) D — `SUM(SUB_PA_n + EXT_PA_n)` = **교과(SUB) + 비교과(EXT) 합산**
  - 고정 WHERE: `CAPABILITY_TOTAL_SUM > 0`
  - ★ **범위 제한**: `<if test="USR_TYPE == 'A'"> AND VUI.MAJOR_CD IN (SELECT MAJOR_CD FROM FU_ASS_DEPT WHERE USR_ID=#{SESSION_USR_ID})` (ca.xml:55-56) — **조교로 이 쿼리를 타면 담당 학과로 제한**. 관리자는 무제한.
  - 학적 파생: `HOFC_STA_CD` 0001재학/0002휴학/0003제적/0004수료/0005졸업, `OUT_DT` 있으면 졸업
- **④ 달성률 계산**: `Ca.getGoalNowState_Detail` (ca.xml:138) — `ROUND(100 * SUM(SUB_PA_n+EXT_PA_n) / (CA_GOAL.GOAL_CREDIT * CA_GOAL.PA_n * 0.01), 2)`
- **⑦** `USR_TYPE` 은 컨트롤러가 `dataMap.put("USR_TYPE", SESSION_USER_TY_CD)` 로 넣는다(`CoMasController.java:350`) → 세션 기반, 안전.

---

## [관리자] 비교과 프로그램 신청자/선발자 관리 — `/Sa/Ep/EpTb020PD.do` ★ Q12

- **Controller**: `EpController.java` / **JSP**: `/admin/Ep/EpTb020PD.jsp`
- **①** `EP_PRM_APP` 중심. `APP_GB` 파라미터로 **A=신청자관리 / C=선발자관리** 두 모드.
- **★ `EP_PRM_APP.STATUS` 코드값 전수** (`EpTb020PD.jsp:657-753`)
| 값 | 신청자관리(A) | 선발자관리(C) |
|---|---|---|
| `1` | 신청 / 접수대기 | — |
| `7` | 대기 / 접수완료 | — |
| `2` | 선발(선발완료) | 선발 |
| `3` | 탈락 | — |
| `4` | 취소 | — |
| `5` | — | **수료** (`POINT_DIV='N'` 이면 `EP_PRM_SCORE` 의 등급명으로 세분) |
| `6` | — | 미수료 |
| `8` | — | 참석 |
| `9` | — | **불참(벌점 1점)** |
| `10` | — | **불참(벌점 3점)** |
| `9999` | 삭제 | 삭제 |
- **수료 판정 로직** (ep.xml:91-96): `EP_PRM.PRM_GB='P'`(개인형) 이면 `EP_PRM_APP.STATUS='5'`, `='G'`(그룹형) 이면 **`EP_PRM_MAPPING.STATUS='2'`** → 개인/그룹의 판정 테이블이 다르다.
- **집계 컬럼** (ep.xml:1291-1294): `APP_NUM`=STATUS<>'4', `DRAFT_NUM`=STATUS NOT IN ('1','3','4','7'), `CMP_NUM`=STATUS='5'
- **⑤** 수료 처리는 되돌릴 수 없다는 경고가 화면에 있다 — "수료 처리 이후에는 상태를 변경하실 수 없습니다"(`EpTb020PD.jsp:177`). 수료 삭제 시 **비교과 포인트 + 만족도조사 결과가 함께 삭제**된다(`:431,478`).
- **⑦** 미참여 페널티가 상태값에 내장(9/10) 되어 있고, 별도 **블랙리스트 화면 `/Sa/Ep/EpBlackList.do`** 가 존재한다.

---

# B. 조교 화면 (우선순위 2) — 전 7화면

## [조교] 전담교수 배정 유무 확인 — `/user/Co/CoAs010L.do`

- **Controller**: `CoMasController.java#CoAs010L` (CoMasController.java:111)
- **JSP**: `/WEB-INF/jsp/user/Co/Mas/CoMas010L.jsp`
- **①** `Co.getAssiList` (co.xml:6329)
  - FROM/JOIN: **`FU_ASS_DEPT A`** ⨝(INNER) `V_USR_INF B` ON `A.MAJOR_CD = B.MAJOR_CD` ⨝(LEFT) **`CO_ADVISER CA`** ON `CA.STU_NO=B.INTG_UID` ⨝(LEFT) `V_DEP_INF`×2, `V_USR_INF PF`(교수명)
  - 고정 WHERE: `B.USER_TY_CD IN ('1101')`(재학생-학부), `B.HOFC_STA_CD='0001'`(재학)
  - ★ **범위 제한**: **`A.USR_ID = #{SESSION_USR_ID}`** (co.xml:6362) — 세션 기반. **안전.**
  - 표시: 학번·성명·학년·연락처·대학·학부·배정교수명·배정일
- **②** `SCH_GUBUN`(AL/NO미배정/OK배정), `SCH_TYPE`(AL/NM/NO)+`SCH_WORD`, `SCH_STU_SCHGR`, `SCH_REG_YYYY`(배정연도)
- **⑤** 배정 팝업 `/user/Co/Advis.do` → `CO_ADVISER` INSERT/UPDATE
- **⑦** 조인 키가 **`MAJOR_CD`(전공)** 다. `FU_ASS_DEPT` 에 `DEPT_CD` 만 있고 `MAJOR_CD` 가 NULL인 배정행은 **학생이 한 명도 안 잡힌다.** (관리자 화면 `assDeptList2` 는 `MAJOR_CD` 없이도 `DEPT_CD` 로 배정 가능 — CAD2 분기) → **배정은 되는데 목록이 비는 케이스** 발생 가능.

## [조교] 전담교수 상담실적 — `/user/Co/CoAs020L.do` ★ 파라미터 변조 취약

- **Controller**: `CoMasController.java#CoAs020L` (CoMasController.java:237) / **JSP**: `/user/Co/Mas/CoMas020L.jsp`
- **① 학과 목록**: `Co.getMyAssDeptList` (co.xml:10061) — `FU_ASS_DEPT` ⨝ `V_DEP_INF`, ★ `WHERE A.USR_ID = #{SESSION_USR_ID}` (안전). 컨트롤러가 첫 항목을 `HAKBU_CD` 기본값으로 세팅.
- **① 실적 목록**: `Co.getAssiProfConList` (co.xml:10069)
  - FROM: **`CON_PROF_INFO A`** ⨝(INNER) `V_USR_INF B` ON `A.PROF_ID=B.INTG_UID` ⨝(LEFT) `V_DEP_INF HB/DH`
  - 고정 WHERE: `A.STATUS='0002'`(완료), `B.USER_TY_CD='1301'`(교원), `B.HOFC_STA_CD='89'`(재직), `B.RANKID IN ('1001','1002','1003')`(직급 3종)
  - ★ **범위 제한: `AND HB.DEPT_CD = #{HAKBU_CD}` — 오직 화면 파라미터 하나뿐.** (co.xml:10102)
    → **`HAKBU_CD` 를 임의 값으로 바꿔 요청하면 담당하지 않는 학과의 교수 상담실적을 열람할 수 있다.** 세션 대조 없음. `03_access_scope.md` §구멍 참조.
  - 표시: 대학·학부·교수명·교수ID·온라인건수(`CON_KIND='ON'`)·오프라인건수(`'OF'`)·합계·미참여수(`STATUS='0001'`)
- **② ③** `SCH_PROF_ID`, `SCH_ST_DATE`~`SCH_ED_DATE`(`TO_CHAR(CONSULTDATE,'YYYY.MM.DD') BETWEEN`). 공통 ROWNUM 페이징.
- **④** 상세 `/user/Co/CoAs020DL.do` → `/user/Co/Mas/CoMas020D.jsp`
- **⑤** 없음(조회 전용). **⑦** 엑셀 `/user/Pc/PcChart020Excel.do` → **`PcExcelController`(RETOK·세션검사 전무)**.

## [조교] 학생별 역량현황 — `/user/Co/CoAs030L.do` / `CoAs040L.do`

- **Controller**: `CoMasController.java` (341 / 409) / **JSP**: `/user/Co/Mas/CoMas030L.jsp`, `CoMas040L.jsp`
- **①** `Ca.getAssisMyStuChart1`(요약, `SEARCH_MY_DH` Y/N 로 우리학과/타학과 2회 호출) + `Ca.getAssisStuAbility_List`(목록)
- ★ **범위 제한**: 컨트롤러가 `dataMap.put("USR_TYPE", SESSION_USER_TY_CD)` (CoMasController.java:350) → SQL의 `<if test="USR_TYPE=='A'"> AND VUI.MAJOR_CD IN (SELECT MAJOR_CD FROM FU_ASS_DEPT WHERE USR_ID=#{SESSION_USR_ID})` (ca.xml:55-56). **안전.**
- **⑦** 같은 조교 화면인데 `CoAs020L` 은 파라미터 신뢰, `CoAs030L` 은 세션 기반 — **범위 규칙이 통일되어 있지 않다.**

---

# C. 상담사 화면 (우선순위 3)

## [상담사] 예약상담 — `/user/Co/CoMc010L.do`

- **Controller**: `CoMcController.java#CoMc010L` (CoMcController.java:113)
- **JSP**: `/WEB-INF/jsp/user/Co/Mc/CoMc010L.jsp`

**① 목록 조회**
- statement: `Co.getCoMc_List` (co.xml:2924)
- FROM/JOIN: `COUNSEL_MASTER A` ⨝(INNER) `V_USR_INF B` ON `A.USERID=B.INTG_UID` ⨝(LEFT) `V_DEP_INF_ALL DH/HB` ⨝(LEFT) `STU_WARNING_INFO W` ON 학번+년도+학기
- ★ **범위 제한**: **`AND A.CONSULTID = #{SESSION_USR_ID}`** (co.xml:2960) — 본인 담당 건만. **안전.**
  - 추가: `<if SESSION_CON_USER_TYPE=='J'> AND A.COUNSELTYPEIDX='1'`(진로) / `=='C'` 이면 취업 (co.xml:2961-2965) — 상담사 유형별 상담종류 분리
- 표시: 신청일시 / 상담일시 / 상담구분 / 상태 / 학생명·학번·학년·연락처 / 학부 / 캠퍼스(`UNIV_CD`)
- 파생: 상태 CASE 1신청·2완료·3학생취소·4상담사취소, 상담유형 `FN_CODE('0146',CONSULTTYPE)` (단 취업상담은 '취업' 고정)

**② 검색 조건**: `SCH_STATUS`(상태), `SCH_ST_DATE`~`SCH_ED_DATE`, `SCH_NM`/`SCH_NO`, 학년, 대학·학부. 컨트롤러가 화면 진입 시 **`Co.getDaehakAllList`(대학 셀렉트)** + `SY_CODE 0143`, `0146` 로드 (CoMcController.java:123-131)
**③ 페이징**: 공통 ROWNUM. 기본 10 (`SEARCH_VIEW_SIZE` 로 변경 가능)
**④ 상세**: `/user/Co/CoMc010P.do` → `/common/Co/pop_ConsultingInfo.jsp` 팝업. `Co.getConsultDetailInfo`(co.xml:7625) 로 `COUNSEL_MASTER` ⨝ `COM_CON_INF` ⨝ `V_USR_INF` ⨝ `V_DEP_INF_ALL`×2 ⨝ `STU_CON_POINT`
  - ★ 이 상세 쿼리의 범위제한은 `<if test="USER_DIV_CD == 'USER'"> AND USERID = #{APP_ID}` (co.xml:7712) — **`USER_DIV_CD`·`APP_ID` 가 모두 요청 파라미터.** 상담사 경로에서는 이 조건이 붙지 않아 **IDX만 알면 남의 상담 상세를 볼 수 있다**(추정 — 컨트롤러가 `USER_DIV_CD` 를 세팅하는지 미확인).
**⑤ 저장·수정·삭제**
| 액션 | statement | 대상 테이블 | 쓰는 컬럼 | 트랜잭션 | 이력 |
|---|---|---|---|---|---|
| 상담결과 작성/수정 | `Co.ConsultMstr_ResultSetData` (co.xml:7731) | `COUNSEL_MASTER` | `COUNSELSTATUSIDX`(→'2' 완료), 상담내용, 결과, 4개 상담영역 Y/N, 연계정보 6개, 상담일시, 온/오프라인, 공개여부(`ISOPEN`), 학생비공개(`STUD_OTP_YN`) | 수동 | 없음 |
| 취소 | `Co.setUserCo_Status` (co.xml:2530) | `COUNSEL_MASTER` | `COUNSELSTATUSIDX`, `CANCELREASON`, `CANCELUSERID`, `CANCELDATE` | 수동 | 취소사유만 |
| 재배정 | `/user/Co/CoMcReAssing.do` → `/common/Co/pop_ConsultReAssign.jsp` | `COUNSEL_MASTER.CONSULTID` | | | |
**⑥ 첨부**: 심리검사 결과 파일은 `SY_FILE`(`TAB_NM` 구분) 경유.
**⑦ 특이사항**: `STUD_OTP_YN`(2025.01.14 추가) = 학생에게 상담기록 비공개 플래그. 재구축 시 학생 화면에서 반드시 반영해야 한다.

## [상담사] 일정 관리 — `/user/Co/CoMc030L.do` ★ Q2의 "가능시간" 등록 화면

- **Controller**: `CoMcController.java` / **JSP**: `user/Co/Mc/CoMc030L.jsp` (월별 `CoMc030MonthL.do`)
- **①** `Co.getSchduleData`(co.xml:9639) — **`TEMP_CON_TIME A`**(시간 슬롯 마스터) ⨝(LEFT) **`BASICSETTING B`** ON `A.V_TIME = B.HOUR||B.MINUTE`
  - ★ 범위 제한: `B.CONSULTANTID = #{SESSION_USR_ID}` (co.xml:9641). `COUNSELTYPEIDX` 및 `TERM_TYPE`(Y년/M월/W주/D일)로 날짜 조건 분기.
  - 즉 **시간축은 고정 마스터(`TEMP_CON_TIME`), 그 위에 본인 등록분을 LEFT JOIN해 "켜짐/꺼짐"을 그린다.**
- **⑤ 저장 = "가능 시간 등록"**
| 액션 | statement | 테이블 | 비고 |
|---|---|---|---|
| 삭제 | `Co.deleteSchduleData` (co.xml:9679) | `BASICSETTING` | 상담사+상담종류+날짜+시+분 |
| 등록 | `Co.setSchduleData_insert` (co.xml:9689) | `BASICSETTING` | PK `SEQ_BASICSETTING.NEXTVAL` |
| 병합 | `Co.setSchduleData_merge` (co.xml:9740) | `BASICSETTING` | MERGE |
- `BASICSETTING` 주요 컬럼: `CONSULTANTID`(상담사), `COUNSELDATE`(날짜), `HOUR`,`MINUTE`, `COUNSELTYPEIDX`(1진로/2취업/3심리), `ISUSE`('1'=사용), **`COUNSELCOUNT`(해당 슬롯 정원)**, `HAKYOUN`(대상 학년 CSV), `GRADUATIONTYPEIDXS`, `WEEKDAY`(요일 CSV), `TRIALTYPE`(심리검사 종류), `PRHS_CNFM_YN`(본인 Y/객원 N)
- **⑦ ★ 결론: `BASICSETTING` 은 "가능"을 등록한다.** 제한(`TB_CARR_CNSL_EXCL_HR`)은 별개다.

---

# D. 학생 화면 (참고 — 상태 전이 이해에 필수)

## [학생] 방문 상담 신청(주간 캘린더) — `/user/Co/CoVi010M.do`

- **Controller**: `CoUserController.java#CoVi010M` (CoUserController.java:118) / **JSP**: `user/Co/CoVi010L.jsp`
- **①** 자바에서 `Restde` VO로 **주 단위 월~금 5일치 날짜(`DAY1`~`DAY5`)를 계산**한 뒤 (CoUserController.java:195-251) 다음 2건 조회:
  1. `Co.getCont_List` — 상담사 셀렉트
  2. `Co.getConsultSch_List` (co.xml:5985) — 슬롯 목록
- **`Co.getConsultSch_List` 상세**
  - FROM: **`BASICSETTING A`** ⨝(INNER) `COM_CON_INF C` ON `A.CONSULTANTID=C.CONID` ⨝(LEFT) `COUNSEL_MASTER D` ON 상담사+`날짜||시||분 = COUNSELSDATE` AND `COUNSELSTATUSIDX IN ('1','2')`
  - 고정 WHERE: `A.ISUSE='1'`, `C.STATUS='0001'`(승인된 상담사), 날짜 `BETWEEN #{DAY1} AND #{DAY5}`
  - ★ **범위 제한**: `<if test="ADMIN_YN != 'Y'"> AND EXISTS (SELECT 'X' FROM **COM_CON_TAR** X WHERE X.CONID=A.CONSULTANTID AND X.DAEHAK_CD = (SELECT DAEHAK_CD FROM V_USR_INF WHERE INTG_UID=#{SESSION_USR_ID}))` (co.xml:6030-6036)
    → **학생 소속 단과대를 담당하는 상담사만 노출.** 이것이 상담 영역의 핵심 범위 규칙이다.
    → **구멍**: `ADMIN_YN` 은 이 경로에서 서버가 세팅하지 않는다 → **요청에 `ADMIN_YN=Y` 를 붙이면 전 상담사 슬롯이 노출된다.** (`03_access_scope.md`)
  - 정원 판정: `CON_REQ_YN` = `BASICSETTING.COUNSELCOUNT <= (같은 슬롯의 COUNSEL_MASTER 중 상태 1·2 건수)` 이면 `'N'`(마감) else `'Y'`
- **⑤ 신청**: `/user/Co/CoAppD.do` → `/common/Co/pop_CoApplication.jsp` → `COUNSEL_MASTER` INSERT (`COUNSELSTATUSIDX='1'`), 가족사항은 `COUNSEL_FAM`
- **⑦** `TB_CARR_CNSL_EXCL_HR`(제한시간)은 **여기서 조회되지 않는다** → 관리자가 제한을 걸어도 학생 화면에는 슬롯이 그대로 보인다(추정: 상담사 일정 등록 자체를 막는 방식으로 우회 운영).

## [학생] 상담 내역 — `/user/Co/CoMs010L.do`

- **Controller**: `CoMsController.java` / **JSP**: `/user/Co/Ms/CoMs010L.jsp` (모바일 분기 `/mobile/mypageStudent/counsel_status`)
- ★ **범위 제한**: `USERID = #{SESSION_USR_ID}` 계열(본인 건만). 상세 `CoMs010D.do`, 취소 `CoMsCancelPop.do` → `Co.setUserCo_Status`(STATUS='3' 학생취소)
- **⑦** 취소 가능 여부는 SQL의 `CANCEL_YN` 파생(상담일 3일 전까지, co.xml:2520-2523)으로 판정.

---

## 부록: 상담 상태 전이 요약 (Q11 상세는 `05_answers.md`)

```
        [학생] CoAppD.do 신청
                  ↓
   COUNSELSTATUSIDX = '1' 신청
        ├── [학생] CoMsCancelPop.do  → '3' 학생 취소   (Co.setUserCo_Status)
        ├── [상담사] 취소            → '4' 상담사 취소 (Co.setUserCo_Status)
        ├── [상담사] CoMcReAssing.do → CONSULTID 변경 (상태 유지, 재배정)
        └── [상담사] 상담결과 작성   → '2' 완료        (Co.ConsultMstr_ResultSetData)
                                        + LINK_YN/LINK_TYPE 로 연계이송 기록
```
`COUNSELSTEP`(상담 회차/단계)은 `SY_CODE` `GRP_CODE='0147'`, `UP_GRP_CODE='0145'` 계층 코드로 별도 관리 (co.xml:7637-7644).
