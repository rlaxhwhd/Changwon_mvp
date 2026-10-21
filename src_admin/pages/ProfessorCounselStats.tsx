import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import PageNumbers from '../../shared/components/PageNumbers'
import { studentDisplayName } from '../../shared/studentDisplayName'
import EmptyState from '../components/EmptyState'
import { loadMonthlyCounselStats, queryCounselStatsRecords } from '../data/professorCounselManage'
import type { MonthlyCounselStats, StatsFilters, StatsSort } from '../data/professorCounselManage'
import { useListData } from '../hooks/useListData'
import './ProfessorCounsel.css'

const PAGE_SIZE = 10
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const year = new Date().getFullYear()
const initialFilters: StatsFilters = { college: '', major: '', grade: '', dateFrom: `${year}-01-01`, dateTo: `${year}-12-31`, q: '' }
const emptyStats: MonthlyCounselStats = { months: [], online: 0, offline: 0, total: 0 }

export default function ProfessorCounselStats() {
  const [draft, setDraft] = useState<StatsFilters>(initialFilters)
  const [filters, setFilters] = useState<StatsFilters>(initialFilters)
  const [sort, setSort] = useState<StatsSort>({ sort: 'date', order: 'desc' })
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState<MonthlyCounselStats>(emptyStats)
  const [organizations, setOrganizations] = useState<{ college: string | null; major: string }[]>([])
  const [message, setMessage] = useState('')
  const { data, isLoading, error } = useListData(queryCounselStatsRecords, { ...filters, ...sort, page, pageSize: PAGE_SIZE })
  useEffect(() => {
    let active = true
    api<{ organizations: typeof organizations }>('/professor-counsel/options')
      .then(result => { if (active) setOrganizations(result.organizations) })
      .catch(reason => { if (active) setMessage(reason.message) })
    return () => { active = false }
  }, [])
  // 같은 조건으로 다시 검색하면 목록(useListData)처럼 재조회하지 않는다 — 값으로 비교한다.
  const filterKey = JSON.stringify(filters)
  useEffect(() => {
    let active = true
    loadMonthlyCounselStats(JSON.parse(filterKey)).then(result => { if (active) setStats(result) })
      .catch(reason => { if (active) setMessage(reason.message) })
    return () => { active = false }
  }, [filterKey])
  const colleges = [...new Set(organizations.map(o => o.college).filter((c): c is string => !!c))]
  const majors = [...new Set(organizations.filter(o => !draft.college || o.college === draft.college).map(o => o.major))]
  const change = (key: keyof StatsFilters, value: string) => setDraft(old => ({ ...old, [key]: value, ...(key === 'college' ? { major: '' } : {}) }))
  const month = (m: number) => stats.months.find(row => row.month === m) ?? { month: m, online: 0, offline: 0 }
  const toggleSort = (key: StatsSort['sort']) => {
    setSort(old => ({ sort: key, order: old.sort === key && old.order === 'desc' ? 'asc' : 'desc' })); setPage(1)
  }
  const sortHead = (key: StatsSort['sort'], label: string) => <th scope="col" aria-sort={sort.sort === key ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className="professor-sort-btn" onClick={() => toggleSort(key)}>
      {label}<span aria-hidden="true">{sort.sort === key && sort.order === 'asc' ? '▲' : '▼'}</span>
    </button>
  </th>
  const pages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE))
  return <div className="admin-page professor-counsel-page">
    <header className="admin-page-head"><div><h1 className="admin-page-title">상담실적</h1><p className="admin-page-desc">완료된 교수 상담을 상담일 기준 월별로 집계합니다.</p></div></header>
    <form className="professor-report-filters" onSubmit={event => {
      event.preventDefault()
      if (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo) { setMessage('시작일은 종료일보다 늦을 수 없습니다.'); return }
      setMessage(''); setFilters({ ...draft }); setPage(1)
    }}>
      <div className="admin-filterbar">
        <label className="admin-select"><span>대학</span><select value={draft.college} onChange={e => change('college', e.target.value)}>
          <option value="">전체</option>{colleges.map(c => <option key={c}>{c}</option>)}
        </select></label>
        <label className="admin-select"><span>학과</span><select value={draft.major} onChange={e => change('major', e.target.value)}>
          <option value="">전체</option>{majors.map(m => <option key={m}>{m}</option>)}
        </select></label>
        <label className="admin-select"><span>학년</span><select value={draft.grade} onChange={e => change('grade', e.target.value)}>
          <option value="">전체</option>{[1, 2, 3, 4].map(g => <option key={g} value={g}>{g}학년</option>)}
        </select></label>
        <label className="admin-select"><span>기간 시작</span><input type="date" value={draft.dateFrom} onChange={e => change('dateFrom', e.target.value)} /></label>
        <label className="admin-select"><span>기간 종료</span><input type="date" value={draft.dateTo} onChange={e => change('dateTo', e.target.value)} /></label>
      </div>
      <div className="admin-filterbar">
        <div className="admin-search"><input aria-label="학생 검색어" placeholder="학생명 / 학번 입력" value={draft.q} onChange={e => change('q', e.target.value)} /></div>
        <button className="admin-btn admin-btn-primary" type="submit">검색</button>
        <button className="admin-btn admin-btn-ghost" type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); setPage(1); setMessage('') }}>초기화</button>
      </div>
    </form>
    {(message || error) && <p role="alert" className="admin-form-hint-warn">{message || error?.message}</p>}
    <section className="admin-card professor-stats-card"><div className="professor-report-table-wrap"><table className="professor-report-table professor-monthly-table">
      <thead><tr><th scope="col">구분</th>{MONTHS.map(m => <th scope="col" key={m}>{m}월</th>)}<th scope="col">총계</th></tr></thead>
      <tbody>
        <tr><th scope="row">온라인</th>{MONTHS.map(m => <td key={m}>{month(m).online}</td>)}<td>{stats.online}</td></tr>
        <tr><th scope="row">오프라인</th>{MONTHS.map(m => <td key={m}>{month(m).offline}</td>)}<td>{stats.offline}</td></tr>
      </tbody>
      <tfoot><tr><th scope="row">합계</th>{MONTHS.map(m => <td key={m}>{month(m).online + month(m).offline}</td>)}<td>{stats.total}</td></tr></tfoot>
    </table></div></section>
    <div className="admin-toolbar">
      <span className="admin-toolbar-count" aria-live="polite">총 {data.totalCount}건{isLoading && ' · 불러오는 중…'}</span>
    </div>
    <section className="admin-card">
      {isLoading && !data.items.length ? <div className="admin-loading">불러오는 중…</div> : !data.items.length ? <EmptyState message="조건에 맞는 상담실적이 없습니다." /> : <>
        <div className="professor-report-table-wrap"><table className="professor-report-table professor-stats-records">
          <thead><tr>
            <th scope="col">순번</th><th scope="col">대학</th><th scope="col">학부(학과)</th><th scope="col">학년</th>
            {sortHead('name', '학생명')}<th scope="col">상담구분</th><th scope="col">학생구분</th>{sortHead('date', '상담일자')}
          </tr></thead>
          <tbody>{data.items.map((row, index) => <tr key={row.id}>
            <td>{data.totalCount - (data.page - 1) * PAGE_SIZE - index}</td>
            <td>{row.college ?? '-'}</td><td>{row.major}</td><td>{row.grade}</td>
            <td><Link className="professor-report-link" to={`/professor/counsel/${row.channel}/${row.id}`}>{studentDisplayName(row.name, row.studentId)}</Link></td>
            <td>{row.channel === 'online' ? '온라인' : '오프라인'}</td><td>{row.enrollmentStatus}</td><td>{row.date ?? '-'}</td>
          </tr>)}</tbody>
        </table></div>
        {pages > 1 && <div className="admin-pagination">
          <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
          <PageNumbers page={page} pages={pages} onChange={setPage} />
          <span className="admin-page-info">{page} / {pages} 페이지</span>
          <button className="admin-page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>다음</button>
        </div>}
      </>}
    </section>
  </div>
}
