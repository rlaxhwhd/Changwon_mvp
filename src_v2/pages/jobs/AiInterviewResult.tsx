import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadInterviewResult, type InterviewResult, type InterviewScores } from './interviewApi'
import { usePageHead } from '../../components/PageCrumb'
import '../roadmap/AiResume.css'
import './AiConsulting.css'
import './AiInterview.css'
import './AiInterviewResult.css'
import './JobsWorkspace.css'

// AI 면접 결과표 — DeepResume 결과 화면(질문별 평가 → 항목별 점수 → 종합 결과)의 구성을 따르되 색·글꼴은 우리 토큰을 쓴다.
const SCORE_LABELS: [keyof InterviewScores, string][] = [['relevance', '답변의 적절성'], ['logic', '답변의 논리성'], ['jobFit', '직무 적합성']]
const QUESTION_FIELDS: [keyof InterviewResult['questions'][number], string][] = [
  ['intent', '질문 의도'], ['review', '총평'], ['strengths', '장점'], ['weaknesses', '단점'], ['improvements', '개선점'], ['bestAnswer', '모범 답변'],
]

export default function AiInterviewResult() {
  usePageHead('AI 면접 결과표', '질문별 AI 평가와 종합 점수를 확인합니다.')
  const navigate = useNavigate()
  const { resultId = '' } = useParams()
  const [result, setResult] = useState<InterviewResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stale = false
    loadInterviewResult(resultId)
      .then(loaded => { if (!stale) setResult(loaded) })
      .catch((cause: unknown) => { if (!stale) setError(cause instanceof Error ? cause.message : 'AI 인터뷰 결과를 불러오지 못했습니다.') })
    return () => { stale = true }
  }, [resultId])

  const application = result && ([
    ['직종', result.application.jobType], ['업종', result.application.industry], ['기업형태', result.application.companyType],
    ['경력', result.application.experience], ['지원 기업', result.application.company], ['지원 직무', result.application.position],
    ['담당 업무', result.application.workTask],
  ] as const).filter(([, value]) => value)

  return (
    <div className="ac-wrap jobs-workspace iv-wrap ivr-wrap">
      <header className="ac-header">
        <button className="ac-back-btn" onClick={() => navigate('/jobs/home/interview/results')} aria-label="결과 목록으로">
          <i className="fa-solid fa-arrow-left" />
        </button>
      </header>
      {error && <p className="ac-preview-notice" role="alert">{error}</p>}
      {!result && !error && <p className="ac-card-desc" role="status">결과표를 불러오는 중입니다.</p>}
      {result && application && (
        <>
          <section className="ac-card ivr-head">
            <p className="ivr-kicker">AI 인터뷰</p>
            <div className="iv-live-head">
              <h2 className="ivr-title">AI 면접 결과표</h2>
              {result.status && result.status !== 'completed' && <span className="iv-live-state" role="status">AI 평가 진행 중</span>}
            </div>
            {result.createdAt && <p className="ivr-date"><i className="fa-solid fa-calendar" /> {result.createdAt}</p>}
            <dl className="ivr-app">
              {application.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>

          <h3 className="ivr-section"><i className="fa-solid fa-list-ol" /> 질문항목별 결과</h3>
          {result.questions.length === 0 && <p className="ac-card-desc">아직 질문별 평가가 없습니다. AI 평가가 끝난 뒤 다시 열어 주세요.</p>}
          {result.questions.map((item, index) => (
            <article key={item.id} className="ac-card ivr-q">
              <h4 className="ivr-q-part">{item.part ? `${item.part}-${index + 1}` : `질문 ${index + 1}`}</h4>
              <blockquote className="ivr-question">{item.question}</blockquote>
              <div className="ivr-field ivr-answer">
                <h5>답변</h5>
                <p>{item.answer || <span className="ivr-empty">답변이 기록되지 않았습니다.</span>}</p>
              </div>
              {QUESTION_FIELDS.map(([key, label]) => item[key] && (
                <div key={key} className="ivr-field"><h5>{label}</h5><p>{item[key] as string}</p></div>
              ))}
              <h5 className="ivr-scores-title">항목별 점수</h5>
              <div className="ivr-donuts">
                {SCORE_LABELS.map(([key, label]) => (
                  <div key={key} className="ivr-donut-wrap">
                    <div className="ivr-donut" style={{ '--p': item.scores[key] } as CSSProperties} role="img" aria-label={`${label} ${item.scores[key]}점`}>
                      <strong>{item.scores[key]}<small>점</small></strong>
                    </div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              {item.hasVideo && (
                <p className="ivr-video">
                  <i className="fa-solid fa-film" aria-hidden="true" /> 이 답변의 면접 영상은 DeepResume 응시내역 화면에서 볼 수 있습니다.
                  <button type="button" className="ac-btn-ghost" onClick={() => navigate('/jobs/home/interview/results/deep')}>영상 보기</button>
                </p>
              )}
            </article>
          ))}

          <h3 className="ivr-section"><i className="fa-solid fa-ranking-star" /> 종합 결과</h3>
          <section className="ac-card ivr-total">
            <div className="ivr-field">
              <h5>응답에 대한 종합 평가</h5>
              <p>{result.overall.evaluation || <span className="ivr-empty">아직 종합 평가가 없습니다.</span>}</p>
            </div>
            <h5 className="ivr-scores-title">항목별 점수</h5>
            <ul className="ivr-bars">
              {[...SCORE_LABELS, ['total', '종합 점수'] as const].map(([key, label]) => {
                const value = result.overall.scores[key]
                return (
                  <li key={key} className={key === 'total' ? 'total' : ''}>
                    <div className="ivr-bar-head"><span>{label}</span><strong>{value}점</strong></div>
                    <div className="ivr-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
                      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
          <p className="ivr-disclaimer">
            <i className="fa-solid fa-circle-info" aria-hidden="true" /> AI 평가는 부정확하거나 적절하지 않은 내용을 포함할 수 있으며, 학교의 공식 평가가 아닙니다.
          </p>
          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={() => navigate('/jobs/home/interview/results')}><i className="fa-solid fa-list" /> 결과 목록</button>
            <button className="ac-btn-primary" onClick={() => navigate('/jobs/home/interview')}><i className="fa-solid fa-rotate" /> 다시 면접 보기</button>
          </div>
        </>
      )}
    </div>
  )
}
