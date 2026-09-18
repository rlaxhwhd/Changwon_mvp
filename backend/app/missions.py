"""Admin-authored learning missions. Scoring is independent of XP/rewards."""
from datetime import date, datetime, timedelta
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo
import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, model_validator
from .administration import administrator, audit
from .auth import principal
from .db import connection

router = APIRouter()
Kind = Literal['TOEIC', 'NCS', 'GSAT']
WeekKind = Literal['TOEIC', 'NCS_GSAT']

# Canonical vocabulary is relational; old JSON word is retained for rollback compatibility.
QUESTION_FROM = 'dc.mission_question q LEFT JOIN dc.toeic_vocabulary v ON v.question_id=q.id'
QUESTION_COLUMNS = """q.*,v.difficulty_code,
 CASE WHEN v.question_id IS NOT NULL THEN q.content || jsonb_build_object('word',v.english_word)
 ELSE q.content END AS content,
 (SELECT count(*) FROM dc.mission_question_publication p WHERE p.question_id=q.id) AS publication_count"""

def monday():
    today = datetime.now(ZoneInfo('Asia/Seoul')).date()
    return today - timedelta(days=today.weekday())

def student(user=Depends(principal, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 본인만 문제를 풀 수 있습니다.')
    return user

def normalized(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', value).strip()).casefold()

class Question(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=0)
    kind: Kind
    prompt: str = Field(min_length=1, max_length=10000)
    category: str = Field(default='', max_length=100)
    word: str = Field(default='', max_length=150)
    aliases: list[str] = Field(default_factory=list, max_length=20)
    example: str = Field(default='', max_length=2000)
    choices: list[str] = Field(default_factory=list, max_length=5)
    answer: int = Field(default=0, ge=0, le=4)
    explanation: str = Field(default='', max_length=5000)
    isActive: bool = True
    difficulty: str = Field(default='MEDIUM', min_length=1, max_length=40)

    @model_validator(mode='after')
    def valid(self):
        self.aliases = [x.strip() for x in self.aliases]
        self.choices = [x.strip() for x in self.choices]
        if self.kind == 'TOEIC':
            if not self.word or self.choices or any(not x or len(x)>150 for x in self.aliases):
                raise ValueError('영단어와 올바른 허용 정답을 입력하세요. 영단어에는 보기를 사용하지 않습니다.')
        elif not 2 <= len(self.choices) <= 5 or any(not x or len(x)>2000 for x in self.choices) or len(set(self.choices)) != len(self.choices) or self.answer >= len(self.choices):
            raise ValueError('서로 다른 보기 2~5개와 정답을 입력하세요.')
        return self

@router.get('/system/missions/questions')
def questions(kind: Kind, q: str = Query('', max_length=100), page: int = Query(1, ge=1),
              activeOnly: bool = False, difficulty: str = Query('', max_length=40),
              sort: Literal['newest','word','least-used'] = 'newest',
              user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    pattern = '%' + q.replace('\\','\\\\').replace('%','\\%').replace('_','\\_') + '%'
    where = "q.kind=%s AND (q.prompt ILIKE %s OR v.english_word ILIKE %s OR q.category ILIKE %s) AND (NOT %s OR q.is_active) AND (%s='' OR v.difficulty_code=%s)"
    args = (kind, pattern, pattern, pattern, activeOnly, difficulty, difficulty)
    total = conn.execute('SELECT count(*) n FROM '+QUESTION_FROM+' WHERE '+where,args).fetchone()['n']
    order = {'newest':'q.id DESC','word':'lower(v.english_word),q.id','least-used':'publication_count,q.id'}[sort]
    rows = conn.execute('SELECT '+QUESTION_COLUMNS+' FROM '+QUESTION_FROM+' WHERE '+where+' ORDER BY '+order+' LIMIT 30 OFFSET %s',(*args,(page-1)*30)).fetchall()
    return {'items':rows, 'totalCount':total}

@router.get('/system/missions/questions/random')
def random_questions(kind: Kind, count: int = Query(10, ge=10, le=20),
                     q: str = Query('', max_length=100), difficulty: str = Query('', max_length=40),
                     excludeIds: list[int] = Query(default=[], max_length=20),
                     user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    if count not in (10,20):
        raise HTTPException(422,'선택 개수는 10개 또는 20개여야 합니다.')
    if len(set(excludeIds)) != len(excludeIds) or len(excludeIds)>count:
        raise HTTPException(422,'기존 선택 개수를 확인하세요.')
    remaining = count-len(excludeIds)
    if not remaining:
        return {'items':[]}
    pattern = '%' + q.replace('\\','\\\\').replace('%','\\%').replace('_','\\_') + '%'
    # Sample IDs first: return only 10/20 complete rows, never the entire pool to the browser.
    rows = conn.execute('''WITH picked AS (
      SELECT q.id,random() AS draw FROM '''+QUESTION_FROM+'''
      WHERE q.kind=%s AND q.is_active AND (%s='' OR v.difficulty_code=%s) AND NOT(q.id=ANY(%s::bigint[]))
        AND (q.prompt ILIKE %s OR v.english_word ILIKE %s OR q.category ILIKE %s)
      ORDER BY draw LIMIT %s)
      SELECT '''+QUESTION_COLUMNS+' FROM '+QUESTION_FROM+''' JOIN picked ON picked.id=q.id ORDER BY picked.draw''',
      (kind,difficulty,difficulty,excludeIds,pattern,pattern,pattern,remaining)).fetchall()
    if len(rows)<remaining:
        raise HTTPException(422,f'기존 선택을 제외한 후보가 {len(rows)}개입니다. 추가로 {remaining}개가 필요하므로 검색 조건을 넓히거나 문제를 추가하세요.')
    return {'items':rows}

@router.put('/system/missions/questions/{question_id}')
def save_question(question_id: int, data: Question, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    before = conn.execute('SELECT '+QUESTION_COLUMNS+' FROM '+QUESTION_FROM+' WHERE q.id=%s FOR UPDATE OF q',(question_id,)).fetchone()
    if (question_id != 0 and not before) or data.expectedVersion != (before['version'] if before else 0):
        raise HTTPException(409, '문제가 변경되었습니다. 목록을 새로 조회하세요.')
    if before and before['kind'] != data.kind:
        raise HTTPException(422, '기존 문제의 유형은 바꿀 수 없습니다.')
    if data.kind == 'TOEIC' and not conn.execute("SELECT 1 FROM dc.code_item WHERE group_code='TOEIC_DIFFICULTY' AND code=%s AND is_active",(data.difficulty,)).fetchone():
        raise HTTPException(422,'사용 가능한 단어 난이도를 선택하세요.')
    content = data.model_dump(include={'word','aliases','example','choices','answer','explanation'})
    args = (data.kind,data.prompt,data.category,Jsonb(content),data.isActive,user['intg_uid'])
    if before:
        row = conn.execute('UPDATE dc.mission_question SET kind=%s,prompt=%s,category=%s,content=%s,is_active=%s,updated_by=%s,version=version+1,updated_at=now() WHERE id=%s RETURNING *',(*args,question_id)).fetchone()
    else:
        row = conn.execute('INSERT INTO dc.mission_question(kind,prompt,category,content,is_active,updated_by) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *',args).fetchone()
    if data.kind == 'TOEIC':
        conn.execute('''INSERT INTO dc.toeic_vocabulary(question_id,english_word,difficulty_code) VALUES(%s,%s,%s)
          ON CONFLICT(question_id) DO UPDATE SET english_word=EXCLUDED.english_word,difficulty_code=EXCLUDED.difficulty_code''',(row['id'],data.word,data.difficulty))
    row = conn.execute('SELECT '+QUESTION_COLUMNS+' FROM '+QUESTION_FROM+' WHERE q.id=%s',(row['id'],)).fetchone()
    audit(conn,user,'mission_question',row['id'],before,row,'문제 풀 저장')
    return row

class Weekly(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=0)
    title: str = Field(min_length=1, max_length=200)
    questionIds: list[int] = Field(max_length=100)
    published: bool = False
    selectionLimit: Literal[10,20] = 20
    @model_validator(mode='after')
    def valid(self):
        if len(self.questionIds)>self.selectionLimit:
            raise ValueError(f'선택한 문제는 최대 {self.selectionLimit}개까지 저장할 수 있습니다.')
        if len(set(self.questionIds)) != len(self.questionIds) or (self.published and not self.questionIds):
            raise ValueError('게시할 문제를 중복 없이 선택하세요.')
        return self

def valid_week(value):
    if value.weekday() != 0:
        raise HTTPException(422,'주 시작일은 월요일이어야 합니다.')

@router.get('/system/missions/weeks/{week_start}/{kind}')
def week(week_start: date, kind: WeekKind, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    valid_week(week_start)
    return conn.execute('SELECT * FROM dc.mission_week WHERE week_start=%s AND kind=%s',(week_start,kind)).fetchone()

@router.put('/system/missions/weeks/{week_start}/{kind}')
def save_week(week_start: date, kind: WeekKind, data: Weekly, user=Depends(administrator, scope='function'), conn=Depends(connection, scope='function')):
    valid_week(week_start)
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',(f'mission-week:{week_start}:{kind}',))
    before = conn.execute('SELECT * FROM dc.mission_week WHERE week_start=%s AND kind=%s FOR UPDATE',(week_start,kind)).fetchone()
    if data.expectedVersion != (before['version'] if before else 0):
        raise HTTPException(409,'주간 출제가 변경되었습니다. 다시 조회하세요.')
    rows = conn.execute('SELECT '+QUESTION_COLUMNS+' FROM '+QUESTION_FROM+' WHERE q.id=ANY(%s) AND q.is_active FOR SHARE OF q',(data.questionIds,)).fetchall()
    lookup = {row['id']:row for row in rows}
    if len(rows) != len(data.questionIds) or any((row['kind']=='TOEIC') != (kind=='TOEIC') for row in rows):
        raise HTTPException(422,'선택한 문제의 유형 또는 사용 상태를 확인하세요.')
    snapshot = [{key:lookup[id][key] for key in ('id','kind','prompt','category','content','version')} for id in data.questionIds]
    row = conn.execute('''INSERT INTO dc.mission_week(week_start,kind,title,items,published,updated_by,selection_limit) VALUES(%s,%s,%s,%s,%s,%s,%s)
      ON CONFLICT(week_start,kind) DO UPDATE SET title=EXCLUDED.title,items=EXCLUDED.items,published=EXCLUDED.published,updated_by=EXCLUDED.updated_by,selection_limit=EXCLUDED.selection_limit,version=dc.mission_week.version+1,updated_at=now() RETURNING *''',
      (week_start,kind,data.title,Jsonb(snapshot),data.published,user['intg_uid'],data.selectionLimit)).fetchone()
    audit(conn,user,'mission_week',row['id'],before,row,'주간 미션 게시' if data.published else '주간 미션 비공개 저장')
    if data.published:
        conn.execute('''INSERT INTO dc.mission_question_publication(question_id,week_id)
          SELECT unnest(%s::bigint[]),%s ON CONFLICT DO NOTHING''',(data.questionIds,row['id']))
    return row

def public_item(item, study=False):
    result = {key:item[key] for key in ('id','kind','prompt','category')}
    result['choices'] = item['content']['choices'] if item['kind'] != 'TOEIC' else []
    if study and item['kind']=='TOEIC':
        result.update({key:item['content'][key] for key in ('word','example','explanation')})
    return result

@router.get('/missions/current')
def current(user=Depends(student, scope='function'),conn=Depends(connection, scope='function')):
    start = monday()
    rows = conn.execute('SELECT * FROM dc.mission_week WHERE week_start=%s AND published ORDER BY kind',(start,)).fetchall()
    return {'weekStart':start,'weekEnd':start+timedelta(days=6),'items':[{'id':r['id'],'kind':r['kind'],'title':r['title'],'version':r['version'],'questions':[public_item(i,True) for i in r['items']]} for r in rows]}

class Start(BaseModel):
    model_config = ConfigDict(extra='forbid')
    weekId: int
    version: int

@router.post('/missions/attempts')
def start_attempt(data: Start,user=Depends(student, scope='function'),conn=Depends(connection, scope='function')):
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',('mission-student:'+user['intg_uid'],))
    row = conn.execute('SELECT * FROM dc.mission_week WHERE id=%s AND week_start=%s AND published FOR SHARE',(data.weekId,monday())).fetchone()
    if not row or row['version']!=data.version:
        raise HTTPException(409,'게시 내용이 변경되었거나 학습 기간이 끝났습니다. 새로 조회하세요.')
    attempt = conn.execute('SELECT * FROM dc.mission_attempt WHERE student_uid=%s AND week_id=%s AND week_version=%s AND submitted_at IS NULL',(user['intg_uid'],row['id'],row['version'])).fetchone()
    if not attempt:
        attempt = conn.execute('INSERT INTO dc.mission_attempt(student_uid,week_id,week_version,title,kind,items) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *',(user['intg_uid'],row['id'],row['version'],row['title'],row['kind'],Jsonb(row['items']))).fetchone()
    return {'id':attempt['id'],'title':attempt['title'],'questions':[public_item(i) for i in attempt['items']]}

class Submission(BaseModel):
    model_config = ConfigDict(extra='forbid')
    answers: dict[str, StrictStr | StrictInt] = Field(max_length=100)

@router.post('/missions/attempts/{attempt_id}/submit')
def submit(attempt_id: UUID,data: Submission,user=Depends(student, scope='function'),conn=Depends(connection, scope='function')):
    row = conn.execute('SELECT * FROM dc.mission_attempt WHERE id=%s AND student_uid=%s FOR UPDATE',(attempt_id,user['intg_uid'])).fetchone()
    if not row:
        raise HTTPException(404,'풀이 기록을 찾을 수 없습니다.')
    if row['submitted_at']:
        if row['answers'] != data.answers:
            raise HTTPException(409,'이미 제출한 답안은 변경할 수 없습니다.')
        return row['result']
    if set(data.answers) != {str(i['id']) for i in row['items']}:
        raise HTTPException(422,'모든 문제에 답해주세요.')
    reviews=[]
    for item in row['items']:
        answer=data.answers[str(item['id'])]; content=item['content']
        if item['kind']=='TOEIC':
            if not isinstance(answer,str) or not answer.strip() or len(answer)>150:
                raise HTTPException(422,'영단어 답안을 150자 이내로 입력하세요.')
            correct=normalized(answer) in {normalized(x) for x in [content['word'],*content['aliases']]}
            expected=content['word']; actual=answer
        else:
            if type(answer) is not int or not 0<=answer<len(content['choices']):
                raise HTTPException(422,'올바른 보기를 선택하세요.')
            correct=answer==content['answer']; expected=content['choices'][content['answer']]; actual=content['choices'][answer]
        reviews.append({**public_item(item),'correct':correct,'correctAnswer':expected,'userAnswer':actual,'explanation':content['explanation']})
    result={'id':str(row['id']),'title':row['title'],'correctCount':sum(i['correct'] for i in reviews),'totalCount':len(reviews),'reviews':reviews}
    conn.execute('UPDATE dc.mission_attempt SET answers=%s,result=%s,submitted_at=now() WHERE id=%s',(Jsonb(data.answers),Jsonb(result),attempt_id))
    return result

@router.get('/missions/history')
def history(page: int=Query(1,ge=1),user=Depends(student, scope='function'),conn=Depends(connection, scope='function')):
    args=(user['intg_uid'],)
    total=conn.execute('SELECT count(*) n FROM dc.mission_attempt WHERE student_uid=%s AND submitted_at IS NOT NULL',args).fetchone()['n']
    items=conn.execute('SELECT id,title,kind,submitted_at,result FROM dc.mission_attempt WHERE student_uid=%s AND submitted_at IS NOT NULL ORDER BY started_at DESC,id DESC LIMIT 10 OFFSET %s',(*args,(page-1)*10)).fetchall()
    return {'items':items,'totalCount':total}
