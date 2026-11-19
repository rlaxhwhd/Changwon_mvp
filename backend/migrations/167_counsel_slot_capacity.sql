-- 상담 가능 시간대의 1시간당 상담 인원(2026-11-19 사용자 지시).
-- 「월 13:00~15:00 2명」 = 13~14시 2명, 14~15시 2명. 기존 행은 1명(지금 동작과 같다).
-- 제한 시간(EXCLUDED) 행은 인원 의미가 없어 기본값 1을 그대로 둔다.
-- 상수 기본값 ADD COLUMN 이라 테이블을 다시 쓰지 않는다. 롤백은 앱만 되돌리고 컬럼은 둔다
-- (옛 앱의 6값 INSERT 는 기본값 1로 계속 동작한다).
ALTER TABLE dc.counsel_schedule_slot
  ADD COLUMN capacity smallint NOT NULL DEFAULT 1
  CONSTRAINT ck_counsel_schedule_slot_capacity CHECK (capacity BETWEEN 1 AND 20);
