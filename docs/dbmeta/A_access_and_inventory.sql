-- ══════════════════════════════════════════════════════════════════════════
-- A. 접근 권한 확인 + 스키마 인벤토리 + 테이블 목록          [Oracle / 읽기전용]
--
--   DBeaver에서 쿼리 하나에 커서를 두고 Ctrl+Enter 로 개별 실행한다.
--   전부 카탈로그 뷰(ALL_*) 조회이므로 사용자 테이블을 스캔하지 않는다.
--   ※ 시작 전 README.md의 "0. 안전장치"를 먼저 적용할 것.
-- ══════════════════════════════════════════════════════════════════════════


-- ── A-1. 내가 누구로 어디에 붙어 있나 ─────────────────────────────────────
SELECT SYS_CONTEXT('USERENV','SESSION_USER')   AS 접속계정,
       SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS 기본스키마,
       SYS_CONTEXT('USERENV','DB_NAME')        AS DB명,
       SYS_CONTEXT('USERENV','SERVER_HOST')    AS 서버호스트,
       SYS_CONTEXT('USERENV','IP_ADDRESS')     AS 내IP
FROM DUAL;


-- ── A-2. 이 세션이 가진 시스템 권한 ★ 쓰기 권한이 있는지 확인 ─────────────
--    결과에 INSERT/UPDATE/DELETE/DROP/ALTER ANY ... 가 보이면
--    "읽기전용 연결" 체크가 더더욱 중요하다(권한이 있어도 DBeaver가 막아줌).
SELECT PRIVILEGE FROM SESSION_PRIVS ORDER BY PRIVILEGE;


-- ── A-3. 부여된 롤 ────────────────────────────────────────────────────────
SELECT GRANTED_ROLE, ADMIN_OPTION, DEFAULT_ROLE FROM USER_ROLE_PRIVS ORDER BY 1;


-- ── A-4. 객체 권한 요약 — 어느 스키마의 무엇을 얼마나 볼 수 있나 ──────────
SELECT GRANTOR AS 소유스키마, PRIVILEGE, COUNT(*) AS 객체수
FROM USER_TAB_PRIVS
GROUP BY GRANTOR, PRIVILEGE
ORDER BY 객체수 DESC;


-- ── A-5. 스키마 인벤토리 ★★ 학사 스키마 식별 (여기서 OWNER를 정한다) ──────
--    보통 테이블 수가 가장 많은 OWNER가 학사 스키마다.
--    SYS/SYSTEM/XDB/APEX_* 등 오라클 기본 스키마는 무시한다.
SELECT OWNER, COUNT(*) AS 테이블수
FROM ALL_TABLES
WHERE OWNER NOT IN ('SYS','SYSTEM','OUTLN','XDB','WMSYS','CTXSYS','MDSYS',
                    'ORDSYS','ORDDATA','OLAPSYS','DBSNMP','APPQOSSYS',
                    'AUDSYS','GSMADMIN_INTERNAL','LBACSYS','DVSYS','OJVMSYS')
  AND OWNER NOT LIKE 'APEX%'
  AND OWNER NOT LIKE 'FLOWS%'
GROUP BY OWNER
ORDER BY 테이블수 DESC;


-- ── A-6. 테이블 목록 + 한글 코멘트 + 행수 ★ 1단계 산출물 ──────────────────
--    행수는 옵티마이저 통계(NUM_ROWS)에서 읽는다 → 테이블을 스캔하지 않는다.
--    통계수집일(LAST_ANALYZED)이 오래됐으면 실제 행수와 차이가 날 수 있으나
--    "쓰는 테이블 / 안 쓰는 테이블" 판별에는 충분하다.
--    ▶ 결과를 out/A6_tables.csv 로 내보낼 것 (UTF-8)
SELECT t.OWNER,
       t.TABLE_NAME,
       tc.COMMENTS      AS 테이블설명,
       t.NUM_ROWS       AS 통계행수,
       t.LAST_ANALYZED  AS 통계수집일,
       t.PARTITIONED    AS 파티션여부,
       t.TEMPORARY      AS 임시테이블
FROM ALL_TABLES t
LEFT JOIN ALL_TAB_COMMENTS tc
       ON tc.OWNER = t.OWNER AND tc.TABLE_NAME = t.TABLE_NAME
-- ▼▼▼ 여기만 수정 (A-5 결과의 학사 스키마명) ▼▼▼
WHERE t.OWNER = 'CHANGE_ME'
ORDER BY t.TABLE_NAME;


-- ── A-7. 뷰 목록 ★ 뷰가 있으면 관계 파악의 지름길 ─────────────────────────
--    운영에서 이미 조인해서 쓰는 뷰가 있으면, 그 정의문이 곧 테이블 관계의
--    "증명서"다. B-4에서 정의문 본문을 뽑는다.
SELECT v.OWNER, v.VIEW_NAME, tc.COMMENTS AS 뷰설명, v.TEXT_LENGTH AS 정의문길이
FROM ALL_VIEWS v
LEFT JOIN ALL_TAB_COMMENTS tc
       ON tc.OWNER = v.OWNER AND tc.TABLE_NAME = v.VIEW_NAME
-- ▼▼▼ 여기만 수정 ▼▼▼
WHERE v.OWNER = 'CHANGE_ME'
ORDER BY v.VIEW_NAME;


-- ── A-8. 시노님(SYNONYM) ★ 레거시 오라클에서 놓치기 쉬운 부분 ─────────────
--    소스 코드가 'STUDENT' 라고 쓰는데 실제로는 다른 스키마의 테이블을
--    시노님으로 가리키는 경우가 흔하다. 이게 있으면 소스 분석 시 반드시 필요.
SELECT OWNER, SYNONYM_NAME, TABLE_OWNER AS 실제스키마, TABLE_NAME AS 실제객체
FROM ALL_SYNONYMS
WHERE OWNER IN ('PUBLIC', USER)
ORDER BY OWNER, SYNONYM_NAME;


-- ── A-9. DB 링크 ★ 다른 시스템과 연동 중인지 ──────────────────────────────
--    있으면 "이 DB 밖에 또 다른 원천이 있다"는 뜻 — 데이터 흐름 파악에 중요.
SELECT OWNER, DB_LINK, HOST, CREATED FROM ALL_DB_LINKS ORDER BY 1,2;
