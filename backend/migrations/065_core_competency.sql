-- Core competencies are earned through completed courses/programs, not diagnoses.
-- Forward-only; no sample allocations, student scores, or Oracle writes.
CREATE TABLE dc.core_competency (
 code text PRIMARY KEY,
 label text NOT NULL,
 sort_order smallint NOT NULL UNIQUE CHECK(sort_order BETWEEN 1 AND 5)
);
INSERT INTO dc.core_competency(code,label,sort_order) VALUES
 ('LOCAL_LEADER','지역형리더',1),('CREATIVE','창의적 사고',2),
 ('CONVERGENCE','실용적 융복합',3),('COMMUNICATION','의사소통',4),('GLOBAL','글로벌',5);

-- A course allocation belongs to a specific year/term. No latest-year fallback.
-- Source keys remain opaque strings: do not guess upstream numeric identifiers.
CREATE TABLE dc.core_competency_allocation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('COURSE','PROGRAM')),
 curi_num text REFERENCES dc.subject(curi_num),
 academic_year text,
 academic_term text,
 program_id text REFERENCES dc.program(id),
 source_system text NOT NULL CHECK(length(trim(source_system))>0),
 source_key text NOT NULL CHECK(length(trim(source_key))>0),
 source_revision text NOT NULL CHECK(length(trim(source_revision))>0),
 source_updated_at timestamptz,
 imported_at timestamptz NOT NULL DEFAULT now(),
 active boolean NOT NULL DEFAULT false,
 CHECK((kind='COURSE' AND curi_num IS NOT NULL
        AND academic_year IS NOT NULL AND length(trim(academic_year))>0
        AND academic_term IS NOT NULL AND length(trim(academic_term))>0 AND program_id IS NULL)
    OR (kind='PROGRAM' AND program_id IS NOT NULL
        AND curi_num IS NULL AND academic_year IS NULL AND academic_term IS NULL)),
 UNIQUE(source_system,source_key,source_revision)
);
CREATE UNIQUE INDEX core_competency_course_active ON dc.core_competency_allocation
 (curi_num,academic_year,academic_term) WHERE active AND kind='COURSE';
CREATE UNIQUE INDEX core_competency_program_active ON dc.core_competency_allocation
 (program_id) WHERE active AND kind='PROGRAM';

CREATE TABLE dc.core_competency_allocation_axis (
 allocation_id uuid NOT NULL REFERENCES dc.core_competency_allocation(id),
 competency_code text NOT NULL REFERENCES dc.core_competency(code),
 -- Canonical fraction: source 20% is imported as 0.2, without float rounding.
 ratio numeric NOT NULL CHECK(ratio BETWEEN 0 AND 1),
 -- Official per-axis points for one recognized completion; NULL means unknown.
 -- Neither credit units nor a guessed 100-point budget may substitute for this.
 allocated_points numeric CHECK(allocated_points>=0 AND allocated_points<'Infinity'::numeric),
 PRIMARY KEY(allocation_id,competency_code)
);

CREATE VIEW dc.core_competency_allocation_status AS
SELECT a.id,
 count(x.competency_code)=5 AND sum(x.ratio)=1 AS ratios_ready,
 count(x.competency_code)=5 AND sum(x.ratio)=1
   AND count(x.allocated_points)=5 AS points_ready
FROM dc.core_competency_allocation a
LEFT JOIN dc.core_competency_allocation_axis x ON x.allocation_id=a.id
GROUP BY a.id;

-- Only persisted recognition facts enter this view. Enrollment, selection and
-- attendance alone do not qualify; completion revocation disappears immediately.
CREATE VIEW dc.student_core_competency_activity AS
SELECT c.intg_uid AS student_uid,'COURSE'::text AS kind,
 c.curi_num,c.year AS academic_year,c.smt AS academic_term,
 NULL::text AS program_id,a.id AS allocation_id
FROM dc.student_course c
LEFT JOIN dc.core_competency_allocation a ON a.active AND a.kind='COURSE'
 AND a.curi_num=c.curi_num AND a.academic_year=c.year AND a.academic_term=c.smt
WHERE c.finish_yn='Y'
UNION ALL
SELECT p.student_uid,'PROGRAM',NULL,NULL,NULL,p.program_id,a.id
FROM dc.program_apply p
LEFT JOIN dc.core_competency_allocation a ON a.active AND a.kind='PROGRAM' AND a.program_id=p.program_id
WHERE p.outcome_code='COMPLETED' AND p.cancelled_at IS NULL;

-- Raw accumulated source points, NOT a 0..100 score, target, rank or diagnosis.
-- Do not silently return a partial total if any recognized activity lacks data.
CREATE VIEW dc.student_core_competency_status AS
SELECT s.intg_uid AS student_uid,count(a.kind) AS activity_count,
 count(a.kind) FILTER(WHERE a.allocation_id IS NULL) AS unmapped_count,
 CASE WHEN count(a.kind)=0 THEN 'NO_ACTIVITY'
      WHEN count(a.kind) FILTER(WHERE a.allocation_id IS NULL)>0 THEN 'ALLOCATION_MISSING'
      WHEN bool_and(coalesce(v.ratios_ready,false)) IS NOT TRUE THEN 'ALLOCATION_INCOMPLETE'
      WHEN bool_and(coalesce(v.points_ready,false)) IS NOT TRUE THEN 'POINTS_MISSING'
      ELSE 'READY' END AS status
FROM dc.student s
LEFT JOIN dc.student_core_competency_activity a ON a.student_uid=s.intg_uid
LEFT JOIN dc.core_competency_allocation_status v ON v.id=a.allocation_id
GROUP BY s.intg_uid;

CREATE VIEW dc.student_core_competency_points AS
SELECT s.student_uid,k.code AS competency_code,
 sum(x.allocated_points) AS accumulated_points
FROM dc.student_core_competency_status s
JOIN dc.student_core_competency_activity a ON a.student_uid=s.student_uid
JOIN dc.core_competency_allocation_axis x ON x.allocation_id=a.allocation_id
JOIN dc.core_competency k ON k.code=x.competency_code
WHERE s.status='READY'
GROUP BY s.student_uid,k.code;

COMMENT ON VIEW dc.student_core_competency_points IS
 'Raw source-point sum per axis. No rows for absent/incomplete evidence; no 0..100 normalization or retake policy. API must apply student access scope.';
COMMENT ON TABLE dc.core_competency_allocation IS
 'Versioned academic/program allocations. Import complete axes and activate in one transaction. No source records are seeded.';
-- Imports are owner-controlled; the runtime API can only read these objects.
REVOKE ALL ON dc.core_competency,dc.core_competency_allocation,
 dc.core_competency_allocation_axis,dc.core_competency_allocation_status,
 dc.student_core_competency_activity,dc.student_core_competency_status,
 dc.student_core_competency_points FROM PUBLIC;
GRANT SELECT ON dc.core_competency,dc.core_competency_allocation,
 dc.core_competency_allocation_axis,dc.core_competency_allocation_status,
 dc.student_core_competency_activity,dc.student_core_competency_status,
 dc.student_core_competency_points TO dc_app;
