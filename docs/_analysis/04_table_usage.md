# 04. 테이블 사용처

**범위: sqlmap 34파일 · statement 2,033건 전수 스캔.** 참조 테이블 335개 중 **상위 60개 + 학사 유래 테이블 전부 + 권한/공통 테이블 전부**를 수록.

## 읽는 법 (중요)

- `R/C/U/D` = 해당 테이블이 등장하는 **statement 개수**를 statement 종류(select/insert/update/delete)별로 센 값. 0이면 `-`.
- ⚠️ **주의**: `DELETE FROM A WHERE x IN (SELECT ... FROM B)` 에서 B도 `D` 로 계상된다. 즉 `D>0` 이 곧 "이 테이블이 지워진다"는 뜻은 아니다. `주 사용 statement` 열의 이름으로 실제 역할을 판단할 것.
- `주 사용 statement` = `매퍼네임스페이스.statementId` 최대 3개. 화면 매핑은 `01_sitemap.md`·`02_screen_dataflow.md` 와 대조.
- 쓰기(C/U/D)가 0인 테이블은 비고에 **`읽기전용`**.
- 테이블명 추출은 `FROM|JOIN|INTO|UPDATE` 다음 토큰 정규식이라, 하위 항목에는 별칭 오인 가능성이 있다(**추정**).

---

## 1. 학사 유래 테이블 (DB링크 `V_BRDB` 계열) — 전부 수록

| 테이블 | R | C | U | D | 성격 | 비고 |
|---|---|---|---|---|---|---|
| `V_USR_INF` | 373 | 14 | 5 | 2 | **통합 사용자 (학생+교직원+조교)** | **전 시스템에서 가장 많이 읽는 테이블.** 쓰기는 전부 `DairyBatch` 동기화(`Common.merge_V_USR_INF`)와 중복사용자 정리용. 화면에서는 읽기만. |
| `V_DEP_INF` | 193 | - | 1 | - | 조직(학과) 트리, 자기참조 `DEPT_UP_CD` | 쓰기 1건은 `Common.merge_V_DEP_INF`(배치). 실질 **읽기전용**. **대학원 미포함(추정)** |
| `V_DEP_INF_ALL` | 34 | - | 1 | - | 조직 트리 **대학원 포함** | 쓰기 1건은 배치 MERGE. 실질 **읽기전용**. `V_DEP_INF` 와 혼용되어 화면별 결과가 달라짐 → `05_answers.md` Q3 |
| `V_ADD_JOB_PART` | 14 | 1 | - | 1 | 겸임 교수 정보 | 배치가 DELETE 후 INSERT (`DairyBatch.java:90-95`) |
| `V_USR_INF@V_BRDB` | - | 1 | 3 | 1 | **학사DB 원본 (DB링크)** | 전부 배치 MERGE/조회용. **애플리케이션 화면에서 직접 접근 없음** |
| `MCODE.C_PART@V_BRDB` / `MCODE.C_ORG@V_BRDB` / `C_DEPT@V_BRDB` / `ADD_JOB_PART@V_BRDB` | - | - | 2~ | - | 학사DB 부서·조직 코드 | 배치 `Common.merge_V_USR_INF`(common.xml:1822-1823) 내부 스칼라 서브쿼리 |
| `V_USR_INF_DUP_INF` | 1 | - | 1 | - | 중복 사용자 매핑 | 배치 전용 |
| `V_SUGANG` | 3 | - | - | - | 수강 | **읽기전용** · 지시서 §2 기준 0행 |
| `V_LECT_INF` | 6 | - | - | - | 강의 | **읽기전용** · 지시서 §2 기준 0행 |
| `V_PC_SUGANG` | 8 | - | - | - | 지도교수 수강 | **읽기전용** |
| `V_USR_SCORE` | 4 | - | - | - | 성적 | **읽기전용** |
| `V_CA_SURVEY_TJS` / `V_CA_SURVEY_EMP_TJS` | 9 / 3 | - | - | - | 역량진단 집계 뷰 | **읽기전용** |
| `V_PA_GOAL_DATA_CAP` / `V_EP_PRM_ADD_INFO` / `V_JOB_BBS_INFO` / `V_DECOCODE` | 1~2 | - | - | - | 파생 뷰 | **읽기전용** |

**요약**: 지시서 §2가 말한 "학사 유래 4개 테이블(`V_USR_INF`·`V_DEP_INF`·`V_DEP_INF_ALL`·`V_ADD_JOB_PART`)"이 소스에서도 그대로 확인된다. `V_SUGANG`·`V_LECT_INF` 는 SQL은 있으나 실제로 화면 데이터를 만들지 못한다(0행).
**동기화 경로**: `career.batch.DairyBatch` (매일 01:00) → `Common.merge_V_USR_INF` / `merge_V_DEP_INF` / `merge_V_DEP_INF_ALL` / `delete+insert_V_ADD_JOB_PART`.
⚠️ **이 배치는 `web.xml:20` 에서 `batchJob.xml` 이 주석 처리되어 현재 기동되지 않는다.** 운영에서 별도 스케줄러로 도는지 **미확인**.

---

## 2. 권한 · 공통 인프라 테이블 — 전부 수록

| 테이블 | R | C | U | D | 주 사용 statement | 비고 |
|---|---|---|---|---|---|---|
| `SY_MENU` | 20 | 1 | 2 | 1 | `Common.getMenuAdnTop`·`getMenuUserLeft`·`Sy.getMenu_List` | 메뉴 마스터(343행). `USER_DVID`='ADMIN'/'USER', 최대 3레벨, `CONNECT BY` 트리 |
| `SY_MENU_AUTH` | 12 | 1 | - | 2 | `Common.getMenucheck`·`Sy.getAuthMenu_List`·`setAuthMenu_Delete` | **역할↔메뉴 매핑(972행). 인가의 실체.** 저장은 전삭제 후 재등록 |
| `SY_AUTH` | 4 | 1 | 1 | 1 | `Sy.getAuthGroup_List` | 역할 13행 |
| `SY_AUTH_USER` | 11 | 1 | - | - | `Common.getuser_Info`(AUTH_CODE 결합)·`getAuthExist` | 사람↔역할 52행. **DELETE statement가 없다** → 권한 회수 화면이 없거나 다른 방식(**미확인**) |
| `SY_AUTH_LOG` | - | 1 | - | - | `Sy.insertAuthLog` | **권한 변경 이력. 시스템에서 유일한 감사 이력 테이블** |
| `SY_CODE` | 108 | 3 | - | - | `Common.getComCd_List`·`getComCdOrdr_List`·`Sy.getCodeSecond_List` | **공통코드.** `UP_GRP_CODE`/`UP_CODE` 2단 계층. Oracle 함수 `FN_CODE()` 로도 대량 호출 |
| `SY_FILE` | 31 | 1 | - | 5 | `Common.setFileData_Insert`·`getboardFile_List`·`setFileData_Detele` | **공통 첨부.** `TAB_NM`+`TAB_SEQ` 다형 참조. 삭제는 `DEL_YN='Y'` 논리삭제 |
| `SY_BD_DATA` | 22 | 3 | 8 | - | 게시판 데이터 | **DELETE statement 없음** → 게시글은 물리삭제 불가(논리삭제 컬럼 사용 추정) |
| `SY_LOGIN_LOG` | 다수 | 1 | - | - | `Sy.insertLoginLog` | 로그인 로그 |
| `SY_MENU_LOG` | 다수 | 1 | - | - | `Sy.insertMenuLog` | 메뉴 접속 로그. `CURRENT_MENU_CODE` 있을 때만 적재 |
| `SY_IP_INFO` | 1 | - | - | - | `Common.getIpChkData` | 관리자 IP 제한 설정. **읽기전용** — 등록 화면이 소스에 없다 |
| `SY_DUPL_EMP` | - | 1 | - | 1 | `Common.insert_Dupl_Usr`·`delete_Dupl_Usr` | 배치 임시 테이블 |
| `TB_CARR_EXCP_URL` | 1 | - | - | - | `Common.getCommUrlCheck` | **인가 예외 URL 화이트리스트.** 읽기전용 — 관리 화면 없음 |

---

## 3. 상위 60개 테이블 (사용 횟수 순)

| # | 테이블 | R | C | U | D | 의미 | 주 사용 statement (최대 3) | 비고 |
|---|---|---|---|---|---|---|---|---|
| 1 | `V_USR_INF` | 373 | 14 | 5 | 2 | 통합 사용자(학사) | `acSt.adDeptStatList<br>bd.getBbs_Detail<br>bd.setBoardData_Insert` |  |
| 2 | `V_DEP_INF` | 193 | - | 1 | - | 조직 트리(학사) | `acSt.adDeptStatList<br>ca.getGoalState_List<br>ca.getCapSurveyRst_List` |  |
| 3 | `EP_PRM` | 101 | 5 | 8 | - | 비교과 프로그램 마스터 | `ca.getGoalCour_List<br>ca.getExtList<br>ca.getExtScore` |  |
| 4 | `SY_CODE` | 108 | 3 | - | - | 공통코드 | `capa.gjobEtrList<br>capa.gjobEtrDetail<br>capa.gjobEtrBaseCapa` |  |
| 5 | `EP_PRM_APP` | 78 | 5 | 10 | 7 | 비교과 신청/선발/수료 | `ca.getExtScore<br>ca.getEduPlanList<br>co.getCounselStatisticsPrmApp` |  |
| 6 | `ST_CAR_STAT_REPORT` | 61 | 3 | 2 | 1 | 취업통계 보고 | `cp.getCompany_List<br>cp.StRe_Select_Comp<br>cp.CpCl020DGetJob_List` |  |
| 7 | `COUNSEL_MASTER` | 51 | 3 | 6 | 4 | 상담 마스터 | `co.setTodoPeriod_Delete<br>co.getCoCu_List<br>co.getCoCu_ExcelList` |  |
| 8 | `RE_REC_INFO` | 44 | 6 | 8 | 3 | 채용공고 | `re.getBoardMng_List<br>re.setBoard_Insert<br>re.getReRd_Detail` |  |
| 9 | `COM_CON_INF` | 54 | 2 | 2 | 1 | 상담사 마스터 | `co.getCnCt_List<br>co.consList<br>co.setOutConInfo_Insert` |  |
| 10 | `EP_CUR_GUBUN` | 42 | 3 | 4 | 1 | 비교과 구분코드 | `ca.getExtList<br>co.getCounselStatisticsPrm<br>common.getExtComUpCd_List` |  |
| 11 | `EX_ITEM_APP` | 34 | 2 | 8 | 5 | 마일리지 신청 | `ca.getProfMyStuChart1<br>ca.getMystuAbility_List<br>ca.getMystuAbility_DetailList` |  |
| 12 | `CO_ADV_APP` | 35 | 4 | 3 | 2 | 상담 신청(구) | `co.historyData_Insert<br>co.cnExcelUploadInsert<br>co.getCoCu_Detail` |  |
| 13 | `EP_PRM_GROUP` | 31 | 1 | 7 | 3 | 비교과 그룹 | `ca.getPrmList<br>common.getPrmNum_GroupYN<br>ep.getExtState_List` |  |
| 14 | `EP_PRM_MAPPING` | 32 | 1 | 3 | 6 | 비교과 그룹↔신청 매핑 | `ca.getEduPlanList<br>ca.getIrRateAll_2<br>ca.getIrRateAll_4` |  |
| 15 | `COM_COMP_INF` | 33 | 3 | 3 | 1 | 기업정보 | `common.companyList<br>common.insertCompAjax<br>cp.getCompany_List` |  |
| 16 | `TB_MENTOR_INFO` | 30 | 1 | 7 | - | 멘토 | `common.getMentoUser_Info<br>common.getComp_Info<br>common.getMentoHpList` |  |
| 17 | `SY_FILE` | 31 | 1 | - | 5 | 공통 첨부 | `bd.getBbs_Detail<br>bd.getBbs_Detail3<br>bd.getbdData_list` |  |
| 18 | `CON_PROF_INFO` | 29 | 2 | 4 | 2 | 교수 상담 | `co.getUserProfColsultAllList<br>co.conProfInfo_Insert<br>co.getOnlineMyProfConList` |  |
| 19 | `V_DEP_INF_ALL` | 34 | - | 1 | - | 조직 트리(대학원 포함) | `co.getCoCu_List<br>co.getCoCu_ExcelList<br>co.getCoMc_List` |  |
| 20 | `SY_BD_DATA` | 22 | 3 | 8 | - | 게시판 데이터 | `bd.getBbs_Detail<br>bd.getBbs_Detail3<br>bd.getbdData_list` |  |
| 21 | `EX_ITEM` | 30 | 1 | 1 | 1 | 마일리지 항목 | `dt.getDt060DataExcel<br>ex.getPtfList<br>ex.getJobPrmMngTotRoad_List2` |  |
| 22 | `COM_CPRT_MEBR` | 26 | 1 | 5 | - | 기업 담당자(로그인) | `common.getuser_Info<br>common.getComp_Info<br>common.companyList2` |  |
| 23 | `RE_REC_MULTI` | 23 | 2 | - | 2 | 채용 다중값 | `re.getBoardMng_List<br>re.setRec_MultiCode<br>re.setRec_MultiAppArea` |  |
| 24 | `CO_ADVISER` | 20 | 1 | 3 | 2 | 전담교수 배정 | `ca.getProfMyStuChart1<br>ca.getMystuAbility_List<br>ca.getMystuAbility_DetailList` |  |
| 25 | `TB_MENTEE_INFO` | 19 | 1 | 4 | 1 | 멘티 | `common.getMenteeHpList<br>mt.getMento_List<br>mt.getMento_ListUser` |  |
| 26 | `SY_MENU` | 20 | 1 | 2 | 1 | 메뉴 | `acSt.getMenuList<br>bd.boardAuthMenu<br>bd.boardAuthMenuAdmin` |  |
| 27 | `JOBSMASTER` | 19 | 2 | 2 | 1 | 채용(구) | `portfolio.getJobResAdmin_List<br>portfolio.getCellMergeCnt<br>portfolio.excelDownJobResList` |  |
| 28 | `EP_PRM_RESULT` | 19 | 1 | - | 2 | 비교과 결과 | `ca.getGoalCour_List<br>ca.getIrCfmPrint_List<br>ca.getProfMyStuChart1` |  |
| 29 | `EP_ACT_FUND_PLAN` | 13 | 1 | 6 | 1 | 비교과 예산계획 | `ep.select_jobprm060_list<br>ep.getExtGroupBind_List<br>epAct.get_userActiveAuth` |  |
| 30 | `PC_CON_PROF_ADV` | 17 | 1 | 2 | - | 지도교수 상담 회차 | `co.getStu_Statistics<br>co.getStu_StatisticsExcel<br>co.getEmpConList` |  |
| 31 | `RE_REC_REC_APP` | 11 | 3 | 5 | 1 | 추천채용 신청 | `common.setComBlk_Insert<br>re.getBoardMng_List<br>re.recAppList` |  |
| 32 | `CA_SURVEY` | 15 | 1 | 4 | - | 역량진단 회차 | `ca.getCapSurvey_List<br>ca.getCapSurveyUser_List<br>ca.getCapSurveyprofessor_List` |  |
| 33 | `FU_ASS_DEPT` | 18 | 1 | - | 1 | 조교↔학과 배정 (정본) | `ca.getGoalState_List<br>co.assDeptList<br>co.getAssiList` |  |
| 34 | `EP_SURVEY_TAR` | 12 | 2 | 3 | 2 | 비교과 설문 대상 | `ep.setComSurveyTar_Update<br>ep.getComSurveyTar_List<br>ep.getComSurveyTar_ProfList` |  |
| 35 | `TB_CARR_PGM_POSS` | 8 | 3 | 8 | - | 프로그램 참여후기 | `Poss.pgmPoss_List<br>Poss.pgmPoss_Detail<br>Poss.pgmPoss_DetailPreNext` |  |
| 36 | `CA_SURVEY_TAR` | 15 | 2 | 1 | 1 | 역량진단 대상자 | `ca.getCapSurvey_List<br>ca.getCapSurveyUser_List<br>ca.getCapSurveyprofessor_List` |  |
| 37 | `EX_ITEM_SCORE` | 15 | 1 | 1 | 1 | 마일리지 점수 | `ex.getJobPrmMngRoad_List2<br>ex.getJobPrmMngRoad2<br>ex.getJobPrmMngRoadDatil_List2` |  |
| 38 | `EP_SURVEY` | 15 | 1 | 2 | - | 비교과 설문 | `ep.getComSurveyTar_List<br>ep.getComSurveyTar_ProfList<br>ep.getSurvey_List` |  |
| 39 | `SS_JOB_RES` | 16 | 1 | 1 | - | 진로취업카드 이력서 | `co.getCoCu_Excel<br>co.searchStudentList<br>cp.CpCl020DGetJob_SpecList` |  |
| 40 | `CO_CON_SCH` | 9 | 4 | 2 | 2 | 상담사 일정(구) | `co.getPersonTodo_List<br>co.setTodo_check<br>co.setTodo_Insert` |  |
| 41 | `TB_CARR_USER` | 15 | 1 | 1 | - | 지역청년 사용자 | `bd.getBbs_Detail3<br>common.getRegUser_Info<br>common.getRegUser_NaverInfo` |  |
| 42 | `EP_ACT_FUND_CHANGE` | 10 | 1 | 5 | 1 | 비교과 예산변경 | `ep.select_jobprm060_list<br>ep.getExtGroupBind_List<br>epAct.get_lastFundPlan` |  |
| 43 | `EP_PRM_STEP` | 13 | 2 | 1 | 1 | 비교과 차수/단계 | `ep.getExtStateUser_List<br>ep.getExtMng_List<br>ep.excelDownLoadForPgProgram` |  |
| 44 | `APPLICATIONMASTER` | 14 | 1 | 2 | - | 지원서(구) | `portfolio.getJobResAdmin_List<br>portfolio.getCellMergeCnt<br>portfolio.excelDownJobResList` |  |
| 45 | `STU_WARNING_INFO` | 14 | 1 | 1 | 1 | 장기결석/학사경고 | `co.getCoCu_List<br>co.getCoCu_ExcelList<br>co.getCoMc_List` |  |
| 46 | `TB_CARR_USER_LOGIN` | 11 | 1 | 4 | - | 지역청년 로그인 | `common.getRegUser_Info<br>common.getRegUser_NaverInfo<br>common.setRegUser_PwdCheck` |  |
| 47 | `EP_EXTTYPE_SCORE` | 11 | 2 | 1 | 2 | 비교과 유형별 점수 | `ep.getExt_NewList<br>ep.getExt_detail<br>ep.getExt_score` |  |
| 48 | `V_ADD_JOB_PART` | 14 | 1 | - | 1 | 겸임교수(학사) | `ca.getProfMyStuChart1<br>ca.getMystuAbility_List<br>ca.getMystuAbility_DetailList` |  |
| 49 | `TB_CARR_GEN_PGM_POSS` | 6 | 2 | 8 | - | 일반 프로그램 후기 | `Poss.pgmRegPoss_List<br>Poss.pgmRegPoss_Detail<br>Poss.pgmRegPoss_DetailPreNext` |  |
| 50 | `PLC_SURVEY` | 12 | 1 | 2 | - | 설문 | `Survey.surveyList<br>Survey.surveyCnt<br>Survey.insertSurvey` |  |
| 51 | `SY_MENU_AUTH` | 12 | 1 | - | 2 | 역할↔메뉴 권한 | `common.getMenuAdnLeft<br>common.getMenuUserTop<br>common.getMenuUserLeft` |  |
| 52 | `STU_COURSE_INFO` | 12 | - | 3 | - | 진로설계서 (STEP1~4) | `ca.getAssisStuJobCourList<br>co.getProfMyContList<br>co.getProfPartMyContList` |  |
| 53 | `PLC_SURVEY_RST` | 13 | 1 | - | - | 설문 결과 | `Survey.insertSurveyRst<br>Survey.surveyRstViewForDetail<br>Survey.surveyRstView` |  |
| 54 | `TB_CARR_GJOB_PGM_TN` | 10 | 1 | 3 | - | 지역청년 프로그램 차수 | `ep.getRegProgm_List<br>ep.getRegProgmTn_Detail<br>ep.getRegProgmAplc_Detail` |  |
| 55 | `ST_CAR_STAT_DEGREE` | 9 | 2 | 2 | 1 | 취업통계 학위 | `st.StDg_Year_List<br>st.StDg_Max_Degree_Select<br>st.StDg_Insert` |  |
| 56 | `TB_CARR_PROF_ASSI_DEPT` | 12 | 1 | - | 1 | 교수↔학과 배정 | `ca.getProfMyStuChart1<br>ca.getMystuAbility_List<br>ca.getMystuAbility_DetailList` |  |
| 57 | `EP_SURVEY_RST` | 8 | 3 | - | 2 | 비교과 설문결과 | `ep.setComSurveyRst_Insert<br>ep.getExtMng_List<br>ep.excelDownLoadForPgProgram` |  |
| 58 | `COUNSEL_GROUP_MASTER` | 10 | 1 | 1 | 1 | 집단상담 | `co.getLastTrialData<br>co.getConuselGroup_List<br>co.counselGroupMstr_Update` |  |
| 59 | `BOARD` | 7 | 2 | 3 | 1 | 게시판(구) | `ip.getSaBoard_List<br>ip.getBoardDetailData<br>ip.insertBoardData` |  |
| 60 | `PC_CON_PROF_USR` | 11 | 1 | 1 | - | 지도교수 상담 대상학생 | `co.getStu_Statistics<br>co.getStu_StatisticsExcel<br>co.getEmADVList` |  |

## 4. 지시서 §2 지목 도메인 테이블 중 상위 60에 없는 것

| 테이블 | R | C | U | D | 의미 | 주 사용 statement | 비고 |
|---|---|---|---|---|---|---|---|
| `COUNSEL_PROBLEM` | 2 | 1 | - | 1 | 상담 문제유형 | `co.insertCounselProblemData<br>co.setConProblemList<br>co.getConsultDetailInfo` |  |
| `COUNSEL_FAM` | 1 | 1 | - | 1 | 상담 가족사항 | `co.deleteCounselFamData<br>co.insertCounselFamData<br>co.getConsoultFam_List` |  |
| `COM_CON_TAR` | 3 | 1 | - | 2 | 상담사↔담당 단과대 | `co.setDaehakInfo_Insert<br>co.getCnCt_Detail<br>co.getConUnivName` |  |
| `BASICSETTING` | 8 | 1 | 1 | 1 | 상담 가능시간 슬롯 | `co.getConsultingCnt<br>co.getConsultSch_List<br>co.getConsultMySch_List` |  |
| `TB_CARR_CNSL_EXCL_HR` | 2 | 1 | - | 1 | 상담 제한 시간 | `co.getCounselExclHr<br>co.getCounselExclHrChk<br>co.CounselExclHr_Insert` |  |
| `COM_ASS_DEPT` | - | 1 | - | 1 | 조교↔학과 배정 (고아) | `co.insertAssDept<br>co.deleteAssDept` |  |
| `TB_CARR_CAPA_STTS` | 9 | - | - | - | 개인별 역량현황 집계 | `capa.gjobEtrBaseCapa<br>capa.gjobEtrDetailCapa<br>capa.gjobEtrDetailCapaBAK` | **읽기전용** |
| `CA_GOAL` | 4 | 1 | 1 | - | 학과 역량목표 | `ca.getGoalSettingState_Detail<br>ca.getGoalSetting_List<br>ca.getGoalSetting_Detail` |  |
| `CA_GOAL_DATA` | 9 | 1 | - | - | 학생 역량점수(교과+비교과) | `ca.getGoalState_List<br>ca.getGoalNowState_Detail<br>ca.getGoalTotalState_Detail` |  |
| `CA_SURVEY_QUS` | 7 | 1 | - | 1 | 역량진단 문항 | `ca.getCapSurveyUser_List<br>ca.getCapSurveyprofessor_List<br>ca.setCapSurveyQus_Delete` |  |
| `FU_JOB_MSTR` | 4 | - | - | - | 직무 마스터 | `fu.searchJobKind<br>fu.searchPurposeData<br>fu.getCourseStuListCnt` | **읽기전용** |
| `ALBAMASTER` | 5 | 1 | 2 | 1 | 아르바이트 | `re.arbeitInsert<br>re.arbeitUpdatae<br>re.getAlbaMaster_Detail` |  |
| `EP_PRM_SCORE` | - | - | - | - | — | — | **소스에서 참조 없음** |
| `EP_PRM_TRGT_OUTSIDER` | 7 | 1 | 1 | 1 | 비교과 외부참여자 | `ep.getComSurveyTar_ProfList<br>ep.getExtStateProf_List<br>ep.setComSurveyTar_Insert` |  |

