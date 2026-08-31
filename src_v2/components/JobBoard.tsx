import { useMemo, useState } from 'react'
import {
  jobDdayLabel, jobHighlights, isJobClosed, sortJobs, JOB_SORTS, JOB_SORT_LABEL,
} from '../../src_admin/data/jobsSource'
import type { JobPosting, JobSort, JobStatus } from '../../src_admin/data/jobsSource'
import { getJobWishlist, toggleJobWish } from '../data/jobWishlist'
import './JobBoard.css'

// ─────────────────────────────────────────────────────────────────────────
// 채용공고 보드 (공용) — 학생 /v2/jobs 와 교직원 /admin/jobs 가 같은 화면을 본다.
// 카드 디자인은 학생 화면(JobSupport)의 .jc-card 가 원안이고 여기로 옮겨왔다.
//
// 추천채용은 카드로 위에, 일반채용은 리스트로 아래에 (요구 11).
// 검색·상태·정렬 상태를 이 컴포넌트가 들고 있어 두 화면의 동작이 갈리지 않는다.
// 페이지 제목·등록 버튼 같은 화면 껍데기만 각 SPA 가 따로 그린다.
// ─────────────────────────────────────────────────────────────────────────

const ALL = '전체'
const STATUS_FILTERS: (JobStatus | typeof ALL)[] = [ALL, '게시', '마감']

interface JobBoardProps {
  /** scope 로 이미 고른 목록 (교내/외부) */
  jobs: JobPosting[]
  /** 카드·행 클릭 — 학생은 상세로, 교직원은 수정으로 간다.
   *  없으면 읽기 전용(외부 공고를 보는 교직원 화면)으로 그린다. */
  onOpen?: (job: JobPosting) => void
  /** 찜(별) 노출 — 학생 화면 전용 */
  showWish?: boolean
  /** 추천/일반 분리 — 교내 공고만. 외부 공고는 추천 구분이 없다. */
  split?: boolean
  /**
   * 카드 하단 보조 동작 (교직원 '수정') — 없으면 그리지 않는다.
   * 카드 자체가 button 이라 button 을 중첩할 수 없다 → 찜(별)과 같은 role="button" 으로 그리고
   * 클릭을 stopPropagation 해서 카드 열기(onOpen)와 겹치지 않게 한다.
   * 일반채용 '행'에는 붙이지 않는다 — 행은 열 폭이 고정된 표다.
   */
  cardAction?: { label: string; onClick: (job: JobPosting) => void }
  /** 지원자 수 — 교직원 화면만 넘긴다. 학생에게는 의미가 없어 안 넘기면 그리지 않는다. */
  applicantCountOf?: (job: JobPosting) => number
  emptyMain: string
  emptyHint: string
}

function regionLabel(job: JobPosting): string {
  const regions = (job.regions ?? []).filter(r => r !== ALL)
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

/** 등록일 — 목록의 '최신순'이 무엇 기준인지 보이게 한다. */
function postedLabel(job: JobPosting): string {
  const value = (job.postedAt ?? '').slice(0, 10)
  return value ? value.slice(5).replace('-', '.') : ''
}

function deadlineLabel(job: JobPosting): string {
  if (job.deadlineOnHire) return '채용시 마감'
  return job.deadline ? `~${job.deadline.slice(5).replace('-', '.')}` : '상시'
}

/** 카드 태그줄 — 근무형태 · 직종 + 특이사항(오늘마감·서류면제) */
function tagsOf(job: JobPosting): { label: string; kind: 'emp' | 'cat' | 'flag' | 'urgent' }[] {
  const employment = (job.employmentTypes ?? [])[0] ?? job.jobType
  const category = (job.jobCategories ?? [])[0]
  return [
    { label: employment, kind: 'emp' as const },
    ...(category ? [{ label: category, kind: 'cat' as const }] : []),
    ...jobHighlights(job).map(f => ({
      label: f,
      kind: (f === '오늘마감' ? 'urgent' : 'flag') as 'urgent' | 'flag',
    })),
  ]
}

export default function JobBoard({
  jobs, onOpen, showWish = false, split = true, cardAction, applicantCountOf, emptyMain, emptyHint,
}: JobBoardProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<JobStatus | typeof ALL>(ALL)
  const [sort, setSort] = useState<JobSort>('latest')
  // 관심공고는 상세 화면과 같은 저장소를 본다 — 예전엔 화면 안에서만 살아 새로고침하면 풀렸다.
  const [wished, setWished] = useState<Set<string>>(() => new Set(getJobWishlist()))

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = jobs.filter(job => {
      if (status !== ALL && job.status !== status) return false
      if (q) {
        const hay = `${job.company} ${job.role} ${job.tags.join(' ')} ${job.location}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return sortJobs(filtered, sort)
  }, [jobs, query, status, sort])

  const recommended = split ? list.filter(j => j.recruitType === '추천채용') : []
  const general = split ? list.filter(j => j.recruitType !== '추천채용') : list

  const toggleWish = (id: string) => setWished(new Set(toggleJobWish(id)))

  // 클릭 대상이 없으면 button 이 아니라 정적 블록으로 그린다 — 눌러도 되는 것처럼 보이지 않게.
  const Tag = onOpen ? 'button' : 'div'
  const openProps = (job: JobPosting) =>
    onOpen ? { type: 'button' as const, onClick: () => onOpen(job) } : {}

  const card = (job: JobPosting) => {
    const dday = jobDdayLabel(job)
    const closed = isJobClosed(job)
    const on = wished.has(job.id)
    return (
      <Tag
        key={job.id}
        {...openProps(job)}
        className={`jc-card${closed ? ' is-closed' : ''}${onOpen ? '' : ' is-static'}`}
      >
        <div className="jc-top">
          <span className="jc-company">{job.company}</span>
          {job.companyType && <span className="jc-companytype">{job.companyType}</span>}
          {job.recruitType === '추천채용' && <span className="jc-badge-rec">추천</span>}
          {/* 마감까지 며칠인가 — 이 카드에서 가장 결정적인 값이라 눈에 먼저 걸리게 위로 올린다. */}
          <span className={`jc-dday${closed ? ' is-closed' : ''}`}>{dday}</span>
          {showWish && (
            <span
              role="button"
              tabIndex={0}
              className={`jc-star${on ? ' is-on' : ''}`}
              aria-label={on ? '찜 해제' : '찜하기'}
              onClick={e => { e.stopPropagation(); toggleWish(job.id) }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault(); e.stopPropagation(); toggleWish(job.id)
                }
              }}
            >
              <i className={on ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
            </span>
          )}
        </div>

        <h3 className="jc-title">{job.role}</h3>

        <div className="jc-tags">
          {tagsOf(job).map(t => (
            <span key={t.label} className={`jc-tag jc-tag-${t.kind}`}>{t.label}</span>
          ))}
        </div>

        <div className="jc-meta">
          <span><i className="fa-solid fa-location-dot" /> {regionLabel(job)}</span>
          <span><i className="fa-solid fa-briefcase" /> {careerLabel(job)}</span>
          <span><i className="fa-solid fa-won-sign" /> {salaryLabel(job)}</span>
        </div>

        {/* 매칭도는 계산된 값이 있을 때만 — 0% 를 모든 카드에 찍으면 정보가 아니라 잡음이다. */}
        {job.match > 0 && (
          <div className="jc-match" title={`내 스펙 기준 적합도 ${job.match}%`}>
            <span className="jc-match-track"><i style={{ width: `${job.match}%` }} /></span>
            <b>{job.match}%</b>
          </div>
        )}

        <div className="jc-foot">
          <span className="jc-foot-dates">
            <span>마감 {deadlineLabel(job)}</span>
            {postedLabel(job) && <span>등록 {postedLabel(job)}</span>}
          </span>
          {applicantCountOf && (
            <span className="jc-applicants"><i className="fa-solid fa-user-group" /> 지원 {applicantCountOf(job)}명</span>
          )}
        </div>

        {cardAction && (
          <span
            role="button"
            tabIndex={0}
            className="jc-card-action"
            onClick={e => { e.stopPropagation(); cardAction.onClick(job) }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); e.stopPropagation(); cardAction.onClick(job)
              }
            }}
          >
            {cardAction.label}
          </span>
        )}
      </Tag>
    )
  }

  const row = (job: JobPosting) => {
    const dday = jobDdayLabel(job)
    const closed = isJobClosed(job)
    return (
      <Tag
        key={job.id}
        {...openProps(job)}
        className={`jb-row${closed ? ' is-closed' : ''}${onOpen ? '' : ' is-static'}`}
      >
        <span className="jb-row-company">{job.company}</span>
        <span className="jb-row-title">
          <strong>{job.role}</strong>
          <span className="jc-tags">
            {tagsOf(job).map(t => (
              <span key={t.label} className={`jc-tag jc-tag-${t.kind}`}>{t.label}</span>
            ))}
          </span>
        </span>
        <span className="jb-row-meta">
          <i className="fa-solid fa-location-dot" /> {regionLabel(job)} · {careerLabel(job)}
        </span>
        <span className="jb-row-salary">{salaryLabel(job)}</span>
        <span className={`jc-dday${closed ? ' is-closed' : ''}`}>{dday}</span>
        <time>{deadlineLabel(job)}</time>
      </Tag>
    )
  }

  return (
    <div className="jb">
      <section className="jb-toolbar" aria-label="채용공고 검색">
        <div className="jb-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            placeholder="기업명, 공고명으로 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="기업명, 공고명으로 검색"
          />
        </div>
        <label className="jb-select">
          <span>상태</span>
          <select value={status} onChange={e => setStatus(e.target.value as JobStatus | typeof ALL)}>
            {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="jb-select">
          <span>정렬</span>
          <select value={sort} onChange={e => setSort(e.target.value as JobSort)}>
            {JOB_SORTS.map(s => <option key={s} value={s}>{JOB_SORT_LABEL[s]}</option>)}
          </select>
        </label>
        <div className="jb-count">총 <strong>{list.length}</strong>건</div>
      </section>

      {list.length === 0 ? (
        <div className="jb-empty">
          <i className="fa-regular fa-folder-open" />
          <p>{jobs.length === 0 ? emptyMain : '검색 결과가 없어요.'}</p>
          <span>{jobs.length === 0 ? emptyHint : '다른 기업명이나 공고명으로 검색해보세요.'}</span>
        </div>
      ) : (
        <>
          {recommended.length > 0 && (
            <>
              <h2 className="jb-section"><i className="fa-solid fa-star" /> 추천채용 <em>{recommended.length}</em></h2>
              <section className="jc-grid" aria-label="추천채용">{recommended.map(card)}</section>
            </>
          )}
          {general.length > 0 && (
            <>
              {split && (
                <h2 className="jb-section"><i className="fa-solid fa-list-ul" /> 일반채용 <em>{general.length}</em></h2>
              )}
              {split ? (
                <section className="jb-list" aria-label="일반채용">{general.map(row)}</section>
              ) : (
                <section className="jc-grid" aria-label="채용공고 목록">{general.map(card)}</section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
