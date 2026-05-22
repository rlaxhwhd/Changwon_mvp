import { Link, useLocation } from 'react-router-dom'
import { getSectionForPath, getActiveChildPath } from './navConfig'
import './SectionSidebar.css'

export default function SectionSidebar() {
  const { pathname } = useLocation()
  const section = getSectionForPath(pathname)

  if (!section) return null

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
        {section.children.map(item => {
          const active = item.path === activeChildPath
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`section-sidebar-item${active ? ' active' : ''}`}
            >
              <span className="section-sidebar-icon">
                <i className={`fa-solid ${item.icon}`} />
              </span>
              <span>{item.label}</span>
              {active && <i className="fa-solid fa-chevron-right section-sidebar-arrow" />}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
