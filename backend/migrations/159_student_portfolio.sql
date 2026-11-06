-- Student portfolios: several resume documents per student, attached to a job
-- application attempt as an immutable snapshot. Design: .ai/handoff-db/0009-student-portfolio.
-- Rollback: revert the app first; the previous app rejects PORTFOLIO with 503 and never
-- reads these tables. Preserve tables, constraints and files. Narrow the file_object
-- checks only when no new owner/slot rows exist. Never roll back schema once a snapshot exists.

-- 파일 슬롯·소유 종류. 135의 목록을 그대로 두고 더한다.
ALTER TABLE dc.file_object
 DROP CONSTRAINT file_object_owner_kind_check,
 DROP CONSTRAINT file_object_slot_check,
 ADD CONSTRAINT file_object_owner_kind_check CHECK(owner_kind IN
  ('JOB_POSTING','JOB_APPLICATION_ATTEMPT','GROWTH_ENTRY','PROGRAM','PROGRAM_APPLICATION','COUNSEL_REQUEST',
   'STUDENT_PORTFOLIO')),
 ADD CONSTRAINT file_object_slot_check CHECK(slot IN
  ('LOGO','ATTACHMENT','RESUME','PORTFOLIO_ATTACHMENT','PROGRAM_ATTACHMENT','PROGRAM_APPLICATION_ATTACHMENT',
   'COUNSEL_ATTACHMENT','PORTFOLIO_PHOTO','PORTFOLIO_DOCUMENT'));

-- 스냅샷이 회차와 같은 학생임을 DB가 보장하기 위한 복합 FK 대상. 부분 인덱스는 FK 대상이 될 수 없다.
ALTER TABLE dc.job_application_attempt
 ADD CONSTRAINT uq_job_application_attempt_portfolio_owner UNIQUE(id,portfolio_owner_uid);

CREATE TABLE dc.student_portfolio (
 id          text NOT NULL,
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 title       text NOT NULL,
 document    jsonb NOT NULL,
 is_complete boolean NOT NULL DEFAULT false,  -- 목록이 document를 읽지 않기 위한 값. 쓰기 경로에서만 계산한다
 version     bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at  timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 updated_at  timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES dc.person(intg_uid),
 deleted_at  timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 CONSTRAINT pk_student_portfolio PRIMARY KEY(id),
 CONSTRAINT uq_student_portfolio_owner UNIQUE(student_uid,id),  -- 복합 FK 대상이자 삭제 행까지 포함한 학생별 조회 인덱스
 CONSTRAINT ck_student_portfolio_title CHECK(btrim(title)<>'' AND char_length(title)<=60),
 CONSTRAINT ck_student_portfolio_document CHECK(jsonb_typeof(document)='object'
   AND jsonb_typeof(document->'sections')='array'),
 CONSTRAINT ck_student_portfolio_deleted_pair CHECK((deleted_at IS NULL)=(deleted_by IS NULL))
);
CREATE UNIQUE INDEX uq_student_portfolio_title ON dc.student_portfolio(student_uid,title) WHERE deleted_at IS NULL;
CREATE INDEX ix_student_portfolio_listing ON dc.student_portfolio(student_uid,updated_at DESC,id) WHERE deleted_at IS NULL;

CREATE TABLE dc.student_portfolio_event (
 id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 portfolio_id text NOT NULL REFERENCES dc.student_portfolio(id),
 seq          bigint NOT NULL CHECK(seq>0),
 action       text NOT NULL CHECK(action IN ('CREATE','DELETE')),
 actor_uid    text REFERENCES dc.person(intg_uid),
 occurred_at  timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT uq_student_portfolio_event_seq UNIQUE(portfolio_id,seq)
);

CREATE TABLE dc.job_attempt_portfolio (
 attempt_id        text NOT NULL,
 student_uid       text NOT NULL,
 portfolio_id      text NOT NULL,
 portfolio_version bigint NOT NULL CHECK(portfolio_version>0),
 title             text NOT NULL CHECK(btrim(title)<>''),
 document          jsonb NOT NULL CHECK(jsonb_typeof(document)='object'),
 created_at        timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT pk_job_attempt_portfolio PRIMARY KEY(attempt_id),
 CONSTRAINT fk_job_attempt_portfolio_attempt FOREIGN KEY(attempt_id,student_uid)
   REFERENCES dc.job_application_attempt(id,portfolio_owner_uid),
 CONSTRAINT fk_job_attempt_portfolio_source FOREIGN KEY(student_uid,portfolio_id)
   REFERENCES dc.student_portfolio(student_uid,id)
);
CREATE INDEX ix_job_attempt_portfolio_source ON dc.job_attempt_portfolio(student_uid,portfolio_id);

-- 제출본이 참조한 파일. 교직원·제출 학생의 파일 권한을 JSONB 전체 스캔 없이 PK로 판정하고, 파일 행의 물리 삭제를 막는다.
CREATE TABLE dc.job_attempt_portfolio_file (
 attempt_id text NOT NULL REFERENCES dc.job_attempt_portfolio(attempt_id),
 file_id    text NOT NULL REFERENCES dc.file_object(id),
 CONSTRAINT pk_job_attempt_portfolio_file PRIMARY KEY(attempt_id,file_id)
);
CREATE INDEX ix_job_attempt_portfolio_file_file ON dc.job_attempt_portfolio_file(file_id);

CREATE TRIGGER student_portfolio_event_immutable BEFORE UPDATE OR DELETE ON dc.student_portfolio_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER job_attempt_portfolio_immutable BEFORE UPDATE OR DELETE ON dc.job_attempt_portfolio
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();
CREATE TRIGGER job_attempt_portfolio_file_immutable BEFORE UPDATE OR DELETE ON dc.job_attempt_portfolio_file
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- 기본 권한 설정이 없으므로 빠뜨리면 API가 전부 permission denied다.
GRANT SELECT,INSERT,UPDATE ON dc.student_portfolio TO dc_app;
GRANT SELECT,INSERT ON dc.student_portfolio_event,dc.job_attempt_portfolio,dc.job_attempt_portfolio_file TO dc_app;
