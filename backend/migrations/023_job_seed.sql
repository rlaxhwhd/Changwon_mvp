-- 채용 파생 시드 — 022 가 만든 표에 개발 fixture 를 채운다.
--
-- ★ 이 파일은 원천이 있을 때만 행을 만든다. 신규 DB 에서는 마이그레이션이 시드보다
--   먼저 돌아 dc.seed_source 도 dc.student 도 비어 있으므로 0건이 되고, seed.py 가
--   시드 직후 같은 파일을 다시 실행해 채운다(021_ai_resume_review.sql 과 같은 방식).
--   그래서 모든 INSERT 가 존재 검사 + ON CONFLICT DO NOTHING 이다.
--
-- 수입 범위는 둘뿐이다.
--   ① 외부 수집 공고 6건(src_admin/data/jobs.seed.json) — ID·출처·마감일을 보존한다.
--      테스트 편의로 마감일을 늘리거나 출처를 manual 로 바꾸지 않는다.
--   ② 자기소개서 r1·r2 — 021 의 ai_run 이 이미 이 ID 를 가리키고 있고 그 행은
--      append-only 라 사후 재매핑이 불가능하다. 이것은 선택이 아니라 제약이다.
--      r3(카카오 인턴십 지원서)은 021 이 소유자를 배정하지 않았다 → 시드하지 않는다.
--
-- 브라우저 localStorage(dc_jobs·dc_job_applications·dc_job_wishlist·dc_user_resumes_v1)는
-- 일절 수입하지 않는다 — 찜과 사용자 자소서에는 학생 ID 자체가 없어 정당한 소유자가 없다.

-- ── ① 외부 공고 ─────────────────────────────────────────────────────────
-- 회사명 문자열만 있고 기업 실체가 없다 → company_id 는 NULL 이고 기업 사전에
-- 자동 등록하지 않는다(이름만 같은 두 회사를 병합하지 않는다).
WITH src AS (
  SELECT jsonb_array_elements(payload) AS j FROM dc.seed_source
   WHERE path='src_admin/data/jobs.seed.json'
), row AS (
  SELECT j->>'id' AS id, j->>'company' AS company, j->>'role' AS role,
         COALESCE(ARRAY(SELECT jsonb_array_elements_text(j->'tags')),'{}') AS tags,
         NULLIF(j->>'salary','') AS salary, NULLIF(j->>'location','') AS location,
         NULLIF(j->>'deadline','') AS deadline, j->>'jobType' AS job_type,
         NULLIF(j->>'applyUrl','') AS apply_url, j->>'recruitType' AS recruit_type,
         NULLIF(j->>'companyType','') AS company_type, NULLIF(j->>'email','') AS email,
         COALESCE((j->>'salaryNegotiable')::boolean,false) AS negotiable,
         COALESCE((j->>'urlTitleLink')::boolean,false) AS url_title_link,
         COALESCE((j->>'emailApply')::boolean,false) AS email_apply,
         NULLIF(j->>'content','') AS content, j->>'status' AS status, j->>'postedAt' AS posted_at
    FROM src
)
INSERT INTO dc.job_posting(id,company_name_snapshot,role,tags,salary_text,location_text,
 career_primary_code,company_type_code,source,source_system,source_key,recruit_type,stored_status,
 deadline_mode,deadline_date,deadline_raw,posted_at,salary_negotiable,url_title_link,email_apply,
 apply_url,email,content_html,content_format,record_origin)
SELECT r.id,r.company,r.role,r.tags,r.salary,r.location,
 (SELECT code FROM dc.code_item WHERE group_code='JOB_CAREER_TYPE' AND label=r.job_type),
 (SELECT code FROM dc.code_item WHERE group_code='JOB_COMPANY_TYPE' AND label=r.company_type),
 'external','jobs.seed.json',r.id,
 CASE r.recruit_type WHEN '추천채용' THEN 'RECOMMENDATION' ELSE 'GENERAL' END,
 CASE r.status WHEN '마감' THEN 'CLOSED' ELSE 'POSTED' END,
 CASE WHEN r.deadline IS NULL OR r.deadline IN ('상시','채용시') THEN 'ALWAYS' ELSE 'DATE' END,
 CASE WHEN r.deadline ~ '^\d{4}-\d{2}-\d{2}' THEN left(r.deadline,10)::date END,
 r.deadline,r.posted_at::timestamptz,r.negotiable,r.url_title_link,r.email_apply,
 r.apply_url,r.email,r.content,'HTML','LIVE'
  FROM row r
 -- 날짜를 읽지 못하는 원문은 검역한다(그대로 넣으면 마감 판정이 거짓이 된다).
 WHERE r.deadline IS NULL OR r.deadline IN ('상시','채용시') OR r.deadline ~ '^\d{4}-\d{2}-\d{2}'
 ON CONFLICT DO NOTHING;

-- 복수 선택 분류 — 라벨로 코드를 찾는다. 원문에 없는 라벨은 조용히 빠진다(FK 위반 대신).
WITH src AS (
  SELECT jsonb_array_elements(payload) AS j FROM dc.seed_source
   WHERE path='src_admin/data/jobs.seed.json'
), pair AS (
  SELECT j->>'id' AS posting_id, k.kind, k.group_code, jsonb_array_elements_text(j->k.field) AS label
    FROM src, (VALUES ('EMPLOYMENT','employmentTypes','JOB_EMPLOYMENT_TYPE'),
                      ('CATEGORY','jobCategories','JOB_CATEGORY'),
                      ('CAREER','careerTypes','JOB_CAREER_TYPE'),
                      ('GENDER','genders','JOB_GENDER'),
                      ('REGION','regions','JOB_REGION')) AS k(kind,field,group_code)
   WHERE jsonb_typeof(j->k.field)='array'
)
INSERT INTO dc.job_posting_option(posting_id,kind,code)
SELECT p.posting_id,p.kind,c.code FROM pair p
  JOIN dc.code_item c ON c.group_code=p.group_code AND c.label=p.label
 WHERE EXISTS(SELECT 1 FROM dc.job_posting j WHERE j.id=p.posting_id)
 ON CONFLICT DO NOTHING;

INSERT INTO dc.job_posting_event(posting_id,seq,action,after_value,reason)
SELECT j.id,1,'IMPORT',jsonb_build_object('source','jobs.seed.json','id',j.id),'개발 fixture 수집분'
  FROM dc.job_posting j WHERE j.source_system='jobs.seed.json'
   AND NOT EXISTS(SELECT 1 FROM dc.job_posting_event e WHERE e.posting_id=j.id AND e.seq=1);

-- ── ② 자기소개서 r1·r2 ──────────────────────────────────────────────────
-- 본문은 src_v2/pages/jobs/resumeMock.ts 의 값 그대로다. 소유자는 021 이 지정했다.
INSERT INTO dc.job_resume(id,student_uid,title,company_text,job_type_text,position_text,
 category_code,category_label_legacy,content,origin,created_at,updated_at)
SELECT v.id,v.student_uid,v.title,v.company,v.job_type,v.position,v.category_code,v.category_label,
 v.content,'LEGACY',v.created_at::timestamptz,v.created_at::timestamptz
  FROM (VALUES
    ('r1','20211304','삼성전자 SW직군 자기소개서','삼성전자','IT/SW','백엔드 개발','MOTIVE','지원동기',
     '저는 컴퓨터공학을 전공하며 소프트웨어 개발에 대한 열정을 키워왔습니다. 대학 시절 다양한 프로젝트 경험을 통해 문제 해결 능력과 팀워크를 체득했으며, 특히 웹 애플리케이션 개발 분야에서 깊은 역량을 쌓아왔습니다. 캠퍼스 커뮤니티 플랫폼 프로젝트에서 백엔드 개발을 담당하며 풀스택 개발 경험을 쌓았고, 교내 해커톤에서 최우수상을 수상했습니다.',
     '2026-03-21'),
    ('r2','20196208','네이버 신입 공채','네이버','IT/SW','프론트엔드 개발','STRENGTH','강점',
     '저는 컴퓨터공학을 전공하며 소프트웨어 개발에 대한 열정을 키워왔습니다. 대학 시절 다양한 프로젝트 경험을 통해 문제 해결 능력과 팀워크를 체득했으며, 특히 웹 애플리케이션 개발 분야에서 깊은 역량을 쌓아왔습니다. 캠퍼스 커뮤니티 플랫폼 프로젝트에서 백엔드 개발을 담당하며 풀스택 개발 경험을 쌓았고, 교내 해커톤에서 최우수상을 수상했습니다.',
     '2026-03-15')
  ) AS v(id,student_uid,title,company,job_type,position,category_code,category_label,content,created_at)
 WHERE EXISTS(SELECT 1 FROM dc.student s WHERE s.intg_uid=v.student_uid)
 ON CONFLICT DO NOTHING;

INSERT INTO dc.job_resume_event(resume_id,seq,action,changed_fields)
SELECT r.id,1,'IMPORT','{}' FROM dc.job_resume r WHERE r.origin='LEGACY'
   AND NOT EXISTS(SELECT 1 FROM dc.job_resume_event e WHERE e.resume_id=r.id AND e.seq=1);
