import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LuChartColumn, LuClipboardCheck, LuUserCheck, LuUsers } from 'react-icons/lu'
import type { ProgramTabContext } from './ProgramShell'
import { loadSurveyStats, type SurveyStatRow, type SurveyStats } from '../../shared/surveyStore'
import EmptyState from '../components/EmptyState'
import './ProgramSurveyStats.css'

// 프로그램 1개의 역량향상률 통계 — 집계는 서버(/programs/{id}/survey/stats)가 끝내고 여기서는 그린다.
// 향상률 = (사후 평균 − 사전 평균) / 사전 평균 × 100. 사전·사후가 둘 다 있는 응답만 센다.

const fmt = (n: number | null, digits = 2) => (n == null ? '—' : n.toFixed(digits))
const pct = (n: number | null) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`)
const tone = (n: number | null) => (n == null ? '' : n > 0 ? ' up' : n < 0 ? ' down' : '')

function ScoreBars({ row }: { row: SurveyStatRow }) {
  return (
    <span className="pss-bars" aria-hidden="true">
      <i className="pre" style={{ width: `${((row.preAvg ?? 0) / 5) * 100}%` }} />
      <i className="post" style={{ width: `${((row.postAvg ?? 0) / 5) * 100}%` }} />
    </span>
  )
}

export default function ProgramSurveyStats() {
  const { program } = useOutletContext<ProgramTabContext>()
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setStats(null); setError('')
    loadSurveyStats(program.id)
      .then(next => { if (alive) setStats(next) })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : '통계를 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [program.id])

  if (error) return <section className="admin-card"><p role="alert">{error}</p></section>
  if (!stats) return <p role="status" className="admin-page-desc">통계를 집계하는 중입니다…</p>
  if (!stats.competencySurvey || stats.areas.length === 0) {
    return (
      <section className="admin-card">
        <EmptyState icon={LuChartColumn} message="이 프로그램은 역량향상률 조사를 실시하지 않습니다. 프로그램 수정에서 조사 영역을 체크하면 사전·사후 조사가 열립니다." />
      </section>
    )
  }
  const p = stats.participation
  const cards = [
    { label: '선발 인원', value: p.selected, unit: '명', icon: LuUsers, tint: '' },
    { label: '사전 응답', value: p.pre, unit: '명', icon: LuClipboardCheck, tint: 'info' },
    { label: '사후 응답', value: p.post, unit: '명', icon: LuClipboardCheck, tint: 'success' },
    { label: '사전·사후 모두 응답', value: p.paired, unit: '명', icon: LuUserCheck, tint: 'accent' },
  ]

  return (
    <div className="pss">
      <section className="admin-stat-grid">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <article key={c.label} className="admin-stat-card">
              <span className={`admin-stat-icon ${c.tint}`}><Icon /></span>
              <div className="admin-stat-body">
                <span className="admin-stat-label">{c.label}</span>
                <span className="admin-stat-value">{c.value}<em>{c.unit}</em></span>
              </div>
            </article>
          )
        })}
      </section>

      <section className="admin-card pss-total">
        <header>
          <h2>전체 향상률</h2>
          <p>사전·사후를 모두 제출한 {p.paired}명 · {stats.total.n}개 응답 쌍 기준. 향상률 = (사후 평균 − 사전 평균) ÷ 사전 평균 × 100</p>
        </header>
        <div className="pss-total-body">
          <div><small>사전 평균</small><strong>{fmt(stats.total.preAvg)}</strong></div>
          <div><small>사후 평균</small><strong>{fmt(stats.total.postAvg)}</strong></div>
          <div className={`pss-improve${tone(stats.total.improvement)}`}><small>향상률</small><strong>{pct(stats.total.improvement)}</strong></div>
        </div>
        {p.paired === 0 && <p className="pss-note">아직 사전·사후를 모두 제출한 학생이 없어 향상률을 낼 수 없습니다. 응답은 선발자 관리에서 O/X 로 확인합니다.</p>}
      </section>

      {stats.areas.map((area, i) => (
        <section className="admin-card pss-area" key={area.key}>
          <header>
            <h2><span>{i + 1}</span>{area.label}</h2>
            <div className="pss-area-sum">
              <span>사전 <b>{fmt(area.preAvg)}</b></span>
              <span>사후 <b>{fmt(area.postAvg)}</b></span>
              <span className={`pss-improve${tone(area.improvement)}`}>향상률 <b>{pct(area.improvement)}</b></span>
            </div>
          </header>
          <div className="table-wrap">
            <table className="pss-table">
              <thead>
                <tr><th>번호</th><th>문항</th><th>사전</th><th>사후</th><th>비교</th><th>향상률</th><th>응답 쌍</th></tr>
              </thead>
              <tbody>
                {area.items.map((item, j) => (
                  <tr key={item.code}>
                    <td>{j + 1}</td>
                    <td className="wrap">{item.prompt}</td>
                    <td>{fmt(item.preAvg)}</td>
                    <td>{fmt(item.postAvg)}</td>
                    <td><ScoreBars row={item} /></td>
                    <td className={`pss-improve${tone(item.improvement)}`}>{pct(item.improvement)}</td>
                    <td>{item.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="pss-legend"><i className="pre" /> 사전 평균 <i className="post" /> 사후 평균 · 5점 만점</p>
    </div>
  )
}
