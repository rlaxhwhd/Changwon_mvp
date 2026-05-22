import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import { SAVED_RESUMES, type SavedResume } from './resumeMock'
import './JobsHome.css'

/* ── AI 자소서/인터뷰 홈 ─────────────────────────────────────────── */
export default function JobsHome() {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<SavedResume[]>(SAVED_RESUMES)
  const [viewResume, setViewResume] = useState<SavedResume | null>(null)

  const removeResume = (id: string) => {
    setResumes(prev => prev.filter(resume => resume.id !== id))
  }

  return (
    <div className="jh-wrap">
      {/* 헤더 */}
      <header className="jh-header">
        <h1>AI 자소서 / 인터뷰</h1>
        <p>AI가 작성을 도와주고, 완성된 자소서를 평가해드립니다.</p>
      </header>

      {/* 작성된 자소서 */}
      <div className="jh-section-head">
        <h2><i className="fa-solid fa-folder-open" /> 작성된 자소서</h2>
        <p>총 {resumes.length}개의 자소서가 저장되어 있습니다.</p>
      </div>

      {resumes.length === 0 ? (
        <div className="jh-empty">
          <i className="fa-solid fa-file-circle-plus" />
          <p>아직 작성된 자소서가 없습니다.</p>
          <span>아래 [AI 자소서 생성] 버튼을 눌러 첫 자소서를 만들어보세요.</span>
        </div>
      ) : (
        <div className="jh-resume-grid">
          {resumes.map(resume => (
            <article
              key={resume.id}
              className="jh-resume-card"
              onClick={() => setViewResume(resume)}
            >
              <div className="jh-resume-top">
                <span className="jh-resume-badge">{resume.categoryLabel}</span>
                <button
                  className="jh-resume-del"
                  onClick={e => { e.stopPropagation(); removeResume(resume.id) }}
                  aria-label="삭제"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
              <h3 className="jh-resume-title">{resume.title}</h3>
              <div className="jh-resume-meta">
                <span><i className="fa-solid fa-building" /> {resume.company}</span>
                <span><i className="fa-solid fa-briefcase" /> {resume.jobType} · {resume.position}</span>
              </div>
              <p className="jh-resume-preview">{resume.content}</p>
              <div className="jh-resume-foot">
                <span><i className="fa-solid fa-calendar" /> {resume.createdAt}</span>
                <span>{resume.content.length}자</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="jh-actions">
        <button className="jh-action jh-action--create" onClick={() => navigate('/jobs/home/resume')}>
          <span className="jh-action-icon">
            <i className="fa-solid fa-wand-magic-sparkles" />
          </span>
          <span className="jh-action-text">
            <strong>AI 자소서 생성</strong>
            <small>기본정보 입력부터 AI 생성까지 한 번에</small>
          </span>
          <i className="fa-solid fa-arrow-right jh-action-arrow" />
        </button>

        <button className="jh-action jh-action--consult" onClick={() => navigate('/jobs/home/consulting')}>
          <span className="jh-action-icon">
            <i className="fa-solid fa-magnifying-glass-chart" />
          </span>
          <span className="jh-action-text">
            <strong>AI 컨설팅</strong>
            <small>작성된 자소서를 AI가 평가합니다</small>
          </span>
          <i className="fa-solid fa-arrow-right jh-action-arrow" />
        </button>
      </div>

      {/* 자소서 상세 보기 모달 */}
      <Modal
        open={viewResume !== null}
        onClose={() => setViewResume(null)}
        title={viewResume?.title ?? ''}
        size="md"
      >
        {viewResume && (
          <div className="jh-view">
            <div className="jh-view-tags">
              <span className="jh-resume-badge">{viewResume.categoryLabel}</span>
              <span className="jh-view-date">
                <i className="fa-solid fa-calendar" /> {viewResume.createdAt}
              </span>
            </div>
            <div className="jh-view-info">
              <span><i className="fa-solid fa-building" /> {viewResume.company}</span>
              <span><i className="fa-solid fa-briefcase" /> {viewResume.jobType} · {viewResume.position}</span>
            </div>
            <div className="jh-view-content">{viewResume.content}</div>
            <div className="jh-view-foot">{viewResume.content.length}자</div>
          </div>
        )}
      </Modal>
    </div>
  )
}
