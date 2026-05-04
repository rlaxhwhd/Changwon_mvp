import type { PageId } from '../types';

interface V5LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
  activePage?: PageId;
}

const sidebarSections = [
  {
    title: 'AI커리어라운지',
    items: [{ id: 'dashboard' as PageId, label: 'AI커리어라운지', icon: 'fa-solid fa-brain' }],
  },
  {
    title: '진단센터',
    items: [
      { id: 'career-diagnosis' as PageId, label: '진로취업진단', icon: 'fa-solid fa-clipboard-check' },
      { id: 'personality-diagnosis' as PageId, label: '성격심리진단', icon: 'fa-solid fa-heart-pulse' },
    ],
  },
  {
    title: '전문상담',
    items: [
      { id: 'counsel-career' as PageId, label: '진로취업상담', icon: 'fa-solid fa-comments' },
      { id: 'counsel-employ' as PageId, label: '심리상담', icon: 'fa-solid fa-hand-holding-heart' },
    ],
  },
  {
    title: '역량개발센터',
    items: [
      { id: 'program-apply' as PageId, label: '프로그램 신청', icon: 'fa-solid fa-calendar-check' },
      { id: 'career-manage' as PageId, label: '경력개발 관리', icon: 'fa-solid fa-folder-open' },
      { id: 'daily-mission' as PageId, label: '오늘의 성장미션', icon: 'fa-solid fa-star' },
    ],
  },
  {
    title: '경력개발 로드맵',
    items: [
      { id: 'ai-roadmap' as PageId, label: 'AI진로로드맵', icon: 'fa-solid fa-route' },
      { id: 'ai-prediction' as PageId, label: '취업예측분석', icon: 'fa-solid fa-chart-pie' },
      { id: 'ai-jobs' as PageId, label: 'AI맞춤채용', icon: 'fa-solid fa-briefcase' },
      { id: 'ai-resume' as PageId, label: 'AI자소서/면접', icon: 'fa-solid fa-file-lines' },
    ],
  },
  {
    title: '취업지원',
    items: [
      { id: 'job-posting' as PageId, label: '채용공고', icon: 'fa-solid fa-bullhorn' },
      { id: 'worknet-jobs' as PageId, label: '워크넷 채용', icon: 'fa-solid fa-building' },
    ],
  },
  {
    title: '마이페이지',
    items: [
      { id: 'my-home' as PageId, label: '마이홈', icon: 'fa-solid fa-house-user' },
      { id: 'my-portfolio' as PageId, label: '포트폴리오', icon: 'fa-solid fa-id-badge' },
      { id: 'my-ai-evaluation' as PageId, label: '역량프로그램현황', icon: 'fa-solid fa-chart-column' },
      { id: 'my-counsel-status' as PageId, label: '상담현황', icon: 'fa-solid fa-comments' },
      { id: 'my-mission-log' as PageId, label: '일일미션기록노트', icon: 'fa-solid fa-book-bookmark' },
      { id: 'mypage' as PageId, label: '내 정보', icon: 'fa-solid fa-user-gear' },
    ],
  },
];

export default function V5Layout({ children, onNavigate, activePage }: V5LayoutProps) {
  return (
    <div className="h6-layout h6-theme-blue">
      <aside className="h6-sidebar">
        <div className="h6-sidebar-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-graduation-cap" />
          <div>
            <div className="h6-sidebar-brand-sub">Talent ON</div>
            <div className="h6-sidebar-brand">DREAMCATCH</div>
          </div>
        </div>

        <nav className="h6-sidebar-nav">
          {sidebarSections.map((sec) => (
            <div key={sec.title} className="h6-nav-section">
              <div className="h6-nav-section-title h6-nav-open">
                <span>{sec.title}</span>
              </div>
              <div className="h6-nav-items">
                {sec.items.map((item) => (
                  <button
                    key={item.id}
                    className={`h6-nav-item ${activePage === item.id ? 'h6-nav-item-active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                  >
                    <i className={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="h6-sidebar-user">
          <div className="h6-user-avatar">
            <i className="fa-solid fa-user" />
          </div>
          <div className="h6-user-info">
            <span className="h6-user-name">김민준</span>
            <span className="h6-user-dept">컴퓨터공학과 · 2학년</span>
          </div>
        </div>
      </aside>

      <div className="h6-main">
        <div className="v5-subpage-topbar">
          <button className="v5-back-btn" onClick={() => onNavigate('home')}>
            <i className="fa-solid fa-arrow-left" /> 홈으로
          </button>
        </div>
        <div className="v5-subpage-content">
          {children}
        </div>
      </div>
    </div>
  );
}
