# 01. 사이트맵 (전수)

## 요약

| 구분 | 수 | 비고 |
|---|---|---|
| `@RequestMapping` 매핑 **전수** | **1,600** | 고유 URL 1,596 |
| ─ **JSP를 렌더링하는 화면** | **847** (고유 844) | 아래 전수 표의 대상 |
| ─ Ajax 응답(`jsonView`) | 480 | 화면 아님. 목록/검증/저장 API |
| ─ 처리 후 `redirect` | 133 | 화면 아님. 등록·수정·삭제 액션 |
| ─ 엑셀/파일 다운로드 등 View 판별 실패 | 140 | 대부분 `*ExcelController` |

### 역할별 화면 수 (URL 네임스페이스 기준 — 실제 노출은 `SY_MENU_AUTH` DB 판정)

| 역할 | 화면 수 | 판정 근거 |
|---|---|---|
| **관리자** (`/Sa/*`, `/admin/*`) | **315** | 컨트롤러가 `career.admin.control`, 뷰가 `admin/**` |
| **상담사** (`/user/Co/CoMc*`, `/user/Fu/CoSimri*`) | 33 | 뷰 `user/Co/Mc/**`, 주석 "상담사" |
| **교수** (`/user/Pc/PcM[ap]*`, `/user/Ca/CaMp*`, `/user/Fu/FuAp05*`, `/user/Co/CoMp*`, `/user/Co/onlineConProf*`) | 34 | 뷰 `user/Pc/Mp/**`, `user/Pc/Ma/**` |
| **조교** (`/user/Co/CoAs*`, `/user/Pc/PcChart020Excel`) | 7 | 뷰 `user/Co/Mas/**`, 주석 "조교 마이페이지" |
| **학생** (`/user/**/Ms*`, `/user/My/*`, `/user/portfolio/*`, `/user/Ep/Ms*`, `/user/Re/ReMs*`, `/user/Ss/*` 등) | 약 200 | 뷰 `user/**/Ms/**` |
| **비교과 운영자/담당자** (`/user/Ep/Mn*`, `/user/Ex/ExMn*`) | 약 60 | 뷰 `user/Ep/Mn/**` |
| **기업** (`/user/Cp/*`, `/user/mypage_company/*`, `/user/infaco/*`) | 13 | `SESSION_USER_TY_CD='C'` 분기 다수 (`re.xml:2458-2461` 등) |
| **멘토** (`/user/Mt/MtMm*`) | 6 | 뷰 `user/Mt/Mm/**` |
| **직원(교무·학사)** (`/User/Wa/*`, `/user/Co/CoEm*`, `/User/St/*`) | 24 | 주석 "교무과, 학사관리과 담당자" (`WaUserController`) |
| **지역청년(별도 서브사이트)** (`/reg*`, `/user/In/*`, `/user/It/*`, `*Reg*`) | 약 45 | `RegLoginSession` 별도 세션 |
| **역할 무관/공용** (공지·채용정보·소개·팝업) | 나머지 | |

### 메뉴에 노출되지 않는 화면(직접 URL)
**전 화면 `미확인`.** 노출 여부는 `SY_MENU.USE_YN`/`DLTE_YN` (DB 데이터)로만 결정되고 소스에 없다.
다만 **팝업 계열(`pop_*`)** 약 260개는 구조상 메뉴에 없고 부모 화면에서 `window.open` 으로만 열린다 → 사실상 `N`.

---

## 인가(권한) 판정이 실제로 어떻게 걸리는가 — 사이트맵을 읽기 전에 알아야 할 것

1. **필터·인터셉터 없음.** 인가는 컨트롤러 `@ModelAttribute("requestParam")` 안에서 `setSessionMenu()` → `setSessionCheck()` 로 수행된다. (`CareerActionController.java:40,137,183`)
2. `setSessionCheck()` 는 **`REFERER` 헤더가 `null`일 때만** 검사한다. (`CareerActionController.java:191-193`)
   → 브라우저가 REFERER를 보내는 정상 내부 이동에서는 **아무 권한 검사도 하지 않는다.** 공격자가 REFERER를 임의로 붙여도 마찬가지.
3. 검사에 걸려도 결과는 `RETOK='N'` 이라는 **플래그**일 뿐, 실제 차단은 각 컨트롤러가 `if("N".equals(...RETOK)) response.sendRedirect("/main.do")` 로 한다.
4. **RETOK 검사가 아예 없는 컨트롤러가 29개**, 그중 **엑셀 다운로드 컨트롤러 14개(엔드포인트 130개)** 는 `MultiActionController` 를 직접 상속해 세션·메뉴 로직 자체가 없다.
   → `03_access_scope.md` §확인사항 및 `06_findings.md` 참조.

따라서 아래 사이트맵의 `역할` 컬럼은 **"기획상 이 역할용 화면"** 이라는 뜻이지, **"이 역할만 접근 가능"** 이라는 뜻이 아니다.

---

## 역할별 메뉴 트리 (URL 네임스페이스 + 컨트롤러 주석 기준 재구성 · **추정**)

### 관리자 (`/Sa/*`)

- **시스템관리** (`/Sa/Sy`)
  - 메뉴관리 (`SyMn010M.do`) · 권한그룹관리 (`SyAm010M.do`) · 메뉴권한그룹 (`SyAm020M.do`)
  - 게시판관리 (`SyBd010L/M/D.do`) · 배너관리 (`SyBm010M.do`) · 코드관리 (`SyCm010M.do`)
  - SMS발송이력 (`SySms010L.do`)
  - 사용자 접속이력 (`SyUs010L/020L/030L.do`) · 접속통계 (`SyUs040L.do`) · 접근경로 (`SyUs050L.do`)
  - 접근권한이력 (`SyAh010L.do`) · 예외URL(추정) (`SyAe010L.do`)
  - [지역청년] 배너관리 (`SyBm020M.do`) · 팝업관리 (`SyPo010L/M.do`)
- **상담관리** (`/Sa/Co`)
  - 상담사 관리 (`CoCt010L/M/D/U.do`, 팝업 `Cn0001pop_selectCons/insertCons`)
  - 상담 현황 (`CoCm010L.do`, 상세팝업 `CoCm010P.do`, 인쇄 `CoCm010Print.do`)
  - 상담 현황2/3/4/5 (`CoCm030L/040L/050L/060L.do`) · 상담결과관리 (`CoCm020Result.do`)
  - 일정관리 (`CoCm020M.do`) · 개인일정관리 (`CoCm021M.do`) · 주간일정팝업 (`CoCm020D.do`)
  - 공통통계 (`CoSt010L.do`, `CoSt020L.do`, 상세 `CoSt010D.do`)
  - **조교/학과 관리** (`sys_assDept.do`) ★
  - **전담교수 매칭** (`CoAm010L.do`) · **상담제한일정 관리** (`CoAm020L.do`) ★
  - 직원 상담실적 (`CoEm010L.do`, `ConEmpDetailStuList.do`, `CoEm010SD.do`)
  - 지역청년상담 신청관리 (`CoAy010L.do`)
  - 집단상담 조회 (`CoSaGroupConView.do`, `CoSaTrialGroupConView.do`)
  - 상담일지 엑셀업로드 (`CoExcelUploadPop.do`), 전담교수 엑셀업로드 (`CoAm010UploadPop.do`)
- **비교과 프로그램** (`/Sa/Ep`)
  - 개설신청 현황 (`Ep010L.do`) · 프로그램 조회 (`Ep030L.do` / 달력 `Ep030CL` / 월력 `Ep030ML`)
  - 구분관리 (`Ep040L.do`) · 만족도조사관리 (`Ep060L/M/R.do`, `Ep070R.do`)
  - 개인형 상세 탭 (`EpTb010PD` 개요 / `EpTb020PD` 신청자 / `EpTb030PD` 외부인 / `EpTb040PD` 설문 / `EpTb050PD` 만족도 / `EpTb060PD` 결과보고서)
  - 그룹형 상세 탭 (`EpTb010GD` / `EpTb020GD` 신청그룹 / `EpTb030GD` 선발그룹 / `EpTb040GD` 신청자)
  - 개인등록 (`EpMn010U.do`) · 그룹등록 (`EpSa010GU.do`) · **블랙리스트** (`EpBlackList.do`)
  - 결과보고서 일괄다운 (`EpTb060PDA.do`)
  - [지역청년] 프로그램 목록/상세/등록 (`EpReg010L/D/UL/M.do`, `regPgmTn(List).do`)
- **채용/해외취업** (`/Sa/Re`) — 추천채용·일반채용·공공기관·인턴십·공모전·교육·아르바이트 각 `L/I(M)/D/U` 4종 세트 + 신청자관리(`ReRd011L`, `ReAp020L`) + **인재검색 상세팝업 12종** (`RePs*`)
- **취업통계** (`/Sa/St`) — 조사차수관리 · 예비/본조사 · 취업자현황 · 취업통계(12종 엑셀) · 프로그램별 취업률 · 졸업생 취업조사 · KEDI · 학과목표설정 · 졸업자 취업현황
- **역량** (`/Sa/Ca`) — 학생별 역량현황 · **학과별 PA역량목표 설정** · 핵심역량 시뮬레이션 · **역량진단관리**(학생/교수)
- **데이터분석** (`/Sa/Dt`) — 스마트/지원체계/프로그램/상담/마일리지구간/마일리지순위 6종 + 각 표·명단 엑셀
- **비교과활동(마일리지)** (`/Sa/Ex`) — 항목관리 · 승인관리 · 자격증 · 마일리지 조회
- **진로목표/워크넷** (`/Sa/Fu`) — 워크넷 검사결과 · 진로탐색 현황 · 진로목표 현황 · **전담조교 매칭**(`sys_assDept.do`) ★ · **교수학과 배정**(`sys_profDept.do`)
- **취업동아리** (`/Sa/Ec`) · **멘토/멘티** (`/Sa/Mt`) · **기업회원** (`/Sa/Cp`) · **기업관리** (`/Sa/Et`) · **INFACO** (`/admin/infaco`)
- **교수상담** (`/Sa/Pc`) · **취업수기** (`/Sa/Ip`) · **진로로드맵** (`/Sa/Rm`) · **동문CEO** (`/Sa/Sm`) · **진로취업카드** (`/Sa/Ss`) · **게시판** (`/Sa/Bd`) · **장기결석/학사경고** (`/Sa/Wa`) · **포트폴리오** (`/Sa/Pf`, `/admin/portfolioStudent`) · **참여후기** (`/admin/poss`)

### 상담사 (`/user/Co/CoMc*`)
- 예약상담 (`CoMc010L.do`) → 상세팝업 `CoMc010P.do` / 변경정보 `CoMcStuStatus.do` / 상담작성 `CoMc010ConWrite.do` / 심리검사작성 `CoMc010TrialConWrite.do` / 재배정 `CoMcReAssing.do`
- 일정관리 (`CoMc030L.do`, 월별 `CoMc030MonthL.do`) → 일정등록팝업 `CoMc030P.do`
- 상담결과관리 (`CoMc030Result.do`)
- 집단상담 관리 (`CoMc050L.do` 일반 / `CoMc060L.do` 심리검사)
- 통계 (`CoMc040L.do`, `CoMc070L.do`, `CoMc080L/P.do`, `CoMc090L.do`)
- 심리검사 결과 작성/조회 (`/user/Fu/CoSimriResultWrite.do`, `...View.do`)

### 조교 (`/user/Co/CoAs*`) ★ 전 7화면
- 전담교수 배정 유무 확인 (`CoAs010L.do`) → 배정팝업 `Advis.do`
- 전담교수 상담실적 (`CoAs020L.do`) → 상세 `CoAs020DL.do` → 엑셀 `/user/Pc/PcChart020Excel.do`
- 학생별 역량현황 (`CoAs030L.do`)
- 학생별 역량현황2 (`CoAs040L.do`)

### 교수 (`/user/Pc/*`, `/user/Ca/CaMp*`, `/user/Fu/FuAp05*`)
- 지도교수 상담 (`PcMp010L.do` / `PcMa010L.do`) · 신규작성 (`PcMp010M.do`) · 집단상담 (`pop_PcMp010M.do`) · 인쇄 (`PcMp010D_Print.do`)
- 상담 내역 (`PcMp020L/D.do`) · 온라인 상담 목록 (`PcMpOnlineL.do`) · 일정 (`PcMp030L.do`, `PcMp040L.do`, `CoMp040MonthL.do`)
- 학생별 역량현황 (`CaMpSs010L/D.do`) · 역량진단 (`CaMp010L.do`, `CaMpDm010P.do`)
- 학생별 진로목표 현황/상세 (`/user/Fu/FuAp050A.do`, `FuAp050D.do`)
- 푸시전송 (`/user/Pc/Mp/PcPushSend.do`)

### 학생 (`/user/**/Ms*`, `/user/My/*`, `/user/portfolio/*`)
- 마이홈 (`MySt011L.do`) · 상담/검사 내역 (`MySt020L~070L`) · 진로설계서 (`MySt060L.do`, `MyCuStep3_Pop.do`)
- 상담 내역 (`CoMs010L/D.do`) · 지도교수 상담 (`CoMs020L/030L/040L.do`) · 상담신청 (`CoVi010M.do` → `CoViConL.do` → `CoAppD.do`)
- 비교과 (`/user/Ep/Ms*`) · 마일리지 (`/user/Ex/ExIa010L.do`, `ExAm010L.do`) · 역량진단 (`CaMsDm010L.do`)
- e포트폴리오 (`/user/portfolio/*` 18화면) · 진로취업카드 (`/user/Ss/*`) · 채용 스크랩 (`/user/Re/ReMs*` 16화면)

### 기업 (`C`) / 멘토 (`MT`) / 지역청년 (별도)
- 기업: `/user/Cp/CpMc010I.do`(기업정보수정), `/user/mypage_company/infaco_myEdit.do`, `/user/infaco/*`
- 멘토: `/user/Mt/MtMm010L.do`(멘티현황), `MtMm020L.do`(활동관리), `MtMm030M.do`, `pop_changePwdMento.do`
- 지역청년: `/regMain.do`, `/regJoin*.do`, `/user/In/*`(취업예측분석 8), `/user/It/*`(소개 8), `/user/Bd/BdCm040L.do`

---

## 화면 전수 표

**범위: JSP를 렌더링하는 매핑 전수(847건, 고유 URL 844).** Ajax(`jsonView`)·`redirect` 처리 액션·엑셀 다운로드는 제외.

- `역할` — 네임스페이스·뷰 경로·컨트롤러 주석으로 **추정**. 실제 노출 권한은 `SY_MENU_AUTH`(DB) 결정 → 모두 **`DB판정`** 병기.
- `메뉴노출` — 전 행 **`미확인`**(SY_MENU가 DB 데이터). 표에서는 지면상 생략하고 이 문장으로 갈음한다.
- `JSP` — `/WEB-INF/jsp/` 기준 상대경로. `|` 로 구분된 복수 값은 파라미터·모바일 분기.

| # | 역할 | 대분류 | 중분류(모듈) | 화면명 | URL | Controller#method | JSP | 비고 |
|---|---|---|---|---|---|---|---|---|
| 1 | 관리자(DB판정) | 관리자 | Capability | 미확인 | `/admin/Capability/diagnosisResult_Print.do` | `MyStController#diagnosisResult_Print` | `common/print_diagnosisResult` |  |
| 2 | 관리자(DB판정) | 관리자 | infaco(INFACO) | 관리자 > INFACO(가족회사) > INFACO 관리 > 목록 | `/admin/infaco/infaco_manage.do` | `CpController#infaco_manage` | `admin/infaco/infaco_manage` |  |
| 3 | 관리자(DB판정) | 관리자 | infaco(INFACO) | 관리자 > INFACO(가족회사) > INFACO 관리 > 상세 | `/admin/infaco/infaco_manage_view.do` | `CpController#infaco_manage_view` | `admin/infaco/infaco_manage_view` |  |
| 4 | 관리자(DB판정) | 관리자 | infaco(INFACO) | 관리자 > INFACO(가족회사) > INFACO 관리 > 등록 | `/admin/infaco/infaco_manage_write.do` | `CpController#infaco_manage_write` | `admin/infaco/infaco_manage_write` |  |
| 5 | 관리자(DB판정) | 관리자 | portfolioStudent(포트폴리오(관리)) | 관리자 이력서 자소서 항목 조회 | `/admin/portfolioStudent/history.do` | `UserPortfolioController#history` | `admin/portfolioStudent/history` |  |
| 6 | 관리자(DB판정) | 관리자 | portfolioStudent(포트폴리오(관리)) | 이력서 상세 | `/admin/portfolioStudent/history_resume_view.do` | `UserPortfolioController#history_resume_view` | `admin/portfolioStudent/history_resume_view` |  |
| 7 | 관리자(DB판정) | 관리자 | poss(참여후기) | 프로그램 참여후기 게시판 상세 | `/admin/poss/pgmPossD.do` | `PossController#pgmPossD` | `admin/poss/pgmPossD<br>/user/poss/pgmPossMngD` | 분기다중 |
| 8 | 관리자(DB판정) | 관리자 | poss(참여후기) | 프로그램 참여후기 엑셀다운로드 | `/admin/poss/pgmPossExcelDown.do` | `PossController#EpExcelDown` | `admin/poss/pgmPoss_XLS` |  |
| 9 | 관리자(DB판정) | 관리자 | poss(참여후기) | 프로그램 참여후기 게시판 목록 | `/admin/poss/pgmPossL.do` | `PossController#pgmPossL` | `admin/poss/pgmPossL<br>/user/poss/pgmPossMngL` | 분기다중 |
| 10 | 관리자(DB판정) | 관리자 | poss(참여후기) | 프로그램 참여후기 게시판 | `/admin/poss/pgmPossM.do` | `PossController#pgmPossM` | `admin/poss/pgmPossM<br>user/poss/pgmPossMngM` | 분기다중 |
| 11 | 관리자(DB판정) | 관리자 | AcSt(접속통계) | 상담사 예약상담 | `/Sa/AcSt/AcSt010L.do` | `AcStController#AcSt010L` | `admin/St/AcSt010L` |  |
| 12 | 관리자(DB판정) | 관리자 | AcSt(접속통계) | 상담사 예약상담 | `/Sa/AcSt/AcSt020L.do` | `AcStController#AcSt020L` | `admin/St/AcSt020L` |  |
| 13 | 관리자(DB판정) | 관리자 | Bd(게시판) | 게시판 상세 | `/Sa/Bd/BdCm010D.do` | `BdController#BdCm010D` | `admin/Bd/BdCm010D<br>/admin/Bd/bd_notice_view` | 분기다중 |
| 14 | 관리자(DB판정) | 관리자 | Bd(게시판) | 공통 게시판 | `/Sa/Bd/BdCm010L.do` | `BdController#BdCm010L` | `admin/Bd/BdCm010L<br>/admin/Bd/BdCm020L<br>/admin/Bd/Bd_gallery` | 분기다중 |
| 15 | 관리자(DB판정) | 관리자 | Bd(게시판) | 게시판 등록 | `/Sa/Bd/BdCm010M.do` | `BdController#BdCm010M` | `admin/Bd/BdCm010I` |  |
| 16 | 관리자(DB판정) | 관리자 | Ca(역량) | 역량진단관리 상세 | `/Sa/Ca/CaDm010D.do` | `CaController#diagnosisMngD` | `common/Ca/pop_CaDiagnosisMng` |  |
| 17 | 관리자(DB판정) | 관리자 | Ca(역량) | 교수역량진단관리 조회 | `/Sa/Ca/CaDm010EMP.do` | `CaController#CaDm010EMP` | `common/Ca/pop_CaDiagnosisMngEmp1` |  |
| 18 | 관리자(DB판정) | 관리자 | Ca(역량) | 역량진단관리 엑셀업로드 | `/Sa/Ca/CaDm010Eu.do` | `CaController#capExcelUploadPop` | `common/Ca/pop_CaDmExcelUpload` |  |
| 19 | 관리자(DB판정) | 관리자 | Ca(역량) | 역량진단관리 조회 | `/Sa/Ca/CaDm010L.do` | `CaController#diagnosisMngL` | `admin/Ca/CaDm010L` |  |
| 20 | 관리자(DB판정) | 관리자 | Ca(역량) | 역량진단관리 등록 & 수정 | `/Sa/Ca/CaDm010M.do` | `CaController#diagnosisMngM` | `admin/Ca/CaDm010I` |  |
| 21 | 관리자(DB판정) | 관리자 | Ca(역량) | 역량진단관리 조회 | `/Sa/Ca/CaDm010P1.do` | `CaController#diagnosisMngP1` | `common/Ca/pop_CaDiagnosisMngP1` |  |
| 22 | 관리자(DB판정) | 관리자 | Ca(역량) | 미확인 | `/Sa/Ca/CaDm010P2.do` | `CaController#diagnosisMngP2` | `common/Ca/pop_CaDiagnosisMngP2` |  |
| 23 | 관리자(DB판정) | 관리자 | Ca(역량) | 역량진단관리 등록 & 수정 | `/Sa/Ca/CaDm010PM.do` | `CaController#CaDm010PM` | `admin/Ca/CaDm010PI` |  |
| 24 | 관리자(DB판정) | 관리자 | Ca(역량) | 역량진단관리 결과 팝업(관리자) | `/Sa/Ca/CaDm010R.do` | `CaController#diagnosisResult` | `common/Ca/pop_CaDiagnosisResult` |  |
| 25 | 관리자(DB판정) | 관리자 | Ca(역량) | 교수 역량진단관리 결과 팝업(관리자) | `/Sa/Ca/CaDmEmp010R.do` | `CaController#CaDmEmp010R` | `common/Ca/pop_CaDiagnosisResultEmp` |  |
| 26 | 관리자(DB판정) | 관리자 | Ca(역량) | 핵심역량 시뮬레이션 현황 | `/Sa/Ca/CaEp010D.do` | `CaController#eduPlannerDetail` | `admin/Ca/CaEp010D` |  |
| 27 | 관리자(DB판정) | 관리자 | Ca(역량) | 핵심역량 시뮬레이션 현황 | `/Sa/Ca/CaEp010L.do` | `CaController#eduPlanner` | `admin/Ca/CaEp010L` |  |
| 28 | 관리자(DB판정) | 관리자 | Ca(역량) | 핵심역량 시뮬레이션 비교과프로그램 팝업 | `/Sa/Ca/CaEp010PN.do` | `CaController#eduPlannerNonSubject` | `common/Ca/pop_CaEpNonSubject<br>jsonView` | 분기다중 |
| 29 | 관리자(DB판정) | 관리자 | Ca(역량) | 핵심역량 시뮬레이션 교과프로그램 팝업 | `/Sa/Ca/CaEp010PS.do` | `CaController#eduPlannerSubject` | `common/Ca/pop_CaEpSubject` |  |
| 30 | 관리자(DB판정) | 관리자 | Ca(역량) | 핵심역량 시뮬레이션 현황 | `/Sa/Ca/CaEp010V.do` | `CaController#eduPlannerView` | `admin/Ca/CaEp010V` |  |
| 31 | 관리자(DB판정) | 관리자 | Ca(역량) | 학과별 PA역량목표 상세 | `/Sa/Ca/CaGs010D.do` | `CaController#goalSettingDetail` | `admin/Ca/CaGs010D` |  |
| 32 | 관리자(DB판정) | 관리자 | Ca(역량) | 학과별 PA역량목표 상세 | `/Sa/Ca/CaGs010E.do` | `CaController#goalSettingEdit` | `admin/Ca/CaGs010E` |  |
| 33 | 관리자(DB판정) | 관리자 | Ca(역량) | 학과별 PA역량목표 설정 | `/Sa/Ca/CaGs010L.do` | `CaController#goalSetting` | `admin/Ca/CaGs010L` |  |
| 34 | 관리자(DB판정) | 관리자 | Ca(역량) | 학생별 역량 현황 상세 페이지 | `/Sa/Ca/CaSs010D.do` | `CaController#goalStateDetail` | `admin/Ca/CaSs010D` |  |
| 35 | 관리자(DB판정) | 관리자 | Ca(역량) | 학생별 역량 현황 | `/Sa/Ca/CaSs010L.do` | `CaController#goalState` | `admin/Ca/CaSs010L` |  |
| 36 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담사 신규 작성 팝업 화면 | `/Sa/Co/Cn0001pop_insertCons.do` | `CoController#Cn0001pop_insertCons` | `common/Co/pop_insertCons` | 팝업(메뉴노출N 추정) |
| 37 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담사 신규 작성 팝업 화면 | `/Sa/Co/Cn0001pop_selectCons.do` | `CoController#Cn0001pop_selectCons` | `common/Co/pop_selectCons` | 팝업(메뉴노출N 추정) |
| 38 | 관리자(DB판정) | 관리자 | Co(상담관리) | 관리자 > 상담관리 > 전담교수 매칭 | `/Sa/Co/CoAm010L.do` | `CoController#CoAm010L` | `admin/Co/CoAm010L` |  |
| 39 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoAm010UploadPop.do` | `CoController#CoAm010UploadPop` | `common/Co/pop_coAm010ExcelUpload` | 팝업(메뉴노출N 추정) |
| 40 | 관리자(DB판정) | 관리자 | Co(상담관리) | 관리자 > 전단교수상담 > 상담제한일정 관리 | `/Sa/Co/CoAm020L.do` | `CoController#CoAm020L` | `admin/Co/CoAm020L` |  |
| 41 | 관리자(DB판정) | 관리자 | Co(상담관리) | 지역청년상담 신청관리 | `/Sa/Co/CoAy010L.do` | `CoController#CoAy010L` | `admin/Co/CoAy010L` |  |
| 42 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담 현황 | `/Sa/Co/CoCm010L.do` | `CoController#CoCm010L` | `admin/Co/CoCm010L` |  |
| 43 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담 현황 | `/Sa/Co/CoCm010L_XLS.do` | `CoExcelController#CoCm010L_XLS` | `admin/Co/CoCm010L_XLS` |  |
| 44 | 관리자(DB판정) | 관리자 | Co(상담관리) | PopUp 상담 현황 상세조회 | `/Sa/Co/CoCm010P.do` | `CoController#CnCm010P` | `common/Co/pop_adminConsultingInfo` |  |
| 45 | 관리자(DB판정) | 관리자 | Co(상담관리) | PopUp 상담 현황 상세조회_인쇄 | `/Sa/Co/CoCm010Print.do` | `CoController#CnCm010Print` | `common/Co/pop_adminConsultingInfoPrint` |  |
| 46 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoCm010SmartExcel.do` | `CoExcelController#CoCm010SmartExcel` | `admin/Co/CoSmartScore_XLS` |  |
| 47 | 관리자(DB판정) | 관리자 | Co(상담관리) | 일정 조회 | `/Sa/Co/CoCm020D.do` | `CoController#CnCm020D` | `common/Co/pop_weekToDoInfo` |  |
| 48 | 관리자(DB판정) | 관리자 | Co(상담관리) | 일정 관리 | `/Sa/Co/CoCm020M.do` | `CoController#CnCm020M` | `admin/Co/CoCm020M` |  |
| 49 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담결과관리 | `/Sa/Co/CoCm020Result.do` | `CoController#CoCm020Result` | `admin/Co/CoCm020Result` |  |
| 50 | 관리자(DB판정) | 관리자 | Co(상담관리) | 개인 일정 관리 | `/Sa/Co/CoCm021M.do` | `CoController#CnCm020D` | `admin/Co/CoCm021M` |  |
| 51 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담 현황 | `/Sa/Co/CoCm030L.do` | `CoController#CoCm030L` | `admin/Co/CoCm030L` |  |
| 52 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoCm040L.do` | `CoController#CoCm040L` | `admin/Co/CoCm040L` |  |
| 53 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoCm050L.do` | `CoController#CoCm050L` | `admin/Co/CoCm050L` |  |
| 54 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoCm060L.do` | `CoController#CoCm060L` | `admin/Co/CoCm060L` |  |
| 55 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoConDetail_pop.do` | `CoController#CoConDetail_pop` | `common/Co/pop_ConsultingView` | 팝업(메뉴노출N 추정) |
| 56 | 관리자(DB판정) | 관리자 | Co(상담관리) | 내부 상담 상세 페이지 | `/Sa/Co/CoCt010D.do` | `CoController#CnCt010D` | `admin/Co/CoCt010D` |  |
| 57 | 관리자(DB판정) | 관리자 | Co(상담관리) | 관리자 > 상담관리 > 상담사 관리 | `/Sa/Co/CoCt010L.do` | `CoController#CnCt010L` | `admin/Co/CoCt010L` |  |
| 58 | 관리자(DB판정) | 관리자 | Co(상담관리) | 내부 상담 신규 작성 화면 | `/Sa/Co/CoCt010M.do` | `CoController#CnCt010M` | `admin/Co/CoCt010I` |  |
| 59 | 관리자(DB판정) | 관리자 | Co(상담관리) | 내부 상담 상세 페이지 인쇄 | `/Sa/Co/CoCt010Print.do` | `CoController#CnCt010Print` | `common/Co/pop_CoCt010Print` |  |
| 60 | 관리자(DB판정) | 관리자 | Co(상담관리) | 내부 상담 수정 페이지 | `/Sa/Co/CoCt010U.do` | `CoController#CnCt010U` | `admin/Co/CoCt010U` |  |
| 61 | 관리자(DB판정) | 관리자 | Co(상담관리) | 직원 상담실적 화면으로 이동한다. | `/Sa/Co/CoEm010L.do` | `CoController#CoEm010L` | `admin/Co/CoEm010L` |  |
| 62 | 관리자(DB판정) | 관리자 | Co(상담관리) | 개인 상담 신규 작성 화면 | `/Sa/Co/CoEm010SD.do` | `CoController#CoEm010SD` | `admin/Co/CoEm010SD` |  |
| 63 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담일지 Excel업로드 팝업 | `/Sa/Co/CoExcelUploadPop.do` | `CoController#CnExcelUploadPop` | `common/Co/pop_CoExcelUpload` | 팝업(메뉴노출N 추정) |
| 64 | 관리자(DB판정) | 관리자 | Co(상담관리) | 지도교수 상담실적 | `/Sa/Co/ConEmpDetailStuList.do` | `CoController#ConEmpDetailStuList` | `admin/Co/CoEm010SL` |  |
| 65 | 관리자(DB판정) | 관리자 | Co(상담관리) | 인재검색 학생 상세 팝업 | `/Sa/Co/CoPs010D.do` | `CoController#RePs010D` | `common/pop_RePsD` |  |
| 66 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoSaGroupConView.do` | `CoController#CoSaGroupConView` | `common/Co/pop_GroupConsultView` |  |
| 67 | 관리자(DB판정) | 관리자 | Co(상담관리) | 미확인 | `/Sa/Co/CoSaTrialGroupConView.do` | `CoController#CoSaTrialGroupConView` | `common/Co/pop_TrialGroupConsultView` |  |
| 68 | 관리자(DB판정) | 관리자 | Co(상담관리) | 내부 상담 상세 페이지 | `/Sa/Co/CoSt010D.do` | `CoController#CoSt010D` | `admin/Co/CoSt010D` |  |
| 69 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담 현황 | `/Sa/Co/CoSt010Excel.do` | `CoExcelController#CoSt010Excel` | `admin/Co/CoSt010L_XLS` |  |
| 70 | 관리자(DB판정) | 관리자 | Co(상담관리) | 공통 통계 | `/Sa/Co/CoSt010L.do` | `CoController#CoSt010L` | `admin/Co/CoSt010L` |  |
| 71 | 관리자(DB판정) | 관리자 | Co(상담관리) | 상담 현황 | `/Sa/Co/CoSt020Excel.do` | `CoExcelController#CoSt020Excel` | `admin/Co/CoSt020L_XLS` |  |
| 72 | 관리자(DB판정) | 관리자 | Co(상담관리) | 공통 통계 | `/Sa/Co/CoSt020L.do` | `CoController#CoSt020L` | `admin/Co/CoSt020L` |  |
| 73 | 관리자(DB판정) | 관리자 | Co(상담관리) | 관리자 > 상담관리 > 조교 | `/Sa/Co/sys_assDept.do` | `CoController#sys_assDept` | `admin/Co/CoDp010L` |  |
| 74 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업회원 등록페이지 | `/Sa/Cp/CpCa010M.do` | `CpController#SyCa010M` | `admin/Cp/CpCa010I` |  |
| 75 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 신규 기업 담당자 등록 팝업창 | `/Sa/Cp/CpCa010newM.do` | `CpController#SyCa010newM` | `common/Cp/pop_NewM` |  |
| 76 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업 회원정보 상세 페이지 | `/Sa/Cp/CpCl020D.do` | `CpController#SyCl020D` | `admin/Cp/CpCl020D<br>user/Cp/CpCl030D` | 분기다중 |
| 77 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업회원 조회 | `/Sa/Cp/CpCl020L.do` | `CpController#SyCl020L` | `admin/Cp/CpCl020L<br>user/Cp/CpCl030L` | 분기다중 |
| 78 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업회원 등록페이지 | `/Sa/Cp/CpCl020M.do` | `CpController#SyCa020M` | `admin/Cp/CpCl020I` |  |
| 79 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업 회원정보 수정 페이지 | `/Sa/Cp/CpCl020U.do` | `CpController#SyCl020U` | `admin/Cp/CpCl020U` |  |
| 80 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업 회원정보 상세 페이지 | `/Sa/Cp/CpCl030D.do` | `CpController#SyCl030D` | `admin/Cp/CpCl030D` |  |
| 81 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업회원 관리 > 일반회원 현황 | `/Sa/Cp/CpNm010L.do` | `CpController#CpNm010L` | `admin/Cp/CpNm010L` |  |
| 82 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 기업회원 관리 > 일반회원 수정 팝업 | `/Sa/Cp/CpNm010P.do` | `CpController#CpNm010P` | `common/pop_normalUserMod` |  |
| 83 | 관리자(DB판정) | 관리자 | Cp(기업회원) | 지역청년 회원 현황 | `/Sa/Cp/CpReg010L.do` | `CpController#CpReg010L` | `admin/Cp/CpReg010L<br>/regLogin` | 분기다중 |
| 84 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 관리자 > 데이터분석 > 취업통계 > 스마트 | `/Sa/Dt/Dt010L.do` | `DtController#Dt010L` | `admin/Dt/Dt010L` |  |
| 85 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 관리자 > 데이터분석 > 취업통계 > 창대한 지원체계 | `/Sa/Dt/Dt020L.do` | `DtController#Dt020L` | `admin/Dt/Dt020L` |  |
| 86 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 관리자 > 데이터분석 > 취업통계 > 창대한 프로그램 | `/Sa/Dt/Dt030L.do` | `DtController#Dt030L` | `admin/Dt/Dt030L` |  |
| 87 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 관리자 > 데이터분석 > 취업통계 > 상담 | `/Sa/Dt/Dt040L.do` | `DtController#Dt040L` | `admin/Dt/Dt040L` |  |
| 88 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 관리자 > 데이터분석 > 취업통계 > 마일리지 구간 | `/Sa/Dt/Dt050L.do` | `DtController#Dt050L` | `admin/Dt/Dt050L` |  |
| 89 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 관리자 > 데이터분석 > 취업통계 > 마일리지 순위 | `/Sa/Dt/Dt060L.do` | `DtController#Dt060L` | `admin/Dt/Dt060L` |  |
| 90 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 스마트 표 다운로드 | `/Sa/Dt/DtChart010Excel.do` | `DtExcelController#DtChart010Excel` | `admin/Dt/Dt010Chart_XLS` |  |
| 91 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 스마트 명단 다운로드 | `/Sa/Dt/DtChart010MemExcel.do` | `DtExcelController#DtChart010MemExcel` | `admin/Dt/Dt010ChartMem_XLS` |  |
| 92 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 창대한 지원체계 표 다운로드 | `/Sa/Dt/DtChart020Excel.do` | `DtExcelController#DtChart020Excel` | `admin/Dt/Dt020Chart_XLS` |  |
| 93 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 창대한 지원체계 표 다운로드 | `/Sa/Dt/DtChart020MemExcel.do` | `DtExcelController#DtChart020MemExcel` | `admin/Dt/Dt020ChartMem_XLS` |  |
| 94 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 창대한 프로그램 표 다운로드 | `/Sa/Dt/DtChart030Excel.do` | `DtExcelController#DtChart030Excel` | `admin/Dt/Dt030Chart_XLS` |  |
| 95 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 창대한 지원체계 표 다운로드 | `/Sa/Dt/DtChart030MemExcel.do` | `DtExcelController#DtChart030MemExcel` | `admin/Dt/Dt030ChartMem_XLS` |  |
| 96 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 상담 표 다운로드 | `/Sa/Dt/DtChart040Excel.do` | `DtExcelController#DtChart040Excel` | `admin/Dt/Dt040Chart_XLS` |  |
| 97 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 상담 표 다운로드 | `/Sa/Dt/DtChart040MemExcel.do` | `DtExcelController#DtChart040MemExcel` | `admin/Dt/Dt040ChartMem_XLS` |  |
| 98 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 마일리지구간 표 다운로드 | `/Sa/Dt/DtChart050Excel.do` | `DtExcelController#DtChart050Excel` | `admin/Dt/Dt050Chart_XLS` |  |
| 99 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 마일리지구간 명단 다운로드 | `/Sa/Dt/DtChart050MemExcel.do` | `DtExcelController#Mnto010LExcel` | `admin/Dt/Dt050ChartMem_XLS` |  |
| 100 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 마일리지 순위 표 다운로드 | `/Sa/Dt/DtChart060Excel.do` | `DtExcelController#DtChart060Excel` | `admin/Dt/Dt060Chart_XLS` |  |
| 101 | 관리자(DB판정) | 관리자 | Dt(데이터분석) | 데이터분석 > 취업통계 > 마일리지순위 명단 다운로드 | `/Sa/Dt/DtChart060MemExcel.do` | `DtExcelController#DtChart060MemExcel` | `admin/Dt/Dt060ChartMem_XLS` |  |
| 102 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 커뮤니티 활동관리 > 일반 게시판 | `/Sa/Ec/EcBoardPop_BoardList.do` | `EcController#EcBoardPop_BoardList` | `common/Ec/pop_EcBoardList` | 팝업(메뉴노출N 추정) |
| 103 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 커뮤니티 활동관리 > 포토 게시판 | `/Sa/Ec/EcBoardPop_PhotoList.do` | `EcController#EcBoardPop_PhotoList` | `common/Ec/pop_EcPhotoList` | 팝업(메뉴노출N 추정) |
| 104 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 커뮤니티 활동관리 | `/Sa/Ec/EcBoardPopup.do` | `EcController#EcBoardPopup` | `common/Ec/pop_EcBoardInfo` | 팝업(메뉴노출N 추정) |
| 105 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 미확인 | `/Sa/Ec/ecBoardView.do` | `EcController#ecBoardView` | `common/Ec/pop_EcBoardView` |  |
| 106 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 미확인 | `/Sa/Ec/ecBoardWrite.do` | `EcController#ecBoardWrite` | `common/Ec/pop_EcBoardWrite` |  |
| 107 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 미확인 | `/Sa/Ec/ecPhotoView.do` | `EcController#ecPhotoView` | `common/Ec/pop_EcPhotoView` |  |
| 108 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 미확인 | `/Sa/Ec/ecPhotoWrite.do` | `EcController#ecPhotoWrite` | `common/Ec/pop_EcPhotoWrite` |  |
| 109 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 관리자 > 취업동아리 > 취업동아리 개설현황 | `/Sa/Ec/EcSa010D.do` | `EcController#EcSa010D` | `admin/Ec/EcSa010D` |  |
| 110 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 취업동아리 명단 | `/Sa/Ec/EcSa010DExcel.do` | `EcExcelController#EcSa010DExcel` | `admin/Ec/EcSa010L_XLS` |  |
| 111 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 관리자 > DAU SPEC-UP > 학생별 취업희망카드 | `/Sa/Ec/EcSa010L.do` | `EcController#EcSa010L` | `admin/Ec/EcSa010L` |  |
| 112 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 취업동아리 커뮤니티 등록 팝업 | `/Sa/Ec/pop_EcBoard.do` | `EcController#pop_EcBoard` | `common/Ec/pop_canBoardAdd` | 팝업(메뉴노출N 추정) |
| 113 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 취업동아리 커뮤니티명 변경 팝업 | `/Sa/Ec/pop_EcBoardCnangeName.do` | `EcController#pop_EcBoardCnangeName` | `common/Ec/pop_boardNameChg` | 팝업(메뉴노출N 추정) |
| 114 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 취업동아리 반 등록 팝업 | `/Sa/Ec/pop_EcClass.do` | `EcController#pop_EcClass` | `common/Ec/pop_canClassAdd` | 팝업(메뉴노출N 추정) |
| 115 | 관리자(DB판정) | 관리자 | Ec(취업동아리) | 취업동아리 기수 등록 팝업 | `/Sa/Ec/pop_EcMstr.do` | `EcController#pop_EcMstr` | `common/Ec/pop_canMstrAdd` | 팝업(메뉴노출N 추정) |
| 116 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과 프로그램 개설신청 현황 | `/Sa/Ep/Ep010L.do` | `EpController#Ep010L` | `admin/Ep/Ep010L` |  |
| 117 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 조회 - 달력 | `/Sa/Ep/Ep030CL.do` | `EpController#extMngCalendar` | `admin/Ep/Ep030CL` |  |
| 118 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 조회 | `/Sa/Ep/Ep030L.do` | `EpController#extMng` | `admin/Ep/Ep030L` |  |
| 119 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 조회 - 월력 | `/Sa/Ep/Ep030ML.do` | `EpController#extMngSchedule` | `admin/Ep/Ep030ML` |  |
| 120 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 구분관리 | `/Sa/Ep/Ep040L.do` | `EpController#Ep040L` | `admin/Ep/Ep040L` |  |
| 121 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 만족도조사관리 조회 | `/Sa/Ep/Ep060L.do` | `EpController#Ep060L` | `admin/Ep/Ep070L<br>/admin/Ep/Ep060L` | 분기다중 |
| 122 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 만족도조사 등록 & 수정 | `/Sa/Ep/Ep060M.do` | `EpController#Ep060M` | `admin/Ep/Ep060I` |  |
| 123 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 마이페이지 만족도조사 상세 | `/Sa/Ep/Ep060R.do` | `EpController#Ep060R` | `admin/Ep/Ep060R` |  |
| 124 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 마이페이지 만족도조사 상세 | `/Sa/Ep/Ep070R.do` | `EpController#SsSv010R` | `admin/Ep/SsSv010R` |  |
| 125 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 미확인 | `/Sa/Ep/EpBlackList.do` | `EpController#EpBlackList` | `admin/Ep/EpBlackList` |  |
| 126 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 개인등록 | `/Sa/Ep/EpMn010U.do` | `EpController#EpMn010U` | `admin/Ep/EpSa010P` |  |
| 127 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 진로·취업 프로그램 상세조회 | `/Sa/Ep/EpReg010D.do` | `EpController#EpReg010D` | `admin/Ep/EpReg010D<br>/regLogin` | 분기다중 |
| 128 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 진로·취업 프로그램 목록 | `/Sa/Ep/EpReg010L.do` | `EpController#EpReg010L` | `admin/Ep/EpReg010L<br>/regLogin` | 분기다중 |
| 129 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 진로·취업 프로그램 등록 | `/Sa/Ep/EpReg010M.do` | `EpController#EpReg010M` | `admin/Ep/EpReg010M<br>/regLogin` | 분기다중 |
| 130 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 진로·취업 프로그램 상세조회 | `/Sa/Ep/EpReg010UL.do` | `EpController#EpReg010UL` | `admin/Ep/EpReg010UL<br>/regLogin` | 분기다중 |
| 131 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 그룹등록 | `/Sa/Ep/EpSa010GU.do` | `EpController#EpSa010GU` | `admin/Ep/EpSa010G` |  |
| 132 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 그룹상세 | `/Sa/Ep/EpTb010GD.do` | `EpController#extAddGroupDetail` | `admin/Ep/EpTb010GD` |  |
| 133 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 개인상세 | `/Sa/Ep/EpTb010PD.do` | `EpController#extAddPersonDetail` | `admin/Ep/EpTb010PD` |  |
| 134 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과 프로그램 그룹 유형2 신청그룹관리 목록 | `/Sa/Ep/EpTb020GD.do` | `EpController#extGroupAppList` | `admin/Ep/EpTb020GD` |  |
| 135 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 개인 신청자 조회 | `/Sa/Ep/EpTb020PD.do` | `EpController#extPersonApp` | `admin/Ep/EpTb020PD` |  |
| 136 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과 프로그램 선발그룹 목록 | `/Sa/Ep/EpTb030GD.do` | `EpController#extGroupBindList` | `admin/Ep/EpTb030GD` |  |
| 137 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 외부인관리 | `/Sa/Ep/EpTb030PD.do` | `EpController#extOutsiderMng` | `admin/Ep/EpTb030PD` |  |
| 138 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 그룹 신청자 조회 | `/Sa/Ep/EpTb040GD.do` | `EpController#extGroupApp` | `admin/Ep/EpTb040GD` |  |
| 139 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 상세 탭 설문화면 | `/Sa/Ep/EpTb040PD.do` | `EpController#extTabSurveyMng` | `admin/Ep/EpTb040PD` |  |
| 140 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 만족도관리 | `/Sa/Ep/EpTb050PD.do` | `EpController#satisFactionMng` | `admin/Ep/EpTb050PD` |  |
| 141 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 상세 탭 결과보고서 화면 조회 | `/Sa/Ep/EpTb060PD.do` | `EpController#extResultReport` | `admin/Ep/EpTb060PD<br>/admin/Ep/EpTb060PD_doc` | 분기다중 |
| 142 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 프로그램 결과보고서 일괄다운로드 | `/Sa/Ep/EpTb060PDA.do` | `EpController#extReportExelDown` | `admin/Ep/EpTb060PD_doc` |  |
| 143 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 비교과프로그램 등록 | `/Sa/Ep/extAddReqArt_detail.do` | `EpController#extAddReqArt_detail` | `common/Ep/extAddReqArt_detail` |  |
| 144 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 미확인 | `/Sa/Ep/extAppPrc_Print.do` | `EpController#extAppPrc_Print` | `common/Ep/extAppPrc_print` |  |
| 145 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 신청자 상세보기 | `/Sa/Ep/pgmAplcDetailView.do` | `EpController#menteeDetailView` | `common/Ep/pop_detailPgmAplc<br>/regLogin` | 분기다중 |
| 146 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 진로·취업 프로그램 차수 등록 | `/Sa/Ep/regPgmTn.do` | `EpController#regPgmTn` | `common/Ep/pop_regPgmTn<br>/regLogin` | 분기다중 |
| 147 | 관리자(DB판정) | 관리자 | Ep(비교과프로그램) | 진로·취업 프로그램 차수 목록 화면 | `/Sa/Ep/regPgmTnList.do` | `EpController#regPgmTnList` | `common/Ep/pop_regPgmTnList<br>/regLogin` | 분기다중 |
| 148 | 관리자(DB판정) | 관리자 | Et(기업관리) | 기업관리 엑셀다운로드 | `/Sa/Et/IntgEtrMngExcelDown.do` | `EtController#IntgEtrMngExcelDown` | `admin/Et/IntgEtrMng_XLS` |  |
| 149 | 관리자(DB판정) | 관리자 | Et(기업관리) | 기업관리 목록 | `/Sa/Et/IntgEtrMngL.do` | `EtController#IntgEtrMngL` | `admin/Et/IntgEtrMngL` |  |
| 150 | 관리자(DB판정) | 관리자 | Et(기업관리) | 기업관리 등록 | `/Sa/Et/IntgEtrMngM.do` | `EtController#IntgEtrMngM` | `admin/Et/IntgEtrMngM` |  |
| 151 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 비교과 활동 승인관리 상세조회 | `/Sa/Ex/ExIa010D.do` | `ExController#ExItemAll010D` | `admin/Ex/ExIa010D` |  |
| 152 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 비교과 활동 승인관리 조회 | `/Sa/Ex/ExIa010L.do` | `ExController#ExItemApprove010L` | `admin/Ex/ExIa010L` |  |
| 153 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 비교과 활동 항목관리 view | `/Sa/Ex/ExIm010L.do` | `ExController#ExItemMg010L` | `admin/Ex/ExIm010L` |  |
| 154 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 입력템플릿 미리보기 | `/Sa/Ex/ExIm010T.do` | `ExController#ExItemMg010_viewTemplate` | `common/Ex/pop_ExItemMnTemplate` |  |
| 155 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 자격증 정보 엑셀업로드 - 레이어 팝업 | `/Sa/Ex/ExLi010EI.do` | `ExController#ExLi010EI` | `common/Ex/pop_LicenseAdd` |  |
| 156 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 자격증 리스트 조회 | `/Sa/Ex/ExLi010L.do` | `ExController#ExLi010L` | `admin/Ex/ExLi010L` |  |
| 157 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 자격증 정보 조회 - 레이어 팝업 | `/Sa/Ex/ExLi010P.do` | `ExController#ExLi010P` | `common/Ex/pop_License` |  |
| 158 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 상세조회 | `/Sa/Ex/ExMi010D.do` | `ExController#mileageState` | `admin/Ex/ExMi010D<br>/user/Ex/ExMi010D` | 분기다중 |
| 159 | 관리자(DB판정) | 관리자 | Ex(비교과활동(마일리지)) | 조회 | `/Sa/Ex/ExMi010L.do` | `ExController#mileageItemAllList` | `admin/Ex/ExMi010L` |  |
| 160 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 관리자 > 진로목표관리 > 학생별 진로목표 현황 | `/Sa/Fu/FuAp050A.do` | `FuController#FuAp050A` | `admin/Fu/FuAp050A` |  |
| 161 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 관리자 > 진로목표관리 > 학생별 진로목표 상세현황 | `/Sa/Fu/FuAp050D.do` | `FuController#FuAp050D` | `admin/Fu/FuAp050D` |  |
| 162 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 미확인 | `/Sa/Fu/FuAp060D.do` | `FuController#empinfo_view` | `admin/Fu/FuAp060D` |  |
| 163 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 미확인 | `/Sa/Fu/FuAp060L.do` | `FuController#empinfo` | `admin/Fu/FuAp060L` |  |
| 164 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 미확인 | `/Sa/Fu/FuAp130L.do` | `FuController#FuAp130L` | `admin/Fu/FuAp130L` |  |
| 165 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 관리자 > 상담관리 > 워크넷 검사결과 | `/Sa/Fu/FuMt010L.do` | `FuController#mentaltest` | `admin/Fu/FuMt010L` |  |
| 166 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 관리자 > 상담관리 > 워크넷 검사결과 | `/Sa/Fu/FuMt011L.do` | `FuController#FuMt011L` | `admin/Fu/FuMt011L` |  |
| 167 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 관리자 > 진로탐색관리 > 학생별 진로탐색 현황 | `/Sa/Fu/FuMt020L.do` | `FuController#patentList` | `admin/Fu/FuMt020L` |  |
| 168 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 관리자 > 진로목표관리 > 전담조교 매칭 | `/Sa/Fu/sys_assDept.do` | `FuController#sys_fuassDept` | `admin/Fu/FuDp010L` |  |
| 169 | 관리자(DB판정) | 관리자 | Fu(진로목표/워크넷) | 관리자 > 진로목표관리 > 교수학과 배정 | `/Sa/Fu/sys_profDept.do` | `FuController#sys_fuprofDept` | `admin/Fu/FuDp020L` |  |
| 170 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 미확인 | `/Sa/Ip/IpOv010D.do` | `IpController#IpOv010D` | `admin/Ip/IpOv010D` |  |
| 171 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 미확인 | `/Sa/Ip/IpOv010L.do` | `IpController#SaOv010L` | `admin/Ip/IpOv010L` |  |
| 172 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 미확인 | `/Sa/Ip/IpOv010Reple.do` | `IpController#IpOv010Reple` | `admin/Ip/IpOv010RI` |  |
| 173 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 관리자 > 취업수기 > 상세화면 | `/Sa/Ip/IpSa010D.do` | `IpController#IpSa010D` | `admin/Ip/IpSa010D` |  |
| 174 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 관리자 > 취업수기 > 신청현황목록 | `/Sa/Ip/IpSa010L.do` | `IpController#IpSa010L` | `admin/Ip/IpSa010L` |  |
| 175 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 미확인 | `/Sa/Ip/IpSa010Reple.do` | `IpController#IpSa010Reple` | `admin/Ip/IpSa010RI` |  |
| 176 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 미확인 | `/Sa/Ip/IpSa010Write.do` | `IpController#IpSa010Write` | `admin/Ip/IpSa010I` |  |
| 177 | 관리자(DB판정) | 관리자 | Ip(취업수기) | 미확인 | `/Sa/Ip/IpSaOv010Write.do` | `IpController#IpSaOv010Write` | `admin/Ip/IpOv010I` |  |
| 178 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 공통게시판 > 상세 | `/Sa/Mt/commonBoardView.do` | `MtController#commonBoardView` | `common/Mt/pop_mentoQnABoardView` |  |
| 179 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 공통게시판 > 등록페이지 | `/Sa/Mt/commonBoardWrite.do` | `MtController#commonBoardWrite` | `common/Mt/pop_mentoQnABoardWrite` |  |
| 180 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘티 상세보기 | `/Sa/Mt/menteeDetailView.do` | `MtController#menteeDetailView` | `common/Mt/pop_detailMentee` |  |
| 181 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘토 상세보기 | `/Sa/Mt/mentoView.do` | `MtController#mentoView` | `common/Mt/pop_modyMentor` |  |
| 182 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘티 현황 엑셀 다운로드 | `/Sa/Mt/Mnte010Excel.do` | `MtExcelController#Mnte010Excel` | `admin/Mt/MnteDown_XLS` |  |
| 183 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘토 현황 엑셀 다운로드 | `/Sa/Mt/Mnto010Excel.do` | `MtExcelController#Mnto010Excel` | `admin/Mt/MntoDown_XLS` |  |
| 184 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 관리자 > 창대한 프로젝트 > 멘토 관리 | `/Sa/Mt/MnTo010L.do` | `MtController#MnTo010L` | `admin/Mt/MnTo010L` |  |
| 185 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 관리자 > 창대한 프로젝트 > 멘티 관리 | `/Sa/Mt/MnTo020L.do` | `MtController#MnTo020L` | `admin/Mt/MnTo020L` |  |
| 186 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘토 Q&A 게시판 | `/Sa/Mt/openPop_Qna.do` | `MtController#openPop_Qna` | `common/Mt/pop_mentoQnABoard` | 팝업(메뉴노출N 추정) |
| 187 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘토 Q&A 게시판 목록 | `/Sa/Mt/openPop_QnaList.do` | `MtController#commonBoardList` | `common/Mt/pop_mentoQnABoardList` | 팝업(메뉴노출N 추정) |
| 188 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘토 상세보기 | `/Sa/Mt/pop_menteeAdd.do` | `MtController#pop_menteeAdd` | `common/Mt/pop_menteeAdd` | 팝업(메뉴노출N 추정) |
| 189 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘티 리스트 상세보기 | `/Sa/Mt/pop_MenteeView.do` | `MtController#pop_MenteeView` | `common/Mt/pop_MenteeList` | 팝업(메뉴노출N 추정) |
| 190 | 관리자(DB판정) | 관리자 | Mt(멘토멘티) | 멘토 상세보기2 | `/Sa/Mt/pop_mentoChoice.do` | `MtController#pop_mentoChoice` | `common/Mt/pop_mentoChoice` | 팝업(메뉴노출N 추정) |
| 191 | 관리자(DB판정) | 관리자 | Ov(해외취업) | 미확인 | `/Sa/Ov/OvSa010M.do` | `OvController#OvSa010M` | `admin/Ov/OvSa010I` |  |
| 192 | 관리자(DB판정) | 관리자 | Pc(교수상담) | 지도교수 상담실적 | `/Sa/Pc/ConDetailStuList.do` | `PcController#ConDetailStuList` | `admin/Pc/PcCp010SL` |  |
| 193 | 관리자(DB판정) | 관리자 | Pc(교수상담) | 지도교수 상담실적 | `/Sa/Pc/PcCp010L.do` | `PcController#CnCp020L` | `admin/Pc/PcCp010L` |  |
| 194 | 관리자(DB판정) | 관리자 | Pc(교수상담) | 개인 상담 신규 작성 화면 | `/Sa/Pc/PcCp010SD.do` | `PcController#PcCp010SD` | `admin/Pc/PcCp010SD` |  |
| 195 | 관리자(DB판정) | 관리자 | Pc(교수상담) | 교수상담 통계 | `/Sa/Pc/PcSt010L.do` | `PcController#PcSt010L` | `admin/Pc/PcSt010L` |  |
| 196 | 관리자(DB판정) | 관리자 | Pf(포트폴리오) | 미확인 | `/Sa/Pf/PortFolioPrint.do` | `UserPortfolioController#PortFolioPrint` | `admin/portfolioStudent/pop_portFolioPrint` |  |
| 197 | 관리자(DB판정) | 관리자 | Pf(포트폴리오) | 미확인 | `/Sa/Pf/SaPfExcel.do` | `ExcelDownload#SaPfExcel` | `admin/portfolioStudent/portFolioList_XLS` |  |
| 198 | 관리자(DB판정) | 관리자 | Re(채용정보) | 관리자 > 해외취업 > 모집 | `/Sa/Re/OvSa010L.do` | `OvController#OvSa010L` | `admin/Ov/OvSa010L` |  |
| 199 | 관리자(DB판정) | 관리자 | Re(채용정보) | 프로그램 실행관리 - 선발자관리 신청자 블랙리스트 - 레이어 팝업 | `/Sa/Re/PgPm012M.do` | `ReController#PgPm012M` | `common/pop_UsrBlk` |  |
| 200 | 관리자(DB판정) | 관리자 | Re(채용정보) | 아르바이트 정보 게시판 상세보기 | `/Sa/Re/ReAb010D.do` | `ReController#ReAb010D` | `admin/Re/ReAb010D` |  |
| 201 | 관리자(DB판정) | 관리자 | Re(채용정보) | 아르바이트 정보 게시판 등록 | `/Sa/Re/ReAb010I.do` | `ReController#ReAb010I` | `admin/Re/ReAb010I` |  |
| 202 | 관리자(DB판정) | 관리자 | Re(채용정보) | 아르바이트 정보 게시판 | `/Sa/Re/ReAb010L.do` | `ReController#ReAb010L` | `admin/Re/ReAb010L` |  |
| 203 | 관리자(DB판정) | 관리자 | Re(채용정보) | 아르바이트 정보 게시판 수정 | `/Sa/Re/ReAb010U.do` | `ReController#ReAb010U` | `admin/Re/ReAb010U` |  |
| 204 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/ReAlbaDetailPop.do` | `ReController#ReAlbaDetailPop` | `common/Re/pop_ReAlbaDetailView` | 팝업(메뉴노출N 추정) |
| 205 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 신청자 게시판 | `/Sa/Re/ReAp020L.do` | `ReController#ReAp020L` | `admin/Re/ReAp020L` |  |
| 206 | 관리자(DB판정) | 관리자 | Re(채용정보) | 공모전 정보 게시판 상세보기 | `/Sa/Re/ReCt010D.do` | `ReController#ReCt010D` | `admin/Re/ReCt010D` |  |
| 207 | 관리자(DB판정) | 관리자 | Re(채용정보) | 공모전 정보 게시판 등록 | `/Sa/Re/ReCt010I.do` | `ReController#ReCt010I` | `admin/Re/ReCt010I` |  |
| 208 | 관리자(DB판정) | 관리자 | Re(채용정보) | 공모전 정보 게시판 | `/Sa/Re/ReCt010L.do` | `ReController#ReCt010L` | `admin/Re/ReCt010L` |  |
| 209 | 관리자(DB판정) | 관리자 | Re(채용정보) | 공모전 정보 게시판 수정 | `/Sa/Re/ReCt010U.do` | `ReController#ReCt010U` | `admin/Re/ReCt010U` |  |
| 210 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/ReDetailPop.do` | `ReController#ReDetailPop` | `common/Re/pop_ReRdDetailView` | 팝업(메뉴노출N 추정) |
| 211 | 관리자(DB판정) | 관리자 | Re(채용정보) | 교육 정보 게시판 상세보기 | `/Sa/Re/ReEc030D.do` | `ReController#ReEc030D` | `admin/Re/ReEc030D` |  |
| 212 | 관리자(DB판정) | 관리자 | Re(채용정보) | 교육 정보 게시판 등록 | `/Sa/Re/ReEc030I.do` | `ReController#ReEc030I` | `admin/Re/ReEc030I` |  |
| 213 | 관리자(DB판정) | 관리자 | Re(채용정보) | 교육 정보 게시판 | `/Sa/Re/ReEc030L.do` | `ReController#ReEc030L` | `admin/Re/ReEc030L` |  |
| 214 | 관리자(DB판정) | 관리자 | Re(채용정보) | 교육 정보 게시판 수정 | `/Sa/Re/ReEc030U.do` | `ReController#ReEc030U` | `admin/Re/ReEc030U` |  |
| 215 | 관리자(DB판정) | 관리자 | Re(채용정보) | 인턴쉽 정보 게시판 상세보기 | `/Sa/Re/ReIs020D.do` | `ReController#ReIs020D` | `admin/Re/ReIs020D` |  |
| 216 | 관리자(DB판정) | 관리자 | Re(채용정보) | 인턴쉽 정보 게시판 등록 | `/Sa/Re/ReIs020I.do` | `ReController#ReIs020I` | `admin/Re/ReIs020I` |  |
| 217 | 관리자(DB판정) | 관리자 | Re(채용정보) | 인턴쉽 정보 게시판 | `/Sa/Re/ReIs020L.do` | `ReController#ReIs020L` | `admin/Re/ReIs020L` |  |
| 218 | 관리자(DB판정) | 관리자 | Re(채용정보) | 인턴쉽 정보 게시판 수정 | `/Sa/Re/ReIs020U.do` | `ReController#ReIs020U` | `admin/Re/ReIs020U` |  |
| 219 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 게시판 상세보기 | `/Sa/Re/ReJo020D.do` | `ReController#ReJo020D` | `admin/Re/ReJo020D` |  |
| 220 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 정보 게시판 | `/Sa/Re/ReJo020L.do` | `ReController#ReJo020L` | `admin/Re/ReJo020L` |  |
| 221 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 등록 | `/Sa/Re/ReJo020M.do` | `ReController#ReJo020M` | `admin/Re/ReJo020I` |  |
| 222 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 수정 | `/Sa/Re/ReJo020U.do` | `ReController#ReJo020U` | `admin/Re/ReJo020U` |  |
| 223 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 게시판 상세보기 | `/Sa/Re/ReMs020D.do` | `ReController#SsJo020D` | `admin/Re/ReMs020D` |  |
| 224 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 정보 게시판 | `/Sa/Re/ReMs020L.do` | `ReController#ReMs020L` | `admin/Re/ReMs020L` |  |
| 225 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 게시판 상세보기 | `/Sa/Re/RePr020D.do` | `ReController#RePr020D` | `admin/Re/RePr020D` |  |
| 226 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 정보 게시판 | `/Sa/Re/RePr020L.do` | `ReController#RePr020L` | `admin/Re/RePr020L` |  |
| 227 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 등록 | `/Sa/Re/RePr020M.do` | `ReController#RePr020M` | `admin/Re/RePr020I` |  |
| 228 | 관리자(DB판정) | 관리자 | Re(채용정보) | 일반채용 수정 | `/Sa/Re/RePr020U.do` | `ReController#RePr020U` | `admin/Re/RePr020U` |  |
| 229 | 관리자(DB판정) | 관리자 | Re(채용정보) | 인재검색 학생 상세 팝업 | `/Sa/Re/RePs010D.do` | `RePsController#RePs010D` | `common/RePs/pop_RePs` |  |
| 230 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsAdvice.do` | `RePsController#RePsAdvice` | `common/RePs/pop_RePs_advice` |  |
| 231 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsEpPartic.do` | `RePsController#RePsEpPartic` | `common/RePs/pop_RePs_EpPartic` |  |
| 232 | 관리자(DB판정) | 관리자 | Re(채용정보) | 취업 현황 | `/Sa/Re/RePsGrjoPrcn.do` | `RePsController#RePsGrjoPrcn` | `common/RePs/pop_RePs_GrjoPrcn` |  |
| 233 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsHakByundong.do` | `RePsController#RePsHakByundong` | `common/RePs/pop_RePs_hakByundong` |  |
| 234 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsHakjuk.do` | `RePsController#RePsHakjuk` | `common/RePs/pop_RePs_hakjuk` |  |
| 235 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsIc2PrmList.do` | `RePsController#RePsIc2PrmList` | `common/RePs/pop_RePs_Ic2PrmList` |  |
| 236 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsJanghak.do` | `RePsController#RePsJanghak` | `common/RePs/pop_RePs_janghak` |  |
| 237 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsPoint.do` | `RePsController#RePsPoint` | `common/RePs/pop_RePs_point` |  |
| 238 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsProfConsult.do` | `RePsController#RePsProfConsult` | `common/RePs/pop_RePs_ProfConList` |  |
| 239 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsStuPlan.do` | `RePsController#RePsStuPlan` | `common/RePs/RePsStuPlan` |  |
| 240 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/RePsTrial.do` | `RePsController#RePsTrial` | `common/RePs/pop_RePsTrial_con` |  |
| 241 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 게시판 상세보기 추천채용 게시판 상세보기로 이동한다. | `/Sa/Re/ReRd010D.do` | `ReController#ReRd010D` | `admin/Re/ReRd010D` |  |
| 242 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 정보 게시판 추천채용 정보 게시판으로 이동한다. | `/Sa/Re/ReRd010L.do` | `ReController#SyBd010M` | `admin/Re/ReRd010L` |  |
| 243 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 등록 추천채용 등록화면으로 이동한다. | `/Sa/Re/ReRd010M.do` | `ReController#ReRd010M` | `admin/Re/ReRd010I` |  |
| 244 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 수정 추천채용 수정으로 이동한다. | `/Sa/Re/ReRd010U.do` | `ReController#ReRd010U` | `admin/Re/ReRd010U` |  |
| 245 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 신청자 관리자 등록 | `/Sa/Re/ReRd011Insert.do` | `ReController#ReRd011Insert` | `admin/Re/ReCt010D<br>redirect:ReRd011L.do` | 분기다중 |
| 246 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 신청자 게시판 | `/Sa/Re/ReRd011L.do` | `ReController#ReRd011L` | `admin/Re/ReRd011L` |  |
| 247 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/ReRd020D.do` | `ReController#ReRd020D` | `admin/Re/ReRd020I` |  |
| 248 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/ReRd020L.do` | `ReController#ReRd020L` | `admin/Re/ReRd020L` |  |
| 249 | 관리자(DB판정) | 관리자 | Re(채용정보) | 추천채용 학생 정보 팝업 | `/Sa/Re/ReRdStudent.do` | `ReController#ReRdStudent` | `mobile/mypageStudent/recommend_app<br>common/Re/pop_ReRdStudent` | 분기다중 |
| 250 | 관리자(DB판정) | 관리자 | Re(채용정보) | 미확인 | `/Sa/Re/ReSt010L.do` | `ReController#ReSt010L` | `admin/Re/ReSt010L` |  |
| 251 | 관리자(DB판정) | 관리자 | Re(채용정보) | 학생 마이페이지 이력서 상세 | `/Sa/Re/ReStRs010MULTI.do` | `ReController#ReStRs010MULTI` | `common/Re/pop_multiRes` |  |
| 252 | 관리자(DB판정) | 관리자 | Re(채용정보) | 기업 리스트 팝업 | `/Sa/Re/SelectComp.do` | `ReController#SelectComp` | `common/pop_selectComp2<br>common/pop_selectComp_m<br>common/pop_selectComp3` | 분기다중 |
| 253 | 관리자(DB판정) | 관리자 | Re(채용정보) | 자격증 리스트 팝업 | `/Sa/Re/SelectLicense.do` | `ReController#SelectLicense` | `common/pop_selectLicense_m<br>common/pop_selectLicense` | 분기다중 |
| 254 | 관리자(DB판정) | 관리자 | Re(채용정보) | 학생 리스트 팝업 | `/Sa/Re/SelectStudent.do` | `ReController#SelectStudent` | `common/Re/pop_selectStudent` |  |
| 255 | 관리자(DB판정) | 관리자 | Rm(진로로드맵) | 진로지도체계 관리 | `/Sa/Rm/RmRd010L.do` | `RmController#RmRd010L` | `admin/Rm/RmRd010L` |  |
| 256 | 관리자(DB판정) | 관리자 | Rm(진로로드맵) | 진로지도체계 추가 팝업 | `/Sa/Rm/RmRd010P.do` | `RmController#RmRd010P` | `admin/Rm/RmRd010P` |  |
| 257 | 관리자(DB판정) | 관리자 | Sm(동문CEO) | 동문 CEO 상세 | `/Sa/Sm/Sm010D.do` | `SmController#Sm010D` | `admin/Sm/Sm010D` |  |
| 258 | 관리자(DB판정) | 관리자 | Sm(동문CEO) | 동문 CEO 조회 | `/Sa/Sm/Sm010L.do` | `SmController#Sm010L` | `admin/Sm/Sm010L` |  |
| 259 | 관리자(DB판정) | 관리자 | Sm(동문CEO) | 동문 CEO 등록 | `/Sa/Sm/Sm010M.do` | `SmController#Sm010M` | `admin/Sm/Sm010I` |  |
| 260 | 관리자(DB판정) | 관리자 | Ss(진로취업카드) | 학생 마이페이지 이력서 상세 | `/Sa/Ss/SsRs010D.do` | `SsController#SsRs010D` | `admin/Ss/SsRs010D` |  |
| 261 | 관리자(DB판정) | 관리자 | Ss(진로취업카드) | 학생 마이페이지 이력서 엑셀다운로드 | `/Sa/Ss/SsRs010ExcelDown.do` | `SsController#EpExcelDown` | `admin/Ss/SsDown_XLS<br>/admin/Ss/SsDownNot_XLS` | 분기다중 |
| 262 | 관리자(DB판정) | 관리자 | Ss(진로취업카드) | 나의 취업희망정보 리스트 | `/Sa/Ss/SsRs010L.do` | `SsController#SsRs010L` | `admin/Ss/SsRs010L` |  |
| 263 | 관리자(DB판정) | 관리자 | Ss(진로취업카드) | 관리자 > 학생현황 | `/Sa/Ss/SsRs020L.do` | `SsController#SsRs020L` | `admin/Ss/SsRs020L` |  |
| 264 | 관리자(DB판정) | 관리자 | St(취업통계) | 대학일자리센터 | `/Sa/St/AcSt010Excel.do` | `StExcelController#AcSt010Excel` | `admin/St/AcSt010L_XLS` |  |
| 265 | 관리자(DB판정) | 관리자 | St(취업통계) | 미확인 | `/Sa/St/pop_StExcelUpload.do` | `StController#pop_StExcelUpload` | `common/St/pop_StExcelUpload` | 팝업(메뉴노출N 추정) |
| 266 | 관리자(DB판정) | 관리자 | St(취업통계) | 미확인 | `/Sa/St/StAnalysis010L.do` | `StController#StAnalysis010L` | `admin/St/StAnalysis010L` |  |
| 267 | 관리자(DB판정) | 관리자 | St(취업통계) | 미확인 | `/Sa/St/StAnalysis020L.do` | `StController#StAnalysis020L` | `admin/St/StAnalysis020L` |  |
| 268 | 관리자(DB판정) | 관리자 | St(취업통계) | 미확인 | `/Sa/St/StDeptGoalConfig010L.do` | `StController#StDeptGoalConfig010L` | `admin/St/SDGC010L` |  |
| 269 | 관리자(DB판정) | 관리자 | St(취업통계) | 등록 | `/Sa/St/StDg010_WriteView.do` | `StController#StDg010_WriteView` | `common/St/pop_StDgWrite<br>/common/St/pop_StDgUpdate` | 분기다중 |
| 270 | 관리자(DB판정) | 관리자 | St(취업통계) | 관리자 취업통계 다운롣, | `/Sa/St/Stdg010Excel.do` | `StExcelController#Stdg010Excel` | `admin/St/StDgList_XLS` |  |
| 271 | 관리자(DB판정) | 관리자 | St(취업통계) | 조사차수관리 목록(surveymng) | `/Sa/St/StDg010L.do` | `StController#StDegreeMn010L` | `admin/St/StDg010L` |  |
| 272 | 관리자(DB판정) | 관리자 | St(취업통계) | 미확인 | `/Sa/St/StDgc10Excel.do` | `StExcelController#StDgc10Excel` | `admin/St/StDgc_XLS` |  |
| 273 | 관리자(DB판정) | 관리자 | St(취업통계) | 졸업생 취업조사 | `/Sa/St/StGe010L.do` | `StController#StGe010L` | `admin/St/StGe010L` |  |
| 274 | 관리자(DB판정) | 관리자 | St(취업통계) | 졸업자 취업현황 상세 | `/Sa/St/StGraduateD.do` | `StGraduateController#StGraduateD` | `admin/St/StGraduateD` |  |
| 275 | 관리자(DB판정) | 관리자 | St(취업통계) | 졸업자 취업현황 엑셀다운로드 | `/Sa/St/StGraduateExcelDown.do` | `StGraduateController#EpExcelDown` | `admin/St/StGraduate_XLS` |  |
| 276 | 관리자(DB판정) | 관리자 | St(취업통계) | 졸업자 취업현황 목록 | `/Sa/St/StGraduateL.do` | `StGraduateController#StGraduateL` | `admin/St/StGraduateL` |  |
| 277 | 관리자(DB판정) | 관리자 | St(취업통계) | 졸업자 취업현황 등록 | `/Sa/St/StGraduateM.do` | `StGraduateController#StGraduateM` | `admin/St/StGraduateM` |  |
| 278 | 관리자(DB판정) | 관리자 | St(취업통계) | 프로그램별 취업률 분석 | `/Sa/St/StPg010L.do` | `StController#StPg` | `admin/St/StPg010L` |  |
| 279 | 관리자(DB판정) | 관리자 | St(취업통계) | 프로그램별 취업률 분석 엑셀다운로드 | `/Sa/St/StPg010L_excel.do` | `StController#StPg010L_excel` | `admin/St/st/StPg010L_excel` |  |
| 280 | 관리자(DB판정) | 관리자 | St(취업통계) | 미확인 | `/Sa/St/StRe010Excel.do` | `StExcelController#StRe010Excel` | `admin/St/StReList_XLS` |  |
| 281 | 관리자(DB판정) | 관리자 | St(취업통계) | 예비 | `/Sa/St/StRe010L.do` | `StController#StRe010L` | `admin/St/StRe010L<br>admin/St/StRe020L` | 분기다중 |
| 282 | 관리자(DB판정) | 관리자 | St(취업통계) | 등록 | `/Sa/St/StRe010U.do` | `StController#StRe010U` | `admin/St/StRe010U<br>admin/St/StRe020U` | 분기다중 |
| 283 | 관리자(DB판정) | 관리자 | St(취업통계) | 미확인 | `/Sa/St/StReportAdd.do` | `StController#StReportAdd` | `common/St/pop_StReportUpload` |  |
| 284 | 관리자(DB판정) | 관리자 | St(취업통계) | 취업통계 결과 목록 | `/Sa/St/StSt010_Search.do` | `StController#StSt010_Search` | `admin/St/StSt010L` |  |
| 285 | 관리자(DB판정) | 관리자 | St(취업통계) | 취업통계 excel download | `/Sa/St/StSt010_SearchExcel.do` | `StController#StSt010_SearchExcel` | `admin/St/StSt010L<br>admin/St/st/StSt010_1001_excel<br>admin/St/st/StSt010_1002_excel<br>admin/St/st/StSt010_1003_excel<br>admin/St/st/StSt010_1005_excel<br>admin/St/st/StSt010_1007_excel<br>admin/St/st/StSt010_2001_excel<br>admin/St/st/StSt010_2002_excel<br>admin/St/st/StSt010_3001_excel<br>admin/St/st/StSt010_3002_excel<br>admin/St/st/StSt010_4001_excel<br>admin/St/st/StSt010_5001_excel<br>admin/St/st/StSt010_1008_excel` | 분기다중 |
| 286 | 관리자(DB판정) | 관리자 | St(취업통계) | 취업통계 | `/Sa/St/StSt010L.do` | `StController#StSt010L` | `admin/St/StSt010L` |  |
| 287 | 관리자(DB판정) | 관리자 | St(취업통계) | KEDI 리스트 | `/Sa/St/StSt020L.do` | `StController#StSt020L` | `admin/St/StSt020L` |  |
| 288 | 관리자(DB판정) | 관리자 | St(취업통계) | KEDI 통계 데이터 | `/Sa/St/StSt020P.do` | `StController#StSt020P` | `admin/St/StSt020P` |  |
| 289 | 관리자(DB판정) | 관리자 | St(취업통계) | KEDI 통계 데이터 조회 팝업 | `/Sa/St/StSt020Pop.do` | `StController#StSt020Pop` | `admin/St/StSt02` | 팝업(메뉴노출N 추정) |
| 290 | 관리자(DB판정) | 관리자 | St(취업통계) | 취업자현황 상세 | `/Sa/St/StStu010D.do` | `StController#StStu010D` | `admin/St/StStu010D` |  |
| 291 | 관리자(DB판정) | 관리자 | St(취업통계) | 취업자현황 상세 - 엑셀 다운로드 | `/Sa/St/StStu010D_excel.do` | `StController#StStu010D_excel` | `admin/St/st/StStu010D_excel` |  |
| 292 | 관리자(DB판정) | 관리자 | St(취업통계) | 취업자현황 목록 | `/Sa/St/StStu010L.do` | `StController#StStu010L` | `admin/St/StStu010L` |  |
| 293 | 관리자(DB판정) | 관리자 | St(취업통계) | 취업자현황 엑셀다운로드 | `/Sa/St/StStu010L_excel.do` | `StController#StStu010L_excel` | `admin/St/st/StStu010L_excel` |  |
| 294 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 미확인 | `/Sa/Sy/SyAe010L.do` | `SyController#SyAe010L` | `admin/Sy/SyAe010L` |  |
| 295 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 미확인 | `/Sa/Sy/SyAh010L.do` | `SyController#SyAh010L` | `admin/Sy/SyAh010L` |  |
| 296 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 권한 그룹 | `/Sa/Sy/SyAm010M.do` | `SyController#SyAm010M` | `admin/Sy/SyAm010D` |  |
| 297 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 메뉴권한 그룹 | `/Sa/Sy/SyAm020M.do` | `SyController#SyAm020M` | `admin/Sy/SyAm020D` |  |
| 298 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 게시판 상세 | `/Sa/Sy/SyBd010D.do` | `SyController#SyBd010D` | `admin/Sy/SyBd010D` |  |
| 299 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 게시판 조회 | `/Sa/Sy/SyBd010L.do` | `SyController#SyBd010L` | `admin/Sy/SyBd010L` |  |
| 300 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 게시판 등록 | `/Sa/Sy/SyBd010M.do` | `SyController#SyBd010M` | `admin/Sy/SyBd010I` |  |
| 301 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 배너관리 | `/Sa/Sy/SyBm010M.do` | `SyController#SyBm010D` | `admin/Sy/SyBm010M` |  |
| 302 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 지역청년 배너관리 | `/Sa/Sy/SyBm020M.do` | `SyController#SyBm020D` | `admin/Sy/SyBm020M<br>/regLogin` | 분기다중 |
| 303 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 신규 기업 담당자 등록 팝업창 | `/Sa/Sy/SyCa010newM.do` | `SyController#SyCa010newM` | `common/Cp/pop_NewM` |  |
| 304 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 코드관리 | `/Sa/Sy/SyCm010M.do` | `SyController#SyCm010M` | `admin/Sy/SyCm010M` |  |
| 305 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 미확인 | `/Sa/Sy/SyCreatePop.do` | `SyController#ReCreatePop` | `admin/Sy/pop_SyUsCreateView` | 팝업(메뉴노출N 추정) |
| 306 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 메뉴 | `/Sa/Sy/SyMn010M.do` | `SyController#SyMn010M` | `admin/Sy/SyMn010D` |  |
| 307 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 미확인 | `/Sa/Sy/SyPo010L.do` | `SyController#SyPo010L` | `admin/Sy/SyPo010L<br>/regLogin` | 분기다중 |
| 308 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 미확인 | `/Sa/Sy/SyPo010M.do` | `SyController#SyPo010M` | `admin/Sy/SyPo010M<br>/regLogin` | 분기다중 |
| 309 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 관리자 > 시스템관리 > SMS발송이력 | `/Sa/Sy/SySms010L.do` | `SyController#SySms010L` | `admin/Sy/SySms010L` |  |
| 310 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 사용자 접속이력 | `/Sa/Sy/SyUs010L.do` | `SyController#sys_useStatistics` | `admin/Sy/SyUs010L` |  |
| 311 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 사용자 접속이력 | `/Sa/Sy/SyUs020L.do` | `SyController#SyUs020L` | `admin/Sy/SyUs020L` |  |
| 312 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 미확인 | `/Sa/Sy/SyUs030L.do` | `SyController#SyUs030L` | `admin/Sy/SyUs030L` |  |
| 313 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 접속통계 | `/Sa/Sy/SyUs040L.do` | `SyController#SyUs040L` | `admin/Sy/SyUs040L` |  |
| 314 | 관리자(DB판정) | 관리자 | Sy(시스템관리) | 접근경로 | `/Sa/Sy/SyUs050L.do` | `SyController#SyUs050L` | `admin/Sy/SyUs050L` |  |
| 315 | 관리자(DB판정) | 관리자 | Wa(장기결석/학사경고) | 관리자 > 회원관리 > 장기결석자, 학사경고자 현황 | `/Sa/Wa/Wa010L.do` | `WaController#MnTo010L` | `admin/Wa/Wa010L` |  |
| 316 | 학생/공용(DB판정) | 사용자 | Bd(게시판) | 아르바이트 아이디 | `/user/Bd/BdCm010P.do` | `BdUserController#BdCm010P` | `common/pop_unknownidpwd` |  |
| 317 | 학생/공용(DB판정) | 사용자 | Bd(게시판) | 아르바이트 아이디 | `/user/Bd/BdCm011P.do` | `BdUserController#BdCm011P` | `common/pop_confirmidpwd` |  |
| 318 | 학생/공용(DB판정) | 사용자 | Bd(게시판) | 취업뉴스 상세보기로 이동한다. | `/user/Bd/BdCm030D.do` | `BdUserController#BdCm030D` | `user/Bd/BdCm030D` |  |
| 319 | 학생/공용(DB판정) | 사용자 | Bd(게시판) | 인크루트 취업뉴스 정보 조회 | `/user/Bd/BdCm030L.do` | `BdUserController#BdCm030L` | `user/Bd/BdCm030L` |  |
| 320 | 학생/공용(DB판정) | 사용자 | Bd(게시판) | 지역청년 공통 게시판 | `/user/Bd/BdCm040L.do` | `BdUserController#BdCm040L` | `user/Bd/BdCm040L` |  |
| 321 | 학생/공용(DB판정) | 사용자 | Bd(게시판) | 게시판 상세 | `/user/Bd/itCm010C.do` | `BdUserController#itCm010C` | `user/It/ItCm010C` |  |
| 322 | 학생/공용(DB판정) | 사용자 | Bd(게시판) | 미확인 | `/user/Bd/surveyViewUser.do` | `BdUserController#surveyViewUser` | `common/surveyView` |  |
| 323 | 교수(DB판정) | 사용자 | Ca(역량) | 역량진단관리 조회(교수) | `/user/Ca/CaMp010L.do` | `CaMpController#diagnosisMngL` | `user/Ca/Mp/CaMp010L` |  |
| 324 | 교수(DB판정) | 사용자 | Ca(역량) | 역량진단관리 조회(교수) | `/user/Ca/CaMpDm010P.do` | `CaMpController#diagnosisMngPro` | `common/Ca/pop_CaDiagnosisMngPro` |  |
| 325 | 교수(DB판정) | 사용자 | Ca(역량) | 학생별 역량현황 상세 페이지 | `/user/Ca/CaMpSs010D.do` | `CaMpController#goalStateDetail` | `user/Ca/Mp/CaSs010D` |  |
| 326 | 교수(DB판정) | 사용자 | Ca(역량) | 학생별 역량현황 | `/user/Ca/CaMpSs010L.do` | `CaMpController#goalState` | `user/Ca/Mp/CaSs010L` |  |
| 327 | 학생/공용(DB판정) | 사용자 | Ca(역량) | 학생 마이페이지 만족도조사 상세 | `/user/Ca/CaMsDm010D.do` | `CaMsController#diagnosisMngD` | `common/Ca/pop_MsCaDiagnosisMng` |  |
| 328 | 학생/공용(DB판정) | 사용자 | Ca(역량) | 역량진단관리 조회(학생) | `/user/Ca/CaMsDm010L.do` | `CaMsController#diagnosisMngL` | `user/Ca/Ms/CaDm010L` |  |
| 329 | 학생/공용(DB판정) | 사용자 | Ca(역량) | 역량진단관리 결과 팝업 | `/user/Ca/CaMsDm010R.do` | `CaMsController#diagnosisResult` | `common/Ca/pop_CaDiagnosisResult` |  |
| 330 | 학생/공용(DB판정) | 사용자 | Ca(역량) | 핵심 역량 시뮬레이션 현황 | `/user/Ca/CaMsEp010D.do` | `CaMsController#eduPlannerDetail` | `user/Ca/Ms/CaEp010D` |  |
| 331 | 학생/공용(DB판정) | 사용자 | Ca(역량) | 핵심 역량 시뮬레이션 현황 | `/user/Ca/CaMsEp010V.do` | `CaMsController#eduPlannerView` | `user/Ca/Ms/CaEp010V` |  |
| 332 | 학생/공용(DB판정) | 사용자 | Ca(역량) | 학생별 역량현황 상세 페이지 | `/user/Ca/CaMsSs010D.do` | `CaMsController#goalStateDetail` | `user/Ca/Ms/CaSs010D` |  |
| 333 | 학생/공용(DB판정) | 사용자 | Ca(역량) | 미확인 | `/user/Ca/pop_CaGoalStateDetail.do` | `CaUserController#pop_goalStateDetail` | `common/pop_CaGoalStateDetailPrint` | 팝업(메뉴노출N 추정) |
| 334 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 조교 마이페이지 > 전담교수 배정 팝업 | `/user/Co/Advis.do` | `CoMasController#Advis` | `common/Co/popSearchAdviser` |  |
| 335 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 상담 신청Pop | `/user/Co/CoAppD.do` | `CoUserController#CnAppD` | `mobile/counseling/counsel_app<br>/common/Co/pop_CoApplication` | 분기다중 |
| 336 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoAppS.do` | `CoUserController#CoAppS` | `mobile/counseling/counsel_app<br>/common/Co/pop_CoApplication_S` | 분기다중 |
| 337 | 조교(DB판정) | 사용자 | Co(상담관리) | 조교 마이페이지 > 전담교수 배정 유무 확인 화면 | `/user/Co/CoAs010L.do` | `CoMasController#CoAs010L` | `user/Co/Mas/CoMas010L` |  |
| 338 | 조교(DB판정) | 사용자 | Co(상담관리) | 마이페이지(조교) > 전담교수 상담실적 > 상세 | `/user/Co/CoAs020DL.do` | `CoMasController#CoAs020DL` | `user/Co/Mas/CoMas020D` |  |
| 339 | 조교(DB판정) | 사용자 | Co(상담관리) | 마이페이지(조교) > 전담교수 상담실적 | `/user/Co/CoAs020L.do` | `CoMasController#CoAs020L` | `user/Co/Mas/CoMas020L` |  |
| 340 | 조교(DB판정) | 사용자 | Co(상담관리) | 학생별 역량현황 | `/user/Co/CoAs030L.do` | `CoMasController#CoAs030L` | `user/Co/Mas/CoMas030L` |  |
| 341 | 조교(DB판정) | 사용자 | Co(상담관리) | 학생별 역량현황 | `/user/Co/CoAs040L.do` | `CoMasController#CoAs040L` | `user/Co/Mas/CoMas040L` |  |
| 342 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 사용자 > 지역청년상담신청 팝업 | `/user/Co/CoAy010L.do` | `CoUserController#CoAy010L` | `user/Co/CoAy010L` |  |
| 343 | 직원(DB판정) | 사용자 | Co(상담관리) | 직원 상담 | `/user/Co/CoEm010L.do` | `CoUserController#CoEm010L` | `user/Co/CoEm010L` |  |
| 344 | 직원(DB판정) | 사용자 | Co(상담관리) | 직원 상담 신규 작성 화면으로 이동한다. | `/user/Co/CoEm010W.do` | `CoUserController#CoEm010W` | `user/Co/CoEm010I` |  |
| 345 | 직원(DB판정) | 사용자 | Co(상담관리) | 직원 상담 내역 상세보기로 이동한다. | `/user/Co/CoEm020D.do` | `CoUserController#SsCp010D` | `user/Co/CoEm020D` |  |
| 346 | 직원(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoEm020L.do` | `CoUserController#SsCp010L` | `user/Co/CoEm020L` |  |
| 347 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc010ConTypeChk.do` | `CoMcController#CoMc010ConTypeChk` | `common/Co/pop_ConTypeCheck` |  |
| 348 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc010ConWrite.do` | `CoMcController#CoMc010ConWrite` | `common/Co/pop_ConsultingWrite` |  |
| 349 | 상담사(DB판정) | 사용자 | Co(상담관리) | 상담사 예약상담 | `/user/Co/CoMc010L.do` | `CoMcController#CoMc010L` | `user/Co/Mc/CoMc010L` |  |
| 350 | 상담사(DB판정) | 사용자 | Co(상담관리) | PopUp 예약상담 현황정보 조회 | `/user/Co/CoMc010P.do` | `CoMcController#CoMc010P` | `common/Co/pop_ConsultingInfo` |  |
| 351 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc010P_View.do` | `CoMcController#CoMc010P_View` | `common/Co/pop_ConsultingInfo_View` |  |
| 352 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc010TrialConWrite.do` | `CoMcController#CoMc010TrialConWrite` | `common/Co/pop_TrialConsultingWrite` |  |
| 353 | 상담사(DB판정) | 사용자 | Co(상담관리) | 상담사 일정관리 | `/user/Co/CoMc030L.do` | `CoMcController#CtCm030L` | `user/Co/Mc/CoMc030L` |  |
| 354 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc030MonthL.do` | `CoMcController#CoMc030MonthL` | `user/Co/Mc/CoMc030MonthL` |  |
| 355 | 상담사(DB판정) | 사용자 | Co(상담관리) | PopUp 일정등록 | `/user/Co/CoMc030P.do` | `CoMcController#CtCm030P` | `common/Co/pop_userWeekToDoReg` |  |
| 356 | 상담사(DB판정) | 사용자 | Co(상담관리) | 상담결과관리 | `/user/Co/CoMc030Result.do` | `CoMcController#CoCm020Result` | `user/Co/Mc/CoMc030Result<br>/user/Co/Mc/CoMc030T_Result` | 분기다중 |
| 357 | 상담사(DB판정) | 사용자 | Co(상담관리) | 공통 통계 | `/user/Co/CoMc040L.do` | `CoMcController#AdSt010D` | `user/Co/Mc/CoMc040L<br>/user/Co/Mc/CoMc040L_XLS` | 분기다중 |
| 358 | 상담사(DB판정) | 사용자 | Co(상담관리) | 상담사 > 마이페이지 > 집단상담 관리 | `/user/Co/CoMc050L.do` | `CoMcController#CoMc050L` | `user/Co/Mc/CoMc050L` |  |
| 359 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc060L.do` | `CoMcController#CoMc060L` | `user/Co/Mc/CoMc060L` |  |
| 360 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc070ExcelDown.do` | `CoMcController#CoMc070ExcelDown` | `user/Co/Mc/CoMc070L_XLS` |  |
| 361 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMc070L.do` | `CoMcController#CoMc070L` | `user/Co/Mc/CoMc070L` |  |
| 362 | 상담사(DB판정) | 사용자 | Co(상담관리) | 통계 | `/user/Co/CoMc080L.do` | `CoMcController#CoMc080L` | `user/Co/Mc/CoMc080L` |  |
| 363 | 상담사(DB판정) | 사용자 | Co(상담관리) | 통계 | `/user/Co/CoMc080P.do` | `CoMcController#CoMc080P` | `user/Co/Mc/CoMc081P<br>/user/Co/Mc/CoMc082P<br>/user/Co/Mc/CoMc083P<br>/user/Co/Mc/CoMc081E<br>/user/Co/Mc/CoMc082E<br>/user/Co/Mc/CoMc083E` | 분기다중 |
| 364 | 상담사(DB판정) | 사용자 | Co(상담관리) | 통계-비교과프로그램 | `/user/Co/CoMc084P.do` | `CoMcController#CoMc084P` | `user/Co/Mc/CoMc084P` |  |
| 365 | 상담사(DB판정) | 사용자 | Co(상담관리) | 통계-비교과프로그램 수료자 | `/user/Co/CoMc085P.do` | `CoMcController#CoMc085P` | `user/Co/Mc/CoMc085P` |  |
| 366 | 상담사(DB판정) | 사용자 | Co(상담관리) | 상담통계 | `/user/Co/CoMc090L.do` | `CoMcController#CoMc090L` | `user/Co/Mc/CoMc090L<br>/user/Co/Mc/CoMc091L<br>/user/Co/Mc/CoMc092L<br>/user/Co/Mc/CoMc093L<br>/user/Co/Mc/CoMc094L<br>/user/Co/Mc/CoMc095L<br>/user/Co/Mc/CoMc090E<br>/user/Co/Mc/CoMc091E<br>/user/Co/Mc/CoMc092E<br>/user/Co/Mc/CoMc093E<br>/user/Co/Mc/CoMc094E<br>/user/Co/Mc/CoMc095E` | 분기다중 |
| 367 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMcGroupConAdd.do` | `CoMcController#CoMcGroupConAdd` | `common/Co/pop_GroupConsultAdd` |  |
| 368 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMcGroupConCntClick.do` | `CoMcController#CoMcGroupConCntClick` | `common/Co/pop_GroupConsultCntView` |  |
| 369 | 상담사(DB판정) | 사용자 | Co(상담관리) | 심리검사 엑셀 데이터 셋팅 | `/user/Co/CoMcReAssing.do` | `CoMcController#CoMcReAssing` | `common/Co/pop_ConsultReAssign` |  |
| 370 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMcSchdule_pop.do` | `CoMcController#CoMcSchdule_pop` | `common/Co/pop_ConsultSchdule` | 팝업(메뉴노출N 추정) |
| 371 | 상담사(DB판정) | 사용자 | Co(상담관리) | PopUp 예약상담 변경정보 조회 | `/user/Co/CoMcStuStatus.do` | `CoMcController#CnStuStatus` | `common/Co/pop_CoStuStatus` |  |
| 372 | 상담사(DB판정) | 사용자 | Co(상담관리) | 상담사 > 마이페이지 > 집단상담 관리 | `/user/Co/CoMcTrialGroupConAdd.do` | `CoMcController#CoMcTrialGroupConAdd` | `common/Co/pop_TrialGroupConsultAdd` |  |
| 373 | 상담사(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMcTrialGroupConCntClick.do` | `CoMcController#CoMcTrialGroupConCntClick` | `common/Co/pop_GroupConsultCntView` |  |
| 374 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMp040MonthL.do` | `PcMpController#CoMp040MonthL` | `user/Pc/Mp/CoMp040MonthL` |  |
| 375 | 교수(DB판정) | 사용자 | Co(상담관리) | 교수 상암 미입력 상담 팝업 2025.04.02 학생여러명 등록될수있게 신규생성 | `/user/Co/CoMpResult.do` | `PcMpController#CoMpResult` | `user/Pc/Mp/CoMpResult` |  |
| 376 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMpSchdule_pop.do` | `PcMpController#CoMpSchdule_pop` | `common/Co/pop_MpConsultSchdule` | 팝업(메뉴노출N 추정) |
| 377 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMpViewResult.do` | `PcMpController#CoMpViewResult` | `user/Pc/Mp/CoMpViewResult` |  |
| 378 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 상담 내역 상세보기 | `/user/Co/CoMs010D.do` | `CoMsController#CoMs010D` | `mobile/mypageStudent/counsel_status_view<br>/common/Co/pop_CoApplicationView` | 분기다중 |
| 379 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 상담 내역 게시판 | `/user/Co/CoMs010L.do` | `CoMsController#CoMs010L` | `mobile/mypageStudent/counsel_status<br>/user/Co/Ms/CoMs010L` | 분기다중 |
| 380 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | PopUp 상담 현황 상세조회_인쇄 | `/user/Co/CoMs010Print.do` | `CoMsController#SsCnCm010Print` | `common/Co/pop_userConsultingInfoPrint` |  |
| 381 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoMs010SD.do` | `CoMsController#CoMs010SD` | `common/Co/pop_CoApplicationView_S` |  |
| 382 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 지도교수 온라인 상담 내역 게시판으로 이동한다. | `/user/Co/CoMs020L.do` | `CoMsController#CoMs020L` | `user/Co/Ms/CoMs020L` |  |
| 383 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 지도교수 온라인 상담 내역 게시판으로 이동한다. | `/user/Co/CoMs030L.do` | `CoMsController#CoMs030L` | `user/Co/Ms/CoMs030L` |  |
| 384 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 지도교수 온라인 | `/user/Co/CoMs040L.do` | `CoMsController#CoMs040L` | `user/Co/Ms/CoMs040L` |  |
| 385 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 상담 내역 취소팝업 | `/user/Co/CoMsCancelPop.do` | `CoMsController#SsCnCancelPop` | `mobile/mypageStudent/counsel_status_cancel<br>/common/Co/pop_CancelReason` | 분기다중 · 팝업(메뉴노출N 추정) |
| 386 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 상담 내역 취소상세팝업 | `/user/Co/CoMsCancelViewPop.do` | `CoMsController#CoMsCancelViewPop` | `common/Co/pop_CancelReasonView` | 팝업(메뉴노출N 추정) |
| 387 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 학생상담실적 리스트 | `/user/Co/CoPe020L.do` | `CoUserController#CoPe020L` | `user/Co/CoPe020L` |  |
| 388 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 학생상담 통계 데이터 | `/user/Co/CoPe020P.do` | `CoUserController#CoPe020P` | `user/Co/CoPe020P` |  |
| 389 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | KEDI 통계 데이터 조회 팝업 | `/user/Co/CoPe020Pop.do` | `CoUserController#CoPe020Pop` | `user/Co/CoPe02` | 팝업(메뉴노출N 추정) |
| 390 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoProfSchduleList.do` | `CoUserController#CoProfSchduleList` | `user/Co/CoProfSchduleL` |  |
| 391 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 학생검색 | `/user/Co/CoSs010L.do` | `CoUserController#CoSs010L` | `user/Co/CoSs010L` |  |
| 392 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 학생검색 팝업 | `/user/Co/CoStuInfoPop.do` | `CoMcController#manualpostList` | `common/pop_ConsultingStu` | 팝업(메뉴노출N 추정) |
| 393 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 방문 상담 | `/user/Co/CoVi010M.do` | `CoUserController#CoVi010M` | `mobile/counseling/counsel_calendar<br>user/Co/CoVi010L` | 분기다중 |
| 394 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoVi020.do` | `CoUserController#CoVi020` | `user/Co/CoVi020.do` |  |
| 395 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 검사 신청 | `/user/Co/CoVi020M.do` | `CoUserController#CoVi020M` | `mobile/counseling/counsel_calendar<br>user/Co/CoVi020L` | 분기다중 |
| 396 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/CoVi040M.do` | `CoUserController#CoVi040M` | `user/Co/CoVi040L` |  |
| 397 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 상담사 선택Pop | `/user/Co/CoViConL.do` | `CoUserController#CnViConL` | `mobile/counseling/counsel_conList<br>/common/Co/pop_CoConSelect` | 분기다중 |
| 398 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/offLineConDetail.do` | `CoMsController#offLineConDetail` | `common/Co/pop_offlineContProf` |  |
| 399 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/onlineConDetail.do` | `CoMsController#onlineConDetail` | `common/Co/pop_onlineContProf<br>/common/pop_notAccess` | 분기다중 |
| 400 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/onlineConProf.do` | `PcMpController#onlineConProf` | `user/Pc/Mp/pop_onlineContProf` |  |
| 401 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/onlineConProfView.do` | `PcMpController#onlineConProfView` | `common/Co/pop_onlineContProfView` |  |
| 402 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 직원 > 집단 상담 신규 작성 화면으로 이동한다. | `/user/Co/pop_CoEm010W.do` | `CoUserController#pop_CnCp010M` | `user/Co/pop_CoEm010I` | 팝업(메뉴노출N 추정) |
| 403 | 학생/공용(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/pop_CoMpSchdule.do` | `PcMpController#pop_CoMpSchdule` | `common/Co/pop_profWeekToDoReg` | 팝업(메뉴노출N 추정) |
| 404 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/pop_offLineProfCont.do` | `CoUserController#pop_offLineProfCont` | `common/Co/pop_offLineProfCont` | 팝업(메뉴노출N 추정) |
| 405 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/pop_offLineProfContDir.do` | `PcMpController#pop_offLineProfContDir` | `common/Co/pop_offLineProfContDir` | 팝업(메뉴노출N 추정) |
| 406 | 교수(DB판정) | 사용자 | Co(상담관리) | 교수 상암 미입력 상담 팝업 2025.04.02 학생여러명 등록될수있게 신규생성 | `/user/Co/pop_offLineProfContDirNew.do` | `PcMpController#pop_offLineProfContDirNew` | `common/Co/pop_offLineProfContDirNew` | 팝업(메뉴노출N 추정) |
| 407 | 교수(DB판정) | 사용자 | Co(상담관리) | 미확인 | `/user/Co/pop_onlineProfCont.do` | `CoUserController#pop_onlineProfCont` | `common/Co/pop_CoReqOnlineMP` | 팝업(메뉴노출N 추정) |
| 408 | 기업(DB판정) | 사용자 | Cp(기업회원) | 미확인 | `/user/Cp/CpCa010L.do` | `CpUserController#CpCa010L` | `user/Cp/CpCa010L` |  |
| 409 | 기업(DB판정) | 사용자 | Cp(기업회원) | 미확인 | `/user/Cp/CpCl010D.do` | `CpUserController#CpCl010D` | `user/Cp/CpCl010D` |  |
| 410 | 기업(DB판정) | 사용자 | Cp(기업회원) | 사용자 기업 회원정보 상세 페이지 | `/user/Cp/CpCl020D.do` | `CpUserController#CpCl020D` | `user/Cp/CpCl020D` |  |
| 411 | 기업(DB판정) | 사용자 | Cp(기업회원) | 사용자 기업회원 조회 | `/user/Cp/CpCl020L.do` | `CpUserController#CpCl020L` | `user/Cp/CpCl020L` |  |
| 412 | 기업(DB판정) | 사용자 | Cp(기업회원) | 기업정보 수정페이지 | `/user/Cp/CpMc010I.do` | `CpMcController#SyCa020M` | `user/Cp/CpMc010I` |  |
| 413 | 학생/공용(DB판정) | 사용자 | Ec(취업동아리) | 학생 > 취업동아리 > 활동관리 | `/user/Ec/Ec010L.do` | `EcUserController#Ec010L` | `user/Ec/Ec010L` |  |
| 414 | 학생/공용(DB판정) | 사용자 | Em(취업정보) | 사용자 > 취업정보 > 취업공지 리스트 | `/user/Em/Em010L.do` | `EmUserController#Em010L` | `user/Em/Em010L` |  |
| 415 | 학생/공용(DB판정) | 사용자 | Em(취업정보) | 사용자 > 취업정보 > 한신 취업솔루션 | `/user/Em/Em020L.do` | `EmUserController#Em020L` | `user/Em/Em020L` |  |
| 416 | 학생/공용(DB판정) | 사용자 | Em(취업정보) | 사용자 > 취업정보 > 취업사이트 다모아 | `/user/Em/Em040L.do` | `EmUserController#Em040L` | `user/Em/Em040L` |  |
| 417 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 파일 다운로드 | `/user/Ep/EpActFormDown.do` | `EpActController#formDown` | `admin/Ep/file_down2` |  |
| 418 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpActiveAllNoticePopup.do` | `EpActController#EpActiveAllNoticePopup` | `common/EpAct/pop_allBd_notice` | 팝업(메뉴노출N 추정) |
| 419 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 프로그램 참여 활동내역 보기 | `/user/Ep/EpActivePopup.do` | `EpActController#EpActivePopup` | `common/EpAct/pop_EpActive_popup<br>/common/EpAct/pop_EpActive_popup_group_list` | 분기다중 · 팝업(메뉴노출N 추정) |
| 420 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpBdInput.do` | `EpActController#EpBdInput` | `common/EpAct/pop_EpActive_bd_input` |  |
| 421 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpBdMain.do` | `EpActController#EpBdMain` | `common/EpAct/pop_EpActive_bd_main` |  |
| 422 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpBdView.do` | `EpActController#EpBdView` | `common/EpAct/pop_EpActive_bd_view` |  |
| 423 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpBlackList.do` | `EpMnController#EpBlackList` | `user/Ep/Mn/EpMnBlackList` |  |
| 424 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 담당자개인문구 수정화면 | `/user/Ep/EpChrcEditPopup.do` | `EpMnController#EpChrcEditPopup` | `common/Ep/popEpChrcEditPopup` | 팝업(메뉴노출N 추정) |
| 425 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 담당자개인문구 목록화면 | `/user/Ep/EpChrcListPopup.do` | `EpMnController#EpChrcListPopup` | `common/Ep/popEpChrcListPopup` | 팝업(메뉴노출N 추정) |
| 426 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpCt010L.do` | `EpUserController#mentaltest` | `user/Ep/EpCt010L` |  |
| 427 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 공통 통계 | `/user/Ep/EpExcelDown.do` | `EpExcelController#EpExcelDown` | `common/Ep/EpDown_XLS` |  |
| 428 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFbInput.do` | `EpActController#EpFbInput` | `common/ext_activeIF_matCost_write<br>/common/EpAct/pop_EpActive_fundBuy_input` | 분기다중 |
| 429 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFbMain.do` | `EpActController#EpFbMain` | `common/EpAct/pop_EpActive_fundBuy_main` |  |
| 430 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFbView.do` | `EpActController#EpFbView` | `common/EpAct/pop_EpActive_fundBuy_view` |  |
| 431 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFcInput.do` | `EpActController#EpFcInput` | `common/EpAct/pop_EpActive_fundCalcu_input` |  |
| 432 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFcMain.do` | `EpActController#EpFcMain` | `common/EpAct/pop_EpActive_fundCalcu_main` |  |
| 433 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFcView.do` | `EpActController#EpFcView` | `common/EpAct/pop_EpActive_fundCalcu_view` |  |
| 434 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFnInput.do` | `EpActController#EpFnInput` | `common/EpAct/pop_EpActive_fundChange_input` |  |
| 435 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFnMain.do` | `EpActController#EpFnMain` | `common/EpAct/pop_EpActive_fundChange_main` |  |
| 436 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFnView.do` | `EpActController#EpFnView` | `common/EpAct/pop_EpActive_fundChange_view` |  |
| 437 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFpInput.do` | `EpActController#EpFpInput` | `common/EpAct/pop_EpActive_fundPlan_input` |  |
| 438 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFpMain.do` | `EpActController#EpFpMain` | `common/EpAct/pop_EpActive_fundPlan_main` |  |
| 439 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFpView.do` | `EpActController#EpFpView` | `common/EpAct/pop_EpActive_fundPlan_view` |  |
| 440 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFtInput.do` | `EpActController#EpFtInput` | `common/EpAct/pop_EpActive_fundTally_input` |  |
| 441 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFtMain.do` | `EpActController#EpFtMain` | `common/EpAct/pop_EpActive_fundTally_main` |  |
| 442 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpFtView.do` | `EpActController#EpFtView` | `common/EpAct/pop_EpActive_fundTally_view` |  |
| 443 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 그룹등록 | `/user/Ep/EpMn010G.do` | `EpMnController#EpMn010G` | `user/Ep/Mn/EpMn010G` |  |
| 444 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 등록 | `/user/Ep/EpMn010G_Insert.do` | `EpMnController#extAddGroupInsert` | `jsonView<br>redirect:/user/Ep/EpMn010GD.do` | 분기다중 |
| 445 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 그룹상세 | `/user/Ep/EpMn010GD.do` | `EpMnController#extAddGroupDetail` | `user/Ep/Mn/EpMn010GD` |  |
| 446 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 그룹등록 | `/user/Ep/EpMn010GU.do` | `EpMnController#EpMn010GU` | `user/Ep/Mn/EpMn010G` |  |
| 447 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 조회 | `/user/Ep/EpMn010L.do` | `EpMnController#extMng` | `user/Ep/Mn/EpMn010L` |  |
| 448 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 개인등록 | `/user/Ep/EpMn010P.do` | `EpMnController#EpMn010P` | `user/Ep/Mn/EpMn010P` |  |
| 449 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 등록 | `/user/Ep/EpMn010P_Insert.do` | `EpMnController#extAddPersonInsert` | `jsonView<br>redirect:/user/Ep/EpMn010GD.do<br>redirect:/user/Ep/EpMn010PD.do` | 분기다중 |
| 450 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 개인상세 | `/user/Ep/EpMn010PD.do` | `EpMnController#extAddPersonDetail` | `user/Ep/Mn/EpMn010PD` |  |
| 451 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 개인등록 | `/user/Ep/EpMn010U.do` | `EpMnController#EpMn010U` | `user/Ep/Mn/EpMn010P` |  |
| 452 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 등록 | `/user/Ep/EpMn013ARD.do` | `EpMnController#extAddReqArt_detail` | `user/Ep/EpMn013ARD` |  |
| 453 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMn020L.do` | `EpMnController#main` | `user/Ep/Mn/EpMn020L` |  |
| 454 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMn030I.do` | `EpMnController#prmCodeMngInput` | `user/Ep/Mn/EpMn030I` |  |
| 455 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMn030L.do` | `EpMnController#prmCodeMngMain` | `user/Ep/Mn/EpMn030L` |  |
| 456 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMn040L.do` | `EpMnController#seal` | `user/Ep/Mn/EpMn040L` |  |
| 457 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 만족도조사 상세 | `/user/Ep/EpMn050D.do` | `EpMnController#SySv010D` | `admin/Sy/SySv010D` |  |
| 458 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 만족도조사관리 조회 | `/user/Ep/EpMn050L.do` | `EpMnController#SySv010L` | `user/Ep/Mn/EpMn051L<br>/user/Ep/Mn/EpMn050L` | 분기다중 |
| 459 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 만족도조사 등록 & 수정 | `/user/Ep/EpMn050M.do` | `EpMnController#SySv010M` | `user/Ep/Mn/EpMn050M` |  |
| 460 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 마이페이지 만족도조사 상세 | `/user/Ep/EpMn050R.do` | `EpMnController#SsSv010R` | `user/Ep/Mn/EpMn050R` |  |
| 461 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 등록 | `/user/Ep/EpMnAddReqArt.do` | `EpMnController#extAddReqArt` | `user/Ep/EpMn013AR` |  |
| 462 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 조회 - 달력 | `/user/Ep/EpMnCalendar.do` | `EpMnController#extMngCalendar` | `user/Ep/Mn/EpMn010C` |  |
| 463 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 그룹상세 | `/user/Ep/EpMng010GD.do` | `EpUserController#extAddGroupDetail` | `user/Ep/EpMng010GD` |  |
| 464 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 신청-그룹생성 | `/user/Ep/EpMng010GD_Prc.do` | `EpUserController#extGroupAppPrc` | `user/Ep/EpMng010GD_Prc` |  |
| 465 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 신청-그룹생성 | `/user/Ep/EpMng010GD_Prc_modify.do` | `EpUserController#EpMng010GD_Prc_modify` | `user/Ep/EpMng010GD_Prc_modify` |  |
| 466 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 조회 | `/user/Ep/EpMng010L.do` | `EpUserController#extMng` | `user/Ep/EpMng010L` |  |
| 467 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 개인상세 | `/user/Ep/EpMng010PD.do` | `EpUserController#extAddPersonDetail` | `user/Ep/EpMng010PD` |  |
| 468 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 조회 - 월력 | `/user/Ep/EpMnSchedule.do` | `EpMnController#extMngSchedule` | `user/Ep/Mn/EpMn010S` |  |
| 469 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 프로그램등록 국적 참가대상 설정 | `/user/Ep/EpMnsearchNat.do` | `EpMnController#searchSel2` | `user/Ep/EpMn011C` |  |
| 470 | 비교과운영자(DB판정) | 사용자 | Ep(비교과프로그램) | 프로그램 참가대상 부서팝업 | `/user/Ep/EpMnselectPrmTrgtDept.do` | `EpMnController#pop_selectTrgtDept` | `user/Ep/EpMn012EP` |  |
| 471 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMp010L.do` | `EpMpController#EpMp010L` | `user/Ep/Mp/EpMp010L` |  |
| 472 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMp020L.do` | `EpMpController#EpMp020L` | `user/Ep/Mp/EpMp020L` |  |
| 473 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 신청자 조회 | `/user/Ep/EpMp030L.do` | `EpMpController#EpMp030L` | `mobile/extracurricular/extState<br>/user/Ep/Mp/EpMp030L` | 분기다중 |
| 474 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 학생 마이페이지 만족도조사 상세 | `/user/Ep/EpMp040D.do` | `EpMpController#EpMp040D` | `user/Ep/Mp/EpMp040D` |  |
| 475 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 학생 마이페이지 만족도조사 조회 | `/user/Ep/EpMp040L.do` | `EpMpController#EpMp040L` | `user/Ep/Mp/EpMp040L` |  |
| 476 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMp050L.do` | `EpMpController#EpMp050L` | `user/Ep/Mp/EpMp050L` |  |
| 477 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMp060L.do` | `EpMpController#EpMp060L` | `user/Ep/Mp/EpMp060L` |  |
| 478 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMtInput.do` | `EpActController#EpMtInput` | `common/EpAct/pop_EpActive_meet_input` |  |
| 479 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMtMain.do` | `EpActController#EpMtMain` | `common/EpAct/pop_EpActive_meet_main` |  |
| 480 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpMtView.do` | `EpActController#EpMtView` | `common/EpAct/pop_EpActive_meet_view` |  |
| 481 | 지역청년(별도세션) | 사용자 | Ep(비교과프로그램) | 지역청년 진로·취업 프로그램 상세조회 | `/user/Ep/EpReg010D.do` | `EpUserController#EpReg010D` | `user/Ep/EpReg010D` |  |
| 482 | 지역청년(별도세션) | 사용자 | Ep(비교과프로그램) | 지역청년 진로·취업 프로그램 목록 | `/user/Ep/EpReg010L.do` | `EpUserController#EpReg010L` | `user/Ep/EpReg010L` |  |
| 483 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpRpInput.do` | `EpActController#EpRpInput` | `common/EpAct/pop_EpActive_report_input` |  |
| 484 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpRpMain.do` | `EpActController#EpRpMain` | `common/EpAct/pop_EpActive_report_main` |  |
| 485 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpRpView.do` | `EpActController#EpRpView` | `common/EpAct/pop_EpActive_report_view` |  |
| 486 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpRsInput.do` | `EpActController#EpRsInput` | `common/EpAct/pop_EpActive_result_input` |  |
| 487 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpRsMain.do` | `EpActController#EpRsMain` | `common/EpAct/pop_EpActive_result_main` |  |
| 488 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpRsView.do` | `EpActController#EpRsView` | `common/EpAct/pop_EpActive_result_view` |  |
| 489 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpSvMain.do` | `EpActController#EpSvMain` | `common/EpAct/pop_EpActive_survey_main` |  |
| 490 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpSvView.do` | `EpActController#EpSvView` | `common/EpAct/pop_EpActive_survey_view` |  |
| 491 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpTaInput.do` | `EpActController#EpTaInput` | `common/EpAct/pop_EpActive_tripApp_input` |  |
| 492 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpTaMain.do` | `EpActController#EpTaMain` | `common/EpAct/pop_EpActive_tripApp_main` |  |
| 493 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpTaView.do` | `EpActController#EpTaView` | `common/EpAct/pop_EpActive_tripApp_view` |  |
| 494 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 개인 신청자 조회 | `/user/Ep/EpTb020D.do` | `EpMnController#EpTb020D` | `user/Ep/Mn/EpTb010D` |  |
| 495 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 그룹 유형2 신청그룹관리 목록 | `/user/Ep/EpTb020GD.do` | `EpMnController#EpTb020GD` | `user/Ep/Mn/EpTb020GD` |  |
| 496 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 상세 탭 설문화면 | `/user/Ep/EpTb030D.do` | `EpMnController#EpTb030D` | `user/Ep/Mn/EpTb030D` |  |
| 497 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 선발그룹 목록 | `/user/Ep/EpTb030GD.do` | `EpMnController#EpTb030GD` | `user/Ep/Mn/EpTb030GD` |  |
| 498 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 만족도관리 | `/user/Ep/EpTb040D.do` | `EpMnController#satisFactionMng` | `user/Ep/Mn/EpTb040D` |  |
| 499 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 그룹 신청자 조회 | `/user/Ep/EpTb040GD.do` | `EpMnController#extGroupApp` | `user/Ep/Mn/EpTb040GD` |  |
| 500 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 외부인관리 | `/user/Ep/EpTb050D.do` | `EpMnController#extOutsiderMng` | `user/Ep/Mn/EpTb050D` |  |
| 501 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 상세 탭 결과보고서 화면 조회 | `/user/Ep/EpTb060D.do` | `EpMnController#extResultReport` | `user/Ep/Mn/EpTb060D<br>/user/Ep/EpTb060D_doc` | 분기다중 |
| 502 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpTrInput.do` | `EpActController#EpTrInput` | `common/EpAct/pop_EpActive_tripReport_input` |  |
| 503 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpTrMain.do` | `EpActController#EpTrMain` | `common/EpAct/pop_EpActive_tripReport_main` |  |
| 504 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/EpTrView.do` | `EpActController#EpTrView` | `common/EpAct/pop_EpActive_tripReport_view` |  |
| 505 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/extAppPrc.do` | `EpMnController#extAppPrc` | `common/extAppPrcMobile<br>/common/Ep/extAppPrc_view<br>/common/Ep/extAppPrc` | 분기다중 |
| 506 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/extAppPrc_Print.do` | `EpMnController#extAppPrc_Print` | `common/Ep/extAppPrc_print` |  |
| 507 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/extAppPrcReqDetail.do` | `EpUserController#extAppPrcReqDetail` | `common/Ep/extAppPrc_modify` |  |
| 508 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 선발그룹 관리 | `/user/Ep/extGroupBindMng.do` | `EpMnController#extGroupBindMng` | `user/Ep/Mn/EpMn010GM` |  |
| 509 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 선발그룹 관리(Layer) | `/user/Ep/extGroupBindMngLayer.do` | `EpMnController#extGroupBindMngLayer` | `common/Ep/pop_extGroupBindMng` |  |
| 510 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 그룹지정 레이어 | `/user/Ep/extGroupMake.do` | `EpMnController#extGroupMake` | `common/pop_extGroupMake` |  |
| 511 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 조회 - 달력 | `/user/Ep/extMngCalendar.do` | `EpUserController#extMngCalendar` | `user/Ep/extMngCalendar` |  |
| 512 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 조회 - 월력 | `/user/Ep/extMngSchedule.do` | `EpUserController#extMngSchedule` | `user/Ep/extMngSchedule` |  |
| 513 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 내 그룹보기 | `/user/Ep/extMyGroup.do` | `EpUserController#extMyGroup` | `common/Ep/pop_extMyGroup` |  |
| 514 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 외부인관리 - 외부인명단 엑셀업로드팝업 화면 | `/user/Ep/extOutsiderExcelUploadPop.do` | `EpMnController#extOutsiderExcelUploadPop` | `user/Ep/pop_OutsiderExcelUpload` | 팝업(메뉴노출N 추정) |
| 515 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 외부인관리 - 그룹지정 레이어 | `/user/Ep/extOutsiderGroupMake.do` | `EpMnController#extOutsiderGroupMake` | `common/Ep/pop_extOutsiderGroupMake` |  |
| 516 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 관리 차수정보 | `/user/Ep/extStep.do` | `EpMnController#extStep` | `common/Ep/pop_extStep` |  |
| 517 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 관리 차수추가화면 | `/user/Ep/extStepAdd.do` | `EpMnController#extStepAdd` | `common/Ep/pop_extStepAdd` |  |
| 518 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 관리 차수수정화면 | `/user/Ep/extStepModify.do` | `EpMnController#extStepModify` | `common/Ep/pop_extStepModify` |  |
| 519 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/extTabSurvey_select.do` | `EpMnController#extTabSurveyMng_Insert` | `common/Ep/pop_selectSurvey` |  |
| 520 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 지원 신청서 팝업 | `/user/Ep/group_app_popup.do` | `EpMnController#group_app_popup` | `common/group_app_popup` | 팝업(메뉴노출N 추정) |
| 521 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 선발그룹 목록 | `/user/Ep/Mp/EpMp010DL.do` | `EpMpController#EpMp010DL` | `user/Ep/Mp//EpMp010DL` |  |
| 522 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 선발그룹 팀보기 | `/user/Ep/Mp/EpMp010V.do` | `EpMpController#EpMp010V` | `user/Ep/Mp/EpMp010V` |  |
| 523 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과 프로그램 push 전송 | `/user/Ep/Mp/EpPushSend.do` | `EpMnController#EpPushSend` | `common/Pc/sendPushPopup` |  |
| 524 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 신청자 조회 | `/user/Ep/Ms/EpMs010L.do` | `EpMsController#extState` | `user/Ep/Ms/EpMs010L` |  |
| 525 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 신청자 조회 | `/user/Ep/Ms/EpMs010LP.do` | `EpMpController#EpMs010LP` | `user/Ep/Mp/EpMs010LP` |  |
| 526 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 비교과프로그램 관심 비교과 프로그램 | `/user/Ep/Ms/EpMs020L.do` | `EpMsController#EpMs020L` | `user/Ep/Ms/EpMs020L` |  |
| 527 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/Ms/EpMs030L.do` | `EpMsController#EpMs030L` | `user/Ep/Ms/EpMs030L` |  |
| 528 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 학생 마이페이지 만족도조사 상세 | `/user/Ep/Ms/EpMs040D.do` | `EpMsController#SsSv010D` | `user/Ep/Ms/EpMs040D` |  |
| 529 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 학생 마이페이지 만족도조사 조회 | `/user/Ep/Ms/EpMs040L.do` | `EpMsController#SsSv10L` | `user/Ep/Ms/EpMs040L` |  |
| 530 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 학생 마이페이지 만족도조사 조회 | `/user/Ep/Ms/EpMs040LP.do` | `EpMsController#EpMs040LP` | `user/Ep/Ms/EpMs040L` |  |
| 531 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/Ms/EpMs050L.do` | `EpMsController#EpMs050L` | `user/Ep/Ms/EpMs050L` |  |
| 532 | 학생(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/Ms/EpMs060L.do` | `EpMsController#EpMs060L` | `user/Ep/Ms/EpMs060L` |  |
| 533 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 프로그램 신청하기 | `/user/Ep/pgmAplcApply.do` | `EpUserController#pgmAplcApply` | `common/Ep/pop_detailPgmAplcApply<br>/regLogin` | 분기다중 |
| 534 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/prmGroupMemSearch.do` | `EpActController#prmGroupMemSearch` | `common/EpAct/pop_EpGroupMemSearch` |  |
| 535 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/prmGroupMemSearchList.do` | `EpActController#prmGroupMemSearchList` | `common/EpAct/pop_EpGroupMemSearchList` |  |
| 536 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/profSearch.do` | `EpActController#profSearch` | `common/EpAct/pop_EpProfSearch` |  |
| 537 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/profSearchList.do` | `EpActController#profSearchList` | `common/EpAct/pop_EpProfSearchList` |  |
| 538 | 학생/공용(DB판정) | 사용자 | Ep(비교과프로그램) | 미확인 | `/user/Ep/satisFactionMng_select.do` | `EpMnController#satisFactionMng_select` | `common/Ep/pop_selectSatisFation` |  |
| 539 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 비교과 활동 관리 조회 | `/user/Ex/ExAm010L.do` | `ExUserController#ExItemAppMng010L` | `user/Ex/ExAm010L` |  |
| 540 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 핵심역량 로드맵 상세 | `/user/Ex/ExCm010D.do` | `ExUserController#ExCm010D` | `common/Ex/pop_ExCm` |  |
| 541 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 핵심역량 로드맵 조회 | `/user/Ex/ExCm010L.do` | `ExUserController#ExCm010L` | `user/Ex/ExCm011L<br>/user/Ex/ExCm010L` | 분기다중 |
| 542 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 비교과 활동 점수표 조회 | `/user/Ex/ExCs010L.do` | `ExUserController#ExCs010L` | `user/Ex/ExCs010L` |  |
| 543 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 핵심역량 진단도구 컨텐츠 | `/user/Ex/ExCt010L.do` | `ExUserController#ExCt010L` | `user/Ex/ExCt010L` |  |
| 544 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 마일리지 신청현황 조회 | `/user/Ex/ExIa010L.do` | `ExUserController#ExItemApp010L` | `user/Ex/ExIa010L` |  |
| 545 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 역량신청화면 | `/user/Ex/ExIm010A.do` | `ExUserController#ExItemMng010_app` | `common/Ex/pop_ExItemApp<br>/common/Ex/pop_ExItemAppInfo` | 분기다중 |
| 546 | 비교과운영자(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 비교과 활동 승인관리 상세조회 | `/user/Ex/ExMnIa010D.do` | `ExMnController#IrItemAll010D` | `user/Ex/Mn/ExIa010D` |  |
| 547 | 비교과운영자(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 비교과 활동 승인관리 조회 | `/user/Ex/ExMnIa010L.do` | `ExMnController#IrItemApprove010L` | `user/Ex/Mn/ExIa010L` |  |
| 548 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 역량점수 현황 멀티 수료 확인서 | `/user/Ex/ExMultiCfmPrint.do` | `ExUserController#ExMultiCfmPrint` | `common/pop_ExMultiConfirmPrint` |  |
| 549 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 비교과프로그램 관리 개인신청 엑셀업로드 | `/user/Ex/extExcelUploadPop.do` | `EpMnController#extExcelUploadPop` | `common/Ex/pop_ExtExcelUpload` | 팝업(메뉴노출N 추정) |
| 550 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 비교과프로그램 관리 향상도조사 엑셀업로드 | `/user/Ex/extSurveyExcelUploadPop.do` | `EpMnController#extSurveyExcelUploadPop` | `common/Ex/pop_ExtSurveyExcelUpload` | 팝업(메뉴노출N 추정) |
| 551 | 학생/공용(DB판정) | 사용자 | Ex(비교과활동(마일리지)) | 추천프로그램 목록 - 레이어 팝업 | `/user/Ex/RecommPrm.do` | `ExUserController#RecommPrm` | `common/Ex/pop_RecommPrm` |  |
| 552 | 상담사(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/CoSimriResultView.do` | `FuController#CoSimriResultView` | `common/Co/pop_CoSimriResultView` |  |
| 553 | 상담사(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/CoSimriResultWrite.do` | `FuController#CoSimriResultWrite` | `common/Co/pop_CoSimriResultWrite` |  |
| 554 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp010L.do` | `FuUserController#mentaltest` | `user/Fu/FuAp010L` |  |
| 555 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp010P.do` | `FuUserController#pop_mentaltest` | `common/Fu/FuAp010P` |  |
| 556 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp011L.do` | `FuUserController#mentaltests` | `user/Fu/FuAp011L` |  |
| 557 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp020C.do` | `FuUserController#jobInfo_condition` | `user/Fu/FuAp020C` |  |
| 558 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp020K.do` | `FuUserController#jobInfo_keyworkd` | `user/Fu/FuAp020K` |  |
| 559 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp020L.do` | `FuUserController#jobInfo` | `user/Fu/FuAp020L` |  |
| 560 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp020P.do` | `FuUserController#pop_jobInfo` | `common/Fu/FuAp021P<br>/common/Fu/FuAp022P<br>/common/Fu/FuAp023P<br>/common/Fu/FuAp024P<br>/common/Fu/FuAp025P<br>/common/Fu/FuAp026P` | 분기다중 |
| 561 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp030D.do` | `FuUserController#jobProspect_detail` | `user/Fu/FuAp030D` |  |
| 562 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp030K.do` | `FuUserController#jobProspect_keyword` | `user/Fu/FuAp030K` |  |
| 563 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp030L.do` | `FuUserController#jobProspect` | `user/Fu/FuAp030L` |  |
| 564 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp040D.do` | `FuUserController#jobDictionary_detail` | `user/Fu/FuAp040D` |  |
| 565 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp040K.do` | `FuUserController#jobDictionary_keyword` | `user/Fu/FuAp040K` |  |
| 566 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp040L.do` | `FuUserController#jobDictionary` | `user/Fu/FuAp040L` |  |
| 567 | 교수(DB판정) | 사용자 | Fu(진로목표/워크넷) | 교수 마이페이지 > 학생별 진로목표 현황 | `/user/Fu/FuAp050A.do` | `FuUserController#FuAp050A` | `user/Fu/FuAp050A` |  |
| 568 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp050Chart.do` | `FuUserController#FuAp050Chart` | `common/pop_CourChart` |  |
| 569 | 교수(DB판정) | 사용자 | Fu(진로목표/워크넷) | 교수 마이페이지 > 학생별 진로목표 상세현황 | `/user/Fu/FuAp050D.do` | `FuUserController#FuAp050D` | `user/Fu/FuAp050D` |  |
| 570 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 학생 > 진로설정 > 진로목표설정 | `/user/Fu/FuAp050L.do` | `FuUserController#mentaltest2` | `user/Fu/FuAp050L` |  |
| 571 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp060D.do` | `FuUserController#empinfo_view` | `user/Fu/FuAp060D` |  |
| 572 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp060L.do` | `FuUserController#empinfo` | `user/Fu/FuAp060L` |  |
| 573 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp070L.do` | `FuUserController#internInfo` | `user/Fu/FuAp070L` |  |
| 574 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp080L.do` | `FuUserController#jobkoreaInfo` | `user/Fu/FuAp080L` |  |
| 575 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp090L.do` | `FuUserController#saraminjob` | `user/Fu/FuAp090L` |  |
| 576 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp100L.do` | `FuUserController#FuAp100L` | `user/Fu/FuAp100L` |  |
| 577 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp110L.do` | `FuUserController#FuAp110L` | `user/Fu/FuAp110L` |  |
| 578 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp120D.do` | `FuUserController#FuAp120D` | `user/Fu/FuAp120D` |  |
| 579 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp120L.do` | `FuUserController#FuAp120L` | `user/Fu/FuAp120L` |  |
| 580 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuAp130L.do` | `FuUserController#FuAp130L` | `user/Fu/FuAp130L` |  |
| 581 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 미확인 | `/user/Fu/FuApCour050D.do` | `FuUserController#FuApCour050D` | `user/Fu/FuApCour050D` |  |
| 582 | 학생/공용(DB판정) | 사용자 | Fu(진로목표/워크넷) | 학생 마이페이지 > 진로목표 상세현황 | `/user/Fu/FuAs050D.do` | `FuUserController#FuAs050D` | `user/Fu/FuAs050D` |  |
| 583 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 미확인 | `/user/In/InCt010L.do` | `InUserController#mentaltest` | `user/In/InCt010L` |  |
| 584 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 미확인 | `/user/In/InCt020L.do` | `InUserController#InCt020L` | `user/In/InCt020L` |  |
| 585 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 미확인 | `/user/In/InCt030L.do` | `InUserController#InCt030L` | `user/In/InCt030L` |  |
| 586 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 미확인 | `/user/In/InCt040L.do` | `InUserController#InCt040L` | `user/In/InCt040L` |  |
| 587 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 취업예측분석시스템 기업별 역량 검색 상세 조회 | `/user/In/InCt050D.do` | `InUserController#InCt050D` | `user/In/InCt050D<br>redirect:/main.do` | 분기다중 |
| 588 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 취업예측분석시스템 기업별 역량 검색 화면 | `/user/In/InCt050L.do` | `InUserController#InCt050L` | `user/In/InCt050L<br>redirect:/main.do` | 분기다중 |
| 589 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 취업예측분석시스템 내 역량 기준 기업 검색 상세 조회 | `/user/In/InCt060D.do` | `InUserController#InCt060D` | `user/In/InCt060D<br>redirect:/main.do` | 분기다중 |
| 590 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 취업예측분석시스템 내 역량 기준 기업 검색 목록 | `/user/In/InCt060L.do` | `InUserController#InCt060L` | `user/In/InCt060L<br>redirect:/main.do` | 분기다중 |
| 591 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 내 역량 기준 기업 검색 - 내 희망 역량 목록 | `/user/In/InCt060LTab2.do` | `InUserController#InCt060LTab2` | `user/In/InCt060LTab2<br>redirect:/main.do` | 분기다중 |
| 592 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 미확인 | `/user/In/InCt060POPUP.do` | `InUserController#mileageState` | `user/In/InCt060POPUP` | 팝업(메뉴노출N 추정) |
| 593 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 취업예측분석시스템 AI기반 취업예측 분석 목록 | `/user/In/InCt070L.do` | `InUserController#InCt070L` | `user/In/InCt070L<br>redirect:/main.do` | 분기다중 |
| 594 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 미확인 | `/user/In/InCt070LTab2.do` | `InUserController#InCt070LTab2` | `user/In/InCt070LTab2<br>redirect:/main.do` | 분기다중 |
| 595 | 지역청년(별도세션) | 사용자 | In(취업예측분석) | 지역청년 찾아오시는길 | `/user/In/InCt080L.do` | `InUserController#InCt070L` | `user/In/InCt080L` |  |
| 596 | 기업(DB판정) | 사용자 | infaco(INFACO) | 공통 > INFACO(가족회사) > INFACO 현황 > 목록 | `/user/infaco/current_state.do` | `CpUserController#current_state` | `user/infaco/current_state<br>/mobile/infaco/state` | 분기다중 |
| 597 | 기업(DB판정) | 사용자 | infaco(INFACO) | 공통 > INFACO(가족회사) > INFACO 현황 > 지도 | `/user/infaco/current_state_map.do` | `CpUserController#current_state_map` | `user/infaco/current_state_map<br>mobile/infaco/state_map` | 분기다중 |
| 598 | 기업(DB판정) | 사용자 | infaco(INFACO) | 공통 > INFACO(가족회사) > INFACO 현황 > 상세 | `/user/infaco/current_state_view.do` | `CpUserController#current_state_view` | `mobile/infaco/state_view<br>/user/infaco/current_state_view` | 분기다중 |
| 599 | 기업(DB판정) | 사용자 | infaco(INFACO) | 미확인 | `/user/infaco/pop_password_change.do` | `CpUserController#pop_password_change` | `common/pop_changePW` | 팝업(메뉴노출N 추정) |
| 600 | 학생(DB판정) | 사용자 | Ip(취업수기) | 학생 마이페이지 > 취업수기 > 조회화면 | `/user/Ip/IpBd010D.do` | `MyIpController#IpBd010D` | `user/Ip/IpBd010D` |  |
| 601 | 학생(DB판정) | 사용자 | Ip(취업수기) | 학생 마이페이지 > 취업수기 > 등록화면 | `/user/Ip/IpBd010I.do` | `MyIpController#MySt020M` | `user/Ip/IpBd010I` |  |
| 602 | 학생(DB판정) | 사용자 | Ip(취업수기) | 학생 마이페이지 > 취업수기 > 목록조회 | `/user/Ip/IpBd010L.do` | `MyIpController#IpBd010L` | `user/Ip/IpBd010L` |  |
| 603 | 학생(DB판정) | 사용자 | Ip(취업수기) | 미확인 | `/user/Ip/IpBd010Print.do` | `MyIpController#IpBd010Print` | `user/Ip/IpBd010Print` |  |
| 604 | 학생(DB판정) | 사용자 | Ip(취업수기) | 미확인 | `/user/Ip/IpBdOv010I.do` | `MyIpController#IpBdOv010I` | `user/Ip/IpBdOv010I` |  |
| 605 | 학생(DB판정) | 사용자 | Ip(취업수기) | 미확인 | `/user/Ip/IpBdOv010L.do` | `MyIpController#IpBdOv010L` | `user/Ip/IpBdOv010L` |  |
| 606 | 지역청년(별도세션) | 사용자 | It(센터소개) | 학생 진로취업지원체계 | `/user/It/ItCt010L.do` | `ItUserController#ItCt010L` | `user/It/ItCt010L` |  |
| 607 | 지역청년(별도세션) | 사용자 | It(센터소개) | 대학일자리플러스센터 소개 | `/user/It/ItCt020L.do` | `ItUserController#ItCt020L` | `user/It/ItCt020L` |  |
| 608 | 지역청년(별도세션) | 사용자 | It(센터소개) | 업무안내 | `/user/It/ItCt030L.do` | `ItUserController#ItCt030L` | `user/It/ItCt030L` |  |
| 609 | 지역청년(별도세션) | 사용자 | It(센터소개) | 지역청년 대학일자리플러스센터 소개 | `/user/It/ItCt040L.do` | `ItUserController#ItCt040L` | `user/It/ItCt040L` |  |
| 610 | 지역청년(별도세션) | 사용자 | It(센터소개) | 지역청년 조직도 | `/user/It/ItCt050L.do` | `ItUserController#ItCt050L` | `user/It/ItCt050L` |  |
| 611 | 지역청년(별도세션) | 사용자 | It(센터소개) | 지역청년 졸업생 특화 프로그램 | `/user/It/ItCt060L.do` | `ItUserController#ItCt060L` | `user/It/ItCt060L` |  |
| 612 | 지역청년(별도세션) | 사용자 | It(센터소개) | 지역청년 고교생 맞춤형 고용서비스 | `/user/It/ItCt070L.do` | `ItUserController#ItCt070L` | `user/It/ItCt070L` |  |
| 613 | 지역청년(별도세션) | 사용자 | It(센터소개) | 지역청년 재학생 맞춤형 고용서비스 | `/user/It/ItCt080L.do` | `ItUserController#ItCt080L` | `user/It/ItCt080L` |  |
| 614 | 학생/공용(DB판정) | 사용자 | Ki(센터안내) | 취업전략센터 찾아오시는 길 상세보기로 이동한다. | `/user/Ki/KiCm050D.do` | `BdUserController#KiCm050D` | `mobile/introduction/location<br>user/Ki/KiCm050D` | 분기다중 |
| 615 | 학생/공용(DB판정) | 사용자 | Ki(센터안내) | 취업전략센터 인사말 상세보기로 이동한다. | `/user/Ki/KiGt010D.do` | `BdUserController#KiGt010D` | `mobile/introduction/greeting<br>user/Ki/KiGt010D` | 분기다중 |
| 616 | 학생/공용(DB판정) | 사용자 | Ki(센터안내) | 취업전략센터 사이트 맵 상세보기로 이동한다. | `/user/Ki/KiMa060D.do` | `BdUserController#KiMa060D` | `mobile/introduction/location<br>user/Ki/KiMa060D` | 분기다중 |
| 617 | 학생/공용(DB판정) | 사용자 | Ki(센터안내) | 취업전략센터 조직도 상세보기로 이동한다. | `/user/Ki/KiOg030D.do` | `BdUserController#KiOg030D` | `mobile/introduction/organization<br>user/Ki/KiOg030D` | 분기다중 |
| 618 | 학생/공용(DB판정) | 사용자 | Ki(센터안내) | 취업전략센터 직원소개 상세보기로 이동한다. | `/user/Ki/KiSi040D.do` | `BdUserController#KiSi040D` | `mobile/introduction/staff<br>user/Ki/KiSi040D` | 분기다중 |
| 619 | 학생/공용(DB판정) | 사용자 | Ki(센터안내) | 취업전략센터 업무 및 구성 상세보기로 이동한다. | `/user/Ki/KiWf020D.do` | `BdUserController#KiWf020D` | `mobile/introduction/workForm<br>user/Ki/KiWf020D` | 분기다중 |
| 620 | 학생/공용(DB판정) | 사용자 | login | 미확인 | `/user/login/initSsoLoginAction.do` | `MgntIndexController#initSsoLoginAction` | `user/sso/login/loginDev` |  |
| 621 | 학생/공용(DB판정) | 사용자 | login | 미확인 | `/user/login/loginMove.do` | `LoginDumyController#loginMove` | `user/Co/loginMove` |  |
| 622 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 > 마이페이지 > 멘토 활동 관리 > 상세보기 | `/user/Mt/Mm/MtMmBoard_view.do` | `MtMmController#MtMmBoard_view` | `user/Mt/Mm/MtMmBoard_view` |  |
| 623 | 멘토(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 > 마이페이지 > 멘티현황 | `/user/Mt/MtMm010L.do` | `MtMmController#MtMm010L` | `user/Mt/Mm/MtMm010L` |  |
| 624 | 멘토(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 > 마이페이지 > 멘토 활동 관리 | `/user/Mt/MtMm020L.do` | `MtMmController#MtMm020L` | `user/Mt/Mm/MtMm020L` |  |
| 625 | 멘토(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 > 마이페이지 > 멘티현황 | `/user/Mt/MtMm030M.do` | `MtMmController#MtMm030M` | `user/Mt/Mm/MtMm030M` |  |
| 626 | 멘토(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 > 마이페이지 > 멘토 활동 관리 > 등록,수정 | `/user/Mt/MtMmBoard_write.do` | `MtMmController#MtMmBoard_write` | `user/Mt/Mm/MtMmBoard_write` |  |
| 627 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 학생 > 마이페이지 > 나의 멘토링 | `/user/Mt/MtMs010L.do` | `MtMsController#MtMs010L` | `user/Mt/Ms/MtMs010L` |  |
| 628 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 사용자 > CKU! 우리함께 > 선배랑 동문이랑 | `/user/Mt/MtUs010L.do` | `MtUserController#MtUs010L` | `user/Mt/MtUs010L` |  |
| 629 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 사용자 > 검사 | `/user/Mt/MtUs020L.do` | `MtUserController#MtUs020L` | `user/Mt/MtUs020L` |  |
| 630 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 비밀번호 변경 팝업창 | `/user/Mt/pop_changePwdMento.do` | `MtMmController#pop_changePwdMento` | `common/Mt/pop_changePwdMento` | 팝업(메뉴노출N 추정) |
| 631 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 상세 팝업 | `/user/Mt/pop_MenteeView.do` | `MtUserController#pop_MenteeView` | `common/Mt/pop_MentoView` | 팝업(메뉴노출N 추정) |
| 632 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 멘토 상세 팝업(카드형) | `/user/Mt/pop_MenteeViewC.do` | `MtUserController#pop_MenteeViewC` | `common/Mt/pop_MentoViewC` | 팝업(메뉴노출N 추정) |
| 633 | 학생/공용(DB판정) | 사용자 | Mt(멘토멘티) | 멘티 등록 팝업 | `/user/Mt/pop_MenteeWrite.do` | `MtUserController#pop_MenteeWrite` | `common/Mt/pop_MenteeWrite` | 팝업(메뉴노출N 추정) |
| 634 | 학생(DB판정) | 사용자 | My(마이페이지) | 역량진단관리 결과 팝업 | `/user/My/diagnosisResult.do` | `MyStController#diagnosisResult` | `common/cap_diagnosisResult_popup` |  |
| 635 | 학생(DB판정) | 사용자 | My(마이페이지) | 나의 진로설계서 3단계 교과학습계획 팝업 | `/user/My/MyCuStep3_Pop.do` | `MyCuController#MyCuStep3_Pop` | `user/My/pop_MySt020P3` | 팝업(메뉴노출N 추정) |
| 636 | 학생(DB판정) | 사용자 | My(마이페이지) | 나의 진로설계서 3단계 비교과학습계획 팝업 | `/user/My/MyCuStep3_Pop2.do` | `MyCuController#MyCuStep3_Pop2` | `user/My/pop_MySt021P3` | 팝업(메뉴노출N 추정) |
| 637 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MyCuStepAll_Pop.do` | `MyCuController#MyCuStepAll_Pop` | `user/My/pop_MyCourAllView` | 팝업(메뉴노출N 추정) |
| 638 | 학생(DB판정) | 사용자 | My(마이페이지) | 지도교수 > 마이페이지 > 마이홈 | `/user/My/MyPf011L.do` | `MyPfController#MySt011L` | `user/My/MyPf011L` |  |
| 639 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt011L.do` | `MyStController#MySt011L` | `user/My/MySt011L` |  |
| 640 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt020D.do` | `CodingController#MySt020D` | `user/My/MySt020D` |  |
| 641 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt020L.do` | `CodingController#MySt020L` | `user/My/MySt020L` |  |
| 642 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt020M.do` | `CodingController#MySt020M` | `user/My/MySt020I` |  |
| 643 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt021L.do` | `CodingController#MySt021L` | `user/My/MySt021L` |  |
| 644 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt030L.do` | `CodingController#MySt030L` | `user/My/MySt030L` |  |
| 645 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt031L.do` | `CodingController#MySt031L` | `user/My/MySt031L` |  |
| 646 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt040D.do` | `CodingController#MySt040D` | `user/My/MySt040D` |  |
| 647 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt040L.do` | `CodingController#MySt040L` | `user/My/MySt040L` |  |
| 648 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt041L.do` | `CodingController#MySt041L` | `user/My/MySt041L` |  |
| 649 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt050D.do` | `CodingController#MySt050D` | `user/My/MySt050D` |  |
| 650 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt050L.do` | `CodingController#MySt050L` | `user/My/MySt050L` |  |
| 651 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt050M.do` | `CodingController#MySt050M` | `user/My/MySt050I` |  |
| 652 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt060L.do` | `CodingController#MySt060L` | `user/My/MySt060L` |  |
| 653 | 학생(DB판정) | 사용자 | My(마이페이지) | 미확인 | `/user/My/MySt070L.do` | `CodingController#MySt070L` | `user/My/MySt070L` |  |
| 654 | 학생(DB판정) | 사용자 | mypage(마이페이지) | 마이홈 > 심리검사 결과 팝업 | `/user/mypage/MySt011P.do` | `MyStController#MySt011P` | `user/My/pop_MySt011P` |  |
| 655 | 학생(DB판정) | 사용자 | mypage(마이페이지) | 미확인 | `/user/mypage/MySt011P2.do` | `MyStController#MySt011P2` | `user/My/pop_MySt011P2` |  |
| 656 | 학생(DB판정) | 사용자 | mypage(마이페이지) | 미확인 | `/user/mypage/MySt011P3.do` | `MyStController#MySt011P3` | `user/My/pop_MySt011P3` |  |
| 657 | 학생(DB판정) | 사용자 | mypage(마이페이지) | 미확인 | `/user/mypage/MySt011P4.do` | `MyStController#MySt011P4` | `user/My/pop_MySt011P4` |  |
| 658 | 기업(DB판정) | 사용자 | mypage_company(마이페이지(기업)) | 미확인 | `/user/mypage_company/comm_surveyList.do` | `CpUserController#comm_surveyList` | `user/survey_list` |  |
| 659 | 기업(DB판정) | 사용자 | mypage_company(마이페이지(기업)) | 관리자 > INFACO(가족회사) > INFACO 관리 > 등록 | `/user/mypage_company/infaco_myEdit.do` | `CpUserController#infaco_manage_write` | `user/Cp/infaco_myEdit` |  |
| 660 | 기업(DB판정) | 사용자 | mypage_company(마이페이지(기업)) | 설문 등록 팝업 | `/user/mypage_company/survey_view.do` | `CpUserController#surveyEditGo` | `user/survey_view_popup` |  |
| 661 | 기업(DB판정) | 사용자 | mypage_company(마이페이지(기업)) | 설문 등록 팝업 | `/user/mypage_company/survey_write.do` | `CpUserController#surveyUser` | `user/survey_write_popup` |  |
| 662 | 학생(DB판정) | 사용자 | mypage_counsel(마이페이지(상담)) | 미확인 | `/user/mypage_counsel/comm_surveyList.do` | `CoMcController#comm_surveyList` | `user/survey_list` |  |
| 663 | 학생(DB판정) | 사용자 | mypage_counsel(마이페이지(상담)) | 설문 등록 팝업 | `/user/mypage_counsel/survey_view.do` | `CoMcController#surveyEditGo` | `user/survey_view_popup` |  |
| 664 | 학생(DB판정) | 사용자 | mypage_counsel(마이페이지(상담)) | 설문 등록 팝업 | `/user/mypage_counsel/survey_write.do` | `CoMcController#surveyUser` | `user/survey_write_popup` |  |
| 665 | 학생(DB판정) | 사용자 | mypage_mng(마이페이지(운영)) | 미확인 | `/user/mypage_mng/comm_surveyList.do` | `MyMgController#comm_surveyList` | `user/survey_list` |  |
| 666 | 학생(DB판정) | 사용자 | mypage_mng(마이페이지(운영)) | 설문 등록 팝업 | `/user/mypage_mng/survey_view.do` | `MyMgController#surveyEditGo` | `user/survey_view_popup` |  |
| 667 | 학생(DB판정) | 사용자 | mypage_mng(마이페이지(운영)) | 설문 등록 팝업 | `/user/mypage_mng/survey_write.do` | `MyMgController#surveyUser` | `user/survey_write_popup` |  |
| 668 | 학생(DB판정) | 사용자 | mypage_prof(마이페이지(교수)) | 미확인 | `/user/mypage_prof/comm_surveyList.do` | `MyPfController#comm_surveyList` | `user/survey_list` |  |
| 669 | 학생(DB판정) | 사용자 | mypage_prof(마이페이지(교수)) | 설문 등록 팝업 | `/user/mypage_prof/survey_view.do` | `MyPfController#surveyEditGo` | `user/survey_view_popup` |  |
| 670 | 학생(DB판정) | 사용자 | mypage_prof(마이페이지(교수)) | 설문 등록 팝업 | `/user/mypage_prof/survey_write.do` | `MyPfController#surveyUser` | `user/survey_write_popup` |  |
| 671 | 학생(DB판정) | 사용자 | mypage_student(마이페이지(학생)) | 미확인 | `/user/mypage_student/comm_surveyList.do` | `MyStController#comm_surveyList` | `user/survey_list` |  |
| 672 | 학생(DB판정) | 사용자 | mypage_student(마이페이지(학생)) | 설문 등록 팝업 | `/user/mypage_student/survey_view.do` | `MyStController#surveyEditGo` | `user/survey_view_popup` |  |
| 673 | 학생(DB판정) | 사용자 | mypage_student(마이페이지(학생)) | 설문 등록 팝업 | `/user/mypage_student/survey_write.do` | `MyStController#surveyUser` | `user/survey_write_popup` |  |
| 674 | 학생/공용(DB판정) | 사용자 | Pa(기타) | 미확인 | `/user/Pa/PaCa010L.do` | `PaUserController#PaCa010L` | `user/Pa/PaCa010L` |  |
| 675 | 교수(DB판정) | 사용자 | Pc(교수상담) | 지도교수 push 전송 | `/user/Pc/Mp/PcPushSend.do` | `PcMpController#PcPushSend` | `common/Pc/sendPushPopup` |  |
| 676 | 조교(DB판정) | 사용자 | Pc(교수상담) | 조교 > 마이페이지 > 전담교수 상담실적 다운로드 | `/user/Pc/PcChart020Excel.do` | `CoExcelController#PcChart020Excel` | `user/Co/Mas/CoMas020Chart_XLS` |  |
| 677 | 교수(DB판정) | 사용자 | Pc(교수상담) | 개인 상담내역 인쇄 | `/user/Pc/PcMa010D_Print.do` | `PcMaController#CnCp010D_Print` | `common/Pc/pop_CnCp010D_Print` |  |
| 678 | 교수(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 | `/user/Pc/PcMa010L.do` | `PcMaController#CnCp010L` | `user/Pc/Ma/PcMa010L` |  |
| 679 | 교수(DB판정) | 사용자 | Pc(교수상담) | 개인 상담 신규 작성 화면 | `/user/Pc/PcMa010M.do` | `PcMaController#CnCp010M` | `user/Pc/Ma/PcMa010I` |  |
| 680 | 교수(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 내역 상세보기 | `/user/Pc/PcMa020D.do` | `PcMaController#SsCp010D` | `user/Pc/Ma/PcMa020D` |  |
| 681 | 교수(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 내역 게시판 | `/user/Pc/PcMa020L.do` | `PcMaController#SsCp010L` | `user/Pc/Ma/PcMa020L` |  |
| 682 | 교수(DB판정) | 사용자 | Pc(교수상담) | 미확인 | `/user/Pc/PcMa030L.do` | `PcMaController#PcMa030L` | `user/Pc/Ma/PcMa030L` |  |
| 683 | 교수(DB판정) | 사용자 | Pc(교수상담) | 미확인 | `/user/Pc/PcMa040L.do` | `PcMaController#PcMa040L` | `user/Pc/Ma/PcMa040L` |  |
| 684 | 교수(DB판정) | 사용자 | Pc(교수상담) | 개인 상담내역 인쇄 | `/user/Pc/PcMp010D_Print.do` | `PcMpController#CnCp010D_Print` | `common/Pc/pop_CnCp010D_Print` |  |
| 685 | 교수(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 | `/user/Pc/PcMp010L.do` | `PcMpController#CnCp010L` | `user/Pc/Mp/PcMp010L` |  |
| 686 | 교수(DB판정) | 사용자 | Pc(교수상담) | 개인 상담 신규 작성 화면 | `/user/Pc/PcMp010M.do` | `PcMpController#CnCp010M` | `user/Pc/Mp/PcMp010I` |  |
| 687 | 교수(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 내역 상세보기 | `/user/Pc/PcMp020D.do` | `PcMpController#SsCp010D` | `user/Pc/Mp/PcMp020D` |  |
| 688 | 교수(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 내역 게시판 | `/user/Pc/PcMp020L.do` | `PcMpController#SsCp010L` | `user/Pc/Mp/PcMp020L` |  |
| 689 | 교수(DB판정) | 사용자 | Pc(교수상담) | 미확인 | `/user/Pc/PcMp030L.do` | `PcMpController#PcMp030L` | `user/Pc/Mp/PcMp030L` |  |
| 690 | 교수(DB판정) | 사용자 | Pc(교수상담) | 미확인 | `/user/Pc/PcMp040L.do` | `PcMpController#PcMp040L` | `user/Pc/Mp/PcMp040L` |  |
| 691 | 교수(DB판정) | 사용자 | Pc(교수상담) | 미확인 | `/user/Pc/PcMpOnlineL.do` | `PcMpController#PcMpOnlineL` | `user/Pc/Mp/PcMpOnlineList` |  |
| 692 | 학생/공용(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 내역 상세보기 | `/user/Pc/PcMs010D.do` | `PcMsController#SsCp010D` | `user/Pc/Ms/PcMs010D` |  |
| 693 | 학생/공용(DB판정) | 사용자 | Pc(교수상담) | 지도교수 상담 내역 게시판 | `/user/Pc/PcMs010L.do` | `PcMsController#SsCp010L` | `user/Pc/Ms/PcMs010L` |  |
| 694 | 학생/공용(DB판정) | 사용자 | Pc(교수상담) | 집단 상담 신규 작성 화면 | `/user/Pc/pop_PcMa010M.do` | `PcMaController#pop_CnCp010M` | `common/Pc/pop_CnCp010I` | 팝업(메뉴노출N 추정) |
| 695 | 학생/공용(DB판정) | 사용자 | Pc(교수상담) | 집단 상담 신규 작성 화면 | `/user/Pc/pop_PcMp010M.do` | `PcMpController#pop_CnCp010M` | `common/Pc/pop_CnCp010I` | 팝업(메뉴노출N 추정) |
| 696 | 학생/공용(DB판정) | 사용자 | PlMc(채용) | 미확인 | `/user/PlMc/ReMc010ReqDetail.do` | `ReCompController#ReMc010ReqDetail` | `user/Re/Mc/ReMcReqDetail` |  |
| 697 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 미확인 | `/user/portfolio/activity_award.do` | `UserPortfolioController#activity_award` | `user/portfolio/activity_award` |  |
| 698 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 학생 e포트폴리오 | `/user/portfolio/activity_award_add.do` | `UserPortfolioController#activity_award_add` | `common/pop_layerAwardAdd` |  |
| 699 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 학생 e포트폴리오 | `/user/portfolio/activity_award_view.do` | `UserPortfolioController#activity_award_view` | `common/pop_layerAwardAdd<br>/common/pop_layerAwardView` | 분기다중 |
| 700 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 상담이력 | `/user/portfolio/activity_counsel.do` | `UserPortfolioController#activity_counsel` | `user/portfolio/activity_counsel` |  |
| 701 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 수강잉력 선후수조회 | `/user/portfolio/coursesSunAfterSearch.do` | `UserPortfolioController#coursesSunAfterSearch` | `user/portfolio/study_courses` |  |
| 702 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 비교과프로그램 참여이력 조회 | `/user/portfolio/extState.do` | `UserPortfolioController#extState` | `user/extracurricular/extState` |  |
| 703 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 비교과프로그램 참여이력 성찰조회 | `/user/portfolio/extStateThkl.do` | `UserPortfolioController#extStateThkl` | `common/pop_extThkl` |  |
| 704 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 자기성찰 입력 | `/user/portfolio/introspection.do` | `UserPortfolioController#introspection` | `user/portfolio/introspection` |  |
| 705 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 자기성찰 입력 | `/user/portfolio/introspection_print1.do` | `UserPortfolioController#introspection_print1` | `user/portfolio/introspection_print` |  |
| 706 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 내정보관리 | `/user/portfolio/myInfo.do` | `UserPortfolioController#myInfo` | `user/portfolio/myInfo` |  |
| 707 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 미확인 | `/user/portfolio/portfolio_popup.do` | `UserPortfolioController#portfolio_popup` | `common/Re/pop_ReRdApplyJoin` | 팝업(메뉴노출N 추정) |
| 708 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 학생 e포트폴리오 | `/user/portfolio/portfolio_resume.do` | `UserPortfolioController#portfolio_resume` | `user/portfolio/portfolio_resume` |  |
| 709 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 학생 e포트폴리오 | `/user/portfolio/portfolio_selfHistory.do` | `UserPortfolioController#portfolio_selfHistory` | `user/portfolio/portfolio_selfHistory` |  |
| 710 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 학생 e포트폴리오 | `/user/portfolio/portfolio_selfHistory_write.do` | `UserPortfolioController#portfolio_selfHistory_write` | `user/portfolio/portfolio_selfHistory_write` |  |
| 711 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 학생 마이페이지 이력서 등록 & 수정 | `/user/portfolio/portfolio_write.do` | `UserPortfolioController#portfolio_write` | `user/portfolio/portfolio_resume_write` |  |
| 712 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 교과과정 | `/user/portfolio/study_courses.do` | `UserPortfolioController#study_courses` | `user/portfolio/study_courses` |  |
| 713 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 장학금 및 수상이력 조회 | `/user/portfolio/study_scholarship.do` | `UserPortfolioController#study_scholarship` | `user/portfolio/study_scholarship` |  |
| 714 | 학생(DB판정) | 사용자 | portfolio(e포트폴리오) | 만족도조사 조회 | `/user/portfolio/surveyList.do` | `UserPortfolioController#surveyList` | `user/portfolio/surveyList` |  |
| 715 | 학생/공용(DB판정) | 사용자 | poss(참여후기) | 프로그램 참여후기 게시판 상세 | `/user/poss/pgmPossD.do` | `PossUserController#pgmPossD` | `user/poss/pgmPossD` |  |
| 716 | 학생/공용(DB판정) | 사용자 | poss(참여후기) | 프로그램 참여후기 게시판 목록 | `/user/poss/pgmPossL.do` | `PossUserController#pgmPossL` | `user/poss/pgmPossL` |  |
| 717 | 학생/공용(DB판정) | 사용자 | poss(참여후기) | 프로그램 참여후기 게시판 | `/user/poss/pgmPossM.do` | `PossUserController#pgmPossM` | `user/poss/pgmPossM` |  |
| 718 | 학생/공용(DB판정) | 사용자 | poss(참여후기) | 프로그램 참여후기 게시판 상세 | `/user/poss/pgmPossMngD.do` | `PossController#pgmPossD` | `admin/poss/pgmPossD<br>/user/poss/pgmPossMngD` | 분기다중 |
| 719 | 학생/공용(DB판정) | 사용자 | poss(참여후기) | 프로그램 참여후기 엑셀다운로드 | `/user/poss/pgmPossMngExcelDown.do` | `PossController#EpExcelDown` | `admin/poss/pgmPoss_XLS` |  |
| 720 | 학생/공용(DB판정) | 사용자 | poss(참여후기) | 프로그램 참여후기 게시판 목록 | `/user/poss/pgmPossMngL.do` | `PossController#pgmPossL` | `admin/poss/pgmPossL<br>/user/poss/pgmPossMngL` | 분기다중 |
| 721 | 학생/공용(DB판정) | 사용자 | poss(참여후기) | 프로그램 참여후기 게시판 | `/user/poss/pgmPossMngM.do` | `PossController#pgmPossM` | `admin/poss/pgmPossM<br>user/poss/pgmPossMngM` | 분기다중 |
| 722 | 지역청년(별도세션) | 사용자 | poss(참여후기) | 지역청년 프로그램 참여후기 게시판 상세 | `/user/poss/pgmRegPossD.do` | `PossUserController#pgmRegPossD` | `user/poss/pgmRegPossD` |  |
| 723 | 지역청년(별도세션) | 사용자 | poss(참여후기) | 지역청년 프로그램 참여후기 게시판 목록 | `/user/poss/pgmRegPossL.do` | `PossUserController#pgmRegPossL` | `user/poss/pgmRegPossL` |  |
| 724 | 지역청년(별도세션) | 사용자 | poss(참여후기) | 지역청년 프로그램 참여후기 게시판 | `/user/poss/pgmRegPossM.do` | `PossUserController#pgmRegPossM` | `user/poss/pgmRegPossM` |  |
| 725 | 지역청년(별도세션) | 사용자 | poss(참여후기) | 지역청년 프로그램 참여후기 게시판 상세 | `/user/poss/pgmRegPossMngD.do` | `PossController#pgmRegPossD` | `user/poss/pgmRegPossMngD<br>/regLogin` | 분기다중 |
| 726 | 지역청년(별도세션) | 사용자 | poss(참여후기) | 지역청년 프로그램 참여후기 게시판 목록 | `/user/poss/pgmRegPossMngL.do` | `PossController#pgmRegPossL` | `user/poss/pgmRegPossMngL<br>/regLogin` | 분기다중 |
| 727 | 지역청년(별도세션) | 사용자 | poss(참여후기) | 지역청년 프로그램 참여후기 게시판 | `/user/poss/pgmRegPossMngM.do` | `PossController#pgmRegPossM` | `user/poss/pgmRegPossMngM<br>/regLogin` | 분기다중 |
| 728 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/extAppPrc.do` | `ReUserController#extAppPrc` | `common/extAppPrcMobile<br>/common/Re/extAppPrc_view<br>/common/Re/extAppPrc` | 분기다중 |
| 729 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/extAppPrcReqDetail.do` | `ReUserController#extAppPrcReqDetail` | `common/Re/extAppPrc_modify` |  |
| 730 | 학생(DB판정) | 사용자 | Re(채용정보) | MY추천채용 게시판 상세보기 | `/user/Re/MsRd010D.do` | `ReMsController#SsRd010D` | `mobile/mypageStudent/recommend_view<br>user/Re/Ms/MsRd010D` | 분기다중 |
| 731 | 학생(DB판정) | 사용자 | Re(채용정보) | MY 추천채용 내역 게시판 | `/user/Re/MsRd010L.do` | `ReMsController#MsRd010L` | `mobile/mypageStudent/recommend<br>/user/Re/Ms/MsRd010L` | 분기다중 |
| 732 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 상세보기 | `/user/Re/ReAb010D.do` | `ReUserController#ReAb010D` | `user/Re/ReAb010D` |  |
| 733 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 | `/user/Re/ReAb010L.do` | `ReUserController#ReAb010L` | `user/Re/ReAb010L` |  |
| 734 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 상세보기 | `/user/Re/ReAb020D.do` | `ReCompController#ReAb020D` | `user/Re/ReAb020D` |  |
| 735 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 등록 | `/user/Re/ReAb020I.do` | `ReCompController#ReAb020I` | `user/Re/ReAb020I` |  |
| 736 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 | `/user/Re/ReAb020L.do` | `ReCompController#ReAb020L` | `user/Re/ReAb020L` |  |
| 737 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 수정 | `/user/Re/ReAb020U.do` | `ReCompController#ReAb020U` | `admin/Re/ReAb020U` |  |
| 738 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 추천채용 신청 팝업창 상세보기 | `/user/Re/ReAgree.do` | `ReUserController#ReAgree` | `mobile/recruit/recommend_agree<br>common/Re/pop_AgreeApp` | 분기다중 |
| 739 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 추천채용 신청 팝업창 상세보기 | `/user/Re/ReAppD.do` | `ReUserController#ReAppD` | `mobile/recruit/recommend_app<br>common/Re/pop_VUsrInfApp` | 분기다중 |
| 740 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 공모전 정보 게시판 상세보기 | `/user/Re/ReCt010D.do` | `ReUserController#ReCt010D` | `mobile/recruit/infor_contest_view<br>user/Re/ReCt010D` | 분기다중 |
| 741 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 공모전 정보 게시판 | `/user/Re/ReCt010L.do` | `ReUserController#ReCt010L` | `mobile/recruit/infor_contest<br>user/Re/ReCt010L` | 분기다중 |
| 742 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 교육 정보 게시판 상세보기 | `/user/Re/ReEc030D.do` | `ReUserController#ReEc030D` | `mobile/recruit/infor_expo_view<br>user/Re/ReEc030D` | 분기다중 |
| 743 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 박람회&설명회 정보 게시판 | `/user/Re/ReEc030L.do` | `ReUserController#ReEc030L` | `mobile/recruit/infor_expo<br>user/Re/ReEc030L` | 분기다중 |
| 744 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 인턴쉽 정보 게시판 상세보기 | `/user/Re/ReIs020D.do` | `ReUserController#ReIs020D` | `mobile/recruit/infor_internship_view<br>user/Re/ReIs020D` | 분기다중 |
| 745 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 인턴쉽 정보 게시판 | `/user/Re/ReIs020L.do` | `ReUserController#ReIs020L` | `mobile/recruit/infor_internship<br>user/Re/ReIs020L` | 분기다중 |
| 746 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 기업채용정보 게시판 상세보기 | `/user/Re/ReJo020D.do` | `ReUserController#ReJo020D` | `mobile/recruit/infor_company_view<br>user/Re/ReJo020D` | 분기다중 |
| 747 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 기업채용정보 게시판 | `/user/Re/ReJo020L.do` | `ReUserController#ReJo020L` | `mobile/recruit/infor_company<br>user/Re/ReJo020L` | 분기다중 |
| 748 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/ReMc010D.do` | `ReCompController#ReMc010D` | `user/Re/Mc/ReMc010D` |  |
| 749 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/ReMc010I.do` | `ReCompController#ReMc010I` | `user/Re/Mc/ReMc010I` |  |
| 750 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 추천채용 정보 게시판 | `/user/Re/ReMc010L.do` | `ReCompController#ReMc010L` | `user/Re/Mc/ReMc010L` |  |
| 751 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/ReMc010U.do` | `ReCompController#ReMc010U` | `user/Re/Mc/ReMc010U` |  |
| 752 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | MY추천채용 게시판 상세보기 | `/user/Re/ReMs010D.do` | `ReMsController#ReRd010D` | `user/Re/Ms/ReMs010D` |  |
| 753 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/ReMs010L.do` | `ReMsController#SsRc010L` | `user/Re/Ms/ReMs010L` |  |
| 754 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 일반채용 게시판 상세보기 | `/user/Re/ReMs020D.do` | `ReMsController#SsJo020D` | `mobile/mypageStudent/scrap_company_view<br>/user/Re/Ms/ReMs020D` | 분기다중 |
| 755 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 일반채용 정보 게시판 | `/user/Re/ReMs020L.do` | `ReMsController#ReJo020L` | `mobile/mypageStudent/scrap_company<br>/user/Re/Ms/ReMs020L` | 분기다중 |
| 756 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 일반채용 게시판 상세보기 | `/user/Re/ReMs030D.do` | `ReMsController#SsPr020D` | `mobile/mypageStudent/scrap_public_view<br>/user/Re/Ms/ReMs030D` | 분기다중 |
| 757 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 일반채용 정보 게시판 | `/user/Re/ReMs030L.do` | `ReMsController#RePr020L` | `mobile/mypageStudent/scrap_public<br>/user/Re/Ms/ReMs030L` | 분기다중 |
| 758 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 인턴쉽 정보 게시판 상세보기 | `/user/Re/ReMs040D.do` | `ReMsController#ReIs020D` | `mobile/mypageStudent/scrap_internship_view<br>/user/Re/Ms/ReMS040D` | 분기다중 |
| 759 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 인턴쉽 정보 게시판 | `/user/Re/ReMs040L.do` | `ReMsController#ReIs020L` | `mobile/mypageStudent/scrap_internship<br>/user/Re/Ms/ReMs040L` | 분기다중 |
| 760 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 공모전 정보 게시판 상세보기 | `/user/Re/ReMS050D.do` | `ReMsController#ReCt010D` | `mobile/mypageStudent/scrap_contest_view<br>/user/Re/Ms/ReMs050D` | 분기다중 |
| 761 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 공모전 정보 게시판 | `/user/Re/ReMs050L.do` | `ReMsController#ReCt010L` | `mobile/mypageStudent/scrap_contest<br>/user/Re/Ms/ReMs050L` | 분기다중 |
| 762 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 교육 정보 게시판 상세보기 | `/user/Re/ReMs060D.do` | `ReMsController#ReEc030D` | `mobile/mypageStudent/scrap_expo_view<br>/user/Re/Ms/ReMs060D` | 분기다중 |
| 763 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 교육 정보 게시판 | `/user/Re/ReMs060L.do` | `ReMsController#ReEc030L` | `mobile/mypageStudent/scrap_expo<br>/user/Re/Ms/ReMs060L` | 분기다중 |
| 764 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 상세보기 | `/user/Re/ReMs070D.do` | `ReMsController#ReAb010D` | `mobile/mypageStudent/scrap_parttime_view<br>/user/Re/Ms/ReMs070D` | 분기다중 |
| 765 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 아르바이트 정보 게시판 | `/user/Re/ReMs070L.do` | `ReMsController#ReAb010L` | `mobile/mypageStudent/scrap_parttime<br>/user/Re/Ms/ReMs070L` | 분기다중 |
| 766 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/ReMs080L.do` | `ReMsController#ReMs080L` | `mobile/mypageStudent/scrap_company<br>/user/Re/Ms/ReMs080L` | 분기다중 |
| 767 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/ReOv010L.do` | `ReUserController#ReOv010L` | `mobile/recruit/recommend<br>user/Re/ReOv010L` | 분기다중 |
| 768 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 비교과프로그램 그룹상세(해외취업) | `/user/Re/ReOv020GD.do` | `ReUserController#extAddGroupDetail` | `user/Re/ReOv020GD` |  |
| 769 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 비교과프로그램 신청-그룹생성 | `/user/Re/ReOv020GD_Prc.do` | `ReUserController#extGroupAppPrc` | `user/Re/ReOv020GD_Prc` |  |
| 770 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 미확인 | `/user/Re/ReOv020L.do` | `ReUserController#ReOv020L` | `user/Re/ReOv020L` |  |
| 771 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 비교과프로그램 개인상세(해외취업) | `/user/Re/ReOv020PD.do` | `ReUserController#extAddPersonDetail` | `user/Re/ReOv020PD` |  |
| 772 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 공공기관채용정보 게시판 상세보기 | `/user/Re/RePr020D.do` | `ReUserController#RePr020D` | `mobile/recruit/infor_public_view<br>user/Re/RePr020D` | 분기다중 |
| 773 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 공공기관채용정보 정보 게시판 | `/user/Re/RePr020L.do` | `ReUserController#RePr020L` | `mobile/recruit/infor_public<br>user/Re/RePr020L` | 분기다중 |
| 774 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 추천채용 게시판 상세보기 | `/user/Re/ReRd010D.do` | `ReUserController#ReRd010D` | `mobile/recruit/recommend_view<br>user/Re/ReRd010D` | 분기다중 |
| 775 | 학생/공용(DB판정) | 사용자 | Re(채용정보) | 추천채용 정보 게시판 | `/user/Re/ReRd010L.do` | `ReUserController#SyBd010M` | `mobile/recruit/recommend<br>user/Re/ReRd010L` | 분기다중 |
| 776 | 학생(DB판정) | 사용자 | Ss(진로취업카드) | 사진_UpLoad | `/user/Ss/pop_photo.do` | `SsMsController#UserPhoto` | `common/Ss/pop_photo` | 팝업(메뉴노출N 추정) |
| 777 | 학생(DB판정) | 사용자 | Ss(진로취업카드) | 사진파일 Edit | `/user/Ss/pop_photoEdit.do` | `SsMsController#UserPhotoEdit` | `common/Ss/pop_photo` | 팝업(메뉴노출N 추정) |
| 778 | 학생(DB판정) | 사용자 | Ss(진로취업카드) | 학생 마이페이지 진로취업카드 | `/user/Ss/pop_resPrint.do` | `SsMsController#pop_resPrint` | `common/Ss/pop_resPrint` | 팝업(메뉴노출N 추정) |
| 779 | 학생(DB판정) | 사용자 | Ss(진로취업카드) | 학생 마이페이지 진로취업카드 등록 & 수정 | `/user/Ss/SsMsRs010M.do` | `SsMsController#SsRs010M` | `user/Ss/Ms/SsRs010I` |  |
| 780 | 학생(DB판정) | 사용자 | Ss(진로취업카드) | 포트폴리오 | `/user/Ss/SsRs020D.do` | `SsMsController#SsRs020D` | `user/Ss/Ms/SsRs020D` |  |
| 781 | 직원(DB판정) | 사용자 | St(취업통계) | 등록 | `/User/St/StDg010_WriteView.do` | `StUserController#StDg010_WriteView` | `common/St/pop_StDgWrite<br>/common/St/pop_StDgUpdate` | 분기다중 |
| 782 | 직원(DB판정) | 사용자 | St(취업통계) | 조사차수관리 목록(surveymng) | `/User/St/StDg010L.do` | `StUserController#StDegreeMn010L` | `user/St/StDg010L` |  |
| 783 | 직원(DB판정) | 사용자 | St(취업통계) | 졸업생 취업조사 | `/User/St/StGe010L.do` | `StUserController#StGe010L` | `user/St/StGe010L` |  |
| 784 | 직원(DB판정) | 사용자 | St(취업통계) | 프로그램별 취업률 분석 | `/User/St/StPg010L.do` | `StUserController#StPg` | `user/St/StPg010L` |  |
| 785 | 직원(DB판정) | 사용자 | St(취업통계) | 프로그램별 취업률 분석 엑셀다운로드 | `/User/St/StPg010L_excel.do` | `StUserController#StPg010L_excel` | `user/St/st/StPg010L_excel` |  |
| 786 | 직원(DB판정) | 사용자 | St(취업통계) | 예비 | `/User/St/StRe010L.do` | `StUserController#StRe010L` | `user/St/StRe010L<br>user/St/StRe020L` | 분기다중 |
| 787 | 직원(DB판정) | 사용자 | St(취업통계) | 등록 | `/User/St/StRe010U.do` | `StUserController#StRe010U` | `user/St/StRe010U<br>user/St/StRe020U` | 분기다중 |
| 788 | 직원(DB판정) | 사용자 | St(취업통계) | 취업통계 결과 목록 | `/User/St/StSt010_Search.do` | `StUserController#StSt010_Search` | `user/St/StSt010L` |  |
| 789 | 직원(DB판정) | 사용자 | St(취업통계) | 취업통계 excel download | `/User/St/StSt010_SearchExcel.do` | `StUserController#StSt010_SearchExcel` | `user/St/StSt010L<br>user/St/st/StSt010_1001_excel<br>user/St/st/StSt010_1002_excel<br>user/St/st/StSt010_1003_excel<br>user/St/st/StSt010_1005_excel<br>user/St/st/StSt010_1007_excel<br>user/St/st/StSt010_2001_excel<br>user/St/st/StSt010_2002_excel<br>user/St/st/StSt010_3001_excel<br>user/St/st/StSt010_3002_excel<br>user/St/st/StSt010_4001_excel<br>user/St/st/StSt010_5001_excel<br>user/St/st/StSt010_1008_excel` | 분기다중 |
| 790 | 직원(DB판정) | 사용자 | St(취업통계) | 취업통계 | `/User/St/StSt010L.do` | `StUserController#StSt010L` | `user/St/StSt010L` |  |
| 791 | 직원(DB판정) | 사용자 | St(취업통계) | KEDI 리스트 | `/User/St/StSt020L.do` | `StUserController#StSt020L` | `user/St/StSt020L` |  |
| 792 | 직원(DB판정) | 사용자 | St(취업통계) | KEDI 통계 데이터 | `/User/St/StSt020P.do` | `StUserController#StSt020P` | `user/St/StSt020P` |  |
| 793 | 직원(DB판정) | 사용자 | St(취업통계) | KEDI 통계 데이터 조회 팝업 | `/User/St/StSt020Pop.do` | `StUserController#StSt020Pop` | `user/St/StSt02` | 팝업(메뉴노출N 추정) |
| 794 | 직원(DB판정) | 사용자 | St(취업통계) | 취업자현황 상세 | `/User/St/StStu010D.do` | `StUserController#StStu010D` | `user/St/StStu010D` |  |
| 795 | 직원(DB판정) | 사용자 | St(취업통계) | 취업자현황 상세 - 엑셀 다운로드 | `/User/St/StStu010D_excel.do` | `StUserController#StStu010D_excel` | `user/St/st/StStu010D_excel` |  |
| 796 | 직원(DB판정) | 사용자 | St(취업통계) | 취업자현황 목록 | `/User/St/StStu010L.do` | `StUserController#StStu010L` | `user/St/StStu010L` |  |
| 797 | 직원(DB판정) | 사용자 | St(취업통계) | 취업자현황 엑셀다운로드 | `/User/St/StStu010L_excel.do` | `StUserController#StStu010L_excel` | `user/St/st/StStu010L_excel` |  |
| 798 | 직원(DB판정) | 사용자 | Wa(장기결석/학사경고) | 장기결석자, 학사경고자 명단 엑셀업로드 - 레이어 팝업 | `/User/Wa/Wa010EI.do` | `WaUserController#Wa010EI` | `common/Wa/pop_WarningInfoAdd` |  |
| 799 | 직원(DB판정) | 사용자 | Wa(장기결석/학사경고) | 사용자 > 교무과, 학사관리과 담당자 > 마이페이지 > 장기결석자, 학사경고자 명단관리 | `/User/Wa/Wa010L.do` | `WaUserController#MtUs010L` | `user/Wa/Wa010L` |  |
| 800 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 주소 검색 페이지 | `/addrSearch.do` | `CommonController#addrSearch` | `common/pop_addrSearch` |  |
| 801 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 준비중페이지 | `/admReady.do` | `CommonController#setReadyPageAdmin` | `common/readyPageAdmin` |  |
| 802 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/adnMain.do` | `MainController#adnMain` | `admin/firstPage` |  |
| 803 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 첨부파일 다운로드 | `/BoardfileDown.do` | `CommonController#BoardfileDown` | `common/pop_attachdownload` |  |
| 804 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 비밀번호 변경 팝업 | `/changePwd.do` | `CommonController#changePwd` | `common/pop_changePassword` |  |
| 805 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 자기성찰 조회 | `/common/pop_layerCounsel.do` | `UserPortfolioController#pop_layerCounsel` | `common/pop_layerCounsel` | 팝업(메뉴노출N 추정) |
| 806 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 자기성찰 입력 | `/common/pop_layerCounselAdd.do` | `UserPortfolioController#pop_layerCounselAdd` | `common/pop_layerCounselAdd` | 팝업(메뉴노출N 추정) |
| 807 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 자기성찰 조회 | `/common/pop_layerSoul.do` | `UserPortfolioController#pop_layerSoul` | `common/pop_layerSoul` | 팝업(메뉴노출N 추정) |
| 808 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 자기성찰 입력 | `/common/pop_layerSoulAdd.do` | `UserPortfolioController#pop_layerSoulAdd` | `common/pop_layerSoulAdd` | 팝업(메뉴노출N 추정) |
| 809 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 교과목정보 조회 및 성찰 등록 | `/common/pop_layerSubjectInfoAdd.do` | `UserPortfolioController#pop_layerSubjectInfoAdd` | `common/pop_layerSubjectInfoAdd` | 팝업(메뉴노출N 추정) |
| 810 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 교과목 검색 | `/common/pop_layerSubjectSearch2.do` | `UserPortfolioController#pop_layerSubjectSearch2` | `common/pop_layerSubjectSearch2` | 팝업(메뉴노출N 추정) |
| 811 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 기타자격증 팝업 목록 화면 | `/common/pop_licenseEtc.do` | `UserPortfolioController#pop_licenseEtc` | `common/pop_licenseD` | 팝업(메뉴노출N 추정) |
| 812 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 전공자격증 팝업 목록 화면 | `/common/pop_licenseMajor.do` | `UserPortfolioController#pop_licenseMajor` | `common/pop_licenseD` | 팝업(메뉴노출N 추정) |
| 813 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/devLoginAction.do` | `SessionController#devLoginAction` | `user/Lo/login/loginDev` |  |
| 814 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/error.do` | `MainController#error` | `common/error` |  |
| 815 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/extCur/prmCodeMng/list.do` | `EpMnController#prmCodeMngList` | `user/Ep/Mn/EpMn030ML` |  |
| 816 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 첨부파일 다운로드 | `/fileDown.do` | `CommonController#fileDown` | `common/pop_attachdownload` |  |
| 817 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 첨부파일 다운로드 | `/fileDownFull.do` | `CommonController#fileDownFull` | `common/pop_attachdownload` |  |
| 818 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 역량점수 현황 멀티 수료 확인서 | `/IrMultiCfmPrint.do` | `CommonController#IrMultiCfmPrint` | `common/Ep/print_IrMultiConfirm` |  |
| 819 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 관리자 > INFACO(가족회사) > INFACO 관리 > 등록 | `/join.do` | `MainController#infaco_manage_write` | `common/pop_compUserJoin` |  |
| 820 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 로그인 | `/login.do` | `SessionController#login` | `jsonView<br>redirect:/main.do` | 분기다중 |
| 821 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/main.do` | `MainController#Main` | `user/main` |  |
| 822 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/mainTest.do` | `MainController#mainTest` | `user/mainTest` |  |
| 823 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 우편번호 리스트 | `/manualPostList.do` | `CommonController#manualpostList` | `common/pop_manualaddr` |  |
| 824 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 기업 입력,선택 팝업 | `/NewComp.do` | `CommonController#newComp` | `common/pop_NewComp_m<br>common/pop_NewComp` | 분기다중 |
| 825 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 외부회원 로그인 | `/outSiderLogin.do` | `SessionController#outSiderLogin` | `jsonView<br>redirect:/main.do` | 분기다중 |
| 826 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 개인프로그램 수료확인서 | `/outsiderPrint.do` | `CommonController#outsiderPrint` | `user/Ep/Mn/print_OutsiderConfirm` |  |
| 827 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 개인프로그램 수료확인서 | `/personCfmPrint.do` | `CommonController#personCfmPrint` | `common/Ep/print_PersonConfirm_ENG<br>/common/Ep/print_PersonConfirm` | 분기다중 |
| 828 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 이력서 작성방법 | `/pop_layerResumeGuide.do` | `CommonController#pop_layerResumeGuide` | `common/pop_layerResumeGuide` | 팝업(메뉴노출N 추정) |
| 829 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 이력서 | `/pop_resumePrint.do` | `CommonController#pop_resumePrint` | `common/pop_resumePrint` | 팝업(메뉴노출N 추정) |
| 830 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 프로그램 참가대상 부서팝업 | `/pop_selectPrmTrgtDept.do` | `CommonController#pop_selectTrgtDept` | `common/Ep/pop_selectPrmTrgtDept` | 팝업(메뉴노출N 추정) |
| 831 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 우편번호 리스트 | `/postSearch.do` | `CommonController#postSearch` | `common/pop_comPost` |  |
| 832 | 지역청년(별도세션) | 공통 | ROOT(공통/로그인) | 지역청년 회원가입 | `/regJoin.do` | `MainController#regJoin` | `user/regJoin` |  |
| 833 | 지역청년(별도세션) | 공통 | ROOT(공통/로그인) | 지역청년 회원정보수정 | `/regJoinInfo.do` | `MainController#regJoinInfo` | `user/regJoinInfo<br>/regLogin` | 분기다중 |
| 834 | 지역청년(별도세션) | 공통 | ROOT(공통/로그인) | 지역청년 메인 | `/regMain.do` | `MainController#regMain` | `user/regMain` |  |
| 835 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | SAMPLE 페이지 | `/sample.do` | `MainController#sample` | `user/sample` |  |
| 836 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 부서 조회 | `/searchDept.do` | `CommonController#searchDept` | `common/pop_searchDept` |  |
| 837 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 프로그램등록 국적 참가대상 설정 | `/searchNat.do` | `CommonController#searchSel2` | `common/Ep/pop_selectCiti2` |  |
| 838 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 교직원 조회 | `/searchPro.do` | `CommonController#searchPro` | `common/pop_searchpro` |  |
| 839 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/searchProOutsider.do` | `CommonController#searchProOutsider` | `common/pop_searchproOutsider` |  |
| 840 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 미확인 | `/searchStu.do` | `CommonController#searchStu` | `common/pop_searchStu` |  |
| 841 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 기업 리스트 팝업 | `/SelectComp.do` | `CommonController#SelectComp` | `common/pop_selectComp2<br>common/pop_selectComp_m<br>common/pop_selectComp` | 분기다중 |
| 842 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 자격증 리스트 팝업 | `/SelectLicense.do` | `CommonController#SelectLicense` | `common/pop_selectLicense` |  |
| 843 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 개인정보처리 동의 팝업 | `/systemAgree.do` | `CommonController#systemAgree` | `common/pop_systemAgree` |  |
| 844 | 공용/비로그인(DB판정) | 공통 | ROOT(공통/로그인) | 준비중페이지 | `/userReady.do` | `CommonController#setReadyPage` | `common/readyPage` |  |

**총 844 행.** 메뉴노출 컬럼은 전 행 `미확인` 이므로 생략(위 서문 참조).


---

## 부록 A. 화면이 아닌 엔드포인트 (전수 753건) — 조용히 빠뜨리지 않기 위해 수록

| 컨트롤러 | Ajax(jsonView) | redirect(처리) | View판별실패 | 비고 |
|---|---|---|---|---|
| `EpMnController` | 42 | 8 | 6 |  |
| `SyController` | 36 | 10 | 0 |  |
| `ExcelDownload` | 0 | 0 | 43 | **인가체크 전무** (MultiActionController 직접 상속) |
| `EpActController` | 28 | 0 | 8 |  |
| `EpController` | 14 | 4 | 15 |  |
| `ReController` | 13 | 17 | 0 |  |
| `CoUserController` | 25 | 3 | 0 |  |
| `CoController` | 21 | 7 | 0 |  |
| `PossController` | 3 | 24 | 0 |  |
| `CoMcController` | 20 | 3 | 0 |  |
| `StController` | 22 | 0 |  |  |
| `CommonController` | 18 | 0 | 4 |  |
| `CpController` | 17 | 3 | 0 |  |
| `PcMpController` | 19 | 0 | 0 |  |
| `StUserController` | 16 | 0 |  |  |
| `SessionController` | 9 | 7 | 0 |  |
| `EpExcelController` | 6 | 0 | 10 | **인가체크 전무** (MultiActionController 직접 상속) |
| `EcController` | 13 | 0 | 0 |  |
| `CoExcelController` | 0 | 0 | 13 | **인가체크 전무** (MultiActionController 직접 상속) |
| `MtController` | 10 | 2 | 0 |  |
| `MainController` | 10 | 2 | 0 |  |
| `EpUserController` | 11 | 0 |  |  |
| `BdUserController` |  | 10 | 0 |  |
| `ExController` | 11 | 0 | 0 |  |
| `UserPortfolioController` | 9 | 2 | 0 |  |
| `PossUserController` | 2 | 8 | 0 |  |
| `FuController` | 10 | 0 | 0 |  |
| `ReExcelController` | 0 | 0 | 9 | **인가체크 전무** (MultiActionController 직접 상속) |
| `CaController` | 7 | 2 | 0 |  |
| `FuUserController` | 8 | 0 | 0 |  |
| `MyCuController` | 8 | 0 | 0 |  |
| `SsMsController` | 4 | 2 |  |  |
| `CpUserController` | 6 | 0 | 0 |  |
| `InUserController` | 2 | 4 | 0 |  |
| `StGraduateController` | 5 |  | 0 |  |
| `ReCompController` | 4 | 2 | 0 |  |
| `RmController` | 6 | 0 | 0 |  |
| `CaExcelController` | 0 | 0 | 5 | **인가체크 전무** (MultiActionController 직접 상속) |
| `PcMaController` | 4 | 0 | 0 |  |
| `CoMsController` | 4 | 0 | 0 |  |
| `PcExcelController` | 0 | 0 | 4 | **인가체크 전무** (MultiActionController 직접 상속) |
| `MtMmController` | 2 | 2 | 0 |  |
| `ExUserController` | 4 | 0 | 0 |  |
| `ReUserController` | 4 | 0 | 0 |  |
| `StExcelController` | 0 | 0 | 4 | **인가체크 전무** (MultiActionController 직접 상속) |
| `CaMsController` | 3 |  | 0 |  |
| `MyIpController` | 3 | 0 | 0 |  |
| `BdController` | 0 | 3 | 0 |  |
| `ExExcelController` | 0 | 0 | 3 | **인가체크 전무** (MultiActionController 직접 상속) |
| `PcController` | 3 | 0 | 0 |  |
| `SmController` | 0 | 3 | 0 |  |
| `EtController` | 2 |  | 0 |  |
| `CoMasController` | 3 | 0 | 0 |  |
| `WaUserController` | 2 | 0 | 0 |  |
| `MyStController` | 0 | 0 | 2 |  |
| `ReMsController` |  |  | 0 |  |
| `IpController` | 2 | 0 | 0 |  |
| `MtExcelController` | 0 | 0 | 2 | **인가체크 전무** (MultiActionController 직접 상속) |
| `MtUserController` | 2 | 0 | 0 |  |
| `SyExcelController` | 0 | 0 | 2 | **인가체크 전무** (MultiActionController 직접 상속) |
| `WaController` | 2 | 0 | 0 |  |
| `SmsController` | 0 | 0 |  |  |
| `EpMsController` |  | 0 | 0 |  |
| `CpMcController` | 0 |  | 0 |  |
| `CpExcelController` | 0 | 0 |  | **인가체크 전무** (MultiActionController 직접 상속) |
| `EcExcelController` | 0 | 0 |  | **인가체크 전무** (MultiActionController 직접 상속) |
| `MtMsController` |  | 0 | 0 |  |
| `MyMgController` | 0 | 0 |  |  |
| `OvController` |  | 0 | 0 |  |
| `WaExcelController` | 0 | 0 |  | **인가체크 전무** (MultiActionController 직접 상속) |
| `AdminSurveyController` | 0 | 0 |  |  |

### 인가체크가 없는 엔드포인트 (RETOK 미검사 컨트롤러 전수)

| 컨트롤러 | 매핑수 | 상속 | setSessionMenu | 판정 |
|---|---|---|---|---|
| `career/admin/control/ca/CaExcelController.java` | 5 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/co/CoExcelController.java` | 18 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/cp/CpExcelController.java` |  | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/dt/DtExcelController.java` | 12 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/ec/EcExcelController.java` | 2 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/ex/ExExcelController.java` | 3 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/mt/MtController.java` | 23 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/admin/control/mt/MtExcelController.java` | 4 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/pc/PcExcelController.java` | 4 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/re/ReExcelController.java` | 9 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/rm/RmController.java` | 8 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/admin/control/st/StExcelController.java` | 8 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/sy/SyExcelController.java` | 2 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/admin/control/wa/WaController.java` | 3 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/admin/control/wa/WaExcelController.java` |  | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/framework/common/control/CodingController.java` | 15 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/framework/common/control/CommonController.java` | 46 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/framework/common/control/LoginDumyController.java` |  | (없음) | N | **세션/메뉴 로직 자체 없음** |
| `career/framework/common/control/SessionController.java` | 19 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/framework/common/control/SmsController.java` |  | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/framework/common/ExcelDownload.java` | 44 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/user/control/ep/EpExcelController.java` | 17 | MultiActionController | N | **세션/메뉴 로직 자체 없음** |
| `career/user/control/MainController.java` | 21 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/user/control/mgnt/index/MgntIndexController.java` |  | (없음) | N | **세션/메뉴 로직 자체 없음** |
| `career/user/control/mt/MtMmController.java` | 10 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/user/control/mt/MtMsController.java` | 2 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/user/control/mt/MtUserController.java` | 7 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/user/control/my/MyMgController.java` | 4 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/user/control/pa/PaUserController.java` |  | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |
| `career/user/control/wa/WaUserController.java` | 4 | CareerActionController | Y | 메뉴조회는 하나 RETOK 미검사 |

