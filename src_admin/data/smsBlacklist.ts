import { api, queryString } from '../../shared/api'
import type { Paginated } from './query'

export interface SmsBlockRow {
  studentId: string; studentName: string; studentNo: string; studentMajor: string
  college: string | null; blocked: boolean; version: number
  reason: string | null; updatedAt: string | null
}
export interface SmsBlockEvent {
  id: number; blocked: boolean; reason: string; version: number; actorName: string; occurredAt: string
}
const base = '/system/sms-blacklist'
const pending = new Map<string, Promise<unknown>>()
function read<T>(path: string): Promise<T> {
  const existing = pending.get(path)
  if (existing) return existing as Promise<T>
  const request = api<T>(path).finally(() => pending.delete(path))
  pending.set(path, request)
  return request
}
export function querySmsBlacklist(params: { q: string; page: number; blocked: boolean }) {
  return read<Paginated<SmsBlockRow>>(`${base}?${queryString({ ...params, pageSize: 20 })}`)
}
export function searchSmsStudents(params: { q: string; page: number }) {
  if (!params.q.trim()) return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 20 } as Paginated<SmsBlockRow>)
  return querySmsBlacklist({ ...params, blocked: false })
}
export function changeSmsBlock(row: SmsBlockRow, blocked: boolean, reason: string) {
  return api<SmsBlockRow>(`${base}/${encodeURIComponent(row.studentId)}`, {
    method: 'PUT', body: JSON.stringify({ blocked, reason, expectedVersion: row.version }),
  })
}
export function smsBlockEvents(params: { studentId: string; page: number }) {
  if (!params.studentId) return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 20 } as Paginated<SmsBlockEvent>)
  return read<Paginated<SmsBlockEvent>>(`${base}/${encodeURIComponent(params.studentId)}/events?${queryString({ page: params.page, pageSize: 20 })}`)
}
