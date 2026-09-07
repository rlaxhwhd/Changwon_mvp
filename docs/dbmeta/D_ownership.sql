-- ══════════════════════════════════════════════════════════════════════════
-- D. 현행 드림캐치 운영DB 구조 분석 + 데이터 소유권 판별      [Oracle / DREAMCATCH]
--
--   목표: 이 DB의 각 테이블이
--          (가) 학사DB에서 가져온 데이터인가          → 우리가 못 고치는 값
--          (나) 이 서비스가 스스로 만드는 데이터인가   → 우리가 소유하는 값
--          (다) 둘이 섞인 테이블인가
--         를 판별한다.
--
--   자기 소유 스키마이므로 USER_* 뷰를 쓴다 — 권한 문제도, OWNER 필터도 없다.
--   전부 카탈로그 조회이며 사용자 테이블을 스캔하지 않는다.
-- ══════════════════════════════════════════════════════════════════════════


-- ═══ 1부. 전체 구조 파악 ═══════════════════════════════════════════════════

-- ── D-1. 테이블 인벤토리 ★ 첫 실행 ────────────────────────────────────────
--    ▶ out/D1_tables.csv 로 내보낼 것 (UTF-8)
SELECT t.TABLE_NAME,
       tc.COMMENTS     AS 테이블설명,
       t.NUM_ROWS      AS 통계행수,
       t.LAST_ANALYZED AS 통계수집일
FROM USER_TABLES t
LEFT JOIN USER_TAB_COMMENTS tc ON tc.TABLE_NAME = t.TABLE_NAME
ORDER BY t.TABLE_NAME;


-- ── D-2. 컬럼 인벤토리 (전체) ★ 두 번째 실행 ──────────────────────────────
--    D-1 결과가 300개 이하면 전체를 한 번에 뽑아도 된다.
--    그보다 많으면 알려줄 것 — 대상을 좁혀서 다시 뽑는다.
--    ▶ out/D2_columns.csv 로 내보낼 것 (UTF-8)
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
FROM USER_TAB_COLUMNS c
LEFT JOIN USER_COL_COMMENTS cc
       ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
ORDER BY c.TABLE_NAME, c.COLUMN_ID;


-- ── D-3. 제약조건 (PK / UNIQUE / FK) ──────────────────────────────────────
--    ▶ out/D3_constraints.csv
SELECT uc.TABLE_NAME,
       DECODE(uc.CONSTRAINT_TYPE,'P','PK','U','UNIQUE','R','FK') AS 종류,
       uc.CONSTRAINT_NAME,
       LISTAGG(ucc.COLUMN_NAME, ', ')
         WITHIN GROUP (ORDER BY ucc.POSITION) AS 컬럼,
       rc.TABLE_NAME  AS 참조테이블,
       uc.DELETE_RULE AS 삭제규칙
FROM USER_CONSTRAINTS uc
JOIN USER_CONS_COLUMNS ucc ON ucc.CONSTRAINT_NAME = uc.CONSTRAINT_NAME
LEFT JOIN USER_CONSTRAINTS rc ON rc.CONSTRAINT_NAME = uc.R_CONSTRAINT_NAME
WHERE uc.CONSTRAINT_TYPE IN ('P','U','R')
GROUP BY uc.TABLE_NAME, uc.CONSTRAINT_TYPE, uc.CONSTRAINT_NAME,
         rc.TABLE_NAME, uc.DELETE_RULE
ORDER BY uc.TABLE_NAME, 종류;


-- ═══ 2부. 학사DB 연계 경로 찾기 ═══════════════════════════════════════════
--   "학사 데이터가 이 DB로 어떻게 들어오는가"의 물리적 통로를 찾는다.

-- ── D-4. DB 링크 ★★ 있으면 이게 학사DB로 가는 직통로다 ────────────────────
SELECT DB_LINK, USERNAME AS 접속계정, HOST AS 대상DB, CREATED AS 생성일
FROM USER_DB_LINKS;

SELECT OWNER, DB_LINK, USERNAME, HOST FROM ALL_DB_LINKS;


-- ── D-5. 시노님 — 다른 스키마/원격 객체를 가리키는 별칭 ────────────────────
--    DB_LINK 컬럼에 값이 있으면 = 원격(학사) 객체를 이 이름으로 쓰고 있다는 뜻.
SELECT SYNONYM_NAME, TABLE_OWNER AS 실제스키마, TABLE_NAME AS 실제객체, DB_LINK
FROM ALL_SYNONYMS
WHERE OWNER IN (USER, 'PUBLIC')
ORDER BY DB_LINK NULLS LAST, TABLE_OWNER, TABLE_NAME;


-- ── D-6. 구체화 뷰(Materialized View) ★★ 학사 데이터 복제의 전형적 수단 ────
--    QUERY 컬럼에 원본 SQL이 그대로 들어 있다 — 무엇을 복제하는지 바로 나온다.
SELECT MVIEW_NAME, REFRESH_MODE, REFRESH_METHOD,
       LAST_REFRESH_DATE AS 마지막갱신, STALENESS, QUERY
FROM USER_MVIEWS;


-- ── D-7. 배치·로직 흔적 (프로시저·트리거·스케줄러) ────────────────────────
SELECT OBJECT_TYPE, COUNT(*) AS 개수 FROM USER_OBJECTS
WHERE OBJECT_TYPE IN ('PROCEDURE','FUNCTION','PACKAGE','TRIGGER',
                      'MATERIALIZED VIEW','JOB','SEQUENCE','VIEW')
GROUP BY OBJECT_TYPE ORDER BY 2 DESC;

--    스케줄러 잡 — 야간 연계 배치가 DB 안에 있으면 여기 나온다
SELECT JOB_NAME, ENABLED, REPEAT_INTERVAL AS 주기,
       LAST_START_DATE AS 마지막실행, JOB_ACTION AS 수행내용
FROM USER_SCHEDULER_JOBS;

--    구형 DBMS_JOB (레거시 시스템은 이쪽을 쓰는 경우가 많다)
SELECT JOB, WHAT AS 수행내용, INTERVAL AS 주기, LAST_DATE AS 마지막실행, BROKEN
FROM USER_JOBS;

--    트리거
SELECT TABLE_NAME, TRIGGER_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS
FROM USER_TRIGGERS ORDER BY TABLE_NAME;


-- ═══ 3부. 소유권 판별 신호 ═════════════════════════════════════════════════

-- ── D-8. 쓰기 활동 추적 ★★★ 가장 강력한 단서 ─────────────────────────────
--    Oracle이 통계 수집 이후의 INSERT/UPDATE/DELETE 건수를 자동 기록한다.
--      · INSERT만 대량 + 특정 시각에 몰림  → 학사 연계 배치로 적재된 테이블
--      · UPDATE/DELETE가 꾸준히 섞임       → 애플리케이션이 직접 쓰는 자체 테이블
--      · 아무 기록 없음                    → 읽기 전용(=외부 유래) 또는 미사용
--    ▶ out/D8_modifications.csv 로 내보낼 것
SELECT m.TABLE_NAME,
       m.INSERTS   AS 삽입건수,
       m.UPDATES   AS 수정건수,
       m.DELETES   AS 삭제건수,
       m.TIMESTAMP AS 마지막변경시각,
       t.NUM_ROWS  AS 통계행수
FROM USER_TAB_MODIFICATIONS m
LEFT JOIN USER_TABLES t ON t.TABLE_NAME = m.TABLE_NAME
ORDER BY m.TIMESTAMP DESC NULLS LAST;


-- ── D-9. 학사 키 컬럼 색출 ★★ 학사와 접점 있는 테이블 전부 나온다 ─────────
--    한글 컬럼 코멘트에서 학사 자연키(학번·학과·교번·과목·학년·학기)를 찾는다.
--    여기 걸린 테이블 = 학사 데이터와 연결되는 지점.
--    ▶ out/D9_academic_keys.csv 로 내보낼 것
SELECT cc.TABLE_NAME, cc.COLUMN_NAME, cc.COMMENTS AS 컬럼설명,
       CASE
         WHEN cc.COMMENTS LIKE '%학번%'                        THEN '학생'
         WHEN cc.COMMENTS LIKE '%학과%' OR cc.COMMENTS LIKE '%학부%'
           OR cc.COMMENTS LIKE '%대학%'                        THEN '조직'
         WHEN cc.COMMENTS LIKE '%교번%' OR cc.COMMENTS LIKE '%교수%'
           OR cc.COMMENTS LIKE '%직원%'                        THEN '교직원'
         WHEN cc.COMMENTS LIKE '%과목%' OR cc.COMMENTS LIKE '%교과%'
           OR cc.COMMENTS LIKE '%강의%'                        THEN '교과목'
         WHEN cc.COMMENTS LIKE '%학년%' OR cc.COMMENTS LIKE '%학기%'
           OR cc.COMMENTS LIKE '%이수%' OR cc.COMMENTS LIKE '%학점%' THEN '학적/성적'
         ELSE '기타'
       END AS 학사축
FROM USER_COL_COMMENTS cc
WHERE cc.COMMENTS LIKE '%학번%' OR cc.COMMENTS LIKE '%학과%'
   OR cc.COMMENTS LIKE '%학부%' OR cc.COMMENTS LIKE '%대학%'
   OR cc.COMMENTS LIKE '%교번%' OR cc.COMMENTS LIKE '%교수%'
   OR cc.COMMENTS LIKE '%직원%' OR cc.COMMENTS LIKE '%과목%'
   OR cc.COMMENTS LIKE '%교과%' OR cc.COMMENTS LIKE '%강의%'
   OR cc.COMMENTS LIKE '%학년%' OR cc.COMMENTS LIKE '%학기%'
   OR cc.COMMENTS LIKE '%이수%' OR cc.COMMENTS LIKE '%학점%'
ORDER BY 학사축, cc.TABLE_NAME, cc.COLUMN_NAME;


-- ── D-10. 같은 컬럼명이 몇 개 테이블에 퍼져 있나 ★ 조인키 역추적 ───────────
--    학번 컬럼명이 예컨대 'STDNT_NO' 라면, 그걸 가진 테이블 전부가
--    학생과 연결된 테이블이다. FK가 없어도 관계를 복원할 수 있다.
SELECT COLUMN_NAME, COUNT(*) AS 보유테이블수,
       LISTAGG(TABLE_NAME, ', ') WITHIN GROUP (ORDER BY TABLE_NAME) AS 테이블목록
FROM USER_TAB_COLUMNS
GROUP BY COLUMN_NAME
HAVING COUNT(*) >= 3
ORDER BY 보유테이블수 DESC;


-- ── D-11. 연계 흔적 네이밍 탐지 ───────────────────────────────────────────
--    학사에서 받아온 적재 테이블은 이름·코멘트에 흔적을 남기는 경우가 많다.
SELECT t.TABLE_NAME, tc.COMMENTS AS 테이블설명, t.NUM_ROWS
FROM USER_TABLES t
LEFT JOIN USER_TAB_COMMENTS tc ON tc.TABLE_NAME = t.TABLE_NAME
WHERE UPPER(t.TABLE_NAME) LIKE '%IF%'   OR UPPER(t.TABLE_NAME) LIKE '%INTF%'
   OR UPPER(t.TABLE_NAME) LIKE '%SYNC%' OR UPPER(t.TABLE_NAME) LIKE '%LINK%'
   OR UPPER(t.TABLE_NAME) LIKE '%TMP%'  OR UPPER(t.TABLE_NAME) LIKE '%TEMP%'
   OR UPPER(t.TABLE_NAME) LIKE '%COPY%' OR UPPER(t.TABLE_NAME) LIKE '%BAK%'
   OR UPPER(t.TABLE_NAME) LIKE '%HAKSA%' OR UPPER(t.TABLE_NAME) LIKE '%HS%'
   OR tc.COMMENTS LIKE '%학사%'   OR tc.COMMENTS LIKE '%연계%'
   OR tc.COMMENTS LIKE '%인터페이스%' OR tc.COMMENTS LIKE '%동기화%'
   OR tc.COMMENTS LIKE '%수집%'   OR tc.COMMENTS LIKE '%적재%'
   OR tc.COMMENTS LIKE '%임시%'
ORDER BY t.TABLE_NAME;


-- ── D-12. 동기화 메타 컬럼 보유 테이블 ────────────────────────────────────
--    '동기화일시', 'SYNC_DT', 'IF_DT', '수신일자' 같은 컬럼이 있으면
--    그 테이블은 거의 확실히 외부(학사) 유래다.
SELECT c.TABLE_NAME, c.COLUMN_NAME, cc.COMMENTS AS 컬럼설명
FROM USER_TAB_COLUMNS c
LEFT JOIN USER_COL_COMMENTS cc
       ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
WHERE UPPER(c.COLUMN_NAME) LIKE '%SYNC%' OR UPPER(c.COLUMN_NAME) LIKE '%IF\_%' ESCAPE '\'
   OR UPPER(c.COLUMN_NAME) LIKE '%\_IF%' ESCAPE '\'
   OR UPPER(c.COLUMN_NAME) LIKE '%SEND%' OR UPPER(c.COLUMN_NAME) LIKE '%RECV%'
   OR UPPER(c.COLUMN_NAME) LIKE '%COLCT%'
   OR cc.COMMENTS LIKE '%동기화%' OR cc.COMMENTS LIKE '%연계%'
   OR cc.COMMENTS LIKE '%수신%'   OR cc.COMMENTS LIKE '%전송%'
   OR cc.COMMENTS LIKE '%수집%'
ORDER BY c.TABLE_NAME, c.COLUMN_NAME;


-- ── D-13. 뷰 정의 — 이 DB 안에서 이미 만들어 쓰는 조인 ─────────────────────
SELECT VIEW_NAME, TEXT_LENGTH, TEXT FROM USER_VIEWS ORDER BY VIEW_NAME;


-- ── D-14. 시퀀스 — 자체 생성 키를 쓰는 테이블의 힌트 ──────────────────────
--    시퀀스로 PK를 만드는 테이블 = 이 서비스가 생성하는 데이터(자체 소유).
SELECT SEQUENCE_NAME, LAST_NUMBER AS 현재값, INCREMENT_BY
FROM USER_SEQUENCES ORDER BY SEQUENCE_NAME;
