import { useState } from 'react'
import './AiJobs.css'

/* ── Types ─────────────────────────────────────────────────────── */
interface Job {
  id: number
  company: string
  initial: string
  color: string
  role: string
  tags: string[]
  match: number
  salary: string
  location: string
  deadline: string
}

interface Skill {
  label: string
  score: number
  max: number
  color: string
}

/* ── Mock Data ─────────────────────────────────────────────────── */
const JOBS: Job[] = [
  {
    id: 1, company: '네이버', initial: 'N', color: '#03C75A',
    role: '서비스기획/PM', tags: ['대기업', '서울'],
    match: 92, salary: '4,500만원~', location: '서울', deadline: '상시채용',
  },
  {
    id: 2, company: '카카오', initial: 'K', color: '#FEE500',
    role: '데이터분석', tags: ['대기업', '판교'],
    match: 88, salary: '4,200만원~', location: '경기', deadline: '2025.05.30',
  },
  {
    id: 3, company: '넥슨', initial: 'NX', color: '#FF5C00',
    role: '백엔드개발', tags: ['대기업', '판교'],
    match: 80, salary: '3,800만원~', location: '경기', deadline: '2025.06.01',
  },
  {
    id: 4, company: '쿠팡', initial: 'C', color: '#EE2222',
    role: 'PM/기획', tags: ['대기업', '서울'],
    match: 75, salary: '4,000만원~', location: '서울', deadline: '2025.05.31',
  },
  {
    id: 5, company: '우아한형제들', initial: 'B', color: '#2AC1BC',
    role: '백엔드', tags: ['중견기업', '서울'],
    match: 70, salary: '3,600만원~', location: '서울', deadline: '2025.06.15',
  },
]

const SKILLS: Skill[] = [
  { label: '서비스 기획력', score: 78, max: 100, color: '#2E5BFF' },
  { label: '데이터 분석', score: 64, max: 100, color: '#22C55E' },
  { label: '커뮤니케이션', score: 82, max: 100, color: '#F59E0B' },
  { label: '문서 작성', score: 71, max: 100, color: '#8B5CF6' },
  { label: '프로젝트 관리', score: 55, max: 100, color: '#EF4444' },
]

const JOB_FIELDS = ['서비스기획/PM', '데이터분석', '백엔드개발', '프론트엔드', '마케팅', '디자인']
const COMPANY_SIZE = ['대기업', '중견기업', '중소기업', '스타트업']
const REGIONS = ['서울', '경기', '부산', '대전', '광주', '기타']

function MatchRing({ pct, size = 52, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8ECF0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#2E5BFF" strokeWidth={stroke}
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1C2442">
        {pct}%
      </text>
    </svg>
  )
}

function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? '#2E5BFF' : pct >= 80 ? '#22C55E' : pct >= 70 ? '#F59E0B' : '#EF4444'
  return (
    <div className="aj-match-bar-wrap">
      <div className="aj-match-bar-track">
        <div className="aj-match-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function AiJobs() {
  const [checkedFields, setCheckedFields] = useState<string[]>(['서비스기획/PM'])
  const [checkedSizes, setCheckedSizes] = useState<string[]>(['대기업'])
  const [jobType, setJobType] = useState<'신입' | '경력'>('신입')
  const [checkedRegions, setCheckedRegions] = useState<string[]>(['서울', '경기'])

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  return (
    <div className="aj-wrap">
      {/* Breadcrumb */}
      <div className="aj-breadcrumb">
        <span>경력개발 로드맵</span>
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
          <div className="aj-stat-icon-wrap" style={{ background: '#EEF2FF', color: '#2E5BFF' }}>
            <i className="fa-solid fa-chart-pie" />
          </div>
          <div className="aj-stat-body">
            <p className="aj-stat-label">나의 준비율</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MatchRing pct={42} />
              <div>
                <p className="aj-stat-num">1,231 <span>점</span></p>
                <p className="aj-stat-sub">1,289-2,000 점</p>
              </div>
            </div>
          </div>
        </div>

        <div className="aj-stat-card">
          <div className="aj-stat-icon-wrap" style={{ background: '#F0FDF4', color: '#22C55E' }}>
            <i className="fa-solid fa-bullseye" />
          </div>
          <div className="aj-stat-body">
            <p className="aj-stat-label">현재 합격 예측</p>
            <p className="aj-stat-big">72<span>%</span></p>
            <p className="aj-stat-sub">상위 30% 수준</p>
          </div>
        </div>

        <div className="aj-stat-card">
          <div className="aj-stat-icon-wrap" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
            <i className="fa-solid fa-trophy" />
          </div>
          <div className="aj-stat-body">
            <p className="aj-stat-label">합격 가능성</p>
            <p className="aj-stat-big">30<span>%</span></p>
            <p className="aj-stat-sub aj-stat-badge">달성 가능</p>
          </div>
        </div>

        <div className="aj-stat-card">
          <div className="aj-stat-icon-wrap" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
            <i className="fa-solid fa-location-dot" />
          </div>
          <div className="aj-stat-body">
            <p className="aj-stat-label">추천 기업 지역</p>
            <p className="aj-stat-num" style={{ fontSize: 20 }}>서울, 경기</p>
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
            {(['신입', '경력'] as const).map(t => (
              <label key={t} className="aj-check-row">
                <input type="radio" name="jobType" checked={jobType === t}
                  onChange={() => setJobType(t)} />
                {t}
              </label>
            ))}
          </div>

          <div className="aj-filter-section">
            <p className="aj-filter-label">채용 지역</p>
            {REGIONS.map(r => (
              <label key={r} className="aj-check-row">
                <input type="checkbox" checked={checkedRegions.includes(r)}
                  onChange={() => toggle(checkedRegions, setCheckedRegions, r)} />
                {r}
              </label>
            ))}
          </div>

          <button className="aj-filter-apply">필터 적용</button>
        </aside>

        {/* Center Job List */}
        <div className="aj-job-list">
          <div className="aj-list-header">
            <span className="aj-list-count">총 <strong>{JOBS.length}</strong>개 기업 추천</span>
            <select className="aj-sort-sel">
              <option>매칭률 높은순</option>
              <option>최신 등록순</option>
              <option>마감임박순</option>
            </select>
          </div>

          {JOBS.map((job, idx) => (
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
                  color: job.match >= 90 ? '#2E5BFF' : job.match >= 80 ? '#22C55E' : '#F59E0B'
                }}>
                  {job.match}
                </span>
                <span className="aj-job-score-pct">%</span>
                <span className="aj-job-score-label">매칭률</span>
              </div>

              {/* Action */}
              <div className="aj-job-actions">
                <button className="aj-apply-btn">지원하기</button>
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
                <i className="fa-solid fa-circle-check" style={{ color: '#22C55E' }} />
                <span>서비스 기획 역량이 상위 25%</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-check" style={{ color: '#22C55E' }} />
                <span>PM 관련 공모전 수상 이력 있음</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#F59E0B' }} />
                <span>데이터 분석 역량 보강 권장</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#F59E0B' }} />
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
