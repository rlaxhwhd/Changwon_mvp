import { scheduleOf, saveSchedule } from '../../shared/counselOperationsStore'
import type { AvailabilitySlot, WeekdayKey } from './schema/availability'
export function getExcludedHours(id: string): AvailabilitySlot[] { return [...scheduleOf(id).excluded] }
export async function addExcludedSlot(id: string, weekday: WeekdayKey, start: string, end: string): Promise<string> {
  const slotId = crypto.randomUUID()
  await saveSchedule(id, 'excluded', [...getExcludedHours(id), { id: slotId, weekday, start, end }])
  return slotId
}
export async function removeExcludedSlot(id: string, slotId: string): Promise<void> {
  await saveSchedule(id, 'excluded', getExcludedHours(id).filter(s => s.id !== slotId))
}
