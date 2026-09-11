import { api } from './api'
import type { Notice } from '../src_v2/data/notices'
import type { NotificationItem } from '../src_v2/components/NotificationBell'
import type { CounselEvent } from '../src_admin/data/schema/counselEvent'

export const noticeRows: Notice[] = []
export const notificationRows: NotificationItem[] = []
export const counselEventRows: CounselEvent[] = []
export const COMMUNICATIONS_EVENT = 'dc:communications-updated'
export let unreadCount = 0

export async function loadNotices(): Promise<void> {
  const rows: Notice[] = []
  for (let page = 1; ; page++) {
    const response = await api<{ items: Notice[]; totalCount: number }>(`/notices?page=${page}&pageSize=100`)
    rows.push(...response.items)
    if (!response.items.length || rows.length >= response.totalCount) break
  }
  noticeRows.splice(0, noticeRows.length, ...rows)
}
export async function loadNotifications(): Promise<void> {
  const response = await api<{ items: NotificationItem[]; unreadCount: number }>('/notifications?pageSize=100')
  notificationRows.splice(0, notificationRows.length, ...response.items)
  unreadCount = response.unreadCount
  window.dispatchEvent(new Event(COMMUNICATIONS_EVENT))
}
export async function markNotificationRead(id: string): Promise<void> {
  await api(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
  await loadNotifications()
}
export async function loadCounselEvents(): Promise<void> {
  const rows: CounselEvent[] = []
  for (let page = 1; ; page++) {
    const response = await api<{ items: CounselEvent[]; totalCount: number }>(`/counsel-events?page=${page}&pageSize=100`)
    rows.push(...response.items)
    if (!response.items.length || rows.length >= response.totalCount) break
  }
  counselEventRows.splice(0, counselEventRows.length, ...rows)
}
