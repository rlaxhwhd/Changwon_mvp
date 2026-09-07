-- ══════════════════════════════════════════════════════════════════════════
-- I. 현행 사이트맵 · 역할별 화면 목록                 [Oracle / DREAMCATCH]
--
--   목적: 소스를 읽지 않고 "현행에 어떤 화면이 있고 누가 쓰는가"를 확보한다.
--         → 우리가 만든 상담사·관리자·조교 화면과 대조해 빠진 기능을 찾는다.
--
--   전부 메뉴 메타데이터. 개인정보 없음.
-- ══════════════════════════════════════════════════════════════════════════


-- ── I-1. 메뉴 트리 전체 ★ 첫 실행 ─────────────────────────────────────────
--    현행 사이트의 전체 화면 목록. 계층 경로까지 만들어 준다.
--    ▶ out/I1_menu_tree.csv 로 내보낼 것 (UTF-8)
SELECT LPAD(' ', (m.MENU_LEVL - 1) * 4) || m.MENUNM AS 메뉴트리,
       m.MENU_CODE, m.MENU_LEVL AS 깊이, m.PRTCODE AS 상위코드,
       m.USER_DVID AS 사용자구분, m.MENU_URL AS 화면경로,
       m.MENU_EXPL AS 설명, m.USE_YN, m.DLTE_YN, m.EXPS_ORDR AS 순서
FROM SY_MENU m
WHERE NVL(m.DLTE_YN,'N') = 'N'
START WITH m.PRTCODE IS NULL OR m.PRTCODE IN ('0','00','000',' ')
CONNECT BY PRIOR m.MENU_CODE = m.PRTCODE
ORDER SIBLINGS BY m.EXPS_ORDR;

--    계층 쿼리가 안 먹으면(루트 코드 규칙이 다르면) 이걸로 평면 조회
SELECT m.MENU_LEVL AS 깊이, m.MENU_CODE, m.PRTCODE AS 상위, m.MENUNM AS 메뉴명,
       m.USER_DVID AS 사용자구분, m.MENU_URL AS 화면경로, m.USE_YN, m.DLTE_YN
FROM SY_MENU m
ORDER BY m.MENU_LEVL, m.EXPS_ORDR, m.MENU_CODE;


-- ── I-2. 역할별 화면 목록 ★★★ 핵심 — 이게 gap 분석의 재료 ─────────────────
--    "상담사는 어떤 화면을 보는가", "조교는 무엇을 보는가"가 그대로 나온다.
--    ▶ out/I2_role_menu.csv 로 내보낼 것 (UTF-8)
SELECT a.AUTH_CODE, a.AUTHNM AS 역할명,
       m.MENU_LEVL AS 깊이, m.MENUNM AS 메뉴명,
       m.MENU_URL AS 화면경로, m.MENU_CODE, m.PRTCODE AS 상위코드,
       p.MENUNM AS 상위메뉴, m.USE_YN
FROM SY_AUTH a
JOIN SY_MENU_AUTH ma ON ma.AUTH_CODE = a.AUTH_CODE
JOIN SY_MENU m       ON m.MENU_CODE  = ma.MENU_CODE
LEFT JOIN SY_MENU p  ON p.MENU_CODE  = m.PRTCODE
WHERE NVL(m.DLTE_YN,'N') = 'N'
ORDER BY a.AUTH_CODE, m.MENU_LEVL, m.EXPS_ORDR;


-- ── I-3. 역할 마스터 + 배정 인원 ──────────────────────────────────────────
--    13개 역할 각각의 이름·설명과 실제 배정 인원. 관리자 화면 역할 선택 UI 재료.
SELECT a.AUTH_CODE, a.AUTHNM AS 역할명, a.AUTH_EXPL AS 설명,
       a.BASEGRUP_YN AS 기본그룹, a.USE_YN,
       (SELECT COUNT(*) FROM SY_AUTH_USER u WHERE u.AUTH_CODE = a.AUTH_CODE) AS 배정인원,
       (SELECT COUNT(*) FROM SY_MENU_AUTH ma WHERE ma.AUTH_CODE = a.AUTH_CODE) AS 메뉴수
FROM SY_AUTH a
ORDER BY 배정인원 DESC, a.AUTH_CODE;


-- ── I-4. 사용자구분(USER_DVID)별 메뉴 분포 ────────────────────────────────
--    학생용 / 백오피스용이 이 컬럼으로 갈리는지 확인.
SELECT USER_DVID AS 사용자구분, MENU_LEVL AS 깊이, COUNT(*) AS 메뉴수
FROM SY_MENU
WHERE NVL(DLTE_YN,'N') = 'N'
GROUP BY USER_DVID, MENU_LEVL
ORDER BY 1, 2;


-- ── I-5. 어느 역할에도 안 붙은 메뉴 (고아 화면) ───────────────────────────
--    만들어졌지만 아무 역할에도 노출되지 않는 화면 = 사실상 죽은 기능.
SELECT m.MENU_CODE, m.MENUNM AS 메뉴명, m.MENU_LEVL AS 깊이, m.MENU_URL AS 화면경로
FROM SY_MENU m
WHERE NVL(m.DLTE_YN,'N') = 'N'
  AND NOT EXISTS (SELECT 1 FROM SY_MENU_AUTH ma WHERE ma.MENU_CODE = m.MENU_CODE)
ORDER BY m.MENU_LEVL, m.MENUNM;


-- ── I-6. [선택] 실제 사용 빈도 ⚠ 대용량 주의 ──────────────────────────────
--    SY_MENU_LOG 는 647만 행이다. 먼저 컬럼 구조를 확인한 뒤,
--    인덱스가 있는 날짜 컬럼으로 기간을 좁혀서만 실행할 것.
--    "화면은 있는데 아무도 안 쓴다"를 알 수 있어 gap 분석에 매우 유용하다.
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH
FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'SY_MENU_LOG' ORDER BY COLUMN_ID;

SELECT INDEX_NAME, COLUMN_NAME, COLUMN_POSITION
FROM USER_IND_COLUMNS WHERE TABLE_NAME = 'SY_MENU_LOG' ORDER BY INDEX_NAME, COLUMN_POSITION;

--    ▼ 위 결과로 날짜/메뉴 컬럼명을 확인한 뒤 주석을 풀어 사용
--      (기간을 반드시 좁힐 것. 전체 스캔 금지)
/*
SELECT l.MENU_CODE, m.MENUNM AS 메뉴명, COUNT(*) AS 접근수
FROM SY_MENU_LOG l
LEFT JOIN SY_MENU m ON m.MENU_CODE = l.MENU_CODE
WHERE l.LOG_DT >= DATE '2026-01-01'
GROUP BY l.MENU_CODE, m.MENUNM
ORDER BY 접근수 DESC;
*/
