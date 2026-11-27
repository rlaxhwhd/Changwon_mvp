import secrets
from pathlib import Path

from fastapi import Depends, Header, HTTPException, Request
import hashlib

from .db import connection, pool
from .settings import settings


def validate_development_token(x_dc_token: str):
    token = Path(settings.development_token_file).read_text().strip() if settings.development_token_file else ''
    if not settings.development_identity or not token or not secrets.compare_digest(token, x_dc_token):
        raise HTTPException(401, '인증이 필요합니다.')


def principal(request: Request, x_dc_identity: str = Header(default=''), x_dc_token: str = Header(default=''),
              x_dc_portal: str = Header(default=''), conn=Depends(connection, scope='function')):
    validate_development_token(x_dc_token)
    token = request.cookies.get('dc_student_session')
    if token and x_dc_portal != 'admin':
        user = conn.execute('''SELECT p.* FROM dc.student_login_session s
          JOIN dc.person p ON p.intg_uid=s.student_uid
          WHERE s.token_hash=%s AND s.expires_at>now() AND p.kind='STUDENT' ''',
          (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
        if not user:
            raise HTTPException(401, '학생 로그인이 만료되었습니다.')
        return user
    if x_dc_portal == 'student':
        raise HTTPException(401, '학생 로그인이 필요합니다.')
    user = conn.execute('SELECT * FROM dc.person WHERE alias=%s OR intg_uid=%s', (x_dc_identity,x_dc_identity)).fetchone()
    if not user:
        raise HTTPException(401, '사용자를 확인할 수 없습니다.')
    if user['kind'] == 'STUDENT' and user['source'] != 'fixture':
        raise HTTPException(401, '학번과 비밀번호로 로그인하세요.')
    return user


def pooled_principal(request: Request, x_dc_identity: str = Header(default=''), x_dc_token: str = Header(default=''),
                     x_dc_portal: str = Header(default='')):
    """principal 과 같은 판정을 짧게 빌린 커넥션으로 한다.

    Deep HTTP 는 저장 20초·AI 60초·평가 150초까지 걸린다. 요청 단위 커넥션(principal 의 connection
    의존성)을 쥔 채 기다리면 풀(max_size=5)이 바닥나 Deep 장애가 사이트 전체 장애가 된다.
    Deep 을 부르는 엔드포인트는 이 의존성을 쓰고, DB 작업은 pool.connection() 블록 안에서만 한다
    (counsel_ai·ai_comments 와 같은 방식). 블록은 정상 종료 시 커밋, 예외 시 롤백한다.
    학사 사진 프록시(0025)도 같은 이유로 이 의존성을 쓴다(jobs.deep_principal 에서 옮김).
    """
    with pool.connection() as conn:
        return principal(request, x_dc_identity, x_dc_token, x_dc_portal, conn=conn)

def is_counselor(user):
    return user['kind'] == 'STAFF' and (user.get('profile') or {}).get('role') in ('career', 'psych')


def staff_may_read(conn, user, student_uid: str) -> bool:
    """Non-counselor staff read rule: explicit scope grant or own counsel request.
    Shared by student_access and the academic roster detail (0022) — one SQL, not copies."""
    # Explicit grants, never department-name matching.
    return conn.execute('''SELECT 1 FROM dc.staff_student_scope WHERE staff_uid=%s AND student_uid=%s
      UNION ALL SELECT 1 FROM dc.counsel_request WHERE counselor_uid=%s AND student_uid=%s LIMIT 1''',
      (user['intg_uid'],student_uid,user['intg_uid'],student_uid)).fetchone() is not None


def student_access(conn, user, identity: str):
    student = conn.execute('SELECT s.*,p.alias,p.name FROM dc.student s JOIN dc.person p USING(intg_uid) WHERE p.alias=%s OR s.intg_uid=%s', (identity,identity)).fetchone()
    if not student:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    if user['kind']=='STUDENT' and user['intg_uid']!=student['intg_uid']:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    if user['kind']=='STAFF' and not is_counselor(user) and not staff_may_read(conn, user, student['intg_uid']):
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    return student


def require_staff(user):
    if user['kind'] != 'STAFF':
        raise HTTPException(403, '교직원 권한이 필요합니다.')
