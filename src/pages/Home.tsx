import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

interface Stat {
  icon: string;
  label: string;
  value: string;
  trend?: string;
}

const STATS: Stat[] = [
  { icon: 'fa-solid fa-route', label: 'CURRENT STAGE', value: '3 / 7', trend: '▲ 1 stage this month' },
  { icon: 'fa-solid fa-star', label: 'MILEAGE POINTS', value: '2,840', trend: '▲ +420 this week' },
  { icon: 'fa-solid fa-bullseye', label: 'MISSIONS CLEARED', value: '14', trend: '▲ 3 active' },
  { icon: 'fa-solid fa-chart-line', label: 'CAREER READINESS', value: '72%', trend: '▲ +8% this semester' },
];

interface Mission {
  icon: string;
  title: string;
  meta: string;
  status: 'done' | 'active' | 'locked';
  statusLabel: string;
}

const MISSIONS: Mission[] = [
  { icon: 'fa-solid fa-check', title: '9CORE 진로취업진단 완료', meta: '2026-03-18 · 정확도 94%', status: 'done', statusLabel: 'CLEARED' },
  { icon: 'fa-solid fa-brain', title: 'MBTI 성격심리진단', meta: '진행중 · 32/60', status: 'active', statusLabel: 'IN MISSION' },
  { icon: 'fa-solid fa-file-lines', title: 'AI 자기소개서 첨삭', meta: '대기중', status: 'active', statusLabel: 'READY' },
  { icon: 'fa-solid fa-lock', title: '현직자 멘토링 1:1', meta: '역량개발센터 5단계 이후 해금', status: 'locked', statusLabel: 'LOCKED' },
];

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="page-wrap">
      <PageHeader
        kicker="MISSION CONTROL · HOME"
        title="어서오세요, 김드림 님"
        sub="현재 당신은 3단계 행성 — 자기이해(NEBULA OF SELF)에 있습니다. 다음 행성까지 2개의 미션이 남았어요."
      />

      <div className="grid-4 mb-lg">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon">
              <i className={s.icon} />
            </div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            {s.trend && <div className="stat-card-trend">{s.trend}</div>}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">ACTIVE MISSIONS</div>
            <button className="btn-ghost" onClick={() => navigate('/program/apply')}>
              ALL MISSIONS <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
          {MISSIONS.map((m, i) => (
            <div key={i} className="mission-item">
              <div className="mission-icon">
                <i className={m.icon} />
              </div>
              <div className="mission-body">
                <div className="mission-title">{m.title}</div>
                <div className="mission-meta">{m.meta}</div>
              </div>
              <span className={`mission-status mission-status--${m.status}`}>{m.statusLabel}</span>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">ROADMAP PROGRESS</div>
            <button className="btn-ghost" onClick={() => navigate('/roadmap')}>
              OPEN ROADMAP <i className="fa-solid fa-arrow-right" />
            </button>
          </div>

          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
              CURRENT PLANET
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--accent-cyan)' }}>
              NEBULA OF SELF
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
              자기이해 단계 · 진로와 적성을 깊이 탐색합니다
            </div>

            <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2 }}>
              STAGE PROGRESS · 3 / 7
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: '42%' }} />
            </div>

            <div style={{ marginTop: 28, padding: 16, background: 'rgba(85, 230, 255, 0.06)', border: '1px solid var(--border-nebula)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--accent-cyan)', letterSpacing: 2, marginBottom: 6 }}>
                NEXT PLANET
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                ASTEROID OF ACTION
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                경험축적 단계 · 실습과 프로젝트로 역량을 키웁니다
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel mt-lg">
        <div className="panel-head">
          <div className="panel-title">RECOMMENDED BY AI</div>
          <span className="tag tag--ai">AI RECOMMEND</span>
        </div>
        <div className="grid-3">
          {[
            { title: 'AI 직무 역량 진단', desc: '당신의 전공과 관심사에 맞춘 직무 역량을 분석합니다', icon: 'fa-solid fa-microchip' },
            { title: '포트폴리오 빌더', desc: 'AI가 당신의 활동을 포트폴리오로 자동 구성해드려요', icon: 'fa-solid fa-folder-open' },
            { title: '모의 면접 시뮬레이터', desc: '실제 기업 질문으로 AI 면접을 체험하세요', icon: 'fa-solid fa-video' },
          ].map((c) => (
            <div key={c.title} style={{ padding: 20, background: 'rgba(10, 14, 35, 0.5)', borderRadius: 14, border: '1px solid var(--border-nebula)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--grad-aurora)', display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                <i className={c.icon} style={{ color: '#fff' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                {c.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
