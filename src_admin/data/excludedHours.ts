/**
 * ---------------------------------------------------------------------------
 * 단일소스: 교수·상담사 공통 제한 상담시간 → TB_CARR_CNSL_EXCL_HR.
 * DB 전환 시 이 로더와 저장 함수만 교체한다. 가용 시간으로 역전하지 말 것.
 * ---------------------------------------------------------------------------
 */
import seed from './excludedHours.seed.json'
import type { AvailabilitySlot, WeekdayKey } from './schema/availability'
import type { ExcludedConfig } from './schema/excludedHours'

const STORAGE_KEY = 'dc_counselor_excluded'
const SEED = seed as ExcludedConfig[]

function all(): ExcludedConfig[] {
  try {
    const item = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Array.isArray(item)) return item as ExcludedConfig[]
  } catch {
    // localStorage를 사용할 수 없으면 JSON seed를 유지한다.
  }
  return SEED
}

function save(items: ExcludedConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

/** [DB-ready] ownerId별 제한 시간을 요일·시작시각 순으로 조회한다. */
export function getExcludedHours(ownerId: string): AvailabilitySlot[] {
  return [...(all().find(item => item.ownerId === ownerId)?.slots ?? [])]
    .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
}

/** [DB-ready] ownerId의 반복 제한 시간 한 건을 추가한다. */
export function addExcludedSlot(
  ownerId: string,
  weekday: WeekdayKey,
  start: string,
  end: string,
): string {
  const id = `ex_${Date.now()}`
  const items = all()
  const slots = [...getExcludedHours(ownerId), { id, weekday, start, end }]
  const next = items.some(item => item.ownerId === ownerId)
    ? items.map(item => item.ownerId === ownerId ? { ownerId, slots } : item)
    : [...items, { ownerId, slots }]
  save(next)
  return id
}

/** [DB-ready] ownerId의 반복 제한 시간 한 건을 삭제한다. */
export function removeExcludedSlot(ownerId: string, slotId: string): void {
  save(all().map(item => item.ownerId === ownerId
    ? { ownerId, slots: item.slots.filter(slot => slot.id !== slotId) }
    : item))
}
