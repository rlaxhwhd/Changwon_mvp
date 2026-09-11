-- Deliver on the same transaction as the source event. No browser-generated history.
CREATE FUNCTION dc.deliver_notification(target text, origin text, source_key text,
 channel text, heading text, message text, destination text, happened timestamptz)
RETURNS void LANGUAGE sql AS $$
 INSERT INTO dc.notification(recipient_uid,source_kind,source_id,tone,title,body,route,occurred_at)
 SELECT target,origin,source_key,channel,heading,COALESCE(message,''),destination,COALESCE(happened,now())
 WHERE target IS NOT NULL ON CONFLICT(recipient_uid,source_kind,source_id) DO NOTHING;
$$;
CREATE FUNCTION dc.notify_source_event() RETURNS trigger LANGUAGE plpgsql AS $$
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
   PERFORM dc.deliver_notification(NEW.student_uid,'program',NEW.id::text,'program',CASE r.selection_code WHEN 'SELECTED' THEN '비교과 프로그램에 선발되었습니다' ELSE '비교과 선발 결과가 안내되었습니다' END,'','/mypage/programs',NEW.changed_at);
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER notify_counsel AFTER INSERT ON dc.counsel_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event();
CREATE TRIGGER notify_nudge AFTER INSERT ON dc.diagnosis_nudge FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event();
CREATE TRIGGER notify_retake AFTER INSERT ON dc.diagnosis_attempt FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event();
CREATE TRIGGER notify_roadmap AFTER INSERT ON dc.roadmap_request_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event();
CREATE TRIGGER notify_job AFTER INSERT ON dc.job_application_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event();
CREATE TRIGGER notify_program AFTER INSERT ON dc.program_apply_event FOR EACH ROW EXECUTE FUNCTION dc.notify_source_event();
