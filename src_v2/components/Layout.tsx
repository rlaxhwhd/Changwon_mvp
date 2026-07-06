import { Outlet } from 'react-router-dom'
import GNB from './GNB'
import SectionSidebar from './SectionSidebar'
import ScrollToTop from './ScrollToTop'

export default function Layout() {
  return (
    <div className="v2-layout">
      <ScrollToTop />
      <GNB />
      <main className="v2-main">
        <div className="v2-main-shell">
          <SectionSidebar />
          <div className="v2-content">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
