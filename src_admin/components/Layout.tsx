import { Outlet } from 'react-router-dom'
import GNB from './GNB'
import SectionSidebar from './SectionSidebar'
import Chatbot from './Chatbot'
import ScrollToTop from './ScrollToTop'

export default function Layout() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="admin-layout">
      <ScrollToTop />
      <GNB />
      <main className="admin-main">
        <div className="admin-main-shell">
          <SectionSidebar />
          <div className="admin-content">
            <Outlet />
            <footer className="admin-layout-footer">© {currentYear} Changwon National University</footer>
          </div>
        </div>
      </main>
      <Chatbot />
    </div>
  )
}
