import { api } from '../../shared/api'

export type ReferralStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export const REFERRAL_STATUS: Record<ReferralStatus, string> = {
  PENDING: '접수 대기', IN_PROGRESS: '처리 중', DONE: '처리 완료', CANCELLED: '취소',
}
export interface Referral {
  id: string; studentId: string; studentName: string; studentNo: string; major: string
  senderName: string; recipientName: string; reason: string; status: ReferralStatus; version: number
  createdAt: string; acceptedAt: string | null; completedAt: string | null; cancelledAt: string | null
}
export interface ReferralOptions {
  role: 'career' | 'psych'; reasons: { code: string; label: string }[]; counselors: { id: string; name: string }[]
}
export interface ReferralList { items: Referral[]; totalCount: number; counts: Partial<Record<ReferralStatus, number>> }
export interface ReferralStudent { id: string; name: string; studentNo: string; major: string }
export const loadReferralOptions = (signal: AbortSignal) => api<ReferralOptions>('/psych-referrals/options', { signal })
export const loadReferrals = (page: number, status: string, signal: AbortSignal) =>
  api<ReferralList>(`/psych-referrals?page=${page}${status ? `&status=${status}` : ''}`, { signal })
export const sendReferral = (body: { studentId: string; counselorId: string; reasonCode: string }) =>
  api<Referral>('/psych-referrals', { method: 'POST', body: JSON.stringify(body) })
export const updateReferral = (row: Referral, action: 'ACCEPT' | 'COMPLETE' | 'CANCEL') =>
  api<Referral>(`/psych-referrals/${row.id}/transition`, { method: 'POST', body: JSON.stringify({ action, version: row.version }) })

// C-5 진단 자동 연계(160) — 심리상담사 전원 공유. 사유·받는 사람이 없고 취소가 없다.
export type ScreeningStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'
export interface ScreeningReferral {
  id: string; studentId: string; studentName: string; studentNo: string; major: string
  phq9: number; gad7: number; average: number | string; status: ScreeningStatus; version: number
  createdAt: string; acceptedAt: string | null; completedAt: string | null
  acceptedByName: string | null; completedByName: string | null
}
export interface ScreeningList { items: ScreeningReferral[]; totalCount: number; counts: Partial<Record<ScreeningStatus, number>> }
export const loadScreeningReferrals = (page: number, signal: AbortSignal) =>
  api<ScreeningList>(`/psych-referrals/screening?page=${page}`, { signal })
export const updateScreeningReferral = (row: ScreeningReferral, action: 'ACCEPT' | 'COMPLETE') =>
  api<ScreeningReferral>(`/psych-referrals/screening/${row.id}/transition`, { method: 'POST', body: JSON.stringify({ action, version: row.version }) })
