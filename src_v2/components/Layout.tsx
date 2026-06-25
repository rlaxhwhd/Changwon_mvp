import { Outlet } from 'react-router-dom'
import GNB from './GNB'
import SectionSidebar from './SectionSidebar'

export default function Layout() {
  return (
    <div className="v2-layout">
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
