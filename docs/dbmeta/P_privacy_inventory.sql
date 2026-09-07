-- ══════════════════════════════════════════════════════════════════════════
-- P. 개인정보파일 일제정비 — 보유 현황 집계              [Oracle / 읽기전용]
--
--   대상: 현행 드림캐치 운영DB (계정 DREAMCATCH, 자기 소유 스키마)
--   전부 COUNT / 카탈로그(USER_*) 조회다 — 개인정보 값 자체는 한 건도
--   출력되지 않는다. 출력되는 것은 "건수"와 "컬럼명"뿐이다.
--
--   ※ 실행 전 README.md "0. 시작 전 안전장치" — DBeaver 읽기전용 연결 체크
--   ※ DBeaver에서 쿼리 하나에 커서를 두고 Ctrl+Enter 로 개별 실행한다.
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- ★★ 먼저 읽을 것 — "개인정보파일 개수"는 두 가지로 해석된다
--
--  (A) 개인정보파일의 "개수"  ← 법령상 정의
--      개인정보 보호법 제2조 4호: "개인정보파일"이란 개인정보를 쉽게 검색
--      할 수 있도록 체계적으로 배열·구성한 개인정보의 **집합물**.
--      즉 테이블/대장 단위로 세는 값이며, 보통 수십 ~ 수백 개다.
--      → P-5 로 센다.
--
--  (B) 개인정보 "보유 건수 / 정보주체 수"
--      개인정보파일 등록·공개 서식의 기재 항목 중 하나.
--      → P-2 ~ P-4 로 센다.
--
--  작년 답변이 "8만 개"였다면 그것은 (A)가 아니라 (B)다.
--  (A)로 8만이 나오는 시스템은 없다. 올해도 같은 기준으로 답해야
--  전년 대비 증감이 성립하므로, **양쪽을 다 뽑아 두고 담당자에게
--  어느 쪽인지 확인한 뒤 제출한다.**
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
--  1부. 정보주체 수  ← (B) 해석
-- ══════════════════════════════════════════════════════════════════════════

-- ── P-1. 학사DB 유래 인원 — 신분유형별 ★ 핵심 숫자 ───────────────────────
--    V_USR_INF 는 학사DB를 매일 새벽 배치로 MERGE 해 둔 로컬 테이블이다.
--    학생(재학·졸업·대학원) + 교원 + 직원 + 조교가 한 테이블에 들어 있다.
SELECT CASE WHEN GROUPING(USER_TY_CD) = 1 THEN '★ 합계'
            ELSE NVL(USER_TY_CD, '(NULL)') END          AS 신분코드,
       CASE WHEN GROUPING(USER_TY_CD) = 1 THEN '전체'
            WHEN USER_TY_CD = '1101' THEN '재학생-학부'
            WHEN USER_TY_CD = '1102' THEN '졸업생-학부'
            WHEN USER_TY_CD = '1201' THEN '재학생-대학원'
            WHEN USER_TY_CD = '1202' THEN '졸업생-대학원'
            WHEN USER_TY_CD = '1301' THEN '교원'
            WHEN USER_TY_CD = '1401' THEN '직원'
            WHEN USER_TY_CD = '1501' THEN '조교'
            ELSE '기타/미분류' END                       AS 구분,
       COUNT(*)                    AS 행수,
       COUNT(DISTINCT INTG_UID)    AS 고유인원
FROM V_USR_INF
GROUP BY ROLLUP (USER_TY_CD)
ORDER BY GROUPING(USER_TY_CD), COUNT(*) DESC;


-- ── P-2. 학적상태까지 교차 — "재학·졸업·제적 모두 포함" 확인용 ────────────
--    HOFC_STA_CD: 0001 재학 / 0002 휴학 / 0003 제적 / 0004 수료 / 0005 졸업
SELECT USER_TY_CD AS 신분코드,
       HOFC_STA_CD AS 학적상태코드,
       COUNT(*)    AS 인원
FROM V_USR_INF
GROUP BY USER_TY_CD, HOFC_STA_CD
ORDER BY USER_TY_CD, 인원 DESC;


-- ── P-3. 학사DB 밖 인원 — 우리 시스템이 자체 보유하는 개인정보 ────────────
--    학사DB에 없고 드림캐치가 직접 받아 저장하는 사람들이다.
--    개인정보파일 정비에서 실제로 "우리 소관"이 명확한 쪽이 여기다.
--    ※ 2026-08-25: 한글 별칭을 UNION ALL 뒤 ORDER BY 에 쓰면 에러가 났다.
--      복합 질의에서는 **컬럼 위치**로 정렬한다. (결과는 P-8 과 동일)
SELECT '외부 상담사'        AS 구분, COUNT(*) AS 인원 FROM COM_CON_INF
UNION ALL SELECT '기업 담당자(로그인)',  COUNT(*) FROM COM_CPRT_MEBR
UNION ALL SELECT '멘토',               COUNT(*) FROM TB_MENTOR_INFO
UNION ALL SELECT '멘티',               COUNT(*) FROM TB_MENTEE_INFO
UNION ALL SELECT '지역청년(외부회원)',   COUNT(*) FROM TB_CARR_USER_LOGIN
ORDER BY 2 DESC;


-- ── P-4. 제출용 총계 ──────────────────────────────────────────────────────
--    ※ V_USR_INF 는 학사DB 미러다. 이것을 "우리 보유"로 셀지 "학사DB 소관"
--      으로 뺄지는 정책 판단이며, 총계가 11만대냐 1천 미만이냐로 갈린다.
--      → 담당자 확인 필요 (작년 8만이면 포함해서 센 것이다)
SELECT '① 학사DB 유래(V_USR_INF)'  AS 구분, COUNT(DISTINCT INTG_UID) AS 인원 FROM V_USR_INF
UNION ALL
SELECT '② 자체 보유(외부인원 합)',
       (SELECT COUNT(*) FROM COM_CON_INF)
     + (SELECT COUNT(*) FROM COM_CPRT_MEBR)
     + (SELECT COUNT(*) FROM TB_MENTOR_INFO)
     + (SELECT COUNT(*) FROM TB_MENTEE_INFO)
     + (SELECT COUNT(*) FROM TB_CARR_USER_LOGIN)
FROM DUAL;


-- ══════════════════════════════════════════════════════════════════════════
--  2부. 개인정보파일 개수  ← (A) 해석 = 법령상 정의
-- ══════════════════════════════════════════════════════════════════════════

-- ── P-5. 개인정보 컬럼을 가진 테이블 목록 ★ (A)의 답 ──────────────────────
--    강한 지표만 쓴다: 연락처·이메일·주소·생년월일·주민번호·성별·계좌.
--    이름(_NM)·ID 는 DEPT_NM·CODE_NM 처럼 개인정보가 아닌 것이 대량으로
--    섞이므로 여기서는 제외했다. (P-6 에서 따로 본다)
WITH pii AS (
  SELECT TABLE_NAME,
         COUNT(*) AS 개인정보컬럼수,
         LISTAGG(COLUMN_NAME, ', ')
           WITHIN GROUP (ORDER BY COLUMN_NAME) AS 컬럼목록
  FROM USER_TAB_COLUMNS
  WHERE REGEXP_LIKE(
          COLUMN_NAME,
          '(^|_)(TEL|HP|PHONE|MOBILE|CELL|EMAIL|MAIL|ADDR|ADDRESS|ZIP|POST'
       || '|BIRTH|BIRTHDAY|BIR_DT|JUMIN|SSN|RESIDENT|SEX|GENDER'
       || '|BANK|ACCOUNT|ACCT)($|_)', 'i')
  GROUP BY TABLE_NAME
)
SELECT p.TABLE_NAME,
       t.NUM_ROWS      AS 통계행수,
       t.LAST_ANALYZED AS 통계수집일,
       p.개인정보컬럼수,
       p.컬럼목록
FROM pii p
LEFT JOIN USER_TABLES t ON t.TABLE_NAME = p.TABLE_NAME
ORDER BY t.NUM_ROWS DESC NULLS LAST;


-- ── P-5b. 위 목록의 개수만 (제출 숫자) ────────────────────────────────────
SELECT COUNT(DISTINCT TABLE_NAME) AS 개인정보파일_후보수
FROM USER_TAB_COLUMNS
WHERE REGEXP_LIKE(
        COLUMN_NAME,
        '(^|_)(TEL|HP|PHONE|MOBILE|CELL|EMAIL|MAIL|ADDR|ADDRESS|ZIP|POST'
     || '|BIRTH|BIRTHDAY|BIR_DT|JUMIN|SSN|RESIDENT|SEX|GENDER'
     || '|BANK|ACCOUNT|ACCT)($|_)', 'i');


-- ── P-6. 넓은 기준 — 사람을 식별하는 ID를 가진 테이블까지 포함 ────────────
--    학번·사번(INTG_UID 등)만 있어도 개인 식별이 되므로 정비 범위에
--    포함해야 한다는 해석이 가능하다. 두 숫자를 다 준비해 둔다.
SELECT COUNT(DISTINCT TABLE_NAME) AS 식별자포함_테이블수
FROM USER_TAB_COLUMNS
WHERE REGEXP_LIKE(
        COLUMN_NAME,
        '(^|_)(INTG_UID|USR_ID|USRID|USERID|STU_NO|STUNO|PROF_ID'
     || '|CONSULTID|CONSULTANTID|REGID|UPDID|MEMB_ID|MBER_ID)($|_)', 'i');


-- ══════════════════════════════════════════════════════════════════════════
--  3부. ★ 정비 대상 — 백업·스냅샷 사본
-- ══════════════════════════════════════════════════════════════════════════

-- ── P-7. 이름에 날짜/MIG/BAK 가 붙은 사본 테이블 ★★ 반드시 확인 ──────────
--    일제정비의 목적이 "불필요한 개인정보 파기"다. 여기 걸리는 것들은
--    운영에 쓰이지 않으면서 개인정보 원본을 통째로 복제해 둔 것이다.
SELECT t.TABLE_NAME,
       t.NUM_ROWS      AS 통계행수,
       t.LAST_ANALYZED AS 통계수집일
FROM USER_TABLES t
WHERE REGEXP_LIKE(t.TABLE_NAME,
        '(19|20)[0-9]{6}|_MIG|_BAK|_BACKUP|_OLD|_TEMP|_TMP|_COPY|_TEST')
ORDER BY t.NUM_ROWS DESC NULLS LAST;


-- ── P-7b. 사본 총계 ───────────────────────────────────────────────────────
SELECT COUNT(*)          AS 사본테이블수,
       SUM(NUM_ROWS)     AS 사본총행수
FROM USER_TABLES
WHERE REGEXP_LIKE(TABLE_NAME,
        '(19|20)[0-9]{6}|_MIG|_BAK|_BACKUP|_OLD|_TEMP|_TMP|_COPY|_TEST');


-- ══════════════════════════════════════════════════════════════════════════
--  4부. 숫자 신뢰성
-- ══════════════════════════════════════════════════════════════════════════

-- ── P-8. ★ 실측 COUNT — 제출 숫자는 반드시 이걸로 ─────────────────────────
--    위 NUM_ROWS 는 옵티마이저 "통계"라 수집 시점의 추정치다.
--    이 스키마에는 통계가 2020~2021년에 멈춘 테이블이 다수 있어
--    (예: COM_COMP_INF 2020-05, TB_MENTEE_INFO 2021-09)
--    그대로 제출하면 몇 년 전 숫자를 내는 셈이 된다.
SELECT 'V_USR_INF'          AS 테이블, COUNT(*) AS 실측행수 FROM V_USR_INF
UNION ALL SELECT 'COM_CON_INF',        COUNT(*) FROM COM_CON_INF
UNION ALL SELECT 'COM_CPRT_MEBR',      COUNT(*) FROM COM_CPRT_MEBR
UNION ALL SELECT 'TB_MENTOR_INFO',     COUNT(*) FROM TB_MENTOR_INFO
UNION ALL SELECT 'TB_MENTEE_INFO',     COUNT(*) FROM TB_MENTEE_INFO
UNION ALL SELECT 'TB_CARR_USER_LOGIN', COUNT(*) FROM TB_CARR_USER_LOGIN;


-- ── P-9. 통계가 오래된 테이블 — 위 실측 대상 판별용 ───────────────────────
SELECT TABLE_NAME, NUM_ROWS AS 통계행수, LAST_ANALYZED AS 통계수집일
FROM USER_TABLES
WHERE NUM_ROWS > 1000
  AND LAST_ANALYZED < ADD_MONTHS(SYSDATE, -24)
ORDER BY NUM_ROWS DESC;


-- ══════════════════════════════════════════════════════════════════════════
--  5부. 2026-08-25 P-5 결과에서 나온 후속 확인
-- ══════════════════════════════════════════════════════════════════════════

-- ── P-10. ★★ 주민등록번호(JUMIN) 실제 보유 건수 ──────────────────────────
--    P-5 결과에서 JUMIN 컬럼을 가진 테이블이 3개 확인됐다.
--    주민등록번호는 개인정보 보호법 제24조의2 처리제한 대상이다
--    (법령상 근거 없으면 처리 금지, 처리 시 암호화 의무).
--    ▶ 컬럼만 있고 값이 비어 있을 수 있으므로 **건수만** 먼저 센다.
--      값 자체는 절대 조회하지 않는다 — 아래는 COUNT 뿐이다.
SELECT 'JOB_RES'              AS 테이블, COUNT(*) AS 전체행수,
       COUNT(JUMIN)           AS 값있는행수 FROM JOB_RES
UNION ALL
SELECT 'SS_JOB_RES',          COUNT(*), COUNT(JUMIN) FROM SS_JOB_RES
UNION ALL
SELECT 'SS_JOB_RES_HISTORY',  COUNT(*), COUNT(JUMIN) FROM SS_JOB_RES_HISTORY
ORDER BY 3 DESC;


-- ── P-10b. 위 3개 테이블이 아직 쓰이는지 — 최근 데이터가 있나 ─────────────
--    컬럼명이 스키마마다 다르므로 먼저 날짜 컬럼을 확인한다.
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME IN ('JOB_RES','SS_JOB_RES','SS_JOB_RES_HISTORY')
  AND (DATA_TYPE LIKE 'DATE%' OR DATA_TYPE LIKE 'TIMESTAMP%'
       OR REGEXP_LIKE(COLUMN_NAME, 'DATE|DT$|_DT|REGDT|UPDDATE', 'i'))
ORDER BY TABLE_NAME, COLUMN_NAME;


-- ── P-11. SC_LOG 월별 로그 — 개수 세는 기준에 직접 영향 ───────────────────
--    P-5 가 잡은 128개 중 77개가 SC_LOG_YYYYMM (문자발송 로그, TR_PHONE).
--    같은 성격의 월별 분할이므로 업무 기준으로는 "1개 파일"로 보는 것이
--    타당하다. 어느 쪽으로 셀지에 따라 제출 숫자가 128 ↔ 52 로 갈린다.
SELECT COUNT(*)      AS SC_LOG_테이블수,
       MIN(TABLE_NAME) AS 최초,
       MAX(TABLE_NAME) AS 최종,
       SUM(NUM_ROWS) AS 통계행수합계
FROM USER_TABLES
WHERE TABLE_NAME LIKE 'SC\_LOG%' ESCAPE '\';


-- ── P-12. 신분코드가 NULL 인 인원 — 어떤 사람들인가 ★ 대학원 이슈와 직결 ──
--    P-1 에서 USER_TY_CD 가 NULL 인 13,699명이 나왔고, 그중 13,656명이
--    학적상태 '0004'(수료)다. 이들은 '1101' 은 물론 '1101,1201' 로 고쳐도
--    **어떤 필터에도 걸리지 않는다.** 학번 체계로 학부/대학원을 가른다.
--    ※ 2026-08-25: FETCH FIRST 는 Oracle 12c 이상 문법이라 에러가 났다.
--      이 DB는 그보다 낮다 → ROWNUM 으로 감싼다.
SELECT * FROM (
  SELECT HOFC_STA_CD            AS 학적상태,
         LENGTH(INTG_UID)       AS 학번자릿수,
         SUBSTR(INTG_UID, 1, 4) AS 입학연도추정,
         COUNT(*)               AS 인원
  FROM V_USR_INF
  WHERE USER_TY_CD IS NULL
  GROUP BY HOFC_STA_CD, LENGTH(INTG_UID), SUBSTR(INTG_UID, 1, 4)
  ORDER BY COUNT(*) DESC
)
WHERE ROWNUM <= 30;


-- ══════════════════════════════════════════════════════════════════════════
--  6부. 주민등록번호 후속 — P-10 에서 793건 실보유 확인됨 (2026-08-25)
--       JOB_RES 232 / SS_JOB_RES 278 / SS_JOB_RES_HISTORY 283
--       세 테이블 모두 전체행수 = 값있는행수 (100% 채워져 있다)
-- ══════════════════════════════════════════════════════════════════════════

-- ── P-13. 암호화 여부 1차 판별 — 값 길이 분포만 본다 ──────────────────────
--    값 자체는 조회하지 않는다. 길이 분포만으로 1차 판별이 된다.
--      13  → 평문(하이픈 없음) 또는 뒷자리 마스킹
--      14  → 평문(하이픈 포함)
--      20+ → 암호화(Base64 등) 가능성
--    ※ 13/14 는 마스킹과 평문을 구별하지 못한다. 최종 확인은 값을 볼 권한이
--      있는 전산원이 직접 해야 한다. 우리는 여기까지만 본다.
SELECT 'JOB_RES' AS 테이블, LENGTH(JUMIN) AS 값길이, COUNT(*) AS 건수
FROM JOB_RES WHERE JUMIN IS NOT NULL GROUP BY LENGTH(JUMIN)
UNION ALL
SELECT 'SS_JOB_RES', LENGTH(JUMIN), COUNT(*)
FROM SS_JOB_RES WHERE JUMIN IS NOT NULL GROUP BY LENGTH(JUMIN)
UNION ALL
SELECT 'SS_JOB_RES_HISTORY', LENGTH(JUMIN), COUNT(*)
FROM SS_JOB_RES_HISTORY WHERE JUMIN IS NOT NULL GROUP BY LENGTH(JUMIN)
ORDER BY 1, 2;


-- ══════════════════════════════════════════════════════════════════════════
--  7부. 학부생 정밀 집계 (2026-08-25)
--
--   ★ 주의 — "학부생 수"는 세 가지가 다르다. 목적을 먼저 정하고 고른다.
--     ① 재학 학부생만            → U-5 (가장 좁음)
--     ② 학부 신분 전체(재학+졸업) → U-1  ← 개인정보 보유 기준은 이것
--     ③ ② + 미분류 중 학부       → U-3 로 가른 뒤 합산
--
--   P-1/P-2 실측으로 이미 확정된 값:
--     1101 재학생-학부  9,697 (재학 7,306 + 휴학 2,391)
--     1102 졸업생-학부 60,531 (졸업 59,547 + 제적 821 + 수료 163)
--     ─────────────────────────────────────────────
--     학부 신분 소계   70,228
--   남은 변수는 USER_TY_CD 가 NULL 인 13,699명뿐이다.
-- ══════════════════════════════════════════════════════════════════════════

-- ── U-1. 학부생 합계 — 신분코드 기준 ★ 제출용 ─────────────────────────────
SELECT CASE WHEN GROUPING(USER_TY_CD) = 1 THEN '★ 학부 신분 합계'
            WHEN USER_TY_CD = '1101'     THEN '1101 재학생-학부'
            WHEN USER_TY_CD = '1102'     THEN '1102 졸업생-학부'
       END                       AS 구분,
       COUNT(*)                  AS 행수,
       COUNT(DISTINCT INTG_UID)  AS 고유학번수
FROM V_USR_INF
WHERE USER_TY_CD IN ('1101', '1102')
GROUP BY ROLLUP (USER_TY_CD)
ORDER BY GROUPING(USER_TY_CD), USER_TY_CD;


-- ── U-2. 학적상태까지 세분 — 어디까지 포함할지 정할 때 ────────────────────
SELECT USER_TY_CD AS 신분코드,
       HOFC_STA_CD AS 학적코드,
       CASE HOFC_STA_CD WHEN '0001' THEN '재학' WHEN '0002' THEN '휴학'
                        WHEN '0003' THEN '제적' WHEN '0004' THEN '수료'
                        WHEN '0005' THEN '졸업' ELSE '기타' END AS 학적,
       COUNT(*) AS 인원
FROM V_USR_INF
WHERE USER_TY_CD IN ('1101', '1102')
GROUP BY USER_TY_CD, HOFC_STA_CD
ORDER BY USER_TY_CD, COUNT(*) DESC;


-- ── U-3a. ★ 학번 지문 만들기 — 신분코드별 학번 자릿수 분포 ────────────────
--    먼저 "학부 학번은 몇 자리, 대학원 학번은 몇 자리"인지 확정한다.
--    이 지문이 있어야 U-3b 에서 미분류 13,699명을 가를 수 있다.
SELECT NVL(USER_TY_CD, '(NULL)') AS 신분코드,
       LENGTH(INTG_UID)          AS 학번자릿수,
       COUNT(*)                  AS 인원
FROM V_USR_INF
GROUP BY USER_TY_CD, LENGTH(INTG_UID)
ORDER BY 1, 2;


-- ── U-3b. ★★ 미분류 13,699명은 학부인가 대학원인가 ────────────────────────
--    U-3a 에서 얻은 자릿수 지문으로 판정한다.
--    (학번 앞 4자리 = 입학연도. 개인 식별값이 아니라 집계 축이다)
SELECT * FROM (
  SELECT HOFC_STA_CD            AS 학적코드,
         LENGTH(INTG_UID)       AS 학번자릿수,
         SUBSTR(INTG_UID, 1, 4) AS 입학연도추정,
         COUNT(*)               AS 인원
  FROM V_USR_INF
  WHERE USER_TY_CD IS NULL
  GROUP BY HOFC_STA_CD, LENGTH(INTG_UID), SUBSTR(INTG_UID, 1, 4)
  ORDER BY COUNT(*) DESC
)
WHERE ROWNUM <= 40;


-- ══════════════════════════════════════════════════════════════════════════
--  U-3 결과 (2026-08-25) — 자릿수로는 판정 불가로 확인됨
--    1101·1102·1201·1202 가 전부 8자리다 (1102 에만 구학번 7자리 864명).
--    교직원만 5자리 사번으로 갈린다 → 미분류 13,699명은 "전부 학생" 확정.
--    학부/대학원 구분은 아래 UNIV_CODE 조인으로 확정한다.
-- ══════════════════════════════════════════════════════════════════════════

-- ── U-6a. 조인 키 검증 — DEPT_CD 가 유일한가 ★ 먼저 확인 ──────────────────
--    CLAUDE.md 규칙 7: 학과는 (단대코드, 학과코드) 쌍으로 식별한다.
--    DEPT_CD 단독 조인이 안전한지 중복부터 확인한다. 0행이어야 안전.
SELECT DEPT_CD, COUNT(*) AS 중복수
FROM V_DEP_INF_ALL
GROUP BY DEPT_CD
HAVING COUNT(*) > 1;


-- ── U-6b. ★★ 미분류 13,699명 — 학부인가 대학원인가 (확정) ─────────────────
--    UNIV_CODE: '00' 학부 / '01' 석사 / '02' 박사 / '03'~'12' 전문대학원
SELECT NVL(d.UNIV_CODE, '(학과 매칭 실패)') AS 과정코드,
       CASE d.UNIV_CODE
            WHEN '00' THEN '학부'
            WHEN '01' THEN '대학원-석사'
            WHEN '02' THEN '대학원-박사'
            WHEN NULL THEN NULL
            ELSE '전문대학원 등' END           AS 과정,
       COUNT(*)                               AS 인원
FROM V_USR_INF u
LEFT JOIN V_DEP_INF_ALL d ON d.DEPT_CD = u.HAKBU_CD
WHERE u.USER_TY_CD IS NULL
GROUP BY d.UNIV_CODE
ORDER BY COUNT(*) DESC;


-- ── U-7. ★ 전 인원을 신분코드 × 과정으로 교차 — 최종 검증표 ───────────────
--    이 한 장이면 "학부 몇 명 / 대학원 몇 명"이 전부 확정된다.
--    신분코드가 붙은 사람도 과정과 실제로 맞는지 여기서 검증된다
--    (예: 1101 인데 UNIV_CODE 가 01 이면 데이터 불일치).
SELECT NVL(u.USER_TY_CD, '(미분류)')          AS 신분코드,
       NVL(d.UNIV_CODE, '(매칭실패)')          AS 과정코드,
       CASE d.UNIV_CODE
            WHEN '00' THEN '학부'
            WHEN '01' THEN '대학원-석사'
            WHEN '02' THEN '대학원-박사'
            ELSE '기타/전문대학원' END          AS 과정,
       COUNT(*)                               AS 인원
FROM V_USR_INF u
LEFT JOIN V_DEP_INF_ALL d ON d.DEPT_CD = u.HAKBU_CD
GROUP BY u.USER_TY_CD, d.UNIV_CODE
ORDER BY 1, 4 DESC;


-- ── U-8. 위 교차의 요약 — 제출용 2줄 ──────────────────────────────────────
SELECT CASE WHEN d.UNIV_CODE = '00' THEN '학부'
            WHEN d.UNIV_CODE IS NULL THEN '(학과 매칭 실패)'
            ELSE '대학원(석사·박사·전문)' END   AS 구분,
       COUNT(*)                               AS 인원
FROM V_USR_INF u
LEFT JOIN V_DEP_INF_ALL d ON d.DEPT_CD = u.HAKBU_CD
WHERE u.USER_TY_CD IN ('1101','1102','1201','1202') OR u.USER_TY_CD IS NULL
GROUP BY CASE WHEN d.UNIV_CODE = '00' THEN '학부'
              WHEN d.UNIV_CODE IS NULL THEN '(학과 매칭 실패)'
              ELSE '대학원(석사·박사·전문)' END
ORDER BY COUNT(*) DESC;


-- ── U-4. 한 사람이 학번을 2개 갖고 있나 (학부 졸업 → 대학원 진학) ──────────
--    이게 있으면 "행 수"와 "사람 수"가 다르다. 배치가 쓰는 중복 매핑
--    테이블에 몇 건이 잡혀 있는지 먼저 본다.
SELECT COUNT(*) AS 중복매핑건수 FROM V_USR_INF_DUP_INF;

--    컬럼 구조 확인 (어떤 키로 묶는지 보고 중복 제거 방법을 정한다)
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = 'V_USR_INF_DUP_INF'
ORDER BY COLUMN_ID;


-- ── U-5. 가장 좁은 정의 — 현재 재학 중인 학부생만 ─────────────────────────
SELECT COUNT(*) AS 재학학부생 FROM V_USR_INF
WHERE USER_TY_CD = '1101' AND HOFC_STA_CD = '0001';


-- ── P-14. 아직 쓰이는 기능인가 — 등록·수정 시점 분포 ──────────────────────
--    최근 데이터가 없으면 "폐기된 기능에 개인정보만 남은" 경우다.
--    파기 대상인지 판단하는 근거가 된다.
SELECT 'JOB_RES' AS 테이블,
       TO_CHAR(MIN(REGDATE), 'YYYY-MM-DD') AS 최초등록,
       TO_CHAR(MAX(REGDATE), 'YYYY-MM-DD') AS 최종등록,
       TO_CHAR(MAX(UPDDATE), 'YYYY-MM-DD') AS 최종수정
FROM JOB_RES
UNION ALL
SELECT 'SS_JOB_RES',
       TO_CHAR(MIN(REGDATE), 'YYYY-MM-DD'), TO_CHAR(MAX(REGDATE), 'YYYY-MM-DD'),
       TO_CHAR(MAX(UPDDATE), 'YYYY-MM-DD')
FROM SS_JOB_RES
UNION ALL
SELECT 'SS_JOB_RES_HISTORY',
       TO_CHAR(MIN(REGDATE), 'YYYY-MM-DD'), TO_CHAR(MAX(REGDATE), 'YYYY-MM-DD'),
       TO_CHAR(MAX(UPDDATE), 'YYYY-MM-DD')
FROM SS_JOB_RES_HISTORY;
