import { useState } from 'react'
import type { QuestGrowthDay } from '../../shared/quests'

export default function QuestGrowthChart({ days }: { days: QuestGrowthDay[] }) {
  const [range, setRange] = useState(30)
  const values = days.slice(-range)
  const maximum = Math.max(100, ...values.map(day => day.xp))
  const point = (xp: number, i: number) => `${38 + i * 270 / Math.max(1, values.length - 1)},${150 - xp / maximum * 115}`
  const points = values.map((day, i) => point(day.xp, i)).join(' ')
  const total = values.reduce((sum, day) => sum + day.xp, 0)
  return <>
    <div className="qb-chart-tools"><div><strong>{total.toLocaleString()} <small>XP</small></strong><p>최근 {range}일 획득 경험치</p></div><div className="qb-chart-ranges" aria-label="성장 그래프 기간">{[7, 30].map(value => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value}일</button>)}</div></div>
    <svg className="qb-growth-chart" viewBox="0 0 330 185" role="img" aria-label={`최근 ${range}일 일별 획득 XP 그래프, 합계 ${total.toLocaleString()} XP`}>
      {[0, .5, 1].map(ratio => <g key={ratio}><line x1="38" x2="308" y1={150 - ratio * 115} y2={150 - ratio * 115} className="qb-chart-grid" /><text x="30" y={154 - ratio * 115} textAnchor="end">{Math.round(maximum * ratio)}</text></g>)}
      <polygon points={`38,150 ${points} 308,150`} className="qb-chart-area" /><polyline points={points} className="qb-chart-line" />{values.map((day, i) => { const [cx, cy] = point(day.xp, i).split(','); return <circle key={day.date} cx={cx} cy={cy} r="3" className="qb-chart-point"><title>{day.date}: {day.xp.toLocaleString()} XP</title></circle> })}
      {[0, Math.floor((values.length - 1) / 2), values.length - 1].map(i => <text key={i} x={38 + i * 270 / Math.max(1, values.length - 1)} y="176" textAnchor="middle">{values[i]?.date.slice(5).replace('-', '.')}</text>)}
    </svg>
    {total === 0 && <p className="qb-chart-empty">아직 획득한 XP가 없어요. 첫 활동부터 차곡차곡 기록됩니다.</p>}
    <details className="qb-chart-details"><summary>일별 기록 보기</summary><div><table><caption className="qb-sr-only">일별 획득 경험치</caption><thead><tr><th scope="col">날짜</th><th scope="col">획득 XP</th></tr></thead><tbody>{[...values].reverse().map(day => <tr key={day.date}><td>{day.date}</td><td>{day.xp.toLocaleString()} XP</td></tr>)}</tbody></table></div></details>
  </>
}
