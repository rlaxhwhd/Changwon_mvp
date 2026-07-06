import { useMemo, useState } from 'react'
import { getActiveStudent } from '../../data/students'
import { computeAll } from '../../lib/scoring'
import './AiJobs.css'

/* ── Types ─────────────────────────────────────────────────────── */
type SortKey = '매칭률 높은순' | '최신 등록순' | '마감임박순'

const JOB_FIELDS = ['서비스기획/PM', '데이터분석', '백엔드개발', '프론트엔드', '마케팅', '디자인']
const COMPANY_SIZE = ['대기업', '중견기업', '중소기업', '스타트업']
const JOB_TYPES = ['신입', '경력'] as const
const REGIONS = ['서울', '경기', '부산', '대전', '광주', '기타']

function MatchRing({ pct, size = 52, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-primary)" strokeWidth={stroke}
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--color-navy)">
        {pct}%
      </text>
    </svg>
  )
}

function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'var(--color-primary)' : pct >= 80 ? 'var(--color-success)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-danger)'
  return (
    <div className="aj-match-bar-wrap">
      <div className="aj-match-bar-track">
        <div className="aj-match-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

/* ── Filter helpers ────────────────────────────────────────────── */
const tokenize = (s: string) => s.split(/[\/\s]+/).filter(Boolean)
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
  const student = getActiveStudent()
  const JOBS = student.jobs
  const SKILLS = student.jobSkills
  // 학생 종합 역량 점수 (5대 역량 가중평균) — "나의 준비율" 카드 표시용
  const overallScore = useMemo(() => computeAll(student.scoreInputs).overall, [student.scoreInputs])

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

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const toggleAll = (
    all: readonly string[],
    current: string[],
    setArr: (v: string[]) => void,
  ) => {
    const isAll = all.every(v => current.includes(v))
    setArr(isAll ? [] : [...all])
  }

  const applyFilters = () => {
    setAppliedFields(checkedFields)
    setAppliedSizes(checkedSizes)
    setAppliedJobTypes(checkedJobTypes)
    setAppliedRegions(checkedRegions)
  }

  const visibleJobs = useMemo(() => {
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
  }, [appliedFields, appliedSizes, appliedRegions, appliedJobTypes, sort])

  const openApply = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="aj-wrap">
      {/* Breadcrumb */}
      <div className="aj-breadcrumb">
        <span>진로취업 로드맵</span>
        <i className="fa-solid fa-chevron-right" />
        <span className="active">AI 맞춤 채용 추천</span>
      </div>
      <h1 className="aj-page-title">AI 맞춤 채용 추천</h1>
      <p className="aj-page-desc">
        나의 스펙과 역량을 분석하여 최적화된 기업을 추천합니다. 합격 가능성이 높은 순서로 정렬됩니다.
      </p>

      {/* ── Summary Stats ────────────────────────────────────── */}
      <div className="aj-stats">
        <div className="aj-stat-card">
          <div className="aj-stat-body">
            <p className="aj-stat-label">나의 준비율</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MatchRing pct={overallScore} />
              <div>
                <p className="aj-stat-num">{overallScore} <span>/ 100</span></p>
                <p className="aj-stat-sub">5대 역량 종합</p>
              </div>
            </div>
          </div>
        </div>

        <div className="aj-stat-card">
          <div className="aj-stat-body">
            <p className="aj-stat-label">현재 합격 예측</p>
            <p className="aj-stat-big">72<span>%</span></p>
            <p className="aj-stat-sub">상위 30% 수준</p>
          </div>
        </div>


        <div className="aj-stat-card">
          <div className="aj-stat-body">
            <p className="aj-stat-label">추천 기업 지역</p>
            <p className="aj-stat-num" style={{ fontSize: 21 }}>서울, 경기</p>
            <p className="aj-stat-sub">추천 지역 기준</p>
          </div>
        </div>
      </div>

      {/* ── 3-column body ──────────────────────────────────── */}
      <div className="aj-body">

        {/* Left Filter Panel */}
        <aside className="aj-filter">
          <p className="aj-filter-title"><i className="fa-solid fa-sliders" /> 필터</p>

          <div className="aj-filter-section">
            <p className="aj-filter-label">직무 분야</p>
            <label className="aj-check-row aj-check-all">
              <input
                type="checkbox"
                checked={JOB_FIELDS.every(f => checkedFields.includes(f))}
                ref={el => { if (el) el.indeterminate = checkedFields.length > 0 && !JOB_FIELDS.every(f => checkedFields.includes(f)) }}
                onChange={() => toggleAll(JOB_FIELDS, checkedFields, setCheckedFields)}
              />
              전체
            </label>
            {JOB_FIELDS.map(f => (
              <label key={f} className="aj-check-row">
                <input type="checkbox" checked={checkedFields.includes(f)}
                  onChange={() => toggle(checkedFields, setCheckedFields, f)} />
                {f}
              </label>
            ))}
          </div>

          <div className="aj-filter-section">
            <p className="aj-filter-label">기업 규모</p>
            <label className="aj-check-row aj-check-all">
              <input
                type="checkbox"
                checked={COMPANY_SIZE.every(s => checkedSizes.includes(s))}
                ref={el => { if (el) el.indeterminate = checkedSizes.length > 0 && !COMPANY_SIZE.every(s => checkedSizes.includes(s)) }}
                onChange={() => toggleAll(COMPANY_SIZE, checkedSizes, setCheckedSizes)}
              />
              전체
            </label>
            {COMPANY_SIZE.map(s => (
              <label key={s} className="aj-check-row">
                <input type="checkbox" checked={checkedSizes.includes(s)}
                  onChange={() => toggle(checkedSizes, setCheckedSizes, s)} />
                {s}
              </label>
            ))}
          </div>

          <div className="aj-filter-section">
            <p className="aj-filter-label">취업 유형</p>
            <label className="aj-check-row aj-check-all">
              <input
                type="checkbox"
                checked={JOB_TYPES.every(t => checkedJobTypes.includes(t))}
                ref={el => { if (el) el.indeterminate = checkedJobTypes.length > 0 && !JOB_TYPES.every(t => checkedJobTypes.includes(t)) }}
                onChange={() => toggleAll(JOB_TYPES, checkedJobTypes, setCheckedJobTypes)}
              />
              전체
            </label>
            {JOB_TYPES.map(t => (
              <label key={t} className="aj-check-row">
                <input type="checkbox" checked={checkedJobTypes.includes(t)}
                  onChange={() => toggle(checkedJobTypes, setCheckedJobTypes, t)} />
                {t}
              </label>
            ))}
          </div>

          <div className="aj-filter-section">
            <p className="aj-filter-label">채용 지역</p>
            <label className="aj-check-row aj-check-all">
              <input
                type="checkbox"
                checked={REGIONS.every(r => checkedRegions.includes(r))}
                ref={el => { if (el) el.indeterminate = checkedRegions.length > 0 && !REGIONS.every(r => checkedRegions.includes(r)) }}
                onChange={() => toggleAll(REGIONS, checkedRegions, setCheckedRegions)}
              />
              전체
            </label>
            {REGIONS.map(r => (
              <label key={r} className="aj-check-row">
                <input type="checkbox" checked={checkedRegions.includes(r)}
                  onChange={() => toggle(checkedRegions, setCheckedRegions, r)} />
                {r}
              </label>
            ))}
          </div>

          <button className="aj-filter-apply" onClick={applyFilters}>필터 적용</button>
        </aside>

        {/* Center Job List */}
        <div className="aj-job-list">
          <div className="aj-list-header">
            <span className="aj-list-count">총 <strong>{visibleJobs.length}</strong>개 기업 추천</span>
            <select
              className="aj-sort-sel"
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
            >
              <option>매칭률 높은순</option>
              <option>최신 등록순</option>
              <option>마감임박순</option>
            </select>
          </div>

          {visibleJobs.length === 0 && (
            <div className="aj-empty">
              <i className="fa-regular fa-folder-open" />
              <p>조건에 맞는 채용 공고가 없어요.</p>
              <span>필터를 조정한 뒤 다시 적용해보세요.</span>
            </div>
          )}

          {visibleJobs.map((job, idx) => (
            <div key={job.id} className="aj-job-card">
              <div className="aj-job-rank">{idx + 1}</div>

              {/* Logo */}
              <div className="aj-job-logo" style={{ background: job.color + '18', color: job.color }}>
                {job.initial}
              </div>

              {/* Info */}
              <div className="aj-job-info">
                <div className="aj-job-top">
                  <span className="aj-job-company">{job.company}</span>
                  {job.tags.map(t => (
                    <span key={t} className="aj-job-tag">{t}</span>
                  ))}
                </div>
                <p className="aj-job-role">{job.role}</p>
                <div className="aj-job-meta">
                  <span><i className="fa-solid fa-won-sign" /> {job.salary}</span>
                  <span><i className="fa-solid fa-location-dot" /> {job.location}</span>
                  <span><i className="fa-regular fa-calendar" /> {job.deadline}</span>
                </div>
                <MatchBar pct={job.match} />
              </div>

              {/* Match Score */}
              <div className="aj-job-score">
                <span className="aj-job-score-num" style={{
                  color: job.match >= 90 ? 'var(--color-primary)' : job.match >= 80 ? 'var(--color-success)' : 'var(--color-warning)'
                }}>
                  {job.match}
                </span>
                <span className="aj-job-score-pct">%</span>
                <span className="aj-job-score-label">매칭률</span>
              </div>

              {/* Action */}
              <div className="aj-job-actions">
                <button
                  className="aj-apply-btn"
                  onClick={() => openApply(job.applyUrl)}
                  aria-label={`${job.company} 채용공고로 이동`}
                >
                  지원하기 <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 13, marginLeft: 4 }} />
                </button>
                <button className="aj-wish-btn"><i className="fa-regular fa-heart" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel */}
        <aside className="aj-right">
          <div className="aj-right-card">
            <p className="aj-right-title">
              <i className="fa-solid fa-bolt" /> 나의 기술 역량
            </p>
            <ul className="aj-skill-list">
              {SKILLS.map(sk => (
                <li key={sk.label} className="aj-skill-item">
                  <div className="aj-skill-top">
                    <span className="aj-skill-label">{sk.label}</span>
                    <span className="aj-skill-score" style={{ color: sk.color }}>{sk.score}</span>
                  </div>
                  <div className="aj-skill-track">
                    <div className="aj-skill-fill"
                      style={{ width: `${(sk.score / sk.max) * 100}%`, background: sk.color }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="aj-right-card">
            <p className="aj-right-title">
              <i className="fa-solid fa-lightbulb" /> AI 추천 포인트
            </p>
            <ul className="aj-tip-list">
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--color-success)' }} />
                <span>서비스 기획 역량이 상위 25%</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--color-success)' }} />
                <span>PM 관련 공모전 수상 이력 있음</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--color-warning)' }} />
                <span>데이터 분석 역량 보강 권장</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--color-warning)' }} />
                <span>어학 점수 업데이트 필요</span>
              </li>
            </ul>
          </div>

          <div className="aj-right-card aj-right-cta">
            <p className="aj-right-title">
              <i className="fa-solid fa-robot" /> AI 자소서 작성
            </p>
            <p className="aj-cta-desc">추천 기업에 맞는 자소서를 AI가 도와드립니다.</p>
            <button className="aj-cta-btn">자소서 작성하기 <i className="fa-solid fa-arrow-right" /></button>
          </div>
        </aside>
      </div>
    </div>
  )
}
