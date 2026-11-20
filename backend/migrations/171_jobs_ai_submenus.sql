-- 기업정보 플랫폼 > AI 자소서/면접 하위 메뉴를 화면 전체로 넓힌다(2026-11-20 사용자 지시).
-- 학생 메뉴 코드는 navConfig 배열 인덱스와 짝이다(089) — 기존 .3.0(자소서 생성)·.3.1(컨설팅) 코드는 그대로 두고
-- 새 화면은 .3.2~.3.4 로 덧붙인 뒤, 보이는 순서는 sort_order 로 맞춘다.
--   0 AI 자소서(/jobs/home/cover) · 1 AI 자소서 생성 · 2 AI 컨설팅 · 3 AI 인터뷰 · 4 AI 인터뷰 결과
SET LOCAL lock_timeout='3s';

INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES
 ('stu-jobs.3.2','stu-jobs.3','student','AI 자소서','/jobs/home/cover',0),
 ('stu-jobs.3.3','stu-jobs.3','student','AI 인터뷰','/jobs/home/interview',3),
 ('stu-jobs.3.4','stu-jobs.3','student','AI 인터뷰 결과','/jobs/home/interview/results',4)
ON CONFLICT DO NOTHING;

-- 부모(stu-jobs.3)를 볼 수 있는 역할이 새 하위 메뉴도 본다.
INSERT INTO dc.menu_auth(menu_code,role_code)
SELECT c.code, a.role_code
  FROM dc.menu_auth a CROSS JOIN (VALUES ('stu-jobs.3.2'),('stu-jobs.3.3'),('stu-jobs.3.4')) AS c(code)
 WHERE a.menu_code='stu-jobs.3'
ON CONFLICT DO NOTHING;

UPDATE dc.menu SET sort_order=1, version=version+1 WHERE menu_code='stu-jobs.3.0' AND sort_order<>1;
UPDATE dc.menu SET sort_order=2, version=version+1 WHERE menu_code='stu-jobs.3.1' AND sort_order<>2;
