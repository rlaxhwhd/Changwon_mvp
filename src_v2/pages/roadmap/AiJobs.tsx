import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveStudent } from '../../data/students'
import { computeAll } from '../../lib/scoring'
import './AiJobs.css'
import { usePageHead } from '../../components/PageCrumb'

/* ── AI 맞춤채용 (/jobs/joblist) ─────────────────────────────────────────
   화면 언어는 채용공고 보드(JobBoard)·공고 상세(JobDetailView)와 같다 —
   공용 카드 슬롯([data-slot="card"]) · .button · .badge 위에 이 화면 고유의 칩 필터와 추천 카드만 얹는다.
   필터·정렬·데이터 흐름(학생 단일소스 student.jobs / jobSkills)은 그대로다. */

type SortKey = '매칭률 높은순' | '최신 등록순' | '마감임박순'
const SORTS: SortKey[] = ['매칭률 높은순', '최신 등록순', '마감임박순']

const JOB_FIELDS = ['서비스기획/PM', '데이터분석', '백엔드개발', '프론트엔드', '마케팅', '디자인']
const COMPANY_SIZE = ['대기업', '중견기업', '중소기업', '스타트업']
const JOB_TYPES = ['신입', '경력'] as const
const REGIONS = ['서울', '경기', '부산', '대전', '광주', '기타']

/* 매칭률 색 — 90 이상 강조색 · 80 이상 민트 · 그 아래 앰버. 숫자·링·칩이 같은 기준을 본다. */
function matchTone(pct: number): 'primary' | 'mint' | 'amber' {
  return pct >= 90 ? 'primary' : pct >= 80 ? 'mint' : 'amber'
}

function MatchRing({ pct, size = 56, stroke = 5, tone = 'primary' }: { pct: number; size?: number; stroke?: number; tone?: 'primary' | 'mint' | 'amber' }) {
  // 요약 카드(나의 준비율) 한 곳에서만 쓴다 — 추천 카드는 배지(.aj-job-match)다.
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg className={`aj-ring is-${tone}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pct}퍼센트`}>
      <circle className="aj-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
      <circle
        className="aj-ring-fill"
        cx={size / 2} cy={size / 2} r={r}
        strokeWidth={stroke}
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text className="aj-ring-text" x={size / 2} y={size / 2 + 4} textAnchor="middle">{pct}%</text>
    </svg>
  )
}

/* ── 필터 칩 묶음 — 체크박스 열 대신 눌러 켜는 칩. 「전체」는 모두 켜기/끄기 토글이다. ── */
function FilterGroup({
  label, options, checked, onChange,
}: {
  label: string
  options: readonly string[]
  checked: string[]
  onChange: (next: string[]) => void
}) {
  const all = options.every(o => checked.includes(o))
  const toggle = (v: string) => onChange(checked.includes(v) ? checked.filter(x => x !== v) : [...checked, v])
  return (
    <div className="aj-filter-group" role="group" aria-label={label}>
      <span className="aj-filter-label">{label}</span>
      <div className="aj-chips">
        <button type="button" className={`aj-chip is-all${all ? ' is-on' : ''}`} aria-pressed={all} onClick={() => onChange(all ? [] : [...options])}>
          전체
        </button>
        {options.map(o => (
          <button key={o} type="button" className={`aj-chip${checked.includes(o) ? ' is-on' : ''}`} aria-pressed={checked.includes(o)} onClick={() => toggle(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Filter helpers ────────────────────────────────────────────── */
const tokenize = (s: string) => s.split(/[/\s]+/).filter(Boolean)
const roleMatches = (jobRole: string, checked: string[]) => {
  if (checked.length === 0) return true
  const jt = tokenize(jobRole)
  return checked.some(f => {
    const ft = tokenize(f)
    return ft.some(a => jt.some(b => a.includes(b) || b.includes(a)))
  })
}
const regionMatches = (jobLoc: string, checked: string[]) => {
  if (checked.length === 0) return true
  const known = ['서울', '경기', '부산', '대전', '광주']
  if (checked.includes('기타') && !known.includes(jobLoc)) return true
  return checked.includes(jobLoc)
}

export default function AiJobs() {
  usePageHead('AI 맞춤채용', '나의 스펙과 역량을 분석해 최적화된 기업을 추천합니다. 합격 가능성이 높은 순서로 정렬됩니다.')
  const student = getActiveStudent()
  const JOBS = student.jobs
  const SKILLS = student.jobSkills
  // 학생 종합 역량 점수 (5대 역량 가중평균) — "나의 준비율" 카드 표시용.
  // useMemo 를 두지 않는다 — 학생 객체가 렌더마다 새로 읽혀 의존성이 보존되지 않는다(React Compiler 경고). 계산은 가볍다.
  const overallScore = computeAll(student.scoreInputs).overall

  // checked = 현재 UI 상태, applied = 실제 리스트에 적용된 값
  const [checkedFields, setCheckedFields] = useState<string[]>([student.jobField])
  const [checkedSizes, setCheckedSizes] = useState<string[]>(['대기업'])
  const [checkedJobTypes, setCheckedJobTypes] = useState<string[]>(['신입'])
  const [checkedRegions, setCheckedRegions] = useState<string[]>(['서울', '경기'])

  const [appliedFields, setAppliedFields] = useState<string[]>([student.jobField])
  const [appliedSizes, setAppliedSizes] = useState<string[]>(['대기업'])
  const [appliedJobTypes, setAppliedJobTypes] = useState<string[]>(['신입'])
  const [appliedRegions, setAppliedRegions] = useState<string[]>(['서울', '경기'])

  const [sort, setSort] = useState<SortKey>('매칭률 높은순')

  const dirty =
    checkedFields.join() !== appliedFields.join() ||
    checkedSizes.join() !== appliedSizes.join() ||
    checkedJobTypes.join() !== appliedJobTypes.join() ||
    checkedRegions.join() !== appliedRegions.join()

  const applyFilters = () => {
    setAppliedFields(checkedFields)
    setAppliedSizes(checkedSizes)
    setAppliedJobTypes(checkedJobTypes)
    setAppliedRegions(checkedRegions)
  }

  const visibleJobs = (() => {
    const filtered = JOBS.filter(j => {
      if (!roleMatches(j.role, appliedFields)) return false
      if (appliedSizes.length > 0 && !appliedSizes.some(s => j.tags.includes(s))) return false
      if (!regionMatches(j.location, appliedRegions)) return false
      if (appliedJobTypes.length > 0 && !appliedJobTypes.includes(j.jobType)) return false
      return true
    })
    const deadlineKey = (d: string) =>
      d === '상시채용' ? Number.POSITIVE_INFINITY : new Date(d.replace(/\./g, '-')).getTime()
    const sorted = [...filtered]
    if (sort === '매칭률 높은순') sorted.sort((a, b) => b.match - a.match)
    else if (sort === '마감임박순') sorted.sort((a, b) => deadlineKey(a.deadline) - deadlineKey(b.deadline))
    else sorted.sort((a, b) => b.id - a.id) // 최신 등록순: id 역순
    return sorted
  })()

  const openApply = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="aj-page">
      {/* ── 요약 3장 ────────────────────────────────────────── */}
      <section className="aj-summary" aria-label="나의 매칭 요약">
        <article data-slot="card" className="aj-stat">
          <MatchRing pct={overallScore} size={56} />
          <div className="aj-stat-copy">
            <span className="aj-stat-label">나의 준비율</span>
            <strong className="aj-stat-value">{overallScore}<small>/ 100</small></strong>
            <span className="aj-stat-sub">5대 역량 종합</span>
          </div>
        </article>
        <article data-slot="card" className="aj-stat">
          <span className="aj-stat-icon is-mint" aria-hidden="true"><i className="fa-solid fa-bullseye" /></span>
          <div className="aj-stat-copy">
            <span className="aj-stat-label">현재 합격 예측</span>
            <strong className="aj-stat-value">72<small>%</small></strong>
            <span className="aj-stat-sub">상위 30% 수준</span>
          </div>
        </article>
        <article data-slot="card" className="aj-stat">
          <span className="aj-stat-icon is-blue" aria-hidden="true"><i className="fa-solid fa-location-dot" /></span>
          <div className="aj-stat-copy">
            <span className="aj-stat-label">추천 기업 지역</span>
            <strong className="aj-stat-value is-text">서울, 경기</strong>
            <span className="aj-stat-sub">추천 지역 기준</span>
          </div>
        </article>
      </section>

      <div className="aj-layout">
        <div className="aj-main">
          {/* ── 필터 — 칩 토글, 「필터 적용」으로 반영 ───────────── */}
          <section data-slot="card" className="aj-filter" aria-label="추천 조건">
            <div data-slot="card-header">
              <div>
                <h2 data-slot="card-title">추천 조건</h2>
                <p data-slot="card-description">직무·기업 규모·취업 유형·지역을 고르고 적용하세요.</p>
              </div>
              <div data-slot="card-action">
                <button type="button" className={`button primary sm${dirty ? '' : ' is-disabled'}`} onClick={applyFilters} disabled={!dirty}>
                  필터 적용
                </button>
              </div>
            </div>
            <div data-slot="card-content" className="aj-filter-groups">
              <FilterGroup label="직무 분야" options={JOB_FIELDS} checked={checkedFields} onChange={setCheckedFields} />
              <FilterGroup label="기업 규모" options={COMPANY_SIZE} checked={checkedSizes} onChange={setCheckedSizes} />
              <FilterGroup label="취업 유형" options={JOB_TYPES} checked={checkedJobTypes} onChange={setCheckedJobTypes} />
              <FilterGroup label="채용 지역" options={REGIONS} checked={checkedRegions} onChange={setCheckedRegions} />
            </div>
          </section>

          {/* ── 추천 목록 ───────────────────────────────────── */}
          <section className="aj-list" aria-label="추천 채용">
            <div className="aj-list-head">
              <p className="aj-list-count">총 <strong>{visibleJobs.length}</strong>개 기업 추천</p>
              <label className="aj-sort">
                <select aria-label="정렬" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                  {SORTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

            {visibleJobs.length === 0 && (
              <div data-slot="card" className="aj-empty">
                <i className="fa-regular fa-folder-open" aria-hidden="true" />
                <p>조건에 맞는 채용 공고가 없어요.</p>
                <span>필터를 조정한 뒤 다시 적용해보세요.</span>
              </div>
            )}

            {visibleJobs.map((job, idx) => {
              const tone = matchTone(job.match)
              return (
                <article key={job.id} data-slot="card" className="aj-job">
                  <span className="aj-job-rank" aria-label={`${idx + 1}위`}>{idx + 1}</span>
                  <span className="aj-job-logo" style={{ background: job.color + '18', color: job.color }} aria-hidden="true">{job.initial}</span>

                  <div className="aj-job-body">
                    <div className="aj-job-top">
                      <strong className="aj-job-company">{job.company}</strong>
                      {/* 매칭률 — 링 그래프 대신 색 배지. 카드마다 반복되는 그래프가 시각적으로 무거웠다. */}
                      <span className={`aj-job-match is-${tone}`}>매칭 {job.match}%</span>
                    </div>
                    <h3 className="aj-job-role">{job.role}</h3>
                    {/* 기업 규모·지역·경력 태그는 직무 아래 한 줄 — 첫 줄엔 회사명과 매칭률만 남긴다. */}
                    <div className="aj-job-tags">
                      {job.tags.map(t => <span key={t} className="aj-job-tag">{t}</span>)}
                      <span className="aj-job-tag is-type">{job.jobType}</span>
                    </div>
                    <ul className="aj-job-meta">
                      <li><i className="fa-solid fa-won-sign" aria-hidden="true" />{job.salary}</li>
                      <li><i className="fa-solid fa-location-dot" aria-hidden="true" />{job.location}</li>
                      <li><i className="fa-regular fa-calendar" aria-hidden="true" />{job.deadline}</li>
                    </ul>
                    {/* 동작 줄 — 본문 맨 아래. */}
                    <div className="aj-job-actions">
                      <button type="button" className="aj-apply" onClick={() => openApply(job.applyUrl)} aria-label={`${job.company} 채용공고로 이동`}>
                        지원하기 <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* 관심(하트) — 카드 우측 상단 모서리. */}
                  <button type="button" className="aj-wish" aria-label="관심 공고 저장"><i className="fa-regular fa-heart" aria-hidden="true" /></button>
                </article>
              )
            })}
          </section>
        </div>

        {/* ── 우측 — 기술 역량 · 추천 포인트 · 자소서 CTA ──────── */}
        <aside className="aj-side">
          <section data-slot="card">
            <div data-slot="card-header">
              <div><h2 data-slot="card-title">나의 기술 역량</h2></div>
            </div>
            <div data-slot="card-content">
              <ul className="aj-skills">
                {SKILLS.map(sk => (
                  <li key={sk.label} className="aj-skill" style={{ '--aj-skill': sk.color } as React.CSSProperties}>
                    <div className="aj-skill-head"><span>{sk.label}</span><strong>{sk.score}</strong></div>
                    <div className="aj-skill-track"><i style={{ width: `${(sk.score / sk.max) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section data-slot="card">
            <div data-slot="card-header">
              <div><h2 data-slot="card-title">AI 추천 포인트</h2></div>
            </div>
            <div data-slot="card-content">
              <ul className="aj-tips">
                <li className="is-good"><i className="fa-solid fa-circle-check" aria-hidden="true" />서비스 기획 역량이 상위 25%</li>
                <li className="is-good"><i className="fa-solid fa-circle-check" aria-hidden="true" />PM 관련 공모전 수상 이력 있음</li>
                <li className="is-warn"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />데이터 분석 역량 보강 권장</li>
                <li className="is-warn"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />어학 점수 업데이트 필요</li>
              </ul>
            </div>
          </section>

          <section data-slot="card" className="aj-cta">
            <div data-slot="card-content">
              <span className="aj-cta-icon" aria-hidden="true"><i className="fa-solid fa-robot" /></span>
              <h2 className="aj-cta-title">AI 자소서 작성</h2>
              <p className="aj-cta-desc">추천 기업에 맞는 자소서를 AI가 도와드립니다.</p>
              <Link to="/jobs/home/resume" className="button primary aj-cta-btn">자소서 작성하기 <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
