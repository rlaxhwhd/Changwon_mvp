-- 상담 불참(노쇼) 상태
--
-- 확정된 상담에 학생이 오지 않은 것을 상담사가 직접 체크한다. 자동 판정은 하지 않는다 —
-- '시간이 지났는데 완료가 아니다'로 미루면 상담사가 뒤늦게 기록하는 정상 건까지 불참이 된다.
--
-- 취소와 같은 성격의 종결 상태다: 완료가 아니므로 이행률·완료 집계에서 취소와 함께 빠진다
-- (집계 쿼리들이 상태를 열거해 세므로 NO_SHOW 는 자동으로 제외된다).
-- 비교과의 노쇼 벌점(dc.penalty_entry)과는 다른 축이다 — 상담 불참에 벌점을 주지 않는다.
ALTER TABLE dc.counsel_request DROP CONSTRAINT counsel_request_status_code_check;
ALTER TABLE dc.counsel_request ADD CONSTRAINT counsel_request_status_code_check
    CHECK(status_code IN ('REQ','CONFIRMED','DONE','NO_SHOW','CANCEL_UNKNOWN','CANCEL_STU','CANCEL_CNS'));
