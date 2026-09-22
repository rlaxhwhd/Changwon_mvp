import { pageNumbers } from '../../../shared/pagination'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../shared/api'
import { PROGRAM_EVENT } from '../../../shared/programStore'
import { categoryLabel, selectionLabel, outcomeLabel, attendanceLabel } from '../../../src_admin/data/schema/program'
import { getActiveStudentId } from '../../data/students'
import { myProgramSurveys, type MyProgram } from '../../../shared/myPrograms'
import Modal from '../../components/Modal'
import '../../../shared/components/CounselHistory.css'
import HistoryCalendar, { type HistoryDayMark } from '../../../shared/components/HistoryCalendar'
import { Icon } from '../../components/Icon'
import './MyPrograms.css'
import { usePageHead } from '../../components/PageCrumb'

type Status = string
interface AppliedProgram extends MyProgram {
  status: Status
  hostDept: string
}
const kstDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
const iso = (date: string | null) => !date ? '' : date.includes('T') ? kstDate.format(new Date(date)) : date.slice(0, 10)
const tone = (status: Status) => status === outcomeLabel('COMPLETED') ? 'done' : [selectionLabel('CANCELLED'), selectionLabel('REJECTED'), outcomeLabel('NOT_COMPLETED'), outcomeLabel('ABSENT')].includes(status) ? 'cancel' : 'scheduled'

export default function MyPrograms() {
  usePageHead('비교과프로그램 현황', '신청한 프로그램의 일정과 참여 내역을 한눈에 확인합니다.')
  const [items, setItems] = useState<MyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const studentId = getActiveStudentId()
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(''); setItems([])
      try {
        const result: MyProgram[] = []
        for (let page = 1; ; page++) {
          const response = await api<{ items: MyProgram[]; totalCount: number }>(`/programs/mine?page=${page}&pageSize=100`, { signal: controller.signal })
          result.push(...response.items)
          if (!response.items.length || result.length >= response.totalCount) break
        }
        if (!controller.signal.aborted) setItems(result)
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '신청 내역을 불러오지 못했습니다.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener(PROGRAM_EVENT, refresh)
    return () => { controller.abort(); window.removeEventListener(PROGRAM_EVENT, refresh) }
  }, [studentId, revision])
  const programs: AppliedProgram[] = items.map(p => ({ ...p,
    category: categoryLabel(p.category), hostDept: p.manager || '미등록',
    status: p.cancelledAt || p.selection === 'CANCELLED' ? selectionLabel('CANCELLED')
      : p.outcome ? outcomeLabel(p.outcome) : selectionLabel(p.selection),
  }))
  const filters = ['전체', ...new Set(programs.map(p => p.status))]
  const [filter, setFilter] = useState('전체')
  const [detailId, setDetailId] = useState<string | null>(null)
  const detail = programs.find(p => p.id === detailId) ?? null
  const setDetail = (p: AppliedProgram | null) => setDetailId(p?.id ?? null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const today = kstDate.format(new Date())
  const reset = () => { setFilter('전체'); setQuery(''); setCategory(''); setFrom(''); setUntil(''); setSelectedDate(''); setPage(1) }
  const filtered = programs.filter(p => (filter === '전체' || p.status === filter)
    && (!category || p.category === category)
    && `${p.title} ${p.hostDept}`.toLowerCase().includes(query.trim().toLowerCase())
    && (!(from || until || selectedDate) || Boolean(p.startDate && p.endDate))
    && (!from || iso(p.endDate) >= from) && (!until || iso(p.startDate) <= until)
    && (!selectedDate || (iso(p.startDate) <= selectedDate && iso(p.endDate) >= selectedDate)))
    .sort((a,b) => (order === 'desc' ? -1 : 1) * iso(a.startDate).localeCompare(iso(b.startDate)))
  const pages = Math.max(1, Math.ceil(filtered.length / size))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * size, current * size)
  const done = programs.filter(p => p.outcome === 'COMPLETED' && !p.cancelledAt)
  const markForDate = (date: string): HistoryDayMark => programs.reduce((mark, p) => {
    if (!p.cancelledAt && p.selection !== 'CANCELLED' && p.selection !== 'REJECTED'
      && p.startDate && p.endDate && iso(p.startDate) <= date && iso(p.endDate) >= date) {
      if (p.outcome === 'COMPLETED') mark.done++
      else if (p.selection === 'SELECTED' && !p.outcome) mark.scheduled++
    }
    return mark
  }, { scheduled: 0, done: 0 })
  const upcoming = programs.filter(p => !p.cancelledAt && p.selection === 'SELECTED' && !p.outcome && iso(p.endDate) >= today).sort((a,b) => iso(a.startDate).localeCompare(iso(b.startDate))).slice(0,3)
  return <div className="cs-page mp-page"><div className="cs-layout"><div className="cs-main-column">
    <section className="cs-stats" aria-label="프로그램 요약">
      {[{label:'전체 신청',value:loading?'—':`${programs.length}건`,icon:'message' as const},{label:'수료 프로그램',value:`${done.length}건`,icon:'check' as const},{label:'선발 프로그램',value:`${programs.filter(p=>p.selection==='SELECTED'&&!p.cancelledAt).length}건`,icon:'calendar' as const},{label:'선발 대기',value:`${programs.filter(p=>p.selection==='PENDING'&&!p.cancelledAt).length}건`,icon:'clock' as const}].map(s=><div className="cs-stat" key={s.label}><Icon name={s.icon}/><div><p>{s.label}</p><strong>{loading || error ? '—' : s.value}</strong></div></div>)}
    </section>
    <section className="cs-panel cs-history" aria-label="프로그램 신청 내역">
      <div className="cs-tabs" role="group" aria-label="프로그램 상태">{filters.map(f=><button type="button" key={f} aria-pressed={filter===f} className={filter===f?'is-active':''} onClick={()=>{setFilter(f);setPage(1)}}>{f} <span>({f==='전체'?programs.length:programs.filter(p=>p.status===f).length})</span></button>)}</div>
      <div className="cs-filters"><label className="cs-search"><Icon name="search"/><input aria-label="프로그램명 또는 담당자 검색" placeholder="프로그램명, 담당자 검색" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label>
        <select aria-label="프로그램 분류" value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option value="">분류 전체</option>{[...new Set(programs.map(p=>p.category))].map(c=><option key={c}>{c}</option>)}</select>
        <div className="cs-date-range"><input type="date" aria-label="운영 시작일" value={from} max={until||undefined} onChange={e=>{setFrom(e.target.value);setSelectedDate('');setPage(1)}}/><span>~</span><input type="date" aria-label="운영 종료일" value={until} min={from||undefined} onChange={e=>{setUntil(e.target.value);setSelectedDate('');setPage(1)}}/></div>
        <select aria-label="프로그램 정렬" value={order} onChange={e=>{setOrder(e.target.value);setPage(1)}}><option value="desc">최신순</option><option value="asc">오래된순</option></select>
      </div>
      {(query||category||from||until||selectedDate)&&<div className="cs-filter-note"><span>{selectedDate?`${selectedDate} 운영 프로그램`:`검색 결과 ${filtered.length}건`}</span><button type="button" onClick={reset}>필터 초기화 <Icon name="x"/></button></div>}
      {loading && <p className="cs-load-state" role="status">신청 내역을 불러오는 중입니다.</p>}
      {error && <div className="cs-load-state" role="alert"><p>{error}</p><button type="button" className="cs-button" onClick={()=>setRevision(value=>value+1)}>다시 시도</button></div>}
      <div className="cs-table-scroll" tabIndex={0} role="region" aria-label="프로그램 신청 내역 표"><table className="cs-table mp-table"><thead><tr>{['No.','분류','프로그램명','담당자','운영 기간','상태','운영 회차','신청일','상세'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((p,i)=><tr key={p.id}><td>{filtered.length-(current-1)*size-i}</td><td>{p.category}</td><td><span className="cs-cell-text" title={p.title}>{p.title}</span></td><td><span className="cs-cell-text" title={p.hostDept}>{p.hostDept}</span></td><td className="cs-table-date">{p.startDate || '일정 미정'}{p.endDate && <small>~ {p.endDate}</small>}</td><td><span className={`cs-status cs-status--${tone(p.status)}`}>{p.status}</span>{myProgramSurveys(p, today).some(s => !s.done) && <Link className="mp-survey-pill" to={`/mypage/programs/${p.id}/survey/${myProgramSurveys(p, today).find(s => !s.done)!.phase}`}>설문 대기</Link>}</td><td>{p.sessions}회</td><td className="cs-table-date">{iso(p.appliedAt)}</td><td><button type="button" className="cs-detail-button" onClick={()=>setDetail(p)} aria-label={`${p.title} 상세보기`}>상세보기</button></td></tr>)}</tbody></table>
        {!loading&&!error&&!rows.length&&<div className="cs-empty"><Icon name="calendar"/><strong>조건에 맞는 프로그램 내역이 없습니다.</strong><p>다른 날짜를 선택하거나 필터를 초기화해 보세요.</p><button type="button" className="cs-button" onClick={reset}>전체 내역 보기</button></div>}
      </div>
      <div className="cs-pagination"><span>총 <strong>{filtered.length}</strong>건 <span className="cs-page-divider">|</span> {current} / {pages} 페이지</span><nav aria-label="프로그램 내역 페이지"><button type="button" aria-label="이전 페이지" disabled={current===1} onClick={()=>setPage(current-1)}><Icon name="chevron-left"/></button>{pageNumbers(current, pages).map(n => <button type="button" key={n} aria-current={n === current ? "page" : undefined} onClick={() => setPage(n)}>{n}</button>)}<button type="button" aria-label="다음 페이지" disabled={current===pages} onClick={()=>setPage(current+1)}><Icon name="chevron-right"/></button></nav><select aria-label="페이지당 프로그램 수" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}>{[10,20,50].map(n=><option value={n} key={n}>{n}개씩 보기</option>)}</select></div>
    </section>
  </div><aside className="cs-sidebar" aria-label="프로그램 일정">
    <HistoryCalendar today={today} selectedDate={selectedDate} onSelect={date=>{reset();setSelectedDate(date===selectedDate?'':date)}} markForDate={markForDate} title="프로그램 캘린더" scheduledLabel="예정·진행" doneLabel="수료"/>
    <section className="cs-panel cs-upcoming"><div className="cs-panel-head"><h2>다가오는 프로그램</h2></div>{upcoming.length?<ul>{upcoming.map(p=><li key={p.id}><button type="button" onClick={()=>setDetail(p)}><span className="cs-upcoming-date">{p.startDate} ~ {p.endDate}</span><strong>{p.title}</strong><small>{p.hostDept} · {p.status}</small></button></li>)}</ul>:<p className="cs-side-empty">예정된 프로그램이 없습니다.<br/>새로운 프로그램을 찾아보세요.</p>}</section>
    <section className="cs-booking"><Icon name="calendar"/><h2>새로운 경험을 시작해 보세요</h2><p>진로와 취업에 도움이 되는<br/>다양한 비교과 프로그램을 만나보세요.</p><Link to="/growth/program">프로그램 찾아보기 <Icon name="arrow"/></Link></section>
  </aside></div>
  <Modal open={!!detail} onClose={()=>setDetail(null)} title="프로그램 참여 내역" size="md">{detail&&<div className="cs-detail"><span className={`cs-status cs-status--${tone(detail.status)}`}>{detail.status}</span><h3>{detail.title}</h3><dl><div><dt>분류</dt><dd>{detail.category}</dd></div><div><dt>담당자</dt><dd>{detail.hostDept}</dd></div><div><dt>운영 기간</dt><dd>{detail.startDate || '일정 미정'}{detail.endDate ? ` ~ ${detail.endDate}` : ''}</dd></div><div><dt>신청일</dt><dd>{iso(detail.appliedAt)}</dd></div><div><dt>운영 회차</dt><dd>{detail.sessions}회</dd></div></dl><section className="cs-public-comment"><h4>프로그램 소개</h4><p>{detail.description}</p></section><dl><div><dt>장소</dt><dd>{detail.location || '미등록'}</dd></div><div><dt>출석</dt><dd>{attendanceLabel(detail.attendance)}</dd></div></dl>
    {myProgramSurveys(detail, today).length > 0 && <section className="cs-public-comment mp-surveys"><h4>조사 참여</h4><ul>{myProgramSurveys(detail, today).map(s => <li key={s.phase}><span>{s.label}</span>{s.done ? <span className="cs-status cs-status--done">제출 완료</span> : <Link className="cs-button" to={`/mypage/programs/${detail.id}/survey/${s.phase}`} onClick={()=>setDetail(null)}>응답하기 <Icon name="arrow"/></Link>}</li>)}</ul></section>}
    <button type="button" className="cs-button" onClick={()=>setDetail(null)}>확인</button></div>}</Modal>
  </div>
}
