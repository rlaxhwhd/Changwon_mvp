// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원자관리 — 공고 목록
//
// 교내 추천채용 공고만 모아 지원 현황을 요약한다(대상 판정은 getRecommendedJobs
// 단일 지점). 공고를 고르면 지원자 관리 상세로 들어간다.
// 요청서 "모든 지원자 현황 포함해서 엑셀로 받을 수 있는 버튼 필수" → 목록 상단 버튼.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuBriefcase, LuDownload, LuInfo } from 'react-icons/lu'
import EmptyState from '../components/EmptyState'
import { getRecommendedJobs, summarizeJob } from '../data/jobApplications'
import { fetchJobApplicantCsv } from '../data/jobApplicationExport'
import { jobDdayLabel } from '../data/jobsSource'
import { useAsyncAction } from '../../shared/useAsyncAction'

export default function JobApplicantsList() {
  const navigate = useNavigate()
  const { run, saving, error } = useAsyncAction()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const jobs = useMemo(() => getRecommendedJobs(), [])
  const rows = useMemo(
    () => jobs.map(job => ({ job, summary: summarizeJob(job.id) })),
    [jobs],
  )

  const allChecked = jobs.length > 0 && jobs.every(j => checked.has(j.id))

  const toggleCheck = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setChecked(allChecked ? new Set() : new Set(jobs.map(j => j.id)))
  }

  // 선택이 없으면 담당 범위의 전체 지원을 내려받는다 — "모든 지원자 현황"이 기본값이다.
  // 서버가 한 공고씩만 필터를 받으므로 여러 공고를 고르면 나눠 받아 잇는다.
  const targetIds = checked.size ? [...checked] : []
  const exportCount = targetIds.length
    ? rows.filter(r => targetIds.includes(r.job.id)).reduce((sum, r) => sum + r.summary.total, 0)
    : rows.reduce((sum, r) => sum + r.summary.total, 0)

  const downloadCsv = () => {
    void run(async () => {
      // 명단은 서버가 만든다 — 목록·집계와 같은 필터, 같은 범위 술어를 쓰고
      // 다운로드 사실이 dc.job_access_event 에 남는다.
      const parts = targetIds.length
        ? await Promise.all(targetIds.map(postingId => fetchJobApplicantCsv({ postingId })))
        : [await fetchJobApplicantCsv()]
      // 두 번째 파일부터는 머리글 줄을 뺀다(BOM 도 첫 파일 것만 남긴다).
      const dropHeader = (part: string) => part.split('\n').slice(1).join('\n')
      const [first, ...rest] = parts
      const body = [first, ...rest.map(dropHeader)].join('\n')
      const today = new Date().toISOString().slice(0, 10).replaceAll('-', '')
      const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `추천채용_지원자현황_${today}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    })
  }

  const totalApplicants = rows.reduce((sum, r) => sum + r.summary.total, 0)

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">추천채용 지원자관리</h1>
          <p className="admin-page-desc">
            추천채용 공고 {jobs.length}건 · 누적 지원 {totalApplicants}명
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={downloadCsv}
            disabled={exportCount === 0 || saving}
          >
            <LuDownload /> {saving ? '만드는 중…' : `엑셀 다운로드 (${exportCount}명)`}
          </button>
        </div>
      </header>

      {error && <p className="admin-form-error" role="alert">{error}</p>}

      <div className="admin-editor-hint">
        <LuInfo />
        교내 공고 중 <strong>채용유형이 «추천채용»</strong>인 공고만 지원 접수를 받습니다.
        일반공고·외부공고는 학생이 지원 링크로 직접 지원하므로 여기에 나타나지 않습니다.
      </div>

      <section className="admin-card">
        {rows.length === 0 ? (
          <EmptyState
            icon={LuBriefcase}
            title="추천채용 공고가 없습니다"
            message="공고 등록에서 채용유형을 «추천채용»으로 등록하면 이곳에서 지원자를 관리할 수 있습니다."
            action={{ label: '공고 등록', onClick: () => navigate('/jobs/new') }}
          />
        ) : (
          <div className="admin-roster admin-jobapp-roster">
            <div className="admin-roster-head">
              <span className="admin-check-cell">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
              </span>
              <span>회사 · 공고</span>
              <span>마감</span>
              <span>지원</span>
              <span>진행중</span>
              <span>최종합격</span>
              <span>탈락</span>
            </div>
            {rows.map(({ job, summary }) => (
              <div
                key={job.id}
                role="button"
                tabIndex={0}
                className="admin-roster-row"
                onClick={() => navigate(`/jobs/applicants/${job.id}`)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/jobs/applicants/${job.id}`)
                  }
                }}
              >
                <span
                  className="admin-roster-cell admin-check-cell"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(job.id)}
                    onChange={() => toggleCheck(job.id)}
                    aria-label={`${job.role} 선택`}
                  />
                </span>
                <span className="admin-roster-cell">
                  <strong>{job.role}</strong>
                  <small>{job.company}</small>
                </span>
                <span className="admin-roster-cell">{jobDdayLabel(job)}</span>
                <span className="admin-roster-cell"><strong>{summary.total}명</strong></span>
                <span className="admin-roster-cell">{summary.open}명</span>
                <span className="admin-roster-cell">{summary.passed}명</span>
                <span className="admin-roster-cell">{summary.rejected}명</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
