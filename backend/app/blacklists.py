"""System-managed student blocking; independent of program penalties."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from .administration import administrator
from .db import connection

router = APIRouter(prefix='/system/sms-blacklist')


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


@router.get('/{identity}/events')
def events(identity: str,page: int=Query(1,ge=1),pageSize: int=Query(20,ge=1,le=100),
           user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    uid = managed_student(conn,identity)['intg_uid']
    count = conn.execute('SELECT count(*) AS n FROM dc.sms_blacklist_event WHERE student_uid=%s',(uid,)).fetchone()['n']
    rows = conn.execute('''SELECT e.id,e.blocked,e.reason,e.version,e.occurred_at AS "occurredAt",p.name AS "actorName"
      FROM dc.sms_blacklist_event e JOIN dc.person p ON p.intg_uid=e.actor_uid
      WHERE student_uid=%s ORDER BY e.version DESC LIMIT %s OFFSET %s''',(uid,pageSize,(page-1)*pageSize)).fetchall()
    return dict(items=rows,totalCount=count,page=page,pageSize=pageSize)
