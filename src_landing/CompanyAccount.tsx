import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../shared/api'
import './Login.css'
import './CompanyAccount.css'

const message = (e: unknown) => e instanceof Error ? e.message : '요청을 처리하지 못했습니다.'

export function CompanyRegister() {
  const [form, setForm] = useState({ businessNo: '', password: '', confirm: '', companyName: '', contactName: '', contactEmail: '', contactPhone: '' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  async function submit() {
    if (form.password !== form.confirm) { setError('비밀번호 확인이 일치하지 않습니다.'); return }
    setPending(true); setError('')
    try {
      await api('/auth/company/register', { method: 'POST', body: JSON.stringify({ businessNo: form.businessNo, password: form.password, companyName: form.companyName, contactName: form.contactName, contactEmail: form.contactEmail, contactPhone: form.contactPhone }) })
      setForm(previous => ({ ...previous, password: '', confirm: '' })); setDone(true)
    } catch (e) { setError(message(e)) } finally { setPending(false) }
  }
  return <main className="cwlogin company-account"><div className="cwlogin-inner"><h1 className="cwlogin-title">기업회원 가입 신청</h1><p className="cwlogin-subtitle">관리자 승인 후 사업자등록번호로 로그인할 수 있습니다.</p>
    {done ? <section className="cwlogin-card"><h2>가입 신청이 접수되었습니다.</h2><p role="status">관리자 승인 후 설정한 비밀번호로 로그인해 주세요.</p><Link to="/login?type=external">기업회원 로그인</Link></section> : <form className="cwlogin-card" onSubmit={e => { e.preventDefault(); if (!pending) void submit() }}>
      {([
        ['companyName', '회사명', 'text', 'organization', 200], ['businessNo', '사업자등록번호 (아이디)', 'text', 'username', 12],
        ['password', '비밀번호 (10~128자)', 'password', 'new-password', 128], ['confirm', '비밀번호 확인', 'password', 'new-password', 128],
        ['contactName', '담당자 이름', 'text', 'name', 100], ['contactEmail', '담당자 이메일', 'email', 'email', 200], ['contactPhone', '담당자 연락처', 'tel', 'tel', 30],
      ] as const).map(([key, label, type, autocomplete, maxLength]) => <label className="cwlogin-field" key={key}><span className="cwlogin-label">{label}</span><span className="cwlogin-input"><input required type={type} autoComplete={autocomplete} maxLength={maxLength} minLength={key === 'password' ? 10 : undefined} inputMode={key === 'businessNo' ? 'numeric' : undefined} placeholder={key === 'businessNo' ? '000-00-00000' : undefined} value={form[key]} disabled={pending} onChange={e => setForm(previous => ({ ...previous, [key]: e.target.value }))} /></span></label>)}
      {error && <p className="cwlogin-error" role="alert">{error}</p>}<button className="cwlogin-submit" disabled={pending}>{pending ? '신청 중…' : '가입 신청'}</button><Link className="company-account-link" to="/login?type=external">로그인으로 돌아가기</Link>
    </form>}
  </div></main>
}

type Member = { company_name: string; business_no: string; contact_name: string; contact_email: string; contact_phone: string }
export function CompanyAccount() {
  const [member, setMember] = useState<Member | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    api<Member>('/auth/company/me', { signal: controller.signal }).then(setMember).catch(e => {
      if (controller.signal.aborted) return
      if (e && typeof e === 'object' && 'status' in e && e.status === 401) window.location.replace('/login?type=external')
      else setError(message(e))
    })
    return () => controller.abort()
  }, [])
  async function logout() {
    setPending(true); setError('')
    try { await api('/auth/company/logout', { method: 'POST' }); window.location.href = '/login?type=external' }
    catch (e) { setError(message(e)); setPending(false) }
  }
  return <main className="cwlogin company-account"><div className="cwlogin-inner"><h1 className="cwlogin-title">기업회원</h1><section className="cwlogin-card">{member ? <><h2>{member.company_name}</h2><p>가입이 승인된 기업회원입니다.</p><dl>{[['사업자등록번호', member.business_no], ['담당자', member.contact_name], ['이메일', member.contact_email], ['연락처', member.contact_phone]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button className="cwlogin-submit" disabled={pending} onClick={() => void logout()}>{pending ? '로그아웃 중…' : '로그아웃'}</button></> : !error && <p role="status">회원 정보를 불러오는 중입니다…</p>}{error && <p className="cwlogin-error" role="alert">{error}</p>}</section></div></main>
}
