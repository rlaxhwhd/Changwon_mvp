// ─────────────────────────────────────────────────────────────────────────
// 상담 기록·일지 내보내기(CSV) — 여러 건을 한 장으로.
//
// 명단 조립은 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면은 행 배열만 받아 파일로 만든다.
// DB 전환 시 이 함수 둘이 export 엔드포인트 둘이 된다.
// counselRecords/counselJournals 가 아니라 별도 모듈인 이유는 programExport 와 같다:
// 학생 로스터(학번·진단유형)를 참조해야 해서 기록 로더에 두면 참조가 뒤엉킨다.
// ─────────────────────────────────────────────────────────────────────────
import { getCounselRecords } from './counselRecords'
import { studentLiteOf } from './studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'
import type { CounselRecord } from './schema/counselRecord'
import type { JournalRow } from './counselJournals'

/** 엑셀이 UTF-8 로 읽도록 BOM 은 내려받는 쪽에서 붙인다. */
function toCsvText(rows: string[][]): string {
  return rows.map(row => row.map(v => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n')
}

const RECORD_HEADER = [
  '상담일', '이름', '학번', '학과', '상담유형', '방식', '상담 주제',
  '상담 소견', '학생 공개 코멘트', '후속 조치', '담당 상담사',
]

/** 기록 스냅샷(이름·학과)을 먼저 쓰고, 학생 단일소스에 있으면 학번을 채운다. */
function recordRow(record: CounselRecord): string[] {
  const lite = studentLiteOf(record.studentId)
  return [
    record.date,
    record.studentName,
    lite?.studentNo ?? record.studentId,
    record.studentMajor,
    record.type,
    record.method,
    record.topic,
    record.summary,
    record.comment,
    record.followUp ?? '',
    record.counselorName,
  ]
}

/** 선택한 기록의 행(헤더 제외). 넘긴 id 순서가 아니라 화면 정렬(최신순)을 그대로 따른다. */
export function getRecordExportRows(recordIds: string[]): string[][] {
  const ids = new Set(recordIds)
  return getCounselRecords()
    .filter(r => ids.has(r.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(recordRow)
}

export function toRecordCsv(recordIds: string[]): string {
  return toCsvText([RECORD_HEADER, ...getRecordExportRows(recordIds)])
}

const JOURNAL_HEADER = [
  '상담일', '시간', '이름', '학번', '학과', '진단유형',
  '상담유형', '방식', '장소', '상담 주제', '작성상태',
]

/**
 * 일지 대장 내보내기 — 행은 화면이 이미 들고 있는 것을 그대로 받는다.
 * (대장 조립·정렬은 counselJournals 소관이므로 여기서 다시 만들지 않는다)
 */
export function toJournalCsv(rows: JournalRow[]): string {
  const body = rows.map(r => [
    r.date,
    r.time || '',
    r.studentName,
    r.studentNo,
    r.studentMajor,
    typeLabel(r.studentType),
    r.type,
    r.method,
    r.place,
    r.topic,
    r.status,
  ])
  return toCsvText([JOURNAL_HEADER, ...body])
}
