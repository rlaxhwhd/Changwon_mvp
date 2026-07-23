import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobs, jobDdayLabel } from '../../../src_admin/data/jobsSource'
import type { JobPosting } from '../../../src_admin/data/jobsSource'
import './JobSupport.css'

function regionLabel(job: JobPosting): string {
  const regions = (job.regions ?? []).filter(r => r !== '전체')
  if (regions.length) return regions.join(', ')
  return job.location || '전국'
}

function careerLabel(job: JobPosting): string {
  const careers = job.careerTypes ?? []
  return careers.length ? careers.join('·') : job.jobType
}

function salaryLabel(job: JobPosting): string {
  if (job.salaryNegotiable) return '회사내규'
  const s = (job.salary ?? '').trim()
  if (!s) return '회사내규'
  return /^[\d,]+$/.test(s) ? `${s}만원` : s
}

export default function JobSupport() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [wished, setWished] = useState<Set<string>>(() => new Set())

  // 단일소스: 상담사가 등록한 공고(dc_jobs) + seed. 학생 화면은 이 소스를 구독한다.
  const all = useMemo(() => getJobs(), [])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter(job => q === '' || `${job.company} ${job.role}`.toLowerCase().includes(q))
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
  }, [all, query])

  const toggleWish = (id: string) =>
    setWished(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="job-page">
      <header className="job-header">
        <div>
          <p>학교가 직접 등록·검증한 실제 채용공고</p>
          <h1>채용공고</h1>
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
        <div className="job-count">총 <strong>{list.length}</strong>건</div>
      </section>

      {list.length === 0 ? (
        <div className="job-empty">
          <i className="fa-regular fa-folder-open" />
          <p>{all.length === 0 ? '등록된 채용공고가 없습니다.' : '검색 결과가 없어요.'}</p>
          <span>{all.length === 0 ? '상담사가 채용공고를 등록하면 이곳에 노출됩니다.' : '다른 기업명이나 공고명으로 검색해보세요.'}</span>
        </div>
      ) : (
        <section className="jc-grid" aria-label="채용공고 목록">
          {list.map(job => {
            const dday = jobDdayLabel(job)
            const closed = dday === '마감'
            const category = (job.jobCategories ?? [])[0]
            const employment = (job.employmentTypes ?? [])[0] ?? job.jobType
            return (
              <button
                key={job.id}
                type="button"
                className={`jc-card${closed ? ' is-closed' : ''}`}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="jc-top">
                  <span className="jc-company">{job.company}</span>
                  {job.recruitType === '추천채용' && <span className="jc-badge-rec">추천</span>}
                  <span
                    role="button"
                    tabIndex={0}
                    className={`jc-star${wished.has(job.id) ? ' is-on' : ''}`}
                    aria-label={wished.has(job.id) ? '찜 해제' : '찜하기'}
                    onClick={e => { e.stopPropagation(); toggleWish(job.id) }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleWish(job.id) } }}
                  >
                    <i className={wished.has(job.id) ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
                  </span>
                </div>

                <h3 className="jc-title">{job.role}</h3>

                <div className="jc-tags">
                  <span className="jc-tag jc-tag-emp">{employment}</span>
                  {category && <span className="jc-tag">{category}</span>}
                </div>

                <div className="jc-meta">
                  <span><i className="fa-solid fa-location-dot" /> {regionLabel(job)}</span>
                  <span><i className="fa-solid fa-briefcase" /> {careerLabel(job)}</span>
                  <span><i className="fa-solid fa-graduation-cap" /> 학력무관</span>
                  <span><i className="fa-solid fa-won-sign" /> {salaryLabel(job)}</span>
                </div>

                <div className="jc-foot">
                  <span className={`jc-dday${closed ? ' is-closed' : ''}`}>{dday}</span>
                  {job.deadlineOnHire
                    ? <time>채용시 마감</time>
                    : job.deadline && <time>~{job.deadline.slice(5).replace('-', '.')}</time>}
                </div>
              </button>
            )
          })}
        </section>
      )}
    </div>
  )
}
