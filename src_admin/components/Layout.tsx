import { Outlet, useLocation } from 'react-router-dom'
import GNB from './GNB'
import SectionSidebar from './SectionSidebar'
import BrandLogo from './BrandLogo'
import Chatbot from './Chatbot'
import ScrollToTop from './ScrollToTop'
import { getNavSections, getSectionForPath } from './navConfig'
import { getActiveUser } from '../data/staff'

export default function Layout() {
  const currentYear = new Date().getFullYear()
  const { pathname } = useLocation()

  // 좌측 하단 브랜드 로고: 섹션 사이드바가 있으면 그 하단에(SectionSidebar), 없으면 여기 푸터 좌측에.
  // → 어떤 화면이든 좌측 하단에 로고가 정확히 하나만 노출된다. (SectionSidebar 노출 조건과 동일)
  const section = getSectionForPath(pathname, getNavSections(getActiveUser().role))
  const sidebarShown = !!(section && section.children.length > 0)

  return (
    <div className="admin-layout">
      <ScrollToTop />
      <GNB />
      <main className="admin-main">
        <div className="admin-main-shell">
          <SectionSidebar />
          <div className="admin-content">
            <Outlet />
            <footer className="admin-layout-footer">
              {!sidebarShown && <BrandLogo className="admin-footer-logo" alt="" />}
              <span>© {currentYear} Changwon National University</span>
            </footer>
          </div>
        </div>
      </main>
      <Chatbot />
    </div>
  )
}
