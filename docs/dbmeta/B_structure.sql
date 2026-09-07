-- ══════════════════════════════════════════════════════════════════════════
-- B. 구조 추출 — 컬럼 · 제약 · 인덱스 · 뷰 정의            [Oracle / 읽기전용]
--
--   A-6 / C-3 결과로 대상 테이블을 선별한 뒤 실행한다.
--   각 쿼리의 IN ('...') 목록에 선별된 테이블명을 넣는다.
--   (선별 없이 스키마 전체로 돌리면 수만 행이 나와 분석이 어려워진다)
-- ══════════════════════════════════════════════════════════════════════════


-- ── B-1. 컬럼 정의 + 한글 코멘트 ★ 핵심 산출물 ────────────────────────────
--    ▶ 결과를 out/B1_columns.csv 로 내보낼 것 (UTF-8)
SELECT c.TABLE_NAME,
       c.COLUMN_ID AS 순서,
       c.COLUMN_NAME,
       c.DATA_TYPE
         || CASE
              WHEN c.DATA_TYPE IN ('VARCHAR2','CHAR','NVARCHAR2','NCHAR','RAW')
                THEN '(' || c.DATA_LENGTH || ')'
              WHEN c.DATA_TYPE = 'NUMBER' AND c.DATA_PRECISION IS NOT NULL
                THEN '(' || c.DATA_PRECISION
                     || CASE WHEN c.DATA_SCALE > 0 THEN ',' || c.DATA_SCALE END || ')'
            END AS 타입,
       c.NULLABLE AS NULL허용,
       cc.COMMENTS AS 컬럼설명
FROM ALL_TAB_COLUMNS c
LEFT JOIN ALL_COL_COMMENTS cc
       ON cc.OWNER = c.OWNER AND cc.TABLE_NAME = c.TABLE_NAME
      AND cc.COLUMN_NAME = c.COLUMN_NAME
-- ▼▼▼ 여기만 수정 (스키마 + 선별된 테이블 목록) ▼▼▼
WHERE c.OWNER = 'CHANGE_ME'
  AND c.TABLE_NAME IN ('TABLE_A','TABLE_B','TABLE_C')
ORDER BY c.TABLE_NAME, c.COLUMN_ID;


-- ── B-2. 제약조건 (PK / UNIQUE / FK) ★ 관계의 확정 증거 ───────────────────
--    FK 행이 나오면 그 관계는 "확정"이다.
--    한 건도 안 나오면 = FK 미설정 레거시 → 관계는 인덱스(B-3)와
--    소스 코드의 조인문으로 추정해야 한다(흔한 경우다).
--    ▶ 결과를 out/B2_constraints.csv 로 내보낼 것
SELECT ac.TABLE_NAME,
       DECODE(ac.CONSTRAINT_TYPE,'P','PK','U','UNIQUE','R','FK') AS 종류,
       ac.CONSTRAINT_NAME,
       LISTAGG(acc.COLUMN_NAME, ', ')
         WITHIN GROUP (ORDER BY acc.POSITION) AS 컬럼,
       ac.R_OWNER  AS 참조스키마,
       rc.TABLE_NAME AS 참조테이블,
       ac.DELETE_RULE AS 삭제규칙,
       ac.STATUS
FROM ALL_CONSTRAINTS ac
JOIN ALL_CONS_COLUMNS acc
       ON acc.OWNER = ac.OWNER AND acc.CONSTRAINT_NAME = ac.CONSTRAINT_NAME
LEFT JOIN ALL_CONSTRAINTS rc
       ON rc.OWNER = ac.R_OWNER AND rc.CONSTRAINT_NAME = ac.R_CONSTRAINT_NAME
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE ac.OWNER = 'CHANGE_ME'
  AND ac.CONSTRAINT_TYPE IN ('P','U','R')
  AND ac.TABLE_NAME IN ('TABLE_A','TABLE_B','TABLE_C')
GROUP BY ac.TABLE_NAME, ac.CONSTRAINT_TYPE, ac.CONSTRAINT_NAME,
         ac.R_OWNER, rc.TABLE_NAME, ac.DELETE_RULE, ac.STATUS
ORDER BY ac.TABLE_NAME, 종류;


-- ── B-3. 인덱스 ★ FK가 없을 때 관계 추정의 근거 ───────────────────────────
--    다른 테이블의 PK와 이름이 같은 컬럼에 인덱스가 걸려 있으면
--    "조인해서 쓰고 있다"는 강한 신호다.
--    ▶ 결과를 out/B3_indexes.csv 로 내보낼 것
SELECT i.TABLE_NAME,
       i.INDEX_NAME,
       i.UNIQUENESS AS 유일성,
       LISTAGG(ic.COLUMN_NAME, ', ')
         WITHIN GROUP (ORDER BY ic.COLUMN_POSITION) AS 컬럼
FROM ALL_INDEXES i
JOIN ALL_IND_COLUMNS ic
       ON ic.INDEX_OWNER = i.OWNER AND ic.INDEX_NAME = i.INDEX_NAME
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE i.TABLE_OWNER = 'CHANGE_ME'
  AND i.TABLE_NAME IN ('TABLE_A','TABLE_B','TABLE_C')
GROUP BY i.TABLE_NAME, i.INDEX_NAME, i.UNIQUENESS
ORDER BY i.TABLE_NAME, i.INDEX_NAME;


-- ── B-4. 뷰 정의문 ★★ 있으면 관계 파악이 한 번에 끝난다 ───────────────────
--    운영 뷰의 JOIN 절이 곧 "실제로 이렇게 연결해서 쓴다"는 문서다.
--    TEXT 컬럼은 LONG 타입이라 CSV 내보내기가 깨질 수 있다.
--    그럴 땐 결과 셀을 열어(값 뷰어) 텍스트로 복사하거나, 아래 12.2+ 버전을 쓴다.
SELECT VIEW_NAME, TEXT_LENGTH, TEXT
FROM ALL_VIEWS
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE OWNER = 'CHANGE_ME'
ORDER BY VIEW_NAME;

--    [Oracle 12.2 이상] TEXT_VC 는 VARCHAR2라 CSV 내보내기가 깨끗하다.
/*
SELECT VIEW_NAME, TEXT_LENGTH, TEXT_VC
FROM ALL_VIEWS
WHERE OWNER = 'CHANGE_ME'
ORDER BY VIEW_NAME;
*/


-- ── B-5. 시퀀스 ─ 식별자(학번·일련번호) 생성 방식 확인 ────────────────────
SELECT SEQUENCE_NAME, MIN_VALUE, MAX_VALUE, INCREMENT_BY, LAST_NUMBER, CACHE_SIZE
FROM ALL_SEQUENCES
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE SEQUENCE_OWNER = 'CHANGE_ME'
ORDER BY SEQUENCE_NAME;


-- ── B-6. 특정 컬럼명이 어느 테이블들에 퍼져 있나 ★ 조인키 역추적 ───────────
--    예: 학번 컬럼이 'STDNT_NO' 라는 걸 알아냈다면, 그 컬럼을 가진 테이블
--    전부가 학생과 연결된 테이블이다. FK가 없을 때 관계를 복원하는 방법.
SELECT COLUMN_NAME, COUNT(*) AS 보유테이블수,
       LISTAGG(TABLE_NAME, ', ') WITHIN GROUP (ORDER BY TABLE_NAME) AS 테이블목록
FROM ALL_TAB_COLUMNS
-- ▼▼▼ 여기만 수정 (찾을 컬럼명 패턴) ▼▼▼
WHERE OWNER = 'CHANGE_ME'
  AND (UPPER(COLUMN_NAME) LIKE '%STDNT%'   -- 학번 계열
    OR UPPER(COLUMN_NAME) LIKE '%HAKBUN%'
    OR UPPER(COLUMN_NAME) LIKE '%DEPT%'    -- 학과코드 계열
    OR UPPER(COLUMN_NAME) LIKE '%SUBJ%'    -- 과목코드 계열
    OR UPPER(COLUMN_NAME) LIKE '%PROF%')   -- 교번 계열
GROUP BY COLUMN_NAME
HAVING COUNT(*) > 1
ORDER BY 보유테이블수 DESC;
