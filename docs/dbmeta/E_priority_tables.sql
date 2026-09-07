-- ══════════════════════════════════════════════════════════════════════════
-- E. 우선순위 테이블 집중 분석                         [Oracle / DREAMCATCH]
--
--   D-1(테이블 428개) 결과에서 선별한 핵심 테이블만 파고든다.
--   목표: "학사DB에서 오는 값 / 이 서비스가 만드는 값"의 경계를 확정한다.
--
--   실행 순서: E-1 → E-2 → E-3 → E-4 → E-5
-- ══════════════════════════════════════════════════════════════════════════


-- ── E-1. 학사 연계 경로 ★★★ 가장 먼저 ─────────────────────────────────────
--    V_USR_INF(11만 행)가 매일 갱신되고 있다. 그 배치가 어디 있는지 찾는다.
--    결과가 짧으니 CSV 대신 스크린샷으로 줘도 된다.

--  (a) DB 링크 — 학사DB로 가는 직통로
SELECT DB_LINK, USERNAME AS 접속계정, HOST AS 대상DB, CREATED FROM USER_DB_LINKS;
SELECT OWNER, DB_LINK, USERNAME, HOST FROM ALL_DB_LINKS;

--  (b) 시노님 — DB_LINK 컬럼에 값이 있으면 원격(학사) 객체를 가리키는 것
SELECT SYNONYM_NAME, TABLE_OWNER AS 실제스키마, TABLE_NAME AS 실제객체, DB_LINK
FROM ALL_SYNONYMS WHERE OWNER IN (USER,'PUBLIC') ORDER BY DB_LINK NULLS LAST;

--  (c) 구체화 뷰 — QUERY 컬럼에 원본 SQL이 그대로 들어 있다
SELECT MVIEW_NAME, REFRESH_MODE, REFRESH_METHOD, LAST_REFRESH_DATE, QUERY
FROM USER_MVIEWS;

--  (d) 스케줄러 잡 / 구형 잡 — 야간 배치가 DB 안에 있나
SELECT JOB_NAME, ENABLED, REPEAT_INTERVAL AS 주기,
       LAST_START_DATE AS 마지막실행, JOB_ACTION AS 수행내용
FROM USER_SCHEDULER_JOBS;

SELECT JOB, WHAT AS 수행내용, INTERVAL AS 주기, LAST_DATE AS 마지막실행, BROKEN
FROM USER_JOBS;

--  (e) 프로시저·패키지 목록 (연계 로직이 여기 있을 수 있다)
SELECT OBJECT_TYPE, OBJECT_NAME, STATUS, LAST_DDL_TIME
FROM USER_OBJECTS
WHERE OBJECT_TYPE IN ('PROCEDURE','FUNCTION','PACKAGE')
ORDER BY LAST_DDL_TIME DESC;


-- ── E-2. 학사 적재 테이블의 컬럼 ★★★ 이게 곧 "학사에서 받는 데이터 목록" ──
--    ▶ out/E2_academic_columns.csv 로 내보낼 것 (UTF-8)
SELECT c.TABLE_NAME, c.COLUMN_ID AS 순서, c.COLUMN_NAME,
       c.DATA_TYPE
         || CASE WHEN c.DATA_TYPE IN ('VARCHAR2','CHAR','NVARCHAR2','NCHAR')
                   THEN '(' || c.DATA_LENGTH || ')'
                 WHEN c.DATA_TYPE = 'NUMBER' AND c.DATA_PRECISION IS NOT NULL
                   THEN '(' || c.DATA_PRECISION
                        || CASE WHEN c.DATA_SCALE > 0 THEN ',' || c.DATA_SCALE END || ')'
            END AS 타입,
       c.NULLABLE AS NULL허용,
       cc.COMMENTS AS 컬럼설명
FROM USER_TAB_COLUMNS c
LEFT JOIN USER_COL_COMMENTS cc
       ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
WHERE c.TABLE_NAME IN (
      -- 학사 적재본 (V_ 접두)
      'V_USR_INF','V_DEP_INF','V_DEP_INF_ALL','V_LECT_INF','V_SUGANG',
      'V_PC_SUGANG','V_USR_SCORE','V_ADD_JOB_PART','V_JOB_BBS_INFO',
      'V_USR_INF_DUP_INF','SY_DUPL_EMP',
      -- 학사 원본 뷰의 흔적 (전부 0행이지만 컬럼 정의가 남아 있다)
      'VIEW_HAKGWA_HYUNJAE','VIEW_MEMBER_SOSOK','VIEW_SUGANG_ALL','VIEW_SUUP_GAESUL',
      -- 학적 관련
      'STU_WARNING_INFO','COM_HAKJUK','COM_HAKBYUNDONG','COM_ASS_DEPT','FU_ASS_DEPT'
)
ORDER BY c.TABLE_NAME, c.COLUMN_ID;


-- ── E-3. 핵심 서비스 테이블의 컬럼 ────────────────────────────────────────
--    실제로 데이터가 쌓여 있고 우리 화면과 대응되는 것들만.
--    ▶ out/E3_service_columns.csv 로 내보낼 것 (UTF-8)
SELECT c.TABLE_NAME, c.COLUMN_ID AS 순서, c.COLUMN_NAME,
       c.DATA_TYPE
         || CASE WHEN c.DATA_TYPE IN ('VARCHAR2','CHAR','NVARCHAR2','NCHAR')
                   THEN '(' || c.DATA_LENGTH || ')'
                 WHEN c.DATA_TYPE = 'NUMBER' AND c.DATA_PRECISION IS NOT NULL
                   THEN '(' || c.DATA_PRECISION
                        || CASE WHEN c.DATA_SCALE > 0 THEN ',' || c.DATA_SCALE END || ')'
            END AS 타입,
       c.NULLABLE AS NULL허용,
       cc.COMMENTS AS 컬럼설명
FROM USER_TAB_COLUMNS c
LEFT JOIN USER_COL_COMMENTS cc
       ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
WHERE c.TABLE_NAME IN (
      -- 상담 (우리 D3에 대응)
      'COUNSEL_MASTER','COUNSEL_PROBLEM','COUNSEL_FAM',
      'CON_PROF_INFO','CO_ADVISER','COM_CON_INF','COM_CON_TAR','CO_CON_SCH',
      -- 비교과 (우리 D6에 대응)
      'EP_PRM','EP_PRM_APP','EP_PRM_STEP','EP_PRM_RESULT','EP_PRM_SCRAP',
      'EP_PRM_CHARGE','EP_CUR_GUBUN','EX_ITEM','EX_ITEM_APP','EX_ITEM_SCORE',
      -- 역량·진로설계 (우리 D2/D4/D5에 대응)
      'TB_CARR_CAPA_STTS','TB_CARR_MY_CAPA','TB_CARR_ETR_CAPA','TB_CARR_USER',
      'STU_COURSE_INFO','STU_COURSE_INFO_DTL','STU_COURSE_CAREER',
      'STU_COURSE_CAREER_LANG','STU_COURSE_CAREER_LICN','STU_COURSE_CAREER_ACTIVE',
      'CA_GOAL_DATA','ST_GOAL','STU_CON_POINT',
      -- 채용·이력서 (우리 D7에 대응)
      'JOBSMASTER','JOBSOCCUPATION','JOBSAREA','JOB_RES','SS_JOB_RES','JOB_SELF_INT',
      'FU_JOB_MSTR','FU_JOB_LIST','FU_JOB_PECT','FU_PURPOSE_ADD_JOB',
      -- 시스템 (계정·권한·코드)
      'SY_CODE','SY_AUTH','SY_AUTH_USER','SY_MENU','SY_AGREE','SY_LOGIN_LOG',
      'BASICSETTING','APPLICATIONMASTER','FU_CODE'
)
ORDER BY c.TABLE_NAME, c.COLUMN_ID;


-- ── E-4. 공통코드 실제 값 ★ 개인정보 없음 ─────────────────────────────────
--    SY_CODE 3,874행 = 이 시스템의 모든 상태값·분류값 체계.
--    ▶ out/E4_sy_code.csv 로 내보낼 것 (UTF-8)
SELECT * FROM SY_CODE ORDER BY 1, 2, 3;


-- ── E-5. 쓰기 활동 추적 ★ 소유권 판별의 강한 근거 ─────────────────────────
--    INSERT만 대량 + 특정 시각 몰림 → 연계 배치가 적재하는 테이블(학사 유래)
--    UPDATE/DELETE가 섞여 있음      → 애플리케이션이 직접 쓰는 자체 테이블
--    ▶ out/E5_modifications.csv 로 내보낼 것
SELECT m.TABLE_NAME, m.INSERTS AS 삽입, m.UPDATES AS 수정, m.DELETES AS 삭제,
       m.TIMESTAMP AS 마지막변경, t.NUM_ROWS AS 통계행수
FROM USER_TAB_MODIFICATIONS m
LEFT JOIN USER_TABLES t ON t.TABLE_NAME = m.TABLE_NAME
ORDER BY m.TIMESTAMP DESC NULLS LAST;


-- ── E-7. 제약조건 (PK / UNIQUE / FK) ★ 관계도의 뼈대 ──────────────────────
--    FK가 나오면 그 관계는 확정. 한 건도 안 나오면 = FK 미설정 레거시라서
--    관계를 컬럼명·소스 조인문으로 추정해야 한다(레거시에서 흔한 경우).
--    ▶ out/E7_constraints.csv 로 내보낼 것
SELECT uc.TABLE_NAME,
       DECODE(uc.CONSTRAINT_TYPE,'P','PK','U','UNIQUE','R','FK') AS 종류,
       uc.CONSTRAINT_NAME,
       LISTAGG(ucc.COLUMN_NAME, ', ')
         WITHIN GROUP (ORDER BY ucc.POSITION) AS 컬럼,
       rc.TABLE_NAME AS 참조테이블
FROM USER_CONSTRAINTS uc
JOIN USER_CONS_COLUMNS ucc ON ucc.CONSTRAINT_NAME = uc.CONSTRAINT_NAME
LEFT JOIN USER_CONSTRAINTS rc ON rc.CONSTRAINT_NAME = uc.R_CONSTRAINT_NAME
WHERE uc.CONSTRAINT_TYPE IN ('P','U','R')
GROUP BY uc.TABLE_NAME, uc.CONSTRAINT_TYPE, uc.CONSTRAINT_NAME, rc.TABLE_NAME
ORDER BY uc.TABLE_NAME, 종류;


-- ── E-8. 이 DB에 실제 뷰가 있나 ───────────────────────────────────────────
--    V_ 로 시작하는 건 전부 테이블이었다. 진짜 뷰가 따로 있는지 확인.
SELECT VIEW_NAME, TEXT_LENGTH FROM USER_VIEWS ORDER BY VIEW_NAME;


-- ── E-6. (참고) V_USR_INF 가 정말 학생 마스터인지 한 줄만 확인 ────────────
--    ⚠ 개인정보다. 구조 확인 목적으로 1행만, 필요할 때만 실행할 것.
--       화면 캡처 시 이름·연락처는 가릴 것.
/*
SELECT * FROM V_USR_INF WHERE ROWNUM = 1;
*/
