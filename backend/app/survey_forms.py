"""설문지(조사 양식) 버전 관리 — 시스템관리자 전용.

문항·영역의 정본은 코드관리(`SURVEY_AREA`·`SURVEY_ITEM`)이고 설문지는 그 부품을 조립한 결과다.
초안을 떠서 영역·문항을 고르고 게시하면 그 구성이 잠긴다 — 프로그램은 개설 시점의 게시본을 붙잡는다.
문장·척도는 여기에 복사하지 않는다. 사전에서 고치면 모든 버전에 그대로 반영된다.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from .administration import administrator
from .db import connection

router = APIRouter()

KINDS = ('COMPETENCY', 'SATISFACTION')
# 갈래마다 붙잡는 프로그램 컬럼과 그 갈래가 받는 응답 phase. 요청값을 SQL 에 끼워 넣지 않는다.
KIND_PIN = {'COMPETENCY': ('competency_form_id', ['PRE', 'POST']),
            'SATISFACTION': ('satisfaction_form_id', ['SATISFACTION'])}
AREA_GROUP_OF = {'COMPETENCY': ('CAREER', 'JOB', 'EMPLOY'), 'SATISFACTION': ('SATISFACTION',)}


def kind_or_404(kind):
    if kind not in KINDS:
        raise HTTPException(404, '설문지 종류를 찾을 수 없습니다.')


def current_form_id(conn, kind):
    """「현재 게시본」 = 같은 kind 의 PUBLISHED 중 version 이 가장 큰 행. 개설 pin 과 /metadata 가 함께 쓴다."""
    row = conn.execute("""SELECT id FROM dc.survey_form WHERE kind=%s AND status='PUBLISHED'
      ORDER BY version DESC LIMIT 1""", (kind,)).fetchone()
    return row['id'] if row else None


def composition(conn, form_ids):
    """{form_id: [{key,label,group,items:[{code,label,kind}]}]} — form 마다 쿼리를 돌리지 않는다."""
    if not form_ids:
        return {}
    rows = conn.execute("""SELECT fa.form_id,fa.area_code,a.label AS area_label,a.payload->>'group' AS area_group,
      fi.item_code,i.label AS item_label,COALESCE(i.payload->>'kind','SCALE') AS item_kind
      FROM dc.survey_form_area fa
      JOIN dc.code_item a ON (a.group_code,a.code)=('SURVEY_AREA',fa.area_code)
      LEFT JOIN dc.survey_form_item fi ON fi.form_id=fa.form_id AND fi.area_code=fa.area_code
      LEFT JOIN dc.code_item i ON (i.group_code,i.code)=('SURVEY_ITEM',fi.item_code)
      WHERE fa.form_id=ANY(%s) ORDER BY fa.form_id,fa.area_order,fi.item_order,fi.item_code""",
      (list(form_ids),)).fetchall()
    result = {}
    for row in rows:
        areas = result.setdefault(row['form_id'], [])
        if not areas or areas[-1]['key'] != row['area_code']:
            areas.append({'key': row['area_code'], 'label': row['area_label'], 'group': row['area_group'], 'items': []})
        if row['item_code']:
            areas[-1]['items'].append({'code': row['item_code'], 'label': row['item_label'], 'kind': row['item_kind']})
    return result


def usage(conn):
    """{form_id: (프로그램 수, 응답 수)} — phase 를 갈래에 맞춰 건다.
    한 프로그램이 두 form 을 붙잡으므로 phase 를 안 걸면 만족도 form 에 사전·사후 응답이 얹힌다."""
    rows = conn.execute("""WITH pin AS (
      SELECT id AS program_id,competency_form_id AS form_id,ARRAY['PRE','POST'] AS phases
        FROM dc.program WHERE competency_form_id IS NOT NULL
      UNION ALL
      SELECT id,satisfaction_form_id,ARRAY['SATISFACTION'] FROM dc.program WHERE satisfaction_form_id IS NOT NULL)
      SELECT p.form_id,count(DISTINCT p.program_id)::int AS program_count,count(r.id)::int AS response_count
      FROM pin p LEFT JOIN dc.survey_response r ON r.program_id=p.program_id AND r.phase=ANY(p.phases)
      GROUP BY p.form_id""").fetchall()
    return {row['form_id']: (row['program_count'], row['response_count']) for row in rows}


def form_dto(row, areas, counts, current_ids):
    programs, responses = counts.get(row['id'], (0, 0))
    return {'id': row['id'], 'kind': row['kind'], 'version': row['version'], 'status': row['status'],
            'memo': row['memo'], 'createdAt': row['created_at'], 'publishedAt': row['published_at'],
            'lockVersion': row['lock_version'], 'isCurrent': current_ids.get(row['kind']) == row['id'],
            'programCount': programs, 'responseCount': responses,
            # 응답이 한 건이라도 들어온 게시본은 구성을 바꿀 수 없다(초안은 언제나 열려 있다).
            'locked': row['status'] == 'PUBLISHED' and responses > 0, 'areas': areas}


def load_form(conn, form_id, lock=False):
    row = conn.execute(f"SELECT * FROM dc.survey_form WHERE id=%s{' FOR UPDATE' if lock else ''}",
                       (form_id,)).fetchone()
    if not row:
        raise HTTPException(404, '설문지를 찾을 수 없습니다.')
    return row


def one_form(conn, row):
    return form_dto(row, composition(conn, [row['id']]).get(row['id'], []), usage(conn),
                    {kind: current_form_id(conn, kind) for kind in KINDS})


def locked_by_responses(conn, row):
    """게시본에 응답이 들어왔는지. 먼저 그 form 을 붙잡은 program 행을 FOR SHARE 로 잡아
    동시 제출이 대기하게 한다 — EXISTS 는 커밋 전 제출을 못 본다(READ COMMITTED)."""
    column, phases = KIND_PIN[row['kind']]
    conn.execute(f'SELECT id FROM dc.program WHERE {column}=%s FOR SHARE', (row['id'],)).fetchall()
    return conn.execute(f"""SELECT EXISTS(SELECT 1 FROM dc.survey_response r WHERE r.phase=ANY(%s)
      AND r.program_id IN (SELECT id FROM dc.program WHERE {column}=%s)) AS locked""",
      (phases, row['id'])).fetchone()['locked']


def audit(conn, form_id, action, before, after, reason, user):
    conn.execute("""INSERT INTO dc.admin_event(entity,entity_id,before_value,after_value,reason,changed_by)
      VALUES('survey_form',%s,%s,%s,%s,%s)""",
      (str(form_id), Jsonb(jsonable_encoder(before)) if before else None,
       Jsonb(jsonable_encoder({**jsonable_encoder(after), 'action': action})), reason, user['intg_uid']))


class Reason(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    reason: str = Field(min_length=1, max_length=1000)


class FormCreate(Reason):
    kind: str
    memo: str = Field(default='', max_length=1000)


class AreaPlan(BaseModel):
    areaCode: str = Field(min_length=1, max_length=64)
    items: list[str] = Field(default_factory=list, max_length=200)


class FormSave(Reason):
    expectedLockVersion: int = Field(ge=0)
    memo: str = Field(default='', max_length=1000)
    areas: list[AreaPlan] = Field(default_factory=list, max_length=100)


class FormPublish(Reason):
    expectedLockVersion: int = Field(ge=0)


@router.get('/system/survey-forms')
def list_forms(kind: str | None = Query(default=None),
               user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    if kind:
        kind_or_404(kind)
    rows = conn.execute('SELECT * FROM dc.survey_form WHERE (%s::text IS NULL OR kind=%s) ORDER BY kind,version DESC',
                        (kind, kind)).fetchall()
    areas = composition(conn, [row['id'] for row in rows])
    counts, current = usage(conn), {k: current_form_id(conn, k) for k in KINDS}
    return {'items': [form_dto(row, areas.get(row['id'], []), counts, current) for row in rows]}


@router.post('/system/survey-forms', status_code=201)
def create_form(body: FormCreate, user=Depends(administrator, scope='function'),
                conn=Depends(connection, scope='function')):
    """새 초안 — 현재 게시본의 구성을 복사해 시작한다. 갈래마다 초안은 하나뿐이다."""
    kind_or_404(body.kind)
    version = conn.execute('SELECT COALESCE(max(version),0)+1 AS next FROM dc.survey_form WHERE kind=%s',
                           (body.kind,)).fetchone()['next']
    try:
        row = conn.execute("""INSERT INTO dc.survey_form(kind,version,status,memo,created_by)
          VALUES(%s,%s,'DRAFT',%s,%s) RETURNING *""",
          (body.kind, version, body.memo, user['intg_uid'])).fetchone()
    except UniqueViolation:
        raise HTTPException(409, '이미 작성 중인 초안이 있습니다. 그 초안을 게시하거나 버린 뒤 만드세요.')
    source = current_form_id(conn, body.kind)
    if source:
        conn.execute("""INSERT INTO dc.survey_form_area(form_id,area_code,area_order)
          SELECT %s,area_code,area_order FROM dc.survey_form_area WHERE form_id=%s""", (row['id'], source))
        conn.execute("""INSERT INTO dc.survey_form_item(form_id,area_code,item_code,item_order)
          SELECT %s,area_code,item_code,item_order FROM dc.survey_form_item WHERE form_id=%s""", (row['id'], source))
    audit(conn, row['id'], 'CREATE', None, row, body.reason, user)
    return one_form(conn, row)


@router.put('/system/survey-forms/{form_id}')
def save_form(form_id: int, body: FormSave, user=Depends(administrator, scope='function'),
              conn=Depends(connection, scope='function')):
    """구성 치환. 초안은 언제나, 게시본은 응답이 0건일 때만 바꿀 수 있다."""
    before = load_form(conn, form_id, lock=True)
    if before['lock_version'] != body.expectedLockVersion:
        raise HTTPException(409, '다른 관리자가 변경했습니다. 새로 조회한 뒤 수정하세요.')
    if before['status'] == 'PUBLISHED' and locked_by_responses(conn, before):
        raise HTTPException(422, '이미 응답이 들어온 설문지입니다. 새 버전을 만들어 고치세요.')
    allowed_groups = AREA_GROUP_OF[before['kind']]
    seen_items = set()
    for area in body.areas:
        row = conn.execute("""SELECT is_active,payload->>'group' AS grp FROM dc.code_item
          WHERE group_code='SURVEY_AREA' AND code=%s""", (area.areaCode,)).fetchone()
        if not row or not row['is_active']:
            raise HTTPException(422, '사용 가능한 영역을 선택해 주세요.')
        if row['grp'] not in allowed_groups:
            raise HTTPException(422, '이 설문지에 담을 수 없는 영역입니다.')
        for code in area.items:
            if code in seen_items:
                raise HTTPException(422, '같은 문항을 두 번 담을 수 없습니다.')
            seen_items.add(code)
            item = conn.execute("""SELECT is_active,payload->>'areaKey' AS area_key FROM dc.code_item
              WHERE group_code='SURVEY_ITEM' AND code=%s""", (code,)).fetchone()
            if not item or not item['is_active']:
                raise HTTPException(422, '사용 가능한 문항을 선택해 주세요.')
            if item['area_key'] != area.areaCode:
                raise HTTPException(422, '문항이 속한 영역에만 담을 수 있습니다.')
    # 영역을 지우면 그 영역의 문항은 CASCADE 로 함께 사라진다.
    conn.execute('DELETE FROM dc.survey_form_area WHERE form_id=%s', (form_id,))
    for area_order, area in enumerate(body.areas):
        conn.execute('INSERT INTO dc.survey_form_area(form_id,area_code,area_order) VALUES(%s,%s,%s)',
                     (form_id, area.areaCode, area_order))
        for item_order, code in enumerate(area.items):
            conn.execute("""INSERT INTO dc.survey_form_item(form_id,area_code,item_code,item_order)
              VALUES(%s,%s,%s,%s)""", (form_id, area.areaCode, code, item_order))
    after = conn.execute("""UPDATE dc.survey_form SET memo=%s,lock_version=lock_version+1
      WHERE id=%s RETURNING *""", (body.memo, form_id)).fetchone()
    audit(conn, form_id, 'SAVE', before, after, body.reason, user)
    return one_form(conn, after)


@router.post('/system/survey-forms/{form_id}/publish')
def publish_form(form_id: int, body: FormPublish, user=Depends(administrator, scope='function'),
                 conn=Depends(connection, scope='function')):
    before = load_form(conn, form_id, lock=True)
    if before['lock_version'] != body.expectedLockVersion:
        raise HTTPException(409, '다른 관리자가 변경했습니다. 새로 조회한 뒤 게시하세요.')
    if before['status'] != 'DRAFT':
        raise HTTPException(422, '이미 게시된 설문지입니다.')
    if not conn.execute('SELECT 1 FROM dc.survey_form_item WHERE form_id=%s LIMIT 1', (form_id,)).fetchone():
        raise HTTPException(422, '문항을 한 개 이상 담은 뒤 게시하세요.')
    after = conn.execute("""UPDATE dc.survey_form SET status='PUBLISHED',published_at=now(),published_by=%s,
      lock_version=lock_version+1 WHERE id=%s RETURNING *""", (user['intg_uid'], form_id)).fetchone()
    audit(conn, form_id, 'PUBLISH', before, after, body.reason, user)
    return one_form(conn, after)


@router.delete('/system/survey-forms/{form_id}', status_code=204)
def delete_form(form_id: int, body: Reason, user=Depends(administrator, scope='function'),
                conn=Depends(connection, scope='function')):
    before = load_form(conn, form_id, lock=True)
    if before['status'] != 'DRAFT':
        raise HTTPException(422, '게시된 설문지는 버릴 수 없습니다.')
    conn.execute('DELETE FROM dc.survey_form WHERE id=%s', (form_id,))
    audit(conn, form_id, 'DISCARD', before, {'id': form_id}, body.reason, user)
