import { scheduleOf, saveSchedule } from '../../shared/counselOperationsStore'
import type { AvailabilitySlot, WeekdayKey } from './schema/availability'
export function getAvailability(id: string): AvailabilitySlot[] { return [...scheduleOf(id).available] }
export function getOpenHours(counselorId: string, weekday: WeekdayKey): string[] {
  const hours = new Set<string>()
  for (const slot of getAvailability(counselorId)) {
    if (slot.weekday !== weekday) continue
    const from = Number(slot.start.slice(0, 2))
    const to = Number(slot.end.slice(0, 2))
    if (Number.isNaN(from) || Number.isNaN(to)) continue
    for (let hour = from; hour < to; hour += 1) hours.add(`${String(hour).padStart(2, '0')}:00`)
  }
  return [...hours].sort()
}


export async function setAvailability(id: string, slots: AvailabilitySlot[]): Promise<void> {
  await saveSchedule(id, 'available', slots)
}
export async function addSlot(id: string, weekday: WeekdayKey, start: string, end: string): Promise<string> {
  const slotId = crypto.randomUUID()
  await setAvailability(id, [...getAvailability(id), { id: slotId, weekday, start, end }])
  return slotId
}
export async function removeSlot(id: string, slotId: string): Promise<void> {
  await setAvailability(id, getAvailability(id).filter(s => s.id !== slotId))
}
export type { AvailabilitySlot }
