"""비교과 운영 — 신청·선발·출석·수료를 각각 다른 시점의 사실로 다룬다.

수료(COMPLETED)만 로드맵 칸을 닫는다(spec_v1 §7.2). 선발·출석은 닫지 않는다.
벌점은 합계를 저장하지 않고 부여·회수 행을 쌓아 합으로 읽는다.
"""
import hashlib
from datetime import date, datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .auth import principal, require_staff, student_access
from .db import connection
from .gates import program_gate
# 로드맵 쓰기는 전부 roadmap.py 가 한다 — 칸을 두 모듈에서 만들면 규칙이 갈린다.
from .roadmap import enroll_program, lifecycle_lock, linked_cells, program_expiry

router = APIRouter()

NOSHOW_POINTS = 10
SEOUL = ZoneInfo('Asia/Seoul')
WRITABLE = ('title,summary,detail,category_code,status_code,apply_start,apply_end,run_start,run_end,sessions,'
            'manager,fiscal_year,location,image,capacity,pinned,roadmap_entry,care_types,satisfaction_survey,'
            'satisfaction_form_id,competency_survey,competency_areas,include_in_stats')
PROGRAM_COLUMNS = 'id,' + WRITABLE + ',created_at,version'


def today():
    return datetime.now(SEOUL).date()


def program_dto(row, applicants):
    return {
        'id': row['id'], 'title': row['title'], 'desc': row['summary'], 'detail': row['detail'],
        'category': row['category_code'], 'status': row['status_code'],
        'careTypes': row['care_types'], 'roadmapEntry': row['roadmap_entry'],
        'startDate': row['apply_start'], 'endDate': row['apply_end'],
        'runStartDate': row['run_start'], 'runEndDate': row['run_end'],
        'sessions': row['sessions'], 'manager': row['manager'], 'fiscalYear': row['fiscal_year'],
        'capacity': row['capacity'], 'image': row['image'], 'location': row['location'],
        'pinned': row['pinned'], 'satisfactionSurvey': row['satisfaction_survey'],
        'satisfactionFormId': row['satisfaction_form_id'],
        'competencySurvey': row['competency_survey'], 'competencyAreas': row['competency_areas'],
        'includeInStats': row['include_in_stats'], 'createdAt': row['created_at'],
        'version': row['version'], 'applicants': applicants,
    }


def applicant_dto(row):
    snapshot = row['snapshot'] or {}
    return {
        'studentId': row['alias'], 'studentName': snapshot.get('studentName') or row['name'],
        'studentMajor': snapshot.get('studentMajor') or row['major_label'],
        'studentNo':row.get('student_no'), 'studentGrade':row.get('grade'),
        'studentStatus':row.get('student_status'), 'studentType':row.get('student_type'),
        'appliedAt': row['applied_at'], 'canceledAt': row['cancelled_at'],
        'attendance': row['attendance_code'], 'round': row['round_no'],
        'selectionStatus': row['selection_code'], 'selectedAt': row['selected_at'],
        'outcomeStatus': row['outcome_code'], 'absencePoints': row['absence_points'],
        # 선발 판단에 쓰는 값이라 행에 실어 보낸다 — 화면이 학생마다 다시 묻지 않게.
        'penaltyTotal': row.get('penalty_total') or 0, 'version': row['version'],
    }


def applicant_scope(user):
    """학생은 자기 신청만, 교직원은 담당 범위의 학생만 본다."""
    if user['kind'] == 'STUDENT':
        return 'a.student_uid=%s', [user['intg_uid']]
    return ('EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=a.student_uid)',
            [user['intg_uid']])


def applicants_of(conn, user, program_ids):
    if not program_ids:
        return {}
    condition, values = applicant_scope(user)
    rows = conn.execute(f'''SELECT a.*,p.alias,p.name,s.major_label,s.student_no,s.grade,
      COALESCE(s.detail->>'enrollmentStatus','재학') AS student_status,
      (SELECT e.student_type FROM dc.student_type_event e WHERE e.student_uid=s.intg_uid ORDER BY e.decided_at DESC,e.id DESC LIMIT 1) AS student_type,
      t.total AS penalty_total
      FROM dc.program_apply a JOIN dc.person p ON p.intg_uid=a.student_uid
      JOIN dc.student s ON s.intg_uid=a.student_uid
      LEFT JOIN dc.penalty_total t ON t.student_uid=a.student_uid
      WHERE a.program_id=ANY(%s) AND ({condition}) ORDER BY a.applied_at,p.alias''',
      [program_ids, *values]).fetchall()
    grouped = {pid: [] for pid in program_ids}
    for row in rows:
        grouped[row['program_id']].append(applicant_dto(row))
    return grouped


@router.get('/programs')
def programs(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
             q: str = Query('', max_length=200), category: str | None = None, status: str | None = None,
             user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    where, values = ['true'], []
    if category:
        where.append('category_code=%s')
        values.append(category)
    if status:
        where.append('status_code=%s')
        values.append(status)
    if q.strip():
        where.append("concat_ws(' ',title,summary,location,manager) ILIKE %s")
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    condition = ' AND '.join(f'({x})' for x in where)
    total = conn.execute('SELECT count(*) AS n FROM dc.program WHERE ' + condition, values).fetchone()['n']
    rows = conn.execute(f'''SELECT {PROGRAM_COLUMNS} FROM dc.program WHERE {condition}
      ORDER BY pinned DESC,created_at DESC,id LIMIT %s OFFSET %s''',
      [*values, pageSize, (page - 1) * pageSize]).fetchall()
    grouped = applicants_of(conn, user, [r['id'] for r in rows])
    return dict(items=[program_dto(r, grouped[r['id']]) for r in rows],
                totalCount=total, page=page, pageSize=pageSize)


def get_program(conn, program_id, lock=False):
    row = conn.execute(f'SELECT {PROGRAM_COLUMNS} FROM dc.program WHERE id=%s'
                       + (' FOR UPDATE' if lock else ''), (program_id,)).fetchone()
    if not row:
        raise HTTPException(404, '프로그램을 찾을 수 없습니다.')
    return row


@router.get('/programs/statistics')
def statistics(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    # 통계 제외로 표시된 프로그램은 모수에서 뺀다.
    summary = conn.execute('''SELECT count(*)::int AS programs,
      count(*) FILTER(WHERE status_code='RECRUITING')::int AS recruiting,
      COALESCE(sum(capacity),0)::int AS capacity FROM dc.program WHERE include_in_stats''').fetchone()
    rows = conn.execute('''SELECT p.id,p.title,p.category_code,p.status_code,p.capacity,
      count(a.*)::int AS applied,
      count(*) FILTER(WHERE a.selection_code='SELECTED')::int AS selected,
      count(*) FILTER(WHERE a.attendance_code='PRESENT')::int AS attended,
      count(*) FILTER(WHERE a.outcome_code='COMPLETED')::int AS completed,
      count(*) FILTER(WHERE a.attendance_code='NO_SHOW' OR a.outcome_code='ABSENT')::int AS absent
      FROM dc.program p LEFT JOIN dc.program_apply a ON a.program_id=p.id AND a.cancelled_at IS NULL
      WHERE p.include_in_stats GROUP BY p.id ORDER BY p.created_at DESC,p.id''').fetchall()
    return {'summary': {**summary, 'applied': sum(r['applied'] for r in rows),
                        'completed': sum(r['completed'] for r in rows)},
            'programs': rows}


@router.get('/programs/{program_id}')
def program_detail(program_id: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    row = get_program(conn, program_id)
    return program_dto(row, applicants_of(conn, user, [program_id])[program_id])


class ProgramBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    desc: str = Field(default='', max_length=2000)
    detail: str | None = Field(default=None, max_length=2000000)
    category: str = Field(min_length=1, max_length=64)
    status: str = Field(default='RECRUITING', pattern='^(RECRUITING|CLOSED|ENDED)$')
    careTypes: list[str] = Field(default_factory=list, max_length=6)
    roadmapEntry: str = Field(default='NONE', pattern='^(NONE|RECOMMEND|REQUIRED)$')
    startDate: date | None = None
    endDate: date | None = None
    runStartDate: date | None = None
    runEndDate: date | None = None
    sessions: int = Field(default=1, ge=1, le=999)
    manager: str = Field(default='', max_length=100)
    fiscalYear: str = Field(default='', max_length=10)
    capacity: int = Field(ge=0, le=100000)
    image: str | None = Field(default=None, max_length=2000000)
    location: str = Field(default='', max_length=200)
    pinned: bool = False
    satisfactionSurvey: bool = False
    satisfactionFormId: str | None = Field(default=None, max_length=64)
    competencySurvey: bool = False
    competencyAreas: list[str] = Field(default_factory=list, max_length=100)
    includeInStats: bool = True

    @model_validator(mode='after')
    def consistent(self):
        if self.endDate and self.startDate and self.endDate < self.startDate:
            raise ValueError('신청 마감일은 시작일 이후여야 합니다.')
        if self.runEndDate and self.runStartDate and self.runEndDate < self.runStartDate:
            raise ValueError('운영 종료일은 시작일 이후여야 합니다.')
        if set(self.careTypes) - {'T1', 'T2', 'T3', 'T4', 'T5', 'T6'}:
            raise ValueError('학생 유형 코드를 확인해 주세요.')
        if self.roadmapEntry != 'NONE' and not self.careTypes:
            raise ValueError('로드맵에 편입하려면 대상 유형을 선택해야 합니다.')
        return self


class ProgramUpdate(ProgramBody):
    expectedVersion: int = Field(ge=1)


def program_values(body: ProgramBody):
    return (body.title, body.desc, body.detail, body.category, body.status, body.startDate, body.endDate,
            body.runStartDate, body.runEndDate, body.sessions, body.manager, body.fiscalYear, body.location,
            body.image, body.capacity, body.pinned, body.roadmapEntry, body.careTypes, body.satisfactionSurvey,
            body.satisfactionFormId, body.competencySurvey, body.competencyAreas, body.includeInStats)


def check_category(conn, code):
    if not conn.execute("SELECT 1 FROM dc.code_item WHERE group_code='PROGRAM_CATEGORY' AND code=%s AND is_active",
                        (code,)).fetchone():
        raise HTTPException(422, '사용 가능한 비교과 분류를 선택해 주세요.')


@router.post('/programs', status_code=201)
def create_program(body: ProgramBody, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    require_staff(user)
    check_category(conn, body.category)
    # 개설은 여러 학생의 계획을 한 번에 건드린다 → lifecycle 을 exclusive 로 먼저 잡는다.
    # sync_roadmap 안에서 뒤늦게 잡으면 기존 호출부의 program 락과 역전된다.
    lifecycle_lock(conn, exclusive=True)
    columns = ['id', *WRITABLE.split(','), 'created_by', 'updated_by']
    row = conn.execute(f'''INSERT INTO dc.program({",".join(columns)})
      VALUES({",".join(["%s"] * len(columns))}) RETURNING {PROGRAM_COLUMNS}''',
      ('prog_' + uuid4().hex[:12], *program_values(body), user['intg_uid'], user['intg_uid'])).fetchone()
    program_expiry(row)
    enroll_program(conn, user, row)
    return program_dto(row, [])


@router.put('/programs/{program_id}')
def update_program(program_id: str, body: ProgramUpdate, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    require_staff(user)
    check_category(conn, body.category)
    lifecycle_lock(conn, exclusive=True)
    before = get_program(conn, program_id, lock=True)
    if before['version'] != body.expectedVersion:
        raise HTTPException(409, '다른 담당자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    # 이미 학생 계획에 붙어 있는 프로그램의 **편입 조건**은 바꾸지 않는다. 소급 삭제·소급 완료·
    # 유형 승급 시 회수의 규칙이 아직 없기 때문이다. apply_end 를 함께 막는 이유는
    # 그것이 추천 칸의 만료 그 자체이기 때문이다.
    if linked_cells(conn, program_id) and (
            before['roadmap_entry'] != body.roadmapEntry
            or sorted(before['care_types']) != sorted(body.careTypes)
            or before['apply_end'] != body.endDate):
        raise HTTPException(409, '이미 로드맵에 편입된 프로그램의 편입 조건·마감일은 바꿀 수 없습니다.')
    selected = conn.execute("SELECT count(*) AS n FROM dc.program_apply WHERE program_id=%s AND selection_code='SELECTED'",
                            (program_id,)).fetchone()['n']
    if body.capacity < selected:
        raise HTTPException(422, f'이미 선발된 {selected}명보다 적은 정원으로 줄일 수 없습니다.')
    assignments = ','.join(f'{column}=%s' for column in WRITABLE.split(','))
    row = conn.execute(f'''UPDATE dc.program SET {assignments},version=version+1,updated_at=now(),updated_by=%s
      WHERE id=%s RETURNING {PROGRAM_COLUMNS}''',
      (*program_values(body), user['intg_uid'], program_id)).fetchone()
    program_expiry(row)
    enroll_program(conn, user, row)
    return program_dto(row, applicants_of(conn, user, [program_id])[program_id])


@router.delete('/programs/{program_id}', status_code=204)
def delete_program(program_id: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    require_staff(user)
    lifecycle_lock(conn, exclusive=True)
    get_program(conn, program_id, lock=True)
    # 이수·수료 이력이 붙은 프로그램은 지우지 않는다. 통계와 로드맵 근거가 사라진다.
    if conn.execute('SELECT 1 FROM dc.program_apply WHERE program_id=%s AND outcome_code IS NOT NULL',
                    (program_id,)).fetchone():
        raise HTTPException(409, '이수 결과가 있는 프로그램은 삭제할 수 없습니다. 상태를 종료로 바꾸세요.')
    # roadmap_item.program_id FK 가 걸린 칸이 있으면 DELETE 가 IntegrityError 로 500 이 됐다.
    if linked_cells(conn, program_id):
        raise HTTPException(409, {'code': 'PROGRAM_IN_ROADMAP',
                                  'message': '로드맵에 편입된 프로그램은 삭제할 수 없습니다.'})
    conn.execute('DELETE FROM dc.program_apply WHERE program_id=%s', (program_id,))
    conn.execute('DELETE FROM dc.program WHERE id=%s', (program_id,))


# ── 신청 ────────────────────────────────────────────────────────────────

def record(conn, user, program_id, student_uid, action, before, after, reason=''):
    conn.execute('''INSERT INTO dc.program_apply_event(program_id,student_uid,action,before_value,after_value,
      reason,changed_by) VALUES(%s,%s,%s,%s,%s,%s,%s)''',
      (program_id, student_uid, action, Jsonb(jsonable_encoder(before)) if before else None,
       Jsonb(jsonable_encoder(after)), reason, user['intg_uid']))


def get_application(conn, program_id, student_uid, lock=True):
    # 잠금 대상이 흐려지지 않게 집계 뷰는 조인하지 않는다(벌점은 목록 DTO 가 싣는다).
    row = conn.execute('''SELECT a.*,p.alias,p.name,s.major_label FROM dc.program_apply a
      JOIN dc.person p ON p.intg_uid=a.student_uid JOIN dc.student s ON s.intg_uid=a.student_uid
      WHERE a.program_id=%s AND a.student_uid=%s''' + (' FOR UPDATE OF a' if lock else ''),
      (program_id, student_uid)).fetchone()
    if not row:
        raise HTTPException(404, '신청 내역을 찾을 수 없습니다.')
    return row


class ApplyBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    studentId: str | None = None
    path: str = Field(default='', max_length=500)
    motive: str = Field(default='', max_length=2000)
    consents: dict = Field(default_factory=dict)


@router.post('/programs/{program_id}/applications', status_code=201)
def apply(program_id: str, body: ApplyBody, idempotency_key: str = Header(min_length=8, max_length=200),
          user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    route = 'POST /programs/applications'
    digest = hashlib.sha256((program_id + body.model_dump_json()).encode()).hexdigest()
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',
                 (user['intg_uid'] + route + idempotency_key,))
    saved = conn.execute('SELECT * FROM dc.idempotency WHERE actor_uid=%s AND route=%s AND key=%s',
                         (user['intg_uid'], route, idempotency_key)).fetchone()
    if saved:
        if saved['request_hash'] != digest:
            raise HTTPException(409, '같은 요청 키로 다른 내용을 저장할 수 없습니다.')
        return saved['response']
    if user['kind'] == 'STUDENT':
        if body.studentId and body.studentId not in (user['alias'], user['intg_uid']):
            raise HTTPException(403, '본인 신청만 등록할 수 있습니다.')
        # 역량강화(비교과)는 확정된 로드맵 뒤에 열린다(PROCESS.md §2). 재생성 중에는 계획이
        # DRAFT 라 여기서 잠긴다 — 판정은 gates.py 한 곳에서만 한다(CLAUDE.md 13조).
        gate = program_gate(conn, user['intg_uid'])
        if not gate['eligible']:
            raise HTTPException(403, gate['reasons'][0]['message'])
        student = student_access(conn, user, user['intg_uid'])
    else:
        require_staff(user)
        student = student_access(conn, user, body.studentId or '')
    program = get_program(conn, program_id, lock=True)
    if program['status_code'] != 'RECRUITING':
        raise HTTPException(409, '모집 중인 프로그램이 아닙니다.')
    if program['apply_end'] and program['apply_end'] < today():
        raise HTTPException(409, '신청이 마감된 프로그램입니다.')
    if conn.execute('SELECT 1 FROM dc.program_apply WHERE program_id=%s AND student_uid=%s',
                    (program_id, student['intg_uid'])).fetchone():
        raise HTTPException(409, '이미 신청한 프로그램입니다.')
    # 신청 시점 학적을 복사해 둔다(CLAUDE.md 규칙 2) — 학과 개편 뒤에도 명단이 흔들리지 않는다.
    snapshot = {'studentName': student['name'], 'studentMajor': student['major_label'],
                'studentNo': student['student_no'], 'grade': student['grade'],
                'path': body.path, 'motive': body.motive}
    row = conn.execute('''INSERT INTO dc.program_apply(program_id,student_uid,applied_at,snapshot,apply_path,
      motive,consents,updated_by) VALUES(%s,%s,now(),%s,%s,%s,%s,%s) RETURNING *''',
      (program_id, student['intg_uid'], Jsonb(snapshot), body.path, body.motive,
       Jsonb(body.consents), user['intg_uid'])).fetchone()
    result = applicant_dto({**row, 'alias': student['alias'], 'name': student['name'],
                            'major_label': student['major_label']})
    record(conn, user, program_id, student['intg_uid'], 'APPLY', None, result)
    conn.execute('INSERT INTO dc.idempotency(actor_uid,route,key,request_hash,response) VALUES(%s,%s,%s,%s,%s)',
                 (user['intg_uid'], route, idempotency_key, digest, Jsonb(jsonable_encoder(result))))
    return result


class Bulk(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    studentIds: list[str] = Field(min_length=1, max_length=500)
    reason: str = Field(default='', max_length=1000)


class SelectionBody(Bulk):
    selection: str = Field(pattern='^(PENDING|SELECTED|REJECTED|CANCELLED)$')


class OutcomeBody(Bulk):
    outcome: str | None = Field(default=None, pattern='^(COMPLETED|NOT_COMPLETED|ATTENDED|ABSENT)$')
    absencePoints: int = Field(default=0, ge=0, le=3)

    @model_validator(mode='after')
    def points_belong_to_absence(self):
        if self.absencePoints and self.outcome != 'ABSENT':
            raise ValueError('벌점은 불참 결과에만 부여합니다.')
        if self.outcome == 'ABSENT' and not self.absencePoints:
            raise ValueError('불참 처리에는 벌점을 지정해야 합니다.')
        return self


def resolve_students(conn, user, ids):
    require_staff(user)
    return [student_access(conn, user, identity) for identity in ids]


def penalty(conn, user, student_uid, kind, points, reason, program):
    conn.execute('''INSERT INTO dc.penalty_entry(student_uid,kind,points,reason,program_id,program_title,created_by)
      VALUES(%s,%s,%s,%s,%s,%s,%s)''',
      (student_uid, kind, points, reason, program['id'], program['title'], user['intg_uid']))


def waive_program_penalty(conn, user, student_uid, program, reason):
    """이 프로그램으로 부여된 벌점의 미상쇄분만 되돌린다. 이력은 지우지 않는다."""
    outstanding = conn.execute('''SELECT COALESCE(sum(points),0)::int AS n FROM dc.penalty_entry
      WHERE student_uid=%s AND program_id=%s''', (student_uid, program['id'])).fetchone()['n']
    if outstanding > 0:
        penalty(conn, user, student_uid, 'WAIVE', -outstanding, reason, program)


def sync_roadmap(conn, user, student_uid, program_id, completed, apply_row=None):
    """수료만 로드맵 칸을 닫는다(spec_v1 §7.2). 선발·출석으로는 닫지 않는다.

    무엇을 근거로 닫혔는지도 함께 남긴다 — 근거 없는 DONE 은 나중에 감사할 수 없다.
    수료 철회는 같은 트랜잭션에서 TODO 로 되돌리고 이전 이력은 지우지 않는다."""
    target = 'DONE' if completed else 'TODO'
    reference = {'programId': program_id, 'studentUid': student_uid,
                 'round': (apply_row or {}).get('round_no'),
                 'outcome': (apply_row or {}).get('outcome_code')} if completed else None
    generation = conn.execute('SELECT version FROM dc.roadmap WHERE student_uid=%s',
                              (student_uid,)).fetchone()
    for item in conn.execute('''SELECT * FROM dc.roadmap_item WHERE student_uid=%s AND program_id=%s
      AND status<>%s FOR UPDATE''', (student_uid, program_id, target)).fetchall():
        after = conn.execute('''UPDATE dc.roadmap_item SET status=%s,version=version+1,
          completed_at=CASE WHEN %s THEN now() END,
          completion_source_code=CASE WHEN %s THEN 'PROGRAM_OUTCOME' END,
          completion_ref=CASE WHEN %s THEN %s::jsonb END
          WHERE student_uid=%s AND id=%s RETURNING *''',
          (target, completed, completed, completed, Jsonb(reference) if completed else None,
           student_uid, item['id'])).fetchone()
        conn.execute('''INSERT INTO dc.roadmap_item_event(student_uid,item_id,actor_uid,before_value,
          after_value,schema_version,roadmap_version,action_code,cause_kind,cause_id,item_version_before,
          item_version_after,transaction_id) VALUES(%s,%s,%s,%s,%s,2,%s,%s,'PROGRAM',%s,%s,%s,%s)''',
          (student_uid, item['id'], user['intg_uid'], Jsonb(jsonable_encoder(item)),
           Jsonb(jsonable_encoder(after)), (generation or {}).get('version'),
           'COMPLETE' if completed else 'REOPEN', program_id, item['version'], after['version'],
           uuid4()))


@router.post('/programs/{program_id}/applications/selection')
def set_selection(program_id: str, body: SelectionBody, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    program = get_program(conn, program_id, lock=True)
    students = resolve_students(conn, user, body.studentIds)
    if body.selection == 'SELECTED':
        already = conn.execute('''SELECT count(*) AS n FROM dc.program_apply WHERE program_id=%s
          AND selection_code='SELECTED' AND student_uid<>ALL(%s)''',
          (program_id, [s['intg_uid'] for s in students])).fetchone()['n']
        if already + len(students) > program['capacity']:
            raise HTTPException(409, f"정원 {program['capacity']}명을 넘겨 선발할 수 없습니다.")
    results = []
    for student in students:
        before = get_application(conn, program_id, student['intg_uid'])
        if before['outcome_code'] and body.selection != 'SELECTED':
            raise HTTPException(409, '이수 결과가 있는 신청은 선발을 해제할 수 없습니다. 결과를 먼저 되돌리세요.')
        row = conn.execute('''UPDATE dc.program_apply SET selection_code=%s,
          selected_at=CASE WHEN %s='SELECTED' THEN COALESCE(selected_at,now()) ELSE NULL END,
          version=version+1,updated_at=now(),updated_by=%s WHERE program_id=%s AND student_uid=%s RETURNING *''',
          (body.selection, body.selection, user['intg_uid'], program_id, student['intg_uid'])).fetchone()
        after = applicant_dto({**row, 'alias': student['alias'], 'name': student['name'],
                               'major_label': student['major_label']})
        record(conn, user, program_id, student['intg_uid'], 'SELECTION', applicant_dto(before), after, body.reason)
        results.append(after)
    return results


@router.post('/programs/{program_id}/applications/outcome')
def set_outcome(program_id: str, body: OutcomeBody, user=Depends(principal, scope='function'),
                conn=Depends(connection, scope='function')):
    lifecycle_lock(conn, exclusive=False)
    program = get_program(conn, program_id, lock=True)
    results = []
    for student in resolve_students(conn, user, body.studentIds):
        before = get_application(conn, program_id, student['intg_uid'])
        if before['selection_code'] != 'SELECTED':
            raise HTTPException(409, '선발된 학생에게만 이수 결과를 남길 수 있습니다.')
        row = conn.execute('''UPDATE dc.program_apply SET outcome_code=%s,absence_points=%s,version=version+1,
          updated_at=now(),updated_by=%s WHERE program_id=%s AND student_uid=%s RETURNING *''',
          (body.outcome, body.absencePoints, user['intg_uid'], program_id, student['intg_uid'])).fetchone()
        # 불참 tier 는 바뀔 수 있다. 먼저 이 프로그램 벌점을 상쇄하고 새 tier 로 다시 부여한다.
        waive_program_penalty(conn, user, student['intg_uid'], program, f"{program['title']} 결과 정정 — 벌점 회수")
        if body.outcome == 'ABSENT':
            penalty(conn, user, student['intg_uid'], 'NOSHOW', body.absencePoints,
                    f"{program['title']} 불참 (벌점 {body.absencePoints}점)", program)
        sync_roadmap(conn, user, student['intg_uid'], program_id, body.outcome == 'COMPLETED', row)
        after = applicant_dto({**row, 'alias': student['alias'], 'name': student['name'],
                               'major_label': student['major_label']})
        record(conn, user, program_id, student['intg_uid'], 'OUTCOME', applicant_dto(before), after, body.reason)
        results.append(after)
    return results


class AttendanceBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    attendance: str = Field(pattern='^(UNKNOWN|PRESENT|NO_SHOW)$')
    reason: str = Field(default='', max_length=1000)


@router.put('/programs/{program_id}/applications/{identity}/attendance')
def set_attendance(program_id: str, identity: str, body: AttendanceBody,
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    program = get_program(conn, program_id, lock=True)
    require_staff(user)
    student = student_access(conn, user, identity)
    before = get_application(conn, program_id, student['intg_uid'])
    if before['attendance_code'] == body.attendance:
        return applicant_dto(before)
    row = conn.execute('''UPDATE dc.program_apply SET attendance_code=%s,version=version+1,updated_at=now(),
      updated_by=%s WHERE program_id=%s AND student_uid=%s RETURNING *''',
      (body.attendance, user['intg_uid'], program_id, student['intg_uid'])).fetchone()
    if body.attendance == 'NO_SHOW':
        penalty(conn, user, student['intg_uid'], 'NOSHOW', NOSHOW_POINTS,
                f"{program['title']} 노쇼 (신청 후 미참여)", program)
    elif before['attendance_code'] == 'NO_SHOW':
        waive_program_penalty(conn, user, student['intg_uid'], program,
                              f"{program['title']} 출석 정정 — 노쇼 벌점 회수")
    after = applicant_dto({**row, 'alias': student['alias'], 'name': student['name'],
                           'major_label': student['major_label']})
    record(conn, user, program_id, student['intg_uid'], 'ATTENDANCE', applicant_dto(before), after, body.reason)
    return after


@router.post('/programs/{program_id}/applications/remove')
def remove_applications(program_id: str, body: Bulk, user=Depends(principal, scope='function'),
                        conn=Depends(connection, scope='function')):
    lifecycle_lock(conn, exclusive=False)
    program = get_program(conn, program_id, lock=True)
    for student in resolve_students(conn, user, body.studentIds):
        before = get_application(conn, program_id, student['intg_uid'])
        waive_program_penalty(conn, user, student['intg_uid'], program,
                              f"{program['title']} 신청 삭제 — 벌점 회수")
        sync_roadmap(conn, user, student['intg_uid'], program_id, False)
        conn.execute('DELETE FROM dc.program_apply WHERE program_id=%s AND student_uid=%s',
                     (program_id, student['intg_uid']))
        record(conn, user, program_id, student['intg_uid'], 'REMOVE', applicant_dto(before),
               {'removed': True}, body.reason)
    return {'removed': len(body.studentIds)}


@router.delete('/programs/{program_id}/applications/mine', status_code=204)
def cancel_own(program_id: str, user=Depends(principal, scope='function'),
               conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 취소할 수 있습니다.')
    program = get_program(conn, program_id, lock=True)
    before = get_application(conn, program_id, user['intg_uid'])
    if before['selection_code'] == 'SELECTED':
        raise HTTPException(409, '선발된 신청은 담당자에게 취소를 요청해 주세요.')
    row = conn.execute('''UPDATE dc.program_apply SET selection_code='CANCELLED',cancelled_at=now(),
      version=version+1,updated_at=now(),updated_by=%s WHERE program_id=%s AND student_uid=%s RETURNING *''',
      (user['intg_uid'], program_id, user['intg_uid'])).fetchone()
    record(conn, user, program_id, user['intg_uid'], 'CANCEL', applicant_dto(before),
           {**applicant_dto(before), 'selectionStatus': row['selection_code']}, '학생 본인 취소')


@router.get('/programs/{program_id}/applications/{identity}/events')
def application_events(program_id: str, identity: str, page: int = Query(1, ge=1),
                       pageSize: int = Query(20, ge=1, le=100),
                       user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student = student_access(conn, user, identity)
    total = conn.execute('SELECT count(*) AS n FROM dc.program_apply_event WHERE program_id=%s AND student_uid=%s',
                         (program_id, student['intg_uid'])).fetchone()['n']
    rows = conn.execute('''SELECT * FROM dc.program_apply_event WHERE program_id=%s AND student_uid=%s
      ORDER BY changed_at DESC,id LIMIT %s OFFSET %s''',
      (program_id, student['intg_uid'], pageSize, (page - 1) * pageSize)).fetchall()
    return dict(items=rows, totalCount=total, page=page, pageSize=pageSize)


# ── 벌점 · 블랙리스트 ────────────────────────────────────────────────────

PENALTY_SELECT = '''SELECT p.alias AS "studentId",p.name AS "studentName",s.major_label AS "studentMajor",
 s.student_no AS "studentNo",d.college_name AS college,t.total,t.entry_count AS "entryCount",t.last_at AS "lastAt"
 FROM dc.penalty_total t JOIN dc.person p ON p.intg_uid=t.student_uid
 JOIN dc.student s ON s.intg_uid=t.student_uid
 LEFT JOIN dc.department d ON (d.college_code,d.dept_code)=(s.college_code,s.dept_code)'''


# 검색 범위는 화면의 select 와 1:1이다. 임의 컬럼명을 받지 않는다.
SEARCH_SCOPE = {'name': 'p.name', 'studentNo': 's.student_no', 'major': 's.major_label'}


def penalty_filter(user, majors, minPoints, q, scope=None):
    where = ['t.total>0', 'EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=t.student_uid)']
    values = [user['intg_uid']]
    if majors:
        where.append('s.major_label=ANY(%s)')
        values.append(list(majors))
    if minPoints:
        where.append('t.total>=%s')
        values.append(minPoints)
    if q.strip():
        column = SEARCH_SCOPE.get(scope or '', "concat_ws(' ',p.name,s.student_no,s.major_label)")
        where.append(f'{column} ILIKE %s')
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    return ' AND '.join(f'({x})' for x in where), values


@router.get('/penalties')
def penalties(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
              q: str = Query('', max_length=200), major: list[str] = Query(default=[]),
              minPoints: int = Query(0, ge=0), searchScope: str | None = None,
              user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    if searchScope and searchScope not in SEARCH_SCOPE:
        raise HTTPException(422, '검색 범위를 확인해 주세요.')
    condition, values = penalty_filter(user, major, minPoints, q, searchScope)
    total = conn.execute(f'SELECT count(*) AS n FROM ({PENALTY_SELECT} WHERE {condition}) v',
                         values).fetchone()['n']
    rows = conn.execute(f'{PENALTY_SELECT} WHERE {condition} ORDER BY t.total DESC,p.name LIMIT %s OFFSET %s',
                        [*values, pageSize, (page - 1) * pageSize]).fetchall()
    return dict(items=rows, totalCount=total, page=page, pageSize=pageSize)


@router.get('/penalties/summary')
def penalty_summary(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_staff(user)
    condition, values = penalty_filter(user, [], 0, '')
    row = conn.execute(f'''SELECT count(*)::int AS total,COALESCE(sum(v.total),0)::int AS "totalPoints"
      FROM ({PENALTY_SELECT} WHERE {condition}) v''', values).fetchone()
    # 단대 목록은 내려주지 않는다 — 학생 대부분이 조직 코드를 갖고 있지 않아 빈 값이 된다.
    # 화면이 학사 조직 트리로 단대를 만들고, 서버에는 학과 목록으로 걸러 달라고 요청한다.
    options = conn.execute(f'''SELECT ARRAY(SELECT DISTINCT v."studentMajor"
      FROM ({PENALTY_SELECT} WHERE {condition}) v ORDER BY 1) AS majors''', values).fetchone()
    return {**row, **options}


@router.get('/penalties/{identity}')
def penalty_detail(identity: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    student = student_access(conn, user, identity)
    entries = conn.execute('''SELECT id,kind,points,reason,program_id AS "programId",program_title AS "programTitle",
      created_at AS at,created_by AS by FROM dc.penalty_entry WHERE student_uid=%s ORDER BY created_at,id''',
      (student['intg_uid'],)).fetchall()
    college = conn.execute('SELECT college_name FROM dc.department WHERE (college_code,dept_code)=(%s,%s)',
                           (student['college_code'], student['dept_code'])).fetchone()
    return {'studentId': student['alias'], 'studentName': student['name'],
            'studentMajor': student['major_label'], 'studentNo': student['student_no'],
            'college': college['college_name'] if college else None,
            'total': sum(e['points'] for e in entries), 'entries': entries}


class PenaltyBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    points: int = Field(ge=1, le=100)
    reason: str = Field(min_length=1, max_length=1000)
    kind: str = Field(pattern='^(MANUAL|WAIVE)$')


@router.post('/penalties/{identity}/entries', status_code=201)
def add_penalty(identity: str, body: PenaltyBody, user=Depends(principal, scope='function'),
                conn=Depends(connection, scope='function')):
    require_staff(user)
    student = student_access(conn, user, identity)
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('penalty:' + student['intg_uid'],))
    total = conn.execute('SELECT COALESCE(sum(points),0)::int AS n FROM dc.penalty_entry WHERE student_uid=%s',
                         (student['intg_uid'],)).fetchone()['n']
    if body.kind == 'WAIVE' and body.points > total:
        raise HTTPException(422, f'차감할 수 있는 벌점은 {total}점입니다.')
    conn.execute('''INSERT INTO dc.penalty_entry(student_uid,kind,points,reason,created_by)
      VALUES(%s,%s,%s,%s,%s)''', (student['intg_uid'], body.kind,
      -body.points if body.kind == 'WAIVE' else body.points, body.reason, user['intg_uid']))
    return penalty_detail(identity, user, conn)
