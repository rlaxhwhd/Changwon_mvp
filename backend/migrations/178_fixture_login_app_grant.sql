-- 0021 후속: 학생 로그인(app/student_login.py login)은 dc_app 으로 로컬 로그인 번호를 학사 uid 로 먼저 푼다.
-- 176 이 dc.fixture_student_login_source 뷰(dc_app SELECT 보유)를 없애고 표를 직접 읽게 했으나 권한을 주지 않았다 —
-- 2026-11-25 로컬 Docker 에서 모든 학생 로그인이 500(InsufficientPrivilege: fixture_student_login). 테스트는 소유자 계정이라 못 잡았다.
-- 읽기만 허용, 쓰기 권한 없음. 표는 번호→uid 두 열뿐이라 표 단위 SELECT 와 노출 범위가 같다 —
-- 열 단위 GRANT 는 저장소 관례가 아니고 relacl 에 안 보여 release_parity·audit_schema 가 못 잡는다(Astra 178 리뷰). Forward-only.
-- 롤백: REVOKE SELECT ON dc.fixture_student_login FROM dc_app; (단 그러면 로그인이 다시 500)
SET LOCAL lock_timeout = '5s';
GRANT SELECT ON dc.fixture_student_login TO dc_app;
