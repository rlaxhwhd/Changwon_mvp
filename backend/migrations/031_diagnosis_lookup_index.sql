-- 진단 목록·상세가 실제로 던지는 조회에 인덱스를 맞춘다.
--
-- dc.diagnosis_comment · diagnosis_nudge · student_type_event 는 지금 id PK 인덱스만
-- 있다. 세 표 모두 「학생(또는 응시)별 최신 1건」을 찾는 용도인데, 그 조회를 받쳐 주는
-- 인덱스가 없어 정렬이 전부 테이블 훑기다.
--
-- ★ 정직하게 적는다 — 지금 규모(코멘트 0행·권유 0행·유형이력 8행)에서는 계획기가
--   어차피 seq scan 을 고른다. 이 인덱스로 **지금 빨라지는 것은 없다.** 근거는 대상
--   규모(8천 명)와 조회 모양이지 실측 지연이 아니다. 부하 시험은 하지 않았다.
--
-- 후보 중 counsel_event 는 넣지 않았다. 백엔드에 INSERT 만 있고 SELECT 가 없다 —
-- 프론트(src_admin/data/counselEvents.ts)가 아직 localStorage 를 읽어서 DB 는 쓰기
-- 전용이다. 읽기 경로가 생길 때 그 조회 모양을 보고 넣는다.
--
-- CREATE INDEX CONCURRENTLY 를 쓰지 않는다. migrate.py 가 미적용 파일 전체를 한
-- 트랜잭션에서 실행하므로 CONCURRENTLY 가 들어갈 수 없고, 세 표 모두 지금 비어 있어
-- 잠금 시간이 사실상 0 이다. 큰 표에 온라인 인덱스가 필요해지면 실행 모드부터 만든다(F7).
-- 근거: .ai/db/SCHEMA_REVIEW_2026-09-10.md §4 F4

-- 목록 한 페이지의 응시들에 대해 최신 코멘트 1건씩 (DISTINCT ON 일괄 조회)
CREATE INDEX ix_diagnosis_comment_latest ON dc.diagnosis_comment (attempt_id, created_at DESC, id DESC);

-- 학생 상세의 코멘트 이력 (학생 기준 시간순)
CREATE INDEX ix_diagnosis_comment_student ON dc.diagnosis_comment (student_uid, created_at, id);

-- 학생·검사별 최근 권유 시각 (max(created_at))
CREATE INDEX ix_diagnosis_nudge_recent ON dc.diagnosis_nudge (student_uid, test_id, created_at DESC);

-- 학생의 현재 유형 = 최신 확정 1건
CREATE INDEX ix_student_type_event_latest ON dc.student_type_event (student_uid, decided_at DESC, id DESC);
