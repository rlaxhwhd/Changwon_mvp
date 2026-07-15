// ─────────────────────────────────────────────────────────────────────────
// 상담사 가능 시간대 로더 (localStorage 스토어)
// 요일 × 시간대 슬롯을 상담사별로 'dc_availability'에 저장한다.
// 없으면 기본값 seed JSON으로 폴백. 일정·예약 화면이 이 슬롯을 참조한다.
// 화면은 이 로더만 통해 읽고 쓴다(컴포넌트 하드코딩 금지).
// ─────────────────────────────────────────────────────────────────────────
import type {
  AvailabilityConfig,
  AvailabilitySlot,
  WeekdayKey,
} from './schema/availability'
import seed from './availability.seed.json'

const STORAGE_KEY = 'dc_availability'

const SEED = seed as AvailabilityConfig[]

function readAll(): AvailabilityConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as AvailabilityConfig[]
    }
  } catch {
    /* seed 폴백 */
  }
  return SEED
}

/** 특정 상담사의 가능 시간대 슬롯 (시작 시각 순 정렬) */
export function getAvailability(counselorId: string): AvailabilitySlot[] {
  const cfg = readAll().find(c => c.counselorId === counselorId)
  const slots = cfg?.slots ?? []
  return [...slots].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
}

function persistAll(list: AvailabilityConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/** 특정 상담사의 슬롯 전체를 교체 저장 */
export function setAvailability(counselorId: string, slots: AvailabilitySlot[]): void {
  const list = readAll()
  const idx = list.findIndex(c => c.counselorId === counselorId)
  const cfg: AvailabilityConfig = { counselorId, slots }
  const next = idx >= 0 ? list.map(c => (c.counselorId === counselorId ? cfg : c)) : [...list, cfg]
  persistAll(next)
}

/** 슬롯 1건 추가 후 저장. 새 슬롯 id를 반환. */
export function addSlot(
  counselorId: string,
  weekday: WeekdayKey,
  start: string,
  end: string,
): string {
  const id = `av_${counselorId}_${Date.now().toString(36)}`
  const slots = [...getAvailability(counselorId), { id, weekday, start, end }]
  setAvailability(counselorId, slots)
  return id
}

/** 슬롯 1건 삭제 후 저장 */
export function removeSlot(counselorId: string, slotId: string): void {
  setAvailability(
    counselorId,
    getAvailability(counselorId).filter(s => s.id !== slotId),
  )
}

export type { AvailabilitySlot }
