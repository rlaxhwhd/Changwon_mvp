import { LuBuilding2, LuFrown, LuInfo, LuPlus, LuSearch } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getJobsByScope, countJobs } from '../data/jobsSource'
import type { JobStatus, JobScope } from '../data/jobsSource'
import EmptyState from '../components/EmptyState'

const ALL = '전체'

const STATUS_FILTERS: (JobStatus | typeof ALL)[] = [ALL, '게시', '마감']

/** scope 별 화면 문구 — 교내(직접 등록)와 외부(API 수집) 목록이 같은 컴포넌트를 공유한다. */
const SCOPE_COPY: Record<JobScope, { title: string; hint: string; emptyTitle: string; emptyMessage: string }> = {
  internal: {
    title: '교내 채용공고 목록',
    hint: '상담사가 직접 등록한 공고입니다. 등록한 공고는 학생 취업지원 > 교내 채용공고 화면에 그대로 노출됩니다.',
    emptyTitle: '등록된 교내 채용공고가 없습니다',
    emptyMessage: '공고를 직접 등록하면 이 목록과 학생 화면에 함께 노출됩니다.',
  },
  external: {
    title: '외부 채용공고 목록',
    hint: '외부 채용 API(잡코리아 등)로 수집된 공고입니다. 원본이 외부에 있어 수정·삭제할 수 없으며, 학생 화면과 동일한 목록을 봅니다.',
    emptyTitle: '수집된 외부 채용공고가 없습니다',
    emptyMessage: '외부 채용 API 연동 공고가 들어오면 이 목록에 표시됩니다.',
  },
}

function statusChip(status: JobStatus): string {
  return status === '게시' ? 'admin-chip-done' : 'admin-chip-cancel'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function JobList({ scope }: { scope: JobScope }) {
  const navigate = useNavigate()
  const copy = SCOPE_COPY[scope]
  const all = useMemo(() => getJobsByScope(scope), [scope])
  const counts = useMemo(() => countJobs(scope), [scope])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<JobStatus | typeof ALL>(ALL)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter(j => {
        if (status !== ALL && j.status !== status) return false
        if (q) {
          const hay = `${j.company} ${j.role} ${j.tags.join(' ')} ${j.location}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
  }, [all, query, status])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">{copy.title}</h1>
          <p className="admin-page-desc">
            등록 {counts.total}건 · 게시 {counts.게시} · 마감 {counts.마감}
          </p>
        </div>
        {scope === 'internal' && (
          <div className="admin-head-actions">
            <Link to="/jobs/new" className="admin-btn admin-btn-primary">
              <LuPlus /> 공고 등록
            </Link>
          </div>
        )}
      </header>

      <div className="admin-editor-hint">
        <LuInfo />
        {copy.hint}
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
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">검색 결과 {list.length}건</span>
      </div>

      <section className="admin-card">
        {all.length === 0 ? (
          <EmptyState
            icon={LuBuilding2}
            title={copy.emptyTitle}
            message={copy.emptyMessage}
            action={scope === 'internal' ? { label: '공고 등록하기', onClick: () => navigate('/jobs/new') } : undefined}
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
              <span>등록일</span>
              <span>상태</span>
            </div>
            {list.map(j => {
              const cells = (
                <>
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
                  <span className="admin-roster-cell">{j.deadlineOnHire ? '채용시 마감' : j.deadline || '상시'}</span>
                  <span className="admin-roster-cell">{fmtDate(j.postedAt)}</span>
                  <span className="admin-roster-cell">
                    <span className={`admin-chip ${statusChip(j.status)}`}>{j.status}</span>
                  </span>
                </>
              )
              // 외부 공고는 수정할 수 없으므로 행을 클릭 대상으로 만들지 않는다.
              return scope === 'external' ? (
                <div key={j.id} className="admin-roster-row admin-job-row-static">{cells}</div>
              ) : (
                <button
                  key={j.id}
                  type="button"
                  className="admin-roster-row"
                  onClick={() => navigate(`/jobs/${j.id}/edit`)}
                >
                  {cells}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
