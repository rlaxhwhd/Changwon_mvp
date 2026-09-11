-- 학생 명단 조회 (DBeaver 용)
--
-- 접속: 127.0.0.1 : 15432 / DB dreamcatch / 스키마 dc / 사용자 dc_app
-- 암호는 deploy/secrets/api_db_password_local 파일에 있다. DBeaver 저장까지만 하고
-- 다른 곳에 복사하지 않는다.
--
-- dc.student_list 는 이미 만들어져 있는 뷰다. 사람·학생·유형·집계를 합쳐 두었으니
-- 명단을 볼 때 dc.student 를 직접 조인하지 않는다.


-- ① 기본 명단 (120명)
SELECT s.student_no  AS 학번,
       s.name        AS 이름,
       s.major_label AS 학과,
       s.grade       AS 학년,
       s.status      AS 학적,
       s.type_label  AS 유형,
       s.gpa         AS 학점,
       s.progress    AS 이행률,
       s.program_count AS 비교과,
       s.counsel_count AS 상담,
       s.has_roadmap AS 로드맵,
       s.star        AS STAR
  FROM dc.student_list s
 ORDER BY s.student_no;


-- ② 로드맵 상태·벌점까지 (상담사가 실제로 보는 화면에 가깝다)
--    로드맵상태 = DRAFT(초안) / REVIEW(검토중) / CONFIRMED(확정)
SELECT s.student_no  AS 학번,
       s.name        AS 이름,
       s.major_label AS 학과,
       s.grade       AS 학년,
       s.status      AS 학적,
       s.type_label  AS 유형,
       r.status_code AS 로드맵상태,
       s.progress    AS 이행률,
       s.program_count AS 비교과,
       s.counsel_count AS 상담,
       COALESCE(p.total, 0) AS 벌점
  FROM dc.student_list s
  LEFT JOIN dc.roadmap       r ON r.student_uid = s.intg_uid
  LEFT JOIN dc.penalty_total p ON p.student_uid = s.intg_uid
 ORDER BY s.student_no;


-- ③ 조건 검색 예시 — 재학생 중 벌점이 있는 학생
--    ⚠ 학적 문자열을 코드처럼 쓰지 않는다. 신분 판정이 필요하면 뷰가 준 status 를 쓰고,
--      학사 신분코드는 집합 상수로 다룬다(CLAUDE.md 8조).
SELECT s.student_no AS 학번, s.name AS 이름, s.major_label AS 학과,
       p.total AS 벌점, p.entry_count AS 부여건수, p.last_at AS 최근일시
  FROM dc.student_list s
  JOIN dc.penalty_total p ON p.student_uid = s.intg_uid
 WHERE s.status = '재학' AND p.total > 0
 ORDER BY p.total DESC, s.student_no;


-- ④ 학과 트리로 묶어 보기
--    ⚠ 학과명으로 조인하지 않는다 — 동명 학과가 과정별로 존재한다.
--      (단대코드, 학과코드) 쌍으로만 잇는다(CLAUDE.md 7조).
--      시드 학생 대부분은 조직 코드가 비어 있어 대학이 NULL 로 나온다. 정상이다.
SELECT COALESCE(d.college_name, '(조직코드 없음)') AS 대학,
       COALESCE(d.dept_name, st.major_label)      AS 학과,
       count(*)                                    AS 인원
  FROM dc.student st
  LEFT JOIN dc.department d
         ON d.college_code = st.college_code
        AND d.dept_code    = st.dept_code
 GROUP BY 1, 2
 ORDER BY 인원 DESC, 학과;


-- ⑤ 한 학생 파고들기 (학번만 바꿔 쓴다)
SELECT jsonb_pretty(detail) FROM dc.student WHERE student_no = '20211304';
