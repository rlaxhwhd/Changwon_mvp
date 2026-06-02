import './GrowthHome.css'

const MISSIONS = [
  { id: 1, label: 'AI 역량 분석 리포트 읽기', xp: 10, icon: 'fa-regular fa-file-lines' },
  { id: 2, label: '이력서 항목 1개 작성하기', xp: 20, icon: 'fa-regular fa-file-lines' },
  { id: 3, label: '면접 질문 연습하기', xp: 30, icon: 'fa-regular fa-square-check' },
]

const ACTIVITIES = [
  { label: 'AI 역량 분석 리포트 읽기', xp: '+10 XP', date: '05.19', icon: 'fa-regular fa-file-lines' },
  { label: '면접 상황 실전 연습', xp: '+20 XP', date: '05.18', icon: 'fa-solid fa-trophy' },
  { label: '성장일지 작성하기', xp: '+10 XP', date: '05.18', icon: 'fa-regular fa-calendar-check' },
  { label: '이력서 항목 1개 작성하기', xp: '+10 XP', date: '05.18', icon: 'fa-regular fa-file-lines' },
]

const GRAPH_POINTS = [9, 29, 46, 40, 64, 66, 84, 86]
const GRAPH_DATES = ['5/13', '5/14', '5/15', '5/16', '5/17', '5/18', '5/19']

function GrowthGraph() {
  const width = 360
  const height = 200
  const left = 42
  const right = 12
  const top = 16
  const bottom = 32
  const chartW = width - left - right
  const chartH = height - top - bottom
  const max = 100
  const points = GRAPH_POINTS.map((value, index) => {
    const x = left + (index * chartW) / (GRAPH_POINTS.length - 1)
    const y = top + chartH - (value / max) * chartH
    return { x, y, value }
  })
  const line = points.map(point => `${point.x},${point.y}`).join(' ')

  return (
    <svg className="gh-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="주간 XP 성장 그래프">
      {[0, 20, 40, 60, 80, 100].map(value => {
        const y = top + chartH - (value / max) * chartH
        return (
          <g key={value}>
            <line x1={left} x2={width - right} y1={y} y2={y} className="gh-chart-grid" />
            <text x={left - 14} y={y + 4} textAnchor="end" className="gh-chart-y">{value}</text>
          </g>
        )
      })}
      <polyline points={line} className="gh-chart-line" />
      {points.map(point => (
        <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" className="gh-chart-dot" />
      ))}
      {GRAPH_DATES.map((date, index) => {
        const x = left + (index * chartW) / (GRAPH_DATES.length - 1)
        return <text key={date} x={x} y={height - 6} textAnchor="middle" className="gh-chart-x">{date}</text>
      })}
    </svg>
  )
}

export default function GrowthHome() {
  return (
    <div className="gh-shell">
      <div className="gh-page">
        <div className="gh-title-row">
          <span className="gh-title-icon"><i className="fa-solid fa-house" /></span>
          <h1>내 성장 (홈 대시보드)</h1>
        </div>

        <section className="gh-dashboard" aria-label="성장 대시보드">
          <div className="gh-column gh-left-column">
            <article className="gh-panel gh-profile">
              <div className="gh-profile-main">
                <div className="gh-avatar">
                  <img className="gh-avatar-photo" src="/student-profile.png" alt="김채원 프로필" />
                </div>
                <div>
                  <h2>김채원</h2>
                  <p>컴퓨터공학과 3학년</p>
                  <span className="gh-level">Lv. 23</span>
                </div>
              </div>
              <div className="gh-progress">
                <span className="gh-progress-bar"><span style={{ width: '62.5%' }} /></span>
                <strong>1,250 / 2,000 XP</strong>
              </div>
            </article>

            <article className="gh-panel gh-weekly">
              <h2>이번 주 목표</h2>
              <p>주간 퀘스트 5개 완료하기</p>
              <div className="gh-weekly-row">
                <span className="gh-progress-bar"><span style={{ width: '60%' }} /></span>
                <strong>3 / 5</strong>
              </div>
            </article>

            <article className="gh-panel gh-graph">
              <div className="gh-panel-head">
                <h2>나의 성장 그래프</h2>
                <div className="gh-tabs" aria-label="그래프 기간">
                  <button>XP</button>
                  <button className="active">주간</button>
                  <button>월간</button>
                  <button>전체</button>
                </div>
              </div>
              <GrowthGraph />
            </article>
          </div>

          <div className="gh-column gh-center-column">
            <article className="gh-panel gh-missions">
              <h2>오늘의 미션</h2>
              <p>매일 성장하는 습관을 만들어보세요!</p>
              <ul className="gh-mission-list">
                {MISSIONS.map(mission => (
                  <li key={mission.id}>
                    <span className="gh-blue-icon"><i className={mission.icon} /></span>
                    <span>{mission.label}</span>
                    <strong>+{mission.xp} XP</strong>
                  </li>
                ))}
              </ul>
              <button className="gh-soft-btn">더보기</button>
            </article>

            <article className="gh-panel gh-quests">
              <div className="gh-panel-head">
                <h2>퀘스트 진행 현황</h2>
                <button className="gh-text-btn">전체 보기 <i className="fa-solid fa-chevron-right" /></button>
              </div>
              <div className="gh-quest-grid">
                <div className="gh-quest">
                  <span className="gh-quest-icon amber"><i className="fa-regular fa-star" /></span>
                  <p>일일 퀘스트</p>
                  <strong>3 <span>/ 3</span></strong>
                </div>
                <div className="gh-quest">
                  <span className="gh-quest-icon blue"><i className="fa-regular fa-calendar-check" /></span>
                  <p>주간 퀘스트</p>
                  <strong>3 <span>/ 5</span></strong>
                </div>
                <div className="gh-quest">
                  <span className="gh-quest-icon teal"><i className="fa-regular fa-calendar-check" /></span>
                  <p>월간 퀘스트</p>
                  <strong>7 <span>/ 12</span></strong>
                </div>
              </div>
            </article>
          </div>

          <div className="gh-column gh-right-column">
            <article className="gh-panel gh-rank">
              <h2>학과 랭킹</h2>
              <p>실시간으로 확인하는 우리 학과 순위</p>
              <div className="gh-rank-body">
                <div>
                  <strong className="gh-rank-num">3</strong>
                  <span className="gh-rank-unit">위</span>
                  <p><b>8%</b> / 상위</p>
                  <button className="gh-pill-btn">상세 보기 <i className="fa-solid fa-chevron-right" /></button>
                </div>
                <div className="gh-trophy" aria-hidden="true">
                  <i className="fa-solid fa-trophy" />
                </div>
              </div>
              <button className="gh-soft-btn">랭킹 더보기</button>
            </article>

            <article className="gh-panel gh-activity">
              <h2>최근 활동</h2>
              <ul>
                {ACTIVITIES.map(activity => (
                  <li key={`${activity.label}-${activity.date}`}>
                    <span className="gh-activity-icon"><i className={activity.icon} /></span>
                    <span>{activity.label}</span>
                    <strong>{activity.xp}</strong>
                    <time>{activity.date}</time>
                  </li>
                ))}
              </ul>
              <button className="gh-soft-btn">더보기</button>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}
