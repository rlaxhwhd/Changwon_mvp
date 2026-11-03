-- 차수 — 같은 프로그램을 운영기간 안에 여러 번 연다(현행 EP_PRM_STEP). 차수마다 접수·운영 기간,
-- 장소, 모집·선발 인원, 선착순 여부가 따로다. 1차는 dc.program 행 자체이고(기존 공고는 그대로 1차),
-- 2차부터 이 테이블에 쌓는다. 학생은 차수 하나를 골라 신청한다(program_apply.round_no, 018).
-- 총회차(program.sessions)는 1 + 이 테이블의 행 수로 API 가 함께 맞춘다.
-- Rollback: 이전 API 로 되돌려도 새 테이블은 읽히지 않을 뿐이다. 삭제가 필요하면 새 migration 으로 한다.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TABLE dc.program_round (
  program_id text NOT NULL REFERENCES dc.program(id) ON DELETE CASCADE,
  round_no integer NOT NULL CHECK (round_no BETWEEN 2 AND 999),
  apply_start date NOT NULL,
  apply_start_time time,
  apply_end date NOT NULL,
  apply_end_time time,
  run_start date,
  run_start_time time,
  run_end date,
  run_end_time time,
  location text NOT NULL DEFAULT '' CHECK (length(location) <= 200),
  capacity integer NOT NULL CHECK (capacity BETWEEN 0 AND 100000),
  selection_capacity integer CHECK (selection_capacity BETWEEN 0 AND 100000),
  selection_method text NOT NULL DEFAULT 'REVIEW' CHECK (selection_method IN ('REVIEW','FIRST_COME')),
  created_by text NOT NULL REFERENCES dc.person(intg_uid),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES dc.person(intg_uid),
  updated_at timestamptz,
  PRIMARY KEY (program_id, round_no),
  CHECK (selection_capacity IS NULL OR selection_capacity <= capacity),
  CHECK (apply_end >= apply_start),
  CHECK (run_start IS NULL OR run_end IS NULL OR run_end >= run_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON dc.program_round TO dc_app;
