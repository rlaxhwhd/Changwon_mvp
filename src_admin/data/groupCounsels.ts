import { groupSessions, createGroup, groupAction } from '../../shared/counselOperationsStore'
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
