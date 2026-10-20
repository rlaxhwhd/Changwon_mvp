import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import PageNumbers from '../../shared/components/PageNumbers'
import { studentDisplayName } from '../../shared/studentDisplayName'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import { PROF_COUNSEL_CATEGORIES } from '../data/schema/profCounselRecord'
import { deleteProfessorReport, emptyReportFilters, queryProfessorReports } from '../data/professorCounselManage'
import type { CounselChannel, ReportFilters } from '../data/professorCounselManage'
import { useListData } from '../hooks/useListData'
import ProfessorReportEditor from '../components/ProfessorReportEditor'
import './ProfessorCounsel.css'

const PAGE_SIZE = 10
export default function ProfessorCounselRecords({ channel }: { channel: CounselChannel }) {
  const [draft, setDraft] = useState<ReportFilters>(emptyReportFilters)
  const [filters, setFilters] = useState<ReportFilters>(emptyReportFilters)
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [optionRevision, setOptionRevision] = useState(0)
  const [organizations, setOrganizations] = useState<{ college: string | null; major: string }[]>([])
  const [message, setMessage] = useState('')
  const { data, isLoading, error, refetch } = useListData(queryProfessorReports, { ...filters, channel, page, pageSize: PAGE_SIZE })
  useEffect(() => {
    let active = true
    api<{ organizations: typeof organizations }>('/professor-counsel/options')
      .then(result => { if (active) setOrganizations(result.organizations) })
      .catch(reason => { if (active) setMessage(reason.message) })
    return () => { active = false }
  }, [optionRevision])
  const colleges = [...new Set(organizations.map(o => o.college).filter((c): c is string => !!c))]
  const majors = [...new Set(organizations.filter(o => !draft.college || o.college === draft.college).map(o => o.major))]
  const change = (key: keyof ReportFilters, value: string) => setDraft(old => ({ ...old, [key]: value, ...(key === 'college' ? { major: '' } : {}) }))
  const label = channel === 'offline' ? '오프라인' : '온라인'
  const pages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE))
  return <div className="admin-page professor-counsel-page">
    <header className="admin-page-head"><h1 className="admin-page-title">{label} 상담현황</h1></header>
    <form className="professor-report-filters" onSubmit={event => {
      event.preventDefault()
      if (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo) { setMessage('시작일은 종료일보다 늦을 수 없습니다.'); return }
      setMessage(''); setFilters({ ...draft }); setPage(1); refetch()
    }}>
      <div className="admin-filterbar">
        <label className="admin-select"><span>상담구분</span><select value={draft.category} onChange={e => change('category', e.target.value)}>
          <option value="">전체</option>{PROF_COUNSEL_CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select></label>
        <label className="admin-select"><span>상태</span><select value={draft.status} onChange={e => change('status', e.target.value)}>
          <option value="">전체</option><option>진행중</option><option>완료</option>
        </select></label>
        <label className="admin-select"><span>대학</span><select value={draft.college} onChange={e => change('college', e.target.value)}>
          <option value="">전체</option>{colleges.map(c => <option key={c}>{c}</option>)}
        </select></label>
        <label className="admin-select"><span>학과</span><select value={draft.major} onChange={e => change('major', e.target.value)}>
          <option value="">전체</option>{majors.map(m => <option key={m}>{m}</option>)}
        </select></label>
      </div>
      <div className="admin-filterbar">
        <label className="admin-select"><span>기간 시작</span><input type="date" value={draft.dateFrom} onChange={e => change('dateFrom', e.target.value)} /></label>
        <label className="admin-select"><span>기간 종료</span><input type="date" value={draft.dateTo} onChange={e => change('dateTo', e.target.value)} /></label>
        <label className="admin-select"><span>검색 항목</span><select value={draft.searchBy} onChange={e => change('searchBy', e.target.value)}>
          <option value="all">전체</option><option value="name">성명</option><option value="studentNo">학번</option><option value="title">상담제목</option>
        </select></label>
        <div className="admin-search"><input aria-label="상담 검색어" placeholder="성명·학번·상담제목 검색" value={draft.q} onChange={e => change('q', e.target.value)} /></div>
        <button className="admin-btn admin-btn-primary" type="submit">검색</button>
        <button className="admin-btn admin-btn-ghost" type="button" onClick={() => { setDraft(emptyReportFilters); setFilters(emptyReportFilters); setPage(1); setMessage('') }}>초기화</button>
      </div>
    </form>
    <p className="admin-field-hint">{channel === 'offline' ? '오프라인 상담은 대면 상담으로 온라인상 별도 결과가 제공되지 않습니다.' : '온라인 상담은 학생의 신청 내용과 상담 결과를 확인하여 관리합니다.'}</p>
    {(message || error) && <p role="alert" className="admin-form-hint-warn">{message || error?.message}</p>}
    <div className="admin-toolbar">
      <span className="admin-toolbar-count" aria-live="polite">검색 결과 {data.totalCount}건{isLoading && ' · 불러오는 중…'}</span>
      <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>미예약 상담 등록</button>
    </div>
    <section className="admin-card">
      {isLoading && !data.items.length ? <div className="admin-loading">불러오는 중…</div> : !data.items.length ? <EmptyState message="조건에 맞는 상담이 없습니다." /> : <>
        <div className="professor-report-table-wrap"><table className="professor-report-table">
          <thead><tr>{['번호', '성명', '학번', '소속', '학년', '재학상태', '상담제목', '상담구분', '상담일', '신청구분', '상태', '삭제'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>{data.items.map((row, index) => <tr key={row.id}>
            <td>{data.totalCount - (data.page - 1) * PAGE_SIZE - index}</td>
            <td><Link className="professor-report-link" to={`/professor/counsel/${channel}/${row.id}`}>{studentDisplayName(row.name, row.studentId)}</Link></td>
            <td>{row.studentNo}</td><td>{row.college} {row.major}</td><td>{row.grade}</td><td>{row.enrollmentStatus}</td>
            <td><Link to={`/professor/counsel/${channel}/${row.id}`}>{row.title}</Link></td>
            <td>{PROF_COUNSEL_CATEGORIES.find(c => c.code === row.categoryCode)?.label ?? row.categoryCode}</td>
            <td>{row.date ?? '미정'}</td><td>{row.origin}</td><td>{row.status}</td>
            <td><button type="button" className="admin-btn admin-btn-ghost sm" aria-label={`${row.name} 상담 삭제`} onClick={async () => {
              if (!window.confirm('이 교수상담과 상담기록·이력·첨부파일을 영구 삭제합니다. 삭제하시겠습니까?')) return
              try { await deleteProfessorReport(row); setPage(1); refetch(); setOptionRevision(v => v + 1) }
              catch (reason) { setMessage(reason instanceof Error ? reason.message : '삭제하지 못했습니다.') }
            }}>삭제</button></td>
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
    {creating && <AdminModal title={`${label} 미예약 상담 등록`} size="xl" onClose={() => setCreating(false)}>
      <ProfessorReportEditor channel={channel} onSaved={() => { setCreating(false); refetch(); setOptionRevision(v => v + 1) }} onCancel={() => setCreating(false)} />
    </AdminModal>}
  </div>
}
