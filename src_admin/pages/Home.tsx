import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  getDashboardData,
  getTrafficSeries,
  diagnosisPercent,
} from '../data/dashboard'
import type { TrafficRange } from '../data/dashboard'
import { getRosterTotal } from '../data/studentRoster'
import EmptyState from '../components/EmptyState'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
)

/* index.css 토큰 → 차트 리터럴 매핑 (Chart.js는 CSS 변수를 못 읽어 값으로 전달).
   새 색 발명 없이 design.md 팔레트/그래디언트 값만 사용한다. */
const C = {
  primary: '#0653B6', // --color-primary
  primaryLight: '#4A90FF', // --color-primary-light
  primaryBg: '#EAF1FF', // --color-primary-bg
  textSecondary: '#4D5B74', // --color-text-secondary
  border: '#E6ECF5', // --color-border
  grid: 'rgba(230, 236, 245, .8)', // --color-border 파생
}

/* 도넛 4세그먼트 — design.md Charts gradient(royal-blue) 명도 단계(진→연)
   #0653B6 → #3D8BFF → #78BFFF → 파생 연청 */
const DONUT_COLORS = ['#0653B6', '#3D8BFF', '#78BFFF', '#A8CBFF']

const RANGE_TABS: { key: TrafficRange; label: string }[] = [
  { key: 'daily', label: '일간' },
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
]

const KRW = new Intl.NumberFormat('ko-KR')

/** 증감 표기 — percent면 "5.2%", count면 "4개" 형태 */
function formatDelta(value: number, unit: 'percent' | 'count'): string {
  return unit === 'percent' ? `${value}%` : `${KRW.format(value)}개`
}

/** 공지 태그별 색칩 클래스 */
function noticeTagClass(tag: string): string {
  switch (tag) {
    case '채용':
      return 'admin-notice-tag tag-job'
    case '프로그램':
      return 'admin-notice-tag tag-program'
    case '시스템':
      return 'admin-notice-tag tag-system'
    default:
      return 'admin-notice-tag tag-all'
  }
}

export default function Home() {
  // ── 데이터는 전부 로더에서 구독 (컴포넌트 하드코딩 금지) ──────────────────
  const data = getDashboardData()
  // '전체 학생' 카드 값은 학생 로스터(단일 소스) 실제 건수로 대체
  const rosterTotal = getRosterTotal()
  const stats = data.stats.map(s =>
    s.id === 'students' ? { ...s, value: rosterTotal, deltaLabel: '로스터 기준' } : s,
  )

  const [range, setRange] = useState<TrafficRange>('monthly')
  const series = getTrafficSeries(range)

  const hasTraffic = series.labels.length > 0
  const hasDiagnosis = data.diagnosis.segments.length > 0

  const lineData = {
    labels: series.labels,
    datasets: [
      {
        label: '학생 상담 건수',
        data: series.counsels,
        borderColor: C.primary,
        // design.md Charts gradient(royal-blue)로 영역 채움 — 위(진)→아래(투명)
        backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }) => {
          const { chartArea } = ctx.chart
          if (!chartArea) return C.primaryBg
          const g = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          g.addColorStop(0, 'rgba(61, 139, 255, .28)') // #3D8BFF
          g.addColorStop(1, 'rgba(120, 191, 255, .02)') // #78BFFF
          return g
        },
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: C.primary,
        pointBorderWidth: 2,
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: C.primary,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Pretendard, sans-serif', size: 12 },
        bodyFont: { family: 'Pretendard, sans-serif', size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'Pretendard, sans-serif', size: 12 },
          color: C.textSecondary,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { family: 'Pretendard, sans-serif', size: 11 },
          color: C.textSecondary,
        },
        grid: { color: C.grid },
        border: { display: false },
      },
    },
  }

  const donutData = {
    labels: data.diagnosis.segments.map(s => s.label),
    datasets: [
      {
        data: data.diagnosis.segments.map(s => s.value),
        backgroundColor: DONUT_COLORS,
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 4,
      },
    ],
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: C.primary,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Pretendard, sans-serif', size: 12 },
        bodyFont: { family: 'Pretendard, sans-serif', size: 12 },
      },
    },
  }

  return (
    <div className="admin-page">
      {/* ── 페이지 헤더 ─────────────────────────────────────── */}
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">대시보드</h1>
          <p className="admin-page-desc">학생포털 운영 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="admin-dash-head-actions">
          <span className="admin-date-pill">
            <i className="fa-regular fa-calendar" />
            {data.period}
          </span>
          <Link to="/counsel/requests" className="admin-btn admin-btn-primary">
            <i className="fa-solid fa-plus" /> 빠른 등록
          </Link>
        </div>
      </header>

      {/* ── 통계 카드 6개 ───────────────────────────────────── */}
      <section className="admin-kpi-grid">
        {stats.map(stat => (
          <div key={stat.id} className="admin-kpi-card">
            <div className="admin-kpi-body">
              <span className="admin-kpi-label">{stat.label}</span>
              <span className="admin-kpi-value">
                {KRW.format(stat.value)}
                <em>{stat.unit}</em>
              </span>
              <span
                className={`admin-kpi-delta ${
                  stat.deltaDir === 'up' ? 'is-up' : 'is-down'
                }`}
              >
                <i
                  className={`fa-solid ${
                    stat.deltaDir === 'up' ? 'fa-arrow-up' : 'fa-arrow-down'
                  }`}
                />
                {formatDelta(stat.deltaValue, stat.deltaUnit)}
                <small>{stat.deltaLabel}</small>
              </span>
            </div>
            <span className={`admin-kpi-icon tone-${stat.tone}`}>
              <i className={stat.icon} />
            </span>
          </div>
        ))}
      </section>

      {/* ── 하단 3영역 ──────────────────────────────────────── */}
      <div className="admin-dash-grid">
        {/* 좌 (wide) — 학생 상담 현황 (단일 시리즈) */}
        <section className="admin-card admin-dash-traffic">
          <div className="admin-card-head">
            <h2>
              <i className="fa-solid fa-chart-line" /> 학생 상담 현황
            </h2>
            <div className="admin-range-toggle">
              {RANGE_TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`admin-range-btn ${range === t.key ? 'active' : ''}`}
                  onClick={() => setRange(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {hasTraffic ? (
            <div className="admin-chart-box">
              <Line data={lineData} options={lineOptions} />
            </div>
          ) : (
            <EmptyState icon="fa-solid fa-chart-line" message="표시할 학생 상담 데이터가 없습니다." />
          )}
        </section>

        {/* 중 — 진단 참여 현황 (도넛) */}
        <section className="admin-card admin-dash-diagnosis">
          <div className="admin-card-head">
            <h2>
              <i className="fa-solid fa-chart-pie" /> 진단 참여 현황
            </h2>
          </div>
          {hasDiagnosis ? (
            <>
              <div className="admin-donut-wrap">
                <div className="admin-donut-box">
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="admin-donut-center">
                    <small>전체</small>
                    <strong>{KRW.format(data.diagnosis.total)}명</strong>
                  </div>
                </div>
              </div>
              <ul className="admin-donut-legend">
                {data.diagnosis.segments.map((seg, i) => (
                  <li key={seg.label}>
                    <span
                      className="admin-legend-dot"
                      style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="admin-legend-name">{seg.label}</span>
                    <span className="admin-legend-figs">
                      {KRW.format(seg.value)}명
                      <em>({diagnosisPercent(seg, data.diagnosis.total)}%)</em>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState icon="fa-solid fa-chart-pie" message="진단 참여 데이터가 없습니다." />
          )}
        </section>

        {/* 우 — 공지사항 */}
        <section className="admin-card admin-dash-notice">
          <div className="admin-card-head">
            <h2>
              <i className="fa-solid fa-bullhorn" /> 공지사항
            </h2>
            <Link to="/settings" className="admin-card-more">
              더보기 <i className="fa-solid fa-chevron-right" />
            </Link>
          </div>
          {data.notices.length === 0 ? (
            <EmptyState icon="fa-regular fa-bell" message="등록된 공지가 없습니다." />
          ) : (
            <ul className="admin-notice-list">
              {data.notices.map(n => (
                <li key={n.id} className="admin-notice-item">
                  <div className="admin-notice-main">
                    <span className={noticeTagClass(n.tag)}>{n.tag}</span>
                    <p className="admin-notice-title">{n.title}</p>
                  </div>
                  <span className="admin-notice-date">{n.date}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
