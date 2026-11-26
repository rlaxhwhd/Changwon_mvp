-- 0021 후속: dc.refresh_department_from_academic() 의 is_active 를 NULL-안전하게 고친다.
-- 원본 DC_V_DEPT_INF.USE_FLAG 는 NULL 을 허용한다(ALL_TAB_COLUMNS NULLABLE=Y). 176 은 is_active 에 `use_flag='1'` 을
-- 그대로 넣어 NULL 이 NOT NULL 열에 들어가려 했다 — 2026-11-25 첫 실적재의 공개 트랜잭션이 이 오류로 전체 롤백됐다(공개 전 상태 유지).
-- 규칙은 176 설계 그대로: USE_FLAG='1' 이면 활성, 그 밖(NULL 포함)은 비활성. 함수 시그니처·권한·보안 속성은 같다.
-- Forward-only. 롤백: 176 의 함수 본문으로 다시 CREATE OR REPLACE(단 NULL USE_FLAG 원본에서는 동기화가 실패한다).
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION dc.refresh_department_from_academic() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE
  moved integer := 0;
  upserted integer := 0;
  deactivated integer := 0;
  aligned integer := 0;
  college_unlinked integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM academic.dc_v_dept_inf) THEN
    RAISE EXCEPTION 'academic.dc_v_dept_inf is empty; refusing to refresh dc.department';
  END IF;

  -- (1) 학과 단대 이동(같은 DEPT_CODE, COL_CODE 변경): 한 문장 안에서 로그 → FK 없는 참조 → dc.department 키 제자리 UPDATE.
  --     dc.student·dc.org_assignment 는 FK ON UPDATE CASCADE 로 따라온다(로그는 여기서 함께 남긴다).
  WITH mv AS (
    SELECT d.college_code AS old_college, d.dept_code, s.col_code::text AS new_college
    FROM dc.department d JOIN academic.dc_v_dept_inf s ON s.dept_code::text = d.dept_code
    WHERE s.col_code::text <> d.college_code
  ), logged AS (
    INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
    SELECT t.table_name, t.row_key, mv.old_college, mv.dept_code, mv.new_college, mv.dept_code, 'college_move'
    FROM (
      SELECT 'department'::text AS table_name, d.college_code || ':' || d.dept_code AS row_key, d.college_code, d.dept_code
      FROM dc.department d
      UNION ALL SELECT 'student', x.intg_uid, x.college_code, x.dept_code FROM dc.student x
      UNION ALL SELECT 'org_assignment', x.id::text, x.college_code, x.dept_code FROM dc.org_assignment x
      UNION ALL SELECT 'department_staff_assignment', x.id::text, x.college_code, x.dept_code FROM dc.department_staff_assignment x
      UNION ALL SELECT 'student_login_override', x.intg_uid, x.college_code, x.dept_code FROM dc.student_login_override x
    ) t JOIN mv ON mv.dept_code = t.dept_code AND mv.old_college = t.college_code
    RETURNING 1
  ), staff AS (
    UPDATE dc.department_staff_assignment a SET college_code = mv.new_college
    FROM mv WHERE a.dept_code = mv.dept_code AND a.college_code = mv.old_college
    RETURNING 1
  ), override AS (
    UPDATE dc.student_login_override o SET college_code = mv.new_college
    FROM mv WHERE o.dept_code = mv.dept_code AND o.college_code = mv.old_college
    RETURNING 1
  ), dept AS (
    UPDATE dc.department d SET college_code = mv.new_college
    FROM mv WHERE d.dept_code = mv.dept_code AND d.college_code = mv.old_college
    RETURNING 1
  )
  -- 데이터 변경 CTE 는 참조 여부와 무관하게 정확히 한 번 실행된다.
  SELECT count(*) INTO moved FROM dept;

  -- (2) 학사 학과 upsert. 이동을 먼저 처리했으므로 dept_code 유일 인덱스에 걸리지 않는다.
  INSERT INTO dc.department AS d (college_code, dept_code, college_name, dept_name, course, univ_code, is_active, source)
  SELECT s.col_code::text, s.dept_code::text,
         COALESCE((SELECT c.col_name::text FROM academic.dc_v_col_inf c WHERE c.col_code = s.col_code
                   ORDER BY c.use_flag DESC NULLS LAST LIMIT 1), s.col_code::text),
         s.dept_name::text,
         COALESCE((SELECT k.code_nm::text FROM academic.dc_v_code_inf k
                   WHERE k.code_grp = 'UNIV_CD' AND k.code = s.univ_code
                   ORDER BY k.use_yn DESC NULLS LAST LIMIT 1), s.univ_code::text, '미상'),
         s.univ_code::text, COALESCE(s.use_flag = '1', false), 'academic'
  FROM academic.dc_v_dept_inf s
  ON CONFLICT (college_code, dept_code) DO UPDATE
    SET college_name = EXCLUDED.college_name, dept_name = EXCLUDED.dept_name, course = EXCLUDED.course,
        univ_code = EXCLUDED.univ_code, is_active = EXCLUDED.is_active, source = EXCLUDED.source
    WHERE (d.college_name, d.dept_name, d.course, d.univ_code, d.is_active, d.source)
          IS DISTINCT FROM (EXCLUDED.college_name, EXCLUDED.dept_name, EXCLUDED.course, EXCLUDED.univ_code,
                            EXCLUDED.is_active, EXCLUDED.source);
  GET DIAGNOSTICS upserted = ROW_COUNT;
  SELECT count(*) INTO college_unlinked FROM academic.dc_v_dept_inf s
  WHERE NOT EXISTS (SELECT 1 FROM academic.dc_v_col_inf c WHERE c.col_code = s.col_code);

  -- (3) 원본에서 사라진 행은 삭제하지 않고 비활성.
  UPDATE dc.department d SET is_active = false
  WHERE d.is_active AND NOT EXISTS (SELECT 1 FROM academic.dc_v_dept_inf s
                                    WHERE s.dept_code::text = d.dept_code AND s.col_code::text = d.college_code);
  GET DIAGNOSTICS deactivated = ROW_COUNT;

  -- (4) dc.student 조직 정합. 학사가 정본(CLAUDE.md 규칙 1) — 전과 학생은 새 학과 스코프로 옮긴다.
  --     학과명 라벨도 함께 맞춘다(첫 로그인 때 '소속 미등록'으로 굳은 학생).
  WITH target AS (
    SELECT x.intg_uid, x.college_code AS old_college, x.dept_code AS old_dept,
           l.college_code, l.dept_code, NULLIF(l.dept_name, '') AS dept_name
    FROM dc.student x
    JOIN dc.student_login_source l ON l.intg_uid = x.intg_uid
    JOIN dc.department d ON d.college_code = l.college_code AND d.dept_code = l.dept_code
    WHERE (x.college_code, x.dept_code) IS DISTINCT FROM (l.college_code, l.dept_code)
  ), changed AS (
    UPDATE dc.student x SET college_code = t.college_code, dept_code = t.dept_code,
           major_label = COALESCE(t.dept_name, x.major_label)
    FROM target t WHERE t.intg_uid = x.intg_uid
    RETURNING t.intg_uid, t.old_college, t.old_dept, t.college_code, t.dept_code)
  INSERT INTO dc.org_code_remap (table_name, row_key, old_college, old_dept, new_college, new_dept, reason)
  SELECT 'student', intg_uid, old_college, old_dept, college_code, dept_code, 'academic_alignment' FROM changed;
  GET DIAGNOSTICS aligned = ROW_COUNT;

  RETURN jsonb_build_object('moved', moved, 'upserted', upserted, 'deactivated', deactivated,
                            'studentsAligned', aligned, 'collegeUnlinked', college_unlinked,
                            'departments', (SELECT count(*) FROM dc.department),
                            'activeDepartments', (SELECT count(*) FROM dc.department WHERE is_active));
END
$fn$;
-- CREATE OR REPLACE 는 기존 권한을 유지하지만, 176 과 같은 상태를 명시한다(함수 기본 EXECUTE 는 PUBLIC).
REVOKE EXECUTE ON FUNCTION dc.refresh_department_from_academic() FROM PUBLIC;
