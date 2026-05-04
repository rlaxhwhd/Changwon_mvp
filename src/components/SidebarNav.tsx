import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

interface NavChild {
  label: string;
  path: string;
}

interface NavGroup {
  icon: string;
  label: string;
  path?: string;
  children?: NavChild[];
}

const NAV: NavGroup[] = [
  {
    icon: 'fa-regular fa-compass',
    label: '센터 소개',
    children: [
      { label: '학생 진로취업지원체계', path: '/intro/support' },
      { label: '취업지원센터 소개', path: '/intro/center' },
      { label: '대학일자리플러스센터', path: '/intro/plus' },
      { label: '찾아오시는 길', path: '/intro/location' },
      { label: '업무 안내', path: '/intro/work' },
    ],
  },
  {
    icon: 'fa-solid fa-stethoscope',
    label: '진단 센터',
    children: [
      { label: '진로취업진단', path: '/diagnosis/career' },
      { label: '성향 진단', path: '/diagnosis/personality' },
    ],
  },
  {
    icon: 'fa-regular fa-comments',
    label: '상담 신청',
    children: [
      { label: '진로취업상담', path: '/counsel/career' },
      { label: '심리 상담', path: '/counsel/psych' },
      { label: '교수 상담', path: '/counsel/prof' },
    ],
  },
  {
    icon: 'fa-solid fa-rocket',
    label: '미션 프로그램',
    children: [
      { label: '프로그램 신청', path: '/program/apply' },
      { label: '역량 개발 관리', path: '/program/manage' },
      { label: '프로그램 후기', path: '/program/review' },
    ],
  },
  {
    icon: 'fa-solid fa-earth-asia',
    label: '커리어 로드맵',
    children: [
      { label: 'AI 진로 로드맵', path: '/roadmap' },
      { label: '취업 예측 분석', path: '/roadmap/prediction' },
      { label: 'AI 채용 추천', path: '/roadmap/jobs' },
      { label: 'AI 자기소개서', path: '/roadmap/resume' },
    ],
  },
  {
    icon: 'fa-solid fa-satellite-dish',
    label: 'AI 라운지',
    path: '/lounge',
  },
  {
    icon: 'fa-solid fa-briefcase',
    label: '채용 정보',
    children: [
      { label: '채용 공고', path: '/jobs/posting' },
      { label: '워크넷 공고', path: '/jobs/worknet' },
      { label: '청년고용정책', path: '/jobs/policy' },
    ],
  },
  {
    icon: 'fa-regular fa-user',
    label: '마이 페이지',
    children: [
      { label: '내 미션 현황', path: '/my/home' },
      { label: '포트폴리오 관리', path: '/my/portfolio' },
      { label: '참여 프로그램', path: '/my/programs' },
      { label: '상담 현황', path: '/my/counsel' },
      { label: '마일리지 현황', path: '/my/mileage' },
      { label: 'AI 종합 분석', path: '/my/evaluation' },
    ],
  },
];

interface Props {
  onToast: (msg: string) => void;
}

export default function SidebarNav({ onToast }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<number | null>(3);

  return (
    <aside className="sidebar">
      <button className="sidebar-brand" onClick={() => navigate('/home')}>
        <span className="sidebar-brand-mark">
          <i className="fa-solid fa-shuttle-space" />
        </span>
        <span className="sidebar-brand-copy">
          <small>Career Mission Deck</small>
          <strong>DREAMCATCH</strong>
        </span>
      </button>

      <div className="sidebar-profile">
        <div>
          <div className="sidebar-profile-label">현재 항해</div>
          <div className="sidebar-profile-title">성장 궤도 3단계</div>
        </div>
        <div className="sidebar-profile-chip">87 EXP</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((group, idx) => {
          const isChildActive = group.children?.some((child) => location.pathname === child.path) ?? false;
          const isDirectActive = group.path ? location.pathname === group.path : false;
          const isOpen = openGroup === idx || isChildActive || isDirectActive;

          if (group.path) {
            return (
              <NavLink
                key={group.label}
                to={group.path}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <i className={group.icon} />
                <span>{group.label}</span>
              </NavLink>
            );
          }

          return (
            <div key={group.label} className={`sidebar-group${isOpen ? ' expanded' : ''}`}>
              <button
                className={`sidebar-link${isChildActive ? ' active' : ''}`}
                onClick={() => setOpenGroup(isOpen ? null : idx)}
              >
                <i className={group.icon} />
                <span>{group.label}</span>
                <i className={`fa-solid fa-angle-right sidebar-caret${isOpen ? ' open' : ''}`} />
              </button>

              {isOpen && group.children && (
                <div className="sidebar-children">
                  {group.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) => `sidebar-child${isActive ? ' active' : ''}`}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-logout"
          onClick={() => {
            onToast('로그아웃되었습니다.');
            setTimeout(() => navigate('/'), 500);
          }}
        >
          <i className="fa-solid fa-right-from-bracket" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
