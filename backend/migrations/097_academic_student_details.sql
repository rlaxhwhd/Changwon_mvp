-- Additive read model for the academic roster. No raw-table grants or source writes.
-- Rollback: remove this view in a forward migration after reverting its API readers.
SET LOCAL lock_timeout='3s';
CREATE VIEW dc.academic_student_details AS
SELECT intg_uid, sex AS sex_code, grade AS academic_gpa, out_dt
FROM academic.v_usr_inf
WHERE user_ty_cd IN ('1101','1102','1201','1202');
GRANT SELECT ON dc.academic_student_details TO dc_app;
