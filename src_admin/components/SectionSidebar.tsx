import { LuChevronRight } from 'react-icons/lu'
import { Link, useLocation } from 'react-router-dom'
import { getNavSections, getSectionForPath, getActiveChildPath, type NavChild } from './navConfig'
import BrandLogo from './BrandLogo'
import { getActiveUser } from '../data/staff'
import { getTodaySummary } from '../data/counselRequests'
import './SectionSidebar.css'

function SidebarItem({ item, activeChildPath }: { item: NavChild; activeChildPath?: string }) {
  const active = item.path === activeChildPath
  return (
    <Link
      to={item.path}
      className={`section-sidebar-item${active ? ' active' : ''}`}
    >
      <span className="section-sidebar-icon">
        {(() => { const Icon = item.icon; return <Icon /> })()}
      </span>
      <span>{item.label}</span>
      {active && <LuChevronRight className="section-sidebar-arrow" />}
    </Link>
  )
}

export default function SectionSidebar() {
  const { pathname } = useLocation()
  const user = getActiveUser()
  const sections = getNavSections(user.role)
  const section = getSectionForPath(pathname, sections)

  if (!section || section.children.length === 0) return null

  const activeChildPath = getActiveChildPath(pathname, section)
  const todaySummary = section.id === 'counsel' ? getTodaySummary(user.id) : null

  return (
    <aside className="section-sidebar" aria-label={`${section.label} 하위 메뉴`}>
      <div className="section-sidebar-head">
        <span className="section-sidebar-mark">
          {(() => { const Icon = section.icon; return <Icon /> })()}
        </span>
        <div>
          <h2>{section.label}</h2>
        </div>
      </div>

      <nav className="section-sidebar-nav">
        {section.children.map(item => (
          <div key={item.path} className="section-sidebar-group">
            <SidebarItem item={item} activeChildPath={activeChildPath} />
          </div>
        ))}
      </nav>
      {todaySummary && (
        <section className="section-sidebar-summary" aria-labelledby="counsel-today-summary-title">
          <h3 id="counsel-today-summary-title">오늘의 상담 현황</h3>
          <dl className="section-sidebar-summary-grid">
            <div className="summary-stat"><dt>신청 접수</dt><dd>{todaySummary.total}</dd></div>
            <div className="summary-stat"><dt>오늘 상담</dt><dd>{todaySummary.todaySessions}</dd></div>
            <div className="summary-stat is-accent"><dt>상담 완료</dt><dd>{todaySummary.completed}</dd></div>
            <div className="summary-stat"><dt>취소</dt><dd>{todaySummary.cancelled}</dd></div>
          </dl>
        </section>
      )}
      <BrandLogo className="section-sidebar-logo" alt="" />
    </aside>
  )
}
