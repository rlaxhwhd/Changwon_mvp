// ─────────────────────────────────────────────────────────────────────────────
// 통계 대시보드 차트 키트 — 라이브러리 없이 SVG·CSS 로 그린다(차트 라이브러리 미사용 방침).
// 색은 의미색 7종 토큰만 쓴다(DESIGN.md). 계열 색은 고정 순서(blue→green→orange→purple→teal→red),
// 유형(T1~T6)은 typeColorVar — 엔티티가 색을 갖고, 필터로 줄어도 색이 바뀌지 않는다.
// 모든 차트는 호버 툴팁 + 「표」 보기(ChartCard)로 값을 색 없이도 읽을 수 있다.
// ─────────────────────────────────────────────────────────────────────────────
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Bucket, MonthSeries } from '../../data/statsOverview'

export const SERIES_COLORS = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--teal)', 'var(--red)']
export const seriesColor = (i: number) => SERIES_COLORS[i % SERIES_COLORS.length]

const fmt = (n: number) => n.toLocaleString('ko-KR')
export const monthLabel = (key: string) => `${Number(key.slice(5))}월`
const yearOf = (key: string) => key.slice(2, 4)

/** y축 눈금 — 최대값을 깔끔한 수로 올리고 4칸으로 나눈다 */
function niceMax(max: number): number {
  if (max <= 4) return 4
  const need = Math.ceil(max / 4)
  const pow = 10 ** Math.floor(Math.log10(need))
  const step = [1, 2, 2.5, 5, 10].map(s => s * pow).find(s => s >= need && Number.isInteger(s)) ?? need
  return step * 4
}

// ── 카드 + 표 전환 ──────────────────────────────────────────────────────────
export interface TableTwin { head: string[]; rows: (string | number)[][] }

export function ChartCard({ title, caption, table, children, wide }: {
  title: string; caption?: string; table: TableTwin; children: ReactNode; wide?: boolean
}) {
  const [showTable, setShowTable] = useState(false)
  const empty = table.rows.length === 0 || table.rows.every(r => r.slice(1).every(v => v === 0 || v === '0'))
  return (
    <section className={`sd-card${wide ? ' sd-card-wide' : ''}`}>
      <header className="sd-card-head">
        <div>
          <h3>{title}</h3>
          {caption && <p>{caption}</p>}
        </div>
        {!empty && <button type="button" className={`sd-table-toggle${showTable ? ' active' : ''}`} aria-pressed={showTable}
          onClick={() => setShowTable(v => !v)}>{showTable ? '그래프' : '표'}</button>}
      </header>
      {empty ? <p className="sd-empty">조건에 맞는 데이터가 없습니다.</p>
        : showTable ? (
          <div className="sd-table-wrap"><table className="sd-table">
            <thead><tr>{table.head.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{table.rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}>{typeof v === 'number' ? fmt(v) : v}</td>)}</tr>)}</tbody>
          </table></div>
        ) : children}
    </section>
  )
}

export function Legend({ items }: { items: { label: string; color: string; kind?: 'line' | 'rect' }[] }) {
  return (
    <ul className="sd-legend">
      {items.map(it => <li key={it.label}><i className={it.kind === 'line' ? 'sd-key-line' : 'sd-key-rect'} style={{ background: it.color }} />{it.label}</li>)}
    </ul>
  )
}

function Tooltip({ x, title, rows }: { x: number; title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="sd-tip" role="status" style={{ left: `${x}%` }}>
      <strong>{title}</strong>
      {rows.map(r => <span key={r.label}>{r.color && <i style={{ background: r.color }} />}<b>{r.value}</b>{r.label}</span>)}
    </div>
  )
}

// ── 세로 막대(월별·구간) ─────────────────────────────────────────────────────
const H = 240, PAD = { l: 40, r: 12, t: 12, b: 32 }
const plotH = H - PAD.t - PAD.b

/** 카드 폭을 그대로 viewBox 폭으로 쓴다 — SVG 가 늘어나며 글자·막대가 함께 커지지 않도록. */
function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(640)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.max(320, Math.round(el.getBoundingClientRect().width)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

interface SeriesInput { key: string; label: string; values: number[]; color?: string }

const monthTitle = (m: string) => `${m.slice(0, 4)}년 ${monthLabel(m)}`
const axisLabel = (c: string, i: number, all: string[], isMonths?: boolean) =>
  isMonths ? `${monthLabel(c)}${i === 0 || c.slice(0, 4) !== all[i - 1].slice(0, 4) ? ` '${yearOf(c)}` : ''}` : c

function GridLines({ max, y, W }: { max: number; y: (v: number) => number; W: number }) {
  return <>{[0, 1, 2, 3, 4].map(i => { const v = (max / 4) * i; return (
    <g key={i}><line className="sd-grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
      <text className="sd-tick" x={PAD.l - 6} y={y(v) + 4} textAnchor="end">{fmt(v)}</text></g>) })}</>
}

export function ColumnChart({ categories, series, isMonths }: { categories: string[]; series: SeriesInput[]; isMonths?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const W = useWidth(ref), plotW = W - PAD.l - PAD.r
  const max = niceMax(Math.max(0, ...series.flatMap(s => s.values)))
  const n = categories.length || 1
  const band = plotW / n
  const barW = Math.max(4, Math.min(24, (band - 8) / series.length - 2))
  const groupW = series.length * (barW + 2) - 2
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH
  return (
    <div className="sd-plot" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="세로 막대 그래프">
        <GridLines max={max} y={y} W={W} />
        {categories.map((c, ci) => {
          const x0 = PAD.l + band * ci + (band - groupW) / 2
          return (
            <g key={c} onMouseEnter={() => setHover(ci)}>
              <rect className={`sd-band${hover === ci ? ' hover' : ''}`} x={PAD.l + band * ci} y={PAD.t} width={band} height={plotH} />
              {series.map((s, si) => { const v = s.values[ci] ?? 0; const h = Math.max(0, PAD.t + plotH - y(v)); return (
                <rect key={s.key} className="sd-bar" x={x0 + si * (barW + 2)} y={y(v)} width={barW} height={h}
                  rx={h > 4 ? 4 : 0} fill={s.color ?? seriesColor(si)} />) })}
              <text className="sd-tick" x={PAD.l + band * ci + band / 2} y={H - 10} textAnchor="middle">{axisLabel(c, ci, categories, isMonths)}</text>
            </g>)
        })}
        <line className="sd-axis" x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} />
      </svg>
      {hover !== null && <Tooltip x={((PAD.l + band * hover + band / 2) / W) * 100} title={isMonths ? monthTitle(categories[hover]) : categories[hover]}
        rows={series.map((s, i) => ({ label: s.label, value: fmt(s.values[hover] ?? 0), color: s.color ?? seriesColor(i) }))} />}
      {series.length > 1 && <Legend items={series.map((s, i) => ({ label: s.label, color: s.color ?? seriesColor(i) }))} />}
    </div>
  )
}

// ── 선(월별 추이) ───────────────────────────────────────────────────────────
export function LineChart({ months, series }: { months: string[]; series: SeriesInput[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const W = useWidth(ref), plotW = W - PAD.l - PAD.r
  const max = niceMax(Math.max(0, ...series.flatMap(s => s.values)))
  const n = months.length
  const slot = n > 1 ? plotW / (n - 1) : plotW
  const x = (i: number) => n === 1 ? PAD.l + plotW / 2 : PAD.l + slot * i
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ')
  const first = series[0]?.color ?? seriesColor(0)
  return (
    <div className="sd-plot" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="선 그래프">
        <defs><linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={first} stopOpacity="0.18" /><stop offset="1" stopColor={first} stopOpacity="0" /></linearGradient></defs>
        <GridLines max={max} y={y} W={W} />
        {series.length === 1 && n > 1 && <path d={`${path(series[0].values)} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={`url(#${gradId})`} />}
        {hover !== null && <line className="sd-crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + plotH} />}
        {series.map((s, si) => (
          <g key={s.key}>
            <path className="sd-line" d={path(s.values)} stroke={s.color ?? seriesColor(si)} />
            {s.values.map((v, i) => <circle key={i} className="sd-dot" cx={x(i)} cy={y(v)} r={hover === i ? 5 : 4} fill={s.color ?? seriesColor(si)} />)}
          </g>))}
        {months.map((m, i) => (
          <g key={m} onMouseEnter={() => setHover(i)}>
            <rect className="sd-band-hit" x={x(i) - slot / 2} y={PAD.t} width={slot} height={plotH} />
            <text className="sd-tick" x={x(i)} y={H - 10} textAnchor="middle">{axisLabel(m, i, months, true)}</text>
          </g>))}
        <line className="sd-axis" x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} />
      </svg>
      {hover !== null && <Tooltip x={(x(hover) / W) * 100} title={monthTitle(months[hover])}
        rows={series.map((s, i) => ({ label: s.label, value: fmt(s.values[hover] ?? 0), color: s.color ?? seriesColor(i) }))} />}
      {series.length > 1 && <Legend items={series.map((s, i) => ({ label: s.label, color: s.color ?? seriesColor(i), kind: 'line' }))} />}
    </div>
  )
}

// ── 가로 순위 막대(한 색) ────────────────────────────────────────────────────
export function RankedBars({ items, color = seriesColor(0), colorOf, unit = '건' }: {
  items: Bucket[]; color?: string; colorOf?: (key: string) => string; unit?: string
}) {
  const max = Math.max(1, ...items.map(i => i.count))
  return (
    <ul className="sd-hbars">
      {items.map(it => (
        <li key={it.key} title={`${it.label} ${fmt(it.count)}${unit}`}>
          <span className="sd-hbar-label">{it.label}</span>
          <span className="sd-hbar-track"><i style={{ width: `${(it.count / max) * 100}%`, background: colorOf ? colorOf(it.key) : color }} /></span>
          <strong className="sd-hbar-value">{fmt(it.count)}</strong>
        </li>))}
    </ul>
  )
}

// ── 가로 누적 막대(2계열: 완료/미완료 등) ────────────────────────────────────
export function StackedBars({ rows, series }: {
  rows: { label: string; values: number[] }[]; series: { label: string; color: string }[]
}) {
  const max = Math.max(1, ...rows.map(r => r.values.reduce((a, b) => a + b, 0)))
  return (
    <div>
      <ul className="sd-hbars">
        {rows.map(r => { const total = r.values.reduce((a, b) => a + b, 0); return (
          <li key={r.label} title={`${r.label} · ${series.map((s, i) => `${s.label} ${fmt(r.values[i])}`).join(' · ')}`}>
            <span className="sd-hbar-label">{r.label}</span>
            <span className="sd-hbar-track sd-hbar-stack">
              {r.values.map((v, i) => v > 0 && <i key={i} style={{ width: `${(v / max) * 100}%`, background: series[i].color }} />)}
            </span>
            <strong className="sd-hbar-value">{fmt(total)}</strong>
          </li>) })}
      </ul>
      <Legend items={series} />
    </div>
  )
}

// ── 분할 막대(전체 대비 비중, 28px) ──────────────────────────────────────────
export function SegmentedBar({ items, colorOf }: { items: Bucket[]; colorOf: (key: string, index: number) => string }) {
  const total = items.reduce((a, b) => a + b.count, 0)
  return (
    <div>
      <div className="sd-seg" role="img" aria-label={items.map(i => `${i.label} ${i.count}`).join(', ')}>
        {items.map((it, i) => { if (!it.count) return null; const share = total ? (it.count / total) * 100 : 0; return (
          <span key={it.key} className="sd-seg-part" style={{ width: `${share}%`, background: colorOf(it.key, i) }}
            title={`${it.label} ${fmt(it.count)} (${share.toFixed(1)}%)`}>
            {share >= 12 && <em>{Math.round(share)}%</em>}
          </span>) })}
      </div>
      <ul className="sd-legend sd-legend-figs">
        {items.map((it, i) => <li key={it.key}><i className="sd-key-rect" style={{ background: colorOf(it.key, i) }} />{it.label}<b>{fmt(it.count)}</b></li>)}
      </ul>
    </div>
  )
}

// ── 히트맵(요일 × 시간) — 한 색(blue) 밝음→진함 ───────────────────────────────
const DOWS = ['월', '화', '수', '목', '금', '토', '일']
export function Heatmap({ cells }: { cells: { dow: number; hour: number; count: number }[] }) {
  const lo = Math.min(9, ...cells.map(c => c.hour))
  const hi = Math.max(18, ...cells.map(c => c.hour))
  const hours = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  const max = Math.max(1, ...cells.map(c => c.count))
  const at = (d: number, h: number) => cells.find(c => c.dow === d && c.hour === h)?.count ?? 0
  return (
    <div className="sd-heat" style={{ gridTemplateColumns: `32px repeat(${hours.length}, 1fr)` }}>
      <span />
      {hours.map(h => <span key={h} className="sd-heat-tick">{h}시</span>)}
      {DOWS.map((name, i) => [
        <span key={`${name}-h`} className="sd-heat-tick">{name}</span>,
        ...hours.map(h => { const v = at(i + 1, h); return (
          <span key={`${name}-${h}`} className="sd-heat-cell" tabIndex={v ? 0 : -1} title={`${name}요일 ${h}시 · ${fmt(v)}건`}
            style={{ background: v ? `rgba(59,130,246,${(0.15 + 0.75 * (v / max)).toFixed(2)})` : undefined }}>{v > 0 && v === max ? v : ''}</span>) }),
      ])}
    </div>
  )
}

// ── 미터 목록(정원 대비) ─────────────────────────────────────────────────────
export function MeterList({ rows }: { rows: { label: string; value: number; limit: number | null; detail?: string }[] }) {
  return (
    <ul className="sd-meters">
      {rows.map(r => { const ratio = r.limit ? Math.min(100, (r.value / r.limit) * 100) : 0; return (
        <li key={r.label} title={`${r.label} ${fmt(r.value)}${r.limit ? ` / ${fmt(r.limit)}` : ''}`}>
          <div className="sd-meter-head"><span>{r.label}</span><strong>{fmt(r.value)}<em>{r.limit ? ` / ${fmt(r.limit)}` : ''}</em></strong></div>
          <span className="sd-meter-track"><i style={{ width: `${ratio}%` }} className={ratio >= 100 ? 'full' : ''} /></span>
          {r.detail && <small>{r.detail}</small>}
        </li>) })}
    </ul>
  )
}

// ── 퍼널(순서가 있는 단계) — 한 색의 밝기 단계 + 전 단계 대비 전환율 ──────────
export function FunnelBars({ steps, color = 'var(--blue)' }: { steps: Bucket[]; color?: string }) {
  const max = Math.max(1, ...steps.map(s => s.count))
  return (
    <ol className="sd-funnel">
      {steps.map((s, i) => { const prev = steps[i - 1]?.count; const conv = prev ? Math.round((s.count / prev) * 100) : null; return (
        <li key={s.key} title={`${s.label} ${fmt(s.count)}${conv === null ? '' : ` · 전 단계의 ${conv}%`}`}>
          <span className="sd-hbar-label">{s.label}</span>
          <span className="sd-funnel-track"><i style={{ width: `${(s.count / max) * 100}%`, background: color, opacity: 1 - i * 0.16 }} /></span>
          <strong className="sd-hbar-value">{fmt(s.count)}</strong>
          <small>{conv === null ? '' : `${conv}%`}</small>
        </li>) })}
    </ol>
  )
}

// ── KPI 타일 ────────────────────────────────────────────────────────────────
export function StatTile({ label, value, unit, detail }: { label: string; value: number | string; unit?: string; detail?: string }) {
  return (
    <div className="sd-tile">
      <span className="sd-tile-label">{label}</span>
      <strong className="sd-tile-value">{typeof value === 'number' ? fmt(value) : value}{unit && <em>{unit}</em>}</strong>
      {detail && <small className="sd-tile-detail">{detail}</small>}
    </div>
  )
}

export function monthTable(ms: MonthSeries, labels: string[]): TableTwin {
  return { head: ['월', ...labels], rows: ms.months.map((m, i) => [m, ...ms.series.map(s => s.values[i])]) }
}
export function bucketTable(items: Bucket[], head = ['구분', '건수']): TableTwin {
  return { head, rows: items.map(b => [b.label, b.count]) }
}
