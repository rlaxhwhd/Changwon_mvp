"""Fail closed on executable uploads, disguised files and active document content.

This is format validation, not an antivirus engine. Never extract archives to disk.
"""
import base64
from io import BytesIO
from pathlib import PurePosixPath
import re
import warnings
from zipfile import ZipFile

from defusedxml import ElementTree
from fastapi import HTTPException
from PIL import Image
import olefile
from pypdf import PdfReader
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject

IMAGES = {'png': 'PNG', 'jpg': 'JPEG', 'jpeg': 'JPEG', 'gif': 'GIF', 'webp': 'WEBP'}
DOCUMENTS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'hwp', 'hwpx'}
SCRIPT = re.compile(r'\.(?:js|mjs|cjs|jsx|ts|tsx|html?|xhtml|svg|php\d*|phtml|asp|aspx|jsp|py|pyc|sh|bash|ps1|bat|cmd|exe|dll|com|scr|vbs|vbe|wsf|hta|jar|lnk|msi)(?:\.|$)', re.I)
MAX_EXPANDED = 40 * 1024 * 1024
MAX_ENTRIES = 1000


def reject():
    raise HTTPException(422, '스크립트·실행 코드가 포함되었거나 실제 형식을 확인할 수 없는 파일입니다. 실행 코드가 없는 문서 또는 이미지로 다시 저장해 주세요.')


def image_bytes(data: bytes, ext: str) -> bytes:
    # Re-encode raster pixels: metadata and trailing script/polyglot bytes are not retained.
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as img:
                if img.format != IMAGES[ext] or img.width * img.height > 20_000_000:
                    reject()
                img.load()
                out = BytesIO()
                clean = img.convert('RGB' if ext in ('jpg', 'jpeg') else 'RGBA')
                clean.save(out, format=IMAGES[ext])
                return out.getvalue()
    except HTTPException:
        raise
    except Exception:
        reject()


def validate_pdf(data: bytes):
    if not data.startswith(b'%PDF-') or not data.rstrip().endswith(b'%%EOF'):
        reject()
    reader = PdfReader(BytesIO(data), strict=True)
    if reader.is_encrypted:
        reject()
    visited = set()
    budget = [0]
    def walk(obj, depth=0):
        budget[0] += 1
        if depth > 60 or budget[0] > 50000:
            reject()
        if isinstance(obj, IndirectObject):
            key = (obj.idnum, obj.generation)
            if key in visited:
                return
            visited.add(key)
            obj = obj.get_object()
        if isinstance(obj, DictionaryObject):
            if any(k in obj for k in ('/JS', '/JavaScript', '/AA', '/OpenAction', '/EmbeddedFiles', '/EF', '/XFA', '/RichMediaContent')):
                reject()
            if obj.get('/S') in ('/JavaScript', '/Launch', '/SubmitForm', '/ImportData', '/GoToR'):
                reject()
            if '/URI' in obj and str(obj['/URI']).strip().lower().startswith(('javascript:', 'data:', 'file:')):
                reject()
            for value in obj.values():
                walk(value, depth + 1)
        elif isinstance(obj, ArrayObject):
            for value in obj:
                walk(value, depth + 1)
    walk(reader.trailer)
    # Unreferenced objects must not hide executable actions either.
    for generation, offsets in reader.xref.items():
        for number in offsets:
            if number:
                walk(IndirectObject(number, generation, reader))
    for number in reader.xref_objStm:
        walk(IndirectObject(number, 0, reader))


def validate_ole(data: bytes, ext: str):
    if not olefile.isOleFile(BytesIO(data)):
        reject()
    with olefile.OleFileIO(BytesIO(data), raise_defects=olefile.DEFECT_INCORRECT) as doc:
        paths = ['/'.join(p).lower() for p in doc.listdir()]
        if any(any(x in p for x in ('vba', 'macros', 'scripts', 'objectpool', 'ole10native', 'encryptedpackage')) for p in paths):
            reject()
        expected = {'doc': {'worddocument'}, 'xls': {'workbook', 'book'},
                    'ppt': {'powerpoint document'}, 'hwp': {'fileheader'}}[ext]
        if not expected.intersection(paths):
            reject()
        if ext == 'hwp':
            header = doc.openstream('FileHeader').read(40)
            if not header.startswith(b'HWP Document File') or len(header) < 40:
                reject()
            # Password, distribution documents, and script-enabled documents cannot be inspected safely.
            if int.from_bytes(header[36:40], 'little') & (2 | 4 | 8):
                reject()


def validate_archive(data: bytes, ext: str, budget: dict, depth: int):
    if depth > 3:
        reject()
    with ZipFile(BytesIO(data)) as archive:
        entries = archive.infolist()
        budget['entries'] += len(entries)
        if budget['entries'] > MAX_ENTRIES:
            reject()
        names = set()
        for info in entries:
            name = info.filename.replace('\\', '/')
            parts = PurePosixPath(name).parts
            if (name.startswith('/') or '..' in parts or ':' in name or '\x00' in name
                    or info.flag_bits & 1 or (info.external_attr >> 16) & 0o170000 == 0o120000):
                reject()
            if name.lower() in names:
                reject()
            names.add(name.lower())
        required = {'docx': 'word/document.xml', 'xlsx': 'xl/workbook.xml',
                    'pptx': 'ppt/presentation.xml', 'hwpx': 'contents/content.hpf'}
        if ext != 'zip' and required[ext] not in names:
            reject()
        if ext in ('docx', 'xlsx', 'pptx') and '[content_types].xml' not in names:
            reject()
        for info in entries:
            if info.is_dir():
                continue
            name = info.filename.lower()
            budget['bytes'] += info.file_size
            if budget['bytes'] > MAX_EXPANDED or info.file_size > MAX_EXPANDED:
                reject()
            if SCRIPT.search(name) or any(x in name for x in ('vbaproject', 'activex/', 'embeddings/', 'scripts/', 'macrosheets/')):
                reject()
            with archive.open(info) as stream:
                content = stream.read(MAX_EXPANDED + 1)
            if len(content) != info.file_size or len(content) > MAX_EXPANDED:
                reject()
            suffix = name.rsplit('.', 1)[-1]
            if ext == 'zip':
                validate_content(name, content, budget=budget, depth=depth + 1)
            elif suffix in ('xml', 'rels', 'hpf'):
                root = ElementTree.fromstring(content)
                for node in root.iter():
                    local = node.tag.rsplit('}', 1)[-1].lower()
                    if local in ('script', 'javascript'):
                        reject()
                    if any('macroenabled' in v.lower() or 'vbaproject' in v.lower() for v in node.attrib.values()):
                        reject()
                    if local == 'relationship' and any(x in node.attrib.get('Type', '').lower() for x in ('oleobject', 'package', 'vbaproject', 'control')):
                        reject()
            elif suffix in IMAGES:
                image_bytes(content, suffix)
            elif suffix == 'bin':
                # Printer settings are not executable OLE packages; unknown binary parts fail closed.
                if 'printersettings/' not in name:
                    reject()
            elif not (name == 'mimetype' or suffix in ('txt', 'rdf')):
                reject()


def validate_content(name: str, data: bytes, *, budget=None, depth=0) -> bytes:
    if SCRIPT.search(name) or not data:
        reject()
    ext = name.rsplit('.', 1)[-1].lower()
    try:
        if ext in IMAGES:
            return image_bytes(data, ext)
        if ext == 'pdf':
            validate_pdf(data)
        elif ext in ('doc', 'xls', 'ppt', 'hwp'):
            validate_ole(data, ext)
        elif ext in ('zip', 'docx', 'xlsx', 'pptx', 'hwpx'):
            validate_archive(data, ext, budget if budget is not None else {'bytes': 0, 'entries': 0}, depth)
        else:
            reject()
    except HTTPException:
        raise
    except Exception:
        # Parser details and paths must not escape into API responses.
        reject()
    return data


def safe_image_url(value: str) -> str:
    if not value.lower().startswith('data:'):
        if re.match(r'^(?:https?://|/(?!/))', value, re.I):
            return value
        raise ValueError('이미지 주소는 http(s) 또는 사이트 내부 경로여야 합니다.')
    match = re.fullmatch(r'data:image/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=\s]+)', value, re.I)
    if not match or len(value) > 2_000_000:
        raise ValueError('PNG, JPEG, GIF, WebP 이미지만 사용할 수 있습니다.')
    try:
        raw = base64.b64decode(re.sub(r'\s', '', match[2]), validate=True)
        clean = image_bytes(raw, match[1].lower())
        return f'data:image/{match[1].lower()};base64,' + base64.b64encode(clean).decode()
    except Exception:
        raise ValueError('이미지 파일의 실제 형식을 확인해 주세요.') from None
