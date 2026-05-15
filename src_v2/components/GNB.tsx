import { Link, useLocation } from 'react-router-dom'

interface NavChild {
  label: string
  path: string
}

interface NavItem {
  label: string
  path?: string
  children?: NavChild[]
}

const NAV: NavItem[] = [
  { label: 'AI 커리어 라운지', path: '/lounge' },
  {
    label: '내 성장',
    children: [
      { label: '홈 대시보드',        path: '/growth' },
      { label: '비교과프로그램 신청', path: '/growth/program' },
      { label: '퀘스트보드',         path: '/growth/quest' },
      { label: '성장경험일지',        path: '/growth/journal' },
      { label: '스킬트리',           path: '/growth/skill-tree' },
    ],
  },
  {
    label: '진단센터',
    children: [
      { label: '취업지원검사', path: '/diagnosis/employment' },
      { label: '성격유형검사', path: '/diagnosis/personality' },
    ],
  },
  {
    label: '역량개발센터',
    children: [
      { label: '진로취업상담', path: '/counsel/career' },
      { label: '심리상담',    path: '/counsel/psych' },
      { label: '지도교수상담', path: '/counsel/professor' },
    ],
  },
  {
    label: '경력개발 로드맵',
    children: [
      { label: 'AI 진로로드맵', path: '/roadmap/ai' },
      { label: '취업예측분석',  path: '/roadmap/prediction' },
      { label: 'AI 맞춤채용',  path: '/roadmap/jobs' },
      { label: 'AI 자소서/면접', path: '/roadmap/resume' },
    ],
  },
  { label: '취업지원', path: '/jobs' },
  {
    label: '마이페이지',
    children: [
      { label: '포트폴리오',        path: '/mypage/portfolio' },
      { label: '비교과프로그램 현황', path: '/mypage/programs' },
      { label: '상담현황',          path: '/mypage/counsel' },
      { label: '일일미션 기록',      path: '/mypage/mission' },
    ],
  },
]

export default function GNB() {
  const { pathname } = useLocation()

  const isActive = (item: NavItem) => {
    if (item.path) return pathname === item.path
    return item.children?.some(c => pathname === c.path || pathname.startsWith(c.path + '/')) ?? false
  }

  return (
    <header className="gnb">
      <Link to="/lounge" className="gnb-logo">
        <span className="gnb-logo-icon">C</span>
        <span className="gnb-logo-text">CWNU</span>
      </Link>

      <nav className="gnb-nav">
        {NAV.map(item => (
          <div className="gnb-nav-item" key={item.label}>
            {item.path ? (
              <Link
                to={item.path}
                className={`gnb-nav-link ${isActive(item) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ) : (
              <>
                <span className={`gnb-nav-link ${isActive(item) ? 'active' : ''}`}>
                  {item.label}
                  <i className="fa-solid fa-chevron-down" />
                </span>
                <div className="gnb-dropdown">
                  {item.children!.map(child => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`gnb-dropdown-link ${pathname === child.path ? 'active' : ''}`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      <div className="gnb-actions">
        <button className="gnb-icon-btn" title="검색">
          <i className="fa-solid fa-magnifying-glass" />
        </button>
        <button className="gnb-icon-btn gnb-bell-wrap" title="알림">
          <i className="fa-regular fa-bell" />
          <span className="gnb-badge">8</span>
        </button>
        <Link to="/mypage/portfolio" className="gnb-avatar" title="마이페이지">
          채
        </Link>
      </div>
    </header>
  )
}
