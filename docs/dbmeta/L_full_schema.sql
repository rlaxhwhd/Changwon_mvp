-- ══════════════════════════════════════════════════════════════════════════
-- L. 현행 전체 스키마 확보 — 현행 ERD 를 그리기 위한 마지막 결손분
--                                                    [Oracle / DREAMCATCH]
--
--   지금까지 확보한 것 : 테이블 428개 목록(D1) · 컬럼 113개 테이블분(E2·E3·J-1)
--                       · 제약 157건(E7) · 코드 3,900건(E4) · 메뉴권한(I2·I3)
--   아직 없는 것       : ★ 나머지 162개 테이블의 컬럼 · 뷰 14개의 정의문
--
--   왜 필요한가
--     현행 DB 는 FK 가 3건뿐이다. 테이블 사이의 관계를 그리려면
--     "같은 이름의 컬럼이 어디에 나오는가"로 역산하는 수밖에 없다.
--     컬럼을 전부 확보해야 그 역산이 성립한다.
--     뷰 정의문(L-2)은 실제 조인 조건이 SQL 로 적혀 있어 관계 추정의 정답지다.
--
--   ⚠ 읽기 전용. DDL·DML 없음. 개인정보 컬럼의 "값"은 조회하지 않는다.
-- ══════════════════════════════════════════════════════════════════════════


-- ── L-1. ★ 컬럼 미확보 테이블 전체의 컬럼 정의 ────────────────────────────
--   → out/L1_columns.csv          예상 3,000~4,000행
--
--   제외 대상(이미 확보했거나 그릴 필요가 없는 것)
--     · SC_LOG_YYYYMM  76개 — 월별 로그 파티션. 구조가 같으므로 1개만 본다
--     · _MIG / _BAK / _TMP / 날짜꼬리  72개 — 백업 사본
--     · TEMP_ / PLAN_TABLE               5개 — 작업용 임시

SELECT c.TABLE_NAME                          AS "테이블",
       c.COLUMN_ID                           AS "순서",
       c.COLUMN_NAME                         AS "컬럼",
       c.DATA_TYPE ||
         CASE WHEN c.DATA_TYPE IN ('VARCHAR2','CHAR') THEN '(' || c.DATA_LENGTH || ')'
              WHEN c.DATA_TYPE = 'NUMBER' AND c.DATA_PRECISION IS NOT NULL
                THEN '(' || c.DATA_PRECISION || NVL2(NULLIF(c.DATA_SCALE,0), ',' || c.DATA_SCALE, '') || ')'
              ELSE '' END                    AS "타입",
       c.NULLABLE                            AS "NULL허용",
       cc.COMMENTS                           AS "컬럼설명"
  FROM USER_TAB_COLUMNS c
  LEFT JOIN USER_COL_COMMENTS cc
         ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
 WHERE c.TABLE_NAME NOT LIKE 'SC\_LOG\_%' ESCAPE '\'
   AND c.TABLE_NAME NOT LIKE '%\_MIG'      ESCAPE '\'
   AND c.TABLE_NAME NOT LIKE '%\_MIG\_%'   ESCAPE '\'
   AND c.TABLE_NAME NOT LIKE '%\_BAK'      ESCAPE '\'
   AND c.TABLE_NAME NOT LIKE '%\_TMP'      ESCAPE '\'
   AND c.TABLE_NAME NOT LIKE '%\_TEMP'     ESCAPE '\'
   AND c.TABLE_NAME NOT LIKE 'TEMP\_%'     ESCAPE '\'
   AND NOT REGEXP_LIKE(c.TABLE_NAME, '_?[0-9]{6,}')
   AND c.TABLE_NAME <> 'PLAN_TABLE'
 ORDER BY c.TABLE_NAME, c.COLUMN_ID;


-- ── L-2. ★ 뷰 정의문 — 관계 추정의 정답지 ─────────────────────────────────
--   → out/L2_views.txt   (CSV 로 안 열리면 텍스트로 저장해도 된다)
--
--   14개뿐인데 값어치가 크다. 뷰 안의 JOIN ... ON 절이
--   "이 시스템이 실제로 어떤 키로 테이블을 잇는가"를 그대로 보여준다.
--   ※ TEXT 가 LONG 타입이라 클라이언트에 따라 잘릴 수 있다.
--     잘리면 SQL Developer 에서 각 뷰를 열어 DDL 탭을 복사해도 된다.

SET LONG 200000
SET PAGESIZE 0

SELECT '/* ===== ' || VIEW_NAME || ' ===== */' AS "뷰",
       TEXT                                     AS "정의"
  FROM USER_VIEWS
 ORDER BY VIEW_NAME;


-- ── L-3. 인덱스 — FK 가 없는 대신 무엇으로 조회하는가 ─────────────────────
--   → out/L3_indexes.csv
--
--   FK 3건짜리 DB 에서 "조인 키"의 두 번째 증거가 인덱스다.
--   PK 가 아닌데 인덱스가 걸린 컬럼은 십중팔구 다른 테이블을 가리킨다.

SELECT i.TABLE_NAME                          AS "테이블",
       i.INDEX_NAME                          AS "인덱스",
       i.UNIQUENESS                          AS "유일성",
       LISTAGG(ic.COLUMN_NAME, ', ')
         WITHIN GROUP (ORDER BY ic.COLUMN_POSITION) AS "컬럼"
  FROM USER_INDEXES i
  JOIN USER_IND_COLUMNS ic ON ic.INDEX_NAME = i.INDEX_NAME
 WHERE i.TABLE_NAME NOT LIKE 'SC\_LOG\_%' ESCAPE '\'
   AND i.INDEX_TYPE = 'NORMAL'
 GROUP BY i.TABLE_NAME, i.INDEX_NAME, i.UNIQUENESS
 ORDER BY i.TABLE_NAME, i.INDEX_NAME;


-- ── L-4. 컬럼명이 여러 테이블에 반복 등장하는 것 — 조인키 후보 ────────────
--   → out/L4_joinkeys.csv
--
--   L-1 을 받으면 이건 내가 로컬에서 계산할 수 있다.
--   다만 DB 에서 바로 뽑으면 확인이 빨라 같이 둔다.
--   "2개 이상 테이블에 같은 이름으로 존재하는 컬럼"이 곧 관계선 후보다.

SELECT COLUMN_NAME                           AS "컬럼",
       COUNT(DISTINCT TABLE_NAME)            AS "등장테이블수",
       LISTAGG(TABLE_NAME, ', ')
         WITHIN GROUP (ORDER BY TABLE_NAME)  AS "테이블목록"
  FROM USER_TAB_COLUMNS
 WHERE TABLE_NAME NOT LIKE 'SC\_LOG\_%' ESCAPE '\'
   AND TABLE_NAME NOT LIKE '%\_MIG'    ESCAPE '\'
   AND TABLE_NAME NOT LIKE '%\_BAK'    ESCAPE '\'
   AND NOT REGEXP_LIKE(TABLE_NAME, '_?[0-9]{6,}')
   AND COLUMN_NAME NOT IN ('REGID','REGDATE','UPDID','UPDDATE','USE_YN','DEL_YN',
                           'SORT','ETC1','ETC2','ETC3','ETC4','REMARK','TITLE',
                           'CONTENTS','FILE_NAME','START_DT','END_DT')
 GROUP BY COLUMN_NAME
HAVING COUNT(DISTINCT TABLE_NAME) >= 3
 ORDER BY COUNT(DISTINCT TABLE_NAME) DESC, COLUMN_NAME;


-- ── L-5. 실제로 살아 있는 테이블인가 — 최근 변경 시각 ─────────────────────
--   → out/L5_activity.csv
--
--   E5 는 상위 172건만 받았다. 전체를 받아야 "그릴 가치가 있는 테이블"과
--   "정의만 남은 껍데기"를 갈라 ERD 에서 흐리게 처리할 수 있다.

SELECT t.TABLE_NAME                          AS "테이블",
       t.NUM_ROWS                            AS "통계행수",
       m.INSERTS                             AS "삽입",
       m.UPDATES                             AS "수정",
       m.DELETES                             AS "삭제",
       m.TIMESTAMP                           AS "마지막변경"
  FROM USER_TABLES t
  LEFT JOIN USER_TAB_MODIFICATIONS m
         ON m.TABLE_NAME = t.TABLE_NAME AND m.PARTITION_NAME IS NULL
 WHERE t.TABLE_NAME NOT LIKE 'SC\_LOG\_%' ESCAPE '\'
 ORDER BY NVL(t.NUM_ROWS,0) DESC;
