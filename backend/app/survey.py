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
EXPORT_PHASES = {'PRE': '사전', 'POST': '사후'}
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


def items_for(conn, program, phase):
    """프로그램이 고른 영역의 활성 문항만, 영역 순서 → 문항 순서."""
    if phase == 'SATISFACTION':
        area_filter, values = "a.payload->>'group'='SATISFACTION'", []
    else:
        area_filter, values = 'a.code=ANY(%s)', [list(program['competency_areas'])]
    return conn.execute(f'''SELECT a.code AS area_key,a.label AS area_label,
      i.code,i.label,i.version
      FROM dc.code_item a JOIN dc.code_item i ON i.group_code='SURVEY_ITEM' AND i.payload->>'areaKey'=a.code
      WHERE a.group_code='SURVEY_AREA' AND a.is_active AND i.is_active AND {area_filter}
      ORDER BY a.sort_order,i.sort_order,i.code''', values).fetchall()


def group_by_area(rows, answers=None):
    areas = []
    for row in rows:
        if not areas or areas[-1]['key'] != row['area_key']:
            areas.append({'key': row['area_key'], 'label': row['area_label'], 'items': []})
        areas[-1]['items'].append({'code': row['code'], 'prompt': row['label'],
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


@router.get('/programs/{program_id}/survey/{phase}/export.xlsx')
def survey_export(program_id: str, phase: str, user=Depends(principal, scope='function'),
                  conn=Depends(connection, scope='function')):
    """사전·사후 결과 엑셀 — 학생 1행, 설문지(진로·직무·취업) 1장씩. 열은 설문지 문항 전체(질문1…N)이고
    개설 때 고르지 않은 영역은 빈칸이다. 집계는 stats 가 하고 여기는 값만 준다."""
    require_staff(user)
    if phase not in EXPORT_PHASES:
        raise HTTPException(404, '조사 종류를 찾을 수 없습니다.')
    program = get_program(conn, program_id)
    if not program['competency_survey'] or not program['competency_areas']:
        raise HTTPException(409, '역량향상률 조사를 실시하지 않는 프로그램입니다.')
    output = workbook_sheets(export_sheets(conn, program, phase))

    def chunks():
        try:
            while chunk := output.read(64*1024):
                yield chunk
        finally:
            output.close()
    filename = re.sub(r'[\\/:*?"<>|]', '_', program['title']) + f'_{EXPORT_PHASES[phase]} 결과.xlsx'
    return StreamingResponse(chunks(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': "attachment; filename*=UTF-8''"+quote(filename), 'Cache-Control': 'no-store'})


def export_sheets(conn, program, phase):
    """[(설문지명, 헤더, 행들)] — 프로그램이 고른 영역이 속한 설문지마다 한 장."""
    items = conn.execute('''SELECT a.payload->>'group' AS grp,a.code AS area_key,i.code
      FROM dc.code_item a JOIN dc.code_item i ON i.group_code='SURVEY_ITEM' AND i.payload->>'areaKey'=a.code
      WHERE a.group_code='SURVEY_AREA' AND a.is_active AND i.is_active
      ORDER BY a.sort_order,i.sort_order,i.code''').fetchall()
    responses = conn.execute('''SELECT r.snapshot,
      (SELECT jsonb_object_agg(s.item_code,s.value) FROM dc.survey_answer s WHERE s.response_id=r.id) AS answers
      FROM dc.survey_response r WHERE r.program_id=%s AND r.phase=%s ORDER BY r.submitted_at,r.id''',
      (program['id'], phase)).fetchall()
    selected = set(program['competency_areas'])
    period = ' ~ '.join(str(d) for d in (program['run_start'], program['run_end']) if d) or '없음'
    sheets = []
    for grp, label in SURVEY_GROUP_LABEL.items():
        mine = [row for row in items if row['grp'] == grp]
        if not any(row['area_key'] in selected for row in mine):
            continue
        headers = ['연번', '프로그램명', '운영기간', '소속', '학년', '성별'] + [f'질문{k}' for k in range(1, len(mine)+1)]
        rows = []
        for n, r in enumerate(responses, start=1):
            snap, answers = r['snapshot'] or {}, r['answers'] or {}
            rows.append([n, program['title'], period,
                         ' - '.join(v for v in (snap.get('studentCollege'), snap.get('studentMajor')) if v) or '없음',
                         snap.get('grade'), snap.get('sex') or '없음',
                         # 고른 영역의 문항만 값을 적고, 나머지 영역은 빈칸으로 둔다(없음 아님).
                         *(answers.get(row['code'], '') if row['area_key'] in selected else '' for row in mine)])
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
        answers = {r['item_code']: r['value'] for r in conn.execute(
            'SELECT item_code,value FROM dc.survey_answer WHERE response_id=%s', (submitted['id'],)).fetchall()}
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
    answers: dict[str, int] = Field(max_length=200)


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
    if set(body.answers) != set(expected):
        raise HTTPException(422, '모든 문항에 응답해야 합니다.')
    if any(not 1 <= v <= 5 for v in body.answers.values()):
        raise HTTPException(422, '응답은 1~5점이어야 합니다.')
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
    conn.cursor().executemany('''INSERT INTO dc.survey_answer(response_id,item_code,item_version,value)
      VALUES(%s,%s,%s,%s)''', [(response['id'], code, expected[code]['version'], value)
                              for code, value in body.answers.items()])
    return {'programId': program_id, 'phase': phase, 'submittedAt': response['submitted_at']}
