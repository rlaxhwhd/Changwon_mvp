import { useMemo, useState } from 'react'
import {
  jobDdayLabel, jobHighlights, isJobClosed, sortJobs, JOB_SORTS, JOB_SORT_LABEL,
} from '../../src_admin/data/jobsSource'
import type { JobPosting, JobSort } from '../../src_admin/data/jobsSource'
import { JOB_CODE_GROUPS, jobLabelOf, jobLabelsOf } from '../../src_admin/data/schema/job'
import type { JobEffectiveStatus } from '../../src_admin/data/schema/job'
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
// 상태는 코드로 거르고 라벨로 보인다(CLAUDE.md 규칙 4). 판정은 서버의 effectiveStatus 다.
const STATUS_FILTERS: (JobEffectiveStatus | typeof ALL)[] = [ALL, 'POSTED', 'CLOSED']
const STATUS_FILTER_LABEL: Record<string, string> = { [ALL]: '전체', POSTED: '게시', CLOSED: '마감' }

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
  const regions = jobLabelsOf(JOB_CODE_GROUPS.region, job.regions)
  if (regions.length) return regions.join(', ')
  return job.location || '전국'
}

function careerLabel(job: JobPosting): string {
  const careers = jobLabelsOf(JOB_CODE_GROUPS.careerType, job.careerTypes)
  return careers.length ? careers.join('·') : jobLabelOf(JOB_CODE_GROUPS.careerType, job.jobType)
}

/** 직무(직종) — 표의 한 열이라 여러 개여도 첫 값만 쓴다. */
function jobCategoryLabel(job: JobPosting): string {
  return jobLabelsOf(JOB_CODE_GROUPS.category, job.jobCategories)[0] ?? '-'
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
  const [status, setStatus] = useState<JobEffectiveStatus | typeof ALL>(ALL)
  const [sort, setSort] = useState<JobSort>('latest')
  // 관심공고는 상세 화면과 같은 저장소를 본다 — 예전엔 화면 안에서만 살아 새로고침하면 풀렸다.
  const [wished, setWished] = useState<Set<string>>(() => new Set(getJobWishlist()))

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = jobs.filter(job => {
      if (status !== ALL && job.effectiveStatus !== status) return false
      if (q) {
        const hay = `${job.company} ${job.role} ${job.tags.join(' ')} ${job.location}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return sortJobs(filtered, sort)
  }, [jobs, query, status, sort])

  const recommended = split ? list.filter(j => j.recruitType === 'RECOMMENDATION') : []
  const general = split ? list.filter(j => j.recruitType !== 'RECOMMENDATION') : list

  // 찜은 서버가 정본이다 — 저장이 실패하면 별을 켜 두지 않는다.
  const toggleWish = (id: string) => {
    void toggleJobWish(id).then(next => setWished(new Set(next))).catch(() => { /* 서버 상태 유지 */ })
  }

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
        {/* 머리 — 로고 한 칸 + 그 오른쪽에 회사명·제목·태그를 쌓는다.
            로고가 없으면(일반공고) 오른쪽 칸이 카드 폭을 그대로 쓴다. */}
        <div className="jc-head">
          {/* 기업 로고 — 추천채용만 등록한다(등록 화면도 이때만 묻는다). */}
          {job.recruitType === 'RECOMMENDATION' && job.logo && (
            <span className="jc-logo"><img src={job.logo} alt={`${job.company} 로고`} /></span>
          )}

          <div className="jc-headmain">
            <div className="jc-top">
              <span className="jc-company">{job.company}</span>
              {job.recruitType === 'RECOMMENDATION' && <span className="jc-badge-rec">추천</span>}
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

            {/* 기업구분은 회사명 줄에서 여기로 내려왔다 — 로고가 들어온 만큼 그 줄이 좁아져
                회사명이 여섯 글자쯤에서 잘렸다. 지역도 아래 메타줄에서 올라왔다.
                둘 다 자리만 옮긴 것이고, 같은 값을 두 번 쓰지 않는다. */}
            <div className="jc-tags">
              {job.companyType && (
                <span className="jc-companytype">{jobLabelOf(JOB_CODE_GROUPS.companyType, job.companyType)}</span>
              )}
              {tagsOf(job).map(t => (
                <span key={t.label} className={`jc-tag jc-tag-${t.kind}`}>{t.label}</span>
              ))}
              <span className="jc-tag">{regionLabel(job)}</span>
            </div>
          </div>
        </div>

        <div className="jc-meta">
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

  // no = 화면에 보이는 순번(1부터). 검색·정렬로 목록이 바뀌면 같이 다시 매겨진다 —
  // 공고를 가리키는 식별자가 아니라 "지금 목록의 몇 번째"를 읽기 위한 값이다.
  const row = (job: JobPosting, no: number) => {
    const dday = jobDdayLabel(job)
    const closed = isJobClosed(job)
    return (
      <Tag
        key={job.id}
        {...openProps(job)}
        className={`jb-row${closed ? ' is-closed' : ''}${onOpen ? '' : ' is-static'}`}
      >
        <span className="jb-row-no">{no}</span>
        <span className="jb-row-company">{job.company}</span>
        <span className="jb-row-title">
          <strong>{job.role}</strong>
          <span className="jc-tags">
            {/* 직종은 아래 '직무' 열로 나갔다 — 여기 남기면 같은 값이 두 번 나온다. */}
            {tagsOf(job).filter(t => t.kind !== 'cat').map(t => (
              <span key={t.label} className={`jc-tag jc-tag-${t.kind}`}>{t.label}</span>
            ))}
          </span>
        </span>
        <span className="jb-row-job">{jobCategoryLabel(job)}</span>
        <span className="jb-row-region">{regionLabel(job)}</span>
        <span className="jb-row-salary">{salaryLabel(job)}</span>
        <span className="jb-row-deadline">
          <b className={`jc-dday${closed ? ' is-closed' : ''}`}>{dday}</b>
          <time>{deadlineLabel(job)}</time>
        </span>
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
          <select value={status} onChange={e => setStatus(e.target.value as JobEffectiveStatus | typeof ALL)}>
            {STATUS_FILTERS.map(s => <option key={s} value={s}>{STATUS_FILTER_LABEL[s] ?? s}</option>)}
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
                <section className="jb-list" aria-label="일반채용">
                  {/* 열 이름 — 행이 표 모양인데 머리글이 없으면 각 칸이 무슨 값인지 읽히지 않는다.
                      열 폭은 .jb-list 의 --jb-cols 하나로 머리글·행이 같이 쓴다. */}
                  <div className="jb-head">
                    <span>번호</span>
                    <span>회사명</span>
                    <span>공고제목</span>
                    <span>직무</span>
                    <span>지역</span>
                    <span>연봉</span>
                    <span>마감기한</span>
                  </div>
                  {general.map((job, i) => row(job, i + 1))}
                </section>
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
