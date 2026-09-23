from .care7_participation import PARTICIPANT
"""Read-only academic roster, independent of service enrollment and staff assignments."""
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .auth import principal, require_staff, is_counselor
from .db import connection
from .jobs import MENU_PREDICATE
from .students import HIGH, CORE
from .xlsx_export import workbook
from .student_contact import CONTACT_CTE, STAGES

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
    COALESCE(NULLIF(a.dept_name,''),d.dept_nm,m.dept_nm,'소속 미등록') AS major_label,
    c.dept_nm AS college_name,
    x.sex_code, CASE x.sex_code WHEN '0001' THEN '남자' WHEN '0002' THEN '여자' ELSE '없음' END AS sex,
    CASE WHEN a.hofc_sta_cd='0005' AND x.out_dt ~ '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$'
      THEN substring(x.out_dt,1,4)||'-'||substring(x.out_dt,5,2) END AS graduation_month,
    CASE WHEN a.stu_schgr ~ '^[0-9]{1,2}$' THEN a.stu_schgr::int END AS grade,
    CASE WHEN a.user_ty_cd IN ('1201','1202') THEN '대학원' ELSE '학부' END AS academic_level,
    CASE a.hofc_sta_cd WHEN '0001' THEN '재학' WHEN '0002' THEN '휴학'
      WHEN '0003' THEN '제적' WHEN '0004' THEN '수료' WHEN '0005' THEN '졸업' ELSE '미상' END AS status,
    v.student_type,v.type_label,v.tier,x.academic_gpa::text AS gpa,COALESCE(v.progress,0) AS progress,
    COALESCE(v.program_count,0) AS program_count,COALESCE(v.counsel_count,0) AS counsel_count,
    COALESCE(v.star,false) AS star,COALESCE(v.has_roadmap,false) AS has_roadmap
  FROM dc.student_login_source a
  JOIN dc.academic_people p USING(intg_uid)
  JOIN dc.academic_student_details x USING(intg_uid)
  LEFT JOIN dc.academic_organizations d ON d.dept_cd=p.hakbu_cd
  LEFT JOIN dc.academic_organizations m ON m.dept_cd=a.dept_code
  LEFT JOIN dc.academic_organizations c ON c.dept_cd=a.college_code
  LEFT JOIN service v USING(intg_uid)
)'''


def authorize(conn, user):
    require_staff(user)
    if not conn.execute(MENU_PREDICATE, ('students.1', user['intg_uid'], user['intg_uid'])).fetchone()['ok']:
        raise HTTPException(403, '전체 학생 목록 조회 권한이 없습니다.')
    # These read-model joins trigger costly LLVM compilation for a short paged query.
    # Keep this transaction-local; do not change database-wide tuning.
    conn.execute('SET LOCAL jit=off')


def filters(request, q):
    where, values = [], []
    contact = request.query_params.get('filters.contact')
    if contact in STAGES:
        where.append('intg_uid IN (' + CONTACT_CTE + ' SELECT intg_uid FROM contact WHERE ' + STAGES[contact] + ')')
    for field, column in {'major':'major_label','grade':'grade::text',
                          'studentType':'student_type','status':'status','academicLevel':'academic_level',
                          'sex':'sex_code','college':'college_name'}.items():
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
def metadata(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    authorize(conn, user)
    row = conn.execute(ROSTER + f''' SELECT count(*) AS total,
      count(*) FILTER(WHERE tier='하위') AS "focusCount",
      count(*) FILTER(WHERE {HIGH}) AS "highRiskCount",
      count(*) FILTER(WHERE {CORE}) AS "coreCareCount",count(*) FILTER(WHERE star) AS "starCount",count(*) FILTER(WHERE {PARTICIPANT}) AS "care7Count",
      ARRAY(SELECT major_label FROM roster GROUP BY major_label ORDER BY major_label) AS majors,
      ARRAY(SELECT college_name FROM roster WHERE college_name IS NOT NULL GROUP BY college_name ORDER BY college_name) AS colleges,
      ARRAY(SELECT grade FROM roster WHERE grade IS NOT NULL GROUP BY grade ORDER BY grade) AS grades,
      ARRAY(SELECT student_type FROM roster WHERE student_type IS NOT NULL GROUP BY student_type ORDER BY student_type) AS types,
      ARRAY(SELECT tier FROM roster WHERE tier IS NOT NULL GROUP BY tier ORDER BY tier) AS tiers,
      ARRAY(SELECT status FROM roster GROUP BY status ORDER BY status) AS statuses FROM roster''').fetchone()
    return {'summary': {k: row[k] for k in ('total','focusCount','highRiskCount','coreCareCount','starCount','care7Count')},
            'options': {k: row[k] or [] for k in ('majors','colleges','grades','types','tiers','statuses')}}


@router.get('/academic-students')
def students(request: Request, page: int = Query(1, ge=1), pageSize: int = Query(100, ge=1, le=300),
             q: str = Query('', max_length=200), user=Depends(principal, scope='function'),
             conn=Depends(connection, scope='function')):
    authorize(conn, user)
    condition, values = filters(request, q)
    # Count and page share one snapshot; ties remain stable between pages.
    result = conn.execute(ROSTER + f''', filtered AS MATERIALIZED (
      SELECT * FROM roster WHERE {condition}
    ), paged AS (SELECT * FROM filtered ORDER BY name NULLS LAST,student_no,intg_uid LIMIT %s OFFSET %s)
    SELECT (SELECT count(*) FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY name NULLS LAST,student_no,intg_uid) FROM paged p),'[]'::jsonb) AS items''',
      [*values, pageSize, (page-1)*pageSize]).fetchone()
    readable = {r['student_uid'] for r in conn.execute('''SELECT student_uid FROM dc.staff_student_scope
      WHERE staff_uid=%s AND student_uid=ANY(%s) UNION SELECT student_uid FROM dc.counsel_request
      WHERE counselor_uid=%s AND student_uid=ANY(%s)''',
      (user['intg_uid'], [r['intg_uid'] for r in result['items']],
       user['intg_uid'], [r['intg_uid'] for r in result['items']])).fetchall()}
    return {'items': [dict(id=r['intg_uid'], studentNo=r['student_no'],name=r['name'],
             major=r['major_label'],collegeName=r['college_name'],grade=r['grade'],
             sex=r['sex'],sexCode=r['sex_code'],graduationMonth=r['graduation_month'],gpa=r['gpa'],
             academicLevel=r['academic_level'],status=r['status'],studentType=r['student_type'],star=r['star'],
             tier=r['tier'],progress=r['progress'],hasRoadmap=r['has_roadmap'],hasDetail=False,
             canReadDetail=is_counselor(user) or r['intg_uid'] in readable,
             programCount=r['program_count'],counselCount=r['counsel_count']) for r in result['items']],
            'totalCount': result['total'], 'page': page, 'pageSize': pageSize}


class StudentExportSelection(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=100000)


@router.post('/academic-students/export')
def export(request: Request, body: StudentExportSelection, q: str = Query('', max_length=200),
           user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    authorize(conn, user)
    condition, values = filters(request, q)
    condition += ' AND intg_uid = ANY(%s)'
    values.append(list(dict.fromkeys(body.ids)))
    # Export selected matching rows, independent of the current page. Server cursor and
    # spooled ZIP keep the full roster out of application memory.
    with conn.cursor(name='academic_student_export') as cursor:
        cursor.execute(ROSTER + f''' SELECT student_no,name,college_name,major_label,academic_level,
          grade,status,sex,graduation_month,gpa,type_label,counsel_count,program_count
          FROM roster WHERE {condition} ORDER BY name NULLS LAST,student_no,intg_uid''', values)
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


@router.get('/academic-students/{identity}')
def detail(identity: str, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    authorize(conn, user)
    row = conn.execute(ROSTER+' SELECT * FROM roster WHERE intg_uid=%s', (identity,)).fetchone()
    if not row:
        raise HTTPException(404, '학사 학생정보가 없습니다.')
    # Expose activity summaries, not counselor notes/intake/psychological records.
    counsels = conn.execute('''SELECT id,legacy_type AS type,status_code AS status,
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
    return dict(id=identity,studentNo=row['student_no'],name=row['name'],major=row['major_label'],star=row['star'],
      collegeName=row['college_name'],grade=row['grade'],academicLevel=row['academic_level'],
      status=row['status'],sex=row['sex'],graduationMonth=row['graduation_month'],gpa=row['gpa'],
      studentType=row['student_type'],diagnosisCount=diagnoses,counsels=counsels,programs=programs,
      progress=row['progress'],hasRoadmap=row['has_roadmap'])
