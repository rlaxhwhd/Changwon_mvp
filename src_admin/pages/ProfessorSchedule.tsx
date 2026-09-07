/**
 * ---------------------------------------------------------------------------
 * 교수 상담 제한일정 화면. 로그인 교수의 반복 제한 시간을 등록·해제한다.
 * 데이터는 dc_counselor_excluded 단일소스이며 가용시간 목록으로 해석하지 않는다.
 * ---------------------------------------------------------------------------
 */
import { LuClock, LuPlus, LuX } from 'react-icons/lu'
import { useState } from 'react'
import EmptyState from '../components/EmptyState'
import { addExcludedSlot, getExcludedHours, removeExcludedSlot } from '../data/excludedHours'
import { WEEKDAY_LABEL, WEEKDAY_ORDER, type WeekdayKey } from '../data/schema/availability'
import { getActiveUser } from '../data/staff'

export default function ProfessorSchedule() {
  const user = getActiveUser()
  const slots = getExcludedHours(user.id)
  const [weekday, setWeekday] = useState<WeekdayKey>(1)
  const [start, setStart] = useState('14:00')
  const [end, setEnd] = useState('17:00')
  const valid = start < end

  const add = () => {
    if (!valid) return
    addExcludedSlot(user.id, weekday, start, end)
    window.location.reload()
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담 제한일정</h1>
          <p className="admin-page-desc">
            {user.name} 교수님은 기본적으로 모든 시간대에 상담이 가능합니다. 불가 시간대만 등록하세요.
          </p>
        </div>
      </header>
      <section className="admin-card">
        <div className="admin-card-head"><h2><LuPlus /> 제한 시간대 추가</h2></div>
        <div className="admin-avail-add">
          <label className="admin-field">
            <span>요일</span>
            <select value={weekday} onChange={event => setWeekday(Number(event.target.value) as WeekdayKey)}>
              {WEEKDAY_ORDER.map(day => <option key={day} value={day}>{WEEKDAY_LABEL[day]}요일</option>)}
            </select>
          </label>
          <label className="admin-field">
            <span>시작</span>
            <input type="time" value={start} onChange={event => setStart(event.target.value)} />
          </label>
          <label className="admin-field">
            <span>종료</span>
            <input type="time" value={end} onChange={event => setEnd(event.target.value)} />
          </label>
          <button type="button" className="admin-btn admin-btn-primary" disabled={!valid} onClick={add}>
            <LuPlus /> 추가
          </button>
        </div>
      </section>
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><LuClock /> 등록한 제한 시간대</h2>
          <span className="admin-tag admin-tag-soft">{slots.length}개</span>
        </div>
        {slots.length === 0 ? (
          <EmptyState icon={LuClock} message="등록한 제한 시간대가 없습니다. 현재 모든 시간대에 상담 요청을 받을 수 있습니다." />
        ) : (
          <ul className="admin-avail-list">
            {WEEKDAY_ORDER.map(day => {
              const daySlots = slots.filter(slot => slot.weekday === day)
              if (daySlots.length === 0) return null
              return <li key={day} className="admin-avail-list-day">
                <span className="admin-avail-day">{WEEKDAY_LABEL[day]}요일</span>
                <div className="admin-avail-list-slots">
                  {daySlots.map(slot => (
                    <span key={slot.id} className="admin-avail-slot-tag">
                      {slot.start}–{slot.end}
                      <button
                        type="button"
                        className="admin-avail-slot-remove"
                        onClick={() => { removeExcludedSlot(user.id, slot.id); window.location.reload() }}
                      >
                        <LuX />
                      </button>
                    </span>
                  ))}
                </div>
              </li>
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
