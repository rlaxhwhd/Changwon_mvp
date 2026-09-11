-- 심리상담사 메뉴를 업무 범위로 줄인다 — 심리상담은 CARE 7+ 경로와 별개라 진단 관리·집단상담을 보지 않는다.
-- 추가 심리상담신청 = 학생 신청 없이 상담사가 남기는 심리상담 기록(교수 발의 기록과 같은 방식).
DELETE FROM dc.menu_auth WHERE role_code='psych' AND menu_code IN ('diagnosis','diagnosis.0','counsel.3');
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('counsel.6','counsel','admin','추가 심리상담신청','/counsel/psych-records/new',6);
INSERT INTO dc.menu_auth VALUES('counsel.6','psych');
