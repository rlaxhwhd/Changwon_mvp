import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import PlanetScene, { type PlanetData } from '../scenes/PlanetScene';

const PLANETS: PlanetData[] = [
  {
    id: 'p1',
    stage: 1,
    name: 'GENESIS',
    subtitle: '진로 인식',
    status: 'cleared',
    color: '#5dffb2',
    size: 0.9,
    position: [-10, 0, 0],
  },
  {
    id: 'p2',
    stage: 2,
    name: 'ORION GATE',
    subtitle: '자기 탐색',
    status: 'cleared',
    color: '#5dffb2',
    size: 1.0,
    position: [-5, 1, -2],
  },
  {
    id: 'p3',
    stage: 3,
    name: 'NEBULA OF SELF',
    subtitle: '자기 이해 · 진단',
    status: 'active',
    color: '#55e6ff',
    size: 1.3,
    position: [0, 0, 0],
  },
  {
    id: 'p4',
    stage: 4,
    name: 'ASTEROID OF ACTION',
    subtitle: '경험 축적',
    status: 'locked',
    color: '#9b6bff',
    size: 1.1,
    position: [5, 1, 2],
  },
  {
    id: 'p5',
    stage: 5,
    name: 'TITAN SKILLS',
    subtitle: '역량 강화',
    status: 'locked',
    color: '#9b6bff',
    size: 1.05,
    position: [9, -1, 0],
  },
  {
    id: 'p6',
    stage: 6,
    name: 'NOVA LAUNCH',
    subtitle: '취업 준비',
    status: 'locked',
    color: '#ff5fd2',
    size: 1.0,
    position: [13, 0, -2],
  },
  {
    id: 'p7',
    stage: 7,
    name: 'STARFALL',
    subtitle: '성공적 정착',
    status: 'locked',
    color: '#ffd166',
    size: 1.2,
    position: [17, 1, 0],
  },
];

export default function Roadmap() {
  const [selectedId, setSelectedId] = useState<string>('p3');
  const activePlanet = PLANETS.find((p) => p.status === 'active') ?? PLANETS[0];
  const selected = PLANETS.find((p) => p.id === selectedId) ?? activePlanet;

  const clearedCount = PLANETS.filter((p) => p.status === 'cleared').length;
  const progressPct = Math.round((clearedCount / PLANETS.length) * 100);

  return (
    <div className="page-wrap roadmap-page">
      <PageHeader
        kicker="AI CAREER ROADMAP"
        title="우주여행 커리어맵"
        sub="7개의 행성으로 구성된 진로개발 여정. 각 행성의 미션을 클리어하면 다음 단계로 도약합니다. 행성을 클릭하여 상세 정보를 확인하세요."
      />

      <div className="roadmap-canvas-wrap">
        <div className="roadmap-overlay">
          <div className="roadmap-overlay-block">
            <div className="roadmap-overlay-label">CURRENT MISSION</div>
            <div className="roadmap-overlay-value">{activePlanet.name}</div>
          </div>
          <div className="roadmap-overlay-block">
            <div className="roadmap-overlay-label">PROGRESS</div>
            <div className="roadmap-overlay-value">{clearedCount} / {PLANETS.length} · {progressPct}%</div>
          </div>
        </div>
        <PlanetScene
          planets={PLANETS}
          activePlanetPos={activePlanet.position}
          onPlanetClick={(id) => setSelectedId(id)}
        />
      </div>

      <div className="panel mb-lg">
        <div className="panel-head">
          <div className="panel-title">SELECTED · {selected.name}</div>
          <span className={`planet-badge planet-badge--${selected.status === 'cleared' ? 'done' : selected.status === 'active' ? 'active' : 'lock'}`}>
            {selected.status === 'cleared' ? 'CLEARED' : selected.status === 'active' ? 'IN MISSION' : 'LOCKED'}
          </span>
        </div>
        <div className="grid-2">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 3, color: 'var(--accent-cyan)' }}>
              STAGE {selected.stage.toString().padStart(2, '0')}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, marginTop: 8 }}>
              {selected.name}
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 6 }}>
              {selected.subtitle}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginTop: 20 }}>
              이 행성의 미션은 당신의 진로 개발 여정에서 핵심 단계입니다. 아래 목록에서 세부 미션을 확인하고
              수행하면 역량 포인트가 누적되며, 모든 미션을 완료하면 다음 행성으로 자동 도약합니다.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 12 }}>MISSION CHECKLIST</div>
            {[
              { label: '진단검사 완료', done: selected.status === 'cleared' },
              { label: '자기이해 워크샵 참여', done: selected.status === 'cleared' },
              { label: 'AI 진로 상담', done: false },
              { label: '역량 포트폴리오 작성', done: false },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: m.done ? 'var(--accent-green)' : 'transparent',
                  border: `2px solid ${m.done ? 'var(--accent-green)' : 'var(--border-strong)'}`,
                  display: 'grid', placeItems: 'center',
                }}>
                  {m.done && <i className="fa-solid fa-check" style={{ fontSize: 10, color: '#03040d' }} />}
                </div>
                <span style={{ fontSize: 13, color: m.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: m.done ? 'line-through' : 'none' }}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="planet-list">
        {PLANETS.map((p) => (
          <div
            key={p.id}
            className={`planet-card ${p.status} ${selectedId === p.id ? 'active' : ''}`}
            onClick={() => setSelectedId(p.id)}
          >
            <div className="planet-stage">STAGE {p.stage.toString().padStart(2, '0')}</div>
            <div className="planet-name">{p.name}</div>
            <div className="planet-desc">{p.subtitle}</div>
            <span className={`planet-badge planet-badge--${p.status === 'cleared' ? 'done' : p.status === 'active' ? 'active' : 'lock'}`}>
              {p.status === 'cleared' && <><i className="fa-solid fa-check" /> CLEARED</>}
              {p.status === 'active' && <><i className="fa-solid fa-rocket" /> IN MISSION</>}
              {p.status === 'locked' && <><i className="fa-solid fa-lock" /> LOCKED</>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
