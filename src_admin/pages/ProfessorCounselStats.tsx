import { useEffect, useState } from 'react'
import { api, queryString } from '../../shared/api'
import { PROF_COUNSEL_CATEGORIES } from '../data/schema/profCounselRecord'
import './ProfessorCounsel.css'

type Stats = { items: { category: string; offline: number; online: number; total: number }[]; total: number }
export default function ProfessorCounselStats() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [stats, setStats] = useState<Stats>({ items: [], total: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    api<Stats>(`/professor-counsel/stats?${query}`).then(data => { if (active) { setStats(data); setLoading(false) } })
      .catch(reason => { if (active) { setError(reason.message); setLoading(false) } })
    return () => { active = false }
  }, [query])
  const offline = stats.items.reduce((sum, row) => sum + row.offline, 0)
  const online = stats.items.reduce((sum, row) => sum + row.online, 0)
  return <div className="admin-page professor-counsel-page">
    <header className="admin-page-head"><div><h1 className="admin-page-title">상담실적</h1><p className="admin-page-desc">완료된 교수 상담기록을 상담일 기준으로 집계합니다.</p></div></header>
    <form className="admin-filterbar" onSubmit={event => {
      event.preventDefault()
      if (from && to && from > to) { setError('조회 기간을 확인하세요.'); return }
      setError(''); const next = queryString({ dateFrom: from || undefined, dateTo: to || undefined });
      if (next !== query) { setLoading(true); setQuery(next) }
    }}>
      <label className="admin-select"><span>기간 시작</span><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="admin-select"><span>기간 종료</span><input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <button type="submit" className="admin-btn admin-btn-primary">검색</button>
    </form>
    {error && <p role="alert">{error}</p>}
    <div className="professor-stats-totals"><span>오프라인 <strong>{offline}건</strong></span><span>온라인 <strong>{online}건</strong></span><span>전체 <strong>{stats.total}건</strong></span></div>
    <section className="admin-card"><div className="professor-report-table-wrap"><table className="professor-report-table professor-stats-table">
      <thead><tr><th>상담구분</th><th>오프라인</th><th>온라인</th><th>합계</th></tr></thead>
      <tbody>{PROF_COUNSEL_CATEGORIES.map(category => {
        const row = stats.items.find(r => r.category === category.code)
        return <tr key={category.code}><td>{category.label}</td><td>{row?.offline ?? 0}</td><td>{row?.online ?? 0}</td><td>{row?.total ?? 0}</td></tr>
      })}</tbody><tfoot><tr><th>합계</th><td>{offline}</td><td>{online}</td><td>{stats.total}</td></tr></tfoot>
    </table></div></section>{loading && <p role="status">불러오는 중…</p>}
  </div>
}
