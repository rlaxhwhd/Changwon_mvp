-- 데이터만. 되돌릴 때는 새 마이그레이션으로 DELETE 한다.
-- 1) 역할 포털. 기업회원·외부회원은 포털이 아직 없어 portal NULL — 메뉴관리 화면이 그 사실을 표시한다.
UPDATE dc.auth_role SET portal='admin' WHERE role_code IN ('AUTH0006','career','psych','professor','assistant');
INSERT INTO dc.auth_role(role_code,label,base_group,sort_order,portal,description) VALUES
 ('student','학생',true,5,'student','학생 포털(/v2). 신분(person.kind=STUDENT)으로 자동 부여'),
 ('company','기업회원',true,6,NULL,'기업회원 포털 미구축 — 메뉴 없음'),
 ('external','외부회원',true,7,NULL,'외부회원 포털 미구축 — 메뉴 없음');
UPDATE dc.auth_role SET sort_order=CASE role_code WHEN 'professor' THEN 1 WHEN 'assistant' THEN 2 WHEN 'career' THEN 3 WHEN 'psych' THEN 4 END
 WHERE role_code IN ('professor','assistant','career','psych');

-- 2) 학생 포털 메뉴 — src_v2/components/navConfig.ts NAV_SECTIONS 를 그대로 옮긴다.
--    menu_code = 'stu-' + 섹션 id (+ '.' + child 인덱스). 접두어는 admin 의 diagnosis·counsel·roadmap·jobs 와 PK 충돌을 피한다.
--    ★ child 순서 = navConfig 배열 인덱스다 — 순서를 바꾸면 라벨이 어긋난다.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('stu-lounge',NULL,'student','AI 커리어 라운지','/lounge',1),
 ('stu-lounge.0','stu-lounge','student','나의 진로 여정','/lounge#journey',0),
 ('stu-lounge.1','stu-lounge','student','목표 달성 계획','/lounge#goal',1),
 ('stu-lounge.2','stu-lounge','student','이번 주 할 일','/lounge#todo',2),
 ('stu-lounge.3','stu-lounge','student','성장 활동 기록','/lounge#recommend',3),
 ('stu-lounge.4','stu-lounge','student','5대 핵심역량','/lounge#competency',4),
 ('stu-lounge.5','stu-lounge','student','진단 결과','/lounge#diagnosis',5),
 ('stu-lounge.6','stu-lounge','student','상담 현황','/lounge#counseling-status',6),
 ('stu-diagnosis',NULL,'student','진단센터','/diagnosis/employment',2),
 ('stu-diagnosis.0','stu-diagnosis','student','진단검사 결과','/diagnosis/employment',0),
 ('stu-counsel',NULL,'student','상담센터','/counsel/career',3),
 ('stu-counsel.0','stu-counsel','student','진로취업상담','/counsel/career',0),
 ('stu-counsel.1','stu-counsel','student','심리상담','/counsel/psych',1),
 ('stu-counsel.2','stu-counsel','student','지도교수상담','/counsel/professor',2),
 ('stu-counsel.3','stu-counsel','student','상담 현황','/counsel/record',3),
 ('stu-roadmap',NULL,'student','진로취업 로드맵','/roadmap/skill-tree',4),
 ('stu-roadmap.0','stu-roadmap','student','AI 진로로드맵','/roadmap/ai',0),
 ('stu-roadmap.1','stu-roadmap','student','AI 직무 로드맵','/roadmap/skill-tree',1),
 ('stu-roadmap.2','stu-roadmap','student','로드맵 수정요청','/roadmap/request',2),
 ('stu-roadmap.3','stu-roadmap','student','최종 로드맵','/roadmap/final',3),
 ('stu-program-apply',NULL,'student','비교과 프로그램','/growth/program',5),
 ('stu-program-apply.0','stu-program-apply','student','비교과 프로그램','/growth/program',0),
 ('stu-growth',NULL,'student','내 성장','/growth',6),
 ('stu-growth.0','stu-growth','student','홈대시보드','/growth',0),
 ('stu-growth.1','stu-growth','student','로드맵 진행 현황','/growth/roadmap-status',1),
 ('stu-growth.2','stu-growth','student','퀘스트보드','/growth/quest',2),
 ('stu-growth.3','stu-growth','student','오늘의 성장퀘스트','/growth/mission',3),
 ('stu-growth.4','stu-growth','student','일일퀘스트 기록노트','/growth/mission-log',4),
 ('stu-growth.5','stu-growth','student','성장경험일지','/growth/journal',5),
 ('stu-jobs',NULL,'student','기업정보 플랫폼','/jobs',7),
 ('stu-jobs.0','stu-jobs','student','교내 채용공고','/jobs',0),
 ('stu-jobs.1','stu-jobs','student','외부 채용공고','/jobs/external',1),
 ('stu-jobs.2','stu-jobs','student','AI 맞춤채용','/jobs/joblist',2),
 ('stu-jobs.3','stu-jobs','student','AI 자소서/면접','/jobs/home',3),
 ('stu-jobs.3.0','stu-jobs.3','student','AI 자소서 생성','/jobs/home/resume',0),
 ('stu-jobs.3.1','stu-jobs.3','student','AI 컨설팅','/jobs/home/consulting',1),
 ('stu-jobs.4','stu-jobs','student','공지사항','/jobs/notices',4),
 ('stu-mypage',NULL,'student','마이페이지','/mypage/programs',8),
 ('stu-mypage.0','stu-mypage','student','포트폴리오','/mypage/portfolio',0),
 ('stu-mypage.1','stu-mypage','student','비교과프로그램 현황','/mypage/programs',1),
 ('stu-mypage.2','stu-mypage','student','추천채용 지원 내역','/mypage/applications',2),
 ('stu-mypage.3','stu-mypage','student','출석 기록','/mypage/attendance',3);
INSERT INTO dc.menu_auth(menu_code,role_code) SELECT menu_code,'student' FROM dc.menu WHERE portal='student';
