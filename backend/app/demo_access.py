"""Optional company-demo gate, independent of student/staff authentication.

Nginx auth_request protects both static pages and API routes using this cookie.
No database, browser Basic authentication, or app identity is involved.
"""
import hashlib
import hmac
import secrets
import time
from pathlib import Path
from urllib.parse import parse_qs

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse

from .settings import settings

router = APIRouter(prefix='/__demo', include_in_schema=False)
COOKIE = '__Host-dc_demo'
TTL = 8 * 60 * 60
HEADERS = {'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY',
           'X-Content-Type-Options': 'nosniff',
           'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}


def credentials() -> tuple[bytes, bytes]:
    if not settings.demo_password_file or not settings.demo_session_key_file:
        raise HTTPException(404)
    password = Path(settings.demo_password_file).read_bytes().strip()
    key = Path(settings.demo_session_key_file).read_bytes().strip()
    if not password or len(key) < 32:
        raise HTTPException(503, '시연 접근 설정을 확인해 주세요.')
    return password, key


def session_token(key: bytes) -> str:
    payload = f'v1.{int(time.time()) + TTL}.{secrets.token_hex(16)}'
    signature = hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()
    return payload + '.' + signature


def valid_session(value: str, key: bytes) -> bool:
    if len(value) > 160:
        return False
    try:
        version, expiry, nonce, signature = value.split('.')
        now = int(time.time())
        if version != 'v1' or len(nonce) != 32 or not now < int(expiry) <= now + TTL:
            return False
        expected = hmac.new(key, f'{version}.{expiry}.{nonce}'.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature.encode(), expected.encode())
    except (ValueError, UnicodeError):
        return False


def login_page(error: bool = False) -> HTMLResponse:
    message = '<p role="alert">아이디 또는 비밀번호를 확인해 주세요.</p>' if error else ''
    return HTMLResponse('''<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>시연 접속 · DREAMCATCH</title>
<style>body{margin:0;background:#f4f6f8;color:#172b4d;font:16px/1.6 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}
main{box-sizing:border-box;width:min(420px,calc(100% - 40px));padding:32px;background:white;border:1px solid #dde3eb;border-radius:16px}
h1{font-size:24px;margin:0 0 8px}p{color:#526176;margin:0 0 24px}label{display:block;margin:16px 0 6px}
input,button{box-sizing:border-box;width:100%;font:inherit;padding:12px;border-radius:8px;border:1px solid #8996a8}
button{margin-top:24px;background:#173b70;color:white;cursor:pointer;border:0}input:focus-visible,button:focus-visible{outline:3px solid #4385e0;outline-offset:3px}
[role=alert]{color:#a42121;margin:16px 0 0}small{display:block;color:#526176;margin-top:20px}</style></head>
<body><main><h1>DREAMCATCH 시연 접속</h1><p>전달받은 접속 정보로 로그인해 주세요.</p>
<form method="post" action="/__demo/session"><label for="username">아이디</label>
<input id="username" name="username" value="demo" autocomplete="username" required maxlength="80">
<label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256">
''' + message + '''<button type="submit">시연 시작</button></form>
<small>이 브라우저에서 8시간 동안 접속이 유지됩니다.<br>학생·교직원 로그인은 서비스 안에서 별도로 진행합니다.</small>
</main></body></html>''', status_code=200, headers=HEADERS)


@router.get('/login')
def login(request: Request):
    _, key = credentials()
    if valid_session(request.cookies.get(COOKIE, ''), key):
        return RedirectResponse('/', status_code=303, headers=HEADERS)
    return login_page()


@router.post('/session')
async def create_session(request: Request):
    password, key = credentials()
    # Only same-origin HTML forms may establish a browser session.
    if request.headers.get('origin') != str(request.base_url).rstrip('/'):
        raise HTTPException(403, '같은 사이트에서 로그인해 주세요.')
    if request.headers.get('content-type', '').split(';')[0] != 'application/x-www-form-urlencoded':
        raise HTTPException(415)
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 4096:
            raise HTTPException(413)
    try:
        form = parse_qs(body.decode('utf-8'), max_num_fields=4)
        username = form.get('username', [''])[0].encode()
        supplied = form.get('password', [''])[0].encode()
    except (ValueError, UnicodeError):
        raise HTTPException(400) from None
    password_ok = secrets.compare_digest(supplied, password)
    if not secrets.compare_digest(username, b'demo') or not password_ok:
        return login_page(error=True)
    response = RedirectResponse('/', status_code=303, headers=HEADERS)
    response.set_cookie(COOKIE, session_token(key), max_age=TTL, secure=True,
                        httponly=True, samesite='lax', path='/')
    return response


@router.get('/check')
def check(request: Request):
    _, key = credentials()
    return Response(status_code=204 if valid_session(request.cookies.get(COOKIE, ''), key) else 401,
                    headers={'Cache-Control': 'no-store'})
