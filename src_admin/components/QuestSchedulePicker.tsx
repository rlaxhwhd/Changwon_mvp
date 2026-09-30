import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import type { QuestAssignment, QuestOptions } from '../../shared/questManagement'
import { missionError } from '../../shared/missions'

type Schedule = Omit<QuestAssignment, 'items'>
type Result = { items: Schedule[]; totalCount: number }

/** Select existing assignments; update their schedule without rebuilding quest snapshots. */
export default function QuestSchedulePicker() {
  const [period, setPeriod] = useState<'MONTHLY' | 'SEMESTER'>('MONTHLY')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Result>({ items: [], totalCount: 0 })
  const [options, setOptions] = useState<QuestOptions | null>(null)
  const [selected, setSelected] = useState<Schedule | null>(null)
  const [periodKey, setPeriodKey] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setLoading(true); setError('')
    Promise.all([
      api<Result>(`/system/quests/schedules?period=${period}&page=${page}&q=${encodeURIComponent(query)}`, { signal: controller.signal }),
      api<QuestOptions>('/system/quests/options', { signal: controller.signal }),
    ]).then(([rows, metadata]) => {
      if (!cancelled) { setResult(rows); setOptions(metadata) }
    }).catch(e => { if (!cancelled) setError(missionError(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [period, page, query, revision])

  function clearSelection() { setSelected(null); setPeriodKey(''); setReason(''); setMessage('') }
  async function save() {
    if (!selected || saving) return
    setSaving(true); setError(''); setMessage('')
    try {
      await api(`/system/quests/assignments/${selected.id}/schedule`, {
        method: 'PUT', body: JSON.stringify({ expectedVersion: selected.version, periodKey, reason }),
      })
      setSelected(null); setReason(''); setRevision(v => v + 1)
      setMessage('선택한 퀘스트의 운영 일정을 저장했습니다.')
    } catch (e) { setError(missionError(e)) } finally { setSaving(false) }
  }

  const semester = options?.semesters.find(s => s.code === periodKey)
  return <section className="quest-schedule-picker" aria-label="월간·학기 퀘스트 운영 일정">
    <h2>월간·학기 퀘스트 운영 일정</h2>
    <p>등록된 퀘스트 편성을 선택해 운영 기간을 지정합니다. 일일 퀘스트는 고정 운영합니다.</p>
    <fieldset disabled={saving}>
      <legend>퀘스트 선택</legend>
      <label>퀘스트 구분 <select value={period} onChange={e => {
        setPeriod(e.target.value as typeof period); setPage(1); setQuery(''); setSearch(''); clearSelection()
      }}><option value="MONTHLY">월간 퀘스트</option><option value="SEMESTER">학기 퀘스트</option></select></label>
      <form className="qs-search" onSubmit={e => { e.preventDefault(); setQuery(search.trim()); setPage(1); clearSelection() }}>
        <label>편성 이름 검색 <input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="등록된 편성 이름" /></label>
        <button className="btn btn-secondary" type="submit">검색</button>
      </form>
      {loading ? <p role="status">등록된 퀘스트를 불러오는 중입니다…</p> : <>
        <label className="qs-select">등록된 퀘스트 <select value={selected?.id ?? ''} disabled={!result.items.length || !!error} onChange={e => {
          const row = result.items.find(r => r.id === Number(e.target.value)) ?? null
          setSelected(row); setPeriodKey(row?.period_key ?? ''); setReason(''); setMessage('')
        }}><option value="">퀘스트를 선택하세요</option>{result.items.map(row => <option key={row.id} value={row.id}>
          {row.title} · {row.period_key} · #{row.id}{row.locked ? ' (일정 변경 불가)' : row.published ? ' (게시 예약)' : ' (비공개)'}
        </option>)}</select></label>
        {!result.items.length && !error && <p>{query ? '검색 결과가 없습니다.' : '등록된 퀘스트 편성이 없습니다.'} <Link to="/quests/manage">퀘스트 관리에서 편성 등록</Link></p>}
        {result.totalCount > 20 && <div className="pagination"><button type="button" className="btn btn-secondary" disabled={page === 1} onClick={() => { setPage(p => p - 1); clearSelection() }}>이전</button><span>{page} / {Math.ceil(result.totalCount / 20)}페이지 · 총 {result.totalCount}건</span><button type="button" className="btn btn-secondary" disabled={page * 20 >= result.totalCount} onClick={() => { setPage(p => p + 1); clearSelection() }}>다음</button></div>}
      </>}
    </fieldset>
    {selected && !loading && <form onSubmit={e => { e.preventDefault(); void save() }}>
      <fieldset disabled={saving || selected.locked || !!error}>
        <legend>운영 기간 지정</legend>
        <p><strong>{selected.title}</strong> · {selected.audience === 'ALL' ? '전체 학생' : `${selected.grades.length ? selected.grades.map(g => `${g}학년`).join(', ') : '전체 학년'} / ${selected.student_types.length ? selected.student_types.map(t => options?.studentTypes.find(s => s.code === t)?.label ?? (t === 'UNDIAGNOSED' ? '미진단' : t)).join(', ') : '전체 유형'}`}</p>
        <p>현재 일정: {selected.starts_on} ~ {selected.ends_on}</p>
        {selected.locked ? <p>시작되었거나 완료 이력이 있는 퀘스트는 운영 일정을 변경할 수 없습니다.</p> : <>
          {period === 'MONTHLY' ? <><label>운영 월 <input type="month" required value={periodKey} onChange={e => setPeriodKey(e.target.value)} /></label><p>선택한 월의 1일부터 마지막 날까지 운영합니다.</p></> : <>
            <label>운영 학기 <select required value={periodKey} onChange={e => setPeriodKey(e.target.value)}><option value="">학기를 선택하세요</option>{!semester && periodKey && <option value={periodKey} disabled>현재 학기 ({periodKey}) · 사용 불가</option>}{options?.semesters.map(s => <option key={s.code} value={s.code}>{s.label} · {s.payload.startDate} ~ {s.payload.endDate}</option>)}</select></label>
            {semester && <p>지정할 일정: {semester.payload.startDate} ~ {semester.payload.endDate}</p>}
            {!options?.semesters.length && <p>아래 ‘기본 학기 일정 관리’에서 학기를 먼저 등록하세요.</p>}
          </>}
          <label className="qs-reason">변경 사유 <input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <button className="btn btn-primary" type="submit" disabled={!periodKey || !reason.trim() || (period === 'SEMESTER' && !semester)}>{saving ? '저장 중…' : '운영 일정 저장'}</button>
        </>}
      </fieldset>
    </form>}
    {error && <p role="alert">{error} <button className="btn btn-secondary" disabled={saving} onClick={() => { clearSelection(); setRevision(v => v + 1) }}>다시 조회</button></p>}
    {message && <p role="status">{message}</p>}
  </section>
}
