// ─────────────────────────────────────────────────────────────────────────────
// 마이페이지 — 나의 추천채용 지원 내역
//
// 상담사가 전형 단계를 올리면 여기에 그대로 반영된다(같은 스토어를 구독).
// 타임라인 조립은 데이터층(getProgressTimeline)이 하고 화면은 그리기만 한다.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  APPLICATION_STATUS_LABEL,
  cancelApplication,
  currentStageLabel,
  getApplicationsByStudent,
  getProgressTimeline,
} from '../../../src_admin/data/jobApplications'
import { getJobById } from '../../../src_admin/data/jobsSource'
import { getActiveStudent } from '../../data/students'
import type { ApplicationStatus } from '../../../src_admin/data/schema/jobApplication'
import './MyApplications.css'
import { usePageHead } from '../../components/PageCrumb'

/** 상태 배지 색 — 진행/합격/탈락/취소 */
function statusClass(status: ApplicationStatus): string {
  switch (status) {
    case 'PASSED': return 'ma-badge ma-badge-pass'
    case 'REJECTED': return 'ma-badge ma-badge-reject'
    case 'CANCELED': return 'ma-badge ma-badge-cancel'
    case 'IN_PROGRESS': return 'ma-badge ma-badge-progress'
    default: return 'ma-badge ma-badge-applied'
  }
}

function formatDate(iso: string): string {
  return iso.slice(0, 10).replaceAll('-', '.')
}

function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${iso.slice(11, 16)}`
}

export default function MyApplications() {
  // 경로 표시 마지막 칸 — 상단바 항목 이름과 화면 이름이 다르다.
  usePageHead('나의 지원 내역', '교내 추천채용 공고에 지원한 내역과 전형 진행 상황입니다.')
  const me = getActiveStudent()
  const [tick, setTick] = useState(0)
  const applications = useMemo(() => getApplicationsByStudent(me.id), [me.id, tick])

  const onCancel = (id: string, title: string) => {
    if (!window.confirm(`«${title}» 지원을 취소합니다.\n취소 후에는 다시 지원할 수 있습니다.`)) return
    cancelApplication(id)
    setTick(t => t + 1)
  }

  return (
    // 폭·좌우 여백은 .v2-main 한 곳이 정한다 — 페이지가 자기 컨테이너를 만들지 않는다.
    <div className="v2-page">
      {applications.length === 0 ? (
        <div data-slot="card" className="ma-empty">
          <i className="fa-regular fa-folder-open" />
          <strong>아직 지원한 공고가 없습니다.</strong>
          <p>교내 채용공고에서 추천채용 공고에 지원하면 이곳에서 진행 상황을 확인할 수 있습니다.</p>
          <Link to="/jobs" className="ma-empty-btn">교내 채용공고 보기</Link>
        </div>
      ) : (
        <div className="ma-list">
          {applications.map(application => {
            const job = getJobById(application.jobId)
            const steps = getProgressTimeline(application)
            const open = application.status === 'APPLIED' || application.status === 'IN_PROGRESS'
            return (
              <article key={application.id} data-slot="card" className="ma-card">
                <div className="ma-card-head">
                  <div className="ma-card-title">
                    <span className="ma-tag">추천채용</span>
                    <h2>{job ? `${job.company} — ${job.role}` : '삭제된 공고'}</h2>
                    <p>지원일 {formatDate(application.appliedAt)}</p>
                  </div>
                  <div className="ma-card-actions">
                    <span className={statusClass(application.status)}>
                      {application.status === 'IN_PROGRESS'
                        ? currentStageLabel(application)
                        : APPLICATION_STATUS_LABEL[application.status]}
                    </span>
                    {job && <Link to={`/jobs/${job.id}`} className="ma-link">공고 보기</Link>}
                    {open && (
                      <button
                        type="button"
                        className="ma-cancel"
                        onClick={() => onCancel(application.id, job?.role ?? '이 공고')}
                      >
                        지원 취소
                      </button>
                    )}
                  </div>
                </div>

                <div className="ma-progress">
                  <h3>지원 진행 상황</h3>
                  <p className="ma-progress-desc">
                    지원서는 상담사가 검토한 뒤 기업에 전달되며, 이후 기업 전형이 진행됩니다.
                  </p>
                  <ol className="ma-steps">
                    {steps.map((step, i) => (
                      <li
                        key={i}
                        className={`ma-step${step.done ? ' is-done' : ''}${step.current ? ' is-current' : ''}${step.internal ? ' is-internal' : ''}`}
                      >
                        <span className="ma-step-dot" aria-hidden="true" />
                        <span className="ma-step-label">{step.label}</span>
                        {step.at && <span className="ma-step-at">{formatDateTime(step.at)}</span>}
                        {/* 교내 절차 칸은 담당이 기업이 아니라 상담사다 — 학생이 기다릴 곳을 알아야 한다.
                            날짜 아래에 둔다 — 위에 끼우면 칸마다 날짜 높이가 어긋난다. */}
                        {step.internal && <span className="ma-step-who">상담사 처리</span>}
                        {step.current && <span className="ma-step-now">진행중</span>}
                      </li>
                    ))}
                  </ol>
                  {application.status === 'REJECTED' && (
                    <p className="ma-note">이번 전형에서는 아쉽게 마무리되었습니다.</p>
                  )}
                  {application.status === 'PASSED' && (
                    <p className="ma-note ma-note-pass">최종 합격했습니다. 축하합니다!</p>
                  )}
                  {application.status === 'CANCELED' && application.canceledAt && (
                    <p className="ma-note">{formatDate(application.canceledAt)}에 지원을 취소했습니다.</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
