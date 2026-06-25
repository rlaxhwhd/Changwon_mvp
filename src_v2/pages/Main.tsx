import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { getActiveStudent } from '../data/students'
import { computeAll, type Competency } from '../lib/scoring'
import './Main.css'

/** Main 종합 역량 레이더 — 5축 표시 순서 (디자인 유지, 텍스트/수치만 동적화) */
const MAIN_RADAR_ORDER: Competency[] = ['취업', '직무', '자기관리', '성장', '진로']

/* ── Mock Data ─────────────────────────────────────────────────── */
const RANKING = [
  { rank: 1, name: '박지민', xp: 2340 },
  { rank: 2, name: '이서연', xp: 2210 },
  { rank: 3, name: '최민수', xp: 2100 },
  { rank: 4, name: '정하늘', xp: 1980 },
  { rank: 5, name: '한도윤', xp: 1920 },
]

const MY_RANK = { rank: 12, total: 45, name: getActiveStudent().name, xp: 1850 }

/* 학과 랭킹 전체 보기(모달)용 — TOP5 이후 순위까지 */
const RANKING_FULL = [
  ...RANKING,
  { rank: 6, name: '오지호', xp: 1890 },
  { rank: 7, name: '윤서아', xp: 1870 },
  { rank: 8, name: '강민재', xp: 1840 },
  { rank: 9, name: '임수빈', xp: 1810 },
  { rank: 10, name: '서준오', xp: 1780 },
  { rank: 11, name: '조은우', xp: 1760 },
  { rank: MY_RANK.rank, name: MY_RANK.name, xp: MY_RANK.xp, me: true },
]

const RECOMMENDED_PROGRAMS = [
  { id: 1, title: '데이터 기초 프로그래밍 교육', category: '취업', dDay: 5, image: '/비교과프로그램1.png' },
  { id: 4, title: '자기탐색으로 개인 역량 찾기', category: '진로', dDay: 3, image: '/비교과프로그램4.png' },
  { id: 2, title: '데이터 직무역량 개발 교육', category: '취업', dDay: 12, image: '/비교과프로그램2.png' },
  { id: 3, title: 'ChatGPT 서비스의 발전 방향', category: '진로', dDay: 20, image: '/비교과프로그램3.png' },
]

const CAT_COLORS: Record<string, string> = {
  취업: '#2E5BFF',
  진로: '#22C55E',
  어학: '#F59E0B',
  창업: '#EF4444',
}

/* 밝은 로고 배경이면 글자색을 네이비로 (가독성) */
function logoTextColor(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 180 ? '#1C2442' : '#fff'
}

/* 활성 학생의 추천 공고 4개 + 강조 배지(마감임박·HOT) */
function buildRecommendedJobs() {
  const jobs = getActiveStudent().jobs.slice(0, 4)
  // 마감일이 가장 이른 공고 → 마감임박
  const soonest = jobs.reduce((min, j) => (j.deadline < min ? j.deadline : min), jobs[0]?.deadline ?? '')
  return jobs.map(j => ({
    id: j.id,
    company: j.company,
    initial: j.initial,
    color: j.color,
    textColor: logoTextColor(j.color),
    role: j.role,
    match: j.match,
    deadline: j.deadline,
    hot: j.match >= 88,
    urgent: j.deadline === soonest,
  }))
}
const RECOMMENDED_JOBS = buildRecommendedJobs()

const NOTICES = [
  { label: '2024 하계 현장실습 참여자 모집', date: '05.20' },
  { label: '직무 특강: "빅데이터 개발자 취업 준비"', date: '05.18' },
  { label: 'AI 자소서 첨삭 이벤트 안내', date: '05.17' },
]

interface RadarAxisData { label: string; value: number }

/* ── Polygon Radar Chart (n축 가변, 디자인 유지) ────────────────── */
function RadarChart({ axes }: { axes: RadarAxisData[] }) {
  const cx = 100, cy = 100, r = 72
  const n = axes.length

  const pt = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    }
  }

  const gridLevels = [0.25, 0.5, 0.75, 1.0]
  const dataPoints = axes.map((ax, i) => pt(i, ax.value))
  const dataPath = dataPoints.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'
  const outerPoints = axes.map((_, i) => pt(i, 1.0))
  const outerPath = outerPoints.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'

  return (
    <svg viewBox="-50 -10 300 220" className="mn-radar-svg">
      <defs>
        {/* 홀로그램 메인 그라데이션 */}
        <linearGradient id="holo-main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#7B6EFF" stopOpacity="0.9" />
          <stop offset="30%"  stopColor="#4A90FF" stopOpacity="0.85" />
          <stop offset="60%"  stopColor="#00D4FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.9" />
        </linearGradient>
        {/* 광택 오버레이 그라데이션 */}
        <linearGradient id="holo-sheen" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="40%"  stopColor="#C4B5FD" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.25" />
        </linearGradient>
        {/* 방사형 내부 광원 */}
        <radialGradient id="holo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="60%"  stopColor="#818CF8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
        </radialGradient>
        {/* 외곽 글로우 필터 */}
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* 클리핑 마스크 */}
        <clipPath id="data-clip">
          <path d={dataPath} />
        </clipPath>
      </defs>

      {/* 배경 육각형 (가장 바깥 그리드에 연한 틴트) */}
      <path d={outerPath} fill="url(#holo-main)" fillOpacity="0.06" />

      {/* Grid rings */}
      {gridLevels.map((lv, li) => (
        <polygon key={li}
          points={axes.map((_, i) => { const p = pt(i, lv); return `${p.x},${p.y}` }).join(' ')}
          fill="none"
          stroke={lv === 1.0 ? '#A5B4FC' : '#C7D2FE'}
          strokeWidth={lv === 1.0 ? 1.2 : 0.8}
          strokeOpacity={lv === 1.0 ? 0.7 : 0.5}
        />
      ))}

      {/* Axes */}
      {axes.map((_, i) => {
        const outer = pt(i, 1.0)
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#C7D2FE" strokeWidth="0.8" strokeOpacity="0.6" />
      })}

      {/* 홀로그램 데이터 채우기 — 메인 */}
      <path d={dataPath} fill="url(#holo-main)" fillOpacity="0.55" />
      {/* 광택 오버레이 */}
      <path d={dataPath} fill="url(#holo-sheen)" fillOpacity="1" />
      {/* 내부 광원 */}
      <path d={dataPath} fill="url(#holo-glow)" fillOpacity="1" />

      {/* 외곽선 — 글로우 효과 */}
      <path d={dataPath} fill="none" stroke="#818CF8" strokeWidth="3.5" strokeOpacity="0.3" filter="url(#glow-filter)" />
      <path d={dataPath} fill="none" stroke="url(#holo-main)" strokeWidth="1.8" />

      {/* 꼭짓점 도트 */}
      {dataPoints.map(({ x, y }, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill="#7B6EFF" fillOpacity="0.25" />
          <circle cx={x} cy={y} r="3" fill="url(#holo-main)" />
        </g>
      ))}

      {/* Labels */}
      {axes.map((ax, i) => {
        const { x, y } = pt(i, 1.28)
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} fontSize="13" fill="#1C2442" fontFamily="Pretendard, sans-serif" fontWeight="700">
            {ax.label}
          </text>
        )
      })}
    </svg>
  )
}

/* ── Mini Sparkline ────────────────────────────────────────────── */
function Sparkline({ points, color = '#2E5BFF' }: { points: number[]; color?: string }) {
  const w = 90, h = 34
  const min = Math.min(...points), max = Math.max(...points)
  const span = max - min || 1
  const stepX = w / (points.length - 1)
  const toY = (v: number) => h - ((v - min) / span) * (h * 0.85) - h * 0.05
  const poly = points.map((v, i) => `${i * stepX},${toY(v)}`).join(' ')
  const area = `M0,${h} ` + points.map((v, i) => `L${i * stepX},${toY(v)}`).join(' ') + ` L${w},${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Mission Donut (오늘의 퀘스트) — 원호 따라 진해지는 그라데이션 ── */
function MissionDonut({ value, total }: { value: number; total: number }) {
  const pct = Math.min(value / total, 1)
  const deg = pct * 360

  // conic-gradient: 원호를 따라 시작점(연한 파랑) → 진행점(진한 파랑)
  const ringStyle: React.CSSProperties = {
    background: `conic-gradient(from 0deg,
      #A6C0FF 0deg,
      #4A78FF ${deg * 0.5}deg,
      #1B3D9E ${deg}deg,
      #E3E9F8 ${deg}deg,
      #E3E9F8 360deg)`,
    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 11px))',
    mask: 'radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 11px))',
  }

  return (
    <div className="relative w-[108px] h-[108px]">
      <div className="absolute inset-0 rounded-full" style={ringStyle} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline">
          <span className="text-[26px] font-black text-[var(--color-navy)] leading-none">{value}</span>
          <span className="text-xs font-bold text-[var(--color-text-muted)]">/{total}</span>
        </div>
        <span className="mt-1 text-[12px] font-bold tracking-wide text-[var(--color-primary)]">완료</span>
      </div>
    </div>
  )
}

/* ── Growth Chart (역량 성장 그래프) — 우상향 차트 ──────────────── */
function GrowthChart({ currentScore }: { currentScore: number }) {
  // 마지막 데이터 포인트는 종합 역량 점수 (AiLounge 계산값)와 동일
  const data = [34, 41, 38, 49, 55, 62, currentScore]
  const w = 180, h = 78, pad = 6
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const stepX = (w - pad * 2) / (data.length - 1)
  const toX = (i: number) => pad + i * stepX
  const toY = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2 - 8)
  const pts = data.map((v, i) => [toX(i), toY(v)] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const area = `M${pts[0][0]},${h} ` + pts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${pts[pts.length - 1][0]},${h} Z`
  const last = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full overflow-visible">
      <defs>
        {/* 홀로그램 라인 그라데이션 */}
        <linearGradient id="gc-holo" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#7B6EFF" />
          <stop offset="55%"  stopColor="#4A90FF" />
          <stop offset="100%" stopColor="#00D4FF" />
        </linearGradient>
        {/* 면 그라데이션 */}
        <linearGradient id="gc-area" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#4A90FF" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#4A90FF" stopOpacity="0" />
        </linearGradient>
        <filter id="gc-glow" x="-30%" y="-40%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      {/* 면 채우기 */}
      <path d={area} fill="url(#gc-area)" />
      {/* 글로우 라인 */}
      <path d={line} fill="none" stroke="url(#gc-holo)" strokeWidth="4.2"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#gc-glow)" opacity="0.6" />
      {/* 메인 라인 */}
      <path d={line} fill="none" stroke="url(#gc-holo)" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* 끝점 도트 */}
      <circle cx={last[0]} cy={last[1]} r="6" fill="#00D4FF" opacity="0.22" />
      <circle cx={last[0]} cy={last[1]} r="3.2" fill="url(#gc-holo)" />
    </svg>
  )
}

/* ── Pass Donut (합격예측) ──────────────────────────────────────── */
/* ── Main Page ─────────────────────────────────────────────────── */
export default function Main() {
  const navigate = useNavigate()
  const [rankOpen, setRankOpen] = useState(false)
  const student = getActiveStudent()

  const xp = 1250, xpMax = 2000
  const xpPct = (xp / xpMax) * 100

  // ── 5대 역량 점수 — 학생 JSON의 scoreInputs로 동적 계산 ─────
  const scoreResult = useMemo(() => computeAll(student.scoreInputs), [student.scoreInputs])
  const compByKey = useMemo(
    () => Object.fromEntries(scoreResult.competencies.map(c => [c.key, c])),
    [scoreResult],
  )
  const radarAxes: RadarAxisData[] = MAIN_RADAR_ORDER.map(k => ({
    label: `${k} 역량`,
    value: compByKey[k].scoreRounded / 100,  // 0~1 (RadarChart는 비율로 그림)
  }))

  return (
    <div className="mn-page">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mn-hero">
        <div className="mn-hero-content">
          <div className="mn-greeting">
            <h1 className="mn-greeting-title">안녕하세요, {MY_RANK.name}님</h1>
            <p className="mn-greeting-sub">오늘도 성장하는 당신을 응원해요!</p>
          </div>

          {/* Stat cards row */}
          <div className="mn-stat-cards">

            {/* 역량 성장 그래프 — 우상향 차트 */}
            <div className="mn-stat-card mn-quest-card">
              <p className="mn-sc-label">역량 성장 그래프</p>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-[30px] font-black leading-none text-[var(--color-navy)]">{scoreResult.overall}</span>
                <span className="text-[13px] font-bold text-[var(--color-text-sub)]">점</span>
                <span className="ml-auto flex items-center gap-1 rounded-full bg-[#22C55E]/12 px-2 py-0.5 text-[13px] font-extrabold text-[var(--color-success)]">
                  <i className="fa-solid fa-arrow-trend-up text-[12px]" />
                  +8
                </span>
              </div>
              <div className="flex flex-1 items-end">
                <GrowthChart currentScore={scoreResult.overall} />
              </div>
            </div>

            {/* Profile card */}
            <div className="mn-stat-card mn-profile-card">
              <div className="mn-avatar-wrap">
                <img className="mn-avatar-photo" src="/student-profile.png" alt={`${MY_RANK.name} 프로필`} />
              </div>
              <div className="mn-profile-body">
                <span className="mn-level-badge">Lv. 23</span>
                <div className="mn-xp-bar-track">
                  <div className="mn-xp-bar-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <p className="mn-xp-label">{xp.toLocaleString()} / {xpMax.toLocaleString()} XP</p>
              </div>
            </div>

            {/* 오늘의 퀘스트 — 홀로그램 원형 그래프 */}
            <div className="mn-stat-card mn-mission-card">
              <p className="mn-sc-label">오늘의 퀘스트</p>
              <div className="flex flex-1 items-center justify-center">
                <MissionDonut value={1} total={5} />
              </div>
              <button className="mn-sc-btn" onClick={() => navigate('/growth/quest')}>
                퀘스트 확인하기
              </button>
            </div>

          </div>
        </div>

        {/* Hero image */}
        <div className="mn-hero-img">
          <img src="/changwon_mascort3.png" alt="창원대학교 마스코트" />
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────── */}
      <section className="mn-body">

        {/* 종합 역량 */}
        <div className="mn-body-card">
          <div className="mn-body-card-head">
            <h2 className="mn-body-card-title">종합 역량</h2>
          </div>
          <div className="mn-radar-wrap">
            <div className="mn-radar-score">
              <span className="mn-radar-num">{scoreResult.overall}</span>
              <span className="mn-radar-denom">/100</span>
            </div>
            <p className="mn-radar-sub">상위 28%</p>
            <RadarChart axes={radarAxes} />
          </div>
        </div>

        {/* 학과 랭킹 TOP 5 */}
        <div className="mn-body-card">
          <div className="mn-body-card-head">
            <h2 className="mn-body-card-title">학과 랭킹 TOP 5</h2>
          </div>
          <ul className="mn-rank-list">
            {RANKING.map(r => (
              <li key={r.rank} className="mn-rank-item">
                <span className={`mn-rank-pos${r.rank <= 3 ? ' top' : ''}`}>{r.rank}</span>
                <span className="mn-rank-name">{r.name}</span>
                <span className="mn-rank-xp">{r.xp.toLocaleString()} XP</span>
              </li>
            ))}
          </ul>
          <div className="mn-rank-my">
            <span className="mn-rank-pos me">{MY_RANK.rank}</span>
            <span className="mn-rank-name">{MY_RANK.name} <small>(나)</small></span>
            <span className="mn-rank-my-pos">{MY_RANK.rank} / {MY_RANK.total}위</span>
          </div>
          <button className="mn-more-btn" onClick={() => setRankOpen(true)}>학과 전체 순위 보기</button>
        </div>

        {/* 이번 주 출석 체크 */}
        <div className="mn-body-card">
          <div className="mn-body-card-head">
            <h2 className="mn-body-card-title">이번 주 출석 체크</h2>
          </div>
          <div className="mn-att-wrap">
            <div className="mn-att-streak">
              <span className="mn-att-streak-num">7</span>
              <span className="mn-att-streak-unit">일 연속</span>
            </div>
            <p className="mn-att-best">최고 기록 <strong>12일</strong></p>
            <div className="mn-att-week">
              {[
                { day: '월', checked: true },
                { day: '화', checked: true },
                { day: '수', checked: true },
                { day: '목', checked: true },
                { day: '금', checked: false },
                { day: '토', checked: false },
                { day: '일', checked: false },
              ].map(d => (
                <div key={d.day} className={`mn-att-day${d.checked ? ' checked' : ''}`}>
                  <span className="mn-att-day-label">{d.day}</span>
                  <span className="mn-att-day-mark">
                    {d.checked
                      ? <i className="fa-solid fa-check" />
                      : <i className="fa-regular fa-circle" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button className="mn-more-btn" onClick={() => navigate('/mypage/attendance')}>출석 기록 보기</button>
        </div>

        {/* 추천 프로그램 + 공지사항 */}
        <div className="mn-body-card">
          <div className="mn-body-card-head">
            <h2 className="mn-body-card-title">추천 프로그램</h2>
          </div>

          {/* Program card */}
          <div className="mn-prog-card">
            <p className="mn-prog-title">AI 면접 전략 특강</p>
            <p className="mn-prog-date">2024.06.01 (토) 14:00</p>
            <button className="mn-prog-btn" onClick={() => navigate('/growth/program')}>신청하기</button>
            <div className="mn-prog-chart">
              <Sparkline points={[10, 30, 20, 50, 40, 70, 60]} color="#ffffff" />
            </div>
          </div>

          {/* 공지사항 */}
          <div className="mn-notice-head">
            <span className="mn-body-card-title">공지사항</span>
            <button className="mn-text-btn">더보기 <i className="fa-solid fa-chevron-right" /></button>
          </div>
          <ul className="mn-notice-list">
            {NOTICES.map((n, i) => (
              <li key={i} className="mn-notice-item">
                <i className="fa-solid fa-plus" />
                <span>{n.label}</span>
                <span className="mn-notice-date">{n.date}</span>
              </li>
            ))}
          </ul>
        </div>

      </section>

      {/* ── 추천 비교과 + AI 추천 채용공고 ───────────────────────── */}
      <section className="mn-ai-section">
        <div className="mn-recommend-grid">

          {/* 추천 비교과 프로그램 */}
          <div className="mn-rec-card">
            <div className="mn-rec-head">
              <h2 className="mn-rec-title">
                <i className="fa-solid fa-clipboard-check" />
                추천 비교과 프로그램
              </h2>
              <button className="mn-text-btn" onClick={() => navigate('/growth/program')}>
                전체 보기 <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
            <ul className="mn-rec-prog-list">
              {RECOMMENDED_PROGRAMS.map(p => (
                <li
                  key={p.id}
                  className="mn-rec-prog-item"
                  onClick={() => navigate(`/growth/program/${p.id}`)}
                >
                  <div className="mn-rec-prog-thumb">
                    <img src={p.image} alt={p.title} />
                  </div>
                  <div className="mn-rec-prog-info">
                    <div className="mn-rec-prog-tags">
                      <span
                        className="mn-rec-prog-cat"
                        style={{
                          background: (CAT_COLORS[p.category] ?? '#6B7280') + '18',
                          color: CAT_COLORS[p.category] ?? '#6B7280',
                        }}
                      >
                        {p.category}
                      </span>
                      <span className={`mn-rec-prog-dday${p.dDay <= 5 ? ' urgent' : ''}`}>
                        D-{p.dDay}
                      </span>
                    </div>
                    <p className="mn-rec-prog-name">{p.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* AI 추천 채용공고 */}
          <div className="mn-rec-card">
            <div className="mn-rec-head">
              <h2 className="mn-rec-title">
                <i className="fa-solid fa-briefcase" />
                AI 추천 채용공고
              </h2>
              <button className="mn-text-btn" onClick={() => navigate('/jobs')}>
                전체 보기 <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
            <ul className="mn-rec-job-list">
              {RECOMMENDED_JOBS.map(j => (
                <li
                  key={j.id}
                  className="mn-rec-job-item"
                  onClick={() => navigate('/jobs')}
                >
                  <div
                    className="mn-rec-job-logo"
                    style={{ background: j.color, color: j.textColor ?? '#fff' }}
                  >
                    {j.initial}
                  </div>
                  <div className="mn-rec-job-info">
                    <p className="mn-rec-job-company">
                      {j.company}
                      {j.urgent && <span className="mn-job-badge mn-job-badge--urgent">마감임박</span>}
                      {j.hot && <span className="mn-job-badge mn-job-badge--hot">HOT</span>}
                    </p>
                    <p className="mn-rec-job-role">{j.role} · {j.deadline}</p>
                  </div>
                  <div className={`mn-rec-job-match${j.match >= 85 ? ' high' : ''}`}>
                    <strong>{j.match}</strong>
                    <span>%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="mn-footer">
        <div className="mn-footer-inner">
          <div className="mn-footer-brand">
            <div className="mn-footer-logo">CWNU</div>
            <p className="mn-footer-school">국립창원대학교</p>
          </div>

          <div className="mn-footer-info">
            <p className="mn-footer-line">
              <span className="mn-footer-label">E-MAIL</span>
              <span>:</span>
              <a href="mailto:cwjob@changwon.ac.kr">cwjob@changwon.ac.kr</a>
            </p>
            <p className="mn-footer-line">
              51140) 경상남도 창원시 의창구 창원대학로 20
            </p>
            <p className="mn-footer-line mn-footer-copy">
              <span>COPYRIGHT</span>
              <span>CHANGWON NATIONAL UNIVERSITY. ALL RIGHTS RESERVED.</span>
            </p>
            <ul className="mn-footer-links">
              <li>
                <a href="#privacy">
                  개인정보처리방침
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                </a>
              </li>
              <li>
                <a href="#email-reject">
                  이메일무단수집거부
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* 학과 전체 순위 모달 (TOP5 이후 순위까지) */}
      <Modal open={rankOpen} onClose={() => setRankOpen(false)} title="학과 전체 순위" size="sm">
        <ul className="mn-rank-modal-list">
          {RANKING_FULL.map(r => (
            <li
              key={r.rank}
              className={`mn-rank-modal-item${'me' in r && r.me ? ' me' : ''}`}
            >
              <span className={`mn-rank-pos${r.rank <= 3 ? ' top' : ''}${'me' in r && r.me ? ' me' : ''}`}>{r.rank}</span>
              <span className="mn-rank-name">
                {r.name}{'me' in r && r.me && <small> (나)</small>}
              </span>
              <span className="mn-rank-xp">{r.xp.toLocaleString()} XP</span>
            </li>
          ))}
        </ul>
        <p className="mn-rank-modal-foot">
          전체 {MY_RANK.total}명 중 현재 <strong>{MY_RANK.rank}위</strong>입니다.
        </p>
      </Modal>

    </div>
  )
}
