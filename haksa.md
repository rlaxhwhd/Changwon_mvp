# 드림캐치 학사연계 VIEW 정의 정리

> 원본: `docs/Dream_view.xlsx` (문서 기준일 2026-11-20, 6개 시트). 이 파일은 전산원 제공 정의를 읽기 쉽게 재구성한 참조 문서다. 실제 DB의 행·권한·업무 의미가 확정됐다는 뜻은 아니다. 엑셀에서 “키/필수”는 요청 정의이며 DB 제약 조건을 뜻하지 않는다.

## 1. 제공 범위와 연계 원칙

원본에는 `INTRANET` 스키마의 7개 VIEW, `REQUEST` 스키마의 9개 VIEW, 총 16개 VIEW와 컬럼 정의 247개가 수록돼 있다. 계정에는 필요한 VIEW의 SELECT 권한을 부여하는 방식이며 접속 주소·서비스명·계정·권한 현황은 원본에서 별도 협의 대상으로 적혀 있다. 따라서 스키마명은 접속 계정이나 DB 링크명이 아니다.

| 항목 | 제공·연계 기준 |
| --- | --- |
| 기준일 | 2026-11-20 |
| 조회 대상 | Oracle 12c. 화면에서 확인된 뷰 16개를 스키마명과 함께 표기합니다. |
| 정의 기준 | 소유 스키마는 DB 객체 화면 기준입니다. 컬럼 정의는 생성 SQL 및 원천 명세서 기준입니다. DB의 실제 컬럼·타입·VALID 상태는 인수 전 대조 대상입니다. |
| 접속 권한 | 연계 계정에는 필요한 뷰의 SELECT만 부여하는 방식입니다. 접속 주소·서비스명·계정·권한 부여 현황은 별도 협의합니다. |
| 초기 적재 | 권한과 제공 범위를 확인한 뒤 전체 기준본을 적재합니다. 중복 검사는 뷰 목록의 논리 키로 수행합니다. |
| 정기 적재 | 요청 기준은 매일 새벽 1회 이상입니다. 완료된 공급본만 공개하고 실패 시 직전 공급본을 유지하는 운영 방식은 별도 확정이 필요합니다. |
| 증분 적재 | UPD_DT가 없거나 NULL인 뷰 및 변경 종류가 일부만 반영되는 뷰에는 UPD_DT 단독 증분을 적용하지 않습니다. 재조회 범위·대체 기준은 별도 협의합니다. |
| 문자·날짜 | 코드와 학번·사번은 문자열로 읽고 선행 0을 유지합니다. BYTE는 Oracle 바이트 길이입니다. Oracle DATE는 시각을 포함할 수 있으며 문자열 일자는 컬럼별 형식을 따릅니다. |
| 키·널 표기 | 논리 키와 필수 여부는 요청정의서 기준입니다. 뷰에 PK·NOT NULL 제약이 선언됐다는 의미가 아니며, 인수 검사로 확인합니다. |
| 제공 자료 범위 | 본 정의서는 뷰와 컬럼 계약을 설명합니다. 실제 학생·교직원 데이터와 접속 정보는 포함하지 않습니다. |

연계 시에는 식별자와 코드의 선행 0을 보존한다. Oracle `DATE`는 시각이 포함될 수 있고, 문자열 날짜는 각 컬럼의 형식을 따른다. 초기에는 전체 기준본을 적재하고 논리 키 중복을 확인한다. 정기 적재 요청 주기는 **매일 새벽 1회 이상**이다. 완료된 공급본 공개·실패 시 이전 공급본 유지 방식과, `UPD_DT`가 NULL이거나 일부 변경만 반영되는 VIEW의 재조회 정책은 별도 확정해야 한다.

## 2. VIEW 목록

| 스키마 | 뷰 이름 | 제공 내용 | 논리 키 | 요약 | 컬럼 근거 | 인수 확인 |
| --- | --- | --- | --- | --- | --- | --- |
| INTRANET | DC_V_USR_INF | 통합 사용자 | INTG_UID | 학생·교직원 통합 식별 및 소속·학적 정보 | 생성 SQL | 졸업예정 연월, 다전공 대표값, 휴직 코드와 갱신 범위 확인 필요 |
| INTRANET | DC_V_ADD_JOB_PART | 겸직 | 업무키 확인 필요 | 교직원 겸직 소속. 원천 컬럼 전체 제공 구조 | 요청정의서 | 요청서의 4개 컬럼을 기재. 전체 컬럼과 유일성은 DB 대조 필요 |
| INTRANET | DC_V_COL_INF | 단과대학 | COL_CODE | 단과대학 코드와 명칭 | 원천 명세 | 원천 전체 컬럼 제공 구조 |
| INTRANET | DC_V_DEPT_INF | 학과 | DEPT_CODE | 학부·대학원 소속 학과 코드 | 원천 명세 | 과정과 학과 코드를 함께 해석 |
| INTRANET | DC_V_MAJOR_INF | 전공 | MAJOR_CODE | 전공·트랙 코드 및 학과 연결 | 원천 명세 | 트랙은 GUBUN_CODE = '2' |
| INTRANET | DC_V_ORG_INF | 기관 | ORG_CODE | 기관 코드와 기관명 | 원천 명세 | 원천 전체 컬럼 제공 구조 |
| INTRANET | DC_V_PART_INF | 부서 | PART_CODE | 부서 코드·기관 연결 | 원천 명세 | 원천 전체 컬럼 제공 구조 |
| REQUEST | DC_V_STU_SUGANG_INF | 수강·이수 이력 | INTG_UID + YEAR + SMT + GRAD_DIV + CURI_NUM | 확정 성적 우선, 확정 전 수강신청 보완 | 생성 SQL | 요청 키 유일성, 취소·재수강 이력, 인정학점 및 과거 학기 매핑 확인 필요 |
| REQUEST | DC_V_LECT_OPEN_INF | 개설 강좌 | YEAR + SMT + GRAD_DIV + CURI_NUM + COURSE_CLS | 학기별 강좌·분반, 담당교수, 수강 대상, 강의개요 | 생성 SQL | 공식 개설 확정 기준과 과거 범위 확인 필요 |
| REQUEST | DC_V_SUBJ_INF | 교과목 마스터 | GRAD_DIV + CURI_NUM | 교과목 코드·명칭·학점·기본 이수구분 | 생성 SQL | 폐지 과목 포함. 사용 여부 코드 확인 필요 |
| REQUEST | DC_V_CURRI_INF | 학과별 연도별 교육과정 | CURRI_YEAR + DEPT_CD + GRAD_DIV + CURI_NUM | 적용연도별 전공·학과 교육과정 및 교양 과목 | 생성 SQL | 연도 원천이 있는 자료 제공. 필수 여부·중복 우선순위 잠정 |
| REQUEST | DC_V_CAP_INF | 역량 코드표 | CAP_DIV + DEPT_CD + CAP_CD | 핵심 및 학과별 전공역량 코드 | 생성 SQL | 공식 만점, 핵심 DNA 코드 대응 및 전공 표시순서 미확정 |
| REQUEST | DC_V_LECT_CAP_INF | 강의별 역량 배정 점수 | YEAR + SMT + GRAD_DIV + CURI_NUM + COURSE_CLS + CAP_DIV + DEPT_CD + CAP_CD | 강의계획서 기반 핵심역량 수치 | 생성 SQL | 이수 1건당 공식 배점인지 확인 필요. 전공 배점 원천 미확정 |
| REQUEST | DC_V_STU_CAP_INF | 학생별 역량 인정 점수 | INTG_UID + CAP_DIV + DEPT_CD + CAP_CD | 학생별 최신 비교과 분석 차수의 핵심역량 수치 | 생성 SQL | 연구용 자료. 공식 누적 인정 점수·기준일·변경일시 확인 필요 |
| REQUEST | DC_V_USR_MAJOR_INF | 학생별 다전공 | INTG_UID + MAJOR_TYPE + MAJOR_SEQ | 전공 유형·전공별 승인·이수·취소·포기 상태 | 생성 SQL | 순번 재산정 가능. 적용 교육과정 연도 미확정 |
| REQUEST | DC_V_CODE_INF | 공통 코드표 | CODE_GRP + CODE | 공통 코드 그룹 12개와 표시명 | 생성 SQL | 휴직·퇴직 코드 충돌 확인 필요 |

### 기능별 연결

- **학생 기본·소속:** `INTRANET.DC_V_USR_INF`에 본전공·학적·평점·학점 누계 등이 있다. `MAJOR_CD1`은 제한된 경우의 제2전공 표시이므로 다전공 전체는 `REQUEST.DC_V_USR_MAJOR_INF`를 사용한다.
- **교과목·개설강좌:** `REQUEST.DC_V_SUBJ_INF`는 교과목 마스터, `DC_V_LECT_OPEN_INF`는 연도·학기·분반별 개설강좌, `DC_V_CURRI_INF`는 학과·전공의 교육과정 소속이다.
- **수강·이수 이력:** `REQUEST.DC_V_STU_SUGANG_INF`는 학생별 성적·평점·취득학점·이수 여부를 제공한다. 취소·재수강 대체 이력과 학점 인정 원천은 아직 확인 대상이다.
- **역량:** `REQUEST.DC_V_CAP_INF`는 핵심·전공역량 코드, `DC_V_LECT_CAP_INF`는 강좌별 역량 수치, `DC_V_STU_CAP_INF`는 연구용 비교과 합산자료의 학생별 최신 차수 원값이다(공식 누적 인정 여부 미확정). 각각의 공식 점수 여부·만점·기준일을 확정해야 추천 및 5각형 그래프의 점수로 사용할 수 있다.
- **조직·겸직·코드:** `INTRANET`의 조직 계열 VIEW와 `REQUEST.DC_V_CODE_INF`를 연결한다. 코드는 값 단독이 아니라 `CODE_GRP + CODE`로 조회한다.

## 3. 조인 규칙

| 연결 대상 | 뷰 연결 | 조인 키 | 연계 시 처리 |
| --- | --- | --- | --- |
| 학생 | REQUEST.DC_V_STU_SUGANG_INF / DC_V_STU_CAP_INF / DC_V_USR_MAJOR_INF → INTRANET.DC_V_USR_INF | INTG_UID | 학생은 USER_TY_CD = '0001'. 학번을 문자열로 비교. |
| 담당 교수 | REQUEST.DC_V_LECT_OPEN_INF → INTRANET.DC_V_USR_INF | PROF_ID = EMP_NO | 학번·로그인 ID와 혼용하지 않음. 주담당을 정할 수 없거나 사번 매핑이 없으면 NULL. |
| 겸직 | INTRANET.DC_V_ADD_JOB_PART → INTRANET.DC_V_USR_INF | EMP_NO 우선. INTG_UID는 로그인 ID 체계 확인 후 사용 | 교직원 한 명의 겸직 행은 여러 개일 수 있음. |
| 교과목 | REQUEST.DC_V_STU_SUGANG_INF / DC_V_LECT_OPEN_INF / DC_V_CURRI_INF → REQUEST.DC_V_SUBJ_INF | GRAD_DIV + CURI_NUM | GRAD_DIV가 없거나 개설 상세와 교과목 마스터의 과정 코드가 다르면 미연결 가능. |
| 수강·개설강좌 | REQUEST.DC_V_STU_SUGANG_INF → REQUEST.DC_V_LECT_OPEN_INF | YEAR + SMT + GRAD_DIV + CURI_NUM + COURSE_CLS | 수강 이력에서 분반이 NULL이면 강좌를 임의 선택하지 않음. |
| 강좌 역량 | REQUEST.DC_V_LECT_CAP_INF → REQUEST.DC_V_LECT_OPEN_INF | YEAR + SMT + GRAD_DIV + CURI_NUM + COURSE_CLS | 강좌별 역량은 여러 행. |
| 역량 | REQUEST.DC_V_LECT_CAP_INF / DC_V_STU_CAP_INF → REQUEST.DC_V_CAP_INF | CAP_DIV + DEPT_CD + CAP_CD | 핵심역량의 DEPT_CD는 ALL. |
| 단과대학·학과 | INTRANET.DC_V_DEPT_INF → INTRANET.DC_V_COL_INF | COL_CODE | 통합 사용자 DAEHAK_CD도 COL_CODE에 연결. |
| 전공·학과 | INTRANET.DC_V_MAJOR_INF → INTRANET.DC_V_DEPT_INF | DEPT_CODE | DC_V_USR_MAJOR_INF.MAJOR_CD는 MAJOR_CODE에 연결. 통합 사용자 HAKBU_CD는 DEPT_CODE에 연결. |
| 기관·부서 | INTRANET.DC_V_PART_INF → INTRANET.DC_V_ORG_INF | ORG_CODE | 사용자의 ORGID와 PARTID는 각각 ORG_CODE, PART_CODE와 대조. 일부 값은 공란 또는 겸직에서 보완. |
| 교육과정 소속 | REQUEST.DC_V_CURRI_INF → INTRANET.DC_V_DEPT_INF 또는 DC_V_MAJOR_INF | DEPT_CD = DEPT_CODE 또는 MAJOR_CODE | DEPT_CD는 학과·전공 코드 혼용. 양쪽에 모두 있으면 임의로 연결하지 않음. 교양은 주관학과 코드. |
| 공통 코드 | 각 뷰 코드 컬럼 → REQUEST.DC_V_CODE_INF | CODE_GRP + CODE | CODE 단독 조회 금지. 역사 데이터는 USE_YN = 'N'이어도 표시명 조회 가능. |

## 4. 공통 코드와 표시 규칙

| 코드 그룹 | 코드와 표시명 | 연계 시 처리 |
| --- | --- | --- |
| SMT | 1 1학기 · 2 2학기 · 3 하계 계절학기 · 4 동계 계절학기 | 성적 원천 학기 변환은 2024~2026년 대조 기준. 이전 연도 예외 확인 필요. |
| GRAD_DIV / UNIV_CD | 학사 과정 코드 및 명칭 | 학생 과정과 강좌·교과목 과정 구분은 용도가 다름. |
| GRADE | 학사 성적코드 및 등급명 | GPA가 없는 등급은 NULL. |
| COMDIV_CD | 세부 이수구분 우선. 공란이면 원천 대분류 코드 | 수강은 학생 기준, 강좌는 개설 기준, 교과목은 기본 이수구분. |
| OPEN_STAT | 01 예정 · 02 확정 · 03 폐강 | 현행 강좌의 공식 확정 시점 확인 필요. |
| CAP_DIV | CORE 핵심역량 · MAJOR 전공역량 | 핵심 코드는 ACE1~ACE5. 전공은 전공코드:역량코드 또는 학과 공통 원천 코드. |
| USER_TY_CD | 0001 학생 · 0002 교원 · 0003 직원 · 0004 조교 | 문자열로 비교. |
| HOFC_STA_CD | 0001 재학 · 0002 휴학 · 0003 수료 · 0004 제적 · 0005 졸업 · 0006 재직 · 00007 퇴직 | 현행 SQL에는 휴직과 퇴직에 00007이 함께 나올 수 있어 별도 코드 확정 필요. |
| RANKID | 학사 직급 코드 / 명칭 | 원천 사용 여부에 따라 조회. |
| MAJOR_TYPE | 1 복수전공 · 2 부전공 · 3 융합전공 · 4 연계전공 · 5 융합전공 · 6 마이크로디그리 · 7 USG공유대학 융합전공 · 8 나노디그리 · 9 학생설계전공 | 3과 5는 표시명이 같아도 서로 다른 코드. |
| MAJOR_STAT | 01 승인 · 02 이수 중 · 03 이수 완료 · 04 취소 · 05 포기 · 06 이수 실패 | 이력 시점이 충돌하면 NULL 가능. |

## 5. 인수 전 확인 사항

| 확인 항목 | 관련 범위 | 확인 주체 | 확인 내용 |
| --- | --- | --- | --- |
| DB 실물 대조 | 16개 전체 | DB 관리자 | 소유자·VALID 상태·컬럼 순서·타입·BYTE/CHAR 길이·계정 SELECT 권한을 조회해 대조합니다. 특히 SELECT * 조직 뷰와 편집 재실행된 SQL을 우선 확인합니다. |
| 요청 폭 차이 | 수강·개설·교과목·교육과정·강좌역량 | 양측 | CURI_NUM 6→14바이트, COURSE_CLS 3→4바이트, CURI_NM 80→200바이트, CAP_NM 100→500바이트의 수신 길이 반영 여부를 확정합니다. |
| 조회 성능 | 수강·이수 및 개설 강좌 등 | 양측 | 초기 전체 적재와 일상 조회를 구분해 실행 시간·건수를 측정합니다. 학번 또는 연도·학기 범위로 나눠 적재 가능한지 확인합니다. |
| 수강 생명주기 | DC_V_STU_SUGANG_INF | 학사 담당 | 취소·재수강으로 대체된 원 수강 행 보존, 로그 코드, 이전 연도·계절학기, 학점 인정 원천 및 중복 키를 확인합니다. |
| 강좌 상태 및 교수 | DC_V_LECT_OPEN_INF | 학사 담당 | 공식 개설 확정 시점과 폐강 코드, 다음 학기 노출, 과거 범위와 팀티칭·교수 사번 미매핑을 확인합니다. |
| 역량 점수 및 만점 | DC_V_CAP_INF / DC_V_LECT_CAP_INF / DC_V_STU_CAP_INF | 역량 담당 | 강의계획서 수치가 이수 1건당 공식 배점인지, 연구용 비교과 합산자료가 공식 누적값인지, 만점·기준일·변경일·전공 점수 원천을 확인합니다. |
| 학생 및 다전공 | DC_V_USR_INF / DC_V_USR_MAJOR_INF | 학사 담당 | 임시이수학기와 실제 이수학기 대응, 졸업예정 최신 차수, 다전공 대표 선정·적용연도와 상태 불명확 사례를 확인합니다. |
| 교직원 상태 | DC_V_USR_INF / DC_V_CODE_INF | 인사 담당 | 휴직과 퇴직의 코드 충돌을 해소한 뒤 코드표와 사용자 뷰를 함께 확정합니다. |
| 교육과정과 과정 코드 | DC_V_CURRI_INF / DC_V_SUBJ_INF / DC_V_LECT_OPEN_INF | 학사 담당 | 과정 코드의 일치 여부, 교양 주관학과, 전공·트랙 구분, 적용연도 없는 자료와 필수 규칙을 확인합니다. |
| 운영 갱신 | 16개 전체 | 양측 | 제공 완료 시점·장애 복구·증분 워터마크와 UPD_DT가 비는 뷰의 재조회 정책을 정합니다. |
| 정의서 근거 | DB 객체 목록 화면 2건 / 2026-11-18 학사연계 요청정의서 / 테이블 명세서 / 뷰 생성 SQL | 문서 기준 | 객체 목록은 소유 스키마·객체명을 확인하는 근거입니다. 실제 DB 컬럼 및 접근 권한은 현행 DB와 대조합니다. |

## 6. 기능 구현 전에 결정할 업무 기준

1. **강좌 역량 점수:** `DC_V_LECT_CAP_INF.CAP_POINT`는 강의계획서 수치 원값이다. “이수 1건당 공식 배점”인지 확인되지 않았다. 특히 전공역량의 강좌별 점수 원천과 적용 기간을 확인해야 한다.
2. **학생 역량 점수:** `DC_V_STU_CAP_INF.CAP_SCORE`는 연구용 비교과 합산자료의 학생별 최신 차수 원값이다. 공식 누적 인정 점수 여부가 미확정이며 `BASE_DT`와 `UPD_DT`는 현재 NULL이라고 명세돼 있다. 5각형 그래프의 만점·정규화 기준도 확정되지 않았다.
3. **수강 인정:** `FINISH_YN`은 미판정 시 NULL이고 `CHK_RECURI`는 현재 NULL이다. `GET_CDT`는 수강 당시 인정학점이 아니라 통과 시 교과목 마스터 학점을 잠정 사용한다. 이 상태로 이수 역량 합산이나 학점 인정 결과를 확정하면 안 된다.
4. **개설강좌 상태:** `OPEN_STAT`의 예정·확정·폐강 코드가 제시됐으나 공식 확정 시점, 다음 학기 노출과 팀티칭 대표 교수 선정은 확인 대상이다.
5. **다전공:** `DC_V_USR_MAJOR_INF`는 본전공을 제외한 여러 전공 행을 제공하지만 `MAJOR_SEQ`는 이력 보완 시 달라질 수 있고 `CURRI_YEAR`는 현재 NULL이다. 상태·승인/포기 시점의 충돌 처리도 확정해야 한다.
6. **교육과정 조인:** `DC_V_CURRI_INF.DEPT_CD`에 학과 코드와 전공 코드가 섞여 있다. 두 코드표에 동시에 일치하면 임의 선택하지 않는다. `REQ_YN`은 이수구분명으로 잠정 판정한다.
7. **사용자 상태:** `HOFC_STA_CD`의 `00007`은 휴직·퇴직이 충돌할 수 있다. 사용자 VIEW와 코드표를 함께 정정·확인해야 한다.
8. **증분 적재:** 일부 `UPD_DT`는 NULL 또는 변경 종류의 일부만 반영한다. 삭제·취소·상태 변경을 포함하는 전체/기간 재조회 정책이 필요하다.

## 7. 원본의 컬럼 정의 전체

아래 표는 엑셀 `컬럼 정의` 시트의 247개 행을 VIEW별로 옮긴 것이다. **자료형은 정의서/생성 SQL 기준**이며 DB 실물 자료형, NULL 가능 여부, 키 제약과는 별도 검증 대상이다. 빈 “키·필수” 칸은 원본에서도 지정되지 않았다.

### INTRANET.DC_V_USR_INF (35개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | INTG_UID | VARCHAR2(40 BYTE) | 키 | 통합식별자 | 학생은 학번, 교직원은 로그인 ID. 교직원 사번은 EMP_NO. |
| 2 | EMP_NO | VARCHAR2(10 BYTE) |  | 사번 | 교원 · 직원 · 조교 |
| 3 | ORGID | VARCHAR2(8 BYTE) |  | 소속 조직 코드 | 학생 기관 코드는 현재 NULL. |
| 4 | PARTID | VARCHAR2(8 BYTE) |  | 소속 부서 코드 | 교직원 = C_PART.PART_CODE |
| 5 | RANKID | VARCHAR2(8 BYTE) |  | 직급 코드 | 교직원 |
| 6 | HOFC_STA_CD | VARCHAR2(5 BYTE) |  | 학적·재직 상태 코드 | 00007의 휴직·퇴직 중복은 협의 대상. |
| 7 | HOFC_STA_NM | CHAR(6 BYTE) |  | 학적·재직 상태명 | 재학 · 휴학 · 수료 · 졸업 · 제적 · 재직 · 휴직 · 퇴직 |
| 8 | USER_TY_CD | CHAR(4 BYTE) |  | 신분 코드 | 0001 학생 · 0002 교원 · 0003 직원 · 0004 조교 |
| 9 | USER_TY_NM | CHAR(6 BYTE) |  | 신분명 |  |
| 10 | USR_NM | VARCHAR2(100 BYTE) |  | 이름 |  |
| 11 | TEL | VARCHAR2(40 BYTE) |  | 전화 |  |
| 12 | HP | VARCHAR2(40 BYTE) |  | 휴대전화 |  |
| 13 | POST | VARCHAR2(12 BYTE) |  | 우편번호 |  |
| 14 | ADDR1 | VARCHAR2(400 BYTE) |  | 주소 |  |
| 15 | EMAIL | VARCHAR2(200 BYTE) |  | 이메일 |  |
| 16 | SEX | VARCHAR2(1 BYTE) |  | 성별 | 0 남 · 그 외 여 |
| 17 | STU_SCHGR | VARCHAR2(1 BYTE) |  | 학년 | 1~5 |
| 18 | UNIV_CD | VARCHAR2(2 BYTE) |  | 과정·대학원 구분 | 00 학부 · 01 석사 · 02 박사 · 03~12 특수대학원 · 90 기타 · 91 92 라벨 확인 |
| 19 | DAEHAK_CD | VARCHAR2(2 BYTE) |  | 단과대학 코드 | C_COL.COL_CODE |
| 20 | HAKBU_CD | VARCHAR2(8 BYTE) |  | 학부·학과 코드 | C_DEPT.DEPT_CODE · 교원은 소속 학과 |
| 21 | MAJOR_CD | VARCHAR2(8 BYTE) |  | 전공 코드 | 학생 원천의 000, 00, 문자열 NULL을 미지정으로 처리. |
| 22 | MAJOR_CD1 | VARCHAR2(8 BYTE) |  | 제2전공 코드 | 승인·포기 시점 적용 후 남은 코드가 1개인 경우만 표시. 전체 다전공은 DC_V_USR_MAJOR_INF. |
| 23 | AGE | VARCHAR2(16 BYTE) |  | 생년월일 | YYYYMMDD |
| 24 | FOR_YN | VARCHAR2(1 BYTE) |  | 외국인 여부 | Y / N |
| 25 | GRADE | NUMBER |  | 누적 평점 | 0~4.5 |
| 26 | OUT_DT | VARCHAR2(8 BYTE) |  | 졸업일 | YYYYMMDD |
| 27 | ENTER_DT | VARCHAR2(8 BYTE) |  | 입학일 | YYYYMMDD |
| 28 | ISU_GRADE | NUMBER |  | 취득 학점 누계 |  |
| 29 | PHOTO | VARCHAR2(60 BYTE) |  | 증명사진 파일명 | 파일명 제공. 경로·인증 방식·갱신 절차는 별도 확정. |
| 30 | ISU_SMT_CNT | NUMBER(2,0) |  | 이수 학기 수 | 임시이수학기 값 사용. 휴학 제외 및 최종 인정 기준 확인. |
| 31 | CURRI_YEAR | VARCHAR2(4 BYTE) |  | 적용 교육과정 연도 | 편입·재입학 등 입학연도와 다를 때 실제 적용 연도 |
| 32 | TRACK_CD | VARCHAR2(10 BYTE) |  | 세부전공·트랙 코드 | 트랙 운영 학과만 · 그 외 빈값 |
| 33 | TRACK_NM | VARCHAR2(100 BYTE) |  | 세부전공·트랙명 |  |
| 34 | GRAD_EXP_YM | VARCHAR2(6 BYTE) |  | 졸업예정 연월 | 재학·휴학 및 졸업자료 등록 학생 중 최신 차수 졸업 판정, 졸업일 당일 이후에만 YYYYMM. |
| 35 | UPD_DT | DATE |  | 최종 변경일시 | 학생 학적변동 처리시각 범위. 교직원 및 일부 변경 유형은 미반영. |

### INTRANET.DC_V_ADD_JOB_PART (4개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | INTG_UID | VARCHAR2(40) | 필수 | 통합식별자 | 요청값. 뷰의 전체 컬럼과 자료형은 DB에서 확인. |
| 2 | EMP_NO | VARCHAR2(10) | 필수 | 사번 | 요청값. 뷰의 전체 컬럼과 자료형은 DB에서 확인. |
| 3 | ORGID | VARCHAR2(8) | 필수 | 소속 조직 코드 | 요청값. 뷰의 전체 컬럼과 자료형은 DB에서 확인. |
| 4 | PARTID | VARCHAR2(8) | 필수 | 겸직 학과·부서 코드 | 요청값. 뷰의 전체 컬럼과 자료형은 DB에서 확인. |

### INTRANET.DC_V_COL_INF (10개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | COL_CODE | VARCHAR2(2 BYTE) | 키 | 대학코드 |  |
| 2 | COL_NAME | VARCHAR2(40 BYTE) | 필수 | 대학명(한글) |  |
| 3 | COL_NAME_ENG | VARCHAR2(200 BYTE) |  | 대학명(영문) |  |
| 4 | COL_SHORT_NAME | VARCHAR2(40 BYTE) | 필수 | 대학명(줄임) |  |
| 5 | EDU_COL_CODE | VARCHAR2(16 BYTE) |  | 교육부코드 |  |
| 6 | PROCESS_DATE | DATE |  | 처리일자 |  |
| 7 | PROCESS_MAN | VARCHAR2(40 BYTE) |  | 처리자 |  |
| 8 | LISTORDER | NUMBER(2,0) |  | 출력순서 |  |
| 9 | STATUS_COL_CODE | VARCHAR2(10 BYTE) |  | 고등교육통계(단과대학코드) |  |
| 10 | USE_FLAG | VARCHAR2(1 BYTE) |  | 사용여부 | 1 사용 |

### INTRANET.DC_V_DEPT_INF (51개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | DEPT_CODE | VARCHAR2(8 BYTE) | 키 | 학과코드 |  |
| 2 | COL_CODE | VARCHAR2(2 BYTE) | 필수 | 대학코드 | C_COL.COL_CODE |
| 3 | DEPT_NAME | VARCHAR2(200 BYTE) | 필수 | 학과명(한글) | 동명 학과가 과정별로 있음 · 코드로 식별 |
| 4 | DEPT_NAME_ENG | VARCHAR2(200 BYTE) |  | 학과명(영문) |  |
| 5 | DEPT_SHORT_NAME | VARCHAR2(60 BYTE) |  | 학과명(줄임) |  |
| 6 | EDU_DEPT_CODE | VARCHAR2(8 BYTE) |  | (미사용) |  |
| 7 | CLASS1 | VARCHAR2(2 BYTE) |  | (미사용) |  |
| 8 | CLASS2 | VARCHAR2(2 BYTE) |  | (미사용) |  |
| 9 | CLASS3 | VARCHAR2(2 BYTE) | 필수 | 외부보고용계열(1:인문사회,2:자연계,3:공학계,4:의학계,5:예체능계 |  |
| 10 | UNIV_CODE | VARCHAR2(4 BYTE) |  | 학부대학원구분 | V_USR_INF.UNIV_CD와 같은 체계 |
| 11 | DAY_FLAG | VARCHAR2(2 BYTE) | 필수 | 주·야 {1: 주간, 0: 야간} |  |
| 12 | USE_FLAG | VARCHAR2(2 BYTE) |  | 사용여부 | 1 사용 |
| 13 | DEGREE_CODE | VARCHAR2(6 BYTE) | 필수 | 학위코드(예외사항은 DEGREE_MAPPING 테이블), 기본값 A00: 전공별 배정 |  |
| 14 | DISPLAY_SUBJECT_CODE | VARCHAR2(4 BYTE) |  | 교직표시과목코드(c_display_subject.display_subject_code) |  |
| 15 | OPEN_YEAR | VARCHAR2(8 BYTE) |  | 신설년도 |  |
| 16 | CLOSE_YEAR | VARCHAR2(8 BYTE) |  | 폐지년도 |  |
| 17 | MAJOR_CODE | VARCHAR2(8 BYTE) |  | (미사용) |  |
| 18 | ORDER_NO | NUMBER(2,0) |  | (미사용) |  |
| 19 | PROCESS_DATE | DATE |  | 처리일자 |  |
| 20 | PROCESS_MAN | VARCHAR2(40 BYTE) |  | 처리자 |  |
| 21 | CLASS_DEPT | VARCHAR2(8 BYTE) |  | 1:교직이 설치된학과0:교직미설치학과 |  |
| 22 | FACULTY_CLASS | VARCHAR2(2 BYTE) |  | 1:일반학과, 2:계약학과, 3:전공(트랙) |  |
| 23 | GROUP_FLAG | VARCHAR2(2 BYTE) |  | 내부용(1:학과 2:학군 3:학부) |  |
| 24 | MANAGE_CODE | VARCHAR2(8 BYTE) |  | (미사용) |  |
| 25 | DISPLAY_DEPT | VARCHAR2(60 BYTE) |  | ? |  |
| 26 | SUUP_USEFLAG | VARCHAR2(2 BYTE) |  | 사용여부(강좌개설및수강가능학과) |  |
| 27 | LABACT_GRADE | VARCHAR2(2 BYTE) |  | 연구활동급수(보험가입급수) |  |
| 28 | SUUP_DEPT_CODE | VARCHAR2(8 BYTE) |  | 강좌개설학과매핑(대학원만사용) |  |
| 29 | LISTORDER | NUMBER(5,0) |  | 출력순서 |  |
| 30 | GUBUN_CODE | VARCHAR2(2 BYTE) | 필수 | 학과구분(1:학과 2:학군 3:학부, 4:트랙학부) 20230415 4: 트랙학부 추가(창업자산융합학부) 같은 경우 트랙을 학과레벨로 보지 않음 |  |
| 31 | JOIN_FLAG | VARCHAR2(2 BYTE) |  | 통합학부여부, 강사료에서 전임교원 지급기준 3시간 |  |
| 32 | MAJOR_DISPLAY_FLAG | VARCHAR2(2 BYTE) |  | 고등통계작업시 학과등재시 전공표시여부 |  |
| 33 | EDU_CODE | VARCHAR2(4 BYTE) |  | 교육부중계열코드(고등교육통계용) |  |
| 34 | STATUS_DEPT_CODE | VARCHAR2(40 BYTE) |  | 고등교육통계 학과코드 |  |
| 35 | STATUS_CLASS_YEAR_CODE | VARCHAR2(2 BYTE) |  | 고등교육통계 수업연한 코드 |  |
| 36 | ASK_DATE | DATE |  | 코드등록 요청일시 |  |
| 37 | ASK_ID | VARCHAR2(20 BYTE) |  | 코드등록 요청자ID |  |
| 38 | STATE | VARCHAR2(1 BYTE) |  | 처리상태(A:승인요청,Y:승인, N:미승인) |  |
| 39 | SCYC_2022 | VARCHAR2(2 BYTE) |  | 고등교육통계 수업연한코드 2022 |  |
| 40 | SCYC_2021 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 41 | SCYC_2020 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 42 | SCYC_2019 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 43 | SCYC_2018 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 44 | SCYC_2017 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 45 | SCYC_2016 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 46 | SCYC_2015 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 47 | SCYC_2014 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 48 | SCYC_2013 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 49 | SCYC_2012 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 50 | SCYC_2011 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |
| 51 | SCYC_2010 | VARCHAR2(2 BYTE) |  | 원천 정의 확인 필요 |  |

### INTRANET.DC_V_MAJOR_INF (23개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | MAJOR_CODE | VARCHAR2(8 BYTE) | 키 | 전공코드 |  |
| 2 | MAJOR_NAME | VARCHAR2(100 BYTE) | 필수 | 전공명(한글) |  |
| 3 | MAJOR_NAME_ENG | VARCHAR2(200 BYTE) |  | 전공명(영문) |  |
| 4 | UNIV_CODE | VARCHAR2(4 BYTE) |  | 학부대학원구분 |  |
| 5 | PROCESS_DATE | DATE |  | 처리일자 |  |
| 6 | PROCESS_MAN | VARCHAR2(40 BYTE) |  | 처리자 |  |
| 7 | APPLY_FLAG | VARCHAR2(2 BYTE) |  | 사용안함 |  |
| 8 | DEPT_CODE | VARCHAR2(8 BYTE) |  | 학과코드 | C_DEPT.DEPT_CODE |
| 9 | USE_FLAG | VARCHAR2(2 BYTE) |  | 사용여부 | 1 사용 |
| 10 | MAJOR_ENAME_TECH | VARCHAR2(400 BYTE) |  | 사용안함-공학인증대상학과구분:전공표시(제증명) |  |
| 11 | MAJOR_ENAME_NOTECH | VARCHAR2(400 BYTE) |  | 사용안함-공학인증비대상학과:전공표시(제증명) |  |
| 12 | TECH_FLAG | VARCHAR2(2 BYTE) |  | 사용안함 |  |
| 13 | LABACT_GRADE | VARCHAR2(2 BYTE) |  | 연구활동급수(보험가입급수) |  |
| 14 | LISTORDER | NUMBER(5,0) |  | 출력순서 |  |
| 15 | ABEEK_START_YM | VARCHAR2(12 BYTE) |  | 공학인증적용시작년월 |  |
| 16 | ABEEK_END_YM | VARCHAR2(12 BYTE) |  | 공학인증적용종료년월 |  |
| 17 | LINC_FLAG | VARCHAR2(2 BYTE) |  | 현장실습참여전공여부(1:참여,0:비참여) |  |
| 18 | GUBUN_CODE | VARCHAR2(2 BYTE) |  | 0:학과코드랑 동일한 전공코드,1:전공,2:트랙, 3:연계전공, 4:공유복수전공, 5:마이크로디그리,7:USG공유대학 융합전공 , 8:나노디그리, 9:학생설계전공 |  |
| 19 | ASK_DATE | DATE |  | 코드신설 요청일시 |  |
| 20 | ASK_ID | VARCHAR2(20 BYTE) |  | 코드등록 요청자 |  |
| 21 | STATE | VARCHAR2(1 BYTE) |  | 처리상태 |  |
| 22 | DEGREE_CODE | VARCHAR2(3 BYTE) |  | 요청학위코드(전공별로 다른 경우는 degree_mapping 에 등록) |  |
| 23 | SPECIAL_FLAG | VARCHAR2(1 BYTE) |  | 특성화학과(전공)여부 |  |

### INTRANET.DC_V_ORG_INF (18개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | ORG_CODE | VARCHAR2(8 BYTE) | 키 | 기관코드 |  |
| 2 | ORG_NAME | VARCHAR2(200 BYTE) | 필수 | 기관명 |  |
| 3 | ORG_NAME_ENG | VARCHAR2(200 BYTE) |  | 기관영문명 |  |
| 4 | ORG_SHORT_NAME | VARCHAR2(80 BYTE) |  | 한글약어 |  |
| 5 | KIND | VARCHAR2(60 BYTE) |  | 기관분류명(kind_code 에 대한 코드명) |  |
| 6 | PROCESS_DATE | DATE |  | 처리일자 |  |
| 7 | PROCESS_MAN | VARCHAR2(40 BYTE) |  | 처리자 |  |
| 8 | USE_FLAG | VARCHAR2(1 BYTE) |  | 사용여부 | 1 사용 |
| 9 | POST_CODE | VARCHAR2(8 BYTE) |  | 등기우편물기관관리코드(mcode.c_post) |  |
| 10 | VIEW_ORDER | NUMBER(3,0) |  | 직제순서(동일 KIND_CODE 분류내에서) |  |
| 11 | BUDGET_DEPT_CODE | VARCHAR2(4 BYTE) |  | 기성회계분임코드 |  |
| 12 | KIND_ORDER | NUMBER(2,0) |  | 기관분류코드 |  |
| 13 | KIND_CODE | VARCHAR2(4 BYTE) |  | 기관분류순서 |  |
| 14 | POST_ORDER | NUMBER(3,0) |  | 사용안함 |  |
| 15 | NEW_ORG_CODE | VARCHAR2(8 BYTE) |  | 사용안함 |  |
| 16 | KORUS_CODE | VARCHAR2(20 BYTE) |  | 코러스 부서코드 |  |
| 17 | OPEN_DATE | DATE |  | 신설일자 |  |
| 18 | CLOSE_DATE | DATE |  | 폐지일자 |  |

### INTRANET.DC_V_PART_INF (26개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | PART_CODE | VARCHAR2(8 BYTE) | 키 | 부서코드 |  |
| 2 | PART_NAME | VARCHAR2(120 BYTE) | 필수 | 부서명 |  |
| 3 | PART_NAME_ENG | VARCHAR2(200 BYTE) |  | 부서영문명 |  |
| 4 | PART_SHORT_NAME | VARCHAR2(60 BYTE) |  | 한글약어 |  |
| 5 | PART_SHORT_ENAME | VARCHAR2(50 BYTE) |  | 원천 정의 확인 필요 |  |
| 6 | ORG_CODE | VARCHAR2(8 BYTE) | 필수 | 기관코드 | C_ORG.ORG_CODE |
| 7 | PROCESS_DATE | DATE |  | 처리일자 |  |
| 8 | PROCESS_MAN | VARCHAR2(40 BYTE) |  | 처리자 |  |
| 9 | NEW_PART_CODE | VARCHAR2(8 BYTE) |  | 사용안함->학과 홈페이지 표시용 학과코드(2024년부터조직개편학과코드표시) |  |
| 10 | USE_FLAG | VARCHAR2(2 BYTE) |  | 사용여부 | 1 사용 |
| 11 | DEPT_CODE | VARCHAR2(8 BYTE) |  | 관련학과코드 | C_DEPT.DEPT_CODE |
| 12 | MAJOR_CODE | VARCHAR2(8 BYTE) |  | 관련전공코드 | C_MAJOR.MAJOR_CODE |
| 13 | UNIV_PART_CODE | VARCHAR2(8 BYTE) |  | 코드매핑(직원업무관리) |  |
| 14 | PHOME_FLAG | VARCHAR2(2 BYTE) |  | 홈페이지개설여부 |  |
| 15 | VIEW_ORDER | NUMBER(3,0) |  | 부서순서(동일 org_code 내에서의 순서) |  |
| 16 | LABACT_GRADE | VARCHAR2(2 BYTE) |  | 연구활동급수 |  |
| 17 | HOMEPAGE | VARCHAR2(200 BYTE) |  | 홈페이지 주소 (URL) |  |
| 18 | DEPT_FLAG | VARCHAR2(2 BYTE) |  | 현재사용하는 학과코드랑 동일하면 1 |  |
| 19 | KORUS_PART_CODE | VARCHAR2(14 BYTE) |  | 코러스행정표준코드 |  |
| 20 | OVERTIME_WED | VARCHAR2(1 BYTE) | 필수 | 수요일 초과근무 가능여부 {1: 초과근무 가능, 0: 초과근무 불가} |  |
| 21 | GUBUN_CODE | VARCHAR2(2 BYTE) |  | 1: 부서 2: 학과 3: 트랙 |  |
| 22 | ASSISTANT_FLAG | VARCHAR2(2 BYTE) |  | 학과조교 major_code 와 일치여부확인 |  |
| 23 | KORUS_CODE | VARCHAR2(20 BYTE) |  | 코러스 부서코드 |  |
| 24 | SHORT_FLAG | VARCHAR2(1 BYTE) |  | 약어표시여부(Y/N) |  |
| 25 | OPEN_DATE | DATE |  | 신설일자 |  |
| 26 | CLOSE_DATE | DATE |  | 폐지일자 |  |

### REQUEST.DC_V_STU_SUGANG_INF (13개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | INTG_UID | VARCHAR2(40 BYTE) | 키 | 통합식별자 | V_USR_INF.INTG_UID 값 |
| 2 | YEAR | VARCHAR2(4 BYTE) | 키 | 수강 연도 | 4자리 연도. 유효하지 않은 값은 NULL 가능. |
| 3 | SMT | VARCHAR2(4 BYTE) | 키 | 학기 | 수강신청 학기 체계로 변환. 변환 미확인 과거 값은 NULL 가능. |
| 4 | GRAD_DIV | VARCHAR2(2 BYTE) | 키 | 과정 구분 | 교과목 과정 코드. 미연결 또는 2바이트 초과 시 NULL. |
| 5 | CURI_NUM | VARCHAR2(14 BYTE) | 키 | 교과목 코드 | 공통 학수번호. 요청 6바이트, SQL 14바이트. |
| 6 | COURSE_CLS | VARCHAR2(4 BYTE) |  | 분반 | 분반. 요청 3바이트, SQL 4바이트. |
| 7 | COMDIV_CD | VARCHAR2(4 BYTE) |  | 이수구분 (학생 기준) | 확정 성적 또는 수강신청의 학생별 세부 이수구분 우선. |
| 8 | GRADE | VARCHAR2(2 BYTE) |  | 성적 등급 | P/F 포함 · V_CODE_INF |
| 9 | GPA | NUMBER(4,2) |  | 평점 | 평점 계산 대상 등급에만 값 제공. |
| 10 | GET_CDT | NUMBER(3,1) |  | 취득 학점 | 통과 시 교과목 마스터 학점을 잠정 사용. 수강 당시 인정학점 확인 필요. |
| 11 | FINISH_YN | CHAR(1 BYTE) |  | 이수 인정 여부 | 취소·재수강 대체 상태는 로그 연계 전. 미판정은 NULL 가능. |
| 12 | CHK_RECURI | CHAR(1 BYTE) |  | 재수강 여부 | 현재 NULL. 재수강 원천 및 판정 기준 확인 필요. |
| 13 | UPD_DT | DATE |  | 최종 변경일시 | 성적·수강신청의 처리 및 최초 확정 시각 범위. 취소·재수강 로그는 미반영. |

### REQUEST.DC_V_LECT_OPEN_INF (13개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | YEAR | VARCHAR2(4 BYTE) | 키 | 개설 연도 |  |
| 2 | SMT | VARCHAR2(4 BYTE) | 키 | 개설 학기 | 계절학기 포함 · V_CODE_INF |
| 3 | GRAD_DIV | VARCHAR2(2 BYTE) | 키 | 과정 구분 |  |
| 4 | CURI_NUM | VARCHAR2(14 BYTE) | 키 | 교과목 코드 | 요청 6바이트, SQL 14바이트. |
| 5 | COURSE_CLS | VARCHAR2(4 BYTE) | 키 | 분반 | 요청 3바이트, SQL 4바이트. |
| 6 | OPEN_DEPT_CD | VARCHAR2(8 BYTE) |  | 개설 학과 코드 | C_DEPT.DEPT_CODE |
| 7 | COMDIV_CD | VARCHAR2(4 BYTE) |  | 이수구분 (개설 기준) | V_CODE_INF |
| 8 | PROF_ID | VARCHAR2(10 BYTE) |  | 담당 교수 사번 | 단독 또는 주담당 교수의 유일한 사번. 팀티칭 대표가 불명확하면 NULL. |
| 9 | TARGET_DEPT_CD | VARCHAR2(4000 BYTE) |  | 수강 대상 학과 | 콤마 구분. 제한 없음으로 판정된 경우 ALL. |
| 10 | TARGET_GRADE | VARCHAR2(20 BYTE) |  | 수강 대상 학년 | 콤마 구분. 공란 또는 0을 ALL로 해석하는 잠정 규칙. |
| 11 | OPEN_STAT | VARCHAR2(2 BYTE) |  | 개설 상태 | 01 예정, 02 확정, 03 폐강. 공식 상태 전환 규칙 확인 필요. |
| 12 | LECT_GOAL | VARCHAR2(4000 BYTE) |  | 수업목표 | 강의계획서 강의개요를 제공하는 잠정 매핑. |
| 13 | UPD_DT | DATE |  | 최종 변경일시 | 개설·상세·담당 배정·대상학과·계획서의 확인된 최신 처리일. |

### REQUEST.DC_V_SUBJ_INF (8개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | GRAD_DIV | VARCHAR2(2 BYTE) | 키 | 과정 구분 |  |
| 2 | CURI_NUM | VARCHAR2(14 BYTE) | 키 | 교과목 코드 | 요청 6바이트, SQL 14바이트. |
| 3 | CURI_NM | VARCHAR2(200 BYTE) |  | 교과목명 | 요청 80바이트, SQL 200바이트. |
| 4 | CDT_NUM | NUMBER(3,1) |  | 학점 |  |
| 5 | OWN_DEPT_CD | VARCHAR2(8 BYTE) |  | 주관학과 코드 | C_DEPT.DEPT_CODE |
| 6 | COMDIV_CD | VARCHAR2(4 BYTE) |  | 기본 이수구분 | V_CODE_INF |
| 7 | USE_YN | VARCHAR2(1 BYTE) |  | 사용 여부 | 폐지 플래그 1 또는 Y를 N으로 잠정 해석. |
| 8 | UPD_DT | DATE |  | 최종 변경일시 |  |

### REQUEST.DC_V_CURRI_INF (9개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | CURRI_YEAR | VARCHAR2(4 BYTE) | 키 | 교육과정 연도 |  |
| 2 | DEPT_CD | VARCHAR2(8 BYTE) | 키 | 학과·전공 코드 | 학과코드 또는 전공코드. 교양은 교과목의 주관학과. |
| 3 | GRAD_DIV | VARCHAR2(2 BYTE) | 키 | 과정 구분 |  |
| 4 | CURI_NUM | VARCHAR2(14 BYTE) | 키 | 교과목 코드 | 요청 6바이트, SQL 14바이트. |
| 5 | COMDIV_CD | VARCHAR2(4 BYTE) |  | 이수구분 | V_CODE_INF |
| 6 | REC_GRADE | NUMBER(1,0) |  | 권장 학년 | 동일 우선순위에서 값이 서로 다르면 NULL. |
| 7 | REC_SMT | VARCHAR2(4 BYTE) |  | 권장 학기 | 동일 우선순위에서 값이 서로 다르면 NULL. |
| 8 | REQ_YN | VARCHAR2(1 BYTE) |  | 필수 여부 | 이수구분명으로 필수·선택을 잠정 판정. |
| 9 | UPD_DT | DATE |  | 최종 변경일시 |  |

### REQUEST.DC_V_CAP_INF (8개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | CAP_DIV | VARCHAR2(10 BYTE) | 키 | 역량 구분 | 핵심 · 전공 · V_CODE_INF |
| 2 | DEPT_CD | VARCHAR2(8 BYTE) | 키 | 학과 코드 | 전공역량 = C_DEPT.DEPT_CODE · 핵심역량 = ALL |
| 3 | CAP_CD | VARCHAR2(10 BYTE) | 키 | 역량 코드 | 핵심 ACE1~ACE5. 전공은 학과 안의 중복을 피하기 위해 전공코드:역량코드를 사용. |
| 4 | CAP_NM | VARCHAR2(500 BYTE) |  | 역량 명칭 | 요청 100바이트, SQL 500바이트. |
| 5 | CAP_SEQ | NUMBER(2,0) |  | 표시 순서 | 핵심 1~5. 전공은 현재 NULL. |
| 6 | MAX_SCORE | NUMBER |  | 공식 만점·표시 기준 | 공식 만점 원천 확인 전까지 NULL. |
| 7 | USE_YN | VARCHAR2(1 BYTE) |  | 사용 여부 | 유효 날짜가 확인되지 않으면 NULL 가능. |
| 8 | UPD_DT | DATE |  | 최종 변경일시 | 핵심 기본코드는 NULL. 전공은 원천 변경 및 효력 날짜 반영. |

### REQUEST.DC_V_LECT_CAP_INF (10개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | YEAR | VARCHAR2(4 BYTE) | 키 | 개설 연도 | V_LECT_OPEN_INF |
| 2 | SMT | VARCHAR2(4 BYTE) | 키 | 개설 학기 | V_LECT_OPEN_INF |
| 3 | GRAD_DIV | VARCHAR2(2 BYTE) | 키 | 과정 구분 | V_LECT_OPEN_INF |
| 4 | CURI_NUM | VARCHAR2(14 BYTE) | 키 | 교과목 코드 | 개설 강좌와 동일한 14바이트. |
| 5 | COURSE_CLS | VARCHAR2(4 BYTE) | 키 | 분반 | 개설 강좌와 동일한 4바이트. |
| 6 | CAP_DIV | VARCHAR2(10 BYTE) | 키 | 역량 구분 | V_CAP_INF |
| 7 | DEPT_CD | VARCHAR2(8 BYTE) | 키 | 학과 코드 | V_CAP_INF |
| 8 | CAP_CD | VARCHAR2(10 BYTE) | 키 | 역량 코드 | V_CAP_INF |
| 9 | CAP_POINT | NUMBER |  | 이수 1건당 배정 점수 (공식) | 핵심역량 수치 원값. 공식 배점 여부는 미확정. 0 유지, NULL은 행 미생성. |
| 10 | UPD_DT | DATE |  | 최종 변경일시 | 계획서 변경일과 연결된 강좌 변경일 중 최신 값. |

### REQUEST.DC_V_STU_CAP_INF (7개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | INTG_UID | VARCHAR2(40 BYTE) | 키 | 통합식별자 | V_USR_INF.INTG_UID 값 |
| 2 | CAP_DIV | VARCHAR2(10 BYTE) | 키 | 역량 구분 | V_CAP_INF |
| 3 | DEPT_CD | VARCHAR2(8 BYTE) | 키 | 학과 코드 | V_CAP_INF |
| 4 | CAP_CD | VARCHAR2(10 BYTE) | 키 | 역량 코드 | V_CAP_INF |
| 5 | CAP_SCORE | NUMBER |  | 학교가 인정한 누적 점수 | 연구용 비교과 합산자료의 학생별 최신 차수 원값. 공식 누적 인정 점수 여부 미확정. |
| 6 | BASE_DT | VARCHAR2(8 BYTE) |  | 점수 기준일 | 현재 NULL. 공식 점수 기준일 원천 확인 필요. |
| 7 | UPD_DT | DATE |  | 최종 변경일시 | 현재 NULL. 증분 조회 기준일로 사용할 수 없음. |

### REQUEST.DC_V_USR_MAJOR_INF (6개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | INTG_UID | VARCHAR2(40 BYTE) | 키 | 통합식별자 | V_USR_INF.INTG_UID 값 · 본전공은 V_USR_INF에 있으므로 다전공만 |
| 2 | MAJOR_TYPE | VARCHAR2(2 BYTE) | 키 | 전공 유형 | 코드 3과 5는 각각 유지. |
| 3 | MAJOR_SEQ | NUMBER | 키 | 순번 | 학생·유형별 최초 확인 차수와 전공코드 순. 과거 이력 보완 시 변경 가능. SQL NUMBER. |
| 4 | MAJOR_CD | VARCHAR2(10 BYTE) |  | 전공 코드 | C_MAJOR.MAJOR_CODE · 소속 학과는 C_MAJOR.DEPT_CODE로 연결 |
| 5 | MAJOR_STAT | VARCHAR2(2 BYTE) |  | 전공 상태 | 승인·이수·취소·포기·이수 실패. 날짜 충돌 또는 불명확 시 NULL. |
| 6 | CURRI_YEAR | VARCHAR2(4 BYTE) |  | 적용 교육과정 연도 | 현재 NULL. 다전공 적용연도 원천 확인 필요. |

### REQUEST.DC_V_CODE_INF (6개 컬럼)

| 순서 | 컬럼 | Oracle 자료형 | 키·필수 | 의미 | 비고 |
| ---: | --- | --- | --- | --- | --- |
| 1 | CODE_GRP | VARCHAR2(20 BYTE) | 키 | 코드 그룹 | SMT · GRAD_DIV · GRADE · COMDIV_CD · OPEN_STAT · CAP_DIV · UNIV_CD · USER_TY_CD · HOFC_STA_CD · RANKID · MAJOR_TYPE · MAJOR_STAT |
| 2 | CODE | VARCHAR2(10 BYTE) | 키 | 코드값 | 그룹과 함께 처리. 코드 앞자리 0을 보존. |
| 3 | CODE_NM | VARCHAR2(100 BYTE) |  | 라벨 | 100바이트 초과 라벨은 NULL 가능. |
| 4 | SORT_NO | NUMBER |  | 정렬 순서 |  |
| 5 | USE_YN | VARCHAR2(1 BYTE) |  | 사용 여부 | 사용 여부 원천이 없으면 NULL. |
| 6 | UPD_DT | DATE |  | 최종 변경일시 | 정의형 코드 또는 원천 변경일이 없는 항목은 NULL. |

## 8. 2026-11-24 별도 조회 기록 (원본 정의와 별개)

기존 `dreamcatch` 계정에서 `V_BRDB` 링크는 원격 `DREAMCATCH` 사용자로 접속됨을 확인했다. 이 경로의 `ALL_OBJECTS@V_BRDB`에서는 16개 중 14개 VIEW가 `VALID`로 보였고, 확인된 224개 컬럼은 엑셀과 이름·순서·자료형·길이가 일치했다. 해당 경로에서 `REQUEST.DC_V_LECT_OPEN_INF`와 `REQUEST.DC_V_LECT_CAP_INF`는 목록에 보이지 않았고 직접 조회도 `ORA-00942` (`ORA-02063` 동반)였다. **미생성과 권한 미부여는 현재 계정에서 구분되지 않는다.**

행 존재 여부를 확인하는 제한된 조회에서는 7개 VIEW가 각 1행을 반환했다 (`DC_V_ADD_JOB_PART`, `DC_V_COL_INF`, `DC_V_DEPT_INF`, `DC_V_MAJOR_INF`, `DC_V_ORG_INF`, `DC_V_PART_INF`, `DC_V_STU_SUGANG_INF`). 다음 `DC_V_SUBJ_INF` 조회 중 `ORA-12592`가 발생해 나머지 행 조회를 중단했다. 따라서 14개 전체가 데이터가 있거나 정상 조회된다고 확정할 수 없다. `DC_V_USR_INF`는 패키지 의존성 때문에 행 조회를 수행하지 않았다.

이 기록은 2026-11-24의 제한된 읽기 전용 관측이다. 현재 생성/권한/행 수는 전산원 인수 시점에 다시 확인해야 한다.
