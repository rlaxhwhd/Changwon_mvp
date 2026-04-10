import type { PageId } from '../types';

interface Home2Props {
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

export default function Home2({ onNavigate, onToast }: Home2Props) {
  return (
    <div className="v2-home">
      {/* ── Hero Section ── */}
      <section className="v2-hero" style={{ position: 'relative' }}>
        {/* Center illustration behind all content */}
        <img
          src="/bg-hero2.png"
          alt=""
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '100%',
            width: '70%',
            objectFit: 'contain',
            opacity: 0.3,
            pointerEvents: 'none',
            zIndex: 0,
            mask: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMask: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />
        {/* Tech grid pattern overlay */}
        <div className="v2-hero-grid" />
        <div className="v2-hero-inner">
          <div className="v2-hero-content">
            <div className="v2-hero-badge">
              <span className="v2-hero-badge-dot" />
              DREAMCATCH 2026
            </div>
            <h1 className="v2-hero-title">
              미래를 설계하는<br />가장 스마트한 방법
            </h1>
            <p className="v2-hero-sub">
              AI 기반 역량 분석과 맞춤형 커리어 설계로<br />
              당신의 가능성을 극대화합니다.
            </p>
            <div className="v2-hero-actions">
              <button className="btn v2-btn-hero" onClick={() => onNavigate('dashboard')}>
                대시보드 바로가기
                <i className="fa-solid fa-arrow-right" style={{ marginLeft: 8, fontSize: 12 }} />
              </button>
              <button className="btn v2-btn-hero-outline" onClick={() => onNavigate('program-apply')}>
                프로그램 둘러보기
              </button>
            </div>
          </div>
          {/* Right side: illustration + floating data cards */}
          <div className="v2-hero-visual">
            <div className="v2-hero-card v2-hero-card-1">
              <div className="v2-hero-card-icon"><i className="fa-solid fa-brain" /></div>
              <div>
                <div className="v2-hero-card-label">AI 역량점수</div>
                <div className="v2-hero-card-value">78<span>/100</span></div>
              </div>
            </div>
            <div className="v2-hero-card v2-hero-card-2">
              <div className="v2-hero-card-icon"><i className="fa-solid fa-chart-line" /></div>
              <div>
                <div className="v2-hero-card-label">취업예측률</div>
                <div className="v2-hero-card-value">82<span>%</span></div>
              </div>
            </div>
            <div className="v2-hero-card v2-hero-card-3">
              <div className="v2-hero-card-icon"><i className="fa-solid fa-check-circle" /></div>
              <div>
                <div className="v2-hero-card-label">이수 프로그램</div>
                <div className="v2-hero-card-value">12<span>건</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Stats ── */}
      <section className="v2-section">
        <div className="v2-stats-grid">
          {quickStats.map((s, i) => (
            <div key={i} className="v2-stat-card">
              <div className="v2-stat-top">
                <i className={`${s.icon} v2-stat-icon-inline`} />
                <span className="v2-stat-label">{s.label}</span>
              </div>
              <div className="v2-stat-bottom">
                <span className="v2-stat-value">{s.value}</span>
                <span className="v2-stat-unit">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI 커리어 라운지 ── */}
      <section className="v2-section">
        <div className="v2-section-header">
          <h2>AI 커리어 라운지</h2>
          <span className="v2-section-sub">인공지능이 분석하는 나의 커리어</span>
        </div>
        <div className="v2-ai-grid">
          {aiFeatures.map((f, i) => (
            <div key={i} className="v2-ai-card" onClick={() => onNavigate(f.page)}>
              <div className="v2-ai-card-icon">
                <i className={f.icon} />
              </div>
              <div className="v2-ai-card-body">
                <div className="v2-ai-card-title">{f.title}</div>
                <div className="v2-ai-card-desc">{f.desc}</div>
              </div>
              <i className="fa-solid fa-chevron-right v2-ai-card-arrow" />
            </div>
          ))}
        </div>
      </section>

      {/* ── 프로그램 + 공지 2-column ── */}
      <section className="v2-section">
        <div className="v2-two-col">
          {/* Left: Programs */}
          <div>
            <div className="v2-section-header">
              <h2>진로·취업 프로그램</h2>
              <button className="v2-text-btn" onClick={() => onNavigate('program-apply')}>
                전체보기 <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }} />
              </button>
            </div>
            <div className="v2-program-list">
              {programs.map((p, i) => (
                <div key={i} className="v2-program-item">
                  <div className="v2-program-icon">
                    <i className={p.icon} />
                  </div>
                  <div className="v2-program-info">
                    <div className="v2-program-title">{p.title}</div>
                    <div className="v2-program-meta">
                      <span><i className="fa-regular fa-calendar" /> {p.date}</span>
                      <span className={p.seats === 0 ? 'v2-seats-closed' : ''}>
                        {p.seats === 0 ? '마감' : `잔여 ${p.seats}석`}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`v2-apply-btn ${p.seats === 0 ? 'v2-apply-btn-disabled' : ''}`}
                    disabled={p.seats === 0}
                    onClick={() => onToast(`"${p.title}" 신청이 완료되었습니다!`, 'success')}
                  >
                    {p.seats === 0 ? '마감' : '신청'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Notices + Quick Links */}
          <div>
            <div className="v2-section-header">
              <h2>공지사항</h2>
              <button className="v2-text-btn" onClick={() => onNavigate('notice')}>
                전체보기 <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }} />
              </button>
            </div>
            <div className="v2-notice-list">
              {notices.map((n) => (
                <div key={n.id}
                  className="v2-notice-row"
                  onClick={() => onToast('준비 중인 기능입니다')}
                >
                  <div className="v2-notice-title">
                    {n.title}
                    {n.isNew && <span className="v2-badge-new">N</span>}
                  </div>
                  <span className="v2-notice-date">{n.date}</span>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div style={{ marginTop: 20 }}>
              <div className="v2-section-header">
                <h2>바로가기</h2>
              </div>
              <div className="v2-link-grid">
                {[
                  { label: '진로심리검사', icon: 'fa-solid fa-brain', page: 'psych-test' as PageId },
                  { label: '상담 신청', icon: 'fa-solid fa-comments', page: 'counsel-career' as PageId },
                  { label: '기업정보', icon: 'fa-solid fa-building', page: 'company-info' as PageId },
                  { label: '마이페이지', icon: 'fa-solid fa-user', page: 'mypage' as PageId },
                ].map((l, i) => (
                  <div key={i} className="v2-link-item" onClick={() => onNavigate(l.page)}>
                    <i className={l.icon} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacer */}
      <div style={{ height: 40 }} />
    </div>
  );
}
