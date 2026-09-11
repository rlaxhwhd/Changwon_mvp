"""업로드 파일 — 바이트는 웹루트 밖 관리 볼륨에 두고 DB 에는 메타만 둔다(DB.md #41).

세 가지가 이 모듈의 전부다.
  ① 저장 이름은 서버가 부여한다. 업로드된 원본 이름을 경로에 쓰지 않는다 —
     경로 조작(`../`)과 확장자 위장을 원천에서 없앤다.
  ② 정적 서빙하지 않는다. 다운로드는 API 가 소유·범위를 확인한 뒤 스트리밍한다.
  ③ DB 안에 바이너리를 넣지 않는다. 백업이 무거워지고 복구가 길어진다.

⚠ 이 볼륨은 DB 백업에 포함되지 않는다. 별도 백업과 서버 이전 절차가 필요하다.
"""
import hashlib
import re
from pathlib import Path
from uuid import uuid4

from urllib.parse import quote

from fastapi import HTTPException, Response

from .settings import settings

# 슬롯마다 허용 확장자가 다르다. 지원 서류는 현행 JobApplyModal 의 accept 를 따른다.
ALLOWED = {
    'LOGO': {'png', 'jpg', 'jpeg', 'webp', 'gif'},
    'ATTACHMENT': {'pdf', 'doc', 'docx', 'hwp', 'hwpx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'png', 'jpg', 'jpeg'},
    'RESUME': {'pdf', 'doc', 'docx', 'hwp', 'hwpx'},
    # 포트폴리오 첨부는 성장 자료(dc.growth_entry)에 붙는다. 허용 형식은 지원 서류와 같게 두고
    # 새 형식은 별도 승인으로만 넓힌다.
    'PORTFOLIO_ATTACHMENT': {'pdf', 'doc', 'docx', 'hwp', 'hwpx', 'xls', 'xlsx', 'ppt', 'pptx',
                             'zip', 'png', 'jpg', 'jpeg'},
}
CONTENT_TYPES = {
    'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp', 'gif': 'image/gif',
    'pdf': 'application/pdf', 'doc': 'application/msword', 'zip': 'application/zip',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'hwp': 'application/x-hwp', 'hwpx': 'application/hwp+zip',
    'xls': 'application/vnd.ms-excel', 'ppt': 'application/vnd.ms-powerpoint',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}


def root() -> Path:
    path = Path(settings.file_root)
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_name(name: str) -> str:
    """표시용으로만 쓰는 원본 이름. 경로 구분자와 제어문자를 걷어낸다."""
    cleaned = re.sub(r'[\\/\x00-\x1f]', '', (name or '').strip())[:200]
    return cleaned or 'file'


def extension(name: str) -> str:
    return name.rsplit('.', 1)[-1].lower() if '.' in name else ''


def location(file_id: str) -> Path:
    """저장 경로. 이름은 서버가 만든 id 뿐이고 확장자를 붙이지 않는다."""
    return root() / file_id[:2] / file_id


def too_large() -> HTTPException:
    return HTTPException(422, f'파일은 {settings.file_max_bytes // (1024 * 1024)}MB 이하만 올릴 수 있습니다.')


async def read_body(request) -> bytes:
    """한도를 넘는 순간 읽기를 멈춘다.

    본문을 다 읽은 뒤에 크기를 재면 이미 늦다 — 인증된 사용자가 큰 본문을 밀어 넣어
    컨테이너 메모리(deploy/compose.api.yaml 의 mem_limit)를 넘길 수 있다.
    Content-Length 는 없거나(chunked) 거짓일 수 있으므로 그 값은 빠른 거절에만 쓰고,
    **실제 방어선은 스트림 누적 검사**다.
    """
    limit = settings.file_max_bytes
    declared = request.headers.get('content-length', '')
    if declared.isdigit() and int(declared) > limit:
        raise too_large()
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > limit:
            raise too_large()
    return bytes(body)


def store(conn, user, slot: str, name: str, data: bytes):
    """바이트를 볼륨에 쓰고 메타 1행을 만든다. 소유자는 신청·저장 트랜잭션에서 확정한다."""
    if slot not in ALLOWED:
        raise HTTPException(422, '허용되지 않는 파일 용도입니다.')
    if not data:
        raise HTTPException(422, '빈 파일은 올릴 수 없습니다.')
    # read_body 가 이미 막았어야 하는 값이다. 다른 호출자가 생겨도 한도가 새지 않게 한 번 더 본다.
    if len(data) > settings.file_max_bytes:
        raise too_large()
    original = safe_name(name)
    ext = extension(original)
    if ext not in ALLOWED[slot]:
        raise HTTPException(422, '허용되지 않는 파일 형식입니다. (' + ', '.join(sorted(ALLOWED[slot])) + ')')
    file_id = uuid4().hex
    owner_kind = {'LOGO': 'JOB_POSTING', 'ATTACHMENT': 'JOB_POSTING',
                  'RESUME': 'JOB_APPLICATION_ATTEMPT', 'PORTFOLIO_ATTACHMENT': 'GROWTH_ENTRY'}[slot]
    path = location(file_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    try:
        return conn.execute('''INSERT INTO dc.file_object(id,owner_kind,owner_id,slot,original_name,content_type,
          byte_size,checksum,uploaded_by) VALUES(%s,%s,NULL,%s,%s,%s,%s,%s,%s) RETURNING *''',
          (file_id, owner_kind, slot, original, CONTENT_TYPES.get(ext, 'application/octet-stream'),
           len(data), hashlib.sha256(data).hexdigest(), user['intg_uid'])).fetchone()
    except Exception:
        path.unlink(missing_ok=True)
        raise


def get_file(conn, file_id: str, lock=False):
    row = conn.execute("SELECT * FROM dc.file_object WHERE id=%s AND state='READY'"
                       + (' FOR UPDATE' if lock else ''), (file_id,)).fetchone()
    if not row:
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    return row


def claim(conn, user, file_id: str, owner_kind: str, owner_id: str, slot: str):
    """예약된 파일을 실제 소유자에 붙인다. 남의 파일·다른 용도·재귀속은 거부한다."""
    row = get_file(conn, file_id, lock=True)
    if row['uploaded_by'] != user['intg_uid'] or row['slot'] != slot or row['owner_kind'] != owner_kind:
        raise HTTPException(403, '이 파일을 사용할 권한이 없습니다.')
    if row['owner_id'] not in (None, owner_id):
        raise HTTPException(409, '이미 다른 곳에 제출된 파일입니다.')
    conn.execute('UPDATE dc.file_object SET owner_id=%s WHERE id=%s', (owner_id, file_id))
    return row


def discard(conn, user, file_id: str):
    """참조가 끊긴 파일을 논리삭제한다. 바이트는 별도 정리 절차가 걷는다."""
    conn.execute("""UPDATE dc.file_object SET state='DELETED',deleted_at=now(),deleted_by=%s
      WHERE id=%s AND state='READY'""", (user['intg_uid'], file_id))


def file_dto(row, prefix: str = '/api/v1/job-files/'):
    # storage_key·실제 경로는 내려보내지 않는다. 다운로드는 언제나 API 를 거친다.
    return {'id': row['id'], 'name': row['original_name'], 'size': row['byte_size'],
            'contentType': row['content_type'], 'downloadUrl': prefix + row['id']}


def stream(row):
    """바이트를 내려보낸다. 파일명은 RFC 5987 로 퍼센트 인코딩한다 —
    헤더는 latin-1 만 실을 수 있어 한글 이름이 그대로 들어가면 500 이 된다."""
    path = location(row['id'])
    if not path.is_file():
        raise HTTPException(404, '파일 본문이 없습니다.')
    return Response(path.read_bytes(), media_type=row['content_type'],
                    headers={'Content-Disposition': "attachment; filename*=UTF-8''"
                             + quote(safe_name(row['original_name']))})
