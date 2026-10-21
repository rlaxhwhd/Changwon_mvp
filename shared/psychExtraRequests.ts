// 추가 심리상담신청 게시판 — 정본은 dc.psych_extra_request (140).
// 학생은 본인 글을 쓰고(학생 심리상담 화면의 팝업), 심리상담사는 전체를 보고 확인 처리·대리 작성한다.
// 두 SPA 가 같은 API 를 쓰므로 접근 모듈을 하나만 둔다.
import { api } from './api'

export interface PsychExtraWriter {
  name: string
  studentNo: string
  grade: number | null
  phone: string
  email: string
  college: string
  major: string
}

export interface PsychExtraRequestSummary {
  id: string
  title: string
  writer: string
  studentNo: string
  createdAt: string
  confirmed: boolean
  /** 심리상담사가 학생 대신 등록한 글 */
  proxy: boolean
}

export interface PsychExtraRequest extends PsychExtraRequestSummary {
  body: string
  /** 작성 시점의 학생 정보 */
  student: PsychExtraWriter
  confirmedAt: string | null
  confirmedBy: string | null
}

export interface PsychExtraQuery {
  page: number
  pageSize: number
  field: 'title' | 'writer'
  q: string
}

export function queryPsychExtraRequests(params: PsychExtraQuery): Promise<{ items: PsychExtraRequestSummary[]; totalCount: number; page: number; pageSize: number }> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize), field: params.field, ...(params.q.trim() ? { q: params.q.trim() } : {}) })
  return api(`/psych-extra-requests?${query}`)
}

/** 팝업 상단 학생 정보 — 학생은 본인, 심리상담사는 대리 작성할 학생 */
export function loadPsychExtraWriter(studentId?: string): Promise<PsychExtraWriter> {
  return api(`/psych-extra-requests/profile${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`)
}

export function getPsychExtraRequest(id: string): Promise<PsychExtraRequest> {
  return api(`/psych-extra-requests/${encodeURIComponent(id)}`)
}

export function createPsychExtraRequest(body: { title: string; body: string; studentId?: string }): Promise<PsychExtraRequest> {
  return api('/psych-extra-requests', { method: 'POST', body: JSON.stringify(body) })
}

export function confirmPsychExtraRequest(id: string): Promise<PsychExtraRequest> {
  return api(`/psych-extra-requests/${encodeURIComponent(id)}/confirm`, { method: 'POST' })
}
