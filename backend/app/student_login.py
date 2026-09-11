"""Temporary, pre-SSO academic student login. Source Oracle is never contacted."""
import hashlib
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field, SecretStr

from .auth import principal, validate_development_token
from .db import connection
from .settings import settings

router = APIRouter()
COOKIE = 'dc_student_session'


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


class Login(BaseModel):
    studentNo: str = Field(min_length=1, max_length=40)
    password: SecretStr


def enroll_student(conn, source):
    uid = source['intg_uid']
    conn.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', ('student-login:'+uid,))
    existing = conn.execute('SELECT kind FROM dc.person WHERE intg_uid=%s', (uid,)).fetchone()
    if existing and existing['kind'] != 'STUDENT':
        raise HTTPException(409, '학생 계정 연결을 확인해야 합니다.')
    conn.execute('''INSERT INTO dc.person(intg_uid,alias,name,kind,source)
      VALUES(%s,%s,%s,'STUDENT',%s) ON CONFLICT(intg_uid) DO NOTHING''',
      (uid, uid, source['name'] or uid, 'local' if source['local_override'] else 'academic'))
    # Organization labels never determine access. Only a known code pair is linked.
    organization = conn.execute('''SELECT college_code,dept_code FROM dc.department
      WHERE college_code=%s AND dept_code=%s''', (source['college_code'], source['dept_code'])).fetchone()
    grade_text = (source['stu_schgr'] or '').strip()
    grade = int(grade_text) if grade_text.isdigit() and 1 <= int(grade_text) <= 10 else None
    conn.execute('''INSERT INTO dc.student(intg_uid,student_no,major_label,grade,college_code,dept_code)
      VALUES(%s,%s,%s,%s,%s,%s) ON CONFLICT(intg_uid) DO NOTHING''',
      (uid, source['student_no'], source['dept_name'] or '소속 미등록', grade,
       organization['college_code'] if organization else None,
       organization['dept_code'] if organization else None))
    return conn.execute('''SELECT p.alias AS id,p.name,s.student_no AS "studentNo",
      s.major_label AS major,s.grade FROM dc.student s JOIN dc.person p USING(intg_uid)
      WHERE s.intg_uid=%s''', (uid,)).fetchone()


@router.post('/auth/student/login')
def login(body: Login, request: Request, response: Response, x_dc_token: str = Header(default=''),
          conn=Depends(connection, scope='function')):
    validate_development_token(x_dc_token)
    if settings.environment != 'development':
        raise HTTPException(403, 'SSO 전 임시 학생 로그인은 개발 환경에서만 사용합니다.')
    if not secrets.compare_digest(body.password.get_secret_value().encode(), b'!'):
        raise HTTPException(401, '학번 또는 비밀번호가 올바르지 않습니다.')
    number = body.studentNo.strip()
    rows = conn.execute('''SELECT * FROM dc.student_login_source
      WHERE student_no=%s OR intg_uid=%s LIMIT 2''', (number, number)).fetchall()
    if not rows:
        rows = conn.execute('SELECT * FROM dc.fixture_student_login_source WHERE student_no=%s', (number,)).fetchall()
    if len(rows) != 1:
        raise HTTPException(401, '학번 또는 비밀번호가 올바르지 않습니다.')
    student = enroll_student(conn, rows[0])
    previous = request.cookies.get(COOKIE)
    if previous:
        conn.execute('DELETE FROM dc.student_login_session WHERE token_hash=%s', (token_hash(previous),))
    conn.execute('DELETE FROM dc.student_login_session WHERE expires_at<=now()')
    token = secrets.token_urlsafe(32)
    conn.execute('INSERT INTO dc.student_login_session(token_hash,student_uid) VALUES(%s,%s)',
                 (token_hash(token), rows[0]['intg_uid']))
    response.set_cookie(COOKIE, token, max_age=28800, httponly=True, samesite='lax',
                        secure=request.url.scheme == 'https', path='/api/v1')
    response.headers['Cache-Control'] = 'no-store'
    return student


@router.get('/auth/student/me')
def me(response: Response, user=Depends(principal, scope='function'), conn=Depends(connection, scope='function')):
    if user['kind'] != 'STUDENT':
        raise HTTPException(403, '학생 로그인이 필요합니다.')
    response.headers['Cache-Control'] = 'no-store'
    return conn.execute('''SELECT p.alias AS id,p.name,s.student_no AS "studentNo",s.major_label AS major,s.grade
      FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE s.intg_uid=%s''', (user['intg_uid'],)).fetchone()


@router.post('/auth/student/logout', status_code=204)
def logout(request: Request, response: Response, conn=Depends(connection, scope='function')):
    token = request.cookies.get(COOKIE)
    if token:
        conn.execute('DELETE FROM dc.student_login_session WHERE token_hash=%s', (token_hash(token),))
    response.delete_cookie(COOKIE, path='/api/v1')
