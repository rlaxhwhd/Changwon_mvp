import { LuInfo, LuPlus } from 'react-icons/lu'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getJobsByScope, countJobs } from '../data/jobsSource'
import type { JobScope } from '../data/jobsSource'
import JobBoard from '../../src_v2/components/JobBoard'

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

export default function JobList({ scope }: { scope: JobScope }) {
  const navigate = useNavigate()
  const copy = SCOPE_COPY[scope]
  const all = useMemo(() => getJobsByScope(scope), [scope])
  const counts = useMemo(() => countJobs(scope), [scope])

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

      {/* 목록 본문은 학생 /v2/jobs 와 같은 컴포넌트다 — 카드 디자인이 갈리지 않는다.
          찜(별)은 학생 전용이라 여기선 끈다.
          카드 클릭 = '보기'(학생 화면에 어떻게 나가는지 확인), 카드 하단 '수정' = 편집 화면.
          외부 공고는 원본이 외부에 있어 수정 버튼을 주지 않는다.
          「교내공고 관리」(/jobs/manage)는 그대로 둔다 — 일반채용 행까지 한 번에 다루는 자리다. */}
      <JobBoard
        jobs={all}
        onOpen={job => navigate(`/jobs/${job.id}`)}
        cardAction={scope === 'internal'
          ? { label: '수정', onClick: job => navigate(`/jobs/${job.id}/edit`) }
          : undefined}
        split={scope === 'internal'}
        emptyMain={copy.emptyTitle}
        emptyHint={copy.emptyMessage}
      />
    </div>
  )
}
