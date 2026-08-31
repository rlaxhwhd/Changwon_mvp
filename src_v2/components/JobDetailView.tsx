import { useState } from 'react'
import type { ReactNode } from 'react'
import { isJobClosed, jobDdayLabel, jobHighlights } from '../../src_admin/data/jobsSource'
import type { JobPosting } from '../../src_admin/data/jobsSource'
import { isJobWished, toggleJobWish } from '../data/jobWishlist'
import './JobDetailView.css'

// ─────────────────────────────────────────────────────────────────────────
// 채용공고 상세 (공용) — 학생 /v2/jobs/:id 와 교직원 /admin/jobs/:id 가 같이 쓴다.
// 공고를 그리는 곳은 여기 하나다 — 두 포털의 상세가 갈리지 않는다.
//
// 레이아웃은 시안 public_t/job.png 의 구조를 따른다:
//   짙은 히어로 배너 → A/B/C 섹션(키-값 표) → 우측 요약 카드 + CTA → 하단 안내바.
// 색은 시안이 파랑이지만 DESIGN.md 가 보라로 잠겨 있어 구조·밀도만 가져왔다.
//
// 값이 없는 항목은 줄을 만들지 않는다 — 빈 칸을 남기면 성겨 보이고 '-' 는 잡음이다.
// 데이터에 없는 것(회사 로고·포스터)은 지어내지 않는다. 로고 자리는 회사명 이니셜이다.
//
// 포털마다 다른 것만 슬롯으로 받는다:
//   back / action(학생=지원하기, 교직원=공고 수정) / showHeading
// ─────────────────────────────────────────────────────────────────────────

interface JobDetailViewProps {
  job: JobPosting
  back?: ReactNode
  action?: ReactNode
  showHeading?: boolean
  /** 「관심공고 저장」 노출 — 학생 전용. JobBoard 의 찜(별)과 같은 규약이라 기본은 끔. */
  showWish?: boolean
}

interface Row { label: string; value: string; chip?: boolean }

function join(values: string[] | undefined): string {
  return (values ?? []).filter(Boolean).join(', ')
}

function salaryOf(job: JobPosting): string {
  if (job.salaryNegotiable) return '회사내규 및 협의'
  const raw = (job.salary ?? '').trim()
  if (!raw) return '회사내규'
  return /^[\d,]+$/.test(raw) ? `${raw}만원` : raw
}

function deadlineOf(job: JobPosting): string {
  if (job.deadlineOnHire) return '채용시 마감'
  return job.deadline || '상시 모집'
}

function regionOf(job: JobPosting): string {
  return join((job.regions ?? []).filter(r => r !== '전체')) || job.location || '전국'
}

/** 값이 있는 줄만 남긴다. */
function rows(list: (Row | false | null | undefined)[]): Row[] {
  return list.filter((r): r is Row => !!r && r.value.trim().length > 0)
}

export default function JobDetailView({ job, back, action, showHeading = true, showWish = false }: JobDetailViewProps) {
  // 마감 판정은 데이터층 한 곳에서 — 목록 카드와 같은 답을 낸다.
  const closed = isJobClosed(job)
  const dday = jobDdayLabel(job)
  const [wished, setWished] = useState(() => isJobWished(job.id))

  const chips = [
    ...(job.employmentTypes ?? [job.jobType]).filter(Boolean),
    ...(job.jobCategories ?? []),
    ...(job.careerTypes ?? []),
    ...(job.regions ?? []).filter(r => r !== '전체'),
  ]

  // A. 기업 일반정보
  const companyRows = rows([
    { label: '채용유형', value: job.recruitType ?? '일반공고' },
    { label: '회사명', value: job.company },
    { label: '기업구분', value: job.companyType ?? '' },
    { label: '공고 출처', value: job.source === 'external' ? '외부 연동' : '교내 등록' },
    { label: 'URL', value: job.applyUrl ?? '' },
    { label: 'Email', value: job.email ?? '' },
  ])

  // B. 모집 내용
  const postingRows = rows([
    { label: '모집제목', value: job.role },
    { label: '근무형태', value: join(job.employmentTypes) || job.jobType, chip: true },
    { label: '직종', value: join(job.jobCategories) },
    { label: '경력', value: join(job.careerTypes) || job.jobType, chip: true },
    { label: '성별', value: join(job.genders) },
    { label: '지역', value: regionOf(job), chip: true },
    { label: '지원마감일', value: deadlineOf(job) },
    { label: '연봉', value: salaryOf(job) },
  ])

  // 우측 요약 — 지원 판단에 필요한 것만 추린다(본문 표의 축약본).
  const summaryRows = rows([
    { label: '회사명', value: job.company },
    { label: '모집제목', value: job.role },
    { label: '근무형태', value: join(job.employmentTypes) || job.jobType },
    { label: '직종', value: join(job.jobCategories) },
    { label: '지역', value: regionOf(job) },
    { label: '마감일', value: deadlineOf(job) },
  ])

  const stages = [...(job.stages ?? [])].sort((a, b) => a.order - b.order)
  const attachments = job.attachments ?? []

  return (
    <div className="jd-page">
      <div className="jd-topbar">
        {back}
        <span className={`jd-recruit-tag${job.recruitType === '추천채용' ? ' is-rec' : ''}`}>
          {job.recruitType ?? '일반공고'}
        </span>
      </div>

      {/* ── 본문 2열 ── */}
      <div className="jd-body">
        <main className="jd-main">
        {/* ── 히어로 배너 ── */}
        <header className={`jd-hero${closed ? ' is-closed' : ''}`}>
          {/* 로고는 추천채용 등록 화면에서만 올린다 — 없으면 회사명 이니셜로 자리를 만든다(목록 카드와 같은 규약). */}
          <span className={`jd-logo${job.logo ? ' has-img' : ''}`} aria-hidden="true">
            {job.logo ? <img src={job.logo} alt="" /> : job.company.slice(0, 2)}
          </span>

          <div className="jd-hero-main">
            <p className="jd-hero-company">{job.company}</p>
            {showHeading && <h1 className="jd-hero-title">{job.role}</h1>}
            <p className="jd-hero-desc">
              {closed ? '마감된 공고입니다. 내용은 열람할 수 있습니다.' : '공고 내용을 확인하고 지원을 준비하세요.'}
            </p>
            {chips.length > 0 && (
              <ul className="jd-hero-chips">
                {job.recruitType === '추천채용' && <li className="jd-hero-chip is-rec">추천채용</li>}
                {job.companyType && <li className="jd-hero-chip">{job.companyType}</li>}
                {chips.map(c => <li key={c} className="jd-hero-chip">{c}</li>)}
                {jobHighlights(job).map(h => (
                  <li key={h} className={`jd-hero-chip${h === '오늘마감' ? ' is-urgent' : ''}`}>{h}</li>
                ))}
              </ul>
            )}
          </div>

          <dl className="jd-hero-stats">
            <div>
              <dt><Icon name="calendar" />지원마감일</dt>
              <dd>{deadlineOf(job)}<em>{closed ? '마감' : dday}</em></dd>
            </div>
            <div>
              <dt><Icon name="briefcase" />근무형태</dt>
              <dd>{join(job.employmentTypes) || job.jobType}</dd>
            </div>
            <div>
              <dt><Icon name="won" />연봉</dt>
              <dd>{salaryOf(job)}</dd>
            </div>
          </dl>
        </header>

          <Section letter="A" title="기업 일반정보"><KvTable rows={companyRows} /></Section>
          <Section letter="B" title="모집 내용"><KvTable rows={postingRows} /></Section>

          <Section letter="C" title="모집요강">
            {job.content
              ? <div className="jd-content" dangerouslySetInnerHTML={{ __html: job.content }} />
              : <p className="jd-empty">등록된 모집요강이 없습니다.</p>}
          </Section>

          {/* 전형 단계는 상담사가 정의한 공고만 — 없는 절차를 기본값으로 지어내지 않는다. */}
          {stages.length > 0 && (
            <Section letter="D" title="전형 절차">
              <ol className="jd-stages">
                {stages.map((stage, index) => (
                  <li key={stage.id}>
                    <span className="jd-stage-no">{index + 1}</span>
                    <span className="jd-stage-name">{stage.name}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </main>

        <aside className="jd-side">
          <section className="jd-sec jd-summary">
            <h2 className="jd-sec-head"><span>지원 정보 요약</span></h2>
            <dl className="jd-kv is-stack">
              {summaryRows.map(r => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>

            <div className="jd-cta">
              {showWish && (
                <button
                  type="button"
                  className={`jd-wish${wished ? ' is-on' : ''}`}
                  aria-pressed={wished}
                  onClick={() => setWished(toggleJobWish(job.id).includes(job.id))}
                >
                  <Icon name={wished ? 'heart-fill' : 'heart'} />
                  {wished ? '관심공고 저장됨' : '관심공고 저장'}
                </button>
              )}
              {action}
            </div>
          </section>

          {attachments.length > 0 && (
            <section className="jd-sec">
              <h2 className="jd-sec-head"><span>첨부파일</span></h2>
              <ul className="jd-files">
                {attachments.map(name => <li key={name}>{name}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <p className="jd-note">
        <Icon name="info" />
        상세 공고 내용은 등록된 정보를 기준으로 제공됩니다.
      </p>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function Section({ letter, title, children }: { letter: string; title: string; children: ReactNode }) {
  return (
    <section className="jd-sec">
      <h2 className="jd-sec-head"><em>{letter}</em><span>{title}</span></h2>
      {children}
    </section>
  )
}

/** 골든 컴포넌트 — A·B 섹션과 요약 카드가 전부 이 표 하나를 쓴다. */
function KvTable({ rows: list }: { rows: Row[] }) {
  return (
    <dl className="jd-kv">
      {list.map(r => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.chip ? <span className="jd-kv-chip">{r.value}</span> : r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// 아이콘은 인라인 SVG — 두 SPA 의 아이콘 스택이 달라(FA vs react-icons) 어느 쪽에도 기대지 않는다.
// 이모지는 쓰지 않는다.
const ICONS: Record<string, ReactNode> = {
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 2.5V6M16 2.5V6M3.5 10h17" /></>,
  briefcase: <><rect x="3" y="7.5" width="18" height="12.5" rx="2.5" /><path d="M8.5 7.5V5.5a2 2 0 012-2h3a2 2 0 012 2v2" /></>,
  won: <><circle cx="12" cy="12" r="9" /><path d="M7.5 9.5l2 5 2.5-5 2.5 5 2-5M7 12.5h10" /></>,
  heart: <path d="M12 20.3l-1.4-1.3C5.9 14.8 3 12.2 3 8.9 3 6.4 5 4.5 7.5 4.5c1.5 0 2.9.7 3.7 1.8l.8 1 .8-1c.8-1.1 2.2-1.8 3.7-1.8C19 4.5 21 6.4 21 8.9c0 3.3-2.9 5.9-7.6 10.1z" />,
  'heart-fill': <path d="M12 20.3l-1.4-1.3C5.9 14.8 3 12.2 3 8.9 3 6.4 5 4.5 7.5 4.5c1.5 0 2.9.7 3.7 1.8l.8 1 .8-1c.8-1.1 2.2-1.8 3.7-1.8C19 4.5 21 6.4 21 8.9c0 3.3-2.9 5.9-7.6 10.1z" fill="currentColor" stroke="none" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16.5v-5M12 8h.01" /></>,
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg className="jd-icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>
}
