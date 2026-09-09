import { useEffect, useState } from 'react'

/* ── 모바일 시간 선택기 스위치 ─────────────────────────────────────────────
   상담 신청 일정표(.cc-calendar-grid)는 640px 이하에서 「요일 칩 → 시간 칩」
   (components/CounselSlotPicker)으로 바꿔 그린다.

   ★ 복구 스위치: MOBILE_SLOT_PICKER 를 false 로 두면 모든 폭에서 기존 표만 그린다.
     페이지 쪽 분기(`mobileSlots ? <CounselSlotPicker/> : <표>`)는 그대로 둬도 된다. */
export const MOBILE_SLOT_PICKER = true
export const SLOT_PICKER_QUERY = '(max-width: 640px)'

export type SlotPickerStatus = 'available' | 'reserved' | 'selected'

/** 640px 이하(+스위치 켜짐)에서 true. 폭이 바뀌면 따라간다. */
export function useSlotPicker(): boolean {
  const [on, setOn] = useState<boolean>(() =>
    MOBILE_SLOT_PICKER && typeof window !== 'undefined' && window.matchMedia(SLOT_PICKER_QUERY).matches,
  )
  useEffect(() => {
    if (!MOBILE_SLOT_PICKER) return
    const mq = window.matchMedia(SLOT_PICKER_QUERY)
    const onChange = () => setOn(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return on
}
