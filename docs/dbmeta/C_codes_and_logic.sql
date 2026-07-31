-- ══════════════════════════════════════════════════════════════════════════
-- C. 관련 테이블 탐색 + 코드값 + DB 내 로직            [Oracle / 읽기전용]
--
--   C-3 을 A-6 직후에 실행할 것. 이 스크립트에서 가장 중요한 쿼리다.
--   한국 레거시 학사DB는 한글 코멘트가 달려 있어, 코멘트 검색만으로
--   필요한 테이블의 90%를 찾아낼 수 있다.
-- ══════════════════════════════════════════════════════════════════════════


-- ── C-3. 우리가 필요한 5축 테이블 후보 검색 ★★★ 최우선 실행 ───────────────
--    5축 = 학생(학적) · 학과/조직 · 교직원 · 교과목 · 수강/이수(성적)
--    테이블명(영문 약어)과 코멘트(한글) 양쪽으로 잡는다.
--    ▶ 결과를 out/C3_candidates.csv 로 내보낼 것 (UTF-8)
SELECT t.TABLE_NAME,
       tc.COMMENTS AS 테이블설명,
       t.NUM_ROWS  AS 통계행수,
       CASE
         WHEN tc.COMMENTS LIKE '%학적%' OR tc.COMMENTS LIKE '%학생%' THEN '1.학생'
         WHEN tc.COMMENTS LIKE '%학과%' OR tc.COMMENTS LIKE '%학부%'
           OR tc.COMMENTS LIKE '%대학%' OR tc.COMMENTS LIKE '%조직%'   THEN '2.조직'
         WHEN tc.COMMENTS LIKE '%교수%' OR tc.COMMENTS LIKE '%교직원%'
           OR tc.COMMENTS LIKE '%직원%' OR tc.COMMENTS LIKE '%조교%'   THEN '3.교직원'
         WHEN tc.COMMENTS LIKE '%교과%' OR tc.COMMENTS LIKE '%과목%'
           OR tc.COMMENTS LIKE '%강의%' OR tc.COMMENTS LIKE '%개설%'   THEN '4.교과목'
         WHEN tc.COMMENTS LIKE '%수강%' OR tc.COMMENTS LIKE '%이수%'
           OR tc.COMMENTS LIKE '%성적%' OR tc.COMMENTS LIKE '%학점%'   THEN '5.수강이수'
         WHEN tc.COMMENTS LIKE '%인증%' OR tc.COMMENTS LIKE '%로그인%'
           OR tc.COMMENTS LIKE '%사용자%' OR tc.COMMENTS LIKE '%계정%'  THEN '6.인증'
         WHEN tc.COMMENTS LIKE '%코드%' OR tc.COMMENTS LIKE '%공통%'   THEN '7.코드'
         ELSE '8.기타(테이블명 매칭)'
       END AS 축
FROM ALL_TABLES t
LEFT JOIN ALL_TAB_COMMENTS tc
       ON tc.OWNER = t.OWNER AND tc.TABLE_NAME = t.TABLE_NAME
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE t.OWNER = 'CHANGE_ME'
  AND (
        /* 한글 코멘트 매칭 — 가장 정확하다 */
        tc.COMMENTS LIKE '%학적%'  OR tc.COMMENTS LIKE '%학생%'
     OR tc.COMMENTS LIKE '%학과%'  OR tc.COMMENTS LIKE '%학부%'
     OR tc.COMMENTS LIKE '%대학%'  OR tc.COMMENTS LIKE '%조직%'
     OR tc.COMMENTS LIKE '%교수%'  OR tc.COMMENTS LIKE '%교직원%'
     OR tc.COMMENTS LIKE '%직원%'  OR tc.COMMENTS LIKE '%조교%'
     OR tc.COMMENTS LIKE '%교과%'  OR tc.COMMENTS LIKE '%과목%'
     OR tc.COMMENTS LIKE '%강의%'  OR tc.COMMENTS LIKE '%개설%'
     OR tc.COMMENTS LIKE '%수강%'  OR tc.COMMENTS LIKE '%이수%'
     OR tc.COMMENTS LIKE '%성적%'  OR tc.COMMENTS LIKE '%학점%'
     OR tc.COMMENTS LIKE '%학기%'  OR tc.COMMENTS LIKE '%졸업%'
     OR tc.COMMENTS LIKE '%인증%'  OR tc.COMMENTS LIKE '%로그인%'
     OR tc.COMMENTS LIKE '%사용자%' OR tc.COMMENTS LIKE '%계정%'
     OR tc.COMMENTS LIKE '%코드%'  OR tc.COMMENTS LIKE '%공통%'
        /* 영문 약어 매칭 — 코멘트가 없는 테이블 대비 */
     OR UPPER(t.TABLE_NAME) LIKE '%STDNT%' OR UPPER(t.TABLE_NAME) LIKE '%STUD%'
     OR UPPER(t.TABLE_NAME) LIKE '%HAKJUK%' OR UPPER(t.TABLE_NAME) LIKE '%HJ%'
     OR UPPER(t.TABLE_NAME) LIKE '%DEPT%'  OR UPPER(t.TABLE_NAME) LIKE '%HAKGWA%'
     OR UPPER(t.TABLE_NAME) LIKE '%COLL%'  OR UPPER(t.TABLE_NAME) LIKE '%ORG%'
     OR UPPER(t.TABLE_NAME) LIKE '%PROF%'  OR UPPER(t.TABLE_NAME) LIKE '%EMP%'
     OR UPPER(t.TABLE_NAME) LIKE '%FACUL%' OR UPPER(t.TABLE_NAME) LIKE '%STAFF%'
     OR UPPER(t.TABLE_NAME) LIKE '%SUBJ%'  OR UPPER(t.TABLE_NAME) LIKE '%COURS%'
     OR UPPER(t.TABLE_NAME) LIKE '%LECT%'  OR UPPER(t.TABLE_NAME) LIKE '%GWAMOK%'
     OR UPPER(t.TABLE_NAME) LIKE '%SUGANG%' OR UPPER(t.TABLE_NAME) LIKE '%ENROL%'
     OR UPPER(t.TABLE_NAME) LIKE '%GRADE%' OR UPPER(t.TABLE_NAME) LIKE '%SCORE%'
     OR UPPER(t.TABLE_NAME) LIKE '%SUNGJ%' OR UPPER(t.TABLE_NAME) LIKE '%CREDIT%'
     OR UPPER(t.TABLE_NAME) LIKE '%CODE%'  OR UPPER(t.TABLE_NAME) LIKE '%COMM%'
     OR UPPER(t.TABLE_NAME) LIKE '%USER%'  OR UPPER(t.TABLE_NAME) LIKE '%LOGIN%'
      )
ORDER BY 축, t.NUM_ROWS DESC NULLS LAST;


-- ── C-1. 공통코드 테이블 찾기 ─────────────────────────────────────────────
SELECT t.TABLE_NAME, tc.COMMENTS AS 테이블설명, t.NUM_ROWS
FROM ALL_TABLES t
LEFT JOIN ALL_TAB_COMMENTS tc
       ON tc.OWNER = t.OWNER AND tc.TABLE_NAME = t.TABLE_NAME
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE t.OWNER = 'CHANGE_ME'
  AND (UPPER(t.TABLE_NAME) LIKE '%CODE%' OR UPPER(t.TABLE_NAME) LIKE '%CD_%'
       OR UPPER(t.TABLE_NAME) LIKE '%_CD%' OR UPPER(t.TABLE_NAME) LIKE '%COMM%'
       OR tc.COMMENTS LIKE '%코드%' OR tc.COMMENTS LIKE '%공통%')
ORDER BY t.NUM_ROWS DESC NULLS LAST;


-- ── C-2. 공통코드 실제 값 ★ 개인정보 없음 — 이것만 행 데이터를 뽑는다 ──────
--    상태값 체계(재학/휴학/졸업, 이수구분, 직위 등)와 학과코드 체계가 여기 있다.
--    C-1에서 찾은 테이블명으로 교체. 행이 많으면 코드그룹 몇 개로 제한할 것.
--    ▶ 결과를 out/C2_codes.csv 로 내보낼 것 (UTF-8)
/*
SELECT *
FROM CHANGE_ME.공통코드테이블명
WHERE ROWNUM <= 3000
ORDER BY 1, 2;
*/


-- ── C-4. DB 안에 로직이 있는지 (프로시저·트리거·잡) ───────────────────────
--    트리거가 많으면 "애플리케이션이 안 하는 일을 DB가 한다"는 뜻이라
--    데이터 흐름 분석에서 놓치면 안 되는 부분이다.
SELECT OBJECT_TYPE, COUNT(*) AS 개수
FROM ALL_OBJECTS
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE OWNER = 'CHANGE_ME'
  AND OBJECT_TYPE IN ('PROCEDURE','FUNCTION','PACKAGE','TRIGGER',
                      'MATERIALIZED VIEW','JOB','SEQUENCE','TYPE')
GROUP BY OBJECT_TYPE
ORDER BY 개수 DESC;

SELECT TABLE_NAME, TRIGGER_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS
FROM ALL_TRIGGERS
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE TABLE_OWNER = 'CHANGE_ME'
ORDER BY TABLE_NAME, TRIGGER_NAME;


-- ── C-5. 컬럼 사용 실태 ★ 스캔 없이 "실제로 채워지는 컬럼인지" 판별 ───────
--    옵티마이저 통계의 NUM_NULLS / NUM_DISTINCT 를 읽는다 (비용 0).
--    NUM_NULLS 가 NUM_ROWS 와 같으면 = 아무도 안 쓰는 껍데기 컬럼.
--    NUM_DISTINCT 가 1이면 = 값이 하나뿐인 사실상 죽은 컬럼.
--    선별된 테이블에만 적용할 것 (C-3 결과 이후).
SELECT c.TABLE_NAME, c.COLUMN_NAME, t.NUM_ROWS AS 통계행수,
       c.NUM_NULLS AS NULL개수, c.NUM_DISTINCT AS 고유값수,
       CASE WHEN c.NUM_NULLS = t.NUM_ROWS AND t.NUM_ROWS > 0 THEN '전부 NULL(미사용)'
            WHEN c.NUM_DISTINCT = 1 THEN '값 1종(사실상 고정)'
            WHEN c.NUM_DISTINCT = t.NUM_ROWS AND t.NUM_ROWS > 0 THEN '전부 고유(키 후보)'
            ELSE '' END AS 판정
FROM ALL_TAB_COLUMNS c
JOIN ALL_TABLES t ON t.OWNER = c.OWNER AND t.TABLE_NAME = c.TABLE_NAME
-- ▼▼▼ 여기만 수정 (스키마 + 대상 테이블 목록) ▼▼▼
WHERE c.OWNER = 'CHANGE_ME'
  AND c.TABLE_NAME IN ('TABLE_A','TABLE_B')
ORDER BY c.TABLE_NAME, c.COLUMN_ID;
