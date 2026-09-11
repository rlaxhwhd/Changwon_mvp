"""One-time implementation edit; no runtime use."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def write(path,content): (ROOT/path).write_text(content,encoding='utf-8')
def read(path): return (ROOT/path).read_text(encoding='utf-8')

write('src_admin/data/counselEvents.ts', '''import { counselEventRows } from '../../shared/communicationsStore'
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
''')
write('src_admin/data/excludedHours.ts', '''import { scheduleOf, saveSchedule } from '../../shared/counselOperationsStore'
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
''')
old=read('src_admin/data/availability.ts')
hours=old[old.index('export function getOpenHours'):old.index('function persistAll')]
write('src_admin/data/availability.ts', '''import { scheduleOf, saveSchedule } from '../../shared/counselOperationsStore'
import type { AvailabilitySlot, WeekdayKey } from './schema/availability'
export function getAvailability(id: string): AvailabilitySlot[] { return [...scheduleOf(id).available] }
'''+hours+'''
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
''')
old=read('src_admin/data/counselors.ts')
start=old.index('export function getActiveCounselorId')
end=old.index('/**\n * 활성 상담사 프로필')
write('src_admin/data/counselors.ts', '''import type { Counselor, CounselorRole } from './schema/counselor'
import { canEditRoadmap, canManageJobs, canConfirmIap, handledRequestTypes } from './schema/counselor'
import { getActiveIdRaw, setActiveId, hasActiveSession as hasSession, clearSession } from './session'
import { counselorProfiles, loadCounselorProfiles } from '../../shared/counselOperationsStore'
import { api } from '../../shared/api'
export const COUNSELORS: Counselor[] = counselorProfiles
'''+old[start:end]+'''
export async function updateCounselorProfile(id: string, patch: Partial<Counselor>): Promise<void> {
  const current = counselorProfiles.find(c => c.id === id)
  if (!current) throw new Error('프로필을 다시 조회해 주세요.')
  await api(`/counselor-profiles/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify({ expectedVersion: current.version, name: patch.name ?? current.name,
      dept: patch.dept ?? current.dept, scope: patch.scope ?? current.scope,
      email: patch.email ?? '', officeHours: patch.officeHours ?? '' }),
  })
  await loadCounselorProfiles()
}
export { canEditRoadmap, canManageJobs, canConfirmIap, handledRequestTypes }
export type { Counselor, CounselorRole }
''')
write('src_admin/data/groupCounsels.ts', '''import { groupSessions, createGroup, groupAction } from '../../shared/counselOperationsStore'
import type { GroupCounsel, GroupCounselKind, GroupCounselStatus, GroupMember } from './schema/groupCounsel'
import type { CounselorRole } from './schema/counselor'
export function groupKindOf(role: CounselorRole): GroupCounselKind { return role === 'psych' ? '집단심리검사' : '집단상담' }
export function getGroupCounsels(): GroupCounsel[] { return [...groupSessions] }
export function getGroupCounselsByCounselor(id: string): GroupCounsel[] {
  return groupSessions.filter(g => g.counselorId === id).sort((a, b) => b.date.localeCompare(a.date))
}
export function getGroupCounselById(id: string): GroupCounsel | undefined { return groupSessions.find(g => g.id === id) }
export function getGroupSummary(id: string): Record<GroupCounselStatus | '전체', number> {
  const rows = getGroupCounselsByCounselor(id)
  return { 전체: rows.length, 예정: rows.filter(g => g.status === '예정').length, 완료: rows.filter(g => g.status === '완료').length, 취소: rows.filter(g => g.status === '취소').length }
}
export const upsertGroupCounsel = createGroup
export function addGroupMember(id: string, member: Omit<GroupMember, 'addedAt'>): Promise<GroupCounsel> {
  return groupAction(id, 'add-member', { studentId: member.studentId })
}
export function removeGroupMember(id: string, studentId: string): Promise<GroupCounsel> {
  return groupAction(id, 'remove-member', { studentId })
}
export function completeGroupCounsel(id: string, input: { attendedIds: string[]; summary: string; comment: string }): Promise<GroupCounsel> {
  return groupAction(id, 'complete', input)
}
export function cancelGroupCounsel(id: string, reason: string): Promise<GroupCounsel> {
  return groupAction(id, 'cancel', { reason })
}
export type { GroupCounsel, GroupCounselKind, GroupCounselStatus, GroupMember }
''')
old=read('src_v2/data/notices.ts')
old=old[old.index('export type NoticeCategory'):]
start=old.index('const NOTICES: Notice[] = [')
end=old.index('/** 공지 목록')
old=old[:start]+"const NOTICES = noticeRows\n\n"+old[end:]
write('src_v2/data/notices.ts', "import { noticeRows } from '../../shared/communicationsStore'\n"+old)
write('src_v2/data/notifications.ts', '''import { notificationRows } from '../../shared/communicationsStore'
import type { NotificationItem } from '../components/NotificationBell'
export function getStudentNotifications(_studentId: string): NotificationItem[] { return [...notificationRows] }
''')
# Preserve other exported compatibility helpers if used elsewhere.
old=read('src_admin/data/notifications.ts')
start=old.index('export function sortRecentFirst')
write('src_admin/data/notifications.ts', '''import { notificationRows } from '../../shared/communicationsStore'
import type { NotificationItem, NotificationTone } from '../../src_v2/components/NotificationBell'
import type { StaffUser } from './schema/staff'
import { getJobById } from './jobsSource'
const PER_TONE = 4
const LIMIT = 12
export function jobLabel(id: string): string { const job = getJobById(id); return job ? `${job.company} · ${job.role}` : '채용공고' }
export function getStaffNotifications(_user: StaffUser): NotificationItem[] { return [...notificationRows] }
'''+old[start:])
