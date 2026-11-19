import { LuDownload, LuInfo, LuPlus } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getJobsByScope, countJobs, jobExportRows } from '../data/jobsSource'
import type { JobPosting } from '../data/jobsSource'
import JobBoard from '../../src_v2/components/JobBoard'
import JobWishersModal from '../components/JobWishersModal'
import { summarizeJob } from '../data/jobApplications'
import { jobCapability } from '../../shared/jobStore'
import { downloadXlsx } from '../../shared/xlsx'

// ─────────────────────────────────────────────────────────────────────────
// 교내공고 관리 — 목록(/jobs)과 같은 카드 보드다(JobBoard 공유).
// 추천채용은 카드로 위에, 일반채용은 리스트로 아래에 — 목록·학생 화면과 같은 배치.
//
// 두 화면의 차이는 카드를 눌렀을 때 어디로 가느냐 하나뿐이다:
//   목록(/jobs)   → 공고 보기 (학생에게 어떻게 나가는지 확인)
//   관리(여기)    → 공고 수정 (삭제도 수정 화면에 있다)
// 표를 따로 만들지 않는다 — 같은 공고를 두 가지 모양으로 그리면 화면이 갈린다.
// 「목록 다운로드」는 등록일(KST) 기간으로 거른 교내 공고를 엑셀로 내려받는다(2026-11-19).
// ─────────────────────────────────────────────────────────────────────────

function kstDate(at: Date): string {
  return at.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

export default function JobManage() {
  const navigate = useNavigate()
  const jobs = useMemo(() => getJobsByScope('internal'), [])
  const counts = useMemo(() => countJobs('internal'), [])
  const [wishersOf, setWishersOf] = useState<JobPosting | null>(null)
  const [from, setFrom] = useState(() => { const at = new Date(); at.setFullYear(at.getFullYear() - 1); return kstDate(at) })
  const [to, setTo] = useState(() => kstDate(new Date()))
  const rangeOk = Boolean(from && to && from <= to)

  const download = () => {
    if (!rangeOk) return
    // 지원자 수는 지원 스토어를 읽을 권한(jobs.4)이 있을 때만 안다 — 없으면 빈 칸이다.
    const applicants = jobCapability().canManageApplicants ? (job: JobPosting) => summarizeJob(job.id).total : null
    downloadXlsx(`교내채용공고_${from.replaceAll('-', '')}-${to.replaceAll('-', '')}.xlsx`, jobExportRows(from, to, applicants))
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">교내공고 관리</h1>
          <p className="admin-page-desc">
            등록 {counts.total}건 · 게시 {counts.POSTED} · 마감 {counts.CLOSED}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/jobs/new" className="admin-btn admin-btn-primary">
            <LuPlus /> 공고 등록
          </Link>
        </div>
      </header>

      <section className="job-export" aria-label="공고 목록 다운로드">
        <span className="job-export-label">등록일</span>
        <input type="date" aria-label="등록일 시작" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
        <span aria-hidden="true">~</span>
        <input type="date" aria-label="등록일 끝" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
        <button type="button" className="admin-btn" onClick={download} disabled={!rangeOk}>
          <LuDownload /> 목록 다운로드
        </button>
        {!rangeOk && <span className="job-export-hint" role="alert">시작일이 종료일보다 늦습니다.</span>}
      </section>

      <div className="admin-editor-hint">
        <LuInfo />
        공고를 누르면 수정 화면으로 갑니다. 삭제도 수정 화면에서 합니다.
        학생에게 어떻게 보이는지는 「교내 공고 목록」에서 확인하세요. 카드의 「찜 N명」을 누르면 찜한 학생을 볼 수 있습니다.
      </div>

      <JobBoard
        applicantCountOf={job => summarizeJob(job.id).total}
        onWishersOpen={setWishersOf}
        jobs={jobs}
        onOpen={job => navigate(`/jobs/${job.id}/edit`)}
        split
        emptyMain="등록된 교내 채용공고가 없습니다"
        emptyHint="공고를 등록하면 이곳에서 수정·삭제할 수 있습니다."
      />

      {wishersOf && <JobWishersModal job={wishersOf} onClose={() => setWishersOf(null)} />}
    </div>
  )
}
