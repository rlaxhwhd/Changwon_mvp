-- 2026-10-19 사용자 요청: 상담 관리 하위에 「상담 진행」 대장(/counsel/sessions)을 추가한다.
-- navConfig 상담 관리 배열의 다음 자리(counsel.9)를 쓴다 — 기존 counsel.0~8 코드·권한은 그대로 둔다.
-- 순서는 신청 접수함(0) 바로 다음(1)에 둔다 — 같은 1인 counsel.1(일정·예약)은 096 이후 비활성이다.
-- 되돌리기: 새 마이그레이션에서 counsel.9 를 is_active=false 로.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('counsel.9','counsel','admin','상담 진행','/counsel/sessions',1);
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('counsel.9','career'),('counsel.9','psych');
