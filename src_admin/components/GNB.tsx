import { LuCheck, LuChevronDown, LuChevronRight, LuContact, LuUsers } from 'react-icons/lu'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getNavSections, getSectionForPath, getActiveChildPath } from './navConfig'
import {
  COUNSELORS,
  getActiveCounselor,
  getActiveCounselorId,
  setActiveCounselor,
} from '../data/counselors'

export default function GNB() {
  const { pathname } = useLocation()
  const counselor = getActiveCounselor()
  const activeId = getActiveCounselorId()
  const sections = getNavSections(counselor.role)
  const currentSection = getSectionForPath(pathname, sections)

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!profileOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [profileOpen])

  return (
    <header className="gnb">
      <Link to="/" className="gnb-logo" aria-label="국립창원대학교 상담사 포털 홈">
        <img src="/symbol.png" alt="" className="gnb-logo-symbol" />
        <img src="/initiallogo_vertical_kor.png" alt="CWNU 국립창원대학교" className="gnb-logo-wordmark" />
      </Link>

      <nav className="gnb-nav" aria-label="주요 메뉴">
        {sections.map(section => {
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
        <div className={`gnb-profile ${profileOpen ? 'is-open' : ''}`} ref={profileRef}>
          <button
            type="button"
            className="gnb-profile-trigger"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen(v => !v)}
            title={`${counselor.name} 메뉴`}
          >
            <span className="gnb-profile-name">
              <strong>{counselor.name}</strong>
              <small>{counselor.roleLabel}</small>
            </span>
            <LuChevronDown className="gnb-avatar-caret" aria-hidden="true" />
          </button>
          {profileOpen && (
            <div className="gnb-profile-menu" role="menu">
              <div className="gnb-profile-head">
                <div className="gnb-profile-meta">
                  <strong>{counselor.name}</strong>
                  <small>{counselor.roleLabel} · {counselor.dept}</small>
                </div>
              </div>

              <Link
                to="/settings"
                className="gnb-profile-link"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
              >
                <LuContact />
                <span>내 프로필·설정</span>
                <LuChevronRight className="gnb-profile-link-arrow" />
              </Link>

              <div className="gnb-profile-section">
                <span className="gnb-profile-section-title">
                  <LuUsers /> 데모 상담사 전환
                </span>
                <div className="gnb-profile-switch">
                  {COUNSELORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`gnb-profile-switch-btn${c.id === activeId ? ' active' : ''}`}
                      onClick={() => c.id !== activeId && setActiveCounselor(c.id)}
                      role="menuitemradio"
                      aria-checked={c.id === activeId}
                    >
                      <strong>{c.name}</strong>
                      <small>{c.roleLabel}</small>
                      {c.id === activeId && <LuCheck className="gnb-profile-switch-check" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
