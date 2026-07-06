import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllResumes } from './resumeMock'
import './AiConsulting.css'

interface Evaluation {
  score: number
  grades: { label: string; score: number; comment: string }[]
  suggestions: string[]
}

const MOCK_EVALUATION: Evaluation = {
  score: 82,
  grades: [
    { label: '논리적 구성', score: 85, comment: '서론-본론-결론 구조가 명확합니다.' },
    { label: '직무 연관성', score: 78, comment: '직무 관련 경험을 더 구체적으로 기술하면 좋겠습니다.' },
    { label: '차별화 포인트', score: 80, comment: '해커톤 수상 경험이 좋은 차별화 요소입니다.' },
    { label: '구체성', score: 75, comment: '성과를 수치화한 점이 좋으나 더 많은 구체적 사례가 필요합니다.' },
    { label: '진정성', score: 88, comment: '지원 동기와 개인 경험이 자연스럽게 연결됩니다.' },
  ],
  suggestions: [
    '직무 관련 기술 스택을 더 구체적으로 언급해보세요.',
    '인턴십 경험에서 본인만의 기여도를 수치로 표현하면 더 좋습니다.',
    '마지막 문단에서 입사 후 구체적인 목표를 추가하면 설득력이 높아집니다.',
  ],
}

const scoreColor = (s: number) => (s >= 85 ? '#16A34A' : s >= 75 ? 'var(--color-primary)' : 'var(--color-warning)')

export default function AiConsulting() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)

  const resumes = useMemo(() => getAllResumes(), [])
  const selected = resumes.find(resume => resume.id === selectedId)

  const startEval = () => {
    if (!selectedId) return
    setEvaluating(true)
    window.setTimeout(() => {
      setEvaluation(MOCK_EVALUATION)
      setEvaluating(false)
    }, 1600)
  }

  const resetEval = () => {
    setEvaluation(null)
    setSelectedId(null)
  }

  return (
    <div className="ac-wrap">
      {/* 헤더 */}
      <header className="ac-header">
        <button className="ac-back-btn" onClick={() => navigate('/jobs/home')} aria-label="홈으로">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <div>
          <h1><i className="fa-solid fa-magnifying-glass-chart" /> AI 컨설팅</h1>
          <p>작성된 자소서를 AI가 항목별로 분석하고 평가합니다.</p>
        </div>
      </header>

      {/* ── 자소서 선택 ── */}
      {!evaluation && !evaluating && (
        <div className="ac-card">
          <h2 className="ac-card-title">컨설팅 받을 자소서 선택</h2>
          <p className="ac-card-desc">평가를 진행할 자소서를 하나 선택해 주세요.</p>

          <div className="ac-pick-list">
            {resumes.map(resume => {
              const active = selectedId === resume.id
              return (
                <button
                  key={resume.id}
                  className={`ac-pick-item${active ? ' active' : ''}`}
                  onClick={() => setSelectedId(resume.id)}
                >
                  <span className={`ac-pick-radio${active ? ' active' : ''}`}>
                    {active && <i className="fa-solid fa-check" />}
                  </span>
                  <div className="ac-pick-body">
                    <div className="ac-pick-head">
                      <span className="ac-badge">{resume.categoryLabel}</span>
                      <span className="ac-pick-date">
                        <i className="fa-solid fa-calendar" /> {resume.createdAt}
                      </span>
                    </div>
                    <h3 className="ac-pick-title">{resume.title}</h3>
                    <div className="ac-pick-meta">
                      <span><i className="fa-solid fa-building" /> {resume.company}</span>
                      <span><i className="fa-solid fa-briefcase" /> {resume.jobType} · {resume.position}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={() => navigate('/jobs/home')}>취소</button>
            <button className="ac-btn-primary" disabled={!selectedId} onClick={startEval}>
              <i className="fa-solid fa-play" /> AI 평가 시작
            </button>
          </div>
        </div>
      )}

      {/* ── 평가 중 ── */}
      {evaluating && (
        <div className="ac-card ac-loading">
          <div className="ac-spinner" />
          <p>AI가 자소서를 분석하고 있습니다...</p>
          <span>논리적 구성, 직무 연관성, 차별화 포인트 등을 종합 분석합니다</span>
        </div>
      )}

      {/* ── 평가 결과 ── */}
      {evaluation && selected && (
        <div className="ac-card">
          <h2 className="ac-card-title">
            <i className="fa-solid fa-clipboard-check" /> AI 컨설팅 평가 결과
          </h2>

          <div className="ac-summary">
            <div>
              <span className="ac-summary-label">자소서</span>
              <span className="ac-summary-value">{selected.title}</span>
            </div>
            <div>
              <span className="ac-summary-label">기업</span>
              <span className="ac-summary-value">{selected.company}</span>
            </div>
            <div>
              <span className="ac-summary-label">카테고리</span>
              <span className="ac-summary-value">{selected.categoryLabel}</span>
            </div>
          </div>

          <div className="ac-result">
            <div className="ac-score-box">
              <div className="ac-score-num">{evaluation.score}</div>
              <div className="ac-score-label">종합점수 / 100</div>
            </div>

            <div className="ac-grades">
              {evaluation.grades.map(grade => (
                <div key={grade.label} className="ac-grade">
                  <div className="ac-grade-head">
                    <span className="ac-grade-label">{grade.label}</span>
                    <span className="ac-grade-score" style={{ color: scoreColor(grade.score) }}>
                      {grade.score}점
                    </span>
                  </div>
                  <div className="ac-grade-bar">
                    <span
                      className="ac-grade-fill"
                      style={{ width: `${grade.score}%`, background: scoreColor(grade.score) }}
                    />
                  </div>
                  <p className="ac-grade-comment">{grade.comment}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ac-suggest">
            <h3><i className="fa-solid fa-lightbulb" /> 개선 제안</h3>
            <ul>
              {evaluation.suggestions.map((suggestion, i) => (
                <li key={i}>
                  <i className="fa-solid fa-circle-check" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={resetEval}>
              <i className="fa-solid fa-arrow-left" /> 다른 자소서 평가
            </button>
            <button className="ac-btn-primary" onClick={() => navigate('/jobs/home')}>
              <i className="fa-solid fa-house" /> 홈으로
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
