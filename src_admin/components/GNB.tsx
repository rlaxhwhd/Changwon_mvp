import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LuBell, LuCheck, LuChevronDown, LuLogOut, LuMenu, LuUser, LuUsers, LuX } from 'react-icons/lu'
import NotificationBell from '../../src_v2/components/NotificationBell'
import { getStaffNotifications } from '../data/notifications'
import { getNavSections, getSectionForPath, getActiveChildPath } from './navConfig'
import {
  STAFF_USERS,
  getActiveUser,
  getActiveUserId,
  setActiveUser,
  clearActiveUser,
} from '../data/staff'
import './GNB.css'

// ─────────────────────────────────────────────────────────────────────────
// 상단 네비게이션 — 시안(test_admin_react) 상단바 마크업 그대로.
// 클래스명·구조는 시안을 따르고, 항목은 navConfig(역할 필터) 단일소스에서 온다.
// 좌측 로고는 학생 포털과 같은 것을 쓴다(/logo.png, 164×28) — 시안의 텍스트 워드마크가 아니다.
// 우측 프로필 팝오버에는 데모 계정 전환을 유지한다 — 더미 데이터 전환 수단.
// ─────────────────────────────────────────────────────────────────────────

export default function GNB() {
  const { pathname } = useLocation()
  const user = getActiveUser()
  const activeId = getActiveUserId()
  const sections = getNavSections(user.role)
  const currentSection = getSectionForPath(pathname, sections)

  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // 하위 메뉴는 CSS :hover 로 열린다. 항목을 눌러 이동해도 포인터가 그 자리에 남아
  // 메뉴가 계속 펼쳐져 있었다 → 누른 항목만 접어 두고, 포인터가 벗어나면 푼다.
  const [collapsedNavId, setCollapsedNavId] = useState<string | null>(null)
  const profileRef = useRef<HTMLDivElement | null>(null)

  // 경로가 바뀌면 열려 있던 것들을 닫는다
  useEffect(() => {
    setProfileOpen(false)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!profileOpen && !mobileOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setProfileOpen(false)
      setMobileOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [profileOpen, mobileOpen])

  return (
    <header className={`gnb tadmin-gnb${mobileOpen ? ' mobile-nav-open' : ''}`}>
      <div className="gnb-in">

        {/* 좌측 상단 로고 — 학생 포털 .brand 와 같은 이미지·같은 크기다. */}
        <Link to="/" className="brand" aria-label="DREAMCATCH 홈">
          <img src="/logo.png" alt="국립창원대학교 DREAMCATCH" />
        </Link>

        <nav className="gnb-nav" id="adminTopNavigation" aria-label="주 메뉴">
          {sections.map(section => {
            const active = currentSection?.id === section.id
            const firstPath = section.path ?? section.children[0]?.path ?? '/'
            const activeChildPath = getActiveChildPath(pathname, section)
            const hasSub = section.children.length > 0
            const Icon = section.icon

            return (
              <div
                key={section.id}
                className={`gnb-item${active ? ' is-active' : ''}${hasSub ? ' has-sub' : ''}${collapsedNavId === section.id ? ' is-collapsed' : ''}`}
                onClick={() => setCollapsedNavId(section.id)}
                onMouseLeave={() => setCollapsedNavId(null)}
              >
                <Link
                  to={firstPath}
                  className="gnb-btn"
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon />
                  {section.label}
                  {hasSub && <LuChevronDown className="caret" />}
                </Link>

                {hasSub && (
                  <div className="submenu">
                    {section.children.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`sub-i${child.path === activeChildPath ? ' is-active' : ''}`}
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

        <div className="gnb-user">
          {/* 알림 목록은 데이터 층이 만든다(역할별 범위 격리) — 여기서는 그리기만 한다. */}
          <NotificationBell
            items={getStaffNotifications(user)}
            icon={<LuBell />}
            triggerClassName="icon-btn"
          />

          <div className={`header-profile${profileOpen ? ' open' : ''}`} ref={profileRef}>
            <div className="profile-popover" role="menu" aria-label="사용자 메뉴" aria-hidden={!profileOpen}>
              <div className="profile-popover-head">
                <span className="profile-avatar-icon"><LuUser /></span>
                <span><b>{user.name}</b><small>{user.roleLabel} · {user.dept}</small></span>
              </div>

              <Link to="/settings" className="profile-action" role="menuitem">
                <LuUser />내 프로필
              </Link>

              {/* 더미 데이터 전환 — 역할별 화면을 확인하는 수단이라 유지한다 */}
              <div className="profile-switch">
                <span className="profile-switch-title"><LuUsers />데모 계정 전환</span>
                {STAFF_USERS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`profile-action profile-switch-btn${c.id === activeId ? ' is-on' : ''}`}
                    role="menuitemradio"
                    aria-checked={c.id === activeId}
                    onClick={() => c.id !== activeId && setActiveUser(c.id)}
                  >
                    <b>{c.name}</b><small>{c.roleLabel}</small>
                    {c.id === activeId && <LuCheck className="profile-switch-check" />}
                  </button>
                ))}
              </div>

              <button type="button" className="profile-action logout" role="menuitem" onClick={clearActiveUser}>
                <LuLogOut />로그아웃
              </button>
            </div>

            <button
              type="button"
              className="profile-trigger"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label={`${user.name} 사용자 메뉴`}
              onClick={() => setProfileOpen(v => !v)}
            >
              <span className="profile-avatar-icon"><LuUser /></span>
            </button>
          </div>

          <button
            type="button"
            className="icon-btn gnb-menu"
            aria-label={mobileOpen ? '주 메뉴 닫기' : '주 메뉴 열기'}
            aria-expanded={mobileOpen}
            aria-controls="adminTopNavigation"
            onClick={() => { setProfileOpen(false); setMobileOpen(v => !v) }}
          >
            <LuMenu className="menu-open-icon" />
            <LuX className="menu-close-icon" />
          </button>
        </div>

      </div>
    </header>
  )
}
