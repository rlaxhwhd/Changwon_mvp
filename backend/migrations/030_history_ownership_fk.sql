-- 이력 행이 「남의 부모 + 내 학생 UID」로 저장되는 것을 DB 가 막는다.
--
-- dc.diagnosis_comment 는 attempt_id 와 student_uid 를 **각각** 검사했다. 그래서
-- A 학생의 응시와 B 학생의 UID 를 함께 저장해도 두 FK 를 모두 만족한다. 그런데
-- 학생별 코멘트 조회는 c.student_uid 를 기준으로 하므로, 그렇게 들어간 행은
-- **B 학생 화면에 A 학생의 진단 코멘트로 보인다.** dc.roadmap_request_event 도 같다.
--
-- 이미 dc.diagnosis_result 가 (student_uid,test_id,attempt_no) 복합 FK 를 쓰고
-- 로드맵·성장도 학생을 포함한 복합 FK 를 쓴다. 새 패턴이 아니라 **빠진 두 곳을
-- 같은 패턴으로 맞추는 것**이다.
--
-- ★ 현재 불일치는 두 표 모두 0 건이다(적용 전 조회). 정상 API 는 부모에서 학생을
--   가져와 저장하므로 이것은 결함 수정이 아니라 직접 적재에 대한 방어다.
--
-- attempt_id·request_id 단독 FK 는 복합 FK 에 완전히 포함되므로 제거한다.
-- student_uid 단독 FK 는 남긴다 — 부모가 없는 상태를 상상하지 않게 의도를 남기고,
-- 복합 FK 가 제거되더라도 최소 보장이 남는다.
-- 근거: .ai/db/SCHEMA_REVIEW_2026-09-10.md §4 F5

ALTER TABLE dc.diagnosis_attempt
  ADD CONSTRAINT uq_diagnosis_attempt_id_student UNIQUE (id, student_uid);

ALTER TABLE dc.diagnosis_comment
  ADD CONSTRAINT fk_diagnosis_comment_attempt_student
  FOREIGN KEY (attempt_id, student_uid) REFERENCES dc.diagnosis_attempt(id, student_uid) NOT VALID;
ALTER TABLE dc.diagnosis_comment VALIDATE CONSTRAINT fk_diagnosis_comment_attempt_student;
ALTER TABLE dc.diagnosis_comment DROP CONSTRAINT diagnosis_comment_attempt_id_fkey;

ALTER TABLE dc.roadmap_request
  ADD CONSTRAINT uq_roadmap_request_id_student UNIQUE (id, student_uid);

ALTER TABLE dc.roadmap_request_event
  ADD CONSTRAINT fk_roadmap_request_event_request_student
  FOREIGN KEY (request_id, student_uid) REFERENCES dc.roadmap_request(id, student_uid) ON DELETE RESTRICT NOT VALID;
ALTER TABLE dc.roadmap_request_event VALIDATE CONSTRAINT fk_roadmap_request_event_request_student;
ALTER TABLE dc.roadmap_request_event DROP CONSTRAINT roadmap_request_event_request_id_fkey;
