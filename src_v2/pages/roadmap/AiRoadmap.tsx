import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveStudent, getStudentIap, type TermLabel } from '../../data/students'
import './AiRoadmap.css'
import './AiRoadmapIap.css'

type PhaseStatus = 'done' | 'active' | 'upcoming'

const statusLabel: Record<PhaseStatus, string> = {
  done: '완료',
  active: '진행 중',
  upcoming: '예정',
}

function parseLinkedTask(text: string): { term: TermLabel; title: string; why: string } | null {
  const m = text.match(/^\[(단기|중기|장기)\s*연계\]\s*(.+?)\s*—\s*(.+)$/)
  if (!m) return null
  return { term: m[1] as TermLabel, title: m[2].trim(), why: m[3].trim() }
}

const termIcon: Record<TermLabel, string> = {
  단기: 'fa-bolt',
  중기: 'fa-chart-line',
  장기: 'fa-flag-checkered',
}

const termOrder: TermLabel[] = ['단기', '중기', '장기']

// 중요도 가중치(0~1)를 상/중/하 + 게이지로 직관 표시
function ImportanceBadge({ label }: { label: string }) {
  const m = label.match(/([0-9]*\.?[0-9]+)/)
  const w = m ? parseFloat(m[1]) : 0
  const level = w >= 0.35 ? '높음' : w >= 0.2 ? '보통' : '낮음'
  const color = w >= 0.35 ? '#DC2626' : w >= 0.2 ? '#D97706' : '#6B7280'
  const bg = w >= 0.35 ? '#FEE2E2' : w >= 0.2 ? '#FEF3C7' : '#F3F4F6'
  const pct = Math.min(Math.round((w / 0.4) * 100), 100)
  return (
    <span
      className="ar-imp-weight"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px', borderRadius: 999, background: bg, color, fontSize: 13, fontWeight: 800 }}
      title={`보강 중요도 ${level} (가중치 ${w})`}
    >
      중요도 {level}
      <span style={{ width: 34, height: 5, borderRadius: 999, background: 'rgba(0,0,0,0.10)', overflow: 'hidden', display: 'inline-block' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
      </span>
    </span>
  )
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)

  return (
    <div className="ar-ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} className="ar-ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="ar-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ar-ring-text">
        <strong>{pct}<small>%</small></strong>
        <span>달성률</span>
      </div>
    </div>
  )
}

export default function AiRoadmap() {
  const navigate = useNavigate()
  const student = getActiveStudent()
  const profile = student
  const iap = getStudentIap(student)
  const phases = student.phases
  const targetCompany = student.targetCompany
  const strengthWeakness = student.strengthWeakness
  const gapItems = student.gapItems
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set())
  const [expandedTerm, setExpandedTerm] = useState<TermLabel | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [roadmapGenerated, setRoadmapGenerated] = useState(false)
  const [form, setForm] = useState({ company: student.targetCompany.name, role: student.targetRole, gpa: student.gpa, cert: student.language })

  // PHASE2(상담·IAP)가 완료되면 로드맵 생성 가능. 생성 전에는 PHASE3+ 숨김.
  const phase2Done = phases.find(phase => phase.num === 2)?.status === 'done'
  const visiblePhases = roadmapGenerated ? phases : phases.filter(phase => phase.num <= 2)
  const progress = Math.round((phases.filter(phase => phase.status === 'done').length / phases.length) * 100)

  const handleGenerateRoadmap = () => {
    if (!phase2Done) return
    setGenerating(true)
    window.setTimeout(() => {
      setGenerating(false)
      setRoadmapGenerated(true)
    }, 1600)
  }

  const togglePhase = (num: number) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const handleGenerate = () => {
    setIsModalOpen(false)
    setGenerating(true)
    window.setTimeout(() => setGenerating(false), 1600)
  }

  return (
    <div className="ar-wrap">
      <div className="ar-breadcrumb">
        <span>진로취업 로드맵</span>
        <i className="fa-solid fa-chevron-right" />
        <span className="active">AI 진로로드맵</span>
      </div>

      <section className="ar-hero">
        <div className="ar-hero-copy">
          <p className="ar-eyebrow">AI CAREER ROADMAP</p>
          <h1>AI가 설계한 맞춤 진로 로드맵</h1>
          <p>진단 결과, 상담 이력, 학생 정보와 목표 기업 조건을 연결해 다음 행동을 우선순위로 보여줍니다.</p>
          <div className="ar-iap-chips">
            <span className="ar-chip ar-chip-type">
              <i className="fa-solid fa-user-tag" />{profile.studentType}
            </span>
            <span className="ar-chip ar-chip-iap">
              <i className="fa-solid fa-diagram-project" />IAP {iap.label}
            </span>
            <span className="ar-chip ar-chip-grade">
              <i className="fa-solid fa-graduation-cap" />{profile.grade}학년 · {iap.track} 트랙
            </span>
          </div>
          <div className="ar-hero-actions">
            {roadmapGenerated ? (
              <button className="ar-primary-btn" onClick={() => setIsModalOpen(true)}>
                <i className="fa-solid fa-wand-magic-sparkles" />
                로드맵 재생성
              </button>
            ) : (
              <button className="ar-primary-btn" onClick={handleGenerateRoadmap} disabled={!phase2Done}>
                <i className="fa-solid fa-wand-magic-sparkles" />
                로드맵 생성하기
              </button>
            )}
            <button className="ar-ghost-btn" onClick={() => navigate('/main')}>
              대시보드
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
        <div className="ar-hero-panel">
          <ProgressRing pct={progress} />
          <div>
            <span className="ar-panel-label">목표</span>
            <strong>{targetCompany.name} · {targetCompany.role}</strong>
          </div>
        </div>
      </section>

      {generating ? (
        <section className="ar-loading">
          <i className="fa-solid fa-spinner fa-spin" />
          <strong>AI가 최신 정보를 반영하고 있습니다</strong>
          <div className="ar-skeleton" />
          <div className="ar-skeleton short" />
        </section>
      ) : (
        <div className="ar-body">
          <main className="ar-main">
            <section className="ar-section">
              <div className="ar-section-head">
                <h2>커리어 로드맵</h2>
                <span>6단계 성장 경로 · IAP {iap.label}</span>
              </div>

              <div className="ar-phase-list">
                {visiblePhases.map(phase => {
                  const isCollapsed = collapsedPhases.has(phase.num)
                  return (
                  <article key={phase.num} className={`ar-phase ar-phase-${phase.status} ${isCollapsed ? 'ar-phase-collapsed' : 'ar-phase-expanded'}`}>
                    <button className="ar-phase-head" onClick={() => togglePhase(phase.num)}>
                      <div className="ar-phase-left">
                        <span className="ar-phase-icon">
                          <i className={`fa-solid ${phase.icon}`} />
                        </span>
                        <span>
                          <small>PHASE {phase.num}</small>
                          <strong>{phase.title}</strong>
                        </span>
                      </div>
                      <div className="ar-phase-right">
                        <span>{phase.period}</span>
                        <em>{statusLabel[phase.status]}</em>
                        <i className={`fa-solid fa-chevron-${collapsedPhases.has(phase.num) ? 'down' : 'up'}`} />
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="ar-phase-content">
                        {phase.num === 3 && phase.termDetails ? (
                          <div className="ar-term-grid">
                            {termOrder.map(label => {
                              const detail = phase.termDetails?.[label]
                              if (!detail) return null
                              const isOpen = expandedTerm === label
                              const isDone = detail.done ?? false
                              return (
                                <div
                                  key={label}
                                  className={`ar-term-card${isDone ? ' done' : ''}${isOpen ? ' open' : ''}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setExpandedTerm(prev => (prev === label ? null : label))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      setExpandedTerm(prev => (prev === label ? null : label))
                                    }
                                  }}
                                  aria-expanded={isOpen}
                                >
                                  <div className="ar-term-head">
                                    <span className="ar-term-badge">
                                      <i className={`fa-solid ${termIcon[label]}`} />
                                      {label}
                                    </span>
                                    <span className="ar-term-period">{detail.period}</span>
                                    <span className={`ar-term-status${isDone ? ' done' : ''}`}>
                                      {isDone
                                        ? <><i className="fa-solid fa-circle-check" /> 완료</>
                                        : <><i className="fa-regular fa-circle-dot" /> 진행 중</>}
                                    </span>
                                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} ar-term-chev`} />
                                  </div>
                                  <div className="ar-term-headline">{detail.headline}</div>
                                  {!isOpen && (
                                    <div className="ar-term-summary">
                                      {detail.items.length}개 목표 · 클릭해서 자세한 추천 근거 보기
                                    </div>
                                  )}
                                  {isOpen && (
                                    <>
                                      <p className="ar-term-rationale">
                                        <i className="fa-solid fa-lightbulb" /> {detail.rationale}
                                      </p>
                                      <ul className="ar-term-items">
                                        {detail.items.map((item, i) => (
                                          <li key={i} className="ar-term-item">
                                            <div className="ar-term-item-head">
                                              <span className={`ar-pri-chip ar-pri-${item.priority}`}>{item.priority}</span>
                                              <span className={`ar-imp-chip ar-imp-${item.importance}`}>{item.importance}</span>
                                              <strong className="ar-term-item-title">{item.title}</strong>
                                            </div>
                                            <p className="ar-term-item-why">{item.why}</p>
                                          </li>
                                        ))}
                                      </ul>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : phase.num === 4 && phase.tasks.some(t => parseLinkedTask(t.text)) ? (
                          <div className="ar-link-groups">
                            {termOrder.map(label => {
                              const grouped = phase.tasks
                                .map(task => ({ task, parsed: parseLinkedTask(task.text) }))
                                .filter(x => x.parsed?.term === label)
                              if (grouped.length === 0) return null
                              return (
                                <section key={label} className={`ar-link-group ar-link-group-${label}`}>
                                  <header className="ar-link-group-head">
                                    <span className="ar-term-badge">
                                      <i className={`fa-solid ${termIcon[label]}`} />
                                      {label} 연계
                                    </span>
                                    <span className="ar-link-group-count">{grouped.length}개 실행 항목</span>
                                  </header>
                                  <ul className="ar-link-list">
                                    {grouped.map(({ task, parsed }, i) => (
                                      <li key={i} className={`ar-link-item${task.done ? ' done' : ''}`}>
                                        <i className={task.done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} />
                                        <div>
                                          <strong>{parsed!.title}</strong>
                                          <p>{parsed!.why}</p>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="ar-task-list">
                            {phase.tasks.map(task => (
                              <div key={task.text} className={`ar-task ${task.done ? 'done' : ''}`}>
                                <i className={task.done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} />
                                <span>{task.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="ar-recommend">
                          <i className="fa-solid fa-lightbulb" />
                          <p>{phase.recommendation}</p>
                        </div>
                        <button className="ar-small-btn" onClick={() => navigate(phase.nextPath)}>
                          자세히 보기
                          <i className="fa-solid fa-arrow-right" />
                        </button>
                      </div>
                    )}
                  </article>
                  )
                })}
              </div>

              {!roadmapGenerated && (
                <div className="ar-generate-cta">
                  <div className="ar-generate-locked">
                    <span className="ar-generate-lock-ico"><i className="fa-solid fa-lock" /></span>
                    <div>
                      <strong>PHASE 3 ~ 6 로드맵이 잠겨 있습니다</strong>
                      <p>진단 · 상담 · IAP({iap.label}) 결과를 분석해 단·중·장기 계획과 실행 추천을 생성합니다.</p>
                    </div>
                  </div>
                  <button className="ar-generate-btn" onClick={handleGenerateRoadmap} disabled={!phase2Done}>
                    <i className="fa-solid fa-wand-magic-sparkles" />
                    로드맵 생성하기
                  </button>
                  {!phase2Done && <p className="ar-generate-hint">PHASE 2 (상담 · IAP) 완료 후 활성화됩니다</p>}
                </div>
              )}
            </section>

            {roadmapGenerated && (
              <>
            <section className="ar-iap-card">
              <div className="ar-iap-head">
                <span className="ar-panel-label">INDIVIDUALIZED ACTION PLAN</span>
                <h2>IAP {iap.label}</h2>
                <p>{profile.studentType} · {iap.grade} · {iap.track} 트랙</p>
              </div>
              <div className="ar-iap-grid">
                <div>
                  <small>목표 직무 / 진로</small>
                  <strong>{profile.targetRole}</strong>
                </div>
                <div>
                  <small>핵심 목표</small>
                  <strong>{iap.goal}</strong>
                </div>
                <div>
                  <small>실행 방향</small>
                  <strong>{iap.focus}</strong>
                </div>
                <div>
                  <small>단계 구성</small>
                  <strong>단기 · 중기 · 장기 (CARE+7)</strong>
                </div>
              </div>
              <div className="ar-iap-counsel">
                <i className="fa-solid fa-quote-left" />
                <p>
                  상담사 코멘트 · {profile.studentType} 학생 · {iap.goal}. {iap.focus} 중심으로 진행하세요.
                </p>
              </div>
            </section>

            <section className="ar-target-card">
              <div className="ar-target-top">
                <div>
                  <span className="ar-panel-label">TARGET COMPANY</span>
                  <h2>{targetCompany.name}</h2>
                  <p>{targetCompany.industry} · {targetCompany.role}</p>
                </div>
                <div className="ar-match-score">
                  <strong>{targetCompany.matchScore}%</strong>
                  <span>AI 매칭률</span>
                </div>
              </div>

              <div className="ar-req-list">
                {targetCompany.requirements.map(req => {
                  const pct = Math.min(Math.round((req.current / req.target) * 100), 100)
                  return (
                    <div key={req.label} className="ar-req-row">
                      <span>{req.label}</span>
                      <div className="ar-bar">
                        <div style={{ width: `${pct}%` }} />
                      </div>
                      <strong>{req.current}/{req.target}{req.unit}</strong>
                    </div>
                  )
                })}
              </div>

              <div className="ar-ai-tip">
                <i className="fa-solid fa-robot" />
                <p>{targetCompany.name} {targetCompany.role} 합격 가능성을 높이려면 아래 보강 항목을 우선순위대로 채우세요.</p>
              </div>
            </section>

            <section className="ar-section">
              <div className="ar-section-head">
                <h2>AI 역량 분석</h2>
                <span>강점과 보강 영역</span>
              </div>
              <div className="ar-sw-grid">
                {(['strength', 'weakness'] as const).map(type => (
                  <div key={type} className="ar-sw-card">
                    <h3>
                      <i className={`fa-solid ${type === 'strength' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} />
                      {type === 'strength' ? '강점' : '보강 필요'}
                    </h3>
                    {strengthWeakness.filter(item => item.type === type).map(item => (
                      <div key={item.label} className="ar-sw-row">
                        <span>{item.label}</span>
                        <div className="ar-bar">
                          <div style={{ width: `${item.value}%` }} />
                        </div>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section className="ar-section">
              <div className="ar-section-head">
                <h2>보강이 필요한 항목</h2>
                <span>{gapItems.length}개 항목</span>
              </div>
              <div className="ar-gap-list">
                {gapItems.map(item => (
                  <article key={item.title} className={`ar-gap-card ${item.severity}`}>
                    <div className="ar-gap-top">
                      <i className="fa-solid fa-circle-exclamation" />
                      <strong>{item.title}</strong>
                      {item.badges.map(badge => (
                        badge.type === 'weight'
                          ? <ImportanceBadge key={`${item.title}-${badge.label}`} label={badge.label} />
                          : <span key={`${item.title}-${badge.label}`} className={badge.type}>{badge.label}</span>
                      ))}
                    </div>
                    <p>{item.desc}</p>
                    <div className="ar-gap-progress">
                      <div className="ar-bar"><div style={{ width: `${item.pct}%` }} /></div>
                      <strong>{item.pct}%</strong>
                    </div>
                    <div className="ar-gap-meta">
                      <span>현재 <b>{item.current}</b></span>
                      <span>목표 <b>{item.target}</b></span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
              </>
            )}
          </main>

          {roadmapGenerated && (
          <aside className="ar-sidebar">
            <div className="ar-side-card">
              <h3>AI 종합 인사이트</h3>
              <p>{student.insight}</p>
            </div>

            <div className="ar-side-card">
              <h3>우선순위 요약</h3>
              <div className="ar-priority-row high"><span />긴급 <strong>{student.priority.high}개</strong></div>
              <div className="ar-priority-row medium"><span />보통 <strong>{student.priority.medium}개</strong></div>
              <div className="ar-priority-row low"><span />낮음 <strong>{student.priority.low}개</strong></div>
            </div>

          </aside>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="ar-modal-backdrop" role="presentation" onMouseDown={() => setIsModalOpen(false)}>
          <div className="ar-modal" role="dialog" aria-modal="true" aria-labelledby="roadmap-modal-title" onMouseDown={e => e.stopPropagation()}>
            <div className="ar-modal-head">
              <h2 id="roadmap-modal-title">AI 로드맵 재생성</h2>
              <button aria-label="닫기" onClick={() => setIsModalOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p>정보를 수정하면 더 정확한 로드맵을 받을 수 있습니다.</p>
            <label>
              목표 기업
              <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </label>
            <label>
              목표 직무
              <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
            </label>
            <label>
              현재 학점
              <input value={form.gpa} onChange={e => setForm({ ...form, gpa: e.target.value })} />
            </label>
            <label>
              보유 자격증
              <input value={form.cert} onChange={e => setForm({ ...form, cert: e.target.value })} />
            </label>
            <div className="ar-modal-actions">
              <button className="ar-ghost-btn" onClick={() => setIsModalOpen(false)}>취소</button>
              <button className="ar-primary-btn" onClick={handleGenerate}>
                <i className="fa-solid fa-wand-magic-sparkles" />
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
