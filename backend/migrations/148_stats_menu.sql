-- 2026-10-29 사용자 지시: 홈의 통계성 카드 4장(CARE 7+ 참여학생·상담기록, 미접촉자 현황, 유형 분포, 나의 성과 지표)을
-- 홈에서 빼고 「통계 현황」 메뉴 아래 「개인통계」로 옮긴다. 「전체통계」는 메뉴 자리만 만든다(화면은 준비 중).
-- 메뉴 코드는 navConfig 배열 인덱스와 짝이다 — stats.0 개인통계, stats.1 전체통계.
-- 순서는 채용공고(7) 다음, 설정(15) 앞.
-- 되돌리기: 새 마이그레이션에서 stats·stats.0·stats.1 을 is_active=false 로.
SET LOCAL lock_timeout='3s';

INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('stats',NULL,'admin','통계 현황','/stats/personal',8),
 ('stats.0','stats','admin','개인통계','/stats/personal',0),
 ('stats.1','stats','admin','전체통계','/stats/overall',1)
ON CONFLICT DO NOTHING;
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES
 ('stats','career'),('stats','psych'),
 ('stats.0','career'),('stats.0','psych'),
 ('stats.1','career'),('stats.1','psych')
ON CONFLICT DO NOTHING;
