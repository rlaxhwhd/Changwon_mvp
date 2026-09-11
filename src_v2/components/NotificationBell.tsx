import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../../src_admin/data/counselRequests'
import './NotificationBell.css'
import { COMMUNICATIONS_EVENT, loadNotifications, markNotificationRead, notificationRows, unreadCount } from '../../shared/communicationsStore'
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
// ─────────────────────────────────────────────────────────────────────────

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

// 건수 상한은 데이터 층이 이미 걸어 둔다(갈래당 4건 · 총 12건). 여기서 또 자르면
// 진단·채용처럼 뒤에 오는 갈래가 통째로 사라진다 → 받은 만큼 그리고 넘치면 스크롤한다.
export default function NotificationBell({ items, icon, triggerClassName }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    const update = () => setRevision(n => n + 1)
    const refresh = () => { void loadNotifications().catch(e => setError((e as Error).message)) }
    window.addEventListener(COMMUNICATIONS_EVENT, update)
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 30000)
    return () => { window.removeEventListener(COMMUNICATIONS_EVENT, update); window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [])
  const visibleItems = revision ? notificationRows : items
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
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`읽지 않은 알림 ${unreadCount}건`}
        onClick={() => setOpen(v => !v)}
      >
        {icon}
        {unreadCount > 0 && (
          <span className="nbell-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nbell-panel" role="menu" aria-label="알림">
          <div className="nbell-head">
            <strong>알림</strong>
            <span>읽지 않음 {unreadCount}건</span>
            <button type="button" onClick={() => { void downloadApiFile('/notifications/export.csv', 'notifications.csv').catch(e => setError((e as Error).message)) }}>CSV</button>
          </div>

          {error && <p role="alert">{error}</p>}
          {visibleItems.length === 0 ? (
            <p className="nbell-empty">새 알림이 없습니다.</p>
          ) : (
            <ul className="nbell-list">
              {visibleItems.map(item => (
                <li key={item.id}>
                  {/* 알림은 "가야 할 곳"이 본체다 — 누르면 그 화면으로 보내고 목록은 닫는다. */}
                  <Link
                    to={item.to}
                    className={`nbell-item is-${item.tone}`}
                    role="menuitem"
                    onClick={() => { setOpen(false); void markNotificationRead(item.id).catch(e => setError((e as Error).message)) }}
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
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
