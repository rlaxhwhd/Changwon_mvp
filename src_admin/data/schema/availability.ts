// ─────────────────────────────────────────────────────────────────────────
// 상담사 가능 시간대 스키마 (단일 소스)
// 요일 × 시간대 슬롯. localStorage 'dc_availability'에 상담사별로 저장되며
// 일정·예약 화면(/counsel/schedule)이 예약 가능 시간을 참조한다.
// ─────────────────────────────────────────────────────────────────────────

/** 요일 키 (0=일 … 6=토, JS Date.getDay() 규약과 동일) */
export type WeekdayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** 가능 시간대 슬롯 — 특정 요일의 시작~종료 구간 */
export interface AvailabilitySlot {
  id: string
  weekday: WeekdayKey
  /** 시작 HH:mm */
  start: string
  /** 종료 HH:mm */
  end: string
}

/** 상담사 한 명의 가능 시간대 전체 */
export interface AvailabilityConfig {
  counselorId: string
  slots: AvailabilitySlot[]
}

/** 요일 키 → 한글 라벨 */
export const WEEKDAY_LABEL: Record<WeekdayKey, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
}

/** 표시 순서 (월~일) */
export const WEEKDAY_ORDER: WeekdayKey[] = [1, 2, 3, 4, 5, 6, 0]
