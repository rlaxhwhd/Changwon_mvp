import type { PageId } from '../types';

interface Home6Props {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const programs = [
  { title: '이력서 클리닉', desc: 'AI 기반 이력서 첨삭 및 맞춤 피드백', date: '04.15 ~ 04.20', seats: 12, icon: 'fa-solid fa-file-lines', category: '취업역량' },
  { title: '모의면접 캠프', desc: '실전 면접 시뮬레이션 및 전문가 코칭', date: '04.22 ~ 04.25', seats: 8, icon: 'fa-solid fa-microphone', category: '면접준비' },
  { title: 'IT PM 직무 특강', desc: '현직 PM이 알려주는 실무 노하우', date: '05.01', seats: 30, icon: 'fa-solid fa-chalkboard-user', category: '직무탐색' },
  { title: '포트폴리오 워크숍', desc: '프로젝트 포트폴리오 제작 실습', date: '05.08 ~ 05.10', seats: 15, icon: 'fa-solid fa-palette', category: '취업역량' },
  { title: '기업탐방 프로그램', desc: 'IT 기업 현장 방문 및 직무 체험', date: '05.15', seats: 20, icon: 'fa-solid fa-building', category: '직무탐색' },
  { title: '취업캠프 (2박3일)', desc: '집중 취업 준비 부트캠프', date: '05.20 ~ 05.22', seats: 0, icon: 'fa-solid fa-campground', category: '취업캠프' },
];

const quickStats = [
  { label: '진행중 프로그램', value: '5', unit: '건', icon: 'fa-solid fa-play-circle' },
  { label: 'AI 역량점수', value: '78', unit: '점', icon: 'fa-solid fa-chart-line' },
  { label: '취업예측률', value: '82', unit: '%', icon: 'fa-solid fa-bullseye' },
  { label: '이수 프로그램', value: '12', unit: '건', icon: 'fa-solid fa-award' },
];

const notices = [
  { id: 1, date: '2026-03-28', title: '2026-1학기 진로취업 프로그램 신청 안내', isNew: true },
  { id: 2, date: '2026-03-25', title: 'AI 역량 분석 서비스 오픈', isNew: true },
  { id: 3, date: '2026-03-20', title: '상반기 채용 박람회 안내', isNew: false },
];

const aiFeatures = [
  { title: 'AI 진로 로드맵', desc: '나만의 맞춤형 취업 로드맵을 설계합니다', icon: 'fa-solid fa-route', page: 'ai-roadmap' as PageId },
  { title: '취업예측 분석', desc: 'AI 기반 취업 가능성을 분석합니다', icon: 'fa-solid fa-chart-pie', page: 'ai-prediction' as PageId },
  { title: 'AI 맞춤채용', desc: '나에게 딱 맞는 채용을 추천합니다', icon: 'fa-solid fa-briefcase', page: 'ai-jobs' as PageId },
  { title: 'AI 종합평가', desc: '역량 종합 분석 리포트를 생성합니다', icon: 'fa-solid fa-clipboard-check', page: 'ai-evaluation' as PageId },
];

export default function Home6({ onNavigate, onToast }: Home6Props) {
  return (
    <div className="v5-home">
      {/* ── Hero Section (image left, text right) ── */}
      <section className="v5-hero">
        {/* grain + ambient orbs */}
        <div className="v5-hero-orb v5-hero-orb-a" />
        <div className="v5-hero-orb v5-hero-orb-b" />

        {/* Left image with gradient fade on right edge */}
        <div className="v5-hero-photo">
          <img src="/bg-hero-7.png" alt="" />
        </div>

        {/* Content on right */}
        <div className="v5-hero-inner">
          <div className="v5-hero-content">
            <div className="v5-hero-badge">
              <span className="v5-hero-badge-dot" />
              DREAMCATCH 2026 · EDITION Ⅴ
            </div>
            <h1 className="v5-hero-title">
              너의 가능성을<br />
              <span className="v5-hero-title-accent">빛나게</span> 하는 순간
            </h1>
            <p className="v5-hero-sub">
              국립창원대학교가 제안하는 AI 기반 커리어 설계 플랫폼.<br />
              역량 분석부터 취업 전략까지, 한 곳에서 완성합니다.
            </p>
            <div className="v5-hero-actions">
              <button className="v5-btn-primary" onClick={() => onNavigate('dashboard')}>
                <span>대시보드 바로가기</span>
                <i className="fa-solid fa-arrow-right" />
              </button>
              <button className="v5-btn-ghost" onClick={() => onNavigate('program-apply')}>
                프로그램 둘러보기
              </button>
            </div>
            <div className="v5-hero-trust">
              <div className="v5-trust-item">
                <strong>47,200+</strong>
                <span>누적 상담</span>
              </div>
              <div className="v5-trust-divider" />
              <div className="v5-trust-item">
                <strong>4.87</strong>
                <span>만족도</span>
              </div>
              <div className="v5-trust-divider" />
              <div className="v5-trust-item">
                <strong>82.7%</strong>
                <span>취업예측률</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Stats ── */}
      <section className="v5-section">
        <div className="v5-stats-grid">
          {quickStats.map((s, i) => (
            <div key={i} className="v5-stat-card">
              <div className="v5-stat-icon">
                <i className={s.icon} />
              </div>
              <div className="v5-stat-body">
                <div className="v5-stat-label">{s.label}</div>
                <div className="v5-stat-bottom">
                  <span className="v5-stat-value">{s.value}</span>
                  <span className="v5-stat-unit">{s.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI 커리어 라운지 ── */}
      <section className="v5-section">
        <div className="v5-section-header">
          <div>
            <div className="v5-section-eyebrow">AI CAREER LOUNGE</div>
            <h2>경력개발 로드맵</h2>
          </div>
          <span className="v5-section-sub">인공지능이 분석하는 나의 커리어</span>
        </div>
        <div className="v5-ai-grid">
          {aiFeatures.map((f, i) => (
            <div key={i} className="v5-ai-card" onClick={() => onNavigate(f.page)}>
              <div className="v5-ai-card-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="v5-ai-card-icon">
                <i className={f.icon} />
              </div>
              <div className="v5-ai-card-title">{f.title}</div>
              <div className="v5-ai-card-desc">{f.desc}</div>
              <div className="v5-ai-card-arrow">
                <i className="fa-solid fa-arrow-right" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 프로그램 + 공지 2-column ── */}
      <section className="v5-section">
        <div className="v5-two-col">
          <div>
            <div className="v5-section-header">
              <h2>진로·취업 프로그램</h2>
              <button className="v5-text-btn" onClick={() => onNavigate('program-apply')}>
                전체보기 <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
            <div className="v5-program-list">
              {programs.map((p, i) => (
                <div key={i} className="v5-program-item">
                  <div className="v5-program-icon">
                    <i className={p.icon} />
                  </div>
                  <div className="v5-program-info">
                    <div className="v5-program-title">{p.title}</div>
                    <div className="v5-program-meta">
                      <span><i className="fa-regular fa-calendar" /> {p.date}</span>
                      <span className={p.seats === 0 ? 'v5-seats-closed' : ''}>
                        {p.seats === 0 ? '마감' : `잔여 ${p.seats}석`}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`v5-apply-btn ${p.seats === 0 ? 'v5-apply-btn-disabled' : ''}`}
                    disabled={p.seats === 0}
                    onClick={() => onToast(`"${p.title}" 신청이 완료되었습니다!`, 'success')}
                  >
                    {p.seats === 0 ? '마감' : '신청'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="v5-section-header">
              <h2>공지사항</h2>
              <button className="v5-text-btn" onClick={() => onNavigate('notice')}>
                전체보기 <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
            <div className="v5-notice-list">
              {notices.map((n) => (
                <div key={n.id} className="v5-notice-row" onClick={() => onToast('준비 중인 기능입니다')}>
                  <div className="v5-notice-title">
                    {n.title}
                    {n.isNew && <span className="v5-badge-new">N</span>}
                  </div>
                  <span className="v5-notice-date">{n.date}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="v5-section-header">
                <h2>바로가기</h2>
              </div>
              <div className="v5-link-grid">
                {[
                  { label: '진로심리검사', icon: 'fa-solid fa-brain', page: 'psych-test' as PageId },
                  { label: '상담 신청', icon: 'fa-solid fa-comments', page: 'counsel-career' as PageId },
                  { label: '기업정보', icon: 'fa-solid fa-building', page: 'company-info' as PageId },
                  { label: '마이페이지', icon: 'fa-solid fa-user', page: 'mypage' as PageId },
                ].map((l, i) => (
                  <div key={i} className="v5-link-item" onClick={() => onNavigate(l.page)}>
                    <i className={l.icon} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: 60 }} />
    </div>
  );
}
