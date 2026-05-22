import { useNavigate } from 'react-router-dom'
import './Main.css'

/* ── Mock Data ─────────────────────────────────────────────────── */
const RANKING = [
  { rank: 1, name: '박지민', xp: 2340 },
  { rank: 2, name: '이서연', xp: 2210 },
  { rank: 3, name: '최민수', xp: 2100 },
  { rank: 4, name: '정하늘', xp: 1980 },
  { rank: 5, name: '한도윤', xp: 1920 },
]

const MY_RANK = { rank: 12, total: 45, name: '김채원', xp: 1850 }

const TARGET_METRICS = [
  { label: '학점 (4.3/4.5)', value: 96, low: false },
  { label: 'NCS 역량점수', value: 60, low: false },
  { label: '외국어 (TOEIC 650)', value: 45, low: true },
  { label: '자격증 (SQLD)', value: 80, low: false },
  { label: '프로젝트 경험', value: 35, low: true },
]

const AI_TIPS = [
  '어학성적(TOEIC)이 부족합니다. CARES에서 영어기초 강의부터 시작해보세요.',
  '프로젝트경험(1건)이 부족합니다. 캡스톤디자인이나 팀프로젝트에 참여하세요.',
]

const NOTICES = [
  { label: '2024 하계 현장실습 참여자 모집', date: '05.20' },
  { label: '직무 특강: "빅데이터 개발자 취업 준비"', date: '05.18' },
  { label: 'AI 자소서 첨삭 이벤트 안내', date: '05.17' },
]

const RADAR_AXES = [
  { label: '취업 역량', value: 1.00 },
  { label: '실무 역량', value: 0.30 },
  { label: '실행 역량', value: 0.68 },
  { label: '성장 역량', value: 0.75 },
  { label: '인성 역량', value: 0.88 },
  { label: '진로 역량', value: 0.65 },
]

/* ── Hexagon Radar Chart ───────────────────────────────────────── */
function RadarChart() {
  const cx = 100, cy = 100, r = 72
  const n = RADAR_AXES.length

  const pt = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    }
  }

  const gridLevels = [0.25, 0.5, 0.75, 1.0]
  const dataPoints = RADAR_AXES.map((ax, i) => pt(i, ax.value))
  const dataPath = dataPoints.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'
  const outerPoints = RADAR_AXES.map((_, i) => pt(i, 1.0))
  const outerPath = outerPoints.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'

  return (
    <svg viewBox="0 0 200 200" className="mn-radar-svg">
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
          points={RADAR_AXES.map((_, i) => { const p = pt(i, lv); return `${p.x},${p.y}` }).join(' ')}
          fill="none"
          stroke={lv === 1.0 ? '#A5B4FC' : '#C7D2FE'}
          strokeWidth={lv === 1.0 ? 1.2 : 0.8}
          strokeOpacity={lv === 1.0 ? 0.7 : 0.5}
        />
      ))}

      {/* Axes */}
      {RADAR_AXES.map((_, i) => {
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
      {RADAR_AXES.map((ax, i) => {
        const { x, y } = pt(i, 1.28)
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} fontSize="9.5" fill="#4B5563" fontFamily="Pretendard, sans-serif" fontWeight="500">
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

/* ── Mission Donut (오늘의 미션) — 원호 따라 진해지는 그라데이션 ── */
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
          <span className="text-[26px] font-black text-[#1C2442] leading-none">{value}</span>
          <span className="text-xs font-bold text-[#99A1A9]">/{total}</span>
        </div>
        <span className="mt-1 text-[10px] font-bold tracking-wide text-[#2E5BFF]">완료</span>
      </div>
    </div>
  )
}

/* ── Growth Chart (역량 성장 그래프) — 우상향 차트 ──────────────── */
function GrowthChart() {
  const data = [34, 41, 38, 49, 55, 62, 72]
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
function PassDonut({ value }: { value: number }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)
  return (
    <div className="mn-pass-donut">
      <svg viewBox="0 0 80 80">
        <g transform="rotate(-90 40 40)">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#E6EAF2" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke="#2E5BFF" strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
        </g>
      </svg>
      <div className="mn-pass-donut-text">
        <span className="mn-pass-donut-num">{value}%</span>
        <span className="mn-pass-donut-cap">합격예측</span>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function Main() {
  const navigate = useNavigate()

  const xp = 1250, xpMax = 2000
  const xpPct = (xp / xpMax) * 100

  return (
    <div className="mn-page">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mn-hero">
        <div className="mn-hero-content">
          <div className="mn-greeting">
            <h1 className="mn-greeting-title">안녕하세요, 김채원님! 👋</h1>
            <p className="mn-greeting-sub">오늘도 성장하는 당신을 응원해요!</p>
          </div>

          {/* Stat cards row */}
          <div className="mn-stat-cards">

            {/* Profile card */}
            <div className="mn-stat-card mn-profile-card">
              <div className="mn-avatar-wrap">
                <img className="mn-avatar-photo" src="/student-profile.png" alt="김채원 프로필" />
              </div>
              <div className="mn-profile-body">
                <span className="mn-level-badge">Lv. 23</span>
                <div className="mn-xp-bar-track">
                  <div className="mn-xp-bar-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <p className="mn-xp-label">{xp.toLocaleString()} / {xpMax.toLocaleString()} XP</p>
              </div>
            </div>

            {/* 오늘의 미션 — 홀로그램 원형 그래프 */}
            <div className="mn-stat-card mn-mission-card">
              <p className="mn-sc-label">오늘의 미션</p>
              <div className="flex flex-1 items-center justify-center">
                <MissionDonut value={1} total={5} />
              </div>
              <button className="mn-sc-btn" onClick={() => navigate('/growth/quest')}>
                미션 확인하기
              </button>
            </div>

            {/* 역량 성장 그래프 — 우상향 차트 */}
            <div className="mn-stat-card mn-quest-card">
              <p className="mn-sc-label">역량 성장 그래프</p>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-[30px] font-black leading-none text-[#1C2442]">72</span>
                <span className="text-[11px] font-bold text-[#637381]">점</span>
                <span className="ml-auto flex items-center gap-1 rounded-full bg-[#22C55E]/12 px-2 py-0.5 text-[11px] font-extrabold text-[#16A34A]">
                  <i className="fa-solid fa-arrow-trend-up text-[10px]" />
                  +8
                </span>
              </div>
              <div className="flex flex-1 items-end">
                <GrowthChart />
              </div>
            </div>

            {/* 오늘의 성장미션 */}
            <div className="mn-stat-card mn-daily-card">
              <div className="mn-daily-icon">
                <i className="fa-solid fa-bullseye" />
              </div>
              <p className="mn-sc-label" style={{ marginTop: 8 }}>오늘의 성장미션</p>
              <p className="mn-daily-title">TOEIC 영단어 일일미션</p>
              <p className="mn-daily-desc">오늘의 영단어 10개를 학습하고 퀴즈를 풀어보세요.</p>
              <button className="mn-sc-btn mn-sc-btn--arrow" onClick={() => navigate('/growth/mission')}>
                미션 시작하기 <i className="fa-solid fa-arrow-right" />
              </button>
            </div>

          </div>
        </div>

        {/* Hero image */}
        <div className="mn-hero-img">
          <img src="/v2_main.png" alt="AI Career Platform" />
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
              <span className="mn-radar-num">72</span>
              <span className="mn-radar-denom">/100</span>
            </div>
            <p className="mn-radar-sub">상위 28%</p>
            <RadarChart />
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
          <button className="mn-more-btn" onClick={() => navigate('/growth/quest')}>더보기</button>
        </div>

        {/* 상담 현황 */}
        <div className="mn-body-card">
          <div className="mn-body-card-head">
            <h2 className="mn-body-card-title">상담 현황</h2>
          </div>
          <div className="mn-counsel-wrap">
            <div className="mn-counsel-icon">
              <i className="fa-regular fa-user" />
            </div>
            <p className="mn-counsel-label">누적 상담 횟수</p>
            <p className="mn-counsel-num">3 <span>회</span></p>
            <div className="mn-counsel-divider" />
            <p className="mn-counsel-date-label">최근 상담일</p>
            <p className="mn-counsel-date">2024.05.18</p>
          </div>
          <button className="mn-more-btn" onClick={() => navigate('/mypage/counsel')}>상담 내역 보기</button>
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

      {/* ── 목표 기업·합격분석 ───────────────────────────────── */}
      <section className="mn-ai-section">

        <div className="mn-target-card">
          <div className="mn-target-head">
            <h2 className="mn-target-title">
              <i className="fa-solid fa-bullseye" />
              목표 기업·합격분석
            </h2>
            <button className="mn-text-btn" onClick={() => navigate('/jobs/prediction')}>
              상세 분석 <i className="fa-solid fa-chevron-right" />
            </button>
          </div>

          <div className="mn-target-body">
            <div className="mn-target-main">
              <div className="mn-target-company">
                <div className="mn-target-company-icon">
                  <i className="fa-solid fa-building" />
                </div>
                <div>
                  <p className="mn-target-company-name">두산에너빌리티</p>
                  <p className="mn-target-company-meta">IT · 하드웨어 솔루션 · 7,491명</p>
                </div>
              </div>

              <div className="mn-target-bars">
                {TARGET_METRICS.map(m => (
                  <div key={m.label} className="mn-target-bar-row">
                    <span className="mn-target-bar-label">{m.label}</span>
                    <div className="mn-target-bar-track">
                      <span
                        className={`mn-target-bar-fill${m.low ? ' low' : ''}`}
                        style={{ width: `${m.value}%` }}
                      />
                    </div>
                    <span className="mn-target-bar-pct">{m.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mn-target-donut">
              <PassDonut value={68} />
            </div>
          </div>
        </div>

        <div className="mn-tip-card">
          <div className="mn-tip-head">
            <span className="mn-tip-badge">
              <i className="fa-solid fa-wand-magic-sparkles" />
              AI 코멘트
            </span>
            <h3 className="mn-tip-title">AI 커리어 팁</h3>
          </div>
          <ul className="mn-tip-list">
            {AI_TIPS.map((tip, i) => (
              <li key={i} className="mn-tip-item">
                <i className="fa-solid fa-circle-exclamation" />
                <p>{tip}</p>
              </li>
            ))}
          </ul>
        </div>

      </section>

    </div>
  )
}
