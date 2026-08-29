import type { ReactNode } from 'react'
import { jobDdayLabel } from '../../src_admin/data/jobsSource'
import type { JobPosting } from '../../src_admin/data/jobsSource'
import './JobDetailView.css'

// ─────────────────────────────────────────────────────────────────────────
// 채용공고 상세 본문 (공용) — 학생 /v2/jobs/:id 와 교직원 /admin/jobs/:id 가 같이 쓴다.
// 공고 내용을 그리는 곳은 여기 하나다 — 두 포털의 상세 화면이 갈리지 않는다.
// (목록 카드도 같은 이유로 JobBoard 하나를 공유한다)
//
// 포털마다 다른 것은 두 가지뿐이라 슬롯으로 받는다:
//   - back:   목록으로 돌아가는 링크 (학생/교직원의 목록 경로가 다르다)
//   - action: 상태 카드 아래 버튼 (학생=지원하기 / 교직원=공고 수정)
//   - showHeading: 카드 안 직무명 h1. 학생 화면은 공용 머리글(usePageHead)이 이미 제목을
//     그려서 끈다 — 켜 두면 같은 제목이 두 번 나온다. 교직원 화면은 머리글에 제목이
//     없으므로 기본값(켜짐) 그대로 쓴다.
// ─────────────────────────────────────────────────────────────────────────

function joinOr(arr: string[] | undefined, fallback: string): string {
  return arr && arr.length ? arr.join(', ') : fallback
}

interface JobDetailViewProps {
  job: JobPosting
  back?: ReactNode
  action?: ReactNode
  showHeading?: boolean
}

export default function JobDetailView({ job, back, action, showHeading = true }: JobDetailViewProps) {
  const closed = job.status === '마감'
  const salary = job.salaryNegotiable ? '회사내규 및 협의' : job.salary ? `${job.salary}만원` : '회사내규'
  const deadline = job.deadlineOnHire ? '채용시 마감' : job.deadline || '상시'

  return (
    <div className="jd-page">
      {back}

      <article className="jd-head">
        <div className="jd-head-main">
          <div className="jd-meta-line">
            <span>{job.company}</span>
            {job.recruitType === '추천채용' && <em>추천</em>}
          </div>
          {showHeading && <h1>{job.role}</h1>}
          {job.companyType && <p>{job.companyType}</p>}
        </div>
        <aside className="jd-status-card">
          <span className={`jd-status ${closed ? 'closed' : 'open'}`}>{closed ? '마감' : '접수중'}</span>
          <dl>
            <div>
              <dt>마감</dt>
              <dd>{jobDdayLabel(job)}</dd>
            </div>
          </dl>
          {action}
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
