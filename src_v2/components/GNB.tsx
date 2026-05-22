import { Link, useLocation } from 'react-router-dom'
import { NAV_SECTIONS, getSectionForPath, getActiveChildPath } from './navConfig'

export default function GNB() {
  const { pathname } = useLocation()
  const currentSection = getSectionForPath(pathname)

  return (
    <header className="gnb">
      <Link to="/main" className="gnb-logo" aria-label="CWNU 홈">
        <span className="gnb-logo-icon">C</span>
        <span className="gnb-logo-text">CWNU</span>
      </Link>

      <nav className="gnb-nav" aria-label="주요 메뉴">
        {NAV_SECTIONS.map(section => {
          const active = currentSection?.id === section.id
          const firstPath = section.path ?? section.children[0]?.path ?? '/'
          const activeChildPath = getActiveChildPath(pathname, section)

          return (
            <div className="gnb-nav-item" key={section.id}>
              <Link to={firstPath} className={`gnb-nav-link ${active ? 'active' : ''}`}>
                {section.label}
              </Link>
              {section.children.length > 1 && (
                <div className="gnb-dropdown">
                  {section.children.map(child => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`gnb-dropdown-link ${child.path === activeChildPath ? 'active' : ''}`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="gnb-actions">
        <button className="gnb-icon-btn" title="검색" aria-label="검색">
          <i className="fa-solid fa-magnifying-glass" />
        </button>
        <button className="gnb-icon-btn gnb-bell-wrap" title="알림" aria-label="알림">
          <i className="fa-regular fa-bell" />
          <span className="gnb-badge">3</span>
        </button>
        <Link to="/mypage/portfolio" className="gnb-avatar" title="마이페이지" aria-label="마이페이지">
          김
        </Link>
        <i className="fa-solid fa-chevron-down gnb-avatar-caret" aria-hidden="true" />
      </div>
    </header>
  )
}
