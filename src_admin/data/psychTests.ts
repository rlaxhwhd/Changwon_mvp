// ─────────────────────────────────────────────────────────────────────────────
// 심리검사 결과 로더 (SPEC C7)
//
// 단일 소스
//   · 검사 대상  = 심리상담 신청(확정·완료) — 심리검사는 상담 신청 절차 안에서만 이뤄진다
//   · 결과       = localStorage 'dc_psych_tests'
//
// 목록의 행은 "심리상담 건"이고, 결과 작성 여부가 그 행의 상태다.
// 별도 seed를 두지 않는다 — 대상이 상담 신청에서 파생되므로 신청이 늘면 자동으로 따라온다.
// ─────────────────────────────────────────────────────────────────────────────
import { getRequestsByAssignee } from './counselRequests'
import type { CounselRequest } from './schema/counselRequest'
import type { PsychTestResult } from './schema/psychTest'
import { studentLiteOf } from './studentRoster'

const STORAGE_KEY = 'dc_psych_tests'

export function getPsychTests(): PsychTestResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as PsychTestResult[]
    }
  } catch {
    /* 결과 없음 */
  }
  return []
}

function persist(list: PsychTestResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/** 상담 건 1건의 검사 결과 (없으면 undefined) */
export function getPsychTestByRequest(requestId: string): PsychTestResult | undefined {
  return getPsychTests().find(item => item.requestId === requestId)
}

/** 결과 upsert. id가 있으면 갱신, 없으면 추가. `updatedAt`은 항상 갱신된다. */
export function upsertPsychTest(result: PsychTestResult): PsychTestResult {
  const now = new Date().toISOString()
  const next: PsychTestResult = { ...result, updatedAt: now }
  const list = getPsychTests()
  const idx = list.findIndex(item => item.id === result.id)
  persist(idx >= 0 ? list.map(item => (item.id === result.id ? next : item)) : [...list, next])
  return next
}

/** 목록 1행 = 심리상담 건 + 결과 작성 여부 */
export interface PsychTestRow {
  request: CounselRequest
  studentGrade: number
  result?: PsychTestResult
}

/**
 * 담당 심리상담사의 검사 대상 목록.
 * 대상 = 본인 배정 심리상담 중 **확정·완료** 건(대기·취소는 아직 검사 대상이 아니다).
 */
export function getPsychTestRows(counselorId: string): PsychTestRow[] {
  const results = new Map(getPsychTests().map(item => [item.requestId, item]))
  return getRequestsByAssignee(counselorId)
    .filter(request => request.type === '심리' && (request.status === '확정' || request.status === '완료'))
    .map(request => ({
      request,
      studentGrade: studentLiteOf(request.studentId)?.grade ?? 0,
      result: results.get(request.id),
    }))
    .sort((a, b) => {
      // 미작성 건을 위로, 그다음 최근 상담일 순
      const written = Number(Boolean(a.result)) - Number(Boolean(b.result))
      if (written !== 0) return written
      return (b.request.slot?.date ?? '').localeCompare(a.request.slot?.date ?? '')
    })
}

/** 상단 요약 — 대상/작성완료/미작성 */
export function getPsychTestSummary(counselorId: string) {
  const rows = getPsychTestRows(counselorId)
  const done = rows.filter(row => row.result?.status === '완료').length
  const draft = rows.filter(row => row.result?.status === '작성중').length
  return { target: rows.length, done, draft, none: rows.length - done - draft }
}

export type { PsychTestResult }
