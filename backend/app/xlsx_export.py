"""Small, dependency-free OOXML writer (and first-sheet reader). Text cells never become Excel formulas."""
from io import BytesIO
from tempfile import SpooledTemporaryFile
from xml.etree import ElementTree
from xml.sax.saxutils import escape
from zipfile import BadZipFile, ZipFile, ZIP_DEFLATED
import re

SHEET_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
SHEET_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'


def workbook(headers, rows):
    """한 장짜리 통합문서 — 기존 호출부(학생 목록) 호환."""
    return workbook_sheets([('학생 목록', headers, rows)])


def workbook_sheets(sheets):
    """sheets: [(시트명, 헤더, 행 iterable)] 순서대로 시트를 만든다."""
    output = SpooledTemporaryFile(max_size=4*1024*1024, mode='w+b')
    try:
        with ZipFile(output, 'w', ZIP_DEFLATED) as book:
            numbered = list(enumerate(sheets, start=1))
            book.writestr('[Content_Types].xml', '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
''' + ''.join(f'<Override PartName="/xl/worksheets/sheet{n}.xml" ContentType="{SHEET_CT}"/>\n' for n, _ in numbered)
              + '</Types>')
            book.writestr('_rels/.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>''')
            book.writestr('xl/workbook.xml', '''<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'''
              + ''.join(f'<sheet name="{escape(name, {chr(34): "&quot;"})}" sheetId="{n}" r:id="rId{n}"/>' for n, (name, _, _) in numbered)
              + '</sheets></workbook>')
            book.writestr('xl/_rels/workbook.xml.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'''
              + ''.join(f'<Relationship Id="rId{n}" Type="{SHEET_REL}" Target="worksheets/sheet{n}.xml"/>' for n, _ in numbered)
              + '</Relationships>')
            for n, (_, headers, rows) in numbered:
                with book.open(f'xl/worksheets/sheet{n}.xml', 'w') as sheet:
                    sheet.write(b'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>')
                    def write_row(values):
                        cells = []
                        for value in values:
                            text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', str(value if value is not None else '없음'))
                            cells.append('<c t="inlineStr"><is><t xml:space="preserve">'+escape(text)+'</t></is></c>')
                        sheet.write(('<row>'+''.join(cells)+'</row>').encode('utf-8'))
                    write_row(headers)
                    for row in rows:
                        write_row(row)
                    sheet.write(b'</sheetData></worksheet>')
        output.seek(0)
        return output
    except BaseException:
        output.close()
        raise


MAIN_NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL_NS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PART_LIMIT = 32*1024*1024


def read_rows(data: bytes, max_rows: int = 20000):
    """첫 시트를 문자열 행 리스트로 읽는다. 숫자 셀은 엑셀이 저장한 값(v) 그대로다 — 해석은 호출자가 한다.

    ValueError 메시지는 사용자에게 그대로 보여 줄 수 있는 문장이다.
    """
    try:
        book = ZipFile(BytesIO(data))
    except BadZipFile:
        raise ValueError('엑셀(.xlsx) 파일만 올릴 수 있습니다.') from None
    with book:
        def part(name):
            try:
                info = book.getinfo(name)
            except KeyError:
                return None
            if info.file_size > PART_LIMIT:  # 압축 폭탄 — 풀기 전에 선언 크기로 거절한다.
                raise ValueError('엑셀 파일이 너무 큽니다.')
            return ElementTree.fromstring(book.read(name))
        workbook_xml, rels = part('xl/workbook.xml'), part('xl/_rels/workbook.xml.rels')
        sheet = workbook_xml.find(f'{MAIN_NS}sheets/{MAIN_NS}sheet') if workbook_xml is not None else None
        if sheet is None or rels is None:
            raise ValueError('엑셀(.xlsx) 파일만 올릴 수 있습니다.')
        target = next((r.get('Target') for r in rels if r.get('Id') == sheet.get(REL_NS + 'id')), '')
        target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        strings_xml = part('xl/sharedStrings.xml')
        strings = [''.join(t.text or '' for t in si.iter(MAIN_NS + 't')) for si in strings_xml] if strings_xml is not None else []
        sheet_xml = part(target)
        if sheet_xml is None:
            raise ValueError('엑셀 시트를 찾을 수 없습니다.')
        rows = []
        for row in sheet_xml.iter(MAIN_NS + 'row'):
            if len(rows) >= max_rows:
                raise ValueError(f'한 번에 {max_rows}행까지 올릴 수 있습니다.')
            values = {}
            for position, cell in enumerate(row.findall(MAIN_NS + 'c')):
                ref = re.match(r'[A-Z]+', cell.get('r') or '')
                column = position
                if ref:
                    column = 0
                    for letter in ref.group():
                        column = column*26 + ord(letter) - 64
                    column -= 1
                kind = cell.get('t')
                if kind == 'inlineStr':
                    text = ''.join(t.text or '' for t in cell.iter(MAIN_NS + 't'))
                else:
                    v = cell.find(MAIN_NS + 'v')
                    text = v.text or '' if v is not None else ''
                    if kind == 's' and text.isdigit() and int(text) < len(strings):
                        text = strings[int(text)]
                values[column] = text.strip()
            rows.append([values.get(i, '') for i in range(max(values, default=-1) + 1)])
        return rows
