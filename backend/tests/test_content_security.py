from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
import base64

import pytest
from fastapi import HTTPException
from PIL import Image
from app.html_security import clean_html
from app.upload_security import validate_content
from app.programs import ProgramBody
from pydantic import ValidationError
from security_fixtures import pdf_bytes
from test_api import headers
from test_jobs import new_posting
from test_programs import new_program, SERVER_OWNED


def zipped(items):
    out = BytesIO()
    with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
        for name, value in items.items():
            archive.writestr(name, value)
    return out.getvalue()


def png_bytes():
    out = BytesIO()
    Image.new('RGB', (2, 2), 'blue').save(out, format='PNG')
    return out.getvalue()


@pytest.mark.parametrize('name,data', [
    ('run.js', b'void(0)'), ('run.JS.pdf', pdf_bytes()),
    ('fake.pdf', b'<script>void(0)</script>'), ('fake.png', b'<svg onload="void(0)"/>'),
    ('fake.doc', b'fake'), ('script.pdf', pdf_bytes(True)),
    ('script.zip', zipped({'run.js': b'void(0)'})),
    ('nested.zip', zipped({'inner.zip': zipped({'run.ps1': b'exit'})})),
    ('escape.zip', zipped({'../ok.pdf': pdf_bytes()})),
    ('fake.docx', zipped({'word/document.xml': b'<document/>'})),
    ('macro.docx', zipped({'[Content_Types].xml': b'<Types/>', 'word/document.xml': b'<document/>',
                          'word/vbaProject.bin': b'code'})),
    ('svg.zip', zipped({'picture.svg': b'<svg/>'})),
])
def test_unsafe_content_refused(name, data):
    with pytest.raises(HTTPException) as error:
        validate_content(name, data)
    assert error.value.status_code == 422


def test_valid_files_and_image_reencoding():
    pdf = pdf_bytes()
    assert validate_content('resume.pdf', pdf) == pdf
    assert validate_content('documents.zip', zipped({'resume.pdf': pdf}))
    image = validate_content('image.png', png_bytes() + b'<!-- trailing script -->')
    assert b'trailing script' not in image
    assert Image.open(BytesIO(image)).size == (2, 2)
    docx = zipped({'[Content_Types].xml': b'<Types/>', 'word/document.xml': b'<document/>'})
    assert validate_content('resume.docx', docx) == docx


def test_html_and_thumbnail_boundaries():
    html = '<p style="color:red;position:fixed">Hello <strong>safe</strong><img src="/ok.png" onerror="void(0)"><script>bad()</script><a href="javascript:void(0)">link</a><svg onload="void(0)"></svg></p>'
    clean = clean_html(html)
    assert '<strong>safe</strong>' in clean and 'color:red' in clean
    for unsafe in ('onerror', 'javascript:', '<script', '<svg', 'position', 'bad()'):
        assert unsafe not in clean
    data = 'data:image/png;base64,' + base64.b64encode(png_bytes()).decode()
    assert 'data:image/png;base64,' in clean_html(f'<img src="{data}">')
    with pytest.raises(ValidationError):
        ProgramBody(title='x', category='CAREER', capacity=1, image='data:image/svg+xml;base64,PHN2Zy8+')


@pytest.mark.parametrize('path,identity', [
    ('/api/v1/job-files?slot=RESUME&name=', 'chaewon'),
    ('/api/v1/job-files?slot=ATTACHMENT&name=', 'career_kim'),
    ('/api/v1/job-files?slot=LOGO&name=', 'career_kim'),
    ('/api/v1/growth-files?name=', 'chaewon'),
])
def test_all_upload_api_boundaries(client, path, identity):
    for name, data in [('script.js', b'void(0)'), ('disguised.png', b'<script>void(0)</script>')]:
        response = client.post(path + name, headers=headers(identity), content=data)
        assert response.status_code == 422, response.text
    is_logo = 'LOGO' in path
    response = client.post(path + ('good.png' if is_logo else 'good.pdf'), headers=headers(identity),
                           content=png_bytes() if is_logo else pdf_bytes())
    assert response.status_code == 201, response.text
    download = client.get(response.json()['downloadUrl'], headers=headers(identity))
    assert download.status_code == 200
    assert download.headers['x-content-type-options'] == 'nosniff'


def test_stored_html_creation_update_and_read(client):
    payload = '<p>safe<img src="/test.png" onerror="void(0)"><script>bad()</script></p>'
    program = new_program(client, detail=payload)
    assert 'onerror' not in program['detail'] and '<script' not in program['detail']
    body = {k: v for k, v in program.items() if k not in SERVER_OWNED}
    body.update(expectedVersion=program['version'], detail=payload)
    response = client.put('/api/v1/programs/' + program['id'], headers=headers('career_kim'), json=body)
    assert response.status_code == 200, response.text
    read = client.get('/api/v1/programs/' + program['id'], headers=headers('chaewon')).json()
    assert '<p>safe' in read['detail'] and 'onerror' not in read['detail']
    posting = new_posting(client, content=payload)
    assert '<p>safe' in posting['content'] and 'onerror' not in posting['content']
