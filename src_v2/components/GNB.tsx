import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_SECTIONS, getSectionForPath, getActiveChildPath, getVisibleNavChildren, type NavChild } from './navConfig'
import { Icon } from './Icon'
import NotificationBell from './NotificationBell'
import { getStudentNotifications } from '../data/notifications'
import { STUDENTS, getActiveStudent, getActiveStudentId, setActiveStudent } from '../data/students'

/** 드롭다운/모바일 하위 링크 — 중첩(depth 1)까지 평탄화해 렌더한다. */
function SubLinks({
  items,
  activeChildPath,
  className,
  onNavigate,
}: {
  items: NavChild[]
  activeChildPath?: string
  className: string
  onNavigate?: () => void
}) {
  return (
    <>
      {items.map(child => (
        <div key={child.path}>
          <Link
            to={child.path}
            className={`${className}${child.path === activeChildPath ? ' active' : ''}`}
            onClick={onNavigate}
          >
            {child.label}
          </Link>
          {child.children?.map(sub => (
            <Link
              key={sub.path}
              to={sub.path}
              className={`${className} depth-1${sub.path === activeChildPath ? ' active' : ''}`}
              onClick={onNavigate}
            >
              {sub.label}
            </Link>
          ))}
        </div>
      ))}
    </>
  )
}

export default function GNB() {
  const { pathname, hash } = useLocation()
  const currentSection = getSectionForPath(pathname)
  const activeStudent = getActiveStudent()
  const activeId = getActiveStudentId()
  const myPagePath = activeStudent.grade >= 4 ? '/mypage/portfolio' : '/mypage/programs'

  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // 하위 메뉴는 CSS :hover 로 열린다. 항목을 눌러 이동해도 포인터가 그 자리에 남아
  // 메뉴가 계속 펼쳐져 있었다 → 누른 그룹만 접어 두고, 포인터가 그 그룹을 벗어나면 푼다.
  // 그룹 단위라 옆 메뉴로 옮기면 정상적으로 다시 열린다.
  const [collapsedNavId, setCollapsedNavId] = useState<string | null>(null)
  const profileRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileBtnRef = useRef<HTMLButtonElement | null>(null)

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

  // 모바일 메뉴 — 바깥 클릭/ESC로 닫기 + 라우트 변경 시 자동 닫기
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !mobileMenuRef.current?.contains(target) &&
        !mobileBtnRef.current?.contains(target)
      ) setMobileMenuOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/main" className="brand" aria-label="DREAMCATCH 홈">
            <img src="/logo.png" alt="국립창원대학교 DREAMCATCH" />
          </Link>

          <nav className="top-nav" id="topNavigation" aria-label="주 메뉴">
            {NAV_SECTIONS.map(section => {
              const active = currentSection?.id === section.id
              const visibleChildren = getVisibleNavChildren(section.children, activeStudent.grade)
              const firstPath = section.path ?? visibleChildren[0]?.path ?? '/'
              const activeChildPath = getActiveChildPath(pathname, { ...section, children: visibleChildren }, hash)

              return (
                <div
                  className={`nav-group${collapsedNavId === section.id ? ' is-collapsed' : ''}`}
                  key={section.id}
                  onClick={() => setCollapsedNavId(section.id)}
                  onMouseLeave={() => setCollapsedNavId(null)}
                >
                  <Link to={firstPath} className={`nav-item${active ? ' active' : ''}`}>
                    <Icon name={section.icon} />
                    {section.label}
                  </Link>
                  {visibleChildren.length > 1 && (
                    <div className="nav-dropdown">
                      <SubLinks
                        items={visibleChildren}
                        activeChildPath={activeChildPath}
                        className="nav-dropdown-link"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="topbar-right">
            {/* 알림 목록은 데이터 층이 만든다 — 여기서는 그리기만 한다. */}
            <NotificationBell
              items={getStudentNotifications(activeId)}
              icon={<Icon name="bell" />}
              triggerClassName="icon-button"
            />

            <div className={`header-profile${profileOpen ? ' is-open' : ''}`} ref={profileRef}>
              <button
                type="button"
                className="profile-trigger"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(v => !v)}
                title={`${activeStudent.name} 메뉴`}
              >
                <span className="profile-avatar-icon">
                  <img src="/student-profile.png" alt="" />
                </span>
                <Icon name="chevron-down" className="profile-caret" />
              </button>

              {profileOpen && (
                <div className="profile-popover" role="menu">
                  <div className="profile-popover-head">
                    <span className="profile-avatar-icon">
                      <img src="/student-profile.png" alt="" />
                    </span>
                    <div className="profile-popover-meta">
                      <strong>{activeStudent.name}</strong>
                      <small>{activeStudent.grade}학년 · {activeStudent.major}</small>
                    </div>
                  </div>

                  <Link
                    to={myPagePath}
                    className="profile-action"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Icon name="user" />
                    <span>마이페이지</span>
                    <Icon name="chevron-right" />
                  </Link>

                  <div className="profile-section">
                    <span className="profile-section-title">
                      <Icon name="user" /> 데모 학생 전환
                    </span>
                    <div className="profile-switch">
                      {STUDENTS.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          className={`profile-switch-btn${s.id === activeId ? ' active' : ''}`}
                          onClick={() => s.id !== activeId && setActiveStudent(s.id)}
                          role="menuitemradio"
                          aria-checked={s.id === activeId}
                        >
                          <strong>{s.name}</strong>
                          <small>{s.grade}학년 · {s.major}</small>
                          {s.id === activeId && <Icon name="check" className="profile-switch-check" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              ref={mobileBtnRef}
              type="button"
              className="icon-button mobile-menu-toggle"
              aria-label="메뉴 열기"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              <Icon name={mobileMenuOpen ? 'x' : 'menu'} />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <div className="mobile-backdrop" aria-hidden="true" />
          <div
            id="mobile-menu"
            ref={mobileMenuRef}
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="전체 메뉴"
          >
            <div className="mobile-profile">
              <span className="profile-avatar-icon">
                <img src="/student-profile.png" alt="" />
              </span>
              <div className="profile-popover-meta">
                <strong>{activeStudent.name}</strong>
                <small>{activeStudent.grade}학년 · {activeStudent.major}</small>
              </div>
              <Link to={myPagePath} className="mobile-profile-link">
                마이페이지 <Icon name="chevron-right" />
              </Link>
            </div>

            <nav aria-label="모바일 주 메뉴">
              {NAV_SECTIONS.map(section => {
                const active = currentSection?.id === section.id
                const visibleChildren = getVisibleNavChildren(section.children, activeStudent.grade)
                const firstPath = section.path ?? visibleChildren[0]?.path ?? '/'
                const activeChildPath = getActiveChildPath(pathname, { ...section, children: visibleChildren }, hash)

                return (
                  <div className="mobile-section" key={section.id}>
                    <Link to={firstPath} className={`mobile-section-link${active ? ' active' : ''}`}>
                      <Icon name={section.icon} />
                      {section.label}
                      <Icon name="chevron-right" className="nav-arrow" />
                    </Link>
                    {visibleChildren.length > 1 && (
                      <div className="mobile-sublinks">
                        <SubLinks
                          items={visibleChildren}
                          activeChildPath={activeChildPath}
                          className="mobile-sublink"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            <div className="mobile-switch">
              <span className="profile-section-title">
                <Icon name="user" /> 데모 학생 전환
              </span>
              <div className="profile-switch">
                {STUDENTS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`profile-switch-btn${s.id === activeId ? ' active' : ''}`}
                    onClick={() => s.id !== activeId && setActiveStudent(s.id)}
                  >
                    <strong>{s.name}</strong>
                    <small>{s.grade}학년 · {s.major}</small>
                    {s.id === activeId && <Icon name="check" className="profile-switch-check" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
