import type { PageId } from '../types';

interface Landing3Props {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const routes = [
  {
    key: 'student',
    title: '학생 / 교직원',
    desc: '재학생과 교직원을 위한\n역량개발 및 진로취업 지원 서비스',
    icon: 'fa-solid fa-graduation-cap',
    color: '#1b61c9',
    navigateTo: 'home' as PageId,
  },
  {
    key: 'company',
    title: '기업',
    desc: '채용 정보 등록, 산학협력,\n인재 매칭 서비스',
    icon: 'fa-solid fa-building-columns',
    color: '#254fad',
    navigateTo: null,
  },
  {
    key: 'youth',
    title: '지역청년',
    desc: '창원 지역 청년을 위한\n취업 지원 및 역량 강화 프로그램',
    icon: 'fa-solid fa-users',
    color: '#006400',
    navigateTo: null,
  },
];

/* Night sky SVG background */
function LandingSkyBg() {
  const stars = [
    [60,25,0.7],[150,60,0.9],[250,20,1.1],[370,50,0.6],[470,30,0.8],
    [580,55,1.0],[680,18,0.7],[790,45,0.9],[890,25,0.6],[1000,52,0.8],
    [110,80,0.5],[320,75,0.7],[530,70,0.6],[740,85,0.8],[950,72,0.5],
    [200,95,0.4],[420,90,0.6],[640,88,0.5],[840,92,0.4],[1060,35,0.7],
  ];

  return (
    <svg viewBox="0 0 1100 280" width="100%" height="280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lsky3" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0%" stopColor="#1a2140" />
          <stop offset="100%" stopColor="#0a0f1a" />
        </radialGradient>
        <filter id="lglow3">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="1100" height="280" fill="url(#lsky3)" />
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.12 + (i % 5) * 0.06} />
      ))}
      {/* Bright accent stars */}
      <circle cx="550" cy="60" r="1.5" fill="#fff" opacity=".5" />
      <circle cx="280" cy="40" r="1.2" fill="#fff" opacity=".4" />
      <circle cx="820" cy="35" r="1.3" fill="#fff" opacity=".45" />
      {/* Subtle glow at center top */}
      <circle cx="550" cy="80" r="120" fill="#3182F6" opacity="0.03" filter="url(#lglow3)" />
    </svg>
  );
}

export default function Landing3({ onNavigate, onToast }: Landing3Props) {
  return (
    <div className="l3-root">
      {/* Hero */}
      <section className="l3-hero">
        <LandingSkyBg />
        <div className="l3-hero-inner">
          <p className="l3-hero-label">국립창원대학교 학생경력개발관리시스템</p>
          <h1 className="l3-hero-title">DREAMCATCH</h1>
          <p className="l3-hero-desc">꿈을 설계하고, 역량을 키우고, 목표에 도달하세요.</p>
        </div>
      </section>

      {/* Route cards */}
      <section className="l3-cards-section">
        <div className="l3-cards-heading">
          <span className="l3-cards-eyebrow">Get Started</span>
          <h2 className="l3-cards-title">당신에게 맞는 서비스를 선택하세요</h2>
        </div>
        <div className="l3-cards">
          {routes.map((r) => (
            <div
              key={r.key}
              className={`l3-card ${!r.navigateTo ? 'l3-card-disabled' : ''}`}
              style={{ '--card-color': r.color } as React.CSSProperties}
              onClick={() => {
                if (r.navigateTo) {
                  onNavigate(r.navigateTo);
                } else {
                  onToast('준비 중인 서비스입니다');
                }
              }}
            >
              <div className="l3-card-icon" style={{ background: `${r.color}12`, color: r.color }}>
                <i className={r.icon} />
              </div>
              <h2 className="l3-card-title">{r.title}</h2>
              <p className="l3-card-desc">{r.desc}</p>
              <div className="l3-card-action">
                {r.navigateTo ? (
                  <>
                    <span>바로가기</span>
                    <i className="fa-solid fa-arrow-right" />
                  </>
                ) : (
                  <span className="l3-card-soon">준비중</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="l3-footer">
        <span>DREAMCATCH</span>
        <span className="l3-footer-sep">|</span>
        <span>국립창원대학교 취업전략센터</span>
      </footer>
    </div>
  );
}
