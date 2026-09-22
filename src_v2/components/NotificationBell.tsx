import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../../src_admin/data/counselRequests'
import './NotificationBell.css'
import { COMMUNICATIONS_EVENT, hasMoreNotifications, loadMoreNotifications, loadNotificationSummary, markAllNotificationsRead, markNotificationRead, notificationRows, openNotifications, unreadCount, withinNotificationWindow } from '../../shared/communicationsStore'
import { downloadApiFile } from '../../shared/api'

// ─────────────────────────────────────────────────────────────────────────
// 알림 벨 — 학생 포털(src_v2) · 교직원 포털(src_admin) 공용.
//
// 이 컴포넌트는 목록을 **그리기만** 한다. "무엇이 알림인가"는 각 포털의 데이터 층이 정한다:
//   학생   → src_v2/data/notifications.ts
//   교직원 → src_admin/data/notifications.ts
// 도메인 문구를 여기 박지 않는다 — 제목·본문·링크는 전부 주입받는다.
//
// 목록과 수신자별 읽음 시각은 서버에서 관리한다.
// 폴링은 60초마다 summary(미읽음 수)만, 탭이 숨겨져 있으면 쉰다. 목록은 열 때 받는다
// (최근 23시간만 표시). 아이콘 클릭 시 전체 읽음을 서버에 저장한다.
// 배선은 shared/communicationsStore 가 갖는다 — 여기서는 그리기만 한다.
// ─────────────────────────────────────────────────────────────────────────
const SUMMARY_POLL_MS = 60000

/** 알림 갈래 — 점 색만 정한다. 문구는 데이터 층이 만든다. */
export type NotificationTone = 'counsel' | 'roadmap' | 'diagnosis' | 'job' | 'program'

export interface NotificationItem {
  id: string
  tone: NotificationTone
  /** 한 줄 요약 — "김채원 학생이 상담을 신청했습니다" */
  title: string
  /** 보조 한 줄 (주제·일정 등). 없으면 생략된다. */
  body?: string
  /** 발생 시각 ISO — 정렬과 상대시간 표시의 기준 */
  at: string
  /** 누르면 갈 곳 (SPA 내부 경로) */
  to: string
  readAt?: string | null
}

interface NotificationBellProps {
  items: NotificationItem[]
  /** 벨 아이콘 — 포털마다 아이콘 체계가 달라(스프라이트 / react-icons) 주입받는다. */
  icon: ReactNode
  /** 트리거 버튼 클래스 — 포털의 기존 아이콘 버튼 스타일을 그대로 쓴다. */
  triggerClassName: string
}

// 목록은 10건 높이만 보이고(CSS) 그 아래는 스크롤 — 끝에 닿으면 다음 페이지를 받는다.
export default function NotificationBell({ items, icon, triggerClassName }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const update = () => setRevision(n => n + 1)
    // 숨긴 탭은 묻지 않는다 — 3,000명이 동시에 열어 두는 서비스라 폴링 수가 곧 부하다.
    const poll = () => { if (document.visibilityState === 'hidden') return; void loadNotificationSummary().catch(e => setError((e as Error).message)) }
    const onVisible = () => { if (document.visibilityState === 'visible') poll() }
    window.addEventListener(COMMUNICATIONS_EVENT, update)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(poll, SUMMARY_POLL_MS)
    return () => { window.removeEventListener(COMMUNICATIONS_EVENT, update); document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer) }
  }, [])
  // 열 때만 목록을 받는다 — 캐시가 있으면 즉시 그려지고 신규분만 뒤따라 온다.
  const showNotifications = () => {
    if (open) return
    setOpen(true)
    setError('')
    setLoading(true)
    void openNotifications().catch(e => setError((e as Error).message)).finally(() => setLoading(false))
  }
  const loadMore = (el: HTMLUListElement) => {
    if (loading || !hasMoreNotifications) return
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 24) return
    setLoading(true)
    void loadMoreNotifications().catch(e => setError((e as Error).message)).finally(() => setLoading(false))
  }
  const visibleItems = (revision ? notificationRows : items).filter(item => withinNotificationWindow(item))
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // 마우스를 벗어나면 닫히지만, 키보드·터치로 연 경우를 위해 ESC와 바깥 클릭도 받는다.
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [open])

  return (
    <div
      className="nbell"
      ref={wrapRef}
      onMouseEnter={showNotifications}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`읽지 않은 알림 ${unreadCount}건`}
        onClick={() => {
          showNotifications()
          setError('')
          void markAllNotificationsRead().catch(e => setError((e as Error).message))
        }}
      >
        {icon}
        {unreadCount > 0 && (
          <span className="nbell-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nbell-panel" role="menu" aria-label="알림">
          <div className="nbell-head">
            <strong>알림 · 최근 23시간</strong>
            <span>읽지 않음 {unreadCount}건</span>
            <button type="button" onClick={() => { void downloadApiFile('/notifications/export.csv', 'notifications.csv').catch(e => setError((e as Error).message)) }}>CSV</button>
          </div>

          {error && <p role="alert">{error}</p>}
          {visibleItems.length === 0 ? (
            <p className="nbell-empty">{loading ? '알림을 불러오는 중…' : '새 알림이 없습니다.'}</p>
          ) : (
            <ul className="nbell-list" onScroll={e => loadMore(e.currentTarget)}>
              {visibleItems.map(item => (
                <li key={item.id}>
                  {/* 알림은 "가야 할 곳"이 본체다 — 누르면 그 화면으로 보내고 목록은 닫는다. 읽은 건 회색. */}
                  <Link
                    to={item.to}
                    className={`nbell-item is-${item.tone}${item.readAt ? ' is-read' : ''}`}
                    role="menuitem"
                    onClick={() => { setOpen(false); if (!item.readAt) void markNotificationRead(item.id).catch(e => setError((e as Error).message)) }}
                  >
                    <span className="nbell-dot" aria-hidden="true" />
                    <span className="nbell-text">
                      <strong>{item.readAt ? '' : '● '}{item.title}</strong>
                      {item.body && <small>{item.body}</small>}
                    </span>
                    <time dateTime={item.at}>{formatRelativeTime(item.at)}</time>
                  </Link>
                </li>
              ))}
              {loading && <li className="nbell-more">불러오는 중…</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
