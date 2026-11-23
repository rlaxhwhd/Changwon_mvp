-- 2026-11-23 사용자 지시: 「통계 현황」 아래 세 번째 메뉴 「KPI통계」(/stats/kpi) — 7단계 참여 퍼널과 지표별 목표 대비 실적.
-- 메뉴 코드는 navConfig 배열 인덱스와 짝이다(089): stats.0 개인통계, stats.1 전체통계, stats.2 KPI통계.
-- 부모(stats)를 볼 수 있는 역할이 새 메뉴도 본다. 172 와 같은 이유로 해당 역할의 집계 version 을 올려
-- 이 변경 전에 열어 둔 메뉴관리 화면의 전체 치환이 새 grant 를 지우지 못하게 한다(409).
-- 되돌리기: 새 마이그레이션에서 stats.2 를 is_active=false 로. version 은 되돌리지 않는다.
SET LOCAL lock_timeout='3s';

INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('stats.2','stats','admin','KPI통계','/stats/kpi',2)
ON CONFLICT DO NOTHING;

INSERT INTO dc.menu_auth(menu_code,role_code)
SELECT 'stats.2', a.role_code FROM dc.menu_auth a WHERE a.menu_code='stats'
ON CONFLICT DO NOTHING;

SELECT r.role_code FROM dc.auth_role r
 WHERE EXISTS (SELECT 1 FROM dc.menu_auth a WHERE a.role_code=r.role_code AND a.menu_code='stats')
 ORDER BY r.role_code FOR UPDATE OF r;

UPDATE dc.auth_role r SET version=version+1
 WHERE EXISTS (SELECT 1 FROM dc.menu_auth a WHERE a.role_code=r.role_code AND a.menu_code='stats');
