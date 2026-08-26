import { Outlet } from 'react-router-dom'
import GNB from './GNB'
import BrandLogo from './BrandLogo'
import Chatbot from './Chatbot'
import ScrollToTop from './ScrollToTop'

// 교직원 포털 공통 셸 — 상단바 + 가운데 정렬 본문 + 푸터.
// 좌측 섹션 사이드바는 제거됐다(홈 /admin 과 같은 1단 레이아웃). 하위 메뉴는 GNB 드롭다운이 갖는다.
// 본문 폭·여백은 .admin-page 가 GNB(.gnb-in)와 같은 축에 맞춘다 → index.css 참조.
export default function Layout() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="admin-layout">
      <ScrollToTop />
      <GNB />
      <main className="admin-main">
        <div className="admin-main-shell">
          <div className="admin-content">
            <Outlet />
            <footer className="admin-layout-footer">
              <BrandLogo className="admin-footer-logo" alt="" />
              <span>© {currentYear} Changwon National University</span>
            </footer>
          </div>
        </div>
      </main>
      <Chatbot />
    </div>
  )
}
