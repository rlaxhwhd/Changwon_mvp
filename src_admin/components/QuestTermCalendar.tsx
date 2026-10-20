import { useEffect, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { ko } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { api } from '../../shared/api'
import { missionError } from '../../shared/missions'

// ─────────────────────────────────────────────────────────────────────────
// 학기 기간 설정 — 연도 없이 1학기·2학기의 월/일 기간을 정하고 매년 반복한다(2026-10-20 사용자 확정).
// 달력은 기준 연도(윤년 2024 → 2025.2)를 빌려 그릴 뿐 연도·요일을 보여 주지 않는다.
// 종료 월/일이 시작보다 앞이면 다음 해에 끝나는 학기다(예: 09-01 ~ 02-28). 연도별 학기는 서버가 계산한다.
// ─────────────────────────────────────────────────────────────────────────

interface Term { code: 'FIRST' | 'SECOND'; label: string; version: number; configured: boolean; start: string | null; end: string | null }

const REF = 2024
const pad = (n: number) => String(n).padStart(2, '0')
const toMonthDay = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromMonthDay = (value: string, year: number) => {
  const [m, d] = value.split('-').map(Number)
  return new Date(year, m - 1, m === 2 && d === 29 && year !== REF ? 28 : d)
}
const toRange = (t: Term): DateRange | undefined => t.start && t.end
  ? { from: fromMonthDay(t.start, REF), to: fromMonthDay(t.end, t.end < t.start ? REF + 1 : REF) } : undefined
const label = (value: string) => `${Number(value.slice(0, 2))}월 ${Number(value.slice(3))}일`

function TermCard({ term, onSaved }: { term: Term; onSaved: (t: Term) => void }) {
  const [range, setRange] = useState<DateRange | undefined>(() => toRange(term))
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const start = range?.from ? toMonthDay(range.from) : null
  const end = range?.to ? toMonthDay(range.to) : null
  const changed = start !== term.start || end !== term.end
  async function save() {
    if (!start || !end) return
    setBusy(true); setError(''); setMessage('')
    try {
      const saved = await api<Term>(`/system/quests/terms/${term.code}`, { method: 'PUT', body: JSON.stringify({ expectedVersion: term.version, start, end }) })
      onSaved(saved); setMessage(`${term.label} 기간을 저장했습니다.`)
    } catch (reason) { setError(missionError(reason)) } finally { setBusy(false) }
  }
  return <section className="mm-panel qm-term">
    <div className="mm-heading"><div><span className="mm-kicker">매년 반복</span><h2>{term.label}</h2></div>
      <strong className="qm-term-range">{start && end ? `${label(start)} ~ ${end < start ? '다음 해 ' : ''}${label(end)}` : '미설정'}</strong></div>
    <DayPicker mode="range" locale={ko} selected={range} onSelect={setRange} numberOfMonths={2} max={364}
      defaultMonth={range?.from ?? new Date(REF, term.code === 'FIRST' ? 2 : 8, 1)}
      startMonth={new Date(REF, 0, 1)} endMonth={new Date(REF + 1, 1, 1)} hideWeekdays
      formatters={{ formatCaption: month => `${month.getMonth() + 1}월` }} disabled={busy}
      labels={{ labelGrid: month => `${month.getMonth() + 1}월`, labelDayButton: (day, modifiers) => `${day.getMonth() + 1}월 ${day.getDate()}일${modifiers.selected ? ', 선택됨' : ''}` }} />
    <p className="mm-hint">시작일과 종료일을 차례로 누르세요. 종료일이 시작일보다 앞선 달이면 다음 해에 끝나는 학기로 저장됩니다.</p>
    <div className="qm-save">
      {changed && term.configured && <button className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => setRange(toRange(term))}>되돌리기</button>}
      <button className="admin-btn admin-btn-primary" disabled={busy || !start || !end || !changed} onClick={() => void save()}>{busy ? '저장 중…' : `${term.label} 기간 저장`}</button>
    </div>
    {error && <p className="mm-error" role="alert">{error}</p>}{message && <p className="mm-success" role="status">{message}</p>}
  </section>
}

export default function QuestTermCalendar({ onChanged }: { onChanged: () => void }) {
  const [terms, setTerms] = useState<Term[] | null>(null)
  const [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    api<{ items: Term[] }>('/system/quests/terms', { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) { setTerms(result.items); setError('') } })
      .catch(reason => { if (!abort.signal.aborted) setError(missionError(reason)) })
    return () => abort.abort()
  }, [retry])
  if (error) return <p className="mm-error" role="alert">{error}<button onClick={() => setRetry(r => r + 1)}>다시 조회</button></p>
  if (!terms) return <p className="mm-empty" role="status">학기 기간을 불러오는 중입니다.</p>
  return <div className="qm-terms">
    <p className="qm-rule">학기 기간은 연도 없이 월/일로 정하며 매년 같은 기간이 적용됩니다. 학기 중 평일에만 일일 퀘스트 XP가 지급되고, 학기 성장 레벨(0~12.5)도 이 기간으로 집계합니다. 변경은 이후 지급과 새 편성부터 적용되며, 이미 저장한 편성의 운영 기간은 유지됩니다.</p>
    <div className="qm-term-grid">{terms.map(t => <TermCard key={t.code} term={t} onSaved={saved => { setTerms(terms.map(x => x.code === saved.code ? saved : x)); onChanged() }} />)}</div>
  </div>
}
