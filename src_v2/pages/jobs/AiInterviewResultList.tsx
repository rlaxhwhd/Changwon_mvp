import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadInterviewResults, type InterviewResultSummary } from './interviewApi'
import { usePageHead } from '../../components/PageCrumb'
import '../roadmap/AiResume.css'
import './AiConsulting.css'
import './AiInterview.css'
import './AiInterviewResult.css'
import './JobsWorkspace.css'

// AI 인터뷰 결과 목록. 결과의 정본은 DeepResume 이라 매번 거기서 읽는다(우리 DB에는 결과가 없다).
export default function AiInterviewResultList() {
  usePageHead('AI 인터뷰 결과', '지난 AI 인터뷰의 평가 결과표를 확인합니다.')
  const navigate = useNavigate()
  const [items, setItems] = useState<InterviewResultSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stale = false
    loadInterviewResults()
      .then(loaded => { if (!stale) setItems(loaded) })
      .catch((cause: unknown) => { if (!stale) setError(cause instanceof Error ? cause.message : 'AI 인터뷰 결과를 불러오지 못했습니다.') })
    return () => { stale = true }
  }, [])

  return (
    <div className="ac-wrap jobs-workspace iv-wrap">
      <header className="ac-header">
        <button className="ac-back-btn" onClick={() => navigate('/jobs/home/interview')} aria-label="AI 인터뷰로">
          <i className="fa-solid fa-arrow-left" />
        </button>
      </header>
      {error && <p className="ac-preview-notice" role="alert">{error}</p>}
      <div className="ac-card">
        <div className="iv-live-head">
          <h2 className="ac-card-title"><i className="fa-solid fa-square-poll-vertical" /> AI 인터뷰 결과</h2>
          <button className="ac-btn-ghost" onClick={() => navigate('/jobs/home/interview/results/deep')}>
            <i className="fa-solid fa-film" /> 면접 영상 보기
          </button>
        </div>
        <p className="ac-card-desc">결과표를 누르면 질문별 평가와 종합 점수를 볼 수 있습니다. 면접 영상은 DeepResume 응시내역 화면에서 봅니다.</p>
        {items === null && !error && <p className="ac-card-desc" role="status">결과 목록을 불러오는 중입니다.</p>}
        {items?.length === 0 && (
          <div className="ac-empty">
            <h3>아직 AI 인터뷰 결과가 없습니다.</h3>
            <p>면접을 끝까지 마치면 AI 평가가 끝난 뒤 여기에 결과표가 나타납니다.</p>
            <button type="button" className="ac-btn-primary" onClick={() => navigate('/jobs/home/interview')}>AI 인터뷰 시작하기</button>
          </div>
        )}
        {items && items.length > 0 && (
          <ul className="ivr-list">
            {items.map(item => (
              <li key={item.resultId}>
                <button type="button" className="ivr-list-item" onClick={() => navigate(`/jobs/home/interview/results/${encodeURIComponent(item.resultId)}`)}>
                  <div className="ivr-list-body">
                    <strong>{item.title || 'AI 인터뷰'}</strong>
                    <span className="ivr-list-meta">
                      {item.position && <><i className="fa-solid fa-briefcase" /> {item.position} · </>}
                      <i className="fa-solid fa-calendar" /> {item.createdAt}
                    </span>
                  </div>
                  <span className={`iv-history-state${item.evaluated ? ' done' : ''}`}>{item.evaluated ? '평가 완료' : '평가 중'}</span>
                  <i className="fa-solid fa-chevron-right ivr-list-arrow" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
