"""Professor-owned counseling lists and versioned report editing."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response
from psycopg.errors import ForeignKeyViolation, SerializationFailure, NoDataFound
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb
from pydantic import Field

from . import files
from .auth import principal, require_staff, student_access
from .counsel import Action, get_request, act
from .counsel_records import ProfessorRecord
from .db import connection

router = APIRouter(prefix='/professor-counsel')


def professor(user):
    require_staff(user)
    if user['profile'].get('role') != 'professor':
        raise HTTPException(403, '교수만 사용할 수 있습니다.')


BASE = ''' FROM dc.counsel_request r JOIN dc.person p ON p.intg_uid=r.student_uid
 JOIN dc.student_list v ON v.intg_uid=r.student_uid
 LEFT JOIN dc.counsel_record c ON c.request_id=r.id'''
OWN = "r.legacy_type='교수' AND r.counselor_uid=%s AND r.status_code IN ('CONFIRMED','DONE')"
FIELDS = '''r.id,r.version AS request_version,r.status_code,r.method_code,r.topic,r.topic_code,
 r.source_payload,r.slot_date,r.slot_start,r.slot_end,r.place,p.alias AS student_id,p.name,
 v.student_no,v.major_label,v.college_name,v.grade,v.status,
 c.id AS record_id,c.version AS record_version,c.summary'''


def item(row):
    return dict(id=row['id'], requestVersion=row['request_version'], recordVersion=row['record_version'] or 0,
                studentId=row['student_id'], name=row['name'], studentNo=row['student_no'],
                major=row['major_label'], college=row['college_name'], grade=row['grade'], enrollmentStatus=row['status'],
                title=(row['source_payload'] or {}).get('reportTitle') or '상담보고서',
                categoryCode=row['topic_code'] or 'ETC', date=row['slot_date'],
                start=row['slot_start'].strftime('%H:%M') if row['slot_start'] else '',
                end=row['slot_end'].strftime('%H:%M') if row['slot_end'] else '', place=row['place'] or '',
                channel='online' if row['method_code']=='ONLINE' else 'offline',
                origin='미예약방문' if (row['source_payload'] or {}).get('origin')=='PROF_RECORD' else '예약신청',
                status='완료' if row['status_code']=='DONE' else '진행중')


@router.get('')
def listing(channel:Literal['offline','online'],page:int=Query(1,ge=1),pageSize:int=Query(10,ge=1,le=100),
            category:str='',status:Literal['','진행중','완료']='',college:str='',major:str='',
            dateFrom:date|None=None,dateTo:date|None=None,q:str=Query('',max_length=200),
            searchBy:Literal['all','name','studentNo','title']='all',
            user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    if dateFrom and dateTo and dateFrom>dateTo:
        raise HTTPException(422, '시작일은 종료일보다 늦을 수 없습니다.')
    where=[OWN,'r.method_code=%s']; values=[user['intg_uid'],'ONLINE' if channel=='online' else 'OFFLINE']
    for value,column in ((category,"COALESCE(r.topic_code,'ETC')"),(college,'v.college_name'),(major,'v.major_label')):
        if value: where.append(column+'=%s'); values.append(value)
    if status: where.append('r.status_code=%s'); values.append('DONE' if status=='완료' else 'CONFIRMED')
    if dateFrom: where.append('r.slot_date>=%s'); values.append(dateFrom)
    if dateTo: where.append('r.slot_date<=%s'); values.append(dateTo)
    if q.strip():
        column={'name':'p.name','studentNo':'v.student_no','title':"COALESCE(r.source_payload->>'reportTitle','상담보고서')",
                'all':"concat_ws(' ',p.name,v.student_no,COALESCE(r.source_payload->>'reportTitle','상담보고서'))"}[searchBy]
        where.append(column+' ILIKE %s'); values.append('%'+q.strip().replace('%','\\%').replace('_','\\_')+'%')
    condition=' AND '.join(where)
    total=conn.execute('SELECT count(*) n'+BASE+' WHERE '+condition,values).fetchone()['n']
    rows=conn.execute('SELECT '+FIELDS+BASE+' WHERE '+condition+
                      ' ORDER BY r.slot_date DESC NULLS LAST,r.id DESC LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=[item(row) for row in rows],totalCount=total,page=page,pageSize=pageSize)


@router.get('/options')
def options(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    rows=conn.execute('SELECT DISTINCT v.college_name college,v.major_label major'+BASE+' WHERE '+OWN+
                      ' ORDER BY college,major',(user['intg_uid'],)).fetchall()
    return {'organizations':rows}


def stats_where(user,dateFrom,dateTo,college,major,grade,q):
    if dateFrom and dateTo and dateFrom>dateTo: raise HTTPException(422,'조회 기간을 확인하세요.')
    where=[OWN,"r.status_code='DONE'","c.status_code='DONE'"]; values=[user['intg_uid']]
    for value,column in ((college,'v.college_name'),(major,'v.major_label'),(grade,'v.grade')):
        if value: where.append(column+'=%s'); values.append(value)
    if dateFrom: where.append('r.slot_date>=%s'); values.append(dateFrom)
    if dateTo: where.append('r.slot_date<=%s'); values.append(dateTo)
    if q.strip():
        where.append("concat_ws(' ',p.name,v.student_no) ILIKE %s")
        values.append('%'+q.strip().replace('%','\\%').replace('_','\\_')+'%')
    return ' AND '.join(where),values


@router.get('/stats')
def stats(dateFrom:date|None=None,dateTo:date|None=None,college:str='',major:str='',grade:int|None=Query(None,ge=1,le=6),
          q:str=Query('',max_length=200),user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    condition,values=stats_where(user,dateFrom,dateTo,college,major,grade,q)
    # Months are calendar months of the counseling date; a range spanning years sums the same month.
    rows=conn.execute('''SELECT m.month,
      count(r.id) FILTER(WHERE r.method_code='ONLINE') AS online,
      count(r.id) FILTER(WHERE r.method_code='OFFLINE') AS offline
      FROM generate_series(1,12) m(month) LEFT JOIN (SELECT r.id,r.method_code,r.slot_date'''+BASE+' WHERE '+condition+
      ''') r ON extract(month FROM r.slot_date)=m.month GROUP BY m.month ORDER BY m.month''',values).fetchall()
    return {'months':rows,'online':sum(r['online'] for r in rows),'offline':sum(r['offline'] for r in rows),
            'total':sum(r['online']+r['offline'] for r in rows)}


@router.get('/stats/records')
def stats_records(page:int=Query(1,ge=1),pageSize:int=Query(10,ge=1,le=100),sort:Literal['date','name']='date',
                  order:Literal['asc','desc']='desc',dateFrom:date|None=None,dateTo:date|None=None,college:str='',major:str='',
                  grade:int|None=Query(None,ge=1,le=6),q:str=Query('',max_length=200),
                  user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    condition,values=stats_where(user,dateFrom,dateTo,college,major,grade,q)
    direction=' ASC' if order=='asc' else ' DESC'
    ordering={'date':'r.slot_date'+direction+' NULLS LAST,p.name','name':'p.name'+direction+',r.slot_date DESC'}[sort]
    total=conn.execute('SELECT count(*) n'+BASE+' WHERE '+condition,values).fetchone()['n']
    rows=conn.execute('SELECT '+FIELDS+BASE+' WHERE '+condition+' ORDER BY '+ordering+
                      ',r.id DESC LIMIT %s OFFSET %s',values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=[item(row) for row in rows],totalCount=total,page=page,pageSize=pageSize)


HOME_REQUEST="""r.legacy_type='교수' AND r.counselor_uid=%s
 AND COALESCE(r.source_payload->>'origin','')<>'PROF_RECORD'"""


def semester_of(day):
    # 1학기 3~8월, 2학기 9월~이듬해 2월.
    if 3<=day.month<=8: return day.year,1
    return (day.year if day.month>=9 else day.year-1),2


@router.get('/home')
def home(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    today=datetime.now(ZoneInfo('Asia/Seoul')).date()
    monday=today-timedelta(days=today.weekday())
    # 학과학생 = 학과 배정(조직·학과담당)으로 열람 범위에 든 재학생. 다른 학과의 지도학생은 빼고,
    # 전담 여부는 담당 교수와 무관하게 활성 전담교수 배정이 있는지로 센다.
    grades=conn.execute('''SELECT v.grade,count(a.id) AS assigned,count(*)-count(a.id) AS unassigned
      FROM dc.student_list v LEFT JOIN dc.advisor_assignment a ON a.student_uid=v.intg_uid AND a.released_at IS NULL
      WHERE v.status='재학' AND EXISTS(SELECT 1 FROM dc.staff_student_scope g
        WHERE g.staff_uid=%s AND g.student_uid=v.intg_uid AND g.source<>'advisor_assignment')
      GROUP BY v.grade ORDER BY v.grade''',(user['intg_uid'],)).fetchall()
    counts=conn.execute('''SELECT
      count(*) FILTER(WHERE r.method_code='ONLINE' AND r.status_code IN ('REQ','CONFIRMED')) AS unanswered,
      count(*) FILTER(WHERE r.method_code='OFFLINE' AND r.status_code IN ('REQ','CONFIRMED','DONE')
        AND r.slot_date BETWEEN %s AND %s) AS this_week
      FROM dc.counsel_request r WHERE '''+HOME_REQUEST,(monday,monday+timedelta(days=6),user['intg_uid'])).fetchone()
    rows=conn.execute('''SELECT q.*,p.alias AS student_id,p.name,v.student_no,v.college_name,v.major_label,v.grade,
      (SELECT label FROM dc.code_item WHERE group_code='COUNSEL_STATUS' AND code=q.status_code) AS status_label
      FROM (SELECT r.id,r.student_uid,r.method_code,r.status_code,r.requested_at,
        row_number() OVER(PARTITION BY r.method_code ORDER BY r.requested_at DESC,r.id DESC) AS n
        FROM dc.counsel_request r WHERE '''+HOME_REQUEST+''') q
      JOIN dc.person p ON p.intg_uid=q.student_uid JOIN dc.student_list v ON v.intg_uid=q.student_uid
      WHERE q.n<=5 ORDER BY q.requested_at DESC,q.id DESC''',(user['intg_uid'],)).fetchall()
    def request(row):
        return dict(id=row['id'],studentId=row['student_id'],name=row['name'],studentNo=row['student_no'],
                    college=row['college_name'],major=row['major_label'],grade=row['grade'],
                    requestedAt=row['requested_at'],statusCode=row['status_code'],status=row['status_label'] or row['status_code'])
    year,term=semester_of(today)
    return dict(semester=dict(year=year,term=term),
                grades=[dict(grade=g['grade'],assigned=g['assigned'],unassigned=g['unassigned']) for g in grades],
                online=dict(unanswered=counts['unanswered'],items=[request(r) for r in rows if r['method_code']=='ONLINE']),
                offline=dict(thisWeek=counts['this_week'],items=[request(r) for r in rows if r['method_code']=='OFFLINE']))


def owned_request(conn,user,request_id,lock=False):
    professor(user)
    row=get_request(conn,user,request_id,lock=lock)
    if row['legacy_type']!='교수' or row['counselor_uid']!=user['intg_uid']:
        raise HTTPException(404,'상담을 찾을 수 없습니다.')
    return row


@router.get('/students/{identity}')
def student_basic(identity:str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    student=student_access(conn,user,identity)
    basic=conn.execute('SELECT profile FROM dc.person WHERE intg_uid=%s',(student['intg_uid'],)).fetchone()
    data={**(basic['profile'] or {}),**(student['detail'] or {})}
    return dict(phone=data.get('phone',''),email=data.get('email',''),sex=data.get('sex',data.get('gender','')))


@router.get('/{request_id}')
def detail(request_id:str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    request=owned_request(conn,user,request_id)
    row=conn.execute('SELECT '+FIELDS+BASE+' WHERE r.id=%s',(request_id,)).fetchone()
    result=item(row)
    basic=conn.execute('''SELECT s.detail,p.profile FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE s.intg_uid=%s''',(request['student_uid'],)).fetchone()
    data={**(basic['profile'] or {}),**(basic['detail'] or {})}
    record=conn.execute('SELECT comment FROM dc.counsel_record WHERE request_id=%s',(request_id,)).fetchone()
    result.update(summary=row['summary'] or '',publicComment=record['comment'] if record else '',purpose=request['topic'],
                  phone=data.get('phone',''),email=data.get('email',''),sex=data.get('sex',data.get('gender','')),
                  attachments=[files.file_dto(f,'/api/v1/professor-counsel-files/') for f in conn.execute(
                      "SELECT * FROM dc.file_object WHERE owner_kind='COUNSEL_REQUEST' AND owner_id=%s AND state='READY' ORDER BY uploaded_at,id",
                      (request_id,)).fetchall()])
    return result


class ReportUpdate(ProfessorRecord):
    expectedRequestVersion:int=Field(ge=1)
    expectedRecordVersion:int=Field(ge=0)


@router.delete('/{request_id}',status_code=204)
def delete(request_id:str,background:BackgroundTasks,expectedVersion:int=Query(ge=1),
           user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    owned_request(conn,user,request_id)
    try:
        removed=conn.execute('SELECT dc.delete_professor_counsel(%s,%s,%s) AS files',
          (request_id,user['intg_uid'],expectedVersion)).fetchone()['files']
    except SerializationFailure: raise HTTPException(409,'상담이 변경되었습니다. 다시 조회하세요.')
    except NoDataFound: raise HTTPException(404,'상담을 찾을 수 없습니다.')
    except ForeignKeyViolation: raise HTTPException(409,'다른 업무에서 참조 중인 상담은 삭제할 수 없습니다.')
    def remove_bytes():
        for file_id in removed: files.location(file_id).unlink(missing_ok=True)
    background.add_task(remove_bytes)
    return Response(status_code=204)


@router.put('/{request_id}')
def update(request_id:str,body:ReportUpdate,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    request=owned_request(conn,user,request_id)
    if request['version']!=body.expectedRequestVersion: raise HTTPException(409,'상담이 변경되었습니다. 다시 조회하세요.')
    if request['method_code']!=('ONLINE' if body.method=='비대면' else 'OFFLINE'):
        raise HTTPException(422,'상담 방식은 변경할 수 없습니다.')
    completing=request['status_code']=='CONFIRMED'
    public_comment=body.summary.strip() if body.method=='비대면' else ''
    if completing:
        # Reuse the existing completion transaction and its lock order and events.
        act(request_id,'complete',Action(expectedVersion=body.expectedRequestVersion,
          expectedRecordVersion=body.expectedRecordVersion,summary=body.summary,comment=public_comment),user,conn)
    elif request['status_code']!='DONE': raise HTTPException(409,'확정 또는 완료된 상담만 저장할 수 있습니다.')
    request=owned_request(conn,user,request_id,lock=True)
    if request['version']!=body.expectedRequestVersion+int(completing):
        raise HTTPException(409,'상담이 변경되었습니다. 다시 조회하세요.')
    record=conn.execute('SELECT * FROM dc.counsel_record WHERE request_id=%s FOR UPDATE',(request_id,)).fetchone()
    if not record: raise HTTPException(409,'상담기록을 다시 조회하세요.')
    # Completion checked the previous version above; edits check it here under lock.
    if not completing and record['version']!=body.expectedRecordVersion:
        raise HTTPException(409,'상담기록이 변경되었습니다. 다시 조회하세요.')
    category=conn.execute("SELECT 1 FROM dc.code_item WHERE group_code='PROF_COUNSEL_TYPE' AND code=%s AND is_active",(body.categoryCode,)).fetchone()
    if not category: raise HTTPException(422,'상담 분류 코드가 올바르지 않습니다.')
    student=conn.execute('SELECT intg_uid FROM dc.person WHERE alias=%s OR intg_uid=%s',
      (body.studentId,body.studentId)).fetchone()
    if not student or request['student_uid']!=student['intg_uid']:
        raise HTTPException(422,'상담 학생은 변경할 수 없습니다.')
    before=detail(request_id,user,conn)
    conn.execute('''UPDATE dc.counsel_request SET topic_code=%s,slot_date=%s,slot_start=%s,slot_end=%s,place=%s,
      source_payload=source_payload||%s,version=version+1 WHERE id=%s''',
      (body.categoryCode,body.date,body.start,body.end,body.place.strip(),Jsonb({'reportTitle':body.title.strip()}),request_id))
    conn.execute('UPDATE dc.counsel_record SET summary=%s,comment=%s,updated_at=now(),version=version+1 WHERE request_id=%s',
                  (body.summary.strip(),public_comment,request_id))
    old_ids={f['id'] for f in before['attachments']}; new_ids=set(body.fileIds)
    for file_id in new_ids-old_ids: files.claim(conn,user,file_id,'COUNSEL_REQUEST',request_id,'COUNSEL_ATTACHMENT')
    for file_id in old_ids-new_ids: files.discard(conn,user,file_id)
    conn.execute('INSERT INTO dc.counsel_event(request_id,actor_uid,kind,payload) VALUES(%s,%s,%s,%s)',
                  (request_id,user['intg_uid'],'RECORD_UPDATED',Jsonb(jsonable_encoder({'before':{k:before[k] for k in ('title','summary','categoryCode','date','start','end','place')},
                   'after':body.model_dump(mode='json')}))))
    return detail(request_id,user,conn)


file_router=APIRouter(prefix='/professor-counsel-files')


@file_router.post('',status_code=201)
async def upload(request:Request,name:str=Query(min_length=1,max_length=300),user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    return files.file_dto(files.store(conn,user,'COUNSEL_ATTACHMENT',name,await files.read_body(request)),
                          '/api/v1/professor-counsel-files/')


@file_router.get('/{file_id}')
def download(file_id:str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    professor(user)
    row=files.get_file(conn,file_id)
    if row['owner_kind']!='COUNSEL_REQUEST' or row['slot']!='COUNSEL_ATTACHMENT': raise HTTPException(404,'파일을 찾을 수 없습니다.')
    if row['owner_id']: owned_request(conn,user,row['owner_id'])
    elif row['uploaded_by']!=user['intg_uid']: raise HTTPException(404,'파일을 찾을 수 없습니다.')
    return files.stream(row)
