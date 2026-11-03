-- 비교과 신청서 「이 프로그램을 어떻게 알게 되었습니까?」를 자유 입력에서 선택형으로 바꾼다 (2026-11-03 사용자 지시).
-- 현행 EP_PRM_APP.ROUTE_CD(지원경로 코드)를 잇는다. 고른 항목의 라벨은 기존 apply_path 에도 남겨
-- 코드가 나중에 비활성·개명돼도 신청 시점의 답이 읽힌다.
-- Rollback: ALTER TABLE dc.program_apply DROP COLUMN apply_route_code;
--           DELETE FROM dc.code_item WHERE group_code='PROGRAM_APPLY_ROUTE'; DELETE FROM dc.code_group WHERE group_code='PROGRAM_APPLY_ROUTE';

INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,legacy_group,sort_order)
 VALUES('PROGRAM_APPLY_ROUTE','비교과 지원경로','OPERATIONAL',false,'EP_PRM_APP.ROUTE_CD',100);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('PROGRAM_APPLY_ROUTE','DREAMCATCH','드림캐치(Dream Catch) 접속',0),
 ('PROGRAM_APPLY_ROUTE','WAGLE_NOTICE','와글 내 모집안내 등',1),
 ('PROGRAM_APPLY_ROUTE','CHANGDAEHAN','창대한프로젝트 단체 알림',2),
 ('PROGRAM_APPLY_ROUTE','PEER','동료(친구,선배 등) 추천',3),
 ('PROGRAM_APPLY_ROUTE','OFFLINE_PROMO','대면 홍보(거리홍보, OT 등 행사 시)',4),
 ('PROGRAM_APPLY_ROUTE','SNS','SNS(인스타그램, 페이스북 등)',5),
 ('PROGRAM_APPLY_ROUTE','WAGLE_MESSAGE','와글 쪽지 알림',6),
 ('PROGRAM_APPLY_ROUTE','DEPT_CHAT','단과대or학과 단체채팅방',7),
 ('PROGRAM_APPLY_ROUTE','CAREER_COURSE','진로,취업 교과목(미래설계법,취업과진로,취업핵심역량개발)',8),
 ('PROGRAM_APPLY_ROUTE','FACULTY','학과(교수, 조교 등) 추천',9),
 ('PROGRAM_APPLY_ROUTE','BANNER','현수막',10),
 ('PROGRAM_APPLY_ROUTE','ETC','기타',11);

ALTER TABLE dc.program_apply ADD COLUMN apply_route_code text;
