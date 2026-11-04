"""System-managed student blocking; independent of program penalties."""
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field
from .administration import administrator
from .db import connection
from .files import read_body
from .xlsx_export import read_workbook

router = APIRouter(prefix='/system/sms-blacklist')
REASON_LIMIT = 1000


def student_sheet(conn, data, columns, check):
    """블랙리스트 엑셀 양식(학번 + columns)을 읽어 [(학생, 셀 dict)]을 돌려준다.
    check(셀 dict) 는 행의 문제 목록을 돌려준다. 한 행이라도 틀리면 아무것도 저장하지 않고 행별 오류를 돌려준다.
    학번이 숫자 셀(20180001.0)로 저장돼 있어도 같은 학번으로 읽는다. 같은 학번이 두 번 나오면 행 오류다."""
    try:
        rows, _ = read_workbook(data)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    if not rows:
        raise HTTPException(422, '빈 파일입니다.')
    head = {name: index for index, name in enumerate(rows[0]) if name}
    missing = [name for name in ['학번', *columns] if name not in head]
    if missing:
        raise HTTPException(422, '필수 열이 없습니다: ' + ', '.join(missing))
    body = []
    for number, row in enumerate(rows[1:], start=2):
        if any(v.strip() for v in row):
            cells = {name: row[i].strip() if i < len(row) else '' for name, i in head.items()}
            cells['학번'] = re.sub(r'\.0+$', '', cells['학번'])
            cells['_row'] = number
            body.append((number, cells))
    if not body:
        raise HTTPException(422, '올릴 행이 없습니다.')
    students = {r['student_no']: r['intg_uid'] for r in conn.execute(
        'SELECT intg_uid,student_no FROM dc.student WHERE student_no=ANY(%s)', ([c['학번'] for _, c in body],)).fetchall()}
    errors, parsed, seen = [], [], {}
    for number, cells in body:
        uid = students.get(cells['학번'])
        problems = [] if uid else ['학번(학생 정보 없음)' if cells['학번'] else '학번 누락']
        if uid in seen:
            problems.append(f'{seen[uid]}행과 중복')
        problems += check(cells)
        if problems:
            errors.append(dict(row=number, message=', '.join(problems)))
            continue
        seen[uid] = number
        parsed.append((uid, cells))
    if errors:
        raise HTTPException(422, dict(message=f'{len(errors)}개 행에 오류가 있어 저장하지 않았습니다.', errors=errors[:200]))
    return parsed


def reason_problems(text):
    return ['사유 누락'] if not text else [f'사유 {REASON_LIMIT}자 초과'] if len(text) > REASON_LIMIT else []


def managed_student(conn, identity):
    row = conn.execute('''SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE p.alias=%s OR s.intg_uid=%s''', (identity, identity)).fetchone()
    if not row:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    return row


def sms_lock(conn, uid):
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('sms:'+uid,))


BASE = ''' FROM dc.student s JOIN dc.person p USING(intg_uid)
 LEFT JOIN dc.department d ON (d.college_code,d.dept_code)=(s.college_code,s.dept_code)
 LEFT JOIN dc.sms_blacklist b ON b.student_uid=s.intg_uid'''
SELECT = '''SELECT p.alias AS "studentId",p.name AS "studentName",s.student_no AS "studentNo",
 s.major_label AS "studentMajor",d.college_name AS college,COALESCE(b.blocked,false) AS blocked,
 COALESCE(b.version,0) AS version,b.reason,b.updated_at AS "updatedAt"'''


@router.get('')
def listing(q: str = Query('',max_length=200), blocked: bool | None = True,
            page: int = Query(1,ge=1), pageSize: int = Query(20,ge=1,le=100),
            user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    where, values = ['true'], []
    if blocked is not None:
        where.append('COALESCE(b.blocked,false)=%s'); values.append(blocked)
    if q.strip():
        where.append("concat_ws(' ',p.name,s.student_no,s.major_label) ILIKE %s")
        values.append('%'+q.strip().replace('\\','\\\\').replace('%','\\%').replace('_','\\_')+'%')
    base = BASE+' WHERE '+' AND '.join(where)
    count = conn.execute('SELECT count(*) AS n'+base, values).fetchone()['n']
    rows = conn.execute(SELECT+base+' ORDER BY b.updated_at DESC NULLS LAST,s.intg_uid LIMIT %s OFFSET %s',
                        values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=rows,totalCount=count,page=page,pageSize=pageSize)


class BlockChange(BaseModel):
    model_config = ConfigDict(extra='forbid',str_strip_whitespace=True)
    blocked: bool
    expectedVersion: int = Field(ge=0)
    reason: str = Field(min_length=1,max_length=1000)


@router.put('/{identity}')
def change(identity: str,body: BlockChange,user=Depends(administrator,scope='function'),
           conn=Depends(connection,scope='function')):
    uid = managed_student(conn,identity)['intg_uid']
    sms_lock(conn,uid)
    before = conn.execute('SELECT * FROM dc.sms_blacklist WHERE student_uid=%s FOR UPDATE',(uid,)).fetchone()
    if (before['version'] if before else 0) != body.expectedVersion:
        raise HTTPException(409,'차단 상태가 변경되었습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.')
    if not body.blocked and not before:
        raise HTTPException(409,'차단되지 않은 학생입니다.')
    if before and before['blocked'] == body.blocked:
        raise HTTPException(409,'이미 같은 차단 상태입니다. 목록을 새로고침해 주세요.')
    row = conn.execute('''INSERT INTO dc.sms_blacklist(student_uid,blocked,reason,updated_by)
      VALUES(%s,%s,%s,%s) ON CONFLICT(student_uid) DO UPDATE SET blocked=excluded.blocked,
      reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now(),version=dc.sms_blacklist.version+1
      RETURNING version''',(uid,body.blocked,body.reason,user['intg_uid'])).fetchone()
    conn.execute('''INSERT INTO dc.sms_blacklist_event(student_uid,blocked,reason,version,actor_uid)
      VALUES(%s,%s,%s,%s,%s)''',(uid,body.blocked,body.reason,row['version'],user['intg_uid']))
    return conn.execute(SELECT+BASE+' WHERE s.intg_uid=%s',(uid,)).fetchone()


@router.post('/upload')
async def upload(request: Request, user=Depends(administrator,scope='function'),
                 conn=Depends(connection,scope='function')):
    """엑셀(학번·사유)로 한 번에 차단 등록한다. 이미 차단된 학생은 건너뛴다(사유를 덮지 않는다).
    본문만 비동기로 받고 해석·DB 는 스레드에서 한다."""
    return await run_in_threadpool(import_blocks, await read_body(request), user, conn)


def import_blocks(data, user, conn):
    parsed = student_sheet(conn, data, ['사유'], lambda c: reason_problems(c['사유']))
    blocked = skipped = 0
    for uid, cells in sorted(parsed, key=lambda p: p[0]):  # 잠금 순서를 고정해 동시 업로드끼리 교착하지 않는다.
        sms_lock(conn, uid)
        before = conn.execute('SELECT blocked FROM dc.sms_blacklist WHERE student_uid=%s FOR UPDATE',(uid,)).fetchone()
        if before and before['blocked']:
            skipped += 1
            continue
        row = conn.execute('''INSERT INTO dc.sms_blacklist(student_uid,blocked,reason,updated_by)
          VALUES(%s,true,%s,%s) ON CONFLICT(student_uid) DO UPDATE SET blocked=true,
          reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now(),version=dc.sms_blacklist.version+1
          RETURNING version''',(uid,cells['사유'],user['intg_uid'])).fetchone()
        conn.execute('''INSERT INTO dc.sms_blacklist_event(student_uid,blocked,reason,version,actor_uid)
          VALUES(%s,true,%s,%s,%s)''',(uid,cells['사유'],row['version'],user['intg_uid']))
        blocked += 1
    return dict(blocked=blocked, skipped=skipped)


@router.get('/{identity}/events')
def events(identity: str,page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),
           user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    uid = managed_student(conn,identity)['intg_uid']
    count = conn.execute('SELECT count(*) AS n FROM dc.sms_blacklist_event WHERE student_uid=%s',(uid,)).fetchone()['n']
    rows = conn.execute('''SELECT e.id,e.blocked,e.reason,e.version,e.occurred_at AS "occurredAt",p.name AS "actorName"
      FROM dc.sms_blacklist_event e JOIN dc.person p ON p.intg_uid=e.actor_uid
      WHERE student_uid=%s ORDER BY e.version DESC LIMIT %s OFFSET %s''',(uid,pageSize,(page-1)*pageSize)).fetchall()
    return dict(items=rows,totalCount=count,page=page,pageSize=pageSize)
