-- Multiple program managers use staff identities, not display-name matching.
-- Rollback: deploy the previous API while retaining this additive table.
CREATE TABLE dc.program_manager (
  program_id text NOT NULL REFERENCES dc.program(id) ON DELETE CASCADE,
  staff_uid text NOT NULL REFERENCES dc.staff(intg_uid),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 49),
  PRIMARY KEY (program_id, staff_uid),
  UNIQUE (program_id, position)
);
CREATE INDEX ix_program_manager_staff ON dc.program_manager(staff_uid, program_id);
GRANT SELECT, INSERT, DELETE ON dc.program_manager TO dc_app;
