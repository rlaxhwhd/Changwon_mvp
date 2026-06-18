import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JOB_POSTINGS, type JobStatus } from './jobsData'
import './JobSupport.css'

const STATUS_CLASS: Record<JobStatus, string> = {
  접수중: 'open',
  마감임박: 'soon',
  마감완료: 'closed',
}

const STATUS_PRIORITY: Record<JobStatus, number> = {
  접수중: 0,
  마감임박: 1,
  마감완료: 2,
}

export default function JobSupport() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [openFirst, setOpenFirst] = useState(false)

  const filteredPostings = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = JOB_POSTINGS.filter(posting =>
      q === '' ||
      posting.title.toLowerCase().includes(q) ||
      posting.company.toLowerCase().includes(q),
    )
    result.sort((a, b) => {
      const statusDiff = openFirst
        ? STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
        : 0
      if (statusDiff !== 0) return statusDiff
      return b.postedAt.localeCompare(a.postedAt)
    })
    return result
  }, [query, openFirst])

  return (
    <div className="job-page">
      <header className="job-header">
        <div>
          <p>관리자가 스크래핑해 등록한 실제 채용공고</p>
          <h1>채용공고</h1>
        </div>
        <div className="job-header-actions">
          <button
            type="button"
            className={openFirst ? 'is-active' : ''}
            aria-pressed={openFirst}
            onClick={() => setOpenFirst(v => !v)}
          >
            <i className="fa-solid fa-sliders" />필터
          </button>
          <button
            type="button"
            className={openFirst ? 'is-active' : ''}
            aria-pressed={openFirst}
            onClick={() => setOpenFirst(v => !v)}
          >
            <i className="fa-solid fa-arrow-down-wide-short" />접수중 우선
          </button>
        </div>
      </header>

      <section className="job-toolbar" aria-label="채용공고 검색">
        <div className="job-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            placeholder="기업명, 공고명으로 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="기업명, 공고명으로 검색"
          />
        </div>
        <div className="job-count">총 <strong>{filteredPostings.length}</strong>건</div>
      </section>

      <section className="job-list" aria-label="채용공고 목록">
        {filteredPostings.length === 0 ? (
          <div className="job-empty">
            <i className="fa-regular fa-folder-open" />
            <p>검색 결과가 없어요.</p>
            <span>다른 기업명이나 공고명으로 검색해보세요.</span>
          </div>
        ) : (
          filteredPostings.map(posting => (
            <button
              key={posting.id}
              className="job-row"
              onClick={() => navigate(`/jobs/${posting.id}`)}
            >
              <time>{posting.postedAt}</time>
              <span className="job-company">{posting.company}</span>
              <span className="job-title-cell">
                {posting.recommended && <span className="job-recommend">추천</span>}
                <strong>{posting.title}</strong>
              </span>
              <span className={`job-status ${STATUS_CLASS[posting.status]}`}>{posting.status}</span>
              <span className="job-views">{posting.views}</span>
            </button>
          ))
        )}
      </section>
    </div>
  )
}
