import { LuBriefcase, LuDownload, LuEllipsisVertical, LuPlus } from 'react-icons/lu'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import AdminModal from '../components/AdminModal'
import JobWishersModal from '../components/JobWishersModal'
import { getInternalJobs, isJobClosed, jobDeadlineAt, jobExportRows, jobHighlights, jobPostedDate, removeJob } from '../data/jobsSource'
import type { JobPosting } from '../data/jobsSource'
import { JOB_CODE_GROUPS, jobLabelsOf, jobOptions } from '../data/schema/job'
import { summarizeJob } from '../data/jobApplications'
import { EMPTY_JOB_FILTERS, JOB_MANAGE_TABS, filterJobs, inTab, isDeadlineSoon } from '../data/jobManageFilter'
import type { JobManageFilters, JobManageTab, JobSearchField } from '../data/jobManageFilter'
import { jobCapability } from '../../shared/jobStore'
import { useJobStore } from '../../shared/useJobStore'
import { downloadXlsx } from '../../shared/xlsx'

// ─────────────────────────────────────────────────────────────────────────
// 교내공고 관리 — 추천·일반 구분 없이 모든 교내 공고를 한 표로 본다(2026-11-23 사용자 확정, 카드 보드 대체).
// 필터·탭 판정은 jobManageFilter, 조회·찜 수는 서버 DTO(viewCount·wishCount)를 그대로 쓴다.
// 찜 수 옆 ⋮ 를 누르면 찜한 학생 목록(GET /jobs/{id}/wishers)을 연다 — 그때만 불러온다.
// ─────────────────────────────────────────────────────────────────────────

const SELECTS: { key: 'careerType' | 'gender' | 'employmentType' | 'companyType'; label: string; group: string }[] = [
  { key: 'careerType', label: '경력여부', group: JOB_CODE_GROUPS.careerType },
  { key: 'gender', label: '성별', group: JOB_CODE_GROUPS.gender },
  { key: 'employmentType', label: '근무형태', group: JOB_CODE_GROUPS.employmentType },
  { key: 'companyType', label: '기업구분', group: JOB_CODE_GROUPS.companyType },
]

function deadlineText(job: JobPosting): string {
  if (job.deadlineMode === 'ALWAYS') return '상시'
  const at = jobDeadlineAt(job)?.slice(0, 10) ?? ''
  return job.deadlineMode === 'ON_HIRE' ? `채용시 ${at}`.trim() : at
}

export default function JobManage() {
  const navigate = useNavigate()
  useJobStore()
  const jobs = getInternalJobs()
  const [draft, setDraft] = useState<JobManageFilters>(EMPTY_JOB_FILTERS)
  const [filters, setFilters] = useState<JobManageFilters>(EMPTY_JOB_FILTERS)
  const [tab, setTab] = useState<JobManageTab>('ALL')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [wishersOf, setWishersOf] = useState<JobPosting | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const filtered = filterJobs(jobs, filters)
  const visible = filtered.filter(job => inTab(job, tab))
  const counts = Object.fromEntries(JOB_MANAGE_TABS.map(t => [t.value, filtered.filter(job => inTab(job, t.value)).length]))
  // 지원·최종합격 수는 지원 스토어를 읽을 권한(jobs.4)이 있을 때만 안다 — 없으면 '—'로 둔다.
  const applicantsOf = jobCapability().canManageApplicants ? (job: JobPosting) => summarizeJob(job.id) : null
  const allChecked = visible.length > 0 && visible.every(job => checked.has(job.id))
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).replaceAll('-', '')

  const change = <K extends keyof JobManageFilters>(key: K, value: JobManageFilters[K]) => setDraft(old => ({ ...old, [key]: value }))
  const toggled = (list: string[], value: string) => list.includes(value) ? list.filter(x => x !== value) : [...list, value]

  // 필터·탭으로 가려진 공고가 선택에 남아 삭제되면 안 된다.
  const search = (event: FormEvent) => { event.preventDefault(); setFilters(draft); setChecked(new Set()) }
  const changeTab = (value: JobManageTab) => { setTab(value); setChecked(new Set()) }
  const toggleCheck = (id: string) => setChecked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })

  const download = () => downloadXlsx(`교내채용공고_${today}.xlsx`, jobExportRows(visible, applicantsOf))

  const deleteSelected = async () => {
    setDeleting(true); setDeleteError('')
    const failures: string[] = []
    for (const id of checked) {
      const job = jobs.find(j => j.id === id)
      if (!job) continue
      try {
        await removeJob(id, job.version)
        setChecked(prev => { const next = new Set(prev); next.delete(id); return next })
      } catch (error) { failures.push(`${job.role}: ${error instanceof Error ? error.message : '삭제 실패'}`) }
    }
    setDeleting(false)
    if (failures.length) setDeleteError(failures.join('\n'))
    else setDeleteOpen(false)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">교내공고 관리</h1>
          <p className="admin-page-desc">추천·일반 채용공고를 한 표에서 검색하고 관리합니다.</p>
        </div>
      </header>

      <form className="admin-card admin-program-filter" onSubmit={search}>
        <div className="admin-program-filter-row">
          <span className="admin-program-filter-label">등록일</span>
          <div className="admin-date-range">
            <label className="admin-dot-date">{draft.postedFrom.replaceAll('-', '.') || 'YYYY.MM.DD'}<input type="date" aria-label="등록일 시작" max={draft.postedTo || undefined} value={draft.postedFrom} onChange={e => change('postedFrom', e.target.value)} /></label>
            ~
            <label className="admin-dot-date">{draft.postedTo.replaceAll('-', '.') || 'YYYY.MM.DD'}<input type="date" aria-label="등록일 끝" min={draft.postedFrom || undefined} value={draft.postedTo} onChange={e => change('postedTo', e.target.value)} /></label>
          </div>
          <label className="admin-select"><select aria-label="검색 구분" value={draft.searchField} onChange={e => change('searchField', e.target.value as JobSearchField)}>
            <option value="all">전체</option>
            <option value="company">회사명</option>
            <option value="role">모집제목</option>
          </select></label>
          <div className="admin-search"><input aria-label="검색어" placeholder="검색어 입력" value={draft.q} onChange={e => change('q', e.target.value)} /></div>
          <button type="submit" className="admin-btn admin-btn-primary admin-filter-submit admin-program-filter-submit">검색</button>
        </div>
        <div className="admin-program-filter-row">
          {SELECTS.map(({ key, label, group }) => (
            <span key={key} className="admin-program-filter-row">
              <span className="admin-program-filter-label">{label}</span>
              <label className="admin-select"><select aria-label={label} value={draft[key]} onChange={e => change(key, e.target.value)}>
                <option value="">전체</option>
                {jobOptions(group).map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select></label>
            </span>
          ))}
          <span className="admin-program-filter-label">지역</span>
          <label className="admin-select"><select aria-label="지역" value={draft.region} onChange={e => change('region', e.target.value)}>
            <option value="">전체</option>
            {jobOptions(JOB_CODE_GROUPS.region).map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select></label>
        </div>
        <div className="admin-program-filter-row">
          <span className="admin-program-filter-label">직종</span>
          {jobOptions(JOB_CODE_GROUPS.category).map(o => (
            <label key={o.code} className="admin-check">
              <input type="checkbox" checked={draft.categories.includes(o.code)} onChange={() => change('categories', toggled(draft.categories, o.code))} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </form>

      <div className="admin-tabs" role="tablist">
        {JOB_MANAGE_TABS.map(t => (
          <button key={t.value} type="button" role="tab" aria-selected={tab === t.value}
            className={`admin-tab${tab === t.value ? ' active' : ''}`} onClick={() => changeTab(t.value)}>
            {t.label} <span className="admin-tab-count">{counts[t.value]}</span>
          </button>
        ))}
      </div>

      <section className="admin-card">
        <div className="admin-program-list-bar">
          <span>Total <strong>{visible.length}</strong> ea</span>
          <div className="admin-head-actions">
            <Link to="/jobs/new" className="admin-btn admin-btn-primary sm"><LuPlus /> 신규</Link>
            <button type="button" className="admin-btn admin-btn-danger sm" disabled={checked.size === 0} onClick={() => { setDeleteError(''); setDeleteOpen(true) }}>
              삭제{checked.size > 0 && ` (${checked.size})`}
            </button>
            <button type="button" className="admin-btn sm" disabled={visible.length === 0} onClick={download}><LuDownload /> 엑셀 다운로드</button>
          </div>
        </div>

        {visible.length === 0 ? (
          jobs.length === 0
            ? <EmptyState icon={LuBriefcase} title="등록된 교내 채용공고가 없습니다" message="공고를 등록하면 이곳에서 관리할 수 있습니다."
                action={{ label: '공고 등록', onClick: () => navigate('/jobs/new') }} />
            : <EmptyState icon={LuBriefcase} title="조건에 맞는 공고가 없습니다" message="필터나 탭을 바꿔 다시 확인해 주세요." />
        ) : (
          <div className="admin-roster admin-job-manage-roster">
            <div className="admin-roster-head">
              <span className="admin-check-cell"><input type="checkbox" checked={allChecked} aria-label="전체 선택"
                onChange={() => setChecked(allChecked ? new Set() : new Set(visible.map(job => job.id)))} /></span>
              <span>등록일</span><span>회사명</span><span>모집제목</span><span>지역</span><span>마감일</span>
              <span>조회</span><span>지원</span><span>최종합격</span><span>찜</span><span>수정</span>
            </div>
            {visible.map(job => {
              const applicants = applicantsOf?.(job)
              const closed = isJobClosed(job)
              return (
                <div key={job.id} className={`admin-roster-row${closed ? ' is-closed' : ''}`}>
                  <span className="admin-roster-cell admin-check-cell">
                    <input type="checkbox" checked={checked.has(job.id)} onChange={() => toggleCheck(job.id)} aria-label={`${job.role} 선택`} />
                  </span>
                  <span className="admin-roster-cell">{jobPostedDate(job)}</span>
                  <span className="admin-roster-cell">{job.company}</span>
                  <span className="admin-roster-cell admin-job-title-cell">
                    <span className="admin-job-badges">
                      {job.recruitType === 'RECOMMENDATION' && <span className="admin-chip admin-chip-ok">추천</span>}
                      {closed ? <span className="admin-chip admin-chip-cancel">마감</span>
                        : isDeadlineSoon(job) && <span className="admin-chip admin-chip-penalty">마감임박</span>}
                      {jobHighlights(job).filter(tag => tag !== '오늘마감').map(tag => <span key={tag} className="admin-chip admin-chip-wait">{tag}</span>)}
                    </span>
                    <Link to={`/jobs/${job.id}`} className="admin-job-title">{job.role}</Link>
                  </span>
                  <span className="admin-roster-cell">{jobLabelsOf(JOB_CODE_GROUPS.region, job.regions).join(', ') || job.location || '—'}</span>
                  <span className="admin-roster-cell">{deadlineText(job)}</span>
                  <span className="admin-roster-cell">{job.viewCount ?? 0}</span>
                  <span className="admin-roster-cell">{applicants ? applicants.total : '—'}</span>
                  <span className="admin-roster-cell">{applicants ? applicants.passed : '—'}</span>
                  <span className="admin-roster-cell admin-job-wish-cell">
                    {job.wishCount ?? 0}
                    <button type="button" className="admin-icon-btn" aria-label={`${job.role} 찜한 학생 목록 보기`} title="찜한 학생 목록"
                      onClick={() => setWishersOf(job)}><LuEllipsisVertical /></button>
                  </span>
                  <span className="admin-roster-cell">
                    <button type="button" className="admin-btn admin-btn-primary sm" onClick={() => navigate(`/jobs/${job.id}/edit`)}>수정</button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {wishersOf && <JobWishersModal job={wishersOf} onClose={() => setWishersOf(null)} />}
      {deleteOpen && <AdminModal title="채용공고 삭제" onClose={() => { if (!deleting) setDeleteOpen(false) }}>
        <p>선택한 {checked.size}개 공고를 삭제합니다. 학생 화면에서 사라지며, 지원·전형 이력은 그대로 보존됩니다.</p>
        {deleteError && <p role="alert" style={{ whiteSpace: 'pre-line' }}>{deleteError}</p>}
        <div className="admin-head-actions">
          <button type="button" className="admin-btn" disabled={deleting} onClick={() => setDeleteOpen(false)}>취소</button>
          <button type="button" className="admin-btn admin-btn-danger" disabled={deleting || checked.size === 0} onClick={() => { void deleteSelected() }}>{deleting ? '삭제 중…' : '삭제'}</button>
        </div>
      </AdminModal>}
    </div>
  )
}
