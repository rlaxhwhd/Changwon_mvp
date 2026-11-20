-- 170: 채용공고 경력 구분에 「경력무관」 추가 (2026-11-20 사용자 요청, 작업지시서 0018)
--
-- JOB_CAREER_TYPE 은 운영 코드(code_group.fixed_codes=false)다. 등록 폼 라디오·학생 목록·상세가
-- code_item 을 읽으므로 행 추가만으로 화면에 나타난다. 기존 공고의 경력 값은 바꾸지 않는다.
-- 앱이 이 코드값으로 분기하지 않는다(신입·경력과 같은 표시용).
-- Rollback: 아무 공고도 쓰지 않으면
--             (SELECT count(*) FROM dc.job_posting_option WHERE kind='CAREER' AND code='ANY')
--           + (SELECT count(*) FROM dc.job_posting WHERE career_primary_code='ANY')
--           + (SELECT count(*) FROM dc.code_item_event WHERE group_code='JOB_CAREER_TYPE' AND code='ANY') = 0
--           DELETE FROM dc.code_item WHERE group_code='JOB_CAREER_TYPE' AND code='ANY';
--           UPDATE dc.metadata_revision SET revision=revision+1;  -- DELETE 는 code_revision 트리거가 올리지 않는다
--           쓰고 있으면 지우지 말고 is_active=false 로 숨긴다(과거 공고 라벨은 남는다).
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('JOB_CAREER_TYPE','ANY','경력무관',2);
