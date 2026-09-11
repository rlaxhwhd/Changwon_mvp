-- 명단의 「상담 N회 · 비교과 N개」를 실제 실적에서 센다.
--
-- 지금까지 dc.student_list 는 두 값을 student.roster JSON 의 counselCount·programCount
-- 에서 읽었다. 그 JSON 은 최초 적재값이고 갱신 경로가 없다 — 상담을 끝내도, 프로그램을
-- 수료해도 숫자가 그대로다. HIGH·CORE 분류와 관리 통계가 이 값을 쓰므로, **실적이
-- 쌓일수록 분류가 사실과 멀어진다.**
--
-- 세는 기준(2026-09-10 팀장 결정):
--   상담   = 완료된 상담. status_code='DONE'.
--            completed_at 은 쓰지 않는다 — 완료 7 건 중 1 건에만 채워져 있어 신뢰할 수 없다.
--            유형을 가리지 않는다: 진로취업 일반·CARE 7+ 연계·심리·교수 **네 가지를 합산**한다.
--   비교과 = 수료한 것. outcome_code='COMPLETED'.
--            선발·출석은 세지 않는다 — 수료만 로드맵 칸을 닫는다는 규칙과 같은 기준이다.
--
-- 파생값을 원본 행에 저장하지 않는다(DB_SCHEMA §2). 두 표 모두 student_uid 선행
-- 인덱스가 이미 있고 학생당 행이 몇 건뿐이라 새 인덱스는 만들지 않았다.
-- 근거: .ai/db/SCHEMA_REVIEW_2026-09-10.md §4 F2

CREATE OR REPLACE VIEW dc.student_list AS
 SELECT p.intg_uid,
    p.alias,
    p.name,
    s.student_no,
    s.major_label,
    s.grade,
    COALESCE(t.student_type, s.detail ->> 'studentType'::text, s.roster ->> 'studentType'::text) AS student_type,
    c.tier_label AS tier,
    c.label AS type_label,
    COALESCE(s.detail ->> 'enrollmentStatus'::text, s.roster ->> 'status'::text, '재학'::text) AS status,
    COALESCE(s.detail ->> 'gpa'::text, s.roster ->> 'gpa'::text) AS gpa,
    COALESCE(r.pct, 0) AS progress,
    (SELECT count(*) FROM dc.program_apply a
      WHERE a.student_uid = s.intg_uid AND a.outcome_code = 'COMPLETED')::integer AS program_count,
    (SELECT count(*) FROM dc.counsel_request q
      WHERE q.student_uid = s.intg_uid AND q.status_code = 'DONE')::integer AS counsel_count,
    s.roster,
    s.detail,
    st.student_uid IS NOT NULL AS star,
    (EXISTS ( SELECT 1
           FROM dc.roadmap
          WHERE roadmap.student_uid = s.intg_uid)) AS has_roadmap
   FROM dc.student s
     JOIN dc.person p USING (intg_uid)
     LEFT JOIN LATERAL ( SELECT student_type_event.student_type
           FROM dc.student_type_event
          WHERE student_type_event.student_uid = s.intg_uid
          ORDER BY student_type_event.decided_at DESC, student_type_event.id DESC
         LIMIT 1) t ON true
     LEFT JOIN dc.student_type_code c ON c.code = COALESCE(t.student_type, s.detail ->> 'studentType'::text, s.roster ->> 'studentType'::text)
     LEFT JOIN dc.star_track st ON st.student_uid = s.intg_uid
     LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid, now()) r(done, total, pct) ON true;
