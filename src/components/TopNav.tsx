import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface NavChild {
  label: string;
  path: string;
}
interface NavGroup {
  label: string;
  path?: string;
  children?: NavChild[];
}

const NAV: NavGroup[] = [
  {
    label: '소개',
    children: [
      { label: '학생 진로취업지원체계', path: '/intro/support' },
      { label: '취업전략센터 소개', path: '/intro/center' },
      { label: '대학일자리플러스센터', path: '/intro/plus' },
      { label: '찾아오시는 길', path: '/intro/location' },
      { label: '업무안내', path: '/intro/work' },
    ],
  },
  {
    label: '진단센터',
    children: [
      { label: '진로취업진단 (9CORE·CARES)', path: '/diagnosis/career' },
      { label: '성격심리진단 (인적성·MBTI)', path: '/diagnosis/personality' },
    ],
  },
  {
    label: '전문상담신청',
    children: [
      { label: '진로취업상담신청', path: '/counsel/career' },
      { label: '심리상담', path: '/counsel/psych' },
      { label: '교수상담', path: '/counsel/prof' },
    ],
  },
  {
    label: '역량개발센터',
    children: [
      { label: '프로그램 신청', path: '/program/apply' },
      { label: '경력개발 관리', path: '/program/manage' },
      { label: '프로그램 후기', path: '/program/review' },
    ],
  },
  {
    label: '경력개발로드맵',
    children: [
      { label: 'AI진로로드맵', path: '/roadmap' },
      { label: '취업예측분석', path: '/roadmap/prediction' },
      { label: 'AI맞춤채용추천', path: '/roadmap/jobs' },
      { label: 'AI자소서/인터뷰', path: '/roadmap/resume' },
    ],
  },
  {
    label: 'AI커리어라운지',
    path: '/lounge',
  },
  {
    label: '취업지원',
    children: [
      { label: '채용공고', path: '/jobs/posting' },
      { label: '워크넷 채용공고', path: '/jobs/worknet' },
      { label: '청년고용정책', path: '/jobs/policy' },
    ],
  },
  {
    label: '마이페이지',
    children: [
      { label: '마이홈', path: '/my/home' },
      { label: '포트폴리오관리', path: '/my/portfolio' },
      { label: '역량프로그램현황', path: '/my/programs' },
      { label: '상담현황', path: '/my/counsel' },
      { label: '마일리지 현황', path: '/my/mileage' },
      { label: 'AI종합평가', path: '/my/evaluation' },
    ],
  },
];

interface Props {
  onToast: (msg: string) => void;
}

export default function TopNav({ onToast }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenIdx(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="nav-top">
      <div className="nav-top-inner" ref={navRef}>
        <div className="nav-logo" onClick={() => navigate('/home')}>
          <div className="nav-logo-mark">
            <i className="fa-solid fa-rocket" />
          </div>
          <div className="nav-logo-text">
            <small>CAREER MISSION CONTROL</small>
            <strong>DREAMCATCH</strong>
          </div>
        </div>

        <div className="nav-menu">
          {NAV.map((group, idx) => {
            if (group.path) {
              return (
                <NavLink
                  key={idx}
                  to={group.path}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {group.label}
                </NavLink>
              );
            }
            return (
              <div
                key={idx}
                className={`nav-item${openIdx === idx ? ' active' : ''}`}
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              >
                {group.label}
                {openIdx === idx && group.children && (
                  <div className="nav-dropdown" onClick={(e) => e.stopPropagation()}>
                    {group.children.map((child) => (
                      <div
                        key={child.path}
                        className="nav-dropdown-item"
                        onClick={() => {
                          navigate(child.path);
                          setOpenIdx(null);
                        }}
                      >
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="nav-actions">
          <button
            className="btn-ghost"
            onClick={() => {
              onToast('로그아웃 되었습니다');
              setTimeout(() => navigate('/'), 800);
            }}
          >
            <i className="fa-solid fa-right-from-bracket" /> LOGOUT
          </button>
        </div>
      </div>
    </nav>
  );
}
