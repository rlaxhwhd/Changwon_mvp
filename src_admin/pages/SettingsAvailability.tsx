import { LuClock, LuPlus, LuX } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { getActiveCounselor, getActiveCounselorId } from '../data/counselors'
import { getAvailability, addSlot, removeSlot } from '../data/availability'
import {
  WEEKDAY_LABEL,
  WEEKDAY_ORDER,
  type WeekdayKey,
} from '../data/schema/availability'
import EmptyState from '../components/EmptyState'

export default function SettingsAvailability() {
  const counselor = getActiveCounselor()
  const counselorId = getActiveCounselorId()

  const slots = useMemo(() => getAvailability(counselorId), [counselorId])

  const [weekday, setWeekday] = useState<WeekdayKey>(1)
  const [start, setStart] = useState('14:00')
  const [end, setEnd] = useState('17:00')
  const [capacity, setCapacity] = useState(1)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // 인원은 1시간당 받을 수 있는 상담 수다(서버 한도 1~20과 같다).
  const validCapacity = Number.isInteger(capacity) && capacity >= 1 && capacity <= 20
  const valid = start !== '' && end !== '' && start < end && validCapacity

  const run = async (action: () => Promise<unknown>) => {
    if (saving) return
    setSaving(true); setError('')
    try { await action(); window.location.reload() }
    catch (e) { setError((e as Error).message); setSaving(false) }
  }
  const handleAdd = () => { if (valid) void run(() => addSlot(counselorId, weekday, start, end, capacity)) }
  const handleRemove = (slotId: string) => { void run(() => removeSlot(counselorId, slotId)) }

  return (
    <div className="admin-page">
      {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">가능 시간대</h1>
          <p className="admin-page-desc">
            {counselor.name} · 상담 예약이 가능한 요일·시간대를 설정합니다. 일정·예약 화면에서 참조됩니다.
          </p>
        </div>
      </header>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>
            <LuPlus /> 시간대 추가
          </h2>
        </div>
        <div className="admin-avail-add">
          <label className="admin-field">
            <span>요일</span>
            <select value={weekday} onChange={e => setWeekday(Number(e.target.value) as WeekdayKey)}>
              {WEEKDAY_ORDER.map(wd => (
                <option key={wd} value={wd}>
                  {WEEKDAY_LABEL[wd]}요일
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>시작</span>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>종료</span>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>1시간당 인원</span>
            <input type="number" min={1} max={20} step={1} value={capacity} onChange={e => setCapacity(e.target.valueAsNumber)} />
          </label>
          <button className="admin-btn admin-btn-primary" disabled={!valid || saving} onClick={handleAdd}>
            <LuPlus /> 추가
          </button>
        </div>
        {start !== '' && end !== '' && start >= end && (
          <p className="admin-form-hint admin-form-hint-warn">종료 시각은 시작 시각보다 늦어야 합니다.</p>
        )}
        {!validCapacity && <p className="admin-form-hint admin-form-hint-warn">인원은 1~20명 사이로 입력해 주세요.</p>}
        <p className="admin-form-hint">예: 월 13:00–15:00 · 2명이면 13시와 14시에 각각 2명까지 상담을 받습니다.</p>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>
            <LuClock /> 설정된 시간대
          </h2>
          <span className="admin-tag admin-tag-soft">{slots.length}개</span>
        </div>

        {slots.length === 0 ? (
          <EmptyState icon={LuClock} message="설정된 가능 시간대가 없습니다. 위에서 추가하세요." />
        ) : (
          <ul className="admin-avail-list">
            {WEEKDAY_ORDER.map(wd => {
              const daySlots = slots.filter(s => s.weekday === wd)
              if (daySlots.length === 0) return null
              return (
                <li key={wd} className="admin-avail-list-day">
                  <span className="admin-avail-day">{WEEKDAY_LABEL[wd]}요일</span>
                  <div className="admin-avail-list-slots">
                    {daySlots.map(s => (
                      <span key={s.id} className="admin-avail-slot-tag">
                        {s.start}–{s.end} · {s.capacity ?? 1}명
                        <button
                          type="button"
                          className="admin-avail-slot-remove"
                          aria-label="삭제"
                          disabled={saving}
                          onClick={() => handleRemove(s.id)}
                        >
                          <LuX />
                        </button>
                      </span>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
