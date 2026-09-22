import { api } from './api'
import type { Notice } from '../src_v2/data/notices'
import type { NotificationItem } from '../src_v2/components/NotificationBell'
import type { CounselEvent } from '../src_admin/data/schema/counselEvent'

export const noticeRows: Notice[] = []
/** 최근 23시간 알림만 표시하는 GNB 목록(최신순). */
export const notificationRows: NotificationItem[] = []
export const counselEventRows: CounselEvent[] = []
export const COMMUNICATIONS_EVENT = 'dc:communications-updated'
export let unreadCount = 0
export let hasMoreNotifications = false

// ── 알림 폴링 설계(2026-09-18) ──────────────────────────────────────────────
// GNB 는 60초마다 /notifications/summary(미읽음 수·최신 시각)만 묻는다. 목록은 드롭다운을
// 열 때 캐시를 먼저 표시하고 첫 페이지를 재검증한다. 스크롤도 최근 23시간 안에서만 조회한다.
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
export function withinNotificationWindow(item: NotificationItem, now = Date.now()): boolean {
  const age = now - new Date(item.at).getTime()
  return age >= 0 && age <= WINDOW_MS
}
function readCache(): NotificationItem[] {
  const key = notificationCacheKey()
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { savedAt: string; items: NotificationItem[] }
    if (Date.now() - new Date(parsed.savedAt).getTime() > WINDOW_MS) return []
    return parsed.items.filter(item => withinNotificationWindow(item))
  } catch { return [] }
}
function writeCache(): void {
  const key = notificationCacheKey()
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), items: notificationRows.filter(item => withinNotificationWindow(item)) }))
  } catch { /* 저장 공간 부족 등 — 캐시는 없어도 동작한다 */ }
}
export function clearNotificationCache(): void {
  const key = notificationCacheKey()
  if (key) localStorage.removeItem(key)
  notificationRows.splice(0, notificationRows.length)
  unreadCount = 0
  hasMoreNotifications = false
  nextPage = 1
  readThrough = null
}
function byRecent(a: NotificationItem, b: NotificationItem): number {
  return b.at.localeCompare(a.at) || a.id.localeCompare(b.id)
}
/** 서버 응답을 현재 목록에 합친다 — id 로 중복 제거, 최신순 정렬. */
function mergeRows(items: NotificationItem[]): void {
  const seen = new Map(notificationRows.map(item => [item.id, item]))
  for (const item of items) seen.set(item.id, item)
  const rows = [...seen.values()].filter(item => withinNotificationWindow(item))
  for (const row of rows) {
    if (!row.readAt && readThrough && new Date(row.at).getTime() <= Date.parse(readThrough)) row.readAt = readThrough
  }
  notificationRows.splice(0, notificationRows.length, ...rows.sort(byRecent))
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
  mergeRows([])
  notify()
}
let nextPage = 1
let readThrough: string | null = null
let opening: Promise<void> | null = null
let markingAll: Promise<void> | null = null
async function fetchPage(page: number): Promise<Page> {
  const result = await api<Page>(`/notifications?page=${page}&pageSize=${PAGE}`)
  return result
}
/**
 * 캐시는 즉시 표시하되 매번 첫 페이지를 검증하여 다른 기기의 읽음도 반영한다.
 */
export async function openNotifications(): Promise<void> {
  if (opening) return opening
  opening = refreshNotifications().finally(() => { opening = null })
  return opening
}
async function refreshNotifications(): Promise<void> {
  if (notificationRows.length === 0) {
    const cached = readCache()
    if (cached.length) { mergeRows(cached); notify() }
  }
  mergeRows([])
  notify()
  const first = await fetchPage(1)
  notificationRows.splice(0, notificationRows.length)
  mergeRows(first.items)
  nextPage = 2
  hasMoreNotifications = first.hasMore
  writeCache()
  notify()
}
/** 목록의 필터링·중복 제거 여부와 독립적으로 서버 페이지 번호를 관리한다. */
export async function loadMoreNotifications(): Promise<void> {
  if (!hasMoreNotifications) return
  const next = await fetchPage(nextPage)
  nextPage += 1
  mergeRows(next.items)
  hasMoreNotifications = next.hasMore
  writeCache()
  notify()
}
/** 아이콘 클릭 시 현재 수신자의 모든 알림을 한 요청으로 읽음 처리한다. */
export async function markAllNotificationsRead(): Promise<void> {
  if (markingAll) return markingAll
  markingAll = (async () => {
    const { readAt } = await api<{ readAt: string }>('/notifications/read-all', { method: 'POST' })
    readThrough = readAt
    mergeRows([])
    writeCache()
    unreadCount = notificationRows.filter(item => !item.readAt).length
    notify()
    await loadNotificationSummary()
  })().finally(() => { markingAll = null })
  return markingAll
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
