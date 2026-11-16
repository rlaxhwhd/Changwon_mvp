import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { openInterviewResults } from './interviewApi'
import { usePageHead } from '../../components/PageCrumb'
import '../roadmap/AiResume.css'
import './AiConsulting.css'
import './AiInterview.css'
import './JobsWorkspace.css'

// AI 인터뷰 결과표. 영상·질문별 평가는 DeepResume 에만 있어 그 응시결과 화면을 IFRAME 으로 보여 준다.
export default function AiInterviewResults() {
  usePageHead('AI 인터뷰 결과', '지난 AI 인터뷰의 영상과 평가 결과를 확인합니다.')
  const navigate = useNavigate()
  // 티켓은 한 번만 쓸 수 있다 — 다시 열 때마다(attempt) 새 주소를 받는다.
  const [attempt, setAttempt] = useState(0)
  const [opened, setOpened] = useState<{ attempt: number; iframeUrl?: string; error?: string } | null>(null)

  useEffect(() => {
    let stale = false
    openInterviewResults()
      .then(result => { if (!stale) setOpened({ attempt, iframeUrl: result.iframeUrl }) })
      .catch((cause: unknown) => {
        if (!stale) setOpened({ attempt, error: cause instanceof Error ? cause.message : 'AI 인터뷰 결과를 열지 못했습니다.' })
      })
    return () => { stale = true }
  }, [attempt])
  const current = opened?.attempt === attempt ? opened : null

  return (
    <div className="ac-wrap jobs-workspace iv-wrap">
      <header className="ac-header">
        <button className="ac-back-btn" onClick={() => navigate('/jobs/home/interview')} aria-label="AI 인터뷰로">
          <i className="fa-solid fa-arrow-left" />
        </button>
      </header>
      {current?.error && <p className="ac-preview-notice" role="alert">{current.error}</p>}
      <div className="ac-card iv-live">
        <div className="iv-live-head">
          <h2 className="ac-card-title"><i className="fa-solid fa-square-poll-vertical" /> AI 인터뷰 결과</h2>
          <button className="ac-btn-ghost" disabled={!current} onClick={() => setAttempt(count => count + 1)}>
            <i className="fa-solid fa-rotate" /> 다시 열기
          </button>
        </div>
        {current?.iframeUrl
          ? <iframe className="iv-frame" src={current.iframeUrl} title="DeepResume AI 인터뷰 결과" allow="autoplay; fullscreen" />
          : !current && <p className="ac-card-desc" role="status">결과 화면을 여는 중입니다.</p>}
        <p className="iv-device-tip">
          <i className="fa-solid fa-circle-info" aria-hidden="true" /> 방금 마친 면접은 AI 평가가 끝난 뒤에 결과가 나타납니다.
          화면이 열리지 않거나 새로고침했다면 「다시 열기」를 눌러 주세요.
        </p>
      </div>
    </div>
  )
}
