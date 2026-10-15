import { useEffect, useMemo, useState } from 'react'
import { COUNSEL_SLOTS_EVENT, loadPublicSlots, loadedSlotWeek } from '../../shared/counselOperationsStore'
import { getCounselWeek } from '../lib/counselCalendar'

// ─────────────────────────────────────────────────────────────────────────
// 상담 신청 캘린더의 주 이동 — 진로취업·심리·교수 상담 화면이 함께 쓴다.
// 0 = 이번 주. 지난 주는 모두 예약 불가라 이번 주보다 앞으로는 가지 않는다.
// 주를 바꾸면 그 주의 공개 슬롯을 서버에서 다시 읽는다(GET /counsel-slots).
// ─────────────────────────────────────────────────────────────────────────

export function useCounselWeek() {
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [, setRevision] = useState(0)
  const days = useMemo(() => {
    const base = new Date()
    base.setDate(base.getDate() + offset * 7)
    return getCounselWeek(base)
  }, [offset])
  const start = days[0].iso

  useEffect(() => {
    const changed = () => setRevision(value => value + 1)
    window.addEventListener(COUNSEL_SLOTS_EVENT, changed)
    return () => window.removeEventListener(COUNSEL_SLOTS_EVENT, changed)
  }, [])

  useEffect(() => {
    // 라우트 로더가 이번 주를 이미 읽어 두었다 — 같은 주면 다시 부르지 않는다.
    if (loadedSlotWeek() === start) return
    let alive = true
    setLoading(true); setError('')
    loadPublicSlots(start)
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : '상담 가능 시간을 불러오지 못했습니다.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [start])

  return {
    days,
    isThisWeek: offset === 0,
    loading,
    error,
    prevWeek: () => setOffset(value => Math.max(0, value - 1)),
    nextWeek: () => setOffset(value => value + 1),
    thisWeek: () => setOffset(0),
  }
}
