-- 메뉴관리 역할별 노출 설정(0006). 역할이 어느 포털에 로그인하는지와, 역할별 menu_auth 집합의
-- 낙관적 잠금 버전을 auth_role 에 둔다. menu_auth 자체는 (menu_code,role_code) 행 집합이라 버전을 둘 곳이 없다.
-- 컬럼 추가는 NULL 허용 또는 DEFAULT 로만 한다(재작성 없음). 데이터 채움은 089.
ALTER TABLE dc.auth_role
 ADD COLUMN portal text CHECK(portal IN ('admin','student')),
 ADD COLUMN version integer NOT NULL DEFAULT 1;
-- 역할별 집합 치환 API 가 쓴다. 이력은 admin_event(entity='menu_auth') 에 남는다.
GRANT INSERT,DELETE ON dc.menu_auth TO dc_app;
GRANT UPDATE ON dc.auth_role TO dc_app;
