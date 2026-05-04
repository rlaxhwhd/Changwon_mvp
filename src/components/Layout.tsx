import { Outlet } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import SpaceBackground from '../scenes/SpaceBackground';

interface Props {
  onToast: (msg: string) => void;
}

export default function Layout({ onToast }: Props) {
  return (
    <>
      <SpaceBackground />
      <div className="app-shell">
        <SidebarNav onToast={onToast} />
        <div className="app-content">
          <main className="app-main">
            <Outlet />
          </main>
          <footer className="footer">
            2026 Changwon National University Career Development Management System
          </footer>
        </div>
      </div>
    </>
  );
}
