// ─────────────────────────────────────────────────────────────────────────
// 상담일지 대장 — 완료된 상담 1건 = 일지 1건.
//
// 홈 KPI '상담일지 미작성'(counselorDashboard.getKpis)과 같은 판정을 쓴다:
//   완료 상담 중 dc_counsel_records 에 기록이 없으면 미작성.
// 판정·집계는 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면이 다시 세지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import { getRequestsByAssignee } from './counselRequests'
import { getCounselRecords } from './counselRecords'
import type { CounselRecord } from './schema/counselRecord'
import type { CounselMethod, CounselRequestType } from './schema/counselRequest'
import type { StudentType } from '../../src_v2/data/careerProcess'

/** 일지 작성 단계 — 기록지 저장 상태(RecordStatus)에서 파생한다 */
export type JournalStatus = '미작성' | '작성중' | '완료'

export const JOURNAL_STATUSES: JournalStatus[] = ['미작성', '작성중', '완료']

/** 배지 색 — 다른 목록의 상태 배지와 같은 토큰을 쓴다 */
export const JOURNAL_STATUS_CLASS: Record<JournalStatus, string> = {
  미작성: 'admin-chip-wait',
  작성중: 'admin-chip-cancel',
  완료: 'admin-chip-done',
}

/** 대장 1행 — 완료 상담 + 그 상담의 일지 상태 */
export interface JournalRow {
  requestId: string
  studentId: string
  studentNo: string
  studentName: string
  studentMajor: string
  studentType: StudentType
  type: CounselRequestType
  method: CounselMethod
  topic: string
  /** 상담일 YYYY-MM-DD */
  date: string
  /** 상담 시간 HH:mm~HH:mm (슬롯 없으면 빈 값) */
  time: string
  place: string
  status: JournalStatus
  /** 작성된 기록 (미작성이면 없음) */
  record?: CounselRecord
}

function statusOf(record?: CounselRecord): JournalStatus {
  if (!record) return '미작성'
  return record.status === '완료' ? '완료' : '작성중'
}

/** 상담사 1명의 일지 대장 — 최근 상담이 위로. */
export function getJournalRows(counselorId: string): JournalRow[] {
  const byRequest = new Map(getCounselRecords().map(r => [r.requestId, r]))
  return getRequestsByAssignee(counselorId)
    .filter(r => r.status === '완료')
    .map(r => {
      const record = byRequest.get(r.id)
      return {
        requestId: r.id,
        studentId: r.studentId,
        studentNo: r.studentNo,
        studentName: r.studentName,
        studentMajor: r.studentMajor,
        studentType: r.studentType,
        type: r.type,
        method: r.method,
        topic: r.topic,
        date: r.slot?.date ?? r.requestedAt.slice(0, 10),
        time: r.slot ? `${r.slot.start}~${r.slot.end}` : '',
        place: r.slot?.place ?? '',
        status: statusOf(record),
        record,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** 상단 요약 — 대상·단계별 건수와 작성률. DB 전환 시 COUNT 쿼리. */
export function getJournalSummary(rows: JournalRow[]) {
  const count = (s: JournalStatus) => rows.filter(r => r.status === s).length
  const written = count('완료')
  return {
    total: rows.length,
    미작성: count('미작성'),
    작성중: count('작성중'),
    완료: written,
    rate: rows.length === 0 ? 0 : Math.round((written / rows.length) * 100),
  }
}
