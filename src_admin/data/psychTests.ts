// ─────────────────────────────────────────────────────────────────────────────
// 심리검사 결과 로더 (SPEC C7) — 정본은 dc.psych_test_result 다.
//
// 단일 소스
//   · 검사 대상  = 심리상담 신청(확정·완료) — 심리검사는 상담 신청 절차 안에서만 이뤄진다
//   · 결과       = GET /psych-tests (부팅 때 적재) · PUT /psych-tests/{requestId} (upsert)
//
// 목록의 행은 "심리상담 건"이고, 결과 작성 여부가 그 행의 상태다.
// 심리검사는 CARE 7+ 진단과 별개 도메인이다 — 유형·로드맵과 연결하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from '../../shared/api'
import { getRequestsByAssignee } from './counselRequests'
import type { CounselRequest } from './schema/counselRequest'
import type { PsychTestResult } from './schema/psychTest'

let results: PsychTestResult[] = []

/** 부팅 로더 — 심리상담사만 부른다(다른 역할은 서버가 403). */
export async function loadPsychTests(): Promise<void> {
  const data = await api<{ items: PsychTestResult[] }>('/psych-tests')
  results = data.items
}

export function getPsychTests(): PsychTestResult[] {
  return results
}

/** 상담 건 1건의 검사 결과 (없으면 undefined) */
export function getPsychTestByRequest(requestId: string): PsychTestResult | undefined {
  return results.find(item => item.requestId === requestId)
}

/** 결과 upsert — 서버가 신청 1건당 결과 1건을 보장한다. 저장 후 목록을 다시 읽는다. */
export async function upsertPsychTest(
  requestId: string,
  body: Pick<PsychTestResult, 'testCode' | 'testNameEtc' | 'testedAt' | 'scales' | 'interpretation' | 'opinion' | 'openToStudent' | 'status'>,
): Promise<PsychTestResult> {
  const saved = await api<PsychTestResult>(`/psych-tests/${requestId}`, { method: 'PUT', body: JSON.stringify(body) })
  await loadPsychTests()
  return saved
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
  const byRequest = new Map(results.map(item => [item.requestId, item]))
  return getRequestsByAssignee(counselorId)
    .filter(request => request.type === '심리' && (request.status === '확정' || request.status === '완료'))
    .map(request => ({
      request,
      studentGrade: request.studentGrade ?? 0,
      result: byRequest.get(request.id),
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
