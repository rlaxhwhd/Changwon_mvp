import { studentDisplayName } from '../studentDisplayName'
import { useExportSelection } from '../useExportSelection'
import { pageNumbers as getPageNumbers } from '../pagination'
import HistoryCalendar, { type HistoryDayMark } from './HistoryCalendar'
import { useEffect, useState, type ReactNode } from 'react'
import { useAsyncAction } from '../useAsyncAction'
import { COUNSEL_TYPE_LABEL, COUNSEL_TYPE_ORDER, type CounselTypeKey } from '../../src_v2/data/counsel'
import { LuMessageSquare, LuCheck, LuCalendarDays, LuClock, LuSearch, LuX, LuChevronLeft, LuChevronRight, LuArrowRight, LuDownload } from 'react-icons/lu'
import Modal from '../../src_v2/components/Modal'
import './CounselHistory.css'

const icons = { message: LuMessageSquare, check: LuCheck, calendar: LuCalendarDays, clock: LuClock, search: LuSearch, x: LuX, 'chevron-left': LuChevronLeft, 'chevron-right': LuChevronRight, arrow: LuArrowRight, download: LuDownload }
type IconName = keyof typeof icons
function Icon({ name }: { name: IconName }) { const Glyph = icons[name]; return <Glyph className="icon" aria-hidden="true" /> }
type Status = '대기' | '확정' | '완료' | '취소'
type Tab = '전체' | '예정' | '완료' | '취소'
export interface CounselHistoryRow {
  studentName?: string; studentNo?: string
  id: string; type: CounselTypeKey; status: Status; counselor: string; topic: string
  comment: string; date: string; time: string; requestedAt: string; method: string; place: string
}
const isScheduled = (r: CounselHistoryRow) => r.status === '대기' || r.status === '확정'
const tone = (r: CounselHistoryRow) => r.status === '완료' ? 'done' : r.status === '취소' ? 'cancel' : 'scheduled'
const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const prettyDate = (date: string) => date ? date.replaceAll('-', '. ') + '.' : '일정 미정'
interface Props {
  rows: CounselHistoryRow[]
  onExport?: (rows: CounselHistoryRow[]) => void
  onOpenDetail?: (row: CounselHistoryRow) => void
  showStudent?: boolean
  onCancel?: (id: string, reason: string) => Promise<void>
  detailActions?: (row: CounselHistoryRow) => ReactNode
  sidebarFooter?: ReactNode
}
/** Presentation and local filters only. Each portal owns data scope and write permissions. */
export default function CounselHistory({ rows, showStudent = false, onCancel, detailActions, sidebarFooter, onExport, onOpenDetail }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  const today = dayKey(new Date(now))
  const [selectedDate, setSelectedDate] = useState('')
  const [tab, setTab] = useState<Tab>('전체')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState<CounselTypeKey | ''>('')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const action = useAsyncAction()
  const counts: Record<Tab, number> = {
    전체: rows.length, 예정: rows.filter(isScheduled).length,
    완료: rows.filter(r => r.status === '완료').length, 취소: rows.filter(r => r.status === '취소').length,
  }
  const latest = rows.filter(r => r.status === '완료' && r.date).map(r => r.date).sort().at(-1) ?? ''
  const stats: { label: string; value: string; icon: IconName }[] = [
    { label: '총 상담 건수', value: `${counts.전체}건`, icon: 'message' },
    { label: '완료된 상담', value: `${counts.완료}건`, icon: 'check' },
    { label: '예정된 상담', value: `${counts.예정}건`, icon: 'calendar' },
    { label: '최근 상담일', value: latest ? prettyDate(latest) : '—', icon: 'clock' },
  ]
  const invalidRange = !!from && !!until && from > until
  const filtered = rows.filter(r => {
    const matchesTab = tab === '전체' || (tab === '예정' ? isScheduled(r) : r.status === tab)
    return matchesTab && (!status || r.status === status) && (!type || r.type === type)
      && (!selectedDate || r.date === selectedDate) && (!from || r.date >= from)
      && (!until || (!!r.date && r.date <= until)) && !invalidRange
      && `${r.topic} ${r.counselor} ${r.comment} ${r.studentName ?? ''} ${r.studentNo ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  }).sort((a, b) => {
    const comparison = `${a.date || a.requestedAt.slice(0, 10)} ${a.time}`.localeCompare(`${b.date || b.requestedAt.slice(0, 10)} ${b.time}`) || a.id.localeCompare(b.id)
    return order === 'desc' ? -comparison : comparison
  })
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const pageNumbers = getPageNumbers(currentPage, pages)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selection = useExportSelection(JSON.stringify([selectedDate, tab, query, status, type, from, until]), pageRows, row => row.id)
  const exportRows = filtered.filter(row => selection.ids.includes(row.id))
  const upcoming = rows.filter(r => isScheduled(r) && r.date && new Date(`${r.date}T${r.time || '23:59'}:00+09:00`).getTime() >= now)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 3)
  const detail = rows.find(r => r.id === detailId)
  const openDetail = (id: string) => { const row = rows.find(r => r.id === id); if (onOpenDetail && row) { onOpenDetail(row); return }; setDetailId(id); setCancelling(false); setReason('') }
  const reset = () => { setSelectedDate(''); setQuery(''); setStatus(''); setType(''); setFrom(''); setUntil(''); setTab('전체'); setPage(1) }
  const chooseDate = (date: string) => { reset(); setSelectedDate(date === selectedDate ? '' : date) }
  const calendarMarks = new Map<string, HistoryDayMark>()
  for (const row of rows) {
    if (!row.date) continue
    const mark = calendarMarks.get(row.date) ?? { scheduled: 0, done: 0 }
    if (isScheduled(row)) mark.scheduled++
    if (row.status === '완료') mark.done++
    calendarMarks.set(row.date, mark)
  }

  return <div className="cs-page">
    <div className="cs-layout">
      <div className="cs-main-column">
        <section className="cs-stats" aria-label="상담 요약">
          {stats.map(stat => <div className="cs-stat" key={stat.label}><Icon name={stat.icon} /><div><p>{stat.label}</p><strong>{stat.value}</strong></div></div>)}
        </section>
        <section className="cs-history cs-panel" aria-label="상담 내역">
          <div className="cs-tabs" role="group" aria-label="상담 상태">
            {(Object.keys(counts) as Tab[]).map(key => <button type="button" key={key} className={tab === key ? 'is-active' : ''} aria-pressed={tab === key} onClick={() => { setTab(key); setStatus(''); setPage(1) }}>{key} <span>({counts[key]})</span></button>)}
          </div>
          <div className="cs-filters">
            <label className="cs-search"><Icon name="search" /><input aria-label={showStudent ? "학생 이름, 학번 또는 상담 검색" : "상담 주제 또는 상담사 검색"} placeholder={showStudent ? "학생 이름, 학번, 상담 주제로 검색" : "상담 주제, 상담사명으로 검색"} value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label>
            <select aria-label="상담 상태 필터" value={status} onChange={e => { setStatus(e.target.value); setTab('전체'); setPage(1) }}><option value="">상태 전체</option>{['대기', '확정', '완료', '취소'].map(s => <option key={s}>{s}</option>)}</select>
            <select aria-label="상담 유형 필터" value={type} onChange={e => { setType(e.target.value as CounselTypeKey | ''); setPage(1) }}><option value="">상담유형 전체</option>{COUNSEL_TYPE_ORDER.map(t => <option key={t} value={t}>{COUNSEL_TYPE_LABEL[t]}</option>)}</select>
            <div className="cs-date-range"><input type="date" aria-label="상담 시작일" value={from} max={until || undefined} onChange={e => { setFrom(e.target.value); setSelectedDate(''); setPage(1) }} /><span>~</span><input type="date" aria-label="상담 종료일" value={until} min={from || undefined} onChange={e => { setUntil(e.target.value); setSelectedDate(''); setPage(1) }} /></div>
            <select aria-label="상담 정렬" value={order} onChange={e => { setOrder(e.target.value); setPage(1) }}><option value="desc">최신순</option><option value="asc">오래된순</option></select>
            {onExport && <button type="button" className="cs-button" disabled={!exportRows.length} onClick={() => onExport(exportRows)}><Icon name="download" /> 엑셀 CSV ({exportRows.length})</button>}
          </div>
          {(selectedDate || query || status || type || from || until) && <div className="cs-filter-note"><span>{selectedDate ? `${prettyDate(selectedDate)} 상담 내역` : `검색 결과 ${filtered.length}건`}</span><button type="button" onClick={reset}>필터 초기화 <Icon name="x" /></button></div>}
          {invalidRange && <p className="cs-error" role="alert">종료일을 시작일 이후로 선택해 주세요.</p>}
          <div className="cs-table-scroll" tabIndex={0} role="region" aria-label="상담 내역 표">
            <table className="cs-table"><thead><tr>{onExport && <th>{selection.header}</th>}{['No.', ...(showStudent ? ['학생'] : []), '상담유형', '상담사', '상담 주제', '상태', '상담일시', '진행 방식', '공개 코멘트', '상세'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{pageRows.map((r, i) => <tr key={r.id}>
                <>{onExport && <td>{selection.checkbox(r, r.studentName ?? r.topic)}</td>}</><td>{filtered.length - (currentPage - 1) * pageSize - i}</td>{showStudent && <td className="cs-name-cell"><strong>{studentDisplayName(r.studentName, r.studentNo)}</strong><small className="cs-student-no">{r.studentNo}</small></td>}<td>{COUNSEL_TYPE_LABEL[r.type]}</td><td>{r.counselor}</td>
                <td><span className="cs-cell-text" title={r.topic}>{r.topic}</span></td><td><span className={`cs-status cs-status--${tone(r)}`}>{r.status}</span></td>
                <td className="cs-table-date">{prettyDate(r.date)}{r.time && <small>{r.time}</small>}</td><td>{r.method}</td>
                <td><span className="cs-cell-text cs-comment" title={r.comment}>{r.comment || '—'}</span></td>
                <td><button type="button" className="cs-detail-button" onClick={() => openDetail(r.id)} aria-label={`${r.topic} 상세보기`}>상세보기</button></td>
              </tr>)}</tbody>
            </table>
            {!pageRows.length && <div className="cs-empty"><Icon name="message" /><strong>{rows.length ? '조건에 맞는 상담 내역이 없습니다.' : '아직 상담 내역이 없습니다.'}</strong><p>{rows.length ? '다른 날짜를 선택하거나 필터를 초기화해 보세요.' : '등록된 상담 일정과 기록이 이곳에 표시됩니다.'}</p>{rows.length ? <button type="button" className="cs-button" onClick={reset}>전체 내역 보기</button> : null}</div>}
          </div>
          <div className="cs-pagination"><span>총 <strong>{filtered.length}</strong>건 <span className="cs-page-divider">|</span> {currentPage} / {pages} 페이지</span>
            <nav aria-label="상담 내역 페이지"><button type="button" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><Icon name="chevron-left" /></button>{pageNumbers.map(number => <button key={number} type="button" aria-label={`${number}페이지`} aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}<button type="button" aria-label="다음 페이지" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><Icon name="chevron-right" /></button></nav>
            <select aria-label="페이지당 상담 수" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>{[10, 20, 50].map(n => <option value={n} key={n}>{n}개씩 보기</option>)}</select>
          </div>
        </section>
      </div>
      <aside className="cs-sidebar" aria-label="상담 일정">
        <HistoryCalendar today={today} selectedDate={selectedDate} onSelect={chooseDate} marks={calendarMarks} title="상담 캘린더" scheduledLabel="상담 예정" doneLabel="상담 완료" />
        <section className="cs-panel cs-upcoming"><div className="cs-panel-head"><h2>다가오는 상담 일정</h2><button type="button" className="cs-text-button" onClick={() => { reset(); setTab('예정') }}>전체 보기 <Icon name="chevron-right" /></button></div>
          {upcoming.length ? <ul>{upcoming.map(r => {
            const days = Math.round((Date.parse(`${r.date}T00:00:00+09:00`) - Date.parse(`${today}T00:00:00+09:00`)) / 86400000)
            return <li key={r.id}><button type="button" onClick={() => openDetail(r.id)}><span className="cs-upcoming-date">{prettyDate(r.date)} {r.time}<em>{days === 0 ? 'D-DAY' : `D-${days}`}</em></span><strong>{r.topic}</strong><small>{showStudent ? studentDisplayName(r.studentName, r.studentNo) : r.counselor} · {r.method} · {r.status}</small></button></li>
          })}</ul> : <p className="cs-side-empty">예정된 상담 일정이 없습니다.<br />일정이 정해지면 여기에 표시됩니다.</p>}
        </section>
        {sidebarFooter}
      </aside>
    </div>
    <Modal open={!!detail} onClose={() => setDetailId(null)} title="상담 상세정보" size="md">{detail && <div className="cs-detail">
      <span className={`cs-status cs-status--${tone(detail)}`}>{detail.status}</span><h3>{detail.topic}</h3>
      <dl>{showStudent && <div><dt>학생</dt><dd>{studentDisplayName(detail.studentName, detail.studentNo)} · {detail.studentNo}</dd></div>}<div><dt>상담유형</dt><dd>{COUNSEL_TYPE_LABEL[detail.type]}</dd></div><div><dt>상담사</dt><dd>{detail.counselor}</dd></div><div><dt>상담일시</dt><dd>{prettyDate(detail.date)} {detail.time}</dd></div><div><dt>진행 방식</dt><dd>{detail.method}</dd></div><div><dt>장소 / 안내</dt><dd>{detail.place || '별도 안내'}</dd></div><div><dt>신청일</dt><dd>{prettyDate(dayKey(new Date(detail.requestedAt)))}</dd></div></dl>
      {detail.status === '완료' && <section className="cs-public-comment"><h4>상담사 코멘트</h4><p>{detail.comment || '등록된 공개 코멘트가 없습니다.'}</p></section>}
      {onCancel && detail.status === '대기' && (!cancelling ? <button type="button" className="cs-button cs-cancel-button" onClick={() => setCancelling(true)}>상담 신청 취소</button> : <div className="cs-cancel-form"><label htmlFor="cs-cancel-reason">취소 사유</label><textarea id="cs-cancel-reason" rows={3} placeholder="상담사에게 전달할 취소 사유를 입력해 주세요." value={reason} onChange={e => setReason(e.target.value)} />{action.error && <p role="alert" className="cs-error">{action.error}</p>}<div><button type="button" className="cs-button" onClick={() => setCancelling(false)}>돌아가기</button><button type="button" className="cs-button cs-cancel-button" disabled={!reason.trim() || action.saving} onClick={() => action.run(async () => { await onCancel(detail.id, reason.trim()); setCancelling(false) })}>{action.saving ? '취소 중…' : '취소 확정'}</button></div></div>)}
      {detailActions?.(detail)}
    </div>}</Modal>
  </div>
}

