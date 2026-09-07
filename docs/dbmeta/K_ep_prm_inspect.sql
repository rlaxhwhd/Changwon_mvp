-- ══════════════════════════════════════════════════════════════════════════
-- K. EP_PRM(비교과프로그램) 컬럼 실사              [Oracle / DREAMCATCH]
--
--   질문: "비교과프로그램 정보 테이블에 컬럼이 정말 저렇게 많은가?"
--   답을 두 층으로 본다.
--     ① 정의상 몇 개인가            → K-1
--     ② 그중 실제로 값이 있는 건 몇 개인가 → K-2  ★ 이게 핵심
--
--   K-2 가 중요한 이유: 컬럼 주석에 [삭제] 표시가 약 30개 붙어 있다.
--   정의는 남아 있지만 안 쓰는 컬럼을 승계하면 신규 DB도 같이 썩는다.
--
--   ⚠ 읽기 전용. DDL·DML 없음.
-- ══════════════════════════════════════════════════════════════════════════


-- ── K-1. EP_PRM 컬럼 전체 정의 ────────────────────────────────────────────
--   → out/K1_ep_prm_columns.csv

SELECT c.COLUMN_ID                          AS "순서",
       c.COLUMN_NAME                        AS "컬럼",
       c.DATA_TYPE ||
         CASE WHEN c.DATA_TYPE IN ('VARCHAR2','CHAR') THEN '(' || c.DATA_LENGTH || ')'
              WHEN c.DATA_TYPE = 'NUMBER' AND c.DATA_PRECISION IS NOT NULL
                THEN '(' || c.DATA_PRECISION || NVL2(NULLIF(c.DATA_SCALE,0), ',' || c.DATA_SCALE, '') || ')'
              ELSE '' END                   AS "타입",
       c.NULLABLE                           AS "NULL허용",
       cc.COMMENTS                          AS "주석",
       CASE WHEN cc.COMMENTS LIKE '%[삭제]%' THEN 'Y' END AS "삭제표시"
  FROM USER_TAB_COLUMNS c
  LEFT JOIN USER_COL_COMMENTS cc
         ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
 WHERE c.TABLE_NAME = 'EP_PRM'
 ORDER BY c.COLUMN_ID;


-- ── K-2. ★ 컬럼별 실사용률 — 죽은 컬럼 찾기 ───────────────────────────────
--   → out/K2_ep_prm_usage.csv
--
--   전체 807행 중 값이 들어 있는 행이 몇 개인가를 컬럼마다 센다.
--   값있음 = 0 이면 정의만 있고 한 번도 안 쓴 컬럼이다.
--
--   ※ DBMS_XMLGEN 으로 컬럼마다 COUNT 를 돌린다. 읽기 전용이고 807행이라 빠르다.
--     권한 문제로 막히면 K-2-ALT 를 쓴다.

WITH cols AS (
  SELECT c.COLUMN_ID, c.COLUMN_NAME, cc.COMMENTS
    FROM USER_TAB_COLUMNS c
    LEFT JOIN USER_COL_COMMENTS cc
           ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
   WHERE c.TABLE_NAME = 'EP_PRM'
)
SELECT COLUMN_ID                             AS "순서",
       COLUMN_NAME                           AS "컬럼",
       cnt                                   AS "값있음",
       807 - cnt                             AS "비어있음",
       ROUND(cnt / 807 * 100, 1)             AS "사용률%",
       CASE WHEN cnt = 0                    THEN '★ 완전 미사용'
            WHEN cnt <= 8                   THEN '거의 미사용'
            WHEN cnt / 807 < 0.1            THEN '희소'
            ELSE '' END                      AS "판정",
       CASE WHEN COMMENTS LIKE '%[삭제]%' THEN 'Y' END AS "삭제표시",
       COMMENTS                              AS "주석"
  FROM (
    SELECT c.COLUMN_ID, c.COLUMN_NAME, c.COMMENTS,
           TO_NUMBER(EXTRACTVALUE(
             DBMS_XMLGEN.GETXMLTYPE(
               'SELECT COUNT("' || c.COLUMN_NAME || '") AS C FROM EP_PRM'
             ), '/ROWSET/ROW/C')) AS cnt
      FROM cols c
  )
 ORDER BY cnt, COLUMN_ID;


-- ── K-2-ALT. 위가 막힐 때 — 실행할 SQL 을 생성한다 ────────────────────────
--   이 쿼리의 결과(문자열)를 전부 복사해 다시 실행하면 K-2 와 같은 표가 나온다.

SELECT 'SELECT ''' || LPAD(COLUMN_ID, 3, '0') || ' ' || COLUMN_NAME || ''' AS 컬럼, COUNT("'
       || COLUMN_NAME || '") AS 값있음 FROM EP_PRM'
       || CASE WHEN COLUMN_ID = (SELECT MAX(COLUMN_ID) FROM USER_TAB_COLUMNS WHERE TABLE_NAME='EP_PRM')
               THEN ' ORDER BY 1;' ELSE ' UNION ALL' END AS "생성된SQL"
  FROM USER_TAB_COLUMNS
 WHERE TABLE_NAME = 'EP_PRM'
 ORDER BY COLUMN_ID;


-- ── K-3. 컬럼이 많은 테이블 순위 — EP_PRM 이 유별난가 ─────────────────────
--   → out/K3_wide_tables.csv
--   목적: 125컬럼이 이 시스템에서 정상 범위인지, 예외적으로 큰지 본다.

SELECT t.TABLE_NAME                          AS "테이블",
       COUNT(c.COLUMN_NAME)                  AS "컬럼수",
       tc.COMMENTS                           AS "설명",
       t.NUM_ROWS                            AS "통계행수"
  FROM USER_TABLES t
  JOIN USER_TAB_COLUMNS c ON c.TABLE_NAME = t.TABLE_NAME
  LEFT JOIN USER_TAB_COMMENTS tc ON tc.TABLE_NAME = t.TABLE_NAME
 GROUP BY t.TABLE_NAME, tc.COMMENTS, t.NUM_ROWS
HAVING COUNT(c.COLUMN_NAME) >= 30
 ORDER BY COUNT(c.COLUMN_NAME) DESC;


-- ── K-4. 참가대상 플래그가 실제로 쓰이는가 (J-6 확장) ─────────────────────
--   → out/K4_trgt_detail.csv
--   목적: TRGT_STU / TRGT_EMP / TRGT_OUT 계열 중 [삭제] 표시가 안 붙은 것까지
--         전수로 확인한다. 승계 대상 확정용.

SELECT COUNT(*) AS TOTAL,
       SUM(CASE WHEN TRGT_STU22 = 'Y' THEN 1 ELSE 0 END) AS S22_대학원1,
       SUM(CASE WHEN TRGT_STU23 = 'Y' THEN 1 ELSE 0 END) AS S23_대학원2,
       SUM(CASE WHEN TRGT_STU24 = 'Y' THEN 1 ELSE 0 END) AS S24_대학원3,
       SUM(CASE WHEN TRGT_STU32 = 'Y' THEN 1 ELSE 0 END) AS S32_학부1,
       SUM(CASE WHEN TRGT_STU33 = 'Y' THEN 1 ELSE 0 END) AS S33_학부2,
       SUM(CASE WHEN TRGT_STU34 = 'Y' THEN 1 ELSE 0 END) AS S34_학부3,
       SUM(CASE WHEN TRGT_STU35 = 'Y' THEN 1 ELSE 0 END) AS S35_학부45,
       SUM(CASE WHEN TRGT_STU41 = 'Y' THEN 1 ELSE 0 END) AS S41_삭제표시,
       SUM(CASE WHEN TRGT_EMP21 = 'Y' THEN 1 ELSE 0 END) AS E21_삭제표시,
       SUM(CASE WHEN TRGT_STU51 = 'Y' THEN 1 ELSE 0 END) AS S51_삭제표시
  FROM EP_PRM;


-- ── K-5. 최근 등록 프로그램 1건을 세로로 펼쳐 보기 ────────────────────────
--   → 화면 확인용 (CSV 불필요)
--   목적: 실제 한 행이 어떤 값으로 채워지는지 눈으로 본다.
--         125칸 중 몇 칸이 비는지 감이 온다.

SELECT * FROM (
  SELECT * FROM EP_PRM ORDER BY REGDATE DESC
) WHERE ROWNUM = 1;
