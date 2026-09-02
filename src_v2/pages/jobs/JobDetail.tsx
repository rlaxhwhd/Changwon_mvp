import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getJobById } from '../../../src_admin/data/jobsSource'
import {
  APPLICATION_STATUS_LABEL,
  applyToJob,
  attachmentLabel,
  canApplyTo,
  currentStageLabel,
  getApplication,
  isRecommendedInternal,
} from '../../../src_admin/data/jobApplications'
import type { ApplyAttachment } from '../../../src_admin/data/jobApplications'
import { getActiveStudent } from '../../data/students'
import JobApplyModal from '../../components/JobApplyModal'
import JobDetailView from '../../components/JobDetailView'
import { usePageHead } from '../../components/PageCrumb'

// 공고 본문은 교직원 화면과 같은 JobDetailView 다 — 여기서 그리는 것은 지원 CTA 뿐이다.
export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  // 지원 직후 화면을 다시 읽기 위한 트리거 (스토어가 localStorage 라 재조회로 끝난다)
  const [tick, setTick] = useState(0)
  // 제출 서류를 고르는 모달 — 서류 없이 지원되던 것을 여기서 막는다.
  const [applyOpen, setApplyOpen] = useState(false)
  const job = id ? getJobById(id) : undefined
  // 시안(public_t/job.png)처럼 머리글은 '채용공고 상세', 직무명은 히어로가 갖는다.
  usePageHead('채용공고 상세', '공고 내용을 확인하고 지원을 준비하세요.')

  if (!job) return <Navigate to="/jobs" replace />

  // 교내 추천채용만 사이트 안에서 지원을 받는다. 나머지는 기존대로 외부 링크로 나간다.
  const acceptsApply = isRecommendedInternal(job)
  const me = getActiveStudent()
  const mine = acceptsApply ? getApplication(job.id, me.id) : undefined
  const applied = !!mine && mine.status !== 'CANCELED'
  const gate = acceptsApply ? canApplyTo(job.id, me.id) : undefined

  const submitApply = (attachment: ApplyAttachment) => {
    const created = applyToJob(job.id, {
      id: me.id,
      studentNo: me.studentNo,
      name: me.name,
      major: me.major,
      grade: me.grade,
      enrollmentStatus: me.enrollmentStatus,
    }, attachment)
    if (!created) {
      window.alert('지원할 수 없는 공고입니다. 잠시 후 다시 확인해 주세요.')
      return
    }
    setApplyOpen(false)
    setTick(t => t + 1)
  }
  void tick

  // 출처에 따라 왔던 목록으로 되돌린다.
  const external = job.source === 'external'
  const listPath = external ? '/jobs/external' : '/jobs'

  return (
    <>
    <JobDetailView
      job={job}
      showWish
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
            {/* 무엇을 냈는지 학생이 다시 확인할 수 있어야 한다 — 라벨은 데이터층이 만든다. */}
            <p className="jd-apply-state">
              <i className="fa-regular fa-paperclip" />
              제출 서류 · {attachmentLabel(mine!)}
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
              onClick={() => setApplyOpen(true)}
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

    {acceptsApply && (
      <JobApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        company={job.company}
        role={job.role}
        onSubmit={submitApply}
      />
    )}
    </>
  )
}
