import { useState } from 'react'
import type { Day } from '../lib/counselCalendar'
import type { SlotPickerStatus } from '../hooks/useSlotPicker'
import './CounselSlotPicker.css'

/* ── 모바일 시간 선택기 — 상담 신청 일정표(.cc-calendar-grid)의 폰 폭 대체 UI ─────────
   표(요일 5열 × 시간 9행)는 폰 폭에서 2~3열밖에 안 보이고 "예약 가능"이 45번 반복된다.
   640px 이하에서는 「요일 칩 → 그 날의 시간 칩」 두 단계로 바꿔 그린다.
   데이터·상태(getStatus · selectSlot · selectedSlot)는 페이지가 그대로 쥐고, 여기는 표시만 바꾼다.
   켜고 끄는 스위치와 폭 판정은 hooks/useSlotPicker 에 있다(복구 = 그 파일의 MOBILE_SLOT_PICKER). */

interface Props {
  days: Day[]
  times: string[]
  getStatus: (dayKey: string, time: string) => SlotPickerStatus
  onSelect: (day: Day, time: string) => void
  selected?: { day: Day; time: string } | null
}

/** "09/07 (월)" → ["09/07", "(월)"] — Day.label 은 공용 유틸이 만든 형식이다. */
function splitLabel(label: string): [string, string] {
  const i = label.indexOf(' ')
  return i < 0 ? [label, ''] : [label.slice(0, i), label.slice(i + 1)]
}

export default function CounselSlotPicker({ days, times, getStatus, onSelect, selected }: Props) {
  const [dayKey, setDayKey] = useState<string>(selected?.day.key ?? days[0]?.key ?? '')

  // 선택한 슬롯이 바뀌면(표에서 고르고 폭을 줄인 경우 등) 그 요일로 따라간다.
  // effect 대신 렌더 중 상태 조정(React 「prop 변화에 state 맞추기」 패턴) — 한 번 더 그리지 않는다.
  const selectedDayKey = selected?.day.key
  const [prevSelectedDayKey, setPrevSelectedDayKey] = useState(selectedDayKey)
  if (selectedDayKey !== prevSelectedDayKey) {
    setPrevSelectedDayKey(selectedDayKey)
    if (selectedDayKey) setDayKey(selectedDayKey)
  }

  const day = days.find(d => d.key === dayKey) ?? days[0]
  if (!day) return null

  const openCount = (d: Day) => times.filter(t => getStatus(d.key, t) !== 'reserved').length

  return (
    <div className="csp" role="group" aria-label="상담 시간 선택">
      <div className="csp-days" role="group" aria-label="요일 선택">
        {days.map(d => {
          const [md, dowRaw] = splitLabel(d.label)
          const dow = dowRaw.replace(/[()]/g, '')
          const active = d.key === day.key
          const open = openCount(d)
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={active}
              className={`csp-day${active ? ' is-active' : ''}${open === 0 ? ' is-full' : ''}`}
              onClick={() => setDayKey(d.key)}
            >
              <strong>{dow}</strong>
              <span>{md}</span>
              <small>{open === 0 ? '마감' : `${open}시간대`}</small>
            </button>
          )
        })}
      </div>

      <div className="csp-times" role="group" aria-label={`${day.date} 상담 시간`}>
        {times.map(time => {
          const status = getStatus(day.key, time)
          const reserved = status === 'reserved'
          return (
            <button
              key={`${day.key}-${time}`}
              type="button"
              aria-pressed={status === 'selected'}
              disabled={reserved}
              className={`csp-slot csp-slot-${status}`}
              onClick={() => onSelect(day, time)}
            >
              {status === 'selected' && <i className="fa-solid fa-check" aria-hidden="true" />}
              <span>{time}</span>
              {reserved && <small>예약 완료</small>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
