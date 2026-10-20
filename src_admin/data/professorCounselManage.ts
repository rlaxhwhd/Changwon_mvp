import { api, queryString } from '../../shared/api'
import { loadCounselRecords, loadCounselRequests } from '../../shared/counselStore'
import type { Paginated } from './query'
import type { ProfCounselCategoryCode } from './schema/profCounselRecord'

export type CounselChannel = 'offline' | 'online'
export interface CounselAttachment { id: string; name: string; size: number; downloadUrl: string }
export interface ProfessorReport {
  id: string; requestVersion: number; recordVersion: number; studentId: string; name: string; studentNo: string
  major: string; college: string | null; grade: number; enrollmentStatus: string; title: string
  categoryCode: ProfCounselCategoryCode; date: string | null; start: string; end: string; place: string
  channel: CounselChannel; origin: string; status: string; summary: string; purpose: string
  phone: string; email: string; sex: string; publicComment: string; attachments: CounselAttachment[]
}
export interface ReportFilters {
  category: string; status: string; college: string; major: string; dateFrom: string; dateTo: string
  q: string; searchBy: 'all' | 'name' | 'studentNo' | 'title'
}
export const emptyReportFilters: ReportFilters = { category: '', status: '', college: '', major: '', dateFrom: '', dateTo: '', q: '', searchBy: 'all' }
export function queryProfessorReports(params: ReportFilters & { channel: CounselChannel; page: number; pageSize: number }): Promise<Paginated<ProfessorReport>> {
  const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ''))
  return api(`/professor-counsel?${queryString(query)}`)
}
export function loadProfessorReport(id: string): Promise<ProfessorReport> { return api(`/professor-counsel/${encodeURIComponent(id)}`) }
export interface ProfessorReportWrite {
  studentId: string; categoryCode: ProfCounselCategoryCode; method: '대면' | '비대면'; date: string
  start: string | null; end: string | null; place: string; title: string; summary: string; publicComment: string; fileIds: string[]
}
export async function saveProfessorReport(input: ProfessorReportWrite, existing?: ProfessorReport): Promise<void> {
  if (existing) await api(`/professor-counsel/${encodeURIComponent(existing.id)}`, {
    method: 'PUT', body: JSON.stringify({ ...input, expectedRequestVersion: existing.requestVersion, expectedRecordVersion: existing.recordVersion }),
  })
  else await api('/counsel-records/professor', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(input) })
  await Promise.allSettled([loadCounselRecords(), loadCounselRequests()])
}
export async function deleteProfessorReport(row: ProfessorReport): Promise<void> {
  await api(`/professor-counsel/${encodeURIComponent(row.id)}?expectedVersion=${row.requestVersion}`, { method: 'DELETE' })
  await Promise.allSettled([loadCounselRecords(), loadCounselRequests()])
}
