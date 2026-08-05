import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_SECTIONS, getSectionForPath, getActiveChildPath } from './navConfig'
import BrandLogo from './BrandLogo'
import { STUDENTS, getActiveStudent, getActiveStudentId, setActiveStudent } from '../data/students'

export default function GNB() {
  const { pathname } = useLocation()
  const currentSection = getSectionForPath(pathname)
  const activeStudent = getActiveStudent()
  const activeId = getActiveStudentId()

  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
    // 메뉴 열림 동안 body 스크롤 잠금
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
      <header className="gnb">
        <Link to="/main" className="gnb-logo" aria-label="드림캐치 홈">
          <BrandLogo className="gnb-logo-img" />
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
          <div className={`gnb-profile ${profileOpen ? 'is-open' : ''}`} ref={profileRef}>
            <button
              type="button"
              className="gnb-profile-trigger"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen(v => !v)}
              title={`${activeStudent.name} 메뉴`}
            >
              <span className="gnb-avatar" aria-hidden="true">
                <img className="gnb-avatar-photo" src="/student-profile.png" alt="" />
              </span>
              <i className="fa-solid fa-chevron-down gnb-avatar-caret" aria-hidden="true" />
            </button>
            {profileOpen && (
              <div className="gnb-profile-menu" role="menu">
                <div className="gnb-profile-head">
                  <img className="gnb-profile-photo" src="/student-profile.png" alt="" />
                  <div className="gnb-profile-meta">
                    <strong>{activeStudent.name}</strong>
                    <small>{activeStudent.grade}학년 · {activeStudent.major}</small>
                  </div>
                </div>

                <Link
                  to="/mypage/portfolio"
                  className="gnb-profile-link"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <i className="fa-regular fa-id-badge" />
                  <span>마이페이지</span>
                  <i className="fa-solid fa-chevron-right gnb-profile-link-arrow" />
                </Link>

                <div className="gnb-profile-section">
                  <span className="gnb-profile-section-title">
                    <i className="fa-solid fa-user-group" /> 데모 학생 전환
                  </span>
                  <div className="gnb-profile-switch">
                    {STUDENTS.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className={`gnb-profile-switch-btn${s.id === activeId ? ' active' : ''}`}
                        onClick={() => s.id !== activeId && setActiveStudent(s.id)}
                        role="menuitemradio"
                        aria-checked={s.id === activeId}
                      >
                        <strong>{s.name}</strong>
                        <small>{s.grade}학년 · {s.major}</small>
                        {s.id === activeId && <i className="fa-solid fa-check gnb-profile-switch-check" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 모바일 전용 햄버거 — 우상단 */}
          <button
            ref={mobileBtnRef}
            type="button"
            className={`gnb-menu-btn${mobileMenuOpen ? ' is-open' : ''}`}
            aria-label="메뉴 열기"
            aria-expanded={mobileMenuOpen}
            aria-controls="gnb-mobile-menu"
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* 모바일 풀스크린 내비게이션 */}
      {mobileMenuOpen && (
        <>
          <div className="gnb-mobile-backdrop" aria-hidden="true" />
          <div
            id="gnb-mobile-menu"
            ref={mobileMenuRef}
            className="gnb-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="전체 메뉴"
          >
            {/* 프로필 + 마이페이지 + 학생 전환 */}
            <div className="gnb-mobile-profile">
              <img className="gnb-profile-photo" src="/student-profile.png" alt="" />
              <div className="gnb-profile-meta">
                <strong>{activeStudent.name}</strong>
                <small>{activeStudent.grade}학년 · {activeStudent.major}</small>
              </div>
              <Link to="/mypage/portfolio" className="gnb-mobile-profile-link">
                마이페이지 <i className="fa-solid fa-chevron-right" />
              </Link>
            </div>

            <nav className="gnb-mobile-nav" aria-label="모바일 주요 메뉴">
              {NAV_SECTIONS.map(section => {
                const active = currentSection?.id === section.id
                const firstPath = section.path ?? section.children[0]?.path ?? '/'
                const activeChildPath = getActiveChildPath(pathname, section)

                return (
                  <div className="gnb-mobile-section" key={section.id}>
                    <Link
                      to={firstPath}
                      className={`gnb-mobile-section-link${active ? ' active' : ''}`}
                    >
                      {section.label}
                      <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    </Link>
                    {section.children.length > 1 && (
                      <div className="gnb-mobile-sublinks">
                        {section.children.map(child => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`gnb-mobile-sublink${child.path === activeChildPath ? ' active' : ''}`}
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

            {/* 데모 학생 전환 — 모바일에서도 유지 */}
            <div className="gnb-mobile-switch">
              <span className="gnb-profile-section-title">
                <i className="fa-solid fa-user-group" /> 데모 학생 전환
              </span>
              <div className="gnb-profile-switch">
                {STUDENTS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`gnb-profile-switch-btn${s.id === activeId ? ' active' : ''}`}
                    onClick={() => s.id !== activeId && setActiveStudent(s.id)}
                  >
                    <strong>{s.name}</strong>
                    <small>{s.grade}학년 · {s.major}</small>
                    {s.id === activeId && <i className="fa-solid fa-check gnb-profile-switch-check" />}
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
