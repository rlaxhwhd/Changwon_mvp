import { LuBuilding2, LuFrown, LuInfo, LuPlus, LuSearch } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getJobs, countJobs } from '../data/jobsSource'
import type { JobStatus, JobSource } from '../data/jobsSource'
import EmptyState from '../components/EmptyState'

const ALL = '전체'

const STATUS_FILTERS: (JobStatus | typeof ALL)[] = [ALL, '게시', '마감']

const SOURCE_LABEL: Record<JobSource, string> = {
  external: '외부 연동',
  manual: '직접 등록',
}

function statusChip(status: JobStatus): string {
  return status === '게시' ? 'admin-chip-done' : 'admin-chip-cancel'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function JobList() {
  const navigate = useNavigate()
  const all = useMemo(() => getJobs(), [])
  const counts = useMemo(() => countJobs(), [])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<JobStatus | typeof ALL>(ALL)
  const [source, setSource] = useState<JobSource | typeof ALL>(ALL)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter(j => {
        if (status !== ALL && j.status !== status) return false
        if (source !== ALL && j.source !== source) return false
        if (q) {
          const hay = `${j.company} ${j.role} ${j.tags.join(' ')} ${j.location}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
  }, [all, query, status, source])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">채용공고 목록</h1>
          <p className="admin-page-desc">
            등록 {counts.total}건 · 게시 {counts.게시} · 마감 {counts.마감} — 게시·마감과 출처(외부 연동·직접 등록)를 관리합니다.
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/jobs/new" className="admin-btn admin-btn-primary">
            <LuPlus /> 공고 등록
          </Link>
        </div>
      </header>

      {/* 데이터 추후 주입 안내 */}
      <div className="admin-editor-hint">
        <LuInfo />
        외부 채용 API(잡코리아 등) 연동 공고는 추후 주입됩니다. 지금은 상담사가 직접 등록한 공고만 표시되며, 등록한 공고는 학생 <strong>취업지원</strong> 화면과 동일한 형식으로 노출됩니다.
      </div>

      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="회사·직무·태그·근무지 검색"
          />
        </div>
        <label className="admin-select">
          <span>상태</span>
          <select value={status} onChange={e => setStatus(e.target.value as JobStatus | typeof ALL)}>
            {STATUS_FILTERS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="admin-select">
          <span>출처</span>
          <select value={source} onChange={e => setSource(e.target.value as JobSource | typeof ALL)}>
            <option value={ALL}>{ALL}</option>
            <option value="manual">직접 등록</option>
            <option value="external">외부 연동</option>
          </select>
        </label>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">검색 결과 {list.length}건</span>
      </div>

      <section className="admin-card">
        {all.length === 0 ? (
          <EmptyState
            icon={LuBuilding2}
            title="등록된 채용공고가 없습니다"
            message="실제 공고 데이터는 추후 주입됩니다. 지금 바로 공고를 직접 등록해 화면을 확인할 수 있습니다."
            action={{ label: '공고 등록하기', onClick: () => navigate('/jobs/new') }}
          />
        ) : list.length === 0 ? (
          <EmptyState icon={LuFrown} message="조건에 맞는 공고가 없습니다." />
        ) : (
          <div className="admin-roster admin-job-roster">
            <div className="admin-roster-head">
              <span>회사 · 직무</span>
              <span>태그</span>
              <span>근무지 · 유형</span>
              <span>마감일</span>
              <span>출처</span>
              <span>상태</span>
            </div>
            {list.map(j => (
              <button
                key={j.id}
                type="button"
                className="admin-roster-row"
                onClick={() => navigate(`/jobs/${j.id}/edit`)}
              >
                <span className="admin-roster-cell">
                  <strong>{j.company}</strong>
                  <small>{j.role}</small>
                </span>
                <span className="admin-roster-cell admin-job-tags">
                  {j.tags.length === 0
                    ? <small>—</small>
                    : j.tags.slice(0, 3).map(t => (
                        <span key={t} className="admin-tag admin-tag-soft">{t}</span>
                      ))}
                </span>
                <span className="admin-roster-cell">
                  {j.location || '—'}
                  <small>{j.jobType} · {j.salary || '처우 협의'}</small>
                </span>
                <span className="admin-roster-cell">{j.deadline || '상시'}</span>
                <span className="admin-roster-cell">
                  <span className={`admin-tag${j.source === 'external' ? ' admin-tag-soft' : ''}`}>
                    {SOURCE_LABEL[j.source]}
                  </span>
                  <small>{fmtDate(j.postedAt)}</small>
                </span>
                <span className="admin-roster-cell">
                  <span className={`admin-chip ${statusChip(j.status)}`}>{j.status}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
