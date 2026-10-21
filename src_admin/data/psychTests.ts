// ─────────────────────────────────────────────────────────────────────────────
// 검사관리(심리검사 현황) — 정본은 dc.counsel_request(심리검사 신청) + dc.psych_test_result 다.
//
// 학생이 오프라인 심리검사를 신청하면 심리상담 신청(type PSY)에 검사 종류(topic_code)가 붙는다.
// 상담사는 오프라인에서 검사를 마친 뒤 결과를 적고, 결과 「작성 완료」가 곧 신청 완료다.
// 목록은 서버가 페이지 단위로 준다(GET /psych-tests/requests) — 부팅 때 전체를 받지 않는다.
// 심리검사는 CARE 7+ 진단과 별개 도메인이다 — 유형·로드맵과 연결하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from '../../shared/api'
import type { Paginated } from './query'
import type { PsychTestResult } from './schema/psychTest'

export type PsychTestRequestStatus = '신청' | '완료' | '취소'

/** 목록 1행 = 심리검사 신청 1건 + 결과(없으면 null) */
export interface PsychTestRequest {
  requestId: string
  requestVersion: number
  studentId: string
  studentName: string
  studentNo: string
  college: string | null
  major: string
  grade: number | null
  enrollmentStatus: string
  /** PSYCH_TEST_KIND 코드 — 검사 신청 이전부터 상담 건에 붙어 있던 결과는 null */
  testCode: string | null
  testLabel: string | null
  /** 학생이 적은 요청 내용 */
  purpose: string
  method: '오프라인' | '온라인'
  requestedAt: string
  slot: { date: string; start: string } | null
  status: PsychTestRequestStatus | string
  result: PsychTestResult | null
}

export interface PsychTestFilters {
  status: '' | PsychTestRequestStatus
  testCode: string
  q: string
}

export function queryPsychTestRequests(params: PsychTestFilters & { page: number; pageSize: number }): Promise<Paginated<PsychTestRequest>> {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)]))
  return api(`/psych-tests/requests?${query}`)
}

/** 편집을 시작할 때 읽은 버전으로 저장한다. 저장 뒤 화면은 목록을 다시 조회한다. */
export function upsertPsychTest(
  requestId: string,
  body: Pick<PsychTestResult, 'testCode' | 'testNameEtc' | 'testedAt' | 'scales' | 'interpretation' | 'opinion' | 'openToStudent' | 'status'> & { expectedVersion: number },
): Promise<PsychTestResult> {
  return api<PsychTestResult>(`/psych-tests/${requestId}`, { method: 'PUT', body: JSON.stringify(body) })
}

export type { PsychTestResult }
