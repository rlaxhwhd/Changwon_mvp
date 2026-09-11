import { counselEventRows } from '../../shared/communicationsStore'
import type { CounselEvent } from './schema/counselEvent'
// The server appends events atomically with counseling state changes.
export function getCounselEvents(): CounselEvent[] { return [...counselEventRows] }
export function getEventsByRequest(requestId: string): CounselEvent[] {
  return counselEventRows.filter(e => e.requestId === requestId).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
}
export function getCancelReason(requestId: string): CounselEvent | undefined {
  return getEventsByRequest(requestId).filter(e => e.kind === '취소').at(-1)
}
export function countReassigns(requestId: string): number {
  return getEventsByRequest(requestId).filter(e => e.kind === '재배정').length
}
export type { CounselEvent, CounselEventKind } from './schema/counselEvent'
