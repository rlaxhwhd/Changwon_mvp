import { Outlet } from 'react-router-dom'
import GNB from './GNB'

export default function Layout() {
  return (
    <div className="v2-layout">
      <GNB />
      <main className="v2-main">
        <Outlet />
      </main>
    </div>
  )
}
