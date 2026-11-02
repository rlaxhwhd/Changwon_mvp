-- 건축학과 등 5년제 학과는 5학년이 있다(2026-11-02 사용자 지시). 퀘스트 편성 학년 대상을 1~5학년으로 연다.
-- dc.student.grade 는 001 부터 1~10 이라 그대로 둔다. 제약을 넓히기만 하므로 기존 행은 모두 통과한다.
-- Rollback: grades 에 5 가 든 편성을 정리한 뒤 새 마이그레이션에서 ARRAY[1,2,3,4] 로 되돌린다.
SET LOCAL lock_timeout='3s';
ALTER TABLE dc.quest_assignment DROP CONSTRAINT quest_assignment_grades_check;
ALTER TABLE dc.quest_assignment ADD CONSTRAINT quest_assignment_grades_check CHECK (grades <@ ARRAY[1,2,3,4,5]);
