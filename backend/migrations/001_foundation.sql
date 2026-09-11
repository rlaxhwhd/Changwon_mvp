-- Canonical, hand-written PostgreSQL DDL. Applied transactionally by migrate.py.
CREATE TABLE dc.schema_migration (
    version text PRIMARY KEY, checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dc.seed_source (
    path text PRIMARY KEY, checksum text NOT NULL, payload jsonb NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dc.import_issue (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_path text NOT NULL REFERENCES dc.seed_source(path),
    source_key text NOT NULL, code text NOT NULL, detail text NOT NULL,
    UNIQUE(source_path, source_key, code)
);
CREATE TABLE dc.department (
    college_code text NOT NULL, dept_code text NOT NULL,
    college_name text NOT NULL, dept_name text NOT NULL, course text NOT NULL,
    PRIMARY KEY(college_code, dept_code)
);
CREATE TABLE dc.person (
    intg_uid text PRIMARY KEY, alias text NOT NULL UNIQUE,
    name text NOT NULL, kind text NOT NULL CHECK(kind IN ('STUDENT','STAFF')),
    source text NOT NULL CHECK(source IN ('fixture','academic','local')),
    profile jsonb NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1
);
CREATE TABLE dc.student (
    intg_uid text PRIMARY KEY REFERENCES dc.person(intg_uid),
    student_no text NOT NULL UNIQUE, major_label text NOT NULL,
    grade integer CHECK(grade BETWEEN 1 AND 10),
    college_code text, dept_code text, entry_year text,
    roster jsonb NOT NULL DEFAULT '{}', detail jsonb,
    FOREIGN KEY(college_code,dept_code) REFERENCES dc.department(college_code,dept_code)
);
CREATE TABLE dc.skill (skill_id text PRIMARY KEY, label text NOT NULL, category text NOT NULL, icon text NOT NULL);
CREATE TABLE dc.subject (
    curi_num text PRIMARY KEY, curi_nm text NOT NULL, cdt_num numeric NOT NULL,
    open_dept_cd text NOT NULL, grad_div text NOT NULL, active boolean NOT NULL
);
CREATE TABLE dc.curriculum (
    id text PRIMARY KEY, dept_code text NOT NULL, curri_year text NOT NULL,
    curi_num text NOT NULL REFERENCES dc.subject(curi_num), course_cls text NOT NULL,
    rec_grade integer NOT NULL, rec_smt text NOT NULL, required boolean NOT NULL
);
CREATE TABLE dc.course_skill (
    curi_num text REFERENCES dc.subject(curi_num), skill_id text REFERENCES dc.skill(skill_id),
    weight numeric NOT NULL, source text NOT NULL, PRIMARY KEY(curi_num,skill_id)
);
CREATE TABLE dc.student_course (
    intg_uid text REFERENCES dc.student(intg_uid), year text NOT NULL, smt text NOT NULL,
    curi_num text REFERENCES dc.subject(curi_num), course_cls text NOT NULL,
    grade text, gpa numeric, finish_yn text NOT NULL CHECK(finish_yn IN ('Y','N')),
    chk_recuri text NOT NULL, PRIMARY KEY(intg_uid,year,smt,curi_num)
);
CREATE TABLE dc.cert (
    cert_id text PRIMARY KEY, label text NOT NULL, issuer text NOT NULL,
    kind text NOT NULL, icon text NOT NULL, active boolean NOT NULL
);
CREATE TABLE dc.cert_skill (
    cert_id text REFERENCES dc.cert(cert_id), skill_id text REFERENCES dc.skill(skill_id),
    PRIMARY KEY(cert_id,skill_id)
);
CREATE TABLE dc.job_role (
    job_id text PRIMARY KEY, label text NOT NULL, category text NOT NULL,
    icon text NOT NULL, summary text NOT NULL, what_to_do jsonb NOT NULL, target_orgs jsonb NOT NULL
);
CREATE TABLE dc.job_skill (
    job_id text REFERENCES dc.job_role(job_id), skill_id text REFERENCES dc.skill(skill_id),
    weight numeric NOT NULL, required boolean NOT NULL, PRIMARY KEY(job_id,skill_id)
);
CREATE TABLE dc.student_cert (
    intg_uid text REFERENCES dc.student(intg_uid), cert_id text REFERENCES dc.cert(cert_id),
    acquired_dt date, cert_no text, verified boolean NOT NULL DEFAULT false,
    added boolean NOT NULL DEFAULT true, PRIMARY KEY(intg_uid,cert_id)
);
CREATE TABLE dc.student_job_interest (
    intg_uid text REFERENCES dc.student(intg_uid), job_id text REFERENCES dc.job_role(job_id),
    pinned boolean NOT NULL DEFAULT false, added boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(intg_uid,job_id)
);
-- Historical participation can reference programs not present in the current catalog.
CREATE TABLE dc.student_program_history (
    intg_uid text REFERENCES dc.student(intg_uid), program_id text NOT NULL,
    title text NOT NULL, applied_at date NOT NULL, completed boolean NOT NULL,
    source text NOT NULL DEFAULT 'fixture', PRIMARY KEY(intg_uid,program_id)
);
CREATE INDEX student_major_grade ON dc.student(major_label,grade);
CREATE INDEX student_course_subject ON dc.student_course(curi_num);
GRANT SELECT ON ALL TABLES IN SCHEMA dc TO dc_app;
GRANT INSERT,UPDATE,DELETE ON dc.student_job_interest,dc.student_cert TO dc_app;
