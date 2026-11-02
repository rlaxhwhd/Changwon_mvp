"""취업예측분석시스템(/admin/forecast) — 졸업(예정)자 취업 현황 대장. 시스템관리자 전용(151)."""
from datetime import date, timedelta
from typing import Literal
from urllib.parse import quote
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field, field_validator

from .academic_students import ROSTER
from .administration import administrator, audit, audit_many
from .db import connection
from .files import read_body
from .xlsx_export import read_workbook, workbook_sheets

router = APIRouter()

MONTH = r'^[0-9]{4}-(0[1-9]|1[0-2])$'
SEX = "CASE r.sex_code WHEN '0001' THEN '남' WHEN '0002' THEN '여' END"
SELECT = f'''SELECT r.id,r.survey_year AS "surveyYear",r.intg_uid AS "intgUid",r.student_no AS "studentNo",
  r.student_name AS name,r.college_name AS "collegeName",r.dept_name AS "deptName",{SEX} AS sex,
  r.graduation_month AS "graduationMonth",r.company_name AS "companyName",r.duty,
  r.company_type_code AS "companyTypeCode",t.label AS "companyType",r.region_code AS "regionCode",g.label AS region,
  r.employed_month AS "employedMonth",w.name AS writer
  FROM dc.employment_report r
  JOIN dc.code_item t ON t.group_code=r.company_type_group AND t.code=r.company_type_code
  JOIN dc.code_item g ON g.group_code=r.region_group AND g.code=r.region_code
  LEFT JOIN dc.person w ON w.intg_uid=r.created_by'''
# 검색조건 — 화면 드롭다운 값과 1:1. 열 이름은 이 상수에서만 온다.
FIELDS = {'college': 'r.college_name', 'dept': 'r.dept_name', 'studentNo': 'r.student_no', 'sex': SEX, 'name': 'r.student_name'}
HEADERS = ['조사년도', '졸업년월', '단과대학', '학과(전공)', '학번', '이름', '성별', '취업처', '부서/업무', '취업일자', '기업분류', '지역', '작성자']


def like(value):
    return '%' + value.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'


def list_params(surveyYear: int | None = Query(None, ge=2000, le=2100),
                graduationFrom: str | None = Query(None, pattern=MONTH),
                graduationTo: str | None = Query(None, pattern=MONTH),
                field: Literal['college', 'dept', 'studentNo', 'sex', 'name'] = 'name',
                q: str = Query('', max_length=100)):
    if graduationFrom and graduationTo and graduationFrom > graduationTo:
        raise HTTPException(422, '졸업년월 시작은 종료보다 늦을 수 없습니다.')
    where, values = ['r.deleted_at IS NULL'], []
    if surveyYear:
        where.append('r.survey_year=%s')
        values.append(surveyYear)
    for value, operator in ((graduationFrom, '>='), (graduationTo, '<=')):
        if value:
            where.append(f'r.graduation_month {operator} %s')
            values.append(value)
    if q.strip():
        where.append(f"COALESCE({FIELDS[field]},'') ILIKE %s")
        values.append(like(q.strip()))
    return ' AND '.join(where), values


@router.get('/forecast/options')
def options(user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    codes = conn.execute('''SELECT group_code,code,label FROM dc.code_item
      WHERE group_code IN ('JOB_COMPANY_TYPE','EMPLOYMENT_REGION') AND is_active ORDER BY sort_order,code''').fetchall()
    years = conn.execute('SELECT DISTINCT survey_year AS y FROM dc.employment_report WHERE deleted_at IS NULL ORDER BY 1 DESC').fetchall()
    pick = lambda group: [dict(code=c['code'], label=c['label']) for c in codes if c['group_code'] == group]
    return dict(companyTypes=pick('JOB_COMPANY_TYPE'), regions=pick('EMPLOYMENT_REGION'), surveyYears=[r['y'] for r in years])


@router.get('/forecast/employments')
def employments(page: int = Query(1, ge=1), pageSize: int = Query(10, ge=1, le=100), where=Depends(list_params),
                user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    condition, values = where
    total = conn.execute('SELECT count(*) AS n FROM dc.employment_report r WHERE '+condition, values).fetchone()['n']
    rows = conn.execute(SELECT+' WHERE '+condition+' ORDER BY r.id DESC LIMIT %s OFFSET %s',
                        [*values, pageSize, (page-1)*pageSize]).fetchall()
    return dict(items=rows, totalCount=total, page=page, pageSize=pageSize)


def dotted(month):
    return month.replace('-', '.') if month else ''


@router.get('/forecast/employments/export')
def export(where=Depends(list_params), user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    condition, values = where
    rows = conn.execute(SELECT+' WHERE '+condition+' ORDER BY r.id DESC', values).fetchall()
    output = workbook_sheets([('취업현황', HEADERS, ([
        r['surveyYear'], dotted(r['graduationMonth']), r['collegeName'] or '', r['deptName'] or '', r['studentNo'], r['name'] or '',
        r['sex'] or '', r['companyName'], r['duty'], dotted(r['employedMonth']), r['companyType'], r['region'], r['writer'] or '',
    ] for r in rows))])
    def chunks():
        try:
            while chunk := output.read(64*1024):
                yield chunk
        finally:
            output.close()
    return StreamingResponse(chunks(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': "attachment; filename*=UTF-8''"+quote('취업현황.xlsx'), 'Cache-Control': 'no-store'})


def academic(conn, student_nos):
    """학번 → 학사 스냅샷. 학생관리 목록과 같은 학사 읽기 모델(ROSTER)을 쓴다."""
    conn.execute('SET LOCAL jit=off')
    rows = conn.execute(ROSTER+''' SELECT intg_uid,student_no,name,college_name,major_label,sex_code,graduation_month
      FROM roster WHERE student_no=ANY(%s)''', (list(student_nos),)).fetchall()
    return {r['student_no']: r for r in rows}


@router.get('/forecast/students')
def students(q: str = Query(min_length=1, max_length=50), user=Depends(administrator, scope='function'),
             conn=Depends(connection, scope='function')):
    """학번 또는 이름으로 학사 학생을 찾는다(재학·졸업 모두). 숫자면 학번 앞자리, 아니면 이름 일부."""
    q = q.strip()
    if not q:
        raise HTTPException(422, '학번 또는 이름을 입력하세요.')
    condition, value = ('student_no LIKE %s', q+'%') if q.isdigit() else ('name ILIKE %s', like(q))
    conn.execute('SET LOCAL jit=off')
    rows = conn.execute(ROSTER+f''' SELECT student_no AS "studentNo",name,college_name AS "collegeName",
      major_label AS "deptName",CASE sex_code WHEN '0001' THEN '남' WHEN '0002' THEN '여' END AS sex,
      graduation_month AS "graduationMonth",status FROM roster WHERE {condition}
      ORDER BY name NULLS LAST,student_no LIMIT 50''', (value,)).fetchall()
    return dict(items=rows)


TEXT_LIMIT = 200


class Employment(BaseModel):
    surveyYear: int = Field(ge=2000, le=2100)
    studentNo: str = Field(min_length=1, max_length=20)
    graduationMonth: str | None = Field(None, pattern=MONTH)
    companyName: str = Field(min_length=1, max_length=TEXT_LIMIT)
    duty: str = Field(min_length=1, max_length=TEXT_LIMIT)
    companyTypeCode: str = Field(min_length=1, max_length=40)
    regionCode: str = Field(min_length=1, max_length=40)
    employedMonth: str = Field(pattern=MONTH)

    @field_validator('studentNo', 'companyName', 'duty')
    @classmethod
    def trimmed(cls, value):
        if not value.strip():
            raise ValueError('값을 입력하세요.')
        return value.strip()


def check_codes(conn, data):
    found = {(r['group_code'], r['code']) for r in conn.execute('''SELECT group_code,code FROM dc.code_item
      WHERE (group_code,code) IN (('JOB_COMPANY_TYPE',%s),('EMPLOYMENT_REGION',%s))''', (data.companyTypeCode, data.regionCode)).fetchall()}
    if ('JOB_COMPANY_TYPE', data.companyTypeCode) not in found:
        raise HTTPException(422, '기업분류를 선택하세요.')
    if ('EMPLOYMENT_REGION', data.regionCode) not in found:
        raise HTTPException(422, '지역을 선택하세요.')


SAVED = ['survey_year', 'intg_uid', 'student_no', 'student_name', 'college_name', 'dept_name', 'sex_code', 'graduation_month',
         'company_name', 'duty', 'company_type_code', 'region_code', 'employed_month']
COLUMNS = ','.join(SAVED)
VALUES = ','.join(f'%({c})s' for c in SAVED)


def record(data, student):
    """저장할 열 — 학생 열은 학사 스냅샷, 졸업년월이 비면 학사 졸업년월."""
    return dict(survey_year=data.surveyYear, intg_uid=student['intg_uid'], student_no=student['student_no'],
                student_name=student['name'], college_name=student['college_name'], dept_name=student['major_label'],
                sex_code=student['sex_code'], graduation_month=data.graduationMonth or student['graduation_month'],
                company_name=data.companyName, duty=data.duty, company_type_code=data.companyTypeCode,
                region_code=data.regionCode, employed_month=data.employedMonth)


def save(conn, user, report_id, data, student):
    """report_id 가 None 이면 신규. 같은 조사년도에 같은 학생이 이미 있으면 409.
    중복은 UNIQUE 인덱스가 판정한다 — 미리 조회하면 동시 요청이 둘 다 통과한다."""
    args = dict(record(data, student), by=user['intg_uid'], id=report_id)
    before = None
    if report_id is not None:
        before = conn.execute('SELECT * FROM dc.employment_report WHERE id=%s AND deleted_at IS NULL FOR UPDATE', (report_id,)).fetchone()
        if not before:
            raise HTTPException(404, '취업 현황을 찾을 수 없습니다.')
    try:
        with conn.transaction():  # 세이브포인트 — 위반 시 바깥 트랜잭션은 살아 있다.
            if report_id is None:
                return None, conn.execute(f'''INSERT INTO dc.employment_report({COLUMNS},created_by,updated_by)
                  VALUES({VALUES},%(by)s,%(by)s) RETURNING *''', args).fetchone()
            return before, conn.execute(f'''UPDATE dc.employment_report SET ({COLUMNS},updated_by,updated_at)=({VALUES},%(by)s,now())
              WHERE id=%(id)s RETURNING *''', args).fetchone()
    except UniqueViolation:
        raise HTTPException(409, f'{data.surveyYear}년 조사에 이미 등록된 학생입니다.') from None


def save_one(conn, user, report_id, data):
    check_codes(conn, data)
    student = academic(conn, [data.studentNo]).get(data.studentNo)
    if not student:
        raise HTTPException(422, '학사 정보에서 학번을 찾을 수 없습니다.')
    before, row = save(conn, user, report_id, data, student)
    audit(conn, user, 'employment_report', row['id'], before, row, '취업 현황 등록' if before is None else '취업 현황 수정')
    return conn.execute(SELECT+' WHERE r.id=%s', (row['id'],)).fetchone()


@router.post('/forecast/employments')
def create(data: Employment, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    return save_one(conn, user, None, data)


@router.put('/forecast/employments/{report_id}')
def update(report_id: int, data: Employment, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    return save_one(conn, user, report_id, data)


class Deletion(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=1000)


@router.post('/forecast/employments/delete')
def delete(data: Deletion, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    rows = conn.execute('''UPDATE dc.employment_report SET deleted_at=now(),deleted_by=%s
      WHERE id=ANY(%s) AND deleted_at IS NULL RETURNING *''', (user['intg_uid'], list(set(data.ids)))).fetchall()
    for row in rows:
        audit(conn, user, 'employment_report', row['id'], None, row, '취업 현황 삭제')  # after 에 deleted_at·deleted_by 가 담긴다
    return dict(deleted=len(rows))


EXCEL_EPOCH = date(1899, 12, 30)
EXCEL_EPOCH_1904 = date(1904, 1, 1)  # workbookPr date1904 — 옛 Mac 엑셀 파일


def month_cell(text, date1904=False):
    """'2026.10'·'2026-10'·'202610'·날짜 셀 → 'YYYY-MM'.
    숫자 셀 2026.10 은 엑셀이 2026.1 로 저장한다 — 소수 한 자리 월은 10·11·12월대로 읽는다(1월은 2026.01 로 남는다)."""
    text = text.strip()
    if not text:
        return None
    if re.fullmatch(r'[0-9]{5}(\.0+)?', text) and 20000 <= float(text) <= 80000:  # 날짜 서식 셀(일련번호)
        day = (EXCEL_EPOCH_1904 if date1904 else EXCEL_EPOCH) + timedelta(days=int(float(text)))
        return f'{day.year:04d}-{day.month:02d}'
    match = (re.fullmatch(r'([0-9]{4})[.\-/년 ]+([0-9]{1,2})월?(?:[.\-/ ]+[0-9]{1,2}일?)?', text)
             or re.fullmatch(r'([0-9]{4})([0-9]{2})', text))
    if not match:
        raise ValueError
    month = match.group(2) + ('0' if re.fullmatch(r'[0-9]{4}\.[0-9]', text) else '')
    if not 1 <= int(month) <= 12:
        raise ValueError
    return f'{match.group(1)}-{int(month):02d}'


REQUIRED = ['조사년도', '학번', '취업처', '부서/업무', '기업분류', '지역', '취업일자']


@router.post('/forecast/employments/upload')
async def upload(request: Request, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    """다운로드한 파일을 그대로 다시 올릴 수 있다. 학생 열은 학번으로 학사에서 다시 읽는다.
    한 행이라도 틀리면 아무것도 저장하지 않고 행별 오류를 돌려준다. 같은 조사년도·학번은 갱신한다.
    본문만 비동기로 받고 해석·DB 는 스레드에서 한다 — 이벤트 루프를 막으면 다른 API 가 멈춘다."""
    return await run_in_threadpool(import_workbook, await read_body(request), user, conn)


def import_workbook(data, user, conn):
    try:
        rows, date1904 = read_workbook(data)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    if not rows:
        raise HTTPException(422, '빈 파일입니다.')
    head = {name: index for index, name in enumerate(rows[0]) if name}
    missing = [name for name in REQUIRED if name not in head]
    if missing:
        raise HTTPException(422, '필수 열이 없습니다: ' + ', '.join(missing))
    cell = lambda row, name: row[head[name]].strip() if name in head and head[name] < len(row) else ''
    codes = conn.execute('''SELECT group_code,code,label FROM dc.code_item
      WHERE group_code IN ('JOB_COMPANY_TYPE','EMPLOYMENT_REGION') AND is_active''').fetchall()
    lookup = {(c['group_code'], key): c['code'] for c in codes for key in (c['code'], c['label'])}
    body = [(number, row) for number, row in enumerate(rows[1:], start=2) if any(v.strip() for v in row)]
    students = academic(conn, {cell(row, '학번') for _, row in body})
    errors, parsed, seen = [], [], {}
    for number, row in body:
        problems = []
        months = {}
        for name, required in (('졸업년월', False), ('취업일자', True)):
            try:
                months[name] = month_cell(cell(row, name), date1904)
            except ValueError:
                problems.append(f'{name} 형식(YYYY.MM)')
                continue
            if required and not months[name]:
                problems.append(f'{name} 누락')
        year_text = cell(row, '조사년도')
        year = int(float(year_text)) if re.fullmatch(r'[0-9]{4}(\.0+)?', year_text) else None
        if year is None or not 2000 <= year <= 2100:
            problems.append('조사년도')
        no = cell(row, '학번')
        student = students.get(no)
        if not student:
            problems.append('학번(학사 정보 없음)' if no else '학번 누락')
        company, duty = cell(row, '취업처'), cell(row, '부서/업무')
        for name, value in (('취업처', company), ('부서/업무', duty)):  # 등록 화면(Employment)과 같은 한도 — 자르지 않는다.
            if not value:
                problems.append(f'{name} 누락')
            elif len(value) > TEXT_LIMIT:
                problems.append(f'{name} {TEXT_LIMIT}자 초과')
        ctype = lookup.get(('JOB_COMPANY_TYPE', cell(row, '기업분류')))
        region = lookup.get(('EMPLOYMENT_REGION', cell(row, '지역')))
        if not ctype:
            problems.append('기업분류')
        if not region:
            problems.append('지역')
        key = (year, student['intg_uid']) if student and year else None
        if key in seen:
            problems.append(f'{seen[key]}행과 중복')
        if problems:
            errors.append(dict(row=number, message=', '.join(problems)))
            continue
        seen[key] = number
        parsed.append(record(Employment(surveyYear=year, studentNo=no, graduationMonth=months['졸업년월'], companyName=company,
                                        duty=duty, companyTypeCode=ctype, regionCode=region, employedMonth=months['취업일자']), student))
    if errors:
        raise HTTPException(422, dict(message=f'{len(errors)}개 행에 오류가 있어 저장하지 않았습니다.', errors=errors[:200]))
    if not parsed:
        raise HTTPException(422, '올릴 행이 없습니다.')
    # 일괄 반영 — 기존 행을 잠가 변경 전 값을 얻고, 한 문장 upsert 로 저장한다(동시 등록도 UNIQUE 충돌 없이 갱신).
    keys = Jsonb([dict(survey_year=r['survey_year'], intg_uid=r['intg_uid']) for r in parsed])
    before = {(r['survey_year'], r['intg_uid']): r for r in conn.execute('''SELECT r.* FROM dc.employment_report r
      JOIN jsonb_to_recordset(%s) AS k(survey_year smallint,intg_uid text) USING(survey_year,intg_uid)
      WHERE r.deleted_at IS NULL FOR UPDATE OF r''', (keys,)).fetchall()}
    types = ','.join(f'{c} {"smallint" if c == "survey_year" else "text"}' for c in SAVED)
    saved = conn.execute(f'''INSERT INTO dc.employment_report({COLUMNS},created_by,updated_by)
      SELECT {COLUMNS},%(by)s,%(by)s FROM jsonb_to_recordset(%(rows)s) AS x({types})
      ON CONFLICT (survey_year,intg_uid) WHERE deleted_at IS NULL DO UPDATE SET
      ({COLUMNS},updated_by,updated_at)=({",".join("excluded."+c for c in SAVED)},excluded.updated_by,now())
      RETURNING *''', dict(rows=Jsonb(parsed), by=user['intg_uid'])).fetchall()
    changes = [(row['id'], before.get((row['survey_year'], row['intg_uid'])), row) for row in saved]
    audit_many(conn, user, 'employment_report', changes, '취업 현황 엑셀 업로드')
    updated = sum(1 for _, old, _ in changes if old is not None)
    return dict(inserted=len(changes)-updated, updated=updated)
