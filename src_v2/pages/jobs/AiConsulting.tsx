import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { evaluateResume, getAllResumes, getLastEvaluation, loadEvaluatedResumeIds, RESUME_EVENT, type ResumeEvaluation } from './resumeMock'
import './AiConsulting.css'
import './JobsWorkspace.css'
import { usePageHead } from '../../components/PageCrumb'

// DeepResume 평가가 주는 세 지표. 값이 없으면 지어내지 않고 '-' 로 둔다.
const SCORE_ROWS: { key: keyof ResumeEvaluation['scores']; label: string; comment: string; unit: string }[] = [
  { key: 'consult', label: 'AI 평가 점수', comment: '문항 질문에 맞게 잘 답했는지 AI가 평가한 점수입니다.', unit: '점' },
  { key: 'spellcheck', label: '표절 검사 점수', comment: '표절 검사 결과를 점수로 나타냅니다.', unit: '점' },
  { key: 'human', label: '사람이 쓴 확률', comment: 'AI가 아닌 사람이 작성했을 가능성입니다.', unit: '%' },
]
const TONE = {
  pos: { icon: 'fa-circle-check', label: '잘한 점' },
  neg: { icon: 'fa-circle-exclamation', label: '고칠 점' },
  note: { icon: 'fa-circle-info', label: '참고' },
} as const

// 평가 중 Deep 이 하는 일(Deep_API_v3.xlsx 5번 시트). 진행률은 Deep 이 알려 주지 않으므로 단계를 지어내지 않고 할 일만 보여 준다.
const EVAL_STEPS = [
  { icon: 'fa-pen-nib', title: '문장별 첨삭', desc: '문장마다 잘한 점과 고칠 점을 짚습니다.' },
  { icon: 'fa-user-check', title: '작성 진단', desc: '표절 검사를 하고 사람이 쓴 글일 확률을 계산합니다.' },
  { icon: 'fa-file-lines', title: '문항 종합 평가', desc: '문항 전체를 읽고 8~10문장으로 평가합니다.' },
  { icon: 'fa-comments', title: '예상 면접 질문', desc: '이 자소서로 나올 질문 3개와 예상 답변을 만듭니다.' },
] as const

const scoreColor = (s: number) => (s >= 85 ? 'var(--mint-ink)' : s >= 75 ? 'var(--color-primary)' : 'var(--color-warning)')

type EvaluationItem = ResumeEvaluation['items'][number]

function EvaluationLoading() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="ac-card ac-eval-loading" role="status" aria-live="polite">
      <div className="ac-eval-loading-head">
        <div className="ac-spinner" aria-hidden="true" />
        <div>
          <p className="ac-eval-loading-title">AI가 자기소개서를 꼼꼼히 읽고 있습니다</p>
          <p className="ac-eval-loading-sub">
            문항 하나에 1~3분 정도 걸립니다 · 경과 {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </p>
        </div>
      </div>
      <div className="ac-eval-progress" aria-hidden="true"><span /></div>
      <ol className="ac-eval-steps">
        {EVAL_STEPS.map(step => (
          <li key={step.title}>
            <i className={`fa-solid ${step.icon}`} aria-hidden="true" />
            <div>
              <strong>{step.title}</strong>
              <span>{step.desc}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="ac-eval-loading-note">
        <i className="fa-solid fa-circle-info" aria-hidden="true" /> 결과가 나올 때까지 이 화면에 머물러 주세요.
        화면을 벗어났다면 잠시 뒤 자소서 홈의 「컨설팅 보기」에서 결과를 확인할 수 있습니다.
      </p>
    </div>
  )
}

// fallback — v3 이전 평가본은 문항 제목이 없다. 우리 자소서는 문항이 하나라 그 분야 이름을 쓴다.
function TopicCard({ item, index, fallback }: { item: EvaluationItem; index: number; fallback?: string }) {
  const heading = item.title || item.type || fallback || `문항 ${index + 1}`
  const good = item.advice.filter(advice => advice.tone === 'pos').length
  const fix = item.advice.filter(advice => advice.tone === 'neg').length
  return (
    <section className="ac-topic" aria-labelledby={`ac-topic-${index}`}>
      <header className="ac-topic-head">
        <span className="ac-topic-no">Q{index + 1}</span>
        <div className="ac-topic-heading">
          {item.type && item.title && item.type !== item.title && <span className="ac-badge">{item.type}</span>}
          <h3 id={`ac-topic-${index}`}>{heading}</h3>
        </div>
        <div className="ac-topic-counts">
          <span className="pos"><i className="fa-solid fa-circle-check" aria-hidden="true" /> 잘한 점 {good}</span>
          <span className="neg"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> 고칠 점 {fix}</span>
        </div>
      </header>

      {item.detail && (
        <div className="ac-topic-block ac-detail">
          <h4><i className="fa-solid fa-file-lines" aria-hidden="true" /> 문항 종합 평가</h4>
          <p>{item.detail}</p>
        </div>
      )}

      <div className="ac-topic-block">
        <h4><i className="fa-solid fa-pen-nib" aria-hidden="true" /> 문장별 첨삭</h4>
        {item.advice.length === 0
          ? <p className="ac-card-desc">이 문항에는 첨삭 의견이 없습니다.</p>
          : (
            <ol className="ac-advice">
              {item.advice.map((advice, j) => (
                <li key={j} className={`ac-advice-item ${advice.tone}`}>
                  <span className="ac-advice-tag">
                    <i className={`fa-solid ${TONE[advice.tone].icon}`} aria-hidden="true" /> {TONE[advice.tone].label}
                  </span>
                  {advice.quote && <q className="ac-advice-quote">{advice.quote}</q>}
                  <p className="ac-advice-comment">{advice.comment}</p>
                </li>
              ))}
            </ol>
          )}
      </div>

      {item.questions.length > 0 && (
        <div className="ac-topic-block">
          <h4><i className="fa-solid fa-comments" aria-hidden="true" /> 예상 면접 질문</h4>
          <div className="ac-questions">
            {item.questions.map((question, j) => (
              <details key={j} className="ac-question">
                <summary>
                  <span className="ac-question-no">Q{j + 1}</span>
                  <span className="ac-question-text">{question.question}</span>
                  <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                </summary>
                <p className={question.answer ? undefined : 'ac-empty-text'}>
                  {question.answer || '예상 답변을 만들지 못했습니다.'}
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {item.paragraph && (
        <details className="ac-original">
          <summary><i className="fa-solid fa-align-left" aria-hidden="true" /> 평가한 원문 보기</summary>
          <p>{item.paragraph}</p>
        </details>
      )}
    </section>
  )
}

function subscribeResumes(onChange: () => void) {
  window.addEventListener(RESUME_EVENT, onChange)
  return () => window.removeEventListener(RESUME_EVENT, onChange)
}

// 「컨설팅 보기」는 같은 화면의 ?resumeId=…&view=last 로 보낸다. 주소가 바뀌면 화면 상태를 처음부터 다시 잡는다.
export default function AiConsulting() {
  return <AiConsultingScreen key={useLocation().search} />
}

function AiConsultingScreen() {
  usePageHead('AI 컨설팅', '작성된 자소서를 AI가 항목별로 분석하고 평가합니다.')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resumes = useSyncExternalStore(subscribeResumes, getAllResumes)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resumes.find(resume => resume.id === params.get('resumeId'))?.id ?? (resumes.length === 1 ? resumes[0].id : null))
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<ResumeEvaluation | null>(null)
  const [error, setError] = useState('')
  // 자소서 홈 「컨설팅 보기」(view=last) — 새로 평가하지 않고 지난 결과를 불러온다(시간당 횟수를 쓰지 않음).
  // 처음 들어올 때 한 번만 정한다 — 「다른 자소서 평가」로 고른 자소서는 새로 평가한다.
  const [lastId] = useState(() => (params.get('view') === 'last' ? selectedId : null))
  const [loadingLast, setLoadingLast] = useState(lastId !== null)

  useEffect(() => {
    if (!lastId) return
    let alive = true
    getLastEvaluation(lastId)
      .then(result => { if (alive) setEvaluation(result) })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : '지난 컨설팅 결과를 불러오지 못했습니다.')
      })
      .finally(() => { if (alive) setLoadingLast(false) })
    return () => { alive = false }
  }, [lastId])

  const selected = resumes.find(resume => resume.id === selectedId)
  // 선택 목록에서 컨설팅 받은 자소서에 「컨설팅 보기」를 붙인다. 모르면(조회 실패) 붙이지 않는다.
  const [evaluated, setEvaluated] = useState<Set<string>>(() => new Set())
  const hasLinked = resumes.some(resume => resume.deepLinked)

  useEffect(() => {
    if (!hasLinked || lastId) return
    let alive = true
    loadEvaluatedResumeIds()
      .then(ids => { if (alive) setEvaluated(ids) })
      .catch(() => { /* 보기 버튼만 빠진다 — 새 평가는 그대로 할 수 있다 */ })
    return () => { alive = false }
  }, [hasLinked, lastId])

  // 평가는 수십 초 걸린다. 같은 내용이면 Deep 이 이전 평가본을 돌려준다(cached) — force 로 다시 평가한다.
  const startEval = async (force = false) => {
    if (!selected || evaluating) return
    setEvaluating(true)
    setEvaluation(null)
    setError('')
    try {
      setEvaluation(await evaluateResume(selected.id, force))
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'AI 평가를 받지 못했습니다.')
    } finally {
      setEvaluating(false)
    }
  }

  const advice = evaluation?.items.flatMap(item => item.advice) ?? []
  const stats = {
    good: advice.filter(entry => entry.tone === 'pos').length,
    fix: advice.filter(entry => entry.tone === 'neg').length,
    questions: evaluation?.items.reduce((sum, item) => sum + item.questions.length, 0) ?? 0,
  }

  const resetEval = () => {
    // 주소에 resumeId·view 가 있으면 빈 주소로 보내 화면을 새로 잡는다(목록의 「컨설팅 보기」도 다시 판정).
    if (params.toString()) { navigate('/jobs/home/consulting'); return }
    setEvaluation(null)
    setError('')
    setSelectedId(null)
  }

  return (
    <div className="ac-wrap jobs-workspace">
      {/* 헤더 */}
      <header className="ac-header">
        <button className="ac-back-btn" onClick={() => navigate('/jobs/home/cover')} aria-label="홈으로">
          <i className="fa-solid fa-arrow-left" />
        </button>
      </header>
      {error && <p className="ac-preview-notice" role="alert">{error}</p>}

      {/* ── 자소서 선택 ── */}
      {!evaluation && !evaluating && !loadingLast && (
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
                <div key={resume.id} className="ac-pick-row">
                <button
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
                {evaluated.has(resume.id) && (
                  <button
                    type="button"
                    className="ac-btn-ghost ac-pick-view"
                    onClick={() => navigate(`/jobs/home/consulting?resumeId=${encodeURIComponent(resume.id)}&view=last`)}
                  >
                    <i className="fa-solid fa-clipboard-check" /> 컨설팅 보기
                  </button>
                )}
                </div>
              )
            })}
          </div>

          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={() => navigate('/jobs/home/cover')}>취소</button>
            {resumes.length > 0 && <button className="ac-btn-primary" disabled={!selected} onClick={() => void startEval()}>
              <i className="fa-solid fa-play" /> AI 평가 받기
            </button>}
          </div>
        </div>
      )}

      {loadingLast && (
        <div className="ac-card ac-loading">
          <div className="ac-spinner" />
          <p>지난 컨설팅 결과를 불러오고 있습니다.</p>
        </div>
      )}

      {/* ── 평가 중 ── */}
      {evaluating && <EvaluationLoading />}

      {/* ── 평가 결과 ── */}
      {evaluation && selected && (
        <div className="ac-card">
          <h2 className="ac-card-title">
            <i className="fa-solid fa-clipboard-check" /> AI 컨설팅 평가 결과
          </h2>
          {evaluation.cached && (
            <p className="ac-card-desc">내용이 바뀌지 않아 이전 평가 결과를 보여 드립니다.</p>
          )}
          {evaluation.stale && (
            <p className="ac-preview-notice" role="status">
              이 결과를 받은 뒤 자소서를 고쳤습니다. 지금 본문으로 평가하려면 「다시 평가」를 눌러 주세요.
            </p>
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
            {evaluation.createdAt && <div>
              <span className="ac-summary-label">평가일</span>
              <span className="ac-summary-value">{evaluation.createdAt.slice(0, 10)}</span>
            </div>}
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

          <ul className="ac-stats">
            <li className="pos">
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <strong>{stats.good}</strong><span>잘한 점</span>
            </li>
            <li className="neg">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
              <strong>{stats.fix}</strong><span>고칠 점</span>
            </li>
            <li>
              <i className="fa-solid fa-spell-check" aria-hidden="true" />
              <strong>{evaluation.wrongWords ?? '-'}</strong><span>맞춤법 오류</span>
            </li>
            <li>
              <i className="fa-solid fa-comments" aria-hidden="true" />
              <strong>{stats.questions}</strong><span>예상 면접 질문</span>
            </li>
          </ul>

          <h3 className="ac-section-title"><i className="fa-solid fa-list-check" aria-hidden="true" /> 문항별 상세 평가</h3>
          {evaluation.items.length === 0 && <p className="ac-card-desc">평가한 문항이 없습니다.</p>}
          {evaluation.items.map((item, i) => (
            <TopicCard key={item.topicId ?? i} item={item} index={i}
              fallback={evaluation.items.length === 1 ? selected.categoryLabel : undefined} />
          ))}
          {evaluation.items.length > 0 && stats.questions === 0 && evaluation.items.every(item => !item.detail) && (
            <p className="ac-preview-notice" role="status">
              이 결과에는 문항 종합 평가와 예상 면접 질문이 없습니다. 이전 방식으로 평가한 결과일 수 있으니 다시 평가하면 함께 받아 볼 수 있습니다.
            </p>
          )}

          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={resetEval}>
              <i className="fa-solid fa-arrow-left" /> 다른 자소서 평가
            </button>
            {(evaluation.cached || evaluation.stale !== undefined) && (
              <button className="ac-btn-ghost" disabled={evaluating} onClick={() => void startEval(true)}>
                <i className="fa-solid fa-rotate" /> 다시 평가
              </button>
            )}
            <button className="ac-btn-primary" onClick={() => navigate('/jobs/home/cover')}>
              <i className="fa-solid fa-house" /> 홈으로
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
