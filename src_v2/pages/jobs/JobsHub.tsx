import { useNavigate } from 'react-router-dom'
import './JobsHome.css'
import './JobsWorkspace.css'
import { usePageHead } from '../../components/PageCrumb'

/* ── AI 자소서/면접 앞단 — 자소서와 인터뷰 중 하나를 고른다 ─────────────── */
export default function JobsHub() {
  usePageHead('AI 자소서/면접', '자기소개서 작성·컨설팅과 AI 모의면접 중 하나를 선택해 주세요.')
  const navigate = useNavigate()

  return (
    <div className="jh-wrap jobs-workspace">
      <div className="jh-hub">
        <button type="button" className="jh-hub-card jh-hub-card--cover" onClick={() => navigate('/jobs/home/cover')}>
          <strong>AI 자소서</strong>
          <p>AI와 함께 자기소개서 초안을 만들고, 완성한 자소서를 컨설팅받습니다.</p>
          <ul>
            <li><i className="fa-solid fa-check" /> AI 초안 생성</li>
            <li><i className="fa-solid fa-check" /> 문장별 AI 컨설팅</li>
          </ul>
          <span className="jh-hub-go">자소서로 이동 <i className="fa-solid fa-arrow-right" /></span>
        </button>

        <button type="button" className="jh-hub-card jh-hub-card--interview" onClick={() => navigate('/jobs/home/interview')}>
          <strong>AI 인터뷰</strong>
          <p>내 자소서를 바탕으로 AI 면접관이 질문하고, 답변을 녹화해 평가합니다.</p>
          <ul>
            <li><i className="fa-solid fa-check" /> 자소서 기반 맞춤 질문</li>
            <li><i className="fa-solid fa-check" /> 카메라·마이크로 실전처럼</li>
          </ul>
          <span className="jh-hub-go">인터뷰로 이동 <i className="fa-solid fa-arrow-right" /></span>
        </button>
      </div>
    </div>
  )
}
