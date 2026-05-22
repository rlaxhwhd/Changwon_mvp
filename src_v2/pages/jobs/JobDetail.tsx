import { Link, Navigate, useParams } from 'react-router-dom'
import { JOB_POSTINGS, type JobStatus } from './jobsData'
import './JobDetail.css'

const STATUS_CLASS: Record<JobStatus, string> = {
  접수중: 'open',
  마감임박: 'soon',
  마감완료: 'closed',
}

export default function JobDetail() {
  const { id } = useParams()
  const posting = JOB_POSTINGS.find(item => item.id === id)

  if (!posting) return <Navigate to="/jobs" replace />

  return (
    <div className="jd-page">
      <Link to="/jobs" className="jd-back">
        <i className="fa-solid fa-arrow-left" />
        채용공고 목록
      </Link>

      <article className="jd-head">
        <div className="jd-head-main">
          <div className="jd-meta-line">
            <time>{posting.postedAt}</time>
            <span>{posting.company}</span>
            {posting.recommended && <em>추천</em>}
          </div>
          <h1>{posting.title}</h1>
          <p>{posting.summary}</p>
        </div>
        <aside className="jd-status-card">
          <span className={`jd-status ${STATUS_CLASS[posting.status]}`}>{posting.status}</span>
          <dl>
            <div>
              <dt>마감일</dt>
              <dd>{posting.deadline}</dd>
            </div>
            <div>
              <dt>조회수</dt>
              <dd>{posting.views}</dd>
            </div>
          </dl>
        </aside>
      </article>

      <section className="jd-grid">
        <article className="jd-card">
          <h2>공고 정보</h2>
          <dl className="jd-info-list">
            <div>
              <dt>기업명</dt>
              <dd>{posting.company}</dd>
            </div>
            <div>
              <dt>근무형태</dt>
              <dd>{posting.employmentType}</dd>
            </div>
            <div>
              <dt>근무지역</dt>
              <dd>{posting.location}</dd>
            </div>
            <div>
              <dt>모집부서</dt>
              <dd>{posting.department}</dd>
            </div>
            <div>
              <dt>등록 출처</dt>
              <dd>{posting.source}</dd>
            </div>
          </dl>
        </article>

        <article className="jd-card">
          <h2>지원 자격</h2>
          <ul className="jd-list">
            {posting.requirements.map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="jd-card">
          <h2>우대 사항</h2>
          <ul className="jd-list">
            {posting.preferred.map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="jd-card">
          <h2>전형 절차</h2>
          <ol className="jd-process">
            {posting.process.map(item => <li key={item}>{item}</li>)}
          </ol>
        </article>
      </section>

      {posting.imageUrl && (
        <section className="jd-image-card">
          <img src={posting.imageUrl} alt={`${posting.company} 채용공고 이미지`} />
        </section>
      )}
    </div>
  )
}
