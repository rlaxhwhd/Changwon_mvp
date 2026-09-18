import { api } from './api'
import type { Notice } from '../src_v2/data/notices'
import type { NotificationItem } from '../src_v2/components/NotificationBell'
import type { CounselEvent } from '../src_admin/data/schema/counselEvent'

export const noticeRows: Notice[] = []
/** 드롭다운에 그리는 목록(최신순). 앞부분은 23시간 캐시, 뒤는 스크롤로 더 받은 서버 페이지. */
export const notificationRows: NotificationItem[] = []
export const counselEventRows: CounselEvent[] = []
export const COMMUNICATIONS_EVENT = 'dc:communications-updated'
export let unreadCount = 0
/** 최근 23시간의 미읽음 — 캐시가 서버와 맞는지 볼 때만 쓴다. */
let unreadRecentCount = 0
export let hasMoreNotifications = false

// ── 알림 폴링 설계(2026-09-18) ──────────────────────────────────────────────
// GNB 는 60초마다 /notifications/summary(미읽음 수·최신 시각)만 묻는다. 목록은 드롭다운을
// 열 때 받되, 최근 23시간분은 localStorage 에 사용자별로 캐시해 두고 그 이후 신규분만
// since= 로 받는다(delta). 다른 기기에서 읽어 배지와 캐시의 미읽음 수가 어긋나면 창 전체를
// 다시 받는다. 23시간 밖 알림은 캐시에서 빠지고, 스크롤 끝에서 서버 페이지로 이어서 본다.
// 읽음의 정본은 서버(dc.notification_read)다 — 캐시는 목록 사본일 뿐이다.
const WINDOW_MS = 23 * 60 * 60 * 1000
const PAGE = 20

function currentUserId(): string | null {
  return localStorage.getItem(location.pathname.startsWith('/admin') ? 'dc_active_staff' : 'dc_active_student')
}
export function notificationCacheKey(): string | null {
  const id = currentUserId()
  return id ? `dc_notifications:${id}` : null
}
function withinWindow(item: NotificationItem, now = Date.now()): boolean {
  return now - new Date(item.at).getTime() <= WINDOW_MS
}
function readCache(): NotificationItem[] {
  const key = notificationCacheKey()
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { savedAt: string; items: NotificationItem[] }
    if (Date.now() - new Date(parsed.savedAt).getTime() > WINDOW_MS) return []
    return parsed.items.filter(item => withinWindow(item))
  } catch { return [] }
}
function writeCache(): void {
  const key = notificationCacheKey()
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), items: notificationRows.filter(item => withinWindow(item)) }))
  } catch { /* 저장 공간 부족 등 — 캐시는 없어도 동작한다 */ }
}
export function clearNotificationCache(): void {
  const key = notificationCacheKey()
  if (key) localStorage.removeItem(key)
  notificationRows.splice(0, notificationRows.length)
  unreadCount = 0
  hasMoreNotifications = false
  pagedOnce = false
}
function byRecent(a: NotificationItem, b: NotificationItem): number {
  return b.at.localeCompare(a.at) || a.id.localeCompare(b.id)
}
/** 서버 응답을 현재 목록에 합친다 — id 로 중복 제거, 최신순 정렬. */
function mergeRows(items: NotificationItem[]): void {
  const seen = new Map(notificationRows.map(item => [item.id, item]))
  for (const item of items) seen.set(item.id, item)
  notificationRows.splice(0, notificationRows.length, ...[...seen.values()].sort(byRecent))
}
function notify(): void {
  window.dispatchEvent(new Event(COMMUNICATIONS_EVENT))
}

export async function loadNotices(): Promise<void> {
  const rows: Notice[] = []
  for (let page = 1; ; page++) {
    const response = await api<{ items: Notice[]; totalCount: number }>(`/notices?page=${page}&pageSize=100`)
    rows.push(...response.items)
    if (!response.items.length || rows.length >= response.totalCount) break
  }
  noticeRows.splice(0, noticeRows.length, ...rows)
}
type Page = { items: NotificationItem[]; hasMore: boolean }

/** 배지용 — 부팅·60초 폴링·읽음 처리 뒤에 부른다. 목록은 건드리지 않는다. */
export async function loadNotificationSummary(): Promise<void> {
  const summary = await api<{ unreadCount: number; unreadRecentCount: number; latestAt: string | null }>('/notifications/summary')
  unreadCount = summary.unreadCount
  unreadRecentCount = summary.unreadRecentCount
  notify()
}
let pagedOnce = false
async function fetchPage(page: number): Promise<Page> {
  const result = await api<Page>(`/notifications?page=${page}&pageSize=${PAGE}`)
  pagedOnce = true
  return result
}
/**
 * 드롭다운을 열 때. 캐시가 있으면 즉시 그리고 신규분만(delta) 받는다.
 * 캐시가 없거나 미읽음 수가 배지와 어긋나면(다른 기기에서 읽음) 첫 페이지를 새로 받는다.
 */
export async function openNotifications(): Promise<void> {
  if (notificationRows.length === 0) {
    const cached = readCache()
    if (cached.length) { mergeRows(cached); notify() }
  }
  const newest = notificationRows[0]
  if (newest) {
    const delta = await api<Page>(`/notifications?since=${encodeURIComponent(new Date(newest.at).toISOString())}`)
    mergeRows(delta.items)
    // 캐시만 있고 서버 페이지를 한 번도 안 받았으면 더 있는지 모른다 — 스크롤 끝에서 서버가 답한다.
    if (!pagedOnce) hasMoreNotifications = true
  }
  // 신규분을 합친 뒤에도 미읽음 수가 배지와 다르면 다른 기기에서 읽은 것이다 — 창 전체를 다시 받는다.
  const cachedUnread = notificationRows.filter(item => !item.readAt && withinWindow(item)).length
  if (!newest || cachedUnread !== unreadRecentCount) {
    const first = await fetchPage(1)
    notificationRows.splice(0, notificationRows.length)
    mergeRows(first.items)
    hasMoreNotifications = first.hasMore
  }
  writeCache()
  notify()
}
/** 스크롤 끝 — 지금 목록 길이 다음 페이지를 받는다. 캐시와 겹치는 행은 id 로 걸러진다. */
export async function loadMoreNotifications(): Promise<void> {
  if (!hasMoreNotifications) return
  const page = Math.floor(notificationRows.length / PAGE) + 1
  const next = await fetchPage(page)
  mergeRows(next.items)
  hasMoreNotifications = next.hasMore
  notify()
}
export async function markNotificationRead(id: string): Promise<void> {
  const { readAt } = await api<{ readAt: string }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
  const row = notificationRows.find(item => item.id === id)
  if (row) { row.readAt = readAt; writeCache() }
  await loadNotificationSummary()
}
export async function loadCounselEvents(requestId?: string): Promise<void> {
  const rows: CounselEvent[] = []
  for (let page = 1; ; page++) {
    const response = await api<{ items: CounselEvent[]; totalCount: number }>(`/counsel-events?page=${page}&pageSize=100${requestId ? `&requestId=${encodeURIComponent(requestId)}` : ''}`)
    rows.push(...response.items)
    if (!response.items.length || rows.length >= response.totalCount) break
  }
  const retained = requestId ? counselEventRows.filter(row => row.requestId !== requestId) : []
  counselEventRows.splice(0, counselEventRows.length, ...retained, ...rows)
}
