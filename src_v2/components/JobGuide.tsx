import type { ReactNode } from 'react'
import {
  JOB_CODE_GROUPS, RECRUIT_TYPE_LABEL, jobLabelsOf,
} from '../../src_admin/data/schema/job'
import type { DeadlineMode, JobGuideFields, JobGuideTemplate, RecruitType } from '../../src_admin/data/schema/job'
import './JobGuide.css'

// ─────────────────────────────────────────────────────────────────────────
// 채용공고 모집요강 템플릿 (공용) — 학생 상세와 교직원 등록 폼 미리보기가 같이 쓴다.
// 상담사는 입력칸에 값만 넣고, 디자인은 여기 한 곳이 그린다(2026-11-19 사용자 요청).
//
// 회사명·제목·연봉·근무지·근무형태·마감은 공고 본 필드에서 읽는다(guideFields 에 다시 담지 않는다).
// 값은 전부 React 텍스트로 넣는다 — HTML 을 주입하지 않는다.
// 빈 값은 줄·칸을 만들지 않는다.
//
// 색은 템플릿 스코프(.jg-*) 안에 고정한다 — DESIGN.md 밖 팔레트를 쓰는 것은 사용자 요청에 따른
// 의도된 divergence 다(programs/new 의 .pf 와 같은 격리 방식). 폰트는 앱 폰트(Pretendard)를 따른다.
// ─────────────────────────────────────────────────────────────────────────

/** 템플릿이 공고 본 필드에서 읽는 값 — JobPosting 과 등록 폼 초안 둘 다 이 모양으로 넘긴다. */
export interface JobGuideSource {
  company: string
  role: string
  recruitType: RecruitType
  salary: string
  salaryNegotiable: boolean
  location: string
  employmentTypes: string[]
  /** 직종 코드 (JOB_CATEGORY) — 포스터형 모집분야의 윗줄 */
  jobCategories: string[]
  /** 경력 구분 코드 (JOB_CAREER_TYPE) — 근무형태 옆에 붙인다 */
  careerTypes: string[]
  deadline: string | null
  deadlineTime: string
  deadlineMode: DeadlineMode
}

interface Props {
  template: JobGuideTemplate
  fields: Partial<JobGuideFields> | null
  source: JobGuideSource
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface Deadline { full: string; short: string; sub: string }

function deadlineOf(s: JobGuideSource): Deadline {
  if (s.deadlineMode === 'ALWAYS' || !s.deadline) return { full: '상시 모집', short: '상시', sub: '상시 모집' }
  const [y, m, d] = s.deadline.slice(0, 10).split('-')
  const day = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()] ?? ''
  const time = s.deadlineTime || '23:59'
  const onHire = s.deadlineMode === 'ON_HIRE' ? ' · 채용시 마감' : ''
  return {
    full: `${y}.${m}.${d} (${day}) ${time}까지`,
    short: `${m}.${d}`,
    sub: `${day}요일 ${time}까지${onHire}`,
  }
}

function salaryOf(s: JobGuideSource): string {
  if (s.salaryNegotiable) return '회사내규 및 협의'
  const raw = s.salary.trim()
  if (!raw) return ''
  return /^[\d,]+$/.test(raw) ? `${raw}만원` : raw
}

/** 큰 숫자 카드용 — '4,000만원' 은 숫자와 단위를 나눠 그린다. 숫자가 아니면 통째로. */
function salaryParts(s: JobGuideSource): { num: string; unit: string } | null {
  if (s.salaryNegotiable) return { num: '협의', unit: '' }
  const raw = s.salary.trim()
  if (!raw) return null
  if (/^[\d,]+$/.test(raw)) return { num: raw, unit: '만원' }
  const m = raw.match(/([\d,]+)\s*(만\s*원|만원|원)/)
  return m ? { num: m[1], unit: m[2].replace(/\s/g, '') } : { num: raw, unit: '' }
}

function lines(text: string | undefined): string[] {
  return (text ?? '').split('\n').map(t => t.trim()).filter(Boolean)
}

function has(text: string | false | null | undefined): text is string {
  return !!text && text.trim().length > 0
}

/** 한 줄 소개 안의 강조 단어를 색으로 — 단어가 없으면 그대로. */
function withEmphasis(text: string, word: string | undefined): ReactNode {
  if (!word || !text.includes(word)) return text
  const at = text.indexOf(word)
  return <>{text.slice(0, at)}<em>{word}</em>{text.slice(at + word.length)}</>
}

/**
 * 외부 지원 링크의 href — 서버와 같은 규칙(jobs.normalize_link)으로 다시 거른다.
 * 저장 전 미리보기에는 www.… 그대로 들어오므로 https:// 를 붙이고, http·https 가 아닌 스킴은 링크로 만들지 않는다.
 */
function linkHref(raw: string | undefined): string | null {
  const url = (raw ?? '').trim()
  if (!url || /\s/.test(url)) return null
  if (/^https?:\/\//i.test(url)) return url
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(url)) return null
  return `https://${url}`
}

type Doc = JobGuideFields['documents'][number]
interface ApplyLink { key: string; label: string; href: string }

interface Ctx {
  f: Partial<JobGuideFields>
  s: JobGuideSource
  deadline: Deadline
  salary: string
  employment: string
  workplace: string
  docs: Doc[]
  steps: string[]
  links: ApplyLink[]
}

export default function JobGuide({ template, fields, source }: Props) {
  const f = fields ?? {}
  const ctx: Ctx = {
    f,
    s: source,
    deadline: deadlineOf(source),
    salary: salaryOf(source),
    // 근무형태 옆에 경력 구분 — 「정규직 · 신입」(2026-11-20 사용자 요청)
    employment: [
      jobLabelsOf(JOB_CODE_GROUPS.employmentType, source.employmentTypes).join(', '),
      jobLabelsOf(JOB_CODE_GROUPS.careerType, source.careerTypes).join(', '),
    ].filter(has).join(' · '),
    workplace: has(f.address) ? f.address : source.location,
    docs: (f.documents ?? []).filter(d => has(d.name)),
    steps: (f.steps ?? []).filter(st => has(st)),
    links: ([
      ['portal', '취업포털 공고 바로가기', f.portalUrl],
      ['homepage', '자사 홈페이지 공고 바로가기', f.homepageUrl],
    ] as const).flatMap(([key, label, raw]) => {
      const href = linkHref(raw)
      return href ? [{ key, label, href }] : []
    }),
  }
  if (template === 'POSTER') return <Poster {...ctx} />
  if (template === 'HIGHLIGHT') return <Highlight {...ctx} />
  return <DocumentGuide {...ctx} />
}

function employmentLine(c: Ctx): string {
  return [c.employment, c.f.employmentNote].filter(has).join(' · ')
}

function docNote(d: Doc): string {
  return [d.note, d.optional ? '해당자' : ''].filter(Boolean).join(' · ')
}

/** 외부 지원 링크 — 새 탭으로 연다. 공고 화면(학생 상세·등록 미리보기)을 떠나지 않게 한다. */
function ApplyLinks({ links }: { links: ApplyLink[] }) {
  if (links.length === 0) return null
  return (
    <div className="jg-links">
      {links.map(l => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer">
          {l.label}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" /></svg>
        </a>
      ))}
    </div>
  )
}

// ── 1. 포스터형 ──────────────────────────────────────────────────────────

const POSTER_ICONS: Record<string, ReactNode> = {
  role: <><rect x="5" y="10" width="22" height="16" rx="2" /><path d="M12 10V7h8v3M5 16h22" /></>,
  person: <><circle cx="16" cy="11" r="5" /><path d="M7 27c1-5 4.5-8 9-8s8 3 9 8" /></>,
  clock: <><circle cx="16" cy="16" r="11" /><path d="M16 10v6l4 3" /></>,
  calendar: <><rect x="5" y="7" width="22" height="20" rx="2" /><path d="M5 13h22M11 4v6M21 4v6" /></>,
}

function List({ items }: { items: string[] }) {
  return <ul>{items.map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}</ul>
}

/** 모집분야 — 직종을 윗줄에, 담당업무를 그 아래 「- 데이터 엔지니어」 하위 줄로(2026-11-20 사용자 요청). */
function RoleList({ categories, duties }: { categories: string[]; duties: string[] }) {
  return (
    <ul className="jg-p-role">
      {categories.map((t, i) => <li key={`c${i}-${t}`}>{t}</li>)}
      {duties.map((t, i) => <li key={`d${i}-${t}`} className="is-sub">- {t}</li>)}
    </ul>
  )
}

function Poster(c: Ctx) {
  const { f, s } = c
  // 공고 제목은 위 한 줄 소개 아래에 이미 있다 — 직종·담당업무가 둘 다 없을 때만 제목을 쓴다.
  const categories = jobLabelsOf(JOB_CODE_GROUPS.category, s.jobCategories)
  const duties = lines(f.duty)
  const role = categories.length || duties.length
    ? <RoleList categories={categories} duties={duties} />
    : <List items={[s.role]} />
  const qual = lines(f.qualification)
  const preferred = lines(f.preferred)
  // 근무지 상세(도로명 주소)는 아래 근무 정보 칸에 따로 나온다 — 근무조건에는 지역만 둔다.
  const work = [f.workHours, c.salary, s.location].filter(has)
  const detail = ([['근로자 수', f.headcount], ['근무부서', f.department], ['근무지 상세', f.address]] as [string, string | undefined][])
    .filter((r): r is [string, string] => has(r[1]))
  // 지원자격 카드 — 위는 자격요건, 아래 절반은 우대사항(아이콘 없이 작은 제목만).
  const person = (
    <>
      {qual.length > 0 && <List items={qual} />}
      {preferred.length > 0 && (
        <div className="jg-p-pref">
          <h5>우대사항</h5>
          <List items={preferred} />
        </div>
      )}
    </>
  )
  const cols: { key: string; title: string; body: ReactNode }[] = [
    { key: 'role', title: '모집분야', body: role },
    ...(qual.length || preferred.length ? [{ key: 'person', title: '지원자격', body: person }] : []),
    ...(work.length ? [{ key: 'clock', title: '근무조건', body: <List items={work} /> }] : []),
    { key: 'calendar', title: '접수기간', body: <p className="jg-p-date">~ {c.deadline.full}</p> },
  ]
  const pill = employmentLine(c)
  return (
    <article className="jg jg-poster" aria-label="모집요강">
      <div className="jg-p-top">
        <div className="jg-p-copy">
          <p className="jg-p-eyebrow">{RECRUIT_TYPE_LABEL[s.recruitType]} · {s.company}</p>
          <h3 className="jg-p-hero"><span>WE ARE</span><span>HIRING</span></h3>
          <i className="jg-p-rule" />
          <p className="jg-p-lead">{has(f.headline) ? withEmphasis(f.headline, f.emphasis) : s.role}</p>
          {has(f.headline) && <p className="jg-p-sub">{s.role}</p>}
          {pill && <span className="jg-p-pill">{pill}</span>}
        </div>
        <div className="jg-p-card" aria-hidden="true">
          <i className="jg-p-strap" />
          <div className="jg-p-badge">
            <b>JOIN<br />OUR<br />TEAM</b>
            <span>{s.company}</span>
            {has(f.industry) && <small>{f.industry}</small>}
          </div>
          <i className="jg-p-clip" />
        </div>
      </div>

      <div className="jg-p-info" data-cols={cols.length}>
        {cols.map(col => (
          <div key={col.key}>
            <svg viewBox="0 0 32 32" aria-hidden="true">{POSTER_ICONS[col.key]}</svg>
            <h4>{col.title}</h4>
            {col.body}
          </div>
        ))}
      </div>

      {/* 근무 정보·제출서류 — 4칸 요약 아래 한 단을 더 둔다(2026-11-26 사용자 요청). 둘 다 비면 그리지 않는다. */}
      {(detail.length > 0 || c.docs.length > 0) && (
        <div className="jg-p-detail">
          {detail.length > 0 && (
            <section>
              <h4>근무 정보</h4>
              <dl>{detail.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </section>
          )}
          {c.docs.length > 0 && (
            <section>
              <h4>제출서류</h4>
              <ul>
                {c.docs.map((d, i) => <li key={`${i}-${d.name}`}>{d.name}{docNote(d) && <i>{docNote(d)}</i>}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}

      {(has(f.applyMethod) || c.links.length > 0) && (
        <div className="jg-p-cta">
          <span className="jg-p-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" /></svg></span>
          <strong>지금 바로 지원하세요!</strong>
          {has(f.applyMethod) && <p>{f.applyMethod}</p>}
          <ApplyLinks links={c.links} />
        </div>
      )}

      {c.steps.length > 0 && (
        <ol className="jg-p-steps" aria-label="전형 절차">
          {c.steps.map((st, i) => <li key={`${i}-${st}`}>{st}</li>)}
        </ol>
      )}

      <footer className="jg-p-foot">
        <b>{s.company}</b>
        {has(f.contact) && <span>문의 {f.contact}</span>}
        {has(f.note) && <span>{f.note}</span>}
      </footer>
    </article>
  )
}

// ── 2. 핵심 숫자형 ───────────────────────────────────────────────────────

function Highlight(c: Ctx) {
  const { f, s } = c
  const pay = salaryParts(s)
  const size = [f.revenue && `연매출 ${f.revenue}`, f.headcount && `근로자 ${f.headcount}`].filter(has).join(' · ')
  const kv = ([
    ['담당업무', f.duty], ['근무시간', f.workHours], ['자격요건', f.qualification], ['우대사항', f.preferred],
    ['근무지', c.workplace], ['근무부서', f.department], ['회사규모', size],
  ] as [string, string | undefined][]).filter((r): r is [string, string] => has(r[1]))
  const meta = [s.company, f.industry].filter(has).join(' · ')
  return (
    <article className="jg jg-high" aria-label="모집요강">
      <header className="jg-h-head">
        <span className="jg-h-badge">{RECRUIT_TYPE_LABEL[s.recruitType]}</span>
        <p className="jg-h-co">{meta}</p>
        <h3 className="jg-h-title">{has(f.headline) ? withEmphasis(f.headline, f.emphasis) : s.role}</h3>
      </header>

      <div className="jg-h-stats">
        {pay && (
          <div className="jg-h-stat">
            <span className="k">연봉</span>
            <span className="v">{pay.num}{pay.unit && <small>{pay.unit}</small>}</span>
            {has(f.salaryNote) && <span className="n">{f.salaryNote}</span>}
          </div>
        )}
        {c.employment && (
          <div className="jg-h-stat">
            <span className="k">채용형태</span>
            <span className="v is-word">{c.employment}</span>
            {has(f.employmentNote) && <span className="n">{f.employmentNote}</span>}
          </div>
        )}
        <div className="jg-h-stat is-key">
          <span className="k">접수 마감</span>
          <span className="v">{c.deadline.short}</span>
          <span className="n">{c.deadline.sub}</span>
        </div>
      </div>

      <div className="jg-h-body">
        {kv.length > 0 && (
          <section>
            <h4>채용개요</h4>
            <dl className="jg-h-kv">
              {kv.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </section>
        )}
        {c.docs.length > 0 && (
          <section>
            <h4>제출서류</h4>
            <ul className="jg-h-docs">
              {c.docs.map((d, i) => <li key={`${i}-${d.name}`}>{d.name}{docNote(d) && <i>{docNote(d)}</i>}</li>)}
            </ul>
          </section>
        )}
        {(has(f.applyMethod) || c.links.length > 0) && (
          <section>
            <h4>신청방법</h4>
            {has(f.applyMethod) && <p className="jg-h-text">{f.applyMethod}</p>}
            <ApplyLinks links={c.links} />
          </section>
        )}
        {c.steps.length > 0 && (
          <section>
            <h4>전형절차</h4>
            <ol className="jg-h-flow">
              {c.steps.map((st, i) => <li key={`${i}-${st}`}><span>{i + 1}</span>{st}</li>)}
            </ol>
          </section>
        )}
      </div>

      {(has(f.contact) || has(f.note)) && (
        <footer className="jg-h-foot">
          {has(f.contact) && <span>문의 <b>{f.contact}</b></span>}
          {has(f.note) && <span>{f.note}</span>}
        </footer>
      )}
    </article>
  )
}

// ── 3. 요강 문서형 ───────────────────────────────────────────────────────

const DOC_KEY_ROWS = new Set(['급여', '자격요건'])

// 표(<table>)가 아니라 정의 목록이다 — 앱 공용 표 정렬(shared/tableAlignment.css, 가운데 !important)은
// 목록 표용이고, 이 칸은 문서처럼 왼쪽 정렬로 읽혀야 한다.
function DocTable({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="jg-d-table">
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd className={DOC_KEY_ROWS.has(k) ? 'is-key' : undefined}>{v}</dd></div>
      ))}
    </dl>
  )
}

function DocumentGuide(c: Ctx) {
  const { f, s } = c
  const size = [f.revenue && `연매출 ${f.revenue}`, f.headcount].filter(has).join(' · ')
  const rows = ([
    ['담당업무', f.duty], ['채용형태', employmentLine(c)],
    ['급여', [c.salary, f.salaryNote].filter(has).join('\n')], ['근무시간', f.workHours],
    ['자격요건', f.qualification], ['우대사항', f.preferred], ['업종', f.industry],
    ['근무지', c.workplace], ['근무부서', f.department], ['회사규모', size],
  ] as [string, string | undefined][]).filter((r): r is [string, string] => has(r[1]))
  const half = Math.ceil(rows.length / 2)
  return (
    <article className="jg jg-doc" aria-label="모집요강">
      <header className="jg-d-head">
        <p className="jg-d-kicker"><span>{RECRUIT_TYPE_LABEL[s.recruitType]}</span><span>국립창원대학교 취업전략센터</span></p>
        <h3 className="jg-d-title"><small>{s.company}</small>{has(f.headline) ? f.headline : s.role}</h3>
        <div className="jg-d-dday"><b>{c.deadline.short}</b><span>{c.deadline.sub}</span></div>
      </header>

      {rows.length > 0 && (
        <div className="jg-d-grid">
          <DocTable rows={rows.slice(0, half)} />
          {rows.length > half && <DocTable rows={rows.slice(half)} />}
        </div>
      )}

      {(c.docs.length > 0 || has(f.applyMethod) || c.links.length > 0) && (
        <div className="jg-d-band">
          {c.docs.length > 0 && (
            <div>
              <h4>제출서류</h4>
              <ul className="jg-d-check">
                {c.docs.map((d, i) => (
                  <li key={`${i}-${d.name}`} className={d.optional ? 'is-opt' : undefined}>
                    {d.name}{d.note && <i>{d.note}</i>}{d.optional && <i>해당자</i>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(has(f.applyMethod) || c.links.length > 0) && (
            <div>
              <h4>신청방법</h4>
              {has(f.applyMethod) && <p>{f.applyMethod}</p>}
              <ApplyLinks links={c.links} />
            </div>
          )}
        </div>
      )}

      {c.steps.length > 0 && (
        <ol className="jg-d-flow" aria-label="전형 절차">
          {c.steps.map((st, i) => (
            <li key={`${i}-${st}`} className={i === c.steps.length - 1 ? 'is-end' : undefined}>
              <span>STEP {i + 1}</span>{st}
            </li>
          ))}
        </ol>
      )}

      {(has(f.contact) || has(f.note)) && (
        <footer className="jg-d-foot">
          {has(f.contact) && <span>문의 <b>{f.contact}</b></span>}
          {has(f.note) && <span>{f.note}</span>}
        </footer>
      )}
    </article>
  )
}
