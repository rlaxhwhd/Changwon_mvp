import { api } from './api'
import { loadCounselEvents, loadNotifications } from './communicationsStore'
import type { EnrollmentStatus, StudentCounselRequest } from '../src_v2/data/students'
import type { StudentType } from '../src_v2/data/careerProcess'
import type { CounselRecord } from '../src_admin/data/schema/counselRecord'

export type StoredCounselRequest = StudentCounselRequest & {
  studentId: string
  studentNo: string
  studentName: string
  studentMajor: string
  // 신청 시점 스냅샷 — 서버 dto(counsel.py dto)가 내려준다. 교직원 화면은 학생 owner 대신 이것을 읽는다.
  studentGrade?: number
  studentType?: StudentType | null
  studentStatus?: EnrollmentStatus | null
  version: number
}

let requests: StoredCounselRequest[] = []
let records: (CounselRecord & { version: number })[] = []

export function counselRecords(): readonly (CounselRecord & { version: number })[] {
  return records
}

export function storeCounselRecord(record: CounselRecord & { version: number }): void {
  records = [record, ...records.filter(item => item.id !== record.id)]
}

export async function performCounselAction(id: string, action: string, fields: object = {}): Promise<void> {
  const current = requests.find(item => item.id === id)
  if (!current) throw new Error('상담 정보를 다시 조회해 주세요.')
  const saved = await api<StoredCounselRequest>(`/counsel-requests/${encodeURIComponent(id)}/${action}`, {
    method: 'POST', body: JSON.stringify({ ...fields, expectedVersion: current.version }),
  })
  storeCounselRequest(saved)
  await Promise.all([loadCounselEvents(), loadNotifications()])
}

export async function loadCounselRecords(): Promise<void> {
  const result: (CounselRecord & { version: number })[] = []
  let page = 1
  while (true) {
    const response = await api<{ items: (CounselRecord & { version: number })[]; totalCount: number }>(`/counsel-records?page=${page}&pageSize=100`)
    result.push(...response.items)
    if (result.length >= response.totalCount || response.items.length === 0) break
    page += 1
  }
  records = result
}

export function counselRequests(): readonly StoredCounselRequest[] {
  return requests
}

export function storeCounselRequest(request: StoredCounselRequest): void {
  requests = [request, ...requests.filter(item => item.id !== request.id)]
  window.dispatchEvent(new Event('dc:counsel-updated'))
}

/** Compatibility cache for calendar/detail selectors. Inbox lists use pagination.
 * Pages are explicit and bounded by the server's authorized result set.
 */
export async function loadCounselRequests(): Promise<void> {
  const result: StoredCounselRequest[] = []
  let page = 1
  while (true) {
    const response = await api<{ items: StoredCounselRequest[]; totalCount: number }>(`/counsel-requests?page=${page}&pageSize=100`)
    result.push(...response.items)
    if (result.length >= response.totalCount || response.items.length === 0) break
    page += 1
  }
  requests = result
}
