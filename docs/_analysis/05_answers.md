# 05. 지정 질문 15개 답변

> 확신도: **확실**(소스에서 직접 확인) / **추정**(소스 근거는 있으나 DB·운영 확인 필요) / **미확인**(소스에서 확인 못 함)
> 틀린 답보다 `미확인` 이 낫다는 원칙을 지켰다.

---

### Q1. 역량 체계가 셋 중 무엇인가? 화면에 실제로 표시되는 역량 6종의 이름을 적어라.

**답**: **ⓐ 계열의 이름을 쓴다. 다만 현재 화면에 표시되는 것은 5종이고, 6번째('인문')는 전 화면에서 주석 처리되어 노출되지 않는다.**

**표시되는 역량명 (5종)**
1. 지역형리더
2. 창의적사고
3. 실용적융복합
4. 의사소통
5. 글로벌
6. ~~인문~~ ← **주석 처리. 화면·SQL 모두 비활성**

**중요: "역량"이라는 이름이 붙은 축이 3개이고, 셋이 서로 다른 테이블을 쓰면서 라벨만 공유한다.**

| 축 | 화면 | 테이블 | 그리는 것 |
|---|---|---|---|
| **A. 역량진단(설문)** | `/Sa/Ca/CaDm010L.do` 관리자<br>`/user/Ca/CaMsDm010L.do` 학생<br>`/user/Ca/CaMp010L.do` 교수 | `CA_SURVEY`(회차) · `CA_SURVEY_QUS`(문항) · `CA_SURVEY_TAR`(대상·응시) · 결과 | `SURVEY_GB` 0002~0006 = 위 5역량. 결과 팝업은 방사형 차트(`pop_CaDiagnosisResult.jsp`, `print_diagnosisResult.jsp`) |
| **B. 역량 점수(교과+비교과 누적)** | `/Sa/Ca/CaGs010L.do` 학과목표<br>`/Sa/Ca/CaSs010L.do` 학생별 현황<br>`/Sa/Ca/CaEp010L.do` 시뮬레이션 | `CA_GOAL`(학과 목표: `GOAL_CREDIT`, `PA_1`~`PA_6` 비율%)<br>`CA_GOAL_DATA`(학생별: `SUB_PA_1~6` 교과 + `EXT_PA_1~6` 비교과) | 달성률 = `100 × SUM(SUB_PA_n+EXT_PA_n) / (GOAL_CREDIT × PA_n × 0.01)` |
| **C. 비교과 마일리지 항목 배분** | `/Sa/Ex/ExIm010L.do` 항목관리 | `EX_ITEM`, `EX_ITEM_APP`, `EX_ITEM_SCORE` | 항목별 역량 반영비율. **컬럼명은 ⓒ계열 잔재**(`job_rate`, `base_rate`, `fusion_rate`, `communicate_rate`, `global_rate`, `self_dev_rate`)인데 **화면 라벨만 ⓐ계열로 바꿔 달았다** |

즉 후보 ⓐ의 **이름**, 후보 ⓒ의 **컬럼명**, 그리고 `CA_*` 라는 **또 다른 테이블군**이 뒤섞여 있다. `EP_PRM` 계열은 프로그램 마스터일 뿐 역량 정의 테이블이 아니다.

**역량명은 코드테이블이 아니라 SQL CASE / JSP `<th>` 에 하드코딩되어 있다.** 재구축 시 반드시 코드화할 것.

**하위역량 17종** (`CA_SURVEY_QUS.CAP_QUS_GB2`): 인성·소양 / 비전제시 및 실행능력 / 공동체 윤리의식 / 도전정신 / 분석적·비판적 사고력 / 추론적·대안적 사고력 / 문제해결력 / 전공지식활용능력 / 통합적 사고력 / 가치창출능력 / 토론과 조정력 / 의사표현 및 전달능력 / 경청과 이해능력 / 다문화 이해 및 수용능력 / 외국어 구사능력 / 국제적 교류 및 협업능력 / 세계시민의식

**교수 대상 진단은 라벨이 다르다**: 통합진단 / 교수(Teaching)역량 / 연구역량 / 기본역량 (`SURVEY_TAR='P'`)

**근거**: `ca.xml:725-732`(SURVEY_GB 라벨, 0007 주석), `ca.xml:718-722`(교수용), `ca.xml:1172-1198`(하위역량 17종), `ca.xml:132-162`(CA_GOAL / CA_GOAL_DATA 달성률), `WebContent/WEB-INF/jsp/admin/Ca/CaGs010E.jsp:309-314,353-358`(입력·결과 헤더, 인문 주석), `WebContent/WEB-INF/jsp/admin/Ex/ExIm010L.jsp:706-721`(마일리지 항목 라벨 vs 레거시 name 속성)
**확신도**: **확실** (라벨·주석·테이블 모두 직접 확인). 단 "6종 중 인문이 운영에서도 실제로 안 쓰이는가"는 DB 데이터 확인 필요 → **추정**.

---

### Q2. 상담 가능시간은 "가능"을 등록하나 "제한"을 등록하나? `BASICSETTING`과 `TB_CARR_CNSL_EXCL_HR`의 관계, 그리고 학생이 예약 슬롯을 볼 때 실제로 어느 쪽을 조회하는가.

**답**: **"가능"을 등록한다.** 두 테이블은 경쟁 관계가 아니라 **역할이 완전히 분리**되어 있고, **학생 예약 슬롯 화면은 `BASICSETTING` 만 조회한다. `TB_CARR_CNSL_EXCL_HR` 는 조회하지 않는다.**

| 테이블 | 누가 등록 | 어디서 | 무엇을 |
|---|---|---|---|
| **`BASICSETTING`** | **상담사 본인** | `/user/Co/CoMc030L.do` (상담사 일정관리) | **가능 슬롯**. `CONSULTANTID`+`COUNSELDATE`+`HOUR`+`MINUTE`+`COUNSELTYPEIDX` 조합으로 1행 = 1슬롯. `ISUSE='1'` 이면 사용, `COUNSELCOUNT` = 그 슬롯 정원, `HAKYOUN`/`WEEKDAY`/`GRADUATIONTYPEIDXS`/`TRIALTYPE` 로 대상 제한 |
| **`TB_CARR_CNSL_EXCL_HR`** | **관리자** | `/Sa/Co/CoAm020L.do` (상담 제한일정 관리) | **제한 구간**. `CNSL_EXCL_SDT`+`SRT_HR`+`SRT_MNT` ~ `END_DT`+`END_HR`+`END_MNT`, `CNSL_EXCL_NM`(사유) |

**학생 예약 슬롯 조회 경로 (확정)**
`/user/Co/CoVi010M.do` → `CoUserController.java:259` → **`Co.getConsultSch_List`** (co.xml:5985)
- FROM **`BASICSETTING A`** ⨝(INNER) `COM_CON_INF C` ⨝(LEFT) `COUNSEL_MASTER D`
- `A.ISUSE='1'`, `C.STATUS='0001'`, 날짜 `BETWEEN DAY1 AND DAY5`
- 마감 여부: `COUNSELCOUNT <= (같은 슬롯의 COUNSEL_MASTER 중 상태 '1','2' 건수)` → `CON_REQ_YN='N'`
- 노출 범위: `COM_CON_TAR` 로 학생 소속 단과대 담당 상담사만
- **`TB_CARR_CNSL_EXCL_HR` 는 이 쿼리에 전혀 등장하지 않는다.**

**`TB_CARR_CNSL_EXCL_HR` 의 유일한 실사용처**: `Co.getCounselExclHrChk` (co.xml:12127) — 관리자가 **제한일정을 새로 등록할 때 기존 제한과 겹치는지 검사**하는 용도. 전수 스캔 결과 이 테이블은 `getCounselExclHr`(목록), `getCounselExclHrChk`(중복검사), `CounselExclHr_Insert`, `deleteCounselExclHr` 4개 statement에만 등장한다.

**결론**: 관리자가 제한 기간을 등록해도 **학생 화면의 슬롯은 그대로 노출된다.** 제한을 걸려면 상담사가 `BASICSETTING` 에서 해당 슬롯을 지워야 한다. 이것이 의도된 설계인지 미구현인지는 **미확인** — 재구축 시 정책 확인 필요 (`06_findings.md` 질문 항목).

**근거**: `co.xml:5985-6057`(학생 슬롯 조회), `co.xml:9639-9670`(상담사 일정 조회), `co.xml:9679-9800`(BASICSETTING 저장), `co.xml:12094-12171`(제한일정 CRUD), `CoUserController.java:259-261`, `CoController.java:2476,2532,2607`
**확신도**: **확실**

---

### Q3. 학과 목록을 뿌리는 화면들이 각각 어느 테이블을 쓰는가? (`Fu.assDeptList2` 계열 특히 자세히)

**답**: **`V_DEP_INF`(대학원 미포함 추정)와 `V_DEP_INF_ALL`(대학원 포함)이 화면마다 제각각 쓰인다. `FU_CODE` 테이블은 소스 전체에서 참조되지 않는다(0건).**

**전수 조사 결과 (sqlmap 34파일)**

| 테이블 | 참조 statement 수 | 대표 사용처 |
|---|---|---|
| `V_DEP_INF` | **193** | 대부분의 학과명 표시·셀렉트, `Co.assDeptList`, `Fu.assDeptList2`, `Co.getMyAssDeptList`, `Co.getAssiProfConList` |
| `V_DEP_INF_ALL` | **34** (co 28 / st 26 / ss 4 / rePs 3 / pc 2 / common 6 / sy 1 / fu 1) | `Co.getDaehakAllList(V1)`, `Co.getHakbuAllList(V1)`, `Co.getCoCu_List`, `Co.getCoMc_List`, `Co.getConsultDetailInfo` |
| `FU_CODE` | **0** | **존재하지 않음** |

**화면별 대조표**

| 화면 | statement | 테이블 | 대학원 포함? |
|---|---|---|---|
| 관리자 상담현황 `/Sa/Co/CoCm010L.do` (대학 셀렉트) | `Co.getDaehakAllList` | `V_DEP_INF_ALL` | **포함** |
| 상담사 예약상담 `/user/Co/CoMc010L.do` (대학 셀렉트) | `Co.getDaehakAllList` | `V_DEP_INF_ALL` | **포함** |
| 대학/학부 셀렉트(역할 필터 버전) | `Co.getDaehakAllListV1` / `getHakbuAllListV1` | `V_DEP_INF_ALL` | **포함** (단 `DEPT_CD NOT IN ('3')` 하드코딩) |
| **관리자 조교/학과 관리** `/Sa/Co/sys_assDept.do` | `Co.assDeptList` | **`V_DEP_INF`** | **미포함** |
| **관리자 전담조교 매칭** `/Sa/Fu/sys_assDept.do` ★ | **`Fu.assDeptList2`** | **`V_DEP_INF`** | **미포함** |
| 관리자 교수학과 배정 `/Sa/Fu/sys_profDept.do` | `Fu.profDeptList2` | `V_DEP_INF` | **미포함** |
| 조교 담당학과 셀렉트 | `Co.getMyAssDeptList` | `V_DEP_INF` | **미포함** |
| 부서 검색 팝업 | `Common.serachDept_List` | `V_DEP_INF` | **미포함** |
| 관리자 역량현황 대학 셀렉트 | `Common.getViewDaehakCodeList` | (미확인 — 별도 확인 필요) | — |

**★ `Fu.assDeptList2` (관리자 > 조교학과 배정) 정밀 분석 — "대학원 학과 누락" 원인**

쿼리 구조 (fu.xml:331-372):
```
FROM V_DEP_INF A                                   -- 학과
  INNER JOIN V_DEP_INF B ON A.DEPT_UP_CD = B.DEPT_CD   -- 단과대
  LEFT  JOIN V_DEP_INF C ON C.DEPT_UP_CD = A.DEPT_CD   -- 전공
  LEFT  JOIN V_USR_INF D ON D.MAJOR_CD  = C.DEPT_CD    -- 학생수
WHERE A.USE_YN='Y' AND B.USE_YN='Y' AND C.USE_YN='Y'   -- ← (3)
  AND A.DEPT_UP_CD IN (SELECT DEPT_CD FROM V_DEP_INF
                       WHERE LVL='1' AND USE_YN='Y' AND GRP_CD='0001')  -- ← (1)
  AND A.GRP_CD IN ('0002','0003')                                       -- ← (2)
```

누락 원인 후보 4가지 (**소스에서 확인 가능한 것만**):

| # | 조건 | 대학원이 걸릴 수 있는 이유 | 근거 |
|---|---|---|---|
| **(0)** | **`V_DEP_INF` 사용** (`V_DEP_INF_ALL` 아님) | `V_DEP_INF_ALL` 이 "대학원 포함" 뷰로 별도 존재한다는 사실 자체가, `V_DEP_INF` 에는 대학원이 **없다**는 뜻이다. 배치도 `merge_V_DEP_INF` 와 `merge_V_DEP_INF_ALL` 을 **따로** 돌린다 | fu.xml:350-352 / `DairyBatch.java:82-87` ("대학원생 포함 학과 정보 동기화" 주석) |
| **(1)** | 상위조직이 `LVL='1' AND GRP_CD='0001'` | 대학원이 최상위 레벨이 아니거나 그룹코드가 0001이 아니면 하위 학과 전부 탈락 | fu.xml:358-365 |
| **(2)** | 학과 자신이 `GRP_CD IN ('0002','0003')` | 대학원 학과의 그룹코드가 다르면 탈락 | fu.xml:366 |
| **(3)** | **`C.USE_YN='Y'` 가 WHERE 절에 있음** | `LEFT OUTER JOIN` 이 **사실상 INNER JOIN 으로 강등**된다. **하위 전공(C)이 없는 학과는 통째로 사라진다.** 대학원은 학과 아래 전공 노드를 두지 않는 경우가 많음 | fu.xml:357 |

**가장 유력한 원인은 (0)이다.** 같은 시스템의 다른 화면들이 이미 `V_DEP_INF_ALL` 로 전환했는데 이 화면만 `V_DEP_INF` 에 남아 있다.
**즉시 검증 방법(재구축 팀용)**: 운영 DB에서 `SELECT COUNT(*) FROM V_DEP_INF_ALL` vs `V_DEP_INF` 비교, 그리고 누락된 대학원 학과의 `LVL`·`GRP_CD`·상위조직 `GRP_CD` 값 확인.
**수정 방향**: `V_DEP_INF` → `V_DEP_INF_ALL` 로 교체 + `C.USE_YN='Y'` 를 `LEFT JOIN` 의 `ON` 절로 이동 + (1)(2)의 코드 상수 재검토.

**추가 발견**: `Fu.assDeptList2` 의 `DEPT_CNT` 와 `MAJOR_CNT` 가 **똑같은 서브쿼리**다 (fu.xml:336-337).

**확신도**: (0)(3)은 **확실**(소스 확인), (1)(2)의 실제 영향은 DB 데이터 의존 → **추정**.

---

### Q4. `SY_CODE`(공통코드)를 화면에서 어떻게 쓰는가? 코드→라벨 변환이 SQL 조인인가, 자바 캐시인가, JSP 태그인가. 공통 유틸이 있으면 그 위치.

**답**: **3가지 방식이 혼용된다. 캐시는 없다.**

| 방식 | 구현 | 위치 | 사용 빈도 |
|---|---|---|---|
| **① Oracle 함수 `FN_CODE(그룹코드, 코드)`** | SQL SELECT 절에서 직접 호출. **행마다 함수 호출** | co.xml:1106, 2946, 7631, ep.xml:35-41 등 다수 | **가장 많음** |
| **② SQL 스칼라 서브쿼리** | `(SELECT CODENM FROM SY_CODE WHERE GRP_CODE='0147' AND UP_GRP_CODE='0145' AND UP_CODE=... )` | co.xml:7637-7644, common.xml:296 | 계층코드일 때 |
| **③ 자바 유틸 → JSP `<c:forEach>`** | 셀렉트박스 옵션 채우기 | `career.framework.common.CommonData` | 화면 진입 시 |

**공통 유틸 위치: `src/career/framework/common/CommonData.java`**

| 메서드 | statement | 정렬 |
|---|---|---|
| `getComCodeList(grpCd)` | `Common.getComCd_List` | `ORDER BY CODENM` |
| `getComCodeSortList(grpCd)` | `Common.getComCdSort_List` | `ORDER BY CODE` |
| `getComCodeOrdrList(grpCd)` | `Common.getComCdOrdr_List` | `ORDER BY EXPS_ORDR` |
| `getComCodeList(grpCd, upCd)` | 그룹+상위코드 | 계층 조회 |

호출 예: `CommonData cData = new CommonData(commonFacade); dataMap.put("Code0146", cData.getComCodeOrdrList("0146"));` (`CoMcController.java:127-131`)
Ajax 버전: `/getComCodeOrdrList.do`, `/getComCodeOrdrList2.do` (`CommonController`)

**캐시 없음.** 매 요청마다 DB를 친다. `SY_CODE` 참조 statement가 **108개**, `FN_CODE` 호출까지 합치면 사실상 모든 목록 화면이 코드 조회를 반복한다 → 성능 개선 여지.

**`SY_CODE` 구조**: `GRP_CODE`(그룹) + `CODE` + `CODENM` + `CODE_EXPL` + **`UP_GRP_CODE`/`UP_CODE`(상위 계층)** + `USE_YN` + `ETC1~` + `EXPS_ORDR`.
관리 화면 `/Sa/Sy/SyCm010M.do` 는 **`GRP_CODE NOT IN ('0012','0037')` 을 하드코딩해 2개 그룹을 숨긴다** (sy.xml:908).

**재구축 팀이 반드시 알아야 할 그룹코드** (소스에서 확인된 것)
| 그룹 | 용도 | 근거 |
|---|---|---|
| `0024` | 상담사 상태 | co.xml:44 |
| `0034` | 학적/재직 상태명 | common.xml:296 |
| `0053`·`0054`·`0103` | 상담 세부분야(취업전략센터/학생과/기초교육원) | CoUserController.java:296-303 |
| `0060` | 비교과 그룹 상태 라벨 | ep.xml:35-41 |
| `0143`·`0146` | 상담 관련 코드 (상담사 화면 셀렉트) | CoMcController.java:127-131 |
| `0145` → `0147` | **상담분야 → 세부분야 (2단 계층)** | co.xml:7641-7643 |

**확신도**: **확실**

---

### Q5. `SY_FILE`(첨부) 사용 패턴. 업로드→저장→조회→삭제의 표준 흐름과, 도메인별로 다르게 하는 곳이 있는지.

**답**: **`TAB_NM` + `TAB_SEQ` 다형(polymorphic) 참조 방식의 단일 첨부 테이블.** 표준 흐름은 하나지만 **AES 암호화 여부와 저장 경로가 도메인별로 갈린다.**

**표준 흐름**

| 단계 | 구현 | 위치 |
|---|---|---|
| **① 업로드(물리)** | `CommonsMultipartResolver`(최대 50MB) → `CommonData.fileUpload()` | `career-servlet.xml:68`, `CommonData.java:55-145` |
| **② 확장자 검사** | 화이트리스트 `.bmp,.csv,.docx,.gif,.hwp,.jpeg,.jpg,.pdf,.png,.pptx,.tif,.txt,.xlsx,.zip` | `CommonData.java:95` |
| **③ 물리 저장** | `SYSTEM.FILE_FULL_PATH`/`연도`/`월`/`일`/ 아래에 `System.currentTimeMillis()+랜덤5자리+확장자` | `CommonData.java:88-92,112` |
| **④ AES 암호화(선택)** | `AES_YN='Y'` 이면 `FileCoder` 로 암호화 후 원본 삭제. 파일명 접두 `AES_ENCRYPTION_` | `CommonData.java:115-126` |
| **⑤ 메타 저장** | `Common.setFileData_Insert` → `SY_FILE` | common.xml:159-184 |
| **⑥ 조회** | `Common.getboardFile_List` — `WHERE TAB_NM=? [AND TAB_SEQ=?] AND DEL_YN='N' [AND FILE_CD=?]` | common.xml:207-228 |
| **⑦ 삭제** | `Common.setFileData_Detele` = **`UPDATE SET DEL_YN='Y'` 논리삭제** (물리파일은 남음) | common.xml:187-192 |
| **⑦'** 일괄삭제 | `Common.setFileDataSearch_Detele` — `TAB_NM` + `TAB_SEQ IN (foreach)` | common.xml:195-204 |
| **⑧ 다운로드** | `/fileDown.do`, `/fileDownFull.do`, `/BoardfileDown.do` (`CommonController`), ZIP 일괄은 `ZipFileDownloadView`/`ZipFileDownloadView2` | `career-servlet.xml:78-79` |

**`SY_FILE` 컬럼**: `FILE_SEQ`(PK, `SEQ_SY_FILE.NEXTVAL`), **`TAB_NM`**(도메인 구분 문자열), **`TAB_SEQ`**(원본 레코드 PK), `FILE_PATH`(웹 상대경로), `REAL_FILE_NM`(원본명), `TRANS_FILE_NM`(저장명), `FILE_SIZE`, `FILE_TYPE`(확장자), `DEL_YN`, **`FILE_CD`**(같은 레코드 안에서 첨부 종류 구분 — 예: 본문첨부 vs 결과보고서)

**도메인별로 다른 점**
1. **`explainCd='Y'` 분기**: 저장 경로가 `STATIC.ROOT.PATH/userUpload/` 로 바뀌고, 파일명을 **원본 그대로** 유지한다 (`CommonData.java:84-86,107`). 날짜 폴더도 안 만든다. → 동명 파일 덮어쓰기 위험.
2. **비교과 전용 조회**: `Common.getboardFileEp_List` (common.xml:231) 가 별도로 있다 — `SY_FILE` 과 다른 테이블을 UNION.
3. **게시판/에디터**: `cheditor` 가 `WebContent/cheditor/imageUpload` 로 **`SY_FILE` 을 거치지 않고 직접 업로드**한다 (별도 경로).
4. **엑셀 업로드**(상담일지·자격증·역량진단·장기결석 등)는 `ExcelUpload.java` 로 파싱만 하고 `SY_FILE` 에 남기지 않는다.

**보안 주의(재구축 시 반드시 개선)**
- 업로드 경로가 **웹 문서 루트 안(`WebContent/static_root/userUpload`)** 이다 → 업로드 파일이 URL로 직접 접근 가능.
- 확장자 검사가 **`indexOf` 부분문자열 매칭**이라 `.jp`·`.doc`·`.xls`·`.ppt`·`.zi` 처럼 화이트리스트 항목의 **접두어면 통과**한다 (`CommonData.java:95`). `.jsp`·`.html` 은 통과 안 되므로 즉시 RCE는 아니지만 결함이다.
- 확장자가 없는 파일명이면 `lastIndexOf(".")` 가 -1 → `substring(-1)` 예외.
- `/fileDown.do` 계열에 **소유자 검증이 있는지 미확인** — 재구축 시 `FILE_SEQ` 만으로 남의 첨부를 받을 수 없게 할 것.

**확신도**: **확실** (다운로드 권한 검증 부분만 **미확인**)

---

### Q6. 조교가 로그인하면 볼 수 있는 화면 전체와 각 화면의 학생 범위.

**답**: **소스 기준 조교 전용 화면은 7개다.** (메뉴 실제 노출은 `SY_MENU_AUTH` 의 `AUTH0002` 매핑에 달렸으므로 **DB판정** 필요)

조교 판정: `V_USR_INF.USER_TY_CD='1501'` → 세션 `SESSION_USER_TY_CD='A'` → 권한 `AUTH0002` 자동 부여 (`common.xml:286`, `PUtil.java:1005-1007`)

| # | 화면 | URL | JSP | 학생 범위 | 안전 |
|---|---|---|---|---|---|
| 1 | 전담교수 배정 유무 확인 | `/user/Co/CoAs010L.do` | `user/Co/Mas/CoMas010L` | **`FU_ASS_DEPT.USR_ID=세션ID` 의 `MAJOR_CD` 와 일치**하는 `V_USR_INF` 중 `USER_TY_CD='1101'`(재학생-학부) AND `HOFC_STA_CD='0001'`(재학) | 🟢 |
| 2 | 전담교수 배정 팝업 | `/user/Co/Advis.do` | `common/Co/popSearchAdviser` | 교수 검색 | 🟢 |
| 3 | 전담교수 상담실적 | `/user/Co/CoAs020L.do` | `user/Co/Mas/CoMas020L` | **`HAKBU_CD` 파라미터로만 필터.** 기본값은 `FU_ASS_DEPT` 첫 학과지만 **검증 없음** | 🔴 **타 학과 열람 가능** |
| 4 | 전담교수 상담실적 상세 | `/user/Co/CoAs020DL.do` | `user/Co/Mas/CoMas020D` | 위와 동일 | 🔴 |
| 5 | 학생별 역량현황 | `/user/Co/CoAs030L.do` | `user/Co/Mas/CoMas030L` | `USR_TYPE='A'` → `V_USR_INF.MAJOR_CD IN (SELECT MAJOR_CD FROM FU_ASS_DEPT WHERE USR_ID=세션ID)` | 🟢 |
| 6 | 학생별 역량현황2 | `/user/Co/CoAs040L.do` | `user/Co/Mas/CoMas040L` | 동일 | 🟢 |
| 7 | 전담교수 상담실적 엑셀 | `/user/Pc/PcChart020Excel.do` | `user/Co/Mas/CoMas020Chart_XLS` | 동일(파라미터) | 🔴 + **RETOK 검사 없음**(`PcExcelController` = `MultiActionController` 직상속) |

**조교가 "조교로서" 접근하는 다른 도메인의 데이터 (전용 화면은 아니지만 SQL에 조교 분기가 있는 곳)**

| 도메인 | statement | 범위 조건 |
|---|---|---|
| 취업통계 | `st.xml:485-491, 613-617, 5466-5467` | `SESSION_USER_TY_CD='A'` → `FU_ASS_DEPT` INNER JOIN (`MAJOR_CD` 또는 `HAKBU_CD`) |
| 진로목표 | `fu.xml:296-297` | `USR_TYPE='A'` → `MAJOR_CD IN (FU_ASS_DEPT...)` |
| 진로취업카드 | `ss.xml:1141-1148, 1268-1275` | `SESSION_USER_TY_CD='A'` → `FU_ASS_DEPT` EXISTS |
| 대학/학부 셀렉트 | `co.xml:6596-6612, 6648-6660` | `'A'` → 본인 소속 **OR** `FU_ASS_DEPT` 배정 학과 |
| 마일리지 통계 | `ex.xml:1039,1061,1075` | `PARENT='JOBSTATS'` 이고 `'A'` 또는 `'P'` 일 때 별도 분기 |

**핵심 결론 (재구축 팀용)**
- 조교의 학생 범위는 **오직 `FU_ASS_DEPT` 로만 결정**된다. `COM_ASS_DEPT` 는 죽어 있다(Q 없음 — `03_access_scope.md` §3 참조).
- 조인 키가 화면마다 **`MAJOR_CD`(전공)** 와 **`DEPT_CD`(학과)** 로 갈린다. `FU_ASS_DEPT` 에 `MAJOR_CD` 가 NULL인 배정행은 화면 1·5·6에서 학생이 0명으로 나온다.
- **화면 3·4·7의 파라미터 신뢰 문제는 재구축 시 반드시 수정**할 것.

**근거**: `CoMasController.java:111,237,341,409`, `co.xml:6329-6384, 10061-10118`, `ca.xml:55-56`, `st.xml:485-491`, `ss.xml:1141`, `fu.xml:296`
**확신도**: **확실** (단 메뉴 노출 여부는 **DB판정**)

---

### Q7. 관리자 화면 전체 목록. 특히 학생 조회·통계·설정·코드관리·권한관리 영역.

**답**: **`/Sa/*` 305화면 + `/admin/*` 10화면 = 315화면** (JSP 렌더 기준). 전수 목록은 `01_sitemap.md` 화면 전수 표 참조.

**모듈별 화면 수 (JSP 렌더 기준)**

| 모듈 | 화면 | 영역 |
|---|---|---|
| `/Sa/Re` 채용정보 | 57 | 추천·일반·공공·인턴십·공모전·교육·알바 각 L/I/D/U + **인재검색 상세팝업 12종** |
| `/Sa/Co` 상담관리 | 38 | 상담사·상담현황·일정·통계·**조교배정·전담교수매칭·제한일정** |
| `/Sa/Ep` 비교과 | 32 | 개설신청·조회·구분·만족도·개인/그룹 상세탭 10종·블랙리스트 |
| `/Sa/St` 취업통계 | 30 | 조사차수·예비/본조사·취업자현황·취업통계·KEDI·졸업자 |
| `/Sa/Sy` 시스템관리 | 21 | **메뉴·권한그룹·메뉴권한·코드·게시판·배너·SMS이력·접속이력/통계/경로** |
| `/Sa/Ca` 역량 | 20 | 학생별 현황·**학과 PA역량목표**·시뮬레이션·**역량진단관리** |
| `/Sa/Dt` 데이터분석 | 18 | 6종 차트 + 표/명단 엑셀 12종 |
| `/Sa/Ec` 취업동아리 | 14 | 기수·반·커뮤니티 |
| `/Sa/Mt` 멘토멘티 | 13 | 멘토·멘티·Q&A |
| `/Sa/Cp` 기업회원 | 10 | 기업회원·일반회원·지역청년회원 |
| `/Sa/Fu` 진로목표 | 10 | 워크넷검사·진로탐색·진로목표·**전담조교 매칭·교수학과 배정** |
| `/Sa/Ex` 마일리지 | 9 | 항목·승인·자격증 |
| `/Sa/Ip` 취업수기 | 8 | 국내·해외 |
| `/Sa/Pc` 교수상담 | 4 | 실적·통계 |
| `/Sa/Ss` 진로취업카드 | 4 | 이력서·학생현황 |
| `/Sa/Bd` 게시판 | 3 | 공통·갤러리·공지 |
| `/Sa/Sm` 동문CEO / `/Sa/Et` 기업관리 | 3 / 3 | |
| `/Sa/AcSt` 접속통계 / `/Sa/Rm` 로드맵 / `/Sa/Pf` 포트폴리오 | 2 / 2 / 2 | |
| `/Sa/Wa` 장기결석·학사경고 / `/Sa/Ov` 해외취업 | 1 / 1 | |
| `/admin/infaco` 가족회사 | 9 | |
| `/admin/poss` 참여후기 · `/admin/portfolioStudent` · `/admin/System` | 나머지 | |

**★ 질문이 특히 지목한 4영역**

**(1) 학생 조회**
- `/Sa/Ss/SsRs020L.do` 학생현황 · `/Sa/Ss/SsRs010L/D.do` 이력서
- `/Sa/Re/RePs010D.do` **인재검색 학생 상세 팝업 + 탭 12종**: 학적(`RePsHakjuk`), 지도(`RePsAdvice`), 학적변동(`RePsHakByundong`), 장학(`RePsJanghak`), 비교과참여(`RePsEpPartic`), 프로그램(`RePsIc2PrmList`), 진로설계(`RePsStuPlan`), 교수상담(`RePsProfConsult`), 심리검사(`RePsTrial`), 마일리지(`RePsPoint`), 취업현황(`RePsGrjoPrcn`)
  → **학생 1명의 전 이력을 한 화면에서 볼 수 있는 가장 강력한 관리자 기능.** 재구축 시 최우선 참고 대상.
- `/Sa/Ca/CaSs010L/D.do` 학생별 역량현황 · `/Sa/Wa/Wa010L.do` 장기결석/학사경고

**(2) 통계**
- 취업통계 `/Sa/St/StSt010L.do` (엑셀 12종 분기: 1001/1002/1003/1005/1007/1008/2001/2002/3001/3002/4001/5001)
- KEDI `/Sa/St/StSt020L.do` · 프로그램별 취업률 `/Sa/St/StPg010L.do`
- 상담통계 `/Sa/Co/CoSt010L.do`, `CoSt020L.do` · 교수상담통계 `/Sa/Pc/PcSt010L.do`
- 데이터분석 `/Sa/Dt/Dt010L~Dt060L.do` (스마트/지원체계/프로그램/상담/마일리지구간/마일리지순위)
- 접속통계 `/Sa/Sy/SyUs040L.do`, `/Sa/AcSt/AcSt010L.do`, `AcSt020L.do`

**(3) 설정**
- 배너 `/Sa/Sy/SyBm010M.do` (지역청년 `SyBm020M.do`) · 팝업 `/admin/System/mainPopupList.do`, `/Sa/Sy/SyPo010L/M.do`
- 게시판 정의 `/Sa/Sy/SyBd010L/M/D.do` · 비교과 구분 `/Sa/Ep/Ep040L.do`
- 학과 역량목표 `/Sa/Ca/CaGs010L/D/E.do` · 학과별 취업목표 `/Sa/St/StDeptGoalConfig010L.do`
- 상담 제한일정 `/Sa/Co/CoAm020L.do`
- ⚠️ **관리자 IP 제한(`SY_IP_INFO`) 설정 화면은 소스에 없다.** 읽기만 한다.

**(4) 코드관리**: `/Sa/Sy/SyCm010M.do` 단일 화면 (그룹→코드→상세 3단). `0012`·`0037` 그룹은 숨김.

**(5) 권한관리**: `/Sa/Sy/SyAm010M.do`(권한그룹=`SY_AUTH`) + `/Sa/Sy/SyAm020M.do`(메뉴권한=`SY_MENU_AUTH`) + 멤버 등록 `Sys_groupMemInsert.do`(`SY_AUTH_USER`) + 이력 `SY_AUTH_LOG`. 메뉴 자체는 `/Sa/Sy/SyMn010M.do`.
  - 저장 방식: **해당 권한×`USER_DVID` 의 `SY_MENU_AUTH` 전삭제 후 재INSERT**.
  - ⚠️ `SY_AUTH_USER` 에 **DELETE statement가 없다** → 권한 회수 화면 **미확인**.

**확신도**: **확실** (화면 목록). 메뉴 실제 노출은 **DB판정**.

---

### Q8. 교수 상담 기능이 실제로 동작하는가? `CON_PROF_INFO`(18.4만 건)는 데이터가 많은데 `CO_PROF`·`PC_CON_PROF_*`는 0행이다.

**답**: **두 계통이 병존한다. 실제로 데이터가 쌓이는 것은 `CON_PROF_INFO` 계통이고, 여기에는 교수가 직접 로그인해 쓰는 화면과 상담사/조교가 조회하는 화면이 모두 있다. `PC_CON_PROF_*` 계통은 코드는 살아 있으나 사용되지 않는다.**

| 계통 | 테이블 | 사용 statement | 화면 |
|---|---|---|---|
| **A (현행)** | `CON_PROF_INFO` (R29·C2·U4·D2) | `Co.conProfInfo_Insert`, `Co.getOnlineMyProfConList`, `Co.getAssiProfConList`, `Pc.*` | 교수 `/user/Pc/PcMp*`, `/user/Co/onlineConProf.do`, 조교 `/user/Co/CoAs020L.do`, 관리자 `/Sa/Pc/PcCp010L.do`, `/Sa/Co/CoEm010L.do`, 학생 `/user/Co/CoMs020L·030L·040L.do` |
| **B (미사용)** | `PC_CON_PROF_ADV`(R17·C1·U2), `PC_CON_PROF_USR`(R11·C1·U1) | `Pc.ProfADV_Insert`(pc.xml:554) 등 | `/user/Pc/PcMa*` 계열(추정) |
| **C** | `CO_PROF` | **소스 참조 0건** | 없음 |

**A 계통의 실제 동작 근거**
- `CON_PROF_INFO` 주요 컬럼: `PROF_ID`(교수), `STATUS`(`'0001'` 신청/미참여 → `'0002'` 완료), **`CON_KIND`(`'ON'` 온라인 / `'OF'` 오프라인)**, `CONSULTDATE`
- 교수가 직접 입력: `/user/Co/pop_offLineProfContDir.do`, **`pop_offLineProfContDirNew.do`**(주석: "교수 상담 미입력 상담 팝업 2025.04.02 학생 여러명 등록될 수 있게 신규생성") → **2025년에도 개발이 이어진 살아있는 기능**
- 학생이 온라인 상담 신청: `/user/Co/pop_onlineProfCont.do` → `common/Co/pop_CoReqOnlineMP`
- 교수 마이페이지 목록: `/user/Pc/PcMpOnlineL.do`, `/user/Pc/PcMp020L.do`
- 조교 실적 집계: `Co.getAssiProfConList` — `STATUS='0002'` 를 `CON_KIND` 별로 COUNT (co.xml:10085-10096)
- 배치가 교수 ID 변경을 따라간다: `Common.getDupDelProf_List` + `Common.update_ConProfInfo` (`DairyBatch.java:98-105`)

**교수가 직접 로그인하는가?** — **예.** `USER_TY_CD='1301'` → `SESSION_USER_TY_CD='P'` → `AUTH0003`. `/sso.do` 는 `'P'` 이면 **교수 상담 화면으로 직행 리다이렉트**한다: `/user/Pc/PcMp010L.do?ONLOAD=Y&CURRENT_MENU_CODE=MENU0196&TOP_MENU_CODE=MENU0072` (`SessionController.java:345-347`). 이 하드코딩된 리다이렉트 자체가 "교수 로그인 → 교수 상담 화면"이 주 시나리오임을 보여준다.

**상담사가 대신 입력하는가?** — **관리자/직원이 대신 입력하는 경로가 별도로 있다.** `/Sa/Co/CoEm010L.do`(직원 상담실적) → `ConEmpDetailStuList.do` → `CoEm010SD.do`(개인 상담 신규 작성). 상담사(`T`)가 교수 상담을 대신 입력하는 화면은 **소스에서 확인되지 않음**.

**`PcMa*` vs `PcMp*` 중복**: `/user/Pc/PcMa010L.do` 와 `/user/Pc/PcMp010L.do` 가 주석·구조가 거의 동일하다("지도교수 상담"). `Ma` 계열이 B 계통(`PC_CON_PROF_*`)을 쓰는 구버전으로 **추정**되나, 어느 쪽이 메뉴에 노출되는지는 **DB판정**.

**근거**: `pc.xml:116-119, 292-295, 342-371, 522-527, 554-558`, `co.xml:10085-10096`, `SessionController.java:345-347`, `CoUserController` 매핑, `04_table_usage.md`
**확신도**: **확실**(A 계통 동작 / C 미사용). B 계통이 완전히 죽었는지는 **추정**(메뉴 노출 DB판정 필요).

---

### Q9. 진단검사(`CHECK_*` 8종)를 학생이 단독으로 응시하는 화면이 있는가? 검사 시작→문항→채점→결과표시 흐름.

**답**: **`CHECK_*` 라는 이름의 테이블은 이 소스에 존재하지 않는다.** sqlmap 34파일 전수 스캔 결과 `CHECK_` 로 시작하는 식별자는 전부 **컬럼명**(`CHECK_YN`, `CHECK_CNT`, `CHECK_DATE`, `CHECK_TIME`, `CHECK_ID`, `CHECK_MBTI`)이고 테이블이 아니다.

**이 시스템에서 "검사"에 해당하는 것은 3가지**이며, 성격이 서로 다르다.

**(1) 역량진단 — 학생이 단독으로 응시한다 ✅**
```
관리자 회차 개설  /Sa/Ca/CaDm010L.do → CaDm010M.do   [CA_SURVEY 등록: SURVEY_GB, SURVEY_TAR, ST_DT~ED_DT]
        ↓         대상자 지정 (전체/학년/교수/사용자지정) → CA_SURVEY_TAR
학생 목록        /user/Ca/CaMsDm010L.do                [응시 가능 회차 목록]
        ↓
학생 응시        /user/Ca/CaMsDm010D.do → /common/Ca/pop_MsCaDiagnosisMng.jsp
                 문항: CA_SURVEY_QUS (CAP_QUS_GB 대역량, CAP_QUS_GB2 하위역량 17종, QUS_CONT)
        ↓
채점·상태        CA_SURVEY_TAR.STATUS = 'Y'(완료) / 'I'(진행중)
        ↓
결과 표시        /user/Ca/CaMsDm010R.do → /common/Ca/pop_CaDiagnosisResult.jsp (방사형 차트)
                 인쇄: /common/print_diagnosisResult.jsp, /user/My/diagnosisResult.do
관리자 결과      /Sa/Ca/CaDm010R.do, 교수용 /Sa/Ca/CaDmEmp010R.do
미실시 배지      로그인 시 Ca.getCapSurveyNotCnt → 세션 SESSION_CAP_SURVEY_NOT_CNT
```
**→ 상담 신청과 무관하게 독립 응시한다.** (근거: `SessionController.java:205-206`, `CaController.java:1057`, `ca.xml:702,1167`)

**(2) 심리검사 — 상담 신청 절차 안에서만 이루어진다 ⛔ 단독 응시 화면 없음**
- `COUNSEL_MASTER.COUNSELTYPEIDX='3'` = 심리, `BASICSETTING.TRIALTYPE` 으로 검사 종류 지정
- 학생 신청: `/user/Co/CoVi020M.do`(검사 신청) → `/user/Co/CoAppS.do` → `COUNSEL_MASTER` INSERT
- 상담사 결과 입력: `/user/Co/CoMc010TrialConWrite.do` → `/common/Co/pop_TrialConsultingWrite.jsp`
- 집단 심리검사: `/user/Co/CoMc060L.do`, `CoMcTrialGroupConAdd.do`
- **문항·채점 로직이 시스템 안에 없다.** 외부 검사도구 결과를 상담사가 입력하는 구조.

**(3) 워크넷 API 검사 — 외부 연동, 결과만 저장**
- `/Sa/Fu/FuMt010L.do`, `FuMt011L.do` (관리자 "워크넷 검사결과"), 학생 `/user/Fu/FuAp0*`
- `sql-map-config.xml:29` 주석이 `fu.xml` 을 "워크넷API"로 명시
- `/user/Fu/CoSimriResultWrite.do`·`CoSimriResultView.do` (심리검사 결과 작성/조회)
- 검사 시작/문항/채점은 **워크넷 측**. 시스템은 결과만 받아 표시.

**결론**: 학생 단독 응시가 가능한 것은 **역량진단(`CA_SURVEY`) 1종**이고, 심리검사는 **상담 신청 절차 안에서만**, 직업/진로 검사는 **외부(워크넷)** 다. 지시서가 말한 `CHECK_*` 8종 테이블은 **이 소스 코드에서 전혀 사용되지 않으므로 죽은 스키마이거나 다른 시스템 소유**로 보인다(**추정**).

**확신도**: **확실**(`CHECK_*` 미사용, 3계통 구분). `CHECK_*` 8종의 정체는 **미확인**.

---

### Q10. 진로설계(`STU_COURSE_INFO` 계열)가 현재 메뉴에 노출되는가? 죽은 기능인지 확인.

**답**: **죽은 기능이 아니다. 코드·화면·조회 경로가 모두 살아 있다.** 다만 **메뉴 노출 여부 자체는 `SY_MENU` DB 데이터라 소스로는 확정 불가(`DB판정`).**

**살아 있다는 근거**

| 항목 | 내용 |
|---|---|
| 사용 statement | **R=12 · U=3** (`04_table_usage.md`). `fu.xml`(5) + `cu.xml`(10) + `ca.xml`(1) + `co.xml`(2) |
| 구조 | `STU_COURSE_INFO` 에 **`STEP1`~`STEP4` Y/N 플래그** + `FIRSTUPDATE`. 4단계 진로설계서 |
| 학생 화면 | `/user/My/MySt060L.do` "나의 진로설계서", 3단계 팝업 `/user/My/MyCuStep3_Pop.do`(교과학습계획) · `MyCuStep3_Pop2.do`(비교과학습계획) · `MyCuStepAll_Pop.do` |
| 컨트롤러 | `MyCuController.java` (26.8KB, 12 매핑) — `cu.xml`(진로설계서, 30 statement) 전용 |
| 관리자/교수 화면 | `/Sa/Fu/FuAp060L.do`·`FuAp060D.do`, `/user/Fu/FuAp060L.do`·`FuAp060D.do` → `Fu.getStuCourTotalList` 등에서 `STEP1~4` 완료 카운트 집계 (fu.xml:397-412, 539-543, 672-675) |
| **다른 도메인에서 참조** | 상담 학생검색 팝업이 `LEFT JOIN STU_COURSE_INFO` 로 진로설계 여부를 보여준다 (co.xml:7318, 7480) |
| **인재검색 탭** | 관리자 인재검색 팝업에 **`/Sa/Re/RePsStuPlan.do` → `/common/RePs/RePsStuPlan.jsp` "진로설계"** 탭이 존재 |
| 역량 화면 참조 | ca.xml:3808 에서 `STU_COURSE_INFO` ⨝ `V_USR_INF` 목록 조회 |

**INSERT statement가 0건**인 점이 눈에 띈다 (R12·C0·U3·D0). 즉 **행 생성은 다른 경로(배치·트리거·외부 시스템·MERGE)** 로 이루어지고, 화면에서는 `UPDATE` 로 `STEP1~4` 플래그만 갱신하는 구조로 **추정**된다. 재구축 시 "학생 행이 언제 최초 생성되는가"를 반드시 확인해야 한다.

**확신도**: 기능 생존은 **확실**. 메뉴 노출은 **DB판정**. 행 최초 생성 경로는 **미확인**.

---

### Q11. 상담 신청 → 배정 → 완료 → 기록 작성의 전체 상태 전이. 취소·재배정·연계이송(`LINK_*`) 포함.

**답**:

**상태 컬럼: `COUNSEL_MASTER.COUNSELSTATUSIDX` (4값)**

| 값 | 의미 | 누가 일으키나 | statement |
|---|---|---|---|
| `1` | **신청** | 학생 (또는 상담사 대리등록) | `COUNSEL_MASTER` INSERT (`/user/Co/CoAppD.do`) |
| `2` | **완료** | **상담사** (상담결과 작성 시) | `Co.ConsultMstr_ResultSetData` (co.xml:7731) |
| `3` | **학생 취소** | 학생 | `Co.setUserCo_Status` (co.xml:2530) |
| `4` | **상담사 취소** | 상담사/관리자 | `Co.setUserCo_Status` |

**전체 전이도**
```
 [학생] /user/Co/CoVi010M.do 주간 캘린더에서 슬롯 선택
          └ 슬롯 출처: BASICSETTING (ISUSE='1', COM_CON_TAR 로 소속 단과대 필터)
          └ 마감 판정: COUNSELCOUNT <= 해당 슬롯의 상태 1·2 건수
              ↓ /user/Co/CoAppD.do → COUNSEL_MASTER INSERT
        ┌──────────────────────────────┐
        │  COUNSELSTATUSIDX = '1' 신청   │  ← 배정은 신청 시점에 이미 확정(CONSULTID)
        └──────────────────────────────┘
             │
   ┌─────────┼──────────────────┬────────────────────────┐
   │         │                  │                        │
[학생취소]  [상담사취소]      [재배정]                [상담 실시]
CoMsCancel  (상담사/관리자)   CoMcReAssing.do        CoMc010ConWrite.do
   ↓            ↓             CONSULTID 변경             ↓
  '3'          '4'            (상태 유지 '1')     ConsultMstr_ResultSetData
CANCELREASON / CANCELUSERID / CANCELDATE 기록              ↓
                                              COUNSELSTATUSIDX = '2' 완료
                                              + CONSULTINFO / RESULTTITLE / RESULTINFO
                                              + MAJOR_YN·COURS_YN·EMPLO_YN·REASON_YN
                                              + LINK_* (연계이송)
                                              + ON_OFF_TTYPE, ISOPEN, STUD_OTP_YN
                                              + UDATE, UPDUSER
```

**★ 배정(assignment)에 대하여**
현행에는 **"배정 대기 → 배정 완료"라는 별도 상태가 없다.** 학생이 슬롯을 고르는 순간 상담사(`CONSULTID`)가 확정된다. "재배정"은 `/user/Co/CoMcReAssing.do` → `/common/Co/pop_ConsultReAssign.jsp` 로 `CONSULTID` 만 바꾸는 것이고 **상태값은 변하지 않으며 이력도 남지 않는다.**

**★ 취소 제한**
학생 취소는 상담일 기준 **3일 전까지**만 가능. `CANCEL_YN` 파생 컬럼으로 판정: `(ADV_APP_DATE - SYSDATE) <= 3 이면 'N'` (co.xml:2520-2523).

**★ 연계이송 (`LINK_*`) — 상태가 아니라 완료 시 부가정보다**

| 컬럼 | 의미 |
|---|---|
| `LINK_YN` | 연계 여부 Y/N |
| `LINK_TYPE` | **연계 보낸 곳** |
| `LINK_TYPE_TEXT` | 연계 상세 텍스트 |
| `LINK_RCT_YN` | 연계 접수 여부 |
| `LINK_RCT_TYPE` | **연계 받은 곳** |
| `LINK_RCT_TEXT` | 접수 상세 텍스트 |

`LINK_TYPE`/`LINK_RCT_TYPE` 라벨은 **상담 종류(`COUNSELTYPEIDX`)에 따라 달라진다** (co.xml:1129-1158):

| 코드 | `COUNSELTYPEIDX='2'`(취업) | `COUNSELTYPEIDX='1'`(진로) |
|---|---|---|
| `0001` | 미결정 (2025.01.15 이전 명칭: 미연계) | 미결정 |
| `0002` | **진로** | **취업** |
| `0003` | 타부서 | 타부서 |
| `0004` | 지도교수 | 지도교수 |
| `0005` | 기타 | 기타 |

즉 **연계는 새 상담건을 만들지 않고 원 상담건의 컬럼에만 기록된다.** 연계받은 부서가 실제로 접수했는지는 `LINK_RCT_YN`/`LINK_RCT_TYPE` 을 상담사가 수기로 갱신해야 안다. **연계 워크플로가 시스템화되어 있지 않다.**

**★ 부가 상태값**
- `COUNSELSTEP` — 상담 회차/단계. `SY_CODE` `GRP_CODE='0147'`, `UP_GRP_CODE='0145'`, `UP_CODE=CONSULTTYPE` 계층 코드 (co.xml:7637-7644)
- `COUNSELTYPEIDX` — `1`진로 / `2`취업 / `3`심리 (co.xml:6009)
- `ISOPEN` — 상담기록 공개 여부
- **`STUD_OTP_YN`** — 학생 비공개 플래그 (2025.01.14 추가). 재구축 시 학생 화면에서 반드시 반영
- `ON_OFF_TTYPE` — `'ON'` 온라인 / 그 외 오프라인

**★ 이력 없음**: `COUNSEL_MASTER` 는 **UPDATE 덮어쓰기**만 한다. 상태 변경 이력 테이블이 없다. 취소만 `CANCELREASON`/`CANCELUSERID`/`CANCELDATE` 3컬럼으로 남는다.

**근거**: `co.xml:1111-1115, 1129-1158, 2520-2537, 5985-6057, 7631-7644, 7731-7760`, `CoUserController.java:118-273`, `CoMcController` 매핑
**확신도**: **확실**

---

### Q12. 비교과 신청 → 선발 → 출석 → 수료 흐름. `EP_PRM_APP`의 상태 컬럼, 출석 체크 방식, 미참여 페널티.

**답**:

**상태 컬럼: `EP_PRM_APP.STATUS`** — 화면이 `APP_GB`(A=신청자관리 / C=선발자관리)로 두 단계로 나뉘고, 각 단계에서 쓸 수 있는 값이 다르다.

| 값 | 신청자관리(`APP_GB='A'`) | 선발자관리(`APP_GB='C'`) |
|---|---|---|
| `1` | **신청** (드롭다운 라벨 '접수대기') | — |
| `7` | **대기** (라벨 '접수완료') | — |
| `2` | **선발** ('선발완료') | 선발 |
| `3` | **탈락** | — |
| `4` | **취소** | — |
| `5` | — | **수료** |
| `6` | — | **미수료** |
| `8` | — | **참석** |
| `9` | — | **불참 (벌점 1점)** |
| `10` | — | **불참 (벌점 3점)** |
| `9999` | 삭제 | 삭제 |

**전체 흐름**
```
[담당자] 프로그램 개설신청  /Sa/Ep/Ep010L.do → EP_PRM (REQ_STAT_GB: A신청 / R반려 / S승인완료)
        ↓ 승인(S) 후 모집
[학생]  신청  /user/Ep/Ms* → EP_PRM_APP INSERT (STATUS='1')
        ↓ (그룹형이면 EP_PRM_GROUP + EP_PRM_MAPPING 으로 그룹 구성)
[담당자] 신청자관리  /Sa/Ep/EpTb020PD.do (APP_GB=A)
        ├ 접수완료 → '7'
        ├ 선발     → '2'
        ├ 탈락     → '3'
        └ 취소     → '4'
        ↓
[담당자] 선발자관리  /Sa/Ep/EpTb020PD.do (APP_GB=C)
        ├ 참석      → '8'
        ├ 불참(1점) → '9'
        ├ 불참(3점) → '10'
        ├ 수료      → '5'   ※ POINT_DIV='N' 이면 EP_PRM_SCORE 의 등급명으로 세분
        └ 미수료    → '6'
        ↓
        EP_PRM_RESULT / STU_CON_POINT / CA_GOAL_DATA(EXT_PA_n) 반영
        만족도조사 EP_SURVEY / EP_SURVEY_TAR / EP_SURVEY_RST
```

**★ 수료 판정이 개인형/그룹형에서 다르다** (ep.xml:91-96)
- `EP_PRM.PRM_GB='P'`(개인형): `EP_PRM_APP.STATUS='5'` 이면 수료
- `EP_PRM.PRM_GB='G'`(그룹형): **`EP_PRM_MAPPING.STATUS='2'`** 이면 수료 — 신청 테이블이 아니라 매핑 테이블을 본다
- ⚠️ **같은 파일 안에서 판정 로직이 두 벌이다.** ep.xml:338-344 에서는 그룹형도 `JPA.STATUS='5'` 로 판정한다 → **불일치**(`06_findings.md`).

**★ 출석 체크: 회차별이다 (단일 아님)**
- `EP_PRM_STEP` (R13·C2·U1·D1) = 프로그램 차수/단계 테이블. `EP_PRM.PRM_STEP` 과 대응
- 집계 서브쿼리가 `AND PRM_STEP = JP.PRM_STEP` 으로 **차수별로 신청자 수를 센다** (ep.xml:2577)
- `EP_PRM.ATT_YN` = 출석 사용 여부 플래그. `ATT_YN='Y'` 일 때만 수료 상태 표시 (`EpTb020PD.jsp:866`)
- 지역청년 프로그램은 별도 차수 테이블 `TB_CARR_GJOB_PGM_TN` + 등록 화면 `/Sa/Ep/regPgmTn.do`, `regPgmTnList.do`
- ⚠️ 다만 **출석 상태값(8/9/10)은 `EP_PRM_APP` 행 1개에만 붙는다** → 차수 여러 개인 프로그램에서 "3회차만 불참"을 표현할 수 있는지는 **미확인**. `EP_PRM_STEP` 에 개인별 출석 행이 있는지 DB 확인 필요.

**★ 미참여 페널티: 있다 — 2단계 벌점 + 블랙리스트**
1. 상태값 자체에 벌점이 내장: `9`=불참(벌점 1점), `10`=불참(벌점 3점)
2. **블랙리스트 화면 `/Sa/Ep/EpBlackList.do`** → `/admin/Ep/EpBlackList.jsp`
3. 채용 쪽에도 별도 블랙리스트 팝업: `/Sa/Re/PgPm012M.do` → `/common/pop_UsrBlk.jsp`

**★ 수료 취소 시 연쇄 삭제 (화면 경고문)**
> "수료 결과를 삭제하는 경우 — 1. 비교과 포인트 삭제 2. 만족도조사 결과 및 등록 삭제" (`EpTb020PD.jsp:431,478`)
> "수료 처리 이후에는 상태를 변경하실 수 없습니다" (`:177`)

**★ 자동 SMS**: `DairyBatch` 가 선발자(`Ep.getExtSelectStu_List`)와 익일 운영 대상자(`Ep.getExtSelectAttStu_List`)에게 SMS 예약을 건다 (`DairyBatch.java:107-146`). 문구에 "취소불가" 명시.

**★ 집계 컬럼 정의** (ep.xml:1291-1294)
- `APP_NUM`(신청자수) = `STATUS <> '4'`
- `DRAFT_NUM` = `STATUS NOT IN ('1','3','4','7')` → 사실상 선발 이후
- `CMP_NUM`(수료자수) = `STATUS = '5'`

**근거**: `WebContent/WEB-INF/jsp/admin/Ep/EpTb020PD.jsp:161-193, 431, 478, 657-753, 866`, `ep.xml:85-96, 338-344, 1187, 1291-1294, 1586-1588, 2577-2579`, `DairyBatch.java:107-146`
**확신도**: 상태값·페널티·수료판정은 **확실**. 회차별 개인 출석 저장 구조는 **미확인**.

---

### Q13. 목록 화면의 공통 패턴. 페이징 방식, 검색 파라미터 네이밍 규칙, 정렬 처리, 엑셀 다운로드 유무. 공통 부모 클래스나 유틸 구조.

**답**:

**(1) 공통 부모 클래스 구조**
```
MultiActionController (Spring)
  └ CareerActionController          ← 실질적 기반 클래스 (76개 컨트롤러가 상속)
       │  · setSessionMenu()  : 메뉴 4종 세션 캐시 + 메뉴로그 적재 + setSessionCheck() 호출
       │  · setSessionCheck() : 인가 판정 → paramMap["RETOK"]
       │  · insertMenuLog()   : SY_MENU_LOG
       │  · ssoCheck()        : 전체 주석 처리(죽은 코드)
       │  · setSession()      : 세션 생성(구버전, SessionController가 오버라이드)
       └ 각 도메인 컨트롤러 (CoController, EpMnController, ...)
  └ (별도) *ExcelController 14종     ← CareerActionController 를 상속하지 않음. 세션/인가 로직 없음
```
**모든 컨트롤러가 반복하는 보일러플레이트** (컨트롤러마다 복붙):
```java
@ModelAttribute("requestParam")
public DataMap requestParam(HttpServletRequest req, HttpServletResponse res) {
    showParameters(req);                     // 파라미터 전량 debug 로깅
    ssoCheck(commonFacade, req, res);        // 내부가 전부 주석 → no-op
    DataMap paramMap = new PUtil().getParameterDataMap(req);  // 요청파라미터 + 세션 병합
    setSessionMenu(commonFacade, req, paramMap);
    if("N".equals(paramMap.getString("RETOK"))) res.sendRedirect("/main.do");
    return paramMap;
}
```

**(2) 페이징 — Oracle `ROWNUM` 2중 서브쿼리 (전 화면 동일)**
```sql
SELECT TT.* FROM (
  SELECT CEIL(ROWNUM/#{VIEW_SIZE}) AS PAGE, TOTAL_CNT-ROWNUM+1 AS RNUM, TA.*
  FROM ( ...본쿼리..., COUNT(*) OVER() TOTAL_CNT ) TA
) TT WHERE PAGE = #{CURR_PAGE}
```
- 총건수는 **윈도우 함수 `COUNT(*) OVER()`** → 별도 count 쿼리 없음
- 자바: `dataMap.put("TOTAL_CNT", ((DataMap)resultList.get(0)).getString("TOTAL_CNT"))` 패턴을 **모든 목록 메서드가 복붙**
- 기본값: `@RequestParam(value="CURR_PAGE", defaultValue="1")`, `VIEW_SIZE`(일부 화면 `PAGE_SIZE`) `defaultValue="10"`
- `PUtil.getParameterDataMap` 이 `CURR_PAGE` 빈 값이면 `"1"` 로 보정 (`PUtil.java:947-949`)
- **한계**: 전체 결과셋을 만든 뒤 자르므로 대용량에서 느리다. `OFFSET FETCH` 미사용.
- 화면단 페이징 UI: `static_root/js/jqueryPaging.js` (`incTop.jsp:29`)

**(3) 검색 파라미터 네이밍 — `SCH_` 접두 규약**

| 파라미터 | 용도 |
|---|---|
| `SCH_TYPE` | 검색 기준 (`NM` 이름 / `NO` 학번 / `AL` 전체 / 컬럼명) |
| `SCH_WORD`, `SCH_TEXT` | 검색어 (도메인마다 다른 이름 사용 — **불일치**) |
| `SCH_ST_DATE` ~ `SCH_ED_DATE` | 기간 |
| `SCH_STATUS` | 상태 |
| `SCH_DAEHAK_CD` / `SCH_HAKBU_CD` / `SCH_SCHGR` | 소속·학년 |
| `SCH_GUBUN` | 구분 (`AL`/`NO`/`OK`) |
| `SCH_YEAR`, `SCH_YYYY`, `SCH_HAKGI` | 연도·학기 (**이름 3종 혼재**) |
| `SCH_ORD` / `SCH_ORD_WAY` | 정렬 컬럼 / 방향 |
| `SCH_COL` | 정렬·검색 대상 컬럼명 |
| `SCH_VIEW_SIZE`, `SEARCH_VIEW_SIZE` | 페이지 크기 |

비교 방식: 문자열은 `LIKE '%'||#{}||'%'`, 코드는 `=`, 기간은 `TO_CHAR(컬럼,'YYYY.MM.DD') BETWEEN #{}` (**함수 적용으로 인덱스 무력화**).

**(4) 정렬**
- 대부분 **안쪽 쿼리의 `ORDER BY` 고정**
- 일부 화면만 동적: `ORDER BY T1.${SCH_ORD} ${SCH_ORD_WAY}` (ep.xml:4893, 6825, 7260)
  → **`${}` 직접 치환 = SQL 인젝션.** `#{}` 로는 컬럼명을 바인딩할 수 없어 이렇게 한 것이지만, 화이트리스트 검증이 없다.

**(5) 엑셀 다운로드 — 있다. 3가지 방식이 혼용**

| 방식 | 구현 | 특징 |
|---|---|---|
| **A. 별도 `*ExcelController`** (14개, 엔드포인트 130) | `MultiActionController` 직상속 | **세션·인가 로직 없음** |
| **B. `*_XLS.jsp` 뷰** | 예 `admin/Co/CoCm010L_XLS`, `admin/St/StGraduate_XLS` | `ModelAndView` 로 JSP를 반환하고 `Content-Type` 헤더로 엑셀 흉내 |
| **C. `ExcelView` 빈 (POI)** | `career.framework.common.ExcelView`, `AbstractExcelPOIView` | 진짜 xls 생성 |
| **D. ZIP 일괄** | `ZipFileDownloadView`, `ZipFileDownloadView2` | 결과보고서 일괄 다운로드 등 |

**★ `ExcelDownload.java` 는 137KB 단일 클래스에 매핑 44개**가 몰려 있다. 유지보수 최악.

**(6) 재구축 팀을 위한 규약 제안**
1. 페이징: `page`/`size` 표준화, 서버는 `{content, totalElements, page, size}` 반환. Oracle 12c+ 면 `OFFSET FETCH`.
2. 검색: `SCH_` 접두를 버리고 `search.*` 객체로. `SCH_WORD`/`SCH_TEXT`, `SCH_YEAR`/`SCH_YYYY` 같은 이름 혼재를 정리.
3. 정렬: `sort=컬럼,asc` 표준 + **서버측 허용 컬럼 화이트리스트**.
4. 엑셀: 목록 API와 동일 쿼리·동일 권한 검사를 타는 단일 export 엔드포인트로 통합. 현행처럼 별도 컨트롤러로 빼면 권한이 새어 나간다.

**근거**: `CareerActionController.java` 전체, `PUtil.java:900-1032`, `career-servlet.xml:68-79`, 각 sqlmap 목록 statement, `ep.xml:4893`
**확신도**: **확실**

---

### Q14. 인증·인가가 실제로 어디서 걸리는가. 인터셉터/필터인가 각 컨트롤러인가. `SY_MENU_AUTH`를 런타임에 조회하는가, 세션에 캐시하는가. URL 직접 접근 시 막히는가.

**답**:

**(1) 걸리는 위치: 인터셉터·필터가 아니라 각 컨트롤러다.**
- `web.xml` 의 필터는 `CharacterEncodingFilter` **하나뿐**. 보안 필터 없음. (`web.xml:45-56`)
- `career-servlet.xml` 에 **`<mvc:interceptors>` 선언이 없다.** `XSSInterceptor`·`ParameterInterceptor` 클래스는 있으나 **등록되지 않았고, `XSSInterceptor` 는 내부 검사 코드마저 주석 처리**되어 있다 (`XSSInterceptor.java:40-43`).
- 실제 경로: 각 컨트롤러의 `@ModelAttribute("requestParam")` → `CareerActionController.setSessionMenu()` → `setSessionCheck()`.

**(2) `setSessionCheck()` 의 실제 동작 — ★ 가장 중요한 발견**
```java
String refReq = arg0.getHeader("REFERER");
if (refReq == null) {            // ← REFERER 가 없을 때만 검사한다
    if (CURRENT_MENU_CODE 없음) {
        Common.getCommUrlCheck 로 TB_CARR_EXCP_URL 화이트리스트 조회
        팝업(POP_OPEN_YN='Y') 이거나 예외URL 이면 통과, 아니면 RETOK='N'
    } else {
        Common.getMenucheck (SY_MENU × SY_MENU_AUTH) 조회 → 없으면 RETOK='N'
    }
}
return;                          // ← REFERER 가 있으면 아무 검사도 없이 통과
```
(`CareerActionController.java:183-231`)

→ **REFERER 헤더가 존재하면 인가 검사가 통째로 생략된다.** 브라우저의 정상적인 내부 이동은 항상 REFERER를 보내므로, **실사용 트래픽의 대부분은 인가 검사를 거치지 않는다.** 공격자도 `Referer:` 헤더 한 줄만 붙이면 된다.

**(3) 검사에 걸려도 차단이 약하다**
- 결과는 `paramMap["RETOK"]="N"` 플래그일 뿐. 차단은 컨트롤러가 `response.sendRedirect("/main.do")` 로 한다.
- 그런데 **`sendRedirect` 직후 `return paramMap;` 으로 정상 진행**하므로 **핸들러 메서드와 SQL은 전부 실행된다.** 응답이 커밋되어 화면엔 안 보일 뿐이다.
- **`RETOK` 검사 자체가 없는 컨트롤러가 29개**(약 295 매핑, 전체의 18%). 그중 **엑셀 컨트롤러 14종(130 엔드포인트)** 은 `CareerActionController` 를 상속조차 하지 않아 세션 로직이 아예 없다.

**(4) `SY_MENU_AUTH` 는 런타임 조회인가 세션 캐시인가 — 둘 다다**

| 용도 | 방식 | statement |
|---|---|---|
| **인가 판정** | **매 요청 런타임 조회** (REFERER 없을 때) | `Common.getMenucheck` (common.xml:916) — `SY_MENU × SY_MENU_AUTH WHERE AUTH_CODE IN (세션 권한 리스트)` |
| **메뉴 렌더링** | **세션 캐시** (`LoginSession` 안에 List로 보관, 없을 때만 1회 조회) | `Common.getMenuAdnTop`/`getMenuAdnLeft`/`getMenuUserTop`/`getMenuUserLeft` (`CareerActionController.java:64-101`) |

→ **권한을 바꿔도 로그아웃 전까지 메뉴가 갱신되지 않는다.** 반면 인가 판정은 즉시 반영된다(REFERER 없을 때에 한해).
→ ⚠️ **`Common.getMenuAdnTop` 만 `SY_MENU_AUTH` 조인이 없다** (common.xml:409-424). 관리자 최상위 메뉴는 권한과 무관하게 전원에게 조회된다.

**(5) URL 직접 접근 시 막히는가 — ★ 사실상 막지 못한다**

| 시나리오 | 결과 |
|---|---|
| 주소창에 `/Sa/Sy/SyAm010M.do` 직접 입력 (REFERER 없음, `CURRENT_MENU_CODE` 없음) | `TB_CARR_EXCP_URL` 화이트리스트에 없으면 `RETOK='N'` → `/main.do` 리다이렉트. **막힌다** |
| 같은 URL을 **`Referer` 헤더를 붙여서** 요청 | `setSessionCheck` 가 즉시 `return` → **통과. 화면이 그대로 렌더링된다** |
| `CURRENT_MENU_CODE` 파라미터를 아무 값이나 붙여서 요청 | `Common.getMenucheck` 가 그 코드로 조회 → 권한 있는 코드를 넣으면 통과 (URL과 코드의 일치 검증 없음) |
| **비로그인** 상태로 `/Sa/*` 접근 | 세션 권한은 `AUTH0000` → `getMenucheck` 결과 없음 → `RETOK='N'`. 단 **REFERER를 붙이면 이 검사도 건너뛴다** |
| `*ExcelController` 의 130개 엔드포인트 | **어떤 검사도 없다** |
| `SmsController` 의 SMS 발송 9개 | **어떤 검사도 없다** |

**(6) 인증(로그인) 자체의 문제**
- `/login.do` 는 **비밀번호 검증 코드가 주석 처리**되어 있다 (`SessionController.java:120-126`). `INTG_UID` 만 맞으면 로그인된다.
- `/sso.do` 는 **`REFERER` 헤더 문자열 검사만** 한다 (`SessionController.java:249-253`). 게다가 검사 도메인이 `power.hs.ac.kr` 로 창원대가 아니다.
- `/logOut.do` 는 `session.invalidate()` 가 주석 처리 (`SessionController.java:551`) → 세션 고정 대응 없음.
- 로그인 실패 잠금은 **지역청년(`/regLogin.do`) 경로에만** 있다(5회).
- 비밀번호는 **무염 MD5**(`FN_MD5`).

**결론**: 이 시스템의 인가는 **"메뉴에 안 보이면 안 들어올 것"이라는 전제**로 설계되어 있고, URL 레벨의 강제는 사실상 없다. **재구축 시 서버측 인터셉터/필터에서 "URL ↔ 필요권한" 매핑을 강제하는 구조로 전면 재설계가 필요하다.**

**근거**: `web.xml:45-56`, `career-servlet.xml` 전체, `CareerActionController.java:40-231`, `common.xml:409-424, 916-1004, 2759-2762`, `SessionController.java:120-126, 249-253, 551`, `XSSInterceptor.java:34-47`
**확신도**: **확실**

---

### Q15. 외부 인원(외부 위촉 상담사·기업 담당자·멘토)의 로그인 경로. `COM_CON_INF.CONPWD`·`TB_CARR_USER_LOGIN`을 쓰는 화면과 SSO 경로가 어디서 갈리는가.

**답**: **로그인 진입점 URL 자체가 갈린다.** 하나의 로그인 폼이 분기하는 것이 아니라, **`SessionController` 안에 목적별 엔드포인트가 따로 있고 화면에서 다른 URL로 POST한다.**

| 대상 | 진입 URL | 조회 statement | 인증 테이블·컬럼 | 비밀번호 |
|---|---|---|---|---|
| **학생·교직원(SSO)** | `/ssoData.do` (구: `/ssoDataV1.do`, `/autoLogin.do`, `/sso.do`) | `Common.getuser_Info_loginID` | `V_USR_INF` | **비밀번호 없음** — 포털 SSO 토큰 방식: `SHA256(USERID + <고정솔트A> + THISTIME)` == `PW` **AND** `THISTIME` 이 현재 ±10분 **AND** `SHA256(USERID + <고정솔트B> + THISTIME)` == `RESULT`. **솔트 2종은 소스에 평문 상수로 박혀 있다**(`SessionController.java:904-905, 915`) — 값은 본 문서에서 마스킹 |
| **학생·교직원(내부폼)** | `/login.do` | `Common.getuser_Info` | `V_USR_INF` | **검증 코드 주석 처리됨** ⚠️ |
| **교내 상담사** | `/consultLogin.do` (화면 `/WEB-INF/jsp/common/consultLogin.jsp`, 헤더 "외부상담사 로그인" 버튼) | `Common.getConsultUser_Info` | `COM_CON_INF A` ⨝ `V_USR_INF B` ON `A.CONID=B.INTG_UID` | `A.CONPWD = **FN_MD5_CRIPT**(#{INTG_PWD})` (common.xml:1577) — 검증한다. 단 해시함수가 다른 경로(`FN_MD5`)와 **다르다** |
| **외부 위촉 상담사** | `/outSiderLogin.do` + `LOGIN_TYPE=CO` | `Common.getConsultUser_Info2` | **`COM_CON_INF.CONID` / `COM_CON_INF.CONPWD`** | `CONPWD = FN_MD5(#{INTG_PWD})` + `STATUS='0001'` (common.xml:465-479) |
| **멘토** | `/outSiderLogin.do` + `LOGIN_TYPE=MT` **또는** `/compLogin.do` | `Common.getMentoUser_Info` / `Common.getComp_Info`(UNION) | **`TB_MENTOR_INFO.MENTO_ID` / `.MENTO_PWD`** | `MENTO_PWD = FN_MD5(...)` + `DEL_YN='N'` + `STATUS='0002'` + `SECESSION_YN='N'` + `ACTIVE_YN='Y'` (common.xml:427-446) |
| **일반회원** | `/outSiderLogin.do` + `LOGIN_TYPE=NU` | `Common.getNormalUserStatus_Info` → `Common.getNormalUser_Info` | `TB_NORMAL_USER_INFO.USER_ID` / `.USER_PWD` | `USER_PWD = FN_MD5(...)` + `STATUS='0002'`. ⚠️ **쿼리 끝이 `LIMIT 1` — MySQL 문법이라 Oracle에서 ORA 오류. 이 경로는 항상 실패한다**(common.xml:461) |
| **기업 담당자** | `/compLogin.do` | `Common.getComp_Info` | **`COM_CPRT_MEBR.COMP_ID` 또는 `.BSOP_NMBR`(사업자번호) / `.CPRTMEBR_PSWD`** | `CPRTMEBR_PSWD = FN_MD5(...)`. ⚠️ **`STATUS='002'` 조건이 주석 처리되어 미승인 기업도 통과**(common.xml:516-518) |
| **지역청년** | `/regLogin.do`, `/regLoginNaver.do` | `Common.getRegUser_Info` / `getRegUser_NaverInfo` | **`TB_CARR_USER` / `TB_CARR_USER_LOGIN`** | `LOGIN_PWD_YN` 플래그 + **실패 5회 잠금**(`PWD_FAIL_TMS_YN`). 네이버 소셜은 `SCAF_CNNCT_CD` |
| **개발자** | `/devLoginAction.do` | — | — | 화면만 반환. **운영 배포본에 잔존** ⚠️ |

**세션이 갈리는 지점 — 여기가 핵심이다**

| 세션 종류 | 세션 키 | 클래스 | 해당 로그인 경로 |
|---|---|---|---|
| **메인 사이트** | `CAREER_SESSION_KEY` | `LoginSession` | 위 표의 지역청년 제외 전부 |
| **지역청년 서브사이트** | (별도 키) | **`RegLoginSession`** | `/regLogin.do`, `/regLoginNaver.do` |

→ **지역청년만 완전히 독립된 세션 체계**를 쓴다. 화면도 `/regMain.do`, `/user/In/*`, `/user/It/*`, `/user/Bd/BdCm040L.do`, `EpReg*`, `CpReg010L`, `SyBm020*`, `SyPo010*` 로 분리되어 있다. 사실상 **한 WAR 안의 두 개 사이트**다.

**나머지 외부 인원은 모두 같은 `LoginSession` 에 담긴다.** 구분은 `SESSION_USER_TY_CD` (`T` 상담사 / `C` 기업 / `MT` 멘토) 와 자동 부여 권한(`AUTH0005`/`AUTH0008`/`AUTH0010`) 으로만 이루어진다.

**`TB_CARR_USER_LOGIN` 사용처**: R11·C1·U4. 지역청년 로그인 이력·실패횟수 관리 전용. 메인 사이트 로그인과 무관.

**보안 관점 요약** (상세는 `06_findings.md`)
- 외부 인원 비밀번호는 전부 **무염 MD5** — 레인보우 테이블에 취약. 게다가 **함수가 두 개로 갈린다**: 외부상담사/멘토/일반회원/기업은 `FN_MD5()`, 교내상담사(`/consultLogin.do`)만 `FN_MD5_CRIPT()` (common.xml:444,460,476,517 vs 1577). 두 함수가 같은 결과를 내는지는 **미확인**
- 실패 잠금은 **지역청년 경로에만** 존재. 나머지는 무제한 시도 가능
- `/login.do` 는 비밀번호 검증 자체가 없다 (주석 처리)
- `/compLogin.do` 는 승인 상태 검사(`STATUS='002'`)가 주석 처리
- `/outSiderLogin.do` 의 일반회원(`NU`) 경로는 SQL에 MySQL 문법 `LIMIT 1` 이 있어 Oracle에서 **동작 불가**

**근거**: `SessionController.java:98-103, 114-232, 243-350, 417-494, 570-657, 1044-1133, 1144-1294, 1497-1626`, `common.xml:274-330, 427-479, 482-518, 1548-1580, 1583-1640`, `RegLoginSession.java`, `WebContent/WEB-INF/jsp/common/inc/incHeader.jsp:332`
**확신도**: **확실**
