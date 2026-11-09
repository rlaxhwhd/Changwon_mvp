// C-5 취약요인 진단(PHQ-9 · GAD-7) — 정본은 서버(dc.screening_* · diagnosis_result · psych_screening_referral).
// 문항·선택지·응시 가능 여부·판정은 서버가 준다. 화면은 그리고 제출만 한다.
import { api } from '../../shared/api'

export interface C5Scale {
  code: 'PHQ9' | 'GAD7'
  label: string
  instruction: string
  options: { value: number; label: string }[]
  items: { code: string; prompt: string }[]
}
export interface C5Result { phq9: number; gad7: number; average: number; referred: boolean; attemptNo: number; completedAt: string }
export interface C5Form {
  scales: C5Scale[]
  /** 지금 응시할 수 있는가(현재 유형의 후속진단 + 미응시 또는 재응시 승인) */
  open: boolean
  result: C5Result | null
  /** C-CORE 재검사 요청 상태 — 권유 버튼 표시에 쓴다 */
  coreRequest: 'PENDING' | 'APPROVED' | null
}

export const loadC5Form = (signal?: AbortSignal) => api<C5Form>('/diagnosis/c5', { signal })
export const submitC5 = (answers: Record<string, number>) =>
  api<{ result: C5Result }>('/diagnosis/c5', { method: 'POST', body: JSON.stringify({ answers }) })
