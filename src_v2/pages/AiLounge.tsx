import { Link } from 'react-router-dom'
import './AiLounge.css'

// ── Mock Data ──────────────────────────────────────────────────────
const userStats = [
  { icon: 'fa-solid fa-clipboard-check', label: '진단 결과',  value: '85',   unit: '점' },
  { icon: 'fa-solid fa-chart-line',       label: '역량 분석',  value: '72',   unit: '점' },
  { icon: 'fa-solid fa-graduation-cap',   label: '학점 분석',  value: '3.68', unit: '/ 4.5' },
  { icon: 'fa-solid fa-id-card',          label: '자격증',     value: '2',    unit: '개' },
  { icon: 'fa-solid fa-comments',         label: '상담 내역',  value: '3',    unit: '회' },
]

const radarAxes = [
  { label: '전문 역량', user: 88, target: 90 },
  { label: '실무 역량', user: 78, target: 90 },
  { label: '실행 역량', user: 76, target: 90 },
  { label: '성장 역량', user: 65, target: 90 },
  { label: '인성 역량', user: 82, target: 90 },
  { label: '취업 역량', user: 70, target: 90 },
]

const competencyBars = [
  { label: '전문 역량', value: 88 },
  { label: '실무 역량', value: 78 },
  { label: '실행 역량', value: 76 },
  { label: '인성 역량', value: 82 },
  { label: '취업 역량', value: 70 },
  { label: '성장 역량', value: 65 },
]

const nextActions = [
  { num: 1, text: 'TOEIC 응시 ~ 목표 700+ (어학 미등록)',           color: '#EF4444' },
  { num: 2, text: 'PMP 기초 자격증 취득 준비 (PM역량 +15점)',        color: '#F59E0B' },
  { num: 3, text: '캡스톤 디자인 프로젝트 등록 (프로젝트 경험 보강)', color: '#2E5BFF' },
  { num: 4, text: 'AI 로드맵 확인 및 다음 단계 계획',                 color: '#2E5BFF' },
]

const quickLinks = [
  { icon: 'fa-solid fa-route',    label: 'AI 로드맵',  path: '/roadmap/ai',        iconColor: '#6B7280', bg: '#F3F4F6' },
  { icon: 'fa-solid fa-folder',   label: '프로그램 신청', path: '/growth/program', iconColor: '#2E5BFF', bg: '#EEF2FF' },
  { icon: 'fa-solid fa-briefcase',label: '경력관리',   path: '/growth/journal',    iconColor: '#2E5BFF', bg: '#EEF2FF' },
  { icon: 'fa-solid fa-id-badge', label: '포트폴리오', path: '/mypage/portfolio',  iconColor: '#2E5BFF', bg: '#EEF2FF' },
]

const counselHistory = [
  { type: '진로/취업 상담', date: '2025.04.10 · 김미래 상담사', quote: '"학과와 맞는 것 같아서 진로에 대한 고민이 드는 중"', dotColor: '#F59E0B', icon: 'fa-solid fa-comments' },
  { type: 'AI 조언',       date: '2025.04.10',                  quote: '진로 적합성에 대한 고민은 매우 자연스러운 탐색 과정입니다...', dotColor: '#2E5BFF', icon: 'fa-solid fa-robot' },
  { type: '심리 상담',     date: '2025.04.12 · 박지은 상담사',  quote: '"최근 이별로 인 상태로 학업과 진로에 집중을 하지 못하는 모습"', dotColor: '#8B5CF6', icon: 'fa-solid fa-heart-pulse' },
  { type: 'AI 위로 & 조언', date: '',                           quote: '힘든 시기를 보내고 계시군요. 감정이 흔들릴 때 학업에 집중하기 어려운 것은 당연해요...', dotColor: '#2E5BFF', icon: 'fa-solid fa-robot' },
]

const programs = [
  { title: '취업역량강화 캠프',     hours: '40시간 이수', badge: '취업',   badgeColor: '#0EA5E9', guide: 86, comment: '실전 모의면접과 기업 방문을 통한 취업 준비 역량을 크게 강화할 수 있어요.' },
  { title: 'AI 활용 자소서 특강',   hours: '3시간 이수',  badge: 'AI',     badgeColor: '#8B5CF6', guide: 78, comment: 'AI 도구를 활용한 자소서 작성법을 배워 경쟁력 있는 자소서를 완성해보세요.' },
  { title: '창업아이디어 경진대회', hours: '16시간 이수', badge: '창업',   badgeColor: '#F59E0B', guide: 70, comment: '아이디어 발굴부터 발표까지 경험하며 창의적 문제해결 역량이 향상돼요.' },
  { title: '데이터 분석 기초',      hours: '12시간 이수', badge: '전공',   badgeColor: '#0D8B7C', guide: 72, comment: '전공 역량을 실무 데이터 분석에 연결해 응용력을 키울 수 있어요.' },
  { title: '멘토링 프로그램',       hours: '8시간 이수',  badge: '멘토링', badgeColor: '#10B981', guide: 68, comment: '현직 멘토와의 교류를 통해 진로 방향을 구체화하고 실무 인사이트를 얻어요.' },
]

// ── Radar Chart (SVG) ──────────────────────────────────────────────
const CX = 150, CY = 150, R = 80

function getRadarPoint(i: number, r: number) {
  const angle = (i * 60 - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function toPolygon(values: number[]) {
  return values.map((v, i) => {
    const p = getRadarPoint(i, (v / 100) * R)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')
}

function RadarChart() {
  const userPoly   = toPolygon(radarAxes.map(a => a.user))
  const targetPoly = toPolygon(radarAxes.map(a => a.target))

  return (
    <svg viewBox="0 0 300 300" width="100%" height="220" style={{ overflow: 'visible' }}>
      {/* Grid hexagons */}
      {[25, 50, 75, 100].map(pct => (
        <polygon
          key={pct}
          points={Array.from({ length: 6 }, (_, i) => {
            const p = getRadarPoint(i, (pct / 100) * R)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          }).join(' ')}
          fill="none"
          stroke="#E8ECF0"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getRadarPoint(i, R)
        return <line key={i} x1={CX} y1={CY} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#E8ECF0" strokeWidth="1" />
      })}

      {/* Target polygon */}
      <polygon points={targetPoly} fill="rgba(46,91,255,0.05)" stroke="#2E5BFF" strokeWidth="1.5" strokeDasharray="5 3" />

      {/* User polygon */}
      <polygon points={userPoly} fill="rgba(46,91,255,0.18)" stroke="#2E5BFF" strokeWidth="2" />

      {/* User dots */}
      {radarAxes.map((a, i) => {
        const p = getRadarPoint(i, (a.user / 100) * R)
        return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill="#2E5BFF" />
      })}

      {/* Labels */}
      {radarAxes.map((a, i) => {
        const p = getRadarPoint(i, R + 22)
        const anchor = i === 0 || i === 3 ? 'middle' : i === 1 || i === 2 ? 'start' : 'end'
        return (
          <text key={i} x={p.x.toFixed(1)} y={p.y.toFixed(1)}
            textAnchor={anchor} dominantBaseline="middle"
            fontSize="11" fill="#637381" fontFamily="Pretendard, sans-serif">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Ring Chart (SVG) ───────────────────────────────────────────────
function RingChart({ value, max }: { value: number; max: number }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const filled = (value / max) * circ
  return (
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#E8ECF0" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#2E5BFF" strokeWidth="10"
        strokeDasharray={`${filled.toFixed(1)} ${circ.toFixed(1)}`}
        strokeLinecap="round" transform="rotate(-90 60 60)" />
      <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1C2442" fontFamily="Pretendard, sans-serif">{value}</text>
      <text x="60" y="70" textAnchor="middle" fontSize="11" fill="#99A1A9" fontFamily="Pretendard, sans-serif">/100</text>
    </svg>
  )
}

// ── Page ───────────────────────────────────────────────────────────
export default function AiLounge() {
  return (
    <div className="al-page">

      {/* Breadcrumb */}
      <div className="al-breadcrumb">
        <i className="fa-solid fa-house" />
        <span>AI 커리어 라운지</span>
      </div>

      {/* Profile Card */}
      <div className="al-profile-card">
        <div className="al-profile-user">
          <div className="al-avatar-box">
            <i className="fa-solid fa-user" />
          </div>
          <div className="al-profile-info">
            <div className="al-profile-name">김채원</div>
            <div className="al-profile-dept">컴퓨터공학과 3학년</div>
            <span className="al-lv-badge">Lv. 23</span>
          </div>
        </div>

        <div className="al-profile-sep" />

        <div className="al-stats-row">
          {userStats.map((s, i) => (
            <div key={i} className="al-stat">
              <i className={`${s.icon} al-stat-icon`} />
              <span className="al-stat-label">{s.label}</span>
              <div className="al-stat-val">
                <strong>{s.value}</strong>
                <span>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────── */}
      <div className="al-main-grid">

        {/* Left: two cards side by side */}
        <div className="al-left-col">
          <div className="al-analysis-row">

            {/* 종합 분석 리포트 */}
            <div className="card al-report-card">
              <div className="card-title">종합 분석 리포트</div>
              <div className="al-card-sub">AI가 분석한 당신의 종합 평가</div>
              <div className="al-score-row">
                <span className="al-score-num">72</span>
                <span className="al-score-denom">/100</span>
              </div>
              <div className="al-prog-track">
                <div className="al-prog-fill" style={{ width: '72%' }} />
              </div>
              <div className="al-report-3col">
                <div className="al-rcol">
                  <div className="al-rcol-title"><i className="fa-solid fa-star" /> 강점</div>
                  {['문제해결 능력이 우수해요','전공 역량이 탄탄해요','성장 가능성이 높아요'].map((t,i)=>(
                    <div key={i} className="al-bullet"><i className="fa-solid fa-check" />{t}</div>
                  ))}
                </div>
                <div className="al-rcol">
                  <div className="al-rcol-title"><i className="fa-solid fa-star" /> 보완이 필요한 역량</div>
                  {['실무 경험을 더 쌓아보세요','프로젝트 경험이 부족해요','커뮤니케이션 능력 향상 필요'].map((t,i)=>(
                    <div key={i} className="al-bullet"><i className="fa-solid fa-check" />{t}</div>
                  ))}
                </div>
                <div className="al-rcol">
                  <div className="al-rcol-title"><i className="fa-solid fa-check" /> 맞춤 추천</div>
                  {['데이터 분석 프로젝트 경험 기획','기업 멘토링 프로그램','프레젠테이션 스킬 향상'].map((t,i)=>(
                    <div key={i} className="al-bullet"><i className="fa-solid fa-check" />{t}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* 역량 비교 분석 */}
            <div className="card al-radar-card">
              <div className="card-title">역량 비교 분석</div>
              <div className="al-card-sub">목표 기업 합격자 평균</div>
              <div className="al-radar-legend">
                <span className="al-leg-item"><span className="al-leg-line al-leg-solid"/>나의 역량</span>
                <span className="al-leg-item"><span className="al-leg-line al-leg-dash"/>목표 기업 합격자 평균</span>
              </div>
              <RadarChart />
            </div>

          </div>
        </div>

        {/* Right Sidebar */}
        <div className="al-right-sidebar">

          {/* 우선순위 요약 */}
          <div className="card">
            <div className="card-title">우선순위 요약</div>
            <div className="al-priority-list">
              <div className="al-pri-item">
                <span className="al-pri-dot" style={{ background:'#EF4444' }}/>
                <span className="al-pri-label">긴급 (High)</span>
                <span className="al-pri-cnt" style={{ color:'#EF4444' }}>2개</span>
              </div>
              <div className="al-pri-item">
                <span className="al-pri-dot" style={{ background:'#99A1A9' }}/>
                <span className="al-pri-label">보통 (Medium)</span>
                <span className="al-pri-cnt">1개</span>
              </div>
              <div className="al-pri-item">
                <span className="al-pri-dot" style={{ background:'#D1D5DB' }}/>
                <span className="al-pri-label">낮음 (Low)</span>
                <span className="al-pri-cnt">1개</span>
              </div>
            </div>
          </div>

          {/* 추천 다음 행동 */}
          <div className="card">
            <div className="card-title">추천 다음 행동</div>
            <div className="al-action-list">
              {nextActions.map((a,i)=>(
                <div key={i} className="al-action-item">
                  <span className="al-action-num" style={{ background:a.color }}>{a.num}</span>
                  <span className="al-action-txt">{a.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="card">
            <div className="card-title">빠른 이동</div>
            <div className="al-quick-list">
              {quickLinks.map((q,i)=>(
                <Link key={i} to={q.path} className="al-quick-item">
                  <span className="al-quick-ico" style={{ background:q.bg, color:q.iconColor }}>
                    <i className={q.icon}/>
                  </span>
                  <span className="al-quick-lbl">{q.label}</span>
                  <i className="fa-solid fa-chevron-right al-quick-arr"/>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom Grid ───────────────────────────────────────────── */}
      <div className="al-bottom-grid">

        {/* AI 역량별 상세 분석 */}
        <div className="card">
          <div className="al-row-hd">
            <div className="card-title" style={{marginBottom:0}}>
              <i className="fa-solid fa-chart-bar"/> AI 역량별 상세 분석
            </div>
            <Link to="/roadmap/ai" className="al-more-link">상세 보기 →</Link>
          </div>
          <div className="al-bar-list">
            {competencyBars.map((b,i)=>(
              <div key={i} className="al-bar-row">
                <span className="al-bar-lbl">{b.label}</span>
                <div className="al-bar-track">
                  <div className="al-bar-fill" style={{ width:`${b.value}%` }}/>
                </div>
                <span className="al-bar-val">{b.value}점</span>
              </div>
            ))}
          </div>
          <div className="al-ai-box">
            <i className="fa-solid fa-robot"/>
            <span>전문 역량과 인성 역량이 강점으로 나타났어요. 실무 경험과 실행 역량을 보완하면 더 큰 성장을 이룰 수 있어요.</span>
          </div>
        </div>

        {/* 진단 결과 AI 인사이트 */}
        <div className="card">
          <div className="al-row-hd">
            <div className="card-title" style={{marginBottom:0}}>진단 결과 AI 인사이트</div>
            <Link to="/diagnosis/employment" className="al-more-link">상세 보기 →</Link>
          </div>
          <div className="al-insight-row">
            <div className="al-ring-col">
              <RingChart value={85} max={100}/>
              <span className="al-ring-sub">종합 점수</span>
            </div>
            <div className="al-insight-info">
              <div className="al-ins-sub">진단 요약</div>
              <p className="al-ins-txt">전반적으로 우수한 수준이에요, 특히 전공 지식과 문제해결 능력이 강점으로 나타나고 있어요.</p>
              <div className="al-ins-sub">강점</div>
              <div className="al-chips">
                {['전공 지식','문제해결','학습 태도'].map(t=>(
                  <span key={t} className="al-chip al-chip-s">{t}</span>
                ))}
              </div>
              <div className="al-ins-sub">보완 필요</div>
              <div className="al-chips">
                {['실무 경험','커뮤니케이션'].map(t=>(
                  <span key={t} className="al-chip al-chip-w">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 최근 상담 내역 */}
        <div className="card">
          <div className="al-row-hd">
            <div className="card-title" style={{marginBottom:0}}>최근 상담 내역</div>
            <Link to="/mypage/counsel" className="al-more-link">전체 보기 →</Link>
          </div>
          <div className="al-counsel-list">
            {counselHistory.map((c,i)=>(
              <div key={i} className="al-counsel-item">
                <div className="al-counsel-ico" style={{ background:c.dotColor+'18', color:c.dotColor }}>
                  <i className={c.icon}/>
                </div>
                <div className="al-counsel-body">
                  <div className="al-counsel-top">
                    <span className="al-counsel-type">{c.type}</span>
                    {c.date && <span className="al-counsel-date">{c.date}</span>}
                  </div>
                  <p className="al-counsel-quote">{c.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Programs Section ──────────────────────────────────────── */}
      <div className="al-programs-section">
        <div className="al-sec-hd">
          <span className="al-sec-title">추천 비교과 프로그램</span>
          <Link to="/growth/program" className="al-more-link">전체 보기 →</Link>
        </div>
        <div className="al-programs-grid">
          {programs.map((p,i)=>(
            <div key={i} className="card al-prog-card">
              <div className="al-prog-top">
                <span className="al-prog-title">{p.title}</span>
                <span className="al-prog-badge" style={{ background:p.badgeColor+'18', color:p.badgeColor }}>{p.badge}</span>
              </div>
              <div className="al-prog-meta">
                <span><i className="fa-regular fa-clock"/> {p.hours}</span>
                <span className="al-prog-guide"><i className="fa-solid fa-robot"/> 가이드 {p.guide}%</span>
              </div>
              <div className="al-ai-box al-prog-comment">
                <i className="fa-solid fa-robot"/>
                <span>{p.comment}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
