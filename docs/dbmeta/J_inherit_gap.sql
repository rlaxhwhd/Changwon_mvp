-- ══════════════════════════════════════════════════════════════════════════
-- J. 승계 격차 보완 — 컬럼 정의가 없는 테이블            [Oracle / DREAMCATCH]
--
--   배경: 신규 설계를 "현행 구조 승계" 원칙으로 다시 맞추는 중이다.
--         (로드맵 · 역량 · 게임화 · 진단만 신설, 나머지는 현행 계승)
--
--   현재 컬럼 정의를 가진 현행 테이블은 70개뿐이다(E2·E3 결과).
--   아래 테이블들은 **실데이터가 있는데 컬럼을 몰라** 승계 설계를 못 한다.
--
--   실행: E-3 과 같은 방식. 결과를 CSV 로 저장해 docs/dbmeta/out/ 에 둔다.
--   ⚠ 읽기 전용. DDL·DML 없음.
-- ══════════════════════════════════════════════════════════════════════════


-- ── J-1. 컬럼 정의 (최우선) ───────────────────────────────────────────────
--   → out/J1_columns.csv
--
--   우선순위 이유
--    ① 비교과 그룹(팀)     — 그룹 프로그램 운영의 핵심. 현행 구조를 그대로 써야 한다
--    ② 비교과 추가요청·설문 — 신청 시 추가 질문 / 만족도조사. 2.3만 행이 이관 대상
--    ③ 첨부파일 SY_FILE    — 4.2만 행. 전 도메인이 참조하는 공용 테이블
--    ④ 게시판·배너·팝업     — 관리자 하위 페이지 전체
--    ⑤ 집단상담·블랙리스트  — 상담 도메인 잔여

SELECT t.TABLE_NAME              AS "TABLE_NAME",
       c.COLUMN_ID               AS "순서",
       c.COLUMN_NAME             AS "COLUMN_NAME",
       c.DATA_TYPE ||
         CASE WHEN c.DATA_TYPE IN ('VARCHAR2','CHAR')  THEN '(' || c.DATA_LENGTH || ')'
              WHEN c.DATA_TYPE = 'NUMBER' AND c.DATA_PRECISION IS NOT NULL
                THEN '(' || c.DATA_PRECISION || NVL2(NULLIF(c.DATA_SCALE,0), ',' || c.DATA_SCALE, '') || ')'
              ELSE '' END        AS "타입",
       c.NULLABLE                AS "NULL허용",
       cc.COMMENTS               AS "컬럼설명"
  FROM USER_TABLES t
  JOIN USER_TAB_COLUMNS c  ON c.TABLE_NAME = t.TABLE_NAME
  LEFT JOIN USER_COL_COMMENTS cc
         ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
 WHERE t.TABLE_NAME IN (
        -- ① 비교과 그룹(팀) ★ 최우선
        'EP_PRM_GROUP', 'EP_PRM_MAPPING', 'EP_PRM_GROUP_ACTIVE',
        -- ② 비교과 추가요청 · 설문
        'EP_PRM_ADD_REQ', 'EP_PRM_ADD_REQ_ART', 'EP_PRM_APP_ADD_REQ_RST',
        'EP_SURVEY', 'EP_SURVEY_QUS', 'EP_SURVEY_ART', 'EP_SURVEY_TAR',
        'EP_SURVEY_RST', 'EP_PRM_SURVEY',
        -- 비교과 참가대상 · 결과보고서 · 변경신청 · 커뮤니티
        'EP_PRM_TRGT_DEPT', 'EP_PRM_TRGT_NAT', 'EP_PRM_TRGT_OUTSIDER', 'EP_PRM_TRGT_USER',
        'EP_PRM_RST_RPT', 'EP_PRM_CHG_REQ', 'EP_PRM_BD_INFO', 'EP_PRM_BD_DATA',
        'EP_PRM_ACT_PNT_INF',
        -- ③ 공용 첨부 · 시스템
        'SY_FILE', 'SY_AUTH_LOG', 'SY_MENU_AUTH', 'SY_MENU_LOG',
        -- ④ 게시판 · 배너 · 팝업 (관리자 하위)
        'SY_BD_MNG', 'SY_BD_CATE', 'SY_BD_DATA', 'BD_DATA_COMMENT',
        'SY_BANNER', 'SY_GENBANNER', 'SY_GENPOP', 'SY_POP',
        'SY_IP_INFO', 'SY_IP_USE', 'SY_SYSTEM_CONN_INFO',
        -- ⑤ 상담 잔여
        'COUNSEL_GROUP_MASTER', 'COUNSEL_GROUP_LIST',
        'CO_BLK', 'CO_CONNETC_INFO', 'CO_PROF', 'CO_ADV_APP', 'CO_ADV_MULTI',
        -- 채용 — 이력서 · 기업 · 코드성 테이블
        'RESUMEMASTER', 'RESUME', 'COMPANYMASTER', 'JOBSFILE',
        'JOBSOURCE', 'OCCUPATION', 'AREA', 'EMPLOYTYPE'
       )
 ORDER BY t.TABLE_NAME, c.COLUMN_ID;


-- ── J-2. 위 테이블의 PK·FK·유니크 제약 ────────────────────────────────────
--   → out/J2_constraints.csv
--   목적: 그룹(팀)·설문·게시판의 키 구조를 확정한다.
--         특히 EP_PRM_GROUP ↔ EP_PRM_MAPPING ↔ EP_PRM_APP 의 연결 방식.

SELECT c.TABLE_NAME                        AS "TABLE_NAME",
       DECODE(c.CONSTRAINT_TYPE,'P','PK','R','FK','U','UNIQUE','C','CHECK',c.CONSTRAINT_TYPE) AS "종류",
       c.CONSTRAINT_NAME                   AS "CONSTRAINT_NAME",
       LISTAGG(cc.COLUMN_NAME, ',') WITHIN GROUP (ORDER BY cc.POSITION) AS "컬럼",
       r.TABLE_NAME                        AS "참조테이블"
  FROM USER_CONSTRAINTS c
  JOIN USER_CONS_COLUMNS cc ON cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
  LEFT JOIN USER_CONSTRAINTS r ON r.CONSTRAINT_NAME = c.R_CONSTRAINT_NAME
 WHERE c.CONSTRAINT_TYPE IN ('P','R','U')
   AND c.TABLE_NAME LIKE 'EP\_%' ESCAPE '\'
    OR c.TABLE_NAME IN ('SY_FILE','SY_BD_MNG','SY_BD_CATE','SY_BD_DATA',
                        'COUNSEL_GROUP_MASTER','COUNSEL_GROUP_LIST')
 GROUP BY c.TABLE_NAME, c.CONSTRAINT_TYPE, c.CONSTRAINT_NAME, r.TABLE_NAME
 ORDER BY c.TABLE_NAME, "종류";


-- ── J-3. 그룹(팀) 프로그램 실데이터 표본 ★ ────────────────────────────────
--   → out/J3_group_sample.csv
--   목적: EP_PRM_GROUP 이 6행뿐이라 구조를 데이터로 봐야 이해가 된다.
--         팀장/팀원 구분, 그룹 정원, 신청과의 연결을 확인한다.
--   ⚠ 개인정보 — 학번·이름은 빼고 구조만 본다.

SELECT * FROM EP_PRM_GROUP WHERE ROWNUM <= 10;

SELECT PRM_SEQ, PRM_STEP, HOPE_GROUP, HOPE_AREA, HOPE_LVL, STATUS, COUNT(*) AS CNT
  FROM EP_PRM_APP
 WHERE HOPE_GROUP IS NOT NULL
 GROUP BY PRM_SEQ, PRM_STEP, HOPE_GROUP, HOPE_AREA, HOPE_LVL, STATUS
 ORDER BY PRM_SEQ DESC
 FETCH FIRST 30 ROWS ONLY;


-- ── J-4. 채용공고 내부/외부 등록 구분 ★ ───────────────────────────────────
--   → out/J4_job_source.csv
--   목적: "외부 수집 공고 / 교내 직접등록 공고"를 무엇으로 가르는지 확정한다.
--         후보 컬럼: JOBSOURCEIDX · SRCCODE · JOB_GUBUN · ISSCHOOLJOB · PORTALJOBIDX

SELECT JOBSOURCEIDX, SRCCODE, JOB_GUBUN, ISSCHOOLJOB,
       CASE WHEN PORTALJOBIDX IS NULL THEN 'NULL' ELSE 'NOT NULL' END AS PORTALJOBIDX_YN,
       COUNT(*) AS CNT
  FROM JOBSMASTER
 GROUP BY JOBSOURCEIDX, SRCCODE, JOB_GUBUN, ISSCHOOLJOB,
          CASE WHEN PORTALJOBIDX IS NULL THEN 'NULL' ELSE 'NOT NULL' END
 ORDER BY CNT DESC;


-- ── J-5. 비교과 신청 상태값 실사용 분포 ───────────────────────────────────
--   → out/J5_apply_status.csv
--   목적: EP_PRM_APP.STATUS 의 실제 코드값을 확정한다(신청/선발/탈락/취소/수료/미수료).

SELECT STATUS, DEL_YN, COUNT(*) AS CNT
  FROM EP_PRM_APP
 GROUP BY STATUS, DEL_YN
 ORDER BY CNT DESC;


-- ── J-6. 프로그램 참가대상 컬럼 실사용 여부 ───────────────────────────────
--   → out/J6_target_usage.csv
--   목적: TRGT_STU11~63 중 [삭제] 표시된 것을 빼고 실제로 쓰이는 것만 승계한다.

SELECT COUNT(*)                                              AS TOTAL,
       SUM(CASE WHEN TRGT_STU  = 'Y' THEN 1 ELSE 0 END)      AS TRGT_STU,
       SUM(CASE WHEN TRGT_STU11= 'Y' THEN 1 ELSE 0 END)      AS S11_재학,
       SUM(CASE WHEN TRGT_STU12= 'Y' THEN 1 ELSE 0 END)      AS S12_휴학,
       SUM(CASE WHEN TRGT_STU13= 'Y' THEN 1 ELSE 0 END)      AS S13_졸업,
       SUM(CASE WHEN TRGT_STU14= 'Y' THEN 1 ELSE 0 END)      AS S14_수료,
       SUM(CASE WHEN TRGT_STU15= 'Y' THEN 1 ELSE 0 END)      AS S15_최근졸업,
       SUM(CASE WHEN TRGT_STU21= 'Y' THEN 1 ELSE 0 END)      AS S21_대학원전체,
       SUM(CASE WHEN TRGT_STU31= 'Y' THEN 1 ELSE 0 END)      AS S31_학부전체,
       SUM(CASE WHEN TRGT_EMP  = 'Y' THEN 1 ELSE 0 END)      AS TRGT_EMP,
       SUM(CASE WHEN TRGT_OUT  = 'Y' THEN 1 ELSE 0 END)      AS TRGT_OUT
  FROM EP_PRM;
