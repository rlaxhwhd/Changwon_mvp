import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AiRoadmap.css'

type PhaseStatus = 'done' | 'active' | 'upcoming'

interface Phase {
  num: number
  title: string
  icon: string
  status: PhaseStatus
  period: string
  tasks: { text: string; done: boolean }[]
  recommendation: string
  nextPath: string
}

interface TargetCompany {
  name: string
  industry: string
  role: string
  matchScore: number
  requirements: { label: string; current: number; target: number; unit?: string }[]
}

interface GapItem {
  title: string
  badges: { label: string; type: 'required' | 'preferred' | 'weight' }[]
  desc: string
  pct: number
  current: string
  target: string
  severity: 'critical' | 'warn' | 'info'
}

const PHASES: Phase[] = [
  {
    num: 1,
    title: '나를 알기',
    icon: 'fa-clipboard-check',
    status: 'done',
    period: '2025.03 ~ 2025.08',
    tasks: [
      { text: '9CORE 진로적성검사 완료, 종합 68점', done: true },
      { text: 'CARES 직무역량검사 완료, 분석력 상위 25%', done: true },
      { text: 'MBTI 성격유형검사 완료, INTJ-A', done: true },
      { text: '인적성검사 종합 80점 달성', done: true },
      { text: '진로심리상담 1회 완료, 목표 직무 설정', done: true },
    ],
    recommendation: '진단 결과를 바탕으로 목표 기업과 직무를 설정했습니다.',
    nextPath: '/diagnosis/employment',
  },
  {
    num: 2,
    title: '전문 상담',
    icon: 'fa-comments',
    status: 'done',
    period: '2025.05 ~ 2025.08',
    tasks: [
      { text: '진로취업상담 2회 완료, IT PM 직무 탐색', done: true },
      { text: '심리상담 1회 완료, 취업 스트레스 관리', done: true },
      { text: '선배 멘토링 참여, 현직자 피드백 확보', done: true },
      { text: '직무 적합도 리포트 발급 완료', done: true },
    ],
    recommendation: '상담을 통해 IT PM 방향성이 구체화되었습니다. 로드맵 실행 단계로 넘어가세요.',
    nextPath: '/counsel/career',
  },
  {
    num: 3,
    title: '로드맵 생성',
    icon: 'fa-route',
    status: 'active',
    period: '2025.09 ~ 현재',
    tasks: [
      { text: 'AI 맞춤 로드맵 1차 생성 완료', done: true },
      { text: '목표 기업 설정: 넥슨코리아 IT PM', done: true },
      { text: '역량 GAP 분석 리포트 확인', done: true },
      { text: '취업예측분석 리포트 확인, 합격률 68%', done: false },
      { text: '로드맵 기반 학기별 세부 계획 수립', done: false },
    ],
    recommendation: 'GAP 분석을 참고해 프로젝트 경험과 어학 점수를 우선 보강하세요.',
    nextPath: '/jobs/prediction',
  },
  {
    num: 4,
    title: '역량 강화',
    icon: 'fa-chart-line',
    status: 'upcoming',
    period: '2026.03 ~ 2026.12',
    tasks: [
      { text: 'TOEIC 700점 이상 취득, 현재 550점', done: false },
      { text: 'PMP 또는 CAPM 자격증 학습 및 취득', done: false },
      { text: '캡스톤디자인 프로젝트 참여, PM 역할 수행', done: false },
      { text: '게임/IT 관련 인턴 지원 및 참여', done: false },
      { text: '비교과 프로그램 3건 이상 이수', done: false },
      { text: '포트폴리오 프로젝트 2건 완성', done: false },
    ],
    recommendation: '프로젝트 경험과 어학 점수가 가장 시급합니다. 비교과 프로그램을 먼저 신청하세요.',
    nextPath: '/growth/program',
  },
  {
    num: 5,
    title: '취업 지원',
    icon: 'fa-briefcase',
    status: 'upcoming',
    period: '2027.03 ~ 2027.08',
    tasks: [
      { text: 'AI 자기소개서 작성 및 첨삭, 넥슨 IT PM 맞춤', done: false },
      { text: 'AI 모의면접 3회 이상 연습', done: false },
      { text: '넥슨코리아 IT PM 공채 지원', done: false },
      { text: '이력서와 포트폴리오 최종 점검', done: false },
      { text: '삼성 DS, LG전자 PM 직군 병행 지원', done: false },
    ],
    recommendation: 'AI 자소서와 모의면접으로 최종 완성도를 높이고 병행 지원 전략을 세우세요.',
    nextPath: '/jobs/home',
  },
]

const targetCompany: TargetCompany = {
  name: '넥슨코리아',
  industry: '게임 · IT 서비스',
  role: 'IT Project Manager',
  matchScore: 68,
  requirements: [
    { label: '어학', current: 550, target: 700, unit: '점' },
    { label: 'IT 자격증', current: 1, target: 3, unit: '개' },
    { label: '프로젝트 경험', current: 0, target: 2, unit: '건' },
    { label: '인턴 경험', current: 0, target: 1, unit: '회' },
  ],
}

const strengthWeakness = [
  { label: '학점', value: 90, type: 'strength' as const },
  { label: '인성/심리', value: 80, type: 'strength' as const },
  { label: '어학', value: 20, type: 'weakness' as const },
  { label: 'IT 자격증', value: 40, type: 'weakness' as const },
]

const gapItems: GapItem[] = [
  {
    title: '프로젝트 포트폴리오',
    badges: [{ label: '필수', type: 'required' }, { label: '가중치 0.4', type: 'weight' }],
    desc: 'IT PM 지원에는 프로젝트 관리 경험이 핵심입니다. 현재 관련 프로젝트 경험이 부족해 가장 먼저 보강해야 합니다.',
    pct: 0,
    current: '미보유',
    target: '프로젝트 2건',
    severity: 'critical',
  },
  {
    title: '인턴/실무 경험',
    badges: [{ label: '우대', type: 'preferred' }, { label: '가중치 0.2', type: 'weight' }],
    desc: '게임 또는 IT 서비스 인턴 경험이 있으면 서류 합격 가능성이 크게 올라갑니다.',
    pct: 25,
    current: '대외활동 2건',
    target: '관련 인턴 1회',
    severity: 'critical',
  },
  {
    title: 'TOEIC 점수',
    badges: [{ label: '필수', type: 'required' }, { label: '가중치 0.3', type: 'weight' }],
    desc: '현재 550점으로 기준 점수인 700점에 미달합니다. 150점 향상이 필요합니다.',
    pct: 78,
    current: '550점',
    target: '700점 이상',
    severity: 'warn',
  },
  {
    title: 'IT 자격증',
    badges: [{ label: '우대', type: 'preferred' }, { label: '가중치 0.1', type: 'weight' }],
    desc: 'SQLD를 보유하고 있으나 PM 직무에는 PMP 또는 CAPM 자격증이 있으면 강점이 됩니다.',
    pct: 30,
    current: 'SQLD 1개',
    target: 'PMP 또는 CAPM',
    severity: 'info',
  },
]

const statusLabel: Record<PhaseStatus, string> = {
  done: '완료',
  active: '진행 중',
  upcoming: '예정',
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
        <strong>{pct}%</strong>
        <span>달성률</span>
      </div>
    </div>
  )
}

export default function AiRoadmap() {
  const navigate = useNavigate()
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ company: '넥슨코리아', role: 'IT PM', gpa: '4.3', cert: 'SQLD, TOEIC 550' })

  const activePhase = PHASES.find(phase => phase.status === 'active')
  const progress = Math.round((PHASES.filter(phase => phase.status === 'done').length / PHASES.length) * 100)

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
        <span>경력개발 로드맵</span>
        <i className="fa-solid fa-chevron-right" />
        <span className="active">AI 진로로드맵</span>
      </div>

      <section className="ar-hero">
        <div className="ar-hero-copy">
          <p className="ar-eyebrow">AI CAREER ROADMAP</p>
          <h1>AI가 설계한 맞춤 진로 로드맵</h1>
          <p>진단 결과, 상담 이력, 학생 정보와 목표 기업 조건을 연결해 다음 행동을 우선순위로 보여줍니다.</p>
          <div className="ar-hero-actions">
            <button className="ar-primary-btn" onClick={() => setIsModalOpen(true)}>
              <i className="fa-solid fa-wand-magic-sparkles" />
              로드맵 재생성
            </button>
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
            <p>현재 매칭률 {targetCompany.matchScore}%</p>
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
                <span>5단계 성장 경로</span>
              </div>

              <div className="ar-phase-list">
                {PHASES.map(phase => (
                  <article key={phase.num} className={`ar-phase ar-phase-${phase.status}`}>
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

                    {!collapsedPhases.has(phase.num) && (
                      <div className="ar-phase-content">
                        <div className="ar-task-list">
                          {phase.tasks.map(task => (
                            <div key={task.text} className={`ar-task ${task.done ? 'done' : ''}`}>
                              <i className={task.done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} />
                              <span>{task.text}</span>
                            </div>
                          ))}
                        </div>
                        <div className="ar-recommend">
                          <i className="fa-solid fa-lightbulb" />
                          <p>{phase.recommendation}</p>
                        </div>
                        <button className="ar-small-btn" onClick={() => navigate(phase.nextPath)}>
                          다음 단계로
                          <i className="fa-solid fa-arrow-right" />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
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
                <p>넥슨코리아 IT PM 합격 가능성을 높이려면 TOEIC 150점 향상과 IT 자격증 2개 추가가 우선입니다.</p>
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
                        <span key={`${item.title}-${badge.label}`} className={badge.type}>{badge.label}</span>
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
          </main>

          <aside className="ar-sidebar">
            <div className="ar-side-card">
              <h3>AI 종합 인사이트</h3>
              <p>
                김민지 학생은 학업 역량과 상담 참여도는 충분하지만 프로젝트 경험과 인턴 경험에서 핵심 GAP이 있습니다.
                필수 보강 항목을 먼저 해소하면 합격 가능성을 90% 수준까지 끌어올릴 수 있습니다.
              </p>
            </div>

            <div className="ar-side-card">
              <h3>우선순위 요약</h3>
              <div className="ar-priority-row high"><span />긴급 <strong>2개</strong></div>
              <div className="ar-priority-row medium"><span />보통 <strong>1개</strong></div>
              <div className="ar-priority-row low"><span />낮음 <strong>1개</strong></div>
            </div>

            <div className="ar-side-card">
              <h3>추천 다음 행동</h3>
              <ol className="ar-next-list">
                <li>캡스톤디자인 팀 모집 공고 확인</li>
                <li>넥슨코리아 하계 인턴 공고 확인</li>
                <li>TOEIC 월 목표 700점 학습 시작</li>
                <li>PMP 기초 과정 수강 신청</li>
              </ol>
            </div>

            {activePhase && (
              <div className="ar-side-cta">
                <span>현재 단계</span>
                <strong>{activePhase.title}</strong>
                <button onClick={() => navigate(activePhase.nextPath)}>
                  실행하기
                  <i className="fa-solid fa-arrow-right" />
                </button>
              </div>
            )}
          </aside>
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
