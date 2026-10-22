-- 「비교과프로그램 현황」(신청 내역·사전/사후/만족도 조사)을 마이페이지에서 비교과 프로그램 하위로 옮긴다(2026-10-22 사용자 지시).
-- 화면: /mypage/programs → /growth/program/status, 조사 /mypage/programs/:id/survey/:phase → /growth/program/:id/survey/:phase.
-- 옛 주소는 프론트가 리다이렉트한다 — 이미 발송된 알림(dc.notification.route)은 고치지 않는다.
SET LOCAL lock_timeout='3s';

-- 학생 메뉴 코드는 navConfig 배열 인덱스와 짝이다(089). 마이페이지 자리(stu-mypage.1)는 끄고 인덱스만 남긴다.
INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order)
VALUES('stu-program-apply.1','stu-program-apply','student','비교과프로그램 현황','/growth/program/status',1)
ON CONFLICT DO NOTHING;
INSERT INTO dc.menu_auth(menu_code,role_code)
SELECT 'stu-program-apply.1',role_code FROM dc.menu_auth WHERE menu_code='stu-program-apply' ON CONFLICT DO NOTHING;
UPDATE dc.menu SET is_active=false, version=version+1 WHERE menu_code='stu-mypage.1';
UPDATE dc.menu SET route='/mypage/applications', version=version+1 WHERE menu_code='stu-mypage' AND route='/mypage/programs';

-- 선발 알림이 새 현황 주소를 가리키게 한다. 함수 본문은 037 그대로이고 비교과 선발 링크만 바뀐다.
CREATE OR REPLACE FUNCTION dc.notify_source_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record; target text; heading text;
BEGIN
 IF TG_TABLE_NAME='counsel_event' THEN
  SELECT * INTO r FROM dc.counsel_request WHERE id=NEW.request_id;
  IF NEW.kind='REQUESTED' THEN
   PERFORM dc.deliver_notification(r.counselor_uid,'counsel',NEW.id::text,'counsel','새 상담 신청이 접수되었습니다',r.topic,
    CASE WHEN r.type_code='PROF' THEN '/professor/counsel/requests' ELSE '/counsel/requests' END,NEW.created_at);
  ELSIF NEW.kind IN ('CONFIRM','RESCHEDULE','REASSIGN','CANCEL','COMPLETE') THEN
   heading:=CASE NEW.kind WHEN 'CONFIRM' THEN '상담 신청이 확정되었습니다' WHEN 'RESCHEDULE' THEN '상담 일정이 변경되었습니다'
    WHEN 'REASSIGN' THEN '상담 담당자가 변경되었습니다' WHEN 'CANCEL' THEN '상담이 취소되었습니다' ELSE '상담이 완료되었습니다' END;
   PERFORM dc.deliver_notification(r.student_uid,'counsel',NEW.id::text,'counsel',heading,'상담 내역에서 확인해 주세요.','/counsel/record',NEW.created_at);
  END IF;
 ELSIF TG_TABLE_NAME='diagnosis_nudge' THEN
  PERFORM dc.deliver_notification(NEW.student_uid,'nudge',NEW.id::text,'diagnosis','진단 응시가 요청되었습니다',NEW.test_id,'/diagnosis/employment',NEW.created_at);
 ELSIF TG_TABLE_NAME='diagnosis_attempt' AND to_jsonb(NEW)->>'status_code'='DONE' AND (to_jsonb(NEW)->>'attempt_no')::integer>1 THEN
  FOR target IN SELECT DISTINCT s.staff_uid FROM dc.staff_student_scope s JOIN dc.staff t ON t.intg_uid=s.staff_uid WHERE s.student_uid=NEW.student_uid AND t.role_code IN ('career','psych') LOOP
   PERFORM dc.deliver_notification(target,'retake',NEW.id,'diagnosis','담당 학생이 진단에 재응시했습니다',NEW.test_id,'/diagnosis/status',NEW.completed_at);
  END LOOP;
 ELSIF TG_TABLE_NAME='roadmap_request_event' THEN
  IF NEW.action='CREATE' THEN
   FOR target IN SELECT DISTINCT s.staff_uid FROM dc.staff_student_scope s JOIN dc.staff t ON t.intg_uid=s.staff_uid WHERE s.student_uid=NEW.student_uid AND t.role_code='career' LOOP
    PERFORM dc.deliver_notification(target,'roadmap',NEW.id::text,'roadmap','로드맵 변경 요청이 접수되었습니다','','/roadmap/requests',NEW.created_at);
   END LOOP;
  ELSIF NEW.action IN ('APPLY','REJECT') THEN
   PERFORM dc.deliver_notification(NEW.student_uid,'roadmap',NEW.id::text,'roadmap',CASE NEW.action WHEN 'APPLY' THEN '로드맵 변경 요청이 반영되었습니다' ELSE '로드맵 변경 요청이 반려되었습니다' END,'','/growth/roadmap-status',NEW.created_at);
  END IF;
 ELSIF TG_TABLE_NAME='job_application_event' THEN
  SELECT * INTO r FROM dc.job_application WHERE id=NEW.application_id;
  IF NEW.action IN ('APPLY','REAPPLY') THEN
   FOR target IN SELECT DISTINCT s.staff_uid FROM dc.staff_student_scope s JOIN dc.staff t ON t.intg_uid=s.staff_uid WHERE s.student_uid=r.student_uid AND t.role_code='career' LOOP
    PERFORM dc.deliver_notification(target,'job',NEW.id,'job','새 추천채용 지원이 접수되었습니다','','/jobs/applicants/'||r.posting_id,NEW.occurred_at);
   END LOOP;
  ELSIF NEW.action IN ('ADVANCE','PASS','REJECT') THEN
   PERFORM dc.deliver_notification(r.student_uid,'job',NEW.id,'job','추천채용 지원 상태가 변경되었습니다',NEW.to_stage_name,'/mypage/applications',NEW.occurred_at);
  END IF;
 ELSIF TG_TABLE_NAME='program_apply_event' AND to_jsonb(NEW)->>'action'='SELECTION' THEN
  SELECT * INTO r FROM dc.program_apply WHERE program_id=NEW.program_id AND student_uid=NEW.student_uid;
  IF r.selection_code IN ('SELECTED','REJECTED') THEN
   PERFORM dc.deliver_notification(NEW.student_uid,'program',NEW.id::text,'program',CASE r.selection_code WHEN 'SELECTED' THEN '비교과 프로그램에 선발되었습니다' ELSE '비교과 선발 결과가 안내되었습니다' END,'','/growth/program/status',NEW.changed_at);
  END IF;
 END IF;
 RETURN NULL;
END $$;
