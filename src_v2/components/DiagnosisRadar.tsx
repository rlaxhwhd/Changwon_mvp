import { useId } from 'react'
import type { DiagnosisChartAxis } from '../data/diagnosisChart'

interface Props {
  axes: DiagnosisChartAxis[]
  averaged: boolean
  areaAverage?: boolean
  namedAxes?: boolean
}

export default function DiagnosisRadar({ axes, averaged, areaAverage = false, namedAxes = false }: Props) {
  const titleId = useId()
  const formatScore = (value: number | null) => value == null ? '점수 없음' : value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const values = axes.map(axis => axis.value).filter((v): v is number => v != null && Number.isFinite(v))
  if (axes.length < 3 || values.length === 0) {
    return <p className="drr-chart-empty">그래프를 표시할 점수가 아직 없습니다.</p>
  }
  // 0–100 is the usual display range, not a maximum allowed T score.
  const min = Math.min(0, Math.floor(Math.min(...values) / 25) * 25)
  const max = Math.max(100, Math.ceil(Math.max(...values) / 25) * 25)
  const cx = 260, cy = 210, radius = 120
  const point = (i: number, ratio: number) => {
    const angle = i * 2 * Math.PI / axes.length - Math.PI / 2
    return { x: cx + radius * ratio * Math.cos(angle), y: cy + radius * ratio * Math.sin(angle) }
  }
  const ratio = (value: number) => (value - min) / (max - min)
  const ring = (value: number) => axes.map((_, i) => {
    const p = point(i, ratio(value))
    return `${p.x},${p.y}`
  }).join(' ')
  const ticks = Array.from({ length: 4 }, (_, i) => min + (max - min) * (i + 1) / 4)
  const points = axes.map((axis, i) => axis.value == null || !Number.isFinite(axis.value) ? null : point(i, ratio(axis.value)))
  const complete = points.every(p => p !== null)
  // A missing score is a gap, never zero or a one-member average.
  const path = points.map((p, i) => p ? `${i === 0 || !points[i - 1] ? 'M' : 'L'}${p.x},${p.y}` : '').join(' ') + (complete ? ' Z' : '')
  // Reserve space using the 14px label font; spaces and Latin letters are
  // narrower than Korean glyphs, so character counts are not a useful limit.
  const labelWidth = (label: string) => Array.from(label).reduce((width, char) =>
    width + (/\s/u.test(char) ? 4 : /[\u0000-\u00ff]/u.test(char) ? 9 : 14), 0)
  const wrapLabel = (label: string, availableWidth: number) => {
    const words = label.replace(/\s+및\s+/g, '·').split(/\s+/)
    const lines: string[] = []
    for (const word of words) {
      const last = lines.length - 1
      if (last >= 0 && labelWidth(`${lines[last]} ${word}`) <= availableWidth) lines[last] += ` ${word}`
      else {
        let line = ''
        for (const char of word) {
          if (line && labelWidth(line + char) > availableWidth) { lines.push(line); line = '' }
          line += char
        }
        if (line) lines.push(line)
      }
    }
    return lines
  }

  return (
    <figure className={`drr-chart${namedAxes ? ' drr-chart-named' : ''}`}>
      {(!averaged || areaAverage) && <figcaption><strong>{areaAverage ? '영역별 평균 T점수' : '요인별 T점수'}</strong></figcaption>}
      <svg viewBox="0 0 520 420" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{axes.map(a => `${a.labels.join(' / ')}: ${formatScore(a.value)}`).join('; ')}</title>
        {ticks.map(t => <polygon key={t} className="drr-chart-grid" points={ring(t)} />)}
        <polygon className="drr-chart-average" points={ring(50)} />
        {axes.map((_, i) => {
          const p = point(i, 1)
          return <line key={i} className="drr-chart-grid" x1={cx} y1={cy} x2={p.x} y2={p.y} />
        })}
        <g className="drr-chart-series">
          <path d={path} className={complete ? 'is-complete' : undefined} />
          {points.map((p, i) => p && <circle key={i} cx={p.x} cy={p.y} r="4" tabIndex={0}
            aria-label={`${axes[i].labels.join(' / ')} ${formatScore(axes[i].value)}`}>
            <title>{axes[i].labels.join(' / ')}: {formatScore(axes[i].value)}</title>
          </circle>)}
        </g>
        {axes.map((axis, i) => {
          const p = point(i, 1.14)
          const dx = p.x - cx
          const availableWidth = Math.abs(dx) < 5 ? 2 * Math.min(p.x - 8, 512 - p.x)
            : dx > 0 ? 512 - p.x : p.x - 8
          const lines = axis.labels.flatMap(label => wrapLabel(label, availableWidth))
          const lineHeight = namedAxes ? 20 : 16
          const labelY = i === 0 ? p.y - 14 - (lines.length - 1) * lineHeight : p.y - (lines.length - 1) * lineHeight / 2
          return <g key={i}><text x={p.x} y={labelY}
            textAnchor={Math.abs(dx) < 5 ? 'middle' : dx > 0 ? 'start' : 'end'} className="drr-chart-label">
            {lines.map((line, j) => <tspan key={j} x={p.x} dy={j ? lineHeight : 0}>{line}</tspan>)}
          </text>{!namedAxes && <text x={p.x} y={p.y} textAnchor="middle" className="drr-chart-axis-number" aria-hidden="true">{i + 1}</text>}</g>
        })}
      </svg>
      {!namedAxes && <ol className="drr-chart-axis-key">
        {axes.map((axis, i) => <li key={i}><span>{axis.labels.join(' / ')}</span><b>{formatScore(axis.value)}</b></li>)}
      </ol>}
    </figure>
  )
}
