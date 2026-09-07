// ─────────────────────────────────────────────────────────────────────────
// 상담일지 대장 내보내기(CSV) — 여러 건을 한 장으로.
//
// 명단 조립은 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면은 행 배열만 받아 파일로 만든다.
// DB 전환 시 이 함수가 export 엔드포인트가 된다.
// counselRecords/counselJournals 가 아니라 별도 모듈인 이유는 programExport 와 같다:
// 학생 로스터(학번·진단유형)를 참조해야 해서 기록 로더에 두면 참조가 뒤엉킨다.
// ─────────────────────────────────────────────────────────────────────────
import { typeLabel } from '../../src_v2/data/careerProcess'
import type { JournalRow } from './counselJournals'

/** 엑셀이 UTF-8 로 읽도록 BOM 은 내려받는 쪽에서 붙인다. */
function toCsvText(rows: string[][]): string {
  return rows.map(row => row.map(v => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n')
}

const JOURNAL_HEADER = [
  '상담일', '시간', '이름', '학번', '학과', '진단유형',
  '상담유형', '방식', '장소', '상담 주제', '작성상태',
  '상담 소견', '학생 공개 코멘트', '후속 조치', '담당 상담사',
]

/**
 * 일지 대장 내보내기 — 행은 화면이 이미 들고 있는 것을 그대로 받는다.
 * (대장 조립·정렬은 counselJournals 소관이므로 여기서 다시 만들지 않는다)
 *
 * 뒤 4열은 작성된 일지의 본문이다. 미작성 행은 빈 칸으로 남는다 —
 * 대장과 내역을 한 화면으로 합치면서 내역 CSV 가 갖던 열을 여기로 들여왔다.
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
    r.record?.summary ?? '',
    r.record?.comment ?? '',
    r.record?.followUp ?? '',
    r.record?.counselorName ?? '',
  ])
  return toCsvText([JOURNAL_HEADER, ...body])
}
