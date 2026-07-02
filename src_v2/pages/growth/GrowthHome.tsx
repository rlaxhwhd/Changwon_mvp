import { useState } from 'react'
import Modal from '../../components/Modal'
import { getActiveStudent } from '../../data/students'


import './GrowthHome.css'

// QuestBoard 일일 퀘스트와 동기화 (src_v2/pages/growth/QuestBoard.tsx daily)
const MISSIONS = [
  { id: 1, label: '토익 영단어 10문제 학습하기', xp: 20, icon: 'fa-solid fa-book-open' },
  { id: 2, label: '성장일지 1개 기록하기',       xp: 10, icon: 'fa-solid fa-pen-to-square' },
  { id: 3, label: '채용공고 리스트 확인하기',     xp: 10, icon: 'fa-solid fa-briefcase' },
]

const ACTIVITIES = [
  { label: 'AI 역량 분석 리포트 읽기', xp: '+10 XP', date: '05.19', icon: 'fa-regular fa-file-lines' },
  { label: '면접 상황 실전 연습', xp: '+20 XP', date: '05.18', icon: 'fa-solid fa-trophy' },
  { label: '성장일지 작성하기', xp: '+10 XP', date: '05.18', icon: 'fa-regular fa-calendar-check' },
  { label: '이력서 항목 1개 작성하기', xp: '+10 XP', date: '05.18', icon: 'fa-regular fa-file-lines' },
]

// 전체 활동 — '더보기' 모달에서 노출 (최근 → 과거)
const ALL_ACTIVITIES = [
  ...ACTIVITIES,
  { label: '비교과 프로그램 신청',         xp: '+15 XP', date: '05.17', icon: 'fa-solid fa-clipboard-list' },
  { label: 'AI 진로 로드맵 확인',          xp: '+10 XP', date: '05.17', icon: 'fa-solid fa-route' },
  { label: 'TOEIC 영단어 10문제 학습',     xp: '+20 XP', date: '05.16', icon: 'fa-solid fa-book-open' },
  { label: '주간 퀘스트 완료',             xp: '+30 XP', date: '05.16', icon: 'fa-solid fa-list-check' },
  { label: '진단검사 결과 확인',           xp: '+5 XP',  date: '05.15', icon: 'fa-solid fa-chart-simple' },
  { label: '캡스톤 프로젝트 회의 참여',     xp: '+15 XP', date: '05.15', icon: 'fa-solid fa-people-group' },
  { label: '성장일지 작성하기',            xp: '+10 XP', date: '05.14', icon: 'fa-regular fa-calendar-check' },
  { label: 'AI 자소서 첨삭 받기',          xp: '+20 XP', date: '05.14', icon: 'fa-solid fa-wand-magic-sparkles' },
  { label: '진로 상담 신청',               xp: '+15 XP', date: '05.13', icon: 'fa-solid fa-headset' },
  { label: '스킬트리 직무 방향 설정',       xp: '+10 XP', date: '05.13', icon: 'fa-solid fa-sitemap' },
]

// 학과 랭킹 — 우리 학과(3위) 포함 전체
const DEPT_RANKING = [
  { rank: 1, name: '전자공학과',     xp: 5234, members: 30, isMe: false },
  { rank: 2, name: '기계공학과',     xp: 4890, members: 28, isMe: false },
  { rank: 3, name: '컴퓨터공학과',   xp: 4560, members: 25, isMe: true  },
  { rank: 4, name: '화학공학과',     xp: 4120, members: 22, isMe: false },
  { rank: 5, name: '산업공학과',     xp: 3950, members: 24, isMe: false },
  { rank: 6, name: '환경공학과',     xp: 3640, members: 20, isMe: false },
  { rank: 7, name: '신소재공학과',   xp: 3380, members: 19, isMe: false },
  { rank: 8, name: '건축공학과',     xp: 3150, members: 21, isMe: false },
  { rank: 9, name: '토목공학과',     xp: 2890, members: 18, isMe: false },
  { rank:10, name: '경영학과',       xp: 2780, members: 26, isMe: false },
  { rank:11, name: '경제학과',       xp: 2540, members: 20, isMe: false },
  { rank:12, name: '국어국문학과',   xp: 2310, members: 17, isMe: false },
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
  const me = getActiveStudent()
  const [rankOpen, setRankOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const totalActivityXp = ALL_ACTIVITIES.reduce((sum, a) => sum + parseInt(a.xp.replace(/[^\d]/g, ''), 10), 0)
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
                  <img className="gh-avatar-photo" src="/student-profile.png" alt={`${me.name} 프로필`} />
                </div>
                <div>
                  <h2>{me.name}</h2>
                  <p>{me.major} {me.grade}학년</p>
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
              <h2>오늘의 퀘스트</h2>
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
                  <span className="gh-quest-icon teal"><i className="fa-regular fa-calendar-check" /></span>
                  <p>월간 퀘스트</p>
                  <strong>7 <span>/ 12</span></strong>
                </div>
                <div className="gh-quest">
                  <span className="gh-quest-icon blue"><i className="fa-regular fa-calendar-check" /></span>
                  <p>학기 퀘스트</p>
                  <strong>3 <span>/ 5</span></strong>
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
                </div>
                <div className="gh-trophy" aria-hidden="true">
                  <i className="fa-solid fa-trophy" />
                </div>
              </div>
              <button className="gh-soft-btn" onClick={() => setRankOpen(true)}>랭킹 더보기</button>
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
              <button className="gh-soft-btn" onClick={() => setActivityOpen(true)}>더보기</button>
            </article>
          </div>
        </section>
      </div>

      {/* 학과 랭킹 모달 — 우리 학과 강조 */}
      <Modal
        open={rankOpen}
        onClose={() => setRankOpen(false)}
        title="학과 랭킹 전체"
        size="md"
      >
        <ul className="gh-rank-modal-list">
          {DEPT_RANKING.map(dept => (
            <li key={dept.rank} className={`gh-rank-modal-item${dept.isMe ? ' me' : ''}`}>
              <span className={`gh-rank-modal-pos${dept.rank <= 3 ? ' top' : ''}${dept.isMe ? ' me' : ''}`}>
                {dept.rank}
              </span>
              <div className="gh-rank-modal-info">
                <strong>{dept.name}{dept.isMe && <span className="gh-rank-modal-me-chip">우리 학과</span>}</strong>
                <span>참여 {dept.members}명</span>
              </div>
              <span className="gh-rank-modal-xp">{dept.xp.toLocaleString()} XP</span>
            </li>
          ))}
        </ul>
        <p className="gh-rank-modal-note">
          매주 월요일 00:00 기준으로 갱신됩니다.
        </p>
      </Modal>

      {/* XP 활동 전체 모달 */}
      <Modal
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title="XP 활동 전체 기록"
        size="md"
      >
        <div className="gh-act-modal-summary">
          <div>
            <small>누적 XP</small>
            <strong>+{totalActivityXp} XP</strong>
          </div>
          <div>
            <small>활동 수</small>
            <strong>{ALL_ACTIVITIES.length}건</strong>
          </div>
        </div>
        <ul className="gh-act-modal-list">
          {ALL_ACTIVITIES.map((activity, i) => (
            <li key={`${activity.label}-${activity.date}-${i}`}>
              <span className="gh-activity-icon"><i className={activity.icon} /></span>
              <div className="gh-act-modal-text">
                <strong>{activity.label}</strong>
                <time>{activity.date}</time>
              </div>
              <span className="gh-act-modal-xp">{activity.xp}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
