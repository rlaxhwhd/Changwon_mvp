import { api } from './api'
import type { Counselor } from '../src_admin/data/schema/counselor'
import type { AvailabilitySlot } from '../src_admin/data/schema/availability'
import type { GroupCounsel } from '../src_admin/data/schema/groupCounsel'
import { getCounselWeek } from '../src_v2/lib/counselCalendar'

type PublicSlot = { staffId: string; date: string; start: string; end: string; available: boolean }
let publicSlots: PublicSlot[] = []
/** 지금 들고 있는 슬롯이 어느 주(월요일 ISO)의 것인지 — 학생 화면이 주를 넘겨 본다. */
let publicSlotWeek = ''
let slotTicket = 0
/** 슬롯을 다시 읽었다 — 상담 신청 화면들이 다시 그린다. */
export const COUNSEL_SLOTS_EVENT = 'dc:counsel-slots-updated'
export const loadedSlotWeek = () => publicSlotWeek
/** start 를 생략하면 이번 주. 주를 빠르게 넘겨도 마지막 요청의 결과만 남긴다. */
export async function loadPublicSlots(start: string = getCounselWeek()[0].iso): Promise<void> {
  const ticket = ++slotTicket
  const items = (await api<{ items: PublicSlot[] }>(`/counsel-slots?startDate=${start}&days=5`)).items
  if (ticket !== slotTicket) return
  publicSlots = items
  publicSlotWeek = start
  window.dispatchEvent(new Event(COUNSEL_SLOTS_EVENT))
}
export function slotAvailable(staffId: string, date: string, start: string): boolean {
  return publicSlots.some(s => s.staffId === staffId && s.date === date && s.start === start && s.available)
}

export const counselorProfiles: (Counselor & { version: number })[] = []
export const groupSessions: (GroupCounsel & { version: number })[] = []
type Schedule = { version: number; available: AvailabilitySlot[]; excluded: AvailabilitySlot[] }
const schedules = new Map<string, Schedule>()
export async function loadCounselorProfiles(): Promise<void> {
  const rows = await api<(Counselor & { version: number })[]>('/counselor-profiles')
  counselorProfiles.splice(0, counselorProfiles.length, ...rows)
}
export async function loadSchedule(id: string): Promise<void> {
  schedules.set(id, await api<Schedule>(`/counsel-schedules/${encodeURIComponent(id)}`))
}
export function scheduleOf(id: string): Schedule {
  return schedules.get(id) ?? { version: 0, available: [], excluded: [] }
}
export async function saveSchedule(id: string, kind: 'available' | 'excluded', slots: AvailabilitySlot[]): Promise<void> {
  const current = schedules.get(id)
  if (!current) throw new Error('시간대를 먼저 조회해 주세요.')
  const row = await api<Schedule>(`/counsel-schedules/${encodeURIComponent(id)}/${kind}`, {
    method: 'PUT', body: JSON.stringify({ expectedVersion: current.version, slots }),
  })
  schedules.set(id, row)
}
export async function loadGroups(): Promise<void> {
  const rows: (GroupCounsel & { version: number })[] = []
  for (let page = 1; ; page++) {
    const result = await api<{ items: typeof rows; totalCount: number }>(`/group-counsels?page=${page}&pageSize=100`)
    rows.push(...result.items)
    if (!result.items.length || rows.length >= result.totalCount) break
  }
  groupSessions.splice(0, groupSessions.length, ...rows)
}
function storeGroup(row: GroupCounsel & { version: number }): GroupCounsel {
  const index = groupSessions.findIndex(r => r.id === row.id)
  if (index < 0) groupSessions.push(row)
  else groupSessions[index] = row
  return row
}
export async function createGroup(input: GroupCounsel): Promise<GroupCounsel> {
  const { title, topic, date, start, end, place, capacity, testCode } = input
  return storeGroup(await api<GroupCounsel & { version: number }>('/group-counsels', {
    method: 'POST', body: JSON.stringify({ title, topic, date, start, end, place, capacity, testCode }),
  }))
}
export async function groupAction(id: string, action: string, fields: object): Promise<GroupCounsel> {
  const current = groupSessions.find(r => r.id === id)
  if (!current) throw new Error('회차를 다시 조회해 주세요.')
  return storeGroup(await api<GroupCounsel & { version: number }>(`/group-counsels/${encodeURIComponent(id)}/${action}`, {
    method: 'POST', body: JSON.stringify({ ...fields, expectedVersion: current.version }),
  }))
}
