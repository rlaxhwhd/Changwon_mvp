import { useEffect, useState } from 'react'
import { api, queryString } from '../../shared/api'
import AdminModal from '../components/AdminModal'
import './DepartmentAssignments.css'

type Role = 'assistant' | 'professor'
type Person = { staff_uid: string; name: string; employee_no: string; mobile: string | null; phone: string | null; organization: string | null }
type Assignment = Person & { id: string; version: number }
type Target = { college_code: string; college_name: string; dept_code: string; dept_name: string; major_code: string; major_name: string | null; assignments: Assignment[] }
type Page<T> = { items: T[]; totalCount: number }
type Listing = Page<Target> & { colleges: { college_code: string; college_name: string }[] }
const endpoint = '/system/department-assignments'
const message = (error: unknown) => error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'

function Pager({ page, total, onChange, disabled = false }: { page: number; total: number; onChange: (page: number) => void; disabled?: boolean }) {
  return <div className="da-pagination"><button className="admin-btn admin-btn-ghost" disabled={disabled || page === 1} onClick={() => onChange(page - 1)}>이전</button><span>{page} / {Math.max(1, Math.ceil(total / 20))} 페이지</span><button className="admin-btn admin-btn-ghost" disabled={disabled || page * 20 >= total} onClick={() => onChange(page + 1)}>다음</button></div>
}

function StaffSearch({ role, target, onClose, onSaved }: { role: Role; target: Target; onClose: () => void; onSaved: () => void }) {
  const label = role === 'assistant' ? '조교' : '교수'
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<Person> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true); setError('')
      api<Page<Person>>(`${endpoint}/candidates?${queryString({ role, q, page })}`, { signal: controller.signal })
        .then(setData).catch(e => { if (!controller.signal.aborted) setError(message(e)) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [role, q, page, revision])
  async function register(person: Person) {
    setSaving(true); setError('')
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify({ role, collegeCode: target.college_code, deptCode: target.dept_code, majorCode: target.major_code, staffUid: person.staff_uid }) })
      onSaved()
    } catch (e) { setError(message(e)) } finally { setSaving(false) }
  }
  return <AdminModal title={`${label} 등록`} onClose={() => { if (!saving) onClose() }} size="lg">
    <div className="da-page da-search">
      <p className="da-target">{target.college_name} / {target.dept_name}{target.major_name && ` / ${target.major_name}`}</p>
      <label className="da-search-label">이름 또는 사번<input autoFocus value={q} maxLength={100} placeholder={`${label} 이름 또는 사번 검색`} onChange={e => { setQ(e.target.value); setPage(1); setLoading(true) }} /></label>
      {error && <p className="da-error" role="alert">{error} <button onClick={() => setRevision(n => n + 1)}>다시 조회</button></p>}
      {loading ? <p role="status">검색 중입니다…</p> : <>
        <p>검색 결과 {data?.totalCount.toLocaleString() ?? 0}명</p>
        <div className="da-table-wrap"><table><thead><tr><th>이름</th><th>사번</th><th>소속</th><th>휴대폰번호</th><th>관리</th></tr></thead><tbody>
          {data?.items.map(person => { const assigned = target.assignments.some(a => a.staff_uid === person.staff_uid); return <tr key={person.staff_uid}><td>{person.name}</td><td>{person.employee_no}</td><td>{person.organization || '—'}</td><td className="da-phone">{person.mobile || '—'}</td><td><button className="da-action" disabled={saving || assigned} onClick={() => void register(person)}>{assigned ? '배정됨' : '등록'}</button></td></tr> })}
          {!data?.items.length && <tr><td colSpan={5} className="da-empty">검색된 {label}가 없습니다.</td></tr>}
        </tbody></table></div>
        <Pager page={page} total={data?.totalCount ?? 0} onChange={n => { setPage(n); setLoading(true) }} disabled={saving} />
      </>}
    </div>
  </AdminModal>
}

export default function DepartmentAssignments({ role }: { role: Role }) {
  const label = role === 'assistant' ? '조교' : '교수'
  const [q, setQ] = useState('')
  const [college, setCollege] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [target, setTarget] = useState<Target | null>(null)
  const [removing, setRemoving] = useState<Assignment | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true); setError('')
      api<Listing>(`${endpoint}?${queryString({ role, q, college, page })}`, { signal: controller.signal })
        .then(setData).catch(e => { if (!controller.signal.aborted) setError(message(e)) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [role, q, college, page, revision])
  async function release() {
    if (!removing) return
    setSaving(true); setError('')
    try {
      await api(`${endpoint}/${removing.id}/release`, { method: 'POST', body: JSON.stringify({ expectedVersion: removing.version }) })
      setRemoving(null); setNotice('배정을 해제했습니다.'); setLoading(true); setRevision(n => n + 1)
    } catch (e) { setError(message(e)) } finally { setSaving(false) }
  }
  return <div className="admin-page da-page">
    <header className="admin-page-head"><div><h1 className="admin-page-title">{label}학과배정</h1><p className="admin-page-desc">{role === 'professor' ? '상담을 담당할 교수를 학과·전공별로 등록합니다. 학사 소속과 별도로 관리하며, 같은 교수를 여러 전공에 등록할 수 있습니다.' : '학과·전공별 조교를 확인하고 등록합니다.'}</p></div></header>
    <div className="da-toolbar"><label>소속대학<select value={college} onChange={e => { setCollege(e.target.value); setPage(1); setLoading(true) }}><option value="">전체 대학</option>{data?.colleges.map(c => <option key={c.college_code} value={c.college_code}>{c.college_name}</option>)}</select></label><label className="da-query">학과·전공 검색<input value={q} maxLength={100} placeholder="학부/학과, 전공 또는 코드 검색" onChange={e => { setQ(e.target.value); setPage(1); setLoading(true) }} /></label><button className="admin-btn admin-btn-ghost" onClick={() => { setLoading(true); setRevision(n => n + 1) }}>새로고침</button></div>
    {notice && <p className="da-notice" role="status">{notice}</p>}
    {error && <p className="da-error" role="alert">{error}</p>}
    <p className="da-count">총 <strong>{data?.totalCount.toLocaleString() ?? 0}</strong>개 학과·전공</p>
    <div className="da-table-wrap" aria-busy={loading}><table><caption className="da-sr-only">{label} 학과 배정 현황</caption><thead><tr>{['소속대학', '학부/학과', '전공', '학과코드', '전공코드', `${label}이름 (사번)`, '휴대폰번호', '전화번호', '관리'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={9} className="da-empty">배정 현황을 불러오는 중입니다…</td></tr> : data?.items.map(row => {
        const assigned: (Assignment | null)[] = row.assignments.length ? row.assignments : [null]
        return assigned.map((person, index) => <tr key={`${row.college_code}/${row.dept_code}/${row.major_code}/${person?.id ?? 'empty'}`}>
          {index === 0 && <><td rowSpan={assigned.length}>{row.college_name}</td><td rowSpan={assigned.length}>{row.dept_name}</td><td rowSpan={assigned.length}>{row.major_name || '학과 전체'}</td><td rowSpan={assigned.length}>{row.dept_code}</td><td rowSpan={assigned.length}>{row.major_code || '—'}</td></>}
          <td>{person ? <><span>{person.name} ({person.employee_no})</span><button className="da-remove" onClick={() => { setError(''); setRemoving(person) }} aria-label={`${person.name} 배정 해제`}>삭제</button></> : <span className="da-unassigned">미배정</span>}</td><td className="da-phone">{person?.mobile || '—'}</td><td className="da-phone">{person?.phone || '—'}</td>
          {index === 0 && <td rowSpan={assigned.length}><button className="da-action" onClick={() => setTarget(row)} aria-label={`${row.dept_name} ${row.major_name || ''} ${label} 등록`}>{label}등록</button></td>}
        </tr>)
      })}
      {!loading && !data?.items.length && <tr><td colSpan={9} className="da-empty">조건에 맞는 학과·전공이 없습니다.</td></tr>}
    </tbody></table></div>
    <Pager page={page} total={data?.totalCount ?? 0} onChange={n => { setPage(n); setLoading(true) }} disabled={loading} />
    {target && <StaffSearch role={role} target={target} onClose={() => setTarget(null)} onSaved={() => { setTarget(null); setNotice(`${label}를 등록했습니다.`); setLoading(true); setRevision(n => n + 1) }} />}
    {removing && <AdminModal title="학과 배정 해제" size="md" onClose={() => { if (!saving) setRemoving(null) }}><p>{removing.name} ({removing.employee_no})님의 이 학과·전공 배정을 해제하시겠습니까?</p>{error && <p role="alert" className="da-error">{error}</p>}<div className="da-dialog-actions"><button className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => setRemoving(null)}>취소</button><button className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void release()}>{saving ? '해제 중…' : '배정 해제'}</button></div></AdminModal>}
  </div>
}
