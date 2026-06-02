import { Link, useLocation } from 'react-router-dom'
import { getSectionForPath, getActiveChildPath, type NavChild } from './navConfig'
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
  const { pathname } = useLocation()
  const section = getSectionForPath(pathname)

  if (!section) return null
  // 1-depth 섹션에 sub-page가 1개 이하면 사이드바를 숨겨 가로 공간 회수
  if (section.children.length <= 1) return null

  const activeChildPath = getActiveChildPath(pathname, section)

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
        {section.children.map(item => (
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
