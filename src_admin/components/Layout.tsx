import { Outlet } from 'react-router-dom'
import GNB from './GNB'
import SectionSidebar from './SectionSidebar'

export default function Layout() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="admin-layout">
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
    </div>
  )
}
