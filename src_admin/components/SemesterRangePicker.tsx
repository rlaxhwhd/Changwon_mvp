import { DayPicker, type DateRange } from 'react-day-picker'
import { ko } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import './SemesterRangePicker.css'

// 학기 운영 일정(코드관리 QUEST_SEMESTER)의 시작·종료일을 달력에서 고른다.
// 값은 YYYY-MM-DD 문자열 그대로 주고받는다 — 서버 검증(administration.save_item)과 같은 형식.
const pad = (n: number) => String(n).padStart(2, '0')
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d) }
const label = (value: string) => { const [y, m, d] = value.split('-'); return `${y}년 ${Number(m)}월 ${Number(d)}일` }

export default function SemesterRangePicker({ startDate, endDate, year, onChange }: {
  startDate: string; endDate: string; year: number; onChange: (startDate: string, endDate: string) => void
}) {
  const selected: DateRange | undefined = startDate ? { from: toDate(startDate), to: endDate ? toDate(endDate) : undefined } : undefined
  return <div className="semester-range">
    <p className="semester-range-value">{startDate ? `${label(startDate)} ~ ${endDate ? label(endDate) : '종료일 선택'}` : '시작일과 종료일을 차례로 누르세요.'}</p>
    <DayPicker mode="range" locale={ko} numberOfMonths={2} selected={selected} max={400}
      defaultMonth={selected?.from ?? new Date(year, 2, 1)} captionLayout="dropdown"
      startMonth={new Date(year - 1, 0, 1)} endMonth={new Date(year + 2, 11, 31)}
      onSelect={range => onChange(range?.from ? toKey(range.from) : '', range?.to ? toKey(range.to) : '')} />
  </div>
}
