import { scheduleOf, saveSchedule } from '../../shared/counselOperationsStore'
import type { AvailabilitySlot, WeekdayKey } from './schema/availability'
export function getAvailability(id: string): AvailabilitySlot[] { return [...scheduleOf(id).available] }
/** 그 요일의 가능 시각(정시)과 1시간당 상담 인원. 서버 판정(check_personal_schedule)과 같은 규칙이다. */
export function getOpenHours(counselorId: string, weekday: WeekdayKey): { time: string; capacity: number }[] {
  const hours = new Map<string, number>()
  for (const slot of getAvailability(counselorId)) {
    if (slot.weekday !== weekday) continue
    const from = Number(slot.start.slice(0, 2))
    const to = Number(slot.end.slice(0, 2))
    if (Number.isNaN(from) || Number.isNaN(to)) continue
    for (let hour = from; hour < to; hour += 1) hours.set(`${String(hour).padStart(2, '0')}:00`, slot.capacity ?? 1)
  }
  return [...hours].sort(([a], [b]) => a.localeCompare(b)).map(([time, capacity]) => ({ time, capacity }))
}


export async function setAvailability(id: string, slots: AvailabilitySlot[]): Promise<void> {
  await saveSchedule(id, 'available', slots)
}
export async function addSlot(id: string, weekday: WeekdayKey, start: string, end: string, capacity: number): Promise<string> {
  const slotId = crypto.randomUUID()
  await setAvailability(id, [...getAvailability(id), { id: slotId, weekday, start, end, capacity }])
  return slotId
}
export async function removeSlot(id: string, slotId: string): Promise<void> {
  await setAvailability(id, getAvailability(id).filter(s => s.id !== slotId))
}
export type { AvailabilitySlot }
