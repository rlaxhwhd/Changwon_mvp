// ─────────────────────────────────────────────────────────────────────────
// 상담일지 대장 — 완료된 상담 1건 = 일지 1건.
//
// 홈 KPI '상담일지 미작성'(counselorDashboard.getKpis)과 같은 판정을 쓴다:
//   완료 상담 중 dc_counsel_records 에 기록이 없으면 미작성.
// 판정·집계는 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면이 다시 세지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import { getRequestsByAssignee, splitMajorGrade } from './counselRequests'
import { getCounselRecords } from './counselRecords'
import { studentLiteOf } from './studentRoster'
import type { EnrollStatus } from './studentRoster'
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
  /** 학년 — 학생 단일소스에서. 로스터에 없는 학생이면 비어 있다(필터에서 제외된다). */
  studentGrade?: number
  /** 학적 상태 — 지금 값(학생 단일소스)이 먼저, 없으면 신청 시점 스냅샷.
      상담일지는 「지금 휴학 중인 학생」을 걸러 보는 자리라 현재 값이 맞다.
      jobApplicationExport 가 쓰는 판정과 같은 규약이다. */
  studentStatus: EnrollStatus
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
      const lite = studentLiteOf(r.studentId)
      // 상담 시드의 studentMajor 에는 학년이 붙어 있다("컴퓨터공학과 4학년").
      // 그대로 두면 학과 필터가 같은 학과를 둘로 갈라 놓는다 — 쪼개는 규칙은 counselRequests 가 갖고 있다.
      const snap = splitMajorGrade(r.studentMajor)
      return {
        requestId: r.id,
        studentId: r.studentId,
        studentNo: r.studentNo,
        studentName: r.studentName,
        studentMajor: snap.major,
        studentGrade: lite?.grade ?? (snap.grade ? parseInt(snap.grade, 10) : undefined),
        studentStatus: lite?.status ?? r.studentEnrollmentStatus,
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

/**
 * 학적 상태 선택지 — 값이 정해진 열거형이라 대장에 있는 값만 뽑지 않고 늘 전부 내놓는다.
 * 지금 대장이 전원 재학이어도 「휴학」을 고를 수 있어야 필터가 필터로 읽힌다.
 * 사전순이면 「수료·재학·졸업·휴학」이 되므로 순서도 여기서 못박는다.
 */
const ENROLL_STATUSES: EnrollStatus[] = ['재학', '휴학', '졸업', '수료']

/**
 * 필터 드롭다운 옵션.
 * 학과·학년은 끝이 열린 집합이라 대장에 실제로 있는 값에서만 만든다 —
 * 전 학과를 늘어놓으면 고르는 족족 0건인 항목이 대부분이 된다.
 * studentRoster.getRosterFilterOptions 와 같은 규약 — DB 전환 시 별도 집계 엔드포인트.
 */
export function getJournalFilterOptions(rows: JournalRow[]) {
  return {
    majors: [...new Set(rows.map(r => r.studentMajor))].sort(),
    grades: [...new Set(rows.flatMap(r => (r.studentGrade ? [r.studentGrade] : [])))].sort((a, b) => a - b),
    statuses: ENROLL_STATUSES,
  }
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
