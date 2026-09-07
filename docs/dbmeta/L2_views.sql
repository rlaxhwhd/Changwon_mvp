-- ══════════════════════════════════════════════════════════════════════════
-- L-2 (수정본). 뷰 14개의 정의문
--
--   먼저 드린 것이 ORA-00922 로 죽은 이유
--     SET LONG 200000 / SET PAGESIZE 0 은 SQL*Plus 전용 명령이다.
--     DBeaver·SQL Developer 의 SQL 편집기는 이걸 SQL 로 파싱하려다 실패한다.
--     내 실수다 — 아래는 순수 SQL 만 쓴다.
--
--   왜 이게 필요한가
--     현행 DB 는 FK 가 3건, PK 없는 테이블이 122개다.
--     "무엇이 무엇을 가리키는가"를 선언해 둔 곳이 사실상 없다.
--     그런데 뷰 정의문 안에는 JOIN ... ON 이 SQL 로 적혀 있다.
--     이 14개가 현재로선 유일한 "관계 정답지"다.
--
--   ⚠ 읽기 전용. DDL·DML 없음.
-- ══════════════════════════════════════════════════════════════════════════


-- ── L-2a. 권장 — DBMS_METADATA (CLOB 이라 안 잘린다) ──────────────────────
--   → out/L2_views.csv  (또는 결과를 그대로 텍스트로 붙여주셔도 됩니다)
--
--   USER_VIEWS.TEXT 는 LONG 타입이라 클라이언트마다 잘리는 길이가 다르다.
--   GET_DDL 은 CLOB 을 돌려주므로 전문이 온전히 나온다.
--   자기 스키마 객체라 별도 권한 없이 된다.

SELECT v.VIEW_NAME                                        AS "뷰",
       DBMS_METADATA.GET_DDL('VIEW', v.VIEW_NAME)         AS "정의"
  FROM USER_VIEWS v
 ORDER BY v.VIEW_NAME;


-- ── L-2b. 위가 막히면 — LONG 을 그대로 조회 ───────────────────────────────
--   DBeaver 는 결과 격자에서 셀을 더블클릭하면 값 뷰어로 전문을 볼 수 있다.
--   14행이니 하나씩 열어 복사해도 부담이 없다.

SELECT VIEW_NAME                                          AS "뷰",
       TEXT_LENGTH                                        AS "길이",
       TEXT                                               AS "정의"
  FROM USER_VIEWS
 ORDER BY VIEW_NAME;


-- ── L-2c. 그래도 잘리면 — 한 건씩 ────────────────────────────────────────
--   VIEW_NAME 을 바꿔가며 14번 실행. 아래 목록이 전부다.
--     EP_PRM_STEP_ALL / EP_PRM_STEP_ALL_20250301 / EP_PRM_STEP_MAX /
--     EP_PRM_STEP_MAX_20250301 / HAKGI_POINT_VIEW / TOTAL_SCORE_VIEW /
--     V_ABLE_PA / V_CA_SURVEY_EMP_TJS / V_CA_SURVEY_TJS / V_EP_PRM /
--     V_EP_PRM_ADD_INFO / V_EP_PRM_STEP_ALL / V_EP_PRM_STEP_MAX /
--     V_PA_GOAL_DATA_CAP
--
--   ※ 우선순위를 매기면 이 다섯이 제일 값어치가 큽니다.
--     V_EP_PRM (비교과 마스터 조합) · V_CA_SURVEY_TJS (역량진단 집계) ·
--     TOTAL_SCORE_VIEW (점수 합산) · V_PA_GOAL_DATA_CAP (역량목표) ·
--     HAKGI_POINT_VIEW (학기별 포인트)
--   시간이 없으시면 이 다섯만 주셔도 됩니다.

SELECT TEXT FROM USER_VIEWS WHERE VIEW_NAME = 'V_EP_PRM';


-- ── L-2d. 참고 — 뷰가 어떤 테이블을 참조하는지만이라도 ────────────────────
--   → out/L2_view_deps.csv
--   정의문 전문이 끝내 안 나오면, 최소한 "어느 테이블끼리 묶이는가"는 이걸로 안다.
--   조인 조건(ON 절)은 못 얻지만 관계 후보를 좁히는 데는 충분하다.

SELECT d.NAME                                             AS "뷰",
       d.REFERENCED_TYPE                                  AS "참조종류",
       d.REFERENCED_NAME                                  AS "참조대상"
  FROM USER_DEPENDENCIES d
 WHERE d.TYPE = 'VIEW'
 ORDER BY d.NAME, d.REFERENCED_NAME;
