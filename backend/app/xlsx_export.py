"""Small, dependency-free OOXML writer (and first-sheet reader). Text cells never become Excel formulas."""
from io import BytesIO
from tempfile import SpooledTemporaryFile
from xml.etree import ElementTree
from xml.sax.saxutils import escape
from zipfile import BadZipFile, ZipFile, ZIP_DEFLATED
import math
import re
import unicodedata
import zlib

SHEET_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
SHEET_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'


def workbook(headers, rows):
    """한 장짜리 통합문서 — 기존 호출부(학생 목록) 호환."""
    return workbook_sheets([('학생 목록', headers, rows)])


# ── 보기 좋게 — 열 너비·줄 높이를 값에 맞춘다(2026-11-26 사용자 지시: 모든 엑셀). 브라우저 shared/xlsx.ts 와 같은 규칙.
# 머리글은 굵게·회색 바탕·테두리, 본문은 테두리·가운데·줄바꿈. 열은 가장 긴 값에 맞추되 MAX_WIDTH 에서 접는다.
# 한글·전각 문자는 2칸, 나머지는 1칸으로 센다. 줄 높이는 접힌 줄 수 × LINE_PT 로 직접 적는다(엑셀이 열 때 다시 재지 않는다).
MAX_WIDTH = 50
MIN_WIDTH = 6
LINE_PT = 16.5
STYLE_BODY, STYLE_HEADER, STYLE_TITLE = 1, 2, 3
STYLES_XML = '''<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="맑은 고딕"/><family val="3"/><charset val="129"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/><family val="3"/><charset val="129"/></font><font><b/><sz val="13"/><name val="맑은 고딕"/><family val="3"/><charset val="129"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'''
STYLES_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'
STYLES_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles'


def cell_text(value):
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', str(value if value is not None else '없음'))


def text_width(line):
    return sum(2 if unicodedata.east_asian_width(ch) in 'WF' else 1 for ch in line)


def column_widths(table):
    widths = []
    for row in table:
        for i, text in enumerate(row):
            if i == len(widths):
                widths.append(0)
            widths[i] = max(widths[i], max(text_width(line) for line in text.split('\n')))
    return [min(max(w + 2, MIN_WIDTH), MAX_WIDTH) for w in widths]


def row_height(row, widths):
    lines = max((sum(max(1, math.ceil(text_width(line) / max(widths[i] - 1, 1))) for line in text.split('\n'))
                 for i, text in enumerate(row)), default=1)
    return round(lines * LINE_PT + 4, 1)


def sheet_parts(headers, rows, title=None):
    """시트 XML 조각 — 너비를 알아야 <cols> 를 먼저 쓸 수 있어 행을 한 번 모은 뒤 쓴다."""
    table = [[cell_text(v) for v in headers], *([cell_text(v) for v in row] for row in rows)]
    widths = column_widths(table)
    yield '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    if widths:
        yield '<cols>' + ''.join(f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths, start=1)) + '</cols>'
    yield '<sheetData>'
    number = 0

    def row_xml(values, style, height):
        nonlocal number
        number += 1
        cells = ''.join(f'<c s="{style}" t="inlineStr"><is><t xml:space="preserve">{escape(text)}</t></is></c>' for text in values)
        return f'<row r="{number}" ht="{height}" customHeight="1">{cells}</row>' if values else f'<row r="{number}"/>'
    if title:
        yield row_xml([cell_text(title)], STYLE_TITLE, 24)
    for index, row in enumerate(table):
        yield row_xml(row, STYLE_HEADER if index == 0 else STYLE_BODY, row_height(row, widths))
    yield '</sheetData></worksheet>'


def workbook_sheets(sheets):
    """sheets: [(시트명, 헤더, 행 iterable[, 제목])] 순서대로 시트를 만든다. 제목은 머리글 위 한 줄(굵게, 너비 계산 제외)."""
    output = SpooledTemporaryFile(max_size=4*1024*1024, mode='w+b')
    try:
        with ZipFile(output, 'w', ZIP_DEFLATED) as book:
            numbered = list(enumerate(sheets, start=1))
            book.writestr('[Content_Types].xml', '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
''' + f'<Override PartName="/xl/styles.xml" ContentType="{STYLES_CT}"/>\n'
              + ''.join(f'<Override PartName="/xl/worksheets/sheet{n}.xml" ContentType="{SHEET_CT}"/>\n' for n, _ in numbered)
              + '</Types>')
            book.writestr('_rels/.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>''')
            book.writestr('xl/workbook.xml', '''<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'''
              + ''.join(f'<sheet name="{escape(sheet[0], {chr(34): "&quot;"})}" sheetId="{n}" r:id="rId{n}"/>' for n, sheet in numbered)
              + '</sheets></workbook>')
            book.writestr('xl/_rels/workbook.xml.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'''
              + ''.join(f'<Relationship Id="rId{n}" Type="{SHEET_REL}" Target="worksheets/sheet{n}.xml"/>' for n, _ in numbered)
              + f'<Relationship Id="rId{len(numbered)+1}" Type="{STYLES_REL}" Target="styles.xml"/>'
              + '</Relationships>')
            book.writestr('xl/styles.xml', STYLES_XML)
            for n, sheet in numbered:
                headers, rows = sheet[1], sheet[2]
                title = sheet[3] if len(sheet) > 3 else None
                with book.open(f'xl/worksheets/sheet{n}.xml', 'w') as out:
                    for part in sheet_parts(headers, rows, title):
                        out.write(part.encode('utf-8'))
        output.seek(0)
        return output
    except BaseException:
        output.close()
        raise


MAIN_NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL_NS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PART_LIMIT = 32*1024*1024


def read_workbook(data: bytes, max_rows: int = 20000):
    """첫 시트를 문자열 행 리스트로 읽고 (행, date1904 여부)를 돌려준다.
    숫자 셀은 엑셀이 저장한 값(v) 그대로다 — 날짜 일련번호 해석은 호출자가 date1904 로 한다.

    ValueError 메시지는 사용자에게 그대로 보여 줄 수 있는 문장이다. 손상된 파일도 ValueError 로 바꾼다.
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
            try:
                return ElementTree.fromstring(book.read(name))
            except (ElementTree.ParseError, BadZipFile, zlib.error, EOFError, NotImplementedError):
                raise ValueError('손상된 엑셀 파일입니다. 엑셀에서 다시 저장한 뒤 올려 주세요.') from None
        workbook_xml, rels = part('xl/workbook.xml'), part('xl/_rels/workbook.xml.rels')
        props = workbook_xml.find(f'{MAIN_NS}workbookPr') if workbook_xml is not None else None
        date1904 = props is not None and props.get('date1904', '').lower() in ('1', 'true')
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
        return rows, date1904
