-- 학생 비교과 프로그램 주소를 「내 성장」 하위(/growth/program)에서 /program 으로 독립시킨다(2026-10-26 사용자 지시).
-- 옛 주소는 프론트가 /program 아래로 리다이렉트한다 — 이미 발송된 알림(dc.notification.route)은 고치지 않는다.
-- seed_source.payload 는 시드 원본 기록이라 그대로 둔다(시드 파일은 같은 커밋에서 바꿨다).
SET LOCAL lock_timeout='3s';

UPDATE dc.menu SET route=replace(route,'/growth/program','/program'), version=version+1
 WHERE portal='student' AND route LIKE '/growth/program%';
UPDATE dc.main_popup SET href=replace(href,'/growth/program','/program'), version=version+1, updated_at=now()
 WHERE href LIKE '/growth/program%';
-- 상세 프로필 fixture 학생의 다음 단계(nextPath)·추천 링크(linkPath).
UPDATE dc.student SET roster=replace(roster::text,'"/growth/program','"/program')::jsonb WHERE roster::text LIKE '%"/growth/program%';
UPDATE dc.student SET detail=replace(detail::text,'"/growth/program','"/program')::jsonb WHERE detail::text LIKE '%"/growth/program%';

-- 선발 알림 링크. 함수 본문은 142 그대로이고 비교과 선발 링크만 바뀐다.
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
   PERFORM dc.deliver_notification(NEW.student_uid,'program',NEW.id::text,'program',CASE r.selection_code WHEN 'SELECTED' THEN '비교과 프로그램에 선발되었습니다' ELSE '비교과 선발 결과가 안내되었습니다' END,'','/program/status',NEW.changed_at);
  END IF;
 END IF;
 RETURN NULL;
END $$;
