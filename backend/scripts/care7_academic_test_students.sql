-- 퇴역(2026-11-25, handoff 0021). 이 스크립트는 옛 학사 미러 academic.v_usr_inf 에 쓰던 로컬 테스트 데이터였다.
-- 0021 이후 앱은 전산원 사본(academic.dc_v_usr_inf)과 로컬 인원(academic.local_usr_inf)만 읽으므로,
-- 옛 미러에 쓰면 오류 없이 아무 효과도 없다. 대체: backend/scripts/seed_local_academic_test_students.sql
-- (가짜 테스트 학생 7명, 로컬 전용) — 실제 학번(20240001 등)은 전산원 동기화로 들어온다.
\echo 'RETIRED (0021): use backend/scripts/seed_local_academic_test_students.sql'
\set ON_ERROR_STOP on
DO $$ BEGIN RAISE EXCEPTION 'retired script (0021)'; END $$;
\quit
