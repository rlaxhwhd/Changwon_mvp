-- ══════════════════════════════════════════════════════════════════════════
-- F. 대학원 데이터 포함 여부 확인                      [Oracle / DREAMCATCH]
--
--   학사DB(V_BRDB 링크)가 대학원 소속·과정을 함께 주는지 확인한다.
--   전부 집계(COUNT/DISTINCT) 또는 코드 목록 — 개인정보가 나오지 않는다.
-- ══════════════════════════════════════════════════════════════════════════


-- ── F-1. 사용자 유형 분포 ★ 대학원생이 별도 코드로 들어오나 ───────────────
SELECT USER_TY_CD, COUNT(*) AS 인원
FROM V_USR_INF GROUP BY USER_TY_CD ORDER BY 인원 DESC;

--    코드 의미는 SY_CODE에서 찾는다 (그룹코드는 결과 보고 특정)
SELECT GRP_CODE, CODE, CODENM, CODE_EXPL
FROM SY_CODE
WHERE CODENM LIKE '%대학원%' OR CODE_EXPL LIKE '%대학원%'
   OR CODENM LIKE '%석사%'   OR CODENM LIKE '%박사%'
   OR CODE_EXPL LIKE '%사용자%유형%' OR CODE_EXPL LIKE '%학적%'
ORDER BY GRP_CODE, EXPS_ORDR;


-- ── F-2. 조직 계층 전체 ★★ 여기에 '대학원'이 있으면 확정 ──────────────────
--    학과 목록은 개인정보가 아니다. 전체를 봐도 된다.
--    ▶ out/F2_dept_tree.csv 로 내보낼 것 (UTF-8)
SELECT LVL AS 레벨, DEPT_CD, DEPT_NM, DEPT_UP_CD AS 상위코드,
       GRP_CD, GRP_NM, UNIV_CODE, USE_YN
FROM V_DEP_INF_ALL
ORDER BY ORDERING;


-- ── F-3. V_DEP_INF 와 V_DEP_INF_ALL 의 차이 ★ 가설 검증 ───────────────────
--    ALL이 242개 더 많다(1,921 vs 1,679). ALL에만 있는 것이 대학원인지 확인.
SELECT a.LVL, a.DEPT_CD, a.DEPT_NM, a.GRP_NM, a.UNIV_CODE
FROM V_DEP_INF_ALL a
WHERE NOT EXISTS (SELECT 1 FROM V_DEP_INF d WHERE d.DEPT_CD = a.DEPT_CD)
ORDER BY a.LVL, a.DEPT_CD;


-- ── F-4. 소속(대학) 코드별 인원 분포 ──────────────────────────────────────
SELECT u.DAEHAK_CD, d.DEPT_NM AS 대학명, COUNT(*) AS 인원
FROM V_USR_INF u
LEFT JOIN V_DEP_INF_ALL d ON d.DEPT_CD = u.DAEHAK_CD
GROUP BY u.DAEHAK_CD, d.DEPT_NM
ORDER BY 인원 DESC;


-- ── F-5. 학년 분포 ─ 대학원은 보통 1~3 또는 별도 값 ───────────────────────
SELECT USER_TY_CD, STU_SCHGR, GRADE, COUNT(*) AS 인원
FROM V_USR_INF
GROUP BY USER_TY_CD, STU_SCHGR, GRADE
ORDER BY USER_TY_CD, STU_SCHGR, GRADE;


-- ── F-6. 학적상태 코드 분포 (재학/휴학/졸업/수료/제적…) ───────────────────
SELECT HOFC_STA_CD, OUT_STAT, OUT_GB, COUNT(*) AS 인원
FROM V_USR_INF
GROUP BY HOFC_STA_CD, OUT_STAT, OUT_GB
ORDER BY 인원 DESC;


-- ── F-7. 과정구분(GRAD_DIV) — 수강/강의 테이블의 학부·대학원 구분 ─────────
--    두 테이블 모두 0행이라 값은 안 나오지만, 컬럼이 있다는 것 자체가
--    "학사DB가 과정을 구분해서 준다"는 근거다. 참고용.
SELECT 'V_LECT_INF' AS 테이블, COUNT(*) AS 행수 FROM V_LECT_INF
UNION ALL
SELECT 'V_SUGANG', COUNT(*) FROM V_SUGANG;
