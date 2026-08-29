import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getJobById } from '../../../src_admin/data/jobsSource'
import {
  APPLICATION_STATUS_LABEL,
  applyToJob,
  canApplyTo,
  currentStageLabel,
  getApplication,
  isRecommendedInternal,
} from '../../../src_admin/data/jobApplications'
import { getActiveStudent } from '../../data/students'
import JobDetailView from '../../components/JobDetailView'
import { usePageHead } from '../../components/PageCrumb'

// 공고 본문은 교직원 화면과 같은 JobDetailView 다 — 여기서 그리는 것은 지원 CTA 뿐이다.
export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  // 지원 직후 화면을 다시 읽기 위한 트리거 (스토어가 localStorage 라 재조회로 끝난다)
  const [tick, setTick] = useState(0)
  const job = id ? getJobById(id) : undefined
  usePageHead(job?.role, '공고 상세와 지원 자격을 확인하고 지원합니다.')

  if (!job) return <Navigate to="/jobs" replace />

  // 교내 추천채용만 사이트 안에서 지원을 받는다. 나머지는 기존대로 외부 링크로 나간다.
  const acceptsApply = isRecommendedInternal(job)
  const me = getActiveStudent()
  const mine = acceptsApply ? getApplication(job.id, me.id) : undefined
  const applied = !!mine && mine.status !== 'CANCELED'
  const gate = acceptsApply ? canApplyTo(job.id, me.id) : undefined

  const submitApply = () => {
    if (!window.confirm(`«${job.company} — ${job.role}»에 지원합니다.\n지원 후에는 마이페이지에서 진행 상황을 확인할 수 있습니다.`)) return
    const created = applyToJob(job.id, {
      id: me.id,
      studentNo: me.studentNo,
      name: me.name,
      major: me.major,
      grade: me.grade,
      enrollmentStatus: me.enrollmentStatus,
    })
    if (!created) {
      window.alert('지원할 수 없는 공고입니다. 잠시 후 다시 확인해 주세요.')
      return
    }
    setTick(t => t + 1)
  }
  void tick

  // 출처에 따라 왔던 목록으로 되돌린다.
  const external = job.source === 'external'
  const listPath = external ? '/jobs/external' : '/jobs'

  return (
    <JobDetailView
      job={job}
      /* 제목은 공용 머리글이 그린다 — 카드 안에 또 넣지 않는다. */
      showHeading={false}
      back={(
        <Link to={listPath} className="jd-back">
          <i className="fa-solid fa-arrow-left" />
          {external ? '외부 채용공고 목록' : '교내 채용공고 목록'}
        </Link>
      )}
      action={acceptsApply ? (
        applied ? (
          <>
            <p className="jd-apply-state">
              <i className="fa-solid fa-circle-check" />
              {mine!.status === 'IN_PROGRESS'
                ? `전형 진행 중 · ${currentStageLabel(mine!)}`
                : APPLICATION_STATUS_LABEL[mine!.status]}
            </p>
            <button
              type="button"
              className="jd-apply-btn jd-apply-btn-ghost"
              onClick={() => navigate('/mypage/applications')}
            >
              지원 현황 보기
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="jd-apply-btn"
              onClick={submitApply}
              disabled={!gate?.ok}
            >
              지원하기
            </button>
            {gate && !gate.ok && <p className="jd-apply-state">{gate.reason}</p>}
          </>
        )
      ) : (
        job.applyUrl && (
          <a className="jd-apply-btn" href={job.applyUrl} target="_blank" rel="noreferrer">
            지원하기 <i className="fa-solid fa-arrow-up-right-from-square" />
          </a>
        )
      )}
    />
  )
}
