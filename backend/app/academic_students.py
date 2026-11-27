from .care7_participation import PARTICIPANT
"""Read-only academic roster, independent of service enrollment and staff assignments."""
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .academic_photo import photo_name, photo_response
from .auth import pooled_principal, principal, require_staff, is_counselor, staff_may_read, student_access
from .db import connection, pool
from .growth import academic_contact
from .jobs import MENU_PREDICATE
from .students import HIGH, CORE
from .quests import XP_PER_LEVEL, LEVELS_PER_GRADE, GRADE_CAP_XP
from .xlsx_export import workbook
from .student_contact import ACADEMIC_GRADE, ACADEMIC_LEVEL, ACADEMIC_STATUS, CONTACT_CTE, SEX_LABEL, STAGES

router = APIRouter()

# Existing granted read models only; do not provision 90,000 service accounts.
# Service metrics are evaluated once per enrolled student, not once per academic row.
ROSTER = '''WITH service AS MATERIALIZED (
  SELECT v.intg_uid,student_type,type_label,tier,gpa,progress,
    program_count + (SELECT count(*) FROM dc.student_program_history h
      WHERE h.intg_uid=v.intg_uid AND h.completed AND NOT EXISTS(SELECT 1 FROM dc.program_apply a
        WHERE a.student_uid=h.intg_uid AND a.program_id=h.program_id)) AS program_count,
    counsel_count,star,has_roadmap
  FROM dc.student_list v
), roster AS (
  SELECT a.intg_uid, a.student_no, a.name,
    COALESCE(NULLIF(a.dept_name,''),'소속 미등록') AS major_label,
    a.college_name,
    x.sex_code, ''' + SEX_LABEL + ''' AS sex,
    CASE WHEN a.hofc_sta_cd='0005' AND x.out_dt ~ '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$'
      THEN substring(x.out_dt,1,4)||'-'||substring(x.out_dt,5,2) END AS graduation_month,
    ''' + ACADEMIC_GRADE + ''' AS grade,
    ''' + ACADEMIC_LEVEL + ''' AS academic_level,
    ''' + ACADEMIC_STATUS + ''' AS status,
    v.student_type,v.type_label,v.tier,x.academic_gpa::text AS gpa,COALESCE(v.progress,0) AS progress,
    COALESCE(v.program_count,0) AS program_count,COALESCE(v.counsel_count,0) AS counsel_count,
    COALESCE(v.star,false) AS star,COALESCE(v.has_roadmap,false) AS has_roadmap
  FROM dc.student_login_source a
  JOIN dc.academic_student_details x USING(intg_uid)
  LEFT JOIN service v USING(intg_uid)
)'''


# 교수·조교(0022): 배정 범위를 roster CTE 안 한 곳에만 건다 — 목록·메타 집계·옵션·diagnosed 변형이
# 같은 모집단을 본다. roster CTE 의 유일한 자리표시자이므로 값 목록 맨 앞에 교직원 uid 를 둔다.
STAFF_SCOPE = '''
  WHERE EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=a.intg_uid)
)'''


def roster_query(diagnosed=False, scoped=False):
    """Diagnosis filters need identity/type/STAR, not per-student activity totals."""
    query = diagnosed_roster() if diagnosed else ROSTER
    if scoped:
        assert query.endswith('LEFT JOIN service v USING(intg_uid)\n)')
        query = query[:-2] + STAFF_SCOPE
    return query


def diagnosed_roster():
    academic = ROSTER[ROSTER.index('), roster AS ('):]
    return '''WITH diagnosed_students AS MATERIALIZED (
      SELECT DISTINCT student_uid AS intg_uid FROM dc.diagnosis_attempt
      WHERE status_code IN ('DONE','REVIEW','INCOMPLETE')
    ), academic_population AS MATERIALIZED (
      SELECT a.* FROM dc.student_login_source a JOIN diagnosed_students d USING(intg_uid)
    ), service AS MATERIALIZED (
      SELECT s.intg_uid,t.student_type,c.label AS type_label,c.tier_label AS tier,
        0 AS progress,0 AS program_count,0 AS counsel_count,false AS has_roadmap,
        st.student_uid IS NOT NULL AS star
      FROM diagnosed_students ds JOIN dc.student s USING(intg_uid)
      LEFT JOIN dc.current_student_type t ON t.student_uid=s.intg_uid
      LEFT JOIN dc.student_type_code c ON c.code=t.student_type
      LEFT JOIN dc.star_track st ON st.student_uid=s.intg_uid
    ''' + academic.replace('FROM dc.student_login_source a', 'FROM academic_population a')


# Applied only after pagination (or selection for export), in the same SQL snapshot.
PAGE_METRICS = '''LEFT JOIN LATERAL (
  SELECT COALESCE(v.progress,0) AS progress,COALESCE(v.has_roadmap,false) AS has_roadmap,
    COALESCE(v.counsel_count,0) AS counsel_count,
    COALESCE(v.program_count,0) + (SELECT count(*) FROM dc.student_program_history h
      WHERE h.intg_uid=p.intg_uid AND h.completed AND NOT EXISTS(
        SELECT 1 FROM dc.program_apply a WHERE a.student_uid=h.intg_uid AND a.program_id=h.program_id)) AS program_count
  FROM dc.student_list v WHERE v.intg_uid=p.intg_uid
) metrics ON true'''


RETAKE_PENDING = "EXISTS(SELECT 1 FROM dc.diagnosis_retake q WHERE q.student_uid=roster.intg_uid AND q.status='PENDING')"


def authorize(conn, user):
    """True when the viewer is limited to their own student scope (professor·assistant, 0022)."""
    require_staff(user)
    if conn.execute(MENU_PREDICATE, ('students.1', user['intg_uid'], user['intg_uid'])).fetchone()['ok']:
        scoped = False
    elif conn.execute("SELECT 1 FROM dc.staff WHERE intg_uid=%s AND role_code IN ('professor','assistant')",
                      (user['intg_uid'],)).fetchone():
        # 범위 뷰의 학과 배정 가지와 같은 근거(dc.staff.role_code)로 판정한다.
        scoped = True
    else:
        raise HTTPException(403, '전체 학생 목록 조회 권한이 없습니다.')
    # These read-model joins trigger costly LLVM compilation for a short paged query.
    # Keep this transaction-local; do not change database-wide tuning.
    conn.execute('SET LOCAL jit=off')
    return scoped


def filters(request, q):
    where, values = [], []
    if request.query_params.get('filters.diagnosed') == 'Y':
        where.append("EXISTS(SELECT 1 FROM dc.diagnosis_attempt a WHERE a.student_uid=roster.intg_uid AND a.status_code IN ('DONE','REVIEW','INCOMPLETE'))")
    if request.query_params.get('filters.retakePending') == 'Y':
        where.append(RETAKE_PENDING)
    contact = request.query_params.get('filters.contact')
    if contact in STAGES:
        where.append('intg_uid IN (' + CONTACT_CTE + ' SELECT intg_uid FROM contact WHERE ' + STAGES[contact] + ')')
    # 학사 성별은 '0' 남 · 그 외 여(haksa.md). '1' 필터는 '0' 이 아닌 값(NULL 제외)으로 읽는다.
    sex = request.query_params.get('filters.sex')
    if sex:
        where.append("sex_code='0'" if sex == '0' else "sex_code<>'0'")
    for field, column in {'major':'major_label','grade':'grade::text',
                          'studentType':'student_type','status':'status','academicLevel':'academic_level',
                          'college':'college_name'}.items():
        value = request.query_params.get('filters.' + field)
        if value:
            where.append(f'{column}=%s')
            values.append(value)
    start, end = (request.query_params.get('filters.' + key) for key in ('graduationFrom','graduationTo'))
    for value, operator in ((start, '>='), (end, '<=')):
        if value:
            try:
                if datetime.strptime(value, '%Y-%m').strftime('%Y-%m') != value:
                    raise ValueError()
            except ValueError:
                raise HTTPException(422, '졸업년월은 YYYY-MM 형식으로 입력해 주세요.') from None
            where.append(f'graduation_month {operator} %s')
            values.append(value)
    if start and end and start > end:
        raise HTTPException(422, '졸업년월 시작은 종료보다 늦을 수 없습니다.')
    focus = request.query_params.get('filters.focus')
    if focus in ('high', 'core', 'star', 'care7'):
        where.append({'high': HIGH, 'core': CORE, 'star': 'star', 'care7': PARTICIPANT}[focus])
    if q.strip():
        where.append("concat_ws(' ',name,student_no,major_label,type_label) ILIKE %s")
        values.append('%' + q.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%')
    return ' AND '.join(f'({part})' for part in where) or 'true', values


@router.get('/academic-students/metadata')
def metadata(diagnosed: bool = False, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    scoped = authorize(conn, user)
    roster = roster_query(diagnosed, scoped)
    pending = RETAKE_PENDING if diagnosed else 'false'
    row = conn.execute(roster + f''' SELECT count(*) AS total,
      count(*) FILTER(WHERE tier='하위') AS "focusCount",
      count(*) FILTER(WHERE {HIGH}) AS "highRiskCount",
      count(*) FILTER(WHERE {CORE}) AS "coreCareCount",count(*) FILTER(WHERE star) AS "starCount",count(*) FILTER(WHERE {PARTICIPANT}) AS "care7Count",
      count(*) FILTER(WHERE {pending}) AS "retakePendingCount",
      ARRAY(SELECT major_label FROM roster GROUP BY major_label ORDER BY major_label) AS majors,
      ARRAY(SELECT college_name FROM (SELECT college_name COLLATE "C" AS college_name FROM roster WHERE college_name IS NOT NULL GROUP BY 1) g
        ORDER BY college_name COLLATE "default") AS colleges,
      ARRAY(SELECT grade FROM roster WHERE grade IS NOT NULL GROUP BY grade ORDER BY grade) AS grades,
      ARRAY(SELECT student_type FROM roster WHERE student_type IS NOT NULL GROUP BY student_type ORDER BY student_type) AS types,
      ARRAY(SELECT tier FROM roster WHERE tier IS NOT NULL GROUP BY tier ORDER BY tier) AS tiers,
      ARRAY(SELECT status FROM roster GROUP BY status ORDER BY status) AS statuses,
      (SELECT json_object_agg(college_name, majors) FROM (SELECT college_name, array_agg(major_label ORDER BY major_label) AS majors
        FROM (SELECT college_name COLLATE "C" AS college_name, major_label COLLATE "C" AS major_label
          FROM roster WHERE college_name IS NOT NULL GROUP BY 1,2) p GROUP BY college_name) c) AS "collegeMajors" FROM roster''', [user['intg_uid']] if scoped else None).fetchone()
    # collegeMajors — 대학을 고르면 학과 목록을 그 대학 소속으로 좁힌다. 학과 트리 이름 매칭이 아니라 학적 행의 (대학, 학과) 쌍이다.
    # 9만 행을 기본(한국어) 정렬로 묶으면 5초 넘게 걸려 "C" 정렬로 묶는다(2026-10-28 측정 +5.8s → +0.1s).
    return {'summary': {k: row[k] for k in ('total','focusCount','highRiskCount','coreCareCount','starCount','care7Count','retakePendingCount')},
            'options': {**{k: row[k] or [] for k in ('majors','colleges','grades','types','tiers','statuses')}, 'collegeMajors': row['collegeMajors'] or {}}}


@router.get('/academic-students')
def students(request: Request, page: int = Query(1, ge=1), pageSize: int = Query(100, ge=1, le=300),
             q: str = Query('', max_length=200), user=Depends(principal, scope='function'),
             conn=Depends(connection, scope='function')):
    scoped = authorize(conn, user)
    condition, values = filters(request, q)
    diagnosed = request.query_params.get('filters.diagnosed') == 'Y'
    items = 'to_jsonb(p)'
    joins = ''
    if diagnosed:
        joins = PAGE_METRICS
        items = "to_jsonb(p) || jsonb_build_object('progress',COALESCE(metrics.progress,0),'has_roadmap',COALESCE(metrics.has_roadmap,false),'program_count',COALESCE(metrics.program_count,0),'counsel_count',COALESCE(metrics.counsel_count,0))"
    # Count and page share one snapshot; ties remain stable between pages.
    result = conn.execute(roster_query(diagnosed, scoped) + f''', filtered AS MATERIALIZED (
      SELECT * FROM roster WHERE {condition}
    ), paged AS MATERIALIZED (SELECT * FROM filtered ORDER BY name NULLS LAST,student_no,intg_uid LIMIT %s OFFSET %s)
    SELECT (SELECT count(*) FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg({items} ORDER BY p.name NULLS LAST,p.student_no,p.intg_uid) FROM paged p {joins}),'[]'::jsonb) AS items''',
      [*([user['intg_uid']] if scoped else []), *values, pageSize, (page-1)*pageSize]).fetchone()
    # 범위 모드의 행은 모두 범위 안이다 — 열람 가능 여부를 다시 묻지 않는다.
    readable = set() if scoped else {r['student_uid'] for r in conn.execute('''SELECT student_uid FROM dc.staff_student_scope
      WHERE staff_uid=%s AND student_uid=ANY(%s) UNION SELECT student_uid FROM dc.counsel_request
      WHERE counselor_uid=%s AND student_uid=ANY(%s)''',
      (user['intg_uid'], [r['intg_uid'] for r in result['items']],
       user['intg_uid'], [r['intg_uid'] for r in result['items']])).fetchall()}
    return {'items': [dict(id=r['intg_uid'], studentNo=r['student_no'],name=r['name'],
             major=r['major_label'],collegeName=r['college_name'],grade=r['grade'],
             sex=r['sex'],sexCode=r['sex_code'],graduationMonth=r['graduation_month'],gpa=r['gpa'],
             academicLevel=r['academic_level'],status=r['status'],studentType=r['student_type'],star=r['star'],
             tier=r['tier'],progress=r['progress'],hasRoadmap=r['has_roadmap'],hasDetail=False,
             canReadDetail=scoped or is_counselor(user) or r['intg_uid'] in readable,
             programCount=r['program_count'],counselCount=r['counsel_count']) for r in result['items']],
            'totalCount': result['total'], 'page': page, 'pageSize': pageSize}


class StudentExportSelection(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=100000)


@router.post('/academic-students/export')
def export(request: Request, body: StudentExportSelection, q: str = Query('', max_length=200),
           user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if authorize(conn, user):
        # 교수·조교 화면에는 내보내기가 없다 — 범위 열람을 내보내기로 넓히지 않는다.
        raise HTTPException(403, '학생 목록 내보내기 권한이 없습니다.')
    condition, values = filters(request, q)
    condition += ' AND intg_uid = ANY(%s)'
    values.append(list(dict.fromkeys(body.ids)))
    diagnosed = request.query_params.get('filters.diagnosed') == 'Y'
    counts = 'COALESCE(metrics.counsel_count,0) AS counsel_count,COALESCE(metrics.program_count,0) AS program_count' if diagnosed else 'p.counsel_count,p.program_count'
    # Export selected matching rows, independent of the current page. Server cursor and
    # spooled ZIP keep the full roster out of application memory.
    with conn.cursor(name='academic_student_export') as cursor:
        cursor.execute(roster_query(diagnosed) + f''', selected AS MATERIALIZED (
          SELECT * FROM roster WHERE {condition}
        ) SELECT p.student_no,p.name,p.college_name,p.major_label,p.academic_level,
          p.grade,p.status,p.sex,p.graduation_month,p.gpa,p.type_label,{counts}
          FROM selected p {PAGE_METRICS if diagnosed else ''}
          ORDER BY p.name NULLS LAST,p.student_no,p.intg_uid''', values)
        output = workbook(['학번','이름','대학','학과','학부/대학원','학년','학적','성별','졸업년월',
                           '학점','진단 유형','완료 상담횟수(현재 시스템)','비교과 이수(현재 시스템)'],
                          (row.values() for row in cursor))
    def chunks():
        try:
            while chunk := output.read(64*1024):
                yield chunk
        finally:
            output.close()
    return StreamingResponse(chunks(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': "attachment; filename*=UTF-8''"+quote('학생목록.xlsx'), 'Cache-Control':'no-store'})


def academic_subject(conn, user, identity, lookup):
    """detail()·photo 공통: authorize → intg_uid 직접 → 서비스 alias 해석 → 범위. 범위 밖은 row=None(존재 비노출).
    lookup(uid) 는 학사 행 1개 또는 None — detail 은 ROSTER 를, photo 는 가벼운 점조회를 넘긴다."""
    scoped = authorize(conn, user)
    row = lookup(identity)
    if not row:
        # Other entry points use the service alias. Resolve it on the server,
        # then run the identical academic read model and activity aggregation.
        person = conn.execute('SELECT intg_uid FROM dc.person WHERE alias=%s AND kind=\'STUDENT\'', (identity,)).fetchone()
        if person:
            identity = person['intg_uid']
            row = lookup(identity)
    if row and scoped and not staff_may_read(conn, user, identity):
        # 범위 밖은 학사 행이 없는 학생과 같은 응답 — 존재 여부를 알리지 않는다.
        row = None
    return identity, row


# 사진 경로의 존재 판정 — ROSTER 와 같은 조건(student_login_source ⋈ academic_student_details)이되
# service CTE(전체 student_list)를 돌지 않는 점조회.
PHOTO_LOOKUP = '''SELECT d.photo_file FROM dc.student_login_source a
  JOIN dc.academic_student_details d USING(intg_uid) WHERE a.intg_uid=%s'''


@router.get('/academic-students/{identity}/photo')
def photo(identity: str, user=Depends(pooled_principal)):
    """학사 증명사진(0025) — detail() 과 같은 권한·범위 판정. 범위 밖은 학사 행 없음과 같은 404.
    상류를 기다리는 동안 DB 커넥션을 쥐지 않는다: 판정·파일명은 블록 안, 사진 서버 호출은 블록 밖."""
    with pool.connection() as conn:
        _, row = academic_subject(conn, user, identity, lambda uid: conn.execute(PHOTO_LOOKUP, (uid,)).fetchone())
        if not row:
            raise HTTPException(404, '학사 학생정보가 없습니다.')
        name = photo_name(row['photo_file'])
    return photo_response(name)


@router.get('/academic-students/{identity}')
def detail(identity: str, optional: bool = False, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    identity, row = academic_subject(
        conn, user, identity, lambda uid: conn.execute(ROSTER+' SELECT * FROM roster WHERE intg_uid=%s', (uid,)).fetchone())
    if not row:
        if optional:
            # Legacy service-only fixtures have no academic source. Only allow
            # their existing scoped detail, never hide authorization failures.
            student_access(conn, user, identity)
            return None
        raise HTTPException(404, '학사 학생정보가 없습니다.')
    # Expose activity summaries, not counselor notes/intake/psychological records.
    # care_track 을 함께 낸다 — 요약 카드가 진로취업을 일반/CARE 7+ 로 가른다(counselTrack.ts).
    counsels = conn.execute('''SELECT id,legacy_type AS type,status_code AS status,
      care_track AS "careTrack",
      COALESCE(slot_date,requested_at::date) AS date FROM dc.counsel_request
      WHERE student_uid=%s AND status_code IN ('REQ','CONFIRMED','DONE')
      ORDER BY date DESC,id''', (identity,)).fetchall()
    programs = conn.execute('''SELECT a.program_id AS id,p.title,a.applied_at::date AS date,
      a.outcome_code='COMPLETED' AS completed FROM dc.program_apply a JOIN dc.program p ON p.id=a.program_id
      WHERE a.student_uid=%s
      UNION ALL SELECT h.program_id,h.title,h.applied_at,h.completed FROM dc.student_program_history h
      WHERE h.intg_uid=%s AND NOT EXISTS(SELECT 1 FROM dc.program_apply a
        WHERE a.student_uid=h.intg_uid AND a.program_id=h.program_id)
      ORDER BY date DESC,id''', (identity,identity)).fetchall()
    diagnoses = conn.execute("SELECT count(*) AS n FROM dc.diagnosis_attempt WHERE student_uid=%s AND status_code='DONE'", (identity,)).fetchone()['n']
    # 외국인 여부·연락처·주소는 상세에서만 쓰여 목록용 roster 에 넣지 않고 한 행만 읽는다. Y/N 밖의 값은 미상(None).
    # 연락처·주소(0023)는 범위 검사를 통과한 이 상세에서만 나간다 — ROSTER·목록·export 에 넣지 않는다.
    # 0024: 학생 본인 GET 과 같은 공통 함수 하나로 읽는다(한 문장 — 다전공 포함). 날짜·졸업예정 가공도 거기서만 한다.
    details = academic_contact(conn, identity) or {}
    # 전공(MAJOR_CD)은 학과(HAKBU_CD)와 별개다 — 기본사항 탭의 「전공」. 전공 코드는 MAJOR_INF 에서 고유하다(782/782).
    major = conn.execute('''SELECT o.dept_nm FROM dc.academic_people p
      JOIN dc.academic_organizations o ON o.lvl='3' AND o.dept_cd=p.major_cd::text
      WHERE p.intg_uid=%s''', (identity,)).fetchone()
    # 성장 레벨 — 학생 라운지(/quests/dashboard)와 같은 학년 기준 값. 학년 XP 는 원장에서 파생한다.
    grade_xp = conn.execute('''SELECT s.grade,coalesce(sum(e.granted_xp),0)::bigint AS xp FROM dc.student s
      LEFT JOIN dc.growth_xp_event e ON e.student_uid=s.intg_uid AND e.grade=s.grade
      WHERE s.intg_uid=%s GROUP BY s.grade''', (identity,)).fetchone()
    q_grade = grade_xp['grade'] if grade_xp and grade_xp['grade'] else row['grade']
    q_xp = int(grade_xp['xp']) if grade_xp else 0
    q_cap = LEVELS_PER_GRADE if q_grade and q_grade > 0 else None
    at_cap = q_cap is not None and q_xp >= GRADE_CAP_XP
    quest = dict(grade=q_grade, level=q_xp // XP_PER_LEVEL, levelCap=q_cap, atCap=at_cap,
                 xpInLevel=XP_PER_LEVEL if at_cap else q_xp % XP_PER_LEVEL, xpPerLevel=XP_PER_LEVEL)
    return dict(quest=quest,id=identity,studentNo=row['student_no'],name=row['name'],major=row['major_label'],star=row['star'],
      collegeName=row['college_name'],grade=row['grade'],academicLevel=row['academic_level'],
      status=row['status'],sex=row['sex'],foreigner=details.get('foreigner'),graduationMonth=row['graduation_month'],gpa=row['gpa'],
      # 졸업예정년월(GRAD_EXP_YM → YYYY-MM) — 졸업생은 graduationMonth 가 있고, 재학생은 졸업사정 등록자만 있다.
      majorName=major['dept_nm'] if major else None,graduationExpectedMonth=details.get('graduationExpectedMonth'),
      studentType=row['student_type'],diagnosisCount=diagnoses,counsels=counsels,programs=programs,
      progress=row['progress'],hasRoadmap=row['has_roadmap'],
      # 서비스 학생 행이 있을 때만 화면이 범위 프로필(/students/{id})을 다시 읽는다 — 미이용 학사 학생의 404 왕복 제거(0022).
      hasServiceProfile=grade_xp is not None,
      mobile=details.get('mobile'),email=details.get('email'),postCode=details.get('postCode'),address=details.get('address'),
      homePhone=details.get('homePhone'),birthDate=details.get('birthDate'),admissionDate=details.get('admissionDate'),
      completedSemesters=details.get('completedSemesters'),majors=details.get('majors', []),
      # 증명사진(0025) — 파일명이 아니라 범위 검사를 거치는 프록시 경로만. 경로의 id 는 응답 id 와 같다.
      photoUrl=f"/api/v1/academic-students/{quote(identity, safe='')}/photo" if details.get('hasPhoto') else None)
