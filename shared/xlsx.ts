/**
 * 브라우저에서 만드는 한 장짜리 .xlsx — 의존성 없음(백엔드 app/xlsx_export.py 와 같은 구성).
 * 모든 칸을 문자열(inlineStr)로 쓴다: 학번 앞자리 0 이 사라지지 않고, '=' 로 시작하는 값도 수식이 되지 않는다.
 * 압축 없이(STORE) ZIP 을 만든다 — 화면에서 내려받는 명단 크기에서는 충분하다.
 */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function zip(files: [string, string][]): Blob {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(text)
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // UTF-8 파일명
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)
    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, nameBytes.length, true)
    entry.setUint32(42, offset, true)
    parts.push(new Uint8Array(local.buffer), nameBytes, data)
    central.push(new Uint8Array(entry.buffer), nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const size = central.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, size, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

const escapeXml = (value: string) => value
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') // eslint-disable-line no-control-regex
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export type XlsxCell = string | number | null | undefined

/** rows[0] 이 머리글이다. null·undefined 는 빈 칸. */
export function xlsxBlob(rows: XlsxCell[][], sheetName = 'Sheet1'): Blob {
  const sheetRows = rows.map(row => '<row>' + row.map(value =>
    `<c t="inlineStr"><is><t xml:space="preserve">${escapeXml(value == null ? '' : String(value))}</t></is></c>`).join('') + '</row>').join('')
  // 시트 이름에 쓸 수 없는 문자( \ / ? * [ ] : )는 지우고 31자로 자른다.
  const safeName = escapeXml(sheetName.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet1')
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`],
  ])
}

/** 행 배열을 .xlsx 로 내려받는다. filename 에 확장자가 없으면 붙인다. */
export function downloadXlsx(filename: string, rows: XlsxCell[][], sheetName?: string): void {
  const url = URL.createObjectURL(xlsxBlob(rows, sheetName))
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 서버가 CSV 로 주는 명단(채용 지원자·심리검사)을 표로 되돌린다. RFC 4180 따옴표 규칙만 처리한다.
 * CSV 수식 방어로 붙인 앞 작은따옴표('= '+ '- '@)는 xlsx 에서는 필요 없어 걷어 낸다.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/^﻿/, '')
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.map(r => r.map(v => /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v))
}
