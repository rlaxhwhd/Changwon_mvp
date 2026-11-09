"""학생 포트폴리오 테스트 공용 도우미. 계약 테스트와 기능 테스트가 같이 쓴다."""
from copy import deepcopy
from io import BytesIO
from uuid import uuid4

from PIL import Image

from app.db import pool
from security_fixtures import pdf_bytes
from test_api import headers


def key():
    return {'Idempotency-Key': uuid4().hex}


def retire_portfolios():
    """학생당 20벌 상한이 있어 테스트끼리 살아 있는 행을 물려주지 않는다."""
    with pool.connection() as conn:
        # 삭제된 벌은 대표일 수 없다(161 CHECK) — 같이 내린다.
        conn.execute('''UPDATE dc.student_portfolio SET deleted_at=now(),deleted_by=student_uid,
          is_representative=false WHERE deleted_at IS NULL''')


def path(identity='chaewon', portfolio_id=''):
    return f'/api/v1/students/{identity}/portfolios' + (f'/{portfolio_id}' if portfolio_id else '')


def create(client, identity='chaewon', **body):
    response = client.post(path(identity), headers={**headers(identity), **key()}, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def section(document, section_key):
    return next(part for part in document['sections'] if part['key'] == section_key)


def personal(document):
    return section(document, 'personal')['data']


def manual_item(fields=None, title='직접 입력'):
    return {'id': uuid4().hex[:12], 'sourceRef': None, 'verified': False, 'title': title, 'fields': fields or {}}


def put(client, dto, identity='chaewon', document=None, title=None, version=None):
    return client.put(path(identity, dto['id']), headers=headers(identity),
                      json={'title': title or dto['title'], 'document': document or dto['document'],
                            'expectedVersion': version or dto['version']})


def save(client, dto, identity='chaewon', document=None, title=None):
    response = put(client, dto, identity, document, title)
    assert response.status_code == 200, response.text
    return response.json()


def ready(client, identity='chaewon', **body):
    """제출할 수 있는 한 벌."""
    dto = create(client, identity, **body)
    document = deepcopy(dto['document'])
    personal(document).update(email='student@example.test', phone='010-0000-0000', address='창원시 의창구')
    return save(client, dto, identity, document)


def apply_body(posting, portfolio, expected_version=None):
    body = {'expectedPostingVersion': posting['version'],
            'attachment': {'kind': 'PORTFOLIO', 'portfolioId': portfolio['id'],
                           'expectedPortfolioVersion': portfolio['version']}}
    if expected_version:
        body['expectedVersion'] = expected_version
    return body


def submit(client, posting, portfolio, identity='chaewon', expected_version=None, idempotency=None):
    return client.post(f"/api/v1/jobs/{posting['id']}/applications",
                       headers={**headers(identity), **(idempotency or key())},
                       json=apply_body(posting, portfolio, expected_version))


def png_bytes():
    out = BytesIO()
    Image.new('RGB', (2, 2), 'blue').save(out, format='PNG')
    return out.getvalue()


def upload(client, slot='PORTFOLIO_PHOTO', identity='chaewon', name=None, data=None, content_type='image/png'):
    response = client.post('/api/v1/portfolio-files', params={'slot': slot, 'name': name or 'photo.png'},
                           headers={**headers(identity), 'Content-Type': content_type},
                           content=data or png_bytes())
    assert response.status_code == 201, response.text
    return response.json()


def upload_document(client, identity='chaewon', name='첨부.pdf'):
    return upload(client, 'PORTFOLIO_DOCUMENT', identity, name, pdf_bytes(), 'application/pdf')


def growth_attachment(client, identity='chaewon'):
    """성장 기록에 연결된 첨부. (파일, 항목) 을 돌려준다."""
    base = f'/api/v1/students/{identity}/growth'
    version = client.get(base + '/profile', headers=headers(identity)).json()['version']
    entry = client.post(base + '/entries', headers={**headers(identity), **key()},
                        json={'kind': 'RECORD', 'title': '첨부 기록', 'expectedProfileVersion': version})
    assert entry.status_code == 201, entry.text
    entry = entry.json()
    file = client.post('/api/v1/growth-files?name=성장첨부.pdf',
                       headers={**headers(identity), 'Content-Type': 'application/pdf'}, content=pdf_bytes())
    assert file.status_code == 201, file.text
    file = file.json()
    version = client.get(base + '/profile', headers=headers(identity)).json()['version']
    linked = client.post(f"{base}/entries/{entry['id']}/files", headers={**headers(identity), **key()},
                         json={'fileId': file['id'], 'expectedVersion': entry['version'],
                               'expectedProfileVersion': version})
    assert linked.status_code == 201, linked.text
    return file, linked.json()
