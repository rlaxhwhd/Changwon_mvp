import { useState, useRef, useEffect } from 'react';
import type { PageId } from '../types';

interface CategoryItem {
  id: PageId | '__external__';
  label: string;
  href?: string;
}

interface Category {
  icon: string;
  label: string;
  items: CategoryItem[];
}

const CATEGORIES_V2: Category[] = [
  {
    icon: 'fa-solid fa-building-columns',
    label: '소개',
    items: [
      { id: 'strategy-support', label: '학생 진로취업지원체계' },
      { id: 'strategy-center', label: '취업전략센터 소개' },
      { id: 'strategy-plus', label: '대학일자리플러스센터 소개' },
      { id: 'strategy-location', label: '찾아오시는 길' },
      { id: 'strategy-work', label: '업무안내' },
    ],
  },
  {
    icon: 'fa-solid fa-clipboard-check',
    label: '진단센터',
    items: [
      { id: 'career-diagnosis', label: '진로취업진단 (9CORE·CARES)' },
      { id: 'personality-diagnosis', label: '성격심리진단 (인적성·MBTI)' },
    ],
  },
  {
    icon: 'fa-solid fa-comments',
    label: '전문상담신청',
    items: [
      { id: 'counsel-career', label: '진로취업상담신청' },
      { id: 'counsel-employ', label: '심리상담' },
      { id: 'counsel-prof', label: '교수상담' },
    ],
  },
  {
    icon: 'fa-solid fa-calendar-check',
    label: '역량개발센터',
    items: [
      { id: 'program-apply', label: '프로그램 신청' },
      { id: 'career-manage', label: '경력개발 관리' },
      { id: 'program-review', label: '프로그램 후기' },
    ],
  },
  {
    icon: 'fa-solid fa-route',
    label: '경력개발\n로드맵',
    items: [
      { id: 'ai-roadmap', label: 'AI진로로드맵생성/조회' },
      { id: 'ai-prediction', label: '취업예측분석' },
      { id: 'ai-jobs', label: 'AI맞춤채용추천' },
      { id: 'ai-resume', label: 'AI자소서/인터뷰' },
    ],
  },
  {
    icon: 'fa-solid fa-brain',
    label: 'AI커리어\n라운지',
    items: [
      { id: 'dashboard', label: 'AI커리어라운지' },
    ],
  },
  {
    icon: 'fa-solid fa-briefcase',
    label: '취업지원',
    items: [
      { id: 'job-posting', label: '채용공고' },
      { id: 'worknet-jobs', label: '워크넷 채용공고' },
      { id: 'youth-policy', label: '청년고용정책' },
    ],
  },
  {
    icon: 'fa-solid fa-user-gear',
    label: '마이페이지',
    items: [
      { id: 'my-home', label: '마이홈' },
      { id: 'my-portfolio', label: '포트폴리오관리' },
      { id: 'my-programs', label: '역량프로그램현황' },
      { id: 'my-counsel-status', label: '상담현황' },
      { id: 'my-mileage', label: '마일리지 현황' },
      { id: 'ai-evaluation', label: 'AI종합평가' },
    ],
  },
];

interface TopHeaderProps {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string) => void;
  designVersion: 1 | 2 | 3 | 4 | 5;
  onDesignChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}

export default function TopHeader({ onNavigate, onToast, designVersion, onDesignChange }: TopHeaderProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenIdx(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 모든 디자인 버전에서 v2 구조 사용 (상단 아이콘 순서 · 사이트맵 · 하위페이지 통일)
  const cats = CATEGORIES_V2;

  const handleCategoryClick = (idx: number) => {
    const cat = cats[idx];
    if (cat.items.length === 1) {
      const item = cat.items[0];
      if (item.id === '__external__' && item.href) {
        window.open(item.href, '_blank');
      } else {
        onNavigate(item.id as PageId);
      }
      setOpenIdx(null);
    } else {
      setOpenIdx(openIdx === idx ? null : idx);
    }
  };

  const handleItemClick = (item: CategoryItem) => {
    if (item.id === '__external__' && item.href) {
      window.open(item.href, '_blank');
    } else {
      onNavigate(item.id as PageId);
    }
    setOpenIdx(null);
  };

  const isV3 = designVersion === 3;

  return (
    <header className={`top-header ${isV3 ? 'top-header--v3' : ''}`}>
      {/* ── Logo Bar ── */}
      <div className={`header-bar ${isV3 ? 'header-bar--v3' : ''}`}>
        <div className="header-bar-inner">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="design-switcher">
              {([1, 2, 3, 4, 5] as const).map(v => (
                <button
                  key={v}
                  className={`design-switch-btn ${designVersion === v ? 'active' : ''}`}
                  onClick={() => { onDesignChange(v); onNavigate('landing'); }}
                >
                  {v}번
                </button>
              ))}
            </div>
          </div>
          <div className="header-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
            {isV3 ? (
              <div>
                <div style={{ fontSize: 10, color: isV3 ? '#bbbbbb' : '#6B7280', letterSpacing: 2, lineHeight: 1, textTransform: 'uppercase' }}>학생경력개발관리시스템</div>
                <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: 4, color: '#fff', textTransform: 'uppercase' }}>DREAMCATCH</div>
              </div>
            ) : (
              <>
                <i className="fa-solid fa-graduation-cap" style={{ color: '#4F46E5', fontSize: 20 }} />
                <div>
                  <div style={{ fontSize: 10, color: '#6B7280', letterSpacing: 1, lineHeight: 1 }}>학생경력개발관리시스템</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: '#1F2937' }}>DREAMCATCH</div>
                </div>
              </>
            )}
          </div>
          <button className={`btn btn-sm ${isV3 ? 'btn--v3-logout' : ''}`}
            style={isV3 ? {} : { background: '#22C55E', color: '#fff', borderRadius: 6 }}
            onClick={() => onToast('로그아웃 되었습니다')}>
            <i className="fa-solid fa-right-from-bracket" /> 로그아웃
          </button>
        </div>
      </div>

      {/* ── Navigation ── */}
      {isV3 ? (
        /* BMW-style text navigation bar */
        <div className="text-nav-wrap" ref={dropdownRef}>
          <div className="text-nav">
            {cats.map((cat, idx) => (
              <div key={idx} className={`text-nav-item ${openIdx === idx ? 'active' : ''}`} onClick={() => handleCategoryClick(idx)}>
                <span className="text-nav-link">{cat.label.replace('\n', ' ')}</span>

                {/* Dropdown */}
                {openIdx === idx && cat.items.length > 1 && (
                  <div className="text-nav-dropdown">
                    {cat.items.map((item, ii) => (
                      <div key={ii} className="text-nav-dropdown-item"
                        onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}>
                        {item.label}
                        {item.id === '__external__' && (
                          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10, marginLeft: 6, opacity: .5 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Icon navigation for other versions */
        <div className="icon-nav-wrap" ref={dropdownRef}>
          <div className="icon-nav">
            {cats.map((cat, idx) => (
              <div key={idx} className="icon-nav-item" onClick={() => handleCategoryClick(idx)}>
                <div className={`icon-nav-circle ${openIdx === idx ? 'active' : ''}`}>
                  <i className={cat.icon} />
                </div>
                <span className="icon-nav-label">{cat.label}</span>

                {/* Dropdown */}
                {openIdx === idx && cat.items.length > 1 && (
                  <div className="icon-dropdown">
                    {cat.items.map((item, ii) => (
                      <div key={ii} className="icon-dropdown-item"
                        onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}>
                        {item.label}
                        {item.id === '__external__' && (
                          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10, marginLeft: 6, opacity: .5 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
