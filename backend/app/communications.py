import csv
import io
from datetime import date
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import Response
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field

from .administration import administrator
from .auth import principal
from .counsel import visibility
from .db import connection

router = APIRouter()


@router.get('/system/notices')
def managed_notices(page: int = Query(1,ge=1),pageSize: int = Query(20,ge=1,le=100),user=Depends(administrator,scope='function'),conn=Depends(connection,scope='function')):
    rows=conn.execute('SELECT * FROM dc.notice WHERE deleted_at IS NULL ORDER BY pinned DESC,posted_at DESC,id LIMIT %s OFFSET %s',(pageSize,(page-1)*pageSize)).fetchall()
    total=conn.execute('SELECT count(*) AS n FROM dc.notice WHERE deleted_at IS NULL').fetchone()['n']
    return dict(items=[notice_dto(r) for r in rows],totalCount=total,page=page,pageSize=pageSize)


def notice_dto(r):
    return dict(id=r['id'], category=r['category'], title=r['title'], summary=r['summary'], body=r['body'],
                postedAt=r['posted_at'], pinned=r['pinned'], version=r['version'])


@router.get('/notices')
def notices(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100),
            category: Literal['PROGRAM', 'CAREER', 'SYSTEM'] | None = None,
            user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    where = 'deleted_at IS NULL AND posted_at<=CURRENT_DATE'
    values = []
    if category:
        where += ' AND category=%s'
        values.append(category)
    count = conn.execute('SELECT count(*) AS n FROM dc.notice WHERE '+where, values).fetchone()['n']
    rows = conn.execute('SELECT * FROM dc.notice WHERE '+where+' ORDER BY pinned DESC,posted_at DESC,id LIMIT %s OFFSET %s', values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=[notice_dto(r) for r in rows], totalCount=count, page=page, pageSize=pageSize)


class NoticeBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(default=0, ge=0)
    category: Literal['PROGRAM', 'CAREER', 'SYSTEM']
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(max_length=2000)
    body: list[str] = Field(min_length=1, max_length=100)
    postedAt: date
    pinned: bool = False


@router.put('/notices/{notice_id}')
def save_notice(notice_id: str, body: NoticeBody, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    if len(notice_id)>100 or sum(map(len,body.body))>200000:
        raise HTTPException(422, '공지 크기 제한을 초과했습니다.')
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('notice:'+notice_id,))
    before = conn.execute('SELECT * FROM dc.notice WHERE id=%s FOR UPDATE', (notice_id,)).fetchone()
    if (before['version'] if before else 0) != body.expectedVersion or (before and before['deleted_at']):
        raise HTTPException(409, '공지사항이 변경되었습니다. 다시 조회해 주세요.')
    row = conn.execute('''INSERT INTO dc.notice(id,category,title,summary,body,posted_at,pinned,created_by,updated_by)
      VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET category=excluded.category,title=excluded.title,
      summary=excluded.summary,body=excluded.body,posted_at=excluded.posted_at,pinned=excluded.pinned,
      updated_by=excluded.updated_by,updated_at=now(),version=dc.notice.version+1 RETURNING *''',
      (notice_id,body.category,body.title,body.summary,body.body,body.postedAt,body.pinned,user['intg_uid'],user['intg_uid'])).fetchone()
    conn.execute('INSERT INTO dc.notice_event(notice_id,actor_uid,action,before_value,after_value) VALUES(%s,%s,%s,%s,%s)',
                 (notice_id,user['intg_uid'],'UPDATE' if before else 'CREATE',Jsonb(jsonable_encoder(before)),Jsonb(jsonable_encoder(row))))
    return notice_dto(row)


@router.delete('/notices/{notice_id}')
def delete_notice(notice_id: str, expectedVersion: int = Query(ge=1), user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    before = conn.execute('SELECT * FROM dc.notice WHERE id=%s FOR UPDATE',(notice_id,)).fetchone()
    if not before or before['deleted_at']:
        raise HTTPException(404,'공지사항을 찾을 수 없습니다.')
    if before['version'] != expectedVersion:
        raise HTTPException(409,'공지사항이 변경되었습니다.')
    conn.execute('UPDATE dc.notice SET deleted_at=now(),updated_by=%s,version=version+1 WHERE id=%s',(user['intg_uid'],notice_id))
    conn.execute("INSERT INTO dc.notice_event(notice_id,actor_uid,action,before_value,after_value) VALUES(%s,%s,'DELETE',%s,'{}')",(notice_id,user['intg_uid'],Jsonb(jsonable_encoder(before))))
    return {'deleted':True}


def notification_dto(r):
    return dict(id=str(r['id']), tone=r['tone'], title=r['title'], body=r['body'], at=r['occurred_at'], to=r['route'], readAt=r['read_at'])


@router.get('/notifications')
def notifications(page: int = Query(1,ge=1), pageSize: int = Query(20,ge=1,le=100), user=Depends(principal,scope='function'), conn=Depends(connection,scope='function')):
    summary = conn.execute('''SELECT count(*) AS total,count(*) FILTER(WHERE r.notification_id IS NULL) AS unread
      FROM dc.notification n LEFT JOIN dc.notification_read r ON r.notification_id=n.id WHERE recipient_uid=%s''',(user['intg_uid'],)).fetchone()
    rows = conn.execute('''SELECT n.*,r.read_at FROM dc.notification n LEFT JOIN dc.notification_read r ON r.notification_id=n.id
      WHERE recipient_uid=%s ORDER BY occurred_at DESC,n.id LIMIT %s OFFSET %s''',(user['intg_uid'],pageSize,(page-1)*pageSize)).fetchall()
    return dict(items=[notification_dto(r) for r in rows], totalCount=summary['total'],unreadCount=summary['unread'],page=page,pageSize=pageSize)


@router.post('/notifications/{notification_id}/read')
def read_notification(notification_id: UUID,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if not conn.execute('SELECT 1 FROM dc.notification WHERE id=%s AND recipient_uid=%s',(notification_id,user['intg_uid'])).fetchone():
        raise HTTPException(404,'알림을 찾을 수 없습니다.')
    conn.execute('INSERT INTO dc.notification_read(notification_id) VALUES(%s) ON CONFLICT DO NOTHING',(notification_id,))
    return {'readAt':conn.execute('SELECT read_at FROM dc.notification_read WHERE notification_id=%s',(notification_id,)).fetchone()['read_at']}


def csv_cell(value):
    text = str(value or '')
    return "'"+text if text.lstrip().startswith(('=','+','-','@','\t','\r')) else text


@router.get('/notifications/export.csv')
def export_notifications(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    rows = conn.execute('SELECT title,body,occurred_at FROM dc.notification WHERE recipient_uid=%s ORDER BY occurred_at DESC,id LIMIT 10000',(user['intg_uid'],)).fetchall()
    output=io.StringIO(); writer=csv.writer(output)
    writer.writerow(['제목','내용','시각'])
    writer.writerows([[csv_cell(r[k]) for k in ('title','body','occurred_at')] for r in rows])
    return Response('\ufeff'+output.getvalue(),media_type='text/csv; charset=utf-8',headers={'Content-Disposition':'attachment; filename="notifications.csv"'})


@router.get('/counsel-events')
def counsel_events(page: int = Query(1,ge=1),pageSize: int = Query(100,ge=1,le=100),requestId: str | None = None,
                   user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    condition,values=visibility(user)
    condition += " AND e.kind IN ('CONFIRM','RESCHEDULE','REASSIGN','CANCEL','COMPLETE')"
    if requestId:
        condition+=' AND r.id=%s'; values.append(requestId)
    base=' FROM dc.counsel_event e JOIN dc.counsel_request r ON r.id=e.request_id JOIN dc.person s ON s.intg_uid=r.student_uid JOIN dc.person a ON a.intg_uid=e.actor_uid WHERE '+condition
    total=conn.execute('SELECT count(*) AS n'+base,values).fetchone()['n']
    rows=conn.execute('SELECT e.*,s.alias AS student_alias,a.alias AS actor_alias,a.name AS actor_name'+base+' ORDER BY e.created_at,e.id LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    labels={'CONFIRM':'확정','RESCHEDULE':'일정변경','REASSIGN':'재배정','CANCEL':'취소','COMPLETE':'완료'}
    items=[]
    for r in rows:
        payload=r['payload']; before=payload.get('before') or {}; action=payload.get('action') or {}
        item=dict(id=str(r['id']),requestId=r['request_id'],studentId=r['student_alias'],kind=labels[r['kind']],by=r['actor_alias'],byName=r['actor_name'],at=r['created_at'])
        # Never expose action.summary/comment/finalType or intake through event history.
        if user['kind']=='STAFF' and action.get('reason'):
            item['reason']=action['reason']
        for key,value in [('fromCounselorId',before.get('assignedCounselorId',before.get('professorId'))),('toCounselorId',action.get('assigneeId')),('fromSlot',before.get('slot')),('toSlot',action.get('slot'))]:
            if value is not None: item[key]=value
        items.append(item)
    return dict(items=items,totalCount=total,page=page,pageSize=pageSize)


@router.get('/popups')
def popups(user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    rows = conn.execute('''SELECT id,image_path,alt,href FROM dc.main_popup
      WHERE active AND (starts_at IS NULL OR starts_at<=CURRENT_DATE) AND (ends_at IS NULL OR ends_at>=CURRENT_DATE)
      ORDER BY sort_order,id''').fetchall()
    return {'items': [dict(id=r['id'], image=r['image_path'], alt=r['alt'], href=r['href']) for r in rows]}
