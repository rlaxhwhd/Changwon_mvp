import { useEffect, useRef } from 'react';
import type { PageId } from '../types';

interface Landing4Props {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const routes = [
  {
    key: 'student',
    title: '학생 / 교직원',
    desc: '재학생과 교직원을 위한 역량개발 및 진로취업 지원 서비스',
    icon: 'fa-solid fa-graduation-cap',
    accent: '#6366F1',
    navigateTo: 'home' as PageId,
  },
  {
    key: 'company',
    title: '기업',
    desc: '채용 정보 등록, 산학협력, 인재 매칭 서비스',
    icon: 'fa-solid fa-building-columns',
    accent: '#F59E0B',
    navigateTo: null,
  },
  {
    key: 'youth',
    title: '지역청년',
    desc: '창원 지역 청년을 위한 취업 지원 및 역량 강화 프로그램',
    icon: 'fa-solid fa-users',
    accent: '#10B981',
    navigateTo: null,
  },
];

/* Illustration: roadmap path climbing to stars */
function HeroIllust() {
  return (
    <svg viewBox="0 0 1200 440" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l4sky" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="45%" stopColor="#312e81" />
          <stop offset="80%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="l4ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4338ca" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.7" />
        </linearGradient>
        <filter id="l4glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="l4glow-lg">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="l4road" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      <rect width="1200" height="440" fill="url(#l4sky)" />

      {/* Stars */}
      {[
        [90,35,1.0],[200,65,0.8],[340,25,1.4],[460,55,0.7],[580,20,1.6],
        [700,48,0.9],[830,18,1.2],[960,60,0.8],[1080,30,1.0],[140,85,0.6],
        [410,40,0.5],[660,70,0.7],[880,40,0.8],[1030,75,0.6],[280,50,0.9],
        [520,12,1.0],[770,8,0.7],[1000,25,1.3],[170,20,0.5],[630,35,0.6],
      ].map(([x, y, r], i) => (
        <circle key={`s-${i}`} cx={x} cy={y} r={r} fill="#fff" opacity={0.2 + (i % 5) * 0.1}>
          <animate attributeName="opacity" values={`${0.15+(i%3)*0.12};${0.45+(i%4)*0.08};${0.15+(i%3)*0.12}`} dur={`${2+i%3}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Ground */}
      <path d="M0,360 Q150,330 300,345 Q500,365 700,335 Q850,310 1000,330 Q1100,345 1200,320 L1200,440 L0,440 Z" fill="url(#l4ground)" />
      <path d="M0,385 Q250,360 500,375 Q700,390 900,365 Q1050,345 1200,370 L1200,440 L0,440 Z" fill="#1e1b4b" opacity="0.45" />

      {/* Roadmap path */}
      <path d="M100,380 C180,370 240,350 320,310 S450,250 550,240 S700,220 800,180 S920,130 1020,100"
        fill="none" stroke="url(#l4road)" strokeWidth="3" strokeLinecap="round"
        filter="url(#l4glow)" opacity="0.7" strokeDasharray="8 6" />
      <path d="M100,380 C180,370 240,350 320,310 S450,250 550,240 S700,220 800,180 S920,130 1020,100"
        fill="none" stroke="url(#l4road)" strokeWidth="10" strokeLinecap="round" opacity="0.06" />

      {/* Nodes */}
      <circle cx="140" cy="375" r="8" fill="#6366F1" opacity="0.2" filter="url(#l4glow)" />
      <circle cx="140" cy="375" r="5" fill="#6366F1" />

      <circle cx="340" cy="305" r="8" fill="#8B5CF6" opacity="0.2" filter="url(#l4glow)" />
      <circle cx="340" cy="305" r="5" fill="#8B5CF6" />

      <circle cx="555" cy="238" r="8" fill="#A78BFA" opacity="0.2" filter="url(#l4glow)" />
      <circle cx="555" cy="238" r="5" fill="#A78BFA" />

      <circle cx="800" cy="178" r="8" fill="#F59E0B" opacity="0.2" filter="url(#l4glow)" />
      <circle cx="800" cy="178" r="5" fill="#F59E0B" />

      {/* Goal star */}
      <g filter="url(#l4glow-lg)">
        <polygon points="1020,75 1028,95 1050,95 1032,107 1039,127 1020,115 1001,127 1008,107 990,95 1012,95"
          fill="#F59E0B" opacity="0.85" />
      </g>

      {/* Small decorative stars */}
      <g filter="url(#l4glow)">
        <polygon points="960,60 963,68 971,68 965,73 967,81 960,76 953,81 955,73 949,68 957,68" fill="#FCD34D" opacity="0.55" />
      </g>
      <g filter="url(#l4glow)">
        <polygon points="1080,85 1082,91 1088,91 1083,95 1085,101 1080,97 1075,101 1077,95 1072,91 1078,91" fill="#FCD34D" opacity="0.45" />
      </g>
      <g filter="url(#l4glow)">
        <polygon points="990,45 992,50 997,50 993,53 994,58 990,55 986,58 987,53 983,50 988,50" fill="#FCD34D" opacity="0.4" />
      </g>

      {/* Person climbing near node 3 */}
      <circle cx="570" cy="215" r="6" fill="#fafafa" opacity="0.75" />
      <line x1="570" y1="221" x2="570" y2="236" stroke="#fafafa" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
      <line x1="570" y1="226" x2="562" y2="219" stroke="#fafafa" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="570" y1="226" x2="578" y2="218" stroke="#fafafa" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="570" y1="236" x2="565" y2="247" stroke="#fafafa" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="570" y1="236" x2="575" y2="247" stroke="#fafafa" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />

      {/* Floating particles */}
      {[
        [180,150],[380,130],[580,110],[780,90],[1020,60],
        [280,190],[480,160],[680,130],[880,100],[1100,80],
      ].map(([x, y], i) => (
        <circle key={`p-${i}`} cx={x} cy={y} r={0.8 + (i%3)*0.4} fill="#fff" opacity={0.06 + (i%4)*0.03}>
          <animate attributeName="cy" values={`${y};${y-6};${y}`} dur={`${3+i%4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

export default function Landing4({ onNavigate, onToast }: Landing4Props) {
  const cardsRef = useRef<HTMLDivElement>(null);

  /* Scroll reveal for cards */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('l4-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    if (cardsRef.current) {
      observer.observe(cardsRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="l4-root">
      {/* Hero with illustration */}
      <section className="l4-hero">
        <div className="l4-hero-illust">
          <HeroIllust />
        </div>
        <div className="l4-hero-fade" />
        <div className="l4-hero-overlay">
          <div className="l4-eyebrow">DREAMCATCH 2026</div>
          <h1 className="l4-hero-title">
            꿈을 향한 여정,<br />여기서 시작됩니다
          </h1>
          <p className="l4-hero-desc">
            국립창원대학교 학생경력개발관리시스템
          </p>
        </div>
      </section>

      {/* Route Cards */}
      <section className="l4-cards-section" ref={cardsRef}>
        <p className="l4-cards-label">서비스를 선택해 주세요</p>
        <div className="l4-cards">
          {routes.map((r, i) => (
            <div
              key={r.key}
              className={`l4-card ${!r.navigateTo ? 'l4-card-disabled' : ''}`}
              style={{ '--accent': r.accent, '--idx': i } as React.CSSProperties}
              onClick={() => {
                if (r.navigateTo) {
                  onNavigate(r.navigateTo);
                } else {
                  onToast('준비 중인 서비스입니다');
                }
              }}
            >
              {/* Outer bezel */}
              <div className="l4-card-inner">
                <div className="l4-card-icon">
                  <i className={r.icon} />
                </div>
                <h2 className="l4-card-title">{r.title}</h2>
                <p className="l4-card-desc">{r.desc}</p>
                <div className="l4-card-footer">
                  {r.navigateTo ? (
                    <div className="l4-card-arrow">
                      <span>바로가기</span>
                      <i className="fa-solid fa-arrow-right" />
                    </div>
                  ) : (
                    <span className="l4-card-soon">준비중</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="l4-footer">
        <span>DREAMCATCH</span>
        <span className="l4-footer-dot" />
        <span>국립창원대학교 취업전략센터</span>
      </footer>
    </div>
  );
}
