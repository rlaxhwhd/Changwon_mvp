import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveStudent } from '../../data/students'
import './FinalRoadmap.css'

/* ============================================================
   AI가 두 페이지(직무 로드맵 + 진로 로드맵) 데이터를 종합해
   "지금부터 졸업까지 무엇을 어떻게 할지" 처방하는 실행 로드맵
   ============================================================ */

type Priority = 'P0' | 'P1' | 'P2'

/* ─── Priority pill 라벨 ──────────────────────────────────── */
const PRI_META: Record<Priority, { label: string; cls: string }> = {
  P0: { label: 'P0 · 긴급', cls: 'fr-pri-p0' },
  P1: { label: 'P1 · 중요', cls: 'fr-pri-p1' },
  P2: { label: 'P2 · 일반', cls: 'fr-pri-p2' },
}

/* ============================================================
   Component
   ============================================================ */
export default function FinalRoadmap() {
  const navigate = useNavigate()
  const student = getActiveStudent()
  const fr = student.finalRoadmap
  const [chosenScenario, setChosenScenario] = useState<'A' | 'B'>('A')

  return (
    <div className="fr-wrap">
      <div className="fr-breadcrumb">
        <span>진로취업 로드맵</span>
        <i className="fa-solid fa-chevron-right" />
        <span className="active">최종 로드맵</span>
      </div>

      {/* ─── Hero — Now vs Goal ───────────────────────────────── */}
      <section className="fr-hero">
        <div className="fr-hero-text">
          <p className="fr-eyebrow">AI FINAL CAREER ROADMAP</p>
          <h1>{student.name} 학생, 졸업까지의 실행 계획입니다.</h1>
          <p className="fr-hero-sub">
            직무 로드맵의 역량 데이터와 진로 로드맵의 목표 데이터를 종합해,
            <strong> 지금부터 졸업까지 무엇을 언제까지 해야 하는지</strong>를 우선순위로 정리했습니다.
          </p>
        </div>
        <div className="fr-hero-stats">
          <div className="fr-stat">
            <span>현재 매칭률</span>
            <strong className="fr-stat-now">{fr.matchNow}<small>%</small></strong>
          </div>
          <i className="fa-solid fa-arrow-right fr-stat-arrow" />
          <div className="fr-stat">
            <span>졸업 시 예상</span>
            <strong className="fr-stat-goal">{fr.matchGoal}<small>%</small></strong>
          </div>
        </div>
      </section>

      {/* ─── 01 AI 핵심 진단 ─────────────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">01</span>
          <div>
            <h2>AI 핵심 진단</h2>
            <p>두 로드맵 데이터를 종합한 3가지 핵심 발견</p>
          </div>
        </header>
        <div className="fr-insight-grid">
          {fr.insights.map(ins => (
            <article key={ins.title} className="fr-insight-card">
              <span className="fr-insight-tag">{ins.tag}</span>
              <h3>{ins.title}</h3>
              <p>{ins.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 02 시나리오 선택 ───────────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">02</span>
          <div>
            <h2>1차 의사결정 — 어느 직무로 갈까?</h2>
            <p>두 시나리오 중 하나를 정해야 이후 모든 액션이 정렬됩니다. 이번 주 안에 결정 권장.</p>
          </div>
        </header>
        <div className="fr-scenario-grid">
          {fr.scenarios.map(sc => {
            const isSelected = chosenScenario === sc.id
            return (
              <article
                key={sc.id}
                className={`fr-scenario-card${isSelected ? ' selected' : ''}`}
                onClick={() => setChosenScenario(sc.id as 'A' | 'B')}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') setChosenScenario(sc.id as 'A' | 'B') }}
              >
                <div className="fr-scenario-head">
                  <span className={`fr-scenario-badge ${sc.id === 'A' ? 'rec' : 'goal'}`}>{sc.badge}</span>
                  <span className="fr-scenario-fit">{sc.fit}%<small> 적합도</small></span>
                </div>
                <h3>{sc.title}</h3>

                <p className="fr-scenario-label">장점</p>
                <ul className="fr-scenario-list">
                  {sc.pros.map(p => <li key={p}><i className="fa-solid fa-check" />{p}</li>)}
                </ul>

                <p className="fr-scenario-label">단점 / 추가 필요</p>
                <ul className="fr-scenario-list cons">
                  {sc.cons.map(c => <li key={c}><i className="fa-solid fa-xmark" />{c}</li>)}
                </ul>

                <div className="fr-scenario-targets">
                  {sc.targets.map(t => <span key={t}>{t}</span>)}
                </div>

                <div className="fr-scenario-foot">
                  {isSelected
                    ? <span className="fr-scenario-chosen"><i className="fa-solid fa-circle-check" /> 이 시나리오 선택됨</span>
                    : <span className="fr-scenario-pick">클릭해서 선택</span>}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* ─── 03 이번 주 액션 ────────────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">03</span>
          <div>
            <h2>이번 주 액션</h2>
            <p>오늘부터 7일 안에 끝낼 일. P0는 미루면 전체 로드맵이 밀립니다.</p>
          </div>
        </header>
        <div className="fr-action-grid">
          {fr.thisWeek.map(a => (
            <article key={a.id} className="fr-action-card">
              <div className="fr-action-top">
                <span className={`fr-pri ${PRI_META[a.priority].cls}`}>{PRI_META[a.priority].label}</span>
                <span className="fr-action-due"><i className="fa-regular fa-clock" /> {a.due}</span>
              </div>
              <h3>{a.title}</h3>
              <p className="fr-action-why">{a.why}</p>
              <div className="fr-action-meta">
                <span><i className="fa-regular fa-hourglass-half" /> {a.effort}</span>
                <span className="fr-action-impact"><i className="fa-solid fa-arrow-trend-up" /> {a.impactLabel}</span>
              </div>
              <button className="fr-action-btn" onClick={() => navigate(a.linkPath)}>
                {a.linkLabel} <i className="fa-solid fa-arrow-right" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 04 학기별 분기 로드맵 (Timeline) ──────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">04</span>
          <div>
            <h2>졸업까지 — 분기별 로드맵</h2>
            <p>매 분기 종료 시점의 예상 매칭률을 기준으로 마일스톤을 배치했습니다.</p>
          </div>
        </header>
        <div className="fr-timeline">
          {fr.quarters.map((q, idx) => (
            <article key={q.q} className={`fr-tl-card${idx === 0 ? ' current' : ''}`}>
              <div className="fr-tl-mark">
                <span className="fr-tl-q">{q.q}</span>
                <span className="fr-tl-period">{q.period}</span>
              </div>
              <div className="fr-tl-body">
                <div className="fr-tl-head">
                  <strong>{q.semester}</strong>
                  <span className="fr-tl-match">예상 매칭률 {q.expectedMatch}%</span>
                </div>
                <p className="fr-tl-focus">{q.focus}</p>
                <ul className="fr-tl-list">
                  {q.milestones.map(m => (
                    <li key={m}><i className="fa-solid fa-flag" />{m}</li>
                  ))}
                </ul>
                <div className="fr-tl-bar">
                  <div className="fr-tl-bar-fill" style={{ width: `${q.expectedMatch}%` }} />
                  <span>{q.expectedMatch}%</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 05 우선순위 매트릭스 ─────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">05</span>
          <div>
            <h2>우선순위 매트릭스</h2>
            <p>같은 시간을 써도 결과가 다릅니다. 좌상단부터 시작하세요.</p>
          </div>
        </header>
        <div className="fr-matrix">
          {fr.matrix.map((cell, idx) => (
            <div key={cell.label} className={`fr-mx-cell fr-mx-${idx}`}>
              <span className="fr-mx-label">{cell.label}</span>
              <ul>
                {cell.items.map(it => (
                  <li key={it.title}>
                    <strong>{it.title}</strong>
                    <small>{it.meta}</small>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 06 AI 코치 메시지 ────────────────────────────── */}
      <section className="fr-section fr-coach">
        <i className="fa-solid fa-robot fr-coach-icon" />
        <div>
          <h2>AI 코치의 한마디</h2>
          <p>
            <strong>{student.name} 학생</strong>, {fr.coach}
          </p>
          <div className="fr-coach-actions">
            <button className="fr-coach-btn primary" onClick={() => navigate('/counsel/professor')}>
              <i className="fa-solid fa-user-tie" /> 지도교수 상담 신청
            </button>
            <button className="fr-coach-btn" onClick={() => navigate('/roadmap/ai')}>
              <i className="fa-solid fa-route" /> 진로 로드맵 다시 보기
            </button>
            <button className="fr-coach-btn" onClick={() => navigate('/roadmap/skill-tree')}>
              <i className="fa-solid fa-sitemap" /> 직무 로드맵 다시 보기
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
