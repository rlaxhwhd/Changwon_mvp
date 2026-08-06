import { Link, Navigate, useParams } from 'react-router-dom'
import { getJobById, jobDdayLabel } from '../../../src_admin/data/jobsSource'
import './JobDetail.css'

function joinOr(arr: string[] | undefined, fallback: string): string {
  return arr && arr.length ? arr.join(', ') : fallback
}

export default function JobDetail() {
  const { id } = useParams()
  const job = id ? getJobById(id) : undefined

  if (!job) return <Navigate to="/jobs" replace />

  const closed = job.status === '마감'
  const salary = job.salaryNegotiable ? '회사내규 및 협의' : job.salary ? `${job.salary}만원` : '회사내규'
  const dday = jobDdayLabel(job)
  const deadline = job.deadlineOnHire ? '채용시 마감' : job.deadline || '상시'
  // 출처에 따라 왔던 목록으로 되돌린다.
  const external = job.source === 'external'
  const listPath = external ? '/jobs/external' : '/jobs'

  return (
    <div className="jd-page">
      <Link to={listPath} className="jd-back">
        <i className="fa-solid fa-arrow-left" />
        {external ? '외부 채용공고 목록' : '교내 채용공고 목록'}
      </Link>

      <article className="jd-head">
        <div className="jd-head-main">
          <div className="jd-meta-line">
            <span>{job.company}</span>
            {job.recruitType === '추천채용' && <em>추천</em>}
          </div>
          <h1>{job.role}</h1>
          {job.companyType && <p>{job.companyType}</p>}
        </div>
        <aside className="jd-status-card">
          <span className={`jd-status ${closed ? 'closed' : 'open'}`}>{closed ? '마감' : '접수중'}</span>
          <dl>
            <div>
              <dt>마감</dt>
              <dd>{dday}</dd>
            </div>
          </dl>
          {job.applyUrl && (
            <a className="jd-apply-btn" href={job.applyUrl} target="_blank" rel="noreferrer">
              지원하기 <i className="fa-solid fa-arrow-up-right-from-square" />
            </a>
          )}
        </aside>
      </article>

      <section className="jd-grid">
        <article className="jd-card">
          <h2>공고 정보</h2>
          <dl className="jd-info-list">
            <div><dt>기업명</dt><dd>{job.company}</dd></div>
            <div><dt>근무형태</dt><dd>{joinOr(job.employmentTypes, job.jobType)}</dd></div>
            <div><dt>직종</dt><dd>{joinOr(job.jobCategories, '-')}</dd></div>
            <div><dt>근무지역</dt><dd>{joinOr((job.regions ?? []).filter(r => r !== '전체'), job.location || '전국')}</dd></div>
            <div><dt>경력</dt><dd>{joinOr(job.careerTypes, job.jobType)}</dd></div>
            <div><dt>연봉</dt><dd>{salary}</dd></div>
            <div><dt>지원 마감</dt><dd>{deadline}</dd></div>
            {job.email && <div><dt>지원 이메일</dt><dd>{job.email}</dd></div>}
          </dl>
        </article>

        <article className="jd-card jd-card-wide">
          <h2>모집요강</h2>
          {job.content ? (
            <div className="jd-content" dangerouslySetInnerHTML={{ __html: job.content }} />
          ) : (
            <p className="jd-content-empty">등록된 모집요강이 없습니다.</p>
          )}
        </article>
      </section>
    </div>
  )
}
