import secrets
from pathlib import Path

from fastapi import Depends, Header, HTTPException

from .db import connection
from .settings import settings


def validate_development_token(x_dc_token: str):
    token = Path(settings.development_token_file).read_text().strip() if settings.development_token_file else ''
    if not settings.development_identity or not token or not secrets.compare_digest(token, x_dc_token):
        raise HTTPException(401, '인증이 필요합니다.')


def principal(x_dc_identity: str = Header(default=''), x_dc_token: str = Header(default=''), conn=Depends(connection, scope='function')):
    validate_development_token(x_dc_token)
    user = conn.execute('SELECT * FROM dc.person WHERE alias=%s OR intg_uid=%s', (x_dc_identity,x_dc_identity)).fetchone()
    if not user:
        raise HTTPException(401, '사용자를 확인할 수 없습니다.')
    return user


def student_access(conn, user, identity: str):
    student = conn.execute('SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE p.alias=%s OR s.intg_uid=%s', (identity,identity)).fetchone()
    if not student:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    if user['kind']=='STUDENT' and user['intg_uid']!=student['intg_uid']:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    if user['kind']=='STAFF':
        # Development fixtures only. Explicit grants, never department-name matching.
        allowed = conn.execute('''SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s
          UNION ALL SELECT 1 FROM dc.counsel_request WHERE counselor_uid=%s AND student_uid=%s LIMIT 1''',
          (user['intg_uid'],student['intg_uid'],user['intg_uid'],student['intg_uid'])).fetchone()
        if not allowed:
            raise HTTPException(404, '학생을 찾을 수 없습니다.')
    return student


def require_staff(user):
    if user['kind'] != 'STAFF':
        raise HTTPException(403, '교직원 권한이 필요합니다.')
