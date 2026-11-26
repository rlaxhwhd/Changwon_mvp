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

// ── 보기 좋게 — 열 너비·줄 높이를 값에 맞춘다(2026-11-26 사용자 지시: 모든 엑셀). 백엔드 xlsx_export.py 와 같은 규칙.
// 머리글(rows[0])은 굵게·회색 바탕·테두리, 본문은 테두리·가운데·줄바꿈. 열은 가장 긴 값에 맞추되 MAX_WIDTH 에서 접는다.
// 한글·전각 문자는 2칸, 나머지는 1칸으로 센다. 줄 높이는 접힌 줄 수 × LINE_PT 로 직접 적는다.
const MAX_WIDTH = 50
const MIN_WIDTH = 6
const LINE_PT = 16.5
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꥠ-꥿가-힣豈-﫿︰-﹏＀-｠￠-￦]/
const STYLES_XML = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/><family val="3"/><charset val="129"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/><family val="3"/><charset val="129"/></font></fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

const textWidth = (line: string) => [...line].reduce((sum, ch) => sum + (WIDE.test(ch) ? 2 : 1), 0)

function columnWidths(table: string[][]): number[] {
  const widths: number[] = []
  for (const row of table) {
    row.forEach((text, i) => { widths[i] = Math.max(widths[i] ?? 0, ...text.split('\n').map(textWidth)) })
  }
  return Array.from(widths, w => Math.min(Math.max((w ?? 0) + 2, MIN_WIDTH), MAX_WIDTH))
}

function rowHeight(row: string[], widths: number[]): number {
  const lines = Math.max(1, ...row.map((text, i) => text.split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(textWidth(line) / Math.max(widths[i] - 1, 1))), 0)))
  return Math.round((lines * LINE_PT + 4) * 10) / 10
}

/** rows[0] 이 머리글이다. null·undefined 는 빈 칸. */
export function xlsxBlob(rows: XlsxCell[][], sheetName = 'Sheet1'): Blob {
  const table = rows.map(row => row.map(value => (value == null ? '' : String(value))))
  const widths = columnWidths(table)
  const cols = widths.length
    ? '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>'
    : ''
  const sheetRows = table.map((row, index) => {
    if (!row.length) return `<row r="${index + 1}"/>`
    const style = index === 0 ? 2 : 1
    return `<row r="${index + 1}" ht="${rowHeight(row, widths)}" customHeight="1">` + row.map(text =>
      `<c s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`).join('') + '</row>'
  }).join('')
  // 시트 이름에 쓸 수 없는 문자( \ / ? * [ ] : )는 지우고 31자로 자른다.
  const safeName = escapeXml(sheetName.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet1')
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', STYLES_XML],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${sheetRows}</sheetData></worksheet>`],
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
