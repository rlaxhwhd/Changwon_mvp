from fastapi import APIRouter, Depends, HTTPException, Query, Request

from .auth import principal, require_staff, student_access
from .db import connection

router=APIRouter()
HIGH="grade<>1 AND gpa ~ '^[0-9]+([.][0-9]+)?$' AND gpa::numeric<2.5 AND program_count=0 AND counsel_count=0"
CORE="grade<>1 AND student_type<>'T5' AND gpa ~ '^[0-9]+([.][0-9]+)?$' AND gpa::numeric<2.5 AND program_count>=3 AND counsel_count>=1 AND progress>=60"


def profile(conn,row):
    data={**(row['detail'] or {}),'id':row['alias'],'studentNo':row['student_no'],'name':row['name'],
          'major':row['major_label'],'grade':row['grade']}
    data.pop('counselRequests',None)
    current=conn.execute('SELECT student_type FROM dc.student_type_event WHERE student_uid=%s ORDER BY decided_at DESC,id DESC LIMIT 1',(row['intg_uid'],)).fetchone()
    if current:
        data['studentType']=current['student_type']
    # 계획의 축·칸은 전용 API(/students/{id}/roadmap)만 내려준다. 여기서 함께 실으면
    # 초안·검토중 계획과 AI 근거가 권한 검사 없이 새어 나가고 정본이 두 벌이 된다.
    # roadmapOutcome 은 생성 provider 의 입력이라 화면에 내려보내지 않는다.
    data.pop('roadmapAxes',None)
    data.pop('roadmapOutcome',None)
    # ★ targetRole/targetCompany 는 **지우지 않는다.** 화면은 이 둘을 필수로 읽고
    #   (students.ts targetCompanySummary · RoadmapStatus · RoadmapEditorPanel ·
    #    studentDetail · counselChatbot), 타입도 필수라 tsc 가 잡아 주지 않는다.
    #   빼면 계획이 없는 학생(jiwoo)에서 두 SPA 가 부팅 중에 죽는다.
    #   확정된 계획이 있을 때만 그 값으로 **덮어쓴다** — 초안의 목표는 새어 나가지 않는다.
    roadmap=conn.execute('SELECT * FROM dc.roadmap WHERE student_uid=%s AND confirmed',(row['intg_uid'],)).fetchone()
    if roadmap:
        data['targetRole']=roadmap['target_role']
        data['targetCompany']=roadmap['target_company']
    data.setdefault('targetRole','')
    data.setdefault('targetCompany',{})
    data['hasRoadmap']=bool(roadmap)
    # 이행률은 목록 뷰·상세 API 와 같은 SQL 함수가 센다. 화면이 칸 배열을 받아 세지 않는다.
    data['progress']=conn.execute('SELECT pct FROM dc.roadmap_progress(%s,now())',(row['intg_uid'],)).fetchone()['pct']
    return data


@router.get('/bootstrap/profiles')
def profiles(user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    if user['kind']=='STUDENT':
        condition='s.intg_uid=%s'
        values=[user['intg_uid']]
    else:
        condition='EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=s.intg_uid)'
        values=[user['intg_uid']]
    rows=conn.execute('SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE s.detail IS NOT NULL AND '+condition+' ORDER BY p.alias',values).fetchall()
    students=[]
    owners=[]
    for row in rows:
        data=profile(conn,row)
        if 'phases' in data:
            students.append(data)
        else:
            owners.append(data)
    return {'students':students,'counselOwners':owners}


def scope(request,user):
    require_staff(user)
    where=['EXISTS(SELECT 1 FROM dc.staff_student_scope g WHERE g.staff_uid=%s AND g.student_uid=v.intg_uid)']
    values=[user['intg_uid']]
    departments=request.query_params.getlist('departments')
    if departments:
        where.append('major_label=ANY(%s)')
        values.append(departments)
    ids=request.query_params.getlist('studentIds')
    if ids:
        where.append('(alias=ANY(%s) OR intg_uid=ANY(%s))')
        values.extend([ids,ids])
    if request.query_params.get('emptyStudentIds')=='true':
        where.append('false')
    return where,values


def roster(row):
    detail=row['detail'] or {}
    return {'id':row['alias'],'studentNo':row['student_no'],'name':row['name'],
            'major':row['major_label'],'grade':row['grade'],'studentType':row['student_type'],
            'tier':row['tier'],'status':row['status'],'gpa':row['gpa'],'progress':row['progress'],
            'phone':detail.get('phone'),'language':detail.get('language'),
            'competencyScore':detail.get('competencyScore'),'typeScores':detail.get('typeScores'),
            'targetRole':detail.get('targetRole'),'targetCompanySummary':detail.get('targetCompanySummary'),
            'roadmapSummary':detail.get('roadmapSummary'),'programCount':row['program_count'],
            'counselCount':row['counsel_count'],'hasRoadmap':row['has_roadmap'],
            'hasDetail':row['detail'] is not None,'collegeName':row.get('college_name')}


@router.get('/students')
def students(request:Request,page:int=Query(1,ge=1),pageSize:int=Query(20,ge=1,le=100),
             q:str=Query('',max_length=200),sort:str='name',user=Depends(principal, scope='function'),conn=Depends(connection, scope='function')):
    where,values=scope(request,user)
    for field,column in {'major':'major_label','grade':'grade::text','studentType':'student_type','tier':'tier','status':'status'}.items():
        value=request.query_params.get(f'filters.{field}')
        if value:
            where.append(f'{column}=%s')
            values.append(value)
    focus=request.query_params.get('filters.focus')
    if focus in ('high','core','star'):
        where.append({'high':HIGH,'core':CORE,'star':'star'}[focus])
    if q.strip():
        where.append("concat_ws(' ',name,student_no,major_label,type_label) ILIKE %s")
        values.append('%'+q.strip().replace('%','\\%').replace('_','\\_')+'%')
    condition=' AND '.join(f'({x})' for x in where)
    order={'name':'name,student_no','-name':'name DESC,student_no','studentNo':'student_no',
           'grade':'grade,student_no','-progress':'progress DESC,student_no'}.get(sort,'name,student_no')
    count=conn.execute('SELECT count(*) AS n FROM dc.student_list v WHERE '+condition,values).fetchone()['n']
    rows=conn.execute(f'''SELECT v.* FROM dc.student_list v WHERE {condition}
      ORDER BY {order} LIMIT %s OFFSET %s''',values+[pageSize,(page-1)*pageSize]).fetchall()
    return dict(items=[roster(row) for row in rows],totalCount=count,page=page,pageSize=pageSize)


@router.get('/students/metadata')
def metadata(request:Request,user=Depends(principal, scope='function'),conn=Depends(connection, scope='function')):
    where,values=scope(request,user)
    condition=' AND '.join(f'({x})' for x in where)
    row=conn.execute(f'''SELECT count(*) AS total,count(*) FILTER(WHERE tier='하위') AS "focusCount",
      count(*) FILTER(WHERE {HIGH}) AS "highRiskCount",count(*) FILTER(WHERE {CORE}) AS "coreCareCount",
      count(*) FILTER(WHERE star) AS "starCount",
      array_agg(DISTINCT major_label ORDER BY major_label) AS majors,
      array_agg(DISTINCT grade ORDER BY grade) AS grades,
      array_agg(DISTINCT student_type) FILTER(WHERE student_type IS NOT NULL) AS types,
      array_agg(DISTINCT tier) FILTER(WHERE tier IS NOT NULL) AS tiers,
      array_agg(DISTINCT status) AS statuses FROM dc.student_list v WHERE {condition}''',values).fetchone()
    return {'summary':{k:row[k] for k in ('total','focusCount','highRiskCount','coreCareCount','starCount')},
            'options':{k:row[k] or [] for k in ('majors','grades','types','tiers','statuses')}}


@router.get('/students/summary')
def summary(request:Request,groupBy:str,user=Depends(principal,scope='function'),conn=Depends(connection,scope='function')):
    columns={'type':('student_type','type_label'),'grade':('grade::text','grade::text'),
             'college':('college_code','college_name')}
    if groupBy not in columns:
        raise HTTPException(400,detail={'code':'INVALID_GROUP_BY','message':'지원하지 않는 집계 기준입니다.'})
    where,values=scope(request,user)
    condition=' AND '.join(f'({x})' for x in where)
    key,label=columns[groupBy]
    missing='미정' if groupBy=='type' else '기타'
    rows=conn.execute(f'''SELECT {key} AS key,COALESCE({label},%s) AS label,count(*) AS count,
      COALESCE(round(avg(progress),1),0) AS "avgProgress" FROM dc.student_list v WHERE {condition}
      GROUP BY {key},{label} ORDER BY {key} NULLS LAST''',[missing]+values).fetchall()
    if groupBy=='type':
        found={x['key']:dict(x) for x in rows}
        codes=conn.execute('SELECT code,label FROM dc.student_type_code ORDER BY code').fetchall()
        rows=[found.get(x['code'],{'key':x['code'],'label':x['label'],'count':0,'avgProgress':0}) for x in codes]+([found[None]] if None in found else [])
    risk=conn.execute(f'''SELECT count(*) FILTER(WHERE grade<>1) AS base,
      count(*) FILTER(WHERE {HIGH}) AS high,count(*) FILTER(WHERE {CORE}) AS core,
      count(*) FILTER(WHERE star) AS star,count(*) AS total FROM dc.student_list v WHERE {condition}''',values).fetchone()
    return {'total':risk['total'],'groups':[dict(x) for x in rows],
            'risk':{k:risk[k] for k in ('base','high','core','star')}}


@router.get('/students/{identity}')
def student(identity:str,user=Depends(principal, scope='function'),conn=Depends(connection, scope='function')):
    row=student_access(conn,user,identity)
    data={**(row['detail'] or {}),'id':row['alias'],'studentNo':row['student_no'],
          'name':row['name'],'major':row['major_label'],'grade':row['grade']}
    current=conn.execute('SELECT student_type FROM dc.student_type_event WHERE student_uid=%s ORDER BY decided_at DESC,id DESC LIMIT 1',(row['intg_uid'],)).fetchone()
    data['studentType']=current['student_type'] if current else None
    data['enrollmentStatus']=data.get('enrollmentStatus') or '재학'
    # Counselor notes and intake are retrieved through their separately scoped endpoints.
    data.pop('counselRequests',None)
    return data
