import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobsByScope } from '../../../src_admin/data/jobsSource'
import type { JobScope } from '../../../src_admin/data/jobsSource'
import JobBoard from '../../components/JobBoard'
import './JobSupport.css'
import { usePageHead } from '../../components/PageCrumb'

/** scope 별 화면 문구 — 같은 목록 컴포넌트를 교내/외부 두 화면이 공유한다. */
const SCOPE_COPY: Record<JobScope, { eyebrow: string; title: string; emptyMain: string; emptyHint: string }> = {
  internal: {
    eyebrow: '학교가 직접 등록·검증한 실제 채용공고',
    title: '교내 채용공고',
    emptyMain: '등록된 교내 채용공고가 없습니다.',
    emptyHint: '상담사가 채용공고를 등록하면 이곳에 노출됩니다.',
  },
  external: {
    eyebrow: '외부 채용 API로 수집한 채용공고',
    title: '외부 채용공고',
    emptyMain: '수집된 외부 채용공고가 없습니다.',
    emptyHint: '외부 채용 API 연동 공고가 들어오면 이곳에 노출됩니다.',
  },
}

export default function JobSupport({ scope }: { scope: JobScope }) {
  usePageHead(SCOPE_COPY[scope].title, SCOPE_COPY[scope].eyebrow)
  const navigate = useNavigate()
  const copy = SCOPE_COPY[scope]

  // 단일소스: 서버(dc.job_posting). 교내=교직원 등록분 · 외부=수집분. 학생 화면은 같은 스토어를 읽는다.
  const all = useMemo(() => getJobsByScope(scope), [scope])

  return (
    <div className="job-page">
      {/* 목록 본문은 교직원 /admin/jobs 와 같은 컴포넌트다 — 화면이 갈리지 않는다. */}
      <JobBoard
        jobs={all}
        onOpen={job => navigate(`/jobs/${job.id}`)}
        showWish
        split={scope === 'internal'}
        emptyMain={copy.emptyMain}
        emptyHint={copy.emptyHint}
      />
    </div>
  )
}
