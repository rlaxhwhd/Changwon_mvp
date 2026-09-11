CREATE TABLE dc.staff_student_scope (
    staff_uid text REFERENCES dc.staff(intg_uid), student_uid text REFERENCES dc.student(intg_uid),
    source text NOT NULL, PRIMARY KEY(staff_uid,student_uid)
);
GRANT SELECT ON dc.staff_student_scope TO dc_app;
