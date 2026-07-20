import { LuBriefcase, LuCalendar, LuClipboardCheck, LuMegaphone, LuMessagesSquare, LuUsers } from 'react-icons/lu'
// ─────────────────────────────────────────────────────────────────────────
// 운영 대시보드(홈) 로더
// counselRequests.ts 패턴 미러: seed JSON import → 배열/객체 노출.
// 백엔드 연동 시 이 로더만 API 호출로 교체하면 Home.tsx는 그대로 나간다.
// 화면은 이 로더에서 구독만 하고, 숫자/배열 리터럴을 컴포넌트에 박지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import type {
  DashboardData,
  DiagnosisSegment,
  TrafficRange,
  TrafficSeries,
} from './schema/dashboard'
import seed from './dashboard.seed.json'

const STAT_ICONS = { 'user-group': LuUsers, 'clipboard-check': LuClipboardCheck, comments: LuMessagesSquare, calendar: LuCalendar, briefcase: LuBriefcase, bullhorn: LuMegaphone }
const SEED = { ...seed, stats: seed.stats.map(stat => ({ ...stat, icon: STAT_ICONS[stat.icon as keyof typeof STAT_ICONS] })) } as DashboardData

/** 대시보드 전체 데이터를 반환 (seed). 추후 API 교체 지점. */
export function getDashboardData(): DashboardData {
  return SEED
}

/** 기간 토글별 라인 차트 시리즈 조회 */
export function getTrafficSeries(range: TrafficRange): TrafficSeries {
  return SEED.traffic[range]
}

/** 진단 세그먼트별 비율(%) 파생 — 총계 대비 반올림 1자리 */
export function diagnosisPercent(seg: DiagnosisSegment, total: number): number {
  if (total <= 0) return 0
  return Math.round((seg.value / total) * 1000) / 10
}

export type { DashboardData, TrafficRange }
