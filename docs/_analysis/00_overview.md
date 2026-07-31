# 00. 시스템 개요

> 표기 규칙: 수치 뒤 **(전수)** 는 전량 기계 스캔, **(추정)** 은 소스 근거가 있으나 확정 불가, **미확인** 은 소스에서 확인 못 함.
> 접속정보·계정·비밀번호는 모두 `<masked>`. 개인정보는 일절 옮기지 않았다.

## 스택 · 빌드

| 항목 | 값 | 근거 |
|---|---|---|
| 빌드 | **Maven/Gradle 없음.** Eclipse Dynamic Web Project (WTP) | `.project`, `.settings/org.eclipse.wst.common.component` |
| Java | **1.7** (source/target/compliance 모두 1.7) | `.settings/org.eclipse.jdt.core.prefs:5,11,12` |
| Servlet | **3.0 facet** 이나 `web.xml` 은 **2.4 DTD** 선언 | `.settings/org.eclipse.wst.common.project.facet.core.xml:4`, `web.xml:2` |
| 프레임워크 | **Spring MVC 3.x** (`DefaultAnnotationHandlerMapping` / `AnnotationMethodHandlerAdapter` — Spring 3.1에서 deprecated된 구형 조합) | `career-servlet.xml:50,55` |
| 뷰 | **JSP + JSTL**, `InternalResourceViewResolver`(prefix `/WEB-INF/jsp/`, suffix `.jsp`). **Tiles 미사용** — 레이아웃은 JSP `<%@ include %>` 방식 | `career-servlet.xml:28-34` |
| DB 접근 | **MyBatis 3** (`mybatis-spring`, `SqlSessionFactoryBean`) | `dataAccessContext-local.xml:44-51`, `sql-map-config.xml` DTD `mybatis-3-config.dtd` |
| 매퍼 위치 | `src/career/sqlmap/*.xml` **34개** (전수) | `sql-map-config.xml:20-61` |
| DB | **Oracle** (`oracle.jdbc.driver.OracleDriver`, `ROWNUM`·`CONNECT BY`·`XMLAGG`·`WM_CONCAT` 사용) | `jdbc.properties`, `common.xml:307,602` |
| 커넥션풀 | Apache Commons DBCP `BasicDataSource` | `dataAccessContext-local.xml:37,83` |
| 트랜잭션 | `DataSourceTransactionManager` + **컨트롤러에서 수동 `getTransaction/commit/rollback`** (선언적 트랜잭션 미사용) | `dataAccessContext-local.xml:68`, 예: `CoController.java:2644-2660` |
| 로깅 | log4j (`Log4jConfigListener`) + iBATIS `LogFactory` | `web.xml:8-14` |
| 배치 | Quartz `DairyBatch` 매일 01:00 — **`web.xml`에서 주석 처리되어 미기동** | `batchJob.xml:18`, `web.xml:20` |
| 파일업로드 | `CommonsMultipartResolver`, 최대 **50MB** | `career-servlet.xml:68-72` |
| 인증 프레임워크 | **Spring Security 없음. 자체 세션 방식** | `web.xml` 에 security filter 없음 |
| 인터셉터 | **`<mvc:interceptors>` 선언 없음.** `XSSInterceptor`·`ParameterInterceptor` 클래스는 존재하나 **등록되지 않은 죽은 코드** | `career-servlet.xml` 전체 |

### 데이터소스가 2개다
| 빈 | 용도 | 근거 |
|---|---|---|
| `dataSource` / `sqlSessionFactory` / `commonImpl` | 주 DB (드림캐치) | `dataAccessContext-local.xml:37-79` |
| `dataSourceOra` / `sqlSessionFactory2` / `commonImplOra` | 2번째 Oracle (`jdbc.*2` 프로퍼티, 주석 `HSDB2`) | `dataAccessContext-local.xml:83-101`, `jdbc.properties` |
| (컨테이너) `jdbc/StonesDS` | `web.xml` 에 `resource-ref` 선언되어 있으나 **어디서도 lookup하지 않음** → 잔재 | `web.xml:74-79` |

접속 URL·계정·비밀번호: `<masked>`.
※ `jdbc.properties` 에 **개발·운영 접속정보가 주석으로 평문 잔존**한다 → `06_findings.md` 보안항목 참조.

## 디렉터리 지도

| 경로 | 담는 것 | 파일 수 |
|---|---|---|
| `src/career/framework/common` | 공통 유틸·세션·엑셀·상수 (`LoginSession`, `CommonData`, `ExcelDownload` 137KB) | 25 |
| `src/career/framework/common/control` | 공통 컨트롤러 (`SessionController` 78KB=로그인, `CommonController` 41KB) | 11 |
| `src/career/framework/core` / `core2` | MyBatis DAO/Facade (`CommonImpl`, `OraImpl`) | 14 / 4 |
| `src/career/framework/util` | `PUtil`(63KB, 파라미터↔세션 병합·XSS치환), `JsonView`, `FileCoder` | 17 |
| `src/career/admin/control/**` | **관리자** 컨트롤러 23개 도메인 | 43 java |
| `src/career/user/control/**` | **사용자**(학생/교수/상담사/조교/기업/멘토) 컨트롤러 24개 도메인 | 60 java |
| `src/career/batch` | `DairyBatch` (학사DB 동기화 + SMS예약 + 역량집계) | 1 |
| `src/career/sqlmap` | MyBatis 매퍼 XML | 34 |
| `WebContent/WEB-INF/jsp/admin/**` | 관리자 화면 JSP | 264 |
| `WebContent/WEB-INF/jsp/user/**` | 사용자 화면 JSP | 415 |
| `WebContent/WEB-INF/jsp/common/**` | 팝업·공통·include (`inc/`, `inc_260324/` 백업본) | 336 |
| `WebContent/static_root` | css/js/images, **업로드 파일 저장소(`userUpload`)** | 다수 |
| `WebContent/cheditor`, `hackers`, `pub`, `sso`, `html` | 에디터·퍼블리싱 산출물·SSO 잔재 | 다수 |
| `build/classes` | 컴파일 산출물 (분석 제외) | — |
| `document/` | 기획서·ERD·DB작업 문서 (분석 제외) | — |

## 진입점

- **URL 패턴**: `*.do` → `DispatcherServlet`(`career`). 그 외 확장자는 정적 자원. (`web.xml:35-38`)
- **컴포넌트 스캔**: `career` 패키지 전체. (`career-servlet.xml:46`)
- **인코딩 필터**: `CharacterEncodingFilter` UTF-8, `/*`. 이게 **유일한 필터**다. (`web.xml:45-56`)
- **세션 타임아웃**: `web.xml` **720분**, 그러나 코드는 `MAX.INACTIVE.INTERVAL`= **86400초(24h)** 로 덮어쓰고, 화면 JS는 **30분** 후 로그아웃 확인창. → 3중 불일치. (`web.xml:40`, `systemConfig.properties`, `SessionController.java:404`, `incTop.jsp:79,136`)
- **에러페이지**: 401/403/404/500 전부 `/error.do`. (`web.xml:57-72`)

| 지표 | 값 |
|---|---|
| Controller 클래스 수 | **89** (전수) |
| `@RequestMapping` 매핑 메서드 수 | **1,600** (전수, 고유 URL 1,596) |
| ─ `/Sa/*` 관리자 | 604 |
| ─ `/user/*` 사용자 | 826 |
| ─ `/adn/*`·`/admin/*` (주로 엑셀·신규 관리자) | 63 |
| ─ 루트 레벨(로그인·공통·팝업) | 107 |
| JSP 총 개수 | **1,246** (WEB-INF 하위 1,202) |
| sqlmap XML | **34** / statement **2,033** (전수) |

### URL 네임스페이스 규약 (사이트맵의 역할 추정 근거)
| 접두 | 의미 | 근거 |
|---|---|---|
| `/Sa/{모듈}/` | **관리자 화면** (Sa = System Admin) | 전 컨트롤러가 `career.admin.control` 패키지, 뷰가 `admin/**` |
| `/adn/`, `/admin/` | 관리자 엑셀다운로드 및 후기 추가 관리화면 | `*ExcelController`, `PossController`, `infaco` |
| `/user/{모듈}/{Mc\|Ms\|Mp\|Ma\|Mas\|Mn}...` | 사용자 화면. 두 번째 토큰이 **역할 접미사** | 아래 표 |
| `/reg*`, `/user/In`, `/user/It`, `*Reg*` | **지역청년(별도 서브사이트)** — 로그인·세션이 분리 | `RegLoginSession.java`, `regLogin.do` |

**역할 접미사 규약** (JSP 폴더/주석으로 교차 확인, **추정**이지만 일관성 높음)

| 접미사 | 역할 | 확인 근거 예 |
|---|---|---|
| `Ms` | **학생**(My Student) | `CoMs010L` 주석 "상담 내역 게시판", `CaMsDm010L` "역량진단관리 조회(학생)" |
| `Mc` | **상담사**(My Counselor) | `CoMc010L` 주석 "상담사 예약상담" (`CoMcController.java:105`) |
| `Mp` | **교수**(My Professor) | `PcMp010L` "지도교수 상담", `CaMp010L` "역량진단관리 조회(교수)" |
| `Ma` | **교수(또 다른 계열)** | `PcMa010L` "지도교수 상담" — `Mp`와 화면 구조가 거의 동일. 중복 의심 |
| `Mas`/`As` | **조교**(Assistant) | `CoAs010L` 주석 "조교 마이페이지 > 전담교수 배정 유무 확인", 뷰 `user/Co/Mas/*` |
| `Mn` | **비교과 운영자/담당자** | `EpMn*`, `ExMn*` |
| `Mm` | **멘토** | `MtMm010L` "멘토 > 마이페이지 > 멘티현황" |

## 세션에 담기는 사용자 정보 ★

로그인 성공 시 `SessionController.setSession()` 이 `LoginSession` 객체 1개를 세션 키 **`CAREER_SESSION_KEY`** 로 넣는다. (`LoginSession.java:11`, `SessionController.java:361-406`)
이후 매 요청마다 `PUtil.getParameterDataMap()` 이 이 객체를 풀어 `SESSION_*` 키로 파라미터 맵에 합친다. **요청 파라미터를 먼저 넣고 세션 값을 나중에 덮어쓰므로, `SESSION_USR_ID` 등을 URL 파라미터로 위조해도 세션 값이 이긴다.** (`PUtil.java:911-919` vs `950-988`) — 이 부분은 안전하다.

| 세션 키(맵 기준) | 값 | 출처 (테이블/컬럼) | 근거 파일:라인 |
|---|---|---|---|
| `SESSION_USR_ID` / `SESSION_INTG_UID` | 통합 사용자 ID(학번·사번) | `V_USR_INF.INTG_UID` | `common.xml:297`, `SessionController.java:149-150` |
| `SESSION_USER_TY_CD` | **역할 1글자** — `S`학생 `P`교원 `M`직원 `A`조교 / 후처리로 `T`상담사 `C`기업 | `V_USR_INF.USER_TY_CD` 4자리를 CASE 변환(1101·1102·1201·1202→S, 1301→P, 1401→M, 1501→A) 후, `Common.getUsrCheck` 결과로 `C`/`T` 덮어쓰기 | `common.xml:280-288`, `common.xml:1007-1021`, `SessionController.java:177-185` |
| `SESSION_USER_CODE_CD` | 원본 4자리 `USER_TY_CD` | `V_USR_INF.USER_TY_CD` | `common.xml:289` |
| `SESSION_CON_USER_TYPE` | 상담사 유형 `J`(진로·심리검사)/`C`(취업) | `COM_CON_INF.CON_GB` 1→J, else C | `common.xml:1016` |
| `SESSION_AUTH` | **권한코드 CSV** (`AUTH0001,AUTH0006` 형태) | `SY_AUTH_USER.AUTH_CODE` 를 `XMLAGG`로 콤마결합 | `common.xml:307` |
| `SESSION_AUTH_CD` (List) | 위 CSV를 split + **역할 기본권한 1개 추가** | 계산값 | `PUtil.java:994-1032` |
| `SESSION_ADMIN_YN` | `Y` = 슈퍼관리자 | `SESSION_AUTH` 문자열에 **`AUTH0006` 포함 여부** | `SessionController.java:194-196` |
| `SESSION_HOFC_STA_CD` / `_NM` | 학적/재직 상태 | `V_USR_INF.HOFC_STA_CD` + `SY_CODE(GRP_CODE='0034')` | `common.xml:295-296` |
| `SESSION_WORK_TYPE_CD` | 재직여부 Y/N | `HOFC_STA_CD` 89→Y, 90→N | `common.xml:290-294` |
| `SESSION_WORK_YN` | 상담사/기업 승인 상태 | `COM_CON_INF.STATUS`='0001' 또는 `COM_COMP_INF.STATUS`='0002' → Y | `common.xml:1011-1019` |
| `SESSION_DAEHAK_CD` / `_NM` | 소속 대학(단과대) | `V_USR_INF.DAEHAK_CD` (NULL이면 `V_DEP_INF`로 상위 조회) + `V_DEP_INF.DEPT_NM` | `common.xml:299,302` |
| `SESSION_HAKBU_CD` / `_NM` | 학부 (NULL이면 `ORGID`) | `V_USR_INF.HAKBU_CD` / `ORGID` | `common.xml:300,303` |
| `SESSION_MAJOR_CD` / `_NM` | 전공(학과) | `V_USR_INF.MAJOR_CD` | `common.xml:301,304` |
| `SESSION_STU_SCHGR` | 학년 | `V_USR_INF.STU_SCHGR` | `common.xml:305` |
| `SESSION_SEX` | 성별 | `V_USR_INF.SEX` | `common.xml:306` |
| `SESSION_USR_NM` | 성명 | `V_USR_INF.USR_NM` | `common.xml:298` |
| `SESSION_USR_TEL` / `SESSION_USR_HP` | 연락처 | `V_USR_INF.TEL` / `.HP` | `common.xml:311,316` |
| `SESSION_USER_PROF_ID` | 지도교수 ID | `V_USR_INF.PROF_ID` | `common.xml:308` |
| `SESSION_USER_TUTOR_FLAG` | 본인이 지도교수인가 Y/N | `V_USR_INF` 에 자신을 PROF_ID로 갖는 행 존재 여부 | `common.xml:309` |
| `SESSION_USER_DEAN_FLAG` | 학과장 여부 | `V_USR_INF.DEAN_FLAG` | `common.xml:310` |
| `SESSION_AGREE` / `_CHK` | 개인정보 동의 여부 / 팝업 확인 | `V_USR_INF.AGREE_YN`. **단 학생(`S`)은 무조건 `Y`로 강제** | `SessionController.java:364-369` |
| `COMMON_CAMP_GB` | 캠퍼스/사용자구분. `'A'`면 관리자 메뉴 조회 | `V_USR_INF.COMMON_CAMP_GB`, **요청 파라미터로도 설정 가능** | `PUtil.java:916-922`, `SessionController.java:509` |
| `SESSION_CAP_SURVEY_NOT_CNT` | 역량진단 미실시 건수 (배지용) | `Ca.getCapSurveyNotCnt` | `SessionController.java:205-206` |
| 메뉴 캐시 4종 | 관리자 TOP/LEFT, 사용자 TOP/LEFT, 배너 | `SY_MENU` × `SY_MENU_AUTH` | `CareerActionController.java:64-101` |

**권한코드 ↔ 역할 매핑** (`PUtil.java:1002-1031`, `SessionController.java:187,194,826`)

| 코드 | 의미 | 부여 방식 |
|---|---|---|
| `AUTH0000` | 비로그인 | 세션 없거나 유저타입 불명 시 자동 |
| `AUTH0001` | 학생 | `USER_TY_CD='S'` 이면 자동 추가 |
| `AUTH0002` | 조교 | `='A'` |
| `AUTH0003` | 교수 | `='P'` |
| `AUTH0004` | 직원 | `='M'` |
| `AUTH0005` | 상담사 | `='T'` |
| `AUTH0008` | 기업 | `='C'` |
| `AUTH0010` | 멘토 | `='MT'` (외부·기업 로그인 경로에서만) |
| `AUTH0006` | **슈퍼관리자** | `SY_AUTH_USER` 에 명시 부여된 경우만 |
| `AUTH0007` | 비교과 담당자(추정) | `SY_AUTH_USER` 조회 후 `AUTH0007_CNT` 로 분기(현재 분기 코드는 주석 처리됨) |

즉 **역할 기본권한은 코드가 자동 부여**하고, `AUTH0006`/`AUTH0007` 같은 추가권한만 `SY_AUTH_USER` 테이블에서 온다.

## 로그인 경로가 몇 개인가 ★

**총 9개 진입점**(+2 지역청년). 전부 `SessionController.java` 한 파일에 있다.

| # | 경로 | 대상 | 인증 방식 | 세션 | 근거 |
|---|---|---|---|---|---|
| 1 | `/login.do` | 학생·교직원 (내부 폼) | **비밀번호 검증 없음 — 코드가 주석 처리됨.** `INTG_UID` 만으로 `Common.getuser_Info` 조회 성공 시 로그인 | `CAREER_SESSION_KEY` | `SessionController.java:120-145` |
| 2 | `/sso.do` | 포털 SSO | **`REFERER` 헤더에 `power.hs.ac.kr` 포함 여부만 검사.** 그 외 검증 없음 (도메인이 창원대가 아님 — 타 대학 코드 잔재) | 동일 | `SessionController.java:249-253` |
| 3 | `/ssoData.do` | 포털 SSO (현행 주경로, 추정) | `SHA256(USERID + <고정솔트A> + THISTIME)` == 파라미터 `PW` **AND** `THISTIME` 이 현재 ±10분 이내 **AND** `SHA256(USERID + <고정솔트B> + THISTIME)` == 파라미터 `RESULT` | 동일 | `SessionController.java:868-1033` |
| 4 | `/ssoDataV1.do` | 구 SSO | 위와 같으나 **결과서명(고정솔트B) 검증 없음** | 동일 | `SessionController.java:712-865` |
| 5 | `/autoLogin.do` | 포털 배너 클릭 자동로그인 | `/ssoDataV1.do` 와 동일 로직 | 동일 | `SessionController.java:1144-1294` |
| 6 | `/consultLogin.do` | **교내 상담사** | `Common.getConsultUser_Info` — `V_USR_INF` 조인. **파라미터로 INTG_PWD를 받지만 SQL에서 쓰지 않음(추정)** | 동일 | `SessionController.java:417-494`, `common.xml:1548` |
| 7 | `/outSiderLogin.do` | **외부위촉 상담사(CO) / 멘토(MT) / 일반회원(NU)** | `LOGIN_TYPE` 분기. 비밀번호 = **`FN_MD5(평문)`** 비교 (무염 MD5) | 동일 | `SessionController.java:570-657`, `common.xml:427-479` |
| 8 | `/compLogin.do` | **기업 담당자 / 멘토** | `COM_CPRT_MEBR.CPRTMEBR_PSWD = FN_MD5(...)`, ID는 `COMP_ID` 또는 **사업자번호** | 동일 | `SessionController.java:1044-1133`, `common.xml:482-518` |
| 9 | `/devLoginAction.do` | **개발자용 로그인 화면** (`/user/Lo/login/loginDev`) | 화면만 반환. 운영 배포본에 잔존 | — | `SessionController.java:98-103` |
| 10 | `/regLogin.do` | **지역청년** | `Common.getRegUser_Info` — `LOGIN_PWD_YN` 플래그 + **5회 실패 잠금** (유일하게 잠금 있음) | **`RegLoginSession`** (별도 키) | `SessionController.java:1497-1559` |
| 11 | `/regLoginNaver.do` | 지역청년 네이버 소셜 | 세션의 `REG_SESSION_NAVER_ID` 로 `SCAF_CNNCT_CD` 조회 | 동일 | `SessionController.java:1566-1626` |

**로그아웃**: `/logOut.do` 는 세션 속성만 제거하고 **`session.invalidate()` 는 주석 처리**되어 있다 → 세션 고정(Session Fixation) 대응 없음. (`SessionController.java:550-551`)

**관리자 IP 제한**: `/SaIpCheck.do` 가 `SY_IP_INFO` 를 읽어 판정하나, 비교 대상이 **소스에 하드코딩된 IP 문자열** 이고 실제 클라이언트 IP(`Myip`)는 계산만 하고 버린다 → **IP 제한이 사실상 무력**. (`SessionController.java:1309-1345`)
