import { LuArrowLeft, LuPencil } from 'react-icons/lu'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getJobById } from '../data/jobsSource'
import JobDetailView from '../../src_v2/components/JobDetailView'
import { usePageCrumbLeaf } from '../components/PageCrumb'

// ─────────────────────────────────────────────────────────────────────────
// 공고 보기 (교직원) — 등록한 공고가 학생 화면에 어떻게 나가는지 그대로 본다.
// 본문은 학생 /v2/jobs/:id 와 같은 JobDetailView 다 — 미리보기가 실제와 갈리면 의미가 없다.
// 수정은 여기서 하지 않는다. 「교내공고 관리」(/jobs/manage)가 관리 화면이다.
//
// .admin-page 로 감싸야 한다 — 좌우 여백·최대폭(1440)이 거기서 나온다.
// 학생 쪽은 .v2-main 이 같은 역할을 하고, JobDetailView 자신은 여백을 갖지 않는다.
// ─────────────────────────────────────────────────────────────────────────
export default function JobView() {
  const { id } = useParams()
  const job = id ? getJobById(id) : undefined
  usePageCrumbLeaf(job?.role)

  if (!job) return <Navigate to="/jobs" replace />

  // 외부 공고는 원본이 API라 수정할 수 없다 — 되돌아갈 목록도 다르다.
  const external = job.source === 'external'
  const listPath = external ? '/jobs/external' : '/jobs'

  return (
    <div className="admin-page">
      <JobDetailView
        job={job}
        back={(
          <Link to={listPath} className="jd-back">
            <LuArrowLeft />
            {external ? '외부 채용공고 목록' : '교내 채용공고 목록'}
          </Link>
        )}
        action={!external && (
          <Link to={`/jobs/${job.id}/edit`} className="jd-apply-btn">
            <LuPencil /> 공고 수정
          </Link>
        )}
      />
    </div>
  )
}
