import { useEffect, useRef } from 'react';
import type { PageId } from '../types';

interface Home4Props {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

/*
 * Hero SVG — Split roadmap layout:
 *   Left path:  (1)역량진단 → (2)목표설정 → center text
 *   Right path: center text → (3)역량강화 → (4)목표달성 → ★DREAM
 *
 * (2) and (3) do NOT connect to each other; both connect to the center text area.
 * The center text ("꿈을 향한 로드맵, 여기서 시작됩니다") is left as HTML overlay.
 */
function HeroIllustration() {
  return (
    <svg viewBox="-50 -20 1300 460" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="s4sky" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#171532" />
          <stop offset="40%" stopColor="#272368" />
          <stop offset="75%" stopColor="#3730a3" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="s4ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3730a3" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#171532" stopOpacity="0.8" />
        </linearGradient>
        <filter id="s4starglow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="s4starglow-lg">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="s4pathglow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="s4nodeglow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="s4roadL" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="s4roadR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="s4dreamglow">
          <feGaussianBlur stdDeviation="10" result="blur1" />
          <feGaussianBlur stdDeviation="4" in="SourceGraphic" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sky — extended to cover the larger viewBox */}
      <rect x="-50" y="-20" width="1300" height="460" fill="url(#s4sky)" />

      {/* Stars */}
      {[
        [80,35,1.2],[190,65,0.8],[330,25,1.5],[470,55,0.7],[720,30,1.0],
        [850,55,1.3],[980,40,0.9],[1100,60,1.1],[140,80,0.6],[400,70,0.5],
        [760,20,0.7],[910,15,0.8],[1060,75,0.6],[260,45,0.9],[540,20,1.0],
        [830,8,0.7],[1020,25,1.4],[160,22,0.5],[680,45,0.6],[1150,40,0.8],
      ].map(([x, y, r], i) => (
        <circle key={`star-${i}`} cx={x} cy={y} r={r}
          fill="#fff" opacity={0.25 + (i % 5) * 0.12}>
          <animate attributeName="opacity" values={`${0.2 + (i%3)*0.15};${0.5 + (i%4)*0.1};${0.2 + (i%3)*0.15}`} dur={`${2 + i % 3}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Ground — shifted up by 60 */}
      <path d="M0,290 Q150,250 300,270 Q450,290 600,260 Q750,230 900,250 Q1050,270 1200,240 L1200,420 L0,420 Z"
        fill="url(#s4ground)" />
      <path d="M0,310 Q200,280 400,300 Q600,320 800,290 Q1000,260 1200,290 L1200,420 L0,420 Z"
        fill="#171532" opacity="0.5" />

      {/* ── LEFT PATH: (1)역량진단 → (2)목표설정 → center ── */}
      <path d="M120,310 C180,295 220,270 300,230 S420,160 520,150"
        fill="none" stroke="url(#s4roadL)" strokeWidth="12" strokeLinecap="round" opacity="0.08" />
      <path d="M120,310 C180,295 220,270 300,230 S420,160 520,150"
        fill="none" stroke="url(#s4roadL)" strokeWidth="3.5" strokeLinecap="round"
        filter="url(#s4pathglow)" opacity="0.8" strokeDasharray="8 6" />

      {/* ── RIGHT PATH: center → (3)역량강화 → (4)목표달성 ── */}
      <path d="M680,150 C760,160 840,190 900,220 S1000,280 1060,310"
        fill="none" stroke="url(#s4roadR)" strokeWidth="12" strokeLinecap="round" opacity="0.08" />
      <path d="M680,150 C760,160 840,190 900,220 S1000,280 1060,310"
        fill="none" stroke="url(#s4roadR)" strokeWidth="3.5" strokeLinecap="round"
        filter="url(#s4pathglow)" opacity="0.8" strokeDasharray="8 6" />

      {/* ── Short path from (4)목표달성 up to DREAM star ── */}
      <path d="M1060,310 C1065,290 1075,260 1080,240 S1085,200 1090,180"
        fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"
        filter="url(#s4pathglow)" opacity="0.6" strokeDasharray="6 8" />
      <path d="M1060,310 C1065,290 1075,260 1080,240 S1085,200 1090,180"
        fill="none" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" opacity="0.06" />

      {/* ── Node 1: 역량진단 (bottom-left) ── */}
      <circle cx="150" cy="305" r="14" fill="#10B981" opacity="0.25" filter="url(#s4nodeglow)" />
      <circle cx="150" cy="305" r="8" fill="#10B981" />
      <text x="150" y="290" textAnchor="middle" fill="#6EE7B7" fontSize="13" fontWeight="700">역량진단</text>
      <text x="150" y="337" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontWeight="600">STEP 01</text>

      {/* ── Node 2: 목표설정 (mid-left) ── */}
      <circle cx="360" cy="205" r="14" fill="#3B82F6" opacity="0.25" filter="url(#s4nodeglow)" />
      <circle cx="360" cy="205" r="8" fill="#3B82F6" />
      <text x="360" y="190" textAnchor="middle" fill="#93C5FD" fontSize="13" fontWeight="700">목표설정</text>
      <text x="360" y="237" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontWeight="600">STEP 02</text>

      {/* ── Node 3: 역량강화 (mid-right) ── */}
      <circle cx="840" cy="205" r="14" fill="#06B6D4" opacity="0.25" filter="url(#s4nodeglow)" />
      <circle cx="840" cy="205" r="8" fill="#06B6D4" />
      <text x="840" y="190" textAnchor="middle" fill="#67E8F9" fontSize="13" fontWeight="700">역량강화</text>
      <text x="840" y="237" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontWeight="600">STEP 03</text>

      {/* ── Node 4: 목표달성 (bottom-right) ── */}
      <circle cx="1060" cy="310" r="14" fill="#F59E0B" opacity="0.25" filter="url(#s4nodeglow)" />
      <circle cx="1060" cy="310" r="8" fill="#F59E0B" />
      <text x="1060" y="295" textAnchor="middle" fill="#FCD34D" fontSize="13" fontWeight="700">목표달성</text>
      <text x="1060" y="342" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontWeight="600">STEP 04</text>

      {/* ── DREAM star (closer to node 4, shorter connection) ── */}
      {/* Outer glow layers */}
      <circle cx="1090" cy="150" r="50" fill="#F59E0B" opacity="0.04" filter="url(#s4dreamglow)" />
      <circle cx="1090" cy="150" r="35" fill="#F59E0B" opacity="0.08" filter="url(#s4starglow-lg)">
        <animate attributeName="r" values="35;40;35" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0.14;0.08" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="1090" cy="150" r="20" fill="#FCD34D" opacity="0.1">
        <animate attributeName="r" values="20;24;20" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.1;0.18;0.1" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Main star shape */}
      <g filter="url(#s4dreamglow)">
        <polygon points="1090,122 1098,142 1120,142 1103,155 1109,175 1090,163 1071,175 1077,155 1060,142 1082,142"
          fill="#F59E0B" opacity="0.95">
          <animate attributeName="opacity" values="0.95;0.75;0.95" dur="2s" repeatCount="indefinite" />
        </polygon>
      </g>
      {/* Light rays */}
      <line x1="1090" y1="110" x2="1090" y2="118" stroke="#FCD34D" strokeWidth="1.5" opacity="0.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.2s" repeatCount="indefinite" />
      </line>
      <line x1="1120" y1="150" x2="1128" y2="150" stroke="#FCD34D" strokeWidth="1.5" opacity="0.4" strokeLinecap="round">
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite" />
      </line>
      <line x1="1060" y1="150" x2="1052" y2="150" stroke="#FCD34D" strokeWidth="1.5" opacity="0.4" strokeLinecap="round">
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.8s" repeatCount="indefinite" />
      </line>
      <line x1="1090" y1="182" x2="1090" y2="188" stroke="#FCD34D" strokeWidth="1" opacity="0.3" strokeLinecap="round">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </line>
      <text x="1090" y="202" textAnchor="middle" fill="#FCD34D" fontSize="12" fontWeight="700" opacity="0.9">
        DREAM
      </text>

      {/* Decorative small stars near DREAM — brighter, twinkling */}
      <g filter="url(#s4starglow)">
        <polygon points="1035,130 1038,138 1046,138 1040,143 1042,151 1035,146 1028,151 1030,143 1024,138 1032,138"
          fill="#FCD34D" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.25;0.6" dur="1.8s" repeatCount="indefinite" />
        </polygon>
      </g>
      <g filter="url(#s4starglow)">
        <polygon points="1140,165 1142,171 1148,171 1143,175 1145,181 1140,177 1135,181 1137,175 1132,171 1138,171"
          fill="#FCD34D" opacity="0.55">
          <animate attributeName="opacity" values="0.55;0.2;0.55" dur="2.2s" repeatCount="indefinite" />
        </polygon>
      </g>
      <g filter="url(#s4starglow)">
        <polygon points="1065,110 1067,115 1072,115 1068,118 1069,123 1065,120 1061,123 1062,118 1058,115 1063,115"
          fill="#FCD34D" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.5s" repeatCount="indefinite" />
        </polygon>
      </g>
      {/* Extra tiny sparkles */}
      <circle cx="1110" cy="128" r="1" fill="#FEF3C7" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="1055" cy="145" r="0.8" fill="#FEF3C7" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="1125" cy="155" r="0.7" fill="#FEF3C7" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.7s" repeatCount="indefinite" />
      </circle>

      {/* Floating particles */}
      {[
        [180,150],[350,130],[500,170],[700,170],[850,130],
        [250,200],[450,180],[750,150],[950,180],[1050,130],
      ].map(([x, y], i) => (
        <circle key={`p-${i}`} cx={x} cy={y} r={1 + (i % 3) * 0.5} fill="#fff" opacity={0.08 + (i % 4) * 0.04}>
          <animate attributeName="cy" values={`${y};${y - 8};${y}`} dur={`${3 + i % 4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

/* ── data ── */
const metrics = [
  { label: 'AI 역량점수', value: '78.4', unit: '점', delta: '+3.2' },
  { label: '취업예측률', value: '82.7', unit: '%', delta: '+5.1' },
  { label: '이수 프로그램', value: '12', unit: '건', delta: '+2' },
  { label: '상담 완료', value: '4', unit: '회', delta: '+1' },
];

const aiCards = [
  { title: 'AI 진로 로드맵', desc: '나의 역량과 목표에 맞는 단계별 커리어 경로를 설계합니다', page: 'ai-roadmap' as PageId, accent: '#10B981' },
  { title: '취업예측 분석', desc: '학습 데이터 기반으로 취업 가능성과 적합 기업군을 분석합니다', page: 'ai-prediction' as PageId, accent: '#3B82F6' },
  { title: 'AI 맞춤채용', desc: '실시간 채용 정보에서 나에게 맞는 포지션을 자동 추천합니다', page: 'ai-jobs' as PageId, accent: '#F59E0B' },
  { title: 'AI 종합평가', desc: '역량 지표를 종합 분석하여 강점과 보완점 리포트를 생성합니다', page: 'ai-evaluation' as PageId, accent: '#8B5CF6' },
];

const programs = [
  { title: '이력서 클리닉', date: '04.15 ~ 04.20', seats: 12, tag: '취업역량' },
  { title: '모의면접 캠프', date: '04.22 ~ 04.25', seats: 8, tag: '면접준비' },
  { title: 'IT PM 직무 특강', date: '05.01', seats: 30, tag: '직무탐색' },
  { title: '포트폴리오 워크숍', date: '05.08 ~ 05.10', seats: 15, tag: '취업역량' },
  { title: '기업탐방 프로그램', date: '05.15', seats: 20, tag: '직무탐색' },
  { title: '취업캠프 (2박3일)', date: '05.20 ~ 05.22', seats: 0, tag: '취업캠프' },
];

const notices = [
  { id: 1, date: '2026-03-28', title: '2026-1학기 진로취업 프로그램 신청 안내', isNew: true },
  { id: 2, date: '2026-03-25', title: 'AI 역량 분석 서비스 오픈', isNew: true },
  { id: 3, date: '2026-03-20', title: '상반기 채용 박람회 안내', isNew: false },
  { id: 4, date: '2026-03-15', title: '취업전략센터 상담 예약 시스템 개편', isNew: false },
];

const quickMenu = [
  { label: '진로심리검사', page: 'psych-test' as PageId },
  { label: '상담 신청', page: 'counsel-career' as PageId },
  { label: '기업정보', page: 'company-info' as PageId },
  { label: '마이페이지', page: 'mypage' as PageId },
];

export default function Home4({ onNavigate, onToast }: Home4Props) {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  /* scroll-reveal via IntersectionObserver */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('s4-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (el: HTMLElement | null) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  return (
    <div className="s4-root">
      {/* ══════ HERO with SVG Illustration ══════ */}
      <section className="s4-hero">
        {/* Background illustration */}
        <div className="s4-hero-illust">
          <HeroIllustration />
        </div>
        {/* Gradient fade at bottom */}
        <div className="s4-hero-fade" />
        {/* Content overlay */}
        <div className="s4-hero-overlay">
          <div className="s4-eyebrow">DREAMCATCH 2026</div>
          <h1 className="s4-hero-h1">
            꿈을 향한 <span style={{ color: '#FCD34D' }}>로드맵</span>,<br />
            여기서 시작됩니다
          </h1>
          <p className="s4-hero-desc">
            AI 기반 역량 분석과 맞춤형 커리어 설계로<br />
            당신만의 별을 향한 최적 경로를 안내합니다.
          </p>
          <div className="s4-hero-cta-row">
            <button className="s4-btn-primary" onClick={() => onNavigate('dashboard')}>
              <span>대시보드 시작하기</span>
              <span className="s4-btn-arrow">
                <i className="fa-solid fa-arrow-right" />
              </span>
            </button>
            <button className="s4-btn-ghost" onClick={() => onNavigate('program-apply')}>
              프로그램 둘러보기
            </button>
          </div>
        </div>
      </section>

      {/* ══════ METRICS STRIP ══════ */}
      <section className="s4-reveal" ref={addRef}>
        <div className="s4-metrics-strip">
          {metrics.map((m, i) => (
            <div key={i} className="s4-metric-pill" style={{ '--idx': i } as React.CSSProperties}>
              <div className="s4-metric-top">
                <span className="s4-metric-val">{m.value}</span>
                <span className="s4-metric-unit">{m.unit}</span>
              </div>
              <div className="s4-metric-bottom">
                <span className="s4-metric-label">{m.label}</span>
                <span className="s4-metric-delta">{m.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ AI CAREER BENTO ══════ */}
      <section className="s4-reveal" ref={addRef}>
        <div className="s4-section-head">
          <div className="s4-eyebrow">AI CAREER LOUNGE</div>
          <h2 className="s4-section-title">인공지능이 설계하는 나의 커리어</h2>
        </div>
        <div className="s4-bento">
          {aiCards.map((card, i) => (
            <div
              key={i}
              className={`s4-bento-card s4-bento-${i}`}
              style={{ '--accent': card.accent, '--idx': i } as React.CSSProperties}
              onClick={() => onNavigate(card.page)}
            >
              <div className="s4-bento-inner">
                <div className="s4-bento-num">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="s4-bento-title">{card.title}</h3>
                <p className="s4-bento-desc">{card.desc}</p>
                <div className="s4-bento-arrow">
                  <i className="fa-solid fa-arrow-right" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ PROGRAMS + NOTICES (Asymmetric Split) ══════ */}
      <section className="s4-reveal" ref={addRef}>
        <div className="s4-split">
          {/* Left — Programs */}
          <div className="s4-split-main">
            <div className="s4-section-head">
              <h2 className="s4-section-title">진행중인 프로그램</h2>
              <button className="s4-text-link" onClick={() => onNavigate('program-apply')}>
                전체보기 <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
            <div className="s4-program-stack">
              {programs.map((p, i) => (
                <div
                  key={i}
                  className={`s4-program-row ${p.seats === 0 ? 's4-program-closed' : ''}`}
                  style={{ '--idx': i } as React.CSSProperties}
                >
                  <div className="s4-program-tag">{p.tag}</div>
                  <div className="s4-program-body">
                    <span className="s4-program-name">{p.title}</span>
                    <span className="s4-program-date">{p.date}</span>
                  </div>
                  <div className="s4-program-right">
                    {p.seats === 0 ? (
                      <span className="s4-seats-badge s4-closed">마감</span>
                    ) : (
                      <>
                        <span className="s4-seats-badge">잔여 {p.seats}석</span>
                        <button
                          className="s4-apply-chip"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToast(`"${p.title}" 신청이 완료되었습니다!`, 'success');
                          }}
                        >
                          신청
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Notices + Quick Menu */}
          <div className="s4-split-side">
            <div className="s4-side-block">
              <div className="s4-section-head">
                <h2 className="s4-section-title">공지사항</h2>
                <button className="s4-text-link" onClick={() => onNavigate('notice')}>
                  더보기 <i className="fa-solid fa-arrow-right" />
                </button>
              </div>
              <div className="s4-notice-stack">
                {notices.map((n) => (
                  <div
                    key={n.id}
                    className="s4-notice-row"
                    onClick={() => onToast('준비 중인 기능입니다')}
                  >
                    <span className="s4-notice-title">
                      {n.title}
                      {n.isNew && <span className="s4-new-dot" />}
                    </span>
                    <span className="s4-notice-date">{n.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="s4-side-block">
              <div className="s4-section-head">
                <h2 className="s4-section-title">바로가기</h2>
              </div>
              <div className="s4-quick-grid">
                {quickMenu.map((q, i) => (
                  <button
                    key={i}
                    className="s4-quick-btn"
                    onClick={() => onNavigate(q.page)}
                  >
                    {q.label}
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacer */}
      <div style={{ height: 60 }} />
    </div>
  );
}
