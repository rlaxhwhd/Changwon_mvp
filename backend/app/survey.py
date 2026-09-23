"""비교과 조사 — 역량향상률(사전·사후)과 만족도.

사전은 선발 뒤 운영 시작 전에만, 사후·만족도는 수료 뒤에만 연다. 판정은 survey_window 한 곳이 한다.
영역·문항은 코드관리(SURVEY_AREA·SURVEY_ITEM)가 정본이고, 응답은 학생×프로그램×phase 1건이다.
향상률 = (사후 평균 - 사전 평균) / 사전 평균 × 100 — 사전·사후가 모두 있는 학생만 센다.
"""
import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from .auth import principal, require_staff, student_access
from .db import connection
from .programs import get_program, today
from .xlsx_export import workbook_sheets

router = APIRouter()

PHASES = ('PRE', 'POST', 'SATISFACTION')
EXPORT_PHASES = {'PRE': '사전', 'POST': '사후', 'SATISFACTION': '만족도'}
# 설문지 3종 — 시트명. 영역·문항은 코드관리가 정본이고 설문지 묶음만 여기서 이름 붙인다.
SURVEY_GROUP_LABEL = {'CAREER': '진로역량', 'JOB': '직무역량', 'EMPLOY': '취업역량'}


def phase_or_404(phase):
    if phase not in PHASES:
        raise HTTPException(404, '조사 종류를 찾을 수 없습니다.')


def survey_window(program, application, phase):
    """(열림 여부, 닫힌 이유). 프로그램 설정·선발·수료·운영 시작일을 한 번에 본다."""
    if phase == 'SATISFACTION':
        if not program['satisfaction_survey']:
            return False, '만족도 조사를 실시하지 않는 프로그램입니다.'
    elif not program['competency_survey'] or not program['competency_areas']:
        return False, '역량향상률 조사를 실시하지 않는 프로그램입니다.'
    if not application or application['cancelled_at']:
        return False, '신청 내역이 없습니다.'
    if application['selection_code'] != 'SELECTED':
        return False, '선발된 학생만 응답할 수 있습니다.'
    if phase == 'PRE':
        if application['outcome_code']:
            return False, '이수 결과가 확정되어 사전 조사가 닫혔습니다.'
        if program['run_start'] and program['run_start'] <= today():
            return False, '프로그램이 시작되어 사전 조사가 닫혔습니다.'
        return True, ''
    if application['outcome_code'] != 'COMPLETED':
        return False, '수료 후에 응답할 수 있습니다.'
    return True, ''


def form_id_for(program, phase):
    """이 프로그램이 개설 시점에 붙잡은 설문지. 만족도와 역량은 갈래가 다르다."""
    return program['satisfaction_form_id'] if phase == 'SATISFACTION' else program['competency_form_id']


def items_for(conn, program, phase):
    """프로그램이 붙잡은 설문지의 문항. 역량은 그중 고른 영역만, 영역 순서 → 문항 순서.

    사전(code_item)의 is_active 를 보지 않는다 — 게시본이 사전을 이긴다. 관리자가 나중에 문항을
    비활성해도 운영 중 프로그램의 사전·사후 문항은 달라지지 않아야 한다. 문장·척도만 사전에서 읽는다.
    """
    form_id = form_id_for(program, phase)
    if not form_id:
        return []
    if phase == 'SATISFACTION':
        area_filter, values = '', [form_id]
    else:
        area_filter, values = 'AND fa.area_code=ANY(%s)', [form_id, list(program['competency_areas'])]
    return conn.execute(f'''SELECT fa.area_code AS area_key,a.label AS area_label,
      i.code,i.label,i.version,COALESCE(i.payload->>'kind','SCALE') AS kind
      FROM dc.survey_form_area fa
      JOIN dc.survey_form_item fi ON fi.form_id=fa.form_id AND fi.area_code=fa.area_code
      JOIN dc.code_item a ON (a.group_code,a.code)=('SURVEY_AREA',fa.area_code)
      JOIN dc.code_item i ON (i.group_code,i.code)=('SURVEY_ITEM',fi.item_code)
      WHERE fa.form_id=%s {area_filter}
      ORDER BY fa.area_order,fi.item_order,fi.item_code''', values).fetchall()


def group_by_area(rows, answers=None):
    areas = []
    for row in rows:
        if not areas or areas[-1]['key'] != row['area_key']:
            areas.append({'key': row['area_key'], 'label': row['area_label'], 'items': []})
        areas[-1]['items'].append({'code': row['code'], 'prompt': row['label'], 'kind': row['kind'],
                                   'value': (answers or {}).get(row['code'])})
    return areas


def application_of(conn, program_id, student_uid):
    return conn.execute('SELECT * FROM dc.program_apply WHERE program_id=%s AND student_uid=%s',
                        (program_id, student_uid)).fetchone()


def response_of(conn, program_id, student_uid, phase):
    return conn.execute('SELECT * FROM dc.survey_response WHERE program_id=%s AND student_uid=%s AND phase=%s',
                        (program_id, student_uid, phase)).fetchone()


@router.get('/programs/{program_id}/survey/stats')
def survey_stats(program_id: str, user=Depends(principal, scope='function'),
                 conn=Depends(connection, scope='function')):
    """프로그램 1개의 역량향상률 통계. 집계는 여기서(데이터층) 끝내고 화면은 그리기만 한다."""
    require_staff(user)
    program = get_program(conn, program_id)
    rows = items_for(conn, program, 'PRE')
    answers = conn.execute('''SELECT r.student_uid,r.phase,s.item_code,s.value
      FROM dc.survey_response r JOIN dc.survey_answer s ON s.response_id=r.id
      WHERE r.program_id=%s AND r.phase IN ('PRE','POST')''', (program_id,)).fetchall()
    by_student = {}
    for a in answers:
        by_student.setdefault(a['student_uid'], {'PRE': {}, 'POST': {}})[a['phase']][a['item_code']] = a['value']
    paired = [v for v in by_student.values() if v['PRE'] and v['POST']]

    def pairs(code):
        return [(v['PRE'][code], v['POST'][code]) for v in paired if code in v['PRE'] and code in v['POST']]

    areas, all_pairs = [], []
    for area in group_by_area(rows):
        area_pairs = []
        for item in area['items']:
            item_pairs = pairs(item['code'])
            item.pop('value', None)
            item.update(summarize(item_pairs))
            area_pairs += item_pairs
        areas.append({**area, **summarize(area_pairs)})
        all_pairs += area_pairs
    counts = conn.execute('''SELECT
      count(*) FILTER(WHERE selection_code='SELECTED' AND cancelled_at IS NULL)::int AS selected,
      count(*) FILTER(WHERE outcome_code='COMPLETED')::int AS completed,
      (SELECT count(*) FROM dc.survey_response r WHERE r.program_id=%s AND r.phase='PRE')::int AS pre,
      (SELECT count(*) FROM dc.survey_response r WHERE r.program_id=%s AND r.phase='POST')::int AS post,
      (SELECT count(*) FROM dc.survey_response r WHERE r.program_id=%s AND r.phase='SATISFACTION')::int AS satisfaction
      FROM dc.program_apply WHERE program_id=%s''', (program_id, program_id, program_id, program_id)).fetchone()
    return {'programId': program_id, 'competencySurvey': program['competency_survey'],
            'participation': {**counts, 'paired': len(paired)},
            'total': summarize(all_pairs), 'areas': areas}


@router.get('/programs/{program_id}/survey/satisfaction/stats')
def satisfaction_stats(program_id: str, user=Depends(principal, scope='function'),
                       conn=Depends(connection, scope='function')):
    """만족도 통계 — 문항별 평균·점수 분포, 영역·전체 평균, 서술형 답변 목록. 집계는 여기서 끝낸다."""
    require_staff(user)
    program = get_program(conn, program_id)
    rows = items_for(conn, program, 'SATISFACTION')
    answers = conn.execute('''SELECT s.item_code,s.value,s.text_value
      FROM dc.survey_response r JOIN dc.survey_answer s ON s.response_id=r.id
      WHERE r.program_id=%s AND r.phase='SATISFACTION' ORDER BY r.submitted_at,r.id''', (program_id,)).fetchall()
    scores, texts = {}, {}
    for a in answers:
        if a['value'] is not None:
            scores.setdefault(a['item_code'], []).append(a['value'])
        else:
            texts.setdefault(a['item_code'], []).append(a['text_value'])

    def score_summary(values):
        return {'avg': round(sum(values) / len(values), 2) if values else None, 'n': len(values),
                'distribution': {str(k): sum(1 for v in values if v == k) for k in range(1, 6)}}

    areas, comments, all_values = [], [], []
    for area in group_by_area(rows):
        area_values, items = [], []
        for item in area['items']:
            item.pop('value', None)
            if item['kind'] == 'TEXT':
                comments.append({'code': item['code'], 'prompt': item['prompt'], 'answers': texts.get(item['code'], [])})
                continue
            values = scores.get(item['code'], [])
            items.append({**item, **score_summary(values)})
            area_values += values
        if items:
            areas.append({'key': area['key'], 'label': area['label'], 'items': items, **score_summary(area_values)})
            all_values += area_values
    counts = conn.execute('''SELECT
      count(*) FILTER(WHERE outcome_code='COMPLETED')::int AS completed,
      (SELECT count(*) FROM dc.survey_response r WHERE r.program_id=%s AND r.phase='SATISFACTION')::int AS responses
      FROM dc.program_apply WHERE program_id=%s''', (program_id, program_id)).fetchone()
    return {'programId': program_id, 'satisfactionSurvey': program['satisfaction_survey'],
            'participation': dict(counts), 'total': score_summary(all_values), 'areas': areas, 'comments': comments}


@router.get('/programs/{program_id}/survey/{phase}/export.xlsx')
def survey_export(program_id: str, phase: str, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    """사전·사후 결과 엑셀 — 학생 1행, 설문지(진로·직무·취업) 1장씩. 열은 설문지 문항 전체(질문1…N)이고
    개설 때 고르지 않은 영역은 빈칸이다. 집계는 stats 가 하고 여기는 값만 준다."""
    require_staff(user)
    if phase not in EXPORT_PHASES:
        raise HTTPException(404, '조사 종류를 찾을 수 없습니다.')
    program = get_program(conn, program_id)
    if phase == 'SATISFACTION':
        if not program['satisfaction_survey']:
            raise HTTPException(409, '만족도 조사를 실시하지 않는 프로그램입니다.')
        sheets = [('만족도', *satisfaction_sheet(conn, program))]
    else:
        if not program['competency_survey'] or not program['competency_areas']:
            raise HTTPException(409, '역량향상률 조사를 실시하지 않는 프로그램입니다.')
        sheets = export_sheets(conn, program, phase)
    output = workbook_sheets(sheets)

    def chunks():
        try:
            while chunk := output.read(64*1024):
                yield chunk
        finally:
            output.close()
    filename = re.sub(r'[\\/:*?"<>|]', '_', program['title']) + f'_{EXPORT_PHASES[phase]} 결과.xlsx'
    return StreamingResponse(chunks(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': "attachment; filename*=UTF-8''"+quote(filename), 'Cache-Control': 'no-store'})


EXPORT_HEADERS = ['연번', '프로그램명', '운영기간', '소속', '학년', '성별']


def export_responses(conn, program, phase):
    """제출 순 응답 — answers 는 {문항코드: 점수 또는 서술}."""
    return conn.execute('''SELECT r.snapshot,
      (SELECT jsonb_object_agg(s.item_code,COALESCE(to_jsonb(s.value),to_jsonb(s.text_value)))
         FROM dc.survey_answer s WHERE s.response_id=r.id) AS answers
      FROM dc.survey_response r WHERE r.program_id=%s AND r.phase=%s ORDER BY r.submitted_at,r.id''',
      (program['id'], phase)).fetchall()


def export_prefix(n, program, snap):
    """연번·프로그램명·운영기간·소속(대학 - 학과)·학년·성별 — 응답 스냅샷에서 읽는다."""
    period = ' ~ '.join(str(d) for d in (program['run_start'], program['run_end']) if d) or '없음'
    return [n, program['title'], period,
            ' - '.join(v for v in (snap.get('studentCollege'), snap.get('studentMajor')) if v) or '없음',
            snap.get('grade'), snap.get('sex') or '없음']


def satisfaction_sheet(conn, program):
    """(헤더, 행들) — 만족도 문항 전체(척도 16 + 서술형 2)를 질문1…N 으로."""
    items = items_for(conn, program, 'SATISFACTION')
    headers = EXPORT_HEADERS + [f'질문{k}' for k in range(1, len(items)+1)]
    rows = []
    for n, r in enumerate(export_responses(conn, program, 'SATISFACTION'), start=1):
        snap, answers = r['snapshot'] or {}, r['answers'] or {}
        rows.append(export_prefix(n, program, snap) + [answers.get(row['code'], '') for row in items])
    return headers, rows


def export_sheets(conn, program, phase):
    """[(설문지명, 헤더, 행들)] — 프로그램이 고른 영역이 속한 설문지마다 한 장."""
    # 훑는 대상은 이 프로그램이 붙잡은 설문지의 구성이다 — 나중 버전의 새 문항이 옛 프로그램 엑셀에
    # 열로 끼어들면 안 된다. 시트를 가르는 묶음(진로·직무·취업)은 여전히 영역 사전에서 읽는다.
    items = conn.execute('''SELECT a.payload->>'group' AS grp,fa.area_code AS area_key,fi.item_code AS code
      FROM dc.survey_form_area fa
      JOIN dc.survey_form_item fi ON fi.form_id=fa.form_id AND fi.area_code=fa.area_code
      JOIN dc.code_item a ON (a.group_code,a.code)=('SURVEY_AREA',fa.area_code)
      WHERE fa.form_id=%s ORDER BY fa.area_order,fi.item_order,fi.item_code''',
      (program['competency_form_id'],)).fetchall()
    responses = export_responses(conn, program, phase)
    selected = set(program['competency_areas'])
    sheets = []
    for grp, label in SURVEY_GROUP_LABEL.items():
        mine = [row for row in items if row['grp'] == grp]
        if not any(row['area_key'] in selected for row in mine):
            continue
        headers = EXPORT_HEADERS + [f'질문{k}' for k in range(1, len(mine)+1)]
        rows = []
        for n, r in enumerate(responses, start=1):
            snap, answers = r['snapshot'] or {}, r['answers'] or {}
            # 고른 영역의 문항만 값을 적고, 나머지 영역은 빈칸으로 둔다(없음 아님).
            rows.append(export_prefix(n, program, snap)
                        + [answers.get(row['code'], '') if row['area_key'] in selected else '' for row in mine])
        sheets.append((label, headers, rows))
    return sheets


def summarize(pairs):
    """(사전, 사후) 쌍 목록 → 평균·향상률. 쌍이 없으면 전부 None — 0 으로 꾸미지 않는다."""
    if not pairs:
        return {'preAvg': None, 'postAvg': None, 'improvement': None, 'n': 0}
    pre = sum(p for p, _ in pairs) / len(pairs)
    post = sum(q for _, q in pairs) / len(pairs)
    return {'preAvg': round(pre, 2), 'postAvg': round(post, 2),
            'improvement': round((post - pre) / pre * 100, 1), 'n': len(pairs)}


@router.get('/programs/{program_id}/survey/{phase}')
def survey_form(program_id: str, phase: str, user=Depends(principal, scope='function'),
                conn=Depends(connection, scope='function')):
    phase_or_404(phase)
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 조사에 응답할 수 있습니다.')
    program = get_program(conn, program_id)
    application = application_of(conn, program_id, user['intg_uid'])
    submitted = response_of(conn, program_id, user['intg_uid'], phase)
    answers = {}
    if submitted:
        answers = {r['item_code']: r['value'] if r['value'] is not None else r['text_value'] for r in conn.execute(
            'SELECT item_code,value,text_value FROM dc.survey_answer WHERE response_id=%s', (submitted['id'],)).fetchall()}
    is_open, reason = survey_window(program, application, phase)
    rows = items_for(conn, program, phase)
    if is_open and not rows:
        is_open, reason = False, '등록된 조사 문항이 없습니다.'
    return {'programId': program_id, 'programTitle': program['title'], 'phase': phase,
            'open': is_open and not submitted, 'reason': '이미 제출했습니다.' if submitted else reason,
            'submittedAt': submitted['submitted_at'] if submitted else None,
            'areas': group_by_area(rows, answers)}


class SubmitBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    # 척도 문항은 1~5 정수, 서술형(kind=TEXT)은 문자열 — 빈 문자열은 응답 없음으로 본다.
    answers: dict[str, int | str] = Field(max_length=200)


@router.post('/programs/{program_id}/survey/{phase}', status_code=201)
def submit_survey(program_id: str, phase: str, body: SubmitBody, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    phase_or_404(phase)
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 조사에 응답할 수 있습니다.')
    student = student_access(conn, user, user['intg_uid'])
    program = get_program(conn, program_id, lock=True)
    application = application_of(conn, program_id, student['intg_uid'])
    is_open, reason = survey_window(program, application, phase)
    if not is_open:
        raise HTTPException(409, reason)
    if response_of(conn, program_id, student['intg_uid'], phase):
        raise HTTPException(409, '이미 제출한 조사입니다.')
    rows = items_for(conn, program, phase)
    if not rows:
        raise HTTPException(409, '등록된 조사 문항이 없습니다.')
    expected = {r['code']: r for r in rows}
    scale = {code for code, r in expected.items() if r['kind'] != 'TEXT'}
    if not set(body.answers) <= set(expected) or not scale <= set(body.answers):
        raise HTTPException(422, '모든 문항에 응답해야 합니다.')
    if any(not (isinstance(v, int) and 1 <= v <= 5) for code, v in body.answers.items() if code in scale):
        raise HTTPException(422, '응답은 1~5점이어야 합니다.')
    if any(not isinstance(v, str) for code, v in body.answers.items() if code not in scale):
        raise HTTPException(422, '서술형 문항은 글로 답합니다.')
    texts = {code: v.strip()[:2000] for code, v in body.answers.items() if code not in scale}
    student_type = conn.execute('''SELECT student_type FROM dc.current_student_type WHERE student_uid=%s
      ORDER BY decided_at DESC,id DESC LIMIT 1''', (student['intg_uid'],)).fetchone()
    # 제출 시점 학적을 복사한다(CLAUDE.md 규칙 2) — 학년이 올라가도 그때의 응답으로 남는다.
    organization = conn.execute('''SELECT d.college_name,
      CASE x.sex_code WHEN '0001' THEN '남자' WHEN '0002' THEN '여자' END AS sex
      FROM (SELECT 1) one
      LEFT JOIN dc.department d ON d.college_code=%s AND d.dept_code=%s
      LEFT JOIN dc.academic_student_details x ON x.intg_uid=%s''',
      (student['college_code'], student['dept_code'], student['intg_uid'])).fetchone()
    snapshot = {'studentName': student['name'], 'studentMajor': student['major_label'],
                'studentCollege': organization['college_name'], 'sex': organization['sex'],
                'studentNo': student['student_no'], 'grade': student['grade'],
                'studentType': student_type['student_type'] if student_type else None,
                'areas': list(program['competency_areas']) if phase != 'SATISFACTION' else []}
    response = conn.execute('''INSERT INTO dc.survey_response(program_id,student_uid,phase,snapshot)
      VALUES(%s,%s,%s,%s) RETURNING id,submitted_at''',
      (program_id, student['intg_uid'], phase, Jsonb(snapshot))).fetchone()
    conn.cursor().executemany('''INSERT INTO dc.survey_answer(response_id,item_code,item_version,value,text_value)
      VALUES(%s,%s,%s,%s,%s)''',
      [(response['id'], code, expected[code]['version'], value, None) for code, value in body.answers.items() if code in scale]
      + [(response['id'], code, expected[code]['version'], None, text) for code, text in texts.items() if text])
    return {'programId': program_id, 'phase': phase, 'submittedAt': response['submitted_at']}
