"""로드맵·IAP — 현재 계획 1벌, 세대 스냅샷, 변경 요청.

비교과(programs.py)·채용(jobs.py)의 규약을 그대로 따른다: 부모 FOR UPDATE → 자식 순서로
잠그고, 쓰기는 version 낙관적 잠금, 중복은 Idempotency-Key, 이력은 append-only 다.

로드맵에서 달라지는 것 다섯:
  ① 수가 둘이다. roadmapVersion(세대)은 재생성마다, version(lock_version)은 칸 하나를
     고쳐도 오른다. 클라이언트는 둘 다 보내고 서버는 둘 다 검사한다.
  ② 계획은 언제나 1벌이다. 재생성은 구계획을 스냅샷으로 얼린 뒤 15칸을 새로 만들고
     아무것도 이월하지 않는다(PROCESS.md §6-6). 확정본과 초안을 동시에 보관하지 않는다.
  ③ 학생에게는 확정된 계획만 보인다. 재생성 중에는 DRAFT 라 비교과·취업지원이 함께 잠긴다 —
     그 잠금 판정은 gates.py 한 곳에서만 한다(CLAUDE.md 13조).
  ④ 15칸의 내용은 우리가 만들지 않는다. 이미 승인된 산출물(provider)을 받아 채택할 뿐이고,
     없으면 503 이다. 문구를 채우거나 학년·학과로 추정하지 않는다(CLAUDE.md 14조).
  ⑤ 프로그램 칸은 비교과가 정본이다. 상태·프로그램·편입·만료는 편집 DTO 에서 받지 않는다.
"""
import hashlib
from datetime import datetime, time, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .auth import principal, require_staff
from .db import connection
from .gates import is_care7_request, program_gate
# 멱등 저장과 메뉴 권한 술어는 채용에서 이미 확정된 것을 그대로 쓴다(CLAUDE.md 12조).
from .jobs import MENU_PREDICATE, idempotent, remember

router = APIRouter()
SEOUL = ZoneInfo('Asia/Seoul')
PLAN_MENU = 'roadmap.0'
REQUEST_MENU = 'roadmap.1'
STATS_MENU = 'roadmap.2'
# 개설 fanout(exclusive)과 학생별 계획 쓰기(shared)의 순서를 통일하는 lifecycle 락.
LIFECYCLE_LOCK = 480093
AXES = ('IAP', 'CORE', 'GROWTH')
BASE_CELLS = 5
PRIORITIES = ('P0', 'P1', 'P2')
IMPORTANCES = ('REQUIRED', 'IMPORTANT', 'RECOMMENDED')
# 시드 산출물의 한글 중요도 → 코드. 판정이 아니라 표기 변환이다.
IMPORTANCE_CODE = {'필수': 'REQUIRED', '중요': 'IMPORTANT', '권장': 'RECOMMENDED'}
SNAPSHOT_SCHEMA = 2


def fail(status: int, code: str, message: str, **extra):
    """신규 API 의 오류는 코드를 갖는다. 화면이 문자열을 파싱해 분기하지 않게 한다."""
    raise HTTPException(status, {'code': code, 'message': message, **extra})


# ── 인가 ────────────────────────────────────────────────────────────────

def has_menu(conn, user, menu_code) -> bool:
    if user['kind'] != 'STAFF':
        return False
    return conn.execute(MENU_PREDICATE, (menu_code, user['intg_uid'], user['intg_uid'])).fetchone()['ok']


def resolve_student(conn, user, identity, menu_code=PLAN_MENU):
    """학생 해석. 교직원은 메뉴 권한과 담당 범위를 **둘 다** 통과해야 한다.
    auth.student_access 의 「과거 상담 담당이면 허용」 우회 경로를 가져오지 않는다."""
    student = conn.execute('''SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE p.alias=%s OR s.intg_uid=%s''', (identity, identity)).fetchone()
    if not student:
        fail(404, 'NOT_FOUND', '학생을 찾을 수 없습니다.')
    if user['kind'] == 'STUDENT':
        if user['intg_uid'] != student['intg_uid']:
            fail(404, 'NOT_FOUND', '학생을 찾을 수 없습니다.')
        return student
    if not has_menu(conn, user, menu_code):
        fail(403, 'MENU_DENIED', '로드맵 업무 권한이 없습니다.')
    if not conn.execute('SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s',
                        (user['intg_uid'], student['intg_uid'])).fetchone():
        fail(404, 'NOT_FOUND', '학생을 찾을 수 없습니다.')
    return student


def require_plan_staff(conn, user, menu_code=PLAN_MENU):
    require_staff(user)
    if not has_menu(conn, user, menu_code):
        fail(403, 'MENU_DENIED', '로드맵 업무 권한이 없습니다.')


def scope_condition(user, column):
    if user['kind'] == 'STUDENT':
        return f'{column}=%s', [user['intg_uid']]
    return (f'EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid={column})',
            [user['intg_uid']])


# ── 잠금 ────────────────────────────────────────────────────────────────

def lifecycle_lock(conn, exclusive: bool):
    """개설·편입 조건 변경은 exclusive, 학생별 생성/편집/확정·수료 연동은 shared.
    진입점 첫 줄에서 잡는다 — sync_roadmap 안에서 뒤늦게 잡으면 program 락과 역전된다."""
    conn.execute('SELECT pg_advisory_xact_lock(%s)' if exclusive
                 else 'SELECT pg_advisory_xact_lock_shared(%s)', (LIFECYCLE_LOCK,))


def lock_plan(conn, uid, lock=True):
    """학생 키의 advisory lock 을 먼저 잡아 「아직 계획이 없는 동시 생성」을 직렬화한 뒤
    계획 행을 잠근다. 계획이 없으면 잠글 행 자체가 없어 행 락만으로는 경쟁을 막지 못한다."""
    if lock:
        conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('roadmap:' + uid,))
    return conn.execute('SELECT * FROM dc.roadmap WHERE student_uid=%s' + (' FOR UPDATE' if lock else ''),
                        (uid,)).fetchone()


def check_versions(row, roadmap_version, lock_version):
    if row['version'] != roadmap_version or row['lock_version'] != lock_version:
        fail(409, 'VERSION_CONFLICT', '다른 담당자가 변경했습니다. 새로 조회한 뒤 수정하세요.',
             currentRoadmapVersion=row['version'], currentVersion=row['lock_version'])


# ── 읽기 ────────────────────────────────────────────────────────────────

def as_of(conn):
    """한 요청은 하나의 시각을 쓴다. 문장마다 now() 를 다시 부르면 목록과 상세가 어긋난다."""
    return conn.execute('SELECT now() AS t').fetchone()['t']


def cell_dto(row):
    return {
        'id': row['id'], 'title': row['title'], 'priority': row['priority'],
        'importance': row['importance'], 'why': row['why'], 'editorNote': row['editor_note'],
        # 사람이 채택한 문구와 AI 원문을 구분한다. 화면은 표시값 하나(why)를 쓰고,
        # 출처를 알아야 하는 곳만 reasonOrigin/aiSuggestionId 를 읽는다.
        'reasonOrigin': 'EDITOR' if row['editor_note'] else ('AI' if row['ai_suggestion_id'] else 'LEGACY'),
        'aiSuggestionId': row['ai_suggestion_id'],
        'status': row['status'], 'origin': row['origin_code'], 'axis': row['axis'],
        'position': row['position'], 'programId': row['program_id'], 'entry': row['entry'],
        'expiresAt': row['expires_at'], 'completedAt': row['completed_at'],
        'completionSource': row['completion_source_code'], 'version': row['version'],
        'alive': row.get('alive', True),
    }


def plan_body(conn, uid, moment):
    axes = conn.execute('''SELECT * FROM dc.roadmap_axis WHERE student_uid=%s
      ORDER BY CASE axis WHEN 'IAP' THEN 1 WHEN 'CORE' THEN 2 ELSE 3 END''', (uid,)).fetchall()
    items = conn.execute('''SELECT *,dc.roadmap_item_alive(status,entry,expires_at,%s) AS alive
      FROM dc.roadmap_item WHERE student_uid=%s ORDER BY axis,position,id''', (moment, uid)).fetchall()
    grouped = {axis['axis']: [] for axis in axes}
    for item in items:
        # 만료된 추천 칸은 목록에서 걸러 낸다 — 화면이 살아 있는지 다시 판단하지 않는다.
        if item['alive'] and item['axis'] in grouped:
            grouped[item['axis']].append(cell_dto(item))
    return [{'axis': a['axis'], 'headline': a['headline'], 'rationale': a['rationale'],
             'editorNote': a['editor_note'], 'aiSuggestionId': a['ai_suggestion_id'],
             'cells': grouped[a['axis']]} for a in axes]


def progress_of(conn, uid, moment):
    """집계는 SQL 이 한다(CLAUDE.md 10조). 전체는 뷰·목록과 같은 함수를 쓴다."""
    total = conn.execute('SELECT * FROM dc.roadmap_progress(%s,%s)', (uid, moment)).fetchone()
    rows = conn.execute('''SELECT axis,count(*) FILTER(WHERE status='DONE')::int AS done,count(*)::int AS total,
      COALESCE(round(100.0*count(*) FILTER(WHERE status='DONE')/NULLIF(count(*),0))::int,0) AS pct
      FROM dc.roadmap_item WHERE student_uid=%s AND dc.roadmap_item_alive(status,entry,expires_at,%s)
      GROUP BY axis''', (uid, moment)).fetchall()
    by_axis = {axis: {'done': 0, 'total': 0, 'pct': 0} for axis in AXES}
    for row in rows:
        by_axis[row['axis']] = {'done': row['done'], 'total': row['total'], 'pct': row['pct']}
    return dict(total), by_axis


def plan_dto(conn, uid, row, moment, capabilities):
    progress, by_axis = progress_of(conn, uid, moment)
    return {
        'studentUid': uid, 'roadmapVersion': row['version'], 'version': row['lock_version'],
        'status': row['status_code'], 'confirmed': row['confirmed'],
        'targetRole': row['target_role'], 'targetCompany': row['target_company'],
        'counselRequestId': row['counsel_request_id'], 'basisKind': row['basis_kind'],
        'aiRunId': row['ai_run_id'], 'axes': plan_body(conn, uid, moment),
        'progress': progress, 'byAxis': by_axis, 'updatedAt': row['updated_at'],
        'confirmedAt': row['confirmed_at'], 'capabilities': capabilities, 'asOf': moment,
    }


def generation_source(student):
    """생성 provider 의 재고. 승인된 산출물이 시드에 있는 학생만 생성할 수 있다."""
    return (student['detail'] or {}).get('roadmapOutcome')


def capabilities_for(conn, user, student, row):
    manage = user['kind'] == 'STAFF' and has_menu(conn, user, PLAN_MENU)
    return {
        'canEdit': bool(manage and row),
        'canConfirm': bool(manage and row and row['status_code'] != 'CONFIRMED'),
        'canGenerate': bool(manage and not row and generation_source(student)),
        'canRegenerate': bool(manage and row),
        'canRequestChange': user['kind'] == 'STUDENT',
        'providerSource': 'fixture' if generation_source(student) else None,
    }


@router.get('/roadmap/capabilities')
def roadmap_capabilities(user=Depends(principal, scope='function'),
                         conn=Depends(connection, scope='function')):
    """화면·부팅 로더가 무엇을 부를 수 있는지. 미제공 기능은 호출하기 전에 걸러진다 —
    권한 없는 역할이 목록을 불러 403 을 화면에 띄우는 일이 없어야 한다
    (jobs/capabilities 와 같은 규약)."""
    return {
        'canManagePlans': has_menu(conn, user, PLAN_MENU),
        'canManageRequests': has_menu(conn, user, REQUEST_MENU),
        'canViewStats': has_menu(conn, user, STATS_MENU),
        # 학생은 본인 변경 요청만 보고 쓴다 — 메뉴 권한과 무관하다.
        'canRequestChange': user['kind'] == 'STUDENT',
    }


@router.get('/students/{identity}/roadmap')
def student_roadmap(identity: str, user=Depends(principal, scope='function'),
                    conn=Depends(connection, scope='function')):
    student = resolve_student(conn, user, identity)
    uid = student['intg_uid']
    row = lock_plan(conn, uid, lock=False)
    caps = capabilities_for(conn, user, student, row)
    # 학생에게는 확정 전까지 계획이 보이지 않는다(04-decisions Q1). 빈 화면이 아니라
    # 사유와 다음 경로를 함께 내려보낸다(PROCESS.md §2 구현규칙 1).
    if not row or (user['kind'] == 'STUDENT' and row['status_code'] != 'CONFIRMED'):
        return {'roadmap': None, 'capabilities': caps, 'gate': program_gate(conn, uid),
                'pending': bool(row)}
    return {'roadmap': plan_dto(conn, uid, row, as_of(conn), caps), 'capabilities': caps,
            'gate': program_gate(conn, uid), 'pending': False}


def list_filters(user, status, hasRoadmap, collegeCode, deptCode, studentType, q):
    condition, values = scope_condition(user, 's.intg_uid')
    where = [condition]
    if status:
        where.append('r.status_code=%s')
        values.append(status)
    if hasRoadmap in ('true', 'false'):
        where.append('r.student_uid IS NOT NULL' if hasRoadmap == 'true' else 'r.student_uid IS NULL')
    # 대학·학과는 코드 쌍으로 건다. 학과명 매칭은 하지 않는다(CLAUDE.md 7조) —
    # 동명 학과가 과정별로 존재해 이름으로 고르면 다른 학과가 섞인다.
    if collegeCode:
        where.append('s.college_code=%s')
        values.append(collegeCode)
    if deptCode:
        where.append('s.dept_code=%s')
        values.append(deptCode)
    if studentType:
        where.append('t.student_type=%s')
        values.append(studentType)
    if q and q.strip():
        where.append("concat_ws(' ',p.name,s.student_no) ILIKE %s")
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    return ' AND '.join(f'({x})' for x in where), values


LIST_FROM = '''FROM dc.student s JOIN dc.person p USING(intg_uid)
 LEFT JOIN dc.roadmap r ON r.student_uid=s.intg_uid
 LEFT JOIN LATERAL (SELECT student_type FROM dc.student_type_event e WHERE e.student_uid=s.intg_uid
                     ORDER BY decided_at DESC,id DESC LIMIT 1) t ON true'''


@router.get('/roadmaps')
def list_roadmaps(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                  status: str | None = None, hasRoadmap: str | None = None,
                  collegeCode: str | None = None, deptCode: str | None = None,
                  studentType: str | None = None, q: str = Query('', max_length=200),
                  user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    require_plan_staff(conn, user)
    condition, values = list_filters(user, status, hasRoadmap, collegeCode, deptCode, studentType, q)
    moment = as_of(conn)
    total = conn.execute(f'SELECT count(*) AS n {LIST_FROM} WHERE {condition}', values).fetchone()['n']
    rows = conn.execute(f'''SELECT p.alias AS "studentId",p.name AS "studentName",s.student_no AS "studentNo",
      s.major_label AS "studentMajor",s.grade,s.college_code AS "collegeCode",s.dept_code AS "deptCode",
      t.student_type AS "studentType",r.status_code AS status,r.confirmed,r.version AS "roadmapVersion",
      r.lock_version AS version,r.target_role AS "targetRole",r.updated_at AS "updatedAt",
      (r.student_uid IS NOT NULL) AS "hasRoadmap",(s.detail ? 'roadmapOutcome') AS "canGenerate",
      g.done,g.total,g.pct {LIST_FROM}
      LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid,%s) g ON true
      WHERE {condition} ORDER BY p.name,s.student_no LIMIT %s OFFSET %s''',
      [moment, *values, pageSize, (page - 1) * pageSize]).fetchall()
    items = [{**{k: v for k, v in row.items() if k not in ('done', 'total', 'pct')},
              'progress': {'done': row['done'], 'total': row['total'], 'pct': row['pct']}} for row in rows]
    return dict(items=items, totalCount=total, page=page, pageSize=pageSize, asOf=moment)


@router.get('/roadmaps/summary')
def roadmap_summary(status: str | None = None, hasRoadmap: str | None = None,
                    collegeCode: str | None = None, deptCode: str | None = None,
                    studentType: str | None = None, q: str = Query('', max_length=200),
                    user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """이행률 분포·상태 카운트는 전부 SQL 이다. 화면이 전 학생을 받아 세지 않는다."""
    require_plan_staff(conn, user, STATS_MENU)
    condition, values = list_filters(user, status, hasRoadmap, collegeCode, deptCode, studentType, q)
    moment = as_of(conn)
    row = conn.execute(f'''SELECT count(*)::int AS total,
      count(*) FILTER(WHERE r.student_uid IS NOT NULL)::int AS "withRoadmap",
      count(*) FILTER(WHERE r.status_code='DRAFT')::int AS draft,
      count(*) FILTER(WHERE r.status_code='REVIEW')::int AS review,
      count(*) FILTER(WHERE r.confirmed)::int AS confirmed,
      count(*) FILTER(WHERE r.student_uid IS NULL AND s.detail ? 'roadmapOutcome')::int AS "generatable",
      COALESCE(round(avg(g.pct) FILTER(WHERE r.student_uid IS NOT NULL))::int,0) AS "averageProgress",
      count(*) FILTER(WHERE r.student_uid IS NOT NULL AND g.pct<30)::int AS "band0",
      count(*) FILTER(WHERE r.student_uid IS NOT NULL AND g.pct>=30 AND g.pct<60)::int AS "band30",
      count(*) FILTER(WHERE r.student_uid IS NOT NULL AND g.pct>=60 AND g.pct<80)::int AS "band60",
      count(*) FILTER(WHERE r.student_uid IS NOT NULL AND g.pct>=80)::int AS "band80"
      {LIST_FROM} LEFT JOIN LATERAL dc.roadmap_progress(s.intg_uid,%s) g ON true
      WHERE {condition}''', [moment, *values]).fetchone()
    return {'summary': {k: row[k] for k in ('total', 'withRoadmap', 'draft', 'review', 'confirmed',
                                            'generatable', 'averageProgress')},
            'bands': [{'from': 0, 'to': 29, 'count': row['band0']}, {'from': 30, 'to': 59, 'count': row['band30']},
                      {'from': 60, 'to': 79, 'count': row['band60']}, {'from': 80, 'to': 100, 'count': row['band80']}],
            'asOf': moment}


@router.get('/students/{identity}/roadmap/generation-capability')
def generation_capability(identity: str, user=Depends(principal, scope='function'),
                          conn=Depends(connection, scope='function')):
    student = resolve_student(conn, user, identity)
    source = generation_source(student)
    row = lock_plan(conn, student['intg_uid'], lock=False)
    if not source:
        return {'canGenerate': False, 'providerSource': None, 'targetRole': None,
                'reasonCode': 'ROADMAP_GENERATOR_UNAVAILABLE',
                'message': '이 학생에게 사용할 수 있는 생성 결과가 없습니다.'}
    # 산출물 본문(15칸·이유)은 여기서 내려보내지 않는다 — 생성 트랜잭션이 서버에서 채택한다.
    return {'canGenerate': True, 'providerSource': 'fixture', 'targetRole': source.get('targetRole'),
            'currentStatus': row['status_code'] if row else None, 'reasonCode': None, 'message': None}


# ── 사건 ────────────────────────────────────────────────────────────────

def plan_event(conn, user, uid, version, action, after, *, before=None, cause=None,
               lock_before=None, lock_after=None, reason_text='', transaction_id=None):
    return conn.execute('''INSERT INTO dc.roadmap_event(student_uid,roadmap_version,lock_version_before,
      lock_version_after,action_code,cause_kind,cause_id,actor_uid,before_value,after_value,reason,transaction_id)
      VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id''',
      (uid, version, lock_before, lock_after, action, cause[0] if cause else None,
       cause[1] if cause else None, user['intg_uid'],
       Jsonb(jsonable_encoder(before)) if before is not None else None,
       Jsonb(jsonable_encoder(after)), reason_text, transaction_id or uuid4())).fetchone()['id']


def item_event(conn, user, uid, version, item_id, action, before, after, *, cause=None, transaction_id=None):
    conn.execute('''INSERT INTO dc.roadmap_item_event(student_uid,item_id,actor_uid,before_value,after_value,
      schema_version,roadmap_version,action_code,cause_kind,cause_id,item_version_before,item_version_after,
      transaction_id) VALUES(%s,%s,%s,%s,%s,2,%s,%s,%s,%s,%s,%s,%s)''',
      (uid, item_id, user['intg_uid'], Jsonb(jsonable_encoder(before)) if before is not None else Jsonb({}),
       Jsonb(jsonable_encoder(after)), version, action, cause[0] if cause else None,
       cause[1] if cause else None, (before or {}).get('version'), (after or {}).get('version'),
       transaction_id or uuid4()))


def touch(conn, user, uid):
    return conn.execute('''UPDATE dc.roadmap SET lock_version=lock_version+1,updated_at=now(),updated_by=%s
      WHERE student_uid=%s RETURNING *''', (user['intg_uid'], uid)).fetchone()


# ── 생성·재생성 ──────────────────────────────────────────────────────────

class Generate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    counselRequestId: str = Field(min_length=1, max_length=200)
    targetRole: str | None = Field(default=None, max_length=200)
    expectedRoadmapVersion: int = Field(ge=0)
    expectedVersion: int = Field(ge=0)
    reason: str = Field(default='', max_length=2000)


def check_counsel_basis(conn, uid, request_id):
    """생성 근거가 되는 상담. 학생·트랙·상태·취소 여부를 전부 서버가 확인한다.
    상담 완료를 선행 요구하지 않는다 — 완료가 확정 계획을 요구하므로 순환한다(spec_v1 §7.1)."""
    row = conn.execute('''SELECT * FROM dc.counsel_request WHERE id=%s AND student_uid=%s FOR SHARE''',
                       (request_id, uid)).fetchone()
    if not row:
        fail(422, 'INVALID_COUNSEL_BASIS', '이 학생의 상담이 아닙니다.')
    if not is_care7_request(row):
        fail(422, 'INVALID_COUNSEL_BASIS', 'CARE 7+ 진로·취업 상담에서만 로드맵을 만듭니다.')
    if row['status_code'] not in ('CONFIRMED', 'DONE'):
        fail(422, 'INVALID_COUNSEL_BASIS', '확정된 상담 예약에서만 로드맵을 만듭니다.')
    return row


def adopt_run(conn, user, student, counsel, source, target_role, generation):
    """provider 산출물을 이번 세대에 채택한다. 점수·문구를 만들지 않고 받은 것을 그대로 쓴다.

    원본 fixture 와 「이번 세대의 채택」은 다른 사실이다. 채택할 때마다 새 불변 run 을 쌓고
    source_ref 에 원본을 남긴다 — model='fixture' 그대로이며 실제 LLM 호출로 기록하지 않는다.
    """
    payload = {'studentUid': student['intg_uid'], 'counselRequestId': counsel['id'],
               'targetRole': target_role, 'roadmapVersion': generation,
               'axes': [a['axis'] for a in source['axes']]}
    digest = hashlib.sha256(str(sorted(payload.items())).encode()).hexdigest()
    type_row = conn.execute('''SELECT id,student_type FROM dc.student_type_event WHERE student_uid=%s
      ORDER BY decided_at DESC,id DESC LIMIT 1''', (student['intg_uid'],)).fetchone()
    run_id = 'ai_roadmap_' + student['intg_uid'] + '_v' + str(generation) + '_' + uuid4().hex[:8]
    conn.execute('''INSERT INTO dc.ai_run(id,kind_code,student_uid,subject_kind,subject_id,model,requested_by,
      schema_version,input_hash,input_snapshot,source_ref) VALUES(%s,'ROADMAP_GENERATION',%s,'ROADMAP',%s,
      'fixture',%s,1,%s,%s,%s)''',
      (run_id, student['intg_uid'], student['intg_uid'] + ':' + str(generation), user['intg_uid'], digest,
       Jsonb({**payload, 'typeContext': {'source': 'STUDENT_TYPE_EVENT',
                                         'baseTypeEventId': str(type_row['id']) if type_row else None,
                                         'code': type_row['student_type'] if type_row else None}}),
       Jsonb({'kind': 'SEED_ROADMAP_OUTCOME', 'studentUid': student['intg_uid']})))
    suggestions = {}
    position = 0
    for axis in source['axes']:
        position += 1
        suggestions[('axis', axis['axis'])] = conn.execute('''INSERT INTO dc.ai_suggestion(run_id,position,
          category,title,detail,meta) VALUES(%s,%s,'axis',%s,%s,%s) RETURNING id''',
          (run_id, position, axis['headline'], axis['rationale'], Jsonb({'axis': axis['axis']}))).fetchone()['id']
    for axis in source['axes']:
        for index, cell in enumerate(axis['cells'], start=1):
            position += 1
            suggestions[('item', axis['axis'], index)] = conn.execute('''INSERT INTO dc.ai_suggestion(run_id,
              position,category,title,detail,meta) VALUES(%s,%s,'item',%s,%s,%s) RETURNING id''',
              (run_id, position, cell['title'], cell.get('why', ''),
               Jsonb({'axis': axis['axis'], 'position': index}))).fetchone()['id']
    return run_id, suggestions


def write_plan_body(conn, source, uid, run_suggestions):
    """3축 15칸을 쓴다. provider 가 DONE 이나 live programId 를 넣으면 거부한다 —
    새 계획의 모든 칸은 TODO 로 시작하고 아무것도 이월하지 않는다(PROCESS.md §6-6)."""
    if len(source['axes']) != 3 or {a['axis'] for a in source['axes']} != set(AXES):
        fail(422, 'INVALID_AXIS_COUNT', '생성 결과의 축 구성이 올바르지 않습니다.')
    for axis in source['axes']:
        if len(axis['cells']) != BASE_CELLS:
            fail(422, 'INVALID_AXIS_COUNT', '축마다 기본 5칸이 필요합니다.')
        conn.execute('''INSERT INTO dc.roadmap_axis(student_uid,axis,headline,rationale,ai_suggestion_id)
          VALUES(%s,%s,%s,%s,%s)''', (uid, axis['axis'], axis['headline'], axis['rationale'],
          run_suggestions.get(('axis', axis['axis']))))
        for position, cell in enumerate(axis['cells'], start=1):
            if cell.get('status') == 'DONE' or cell.get('programId'):
                fail(422, 'INVALID_FIELD', '생성 결과는 완료 칸이나 프로그램 칸을 포함할 수 없습니다.')
            importance = IMPORTANCE_CODE.get(cell['importance'], cell['importance'])
            if cell['priority'] not in PRIORITIES or importance not in IMPORTANCES:
                fail(422, 'INVALID_CODE', '생성 결과의 우선순위·중요도 코드를 확인해 주세요.')
            conn.execute('''INSERT INTO dc.roadmap_item(student_uid,axis,id,position,title,priority,importance,
              why,status,entry,origin_code,created_at,ai_suggestion_id)
              VALUES(%s,%s,%s,%s,%s,%s,%s,%s,'TODO','NONE','BASE',now(),%s)''',
              (uid, axis['axis'], 'rmi_' + uuid4().hex[:16], position, cell['title'], cell['priority'],
               importance, cell.get('why', ''), run_suggestions.get(('item', axis['axis'], position))))


def snapshot_plan(conn, user, uid, row, moment, transaction_id):
    """재생성 직전에 **지금 화면이 보는 구성 전체**를 얼린다. 숨김·만료 칸과 당시 SQL 집계까지
    함께 동결한다 — 과거 스냅샷을 현재 프로그램 목록으로 다시 계산하지 않는다."""
    progress, by_axis = progress_of(conn, uid, moment)
    items = conn.execute('''SELECT *,dc.roadmap_item_alive(status,entry,expires_at,%s) AS alive
      FROM dc.roadmap_item WHERE student_uid=%s ORDER BY axis,position,id''', (moment, uid)).fetchall()
    axes = conn.execute('SELECT * FROM dc.roadmap_axis WHERE student_uid=%s ORDER BY axis', (uid,)).fetchall()
    type_row = conn.execute('''SELECT e.id,e.student_type,c.label FROM dc.student_type_event e
      LEFT JOIN dc.student_type_code c ON c.code=e.student_type WHERE e.student_uid=%s
      ORDER BY e.decided_at DESC,e.id DESC LIMIT 1''', (uid,)).fetchone()
    payload = {
        'schemaVersion': SNAPSHOT_SCHEMA, 'asOf': moment, 'roadmapVersion': row['version'],
        'lockVersion': row['lock_version'], 'status': row['status_code'], 'basisKind': row['basis_kind'],
        'counselRequestId': row['counsel_request_id'], 'aiRunId': row['ai_run_id'],
        'targetRole': row['target_role'], 'targetCompany': row['target_company'],
        'confirmedAt': row['confirmed_at'], 'confirmedBy': row['confirmed_by'],
        'progress': progress, 'byAxis': by_axis,
        'axes': [{'axis': a['axis'], 'headline': a['headline'], 'rationale': a['rationale'],
                  'editorNote': a['editor_note'], 'aiSuggestionId': a['ai_suggestion_id']} for a in axes],
        'cells': [cell_dto(i) for i in items],
        'studentType': {'eventId': str(type_row['id']), 'code': type_row['student_type'],
                        'label': type_row['label']} if type_row else None,
        'transactionId': str(transaction_id),
    }
    try:
        conn.execute('INSERT INTO dc.roadmap_snapshot(student_uid,version,payload,actor_uid) VALUES(%s,%s,%s,%s)',
                     (uid, row['version'], Jsonb(jsonable_encoder(payload)), user['intg_uid']))
    except Exception as error:
        if getattr(error, 'sqlstate', None) == '23505':
            fail(409, 'SNAPSHOT_VERSION_EXISTS', '이 세대의 스냅샷이 이미 있습니다.')
        raise


def apply_requests(conn, user, uid, roadmap_version, requests, event_id, transaction_id):
    """요청 반영은 실제 편집 트랜잭션 안에서만 일어난다. requestId 만 눌러 완료로 바꾸는
    별도 무근거 API 를 두지 않는다 — 그러면 무엇이 반영됐는지 아무도 모른다."""
    for entry in requests or []:
        row = conn.execute('SELECT * FROM dc.roadmap_request WHERE id=%s FOR UPDATE', (entry.id,)).fetchone()
        if not row or row['student_uid'] != uid:
            fail(404, 'NOT_FOUND', '변경 요청을 찾을 수 없습니다.')
        if row['version'] != entry.expectedVersion:
            fail(409, 'VERSION_CONFLICT', '변경 요청이 이미 처리됐습니다.', currentVersion=row['version'])
        if row['status_code'] != 'REQ':
            fail(409, 'INVALID_TRANSITION', '이미 처리된 변경 요청입니다.')
        if row['roadmap_version'] is not None and row['roadmap_version'] != roadmap_version:
            fail(409, 'STALE_REQUEST_TARGET', '지난 세대의 계획을 가리키는 요청입니다.')
        after = conn.execute('''UPDATE dc.roadmap_request SET status_code='APPLIED',handled_at=now(),
          handled_by=%s,handling_note=%s,applied_event_id=%s,version=version+1 WHERE id=%s RETURNING *''',
          (user['intg_uid'], entry.note, event_id, entry.id)).fetchone()
        conn.execute('''INSERT INTO dc.roadmap_request_event(request_id,student_uid,action,status_before,
          status_after,version_before,version_after,actor_uid,reason,transaction_id)
          VALUES(%s,%s,'APPLY',%s,%s,%s,%s,%s,%s,%s)''',
          (entry.id, uid, row['status_code'], after['status_code'], row['version'], after['version'],
           user['intg_uid'], entry.note, transaction_id))


@router.post('/students/{identity}/roadmap/generate', status_code=201)
def generate(identity: str, body: Generate, idempotency_key: str = Header(min_length=8, max_length=200),
             user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    route = 'POST /students/roadmap/generate'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    lifecycle_lock(conn, exclusive=False)
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    uid = student['intg_uid']
    source = generation_source(student)
    if not source:
        fail(503, 'ROADMAP_GENERATOR_UNAVAILABLE', '이 학생에게 사용할 수 있는 생성 결과가 없습니다.')
    if lock_plan(conn, uid) is not None:
        fail(409, 'INVALID_TRANSITION', '이미 계획이 있습니다. 재생성을 사용하세요.')
    if body.expectedRoadmapVersion or body.expectedVersion:
        fail(409, 'VERSION_CONFLICT', '아직 계획이 없습니다.', currentRoadmapVersion=0, currentVersion=0)
    counsel = check_counsel_basis(conn, uid, body.counselRequestId)
    target_role = body.targetRole or source['targetRole']
    run_id, suggestions = adopt_run(conn, user, student, counsel, source, target_role, 1)
    row = conn.execute('''INSERT INTO dc.roadmap(student_uid,target_role,target_company,version,status_code,
      basis_kind,counsel_request_id,ai_run_id,created_by,updated_by) VALUES(%s,%s,%s,1,'DRAFT','COUNSEL',%s,%s,%s,%s)
      RETURNING *''', (uid, target_role, Jsonb(source['targetCompany']), counsel['id'], run_id,
      user['intg_uid'], user['intg_uid'])).fetchone()
    write_plan_body(conn, source, uid, suggestions)
    transaction_id = uuid4()
    plan_event(conn, user, uid, 1, 'CREATE', {'targetRole': target_role, 'aiRunId': run_id},
               cause=('COUNSEL_REQUEST', counsel['id']), lock_after=row['lock_version'],
               reason_text=body.reason, transaction_id=transaction_id)
    result = plan_dto(conn, uid, row, as_of(conn), capabilities_for(conn, user, student, row))
    return remember(conn, user, route, idempotency_key, digest, result)


class Regenerate(Generate):
    requests: list['RequestRef'] = Field(default_factory=list, max_length=100)


@router.post('/students/{identity}/roadmap/regenerate')
def regenerate(identity: str, body: Regenerate, idempotency_key: str = Header(min_length=8, max_length=200),
               user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """스냅샷 → 교체 → 새 세대가 하나의 트랜잭션이다. 어느 단계가 실패해도 전부 되돌린다."""
    route = 'POST /students/roadmap/regenerate'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    lifecycle_lock(conn, exclusive=False)
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    uid = student['intg_uid']
    source = generation_source(student)
    if not source:
        fail(503, 'ROADMAP_GENERATOR_UNAVAILABLE', '이 학생에게 사용할 수 있는 생성 결과가 없습니다.')
    row = lock_plan(conn, uid)
    if not row:
        fail(404, 'NOT_FOUND', '계획이 없습니다.')
    check_versions(row, body.expectedRoadmapVersion, body.expectedVersion)
    counsel = check_counsel_basis(conn, uid, body.counselRequestId)
    transaction_id = uuid4()
    moment = as_of(conn)
    before = plan_dto(conn, uid, row, moment, {})
    snapshot_plan(conn, user, uid, row, moment, transaction_id)
    generation = row['version'] + 1
    target_role = body.targetRole or source['targetRole']
    run_id, suggestions = adopt_run(conn, user, student, counsel, source, target_role, generation)
    # 구세대 칸은 이월하지 않는다. 완료·자동편입 칸도 전부 사라지고 스냅샷에만 남는다.
    conn.execute('DELETE FROM dc.roadmap_item WHERE student_uid=%s', (uid,))
    conn.execute('DELETE FROM dc.roadmap_axis WHERE student_uid=%s', (uid,))
    row = conn.execute('''UPDATE dc.roadmap SET version=%s,status_code='DRAFT',target_role=%s,target_company=%s,
      basis_kind='COUNSEL',counsel_request_id=%s,ai_run_id=%s,confirmed_at=NULL,confirmed_by=NULL,
      lock_version=lock_version+1,updated_at=now(),updated_by=%s WHERE student_uid=%s RETURNING *''',
      (generation, target_role, Jsonb(source['targetCompany']), counsel['id'], run_id,
       user['intg_uid'], uid)).fetchone()
    write_plan_body(conn, source, uid, suggestions)
    event_id = plan_event(conn, user, uid, generation, 'REGENERATE',
                          {'targetRole': target_role, 'aiRunId': run_id}, before=before,
                          cause=('COUNSEL_REQUEST', counsel['id']), lock_before=body.expectedVersion,
                          lock_after=row['lock_version'], reason_text=body.reason,
                          transaction_id=transaction_id)
    apply_requests(conn, user, uid, generation, body.requests, event_id, transaction_id)
    result = plan_dto(conn, uid, row, as_of(conn), capabilities_for(conn, user, student, row))
    return remember(conn, user, route, idempotency_key, digest, result)


# ── 편집 ────────────────────────────────────────────────────────────────

class RequestRef(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    id: str = Field(min_length=1, max_length=200)
    expectedVersion: int = Field(ge=1)
    note: str = Field(default='', max_length=2000)


class Operation(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    op: str = Field(pattern='^(setAxis|editItem|reorderItems)$')
    axis: str | None = Field(default=None, pattern='^(IAP|CORE|GROWTH)$')
    headline: str | None = Field(default=None, max_length=300)
    itemId: str | None = Field(default=None, max_length=200)
    itemIds: list[str] = Field(default_factory=list, max_length=50)
    expectedItemVersion: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, max_length=200)
    priority: str | None = Field(default=None, pattern='^(P0|P1|P2)$')
    importance: str | None = Field(default=None, pattern='^(REQUIRED|IMPORTANT|RECOMMENDED)$')
    editorNote: str | None = Field(default=None, max_length=2000)

    @model_validator(mode='after')
    def shape(self):
        if self.op == 'setAxis' and not self.axis:
            raise ValueError('축을 지정해 주세요.')
        if self.op == 'editItem' and (not self.itemId or self.expectedItemVersion is None):
            raise ValueError('칸과 버전을 지정해 주세요.')
        if self.op == 'reorderItems' and (not self.axis or not self.itemIds):
            raise ValueError('축과 칸 순서를 지정해 주세요.')
        return self


class Patch(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedRoadmapVersion: int = Field(ge=1)
    expectedVersion: int = Field(ge=1)
    operations: list[Operation] = Field(default_factory=list, max_length=60)
    requests: list[RequestRef] = Field(default_factory=list, max_length=100)
    note: str = Field(default='', max_length=2000)


def get_item(conn, uid, item_id, lock=True):
    row = conn.execute('SELECT * FROM dc.roadmap_item WHERE student_uid=%s AND id=%s'
                       + (' FOR UPDATE' if lock else ''), (uid, item_id)).fetchone()
    if not row:
        fail(404, 'NOT_FOUND', '칸을 찾을 수 없습니다.')
    return row


def run_operations(conn, user, uid, generation, operations, transaction_id):
    for op in operations:
        if op.op == 'setAxis':
            before = conn.execute('SELECT * FROM dc.roadmap_axis WHERE student_uid=%s AND axis=%s FOR UPDATE',
                                  (uid, op.axis)).fetchone()
            if not before:
                fail(404, 'NOT_FOUND', '축을 찾을 수 없습니다.')
            conn.execute('''UPDATE dc.roadmap_axis SET headline=COALESCE(%s,headline),
              editor_note=COALESCE(%s,editor_note) WHERE student_uid=%s AND axis=%s''',
              (op.headline, op.editorNote, uid, op.axis))
        elif op.op == 'editItem':
            before = get_item(conn, uid, op.itemId)
            # 프로그램 칸의 정본은 비교과다. 제목·이유까지 여기서 고치면 두 벌이 된다.
            if before['origin_code'] == 'AUTO_PROGRAM':
                fail(409, 'INVALID_TRANSITION', '비교과 편입 칸은 프로그램에서만 바뀝니다.')
            if before['version'] != op.expectedItemVersion:
                fail(409, 'VERSION_CONFLICT', '칸이 변경됐습니다. 새로 조회한 뒤 수정하세요.',
                     currentVersion=before['version'])
            after = conn.execute('''UPDATE dc.roadmap_item SET title=COALESCE(%s,title),
              priority=COALESCE(%s,priority),importance=COALESCE(%s,importance),
              editor_note=COALESCE(%s,editor_note),version=version+1
              WHERE student_uid=%s AND id=%s RETURNING *''',
              (op.title, op.priority, op.importance, op.editorNote, uid, op.itemId)).fetchone()
            item_event(conn, user, uid, generation, op.itemId, 'EDIT', cell_dto(before), cell_dto(after),
                       transaction_id=transaction_id)
        else:
            rows = conn.execute('''SELECT * FROM dc.roadmap_item WHERE student_uid=%s AND axis=%s
              AND origin_code='BASE' ORDER BY position FOR UPDATE''', (uid, op.axis)).fetchall()
            if {r['id'] for r in rows} != set(op.itemIds) or len(op.itemIds) != len(rows):
                fail(422, 'INVALID_FIELD', '이 축의 기본 칸 전체를 순서대로 보내야 합니다.')
            # 정렬 유니크가 DEFERRABLE 이라 임시 영역을 거치지 않고 한 번에 다시 쓴다.
            for position, item_id in enumerate(op.itemIds, start=1):
                conn.execute('UPDATE dc.roadmap_item SET position=%s WHERE student_uid=%s AND id=%s',
                             (position, uid, item_id))


@router.patch('/students/{identity}/roadmap')
def edit_roadmap(identity: str, body: Patch, idempotency_key: str = Header(min_length=8, max_length=200),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    route = 'PATCH /students/roadmap'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    lifecycle_lock(conn, exclusive=False)
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    uid = student['intg_uid']
    row = lock_plan(conn, uid)
    if not row:
        fail(404, 'NOT_FOUND', '계획이 없습니다.')
    check_versions(row, body.expectedRoadmapVersion, body.expectedVersion)
    transaction_id = uuid4()
    moment = as_of(conn)
    before = plan_dto(conn, uid, row, moment, {})
    run_operations(conn, user, uid, row['version'], body.operations, transaction_id)
    row = touch(conn, user, uid)
    after = plan_dto(conn, uid, row, moment, {})
    event_id = plan_event(conn, user, uid, row['version'], 'EDIT', after, before=before,
                          lock_before=body.expectedVersion, lock_after=row['lock_version'],
                          reason_text=body.note, transaction_id=transaction_id)
    apply_requests(conn, user, uid, row['version'], body.requests, event_id, transaction_id)
    result = plan_dto(conn, uid, row, as_of(conn), capabilities_for(conn, user, student, row))
    return remember(conn, user, route, idempotency_key, digest, result)


class Transition(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedRoadmapVersion: int = Field(ge=1)
    expectedVersion: int = Field(ge=1)
    reason: str = Field(default='', max_length=2000)


ALLOWED_TRANSITIONS = {'review': ({'DRAFT', 'REVIEW'}, 'REVIEW', 'REVIEW'),
                       'confirm': ({'DRAFT', 'REVIEW'}, 'CONFIRMED', 'CONFIRM'),
                       'reopen': ({'REVIEW', 'CONFIRMED'}, 'DRAFT', 'REOPEN')}


@router.post('/students/{identity}/roadmap/{action}')
def transition(identity: str, action: str, body: Transition,
               idempotency_key: str = Header(min_length=8, max_length=200),
               user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if action not in ALLOWED_TRANSITIONS:
        fail(404, 'NOT_FOUND', '알 수 없는 동작입니다.')
    route = 'POST /students/roadmap/' + action
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    lifecycle_lock(conn, exclusive=False)
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    uid = student['intg_uid']
    row = lock_plan(conn, uid)
    if not row:
        fail(404, 'NOT_FOUND', '계획이 없습니다.')
    check_versions(row, body.expectedRoadmapVersion, body.expectedVersion)
    allowed, target, event = ALLOWED_TRANSITIONS[action]
    previous = row['status_code']
    if previous not in allowed:
        fail(409, 'INVALID_TRANSITION', '지금 상태에서 할 수 없는 전이입니다.')
    if target == 'CONFIRMED':
        # 3축 15칸은 DB 의 지연 제약이 최종 보증한다. 여기서는 사람이 읽을 오류로 먼저 거른다.
        counts = conn.execute('''SELECT axis,count(*)::int AS n FROM dc.roadmap_item
          WHERE student_uid=%s AND origin_code='BASE' GROUP BY axis''', (uid,)).fetchall()
        if len(counts) != 3 or any(c['n'] != BASE_CELLS for c in counts):
            fail(422, 'INVALID_AXIS_COUNT', '확정하려면 3축 각각 기본 5칸이 필요합니다.')
    row = conn.execute('''UPDATE dc.roadmap SET status_code=%s,
      confirmed_at=CASE WHEN %s='CONFIRMED' THEN now() END,
      confirmed_by=CASE WHEN %s='CONFIRMED' THEN %s END,
      lock_version=lock_version+1,updated_at=now(),updated_by=%s WHERE student_uid=%s RETURNING *''',
      (target, target, target, user['intg_uid'], user['intg_uid'], uid)).fetchone()
    plan_event(conn, user, uid, row['version'], event, {'status': target}, before={'status': previous},
               lock_before=body.expectedVersion, lock_after=row['lock_version'], reason_text=body.reason)
    result = plan_dto(conn, uid, row, as_of(conn), capabilities_for(conn, user, student, row))
    return remember(conn, user, route, idempotency_key, digest, result)


class Completion(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedRoadmapVersion: int = Field(ge=1)
    expectedVersion: int = Field(ge=1)
    expectedItemVersion: int = Field(ge=1)
    done: bool
    reason: str = Field(min_length=1, max_length=2000)
    evidenceRef: dict = Field(default_factory=dict)


@router.post('/students/{identity}/roadmap/items/{item_id}/completion')
def set_completion(identity: str, item_id: str, body: Completion,
                   idempotency_key: str = Header(min_length=8, max_length=200),
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """수동 칸만 상담사가 닫는다. 프로그램 칸은 수료(COMPLETED)만 닫는다(spec_v1 §7.2) —
    성장일지 작성·찜·선발·출석·자기신고로는 어떤 칸도 닫히지 않는다."""
    route = 'POST /students/roadmap/items/completion'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + item_id + body.model_dump_json())
    if saved:
        return saved
    lifecycle_lock(conn, exclusive=False)
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    uid = student['intg_uid']
    row = lock_plan(conn, uid)
    if not row:
        fail(404, 'NOT_FOUND', '계획이 없습니다.')
    check_versions(row, body.expectedRoadmapVersion, body.expectedVersion)
    item = get_item(conn, uid, item_id)
    if item['program_id']:
        fail(409, 'INVALID_TRANSITION', '비교과 칸은 수료 처리로만 닫힙니다.')
    if item['version'] != body.expectedItemVersion:
        fail(409, 'VERSION_CONFLICT', '칸이 변경됐습니다.', currentVersion=item['version'])
    after = conn.execute('''UPDATE dc.roadmap_item SET status=%s,
      completed_at=CASE WHEN %s THEN now() END,completion_source_code=CASE WHEN %s THEN 'MANUAL' END,
      completion_ref=CASE WHEN %s THEN %s::jsonb END,version=version+1
      WHERE student_uid=%s AND id=%s RETURNING *''',
      ('DONE' if body.done else 'TODO', body.done, body.done, body.done,
       Jsonb({**body.evidenceRef, 'reason': body.reason}), uid, item_id)).fetchone()
    transaction_id = uuid4()
    item_event(conn, user, uid, row['version'], item_id, 'COMPLETE' if body.done else 'REOPEN',
               cell_dto(item), cell_dto(after), transaction_id=transaction_id)
    row = touch(conn, user, uid)
    plan_event(conn, user, uid, row['version'], 'ITEM_COMPLETION', cell_dto(after), before=cell_dto(item),
               cause=('ROADMAP_ITEM', item_id), lock_before=body.expectedVersion,
               lock_after=row['lock_version'], reason_text=body.reason, transaction_id=transaction_id)
    result = plan_dto(conn, uid, row, as_of(conn), capabilities_for(conn, user, student, row))
    return remember(conn, user, route, idempotency_key, digest, result)


class Restore(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    eventId: str = Field(min_length=1, max_length=64)
    expectedRoadmapVersion: int = Field(ge=1)
    expectedVersion: int = Field(ge=1)
    reason: str = Field(default='', max_length=2000)


@router.post('/students/{identity}/roadmap/edits/restore')
def restore_edit(identity: str, body: Restore, idempotency_key: str = Header(min_length=8, max_length=200),
                 user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """되돌리기도 새 사건이다. 원래 이력을 지우거나 과거 세대를 되살리지 않는다."""
    route = 'POST /students/roadmap/edits/restore'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    lifecycle_lock(conn, exclusive=False)
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    uid = student['intg_uid']
    row = lock_plan(conn, uid)
    if not row:
        fail(404, 'NOT_FOUND', '계획이 없습니다.')
    check_versions(row, body.expectedRoadmapVersion, body.expectedVersion)
    event = conn.execute('''SELECT * FROM dc.roadmap_event WHERE id=%s AND student_uid=%s''',
                         (body.eventId, uid)).fetchone()
    if not event or event['action_code'] != 'EDIT':
        fail(404, 'NOT_FOUND', '되돌릴 수정 이력을 찾을 수 없습니다.')
    if event['roadmap_version'] != row['version']:
        fail(409, 'STALE_REQUEST_TARGET', '지난 세대의 수정은 되돌릴 수 없습니다.')
    transaction_id = uuid4()
    moment = as_of(conn)
    current = plan_dto(conn, uid, row, moment, {})
    for axis in (event['before_value'] or {}).get('axes', []):
        conn.execute('''UPDATE dc.roadmap_axis SET headline=%s,editor_note=%s
          WHERE student_uid=%s AND axis=%s''', (axis['headline'], axis['editorNote'], uid, axis['axis']))
        for cell in axis['cells']:
            if cell['origin'] != 'BASE':
                continue
            target = conn.execute('SELECT * FROM dc.roadmap_item WHERE student_uid=%s AND id=%s FOR UPDATE',
                                  (uid, cell['id'])).fetchone()
            if not target:
                continue
            after = conn.execute('''UPDATE dc.roadmap_item SET title=%s,priority=%s,importance=%s,
              editor_note=%s,version=version+1 WHERE student_uid=%s AND id=%s RETURNING *''',
              (cell['title'], cell['priority'], cell['importance'], cell['editorNote'], uid,
               cell['id'])).fetchone()
            item_event(conn, user, uid, row['version'], cell['id'], 'EDIT', cell_dto(target), cell_dto(after),
                       cause=('ROADMAP_EVENT', str(event['id'])), transaction_id=transaction_id)
    row = touch(conn, user, uid)
    plan_event(conn, user, uid, row['version'], 'RESTORE_EDIT', plan_dto(conn, uid, row, moment, {}),
               before=current, cause=('ROADMAP_EVENT', str(event['id'])),
               lock_before=body.expectedVersion, lock_after=row['lock_version'],
               reason_text=body.reason, transaction_id=transaction_id)
    result = plan_dto(conn, uid, row, as_of(conn), capabilities_for(conn, user, student, row))
    return remember(conn, user, route, idempotency_key, digest, result)


# ── 이력·스냅샷 ──────────────────────────────────────────────────────────

@router.get('/students/{identity}/roadmap/events')
def plan_events(identity: str, page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    student = resolve_student(conn, user, identity)
    uid = student['intg_uid']
    total = conn.execute('SELECT count(*) AS n FROM dc.roadmap_event WHERE student_uid=%s', (uid,)).fetchone()['n']
    rows = conn.execute('''SELECT e.id,e.roadmap_version AS "roadmapVersion",e.action_code AS action,
      e.cause_kind AS "causeKind",e.cause_id AS "causeId",e.reason,e.occurred_at AS "occurredAt",
      p.name AS "actorName" FROM dc.roadmap_event e LEFT JOIN dc.person p ON p.intg_uid=e.actor_uid
      WHERE e.student_uid=%s ORDER BY e.occurred_at DESC,e.id LIMIT %s OFFSET %s''',
      (uid, pageSize, (page - 1) * pageSize)).fetchall()
    return dict(items=rows, totalCount=total, page=page, pageSize=pageSize)


@router.get('/students/{identity}/roadmap/snapshots')
def snapshots(identity: str, page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
              user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    # 과거 세대는 상담사 검수용이다. 학생 화면은 아직 열지 않는다(DB.md #37 미결).
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    uid = student['intg_uid']
    total = conn.execute('SELECT count(*) AS n FROM dc.roadmap_snapshot WHERE student_uid=%s',
                         (uid,)).fetchone()['n']
    rows = conn.execute('''SELECT s.version,s.created_at AS "createdAt",p.name AS "actorName",
      COALESCE((s.payload->>'schemaVersion')::int,1) AS "schemaVersion",s.payload->'progress' AS progress
      FROM dc.roadmap_snapshot s LEFT JOIN dc.person p ON p.intg_uid=s.actor_uid
      WHERE s.student_uid=%s ORDER BY s.version DESC LIMIT %s OFFSET %s''',
      (uid, pageSize, (page - 1) * pageSize)).fetchall()
    return dict(items=rows, totalCount=total, page=page, pageSize=pageSize)


@router.get('/students/{identity}/roadmap/snapshots/{version}')
def snapshot_detail(identity: str, version: int, user=Depends(principal, scope='function'),
                    conn=Depends(connection, scope='function')):
    student = resolve_student(conn, user, identity)
    require_plan_staff(conn, user)
    row = conn.execute('SELECT * FROM dc.roadmap_snapshot WHERE student_uid=%s AND version=%s',
                       (student['intg_uid'], version)).fetchone()
    if not row:
        fail(404, 'NOT_FOUND', '스냅샷을 찾을 수 없습니다.')
    payload = row['payload']
    # 과거 스냅샷을 현재 프로그램·코드 라벨·유형으로 다시 그리지 않는다. 동결 payload 를 그대로 준다.
    return {'version': row['version'], 'createdAt': row['created_at'], 'payload': payload,
            'schemaVersion': payload.get('schemaVersion', 1),
            'limitations': [] if payload.get('schemaVersion') == SNAPSHOT_SCHEMA
                            else ['이 스냅샷은 구버전 payload 라 일부 항목이 없습니다.']}


# ── 변경 요청 ────────────────────────────────────────────────────────────

class NewRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=200)
    reason: str = Field(min_length=1, max_length=4000)
    axis: str | None = Field(default=None, pattern='^(IAP|CORE|GROWTH)$')
    targetItemId: str | None = Field(default=None, max_length=200)
    expectedRoadmapVersion: int = Field(ge=1)
    expectedVersion: int = Field(ge=1)


def request_dto(row):
    return {'id': row['id'], 'studentId': row.get('alias'), 'studentName': row.get('student_name'),
            'studentNo': row.get('student_no'), 'studentMajor': row.get('major_label'),
            'axis': row['axis'], 'title': row['title'], 'reason': row['reason'],
            'status': row['status_code'], 'requestedAt': row['requested_at'],
            'handledAt': row['handled_at'], 'handlingNote': row['handling_note'],
            'roadmapVersion': row['roadmap_version'], 'targetItemId': row['target_item_id'],
            'appliedEventId': row['applied_event_id'], 'version': row['version']}


REQUEST_SELECT = '''SELECT r.*,p.alias,p.name AS student_name,s.student_no,s.major_label
 FROM dc.roadmap_request r JOIN dc.person p ON p.intg_uid=r.student_uid
 JOIN dc.student s ON s.intg_uid=r.student_uid'''


@router.post('/students/{identity}/roadmap-requests', status_code=201)
def create_request(identity: str, body: NewRequest, idempotency_key: str = Header(min_length=8, max_length=200),
                   user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        fail(403, 'SCOPE_DENIED', '학생 본인만 변경을 요청할 수 있습니다.')
    route = 'POST /students/roadmap-requests'
    digest, saved = idempotent(conn, user, route, idempotency_key, identity + body.model_dump_json())
    if saved:
        return saved
    student = resolve_student(conn, user, identity)
    uid = student['intg_uid']
    row = lock_plan(conn, uid, lock=False)
    if not row or not row['confirmed']:
        fail(409, 'INVALID_TRANSITION', '확정된 로드맵이 있어야 변경을 요청할 수 있습니다.')
    check_versions(row, body.expectedRoadmapVersion, body.expectedVersion)
    if body.targetItemId:
        get_item(conn, uid, body.targetItemId, lock=False)
    request_id = 'rmreq_' + uuid4().hex[:16]
    conn.execute('''INSERT INTO dc.roadmap_request(id,student_uid,axis,title,reason,status_code,requested_at,
      payload,roadmap_version,target_item_id) VALUES(%s,%s,%s,%s,%s,'REQ',now(),%s,%s,%s)''',
      (request_id, uid, body.axis, body.title, body.reason, Jsonb(jsonable_encoder(body.model_dump())),
       row['version'], body.targetItemId))
    conn.execute('''INSERT INTO dc.roadmap_request_event(request_id,student_uid,action,status_after,
      version_after,actor_uid,transaction_id) VALUES(%s,%s,'CREATE','REQ',1,%s,%s)''',
      (request_id, uid, user['intg_uid'], uuid4()))
    created = conn.execute(REQUEST_SELECT + ' WHERE r.id=%s', (request_id,)).fetchone()
    return remember(conn, user, route, idempotency_key, digest, request_dto(created))


@router.get('/roadmap-requests')
def list_requests(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
                  status: str | None = None, studentId: str | None = None,
                  collegeCode: str | None = None, deptCode: str | None = None,
                  q: str = Query('', max_length=200),
                  user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] == 'STAFF':
        require_plan_staff(conn, user, REQUEST_MENU)
    condition, values = scope_condition(user, 'r.student_uid')
    where = [condition]
    if status:
        where.append('r.status_code=%s')
        values.append(status)
    if studentId:
        where.append('(p.alias=%s OR r.student_uid=%s)')
        values.extend([studentId, studentId])
    if collegeCode:
        where.append('s.college_code=%s')
        values.append(collegeCode)
    if deptCode:
        where.append('s.dept_code=%s')
        values.append(deptCode)
    if q.strip():
        where.append("concat_ws(' ',p.name,s.student_no,r.title) ILIKE %s")
        values.append('%' + q.strip().replace('%', '\\%').replace('_', '\\_') + '%')
    condition = ' AND '.join(f'({x})' for x in where)
    base = '''FROM dc.roadmap_request r JOIN dc.person p ON p.intg_uid=r.student_uid
      JOIN dc.student s ON s.intg_uid=r.student_uid WHERE ''' + condition
    total = conn.execute('SELECT count(*) AS n ' + base, values).fetchone()['n']
    summary = conn.execute(f'''SELECT count(*) FILTER(WHERE r.status_code='REQ')::int AS "REQ",
      count(*) FILTER(WHERE r.status_code='APPLIED')::int AS "APPLIED",
      count(*) FILTER(WHERE r.status_code='REJECTED')::int AS "REJECTED" ''' + base, values).fetchone()
    rows = conn.execute(REQUEST_SELECT + ' WHERE ' + condition
                        + ' ORDER BY r.requested_at DESC,r.id LIMIT %s OFFSET %s',
                        [*values, pageSize, (page - 1) * pageSize]).fetchall()
    return dict(items=[request_dto(r) for r in rows], totalCount=total, page=page, pageSize=pageSize,
                summary=summary)


@router.get('/roadmap-requests/{request_id}/events')
def request_events(request_id: str, user=Depends(principal, scope='function'),
                   conn=Depends(connection, scope='function')):
    condition, values = scope_condition(user, 'student_uid')
    if user['kind'] == 'STAFF':
        require_plan_staff(conn, user, REQUEST_MENU)
    rows = conn.execute(f'''SELECT e.action,e.status_before AS "statusBefore",e.status_after AS "statusAfter",
      e.reason,e.created_at AS "createdAt",p.name AS "actorName" FROM dc.roadmap_request_event e
      LEFT JOIN dc.person p ON p.intg_uid=e.actor_uid WHERE e.request_id=%s AND ({condition})
      ORDER BY e.created_at,e.id''', [request_id, *values]).fetchall()
    return dict(items=rows, totalCount=len(rows))


class Reject(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    requests: list[RequestRef] = Field(min_length=1, max_length=100)
    reason: str = Field(default='', max_length=2000)


@router.post('/roadmap-requests/reject')
def reject_requests(body: Reject, idempotency_key: str = Header(min_length=8, max_length=200),
                    user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    """전부 반영하거나 전부 되돌린다. 일부만 처리하고 성공으로 응답하지 않는다."""
    route = 'POST /roadmap-requests/reject'
    digest, saved = idempotent(conn, user, route, idempotency_key, body.model_dump_json())
    if saved:
        return saved
    require_plan_staff(conn, user, REQUEST_MENU)
    transaction_id = uuid4()
    results = []
    for entry in sorted(body.requests, key=lambda x: x.id):
        row = conn.execute('SELECT * FROM dc.roadmap_request WHERE id=%s FOR UPDATE', (entry.id,)).fetchone()
        if not row or not conn.execute('''SELECT 1 FROM dc.staff_student_scope
          WHERE staff_uid=%s AND student_uid=%s''', (user['intg_uid'], row['student_uid'])).fetchone():
            fail(404, 'NOT_FOUND', '변경 요청을 찾을 수 없습니다.')
        if row['version'] != entry.expectedVersion:
            fail(409, 'VERSION_CONFLICT', '변경 요청이 이미 처리됐습니다.', currentVersion=row['version'])
        if row['status_code'] != 'REQ':
            fail(409, 'INVALID_TRANSITION', '이미 처리된 변경 요청입니다.')
        after = conn.execute('''UPDATE dc.roadmap_request SET status_code='REJECTED',handled_at=now(),
          handled_by=%s,handling_note=%s,version=version+1 WHERE id=%s RETURNING *''',
          (user['intg_uid'], entry.note or body.reason, entry.id)).fetchone()
        conn.execute('''INSERT INTO dc.roadmap_request_event(request_id,student_uid,action,status_before,
          status_after,version_before,version_after,actor_uid,reason,transaction_id)
          VALUES(%s,%s,'REJECT',%s,%s,%s,%s,%s,%s,%s)''',
          (entry.id, row['student_uid'], row['status_code'], 'REJECTED', row['version'], after['version'],
           user['intg_uid'], entry.note or body.reason, transaction_id))
        results.append(request_dto({**after, 'alias': None}))
    return remember(conn, user, route, idempotency_key, digest, {'items': results})


# ── 비교과 개설 편입 ─────────────────────────────────────────────────────
# PROCESS.md §6-4. 지금까지는 브라우저가 조회할 때마다 `prog-{id}` 칸을 가상 생성했다 —
# 그러면 아무 데도 기록이 남지 않고, 유형이 바뀌는 순간 학생이 이미 신청한 칸까지 사라진다.

def program_expiry(program):
    """추천 칸의 만료 = 신청 마감일 **다음 날 00:00 (Asia/Seoul)** 의 배타 상한.
    브라우저가 붙이던 `${endDate}T23:59:59`(타임존 없음)는 접속 시간대에 따라 경계가 흔들린다.
    필수 칸은 마감 후에도 남으므로 만료가 없다."""
    if program['roadmap_entry'] != 'RECOMMEND':
        return None
    if not program['apply_end']:
        fail(422, 'DEADLINE_REQUIRED', '추천 편입에는 신청 마감일이 필요합니다.')
    return datetime.combine(program['apply_end'] + timedelta(days=1), time(0, 0), tzinfo=SEOUL)


def linked_cells(conn, program_id):
    return conn.execute('''SELECT count(*) AS n FROM dc.roadmap_item WHERE program_id=%s''',
                        (program_id,)).fetchone()['n']


def enroll_program(conn, user, program):
    """대상 유형의 **현재 계획**에 프로그램당 IAP 자동 칸을 하나 붙인다.

    계획이 없는 학생에게 계획·축을 새로 만들지 않는다. 초안이 있으면 그 세대에 붙되
    학생 공개 여부는 계획 상태를 따른다. 부분 성공을 성공으로 응답하지 않는다 —
    한 학생이라도 실패하면 개설 전체가 롤백된다.
    """
    if program['roadmap_entry'] == 'NONE' or not program['care_types']:
        return 0
    expires = program_expiry(program)
    transaction_id = uuid4()
    targets = conn.execute('''SELECT r.student_uid,r.version FROM dc.roadmap r
      JOIN LATERAL (SELECT student_type FROM dc.student_type_event t WHERE t.student_uid=r.student_uid
                     ORDER BY decided_at DESC,id DESC LIMIT 1) t ON true
      WHERE t.student_type=ANY(%s) AND EXISTS(SELECT 1 FROM dc.roadmap_axis a
            WHERE a.student_uid=r.student_uid AND a.axis='IAP')
        AND NOT EXISTS(SELECT 1 FROM dc.roadmap_item i WHERE i.student_uid=r.student_uid
              AND i.program_id=%s AND i.origin_code='AUTO_PROGRAM')
      ORDER BY r.student_uid FOR UPDATE OF r''', (list(program['care_types']), program['id'])).fetchall()
    entry = program['roadmap_entry']
    for target in targets:
        uid = target['student_uid']
        # 자동 편입의 행위자는 프로그램을 개설한 교직원 본인이다. 시스템 계정을 만들지 않는다.
        event_id = plan_event(conn, user, uid, target['version'], 'PROGRAM_INSERT',
                              {'programId': program['id'], 'entry': entry, 'title': program['title'],
                               'expiresAt': expires, 'initiatedBy': 'SYSTEM_FANOUT'},
                              cause=('PROGRAM', program['id']), transaction_id=transaction_id)
        position = conn.execute('''SELECT COALESCE(max(position),%s)+1 AS n FROM dc.roadmap_item
          WHERE student_uid=%s AND axis='IAP' ''', (BASE_CELLS, uid)).fetchone()['n']
        item_id = 'auto-' + program['id']
        row = conn.execute('''INSERT INTO dc.roadmap_item(student_uid,axis,id,position,title,priority,
          importance,why,status,program_id,entry,expires_at,origin_code,entry_event_id,created_at)
          VALUES(%s,'IAP',%s,%s,%s,%s,%s,%s,'TODO',%s,%s,%s,'AUTO_PROGRAM',%s,now()) RETURNING *''',
          (uid, item_id, position, program['title'], 'P0' if entry == 'REQUIRED' else 'P1',
           'REQUIRED' if entry == 'REQUIRED' else 'RECOMMENDED',
           ('필수' if entry == 'REQUIRED' else '추천') + ' 비교과 — 로드맵에 편입된 프로그램입니다.',
           program['id'], entry, expires, event_id)).fetchone()
        item_event(conn, user, uid, target['version'], item_id, 'PROGRAM_INSERT', None, cell_dto(row),
                   cause=('PROGRAM', program['id']), transaction_id=transaction_id)
        touch(conn, user, uid)
    return len(targets)


Regenerate.model_rebuild()
