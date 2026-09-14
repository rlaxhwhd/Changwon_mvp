import { useEffect, useRef, useState } from 'react'
import { LuArrowRightLeft, LuRefreshCw, LuSearch } from 'react-icons/lu'
import EmptyState from '../components/EmptyState'
import { getActiveUser } from '../data/staff'
import { findReferralStudents, loadReferralOptions, loadReferrals, REFERRAL_STATUS, sendReferral, updateReferral } from '../data/psychReferrals'
import type { Referral, ReferralList, ReferralOptions, ReferralStudent } from '../data/psychReferrals'
import './PsychReferrals.css'

const message = (e: unknown) => e instanceof Error ? e.message : '요청을 처리하지 못했습니다.'
const date = (value: string) => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })

export default function PsychReferrals() {
  return <ReferralPage key={getActiveUser().id} />
}

function ReferralPage() {
  const [options, setOptions] = useState<ReferralOptions | null>(null)
  const [data, setData] = useState<ReferralList | null>(null)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [students, setStudents] = useState<ReferralStudent[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [counselorId, setCounselorId] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const searchController = useRef<AbortController | null>(null)
  const mutation = useRef(false)

  useEffect(() => () => searchController.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    let running = false
    const load = async () => {
      if (running || controller.signal.aborted) return
      running = true
      try {
        const [o, d] = await Promise.all([loadReferralOptions(controller.signal), loadReferrals(page, filter, controller.signal)])
        if (!controller.signal.aborted) { setOptions(o); setData(d); setError('') }
      } catch (e) { if (!controller.signal.aborted) setError(message(e)) }
      finally { running = false }
    }
    const visible = () => { if (document.visibilityState === 'visible') void load() }
    void load()
    const timer = window.setInterval(visible, 30_000)
    window.addEventListener('focus', visible)
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', visible) }
  }, [page, filter, revision])

  async function search() {
    searchController.current?.abort()
    const controller = new AbortController()
    searchController.current = controller
    setSearching(true); setStudentId(''); setStudents([]); setSearched(false); setError('')
    try {
      const result = await findReferralStudents(q.trim(), controller.signal)
      if (!controller.signal.aborted) { setStudents(result.items); setSearched(true) }
    } catch (e) { if (!controller.signal.aborted) setError(message(e)) }
    finally { if (!controller.signal.aborted) setSearching(false) }
  }

  async function act(work: () => Promise<unknown>, success: string) {
    if (mutation.current) return
    mutation.current = true; setBusy(true); setError(''); setNotice('')
    try { await work(); setNotice(success); setRevision(n => n + 1) }
    catch (e) { setError(message(e)) }
    finally { mutation.current = false; setBusy(false) }
  }

  function change(row: Referral, action: 'ACCEPT' | 'COMPLETE' | 'CANCEL') {
    const text = action === 'ACCEPT' ? '접수' : action === 'COMPLETE' ? '처리 완료' : '취소'
    if (!window.confirm(`${row.studentName} 학생의 연계를 ${text}하시겠습니까?`)) return
    void act(() => updateReferral(row, action), `${text}했습니다.`)
  }

  const career = options?.role === 'career'
  return <div className="admin-page psych-referrals">
    <header className="admin-page-head"><div>
      <h1 className="admin-page-title">심리상담센터 연계</h1>
      <p className="admin-page-desc">{career ? '심리상담이 필요한 학생을 담당 상담사에게 연계하고 처리 현황을 확인합니다.' : '전달받은 학생의 연계 사유를 확인하고 접수·처리 현황을 관리합니다.'}</p>
    </div><button type="button" className="admin-btn admin-btn-ghost" onClick={() => setRevision(n => n + 1)}><LuRefreshCw />새로고침</button></header>
    {error && <p className="admin-field-hint" role="alert">{error} 목록을 불러오지 못한 경우 새로고침해 주세요.</p>}
    {notice && <p className="admin-save-hint" role="status">{notice}</p>}
    {!options && !error && <p role="status">연계 현황을 불러오는 중입니다.</p>}
    {options && <>
      {data && <div className="admin-statsum">{Object.entries(REFERRAL_STATUS).map(([key, label]) => <div className="admin-statsum-card" key={key}><span>{label}</span><strong>{data.counts[key as keyof typeof REFERRAL_STATUS] ?? 0}건</strong></div>)}</div>}
      {career && <section className="admin-card referral-form">
        <div className="admin-card-head"><h2><LuArrowRightLeft />학생 연계하기</h2></div>
        <p className="admin-field-hint">담당 범위의 학생을 검색한 뒤 심리상담사와 연계 사유를 선택해 주세요.</p>
        <form className="admin-filterbar" onSubmit={e => { e.preventDefault(); void search() }}>
          <label className="admin-form-field">학생 검색<input value={q} onChange={e => { searchController.current?.abort(); setSearching(false); setQ(e.target.value); setStudentId(''); setStudents([]); setSearched(false) }} placeholder="이름 또는 학번" maxLength={100} /></label>
          <button className="admin-btn admin-btn-ghost" disabled={searching || !q.trim()}><LuSearch />{searching ? '검색 중' : '검색'}</button>
        </form>
        {searched && <p className="admin-field-hint" role="status">{students.length ? `${students.length}명 조회 · 최대 30명까지 표시합니다. 이름이나 학번으로 검색 범위를 좁힐 수 있습니다.` : '검색 결과가 없습니다. 학생 이름·학번과 담당 범위를 확인해 주세요.'}</p>}
        <form onSubmit={e => { e.preventDefault(); void act(async () => { await sendReferral({ studentId, counselorId, reasonCode }); setStudentId(''); setReasonCode('') }, '심리상담사에게 연계를 요청했습니다.') }}>
          <div className="admin-form-grid">
            <label className="admin-form-field">연계 학생<select aria-label="연계 학생" required value={studentId} onChange={e => setStudentId(e.target.value)}><option value="">학생을 검색하고 선택해 주세요</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} · {s.studentNo} · {s.major}</option>)}</select></label>
            <label className="admin-form-field">담당 심리상담사<select aria-label="담당 심리상담사" required value={counselorId} onChange={e => setCounselorId(e.target.value)}><option value="">상담사 선택</option>{options.counselors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="admin-form-field">연계 사유<select aria-label="연계 사유" required value={reasonCode} onChange={e => setReasonCode(e.target.value)}><option value="">사유 선택</option>{options.reasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}</select></label>
          </div>
          <p className="admin-field-hint">선택한 사유와 학생 기본정보가 담당 심리상담사에게 전달됩니다. 연계 사유는 진단 결과가 아닙니다.</p>
          {!options.counselors.length && <p role="status">등록된 심리상담사가 없습니다.</p>}
          <div className="referral-actions"><button className="admin-btn admin-btn-primary" disabled={busy || !studentId || !counselorId || !reasonCode}>{busy ? '처리 중' : '연계 요청'}</button></div>
        </form>
      </section>}
      <div className="admin-card-head"><h2>{career ? '보낸 연계' : '받은 연계'}</h2>
        <label className="admin-form-field">처리 상태<select aria-label="처리 상태" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); setData(null) }}><option value="">전체</option>{Object.entries(REFERRAL_STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <section className="admin-card">
        {!data ? <p className="referral-form" role="status">{error ? '목록 조회를 다시 시도해 주세요.' : '목록을 불러오는 중입니다.'}</p> : !data.items.length ? <EmptyState icon={LuArrowRightLeft} message="해당하는 연계 요청이 없습니다." /> : <div className="referral-table-wrap"><table className="referral-table">
          <thead><tr><th>연계일</th><th>학생</th><th>연계 사유</th><th>{career ? '담당 심리상담사' : '보낸 상담사'}</th><th>상태</th><th>처리</th></tr></thead>
          <tbody>{data.items.map(row => <tr key={row.id}>
            <td>{date(row.createdAt)}</td><td><strong>{row.studentName}</strong><small>{row.studentNo}<br />{row.major}</small></td><td>{row.reason}</td><td>{career ? row.recipientName : row.senderName}</td>
            <td><span className={`admin-chip ${row.status === 'DONE' ? 'admin-chip-done' : row.status === 'PENDING' ? 'admin-chip-wait' : 'admin-chip-ok'}`}>{REFERRAL_STATUS[row.status]}</span><small>{row.completedAt ? date(row.completedAt) : row.cancelledAt ? date(row.cancelledAt) : row.acceptedAt ? date(row.acceptedAt) : ''}</small></td>
            <td>{career && row.status === 'PENDING' ? <button className="admin-btn admin-btn-ghost sm" disabled={busy} onClick={() => change(row, 'CANCEL')}>연계 취소</button> : !career && row.status === 'PENDING' ? <button className="admin-btn admin-btn-primary sm" disabled={busy} onClick={() => change(row, 'ACCEPT')}>접수</button> : !career && row.status === 'IN_PROGRESS' ? <button className="admin-btn admin-btn-ghost sm" disabled={busy} onClick={() => change(row, 'COMPLETE')}>처리 완료</button> : '—'}</td>
          </tr>)}</tbody></table></div>}
      </section>
      {data && <div className="referral-pagination"><span>전체 {data.totalCount}건 · {page} / {Math.max(1, Math.ceil(data.totalCount / 20))}페이지</span><button className="admin-btn admin-btn-ghost sm" disabled={page <= 1} onClick={() => { setData(null); setPage(p => p - 1) }}>이전</button><button className="admin-btn admin-btn-ghost sm" disabled={page * 20 >= data.totalCount} onClick={() => { setData(null); setPage(p => p + 1) }}>다음</button></div>}
    </>}
  </div>
}
