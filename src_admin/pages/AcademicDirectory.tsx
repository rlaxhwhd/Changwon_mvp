import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import './SystemManagement.css'

type Row = Record<string, string | string[] | null>
type Dataset = 'people' | 'organizations' | 'counselors' | 'assistant-assignments' | 'joint-appointments'
type Page = { items: Row[]; totalCount: number }
const datasets: [Dataset, string][] = [['people', '학생·교직원'], ['organizations', '학과·조직 코드'], ['counselors', '상담사'], ['assistant-assignments', '조교 담당 학과'], ['joint-appointments', '겸직 정보']]
const columns: Record<Dataset, [string, string][]> = {
  people: [['intg_uid', '통합 ID'], ['name', '이름'], ['category', '구분'], ['hofc_sta_cd', '상태 코드'], ['orgz_nm', '소속'], ['orgid', '소속 코드'], ['daehak_cd', '단대 코드'], ['hakbu_cd', '학과 코드'], ['major_cd', '전공 코드']],
  organizations: [['dept_cd', '조직 코드'], ['dept_nm', '조직명'], ['dept_up_cd', '상위 조직 코드'], ['grp_nm', '조직 구분'], ['univ_code', '과정 코드'], ['use_yn', '사용 여부']],
  counselors: [['conid', '상담사 ID'], ['name', '이름'], ['status', '상태 코드'], ['con_gb', '상담 구분 코드'], ['inout_gb', '내외부 코드'], ['college_codes', '담당 단대 코드'], ['con_comp_nm', '소속 기관']],
  'assistant-assignments': [['usr_id', '조교 ID'], ['usr_nm', '이름'], ['dept_cd', '학과 코드'], ['major_cd', '전공 코드']],
  'joint-appointments': [['intg_uid', '통합 ID'], ['emp_no', '사번'], ['orgid', '소속 코드'], ['partid', '겸직 부서 코드']],
}
const categories: [string, string][] = [['all', '전체'], ['professor', '교수'], ['assistant', '조교'], ['employee', '직원'], ['student', '학생'], ['graduate', '졸업·학적 종료'], ['other', '기타·미분류']]
const labels = Object.fromEntries(categories)
function display(value: Row[string]) { return Array.isArray(value) ? value.join(', ') : value ?? '—' }

export default function AcademicDirectory() {
  const [dataset, setDataset] = useState<Dataset>('people')
  const [category, setCategory] = useState('professor')
  const [state, setState] = useState('89')
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page>({ items: [], totalCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<Row | null>(null)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setSelected(null)
    const params = new URLSearchParams({ page: String(page), pageSize: '30', category, state, q: query })
    api<Page>(`/system/academic/${dataset}?${params}`).then(result => { if (!cancelled) setData(result) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : '조회에 실패했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dataset, category, state, query, page, reload])
  const states = dataset === 'people' ? [['89', '재직'], ['90', '퇴직'], ['0001', '재학'], ['0002', '휴학']]
    : dataset === 'organizations' ? [['Y', '사용'], ['N', '미사용']]
      : dataset === 'counselors' ? [['0001', '승인']] : []
  return <div className="admin-page system-management">
    <header className="admin-page-head"><div><h1 className="admin-page-title">학사 인원·조직 조회</h1>
      <p className="admin-page-desc">학사에서 가져온 인원과 조직 정보를 조회합니다. 전체 상태를 선택하면 과거 이력도 확인할 수 있습니다.</p></div></header>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      <label>조회 대상 <select value={dataset} onChange={e => { const next = e.target.value as Dataset; setDataset(next); setState(next === 'organizations' ? 'Y' : ''); setCategory('all'); setPage(1); setQuery(''); setInput('') }}>{datasets.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      {dataset === 'people' && <label>인원 구분 <select value={category} onChange={e => { setCategory(e.target.value); setState(''); setPage(1) }}>{categories.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>}
      {states.length > 0 && <label>상태 <select value={state} onChange={e => { setState(e.target.value); setPage(1) }}><option value="">전체 상태</option>{states.map(([v, label]) => <option key={v} value={v}>{label} ({v})</option>)}</select></label>}
      <form onSubmit={e => { e.preventDefault(); setQuery(input.trim()); setPage(1); setReload(n => n + 1) }}><label>이름·코드 검색 <input value={input} maxLength={100} onChange={e => setInput(e.target.value)} /></label> <button className="btn btn-primary">검색</button></form>
    </div>
    {error ? <p role="alert">{error} <button onClick={() => setReload(n => n + 1)}>다시 조회</button></p> : loading ? <p role="status">조회 중입니다…</p> : <>
      <p role="status">총 {data.totalCount.toLocaleString()}건</p>
      <div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr>{columns[dataset].map(([key, label]) => <th key={key}>{label}</th>)}<th>상세</th></tr></thead>
        <tbody>{data.items.map((row, index) => <tr key={index}>{columns[dataset].map(([key]) => <td key={key}>{key === 'category' ? labels[String(row[key])] : display(row[key])}</td>)}<td><button className="btn btn-secondary" onClick={() => setSelected(row)}>보기</button></td></tr>)}</tbody></table></div>
      {data.items.length === 0 && <p>조건에 맞는 데이터가 없습니다.</p>}
      <div className="pagination"><button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(n => n - 1)}>이전</button> {page} / {Math.max(1, Math.ceil(data.totalCount / 30))}페이지 <button className="btn btn-secondary" disabled={page * 30 >= data.totalCount} onClick={() => setPage(n => n + 1)}>다음</button></div>
      {selected && <section aria-label="선택한 항목 상세"><h2>상세 정보</h2><button className="btn btn-secondary" onClick={() => setSelected(null)}>닫기</button><dl>{Object.entries(selected).map(([key, value]) => <div key={key}><dt>{columns[dataset].find(([k]) => k === key)?.[1] ?? key}</dt><dd>{display(value)}</dd></div>)}</dl></section>}
    </>}
  </div>
}
