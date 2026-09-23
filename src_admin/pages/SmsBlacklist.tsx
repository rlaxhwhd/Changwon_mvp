import { studentDisplayName } from '../../shared/studentDisplayName'
import PageNumbers from '../../shared/components/PageNumbers'
import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuInfo, LuPlus, LuSearch, LuUserCheck } from 'react-icons/lu'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import { useListData } from '../hooks/useListData'
import { useAsyncAction } from '../../shared/useAsyncAction'
import { changeSmsBlock, querySmsBlacklist, searchSmsStudents, smsBlockEvents } from '../data/smsBlacklist'
import type { SmsBlockRow } from '../data/smsBlacklist'
import './ProgramBlacklist.css'
import './SmsBlacklist.css'

function Pager({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / 20))
  return <nav className="blk-pager" aria-label="목록 페이지">
    <button type="button" aria-label="이전 페이지" disabled={page <= 1} onClick={() => onChange(page - 1)}><LuChevronLeft /></button>
    <PageNumbers page={page} pages={pages} onChange={onChange} /><span>{page} / {pages}</span>
    <button type="button" aria-label="다음 페이지" disabled={page >= pages} onClick={() => onChange(page + 1)}><LuChevronRight /></button>
  </nav>
}

function BlockModal({ initial, onClose, onSaved }: { initial: SmsBlockRow | null; onClose: () => void; onSaved: () => void }) {
  const [selected, setSelected] = useState(initial)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [reason, setReason] = useState('')
  const candidates = useListData(searchSmsStudents, { q: search, page })
  const history = useListData(smsBlockEvents, { studentId: initial?.studentId ?? '', page: historyPage })
  const { run, saving, error } = useAsyncAction()
  const blocking = !initial
  return <AdminModal title={blocking ? 'SMS 차단 등록' : `${studentDisplayName(initial.studentName, initial.studentId)} · SMS 차단 관리`} onClose={onClose} size="md">
    {!initial && <>
      <form className="blk-filter" onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1); setSelected(null) }}>
        <label className="admin-field"><span>학생 검색</span><input value={query} maxLength={200} onChange={e => setQuery(e.target.value)} placeholder="이름·학번·학과" /></label>
        <button className="admin-btn admin-btn-ghost" disabled={!query.trim()}><LuSearch /> 검색</button>
      </form>
      {candidates.error && <p role="alert">{candidates.error.message}</p>}
      {candidates.isLoading ? <p role="status">불러오는 중…</p> : <div className="sms-candidates">
        {candidates.data.items.map(row => <label className="sms-candidate" key={row.studentId}>
          <input type="radio" name="sms-student" checked={selected?.studentId === row.studentId} onChange={() => setSelected(row)} />
          <span><strong>{studentDisplayName(row.studentName, row.studentId)}</strong> · {row.studentNo}<small>{row.college ?? '소속 미등록'} · {row.studentMajor}</small></span>
        </label>)}
        {search && !candidates.data.items.length && <p>등록 가능한 학생이 없습니다. 이미 차단된 학생은 제외됩니다.</p>}
      </div>}
      {candidates.data.totalCount > 20 && <Pager page={page} count={candidates.data.totalCount} onChange={setPage} />}
    </>}
    {selected && <div className="admin-editor-hint"><LuInfo /> {studentDisplayName(selected.studentName, selected.studentId)} · {selected.studentNo} · {selected.studentMajor}</div>}
    {initial && <>
      <p>차단 사유: {initial.reason}</p>
      {history.error && <p role="alert">{history.error.message}</p>}
      {history.isLoading ? <p role="status">이력을 불러오는 중…</p> : <ul className="sms-history">
        {history.data.items.map(event => <li key={event.id}>
          <strong>{event.blocked ? '차단 등록' : '차단 해제'}</strong><p>{event.reason}</p>
          <small>{event.actorName} · {new Date(event.occurredAt).toLocaleString('ko-KR')}</small>
        </li>)}
      </ul>}
      {history.data.totalCount > 20 && <Pager page={historyPage} count={history.data.totalCount} onChange={setHistoryPage} />}
    </>}
    <label className="admin-field"><span>{blocking ? '차단' : '해제'} 사유</span>
      <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={3} placeholder="사유를 입력하세요" />
    </label>
    {error && <p className="admin-form-hint-warn" role="alert">{error}</p>}
    <div className="admin-form-actions">
      <button className="admin-btn admin-btn-ghost" disabled={saving} onClick={onClose}>닫기</button>
      <button className="admin-btn admin-btn-primary" disabled={!selected || !reason.trim() || saving}
        onClick={() => { if (selected) run(async () => { await changeSmsBlock(selected, blocking, reason.trim()); onSaved() }) }}>
        {saving ? '저장 중…' : blocking ? 'SMS 차단 등록' : 'SMS 차단 해제'}
      </button>
    </div>
  </AdminModal>
}

export default function SmsBlacklist() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<SmsBlockRow | null | undefined>(undefined)
  const { data, isLoading, error, refetch } = useListData(querySmsBlacklist, { q: search, page, blocked: true })
  return <div className="admin-page blk">
    <header className="admin-page-head"><div><h1 className="admin-page-title">SMS 블랙리스트</h1>
      <p className="admin-page-desc">SMS 수신을 차단할 학생을 관리합니다. 차단 등록·해제 이력은 보관됩니다.</p></div>
      <button className="admin-btn admin-btn-primary" onClick={() => setEditing(null)}><LuPlus /> 차단 등록</button>
    </header>
    <div className="admin-editor-hint"><LuInfo /> 등록된 학생은 이 프로젝트의 SMS 발송 대상에서 제외됩니다. 비교과 벌점과는 별도로 관리합니다.</div>
    <form className="blk-filter" onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1) }}>
      <div className="blk-filter-row"><span className="blk-label">검색조건</span><div className="blk-search">
        <input aria-label="이름·학번·학과 검색" value={query} maxLength={200} onChange={e => setQuery(e.target.value)} placeholder="이름·학번·학과를 입력하세요" /><LuSearch />
      </div><button className="blk-search-btn"><LuSearch /> 검색</button>
      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setPage(1); refetch() }}>새로고침</button></div>
    </form>
    <div className="blk-toolbar"><span className="blk-count">총 <em>{data.totalCount}</em>명</span></div>
    {error && <p className="admin-form-hint-warn" role="alert">{error.message}</p>}
    <section className="admin-card blk-card">
      {isLoading ? <div className="admin-loading" role="status">불러오는 중…</div> : !data.items.length ?
        <EmptyState icon={LuUserCheck} title="차단된 학생이 없습니다" message={search ? '검색 조건을 확인해 주세요.' : '차단 등록 버튼으로 학생을 추가할 수 있습니다.'} /> :
        <div className="blk-table">
          <div className="blk-thead"><span>번호</span><span>이름</span><span>학번</span><span>대학</span><span>학과</span><span>상태</span></div>
          {data.items.map((row, i) => <button className="blk-row" key={row.studentId} onClick={() => setEditing(row)}>
            <span className="blk-c-no">{data.totalCount - (page - 1) * 20 - i}</span><span className="blk-c-name">{studentDisplayName(row.studentName, row.studentId)}</span>
            <span className="blk-c-mono">{row.studentNo}</span><span>{row.college ?? '소속 미등록'}</span><span>{row.studentMajor}</span><span>SMS 차단</span>
          </button>)}
        </div>}
      <Pager page={page} count={data.totalCount} onChange={setPage} />
    </section>
    {editing !== undefined && <BlockModal initial={editing} onClose={() => setEditing(undefined)}
      onSaved={() => { setEditing(undefined); setPage(1); refetch() }} />}
  </div>
}
