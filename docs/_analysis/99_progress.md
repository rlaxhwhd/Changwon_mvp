# 진행 상황

분석 대상: `c:\UCAM_LMS\workspace\changwon` (Eclipse 동적웹프로젝트 `changwon`, context-root `changwon`)
분석 방식: **소스 정적 분석 전용**. DB 미접속. 소스 무수정.

- [x] Phase 0 구조 파악 → `00_overview.md`
- [x] Phase 1 사이트맵 → `01_sitemap.md` (매핑 **전수** 1,600건 기계 추출)
- [~] Phase 2 데이터 흐름 → `02_screen_dataflow.md` (**우선순위 1~3 중심 22화면 상세**, 나머지는 사이트맵 수준)
- [x] Phase 3 접근 범위 → `03_access_scope.md`
- [x] Phase 4 테이블 사용처 → `04_table_usage.md` (sqlmap 2,033 statement **전수** 스캔, 335 테이블)
- [x] Phase 5 질문 답변 → `05_answers.md` (15개 전부 응답)
- [x] Phase 5 발견 사항 → `06_findings.md`

---

## 수치 정합성

| 항목 | 수 | 근거 |
|---|---|---|
| Controller 클래스 | 89 | `src/career/**/*.java` 중 `@RequestMapping` 보유 |
| `@RequestMapping` 매핑 (URL×method) | 1,600 | 전수 정규식 추출 |
| 고유 URL | 1,596 | 위 중복 제거 |
| ─ JSP 렌더 화면 | 847 | View가 jsonView/redirect 아님 |
| ─ Ajax(jsonView) | 480 | |
| ─ 처리 후 redirect | 133 | |
| ─ View 판별 실패 | 140 | 엑셀/파일다운/조건분기 과다 |
| JSP 파일 | 1,246 (WEB-INF 하위 1,202) | |
| sqlmap XML | 34 | `sql-map-config.xml` 등록 34개 |
| SQL statement | 2,033 | 전수 파싱 |
| 참조 테이블(추정) | 335 | FROM/JOIN/INTO/UPDATE 토큰 |

**Controller 매핑 1,600 ≥ 사이트맵 행 1,596(고유 URL) ≥ 데이터흐름 블록 22.**
사이트맵이 매핑보다 4 적은 이유: `@RequestMapping(value={"/a.do","/b.do"})` 형태로 같은 URL이 2개 메서드에 중복 선언된 사례(예: `/user/My/MySt011L.do`, `/user/My/MySt060L.do`, `/user/My/MySt050L.do`) — 6절 `06_findings.md` 참조.

---

## 다루지 못한 것 (조용히 빠뜨리지 않음)

### 데이터 흐름(02) 미작성 영역
아래는 사이트맵(01)에는 **전수 포함**되었으나, 화면별 ①~⑦ 상세 블록은 작성하지 못했다.

| 영역 | 화면 수(약) | 사유 |
|---|---|---|
| 비교과 프로그램 운영자(`/user/Ep/Mn*`, `EpMnController` 305KB) | 107 매핑 | 단일 컨트롤러가 최대 규모. 상태/차수/그룹/펀드 로직이 얽혀 있어 별도 세션 필요 |
| 비교과 활동팝업(`/user/Ep/...`, `EpActController` 121KB) | 78 매핑 | 위와 동일 |
| 채용/인재정보(`/Sa/Re`, `/user/Re`, `ReController` 161KB) | 145 매핑 | 우선순위 5 |
| 취업통계(`/Sa/St`, `StController` 94KB, `st.xml` 120 stmt) | 61 매핑 | 통계 SQL이 화면당 10~13개 분기. 요약만 기재 |
| 포트폴리오(`/user/portfolio`, `UserPortfolioController` 92.9KB) | 40 매핑 | 우선순위 6(학생) |
| 프로그램 참여후기(`PossController` 75KB) | 38+16 매핑 | 우선순위 5 |
| 멘토/멘티(`Mt*`) · 취업동아리(`Ec*`) · 취업수기(`Ip*`) · 동문CEO(`Sm*`) · 진로로드맵(`Rm*`) | 각 2~27 매핑 | 우선순위 하위 |
| 기업/INFACO(`Cp*`, `infaco*`, `Et*`) | 약 60 매핑 | 우선순위 하위 |
| 지역청년(`reg*`, `/user/In`, `/user/It`, `EpReg*`, `CpReg*`, `SyBm020*`, `SyPo*`) | 약 45 매핑 | 별도 서브사이트 성격. 로그인 경로가 분리(§05 Q15) |

### 원리적으로 소스만으로 확정 불가한 것
1. **역할 ↔ 화면 매핑의 정확한 실체.** `SY_MENU`(343행)·`SY_MENU_AUTH`(972행)는 DB 데이터다. 소스에는 메뉴 트리 SQL만 있고 어떤 AUTH_CODE가 어떤 MENU_CODE를 갖는지는 없다. → 01의 `역할` 컬럼은 대부분 **`DB판정`**, 대신 URL 네임스페이스 규약(`/Sa`=관리자, `/user/*/Mc`=상담사 등)으로 **추정** 표기하고 근거를 남겼다.
2. **메뉴에 실제 노출되는지 여부(`메뉴노출` 컬럼).** `SY_MENU.USE_YN`/`DLTE_YN`이 DB 값이라 전 화면 `미확인`. 다만 `SY_MENU.USER_DVID`가 `'ADMIN'`/`'USER'` 2값뿐인 것은 SQL에서 확인됨.
3. **테이블 행 수·실데이터.** DB 미접속 원칙. 지시서 §2에 주어진 행 수 정보만 인용.
4. **`build/classes` 하위 `.class`와 소스 불일치 여부.** 컴파일 산출물은 분석 대상에서 제외했다.
5. **`document/` 폴더(기획서·ERD·DB작업)**는 열지 않았다. 지시서가 소스 분석을 요구했고, 기획서는 현행 동작의 근거가 될 수 없다고 판단. 필요하면 별도 요청 바람.

### 분석 신뢰도 주의
- `04_table_usage.md`의 R/C/U/D는 **statement 종류 기준**이다. 예컨대 `DELETE ... WHERE x IN (SELECT ... FROM A)` 는 A가 `D`로 계상된다. 실제 쓰기 대상 판별에는 `Ids` 컬럼의 statement 이름을 함께 봐야 한다.
- 테이블명 추출은 정규식 기반이라 서브쿼리 별칭·Oracle 힌트가 테이블로 오인될 여지가 있다. 상위 60개는 눈으로 확인했고, 하위는 미검증.
