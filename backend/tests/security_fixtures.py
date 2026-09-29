from io import BytesIO
from pypdf import PdfWriter


def pdf_bytes(script=False):
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    if script:
        writer.add_js('void(0)')
    output = BytesIO()
    writer.write(output)
    return output.getvalue()
