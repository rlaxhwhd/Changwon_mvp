import { LuArrowUp, LuArrowDown, LuCalendar, LuChevronRight, LuInfo } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import type { Plugin, ChartData } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { getDashboardData, getTrafficSeries } from '../data/dashboard'
import type { TrafficRange } from '../data/dashboard'
import { getCounselRequests } from '../data/counselRequests'
import { getActiveCounselor } from '../data/counselors'
import './Home.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
)

/* index.css 토큰 → 차트 리터럴 (Chart.js는 CSS 변수를 못 읽어 값으로 전달) */
const C = {
  primary: '#0653B6',
  blue: '#4A90FF',
  blueSoft: '#BBD6FF',
  green: '#21C67A',
  violet: '#7C6FF0',
  text: '#4D5B74',
  grid: 'rgba(230, 236, 245, .9)',
}

/** tone → 스파크라인·강조 색 */
const TONE_COLOR: Record<string, string> = {
  primary: C.primary,
  info: C.blue,
  success: C.green,
  accent: C.violet,
}

/** 진단 참여 4분류 막대 색 (categorical, 레퍼런스 방향) */
const DIAGNOSIS_COLORS = [C.primary, C.blue, C.green, C.violet]

const KRW = new Intl.NumberFormat('ko-KR')
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

const RANGE_TABS: { key: TrafficRange; label: string }[] = [
  { key: 'daily', label: '일간' },
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
]

function todayLabel(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} (${WEEKDAY[d.getDay()]})`
}

function deltaText(value: number, unit: 'percent' | 'count' | 'point'): string {
  if (unit === 'percent') return `${value}%`
  if (unit === 'point') return `${value}%p`
  return `${KRW.format(value)}개`
}

function statusChipClass(status: string): string {
  switch (status) {
    case '완료':
      return 'admin-chip-done'
    case '확정':
      return 'admin-chip-ok'
    case '취소':
      return 'admin-chip-cancel'
    default:
      return 'admin-chip-wait'
  }
}

/** 콤보 차트 값 라벨 (막대 위 건수 · 라인 위 완료율%) — 외부 플러그인 없이 인라인 */
const comboLabels: Plugin<'bar'> = {
  id: 'comboLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return
      const isLine = (ds as { type?: string }).type === 'line'
      ctx.save()
      ctx.font = `700 ${isLine ? 12 : 12}px Pretendard, sans-serif`
      ctx.textAlign = 'center'
      meta.data.forEach((el, i) => {
        const raw = ds.data[i] as number
        if (raw == null) return
        ctx.fillStyle = isLine ? C.primary : C.text
        const text = isLine ? `${raw}%` : String(raw)
        ctx.fillText(text, el.x, el.y - (isLine ? 12 : 6))
      })
      ctx.restore()
    })
  },
}

/** 작은 스파크라인 (KPI 카드 우측) */
function Sparkline({ series, color }: { series: number[]; color: string }) {
  const data = {
    labels: series.map((_, i) => i),
    datasets: [
      {
        data: series,
        borderColor: color,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }) => {
          const { chartArea } = ctx.chart
          if (!chartArea) return 'transparent'
          const g = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          g.addColorStop(0, `${color}33`)
          g.addColorStop(1, `${color}00`)
          return g
        },
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
  }
  return <Line data={data} options={options} />
}

export default function Home() {
  const data = getDashboardData()
  const counselor = getActiveCounselor()
  const [range, setRange] = useState<TrafficRange>('weekly')
  const series = getTrafficSeries(range)

  const rate = useMemo(
    () => series.requested.map((r, i) => (r > 0 ? Math.round((series.completed[i] / r) * 1000) / 10 : 0)),
    [series],
  )

  const recentRequests = useMemo(
    () =>
      [...getCounselRequests()]
        .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1))
        .slice(0, 5),
    [],
  )

  const diagMax = Math.max(...data.diagnosis.segments.map(s => s.value), 1)

  const comboData = {
    labels: series.labels,
    datasets: [
      {
        type: 'bar' as const,
        label: '상담 신청 건수',
        data: series.requested,
        backgroundColor: C.blueSoft,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: '상담 완료 건수',
        data: series.completed,
        backgroundColor: C.primary,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: '상담 완료율',
        data: rate,
        borderColor: C.primary,
        borderWidth: 2.5,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: C.primary,
        pointBorderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  }

  const comboOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 24 } },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Pretendard, sans-serif', size: 12 }, color: C.text },
      },
      tooltip: {
        backgroundColor: C.primary,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Pretendard, sans-serif', size: 12 },
        bodyFont: { family: 'Pretendard, sans-serif', size: 12 },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Pretendard, sans-serif', size: 11 }, color: C.text } },
      y: {
        beginAtZero: true,
        grid: { color: C.grid },
        border: { display: false },
        ticks: { font: { family: 'Pretendard, sans-serif', size: 11 }, color: C.text },
      },
      y1: {
        beginAtZero: true,
        max: 100,
        position: 'right' as const,
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { family: 'Pretendard, sans-serif', size: 11 },
          color: C.text,
          callback: (v: string | number) => `${v}%`,
        },
      },
    },
  }

  return (
    <div className="admin-page dash">
      {/* ── 헤더 ─────────────────────────────────────── */}
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">메인 대시보드</h1>
          <p className="admin-page-desc">
            국립창원대학교 {counselor.dept} {counselor.name} 관리자님, 환영합니다.
          </p>
        </div>
        <div className="admin-dash-head-actions">
          <span className="dash-date-pill">
            <LuCalendar /> {todayLabel()}
          </span>
        </div>
      </header>

      {/* ── KPI 5장 (스파크라인) ─────────────────────── */}
      <section className="dash-kpi-grid">
        {data.stats.map(stat => {
          const color = TONE_COLOR[stat.tone] ?? C.primary
          return (
            <div key={stat.id} className="dash-kpi-card">
              <span className="dash-kpi-label">{stat.label}</span>
              <span className="dash-kpi-value">
                {KRW.format(stat.value)}
                <em>{stat.unit}</em>
              </span>
              <div className="dash-kpi-foot">
                <span className={`dash-kpi-delta ${stat.deltaDir === 'up' ? 'is-up' : 'is-down'}`}>
                  {stat.deltaDir === 'up' ? <LuArrowUp /> : <LuArrowDown />}
                  {deltaText(stat.deltaValue, stat.deltaUnit)}
                  <small>({stat.deltaLabel})</small>
                </span>
                <div className="dash-kpi-spark">
                  <Sparkline series={stat.spark} color={color} />
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* ── 차트 2분할 ───────────────────────────────── */}
      <div className="dash-chart-grid">
        {/* 학생상담현황 콤보 */}
        <section className="admin-card dash-chart-card">
          <div className="dash-card-head">
            <h2>학생상담현황 그래프</h2>
            <div className="dash-range-toggle">
              {RANGE_TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`dash-range-btn ${range === t.key ? 'active' : ''}`}
                  onClick={() => setRange(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="dash-combo-box">
            <Bar data={comboData as unknown as ChartData<'bar'>} options={comboOptions} plugins={[comboLabels]} />
          </div>
        </section>

        {/* 진단 참여 현황 (CSS 막대) */}
        <section className="admin-card dash-chart-card">
          <div className="dash-card-head">
            <h2>
              진단 참여 현황 그래프
              <span className="dash-head-info" title="유형진단(1단계) 6유형 중 상위 4분류 참여자 집계">
                <LuInfo />
              </span>
            </h2>
            <span className="dash-head-note">전체 학년</span>
          </div>
          <div className="dash-bars">
            {data.diagnosis.segments.map((seg, i) => {
              const pct = Math.round((seg.value / data.diagnosis.total) * 1000) / 10
              return (
                <div key={seg.label} className="dash-bar-col">
                  <span className="dash-bar-value">
                    {KRW.format(seg.value)}명
                    <small>({pct}%)</small>
                  </span>
                  <div className="dash-bar-track">
                    <div
                      className="dash-bar-fill"
                      style={{ height: `${(seg.value / diagMax) * 100}%`, background: DIAGNOSIS_COLORS[i % DIAGNOSIS_COLORS.length] }}
                    />
                  </div>
                  <span className="dash-bar-label">{seg.label}</span>
                </div>
              )
            })}
          </div>
          <p className="dash-bars-foot">총 참여자 {KRW.format(data.diagnosis.total)}명</p>
        </section>
      </div>

      {/* ── 상담 신청 현황 (실데이터) ─────────────────── */}
      <div className="dash-bottom">
        <section className="admin-card dash-table-card">
          <div className="dash-card-head">
            <h2>상담 신청 현황</h2>
            <Link to="/counsel/requests" className="dash-more">
              더보기 <LuChevronRight />
            </Link>
          </div>
          <div className="dash-table">
            <div className="dash-table-head" role="row">
              <span>상태</span>
              <span>신청자</span>
              <span>학과</span>
              <span>상담구분</span>
              <span>신청일</span>
            </div>
            {recentRequests.map(req => (
              <div key={req.id} className="dash-table-row" role="row">
                <span>
                  <span className={`admin-chip ${statusChipClass(req.status)}`}>{req.status}</span>
                </span>
                <span className="dash-t-name">{req.studentName}</span>
                <span>{req.studentMajor}</span>
                <span>{req.type === '심리' ? '심리상담' : '진로취업 상담'}</span>
                <span className="dash-t-date">{req.requestedAt.slice(5, 10).replace('-', '.')}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
