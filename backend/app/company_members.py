"""Company registration, audited administrator approval and isolated cookie sessions."""
import hashlib
import re
import secrets
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

from .administration import administrator, audit
from .db import connection, pool
from .settings import settings

router = APIRouter()
COOKIE = 'dc_company_session'
PUBLIC_COLUMNS = 'id,business_no,company_name,contact_name,contact_email,contact_phone,status,company_id,review_note,reviewed_at,created_at,version'


def password_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=32768, r=8, p=1, maxmem=64*1024*1024)
    return 'scrypt-v1:' + salt.hex() + ':' + digest.hex()


def password_matches(password, stored):
    salt = bytes.fromhex(stored.split(':')[1]) if stored else b'\0'*16
    actual = password_hash(password, salt)
    return secrets.compare_digest(actual, stored or '')


def public(row):
    return {key: row[key] for key in PUBLIC_COLUMNS.split(',')}


def same_site(request: Request):
    if request.headers.get('sec-fetch-site') == 'cross-site':
        raise HTTPException(403, '같은 사이트에서 요청해 주세요.')


def throttle(request: Request):
    same_site(request)
    # A separate short transaction preserves failed attempts even when login rolls back.
    # Do not trust client-supplied forwarded IP headers.
    host = request.client.host if request.client else 'unknown'
    bucket = hashlib.sha256((request.url.path + ':' + host).encode()).hexdigest()
    with pool.connection() as conn:
        row = conn.execute('''INSERT INTO dc.company_auth_rate(bucket,attempts,reset_at)
          VALUES(%s,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET
          attempts=CASE WHEN dc.company_auth_rate.reset_at<=now() THEN 1 ELSE dc.company_auth_rate.attempts+1 END,
          reset_at=CASE WHEN dc.company_auth_rate.reset_at<=now() THEN now()+interval '15 minutes' ELSE dc.company_auth_rate.reset_at END
          RETURNING attempts''', (bucket,)).fetchone()
        conn.execute("DELETE FROM dc.company_auth_rate WHERE reset_at<now()-interval '1 day'")
    if row['attempts'] > 30:
        raise HTTPException(429, '요청이 너무 많습니다. 15분 후 다시 시도해 주세요.')


class Credentials(BaseModel):
    model_config = ConfigDict(extra='forbid')
    businessNo: str = Field(max_length=20)
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator('businessNo')
    @classmethod
    def business_number(cls, value):
        value = value.strip().replace('-', '')
        if not re.fullmatch(r'[0-9]{10}', value):
            raise ValueError('사업자등록번호 10자리를 입력해 주세요.')
        return value


class Registration(Credentials):
    password: SecretStr = Field(min_length=10, max_length=128)
    companyName: str = Field(min_length=1, max_length=200)
    contactName: str = Field(min_length=1, max_length=100)
    contactEmail: str = Field(min_length=3, max_length=200)
    contactPhone: str = Field(min_length=7, max_length=30)

    @field_validator('companyName', 'contactName', 'contactEmail', 'contactPhone')
    @classmethod
    def trim(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('필수 정보를 입력해 주세요.')
        return value

    @field_validator('contactEmail')
    @classmethod
    def email(cls, value):
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('이메일 주소를 확인해 주세요.')
        return value

    @field_validator('contactPhone')
    @classmethod
    def phone(cls, value):
        if not re.fullmatch(r'[0-9+() -]{7,30}', value):
            raise ValueError('연락처를 확인해 주세요.')
        return value


@router.post('/auth/company/register', status_code=201, dependencies=[Depends(throttle)])
def register(body: Registration, response: Response, conn=Depends(connection, scope='function')):
    row = conn.execute('''INSERT INTO dc.company_member(business_no,password_hash,company_name,contact_name,contact_email,contact_phone)
      VALUES(%s,%s,%s,%s,%s,%s) ON CONFLICT(business_no) DO NOTHING RETURNING id''',
      (body.businessNo,password_hash(body.password.get_secret_value()),body.companyName,body.contactName,body.contactEmail,body.contactPhone)).fetchone()
    if not row:
        raise HTTPException(409, '이미 가입 신청된 사업자등록번호입니다. 로그인하거나 관리자에게 문의해 주세요.')
    response.headers['Cache-Control'] = 'no-store'
    return {'status':'PENDING','message':'가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.'}


@router.post('/auth/company/login', dependencies=[Depends(throttle)])
def login(body: Credentials, request: Request, response: Response, conn=Depends(connection, scope='function')):
    member = conn.execute('SELECT * FROM dc.company_member WHERE business_no=%s FOR UPDATE', (body.businessNo,)).fetchone()
    if not password_matches(body.password.get_secret_value(), member['password_hash'] if member else None):
        raise HTTPException(401, '사업자등록번호 또는 비밀번호가 올바르지 않습니다.')
    if member['status'] == 'PENDING':
        raise HTTPException(403, '가입 승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다.')
    if member['status'] != 'APPROVED':
        raise HTTPException(403, '가입 신청이 반려되었습니다. 관리자에게 문의해 주세요.')
    previous = request.cookies.get(COOKIE, '')
    conn.execute('DELETE FROM dc.company_login_session WHERE expires_at<=now() OR token_hash=%s', (hashlib.sha256(previous.encode()).hexdigest(),))
    token = secrets.token_urlsafe(32)
    conn.execute('INSERT INTO dc.company_login_session(token_hash,member_id) VALUES(%s,%s)',
                 (hashlib.sha256(token.encode()).hexdigest(),member['id']))
    response.set_cookie(COOKIE,token,max_age=28800,httponly=True,samesite='strict',path='/api/v1',
                        secure=settings.environment != 'development' or request.url.scheme == 'https')
    response.headers['Cache-Control'] = 'no-store'
    return public(member)


def company_principal(request: Request, conn=Depends(connection, scope='function')):
    token = request.cookies.get(COOKIE, '')
    member = conn.execute('''SELECT m.* FROM dc.company_login_session s JOIN dc.company_member m ON m.id=s.member_id
      WHERE s.token_hash=%s AND s.expires_at>now() AND m.status='APPROVED' ''',
      (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
    if not member:
        raise HTTPException(401, '기업회원 로그인이 필요합니다.')
    return member


@router.get('/auth/company/me')
def me(response: Response, member=Depends(company_principal, scope='function')):
    response.headers['Cache-Control'] = 'no-store'
    return public(member)


@router.post('/auth/company/logout', status_code=204, dependencies=[Depends(same_site)])
def logout(request: Request, response: Response, conn=Depends(connection, scope='function')):
    token = request.cookies.get(COOKIE, '')
    conn.execute('DELETE FROM dc.company_login_session WHERE token_hash=%s', (hashlib.sha256(token.encode()).hexdigest(),))
    response.delete_cookie(COOKIE,path='/api/v1')


@router.get('/system/company-members')
def members(status: Literal['ALL','PENDING','APPROVED','REJECTED'] = 'PENDING', q: str = Query('',max_length=100),
            page: int = Query(1,ge=1), pageSize: int = Query(20,ge=1,le=100),
            user=Depends(administrator,scope='function'), conn=Depends(connection,scope='function')):
    pattern = '%' + q.strip().replace('\\','\\\\').replace('%','\\%').replace('_','\\_') + '%'
    result = conn.execute(f'''WITH filtered AS MATERIALIZED (
      SELECT {PUBLIC_COLUMNS} FROM dc.company_member WHERE (%s='ALL' OR status=%s)
      AND concat_ws(' ',company_name,business_no,contact_name) ILIKE %s
    ), paged AS (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT %s OFFSET %s)
    SELECT (SELECT count(*) FROM filtered) total,COALESCE((SELECT jsonb_agg(to_jsonb(paged)) FROM paged),'[]') items''',
    (status,status,pattern,pageSize,(page-1)*pageSize)).fetchone()
    return dict(items=result['items'],totalCount=result['total'])


class Review(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expectedVersion: int = Field(ge=1)
    decision: Literal['APPROVED','REJECTED']
    note: str = Field(default='',max_length=1000)


@router.post('/system/company-members/{member_id}/review')
def review(member_id: UUID, body: Review, user=Depends(administrator,scope='function'), conn=Depends(connection,scope='function')):
    before = conn.execute(f'SELECT {PUBLIC_COLUMNS} FROM dc.company_member WHERE id=%s FOR UPDATE', (member_id,)).fetchone()
    if not before:
        raise HTTPException(404, '가입 신청을 찾을 수 없습니다.')
    if before['version'] != body.expectedVersion or before['status'] != 'PENDING':
        raise HTTPException(409, '이미 처리된 신청입니다. 새로 조회해 주세요.')
    if body.decision == 'REJECTED' and not body.note:
        raise HTTPException(422, '반려 사유를 입력해 주세요.')
    company_id = None
    if body.decision == 'APPROVED':
        company_id = 'cmp_' + uuid4().hex
        conn.execute('''INSERT INTO dc.company(id,display_name,created_by,updated_by) VALUES(%s,%s,%s,%s)''',
                     (company_id,before['company_name'],user['intg_uid'],user['intg_uid']))
    after = conn.execute(f'''UPDATE dc.company_member SET status=%s,company_id=%s,review_note=%s,reviewed_by=%s,
      reviewed_at=now(),version=version+1 WHERE id=%s RETURNING {PUBLIC_COLUMNS}''',
      (body.decision,company_id,body.note,user['intg_uid'],member_id)).fetchone()
    audit(conn,user,'company_member',member_id,before,after,body.note or '기업회원 가입 승인')
    return after
