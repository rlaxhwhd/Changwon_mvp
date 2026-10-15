-- 2026-10-15 사용자 확정 메뉴 정리. 메뉴 코드(인덱스)·권한(menu_auth)은 그대로 두고 표시만 바꾼다.
SET LOCAL lock_timeout='3s';

-- 로드맵 진행 현황을 「내 성장」에서 「진로취업 로드맵」 하위로 옮긴다.
-- 삭제된 AI 직무 로드맵 자리(stu-roadmap.1)를 재사용한다 — 학생 메뉴 코드는 navConfig 배열 인덱스와 짝이다.
UPDATE dc.menu SET label='로드맵 진행 현황', route='/roadmap/status', version=version+1
 WHERE menu_code='stu-roadmap.1';
UPDATE dc.menu SET route='/roadmap/status', version=version+1 WHERE menu_code='stu-roadmap';
UPDATE dc.menu SET is_active=false, version=version+1 WHERE menu_code='stu-growth.1';

-- 교직원 상단 메뉴에서 「심리검사 결과」를 뺀다. 화면(/counsel/psych-tests)과 API 권한은 그대로다.
UPDATE dc.menu SET is_active=false, version=version+1 WHERE menu_code='counsel.4';

-- 시스템관리자 미션 관리 → 일일퀘스트관리
UPDATE dc.menu SET label='일일퀘스트관리', version=version+1 WHERE menu_code='adm-quests.0';
