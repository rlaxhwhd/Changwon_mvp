import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_SECTIONS, getSectionForPath, getActiveChildPath, getVisibleNavChildren, type NavChild } from './navConfig'
import { Icon } from './Icon'
import NotificationBell from './NotificationBell'
import { getStudentNotifications } from '../data/notifications'
import { getActiveStudent } from '../data/students'
import { getStageAccess } from '../data/careerProcess'
import { getPipelineState } from '../data/pipeline'
import { api } from '../../shared/api'

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
  const activeId = activeStudent.id
  // 라운지 하위메뉴는 그 페이지의 카드로 가는 앵커다 — 카드가 감춰지면 메뉴도 같이 빠져야 한다.
  const stageAccess = getStageAccess(getPipelineState(activeStudent))
  const myPagePath = activeStudent.grade >= 4 ? '/mypage/portfolio' : '/mypage/programs'

  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  async function logout() {
    try {
      await api('/auth/student/logout', {method:'POST'})
      localStorage.removeItem('dc_active_student')
      location.assign('/login')
    } catch { setLogoutError('로그아웃에 실패했습니다. 다시 시도해 주세요.') }
  }
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
              const visibleChildren = getVisibleNavChildren(section.children, activeStudent.grade, stageAccess)
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
            {/* STAR Track 표식 — 선발형 트랙 대시보드로 가는 진입점.
                NAV_SECTIONS 에는 넣지 않는다(선발된 학생만 쓰는 별도 트랙이라 메뉴 데이터를
                늘리지 않는다). 다만 자리는 메뉴와 같은 flex 줄이어야 한다 — 메뉴 사이 간격은
                space-evenly 가 화면 폭마다 다시 계산하는 값이라, 밖에 두면 「마이페이지」와의
                간격만 따로 놀았다. */}
            <Link to="/star" className="topbar-brandmark-link" title="STAR 트랙 대시보드">
              <img src="/startarck_icon.png" alt="STAR 트랙" className="topbar-brandmark" />
            </Link>
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
                      <small>{activeStudent.grade ? `${activeStudent.grade}학년 · ` : ''}{activeStudent.collegeName ? `${activeStudent.collegeName} / ` : ''}{activeStudent.major}</small>
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
                      <Icon name="user" /> 학번
                    </span>
                    <div className="profile-switch">
                      <strong>{activeStudent.studentNo}</strong>
                    </div>
                  </div>
                  <button type="button" className="profile-action" onClick={() => void logout()}>로그아웃</button>
                  {logoutError && <p role="alert">{logoutError}</p>}
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
                <small>{activeStudent.grade ? `${activeStudent.grade}학년 · ` : ''}{activeStudent.collegeName ? `${activeStudent.collegeName} / ` : ''}{activeStudent.major}</small>
              </div>
              <Link to={myPagePath} className="mobile-profile-link">
                마이페이지 <Icon name="chevron-right" />
              </Link>
            </div>

            <nav aria-label="모바일 주 메뉴">
              {NAV_SECTIONS.map(section => {
                const active = currentSection?.id === section.id
                const visibleChildren = getVisibleNavChildren(section.children, activeStudent.grade, stageAccess)
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
              <button type="button" className="profile-action" onClick={() => void logout()}>로그아웃</button>
              {logoutError && <p role="alert">{logoutError}</p>}
              <span className="profile-section-title">
                <Icon name="user" /> 학번
              </span>
              <div className="profile-switch">
                <strong>{activeStudent.studentNo}</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
