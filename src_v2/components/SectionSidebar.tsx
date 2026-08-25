import { Link, useLocation } from 'react-router-dom'
import { getSectionForPath, getActiveChildPath, getVisibleNavChildren, type NavChild } from './navConfig'
import { getActiveStudent } from '../data/students'
import './SectionSidebar.css'

function SidebarItem({ item, depth, activeChildPath }: { item: NavChild; depth: number; activeChildPath?: string }) {
  const active = item.path === activeChildPath
  return (
    <Link
      to={item.path}
      className={`section-sidebar-item depth-${depth}${active ? ' active' : ''}`}
    >
      <span className="section-sidebar-icon">
        <i className={`fa-solid ${item.icon}`} />
      </span>
      <span>{item.label}</span>
      {active && <i className="fa-solid fa-chevron-right section-sidebar-arrow" />}
    </Link>
  )
}

export default function SectionSidebar() {
  const { pathname, hash } = useLocation()
  const section = getSectionForPath(pathname)
  const grade = getActiveStudent().grade

  if (!section) return null
  const visibleChildren = getVisibleNavChildren(section.children, grade)
  // children이 0일 때만 숨김 — 진단센터처럼 단일 화면이어도 좌측 네비는 유지
  if (visibleChildren.length === 0) return null

  const visibleSection = { ...section, children: visibleChildren }
  const activeChildPath = getActiveChildPath(pathname, visibleSection, hash)

  return (
    <aside className="section-sidebar" aria-label={`${section.label} 하위 메뉴`}>
      <div className="section-sidebar-head">
        <span className="section-sidebar-mark">
          <i className={`fa-solid ${section.icon}`} />
        </span>
        <div>
          <h2>{section.label}</h2>
        </div>
      </div>

      <nav className="section-sidebar-nav">
        {visibleChildren.map(item => (
          <div key={item.path} className="section-sidebar-group">
            <SidebarItem item={item} depth={0} activeChildPath={activeChildPath} />
            {item.children?.map(sub => (
              <SidebarItem key={sub.path} item={sub} depth={1} activeChildPath={activeChildPath} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
