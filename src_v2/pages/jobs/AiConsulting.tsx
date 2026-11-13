import { useState, useSyncExternalStore } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { evaluateResume, getAllResumes, RESUME_EVENT, type ResumeEvaluation } from './resumeMock'
import './AiConsulting.css'
import './JobsWorkspace.css'
import { usePageHead } from '../../components/PageCrumb'

// DeepResume 평가가 주는 세 지표. 값이 없으면 지어내지 않고 '-' 로 둔다.
const SCORE_ROWS: { key: keyof ResumeEvaluation['scores']; label: string; comment: string; unit: string }[] = [
  { key: 'consult', label: 'AI 평가 점수', comment: '문항 질문에 맞게 잘 답했는지 AI가 평가한 점수입니다.', unit: '점' },
  { key: 'spellcheck', label: '표절 검사 점수', comment: '표절 검사 결과를 점수로 나타냅니다.', unit: '점' },
  { key: 'human', label: '사람이 쓴 확률', comment: 'AI가 아닌 사람이 작성했을 가능성입니다.', unit: '%' },
]
const TONE_ICON = { pos: 'fa-circle-check', neg: 'fa-circle-exclamation', note: 'fa-circle-info' } as const

const scoreColor = (s: number) => (s >= 85 ? '#16A34A' : s >= 75 ? 'var(--color-primary)' : 'var(--color-warning)')

function subscribeResumes(onChange: () => void) {
  window.addEventListener(RESUME_EVENT, onChange)
  return () => window.removeEventListener(RESUME_EVENT, onChange)
}

export default function AiConsulting() {
  usePageHead('AI 컨설팅', '작성된 자소서를 AI가 항목별로 분석하고 평가합니다.')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resumes = useSyncExternalStore(subscribeResumes, getAllResumes)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resumes.find(resume => resume.id === params.get('resumeId'))?.id ?? (resumes.length === 1 ? resumes[0].id : null))
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<ResumeEvaluation | null>(null)
  const [error, setError] = useState('')

  const selected = resumes.find(resume => resume.id === selectedId)

  // 평가는 수십 초 걸린다. 같은 내용이면 Deep 이 이전 평가본을 돌려준다(cached) — force 로 다시 평가한다.
  const startEval = async (force = false) => {
    if (!selected || evaluating) return
    setEvaluating(true)
    setError('')
    try {
      setEvaluation(await evaluateResume(selected.id, force))
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'AI 평가를 받지 못했습니다.')
    } finally {
      setEvaluating(false)
    }
  }

  const resetEval = () => {
    setEvaluation(null)
    setError('')
    setSelectedId(null)
  }

  return (
    <div className="ac-wrap jobs-workspace">
      {/* 헤더 */}
      <header className="ac-header">
        <button className="ac-back-btn" onClick={() => navigate('/jobs/home')} aria-label="홈으로">
          <i className="fa-solid fa-arrow-left" />
        </button>
      </header>
      {error && <p className="ac-preview-notice" role="alert">{error}</p>}

      {/* ── 자소서 선택 ── */}
      {!evaluation && !evaluating && (
        <div className="ac-card">
          <h2 className="ac-card-title">컨설팅 받을 자소서 선택</h2>
          <p className="ac-card-desc">평가를 진행할 자소서를 하나 선택해 주세요.</p>

          <div className="ac-pick-list">
            {resumes.length === 0 && <div className="ac-empty">
              <h3>저장된 자소서가 없습니다.</h3>
              <p>자기소개서를 작성하고 저장하면 이곳에서 선택할 수 있습니다.</p>
              <button type="button" className="ac-btn-primary" onClick={() => navigate('/jobs/home/resume')}>자소서 작성하기</button>
            </div>}
            {resumes.map(resume => {
              const active = selectedId === resume.id
              return (
                <button
                  key={resume.id}
                  className={`ac-pick-item${active ? ' active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSelectedId(resume.id)}
                >
                  <span className={`ac-pick-radio${active ? ' active' : ''}`}>
                    {active && <i className="fa-solid fa-check" />}
                  </span>
                  <div className="ac-pick-body">
                    <div className="ac-pick-head">
                      <span className="ac-badge">{resume.categoryLabel}</span>
                      <span className="ac-pick-date">
                        <i className="fa-solid fa-calendar" /> {resume.createdAt.slice(0, 10)}
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
            {resumes.length > 0 && <button className="ac-btn-primary" disabled={!selected} onClick={() => void startEval()}>
              <i className="fa-solid fa-play" /> AI 평가 받기
            </button>}
          </div>
        </div>
      )}

      {/* ── 평가 중 ── */}
      {evaluating && (
        <div className="ac-card ac-loading">
          <div className="ac-spinner" />
          <p>AI가 자기소개서를 평가하고 있습니다.</p>
          <span>표절 검사와 문항별 분석을 함께 진행해 1~2분 정도 걸릴 수 있습니다.</span>
        </div>
      )}

      {/* ── 평가 결과 ── */}
      {evaluation && selected && (
        <div className="ac-card">
          <h2 className="ac-card-title">
            <i className="fa-solid fa-clipboard-check" /> AI 컨설팅 평가 결과
          </h2>
          {evaluation.cached && (
            <p className="ac-card-desc">내용이 바뀌지 않아 이전 평가 결과를 보여 드립니다.</p>
          )}

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
              <div className="ac-score-num">{evaluation.scores.consult ?? '-'}</div>
              <div className="ac-score-label">AI 평가 점수 / 100</div>
            </div>

            <div className="ac-grades">
              {SCORE_ROWS.map(row => {
                const value = evaluation.scores[row.key]
                return (
                  <div key={row.key} className="ac-grade">
                    <div className="ac-grade-head">
                      <span className="ac-grade-label">{row.label}</span>
                      <span className="ac-grade-score" style={value === null ? undefined : { color: scoreColor(value) }}>
                        {value === null ? '-' : `${value}${row.unit}`}
                      </span>
                    </div>
                    <div className="ac-grade-bar">
                      <span
                        className="ac-grade-fill"
                        style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%`, background: value === null ? undefined : scoreColor(value) }}
                      />
                    </div>
                    <p className="ac-grade-comment">{row.comment}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="ac-suggest">
            <h3><i className="fa-solid fa-lightbulb" /> 문장별 조언</h3>
            {evaluation.items.every(item => item.advice.length === 0) && <p className="ac-card-desc">조언이 없습니다.</p>}
            <ul>
              {evaluation.items.flatMap((item, i) => item.advice.map((advice, j) => (
                <li key={`${i}-${j}`}>
                  <i className={`fa-solid ${TONE_ICON[advice.tone]}`} aria-hidden="true" />
                  <span>
                    {advice.quote && <q>{advice.quote}</q>} {advice.comment}
                  </span>
                </li>
              )))}
            </ul>
          </div>

          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={resetEval}>
              <i className="fa-solid fa-arrow-left" /> 다른 자소서 평가
            </button>
            {evaluation.cached && (
              <button className="ac-btn-ghost" onClick={() => void startEval(true)}>
                <i className="fa-solid fa-rotate" /> 다시 평가
              </button>
            )}
            <button className="ac-btn-primary" onClick={() => navigate('/jobs/home')}>
              <i className="fa-solid fa-house" /> 홈으로
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
