import type { PageId, NavSection } from '../types';

const NAV_SECTIONS: NavSection[] = [
  {
    title: '',
    items: [
      { id: 'dashboard', label: '대시보드', icon: 'fa-solid fa-house' },
    ],
  },
  {
    title: 'AI 진로관리',
    items: [
      { id: 'ai-roadmap', label: 'AI 진로 로드맵', icon: 'fa-solid fa-route' },
      { id: 'ai-prediction', label: '취업예측 분석', icon: 'fa-solid fa-chart-line' },
      { id: 'ai-jobs', label: 'AI 맞춤채용추천', icon: 'fa-solid fa-briefcase' },
      { id: 'ai-evaluation', label: 'AI 종합평가', icon: 'fa-solid fa-star' },
    ],
  },
  {
    title: '진로취업 프로그램',
    items: [
      { id: 'program-apply', label: '프로그램 신청', icon: 'fa-solid fa-clipboard-list' },
      { id: 'career-manage', label: '경력개발 관리', icon: 'fa-solid fa-folder-open' },
      { id: 'program-review', label: '프로그램 후기', icon: 'fa-solid fa-comment-dots' },
    ],
  },
  {
    title: '검사 & 상담신청',
    items: [
      { id: 'nine-core', label: '9CORE 검사', icon: 'fa-solid fa-brain' },
      { id: 'aptitude', label: '인적성검사', icon: 'fa-solid fa-pen-to-square' },
      { id: 'counsel-career', label: '진로상담 신청', icon: 'fa-solid fa-comments' },
      { id: 'counsel-employ', label: '취업·심리상담', icon: 'fa-solid fa-heart-pulse' },
      { id: 'counsel-prof', label: '지도교수 상담', icon: 'fa-solid fa-user-tie' },
    ],
  },
  {
    title: '기업정보',
    items: [
      { id: 'company-info', label: '기업정보 플랫폼', icon: 'fa-solid fa-building' },
    ],
  },
  {
    title: '설정',
    items: [
      { id: 'mypage', label: '마이페이지', icon: 'fa-solid fa-gear' },
    ],
  },
];

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-profile">
        <div className="avatar">민</div>
        <div className="name">김민준</div>
        <div className="dept">컴퓨터공학과 2학년</div>
      </div>
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, si) => (
          <div className="nav-section" key={si}>
            {section.title && <div className="nav-section-title">{section.title}</div>}
            {section.items.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <i className={item.icon} />
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
