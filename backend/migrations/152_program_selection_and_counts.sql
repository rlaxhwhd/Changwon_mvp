-- 선발 방식·선발 정원은 화면 상태가 아니라 공고의 업무 데이터다.
-- 이전 공고는 방식을 저장하지 않았으므로 심사 방식으로 보존한다. 과거 신청을 임의 선발하지 않는다.
-- Rollback: 이전 앱으로 되돌리고 추가 열·뷰는 유지한다. 삭제가 필요하면 새 migration으로 처리한다.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
ALTER TABLE dc.program
  ADD COLUMN selection_method text NOT NULL DEFAULT 'REVIEW'
    CHECK(selection_method IN ('REVIEW','FIRST_COME')),
  ADD COLUMN selection_capacity integer CHECK(selection_capacity BETWEEN 0 AND 100000),
  ADD CONSTRAINT program_selection_capacity_limit CHECK(selection_capacity IS NULL OR selection_capacity<=capacity);

-- 명단의 권한 범위와 전체 인원 집계는 다르다. 홈·목록·상세·통계가 이 집계를 공유한다.
-- cancelled_at이 없는 관리자 '취소' 상태도 유효 신청에서 제외한다.
CREATE VIEW dc.program_application_counts AS
SELECT program_id,count(*) AS applied,
  count(*) FILTER(WHERE selection_code='SELECTED') AS selected,
  count(*) FILTER(WHERE attendance_code='PRESENT') AS attended,
  count(*) FILTER(WHERE outcome_code='COMPLETED') AS completed,
  count(*) FILTER(WHERE attendance_code='NO_SHOW' OR outcome_code='ABSENT') AS absent
FROM dc.program_apply
WHERE cancelled_at IS NULL AND selection_code<>'CANCELLED'
GROUP BY program_id;
GRANT SELECT ON dc.program_application_counts TO dc_app;
