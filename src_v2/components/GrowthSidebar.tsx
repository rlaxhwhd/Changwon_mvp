import { Link, useLocation } from 'react-router-dom'
import './GrowthSidebar.css'

export interface GrowthNavItem {
  label: string
  path: string
  icon: string
}

interface Props {
  /** 페이지 current path (optional — 기본값: useLocation().pathname) */
  activePath?: string
}

const NAV_ITEMS: GrowthNavItem[] = [
  { label: '홈 대시보드',       path: '/growth',               icon: 'fa-house' },
  { label: '비교과프로그램 신청', path: '/growth/program',       icon: 'fa-clipboard-list' },
  { label: '퀘스트보드',        path: '/growth/quest',          icon: 'fa-list-check' },
  { label: '성장경험일지',       path: '/growth/journal',        icon: 'fa-book-open' },
]

export default function GrowthSidebar({ activePath }: Props) {
  const { pathname } = useLocation()
  const current = activePath ?? pathname

  return (
    <aside className="gsb-sidebar">

      <div className="gsb-header">
        <span className="gsb-header-accent" />
        <span className="gsb-header-title">역량 강화</span>
      </div>

      <nav className="gsb-nav">
        {NAV_ITEMS.map(item => {
          const active = current === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`gsb-item${active ? ' active' : ''}`}
            >
              <span className={`gsb-icon-box${active ? ' active' : ''}`}>
                <i className={`fa-solid ${item.icon}`} />
              </span>
              <span className="gsb-item-label">{item.label}</span>
              {active && <i className="fa-solid fa-chevron-right gsb-item-arrow" />}
            </Link>
          )
        })}
      </nav>

      <div className="gsb-divider" />

      {/* User Progress Card */}
      <div className="gsb-card">
        <div className="gsb-level-row">
          <span className="gsb-level-badge">Lv.7</span>
          <span className="gsb-level-name">역량 탐험가</span>
          <span className="gsb-streak">🔥 7일</span>
        </div>

        <div className="gsb-xp-meta">
          <span>경험치</span>
          <span>2,340 / 3,000 XP</span>
        </div>
        <div className="gsb-xp-bar">
          <div className="gsb-xp-fill" style={{ width: '78%' }} />
        </div>

        <div className="gsb-stats">
          <div className="gsb-stat-box">
            <span className="gsb-stat-box-val">2/5</span>
            <span className="gsb-stat-box-label">오늘 퀘스트</span>
          </div>
          <div className="gsb-stat-box">
            <span className="gsb-stat-box-val">12</span>
            <span className="gsb-stat-box-label">경험 기록</span>
          </div>
        </div>

        <Link to="/growth/quest" className="gsb-quest-btn">
          퀘스트 보러가기 <i className="fa-solid fa-arrow-right" />
        </Link>
      </div>

    </aside>
  )
}
