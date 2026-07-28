// ─────────────────────────────────────────────────────────────────────────
// 상담 캘린더 공용 유틸 (단일 소스)
// 진로취업·심리·교수 상담 화면이 공통으로 쓰는 "이번 주 월~금" 생성기.
// 기존 3개 화면이 각자 하드코딩하던 days 배열(2026-05 고정)을 대체한다.
// reservedSlots 등은 day.key(mon~fri) 기준이므로 키는 그대로 유지한다.
// ─────────────────────────────────────────────────────────────────────────

export interface Day {
  key: string
  /** 그리드 헤더용 짧은 라벨 (예: 07/27 (월)) */
  label: string
  /** 상세 표기용 (예: 2026. 07. 27 (월)) */
  date: string
  /** 슬롯 저장용 ISO 날짜 (예: 2026-07-27) — 상담사 캘린더 연동에 사용 */
  iso: string
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri']
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 기준일(기본: 오늘)이 속한 주의 월~금 5일을 반환한다.
 * label='MM/DD (요일)', date='YYYY. MM. DD (요일)' 형식(기존 화면과 동일).
 */
export function getCounselWeek(base: Date = new Date()): Day[] {
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const dow = today.getDay() // 0=일 … 6=토
  const offsetToMonday = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + offsetToMonday)

  return DAY_KEYS.map((key, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const wd = WEEKDAY[d.getDay()]
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    return {
      key,
      label: `${mm}/${dd} (${wd})`,
      date: `${d.getFullYear()}. ${mm}. ${dd} (${wd})`,
      iso: `${d.getFullYear()}-${mm}-${dd}`,
    }
  })
}
