-- 로스터 더미 학생 퇴역 — studentsRoster.json(112명)·counselSeedStudents.json(5명)로 만든 fixture 학생과
-- 그들에게 걸린 모든 행을 지운다. 남는 학생 fixture 는 상세 프로필 3명(chaewon·changwon·jiwoo)뿐이고,
-- 실제 학생은 학사 미러(academic.*)에서 들어온다. source='local'(수동 등록)·학사 유래 학생은 건드리지 않는다.
-- 새 DB 에서는 시드가 더미를 만들지 않으므로 0행이다(app/seed.py).
CREATE TEMP TABLE doomed AS
  SELECT p.intg_uid FROM dc.person p
  WHERE p.kind='STUDENT' AND p.source='fixture' AND p.alias NOT IN ('chaewon','changwon','jiwoo');
CREATE TEMP TABLE doomed_request AS
  SELECT id FROM dc.counsel_request WHERE student_uid IN (SELECT intg_uid FROM doomed);
CREATE TEMP TABLE doomed_application AS
  SELECT id FROM dc.job_application WHERE student_uid IN (SELECT intg_uid FROM doomed);

-- append-only 가드(11조)는 업무 이력을 지키는 장치다. 더미 fixture 의 이력을 걷어내는 이 마이그레이션에서만 잠시 내린다.
ALTER TABLE dc.counsel_event DISABLE TRIGGER counsel_event_immutable;
ALTER TABLE dc.student_type_event DISABLE TRIGGER student_type_event_immutable;
ALTER TABLE dc.roadmap_item_event DISABLE TRIGGER roadmap_item_event_immutable;
ALTER TABLE dc.roadmap_snapshot DISABLE TRIGGER roadmap_snapshot_immutable;
ALTER TABLE dc.diagnosis_comment DISABLE TRIGGER diagnosis_comment_immutable;
ALTER TABLE dc.diagnosis_nudge DISABLE TRIGGER diagnosis_nudge_immutable;
ALTER TABLE dc.program_apply_event DISABLE TRIGGER program_apply_event_immutable;
ALTER TABLE dc.penalty_entry DISABLE TRIGGER penalty_entry_immutable;
ALTER TABLE dc.ai_run DISABLE TRIGGER ai_run_immutable;
ALTER TABLE dc.ai_comment DISABLE TRIGGER ai_comment_immutable;
ALTER TABLE dc.ai_suggestion DISABLE TRIGGER ai_suggestion_immutable;
ALTER TABLE dc.ai_score DISABLE TRIGGER ai_score_immutable;
ALTER TABLE dc.job_application_attempt DISABLE TRIGGER job_attempt_immutable;
ALTER TABLE dc.job_application_event DISABLE TRIGGER job_application_event_immutable;
ALTER TABLE dc.job_resume_event DISABLE TRIGGER job_resume_event_immutable;
ALTER TABLE dc.job_access_event DISABLE TRIGGER job_access_event_immutable;
ALTER TABLE dc.roadmap_event DISABLE TRIGGER roadmap_event_immutable;
ALTER TABLE dc.roadmap_request_event DISABLE TRIGGER roadmap_request_event_immutable;
ALTER TABLE dc.growth_event DISABLE TRIGGER growth_event_immutable;
ALTER TABLE dc.program_wishlist_event DISABLE TRIGGER program_wishlist_event_immutable;
ALTER TABLE dc.diagnosis_result_factor DISABLE TRIGGER diagnosis_result_factor_immutable;
ALTER TABLE dc.counsel_operation_event DISABLE TRIGGER counsel_operation_immutable;
ALTER TABLE dc.notification DISABLE TRIGGER notification_immutable;
ALTER TABLE dc.notification_read DISABLE TRIGGER notification_read_immutable;
ALTER TABLE dc.auth_user_event DISABLE TRIGGER auth_user_event_immutable;
ALTER TABLE dc.advisor_assignment DISABLE TRIGGER advisor_assignment_no_delete;

-- 상담
DELETE FROM dc.psych_test_result WHERE student_uid IN (SELECT intg_uid FROM doomed) OR request_id IN (SELECT id FROM doomed_request);
DELETE FROM dc.counsel_record WHERE request_id IN (SELECT id FROM doomed_request);
DELETE FROM dc.counsel_event WHERE request_id IN (SELECT id FROM doomed_request) OR actor_uid IN (SELECT intg_uid FROM doomed);
-- 로드맵 (counsel_request 를 참조하므로 신청보다 먼저)
DELETE FROM dc.roadmap_item_event WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.roadmap_snapshot WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.roadmap_event WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.roadmap_request_event WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.roadmap_request WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.roadmap_item WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.roadmap_axis WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.roadmap WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.counsel_request WHERE id IN (SELECT id FROM doomed_request);
DELETE FROM dc.group_counsel_member WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.counsel_operation_event WHERE actor_uid IN (SELECT intg_uid FROM doomed);
-- 진단
DELETE FROM dc.diagnosis_comment WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.diagnosis_nudge WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.diagnosis_result_factor WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.diagnosis_result WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.diagnosis_attempt WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.student_type_event WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
-- 비교과
DELETE FROM dc.program_apply_event WHERE student_uid IN (SELECT intg_uid FROM doomed) OR changed_by IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.program_apply WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.program_wishlist_event WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.program_wishlist WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.penalty_entry WHERE student_uid IN (SELECT intg_uid FROM doomed) OR created_by IN (SELECT intg_uid FROM doomed);
-- 채용
DELETE FROM dc.job_application_event WHERE application_id IN (SELECT id FROM doomed_application) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.job_application_attempt WHERE application_id IN (SELECT id FROM doomed_application)
  OR portfolio_owner_uid IN (SELECT intg_uid FROM doomed) OR created_by IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.job_application WHERE id IN (SELECT id FROM doomed_application);
DELETE FROM dc.job_wishlist WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.job_resume_event WHERE actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.job_resume WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.job_access_event WHERE actor_uid IN (SELECT intg_uid FROM doomed);
-- 성장
DELETE FROM dc.growth_event WHERE student_uid IN (SELECT intg_uid FROM doomed) OR actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.growth_entry_file WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.growth_entry WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.growth_profile WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.file_object WHERE uploaded_by IN (SELECT intg_uid FROM doomed);
-- 배정·범위·알림·기타
DELETE FROM dc.advisor_assignment WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.fixture_student_scope WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.star_track WHERE student_uid IN (SELECT intg_uid FROM doomed);
CREATE TEMP TABLE doomed_run AS SELECT id FROM dc.ai_run WHERE student_uid IN (SELECT intg_uid FROM doomed) OR requested_by IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.ai_comment WHERE run_id IN (SELECT id FROM doomed_run);
DELETE FROM dc.ai_suggestion WHERE run_id IN (SELECT id FROM doomed_run);
DELETE FROM dc.ai_score WHERE run_id IN (SELECT id FROM doomed_run);
DELETE FROM dc.ai_run WHERE id IN (SELECT id FROM doomed_run);
DELETE FROM dc.notification_read WHERE notification_id IN (SELECT id FROM dc.notification WHERE recipient_uid IN (SELECT intg_uid FROM doomed));
DELETE FROM dc.notification WHERE recipient_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.idempotency WHERE actor_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.student_login_session WHERE student_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.auth_user_event WHERE person_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.auth_user WHERE person_uid IN (SELECT intg_uid FROM doomed);
-- 학사 유래 개인 행
DELETE FROM dc.student_course WHERE intg_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.student_cert WHERE intg_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.student_job_interest WHERE intg_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.student_program_history WHERE intg_uid IN (SELECT intg_uid FROM doomed);
-- 본체
DELETE FROM dc.student WHERE intg_uid IN (SELECT intg_uid FROM doomed);
DELETE FROM dc.person WHERE intg_uid IN (SELECT intg_uid FROM doomed);
ALTER TABLE dc.counsel_event ENABLE TRIGGER counsel_event_immutable;
ALTER TABLE dc.student_type_event ENABLE TRIGGER student_type_event_immutable;
ALTER TABLE dc.roadmap_item_event ENABLE TRIGGER roadmap_item_event_immutable;
ALTER TABLE dc.roadmap_snapshot ENABLE TRIGGER roadmap_snapshot_immutable;
ALTER TABLE dc.diagnosis_comment ENABLE TRIGGER diagnosis_comment_immutable;
ALTER TABLE dc.diagnosis_nudge ENABLE TRIGGER diagnosis_nudge_immutable;
ALTER TABLE dc.program_apply_event ENABLE TRIGGER program_apply_event_immutable;
ALTER TABLE dc.penalty_entry ENABLE TRIGGER penalty_entry_immutable;
ALTER TABLE dc.ai_run ENABLE TRIGGER ai_run_immutable;
ALTER TABLE dc.ai_comment ENABLE TRIGGER ai_comment_immutable;
ALTER TABLE dc.ai_suggestion ENABLE TRIGGER ai_suggestion_immutable;
ALTER TABLE dc.ai_score ENABLE TRIGGER ai_score_immutable;
ALTER TABLE dc.job_application_attempt ENABLE TRIGGER job_attempt_immutable;
ALTER TABLE dc.job_application_event ENABLE TRIGGER job_application_event_immutable;
ALTER TABLE dc.job_resume_event ENABLE TRIGGER job_resume_event_immutable;
ALTER TABLE dc.job_access_event ENABLE TRIGGER job_access_event_immutable;
ALTER TABLE dc.roadmap_event ENABLE TRIGGER roadmap_event_immutable;
ALTER TABLE dc.roadmap_request_event ENABLE TRIGGER roadmap_request_event_immutable;
ALTER TABLE dc.growth_event ENABLE TRIGGER growth_event_immutable;
ALTER TABLE dc.program_wishlist_event ENABLE TRIGGER program_wishlist_event_immutable;
ALTER TABLE dc.diagnosis_result_factor ENABLE TRIGGER diagnosis_result_factor_immutable;
ALTER TABLE dc.counsel_operation_event ENABLE TRIGGER counsel_operation_immutable;
ALTER TABLE dc.notification ENABLE TRIGGER notification_immutable;
ALTER TABLE dc.notification_read ENABLE TRIGGER notification_read_immutable;
ALTER TABLE dc.auth_user_event ENABLE TRIGGER auth_user_event_immutable;
ALTER TABLE dc.advisor_assignment ENABLE TRIGGER advisor_assignment_no_delete;
DROP TABLE doomed_run; DROP TABLE doomed_application; DROP TABLE doomed_request; DROP TABLE doomed;
