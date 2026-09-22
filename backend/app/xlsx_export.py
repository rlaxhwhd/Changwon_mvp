"""Small, dependency-free OOXML writer. Text cells never become Excel formulas."""
from tempfile import SpooledTemporaryFile
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED
import re


def workbook(headers, rows):
    output = SpooledTemporaryFile(max_size=4*1024*1024, mode='w+b')
    try:
        with ZipFile(output, 'w', ZIP_DEFLATED) as book:
            book.writestr('[Content_Types].xml', '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>''')
            book.writestr('_rels/.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>''')
            book.writestr('xl/workbook.xml', '''<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="학생 목록" sheetId="1" r:id="rId1"/></sheets></workbook>''')
            book.writestr('xl/_rels/workbook.xml.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>''')
            with book.open('xl/worksheets/sheet1.xml', 'w') as sheet:
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
