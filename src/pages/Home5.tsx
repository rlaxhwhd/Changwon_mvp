import { useEffect, useRef } from 'react';
import type { PageId } from '../types';

interface Home5Props {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

/* ── data ── */
const metrics = [
  { label: 'AI 역량점수', value: '78.4', unit: '점', delta: '+3.2' },
  { label: '취업예측률', value: '82.7', unit: '%', delta: '+5.1' },
  { label: '이수 프로그램', value: '12', unit: '건', delta: '+2' },
  { label: '상담 완료', value: '4', unit: '회', delta: '+1' },
];

const aiCards = [
  { num: '01', kicker: 'AI ROADMAP', title: 'AI 진로 로드맵', desc: '나의 역량과 목표에 맞는 단계별 커리어 경로를 설계합니다', page: 'ai-roadmap' as PageId },
  { num: '02', kicker: 'PREDICTION', title: '취업예측 분석', desc: '학습 데이터 기반으로 취업 가능성과 적합 기업군을 분석합니다', page: 'ai-prediction' as PageId },
  { num: '03', kicker: 'MATCHING', title: 'AI 맞춤채용', desc: '실시간 채용 정보에서 나에게 맞는 포지션을 자동 추천합니다', page: 'ai-jobs' as PageId },
  { num: '04', kicker: 'EVALUATION', title: 'AI 종합평가', desc: '역량 지표를 종합 분석하여 강점과 보완점 리포트를 생성합니다', page: 'ai-evaluation' as PageId },
];

const programs = [
  { title: '이력서 클리닉', date: '04.15 — 04.20', seats: 12, tag: '취업역량' },
  { title: '모의면접 캠프', date: '04.22 — 04.25', seats: 8, tag: '면접준비' },
  { title: 'IT PM 직무 특강', date: '05.01', seats: 30, tag: '직무탐색' },
  { title: '포트폴리오 워크숍', date: '05.08 — 05.10', seats: 15, tag: '취업역량' },
  { title: '기업탐방 프로그램', date: '05.15', seats: 20, tag: '직무탐색' },
  { title: '취업캠프 (2박3일)', date: '05.20 — 05.22', seats: 0, tag: '취업캠프' },
];

const notices = [
  { id: 1, date: '2026.03.28', title: '2026-1학기 진로취업 프로그램 신청 안내', isNew: true },
  { id: 2, date: '2026.03.25', title: 'AI 역량 분석 서비스 오픈', isNew: true },
  { id: 3, date: '2026.03.20', title: '상반기 채용 박람회 안내', isNew: false },
  { id: 4, date: '2026.03.15', title: '취업전략센터 상담 예약 시스템 개편', isNew: false },
];

const quickMenu = [
  { label: '진로심리검사', page: 'psych-test' as PageId },
  { label: '상담 신청', page: 'counsel-career' as PageId },
  { label: '기업정보', page: 'company-info' as PageId },
  { label: '마이페이지', page: 'mypage' as PageId },
];

export default function Home5({ onNavigate, onToast }: Home5Props) {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('s5-visible');
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
    <div className="s5-root">
      {/* ══════ HERO ══════ */}
      <section className="s5-hero" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.5)), url(/bg-hero8.png)',
        backgroundSize: '100% auto',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}>
        <div className="s5-hero-center">
          <div className="s5-hero-eyebrow">DREAMCATCH 2026</div>
          <h1 className="s5-hero-h1">
            꿈을 향한 <span style={{ color: '#5EEAD4' }}>로드맵</span>,<br />
            여기서 시작됩니다
          </h1>
          <p className="s5-hero-desc">
            AI 기반 역량 분석과 맞춤형 커리어 설계로<br />
            당신만의 별을 향한 최적 경로를 안내합니다.
          </p>
          <div className="s5-hero-cta-row">
            <button className="s5-hero-btn-primary" onClick={() => onNavigate('dashboard')}>
              <span>대시보드 시작하기</span>
              <span className="s5-hero-btn-arrow">
                <i className="fa-solid fa-arrow-right" />
              </span>
            </button>
            <button className="s5-hero-btn-ghost" onClick={() => onNavigate('program-apply')}>
              프로그램 둘러보기
            </button>
          </div>
        </div>
      </section>

      {/* ══════ METRICS — Dark band, tight ══════ */}
      <section className="s5-metrics-band">
        <div className="s5-metrics-inner">
          <div className="s5-metrics-head">
            <span className="s5-kicker s5-kicker-light">PERFORMANCE</span>
            <h2 className="s5-band-title">YOUR DASHBOARD</h2>
          </div>
          <div className="s5-metrics-strip">
            {metrics.map((m, i) => (
              <div key={i} className="s5-metric-pill" style={{ '--idx': i } as React.CSSProperties}>
                <div className="s5-metric-label">{m.label}</div>
                <div className="s5-metric-top">
                  <span className="s5-metric-val">{m.value}</span>
                  <span className="s5-metric-unit">{m.unit}</span>
                </div>
                <div className="s5-metric-delta">
                  <i className="fa-solid fa-arrow-up" />
                  {m.delta}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ AI CAREER — White section, horizontal list ══════ */}
      <section className="s5-reveal s5-section-white" ref={addRef}>
        <div className="s5-section-head">
          <span className="s5-kicker">AI CAREER LOUNGE</span>
          <h2 className="s5-section-title">인공지능이 설계하는<br />나의 커리어</h2>
        </div>
        <div className="s5-ai-grid">
          {aiCards.map((card, i) => (
            <div
              key={i}
              className="s5-ai-card"
              style={{ '--idx': i } as React.CSSProperties}
              onClick={() => onNavigate(card.page)}
            >
              <div className="s5-ai-num">{card.num}</div>
              <div className="s5-ai-kicker">{card.kicker}</div>
              <h3 className="s5-ai-title">{card.title}</h3>
              <p className="s5-ai-desc">{card.desc}</p>
              <div className="s5-ai-arrow">
                <i className="fa-solid fa-arrow-right" />
                <span>DISCOVER</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ FEATURE BAND — Dark showroom moment ══════ */}
      <section className="s5-feature-band">
        <div className="s5-feature-inner">
          <div className="s5-feature-text">
            <span className="s5-kicker s5-kicker-light">SPOTLIGHT</span>
            <h2 className="s5-feature-title">
              한 번의 진단,<br />
              평생의 로드맵
            </h2>
            <p className="s5-feature-desc">
              9CORE 진단과 인적성검사를 통해 나를 이해하고,
              AI가 설계한 단계별 실행 계획으로 꿈에 도달합니다.
            </p>
            <button
              className="s5-btn-primary"
              onClick={() => onNavigate('psych-test')}
            >
              진단 시작하기
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
          <div className="s5-feature-stats">
            <div className="s5-feature-stat">
              <div className="s5-feature-stat-val">9</div>
              <div className="s5-feature-stat-label">CORE<br />COMPETENCIES</div>
            </div>
            <div className="s5-feature-stat">
              <div className="s5-feature-stat-val">1.2K+</div>
              <div className="s5-feature-stat-label">CAREER<br />PATHWAYS</div>
            </div>
            <div className="s5-feature-stat">
              <div className="s5-feature-stat-val">98%</div>
              <div className="s5-feature-stat-label">ANALYSIS<br />ACCURACY</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ PROGRAMS — White, clean list ══════ */}
      <section className="s5-reveal s5-section-white" ref={addRef}>
        <div className="s5-section-head s5-section-head-row">
          <div>
            <span className="s5-kicker">PROGRAMS</span>
            <h2 className="s5-section-title">진행중인 프로그램</h2>
          </div>
          <button className="s5-text-link" onClick={() => onNavigate('program-apply')}>
            VIEW ALL <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
        <div className="s5-program-table">
          <div className="s5-program-head">
            <span>CATEGORY</span>
            <span>PROGRAM</span>
            <span>PERIOD</span>
            <span>SEATS</span>
            <span></span>
          </div>
          {programs.map((p, i) => (
            <div
              key={i}
              className={`s5-program-row ${p.seats === 0 ? 's5-program-closed' : ''}`}
            >
              <div className="s5-program-tag">{p.tag}</div>
              <div className="s5-program-name">{p.title}</div>
              <div className="s5-program-date">{p.date}</div>
              <div className="s5-program-seats">
                {p.seats === 0 ? (
                  <span className="s5-seats-closed">마감</span>
                ) : (
                  <span>잔여 {p.seats}석</span>
                )}
              </div>
              <div className="s5-program-action">
                {p.seats === 0 ? (
                  <span className="s5-apply-disabled">—</span>
                ) : (
                  <button
                    className="s5-apply-chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToast(`"${p.title}" 신청이 완료되었습니다!`, 'success');
                    }}
                  >
                    APPLY
                    <i className="fa-solid fa-arrow-right" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ NOTICES + QUICK — White split ══════ */}
      <section className="s5-reveal s5-section-white" ref={addRef}>
        <div className="s5-split">
          <div className="s5-split-main">
            <div className="s5-section-head s5-section-head-row">
              <div>
                <span className="s5-kicker">NOTICE</span>
                <h2 className="s5-section-title">공지사항</h2>
              </div>
              <button className="s5-text-link" onClick={() => onNavigate('notice')}>
                MORE <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
            <div className="s5-notice-stack">
              {notices.map((n) => (
                <div key={n.id} className="s5-notice-row" onClick={() => onToast('준비 중인 기능입니다')}>
                  <span className="s5-notice-date">{n.date}</span>
                  <span className="s5-notice-title">
                    {n.title}
                    {n.isNew && <span className="s5-new-dot">NEW</span>}
                  </span>
                  <i className="fa-solid fa-arrow-right s5-notice-arrow" />
                </div>
              ))}
            </div>
          </div>

          <div className="s5-split-side">
            <div className="s5-section-head">
              <span className="s5-kicker">SHORTCUTS</span>
              <h2 className="s5-section-title">바로가기</h2>
            </div>
            <div className="s5-quick-grid">
              {quickMenu.map((q, i) => (
                <button key={i} className="s5-quick-btn" onClick={() => onNavigate(q.page)}>
                  <span>{q.label}</span>
                  <i className="fa-solid fa-arrow-right" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ CTA FOOTER — Dark band ══════ */}
      <section className="s5-cta-band">
        <div className="s5-cta-inner">
          <span className="s5-kicker s5-kicker-light">GET STARTED</span>
          <h2 className="s5-cta-title">
            당신의 꿈,<br />
            지금 시작하세요
          </h2>
          <button className="s5-btn-primary s5-btn-large" onClick={() => onNavigate('dashboard')}>
            대시보드 열기
            <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </section>
    </div>
  );
}
