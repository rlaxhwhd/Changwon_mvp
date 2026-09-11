import { notificationRows } from '../../shared/communicationsStore'
import type { NotificationItem, NotificationTone } from '../../src_v2/components/NotificationBell'
import type { StaffUser } from './schema/staff'
import { getJobById } from './jobsSource'
const PER_TONE = 4
const LIMIT = 12
export function jobLabel(id: string): string { const job = getJobById(id); return job ? `${job.company} · ${job.role}` : '채용공고' }
export function getStaffNotifications(_user: StaffUser): NotificationItem[] { return [...notificationRows] }
export function sortRecentFirst(items: NotificationItem[]): NotificationItem[] {
  const taken = new Map<NotificationTone, number>()
  return items
    .slice()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .filter(item => {
      const count = (taken.get(item.tone) ?? 0) + 1
      taken.set(item.tone, count)
      return count <= PER_TONE
    })
    .slice(0, LIMIT)
}
