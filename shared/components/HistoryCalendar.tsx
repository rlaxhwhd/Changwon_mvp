import { useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
function Icon({ name }: { name: 'chevron-left' | 'chevron-right' }) { const Glyph = name === 'chevron-left' ? LuChevronLeft : LuChevronRight; return <Glyph className="icon" aria-hidden="true" /> }

export interface HistoryDayMark { scheduled: number; done: number }
export default function HistoryCalendar({ today, selectedDate, onSelect, marks, markForDate, title, scheduledLabel, doneLabel }: {
  today: string; selectedDate: string; onSelect: (date: string) => void
  marks?: Map<string, HistoryDayMark>; markForDate?: (date: string) => HistoryDayMark; title: string; scheduledLabel: string; doneLabel: string
}) {
  const [month, setMonth] = useState(today.slice(0, 7))
  const [year, monthNumber] = month.split('-').map(Number)
  const monthStart = new Date(year, monthNumber - 1, 1).getDay()
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const shiftMonth = (offset: number) => {
    const next = new Date(year, monthNumber - 1 + offset, 1)
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }
  return (
        <section className="cs-panel cs-calendar"><div className="cs-panel-head"><h2>{title}</h2><button type="button" className="cs-text-button" onClick={() => { setMonth(today.slice(0, 7)); onSelect(today) }}>오늘</button></div>
          <div className="cs-month-nav"><button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)}><Icon name="chevron-left" /></button><strong aria-live="polite">{year}년 {monthNumber}월</strong><button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)}><Icon name="chevron-right" /></button></div>
          <div className="cs-calendar-grid"><div className="cs-weekdays">{['일', '월', '화', '수', '목', '금', '토'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="cs-calendar-days">{Array.from({ length: monthStart }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: daysInMonth }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, '0')}`
              const { scheduled = 0, done = 0 } = markForDate?.(date) ?? marks?.get(date) ?? {}
              return <button type="button" key={date} className={`${date === today ? 'is-today' : ''} ${date === selectedDate ? 'is-selected' : ''}`} aria-current={date === today ? 'date' : undefined} aria-pressed={date === selectedDate} aria-label={`${date}, ${scheduledLabel} ${scheduled}건, ${doneLabel} ${done}건`} onClick={() => onSelect(date)}><span>{i + 1}</span><span className="cs-day-marks">{scheduled > 0 && <i className="cs-dot-scheduled" />}{done > 0 && <i className="cs-dot-done" />}</span></button>
            })}</div>
          </div>
          <div className="cs-calendar-legend"><span><i className="cs-dot-scheduled" />{scheduledLabel}</span><span><i className="cs-dot-done" />{doneLabel}</span></div><p className="cs-calendar-hint">날짜를 선택하면 해당 내역을 볼 수 있어요.</p>
        </section>
  )
}
