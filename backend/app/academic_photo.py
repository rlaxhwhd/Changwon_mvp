"""학사 증명사진 — 학사 사진 서버의 파일을 권한 검사 뒤 서버가 받아 내려준다(0025).

현행은 http 공개 URL(`…/haksa/photo/{파일명}`)을 <img src> 에 그대로 넣었다. 파일명에 학번이 들어 있어
추측할 수 있고, https 화면에서는 혼합 콘텐츠로 막힌다. 그래서 파일명은 어떤 응답에도 내지 않고
프록시 경로(photoUrl)만 낸다. 서버는 사진을 저장·캐시하지 않는다.

상류 호출은 fetch_academic_photo 한 곳뿐이다. 이 함수는 DB 커넥션 없이 불린다 — 라우트는
pooled_principal 과 pool.connection() 블록 안에서 권한·파일명만 읽고 블록을 나온 뒤 부른다.
로그·오류 본문에 파일명·URL·상류 본문을 싣지 않는다(상태 코드·예외 클래스명만).
"""
import logging
import re
import threading
import time
from urllib.parse import quote

import httpx
from fastapi import HTTPException, Response

from .settings import settings

log = logging.getLogger(__name__)

PHOTO_NAME = re.compile(r'[0-9A-Za-z_-]{1,100}\.(?:jpe?g|png)', re.I)
MAX_BYTES = 2 * 1024 * 1024
DEADLINE_SECONDS = 8
MISSING = '사진이 없습니다.'
UNAVAILABLE = '학사 사진 서버에서 사진을 받지 못했습니다.'
BUSY = '사진을 잠시 후 다시 불러와 주세요.'
# 학사 사진 서버가 느려질 때 사진 요청이 공용 스레드풀을 다 쥐지 않게 한다(비대기 획득, 초과는 503).
_slots = threading.BoundedSemaphore(8)
MAGIC = ((b'\xff\xd8\xff', 'image/jpeg'), (b'\x89PNG\r\n\x1a\n', 'image/png'))


def photo_name(value):
    """학사 뷰 photo_file 이 사진 서버 파일명 형식이면 그 값, 아니면 None. 기능이 꺼져 있어도 None.

    photoUrl 유무와 사진 엔드포인트 진입을 이 함수 하나가 함께 정한다."""
    if not settings.academic_photo_base_url or not isinstance(value, str) or not PHOTO_NAME.fullmatch(value):
        return None
    return value


def academic_photo_name(conn, uid):
    row = conn.execute('SELECT photo_file FROM dc.academic_student_details WHERE intg_uid=%s', (uid,)).fetchone()
    return photo_name(row['photo_file']) if row else None


def client(transport=None):
    # 리다이렉트를 따라가지 않고 프록시 환경변수를 무시한다 — 설정한 주소 밖으로 나가지 않는다.
    return httpx.Client(timeout=httpx.Timeout(5, connect=3), follow_redirects=False, trust_env=False,
                        transport=transport)


def clock():
    return time.monotonic()


def _unavailable(reason):
    log.warning('academic photo upstream failed: %s', reason)
    return HTTPException(502, UNAVAILABLE)


def _download(url):
    # httpx 타임아웃은 읽기 1회 단위다. 조금씩 흘려 보내는 응답이 스레드를 계속 쥐지 않게 전체 마감을 따로 둔다.
    deadline = clock() + DEADLINE_SECONDS
    try:
        with client() as http, http.stream('GET', url) as response:
            status = response.status_code
            if status in (404, 410):
                raise HTTPException(404, MISSING)
            if status != 200:
                raise _unavailable(f'status {status}')
            length = response.headers.get('content-length', '')
            if length.isdigit() and int(length) > MAX_BYTES:
                raise _unavailable('too large')
            chunks, size = [], 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > MAX_BYTES:
                    raise _unavailable('too large')
                if clock() > deadline:
                    raise _unavailable('deadline')
                chunks.append(chunk)
    except httpx.HTTPError as error:
        # 예외 메시지에는 URL 이 들어 있다 — 클래스명만 남기고 연쇄도 끊는다.
        raise _unavailable(type(error).__name__) from None
    content = b''.join(chunks)
    # 상류 Content-Type·확장자를 믿지 않는다 — 매직 바이트로 판정한다.
    media_type = next((media for magic, media in MAGIC if content.startswith(magic)), None)
    if media_type is None:
        raise _unavailable('not an image')
    return content, media_type


def fetch_academic_photo(name):
    """(bytes, media_type). 상류 404·410 → 404, 그 밖의 실패 → 502, 동시 상한 초과 → 503."""
    base = settings.academic_photo_base_url
    if photo_name(name) is None:
        raise HTTPException(404, MISSING)
    url = base + quote(name, safe='')
    assert url.startswith(base)
    if not _slots.acquire(blocking=False):
        raise HTTPException(503, BUSY)
    try:
        return _download(url)
    finally:
        _slots.release()


def photo_response(name):
    """판정을 마친 파일명(photo_name 결과)으로 응답한다. None 이면 사진 없음 404 — 상류를 부르지 않는다."""
    if name is None:
        raise HTTPException(404, MISSING)
    content, media_type = fetch_academic_photo(name)
    # 새 응답 — 상류 헤더(Set-Cookie·Server 등)를 옮기지 않는다. 공용 PC 브라우저 캐시에 남기지 않는다(files.stream 관례).
    return Response(content, media_type=media_type,
                    headers={'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store'})
