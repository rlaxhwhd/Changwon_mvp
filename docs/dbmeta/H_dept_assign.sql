-- ══════════════════════════════════════════════════════════════════════════
-- H. 조교 학과 배정 · 학과 코드 체계 확인            [Oracle / DREAMCATCH]
--
--   확인 목표
--     ① FU_ASS_DEPT 의 DEPT_CD / MAJOR_CD 가 V_USR_INF 의 어느 컬럼에 대응하나
--        (HAKBU_CD 인가 MAJOR_CD 인가 DAEHAK_CD 인가)
--     ② FU_CODE(자체 6자리)와 V_DEP_INF_ALL(학사)의 코드 체계가 같은가
--     ③ 조교 로그인 시 보여줄 학생 필터 조건을 확정
--
--   전부 집계·코드 조회. 학생 개인정보는 나오지 않는다.
--   (조교명 USR_NM 은 개인정보이므로 조회에서 제외했다)
-- ══════════════════════════════════════════════════════════════════════════


-- ── H-1. 조교 배정 현황 — 몇 명이 몇 개 학과를 담당하나 ───────────────────
SELECT COUNT(*) AS 배정건수,
       COUNT(DISTINCT USR_ID)  AS 조교수,
       COUNT(DISTINCT DEPT_CD) AS 학과수,
       COUNT(DISTINCT MAJOR_CD) AS 전공수
FROM FU_ASS_DEPT;

--    중복 행이 있나 (이 테이블은 PK가 없다)
SELECT USR_ID, DEPT_CD, MAJOR_CD, COUNT(*) AS 중복
FROM FU_ASS_DEPT
GROUP BY USR_ID, DEPT_CD, MAJOR_CD
HAVING COUNT(*) > 1;


-- ── H-2. 배정 코드가 학사 조직트리에 실제로 있나 ★★ 핵심 검증 ─────────────
--    DEPT_CD 와 MAJOR_CD 각각이 V_DEP_INF_ALL 에서 몇 레벨(LVL)로 잡히는지 본다.
--    → LVL 값이 갈리면 DEPT_CD=학부, MAJOR_CD=전공 이라는 뜻.
SELECT 'DEPT_CD' AS 구분, d.LVL, d.GRP_NM, COUNT(*) AS 건수
FROM FU_ASS_DEPT a
LEFT JOIN V_DEP_INF_ALL d ON d.DEPT_CD = a.DEPT_CD
GROUP BY d.LVL, d.GRP_NM
UNION ALL
SELECT 'MAJOR_CD', d.LVL, d.GRP_NM, COUNT(*)
FROM FU_ASS_DEPT a
LEFT JOIN V_DEP_INF_ALL d ON d.DEPT_CD = a.MAJOR_CD
GROUP BY d.LVL, d.GRP_NM
ORDER BY 1, 2;

--    실제 매칭 결과를 눈으로 (조교명 제외)
SELECT a.DEPT_CD, d1.DEPT_NM AS DEPT_CD_이름, d1.LVL AS DEPT_LVL,
       a.MAJOR_CD, d2.DEPT_NM AS MAJOR_CD_이름, d2.LVL AS MAJOR_LVL,
       COUNT(*) AS 조교배정수
FROM FU_ASS_DEPT a
LEFT JOIN V_DEP_INF_ALL d1 ON d1.DEPT_CD = a.DEPT_CD
LEFT JOIN V_DEP_INF_ALL d2 ON d2.DEPT_CD = a.MAJOR_CD
GROUP BY a.DEPT_CD, d1.DEPT_NM, d1.LVL, a.MAJOR_CD, d2.DEPT_NM, d2.LVL
ORDER BY a.DEPT_CD, a.MAJOR_CD;


-- ── H-3. 학생 소속 코드 조합 분포 ★ 필터 조건 확정용 ──────────────────────
--    V_USR_INF 의 3계층(DAEHAK_CD / HAKBU_CD / MAJOR_CD) 조합을 본다.
--    ▼ USER_TY_CD 값은 F-1 결과에서 학생 코드로 교체
SELECT u.DAEHAK_CD, u.HAKBU_CD, u.MAJOR_CD,
       d.DEPT_NM AS 전공명, COUNT(*) AS 인원
FROM V_USR_INF u
LEFT JOIN V_DEP_INF_ALL d ON d.DEPT_CD = u.MAJOR_CD
WHERE u.USER_TY_CD = 'CHANGE_ME'   -- ▼ 학생 코드
  AND u.HOFC_STA_CD IS NOT NULL
GROUP BY u.DAEHAK_CD, u.HAKBU_CD, u.MAJOR_CD, d.DEPT_NM
ORDER BY 인원 DESC;


-- ── H-4. 조교 배정 ↔ 학생 소속 실제 매칭 검증 ★★★ 최종 확인 ──────────────
--    세 가지 조인 후보 각각으로 몇 명이 걸리는지 비교한다.
--    가장 자연스러운 숫자가 나오는 쪽이 정답이다.
SELECT 'MAJOR_CD = MAJOR_CD' AS 조인방식, COUNT(*) AS 매칭학생수
FROM V_USR_INF u
WHERE EXISTS (SELECT 1 FROM FU_ASS_DEPT a WHERE a.MAJOR_CD = u.MAJOR_CD)
UNION ALL
SELECT 'DEPT_CD = HAKBU_CD', COUNT(*)
FROM V_USR_INF u
WHERE EXISTS (SELECT 1 FROM FU_ASS_DEPT a WHERE a.DEPT_CD = u.HAKBU_CD)
UNION ALL
SELECT 'DEPT_CD = MAJOR_CD', COUNT(*)
FROM V_USR_INF u
WHERE EXISTS (SELECT 1 FROM FU_ASS_DEPT a WHERE a.DEPT_CD = u.MAJOR_CD)
UNION ALL
SELECT 'DEPT_CD = DAEHAK_CD', COUNT(*)
FROM V_USR_INF u
WHERE EXISTS (SELECT 1 FROM FU_ASS_DEPT a WHERE a.DEPT_CD = u.DAEHAK_CD);


-- ── H-5. FU_CODE(자체) vs V_DEP_INF_ALL(학사) 코드 체계 비교 ──────────────
SELECT 'FU_CODE' AS 소스, LVL, COUNT(*) AS 건수, MIN(LENGTH(DEPT_CD)) AS 코드최소길이,
       MAX(LENGTH(DEPT_CD)) AS 코드최대길이
FROM FU_CODE GROUP BY LVL
UNION ALL
SELECT 'V_DEP_INF_ALL', LVL, COUNT(*), MIN(LENGTH(DEPT_CD)), MAX(LENGTH(DEPT_CD))
FROM V_DEP_INF_ALL GROUP BY LVL
ORDER BY 1, 2;

--    두 체계의 교집합 — 같은 코드를 쓰는가
SELECT COUNT(*) AS FU_CODE_총건수,
       SUM(CASE WHEN EXISTS (SELECT 1 FROM V_DEP_INF_ALL v WHERE v.DEPT_CD = f.DEPT_CD)
                THEN 1 ELSE 0 END) AS 학사트리에_있는건수
FROM FU_CODE f;


-- ── H-6. 조교 계정이 권한 테이블에 등록돼 있나 ★ 2단계 구조 확인 ──────────
--    FU_ASS_DEPT 의 조교가 SY_AUTH_USER 에도 있어야 화면에 들어갈 수 있다.
SELECT a.USR_ID, au.AUTH_CODE, sa.AUTHNM AS 권한명
FROM FU_ASS_DEPT a
LEFT JOIN SY_AUTH_USER au ON au.AUTH_USER = a.USR_ID
LEFT JOIN SY_AUTH sa      ON sa.AUTH_CODE = au.AUTH_CODE
GROUP BY a.USR_ID, au.AUTH_CODE, sa.AUTHNM
ORDER BY sa.AUTHNM NULLS FIRST, a.USR_ID;

--    역할 마스터 13건 전체 (관리자 화면의 역할 선택 UI에 필요)
SELECT AUTH_CODE, AUTHNM AS 권한명, AUTH_EXPL AS 설명,
       BASEGRUP_YN AS 기본그룹, USE_YN AS 사용여부
FROM SY_AUTH ORDER BY AUTH_CODE;


-- ── H-7. 구버전 테이블 확인 — COM_ASS_DEPT 를 아직 참조하나 ───────────────
SELECT 'COM_ASS_DEPT' AS 테이블, COUNT(*) AS 행수 FROM COM_ASS_DEPT
UNION ALL
SELECT 'FU_ASS_DEPT', COUNT(*) FROM FU_ASS_DEPT
UNION ALL
SELECT 'TB_CARR_PROF_ASSI_DEPT', COUNT(*) FROM TB_CARR_PROF_ASSI_DEPT;

--    두 테이블에 같은 조교가 중복 등록돼 있나
SELECT c.USR_ID, c.DEPT_CD AS COM_DEPT, f.DEPT_CD AS FU_DEPT
FROM COM_ASS_DEPT c
FULL OUTER JOIN FU_ASS_DEPT f ON f.USR_ID = c.USR_ID AND f.DEPT_CD = c.DEPT_CD
ORDER BY 1;
