import { LuInfo, LuPlus } from 'react-icons/lu'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getJobsByScope, countJobs } from '../data/jobsSource'
import JobBoard from '../../src_v2/components/JobBoard'
import { summarizeJob } from '../data/jobApplications'

// ─────────────────────────────────────────────────────────────────────────
// 교내공고 관리 — 목록(/jobs)과 같은 카드 보드다(JobBoard 공유).
// 추천채용은 카드로 위에, 일반채용은 리스트로 아래에 — 목록·학생 화면과 같은 배치.
//
// 두 화면의 차이는 카드를 눌렀을 때 어디로 가느냐 하나뿐이다:
//   목록(/jobs)   → 공고 보기 (학생에게 어떻게 나가는지 확인)
//   관리(여기)    → 공고 수정 (삭제도 수정 화면에 있다)
// 표를 따로 만들지 않는다 — 같은 공고를 두 가지 모양으로 그리면 화면이 갈린다.
// ─────────────────────────────────────────────────────────────────────────
export default function JobManage() {
  const navigate = useNavigate()
  const jobs = useMemo(() => getJobsByScope('internal'), [])
  const counts = useMemo(() => countJobs('internal'), [])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">교내공고 관리</h1>
          <p className="admin-page-desc">
            등록 {counts.total}건 · 게시 {counts.게시} · 마감 {counts.마감}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/jobs/new" className="admin-btn admin-btn-primary">
            <LuPlus /> 공고 등록
          </Link>
        </div>
      </header>

      <div className="admin-editor-hint">
        <LuInfo />
        공고를 누르면 수정 화면으로 갑니다. 삭제도 수정 화면에서 합니다.
        학생에게 어떻게 보이는지는 「교내 공고 목록」에서 확인하세요.
      </div>

      <JobBoard
        applicantCountOf={job => summarizeJob(job.id).total}
        jobs={jobs}
        onOpen={job => navigate(`/jobs/${job.id}/edit`)}
        split
        emptyMain="등록된 교내 채용공고가 없습니다"
        emptyHint="공고를 등록하면 이곳에서 수정·삭제할 수 있습니다."
      />
    </div>
  )
}
