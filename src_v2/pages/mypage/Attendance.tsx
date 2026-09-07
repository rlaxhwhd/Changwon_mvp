import { useMemo, useState } from 'react'
import './Attendance.css'
import { usePageHead } from '../../components/PageCrumb'

/* 데모 데이터 — '26년 1학기(3~6월) 출석 기록 */
const ATTENDED: ReadonlySet<string> = new Set([
  // 3월 (8일)
  '2026-03-03', '2026-03-05', '2026-03-09', '2026-03-11',
  '2026-03-16', '2026-03-18', '2026-03-23', '2026-03-25',
  // 4월 (11일)
  '2026-04-01', '2026-04-03', '2026-04-06', '2026-04-08',
  '2026-04-13', '2026-04-15', '2026-04-20', '2026-04-22',
  '2026-04-24', '2026-04-27', '2026-04-29',
  // 5월 (14일)
  '2026-05-04', '2026-05-06', '2026-05-08', '2026-05-11',
  '2026-05-13', '2026-05-15', '2026-05-18', '2026-05-19',
  '2026-05-20', '2026-05-22', '2026-05-25', '2026-05-26',
  '2026-05-28', '2026-05-29',
  // 6월 (12일) — 19~25일 7일 연속 출석
  '2026-06-01', '2026-06-03', '2026-06-05', '2026-06-08',
  '2026-06-12', '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25',
])

const TODAY = new Date(2026, 5, 25) // 2026-06-25
const SEMESTER_LABEL = '‘26년 1학기'
const SEMESTER_MONTHS = [
  { y: 2026, m: 2 },  // 3월
  { y: 2026, m: 3 },  // 4월
  { y: 2026, m: 4 },  // 5월
  { y: 2026, m: 5 },  // 6월
]
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/* 한 달 그리드 — 항상 6주(42칸)로 반환해 높이 일정 유지 */
function buildMonthGrid(year: number, month0: number): { date: Date; inMonth: boolean }[] {
  const first = new Date(year, month0, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const daysInPrev = new Date(year, month0, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month0 - 1, daysInPrev - i), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month0, d), inMonth: true })
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    })
  }
  return cells
}

/* 연속 출석일(오늘 기준 역방향) */
function computeStreak(today: Date): number {
  let streak = 0
  const cursor = new Date(today)
  while (ATTENDED.has(fmt(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/* 최고 연속 출석 기록 (이전 학기 누적 최고치) */
const BEST_STREAK = 12

export default function Attendance() {
  usePageHead('출석 기록', '매일 출석 체크하고 더 많은 XP와 혜택을 받아보세요.')
  const [cursor, setCursor] = useState(() => ({ y: TODAY.getFullYear(), m: TODAY.getMonth() }))

  const cells = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor])
  const total = ATTENDED.size
  const streak = useMemo(() => computeStreak(TODAY), [])
  const best = BEST_STREAK

  const monthIdx = SEMESTER_MONTHS.findIndex(s => s.y === cursor.y && s.m === cursor.m)
  const canPrev = monthIdx > 0
  const canNext = monthIdx >= 0 && monthIdx < SEMESTER_MONTHS.length - 1
  const goPrev = () => { if (canPrev) setCursor(SEMESTER_MONTHS[monthIdx - 1]) }
  const goNext = () => { if (canNext) setCursor(SEMESTER_MONTHS[monthIdx + 1]) }

  return (
    <div className="v2-page att-page">
      <header className="att-head">
      </header>

      <section className="att-card">
        <div className="att-card-head">
          <div className="att-semester">
            <i className="fa-solid fa-graduation-cap" />
            <span>{SEMESTER_LABEL}</span>
          </div>
          <div className="att-month-nav" role="group" aria-label="월 이동">
            <button
              type="button"
              className="att-month-btn"
              onClick={goPrev}
              disabled={!canPrev}
              aria-label="이전 달"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <span className="att-month-label">{cursor.y}년 {cursor.m + 1}월</span>
            <button
              type="button"
              className="att-month-btn"
              onClick={goNext}
              disabled={!canNext}
              aria-label="다음 달"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>

        <div className="att-cal" role="grid" aria-label={`${cursor.y}년 ${cursor.m + 1}월 출석`}>
          <div className="att-cal-dow" role="row">
            {DOW_LABELS.map((d, i) => (
              <span
                key={d}
                role="columnheader"
                className={`att-cal-dow-cell${i === 0 ? ' sun' : ''}${i === 6 ? ' sat' : ''}`}
              >
                {d}
              </span>
            ))}
          </div>
          <div className="att-cal-grid">
            {cells.map((c, i) => {
              const attended = ATTENDED.has(fmt(c.date))
              const isToday = isSameDay(c.date, TODAY)
              const dow = c.date.getDay()
              const cls = [
                'att-cal-cell',
                !c.inMonth && 'out',
                attended && 'attended',
                isToday && 'today',
                dow === 0 && 'sun',
                dow === 6 && 'sat',
              ].filter(Boolean).join(' ')
              return (
                <div key={i} role="gridcell" className={cls} aria-label={attended ? `${fmt(c.date)} 출석 완료` : fmt(c.date)}>
                  <span className="att-cell-num">{c.date.getDate()}</span>
                  {attended && (
                    <span className="att-cell-mark" aria-hidden="true">
                      <i className="fa-solid fa-check" />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="att-stats">
          <div className="att-stat">
            <span className="att-stat-icon att-stat-icon-total">
              <i className="fa-solid fa-calendar-days" />
            </span>
            <div className="att-stat-body">
              <span className="att-stat-label">누적 출석</span>
              <strong className="att-stat-value"><em>{total}</em>일</strong>
            </div>
          </div>
          <div className="att-stat">
            <span className="att-stat-icon att-stat-icon-streak">
              <i className="fa-solid fa-fire" />
            </span>
            <div className="att-stat-body">
              <span className="att-stat-label">연속 출석</span>
              <strong className="att-stat-value"><em>{streak}</em>일</strong>
            </div>
          </div>
          <div className="att-stat">
            <span className="att-stat-icon att-stat-icon-best">
              <i className="fa-solid fa-trophy" />
            </span>
            <div className="att-stat-body">
              <span className="att-stat-label">최고 기록</span>
              <strong className="att-stat-value"><em>{best}</em>일</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
