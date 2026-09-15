import { useEffect, useState } from 'react'
import { api, queryString } from '../../shared/api'
import AdminModal from '../components/AdminModal'
import './DepartmentAssignments.css'

type Status = 'PENDING' | 'APPROVED' | 'REJECTED'
type Member = { id: string; business_no: string; company_name: string; contact_name: string; contact_email: string; contact_phone: string; status: Status; review_note: string; created_at: string; reviewed_at: string | null; version: number }
type Page = { items: Member[]; totalCount: number }
const labels: Record<Status, string> = { PENDING: '승인 대기', APPROVED: '승인 완료', REJECTED: '반려' }
const errorMessage = (e: unknown) => e instanceof Error ? e.message : '요청을 처리하지 못했습니다.'
const businessNumber = (v: string) => v.replace(/^(\d{3})(\d{2})(\d{5})$/, '$1-$2-$3')

function MemberReview({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    setSaving(true); setError('')
    try {
      await api(`/system/company-members/${member.id}/review`, { method: 'POST', body: JSON.stringify({ expectedVersion: member.version, decision, note }) })
      onSaved()
    } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }
  return <AdminModal title="기업회원 가입 신청" size="md" onClose={() => { if (!saving) onClose() }}><form className="da-page" onSubmit={e => { e.preventDefault(); void save() }}>
    <dl className="da-member-details">{[['회사명', member.company_name], ['사업자등록번호 (아이디)', businessNumber(member.business_no)], ['담당자', member.contact_name], ['이메일', member.contact_email], ['연락처', member.contact_phone], ['신청일', new Date(member.created_at).toLocaleString('ko-KR')], ['상태', labels[member.status]], ...(member.reviewed_at ? [['처리일', new Date(member.reviewed_at).toLocaleString('ko-KR')], ['처리 사유', member.review_note || '—']] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {member.status === 'PENDING' && <><label className="da-search-label">처리<select value={decision} disabled={saving} onChange={e => setDecision(e.target.value as 'APPROVED' | 'REJECTED')}><option value="APPROVED">가입 승인</option><option value="REJECTED">가입 반려</option></select></label><label className="da-search-label">{decision === 'REJECTED' ? '반려 사유 (필수)' : '처리 메모 (선택)'}<textarea maxLength={1000} required={decision === 'REJECTED'} value={note} disabled={saving} onChange={e => setNote(e.target.value)} /></label><p>{decision === 'APPROVED' ? '승인하면 신청 시 설정한 비밀번호로 로그인할 수 있습니다.' : '반려된 계정은 로그인할 수 없습니다.'}</p></>}
    {error && <p className="da-error" role="alert">{error}</p>}<div className="da-dialog-actions"><button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={onClose}>닫기</button>{member.status === 'PENDING' && <button className="admin-btn admin-btn-primary" disabled={saving || (decision === 'REJECTED' && !note.trim())}>{saving ? '처리 중…' : decision === 'APPROVED' ? '가입 승인' : '가입 반려'}</button>}</div>
  </form></AdminModal>
}

export default function CompanyMembers() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status | 'ALL'>('PENDING')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Member | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true); setError('')
      api<Page>(`/system/company-members?${queryString({ q, status, page })}`, { signal: controller.signal }).then(setData)
        .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [q, status, page, revision])
  return <div className="admin-page da-page"><header className="admin-page-head"><div><h1 className="admin-page-title">기업회원관리</h1><p className="admin-page-desc">기업회원 가입 신청을 확인하고 승인·반려합니다.</p></div></header>
    <div className="da-toolbar"><label>처리 상태<select value={status} onChange={e => { setStatus(e.target.value as Status | 'ALL'); setPage(1); setLoading(true) }}><option value="ALL">전체</option>{Object.entries(labels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><label className="da-query">가입 신청 검색<input value={q} maxLength={100} placeholder="회사명, 사업자등록번호 또는 담당자" onChange={e => { setQ(e.target.value); setPage(1); setLoading(true) }} /></label><button className="admin-btn admin-btn-ghost" onClick={() => { setLoading(true); setRevision(n => n + 1) }}>새로고침</button></div>
    {error && <p className="da-error" role="alert">{error}</p>}{notice && <p className="da-notice" role="status">{notice}</p>}<p className="da-count">총 <strong>{data?.totalCount.toLocaleString() ?? 0}</strong>건</p>
    <div className="da-table-wrap"><table><thead><tr>{['회사명', '사업자등록번호', '담당자', '이메일', '연락처', '신청일', '상태', '관리'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={8} className="da-empty">가입 신청을 불러오는 중입니다…</td></tr> : data?.items.map(member => <tr key={member.id}><td>{member.company_name}</td><td className="da-phone">{businessNumber(member.business_no)}</td><td>{member.contact_name}</td><td>{member.contact_email}</td><td className="da-phone">{member.contact_phone}</td><td>{new Date(member.created_at).toLocaleDateString('ko-KR')}</td><td>{labels[member.status]}</td><td><button className="da-action" onClick={() => setSelected(member)}>{member.status === 'PENDING' ? '신청 검토' : '상세'}</button></td></tr>)}
      {!loading && !data?.items.length && <tr><td colSpan={8} className="da-empty">조건에 맞는 가입 신청이 없습니다.</td></tr>}
    </tbody></table></div><div className="da-pagination"><button className="admin-btn admin-btn-ghost" disabled={loading || page === 1} onClick={() => { setPage(n => n - 1); setLoading(true) }}>이전</button><span>{page} / {Math.max(1, Math.ceil((data?.totalCount ?? 0) / 20))} 페이지</span><button className="admin-btn admin-btn-ghost" disabled={loading || page * 20 >= (data?.totalCount ?? 0)} onClick={() => { setPage(n => n + 1); setLoading(true) }}>다음</button></div>
    {selected && <MemberReview member={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setNotice('가입 신청을 처리했습니다.'); setLoading(true); setPage(1); setRevision(n => n + 1) }} />}
  </div>
}
